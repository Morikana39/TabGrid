import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './chrome-mock.mjs';
import {isTabMuted, setTabMuted} from '../lib/tab-sound.mjs';
import {tabMatches, emptyFilters} from '../lib/search.mjs';

// Content-setting flags must never substitute for a real tab audio update.
test('mute icon and filters use only Chrome mutedInfo',()=>{
    const tab={id:1,url:'https://example.com',siteMuted:true,mutedInfo:{muted:false}};
    assert.equal(isTabMuted(tab),false);
    assert.equal(tabMatches(tab,{...emptyFilters(),muted:'yes'}),false);
    tab.mutedInfo.muted=true;
    assert.equal(isTabMuted(tab),true);
    assert.equal(tabMatches(tab,{...emptyFilters(),muted:'yes'}),true);
});

test('mute changes only the specified tab, not same-site tabs or the other split pane',async()=>{
    const f=fixture([
        {id:1,url:'https://example.com/a',windowId:1,splitViewId:10},
        {id:2,url:'https://example.com/b',windowId:1,splitViewId:10},
        {id:3,url:'https://example.com/c',windowId:2},
        {id:4,url:'https://other.example',windowId:1}
    ]);
    assert.deepEqual(await f.actions.setTabMuted([1]),{count:1,error:null});
    assert.deepEqual(f.tabs().map(isTabMuted),[true,false,false,false]);
    await f.actions.setTabMuted([2],true);
    await f.actions.unmute([1]);
    assert.deepEqual(f.tabs().map(isTabMuted),[false,true,false,false]);
});

test('explicit multi-tab action affects only its selected members and uses fresh mute states',async()=>{
    const f=fixture([{id:1},{id:2,mutedInfo:{muted:true}},{id:3}]);
    await f.actions.setTabMuted([1,2]);
    assert.deepEqual(f.tabs().map(isTabMuted),[true,true,false]);
    await f.actions.setTabMuted([1,2]);
    assert.deepEqual(f.tabs().map(isTabMuted),[false,false,false]);
});

test('mute works without contentSettings permission and protects other privacy contexts',async()=>{
    const f=fixture([{id:1,url:'chrome://settings'},{id:2,incognito:true},{id:3,url:'chrome-extension://test/grid.html'}]);
    assert.deepEqual(await f.actions.setTabMuted([1,2,3],true),{count:1,error:null});
    assert.deepEqual(f.tabs().map(isTabMuted),[true,false,false]);
    f.actions.private=true;
    await f.actions.setTabMuted([1,2],true);
    assert.deepEqual(f.tabs().map(isTabMuted),[true,true,false]);
});

test('a failed audio update is reported without fabricating a muted indicator',async()=>{
    const f=fixture([{id:1},{id:2}]);
    f.fail.update.add(1);
    const result=await f.actions.setTabMuted([1,2],true);
    assert.match(result.error,/Update failed/);
    assert.equal(result.count,1);
    assert.deepEqual(f.tabs().map(isTabMuted),[false,true]);
});

test('stale IDs do not affect other tabs and invalid mute arguments are rejected',async()=>{
    const f=fixture([{id:1}]);
    assert.deepEqual(await f.actions.setTabMuted([99]),{count:0,error:null});
    await assert.rejects(f.actions.setTabMuted([1],'true'),/Invalid action arguments/);
    assert.equal(isTabMuted(f.tabs()[0]),false);
});

test('direct grid mute and unmute work when the background rejects newer actions',async()=>{
    const f=fixture([{id:1},{id:2}]);
    f.api.runtime={sendMessage:async()=>{throw Error('Unknown tab action');}};
    await setTabMuted(f.api,[1]);
    assert.deepEqual(f.tabs().map(isTabMuted),[true,false]);
    await setTabMuted(f.api,[1],{muted:false});
    assert.deepEqual(f.tabs().map(isTabMuted),[false,false]);
});
