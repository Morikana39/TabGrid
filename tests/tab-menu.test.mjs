import test from 'node:test';
import assert from 'node:assert/strict';
import { windowLabel, relativeTabIds, siteOrigins, anchoredMenuLayout, bindSubmenuHover } from '../lib/tab-menu.mjs';
import { fixture } from './chrome-mock.mjs';

test('window labels use the first native tab and the remaining count', () => {
    assert.equal(windowLabel([{index:1,title:'Second'}, {index:0,title:'Heading'}, {index:2,title:'Third'}]), 'Heading and 2 Other Tabs');
    assert.equal(windowLabel([{index:0,title:'Only'}]), 'Only');
    assert.equal(windowLabel([]), 'Empty Window');
});
test('relative closes preserve selections, pins, and unrelated windows', () => {
    const tabs = [
        {id:1,index:0,windowId:1}, {id:2,index:1,windowId:1}, {id:3,index:2,windowId:1},
        {id:4,index:3,windowId:1,pinned:true}, {id:5,index:4,windowId:1},
        {id:6,index:0,windowId:2}, {id:7,index:1,windowId:2}, {id:8,index:0,windowId:3}
    ];
    assert.deepEqual(relativeTabIds(tabs,[2,3,6],'after'),[5,7]);
    assert.deepEqual(relativeTabIds(tabs,[2,3,6],'others'),[1,5,7]);
    assert.deepEqual(relativeTabIds(tabs,[],'after'),[]);
});
test('site sound deduplicates web origins and excludes privileged pages', () => {
    assert.deepEqual(siteOrigins([{url:'https://example.com/a'},{url:'https://example.com/b'},{url:'chrome://settings'},{url:'file:///tmp/a'},{pendingUrl:'http://localhost:4173/a'},{url:'bad'}]),['https://example.com','http://localhost:4173']);
});
test('new tab follows the last selected member and joins its group', async () => {
    const f=fixture([{id:1,index:0,windowId:1},{id:2,index:1,windowId:1,groupId:7},{id:3,index:2,windowId:1,groupId:7},{id:4,index:3,windowId:1}], [{id:7,windowId:1}]);
    const added=await f.actions.newAfter([3,1,2]);
    assert.equal(added.index,3);
    assert.equal(f.tabs().find(t=>t.id===added.id).groupId,7);
    assert.equal(f.tabs().find(t=>t.id===4).index,4);
});
test('new-after and duplicate reject or ignore unrelated/private/grid targets', async () => {
    const f=fixture([{id:1,index:0,windowId:1},{id:2,index:0,windowId:2},{id:3,index:1,windowId:1,incognito:true},{id:4,index:2,windowId:1,url:'chrome-extension://test/grid.html'}]);
    await assert.rejects(f.actions.newAfter([1,2]), /one window/);
    await assert.rejects(f.actions.newAfter([3,4]), /one window/);
    const duplicated=[];f.api.tabs.duplicate=async id=>duplicated.push(id);
    await f.actions.duplicate([1,3,4]); assert.deepEqual(duplicated,[1]);
});
test('tall menus scroll without overlapping their opener, including near viewport edges', () => {
    for (const rect of [
        {left:370,right:420,top:402,bottom:438},
        {left:1100,right:1140,top:10,bottom:46},
        {left:25,right:60,top:740,bottom:776}
    ]) {
        const m=anchoredMenuLayout(rect,320,600,1200,800);
        assert.ok(m.top>=8 && m.top+m.height<=792);
        assert.ok(m.top>=rect.bottom+4 || m.top+m.height<=rect.top-4);
        assert.ok(m.left>=8 && m.left+320<=1192);
    }
});

function hoverFixture(options={}) {
    const events={},child={},popup={},jobs=new Map();let next=0,opened=0,closed=0,active=true;
    const trigger={disabled:false,contains:value=>value===child,addEventListener:(type,fn)=>events[type]=fn};
    const hover=bindSubmenuHover(trigger,{
        active:()=>active,open:()=>opened++,close:()=>closed++,contains:node=>node===child||node===popup,
        schedule:(fn,ms)=>{const id=++next;jobs.set(id,{fn,ms});return id;},cancel:id=>jobs.delete(id),...options
    });
    return {events,child,popup,trigger,hover,jobs,opened:()=>opened,closed:()=>closed,deactivate:()=>active=false,
        flush:()=>{const pending=[...jobs.values()];jobs.clear();for(const job of pending)job.fn();}};
}

test('every submenu entry waits 150ms, including reentry, without duplicate compatibility timers',()=>{
    const f=hoverFixture();
    f.events.pointerover({relatedTarget:null});f.events.mouseover({relatedTarget:null});
    assert.equal(f.opened(),0);assert.equal(f.jobs.size,1);assert.equal([...f.jobs.values()][0].ms,150);
    f.flush();assert.equal(f.opened(),1);
    f.events.pointerout({relatedTarget:null});assert.equal(f.closed(),1);assert.equal(f.jobs.size,0);
    f.events.mouseout({relatedTarget:null});assert.equal(f.closed(),1);
    f.events.mouseover({relatedTarget:null});assert.equal(f.opened(),1);f.flush();assert.equal(f.opened(),2);
    assert.equal(f.events.click,undefined);
});

test('submenu stays open over parent or popup and closes synchronously when leaving both',()=>{
    const f=hoverFixture();f.events.mouseover({relatedTarget:null});f.flush();
    f.events.mouseout({relatedTarget:f.popup});f.hover.leave({relatedTarget:f.child});
    assert.equal(f.closed(),0);assert.equal(f.jobs.size,0);
    f.events.mouseover({relatedTarget:f.popup});assert.equal(f.opened(),1);
    f.hover.leave({relatedTarget:null});assert.equal(f.closed(),1);assert.equal(f.jobs.size,0);
});

test('quick pointer passes and menu closure cancel pending openings',()=>{
    for(const stop of [f=>f.events.mouseout({relatedTarget:null}),f=>f.hover.reset(),f=>f.deactivate()]){
        const f=hoverFixture();f.events.mouseover({relatedTarget:null});stop(f);f.flush();assert.equal(f.opened(),0);
    }
    const f=hoverFixture();f.trigger.disabled=true;f.events.mouseover({relatedTarget:null});assert.equal(f.jobs.size,0);
});

test('switching to another submenu still waits for its full hover delay',()=>{
    const first=hoverFixture(),second=hoverFixture();
    first.events.mouseover({relatedTarget:null});first.flush();assert.equal(first.opened(),1);
    first.events.mouseout({relatedTarget:second.trigger});second.events.mouseover({relatedTarget:first.trigger});
    assert.equal(first.closed(),1);assert.equal(second.opened(),0);assert.equal(second.jobs.size,1);
    second.flush();assert.equal(second.opened(),1);
});
