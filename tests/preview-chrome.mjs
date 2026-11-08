import './store-preview.mjs';
import {PreviewBatch} from '../lib/preview-batch.mjs';
let previewBatch;
import {GridLifecycle} from '../lib/grid-lifecycle.mjs';
import { initializeLanguage } from '../lib/i18n.mjs';
await initializeLanguage({storage:{local:{get:async()=>JSON.parse(localStorage.getItem(new URLSearchParams(location.search).has('private')?'tabgrid-fixture-private':'tabgrid-fixture-local')||'{}')}}});
const { WindowOrder } = await import('../lib/window-order.mjs');
const { Personalization } = await import('../lib/personalization.mjs');
// Deterministic UI sandbox. No real browser tabs, history, or account data is used.
const { TabActions } = await import('../lib/tab-actions.mjs');
const { fixture } = await import('./chrome-mock.mjs');
const gridUrl = new URL('/grid.html', location.href).href;
// Test-only capability failure, before the application mounts its renderer.
if(new URLSearchParams(location.search).has('no-gpu')) Object.defineProperty(navigator,'gpu',{value:undefined,configurable:true});
const f = fixture([
    {id:1,windowId:1,index:0,title:'Pinned documentation',pinned:true,url:'https://developer.chrome.com/docs/extensions'},
    {id:2,windowId:1,index:1,title:'TabGrid project',url:'https://github.com/Mikafuu/TabGrid'},
    {id:3,windowId:1,index:2,title:'Research notes',groupId:7,url:'https://example.com/research'},
    {id:4,windowId:1,index:3,title:'Reference article',groupId:7,url:'https://example.com/reference'},
    {id:5,windowId:1,index:4,title:'Music',audible:true,url:'https://example.com/music'},
    {id:6,windowId:1,index:5,title:'Reading queue',url:'https://example.com/reading'},
    {id:7,windowId:2,index:0,title:'Second window notes',url:'https://example.com/window2'},
    {id:8,windowId:2,index:1,title:'Another window reference',url:'https://example.com/window2/other'},
    {id:99,windowId:1,index:6,title:'Tab Grid View',url:gridUrl,active:true}
], [{id:7,windowId:1,title:'Research',color:'blue',collapsed:false}], gridUrl);
if (new URLSearchParams(location.search).has('store')) {
    const lang=new URLSearchParams(location.search).get('lang');
    const titles=lang==='zh-CN'?['设计文档','项目计划','研究笔记','参考资料','音乐精选','阅读清单','设计灵感','设计指南']:lang==='ja'?['デザイン資料','プロジェクト計画','リサーチノート','参考記事','音楽コレクション','リーディングリスト','デザインのアイデア','デザインガイド']:['Design documentation','Project plan','Research notes','Reference article','Music collection','Reading list','Design inspiration','Design guide'];
    for(let id=1;id<=8;id++) await f.api.tabs.update(id,{title:titles[id-1],pinned:false,windowId:1,favIconUrl:new URL('/assets/icons/extension/icon-32.png',location.href).href});
    await f.api.tabGroups.update(7,{title:lang==='zh-CN'?'研究资料':lang==='ja'?'リサーチ':'Research'});
}
if (new URLSearchParams(location.search).has('large')) {
    for (let n = 0; n < 30; n++) await f.api.tabs.create({ windowId: 1, groupId: 7, title: `Group scroll test ${n + 1}`, url: `https://example.com/scroll/${n}` });
}
if (new URLSearchParams(location.search).has('previews')) {
    const ids = [];
    for (let n = 0; n < 5; n++) ids.push((await f.api.tabs.create({ windowId: 1, title: `Design reference ${n + 1}`, url: `https://example.com/design/${n}` })).id);
    const id = await f.api.tabs.group({ tabIds: ids, createProperties: { windowId: 1 } });
    await f.api.tabGroups.update(id, { title: 'Design references', color: 'green' });
}
if (new URLSearchParams(location.search).has('split')) {
    for (const id of [1,2]) await f.api.tabs.update(id,{splitViewId:10,pinned:false});

}
const event = () => { const listeners=[]; return { addListener(fn){listeners.push(fn);}, emit(...args){listeners.forEach(fn=>fn(...args));} }; };
const api=f.api;
const privateMode = new URLSearchParams(location.search).has('private');
api.extension = { inIncognitoContext: privateMode, async isAllowedIncognitoAccess() { return true; } };
if (privateMode) { for (const t of f.tabs()) await api.tabs.update(t.id, { incognito: true }); f.actions = new TabActions(api, gridUrl); }
for (const id of [3,4,6]) await api.tabs.update(id, { lastAccessed: Date.now() - 20 * 86400000 });
const soundRules = new Map();
api.contentSettings = { sound: {
    async get({primaryUrl}) { return { setting: soundRules.get(new URL(primaryUrl).origin) || 'allow' }; },
    async set({primaryPattern, setting}) { soundRules.set(new URL(primaryPattern).origin, setting); }
} };
api.permissions = { async request() { return true; }, async contains() { return true; } };
const bookmarkTree = [{ id: '0', children: [
    { id: '1', parentId: '0', title: 'Bookmarks bar', folderType: 'bookmarks-bar', children: [] },
    { id: '2', parentId: '0', title: 'Other bookmarks', folderType: 'other', children: [{ id: '3', parentId: '2', title: 'Research', children: [] }] }
] }];
api.bookmarks = {
    async getTree() { return structuredClone(bookmarkTree); },
    async create(p) {
        const nodes = bookmarkTree.flatMap(n => [n, ...(n.children || []), ...(n.children || []).flatMap(c => c.children || [])]);
        const parent = nodes.find(n => n.id === p.parentId); if (!parent) throw new Error('No folder');
        const node = { id: crypto.randomUUID(), ...p, ...(!p.url ? { children: [] } : {}) }; parent.children.push(node); return node;
    }, async remove() {}
};
api.readingList = { async query() { return []; }, async addEntry() {} };
api.storage.onChanged=event();
const local=JSON.parse(localStorage.getItem(privateMode?'tabgrid-fixture-private':'tabgrid-fixture-local')||'{}');
api.storage.local={ async get(keys){ return Object.fromEntries((Array.isArray(keys)?keys:typeof keys === 'string'?[keys]:Object.keys(local)).map(k=>[k,local[k]])); }, async set(values){ const changes=Object.fromEntries(Object.entries(values).map(([k,v])=>[k,{newValue:v}]));Object.assign(local,values);localStorage.setItem(privateMode?'tabgrid-fixture-private':'tabgrid-fixture-local',JSON.stringify(local));api.storage.onChanged.emit(changes,'local'); },async remove(key){const changes={};for(const k of [key].flat()){changes[k]={oldValue:local[k]};delete local[k];}localStorage.setItem(privateMode?'tabgrid-fixture-private':'tabgrid-fixture-local',JSON.stringify(local));api.storage.onChanged.emit(changes,'local');} };
Object.assign(f.storage,JSON.parse(sessionStorage.getItem('tabgrid-fixture-session')||'{}'));
const originalSet=api.storage.session.set,originalRemove=api.storage.session.remove;
function persistSession(){sessionStorage.setItem('tabgrid-fixture-session',JSON.stringify(Object.fromEntries(Object.entries(f.storage).filter(([k])=>k.startsWith('tabgridView:')||k.startsWith('tabgridGroupView:')||k.startsWith('tabgridQuickView:')||k==='tabgridProtectedGroups'))));}
api.storage.session.set=async data=>{await originalSet(data);persistSession();api.storage.onChanged.emit(Object.fromEntries(Object.entries(data).map(([k,v])=>[k,{newValue:v}])),'session');};
api.storage.session.remove=async key=>{await originalRemove(key);persistSession();};
for(const name of ['onCreated','onUpdated','onRemoved','onMoved','onAttached','onDetached','onActivated','onReplaced']) api.tabs[name]=event();
for(const name of ['onCreated','onUpdated','onRemoved','onMoved']) api.tabGroups[name]=event();
api.windows.onFocusChanged=event();api.windows.onRemoved=event();api.sessions.onChanged=event();
api.windows.getCurrent=async()=>({id:1,incognito:privateMode});
api.windows.getAll=async()=>[{id:1,incognito:privateMode},{id:2,incognito:privateMode}];
api.windows.update=async(id,props)=>{if(props.focused)api.windows.onFocusChanged.emit(id);};
const queryTabs=api.tabs.query;api.tabs.query=async options=>(await queryTabs(options)).filter(t=>options.active===undefined||t.active===options.active);
api.tabs.reload=async()=>{};
api.tabs.duplicate=async id=>{const {id: _id, ...tab}=await api.tabs.get(id);return api.tabs.create({...tab,index:tab.index+1,active:false});};
api.tabs.ungroup=async ids=>{for(const id of [ids].flat()) await api.tabs.update(id,{groupId:-1});};
for(const method of ['create','remove','update','move','group','ungroup','unsplit','createSplit']) {
    const original=api.tabs[method]; api.tabs[method]=async(...args)=>{const result=await original(...args);api.tabs.onUpdated.emit();if(method==='remove')api.sessions.onChanged.emit();if(method==='update'&&args[1]?.active){api.tabs.onActivated.emit({tabId:args[0],windowId:result.windowId});if(!previewBatch?.active)await f.actions.rememberOpened(`tab:${args[0]}`);}return result;};
}
for(const method of ['update','move']) {const original=api.tabGroups[method];api.tabGroups[method]=async(...args)=>{const result=await original(...args);api.tabGroups.onUpdated.emit();return result;};}
f.sessions.push({lastModified:1700000000,tab:{id:90,windowId:1,index:5,url:'https://example.com/closed',title:'Recently closed example',sessionId:'s90'}});
if (new URLSearchParams(location.search).has('closed-windows')) f.sessions.push({lastModified:1700000000,window:{sessionId:'closed-window',tabs:[
    {sessionId:'closed-research',title:'Research notes',url:'https://example.com/research'},
    {sessionId:'closed-reference',title:'Reference article',url:'https://example.com/reference'},
    {sessionId:'closed-music',title:'Music',url:'https://example.com/music'},
    {sessionId:'closed-grid',title:'TabGrid',url:gridUrl}
]}});
const restoreSession=api.sessions.restore;
api.sessions.restore=async id=>{const result=await restoreSession(id);api.sessions.onChanged.emit();return result;};

if (new URLSearchParams(location.search).has('offline') && !privateMode) {
    // A bundled synthetic preview, never a capture of a user's page.
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#d7e5ff"/><text x="40" y="230" font-size="32" fill="#25345b">Cached fixture preview</text></svg>';
    await api.storage.local.set({screenshot_2:`data:image/svg+xml;base64,${btoa(svg)}`});
}
api.tabs.captureVisibleTab=async windowId=>{
    const tab=(await api.tabs.query({windowId})).find(t=>t.active);
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=400;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#d7e5ff';ctx.fillRect(0,0,640,400);
    ctx.fillStyle='#25345b';ctx.font='24px sans-serif';ctx.fillText('Simulated thumbnail: '+tab.id,30,200);
    return canvas.toDataURL('image/jpeg');
};
const personalization=new Personalization(api,gridUrl);
previewBatch=new PreviewBatch(api,personalization,gridUrl);
// Opt-in wallpaper fixture for real WebGPU optics; no user image or flag needed.
if (new URLSearchParams(location.search).has('liquid')) {
    const wallpaper=document.createElement('canvas');wallpaper.width=1200;wallpaper.height=900;
    const ctx=wallpaper.getContext('2d');
    ctx.fillStyle='#d2e8e6';ctx.fillRect(0,0,1200,900);
    for(let x=-864;x<1600;x+=72){ctx.fillStyle=(x/72)%2===0?'#7faeae':'#f7eedb';ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+32,0);ctx.lineTo(x+932,900);ctx.lineTo(x+900,900);ctx.closePath();ctx.fill();}
    await personalization.ready;
    await personalization.updatePreferences({visualStyle:'glass',colorMode:'light',backgroundTransparency:15,backgroundBlur:0});
    await personalization.background('set',{name:'Liquid glass test stripes.webp',dataUrl:wallpaper.toDataURL('image/webp',.95)});
}
const windowOrder=new WindowOrder(api,privateMode);
api.commands={async getAll(){return [{name:'_execute_action',shortcut:''}];}};
const gridLifecycle=new GridLifecycle(api,gridUrl,{privateMode,preferences:()=>personalization.preferences()});
let messageQueue=Promise.resolve();
api.runtime={getURL(path){return new URL(path.startsWith('/')?path:'/'+path,location.href).href;},async sendMessage(message){const work=async()=>{try{const a=message.action,args=message.args||[];const methods={startThumbnailUpdate:()=>previewBatch.start(99),thumbnailUpdateStatus:()=>previewBatch.status(),cancelThumbnailUpdate:()=>previewBatch.cancel(),switchFromGrid:()=>gridLifecycle.switchTo(99,args[0],args[1]),takeQuickView:()=>gridLifecycle.takeView(1),windowOrder:()=>windowOrder.snapshot(),preferences:()=>personalization.preferences(),updatePreferences:()=>personalization.updatePreferences(args[0]),searchHistory:()=>personalization.history(...args),background:()=>personalization.background(...args),preview:()=>personalization.preview(...args),importSettings:()=>personalization.import(...args),protectedGroups:()=>personalization.protectedGroups(...args)};if(methods[a])return {result:await methods[a]()};return {result:message.action==='undo'?await f.actions.undo(message.args[0],99):await f.actions[message.action](...message.args)};}catch(error){return {error:error.message};}};const pending=messageQueue.then(work,work);messageQueue=pending.catch(()=>{});return pending;}};
globalThis.chrome=api;
const panel=document.createElement('div');panel.style.cssText='padding:12px;border:1px dashed #808080;margin:12px 0;height:180px;overflow:auto';panel.textContent='UI test sandbox — simulated tabs only. ';
if(new URLSearchParams(location.search).has('liquid')) {
    const probe=document.createElement('output');probe.id='test-liquid-capabilities';
    probe.textContent=JSON.stringify({webgpu:Boolean(navigator.gpu),htmlCapture:typeof GPUQueue!=='undefined'&&typeof GPUQueue.prototype.copyElementImageToTexture==='function'});
    panel.append(probe);
}
const iconPreview=document.createElement('img'); iconPreview.src='/tileIcon.png'; iconPreview.alt='Extension icon preview'; iconPreview.width=32; iconPreview.height=32; panel.append(iconPreview);
const external=document.createElement('button');external.textContent='Simulate external tab';external.onclick=()=>api.tabs.create({windowId:1,url:'https://example.com/external',title:'Externally created tab'});panel.append(external);
const log=document.createElement('output'); log.style.cssText='display:block;margin-top:8px;white-space:pre-wrap';panel.append(log);
const thumbnailReport=document.createElement('output');
const thumbnailEvidence=document.createElement('button');thumbnailEvidence.textContent='Inspect thumbnail update';thumbnailEvidence.onclick=async()=>{thumbnailReport.textContent=JSON.stringify({status:await previewBatch.status(),images:Object.keys(await api.storage.local.get(null)).filter(k=>k.startsWith('screenshot_'))});};const thumbnailTools=document.createElement('div');thumbnailTools.append(thumbnailEvidence,thumbnailReport);document.body.append(thumbnailTools);thumbnailTools.hidden=new URLSearchParams(location.search).has('design');
const order=document.createElement('button');order.textContent='Inspect simulated tab order';order.onclick=()=>{log.textContent=f.tabs().filter(t=>t.id!==99).sort((a,b)=>a.windowId-b.windowId||a.index-b.index).map(t=>`${t.windowId}: ${t.title||t.url} [${t.groupId===-1?'tab':'group '+t.groupId}]${t.active?' (active)':''}`).join('\n') + '\nActive simulated tabs: ' + f.tabs().filter(t=>t.active).map(t=>t.title||t.url).join(', ');};panel.append(order);
const backupEvidence=document.createElement('output');backupEvidence.id='test-backup-log';backupEvidence.style.display='block';panel.append(backupEvidence);
const createObjectURL=URL.createObjectURL.bind(URL);
URL.createObjectURL=value=>{if(value instanceof Blob&&value.type==='application/json')value.text().then(text=>{const data=JSON.parse(text);backupEvidence.textContent=`Local backup generated: ${data.format} v${data.version}, ${text.length} characters; preferences only: ${Object.keys(data).sort().join(', ')}`;});return createObjectURL(value);};
document.querySelector('header').prepend(panel);
if (new URLSearchParams(location.search).has('design')) {
    panel.hidden=true;
    const note=document.createElement('small');note.textContent='Design preview · simulated tabs';note.style.cssText='position:fixed;right:16px;bottom:12px;color:var(--muted);font-size:10px;pointer-events:none';document.body.append(note);
}
await import('../grid.js');
const dragLog = document.createElement('output'); dragLog.id='test-drag-log'; dragLog.style.display='block'; panel.append(dragLog);
for (const name of ['start', 'add', 'end']) document.addEventListener(name, e => { if (e.item) dragLog.textContent = `${name}: ${e.from?.id} → ${e.to?.dataset.destination || e.to?.id}; ${e.items?.length || 1} tab(s)`; });
// Expose transient drag visuals as fixture evidence; this observes DOM only.
const motionLog = document.createElement('output'); motionLog.id = 'test-motion-log'; motionLog.style.display = 'block'; panel.append(motionLog);
let motionFrame;
let dragEvidence;
let surfaceSnapshots = new Map();
document.addEventListener('move', e => {
    if (!e.dragged || !dragEvidence) return;
    surfaceSnapshots = new Map([...e.from.children].filter(card => card.itemModel && !card.matches('.sortable-ghost, .sortable-fallback, .sortable-drag')).map(card => [card, card.querySelector('.card-surface').getBoundingClientRect()]));
});
const continuity = new MutationObserver(() => {
    if (!dragEvidence) return;
    for (const [card, before] of surfaceSnapshots) {
        if (!card.isConnected) continue;
        const after = card.querySelector('.card-surface').getBoundingClientRect();
        dragEvidence.maxJump = Math.max(dragEvidence.maxJump, Math.hypot(after.left - before.left, after.top - before.top));
    }
    surfaceSnapshots.clear();
});
document.querySelectorAll('.grid-container').forEach(grid => continuity.observe(grid, { childList: true }));
document.addEventListener('change', e => {
    if (!e.item || !dragEvidence) return;
    dragEvidence.swaps++;
    const overlapping = [...e.from.children].some(card => card.itemModel && !card.matches('.sortable-ghost, .sortable-fallback, .sortable-drag') && card.querySelector('.card-surface')?.getAnimations().some(a => (a.playState === 'running' || a.pending) && Number(a.effect?.getTiming().duration) > 0));
    if (overlapping) dragEvidence.retargetedSwaps++;
});
document.addEventListener('start', e => {
    if (!e.item) return;
    cancelAnimationFrame(motionFrame);
    const evidence = dragEvidence = { ghostOpacity: null, shiftedCards: [], swaps: 0, retargetedSwaps: 0, animatedSlots: [], expandedDrawers: [], maxJump: 0 };
    const sample = () => {
        document.querySelectorAll('.drop-targets.expanded').forEach(drawer => { if (!evidence.expandedDrawers.includes(drawer.id)) evidence.expandedDrawers.push(drawer.id); });
        const ghost = document.querySelector('.sortable-ghost');
        if (ghost) evidence.ghostOpacity = getComputedStyle(ghost).opacity;
        document.querySelectorAll('.grid-container > .card:not(.sortable-ghost):not(.sortable-fallback)').forEach(card => {
            if (card.querySelector('.card-surface')?.getAnimations().some(a => Number(a.effect?.getTiming().duration) > 0 && a.effect?.getKeyframes().some(frame => frame.transform && frame.transform !== 'none')) && !evidence.shiftedCards.includes(card.dataset.key)) evidence.shiftedCards.push(card.dataset.key);
            if (getComputedStyle(card).transform !== 'none' && !evidence.animatedSlots.includes(card.dataset.key)) evidence.animatedSlots.push(card.dataset.key);
        });
        motionLog.textContent = `Drag visuals: ${JSON.stringify(evidence)}`;
        if (document.body.classList.contains('dragging')) motionFrame = requestAnimationFrame(sample);
    };
    motionFrame = requestAnimationFrame(sample);
});

// Disposable-fixture evidence only: observe drawer geometry and window requests.
const drawerLog=document.createElement('output');drawerLog.id='test-drawer-log';panel.append(drawerLog);
const windowLog=document.createElement('output');windowLog.id='test-window-log';panel.append(windowLog);
const windowRequests=[];const createWindow=api.windows.create;
api.windows.create=async props=>{windowRequests.push({incognito:props.incognito,url:props.url});windowLog.textContent=JSON.stringify(windowRequests);return createWindow(props);};
let drawerEvidence={moving:[],groupTargets:[]};
function observeDrawer(){
    const tray=[...document.querySelectorAll('.drop-targets')].find(el=>!el.hidden&&el.classList.contains('drawer-moving'));
    if(tray){const grip=tray.querySelector('.drawer-grip');const value={edge:tray.dataset.edge,width:grip.offsetWidth,height:grip.offsetHeight,radius:getComputedStyle(tray).borderRadius};if(!drawerEvidence.moving.some(row=>JSON.stringify(row)===JSON.stringify(value)))drawerEvidence.moving.push(value);}
    if(document.body.classList.contains('dragging-group')){const active=[...document.querySelectorAll('.drop-targets.expanded .drop-target')].filter(el=>el.getBoundingClientRect().width>0).map(el=>el.dataset.destination);if(active.length)drawerEvidence.groupTargets=active;}
    drawerLog.textContent=JSON.stringify(drawerEvidence);
}
for(const event of ['pointermove','mousemove','start'])document.addEventListener(event,observeDrawer);

// Observe actual browser effects; this does not drive production animations.
const materialLog=document.createElement('output');materialLog.id='test-material-log';panel.append(materialLog);
const materialEvidence={effects:[],closedPaint:[]};let materialFrame;
function sampleMaterial(){
    for(const animation of document.getAnimations()){
        const effect=animation.effect,target=effect?.target;if(!target||Number(effect.getTiming().duration)<=0)continue;
        const frames=effect.getKeyframes().map(({transform,opacity,transformOrigin})=>({transform,opacity,transformOrigin}));
        if(!frames.some(f=>f.transform||f.opacity!==undefined))continue;
        const name=target.id||target.className||target.querySelector('input,select')?.id||target.tagName;
        const entry={target:name,duration:effect.getTiming().duration,frames};
        if(!materialEvidence.effects.some(e=>JSON.stringify(e)===JSON.stringify(entry)))materialEvidence.effects.push(entry);
    }
    materialEvidence.effects=materialEvidence.effects.slice(-160);materialLog.textContent=JSON.stringify(materialEvidence);
}
new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n instanceof Element&&n.hasAttribute('data-motion-cue')))){cancelAnimationFrame(materialFrame);materialFrame=requestAnimationFrame(sampleMaterial);}}).observe(document.body,{childList:true,subtree:true});
document.addEventListener('beforetoggle',e=>{if(e.newState!=='closed')return;const target=e.target;requestAnimationFrame(()=>{materialEvidence.closedPaint.push({target:target.id||target.className,display:getComputedStyle(target).display,open:target.tagName==='DIALOG'?target.open:target.matches(':popover-open')});materialEvidence.closedPaint=materialEvidence.closedPaint.slice(-30);sampleMaterial();});},true);

if(new URL(location.href).searchParams.has('motionProbe')) import('./motion-probe.mjs');
if(new URL(location.href).searchParams.has('gestureProbe')) import('./gesture-probe.mjs');
