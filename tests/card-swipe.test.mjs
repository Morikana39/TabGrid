import test from 'node:test';
import assert from 'node:assert/strict';
import {mountCardSwipe} from '../lib/card-swipe.mjs';
function fixture(closeWork,preferences={}){
    let time=0,enabled=true;const handlers={},classes=new Set(),animations=[],closes=[];
    const style={removeProperty(key){delete this[key];}};
    const card={dataset:{key:'tab:1'},itemModel:{tab:{id:1}},offsetWidth:300,isConnected:true,classList:{contains:()=>false},querySelector:()=>({style}),closest(selector){return selector==='.card[data-key]'?this:null;}};
    const doc={createElement:()=>({}),body:{append(){}},documentElement:{classList:{toggle:(key,on)=>on?classes.add(key):classes.delete(key)}},addEventListener:(name,fn)=>{handlers[name]=fn;}};
    const controller=mountCardSwipe({getPrefs:()=>({swipeClose:enabled,...preferences}),available:()=>true,close:async item=>{closes.push(item);if(closeWork)return closeWork(card);card.isConnected=false;},motion:{cancel(){},play(...args){animations.push(args);}},doc,win:{innerWidth:1000,addEventListener(){}},now:()=>time});
    function pointer(type,x,y=0,advance=25){time+=advance;handlers[type]({target:card,pointerId:1,pointerType:'mouse',button:0,clientX:x,clientY:y,preventDefault(){}});}
    return {card,style,classes,animations,closes,handlers,controller,pointer,settle:()=>animations.at(-1)?.[3].onFinish?.(),disable:()=>enabled=false};
}
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
test('mouse retains pointer direction, rejects short swipe, and holds for reorder',async()=>{
    const f=fixture();f.pointer('pointerdown',0);f.pointer('pointermove',40);assert.equal(f.style.translate,'40px 0');f.pointer('pointerup',40);assert.equal(f.closes.length,0);
    f.settle();
    f.pointer('pointerdown',0);f.pointer('pointermove',130,0,300);assert.equal(f.card.dataset.swipe,undefined);
    f.pointer('pointerdown',0);f.pointer('pointermove',130);f.pointer('pointerup',130,0,60);await flush();assert.equal(f.closes.length,1);
});

test('card closing does not register a wheel listener',()=>{
    const f=fixture();assert.equal(f.handlers.wheel,undefined);
});
test('failed mouse close restores the card and can be retried',async()=>{
    const f=fixture(()=>Promise.reject(new Error('unavailable')));
    for(let i=0;i<2;i++){
        f.pointer('pointerdown',0);f.pointer('pointermove',130);f.pointer('pointerup',130,0,60);await flush();
        assert.equal(f.style.opacity,undefined);assert.equal(f.card.dataset.swipe,undefined);
        f.settle();
    }
    assert.equal(f.closes.length,2);assert.equal(f.animations.length,2);
});
test('new swipes cannot interrupt either a drag return or a swipe return',()=>{
    const f=fixture();
    f.card.dataset.cardReturn='';
    f.pointer('pointerdown',0);f.pointer('pointermove',40);f.pointer('pointerup',40);
    assert.equal(f.style.translate,undefined);assert.equal(f.animations.length,0);
    delete f.card.dataset.cardReturn;
    f.pointer('pointerdown',0);f.pointer('pointermove',40);f.pointer('pointerup',40);
    assert.equal(f.card.dataset.cardReturn,'');assert.equal(f.animations.length,1);
    f.pointer('pointerdown',0);f.pointer('pointermove',80);f.pointer('pointerup',80);
    assert.equal(f.style.translate,undefined);assert.equal(f.animations.length,1);
    f.settle();assert.equal(f.card.dataset.cardReturn,undefined);
    f.pointer('pointerdown',0);f.pointer('pointermove',40);
    assert.equal(f.style.translate,'40px 0');f.pointer('pointerup',40);f.settle();
});
test('swipe return unlocks if its animation never finishes, and motion-off returns immediately',t=>{
    t.mock.timers.enable({apis:['setTimeout']});
    const f=fixture();f.pointer('pointerdown',0);f.pointer('pointermove',40);f.pointer('pointerup',40);
    assert.equal(f.card.dataset.cardReturn,'');t.mock.timers.tick(380);assert.equal(f.card.dataset.cardReturn,undefined);
    const quiet=fixture(null,{motion:'off'});quiet.pointer('pointerdown',0);quiet.pointer('pointermove',40);quiet.pointer('pointerup',40);
    assert.equal(quiet.card.dataset.cardReturn,undefined);assert.equal(quiet.animations.length,0);
});
test('pending mouse close remains transparent and cannot close twice',async()=>{
    let resolve;const f=fixture(()=>new Promise(r=>resolve=r));
    f.pointer('pointerdown',0);f.pointer('pointermove',130);f.pointer('pointerup',130,0,60);await flush();
    assert.equal(f.style.opacity,'0');
    f.pointer('pointerdown',0);f.pointer('pointermove',130);f.pointer('pointerup',130,0,60);await flush();
    assert.equal(f.closes.length,1);resolve();await flush();assert.equal(f.classes.size,0);
});
