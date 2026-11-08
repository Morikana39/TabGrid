import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,validatePreferences,migratePreferences,exportSettings,importSettings} from '../lib/preferences.mjs';
import {horizontalSwipe,swipeReady,swipeThreshold,mouseSwipeEnabled} from '../lib/card-swipe.mjs';
import {cardOverlap,draggedRect,overUngroupBar,groupDestination,reorderDirection} from '../lib/drag-grouping.mjs';
test('gesture defaults are conservative and explicit saved choices survive backups',()=>{
    assert.equal(DEFAULTS.swipeClose,false);assert.equal(DEFAULTS.dragGrouping,true);assert.equal(DEFAULTS.dropGroups,false);
    assert.equal(migratePreferences({dropGroups:true}).dropGroups,true);
    for(const swipeInput of ['mouse','touchpad','both']){const p=importSettings(exportSettings({...DEFAULTS,swipeClose:true,swipeInput,dragGrouping:false,dropGroups:true}));assert.equal('swipeInput' in p,false);assert.equal(p.dragGrouping,false);assert.equal(p.dropGroups,true);}
});
test('retired input choice does not disable mouse swiping',()=>{
    for(const swipeClose of [false,true])for(const swipeInput of ['mouse','touchpad','both']){const p={swipeClose,swipeInput};assert.equal(mouseSwipeEnabled(p),swipeClose);}
});
test('swipes reject small, vertical, diagonal and instantaneous gestures in both directions',()=>{
    assert.equal(swipeThreshold(100),96);assert.equal(swipeThreshold(1000),160);
    for(const sign of [-1,1]){assert.equal(swipeReady(sign*130,10,300,100),true);assert.equal(swipeReady(sign*70,0,300,100),false);assert.equal(swipeReady(sign*150,110,300,100),false);assert.equal(swipeReady(sign*150,0,300,10),false);}
    assert.equal(horizontalSwipe(2,0),false);assert.equal(horizontalSwipe(10,200),false);
});
test('grouping uses strict half-card overlap, preserves grab offsets, while removal uses the cursor within the bar',()=>{
    const a={left:0,right:200,top:0,bottom:100,width:200,height:100};
    assert.equal(cardOverlap(a,{...a,left:100,right:300}),.5);
    assert.equal(cardOverlap(a,{...a,left:99,right:299}),.505);
    assert.equal(cardOverlap(a,{left:10,right:110,top:10,bottom:60,width:100,height:50}),1);
    assert.equal(cardOverlap(a,{...a,left:250,right:450}),0);
    const moved=draggedRect(a,{x:10,y:10},{x:210,y:60});assert.equal(moved.left,200);assert.equal(moved.top,50);
    const bar={left:0,right:500,top:90,bottom:150};assert.equal(overUngroupBar({x:300,y:100},bar),true);
    assert.equal(overUngroupBar({x:300,y:80},bar),false);assert.equal(overUngroupBar({x:300,y:151},bar),false);
});
const tab=(id,groupId=-1,pinned=false)=>({key:`tab:${id}`,tab:{id,groupId,pinned,windowId:1}});
test('direct grouping rejects self, pinned and same-group drops, resolves existing and new groups',()=>{
    assert.equal(groupDestination(tab(1),tab(1)),null);assert.equal(groupDestination(tab(1,-1,true),tab(2)),null);assert.equal(groupDestination(tab(1),tab(2,-1,true)),null);assert.equal(groupDestination(tab(1,7),tab(2,7)),null);
    assert.deepEqual(groupDestination(tab(1),tab(2)),{destination:'new',targetId:2,windowId:1});assert.deepEqual(groupDestination(tab(1),{key:'group:7',group:{id:7,windowId:2}}),{destination:7,targetId:null,windowId:2});
});

import {createDragGrouping,GROUP_EXIT_MS} from '../lib/drag-grouping.mjs';
function groupingFixture(){
    const bounds={left:0,right:200,top:100,bottom:200,width:200,height:100};
    const source={itemModel:tab(1,7),getBoundingClientRect:()=>bounds};
    const target={itemModel:tab(2),dataset:{},classList:{contains:()=>false},closest:()=>null,getBoundingClientRect:()=>({...bounds,left:200,right:400})};
    let hit=true,enabled=true,reorder=true,handoffs=0;const listeners=new Map(),nodes=[];
    const doc={createElement:()=>{const n={hidden:true,dataset:{},setAttribute(){},getBoundingClientRect:()=>({left:24,right:976,top:586,bottom:650})};nodes.push(n);return n;},body:{append(){}},addEventListener:(type,fn)=>listeners.set(type,fn),elementFromPoint:()=>({closest:()=>null}),querySelectorAll:()=>hit?[target]:[]};
    const dialog={open:false,dataset:{},append(){},getBoundingClientRect:()=>({left:24,right:976,top:50,bottom:650})};
    const controller=createDragGrouping({enabled:()=>enabled,canReorder:()=>reorder,dialog,feedback:{direct(){}},handoff:()=>{handoffs++;dialog.open=false;},doc,win:{innerWidth:1000,innerHeight:700,addEventListener(){}}});
    return {controller,source,target,dialog,bar:nodes[0],listeners,handoffs:()=>handoffs,noHit:()=>{hit=false;},disable:()=>{enabled=false;},disableReorder:()=>{reorder=false;}};
}
test('overlap immediately selects a merge target, leaving clears it, and disabling cancels',()=>{
    const f=groupingFixture();f.controller.start(f.source,'root',null);
    assert.equal(f.controller.move({clientX:200,clientY:150}),false); // exactly 50%
    assert.equal(f.controller.move({clientX:201,clientY:150}),true);
    assert.equal(f.target.dataset.groupDrop,'ready');assert.equal(f.controller.finish().target.targetId,2);
    f.controller.start(f.source,'root',null);f.controller.move({clientX:300,clientY:150});f.controller.move({clientX:100,clientY:150});assert.equal(f.target.dataset.groupDrop,undefined);assert.equal(f.controller.finish().target,null);
    f.controller.start(f.source,'root',null);f.controller.move({clientX:300,clientY:150});f.disable();assert.equal(f.controller.finish().cancelled,true);
});
test('off-center grabs use card overlap rather than pointer position',()=>{
    const f=groupingFixture();f.listeners.get('mousedown')({target:{closest:()=>f.source},clientX:10,clientY:150});f.controller.start(f.source,'root',null);
    assert.equal(f.controller.move({clientX:120,clientY:150}),true); // pointer is outside target
    assert.equal(f.controller.finish().target.targetId,2);
});
test('group removal requires the bottom area, leaving sides cancels instead of ungrouping or handing off',()=>{
    const f=groupingFixture();f.dialog.open=true;f.controller.start(f.source,'group',7);assert.equal(f.bar.hidden,false);
    f.controller.move({clientX:8,clientY:150});const outside=f.controller.finish();assert.equal(outside.ungroup,false);assert.equal(outside.cancelled,true);assert.equal(f.dialog.open,true);
    f.controller.start(f.source,'group',7);assert.equal(f.controller.move({clientX:400,clientY:600}),true);assert.equal(f.bar.dataset.ready,'');assert.equal(f.controller.finish().ungroup,true);assert.equal(f.bar.hidden,true);
    f.controller.start(f.source,'group',7);f.controller.move({clientX:400,clientY:600});assert.equal(f.controller.move({clientX:400,clientY:500}),false);assert.equal(f.bar.dataset.ready,undefined);assert.equal(f.controller.finish().ungroup,false);
});
test('Escape cancels an armed removal and releasing elsewhere rechecks the target',()=>{
    const f=groupingFixture();f.dialog.open=true;f.controller.start(f.source,'group',7);f.controller.move({clientX:400,clientY:600});
    f.listeners.get('keydown')({key:'Escape',preventDefault(){},stopPropagation(){}});assert.equal(f.controller.finish().cancelled,true);assert.equal(f.bar.hidden,true);
    f.controller.start(f.source,'group',7);f.controller.move({clientX:400,clientY:600});assert.equal(f.controller.finish({clientX:400,clientY:300}).ungroup,false);
});

test('holding outside continues on the main grid; re-entry and release cancel the timer',t=>{
    t.mock.timers.enable({apis:['setTimeout']});const f=groupingFixture();f.dialog.open=true;
    f.controller.start(f.source,'group',7);f.controller.move({clientX:8,clientY:150});t.mock.timers.tick(GROUP_EXIT_MS-1);assert.equal(f.handoffs(),0);
    f.controller.move({clientX:400,clientY:300});t.mock.timers.tick(GROUP_EXIT_MS);assert.equal(f.handoffs(),0);
    f.controller.move({clientX:8,clientY:150});f.controller.finish();t.mock.timers.tick(GROUP_EXIT_MS);assert.equal(f.handoffs(),0);
    f.controller.start(f.source,'group',7);f.controller.move({clientX:8,clientY:150});t.mock.timers.tick(GROUP_EXIT_MS);assert.equal(f.handoffs(),1);assert.equal(f.dialog.open,false);assert.equal(f.controller.handedOff(),true);
    f.controller.move({clientX:300,clientY:150});const result=f.controller.finish();assert.equal(result.target.targetId,2);assert.equal(result.groupId,7);assert.equal(result.handedOff,true);
});
test('continued drag can release on empty space to ungroup or cancel with Escape',t=>{
    t.mock.timers.enable({apis:['setTimeout']});const f=groupingFixture();f.dialog.open=true;
    f.controller.start(f.source,'group',7);f.controller.move({clientX:8,clientY:150});t.mock.timers.tick(GROUP_EXIT_MS);f.noHit();f.controller.move({clientX:500,clientY:400});const result=f.controller.finish();assert.equal(result.ungroup,true);assert.equal(result.cancelled,false);assert.equal(result.target,null);
    f.dialog.open=true;f.controller.start(f.source,'group',7);f.controller.move({clientX:8,clientY:150});t.mock.timers.tick(GROUP_EXIT_MS);f.listeners.get('keydown')({key:'Escape',preventDefault(){},stopPropagation(){}});assert.equal(f.controller.finish().cancelled,true);
});

test('reordering crosses the far edge in each direction, not the overlap threshold',()=>{
    const source={left:200,right:400,top:200,bottom:300,width:200,height:100};
    const shift=(x,y)=>draggedRect(source,{x:0,y:0},{x,y});
    for(const [x,y,expected] of [[220,0,1],[-220,0,-1],[0,120,1],[0,-120,-1]]){
        const target=shift(x,y);
        assert.equal(reorderDirection(source,target,shift(x*.8,y*.8)),0);
        assert.equal(reorderDirection(source,target,target),0);
        assert.equal(reorderDirection(source,target,shift(x+2*Math.sign(x),y+2*Math.sign(y))),expected);
    }
    // Off-axis motion alone cannot reorder a neighbor in the same row.
    assert.equal(reorderDirection(source,shift(220,0),shift(100,150)),0);
});
test('Sortable insertion waits through approach and grouping; passing the edge permits reorder',()=>{
    const f=groupingFixture();f.controller.start(f.source,'root',null);
    const move=x=>f.controller.sortMove({to:{dataset:{scope:'root'}},related:f.target,originalEvent:{clientX:x,clientY:150}});
    assert.equal(move(180),false);assert.equal(f.target.dataset.groupDrop,undefined);
    assert.equal(move(250),false);assert.equal(f.target.dataset.groupDrop,'ready');
    assert.equal(move(300),false);assert.equal(f.target.dataset.groupDrop,'ready');
    assert.equal(move(302),1);assert.equal(f.target.dataset.groupDrop,undefined);
    assert.equal(f.controller.finish().target,null);
});
test('reorder clears merge feedback, then live slots permit reversal without a stale target',()=>{
    const f=groupingFixture();f.controller.start(f.source,'root',null);
    f.controller.move({clientX:250,clientY:150});assert.equal(f.target.dataset.groupDrop,'ready');
    f.controller.reordered();assert.equal(f.target.dataset.groupDrop,undefined);
    // Simulate Sortable swapping the stable slots, without touching surfaces.
    f.source.getBoundingClientRect=()=>({left:200,right:400,top:100,bottom:200,width:200,height:100});
    f.target.getBoundingClientRect=()=>({left:0,right:200,top:100,bottom:200,width:200,height:100});
    const move=x=>f.controller.sortMove({to:{dataset:{scope:'root'}},related:f.target,originalEvent:{clientX:x,clientY:150}});
    assert.equal(move(301),false);assert.equal(f.controller.finish({clientX:301,clientY:150}).target,null);
    f.controller.start(f.source,'root',null);
    assert.equal(move(150),false);assert.equal(f.target.dataset.groupDrop,'ready');
    assert.equal(move(98),-1);assert.equal(f.controller.finish().target,null);
});
test('grouping disabled and group-panel reorders retain Sortable defaults',()=>{
    const f=groupingFixture();f.disable();f.controller.start(f.source,'root',null);
    assert.equal(f.controller.sortMove({to:{dataset:{scope:'root'}},related:f.target,originalEvent:{clientX:180,clientY:150}}),undefined);
    const g=groupingFixture();g.dialog.open=true;g.controller.start(g.source,'group',7);
    assert.equal(g.controller.sortMove({to:{dataset:{scope:'group'}},related:g.target,originalEvent:{clientX:180,clientY:150}}),undefined);
});
test('search and sorted views retain grouping where manual reorder is unavailable',()=>{
    const f=groupingFixture();f.disableReorder();f.controller.start(f.source,'root',null);
    assert.equal(f.controller.sortMove({to:{dataset:{scope:'root'}},related:f.target,originalEvent:{clientX:340,clientY:150}}),false);
    assert.equal(f.target.dataset.groupDrop,'ready');assert.equal(f.controller.finish().target.targetId,2);
});

test('diagonal entry cannot reorder a different row through its side edge',()=>{
    const source={left:0,right:200,top:0,bottom:100,width:200,height:100};
    const target={left:220,right:420,top:120,bottom:220,width:200,height:100};
    const entry={...source,left:224,right:424,top:71,bottom:171};
    assert.equal(reorderDirection(source,target,entry),0);
    assert.equal(reorderDirection(source,target,{...entry,top:123,bottom:223}),1);
    assert.equal(reorderDirection(target,source,{...source,left:-4,right:196,top:49,bottom:149}),0);
    assert.equal(reorderDirection(target,source,{...source,left:-4,right:196,top:-3,bottom:97}),-1);
});
test('same-row height differences and fractional edge crossings cannot trigger early reorder',()=>{
    const source={left:0,right:200,top:0,bottom:100,width:200,height:100};
    const target={left:220,right:420,top:0,bottom:110,width:200,height:110};
    assert.equal(reorderDirection(source,target,{...source,left:130,right:330,top:15,bottom:115}),0);
    assert.equal(reorderDirection(source,target,{...source,left:220.02,right:420.02}),0);
    assert.equal(reorderDirection(source,target,{...source,left:222,right:422}),1);
});
test('Sortable blocks next-row entry until the vertical far edge, even beyond the side edge',()=>{
    const f=groupingFixture();f.target.getBoundingClientRect=()=>({left:220,right:420,top:220,bottom:320,width:200,height:100});f.controller.start(f.source,'root',null);
    const move=y=>f.controller.sortMove({to:{dataset:{scope:'root'}},related:f.target,originalEvent:{clientX:324,clientY:y}});
    assert.equal(move(221),false); // At the top edge, not enough overlap yet.
    assert.equal(move(225),false);assert.equal(f.target.dataset.groupDrop,'ready');
    assert.equal(move(270),false);assert.equal(f.target.dataset.groupDrop,'ready');
    assert.equal(move(272),1);assert.equal(f.target.dataset.groupDrop,undefined);
    assert.equal(f.controller.finish().target,null);
});

test('card overhang never arms removal or outside continuation while the cursor remains inside',t=>{
    t.mock.timers.enable({apis:['setTimeout']});const f=groupingFixture();f.dialog.open=true;
    // Grab near the top-left: the card midpoint reaches the bar before the cursor.
    f.listeners.get('mousedown')({target:{closest:()=>f.source},clientX:10,clientY:105});
    f.controller.start(f.source,'group',7);f.controller.move({clientX:400,clientY:560});
    assert.equal(f.bar.dataset.ready,undefined);assert.equal(f.controller.finish().ungroup,false);
    f.controller.start(f.source,'group',7);f.controller.move({clientX:960,clientY:300});
    t.mock.timers.tick(GROUP_EXIT_MS);assert.equal(f.handoffs(),0);assert.equal(f.controller.finish().cancelled,false);
    // Grab at the bottom: entering with the cursor arms removal even if the
    // card midpoint is still above the bar. Passing below it clears removal.
    f.listeners.get('mousedown')({target:{closest:()=>f.source},clientX:100,clientY:195});
    f.controller.start(f.source,'group',7);f.controller.move({clientX:400,clientY:590});
    assert.equal(f.bar.dataset.ready,'');f.controller.move({clientX:400,clientY:655});
    const released=f.controller.finish();assert.equal(released.ungroup,false);assert.equal(released.cancelled,true);
});

test('split cards continue from a group on cursor dwell and retain cancellation',t=>{
    t.mock.timers.enable({apis:['setTimeout']});const f=groupingFixture();
    f.source.itemModel.splitViewId=0;f.source.itemModel.members=[f.source.itemModel.tab,{id:4,windowId:1,groupId:7}];
    f.dialog.open=true;f.controller.start(f.source,'group',7);
    f.controller.move({clientX:8,clientY:150});t.mock.timers.tick(GROUP_EXIT_MS);
    assert.equal(f.handoffs(),1);assert.equal(f.controller.handedOff(),true);
    f.noHit();f.controller.move({clientX:500,clientY:400});
    const result=f.controller.finish();assert.equal(result.ungroup,true);assert.equal(result.cancelled,false);
    f.dialog.open=true;f.controller.start(f.source,'group',7);f.controller.move({clientX:8,clientY:150});
    f.listeners.get('keydown')({key:'Escape',preventDefault(){},stopPropagation(){}});t.mock.timers.tick(GROUP_EXIT_MS);
    assert.equal(f.handoffs(),1);assert.equal(f.controller.finish().cancelled,true);
});
