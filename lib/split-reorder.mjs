import {splitMembers} from './split-view.mjs';
import {tr} from './i18n.mjs';

const changed = () => Error(tr('Tabs changed while dragging. Please try again.'));
const unsupported = () => Error(tr('Chrome cannot move an intact split view through this API.'));
const signature = tabs => JSON.stringify([...tabs].sort((a,b)=>a.index-b.index).map(t=>[t.id,t.windowId,t.index,t.groupId,Boolean(t.pinned),t.splitViewId ?? -1]));

// Plan first: no split member is ever passed to tabs.move. Unsplit cards and
// whole groups move around stationary split collections, at collection edges.
export function planSplitReorder(allTabs, desiredIds, {groupId=null}={}) {
    const tabs=[...allTabs].sort((a,b)=>a.index-b.index).map(t=>({...t}));
    const wanted=new Set(desiredIds);
    if(wanted.size!==desiredIds.length || desiredIds.some(id=>!tabs.some(t=>t.id===id)))throw changed();
    const units=[], consumed=new Set();
    for(const id of desiredIds){
        if(consumed.has(id))continue;
        const tab=tabs.find(t=>t.id===id);
        const group=groupId===null && tab.groupId>=0 ? tabs.filter(t=>t.groupId===tab.groupId) : [];
        const pair=splitMembers(tab,tabs);
        const members=group.length?group:pair.length===2?pair:[tab];
        const ids=members.map(t=>t.id), start=desiredIds.indexOf(id);
        if(ids.some((member,i)=>desiredIds[start+i]!==member))throw changed();
        units.push({ids, groupId:group.length?tab.groupId:null, fixed:!group.length&&pair.length===2});
        ids.forEach(id=>consumed.add(id));
    }
    // Two ungrouped split collections cannot exchange places by moving only
    // surrounding tabs. Reject the entire plan before the first API call.
    const fixed=units.filter(unit=>unit.fixed);
    if(fixed.some((unit,i)=>i && tabs.find(t=>t.id===fixed[i-1].ids[0]).index>tabs.find(t=>t.id===unit.ids[0]).index))throw unsupported();
    const steps=[];
    let nextId=null;
    for(const unit of [...units].reverse()){
        if(!unit.fixed){
            const current=tabs.filter(t=>unit.ids.includes(t.id));
            if(current.some((tab,i)=>i && tab.index!==current[i-1].index+1))throw changed();
            const rest=tabs.filter(t=>!unit.ids.includes(t.id));
            const index=nextId===null
                ? rest.reduce((end,t,i)=>wanted.has(t.id)?i+1:end,0)
                : rest.findIndex(t=>t.id===nextId);
            if(index<0)throw changed();
            if(current[0].index!==index){
                // Inserting between either pane would dissolve the destination.
                const left=rest[index-1],right=rest[index];
                if(left?.splitViewId>=0 && left.splitViewId===right?.splitViewId)throw unsupported();
                const before=signature(tabs);
                rest.splice(index,0,...current);rest.forEach((t,i)=>{t.index=i;});
                tabs.splice(0,tabs.length,...rest);
                steps.push({...unit,index,before,after:signature(tabs)});
            }
        }
        nextId=unit.ids[0];
    }
    if(tabs.filter(t=>wanted.has(t.id)).some((tab,i)=>tab.id!==desiredIds[i]))throw unsupported();
    return steps;
}

export async function reorderAroundSplits(api, allTabs, desiredIds, options) {
    const steps=planSplitReorder(allTabs,desiredIds,options);
    const windowId=allTabs[0]?.windowId;
    for(const step of steps){
        const current=await api.tabs.query({windowId});
        if(signature(current)!==step.before)throw changed();
        if(step.groupId!==null)await api.tabGroups.move(step.groupId,{index:step.index});
        else await api.tabs.move(step.ids[0],{index:step.index});
        // Stop if Chrome or a concurrent user action changed split membership.
        if(signature(await api.tabs.query({windowId}))!==step.after)throw changed();
    }
}
