import {releaseSurfaceFocus} from './surface-focus.mjs';
import { tr } from './i18n.mjs';
import { disclosureIndicator } from './disclosure.mjs';
import { mountFilterPanelMotion } from './filter-panel-motion.mjs';
import { mountFilterPicker } from './filter-picker.mjs';
import { emptyFilters, hasFilters, recentSearches, HistoryFocus } from './search.mjs';
import { keyBinding } from './preferences.mjs';
import { ViewState, restoreView } from './view-state.mjs';
const $=id=>document.getElementById(id);
export function setupGridPersonalization({api,privateMode,getState,getPrefs,savePrefs,rpc,render,selection,undo,resize,announce,motion}) {
    const filters={root:emptyFilters(),group:emptyFilters()},boxes={},historyLists={},timers={},mac=/Mac|iPhone|iPad/.test(navigator.platform);
    const historyFocus={root:new HistoryFocus(),group:new HistoryFocus()};
    let history=[],view=null,restoring=false,initialized=false,groupId=null; const lastPositions={};
    const scope=()=>$('group-dialog').open?'group':'root';
    const input=s=>$(s==='group'?'group-search':'search-input');
    const scrollNode=s=>s==='group'?document.querySelector('.group-content'):document.scrollingElement;
    const root=s=>s==='group'?$('group-grid'):document.querySelector('main');
    function position(s){if(s==='group'&&!$('group-dialog').open)return lastPositions[s]||null;const sc=scrollNode(s),top=s==='group'?sc.getBoundingClientRect().top:0;const card=[...root(s).querySelectorAll('.card[data-key]')].find(e=>e.getBoundingClientRect().bottom>top);return {key:card?.dataset.key||null,offset:card?card.getBoundingClientRect().top-top:0,scroll:sc.scrollTop};}
    function capture(s){if(!initialized||restoring||!view||(s==='group'&&groupId===null))return;const prefs=getPrefs();const keepQuery=prefs[s==='group'?'rememberGroupQuery':'rememberRootQuery'],keepScroll=prefs[s==='group'?'rememberGroupScroll':'rememberRootScroll'];return view.set(s,groupId,{query:keepQuery?input(s).value:'',position:keepScroll?(lastPositions[s]=position(s)):null,...(privateMode&&s==='root'?{options: prefs.rememberOptions?{nested:$('opt-nested').checked,searchGroups:$('opt-groups').checked}:null,allWindows:prefs.rememberScope?$('opt-all-windows').checked:false}:{})}).catch(e=>announce(e.message,true));}
    function schedule(s){clearTimeout(timers[s]);timers[s]=setTimeout(()=>capture(s),150);}
    async function restore(s,saved,valid=()=>true,force=false){if(!valid())return;restoring=true;const value=force?saved:restoreView(saved,getPrefs(),s==='group');input(s).value=value.query;render();await new Promise(requestAnimationFrame);if(!valid()){restoring=false;return;}if(value.position){const sc=scrollNode(s),card=[...root(s).querySelectorAll('.card[data-key]')].find(c=>c.dataset.key===value.position.key);const top=s==='group'?sc.getBoundingClientRect().top:0;sc.scrollTop=card?sc.scrollTop+card.getBoundingClientRect().top-top-value.position.offset:value.position.scroll||0;}else scrollNode(s).scrollTop=0;lastPositions[s]=position(s);restoring=false;}
    function autofocus(){if(!getPrefs().autofocus||($('thumbnail-tour')?.open||$('settings-dialog').open)||$('action-dialog').open||$('context-menu').matches(':popover-open')||$('page-menu').matches(':popover-open'))return;const s=scope();historyFocus[s].automatic();hideHistory(s);const el=input(s);el.focus({preventScroll:true});if(getPrefs().selectQuery)el.select();}
    async function record(s){if(privateMode||!getPrefs().historyEnabled)return;try{history=await rpc('searchHistory','record',input(s).value.trim().slice(0,500));}catch(e){announce(e.message,true);}}
    function hideHistory(s){const {list}=historyLists[s];if(!list.hidden)motion?.reveal(list,false);list.hidden=true;input(s).setAttribute('aria-expanded','false');input(s).removeAttribute('aria-activedescendant');}
    function drawHistory(s){
        const {list,scroll}=historyLists[s];if(document.activeElement!==input(s)||!historyFocus[s].allowed)return;const opening=list.hidden;
        const values=recentSearches(history,getPrefs(),privateMode,input(s).value);historyLists[s].values=values;historyLists[s].index=-1;scroll.replaceChildren();
        values.forEach((value,i)=>{const row=document.createElement('div');row.id=`history-${s}-${i}`;row.setAttribute('role','option');row.setAttribute('aria-selected','false');const text=document.createElement('span');text.textContent=value.query;row.append(text);
            const remove=document.createElement('button');remove.type='button';remove.className='history-remove';remove.tabIndex=-1;remove.setAttribute('aria-label',tr("Remove search: {0}",[value.query]));
            remove.onclick=e=>{e.stopPropagation();removeHistory(s,value.query);};row.append(remove);
            row.onpointerdown=e=>e.preventDefault();row.onclick=()=>useHistory(s,i);scroll.append(row);});
        list.hidden=!values.length;input(s).setAttribute('aria-expanded',String(Boolean(values.length)));input(s).removeAttribute('aria-activedescendant');
        if(opening&&values.length)motion?.reveal(list,true);
    }
    async function removeHistory(s,query){try{history=await rpc('searchHistory','remove',query);drawHistory(s);announce(tr("Search removed."));}catch(e){announce(e.message,true);}}
    async function useHistory(s,i){const v=historyLists[s].values[i];if(!v)return;input(s).value=v.query;input(s).dispatchEvent(new Event('input',{bubbles:true}));await record(s);hideHistory(s);capture(s);}
    async function consume(s){
        const query=input(s).value;
        await record(s);
        const keep=getPrefs()[s==='group'?'rememberGroupQuery':'rememberRootQuery'];
        if(!keep&&input(s).value===query){input(s).value='';input(s).dispatchEvent(new Event('input',{bubbles:true}));hideHistory(s);await capture(s);}else{hideHistory(s);await capture(s);}
    }
    for(const s of ['root','group']){
        const box=document.createElement('div');box.className='live-filters';box.setAttribute('aria-label',s==='root'?tr("Tab filters"):tr("Group tab filters"));
        const controls={},pickers={};
        for(const [key,label]of [['websites',tr("Website")],['groups',tr("Group")],['pinned',tr("Pinned")],['audible',tr("Playing audio")],['muted',tr("Muted")]]){
            const wrap=document.createElement('div');wrap.className='filter-field';const caption=document.createElement('label');caption.textContent=label;wrap.append(caption);const select=document.createElement('select');select.setAttribute('aria-label',tr("{0}{1} filter", [s==='group'?tr("Group: "):'', label]));select.dataset.filter=key;
            if(key==='websites'||key==='groups'){select.multiple=true;select.size=2;}else for(const [value,text]of [['any',tr("Any")],['yes',tr("Yes")],['no',tr("No")]]){const o=document.createElement('option');o.value=value;o.textContent=text;select.append(o);}
            select.onchange=()=>{filters[s][key]=select.multiple?[...select.selectedOptions].map(o=>key==='groups'?Number(o.value):o.value):select.value;if(s==='root'&&getState().view==='recent'&&hasFilters(filters.root))getState().view='open';render();drawHistory(s);};wrap.append(select);box.append(wrap);controls[key]=select;const id=`filter-${s}-${key}`;caption.htmlFor=id;if(select.multiple)pickers[key]=mountFilterPicker(select,{id,label:tr("{0}{1} filter", [s==='group'?tr("Group: "):'', label]),kind:key,api,getGroups:()=>getState().groups,motion});else select.id=id;
        }
        const clear=document.createElement('button');clear.textContent=tr("Clear filters");clear.onclick=()=>{filters[s]=emptyFilters();render();};box.append(clear);
        const disclosure=document.createElement('div');disclosure.className='filter-disclosure';
        const summary=document.createElement('button');summary.type='button';summary.className='filter-toggle';summary.textContent=tr("Filters");
        const content=document.createElement('div');content.className='filter-content';content.id=`filters-${s}-content`;content.append(box);
        summary.setAttribute('aria-controls',content.id);
        const count=document.createElement('span');count.className='filter-count';summary.append(count);disclosure.append(summary,content);
        const indicator=disclosureIndicator(summary);indicator.set(false);
        content.setAttribute('data-collapsed','');content.inert=true;content.setAttribute('aria-hidden','true');
        const liquidMotion=mountFilterPanelMotion(content,summary,getPrefs);
        summary.onclick=()=>{
            const opening=summary.getAttribute('aria-expanded')!=='true';
            if(!opening)for(const picker of Object.values(pickers))picker.close();
            const liquid=liquidMotion&&getPrefs().visualStyle==='glass';
            indicator.set(opening,liquid?null:motion);
            if(liquid)liquidMotion.set(opening);
            else if(motion)motion.disclose(content,opening,disclosure);
            else{if(!opening)releaseSurfaceFocus(content,summary);content.toggleAttribute('data-collapsed',!opening);content.inert=!opening;content.setAttribute('aria-hidden',String(!opening));}
        };
        if(s==='root')document.querySelector('.page-controls .search-options').after(disclosure);else $('group-search').closest('label').after(disclosure);boxes[s]={box,controls,pickers,disclosure,count};
        const list=document.createElement('div');list.id=`search-history-${s}`;list.className='search-history';list.hidden=true;list.setAttribute('role','listbox');list.setAttribute('aria-label',tr("Recent searches"));
        const scroll=document.createElement('div');scroll.className='search-history-scroll';list.append(scroll);
        const field=input(s).closest('label');field.style.position='relative';list.style.top='100%';list.style.left='0';list.style.right='0';field.append(list);historyLists[s]={list,scroll,values:[],index:-1};
        input(s).setAttribute('role','combobox');input(s).setAttribute('aria-autocomplete','list');input(s).setAttribute('aria-controls',list.id);input(s).setAttribute('aria-expanded','false');
        input(s).addEventListener('input',()=>{historyFocus[s].interact();schedule(s);drawHistory(s);});
        input(s).addEventListener('click',()=>{historyFocus[s].interact();drawHistory(s);});
        input(s).addEventListener('focus',async()=>{drawHistory(s);if(!privateMode&&getPrefs().historyEnabled){try{history=await rpc('searchHistory');drawHistory(s);}catch(e){announce(e.message,true);}}});
        input(s).addEventListener('blur',()=>{historyFocus[s].blur();hideHistory(s);capture(s);});
        input(s).addEventListener('keydown',e=>{
            const choices=historyLists[s];
            if(e.key==='Escape'&&!list.hidden){e.preventDefault();e.stopPropagation();hideHistory(s);return;}
            if(['ArrowDown','ArrowUp'].includes(e.key)&&choices.values.length&&!list.hidden){e.preventDefault();choices.index=choices.index<0?(e.key==='ArrowDown'?0:choices.values.length-1):(choices.index+(e.key==='ArrowDown'?1:-1)+choices.values.length)%choices.values.length;[...list.querySelectorAll('[role=option]')].forEach((row,i)=>row.setAttribute('aria-selected',String(i===choices.index)));input(s).setAttribute('aria-activedescendant',list.querySelectorAll('[role=option]')[choices.index].id);list.querySelectorAll('[role=option]')[choices.index].scrollIntoView({block:'nearest'});}
            if(e.key==='Delete'&&choices.index>=0&&!list.hidden){e.preventDefault();removeHistory(s,choices.values[choices.index].query);return;}
            if(e.key==='Enter'){e.preventDefault();if(choices.index>=0&&!list.hidden)useHistory(s,choices.index);else{record(s);hideHistory(s);render();capture(s);}}
        });
        const target=s==='group'?scrollNode(s):window;target.addEventListener('scroll',()=>{if(initialized&&!restoring)lastPositions[s]=position(s);schedule(s);},{passive:true});
    }
    function sync(){
        const prefs=getPrefs(),st=getState();
        for(const s of ['root','group']){
            const pool=st.tabs.filter(t=>s==='group'?t.groupId===st.groupId:$('opt-all-windows').checked||t.windowId===st.windowId);
            boxes[s].box.hidden=!['filterWebsite',...(s==='root'?['filterGroup']:[]),'filterPinned','filterAudible','filterMuted'].some(key=>prefs[key]);
            for(const [key,select]of Object.entries(boxes[s].controls)){
                const setting={websites:'filterWebsite',groups:'filterGroup',pinned:'filterPinned',audible:'filterAudible',muted:'filterMuted'}[key];const enabled=prefs[setting]&&!(s==='group'&&key==='groups');select.closest('.filter-field').hidden=!enabled;
                if(!enabled)filters[s][key]=select.multiple?[]:'any';
                if(select.multiple){const entries=key==='websites'?[...new Set(pool.flatMap(t=>{try{return[new URL(t.url).hostname];}catch{return[];}}))].sort().map(h=>[h,h]):st.groups.filter(g=>pool.some(t=>t.groupId===g.id)).map(g=>[g.id,g.title||tr("Untitled group")]);
                    const sig=JSON.stringify(entries);if(select.dataset.signature!==sig){select.replaceChildren();for(const [value,label]of entries){const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o);}select.dataset.signature=sig;}filters[s][key]=filters[s][key].filter(v=>entries.some(([value])=>value===v));for(const opt of select.options)opt.selected=filters[s][key].includes(key==='groups'?Number(opt.value):opt.value);
                }else select.value=filters[s][key];
                boxes[s].pickers[key]?.sync();
            }
        }
        for(const s of ['root','group']){
            boxes[s].disclosure.hidden=boxes[s].box.hidden;
            const count=Object.values(filters[s]).filter(value=>Array.isArray(value)?value.length:value!=='any').length;
            boxes[s].count.textContent=count?tr("{0} active", [count]):'';
        }
        const forced=filters.root.groups.length>0;if(forced&&!$('opt-nested').disabled)$('opt-nested').dataset.beforeForced=String($('opt-nested').checked);if(forced)$('opt-nested').checked=true;else if($('opt-nested').disabled)$('opt-nested').checked=$('opt-nested').dataset.beforeForced==='true';$('opt-nested').disabled=forced;
        if(view)view.prune(st.groups.map(g=>g.id));
    }
    document.addEventListener('click',e=>{if(!getPrefs().blankClear)return;blank(e,false);});
    document.addEventListener('dblclick',e=>{if(!getPrefs().blankExit)return;blank(e,true);});
    function blank(e,exit){const st=getState();if(st.dragging||Date.now()<(st.dragEnded||0)+300||$('context-menu').matches(':popover-open')||$('page-menu').matches(':popover-open')||($('thumbnail-tour')?.open||$('settings-dialog').open)||$('action-dialog').open)return;const s=scope();if(s==='root'&&!['open','all','inactive'].includes(st.view))return;const target=e.target;if(!target.matches('main, #open-section, .grid-container, .group-content, #window-sections, .window-section, #pinned-section')||!((s==='group'?$('group-dialog'):document.querySelector('main')).contains(target)))return;selection(s,exit?'exit':'clear');}
    document.addEventListener('keydown',e=>{
        if(e.defaultPrevented||e.repeat||e.target.closest('input,textarea,select,[contenteditable=true]')||($('thumbnail-tour')?.open||$('settings-dialog').open)||$('action-dialog').open||$('context-menu').matches(':popover-open')||$('page-menu').matches(':popover-open'))return;
        const binding=keyBinding(e,mac),action=Object.keys(getPrefs().shortcuts).find(k=>getPrefs().shortcuts[k]&&getPrefs().shortcuts[k]===binding);if(!action)return;
        e.preventDefault();const s=scope();
        if(action==='focusSearch'){input(s).scrollIntoView({block:'start',behavior:getPrefs().motion==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});input(s).focus({preventScroll:true});if(getPrefs().selectQuery)input(s).select();}
        else if(action==='undo')undo();
        else if(action==='allWindows'){$('opt-all-windows').checked=!$('opt-all-windows').checked;$('opt-all-windows').dispatchEvent(new Event('change'));}
        else if(action==='larger'||action==='smaller')resize(action==='larger'?-1:1);
        else if(action==='select')selection(s,'toggle');
        else if(action.startsWith('sort')){$('sort-select').value=({sortDefault:'default',sortTitle:'title',sortDomain:'domain',sortAccessed:'accessed'})[action];$('sort-select').dispatchEvent(new Event('change'));}
    });
    for(const id of ['opt-nested','opt-groups','opt-all-windows'])$(id).addEventListener('change',()=>capture('root'));
    window.addEventListener('blur',()=>{capture('root');if(groupId!==null)capture('group');});
    window.addEventListener('focus',()=>{if(initialized)autofocus();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){capture('root');if(groupId!==null)capture('group');}else if(initialized)autofocus();});
    return {
        snapshot(){return {root:{query:input('root').value,position:position('root')},group:{query:input('group').value,position:position('group')},groupId,filters:structuredClone(filters),category:getState().view,options:{nested:$('opt-nested').checked,groups:$('opt-groups').checked,allWindows:$('opt-all-windows').checked}};},
        async resume(saved,openGroup){
            if(!saved)return;
            for(const [key,id]of [['nested','opt-nested'],['groups','opt-groups'],['allWindows','opt-all-windows']])if(typeof saved.options?.[key]==='boolean')$(id).checked=saved.options[key];
            if(['open','all','inactive','recent'].includes(saved.category))getState().view=privateMode&&!['open','all'].includes(saved.category)?'open':saved.category;
            filters.root={...emptyFilters(),...saved.filters?.root};await restore('root',saved.root,()=>true,true);
            if(saved.groupId!==null&&getState().groups.some(g=>g.id===saved.groupId)){await openGroup(saved.groupId);filters.group={...emptyFilters(),...saved.filters?.group};await restore('group',saved.group,()=>true,true);}
        },
        filters,hasFilters:s=>Boolean(hasFilters(filters[s])),sync,record,consume,autofocus,capture,hideHistory:()=>{hideHistory('root');hideHistory('group');},
        async init(){const st=getState();view=new ViewState(api,st.windowId,privateMode);await view.load();if(privateMode){const saved=view.data.root;if(getPrefs().rememberOptions&&saved.options){$('opt-nested').checked=saved.options.nested;$('opt-groups').checked=saved.options.searchGroups;}if(getPrefs().rememberScope)$('opt-all-windows').checked=Boolean(saved.allWindows);}if(!privateMode)history=await rpc('searchHistory');await restore('root',view.data.root);initialized=true;autofocus();},
        async openGroup(id){if(groupId!==null)capture('group');groupId=id;lastPositions.group=null;filters.group=emptyFilters();await restore('group',view?await view.group(id):{},()=>groupId===id&&$('group-dialog').open);if(groupId===id)autofocus();},
        closeGroup(){capture('group');groupId=null;filters.group=emptyFilters();hideHistory('group');},
        preferencesChanged(){sync();for(const s of ['root','group']){capture(s);drawHistory(s);}if(!getPrefs().historyEnabled)history=[];}
    };
}
