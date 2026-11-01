// Opt-in fixture checks. These synthesize input against the real handlers and
// Sortable; they never operate on the user's Chrome tabs.
const output=document.createElement('output');output.id='gesture-probe';output.hidden=true;document.body.append(output);
const records=[];const record=value=>{records.push(value);output.textContent=JSON.stringify(records);};
window.addEventListener('error',event=>record({error:event.message}));
const toolbar=document.createElement('div');toolbar.style.cssText='position:fixed;bottom:0;left:0;z-index:2147483647;background:var(--surface);padding:4px;display:flex;flex-wrap:wrap;max-width:100vw;gap:4px';document.body.append(toolbar);
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const center=element=>{const r=element.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};};
function emit(kind,point,target,buttons=1){target.dispatchEvent(new PointerEvent(`pointer${kind}`,{bubbles:true,cancelable:true,pointerId:17,pointerType:'mouse',isPrimary:true,clientX:point.x,clientY:point.y,button:0,buttons}));target.dispatchEvent(new MouseEvent(`mouse${kind}`,{bubbles:true,cancelable:true,clientX:point.x,clientY:point.y,button:0,buttons}));}
async function drag(source,destination,{hold=300,travel=80,dwell=430,continueTo=null}={}){
    source.scrollIntoView({block:'center'});await pause(80);const start=center(source);emit('down',start,source.querySelector('.card-open'));
    await pause(hold);emit('move',{x:start.x+14,y:start.y},document);await pause(travel);
    let end=typeof destination==='function'?destination():center(destination);emit('move',end,document);await pause(dwell);
    if(continueTo){end=center(continueTo());emit('move',end,document);await pause(430);}
    record({stage:'before-release',body:document.body.className,target:document.querySelector('[data-group-drop]')?.dataset.groupDrop,exit:document.querySelector('#group-dialog')?.dataset.dragExit,dialogOpen:document.querySelector('#group-dialog').open,feedback:document.querySelector('.drag-action-tip')?.textContent,swipe:source.dataset.swipe});
    emit('up',end,document,0);document.body.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,clientX:end.x,clientY:end.y,detail:1}));await pause(500);
    record({stage:'after-release',dialog:document.querySelector('#action-dialog[open]')?.textContent,keys:[...document.querySelectorAll('.grid-container > .card[data-key]')].map(n=>n.dataset.key),groupOpen:document.querySelector('#group-dialog').open});
}
function add(name,work){const b=document.createElement('button');b.textContent=name;b.onclick=async()=>{b.disabled=true;try{await work();}catch(e){record({error:e.message});}finally{b.disabled=false;}};toolbar.append(b);}
const card=key=>document.querySelector(`.grid-container > .card[data-key="${key}"]`);
add('Probe return drag lock',async()=>{
    const source=card('tab:2');source.scrollIntoView({block:'center'});await pause(80);
    const start=center(source),end={x:start.x+40,y:start.y};
    emit('down',start,source.querySelector('.card-open'));await pause(300);
    emit('move',end,document);await pause(100);emit('move',end,document);await pause(60);
    emit('up',end,document,0);
    record({stage:'return-lock-start',locked:source.hasAttribute('data-card-return')});
    emit('down',end,source.querySelector('.card-open'));await pause(300);
    emit('move',{x:end.x+30,y:end.y},document);await pause(40);
    record({stage:'return-lock-rejected',dragging:document.body.classList.contains('dragging'),chosen:source.classList.contains('sortable-chosen'),swipe:source.dataset.swipe||null});
    emit('up',end,document,0);await pause(700);
    const slot=source.getBoundingClientRect(),surface=source.querySelector('.card-surface').getBoundingClientRect();
    record({stage:'return-lock-settled',locked:source.hasAttribute('data-card-return'),offset:Math.abs(slot.left-surface.left)+Math.abs(slot.top-surface.top)});
    const again=center(source);emit('down',again,source.querySelector('.card-open'));await pause(300);
    emit('move',{x:again.x+30,y:again.y},document);await pause(100);
    record({stage:'return-lock-reenabled',dragging:document.body.classList.contains('dragging')});
    emit('up',again,document,0);await pause(700);
});
add('Probe group',()=>drag(card('tab:2'),card('group:7')));
add('Probe new group',()=>drag(card('tab:5'),card('tab:6')));
add('Probe quick pass',()=>drag(card('tab:2'),card('group:7'),{dwell:80}));
async function probeDistinction(source,target){source.scrollIntoView({block:'start'});scrollBy(0,-100);toolbar.style.display='none';await pause(100);
    const start=center(source),destination=center(target),initial=[...source.parentElement.children].filter(n=>n.dataset.key).map(n=>n.dataset.key);
    const sample=stage=>record({stage,initial,keys:[...source.parentElement.children].filter(n=>n.dataset.key).map(n=>n.dataset.key),target:target.dataset.groupDrop,feedback:document.querySelector('.drag-action-tip').textContent});
    emit('down',start,source.querySelector('.card-open'));await pause(300);emit('move',{x:start.x+14,y:start.y},document);await pause(100);
    const axis=Math.abs(destination.y-start.y)>Math.min(source.getBoundingClientRect().height,target.getBoundingClientRect().height)/2?'y':'x',direction=destination[axis]>start[axis]?1:-1;
    emit('move',{...destination,[axis]:destination[axis]-direction*40},document);await pause(350);sample('overlap-keeps-order');
    const end={...destination,[axis]:destination[axis]+direction*40};emit('move',end,document);await pause(450);sample('far-edge-reorders');
    emit('up',end,document,0);await pause(500);sample('reorder-released');toolbar.style.display='flex';
}
add('Probe group or reorder',()=>probeDistinction(card('tab:2'),card('group:7')));
add('Probe next row',()=>probeDistinction(card('tab:2'),card('tab:6')));
add('Probe exit',()=>drag(document.querySelector('#group-grid > .card[data-key]'),()=>({x:8,y:180}),{dwell:120}));
add('Probe continue',()=>drag(document.querySelector('#group-grid > .card[data-key]'),()=>({x:8,y:180}),{dwell:650}));
add('Probe continue group',()=>drag(document.querySelector('#group-grid > .card[data-key]'),()=>({x:8,y:180}),{dwell:650,continueTo:()=>card('group:200')}));
add('Probe ungroup',()=>drag(document.querySelector('#group-grid > .card[data-key]'),()=>center(document.querySelector('.group-ungroup-bar')),{dwell:120}));
add('Probe ungroup reentry',()=>drag(document.querySelector('#group-grid > .card[data-key]'),()=>center(document.querySelector('.group-ungroup-bar')),{dwell:120,continueTo:()=>document.querySelector('#group-grid > .card[data-key]')}));
add('Probe swipe',()=>{const source=card('tab:5');return drag(source,()=>{const start=center(source);return {x:start.x+180,y:start.y};},{hold:20,travel:20,dwell:90});});
add('Probe short swipe',()=>{const source=card('tab:5');return drag(source,()=>{const p=center(source);return {x:p.x+50,y:p.y};},{hold:20,travel:20,dwell:90});});
document.addEventListener('beforetoggle',event=>{if(event.target.id!=='context-submenu'||event.newState!=='open')return;const frames=[];function sample(){const menu=document.querySelector('#context-menu'),s=getComputedStyle(menu);frames.push({opacity:Number(s.opacity),display:s.display,height:menu.getBoundingClientRect().height});if(frames.length<24)requestAnimationFrame(sample);else record({submenuParentFrames:frames});}requestAnimationFrame(sample);},true);
document.querySelector('#group-dialog').addEventListener('toggle',event=>{(event.newState==='open'?event.target:document.body).append(toolbar);});
add('Probe close layout',async()=>{
    const source=card('tab:2'),neighbor=card('tab:5');source.scrollIntoView({block:'center'});await pause(500);
    const frames=[];const start=performance.now();
    await new Promise(resolve=>{function frame(){const r=neighbor.querySelector('.card-surface').getBoundingClientRect(),slot=neighbor.getBoundingClientRect();frames.push({t:Math.round(performance.now()-start),x:r.x,y:r.y,sx:slot.x,sy:slot.y,scrollY,animations:neighbor.querySelector('.card-surface').getAnimations().map(a=>({time:a.currentTime,state:a.playState,frames:a.effect.getKeyframes()}))});if(performance.now()-start<1500)requestAnimationFrame(frame);else resolve();}frame();source.querySelector('.card-close').click();});
    record({closeLayoutFrames:frames});
});

async function categoryProbe(dx,{above=false,vertical=false}={}){
    const nav=document.querySelector('.sources'),r=nav.getBoundingClientRect(),target=document.querySelector('#tab-content');
    const initial=document.querySelector('[data-view][aria-current]')?.dataset.view;
    const prevented=[];
    for(let i=0;i<14;i++){
        const e=new WheelEvent('wheel',{bubbles:true,cancelable:true,clientX:100,clientY:above?r.top:Math.max(0,r.bottom)+40,deltaX:vertical?1:dx,deltaY:vertical?30:1});
        target.dispatchEvent(e);prevented.push(e.defaultPrevented);await pause(20);
    }
    record({categorySwipe:{initial,current:document.querySelector('[data-view][aria-current]')?.dataset.view,above,vertical,prevented,swipedCards:document.querySelectorAll('[data-swipe]').length}});
}
add('Probe category next',()=>categoryProbe(20));
add('Probe category previous',()=>categoryProbe(-20));
add('Probe category above',()=>categoryProbe(20,{above:true}));
add('Probe category vertical',()=>categoryProbe(20,{vertical:true}));

let heldRemoval;
add('Probe hold removal',async()=>{
    const source=document.querySelector('#group-grid > .card[data-key]');source.scrollIntoView({block:'center'});await pause(80);
    const start=center(source);emit('down',start,source.querySelector('.card-open'));await pause(300);emit('move',{x:start.x+14,y:start.y},document);await pause(80);
    heldRemoval=center(document.querySelector('.group-ungroup-bar'));emit('move',heldRemoval,document);toolbar.style.display='none';
});
add('Probe release removal',async()=>{
    if(!heldRemoval)return;emit('up',heldRemoval,document,0);document.body.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));heldRemoval=null;toolbar.style.display='flex';
});

document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&heldRemoval){emit('up',heldRemoval,document,0);document.body.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));heldRemoval=null;toolbar.style.display='flex';}
},true);

let heldOverlap;
add('Probe hold overlap',async()=>{
    const source=card('tab:2'),target=card('group:7');source.scrollIntoView({block:'center'});await pause(100);
    const start=center(source),end=center(target);end.x-=40;
    emit('down',start,source.querySelector('.card-open'));await pause(300);emit('move',{x:start.x+14,y:start.y},document);await pause(100);
    emit('move',end,document);heldOverlap=end;toolbar.style.display='none';
});
document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&heldOverlap){emit('up',heldOverlap,document,0);heldOverlap=null;toolbar.style.display='flex';}
},true);

add('Probe card edges',async()=>{
    const source=card('tab:2'),target=card('group:7');source.scrollIntoView({block:'start'});scrollBy(0,-100);toolbar.style.display='none';await pause(120);
    const s=source.getBoundingClientRect(),t=target.getBoundingClientRect(),start={x:s.left+s.width/2,y:s.top+16};
    const moves=[];const listen=e=>{if(e.dragged===source)moves.push({pointer:{x:e.originalEvent.clientX,y:e.originalEvent.clientY},related:e.related.dataset.key,source:source.getBoundingClientRect().toJSON(),target:e.related.getBoundingClientRect().toJSON()});};source.parentElement.addEventListener('move',listen);
    emit('down',start,source.querySelector('.card-info'));await pause(300);
    for(let x=start.x+8;x<=t.left+8;x+=8){emit('move',{x,y:start.y+4},document);await pause(25);}
    await pause(250);record({stage:'edge-entry',keys:[...source.parentElement.children].filter(n=>n.dataset.key).map(n=>n.dataset.key),moves,target:target.dataset.groupDrop});
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));emit('up',{x:t.left+8,y:start.y+4},document,0);await pause(300);toolbar.style.display='flex';source.parentElement?.removeEventListener('move',listen);
});
add('Probe diagonal edge',()=>drag(card('tab:2'),()=>{const r=card('group:200').getBoundingClientRect();return {x:r.left+r.width/2+4,y:r.top+1};},{dwell:350}));

add('Probe diagonal reorder',()=>probeDistinction(card('tab:2'),card('group:200')));
add('Probe diagonal group',()=>drag(card('tab:2'),()=>{const r=card('group:200').getBoundingClientRect();return {x:r.left+r.width/2+4,y:r.top+24};},{dwell:120}));
add('Probe hold diagonal',async()=>{
    const source=card('tab:2'),target=card('group:200');source.scrollIntoView({block:'start'});scrollBy(0,-100);await pause(100);
    const start=center(source),r=target.getBoundingClientRect(),end={x:r.left+r.width/2+4,y:r.top+24};
    emit('down',start,source.querySelector('.card-open'));await pause(300);emit('move',{x:start.x+14,y:start.y},document);await pause(100);
    emit('move',end,document);heldOverlap=end;toolbar.style.display='none';
});

add('Probe category motion',async()=>{
    document.querySelector('[data-view=recent]').click();
    const samples=[];
    for(let i=0;i<30;i++){await new Promise(requestAnimationFrame);const target=document.querySelector('#recent-list'),pill=document.querySelector('.liquid-tab-indicator'),selected=document.querySelector('.sources [aria-current]');samples.push({transform:getComputedStyle(target).transform,opacity:getComputedStyle(target).opacity,pill:pill?.getBoundingClientRect().width,title:selected.getBoundingClientRect().width});}
    record({categoryMotion:samples});
});
document.querySelector('#group-dialog').addEventListener('beforetoggle',event=>{
    const opening=event.newState==='open',frames=[];
    function sample(){const dialog=document.querySelector('#group-dialog'),header=dialog.querySelector('.group-header');const preview=dialog.querySelector('.group-morph-preview'),backdrop=getComputedStyle(dialog,'::backdrop');frames.push({dialog:getComputedStyle(dialog).transform,content:getComputedStyle(header).transform,opacity:getComputedStyle(header).opacity,backdrop:backdrop.backgroundColor,blur:backdrop.backdropFilter,previewBorder:preview?getComputedStyle(preview).borderWidth:null});if(frames.length<100)requestAnimationFrame(sample);else record({groupMorph:{opening,frames,remainingPreview:dialog.querySelectorAll('.group-morph-preview').length,display:getComputedStyle(dialog).display}});}
    requestAnimationFrame(sample);
});

add('Probe hold without move',async()=>{
    const source=card('tab:2');source.scrollIntoView({block:'center'});await pause(100);
    const start=center(source),frames=[];emit('down',start,source.querySelector('.card-open'));
    for(let i=0;i<36;i++){await new Promise(requestAnimationFrame);frames.push({scale:getComputedStyle(source.querySelector('.card-surface')).scale,chosen:source.classList.contains('sortable-chosen'),ghost:Boolean(document.querySelector('.sortable-fallback'))});}
    emit('up',start,document,0);await pause(350);
    record({holdWithoutMove:frames,afterRelease:getComputedStyle(source.querySelector('.card-surface')).scale,lift:source.hasAttribute('data-drag-lift')});
});
add('Probe group reversal',async()=>{card('group:7').querySelector('.card-open').click();await pause(140);document.querySelector('#group-dialog').close();});

add('Probe complete group close',async()=>{
    const dialog=document.querySelector('#group-dialog'),frames=[],start=performance.now();
    document.querySelector('#group-done').click();
    for(let i=0;i<90;i++){await new Promise(requestAnimationFrame);const r=dialog.getBoundingClientRect();frames.push({time:Math.round(performance.now()-start),open:dialog.open,modal:dialog.matches(':modal'),morph:dialog.dataset.groupMorph,transform:getComputedStyle(dialog).transform,opacity:getComputedStyle(dialog).opacity,backdrop:getComputedStyle(dialog,'::backdrop').backgroundColor,blur:getComputedStyle(dialog,'::backdrop').backdropFilter,width:r.width,height:r.height});}
    record({completeGroupClose:frames,focus:document.activeElement.getAttribute('aria-label')});
});
add('Probe cursor removal',async()=>{
    const source=document.querySelector('#group-grid > .card[data-key]');source.scrollIntoView({block:'center'});await pause(100);
    const r=source.getBoundingClientRect(),start={x:r.left+r.width/2,y:r.top+12};
    emit('down',start,source.querySelector('.card-info'));await pause(300);emit('move',{x:start.x+14,y:start.y},document);await pause(100);
    const bar=document.querySelector('.group-ungroup-bar'),b=bar.getBoundingClientRect();
    const inside={x:(b.left+b.right)/2,y:b.top-12};emit('move',inside,document);await pause(120);
    const ghost=document.querySelector('.sortable-fallback');
    record({cursorAboveBar:{armed:bar.hasAttribute('data-ready'),ghostBottom:ghost?.getBoundingClientRect().bottom,barTop:b.top,dialogExit:document.querySelector('#group-dialog').dataset.dragExit}});
    heldRemoval={x:inside.x,y:b.top+24};emit('move',heldRemoval,document);await pause(120);
    record({cursorOnBar:{armed:bar.hasAttribute('data-ready'),ghostZ:getComputedStyle(ghost).zIndex,barZ:getComputedStyle(bar).zIndex}});toolbar.style.display='none';
});

add('Probe group drag start',async()=>{
    const cards=[...document.querySelectorAll('#group-grid > .card[data-key]')],source=cards[0],neighbor=cards[1];
    source.scrollIntoView({block:'center'});await pause(150);
    const start=center(source),frames=[];emit('down',start,source.querySelector('.card-open'));await pause(300);
    emit('move',{x:start.x+12,y:start.y},document);
    for(let i=0;i<35;i++){await new Promise(requestAnimationFrame);const s=neighbor.querySelector('.card-surface'),r=s.getBoundingClientRect();frames.push({x:r.x,y:r.y,opacity:getComputedStyle(s).opacity,transform:getComputedStyle(s).transform});}
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));emit('up',start,document,0);
    record({groupDragStart:frames});
});
add('Probe animated handoff',async()=>{
    const source=document.querySelector('#group-grid > .card[data-key]'),title=source.querySelector('.card-title').textContent;
    source.scrollIntoView({block:'center'});await pause(100);const start=center(source);emit('down',start,source.querySelector('.card-open'));await pause(300);
    emit('move',{x:start.x+12,y:start.y},document);await pause(100);
    heldRemoval={x:8,y:180};emit('move',heldRemoval,document);const frames=[];
    for(let i=0;i<85;i++){await new Promise(requestAnimationFrame);const copy=document.querySelector('.group-exit-copy'),ghost=document.querySelector('.sortable-fallback');frames.push({open:document.querySelector('#group-dialog').open,copy:Boolean(copy),shade:document.querySelector('.group-exit-backdrop')?getComputedStyle(document.querySelector('.group-exit-backdrop')).backgroundColor:null,transform:copy?getComputedStyle(copy).transform:null,ghost:Boolean(ghost),previewTitles:[...document.querySelectorAll('.grid-container[data-scope="root"] .group-tile[title]')].map(n=>n.title)});}
    record({animatedHandoff:{title,frames}});toolbar.style.display='none';
});

add('Probe group morph still',async()=>{
    toolbar.style.display='none';card('group:7').querySelector('.card-open').click();await pause(75);
    const animations=document.querySelector('#group-dialog').getAnimations({subtree:true});animations.forEach(a=>a.pause());
    await pause(5000);animations.forEach(a=>a.play());toolbar.style.display='flex';
});
