import {splitMembers} from './split-view.mjs';
import {tr} from './i18n.mjs';

export function splitSnapshots(tabs, ids) {
    const wanted = new Set(ids), seen = new Set();
    return tabs.flatMap(tab => {
        if (!wanted.has(tab.id)) return [];
        const pair = splitMembers(tab,tabs), key = `${tab.windowId}:${tab.splitViewId}`;
        if(pair.length!==2 || seen.has(key))return [];
        seen.add(key);
        return [{ids:pair.map(t=>t.id)}];
    });
}

// Restore membership using Chrome's native API. Never steal a surviving tab
// from a newer split or silently drop a failed restoration from the journal.
export async function restoreSplits(api, entry) {
    for(const split of entry.splits || []) {
        const ids=split.ids.map(id=>entry.tabs.find(record=>record.id===id)?.restoredId || id);
        const tabs=await Promise.all(ids.map(id=>api.tabs.get(id).catch(()=>null)));
        if(tabs.some(tab=>!tab)) {
            if(entry.kind==='grouping')continue; // Do not recreate subsequently closed tabs.
            throw Error(tr('A split view partner is no longer available.'));
        }
        const [a,b]=tabs;
        if(a.splitViewId>=0 && a.splitViewId===b.splitViewId)continue;
        if(a.splitViewId>=0 || b.splitViewId>=0 || a.windowId!==b.windowId || a.groupId!==b.groupId || a.pinned!==b.pinned)
            throw Error(tr('The split view tabs changed. Undo can retry when they are compatible.'));
        if(typeof api.tabs.createSplit!=='function')throw Error(tr('Restoring split views requires Chrome 155 or later.'));
        if(b.index!==a.index+1)await api.tabs.move(b.id,{index:b.index<a.index?a.index:a.index+1});
        await api.tabs.createSplit(ids);
    }
}

