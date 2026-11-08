import test from 'node:test';
import assert from 'node:assert/strict';
import {bindPopoverToggle} from '../lib/popover-toggle.mjs';

function fixture(initial=false){
    const trigger=new EventTarget();let opened=initial,opens=0,closes=0;
    bindPopoverToggle(trigger,{isOpen:()=>opened,open:()=>{opened=true;opens++;},close:()=>{opened=false;closes++;}});
    const fire=(type,props={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,props);trigger.dispatchEvent(e);};
    return {fire,dismiss:()=>{opened=false;},state:()=>({opened,opens,closes})};
}
test('second pointer click closes even after native light dismissal',()=>{
    const f=fixture(true);f.fire('pointerdown',{button:0});f.dismiss();f.fire('click',{detail:1});
    assert.deepEqual(f.state(),{opened:false,opens:0,closes:1});
});
test('closed popup opens on pointer click and closes on the next click',()=>{
    const f=fixture();f.fire('pointerdown',{button:0});f.fire('click',{detail:1});
    assert.equal(f.state().opened,true);
    f.fire('pointerdown',{button:0});f.fire('click',{detail:1});
    assert.deepEqual(f.state(),{opened:false,opens:1,closes:1});
});
test('keyboard and programmatic clicks toggle from current state',()=>{
    const f=fixture();f.fire('click',{detail:0});f.fire('click',{detail:0});
    assert.deepEqual(f.state(),{opened:false,opens:1,closes:1});
});
test('cancelled pointer gesture cannot retain an old open state',()=>{
    const f=fixture(true);f.fire('pointerdown',{button:0});f.fire('pointercancel');f.dismiss();f.fire('click',{detail:1});
    assert.deepEqual(f.state(),{opened:true,opens:1,closes:0});
});
