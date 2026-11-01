import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {PreviewCache} from '../lib/preview-cache.mjs';
import {captureBeforeOpen,installPreviewRefresh} from '../lib/preview-refresh.mjs';
import {fixture} from './chrome-mock.mjs';
import {DEFAULTS,PREFS_KEY} from '../lib/preferences.mjs';
const grid='chrome-extension://test/grid.html';
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
function cacheFixture(){
    const f=fixture([{id:1,windowId:1,index:0,active:true},{id:2,windowId:2,index:0,active:true}]);
    let time=1000;const calls=[],waits=[];
    f.api.tabs.captureVisibleTab=async windowId=>{calls.push({windowId,time});return `image-${time}`;};
    const cache=new PreviewCache(f.api,grid,{now:()=>time,wait:async ms=>{waits.push(ms);time+=ms;}});
    return {...f,cache,calls,waits,advance:ms=>time+=ms};
}
test('capture quota is shared across windows and the last request waits instead of being dropped',async()=>{
    const f=cacheFixture();await Promise.all([f.cache.capture(1),f.cache.capture(2),f.cache.capture(1)]);
    assert.deepEqual(f.calls,[{windowId:1,time:1000},{windowId:2,time:1600},{windowId:1,time:2200}]);
    assert.equal(f.local.screenshot_1,'image-2200');assert.equal(f.local.screenshot_2,'image-1600');
});
test('queued captures recheck activity, URL, exclusions, and cancellation before calling Chrome',async()=>{
    for(const stop of ['inactive','url','excluded','disabled','abort','invalidate']){
        const f=cacheFixture();await f.cache.capture(1);let release,waiting;
        const ready=new Promise(r=>waiting=r);f.cache.wait=()=>{waiting();return new Promise(r=>release=r);};
        const controller=new AbortController();const pending=f.cache.capture(1,{signal:controller.signal,expectedUrl:'https://example.com/1'});await ready;
        if(stop==='inactive')await f.api.tabs.update(1,{active:false});
        if(stop==='url')await f.api.tabs.update(1,{url:'https://changed.example/'});
        if(stop==='excluded')await f.api.storage.local.set({[PREFS_KEY]:{...DEFAULTS,previewSites:['example.com']}});
        if(stop==='disabled')await f.api.storage.local.set({[PREFS_KEY]:{...DEFAULTS,capture:false}});
        if(stop==='abort')controller.abort();if(stop==='invalidate')f.cache.invalidate();
        release();await pending;assert.equal(f.calls.length,1,stop);
    }
});
test('toolbar opening captures a final snapshot and saves it asynchronously',async()=>{
    const f=cacheFixture();await captureBeforeOpen({ready:Promise.resolve(),private:false,previews:f.cache},await f.api.tabs.get(1));
    await f.cache.queue;assert.equal(f.local.screenshot_1,'image-1000');
});
test('toolbar deadline permits opening and blocks a late screenshot write',async()=>{
    const f=cacheFixture();let finish,started,expire;const ready=new Promise(r=>started=r);
    f.api.tabs.captureVisibleTab=()=>{started();return new Promise(r=>finish=r);};
    const opening=captureBeforeOpen({ready:Promise.resolve(),private:false,previews:f.cache},await f.api.tabs.get(1),{schedule:fn=>{expire=fn;return 1;},cancel:()=>{}});
    await ready;expire();await opening;finish('too late');await f.cache.captureQueue;
    assert.equal(f.local.screenshot_1,undefined);
});
test('toolbar capture errors and private pages never prevent opening',async()=>{
    let calls=0;const p={ready:Promise.resolve(),private:false,previews:{canReuse:async()=>false,capture:async()=>{calls++;throw Error('restricted');}}};
    await captureBeforeOpen(p,{id:1,url:'https://example.com'});assert.equal(calls,1);
    await captureBeforeOpen(p,{id:1,url:'chrome://settings'});p.private=true;await captureBeforeOpen(p,{id:1,url:'https://example.com'});assert.equal(calls,2);
});
function event(){const listeners=new Set();return {addListener:fn=>listeners.add(fn),removeListener:fn=>listeners.delete(fn),emit:(...args)=>{for(const fn of listeners)fn(...args);}};}
function controllerFixture(){
    const f=cacheFixture();for(const key of ['onActivated','onUpdated','onRemoved'])f.api.tabs[key]=event();
    for(const key of ['onRemoved','onFocusChanged'])f.api.windows[key]=event();f.api.storage.onChanged=event();
    f.api.runtime={id:'test'};const injections=[];f.api.scripting={executeScript:async options=>injections.push(options)};
    const personal={ready:Promise.resolve(),private:false,previews:f.cache,preferences:async()=>DEFAULTS};
    return {...f,personal,injections};
}
test('activity messages trust sender identity only and coalesce pending captures',async()=>{
    const f=controllerFixture(),refresh=installPreviewRefresh(f.api,f.personal);await flush();
    const sender={id:'test',frameId:0,url:'https://example.com/1',tab:await f.api.tabs.get(1)};
    for(const patch of [{id:'foreign'},{frameId:1},{url:grid},{tab:{id:1,incognito:true}},{tab:null}])await refresh.fromPage({type:'tabgrid-preview-activity'},{...sender,...patch});
    assert.equal(f.calls.length,0);
    const first=refresh.fromPage({type:'tabgrid-preview-activity',tabId:2},sender);
    assert.equal(first,refresh.fromPage({type:'tabgrid-preview-activity'},sender));await first;
    assert.deepEqual(f.calls,[{windowId:1,time:1000}]);
    assert.ok(f.injections.every(i=>i.files[0]==='preview-activity.js'&&!i.target.allFrames));
});
test('private background neither injects nor captures page signals',async()=>{
    const f=controllerFixture();f.personal.private=true;const refresh=installPreviewRefresh(f.api,f.personal);await flush();
    await refresh.fromPage({type:'tabgrid-preview-activity'},{id:'test',frameId:0,url:'https://example.com/1',tab:await f.api.tabs.get(1)});
    assert.equal(f.injections.length,0);assert.equal(f.calls.length,0);
});

// Run the real isolated-world script with a fake clock and Chrome message sink.
function contentFixture({privateMode=false,prefs=DEFAULTS}={}){
    let now=0,next=0;const jobs=new Map(),messages=[];
    const target=()=>{const events=new Map();return {addEventListener:(name,fn)=>{if(!events.has(name))events.set(name,new Set());events.get(name).add(fn);},removeEventListener:(name,fn)=>events.get(name)?.delete(fn),emit:name=>{for(const fn of events.get(name)||[])fn({});}};};
    const window=target(),document=Object.assign(target(),{hidden:false,hasFocus:()=>true}),onChanged=event();
    const chrome={extension:{inIncognitoContext:privateMode},storage:{onChanged,local:{get:async()=>({tabgridPreferences:prefs})}},runtime:{id:'test',onMessage:event(),sendMessage:async message=>messages.push(message)}};
    const context=vm.createContext({window,document,chrome,crypto:{getRandomValues:array=>array.fill(1)},location:{hostname:'example.com'},Date:{now:()=>now},setTimeout:(fn,ms)=>{const id=++next;jobs.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>jobs.delete(id)});
    const script=readFileSync(new URL('../preview-activity.js',import.meta.url),'utf8');vm.runInContext(script,context);
    return {chrome,window,document,onChanged,messages,state:()=>{let result;chrome.runtime.onMessage.emit({type:'tabgrid-preview-state'},{id:'test'},value=>result=value);return result;},again:()=>vm.runInContext(script,context),advance:async ms=>{
        const end=now+ms;while(true){const entry=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!entry||entry[1].at>end)break;now=entry[1].at;jobs.delete(entry[0]);await entry[1].fn();}now=end;await flush();
    }};
}
test('settled scroll captures the final viewport and activity signals have no page or input contents',async()=>{
    const f=contentFixture();await flush();await f.advance(400);assert.equal(f.messages.length,1);
    f.window.emit('scroll');await f.advance(300);f.window.emit('scroll');await f.advance(1699);assert.equal(f.messages.length,1);
    await f.advance(1);assert.equal(f.messages.length,2);assert.equal(JSON.stringify(f.messages[1]),'{"type":"tabgrid-preview-activity"}');
    await f.advance(10000);assert.equal(f.messages.length,2); // Below the periodic refresh interval.
});
test('hidden, unfocused, disabled, excluded and private pages do not send captures',async()=>{
    const f=contentFixture();await flush();f.document.hidden=true;f.document.emit('visibilitychange');await f.advance(3000);assert.equal(f.messages.length,0);
    f.document.hidden=false;f.document.emit('visibilitychange');f.document.hasFocus=()=>false;await f.advance(3000);assert.equal(f.messages.length,0);
    for(const options of [{privateMode:true},{prefs:{...DEFAULTS,capture:false}},{prefs:{...DEFAULTS,previewSites:['example.com']}}]){
        const other=contentFixture(options);await flush();other.window.emit('keyup');await other.advance(3000);assert.equal(other.messages.length,0);
    }
});
test('reinjection is idempotent and disabling capture cancels pending interaction',async()=>{
    const f=contentFixture();f.again();await flush();await f.advance(400);assert.equal(f.messages.length,1);
    f.window.emit('input');f.onChanged.emit({tabgridPreferences:{newValue:{...DEFAULTS,capture:false}}},'local');await f.advance(3000);assert.equal(f.messages.length,1);
    f.onChanged.emit({tabgridPreferences:{newValue:DEFAULTS}},'local');await f.advance(400);assert.equal(f.messages.length,2);
});

test('frequent capture eviction uses metadata and byte counts without loading all saved images',async()=>{
    const f=cacheFixture(),get=f.api.storage.local.get;let fullReads=0;
    f.api.storage.local.get=async key=>{if(key===null)fullReads++;return get(key);};
    f.api.storage.local.getBytesInUse=async keys=>keys.reduce((sum,key)=>sum+Buffer.byteLength(f.local[key]||''),0);
    await f.cache.capture(1);await f.cache.capture(2);
    assert.equal(fullReads,0);assert.equal(Object.keys(f.local.tabgridPreviewIndex).length,2);
});

test('content preference notifications win over a stale initial settings read',async()=>{
    const f=contentFixture();
    f.onChanged.emit({tabgridPreferences:{newValue:{...DEFAULTS,capture:false}}},'local');
    await flush();await f.advance(3000);assert.equal(f.messages.length,0);
});

test('activation refresh ignores a tab left before capture; load completion refreshes the current page',async()=>{
    const f=controllerFixture();installPreviewRefresh(f.api,f.personal);await flush();
    f.api.tabs.onActivated.emit({tabId:1,windowId:1});
    await f.api.tabs.update(1,{active:false});
    await new Promise(resolve=>setTimeout(resolve,550));assert.equal(f.calls.filter(c=>c.windowId===1).length,0);
    await f.api.tabs.update(1,{active:true});
    f.api.tabs.onUpdated.emit(1,{status:'complete'},await f.api.tabs.get(1));
    await new Promise(resolve=>setTimeout(resolve,550));assert.equal(f.calls.filter(c=>c.windowId===1).length,1);
    assert.ok(f.local.screenshot_1);
});

test('toolbar reuses a saved preview only while recent and unchanged in the same document',async()=>{
    const f=cacheFixture();let state={documentId:'page-a',revision:1};
    f.api.tabs.sendMessage=async()=>state;
    await f.cache.capture(1);const p={ready:Promise.resolve(),private:false,previews:f.cache};
    await captureBeforeOpen(p,await f.api.tabs.get(1));assert.equal(f.calls.length,1);
    state={...state,revision:2};assert.equal(await f.cache.canReuse(1,'https://example.com/1'),false);
    await captureBeforeOpen(p,await f.api.tabs.get(1));await f.cache.queue;assert.equal(f.calls.length,2);
    state={documentId:'page-b',revision:2};assert.equal(await f.cache.canReuse(1,'https://example.com/1'),false);
    state={documentId:'page-a',revision:2};f.advance(1501);assert.equal(await f.cache.canReuse(1,'https://example.com/1'),false);
});
test('missing activity tracking cannot incorrectly label a cached image as unchanged',async()=>{
    const f=cacheFixture();await f.cache.capture(1);
    assert.equal(await f.cache.canReuse(1,'https://example.com/1'),false);
    f.api.tabs.sendMessage=async()=>({});await f.cache.capture(1);
    assert.equal(await f.cache.canReuse(1,'https://example.com/1'),false);
});
test('the default opening budget includes the quota wait but still bounds slow startup',async()=>{
    let expire,delay;const p={ready:new Promise(()=>{}),private:false,previews:{}};
    const opening=captureBeforeOpen(p,{id:1,url:'https://example.com/1'},{schedule:(fn,ms)=>{expire=fn;delay=ms;return 1;},cancel:()=>{}});
    assert.equal(delay,1500);expire();await opening;
});
test('confirmed pixels save after opening without waiting for the storage queue',async()=>{
    const f=cacheFixture();let release;f.cache.serial(()=>new Promise(resolve=>release=resolve));await flush();
    await captureBeforeOpen({ready:Promise.resolve(),private:false,previews:f.cache},await f.api.tabs.get(1));
    assert.equal(f.calls.length,1);assert.equal(f.local.screenshot_1,undefined);
    // Opening TabGrid changes activation, but does not change the source of
    // the already-confirmed screenshot.
    await f.api.tabs.update(1,{active:false});f.cache.invalidateCaptures();
    release();await f.cache.queue;assert.equal(f.local.screenshot_1,'image-1000');
});
test('detached saves still reject cleared, excluded, navigated, or closed tabs',async()=>{
    for(const change of ['clear','exclude','navigate','close']){
        const f=cacheFixture();let release;f.cache.serial(()=>new Promise(resolve=>release=resolve));await flush();
        await captureBeforeOpen({ready:Promise.resolve(),private:false,previews:f.cache},await f.api.tabs.get(1));
        let cleared;
        if(change==='clear')cleared=f.cache.clear(1);
        if(change==='exclude')await f.api.storage.local.set({[PREFS_KEY]:{...DEFAULTS,previewSites:['example.com']}});
        if(change==='navigate')await f.api.tabs.update(1,{url:'https://different.example/'});
        if(change==='close')await f.api.tabs.remove(1);
        release();await f.cache.queue;await cleared;
        assert.equal(f.local.screenshot_1,undefined,change);
    }
});
test('activity revision updates immediately, before the throttled capture notification',async()=>{
    const f=contentFixture();await flush();await f.advance(400);
    const before=f.state();f.window.emit('scroll');const after=f.state();
    assert.equal(after.documentId,before.documentId);assert.ok(after.revision>before.revision);
    assert.equal(f.messages.length,1); // Still waiting for the settled signal.
    f.document.hidden=true;assert.equal(f.state(),null);
});

test('future captures use the current quality setting while existing images remain intact',async()=>{
    const f=cacheFixture(),options=[];
    f.api.tabs.captureVisibleTab=async(windowId,option)=>{options.push(option);return `jpeg-${option.quality}`;};
    await f.api.storage.local.set({[PREFS_KEY]:{capture:true}});
    await f.cache.capture(1);assert.equal(f.local.screenshot_1,'jpeg-40');
    for(const quality of [20,80]){
        const previous=f.local.screenshot_1;
        await f.api.storage.local.set({[PREFS_KEY]:{...DEFAULTS,previewQuality:quality}});
        assert.equal(f.local.screenshot_1,previous);
        await f.cache.capture(1);assert.equal(f.local.screenshot_1,`jpeg-${quality}`);
    }
    assert.deepEqual(options,[40,20,80].map(quality=>({format:'jpeg',quality})));
});

test('restricted pages are captured only through explicit toolbar invocation',async()=>{
 for(const url of ['chrome://newtab/','chrome://settings/','chrome-extension://other/page.html','data:text/html,hello','file:///example.html']){
  const f=cacheFixture();await f.api.tabs.update(1,{url});await f.cache.capture(1);assert.equal(f.calls.length,0,url);
  await captureBeforeOpen({ready:Promise.resolve(),private:false,previews:f.cache},await f.api.tabs.get(1));await f.cache.queue;
  assert.equal(f.calls.length,1,url);assert.equal(f.local.screenshot_1,'image-1000');
 }
});
test('explicit captures retain exclusions, private mode, and the self-page guard',async()=>{
 for(const patch of [{url:grid},{incognito:true},{url:'javascript:alert(1)'}]){
  const f=cacheFixture();await f.api.tabs.update(1,patch);await f.cache.capture(1,{userInvoked:true});assert.equal(f.calls.length,0);
 }
 const f=cacheFixture();await f.api.storage.local.set({[PREFS_KEY]:{...DEFAULTS,previewSites:['example.com']}});await f.cache.capture(1,{userInvoked:true});assert.equal(f.calls.length,0);
});

test('a visible idle page refreshes every fifteen seconds and stops when hidden',async()=>{
 const f=contentFixture();await flush();await f.advance(400);assert.equal(f.messages.length,1);
 await f.advance(15000);assert.equal(f.messages.length,2);
 f.document.hidden=true;f.document.emit('visibilitychange');await f.advance(60000);assert.equal(f.messages.length,2);
 f.document.hidden=false;f.document.emit('visibilitychange');await f.advance(400);assert.equal(f.messages.length,3);
});

test('worker alarm captures only active tabs in a focused regular window',async()=>{
 const f=controllerFixture(),alarms=[];f.api.alarms={onAlarm:event(),create:(name,options)=>alarms.push({name,options})};
 const get=f.api.windows.get;f.api.windows.get=async id=>({...await get(id),focused:id===1});
 installPreviewRefresh(f.api,f.personal);await flush();
 f.api.alarms.onAlarm.emit({name:'tabgrid-preview-refresh'});await flush();await f.cache.captureQueue;await f.cache.queue;
 assert.equal(f.calls.length,1);assert.equal(f.calls[0].windowId,1);assert.equal(alarms[0].options.periodInMinutes,.5);
});

test('extension invalidation disposes safely even when Chrome APIs disappear and listeners throw',async()=>{
 const f=contentFixture();await flush();await f.advance(400);
 const runtime=f.chrome.runtime,storage=f.chrome.storage;
 runtime.sendMessage=async()=>{delete f.chrome.storage;delete f.chrome.runtime;throw Error('Extension context invalidated');};
 storage.onChanged.removeListener=()=>{throw Error('Invalidated listener');};runtime.onMessage.removeListener=()=>{throw Error('Invalidated listener');};
 await assert.doesNotReject(f.advance(15000));await f.advance(60000);assert.equal(f.messages.length,1);
 // Reinjection in a fresh valid context starts one tracker again.
 f.chrome.runtime={...runtime,sendMessage:async message=>f.messages.push(message),onMessage:event()};f.chrome.storage={...storage,onChanged:event()};
 f.again();await flush();await f.advance(400);assert.equal(f.messages.length,2);
 f.again();await f.advance(15000);assert.equal(f.messages.length,3);
});
test('injection exits quietly when extension storage is unavailable',()=>{
 const f=contentFixture();delete f.chrome.storage;assert.doesNotThrow(f.again);
});

test('a successfully authorized internal tab refreshes after switching and worker recreation',async()=>{
 const f=cacheFixture();await f.api.tabs.update(1,{url:'chrome://newtab/'});
 await f.cache.capture(1);assert.equal(f.calls.length,0);
 await f.cache.capture(1,{userInvoked:true});assert.equal(f.calls.length,1);
 await f.api.tabs.update(1,{active:false});await f.cache.capture(1);assert.equal(f.calls.length,1);
 await f.api.tabs.update(1,{active:true});f.cache.invalidateCaptures();await f.cache.capture(1);assert.equal(f.calls.length,2);
 const restarted=new PreviewCache(f.api,grid,{now:()=>5000,wait:async()=>{}});await restarted.capture(1);assert.equal(f.calls.length,3);
 await f.api.tabs.update(2,{url:'chrome://newtab/'});await restarted.capture(2);assert.equal(f.calls.length,3,'grant is not shared with a different tab');
});
test('navigation, denied captures, and a fresh browser session retire internal capture eligibility',async()=>{
 for(const change of ['navigation','denied','session','clear']){
  const f=cacheFixture();await f.api.tabs.update(1,{url:'chrome://newtab/'});await f.cache.capture(1,{userInvoked:true});
  if(change==='navigation'){await f.api.tabs.update(1,{url:'chrome://settings/'});await f.cache.capture(1);assert.equal(f.calls.length,1);await f.cache.clear(1);await f.api.tabs.update(1,{url:'chrome://newtab/'});}
  if(change==='denied'){const capture=f.api.tabs.captureVisibleTab;f.api.tabs.captureVisibleTab=async()=>{throw Error('Permission denied');};await f.cache.capture(1);f.api.tabs.captureVisibleTab=capture;}
  if(change==='session')await f.api.storage.session.remove('tabgridPreviewGrant_1');
  if(change==='clear')await f.cache.clear();
  await f.cache.capture(1);assert.equal(f.calls.length,1,change);
 }
});

// Reproduce the toolbar click arriving immediately after an automatic capture.
test('toolbar capture survives the real quota delay after automatic capture',async()=>{
    const f=cacheFixture();await f.cache.capture(1);
    f.cache.wait=ms=>new Promise(resolve=>setTimeout(()=>{f.advance(ms);resolve();},ms));
    await captureBeforeOpen({ready:Promise.resolve(),private:false,previews:f.cache},await f.api.tabs.get(1));
    await f.cache.queue;
    assert.equal(f.calls.length,2);assert.equal(f.local.screenshot_1,'image-1600');
});

test('batch ownership pauses automatic capture and activation invalidation',async()=>{
    const f=controllerFixture();let paused=true;
    const refresh=installPreviewRefresh(f.api,f.personal,{paused:()=>paused});await flush();
    const epoch=f.cache.epoch;
    f.api.tabs.onActivated.emit({tabId:1,windowId:1});
    await refresh.fromPage({type:'tabgrid-preview-activity'},{id:'test',frameId:0,url:'https://example.com/1',tab:await f.api.tabs.get(1)});
    await new Promise(resolve=>setTimeout(resolve,550));
    assert.equal(f.calls.length,0);assert.equal(f.injections.length,0);assert.equal(f.cache.epoch,epoch);
    paused=false;
    await refresh.fromPage({type:'tabgrid-preview-activity'},{id:'test',frameId:0,url:'https://example.com/1',tab:await f.api.tabs.get(1)});
    assert.equal(f.calls.length,1);
});
