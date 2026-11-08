import test from 'node:test';
import assert from 'node:assert/strict';
import {openItems,selectedTabs} from '../lib/tab-model.mjs';
import {TabActions} from '../lib/tab-actions.mjs';
import {fixture} from './chrome-mock.mjs';
const tabs = [
    {id:1,index:0,windowId:1,groupId:-1,pinned:false,title:'Alpha',splitViewId:0},
    {id:2,index:1,windowId:1,groupId:-1,pinned:false,title:'Beta',splitViewId:0},
    {id:3,index:2,windowId:1,groupId:-1,pinned:false,title:'Gamma',splitViewId:-1}
];
test('split cards combine native pairs and searching either pane retains the pair',()=>{
    const items=openItems(tabs,[],{windowId:1});
    assert.equal(items.length,2);
    assert.deepEqual(items[0].members.map(t=>t.id),[1,2]);
    assert.equal(openItems(tabs,[],{windowId:1,query:'Beta'})[0].key,'tab:1');
    assert.deepEqual(selectedTabs(new Set(['tab:1']),tabs).map(t=>t.id),[1,2]);
});
test('missing membership, a closed partner and unrelated windows remain independent',()=>{
    assert.equal(openItems(tabs.map(({splitViewId,...tab})=>tab),[],{windowId:1}).length,3);
    assert.equal(openItems(tabs.slice(1),[],{windowId:1})[0].members,undefined);
    assert.equal(openItems([tabs[0],{...tabs[1],windowId:2}],[],{windowId:1,allWindows:true}).length,2);
});
test('reordering other cards around a split keeps both native tabs adjacent',async()=>{
    const f=fixture(tabs,[],'chrome-extension://test/grid.html');
    const actions=new TabActions(f.api,'chrome-extension://test/grid.html');
    await actions.reorder({keys:['tab:3','tab:1'],windowId:1,groupId:null,pinned:false});
    assert.deepEqual(f.tabs().sort((a,b)=>a.index-b.index).map(t=>t.id),[3,1,2]);
});
test('group reorder accepts collapsed split cards and already expanded pairs',async()=>{
    for (const keys of [['tab:3','tab:1'],['tab:3','tab:1','tab:2']]) {
        const f=fixture(tabs.map(tab=>({...tab,groupId:10})),[{id:10,windowId:1,title:'Pair group',color:'blue'}]);
        await f.actions.reorder({keys,windowId:1,groupId:10,pinned:false});
        assert.deepEqual(f.tabs().sort((a,b)=>a.index-b.index).map(tab=>tab.id),[3,1,2]);
    }
});
test('dropping after a split card places a tab after both panes',async()=>{
    const f=fixture([...tabs,{id:4,index:0,windowId:2,groupId:-1,pinned:false}]);
    await f.actions.dropAt({keys:['tab:4'],windowId:1,anchor:'tab:1',after:true,pinned:false});
    assert.deepEqual(f.tabs().filter(t=>t.windowId===1).sort((a,b)=>a.index-b.index).map(t=>t.id),[1,2,4,3]);
});
test('unsupported split moves are rejected before changing any tabs',async()=>{
    const f=fixture([...tabs,{id:4,index:0,windowId:2,groupId:-1,pinned:false}]);
    const before=f.tabs();
    await assert.rejects(f.actions.move([1,2],2),/cannot move/);
    await assert.rejects(f.actions.dropAt({keys:['tab:1'],windowId:2,anchor:'tab:4',after:true}),/cannot move/);
    assert.deepEqual(f.tabs(),before);
});
const assertPair = (tabs) => {
    const pair=tabs.filter(t=>t.title==='Alpha'||t.title==='Beta');
    assert.equal(pair.length,2);assert.ok(pair[0].splitViewId>=0);
    assert.equal(pair[0].splitViewId,pair[1].splitViewId);
    assert.equal(Math.abs(pair[0].index-pair[1].index),1);
};
test('Undo closing either pane or the whole pair restores native split membership',async()=>{
    for(const ids of [[1],[2],[1,2]]){
        const f=fixture(tabs);
        await f.actions.close(ids);
        const result=await f.actions.undo();
        assert.equal(result.error,null);assertPair(f.tabs());assert.equal((await f.actions.journal()).length,0);
    }
});
test('separate and Undo use native split APIs',async()=>{
    const f=fixture(tabs);
    await f.actions.separateSplit(0);
    assert.equal(f.tabs().find(t=>t.id===1).splitViewId,-1);
    assert.equal((await f.actions.journal()).at(-1).kind,'split');
    await f.actions.undo();assertPair(f.tabs());
});
test('failed split restoration stays retryable without recreating restored tabs',async()=>{
    const f=fixture(tabs);await f.actions.close([1,2]);f.fail.split=true;
    assert.ok((await f.actions.undo()).error);
    const ids=f.tabs().map(t=>t.id);
    f.fail.split=false;assert.equal((await f.actions.undo()).error,null);
    assert.deepEqual(f.tabs().map(t=>t.id),ids);assertPair(f.tabs());
});
test('Undo does not steal a surviving pane from a newer split',async()=>{
    const f=fixture(tabs);await f.actions.close([1]);
    await f.api.tabs.createSplit([2,3]);
    assert.ok((await f.actions.undo()).error);
    const live=f.tabs();assert.equal(live.find(t=>t.id===2).splitViewId,live.find(t=>t.id===3).splitViewId);
});
test('grouping and ungrouping Undo preserve split pairs',async()=>{
    const f=fixture(tabs);
    const group=await f.actions.group([1,2],null,'Paired');assertPair(f.tabs());
    await f.actions.undo();assertPair(f.tabs());assert.equal(f.tabs()[0].groupId,-1);
    await f.actions.group([1,2],null,'Paired');
    await f.actions.ungroup([1,2]);assertPair(f.tabs());
    assert.equal((await f.actions.undo()).error,null);assertPair(f.tabs());assert.notEqual(f.tabs()[0].groupId,-1);
});
test('reordering cannot silently break a stationary split pair',async()=>{
    const initial=[{...tabs[2],index:0},{...tabs[0],index:1},{...tabs[1],index:2}];
    const f=fixture(initial);
    await f.actions.reorder({keys:['tab:1','tab:3'],windowId:1,groupId:null,pinned:false});
    assert.deepEqual(f.tabs().sort((a,b)=>a.index-b.index).map(t=>t.id),[1,2,3]);
    assertPair(f.tabs());assert.equal(f.tabs().find(t=>t.id===1).splitViewId,0);
});
test('drag grouping resolves all panes and drop targets receive both tab IDs',async()=>{
    const {groupDestination}=await import('../lib/drag-grouping.mjs');
    const {dropTargetTabIds}=await import('../lib/tab-gestures.mjs');
    const [pair,single]=openItems(tabs,[],{windowId:1});
    assert.deepEqual(groupDestination(single,pair).targetIds,[1,2]);
    assert.equal(groupDestination(pair,single).targetId,3);
    assert.deepEqual(await dropTargetTabIds([{dataset:{key:pair.key},itemModel:pair}],'new',()=>[]),[1,2]);
});
test('Undo notice offers separation and retains failed split restoration',async()=>{
    const {UndoNotice}=await import('../lib/tab-ui.mjs');
    const notice=new UndoNotice({change:()=>{},schedule:()=>1,cancel:()=>{}});
    notice.observe([]);
    const f=fixture(tabs);await f.actions.separateSplit(0);
    notice.observe(await f.actions.journal());assert.equal(notice.entry.kind,'split');
    await f.actions.undo();notice.observe(await f.actions.journal());assert.equal(notice.entry,null);
    await f.actions.close([1]);notice.observe(await f.actions.journal());
    f.fail.split=true;await f.actions.undo();notice.observe(await f.actions.journal());
    assert.ok(notice.entry);assert.equal(notice.entry.splitRestorePending,true);
    f.fail.split=false;await f.actions.undo();notice.observe(await f.actions.journal());assert.equal(notice.entry,null);
});
test('unsupported native split restoration retains the journal for retry',async()=>{
    const f=fixture(tabs);await f.actions.close([1]);delete f.api.tabs.createSplit;
    assert.match((await f.actions.undo()).error,/Chrome 155/);
    assert.equal((await f.actions.journal()).length,1);
    assert.equal(f.tabs().filter(t=>t.title==='Alpha').length,1);
});

const permutations = values => values.length ? values.flatMap((value,i)=>permutations(values.filter((_,j)=>j!==i)).map(rest=>[value,...rest])) : [[]];
test('surrounding-tab moves cover every permutation while keeping the original split ID',async()=>{
    const initial=[...tabs,{id:4,index:3,windowId:1,groupId:-1,pinned:false}];
    const units=[[1,2],[3],[4]];
    for(const start of permutations(units))for(const end of permutations(units)){
        const ordered=start.flat().map((id,index)=>({...initial.find(t=>t.id===id),index}));
        const f=fixture(ordered);
        await f.actions.reorder({keys:end.map(ids=>`tab:${ids[0]}`),windowId:1,groupId:null,pinned:false});
        assert.deepEqual(f.tabs().sort((a,b)=>a.index-b.index).map(t=>t.id),end.flat());
        assertPair(f.tabs());assert.equal(f.tabs().find(t=>t.id===1).splitViewId,0);
        assert.ok(f.calls.filter(c=>c[0]==='move').every(c=>![c[1]].flat().some(id=>id===1||id===2)));
    }
});
test('multiple splits retain their order; crossing them fails before any move',async()=>{
    const initial=[...tabs,{id:4,index:3,windowId:1,splitViewId:9},{id:5,index:4,windowId:1,splitViewId:9},{id:6,index:5,windowId:1}];
    for(const order of permutations([1,3,4,6])){
        const f=fixture(initial),before=f.tabs();
        const task=f.actions.reorder({keys:order.map(id=>`tab:${id}`),windowId:1,groupId:null,pinned:false});
        if(order.indexOf(1)>order.indexOf(4)){
            await assert.rejects(task,/cannot move/);assert.deepEqual(f.tabs(),before);assert.equal(f.calls.length,0);
        }else{
            await task;assert.deepEqual(f.tabs().sort((a,b)=>a.index-b.index).map(t=>t.id),order.flatMap(id=>id===1?[1,2]:id===4?[4,5]:[id]));
            assert.equal(f.tabs().find(t=>t.id===1).splitViewId,0);assert.equal(f.tabs().find(t=>t.id===4).splitViewId,9);
        }
    }
});
test('reorder inside a group preserves outside tabs and a TabGrid tab index offset',async()=>{
    const f=fixture([{id:9,index:0,windowId:1,url:'chrome-extension://test/grid.html'},...tabs.map(t=>({...t,index:t.index+1,groupId:10})),{id:8,index:4,windowId:1}], [{id:10,windowId:1,title:'Group'}]);
    await f.actions.reorder({keys:['tab:3','tab:1'],windowId:1,groupId:10,pinned:false});
    assert.deepEqual(f.tabs().sort((a,b)=>a.index-b.index).map(t=>t.id),[9,3,1,2,8]);assertPair(f.tabs());
});
test('continue-drag backend ungroups both panes, places the pair, and offers grouping Undo',async()=>{
    const f=fixture(tabs.map(t=>({...t,groupId:10})),[{id:10,windowId:1,title:'Group',color:'blue'}]);
    await f.actions.dropIntoGroup([1,2],'ungroup',1);
    await f.actions.dropAt({keys:['tab:1'],windowId:1,anchor:'group:10',after:true,pinned:false});
    assert.deepEqual(f.tabs().sort((a,b)=>a.index-b.index).map(t=>t.id),[3,1,2]);
    assertPair(f.tabs());assert.equal(f.tabs().find(t=>t.id===1).splitViewId,0);
    assert.equal(f.tabs().find(t=>t.id===1).groupId,-1);
    assert.equal((await f.actions.undo()).error,null);assertPair(f.tabs());
    assert.equal(f.tabs().find(t=>t.id===1).groupId,10);
});
test('move failure stops the plan without separating the pair',async()=>{
    const f=fixture(tabs);f.fail.move=true;
    await assert.rejects(f.actions.reorder({keys:['tab:3','tab:1'],windowId:1,groupId:null,pinned:false}),/Move failed/);
    assertPair(f.tabs());assert.equal(f.tabs().find(t=>t.id===1).splitViewId,0);
});
test('stale tab membership is detected before executing a planned move',async()=>{
    const {reorderAroundSplits}=await import('../lib/split-reorder.mjs');
    const f=fixture(tabs),before=await f.api.tabs.query({windowId:1});
    await f.api.tabs.unsplit(0);
    await assert.rejects(reorderAroundSplits(f.api,before,[3,1,2]),/Tabs changed/);
    assert.equal(f.calls.filter(c=>c[0]==='move').length,0);
});
test('split drag preview omits both panes without modifying group membership',async()=>{
    const {groupPreviewTiles}=await import('../lib/tab-focus.mjs');
    assert.deepEqual(groupPreviewTiles(tabs,[1,2]).filter(tile=>tile.tab).map(tile=>tile.tab.id),[3]);
    assert.equal(tabs.length,3);
});
test('pinned pair reorder does not cross into unpinned tabs',async()=>{
    const f=fixture([...tabs.map(t=>({...t,pinned:true})),{id:9,index:3,windowId:1}]);
    await f.actions.reorder({keys:['tab:3','tab:1'],windowId:1,groupId:null,pinned:true});
    assert.deepEqual(f.tabs().sort((a,b)=>a.index-b.index).map(t=>t.id),[3,1,2,9]);
    assertPair(f.tabs());assert.ok(f.tabs().filter(t=>t.id!==9).every(t=>t.pinned));
});
test('leaving a group containing only the pair can place it beside an ordinary card',async()=>{
    const f=fixture(tabs.map(t=>({...t,groupId:t.id===3?-1:10})),[{id:10,windowId:1,title:'Only pair'}]);
    await f.actions.dropIntoGroup([1,2],'ungroup',1);
    await f.actions.dropAt({keys:['tab:1'],windowId:1,anchor:'tab:3',after:true,pinned:false});
    assert.deepEqual(f.tabs().sort((a,b)=>a.index-b.index).map(t=>t.id),[3,1,2]);
    assertPair(f.tabs());assert.equal(f.groups().length,0);
});
