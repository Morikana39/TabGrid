import test from 'node:test';
import assert from 'node:assert/strict';
import {PreviewBatch, BATCH_KEY} from '../lib/preview-batch.mjs';
import {fixture} from './chrome-mock.mjs';
import {DEFAULTS} from '../lib/preferences.mjs';
const grid = 'chrome-extension://test/grid.html';
const event = () => {const listeners=[];return {addListener:fn=>listeners.push(fn),emit:(...args)=>listeners.forEach(fn=>fn(...args))};};
function setup() {
    const f=fixture([
        {id:99,windowId:1,index:0,active:true,url:grid},
        {id:1,windowId:1,index:1}, {id:2,windowId:1,index:2,url:'chrome://newtab/'},
        {id:3,windowId:2,index:0,active:true}, {id:4,windowId:3,index:0,active:true,incognito:true},
        {id:5,windowId:1,index:3,url:'https://excluded.example/'}, {id:6,windowId:2,index:1}
    ]);
    const {api}=f, captures=[], badges=[];
    for (const key of ['onActivated','onRemoved']) api.tabs[key]=event();
    api.windows.onFocusChanged=event();
    const update=api.tabs.update;
    api.tabs.update=async(id,props)=>{
        const tab=await api.tabs.get(id);
        if(props.active)for(const other of f.tabs().filter(t=>t.windowId===tab.windowId))await update(other.id,{active:other.id===id});
        const result=await update(id,props);
        if(props.active)api.tabs.onActivated.emit({tabId:id,windowId:tab.windowId});
        return result;
    };
    const winUpdate=api.windows.update;
    api.windows.update=async(id,props)=>{const result=await winUpdate(id,props);if(props.focused)api.windows.onFocusChanged.emit(id);return result;};
    const query=api.tabs.query;
    api.tabs.query=async options=>(await query(options)).filter(t=>!options.active||t.active);
    api.action={setBadgeText:async value=>badges.push(value.text)};
    const personal={ready:Promise.resolve(),private:false,preferences:async()=>({...DEFAULTS,previewSites:['excluded.example']}),
        previews:{invalidateCaptures(){},capture:async(id,options)=>{captures.push({id,options});return true;}}};
    const batch=new PreviewBatch(api,personal,grid,{wait:async()=>{}});
    return {...f,batch,personal,captures,badges};
}
test('batch visits regular tabs once, respects exclusions/grants and restores each window',async()=>{
    const f=setup();const first=f.batch.start(99);assert.equal(f.batch.start(99).id,first.id);
    await f.batch.finished;
    assert.deepEqual(f.captures.map(c=>c.id),[1,3,6]);
    assert.ok(f.captures.every(c=>!c.options.userInvoked&&c.options.expectedUrl));
    assert.deepEqual(f.tabs().filter(t=>t.active).map(t=>t.id),[99,3,4]);
    const status=await f.batch.status();assert.equal(status.total,5);assert.equal(status.updated,3);assert.equal(status.skipped,2);assert.equal(status.active,false);assert.equal(status.cancelled,false);
    assert.equal(f.badges.at(-1),'');
});
test('already granted internal pages are attempted without granting new access',async()=>{
    const f=setup();await f.api.storage.session.set({tabgridPreviewGrant_2:'chrome://newtab/'});
    f.batch.start(99);await f.batch.finished;assert.deepEqual(f.captures.map(c=>c.id),[1,2,3,6]);
});
test('manual tab selection stops the run and keeps the user on that tab',async()=>{
    const f=setup();let once=true;
    f.batch.wait=async()=>{if(once){once=false;await f.api.tabs.update(2,{active:true});}};
    f.batch.start(99);await f.batch.finished;
    assert.equal(f.captures.length,0);assert.equal((await f.api.tabs.get(2)).active,true);assert.equal((await f.batch.status()).cancelled,true);
});
test('explicit cancellation restores the original view and capture failures keep processing',async()=>{
    const f=setup();f.personal.previews.capture=async()=>{f.batch.cancel();return false;};
    f.batch.start(99);await f.batch.finished;assert.equal((await f.api.tabs.get(99)).active,true);
    const g=setup();g.personal.previews.capture=async()=>false;g.batch.start(99);await g.batch.finished;
    const status=await g.batch.status();assert.equal(status.updated,0);assert.equal(status.skipped,5);
});
test('disabled capture, private context and non-grid sources never activate tabs',async()=>{
    for(const mode of ['disabled','private','source']){
        const f=setup();if(mode==='disabled')f.personal.preferences=async()=>({...DEFAULTS,capture:false});if(mode==='private')f.personal.private=true;
        f.batch.start(mode==='source'?1:99);await f.batch.finished;
        assert.equal(f.captures.length,0);assert.equal(f.calls.filter(c=>c[0]==='update'||c[0]==='windowUpdate').length,0,mode);
    }
});
test('slow pages time out, closed tabs skip, and capture preference changes stop the batch',async()=>{
    const f=setup();await f.api.tabs.update(1,{status:'loading'});await f.api.tabs.remove(6);
    f.batch.start(99);await f.batch.finished;assert.deepEqual(f.captures.map(c=>c.id),[3]);
    const g=setup();g.personal.previews.capture=async()=>{g.personal.preferences=async()=>({...DEFAULTS,capture:false});return true;};
    g.batch.start(99);await g.batch.finished;assert.equal((await g.batch.status()).updated,1);assert.equal((await g.batch.status()).cancelled,true);
});
test('focus change to another application cancels without refocusing Chrome',async()=>{
    const f=setup();let once=true;f.batch.wait=async()=>{if(once){once=false;f.api.windows.onFocusChanged.emit(-1);}};
    f.batch.start(99);await f.batch.finished;assert.equal((await f.batch.status()).cancelled,true);
    assert.equal(f.calls.filter(c=>c[0]==='windowUpdate').length,0);
});
test('worker restart retires stale progress and clears its badge',async()=>{
    const f=setup();await f.api.storage.session.set({[BATCH_KEY]:{id:'old',active:true,updated:2}});
    assert.deepEqual(await f.batch.status(),{id:'old',active:false,updated:2,cancelled:true});assert.equal(f.badges.at(-1),'');
});
test('navigation during settling captures the final URL, not the old page',async()=>{
    const f=setup();let once=true;f.batch.wait=async()=>{if(once){once=false;await f.api.tabs.update(1,{url:'https://new.example/'});}};
    f.batch.start(99);await f.batch.finished;assert.equal(f.captures[0].options.expectedUrl,'https://new.example/');
});
test('minimized windows are temporarily restored and minimized again after completion',async()=>{
    const f=setup();await f.api.windows.update(2,{state:'minimized'});f.calls.length=0;
    f.batch.start(99);await f.batch.finished;
    assert.ok(f.calls.some(c=>c[0]==='windowUpdate'&&c[1]===2&&c[2].state==='normal'));
    assert.equal((await f.api.windows.get(2)).state,'minimized');assert.equal((await f.batch.status()).cancelled,false);
});
test('closing the source grid stops processing without reopening or recreating it',async()=>{
    const f=setup();let once=true;f.batch.wait=async()=>{if(once){once=false;await f.api.tabs.remove(99);f.api.tabs.onRemoved.emit(99);}};
    f.batch.start(99);await f.batch.finished;assert.equal(f.captures.length,0);assert.equal(f.tabs().some(t=>t.id===99),false);
});
test('a hanging screenshot times out and explicit cancellation does not wait for it',async()=>{
    const f=setup();f.batch.captureTimeout=5;
    f.personal.previews.capture=()=>new Promise(()=>{});
    f.batch.start(99);await f.batch.finished;assert.equal((await f.batch.status()).skipped,5);
    const g=setup();let started;const ready=new Promise(resolve=>started=resolve);
    g.personal.previews.capture=()=>{started();return new Promise(()=>{});};
    g.batch.start(99);await ready;g.batch.cancel();await g.batch.finished;
    assert.equal((await g.api.tabs.get(99)).active,true);assert.equal((await g.batch.status()).cancelled,true);
});
