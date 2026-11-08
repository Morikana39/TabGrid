import {bindPopoverToggle} from './popover-toggle.mjs';
import { tr } from './i18n.mjs';
import { groupLabel } from './group-presentation.mjs';
export { groupColors } from './group-presentation.mjs';
export function matchingFilterOptions(entries,query){const q=query.trim().toLocaleLowerCase();return q?entries.filter(e=>e.label.toLocaleLowerCase().includes(q)):entries;}
export function mountFilterPicker(select,{id,label,kind,api,getGroups,motion}){
    const searchable=select.multiple;
    const wrap=document.createElement('div');wrap.className='filter-picker';
    const input=document.createElement('input');input.type='text';input.id=id;input.placeholder=tr("Any");input.setAttribute('role','combobox');input.setAttribute('aria-label',label);input.setAttribute('aria-autocomplete',searchable?'list':'none');input.setAttribute('aria-haspopup','listbox');input.readOnly=!searchable;input.setAttribute('aria-expanded','false');input.autocomplete='off';
    const toggle=document.createElement('button');toggle.type='button';toggle.className='filter-expand';toggle.setAttribute('aria-hidden','false');toggle.setAttribute('aria-label',searchable?tr("Show all {0}", [kind==='groups'?tr('groups'):tr('websites')]):label);toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-haspopup','listbox');
    const list=document.createElement('div');list.className='filter-picker-list';list.id=`${id}-list`;list.popover='auto';list.setAttribute('role','listbox');list.setAttribute('aria-label',label+' '+tr('choices'));input.setAttribute('aria-controls',list.id);toggle.setAttribute('aria-controls',list.id);
    const scroll=document.createElement('div');scroll.className='filter-picker-scroll';scroll.setAttribute('role','presentation');list.append(scroll);
    select.hidden=true;select.removeAttribute('aria-label');wrap.append(input,toggle,list);select.after(wrap);
    motion?.native(list);
    let entries=[],matches=[],index=-1,lastValue='',selectedValue='',editing=false,suppressFocusOpen=false;
    const isOpen=()=>list.matches(':popover-open');
    function close(){if(isOpen())list.hidePopover();input.setAttribute('aria-expanded','false');toggle.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');editing=false;input.value=lastValue;}
    list.addEventListener('toggle',()=>{const open=isOpen();input.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-expanded',String(open));if(!open){editing=false;input.value=lastValue;input.removeAttribute('aria-activedescendant');}});
    function choose(value){for(const o of select.options)o.selected=String(o.value)===String(value);selectedValue=String(value);lastValue=select.selectedOptions[0]?.textContent||'';close();select.dispatchEvent(new Event('change',{bubbles:true}));suppressFocusOpen=true;input.focus({preventScroll:true});suppressFocusOpen=false;}
    function draw(){
        matches=searchable?matchingFilterOptions(entries,input.value):entries;index=-1;input.removeAttribute('aria-activedescendant');scroll.replaceChildren();scroll.scrollTop=0;
        const choices=!searchable||input.value.trim()?matches:[{value:'',label:tr("Any")},...matches];matches=choices;
        if(!searchable)index=choices.findIndex(entry=>String(entry.value)===selectedValue);
        for(const [i,entry]of choices.entries()){
            const row=document.createElement('div');row.id=`${id}-option-${i}`;row.setAttribute('role','option');row.setAttribute('aria-selected',String(String(entry.value)===selectedValue));row.className='filter-picker-option';
            if(searchable&&entry.value!==''){
                if(kind==='groups'){row.append(groupLabel(getGroups().find(g=>String(g.id)===String(entry.value))||{title:entry.label}));}
                else{const icon=document.createElement('img');icon.alt='';icon.width=16;icon.height=16;const url=new URL(api.runtime.getURL('/_favicon/'));url.searchParams.set('pageUrl',`https://${entry.value}`);url.searchParams.set('size','16');icon.src=url.href;icon.onerror=()=>{icon.onerror=null;icon.src=api.runtime.getURL('tileIcon.png');};row.append(icon);}
            }
            if(kind!=='groups'||entry.value===''){const text=document.createElement('span');text.textContent=entry.label;row.append(text);}row.onpointerdown=e=>e.preventDefault();row.onclick=()=>choose(entry.value);scroll.append(row);
        }
        if(index>=0)input.setAttribute('aria-activedescendant',`${id}-option-${index}`);
        if(!choices.length){const empty=document.createElement('p');empty.textContent=tr("No matching websites or groups");empty.setAttribute('role','status');scroll.append(empty);}
    }
    function open(all=false){editing=true;if(all&&searchable)input.value='';draw();if(!isOpen())list.showPopover();const r=wrap.getBoundingClientRect();list.style.width=`${r.width}px`;list.style.left=`${Math.max(8,Math.min(r.left,innerWidth-r.width-8))}px`;const below=innerHeight-r.bottom-12,above=r.top-12,up=below<160&&above>below;list.style.maxHeight=`${Math.max(40,Math.min(220,up?above:below))}px`;list.style.top=up?'auto':`${r.bottom+4}px`;list.style.bottom=up?`${innerHeight-r.top+4}px`:'auto';input.setAttribute('aria-expanded','true');toggle.setAttribute('aria-expanded','true');}
    input.onfocus=()=>{if(searchable&&!suppressFocusOpen)open(true);};
    if(searchable)input.onclick=()=>{if(!isOpen())open(true);};
    else bindPopoverToggle(input,{isOpen,open:()=>open(true),close,beforeToggle:()=>input.focus({preventScroll:true})});
    input.oninput=()=>{open();};
    const keydown=e=>{
        if(e.key==='Tab'){close();return;}
        const keys=['ArrowDown','ArrowUp','Enter','Escape','Home','End',...(!searchable?[' ']:[])];
        if(!keys.includes(e.key))return;
        if(searchable&&['Home','End'].includes(e.key))return;
        e.preventDefault();e.stopPropagation();
        if(e.key==='Escape'){close();return;}
        if(e.key==='Enter'||e.key===' '){
            if(!isOpen()){open(true);return;}
            if(matches[index<0?0:index])choose(matches[index<0?0:index].value);return;
        }
        if(!isOpen())open(true);
        if(!matches.length)return;
        index=e.key==='Home'?0:e.key==='End'?matches.length-1:index<0?(e.key==='ArrowDown'?0:matches.length-1):(index+(e.key==='ArrowDown'?1:-1)+matches.length)%matches.length;
        [...list.querySelectorAll('[role=option]')].forEach((row,i)=>row.setAttribute('aria-selected',String(i===index)));
        const active=list.querySelectorAll('[role=option]')[index];input.setAttribute('aria-activedescendant',active.id);active.scrollIntoView({block:'nearest'});
    };
    input.onkeydown=keydown;
    toggle.addEventListener('keydown',e=>{if(!['Enter',' '].includes(e.key)){suppressFocusOpen=true;input.focus({preventScroll:true});suppressFocusOpen=false;keydown(e);}});
    bindPopoverToggle(toggle,{isOpen,open:()=>open(true),close,beforeToggle:()=>{suppressFocusOpen=true;input.focus({preventScroll:true});suppressFocusOpen=false;}});
    wrap.addEventListener('focusout',e=>{if(!wrap.contains(e.relatedTarget))close();});
    window.addEventListener('resize',close);document.addEventListener('scroll',e=>{if(!list.contains(e.target))close();},true);
    return {sync(){entries=[...select.options].map(o=>({value:o.value,label:o.textContent}));lastValue=select.selectedOptions[0]?.textContent||'';selectedValue=select.selectedOptions[0]?.value||'';if(!editing)input.value=lastValue;if(select.closest('.filter-field').hidden)close();else if(isOpen())draw();},close};
}
