import { TabActions } from '../lib/tab-actions.mjs';
export function fixture(initialTabs, initialGroups = [], grid = 'chrome-extension://test/grid.html') {
    let nextId = 100, nextGroup = 200, nextWindow = 10;
    let tabs = structuredClone(initialTabs).map(t => ({ pinned: false, groupId: -1, incognito: false, mutedInfo: { muted: false }, url: `https://example.com/${t.id}`, ...t }));
    let groups = structuredClone(initialGroups);
    let windows = [...new Set(tabs.map(t => t.windowId))].map(id => ({ id, incognito: Boolean(tabs.find(t => t.windowId === id).incognito) }));
    const storage = {}, local = {}, sessions = [], calls = [];
    const fail = { remove: new Set(), create: false, move: false, update: new Set() };
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
            async remove(ids) { for (const id of [ids].flat()) { if (fail.remove.has(id)) throw new Error('Locked tab'); const t = get(id); sessions.unshift({ tab: { ...copy(t), sessionId: `s${id}` } }); tabs = tabs.filter(t => t.id !== id); normalize(t.windowId); cleanGroups(); } },
            async create(props) { if (fail.create) throw new Error('Create failed'); const t = { id: nextId++, incognito: Boolean(windows.find(w => w.id === props.windowId)?.incognito), groupId: -1, pinned: false, mutedInfo: { muted: false }, ...props, index: props.index ?? tabs.filter(t => t.windowId === props.windowId).length }; for (const other of tabs) if (other.windowId === t.windowId && other.index >= t.index) other.index++; tabs.push(t); calls.push(['create', copy(props)]); return copy(t); },
            async update(id, props) { if (fail.update.has(id)) throw new Error('Update failed'); const t = get(id); if (props.active) for (const other of tabs) if (other.windowId === t.windowId) other.active = false; Object.assign(t, props); return copy(t); },
            async move(ids, props) { if (fail.move) throw new Error('Move failed'); const result = []; for (const id of [ids].flat()) { const t = get(id), oldWindow = t.windowId; const dest = props.windowId ?? oldWindow; const others = tabs.filter(o => o.id !== id && o.windowId === dest).sort((a,b) => a.index-b.index); const index = props.index < 0 ? others.length : Math.min(props.index, others.length); if (oldWindow !== dest) t.groupId = -1; t.windowId = dest; others.splice(index, 0, t); others.forEach((o,i) => { o.index = i; }); normalize(oldWindow); result.push(copy(t)); } calls.push(['move', copy(ids), copy(props)]); cleanGroups(); return Array.isArray(ids) ? result : result[0]; },
            async ungroup(ids) { for (const id of [ids].flat()) get(id).groupId = -1; cleanGroups(); },
            async group(props) { const id = props.groupId ?? nextGroup++; if (!groups.some(g => g.id === id)) groups.push({ id, windowId: get(props.tabIds[0]).windowId, title: '', color: 'grey' }); for (const tid of props.tabIds) get(tid).groupId = id; cleanGroups(); return id; }
        },
        tabGroups: {
            async query() { return copy(groups); },
            async get(id) { const g = groups.find(g => g.id === id); if (!g) throw new Error('No group'); return copy(g); },
            async update(id, props) { const g = groups.find(g => g.id === id); if (!g) throw new Error('No group'); Object.assign(g, props); return copy(g); },
            async move(id, props) { const members = tabs.filter(t => t.groupId === id).sort((a,b) => a.index-b.index); const meta = copy(groups.find(g => g.id === id)); for (let i=0;i<members.length;i++) await api.tabs.move(members[i].id, { ...props, index: props.index < 0 ? -1 : props.index+i }); for(const t of members) get(t.id).groupId = id; groups = groups.filter(g => g.id !== id); groups.push({ ...meta, windowId: props.windowId ?? meta.windowId }); calls.push(['groupMove', id, copy(props)]); }
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
                const t = await api.tabs.create({ ...record, id: nextId++, windowId:record.windowId ?? windows[0]?.id, groupId: -1, active: false });
                for (const other of tabs) if (other.windowId === t.windowId) other.active = other.id === t.id;
                return { tab: copy(get(t.id)) };
            }
        }
    };
    api.storage.local = { async get(key) { return key === null ? copy(local) : { [key]: copy(local[key]) }; }, async set(data) { Object.assign(local, copy(data)); }, async remove(key) { delete local[key]; } };
    return { api, local, fail, calls, storage, sessions, tabs: () => copy(tabs), groups: () => copy(groups), removeWindow: id => { windows = windows.filter(w => w.id !== id); }, actions: new TabActions(api, grid) };
}
