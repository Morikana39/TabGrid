import test from 'node:test';
import assert from 'node:assert/strict';
import {mountFilterPicker} from '../lib/filter-picker.mjs';

class Element extends EventTarget {
    children=[];attrs={};style={};value='';opened=false;
    append(...children){this.children.push(...children);}
    replaceChildren(...children){this.children=children;}
    setAttribute(k,v){this.attrs[k]=v;}
    removeAttribute(k){delete this.attrs[k];}
    matches(){return this.opened;}
    showPopover(){this.opened=true;}
    hidePopover(){this.opened=false;}
    focus(){this.onfocus?.();}
    scrollIntoView(){}
    getBoundingClientRect(){return {width:180,left:20,top:100,bottom:140};}
    querySelectorAll(){return this.children.flatMap(c=>c.attrs.role==='option'?[c]:c.querySelectorAll());}
    contains(node){return node===this||this.children.some(c=>c.contains(node));}
}
function fixture(t){
    for(const [name,value] of Object.entries({document:{createElement:()=>new Element(),addEventListener(){}},window:{addEventListener(){}},innerWidth:1000,innerHeight:800})){
        const old=Object.getOwnPropertyDescriptor(globalThis,name);
        Object.defineProperty(globalThis,name,{configurable:true,value});
        t.after(()=>old?Object.defineProperty(globalThis,name,old):delete globalThis[name]);
    }
    const select=new Element();select.multiple=false;
    select.options=[['any','Any'],['yes','Yes'],['no','No']].map(([value,textContent])=>({value,textContent,selected:value==='any'}));
    Object.defineProperty(select,'selectedOptions',{get:()=>select.options.filter(o=>o.selected)});
    select.closest=()=>({hidden:false});select.after=wrap=>{select.wrap=wrap;};
    const picker=mountFilterPicker(select,{id:'audio',label:'Playing audio filter',kind:'audible'});picker.sync();
    const [input,toggle,list]=select.wrap.children;
    const click=el=>{el.dispatchEvent(Object.assign(new Event('pointerdown',{cancelable:true}),{button:0}));el.dispatchEvent(Object.assign(new Event('click'),{detail:1}));};
    const key=key=>input.onkeydown({key,preventDefault(){},stopPropagation(){}});
    return {select,picker,input,toggle,list,click,key};
}
test('single-value filter uses themed choices, updates selection, and toggles closed',t=>{
    const f=fixture(t);let changes=0;f.select.addEventListener('change',()=>changes++);
    assert.equal(f.select.hidden,true);assert.equal(f.input.readOnly,true);
    f.click(f.input);assert.equal(f.list.opened,true);
    const rows=f.list.querySelectorAll();
    assert.deepEqual(rows.map(r=>r.children[0].textContent),['Any','Yes','No']);
    rows[1].onclick();assert.equal(f.select.selectedOptions[0].value,'yes');assert.equal(f.input.value,'Yes');assert.equal(changes,1);assert.equal(f.list.opened,false);
    f.click(f.toggle);f.click(f.toggle);assert.equal(f.list.opened,false);
});
test('keyboard starts from current selection and supports Escape and Tab',t=>{
    const f=fixture(t);f.select.options.forEach(o=>o.selected=o.value==='yes');f.picker.sync();
    f.key('Enter');assert.equal(f.input.attrs['aria-activedescendant'],'audio-option-1');
    f.key('ArrowDown');f.key('Enter');assert.equal(f.select.selectedOptions[0].value,'no');
    f.key(' ');f.key('Home');f.key('Enter');assert.equal(f.select.selectedOptions[0].value,'any');
    f.key('Enter');f.key('Escape');assert.equal(f.list.opened,false);
    f.key('Enter');f.key('Tab');assert.equal(f.list.opened,false);
});
test('filter reset syncs the visible label and selected option',t=>{
    const f=fixture(t);f.click(f.input);f.list.querySelectorAll()[2].onclick();
    f.select.options.forEach(o=>o.selected=o.value==='any');f.picker.sync();
    assert.equal(f.input.value,'Any');f.click(f.input);
    assert.equal(f.list.querySelectorAll()[0].attrs['aria-selected'],'true');
});
