import test from 'node:test';
import assert from 'node:assert/strict';
import {GridLifecycle} from '../lib/grid-lifecycle.mjs';
import {DEFAULTS,validatePreferences} from '../lib/preferences.mjs';
import {fixture} from './chrome-mock.mjs';
const url='chrome-extension://test/grid.html';
const tab=(id,patch={})=>({id,index:id,windowId:1,url,active:false,...patch});
function setup(tabs,options={}){const f=fixture(tabs),prefs={...DEFAULTS,...options.prefs};f.api.windows.getLastFocused=async()=>({id:1});const lifecycle=new GridLifecycle(f.api,url,{preferences:async()=>prefs,privateMode:Boolean(options.privateMode),now:()=>10000});return {...f,lifecycle,prefs};}
test('reuse preserves restored duplicates and separates private tabs',async()=>{
 const f=setup([tab(1),tab(2,{active:true}),tab(3,{windowId:2,incognito:true}),tab(4,{url:'https://example.com'})]);
 assert.equal((await f.lifecycle.findExisting(1)).id,2);assert.deepEqual(f.tabs().map(t=>t.id),[1,2,3,4]);assert.equal(f.sessions.length,0);
 const privateGrid=setup([tab(1,{active:true}),tab(2,{incognito:true,windowId:2})],{privateMode:true});
 assert.equal((await privateGrid.lifecycle.findExisting(2)).id,2);assert.equal(privateGrid.sessions.length,0);
});
test('reuse is scoped to the requested window without closing background grids',async()=>{
 const f=setup([tab(1,{active:true}),tab(2,{windowId:2,active:true}),tab(3)]);assert.equal((await f.lifecycle.findExisting(1)).id,1);assert.deepEqual(f.tabs().map(t=>t.id),[1,2,3]);
});
test('reuse rechecks navigation and skips pending unrelated pages',async()=>{
 const f=setup([tab(1,{active:true}),tab(2,{pendingUrl:'https://example.com'}),tab(3)]);const get=f.api.tabs.get;
 f.api.tabs.get=async id=>id===1?{...await get(id),url:'https://example.com'}:get(id);
 assert.equal((await f.lifecycle.findExisting(1)).id,3);assert.deepEqual(f.tabs().map(t=>t.id),[1,2,3]);assert.equal(f.sessions.length,0);
});
test('restoring a grid then opening it does not bury previously closed pages in a restore loop',async()=>{
 const source=tab(1,{url:'https://example.com/current',active:true});
 const f=setup([source,tab(2),tab(3,{url:'https://example.com/closed'})]);
 await f.api.tabs.remove(3);await f.api.tabs.remove(2);
 await f.lifecycle.open(source);
 assert.equal(f.sessions.length,2);
 const restored=await f.api.sessions.restore(f.sessions[0].tab.sessionId);
 // Repeated toolbar invocations and a restarted worker must not close either grid.
 await f.lifecycle.open(restored.tab);await f.lifecycle.open(restored.tab);
 const restarted=new GridLifecycle(f.api,url,{preferences:async()=>f.prefs});
 await restarted.open(restored.tab);
 assert.equal(f.tabs().filter(t=>t.url===url).length,2);assert.equal(f.sessions.length,1);
 assert.equal(f.sessions[0].tab.url,'https://example.com/closed');
 const page=await f.api.sessions.restore(f.sessions[0].tab.sessionId);
 assert.equal(page.tab.url,'https://example.com/closed');assert.equal(f.sessions.length,0);
});
test('rapid toolbar requests reuse locally and create independently in another window',async()=>{
 const source=tab(1,{url:'https://example.com',active:true}),f=setup([source]);
 await Promise.all([f.lifecycle.open(source),f.lifecycle.open(source)]);assert.equal(f.tabs().filter(t=>t.url===url).length,1);
 const second=setup([source,tab(2,{windowId:2})]);await second.lifecycle.open(source);assert.equal(second.tabs().length,3);assert.equal((await second.api.tabs.get(2)).active,false);assert.equal(second.tabs().find(t=>t.url===url&&t.windowId===1).active,true);
});
test('auto-close is off by default and normal card activation leaves the grid open',async()=>{
 assert.equal(DEFAULTS.closeAfterSwitch,false);assert.equal(validatePreferences({closeAfterSwitch:true}).closeAfterSwitch,true);
 const f=setup([tab(1,{active:true}),tab(2,{url:'https://example.com'})]);await f.lifecycle.switchTo(1,2);assert.equal(f.tabs().length,2);assert.equal((await f.api.tabs.get(2)).active,true);
});
test('opt-in card switch closes only its source and resumes the saved view once',async()=>{
 const f=setup([tab(1,{active:true}),tab(2,{url:'https://example.com'})],{prefs:{closeAfterSwitch:true}}),view={root:{query:'example',position:{scroll:120}},filters:{root:{websites:['example.com']}}};
 assert.deepEqual(await f.lifecycle.switchTo(1,2,{view}),{closed:true});assert.deepEqual(f.tabs().map(t=>t.id),[2]);
 assert.deepEqual(await f.lifecycle.takeView(1),view);assert.equal(await f.lifecycle.takeView(1),null);
});
test('visible paused Undo and recent undo journals keep the grid available',async()=>{
 for(const kind of ['visible','close','group']){
  const f=setup([tab(1,{active:true}),tab(2,{url:'https://example.com'})],{prefs:{closeAfterSwitch:true}});
  if(kind!=='visible')await f.api.storage.session.set({tabgridUndo:[{completedAt:9000,tabs:[{state:kind==='close'?'closed':'changed'}]}]});
  await f.lifecycle.switchTo(1,2,{keepOpen:kind==='visible'});assert.equal(f.tabs().length,2,kind);
 }
});
test('expired Undo does not prevent opt-in close',async()=>{
 const f=setup([tab(1,{active:true}),tab(2,{url:'https://example.com'})],{prefs:{closeAfterSwitch:true}});
 await f.api.storage.session.set({tabgridUndo:[{completedAt:1,tabs:[{state:'closed'}]}]});await f.lifecycle.switchTo(1,2);assert.equal(f.tabs().length,1);
});
test('failed activation, changed focus, and cross-context switches do not close the grid',async()=>{
 for(const mode of ['failure','focus','private']){
  const f=setup([tab(1,{active:true}),tab(2,{url:'https://example.com',incognito:mode==='private'})],{prefs:{closeAfterSwitch:true}});
  if(mode==='failure')f.fail.update.add(2);
  if(mode==='focus')f.api.windows.get=async()=>({focused:false});
  if(mode==='focus')await f.lifecycle.switchTo(1,2);else await assert.rejects(f.lifecycle.switchTo(1,2));
  assert.equal(f.tabs().length,2,mode);
 }
});
test('private quick views stay in their own session key',async()=>{
 const f=setup([tab(1,{active:true,incognito:true}),tab(2,{url:'https://example.com',incognito:true})],{privateMode:true,prefs:{closeAfterSwitch:true}});
 await f.lifecycle.switchTo(1,2,{view:{root:{query:'private'}}});assert.equal(f.storage['tabgridQuickView:regular'],undefined);assert.equal(f.storage['tabgridQuickView:private:1'].root.query,'private');
});

test('two windows each retain and reuse their own grid on repeated toolbar clicks',async()=>{
 const first=tab(1,{active:true,url:'https://first.example'}),second=tab(2,{active:true,windowId:2,url:'https://second.example'}),f=setup([first,second]);
 await Promise.all([f.lifecycle.open(first),f.lifecycle.open(second)]);
 const grids=f.tabs().filter(t=>t.url===url);assert.equal(grids.length,2);assert.deepEqual(grids.map(t=>t.windowId).sort(),[1,2]);
 for(const source of [first,second]){
  await f.api.tabs.update(source.id,{active:true});const before=f.calls.length;
  await f.lifecycle.open(source);
  assert.equal(f.tabs().filter(t=>t.url===url).length,2);
  assert.equal(f.tabs().find(t=>t.url===url&&t.windowId===source.windowId).active,true);
  assert.ok(f.calls.slice(before).filter(c=>c[0]==='windowUpdate').every(c=>c[1]===source.windowId));
 }
 assert.equal(f.sessions.length,0);
});
test('a moved source uses its live window, and a grid moved during lookup is not reused',async()=>{
 const source=tab(1,{active:true,url:'https://example.com'}),f=setup([source,tab(2,{windowId:2})]);
 await f.api.tabs.move(1,{windowId:2,index:-1});await f.lifecycle.open(source);
 assert.equal(f.tabs().filter(t=>t.url===url).length,1);assert.equal((await f.api.tabs.get(2)).active,true);
 const g=setup([source,tab(2),tab(3,{windowId:2,url:'https://other.example'})]),get=g.api.tabs.get;
 g.api.tabs.get=async id=>{if(id===2)await g.api.tabs.move(2,{windowId:2,index:-1});return get(id);};
 await g.lifecycle.open(source);assert.equal(g.tabs().filter(t=>t.url===url&&t.windowId===1).length,1);
 assert.equal(g.calls.filter(c=>c[0]==='windowUpdate'&&c[1]===2).length,0);
});
test('a source left during grid lookup does not steal focus',async()=>{
 const source=tab(1,{active:true,url:'https://example.com'}),f=setup([source,tab(2),tab(3,{url:'https://other.example'})]);
 const query=f.api.tabs.query;f.api.tabs.query=async options=>{const result=await query(options);await f.api.tabs.update(3,{active:true});return result;};
 await f.lifecycle.open(source);assert.equal((await f.api.tabs.get(3)).active,true);assert.equal(f.calls.filter(c=>c[0]==='windowUpdate').length,0);
});
test('quick views resume only in the source window and are consumed independently',async()=>{
 const f=setup([tab(1,{active:true}),tab(2,{url:'https://a.example'}),tab(3,{windowId:2,active:true}),tab(4,{windowId:2,url:'https://b.example'})],{prefs:{closeAfterSwitch:true}});
 await f.lifecycle.switchTo(1,2,{view:{root:{query:'one'}}});await f.lifecycle.switchTo(3,4,{view:{root:{query:'two'}}});
 assert.equal(await f.lifecycle.takeView(3),null);
 assert.deepEqual(await f.lifecycle.takeView(2),{root:{query:'two'}});
 assert.deepEqual(await f.lifecycle.takeView(1),{root:{query:'one'}});
 assert.equal(await f.lifecycle.takeView(2),null);
});
