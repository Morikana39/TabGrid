import { TabActions } from '../lib/tab-actions.mjs';
export function fixture(initialTabs, initialGroups = [], grid = 'chrome-extension://test/grid.html') {
    let nextId = 100, nextGroup = 200, nextWindow = 10, nextSplit = 300;
    let tabs = structuredClone(initialTabs).map(t => ({ pinned: false, groupId: -1, incognito: false, mutedInfo: { muted: false }, url: `https://example.com/${t.id}`, ...t }));
    let groups = structuredClone(initialGroups);
    let windows = [...new Set(tabs.map(t => t.windowId))].map(id => ({ id, incognito: Boolean(tabs.find(t => t.windowId === id).incognito) }));
    const storage = {}, local = {}, sessions = [], calls = [];
    const fail = { split: false, remove: new Set(), create: false, move: false, update: new Set() };
    const copy = value => structuredClone(value);
    const get = id => { const t = tabs.find(t => t.id === id); if (!t) throw new Error('No tab'); return t; };
    const normalize = wid => tabs.filter(t => t.windowId === wid).sort((a, b) => a.index - b.index).forEach((t, i) => { t.index = i; });
    const cleanGroups = () => { groups = groups.filter(g => tabs.some(t => t.groupId === g.id)); };
    const api = {
        storage: { session: { async get(key) { return key === null ? copy(storage) : { [key]: copy(storage[key]) }; }, async set(data) { Object.assign(storage, copy(data)); }, async remove(key) { delete storage[key]; } } },
        extension: { inIncognitoContext: false },
        tabs: {
            async query(query) { return copy(tabs.filter(t => (query.windowId === undefined || t.windowId === query.windowId) && (query.groupId === undefined || t.groupId === query.groupId))); },
            async get(id) { return copy(get(id)); },
            async remove(ids) { for (const id of [ids].flat()) { if (fail.remove.has(id)) throw new Error('Locked tab'); const t = get(id); if(t.splitViewId>=0)for(const peer of tabs)if(peer.id!==id && peer.splitViewId===t.splitViewId)peer.splitViewId=-1; sessions.unshift({ tab: { ...copy(t), sessionId: `s${id}` } }); tabs = tabs.filter(t => t.id !== id); normalize(t.windowId); cleanGroups(); } },
            async create(props) { if (fail.create) throw new Error('Create failed'); const t = { id: nextId++, incognito: Boolean(windows.find(w => w.id === props.windowId)?.incognito), groupId: -1, pinned: false, mutedInfo: { muted: false }, ...props, index: props.index ?? tabs.filter(t => t.windowId === props.windowId).length }; for (const other of tabs) if (other.windowId === t.windowId && other.index >= t.index) other.index++; tabs.push(t); calls.push(['create', copy(props)]); return copy(t); },
            async update(id, props) { if (fail.update.has(id)) throw new Error('Update failed'); const t = get(id); if (props.active) for (const other of tabs) if (other.windowId === t.windowId) other.active = false; Object.assign(t, props); if (typeof props.muted === 'boolean') t.mutedInfo = {muted:props.muted,reason:'extension',extensionId:'test'}; return copy(t); },
            async move(ids, props) {
                if (fail.move) throw new Error('Move failed');
                const moving = [ids].flat().map(get);
                for (const tab of moving) if(tab.splitViewId>=0 && (props.windowId!==undefined && props.windowId!==tab.windowId || props.index!==tab.index)) {
                    const split=tab.splitViewId;for(const peer of tabs)if(peer.splitViewId===split)peer.splitViewId=-1;
                }
                const oldWindows = new Set(moving.map(t => t.windowId));
                const dest = props.windowId ?? moving[0].windowId;
                const others = tabs.filter(t => !moving.includes(t) && t.windowId === dest).sort((a,b) => a.index-b.index);
                const index = props.index < 0 ? others.length : Math.min(props.index, others.length);
                for (const tab of moving) { if (tab.windowId !== dest) tab.groupId = -1; tab.windowId = dest; }
                const left=others[index-1],right=others[index];
                if(left?.splitViewId>=0 && left.splitViewId===right?.splitViewId){const split=left.splitViewId;for(const peer of tabs)if(peer.splitViewId===split)peer.splitViewId=-1;}
                others.splice(index, 0, ...moving);
                others.forEach((tab,i) => { tab.index = i; });
                for (const windowId of oldWindows) if (windowId !== dest) normalize(windowId);
                calls.push(['move', copy(ids), copy(props)]); cleanGroups();
                return copy(Array.isArray(ids) ? moving : moving[0]);
            },
            async createSplit(ids) {
                if(fail.split)throw Error('Split failed');
                const [a,b]=ids.map(get);
                if(ids.length!==2 || a.id===b.id || a.splitViewId>=0 || b.splitViewId>=0 || Math.abs(a.index-b.index)!==1 || a.windowId!==b.windowId || a.groupId!==b.groupId || a.pinned!==b.pinned)throw Error('Incompatible split tabs');
                const id=nextSplit++;a.splitViewId=id;b.splitViewId=id;calls.push(['createSplit',copy(ids)]);return id;
            },
            async unsplit(id) { for(const tab of tabs)if(tab.splitViewId===id)tab.splitViewId=-1;calls.push(['unsplit',id]); },
            async ungroup(ids) { for (const id of [ids].flat()) get(id).groupId = -1; cleanGroups(); },
            async group(props) { const id = props.groupId ?? nextGroup++; if (!groups.some(g => g.id === id)) groups.push({ id, windowId: get(props.tabIds[0]).windowId, title: '', color: 'grey' }); for (const tid of props.tabIds) get(tid).groupId = id; cleanGroups(); return id; }
        },
        tabGroups: {
            async query() { return copy(groups); },
            async get(id) { const g = groups.find(g => g.id === id); if (!g) throw new Error('No group'); return copy(g); },
            async update(id, props) { const g = groups.find(g => g.id === id); if (!g) throw new Error('No group'); Object.assign(g, props); return copy(g); },
            async move(id, props) {
                if(fail.move)throw Error('Move failed');
                const members=tabs.filter(t=>t.groupId===id).sort((a,b)=>a.index-b.index);
                const group=groups.find(g=>g.id===id),oldWindow=group.windowId,dest=props.windowId??oldWindow;
                const rest=tabs.filter(t=>t.windowId===dest && !members.includes(t)).sort((a,b)=>a.index-b.index);
                const index=props.index<0?rest.length:Math.min(props.index,rest.length);
                if(rest[index-1]?.splitViewId>=0 && rest[index-1].splitViewId===rest[index]?.splitViewId)throw Error('Group insertion breaks split');
                members.forEach(t=>{t.windowId=dest;});rest.splice(index,0,...members);rest.forEach((t,i)=>{t.index=i;});
                group.windowId=dest;if(oldWindow!==dest)normalize(oldWindow);
                calls.push(['groupMove',id,copy(props)]);return copy(group);
            }
        },
        windows: {
            async getAll() { return copy(windows); },
            async update(id, props) { const w = windows.find(w => w.id === id); if (!w) throw new Error('No window'); if (props.focused) for (const other of windows) other.focused = false; Object.assign(w, props); calls.push(['windowUpdate', id, copy(props)]); return copy(w); },
            async get(id) { const w = windows.find(w => w.id === id); if (!w) throw new Error('No window'); return copy(w); },
            async create(props = {}) { const w = { id: nextWindow++, incognito: Boolean(props.incognito) }; windows.push(w); const tab = await api.tabs.create({ windowId: w.id, url: 'chrome://newtab/' }); return { ...w, tabs: [tab] }; }
        },
        sessions: {
            async getRecentlyClosed() { return copy(sessions); },
            async restore(id) {
                const index = sessions.findIndex(s => s.tab?.sessionId === id || s.window?.sessionId === id || s.window?.tabs.some(t => t.sessionId === id));
                if (index < 0) throw new Error('Expired');
                const session = sessions[index]; calls.push(['restoreSession', id]);
                if (session.window?.sessionId === id) {
                    const window = {id:nextWindow++,incognito:false}; windows.push(window); sessions.splice(index,1);
                    const restored=[];
                    for (const record of session.window.tabs) restored.push(await api.tabs.create({...record,id:nextId++,windowId:window.id,groupId:-1}));
                    return {window:{...window,tabs:restored}};
                }
                let record;
                if (session.tab) { record=session.tab; sessions.splice(index,1); }
                else {
                    const child=session.window.tabs.findIndex(t=>t.sessionId===id);
                    [record]=session.window.tabs.splice(child,1);
                    if (!session.window.tabs.length) sessions.splice(index,1);
                }
                const t = await api.tabs.create({ ...record, splitViewId:-1, id: nextId++, windowId:record.windowId ?? windows[0]?.id, groupId: -1, active: false });
                for (const other of tabs) if (other.windowId === t.windowId) other.active = other.id === t.id;
                return { tab: copy(get(t.id)) };
            }
        }
    };
    api.storage.local = { async get(key) { return key === null ? copy(local) : { [key]: copy(local[key]) }; }, async set(data) { Object.assign(local, copy(data)); }, async remove(key) { delete local[key]; } };
    return { api, local, fail, calls, storage, sessions, tabs: () => copy(tabs), groups: () => copy(groups), removeWindow: id => { windows = windows.filter(w => w.id !== id); }, actions: new TabActions(api, grid) };
}
