import test from 'node:test';
import { fixture } from './chrome-mock.mjs';
import assert from 'node:assert/strict';
import { TabActions } from '../lib/tab-actions.mjs';
import { keyFor, selectedTabs, openItems, recentItems, filterRecentItems } from '../lib/tab-model.mjs';

const grid = 'chrome-extension://test/grid.html';

test('typed selection keeps tab and group IDs separate and deduplicates members', () => {
    const tabs = [{ id: 4, groupId: -1 }, { id: 5, groupId: 4 }];
    assert.deepEqual(selectedTabs(new Set([keyFor('group', 4)]), tabs).map(t => t.id), [5]);
    assert.equal(selectedTabs(new Set(['group:4', 'tab:5']), tabs).length, 1);
});
test('search scope, nested matches, pinned tabs, and group names are independent', () => {
    const tabs = [{ id: 1, windowId: 1, index: 0, groupId: -1, title: 'Alpha', pinned: true }, { id: 2, windowId: 1, index: 1, groupId: 7, title: 'Research' }, { id: 3, windowId: 2, index: 0, groupId: -1, title: 'Research' }];
    const groups = [{ id: 7, windowId: 1, title: 'Research' }];
    assert.deepEqual(openItems(tabs, groups, { windowId: 1, query: 'Research', nested: false }).map(i => i.key), ['group:7']);
    assert.equal(openItems(tabs, groups, { windowId: 1, query: 'Research', allWindows: true, showGroups: false }).length, 2);
    assert.equal(openItems(tabs, groups, { windowId: 1, groupId: 7 }).length, 1);
});
test('session models filter own pages and retain closed windows', () => {
    const sessions = [{ tab: { url: grid+'?x=1', sessionId: 'self' } }, { window: { sessionId: 'window', tabs: [{url:grid}, {url:'https://example.com',title:'Example'}] } }];
    assert.equal(recentItems(sessions,grid).length,1);
    assert.equal(recentItems(sessions,grid)[0].isWindow,true);

});
test('restoring one closed-window tab uses its session ID and leaves its siblings available', async () => {
    const f = fixture([{id:1,windowId:1,index:0}]);
    f.sessions.push({window:{sessionId:'window',tabs:[
        {sessionId:'child-a',title:'Alpha',url:'https://example.com/alpha'},
        {sessionId:'child-b',title:'Beta',url:'https://example.com/beta'}
    ]}});
    const filtered = filterRecentItems(recentItems(f.sessions, grid), 'Alpha');
    const result = await f.actions.restoreSession(filtered[0].tabs[0].sessionId);
    assert.equal(result.tab.url, 'https://example.com/alpha');
    assert.deepEqual(f.calls.filter(c=>c[0]==='restoreSession'), [['restoreSession','child-a']]);
    assert.deepEqual(recentItems(f.sessions,grid)[0].tabs.map(t=>t.sessionId), ['child-b']);
    await assert.rejects(f.actions.restoreSession('child-a'), /Expired/);
    const window = await f.actions.restoreSession('window');
    assert.deepEqual(window.window.tabs.map(t=>t.url), ['https://example.com/beta']);
    assert.equal(f.sessions.length,0);
});
test('missing session IDs never fall back to restoring the latest session', async () => {
    const f=fixture([]);
    for (const id of [undefined,null,'','   ',42]) await assert.rejects(f.actions.restoreSession(id), /no longer available/);
    assert.equal(f.calls.filter(c=>c[0]==='restoreSession').length,0);
});
test('closed window expansion retains only individual search matches and excludes TabGrid', () => {
    const items = recentItems([{ window: { sessionId: 'w', tabs: [
        { title: 'TabGrid', url: grid },
        { title: 'Alpha notes', url: 'https://notes.example/one' },
        { title: 'Beta reference', url: 'https://reference.example/two' },
        { url: 'https://untitled.example/' }
    ] } }, {tab: {sessionId: 'single', title: 'Alpha single', url: 'https://single.example/'}}], grid);
    assert.equal(filterRecentItems(items, '')[0].tabs.length, 3);
    const found = filterRecentItems(items, 'ALPHA');
    assert.equal(found.length, 2);
    assert.deepEqual(found[0].tabs.map(t => t.title), ['Alpha notes']);
    assert.equal(found[0].sessionId, 'w');
    assert.equal(items[0].tabs.length, 3, 'search must not mutate the complete window');
    assert.equal(filterRecentItems(items, 'alpha beta', {matchMode: 'words'}).length, 0);
    assert.equal(filterRecentItems(items, 'notes.example', {matchUrl: false}).length, 0);
    assert.equal(filterRecentItems(items, 'Beta reference', {matchTitle: false}).length, 0);
    assert.equal(filterRecentItems(items, 'untitled.example')[0].tabs.length, 1);
    assert.equal(filterRecentItems(items, 'nothing').length, 0);
    assert.equal(filterRecentItems(items, '   ')[0].tabs.length, 3);
});
test('close and undo retain multiple groups, original windows, pinned and muted state', async () => {
    const f = fixture([{id:1,windowId:1,index:0,pinned:true,mutedInfo:{muted:true}},{id:2,windowId:1,index:1,groupId:7},{id:3,windowId:1,index:2,groupId:7},{id:4,windowId:2,index:0,groupId:8}], [{id:7,windowId:1,title:'Research',color:'blue',collapsed:true},{id:8,windowId:2,title:'Reading',color:'green',collapsed:false}]);
    assert.equal((await f.actions.close([1,2,3,4])).count,4);
    assert.equal((await f.actions.undo()).count,4);
    const restored = f.tabs();
    assert.equal(restored.find(t=>t.url.endsWith('/1')).pinned,true);
    assert.equal(restored.find(t=>t.url.endsWith('/1')).muted,true);
    assert.equal(restored.find(t=>t.url.endsWith('/4')).windowId,2);
    assert.deepEqual(f.groups().map(g=>g.title).sort(),['Reading','Research']);
    assert.equal(f.groups().find(g=>g.title==='Research').collapsed,true);
    assert.equal((await f.actions.journal()).length,0);
});
test('failed closes are not recreated and own grid/private tabs are excluded', async () => {
    const f=fixture([{id:1,windowId:1,index:0},{id:2,windowId:1,index:1},{id:3,windowId:1,index:2,url:grid},{id:4,windowId:2,index:0,incognito:true}]);
    f.fail.remove.add(2); const result=await f.actions.close([1,2,3,4]);
    assert.equal(result.count,1); assert.match(result.error,/could not be closed/);
    await f.actions.undo(); assert.equal(f.tabs().length,4);
    assert.equal(f.tabs().filter(t=>t.url.endsWith('/2')).length,1);
});
test('undo journal survives UI recreation and resumes partial restores without duplicate tabs', async () => {
    const f=fixture([{id:1,windowId:1,index:0},{id:2,windowId:1,index:1}]);
    await f.actions.close([1,2]); f.fail.update.add(100);
    const reopened=new TabActions(f.api,grid);
    assert.ok((await reopened.undo()).error);
    f.fail.update.clear(); await reopened.undo();
    assert.equal(f.tabs().length,2); assert.equal((await reopened.journal()).length,0);
});
test('undo recreates a vanished window once and falls back when sessions expire', async () => {
    const f=fixture([{id:1,windowId:1,index:0},{id:2,windowId:1,index:1}]);
    await f.actions.close([1,2]); f.removeWindow(1); f.sessions.length=0;
    assert.equal((await f.actions.undo()).count,2);
    assert.equal(new Set(f.tabs().map(t=>t.windowId)).size,1);
    assert.equal(f.tabs().length,2);
});
test('root reorder preserves group blocks and starts after pinned tabs', async () => {
    const f=fixture([{id:1,windowId:1,index:0,pinned:true},{id:2,windowId:1,index:1},{id:3,windowId:1,index:2,groupId:7},{id:4,windowId:1,index:3,groupId:7},{id:5,windowId:1,index:4},{id:6,windowId:1,index:5,url:grid}], [{id:7,windowId:1,title:'Group',color:'blue'}]);
    await f.actions.reorder({keys:['tab:5','group:7','tab:2'],windowId:1,groupId:null,pinned:false});
    assert.deepEqual(f.tabs().sort((a,b)=>a.index-b.index).map(t=>t.id),[1,5,3,4,2,6]);
    assert.ok(f.calls.some(c=>c[0]==='groupMove'));
});
test('reorder rejects stale, duplicated, or cross-pinned-boundary IDs before moving anything', async () => {
    const f=fixture([{id:1,windowId:1,index:0,pinned:true},{id:2,windowId:1,index:1}]);
    await assert.rejects(f.actions.reorder({keys:['tab:1'],windowId:1,groupId:null,pinned:false}));
    await assert.rejects(f.actions.reorder({keys:['tab:2','tab:2'],windowId:1,groupId:null,pinned:false}));
    assert.equal(f.calls.length,0);
});
test('group reorder preserves member order and metadata', async () => {
    const f=fixture([{id:1,windowId:1,index:0},{id:2,windowId:1,index:1,groupId:7},{id:3,windowId:1,index:2,groupId:7},{id:4,windowId:1,index:3,groupId:7}], [{id:7,windowId:1,title:'Research',color:'blue'}]);
    await f.actions.reorder({keys:['tab:4','tab:2','tab:3'],windowId:1,groupId:7,pinned:false});
    assert.deepEqual(f.tabs().sort((a,b)=>a.index-b.index).map(t=>t.id),[1,4,2,3]);
    assert.equal(f.groups()[0].title,'Research');
});
test('moving a complete group uses the native group move without losing title or color', async () => {
    const f=fixture([{id:1,windowId:1,index:0,groupId:7},{id:2,windowId:1,index:1,groupId:7},{id:3,windowId:2,index:0}], [{id:7,windowId:1,title:'Research',color:'blue'}]);
    await f.actions.move([1,2],2);
    assert.equal(f.groups()[0].title,'Research'); assert.equal(f.groups()[0].windowId,2);
    assert.ok(f.calls.some(c=>c[0]==='groupMove'));
});
test('restoring via Recently Closed removes its matching undo record', async () => {
    const f=fixture([{id:1,windowId:1,index:0}]); await f.actions.close([1]);
    await f.actions.restoreSession('s1'); await f.actions.undo(); assert.equal(f.tabs().length,1);
});

test('moving multiple pinned tabs retains relative order after destination pins', async () => {
    const f=fixture([{id:1,windowId:1,index:0,pinned:true},{id:2,windowId:1,index:1,pinned:true},{id:3,windowId:2,index:0,pinned:true},{id:4,windowId:2,index:1}]);
    await f.actions.move([1,2],2);
    assert.deepEqual(f.tabs().filter(t=>t.windowId===2).sort((a,b)=>a.index-b.index).map(t=>t.id),[3,1,2,4]);
});
test('moving part of a group preserves both source and destination groups', async () => {
    const f=fixture([{id:1,windowId:1,index:0,groupId:7},{id:2,windowId:1,index:1,groupId:7},{id:3,windowId:2,index:0}], [{id:7,windowId:1,title:'Research',color:'blue',collapsed:true}]);
    await f.actions.move([2],2);
    assert.equal(f.tabs().find(t=>t.id===1).groupId,7);
    assert.equal(f.tabs().find(t=>t.id===2).windowId,2);
    const copy=f.groups().find(g=>g.windowId===2);
    assert.equal(copy.title,'Research'); assert.equal(copy.collapsed,true);
});
test('a fully failed close leaves no empty undo entry', async () => {
    const f=fixture([{id:1,windowId:1,index:0}]); f.fail.remove.add(1);
    await f.actions.close([1]); assert.equal((await f.actions.journal()).length,0);
});
test('grouping rejects a pinned or cross-window selection without changing tabs', async () => {
    const f=fixture([{id:1,windowId:1,index:0,pinned:true},{id:2,windowId:1,index:1},{id:3,windowId:2,index:0}]);
    await assert.rejects(f.actions.group([1,2],null),/Unpin/);
    await assert.rejects(f.actions.group([2,3],null),/one window/);
    assert.equal(f.groups().length,0);
});


test('pinned grouping fails before mutation but pinned cross-window moves remain allowed', async () => {
    const f=fixture([{id:1,windowId:1,index:0,pinned:true},{id:2,windowId:1,index:1},{id:3,windowId:2,index:0,groupId:7}], [{id:7,windowId:2,title:'Destination',color:'blue'}]);
    for(const destination of ['new',7]){
        await assert.rejects(f.actions.dropIntoGroup([1,2],destination,2),/Unpin selected tabs/);
        assert.equal(f.calls.length,0);
    }
    await f.actions.dropAt({keys:['tab:1'],windowId:2,pinned:true});
    const moved=f.tabs().find(t=>t.id===1);
    assert.equal(moved.windowId,2);assert.equal(moved.pinned,true);assert.equal(moved.groupId,-1);
});

test('recent history hides older TabGrid installations without hiding similarly named websites or extensions',()=>{
    const tab=(url,title,sessionId)=>({tab:{url,title,sessionId}});
    const old='chrome-extension://old-install/grid.html?view=recent';
    const sessions=[tab(old,'TabGrid','old'),tab('https://example.com/grid.html','TabGrid','web'),
        tab('chrome-extension://other/grid.html','Other extension','other'),
        {window:{sessionId:'only-grid',tabs:[{url:old,title:'TabGrid'}]}},
        {window:{sessionId:'mixed',tabs:[{url:old,title:'TabGrid'},{url:'https://example.com',title:'Example'}]}}];
    const result=recentItems(sessions,grid);
    assert.deepEqual(result.map(item=>item.sessionId),['web','other','mixed']);
    assert.equal(result[2].title,'1 tabs — closed window');
    assert.equal(sessions.length,5);
});
