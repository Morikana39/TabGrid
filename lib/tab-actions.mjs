import { tr } from './i18n.mjs';
import { TabActivity } from './tab-activity.mjs';
import { TabLibrary } from './tab-library.mjs';
import { TabFocus } from './tab-focus.mjs';
import { siteOrigins } from './tab-menu.mjs';
import { isGridUrl, safePageUrl } from './tab-model.mjs';

// All mutations are serialized by the worker. The journal survives UI closure and worker suspension.
export class TabActions {
    constructor(api, gridUrl) { this.api = api; this.gridUrl = gridUrl; this.journalKey = 'tabgridUndo'; this.private = Boolean(api.extension?.inIncognitoContext); this.library = new TabLibrary(this); this.activity = new TabActivity(api, gridUrl, this.private); this.focus = new TabFocus(api, gridUrl); }
    async journal() { if (this.private) return []; return (await this.api.storage.session.get(this.journalKey))[this.journalKey] || []; }
    async save(entries) { if (this.private) return; await this.api.storage.session.set({ [this.journalKey]: entries.slice(-10) }); }
    async live(ids) {
        const tabs = await this.api.tabs.query({});
        const wanted = new Set(ids);
        return tabs.filter(t => wanted.has(t.id) && Boolean(t.incognito) === this.private && !isGridUrl(t.url || t.pendingUrl, this.gridUrl));
    }
    async newAfter(ids, activate = true) {
        if (typeof activate !== 'boolean') throw new Error(tr("Invalid new-tab behavior."));
        const tabs = await this.live(ids);
        if (!tabs.length || new Set(tabs.map(t => t.windowId)).size !== 1) throw new Error(tr("Select tabs in one window."));
        const last = tabs.reduce((a, b) => a.index > b.index ? a : b);
        const tab = await this.api.tabs.create({ windowId: last.windowId, index: last.index + 1, active: false });
        if (last.groupId !== -1) await this.api.tabs.group({ tabIds: [tab.id], groupId: last.groupId });
        if (activate) await this.api.tabs.update(tab.id, { active: true });
        return tab;
    }
    async duplicate(ids) {
        for (const tab of await this.live(ids)) await this.api.tabs.duplicate(tab.id);
    }
    async siteSoundSnapshot(ids) {
        if (!await this.api.permissions.contains({ permissions: ['contentSettings'] }) || !this.api.contentSettings?.sound) return null;
        const origins = siteOrigins(await this.live(ids));
        const settings = await Promise.all(origins.map(primaryUrl => this.api.contentSettings.sound.get({ primaryUrl: `${primaryUrl}/`, incognito: this.private })));
        return { muted: settings.length > 0 && settings.every(s => s.setting === 'block') };
    }
    async setSiteSound(ids, muted) {
        if (!await this.api.permissions.contains({ permissions: ['contentSettings'] })) throw new Error(tr("Site sound permission was not granted."));
        if (!this.api.contentSettings?.sound) throw new Error(tr("This Chrome version does not support site sound settings."));
        const origins = siteOrigins(await this.live(ids));
        if (!origins.length) throw new Error(tr("Select tabs with web addresses first."));
        let count = 0; const errors = [];
        for (const origin of origins) {
            try {
                await this.api.contentSettings.sound.set({ primaryPattern: `${origin}/*`, setting: muted ? 'block' : 'allow', scope: this.private ? 'incognito_session_only' : 'regular' });
                count++;
            } catch (error) { errors.push(error.message); }
        }
        return { count, error: errors.length ? tr("{0} site(s) could not be updated. {1}", [errors.length, errors[0]]) : null };
    }
    async close(ids) {
        const tabs = await this.live(ids);
        if (!tabs.length) return { count: 0 };
        if (this.private) {
            let count = 0; const errors = [];
            for (const tab of tabs) { try { await this.api.tabs.remove(tab.id); count++; } catch (e) { errors.push(e.message); } }
            return { count, error: errors.length ? tr("{0} tab(s) could not close. {1}", [errors.length, errors[0]]) : null };
        }
        const groups = await this.api.tabGroups.query({});
        const entry = { id: crypto.randomUUID(), tabs: tabs.map(t => ({ id: t.id, url: t.url || t.pendingUrl, title: t.title, index: t.index, windowId: t.windowId, pinned: t.pinned, muted: t.mutedInfo?.muted || false, groupId: t.groupId, group: groups.find(g => g.id === t.groupId), state: 'pending' })) };
        const journal = await this.journal();
        journal.push(entry);
        await this.save(journal);
        let count = 0;
        const errors = [];
        for (const record of entry.tabs) {
            const before = new Set((await this.api.sessions.getRecentlyClosed().catch(() => [])).map(s => s.tab?.sessionId || s.window?.sessionId));
            try {
                await this.api.tabs.remove(record.id);
                record.state = 'closed';
                count++;
                const recent = await this.api.sessions.getRecentlyClosed().catch(() => []);
                record.sessionId = recent.find(s => s.tab && !before.has(s.tab.sessionId) && s.tab.url === record.url)?.tab.sessionId;
            } catch (error) { record.state = 'failed'; errors.push(error.message); }
            await this.save(journal);
        }
        if (!count) journal.pop();
        else entry.completedAt = Date.now();
        await this.save(journal);
        return { count, error: errors.length ? tr("{0} tab(s) could not be closed. {1}", [errors.length, errors[0]]) : null };
    }
    async undo(entryId = null, gridTabId = null) {
        this.restoring = true;
        try { const entry=(await this.journal()).find(e=>e.id===entryId) || (entryId===null?(await this.journal()).at(-1):null); return entry?.kind==='grouping'?await this.restoreGrouping(entry):await this.restoreClosed(entryId); }
        finally {
            // sessions.restore can activate a restored tab/window. Return to the
            // requesting grid even when restoration only partially succeeds.
            try {
                const grid = gridTabId === null ? null : await this.api.tabs.get(gridTabId).catch(() => null);
                if (grid && Boolean(grid.incognito) === this.private && isGridUrl(grid.url, this.gridUrl)) {
                    await this.api.tabs.update(grid.id, { active: true }).catch(() => {});
                    await this.api.windows.update(grid.windowId, { focused: true }).catch(() => {});
                }
            } finally { this.restoring = false; }
        }
    }
    async restoreClosed(entryId = null) {
        const journal = await this.journal();
        const entry = entryId === null ? journal.at(-1) : journal.find(e => e.id === entryId);
        if (!entry) return { count: 0 };
        entry.windows ||= {};
        entry.groups ||= {};
        let count = 0;
        const errors = [];
        for (const record of [...entry.tabs].sort((a, b) => a.windowId - b.windowId || a.index - b.index)) {
            if (record.state === 'failed' || record.state === 'restored') continue;
            // Resolve a worker interruption between the remove call and its journal write.
            if (record.state === 'pending' && await this.api.tabs.get(record.id).catch(() => null)) continue;
            try {
                let tab = record.restoredId ? await this.api.tabs.get(record.restoredId).catch(() => null) : null;
                if (!tab) {
                    let destination = entry.windows[record.windowId] || record.windowId;
                    let win = await this.api.windows.get(destination).catch(() => null);
                    if (!win) {
                        win = await this.api.windows.create({ focused: false, incognito: this.private });
                        entry.windows[record.windowId] = win.id;
                        entry.placeholderIds ||= [];
                        entry.placeholderIds.push(...(win.tabs || []).map(t => t.id));
                        await this.save(journal);
                    }
                    if (record.sessionId) {
                        const restored = await this.api.sessions.restore(record.sessionId).catch(() => null);
                        tab = restored?.tab;
                    }
                    if (!tab) {
                        if (!safePageUrl(record.url)) throw new Error(tr("This page cannot be recreated. Try Chrome’s Recently Closed menu."));
                        tab = await this.api.tabs.create({ windowId: win.id, url: record.url, active: false, index: record.index, pinned: record.pinned });
                    }
                    record.restoredId = tab.id;
                    await this.save(journal);
                    if (tab.windowId !== win.id) await this.api.tabs.move(tab.id, { windowId: win.id, index: -1 });
                }
                const destinationId = entry.windows[record.windowId] || record.windowId;
                const currentTab = await this.api.tabs.get(tab.id);
                if (currentTab.windowId !== destinationId) await this.api.tabs.move(tab.id, { windowId: destinationId, index: -1 });
                await this.api.tabs.update(tab.id, { pinned: record.pinned, muted: record.muted });
                await this.api.tabs.move(tab.id, { index: record.index });
                if (record.group) {
                    const current = await this.api.tabs.get(tab.id);
                    const groupKey = `${record.windowId}:${record.groupId}`;
                    let group = await this.api.tabGroups.get(entry.groups[groupKey] ?? record.groupId).catch(() => null);
                    if (group?.windowId !== current.windowId) group = null;
                    const groupId = await this.api.tabs.group({ tabIds: [tab.id], ...(group ? { groupId: group.id } : { createProperties: { windowId: current.windowId } }) });
                    entry.groups[groupKey] = groupId;
                    await this.api.tabGroups.update(groupId, { title: record.group.title || '', color: record.group.color, collapsed: record.group.collapsed });
                }
                record.state = 'restored';
                count++;
                await this.save(journal);
            } catch (error) { errors.push(error.message); }
        }
        if (!errors.length) {
            for (const id of entry.placeholderIds || []) await this.api.tabs.remove(id).catch(() => {});
            journal.splice(journal.indexOf(entry), 1);
            await this.save(journal);
        }
        return { count, error: errors.length ? tr("Some tabs could not be restored. Undo can retry without duplicating restored tabs. {0}", [errors[0]]) : null };
    }
    async restoreSession(sessionId) {
        if (this.private) throw new Error(tr("Session history is unavailable in Incognito."));
        if (typeof sessionId !== 'string' || !sessionId.trim()) throw new Error(tr("This session is no longer available to restore."));
        const result = await this.api.sessions.restore(sessionId);
        const journal = await this.journal();
        for (const entry of journal) entry.tabs = entry.tabs.filter(t => t.sessionId !== sessionId);
        await this.save(journal.filter(e => e.tabs.length));
        // Do not reintroduce our own page when restoring a mixed closed window.
        for (const tab of result.window?.tabs || []) if (isGridUrl(tab.url, this.gridUrl)) await this.api.tabs.remove(tab.id).catch(() => {});
        return result;
    }
    async groupingChange(ids, work) {
        if(this.private)return work();
        const tabs=await this.live(ids),groups=await this.api.tabGroups.query({});
        const entry={id:crypto.randomUUID(),kind:'grouping',tabs:tabs.map(t=>({id:t.id,windowId:t.windowId,index:t.index,groupId:t.groupId,group:groups.find(g=>g.id===t.groupId),state:'pending'}))};
        const journal=await this.journal();journal.push(entry);await this.save(journal);
        try{return await work();}
        finally{
            // Persist partial successes too; a later Undo retries only outstanding tabs.
            const live=await this.live(ids);
            for(const record of entry.tabs){const tab=live.find(t=>t.id===record.id);record.state=tab&&(tab.groupId!==record.groupId||tab.windowId!==record.windowId)?'changed':'restored';}
            if(entry.tabs.some(t=>t.state==='changed'))entry.completedAt=Date.now();else journal.splice(journal.indexOf(entry),1);
            await this.save(journal);
        }
    }
    async ungroup(ids){return this.groupingChange(ids,async()=>{const tabs=await this.live(ids);if(tabs.length)await this.api.tabs.ungroup(tabs.map(t=>t.id));});}
    async restoreGrouping(entry){
        const journal=await this.journal();entry=journal.find(e=>e.id===entry.id);if(!entry)return {count:0};
        entry.groups||={};let count=0;const errors=[];
        for(const record of [...entry.tabs].sort((a,b)=>a.windowId-b.windowId||a.index-b.index)){
            if(record.state==='restored')continue;
            try{
                const tab=(await this.live([record.id]))[0];
                if(!tab){record.state='restored';continue;} // Never recreate a tab closed after grouping.
                const win=await this.api.windows.get(record.windowId);
                if(Boolean(win.incognito)!==this.private)throw Error(tr("Tabs must stay in their browsing mode."));
                if(tab.pinned)throw Error(tr("Unpin selected tabs before grouping them."));
                await this.api.tabs.ungroup([tab.id]);
                await this.api.tabs.move(tab.id,{windowId:record.windowId,index:record.index});
                if(record.group){
                    const key=`${record.windowId}:${record.groupId}`;
                    let group=await this.api.tabGroups.get(entry.groups[key]??record.groupId).catch(()=>null);
                    if(group?.windowId!==record.windowId)group=null;
                    const id=await this.api.tabs.group({tabIds:[tab.id],...(group?{groupId:group.id}:{createProperties:{windowId:record.windowId}})});
                    entry.groups[key]=id;
                    if(!group)await this.api.tabGroups.update(id,{title:record.group.title||'',color:record.group.color,collapsed:Boolean(record.group.collapsed)});
                }
                record.state='restored';count++;
            }catch(error){errors.push(error.message);}
            await this.save(journal);
        }
        if(!errors.length){journal.splice(journal.indexOf(entry),1);await this.save(journal);}
        return {count,error:errors.length?tr("Some tabs could not be restored. Undo can retry without duplicating restored tabs. {0}",[errors[0]]):null};
    }
    async group(ids, groupId, title = '', color = 'blue', journal = true) {
        if(journal)return this.groupingChange(ids,()=>this.group(ids,groupId,title,color,false));
        const tabs = await this.live(ids);
        if (!tabs.length) return;
        const windows = new Set(tabs.map(t => t.windowId));
        if (windows.size !== 1) throw new Error(tr("Move the selected tabs into one window before grouping them."));
        if (tabs.some(t => t.pinned)) throw new Error(tr("Unpin selected tabs before grouping them."));
        if (groupId !== null) { const target = await this.api.tabGroups.get(groupId); if (target.windowId !== tabs[0].windowId) throw new Error(tr("Choose a group in the same window.")); }
        const id = await this.api.tabs.group({ tabIds: tabs.map(t => t.id), ...(groupId !== null ? { groupId } : { createProperties: { windowId: tabs[0].windowId } }) });
        if (groupId === null) await this.api.tabGroups.update(id, { title, color });
        return id;
    }
    async move(ids, windowId) {
        const tabs = (await this.live(ids)).sort((a, b) => a.windowId - b.windowId || a.index - b.index);
        if (!tabs.length) return;
        let placeholder;
        if (windowId === null) {
            const win = await this.api.windows.create({ focused: false, incognito: this.private });
            windowId = win.id;
            placeholder = win.tabs?.[0]?.id;
        }
        const destination = await this.api.windows.get(windowId);
        if (Boolean(destination.incognito) !== this.private) throw new Error(tr("Tabs must stay in their browsing mode."));
        const groups = await this.api.tabGroups.query({});
        const all = await this.api.tabs.query({});
        let pinnedIndex = all.filter(t => t.windowId === windowId && t.pinned).length;
        const handled = new Set();
        for (const tab of tabs) {
            if (handled.has(tab.id) || tab.windowId === windowId) continue;
            const members = tab.groupId === -1 ? [] : all.filter(t => t.groupId === tab.groupId);
            if (members.length && members.every(m => tabs.some(t => t.id === m.id))) {
                await this.api.tabGroups.move(tab.groupId, { windowId, index: -1 });
                members.forEach(t => handled.add(t.id));
            } else if (members.length) {
                const subset = tabs.filter(t => t.groupId === tab.groupId);
                await this.api.tabs.move(subset.map(t => t.id), { windowId, index: -1 });
                const newId = await this.api.tabs.group({ tabIds: subset.map(t => t.id), createProperties: { windowId } });
                const meta = groups.find(g => g.id === tab.groupId);
                if (meta) await this.api.tabGroups.update(newId, { title: meta.title, color: meta.color, collapsed: meta.collapsed });
                subset.forEach(t => handled.add(t.id));
            } else {
                await this.api.tabs.move(tab.id, { windowId, index: tab.pinned ? pinnedIndex++ : -1 });
                await this.api.tabs.update(tab.id, { pinned: tab.pinned });
            }
        }
        if (placeholder !== undefined) await this.api.tabs.remove(placeholder);
    }
    async addLinks(...args) { return this.library.addLinks(...args); }
    async returnActive(ids) { return this.activity.update(ids); }
    async activitySnapshot() { return this.activity.update(); }
    activationTask(tabId) {
        if (this.restoring) return null;
        return async () => {
            if (!this.private) await this.returnActive([tabId]);
            await this.rememberOpened(`tab:${tabId}`);
        };
    }
    async rememberOpened(key) { return this.focus.remember(key); }
    async lastOpenedSnapshot() { return this.focus.snapshot(); }
    async dropIntoGroup(ids, destination, windowId, {title='',color='blue'} = {}) {
        const tabs = await this.live(ids);
        if (!ids.length || new Set(ids).size !== ids.length || tabs.length !== ids.length) throw new Error(tr("These tabs changed while dragging. Try again with available unpinned tabs."));
        if (tabs.some(t => t.pinned)) throw new Error(tr("Unpin selected tabs before grouping them."));
        if (destination !== 'new' && destination !== 'ungroup') { const target=await this.api.tabGroups.get(destination); if(target.windowId!==windowId)throw Error(tr("The destination group changed.")); }
        return this.groupingChange(ids,async()=>{
        await this.move(ids, windowId);
        if (destination === 'ungroup') { await this.api.tabs.ungroup(ids); await this.returnActive(ids); return; }
        if (destination !== 'new' && !Number.isInteger(destination)) throw new Error(tr("Invalid group destination."));
        const id = await this.group(ids, destination === 'new' ? null : destination, title, color, false);
        await this.returnActive(ids);
        return id;
        });
    }
    async dropAt({keys,windowId,anchor=null,after=false,pinned=false}) {
        if(!Array.isArray(keys)||!keys.length||keys.length>1000||new Set(keys).size!==keys.length||keys.some(k=>typeof k!=='string'||!/^(tab|group):\d+$/.test(k))||!Number.isInteger(windowId)||typeof after!=='boolean'||typeof pinned!=='boolean'||(anchor!==null&&(typeof anchor!=='string'||!/^(tab|group):\d+$/.test(anchor)))) throw Error(tr("Invalid drop destination."));
        const win=await this.api.windows.get(windowId);
        if(Boolean(win.incognito)!==this.private)throw Error(tr("Tabs must stay in their browsing mode."));
        const all=await this.live((await this.api.tabs.query({})).map(t=>t.id));
        const members=key=>all.filter(t=>key===`tab:${t.id}`||key===`group:${t.groupId}`);
        const batches=keys.map(members),moving=batches.flat();
        if(batches.some(b=>!b.length)||new Set(moving.map(t=>t.id)).size!==moving.length||moving.some(t=>Boolean(t.pinned)!==pinned))throw Error(tr("These tabs changed while dragging. Choose a matching pinned or unpinned area."));
        const target=anchor===null?[]:members(anchor);
        if(anchor!==null&&(!target.length||target.some(t=>t.windowId!==windowId||Boolean(t.pinned)!==pinned||moving.some(m=>m.id===t.id))))throw Error(tr("The landing tab changed while dragging. Try again."));
        await this.move(moving.map(t=>t.id),windowId);
        const fresh=(await this.api.tabs.query({windowId})).sort((a,b)=>a.index-b.index);
        const ids=new Set(moving.map(t=>t.id)),remaining=fresh.filter(t=>!ids.has(t.id));
        const targetIds=new Set(target.map(t=>t.id));
        let index=anchor===null?(pinned?remaining.filter(t=>t.pinned).length:remaining.length):after?Math.max(...remaining.map((t,i)=>targetIds.has(t.id)?i:-1))+1:remaining.findIndex(t=>targetIds.has(t.id));
        if(index<0)throw Error(tr("The landing tab is no longer available."));
        const handled=new Set();
        for(const old of moving){if(handled.has(old.id))continue;const tab=await this.api.tabs.get(old.id);const groupMembers=tab.groupId===-1?[]:fresh.filter(t=>t.groupId===tab.groupId);
            if(groupMembers.length&&groupMembers.every(t=>ids.has(t.id))){await this.api.tabGroups.move(tab.groupId,{windowId,index});for(const t of groupMembers)handled.add(t.id);index+=groupMembers.length;}
            else{await this.api.tabs.move(tab.id,{windowId,index:index++});handled.add(tab.id);}
        }
        await this.returnActive([...ids]);return {count:ids.size};
    }
    async reorder({ keys, windowId, groupId, pinned }) {
        const tabs = (await this.api.tabs.query({ windowId })).filter(t => Boolean(t.incognito) === this.private && !isGridUrl(t.url, this.gridUrl)).sort((a, b) => a.index - b.index);
        if (groupId !== null) {
            const members = tabs.filter(t => t.groupId === groupId);
            const ids = keys.map(k => Number(k.split(':')[1]));
            if (ids.length !== members.length || new Set(ids).size !== ids.length || ids.some(id => !members.some(t => t.id === id))) throw new Error(tr("Tabs changed while dragging. Please try again."));
            const meta = await this.api.tabGroups.get(groupId);
            for (let i = 0; i < ids.length; i++) await this.api.tabs.move(ids[i], { index: members[0].index + i });
            const existing = await this.api.tabGroups.get(groupId).catch(() => null);
            const id = await this.api.tabs.group({ tabIds: ids, ...(existing ? { groupId } : { createProperties: { windowId } }) });
            await this.api.tabGroups.update(id, { title: meta.title, color: meta.color, collapsed: meta.collapsed });
            return;
        }
        const expected = new Set(tabs.filter(t => t.pinned === pinned).map(t => t.groupId === -1 ? `tab:${t.id}` : `group:${t.groupId}`));
        if (keys.length !== expected.size || new Set(keys).size !== keys.length || keys.some(k => !expected.has(k))) throw new Error(tr("Tabs changed while dragging. Please try again."));
        let index = pinned ? 0 : tabs.filter(t => t.pinned).length;
        for (const key of keys) {
            const [kind, rawId] = key.split(':');
            const id = Number(rawId);
            if (kind === 'group') {
                await this.api.tabGroups.move(id, { index });
                index += tabs.filter(t => t.groupId === id).length;
            } else {
                await this.api.tabs.move(id, { index });
                index++;
            }
        }
    }
}
