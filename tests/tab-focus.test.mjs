import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './chrome-mock.mjs';
import { TabFocus, isLastOpened, groupPreviewTiles } from '../lib/tab-focus.mjs';
const grid = 'chrome-extension://test/grid.html';
const tabs = [
    {id:1,windowId:1,index:0,groupId:7,lastAccessed:100},
    {id:2,windowId:1,index:1,lastAccessed:200},
    {id:3,windowId:2,index:0,active:true},
    {id:99,windowId:1,index:2,url:grid,active:true},
    {id:4,windowId:3,index:0,incognito:true}
];
test('last opened survives worker recreation, excludes the grid and stays per-window', async () => {
    const f=fixture(tabs);
    await f.actions.rememberOpened('tab:1');
    await f.actions.rememberOpened('tab:99');
    await f.actions.rememberOpened('tab:4');
    await f.actions.rememberOpened('tab:missing');
    const focus=new TabFocus(f.api,grid);
    assert.deepEqual(await focus.snapshot(),{1:'tab:1',2:'tab:3'});
    assert.deepEqual(f.storage.tabgridLastOpened,{1:'tab:1'});
    assert.equal(isLastOpened({key:'group:7',windowId:1,members:[{id:1}]},await focus.snapshot()),true);
    assert.equal(isLastOpened({key:'tab:2',windowId:1},await focus.snapshot()),false);
});
test('opening a group records it and stale highlights fall back to the last live website', async () => {
    const f=fixture(tabs);
    await f.actions.rememberOpened('group:7');
    assert.equal((await f.actions.lastOpenedSnapshot())[1],'group:7');
    await f.api.tabs.remove(1);
    assert.equal((await f.actions.lastOpenedSnapshot())[1],'tab:2');
});
test('private last-opened state never reads or writes normal storage', async () => {
    const f=fixture(tabs); f.api.extension.inIncognitoContext=true;
    f.api.storage.session.get=async()=>{throw new Error('Private storage read');};
    f.api.storage.session.set=async()=>{throw new Error('Private storage write');};
    const focus=new TabFocus(f.api,grid);
    await focus.remember('tab:4'); await focus.remember('tab:1');
    assert.deepEqual(await focus.snapshot(),{3:'tab:4'});
});
test('group previews retain native order, empty tiles and exact overflow counts', () => {
    const members=Array.from({length:6},(_,i)=>({id:i+1,index:i}));
    assert.deepEqual(groupPreviewTiles(members.slice(0,2)).map(t=>t.tab?.id),[1,2,undefined,undefined]);
    assert.deepEqual(groupPreviewTiles(members.slice(0,4)).map(t=>t.tab?.id),[1,2,3,4]);
    assert.deepEqual(groupPreviewTiles(members.slice(0,5).reverse()),[{tab:members[0]},{tab:members[1]},{tab:members[2]},{remaining:2}]);
    assert.equal(groupPreviewTiles(members)[3].remaining,3);
});
test('Undo returns to its requesting grid after native session activation', async () => {
    const f=fixture(tabs);
    await f.actions.close([1,3]);
    const result=await f.actions.undo(null,99);
    assert.equal(result.count,2);
    assert.equal((await f.api.tabs.get(99)).active,true);
    assert.equal(f.tabs().find(t=>t.url.endsWith('/1')).active,false);
    assert.ok(f.calls.some(c=>c[0]==='windowUpdate'&&c[1]===1&&c[2].focused));
});
test('partial Undo failures still return to the grid and non-grid targets are not focused', async () => {
    const f=fixture(tabs);
    await f.actions.close([1]); f.fail.update.add(100);
    assert.ok((await f.actions.undo(null,99)).error);
    assert.equal((await f.api.tabs.get(99)).active,true);
    f.calls.length=0;
    await f.actions.undo(null,2);
    assert.equal(f.calls.some(c=>c[0]==='windowUpdate'),false);
});

test('a departing tab disappears from group previews without mutating group membership',()=>{
    const members=Array.from({length:6},(_,index)=>({id:index+1,index}));
    const tiles=groupPreviewTiles(members,2);
    assert.deepEqual(tiles.filter(tile=>tile.tab).map(tile=>tile.tab.id),[1,3,4]);assert.equal(tiles[3].remaining,2);
    assert.equal(members.length,6);assert.equal(groupPreviewTiles(members)[1].tab.id,2);
    assert.ok(groupPreviewTiles([members[0]],1).every(tile=>!tile.tab));
});

test('Undo activation events cannot replace the previously opened tab or group after the action queue drains',async()=>{
    for(const key of ['tab:1','group:7']){
        const f=fixture(tabs,[{id:7,windowId:1,title:'Research',color:'blue'}]);
        await f.actions.rememberOpened(key);await f.actions.close([2]);
        const restore=f.api.sessions.restore,queued=[];
        f.api.sessions.restore=async id=>{
            const result=await restore(id);
            const task=f.actions.activationTask(result.tab.id);if(task)queued.push(task);
            return result;
        };
        await f.actions.undo(null,99);
        for(const task of queued)await task();
        assert.equal((await f.actions.lastOpenedSnapshot())[1],key);
        assert.equal(f.actions.restoring,false);
        const restored=f.tabs().find(t=>t.url.endsWith('/2'));
        await f.actions.activationTask(restored.id)();
        assert.equal((await f.actions.lastOpenedSnapshot())[1],`tab:${restored.id}`);
    }
});

test('group layouts reserve their last tile for the remaining count only when enabled',()=>{
    const members=Array.from({length:6},(_,index)=>({id:index+1,index}));
    for(const capacity of [2,3,4]){
        const tiles=groupPreviewTiles(members,null,{capacity});
        assert.equal(tiles.length,capacity);
        assert.equal(tiles.at(-1).remaining,7-capacity);
        assert.deepEqual(groupPreviewTiles(members,null,{capacity,overflow:false}).map(tile=>tile.tab.id),members.slice(0,capacity).map(tab=>tab.id));
        assert.equal(groupPreviewTiles(members.slice(0,capacity),null,{capacity}).at(-1).tab.id,capacity);
        assert.equal(groupPreviewTiles([],null,{capacity}).length,capacity);
    }
    assert.deepEqual(groupPreviewTiles(members,1,{capacity:2}),[{tab:members[1]},{remaining:4}]);
});

test('group thumbnail order follows each grid sort before overflow and exclusion',async()=>{
    const {openItems}=await import('../lib/tab-model.mjs');
    const members=[
        {id:1,index:2,title:'Alpha',url:'https://z.example',lastAccessed:20},
        {id:2,index:0,title:'Charlie',url:'https://a.example',lastAccessed:10},
        {id:3,index:1,title:'Bravo',url:'https://m.example',lastAccessed:30}
    ].map(tab=>({...tab,windowId:1,groupId:7}));
    const original=structuredClone(members);
    for(const [sort,expected] of Object.entries({default:[2,3,1],title:[1,3,2],domain:[2,3,1],accessed:[3,1,2]})){
        assert.deepEqual(groupPreviewTiles(members,null,{sort,capacity:3}).map(tile=>tile.tab.id),expected);
        assert.deepEqual(openItems(members,[],{windowId:1,groupId:7,sort}).map(item=>item.tab.id),expected);
        const overflow=groupPreviewTiles(members,null,{sort,capacity:2});
        assert.equal(overflow[0].tab.id,expected[0]);assert.equal(overflow[1].remaining,2);
        assert.deepEqual(groupPreviewTiles(members,null,{sort,capacity:2,overflow:false}).map(tile=>tile.tab.id),expected.slice(0,2));
        assert.deepEqual(groupPreviewTiles(members,expected[0],{sort,capacity:2}).map(tile=>tile.tab.id),expected.slice(1));
    }
    assert.deepEqual(members,original);
});
