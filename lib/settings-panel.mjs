import { tr, translateError } from './i18n.mjs';
import { mountSettingsHelp } from './settings-help.mjs';
import { mountSettingsSearch } from './settings-search.mjs';
import { groupLabel } from './group-presentation.mjs';
import { mountSiteList } from './site-list-editor.mjs';
import { mountAppearance } from './appearance-panel.mjs';
import { DEFAULTS, SHORTCUTS, keyBinding, exportSettings } from './preferences.mjs';
const node=(tag,text='')=>{const e=document.createElement(tag);e.textContent=text;return e;};
const categories=[['general',tr("General"),'tune'],['appearance',tr("Appearance"),'palette'],['search',tr("Search & Filters"),'search'],['tabs',tr("Tabs & Groups"),'tab'],['previews',tr("Previews & Storage"),'image'],['keyboard',tr("Keyboard"),'keyboard'],['backup',tr("Backup"),'save']];
const definitions={
 general:[
 ['language',tr('Language'),[['auto',tr('Follow browser')],['en','English'],['zh-CN','简体中文'],['ja','日本語']]],
 ['rememberOptions',tr("Remember search options")],['rememberScope',tr("Remember current/all-window scope")],['rememberRootScroll',tr("Remember main-grid scroll position")],['rememberGroupScroll',tr("Remember group scroll positions")],
 ['rememberRootQuery',tr("Keep main search query")],['rememberGroupQuery',tr("Keep group search queries")],['autofocus',tr("Focus search when opening or returning to TabGrid")],['selectQuery',tr("Select existing text when focusing search")]],
 appearance:[['motion',tr("Reduce animations")],['showAddress',tr("Show website address on cards")],['showLastUsed',tr("Show last-used time on cards")],['showWindow',tr("Show window on cards")],['showGroup',tr("Show group on main search results")]],
 search:[
 ['matchTargets',tr("Match"),[['both',tr("Match tab titles & URLs")],['title',tr("Match tab titles")],['url',tr("Match URLs")]]],['matchMode',tr("Matching"),[['phrase',tr("Exact phrase")],['words',tr("All words")]]],['nested',tr("Search inside groups")],['searchGroups',tr("Search groups")],
 ['filterWebsite',tr("Show website filter")],['filterGroup',tr("Show group filter")],['filterPinned',tr("Show pinned filter")],['filterAudible',tr("Show playing audio filter")],['filterMuted',tr("Show muted filter")],
 ['historyEnabled',tr("Record search history")],['historyCount',tr("History entries displayed"),[[5,'5'],[10,'10'],[20,'20']]],['historyDays',tr("History expiry"),[0,3650]]],
 tabs:[
 ['switchNewTab',tr("Switch to newly created tabs")],['closeAfterSwitch',tr("Close TabGrid after switching to a tab")],['blankClear',tr("Click blank space to clear selection")],['blankExit',tr("Double-click blank space to exit selection mode")],
 ['closePolicy',tr("Confirm before closing"),[['always',tr("Always")],['multiple',tr("Multiple tabs")],['above',tr("Above a chosen count")]]],['closeThreshold',tr("Confirm when count exceeds"),[1,100000]],['undoMs',tr("Undo timeout (milliseconds)"),[1,300000]],
 ['inactiveDays',tr("Move to Idle after"),[0,3650]],['idleSites',tr("Websites excluded from Idle"),'sites'],['dropGroups',tr("Show group drop targets")],['dragGrouping',tr("Group tabs by dragging")],['swipeClose',tr("Swipe to close cards")]],
 previews:[['groupPreviewOverflow',tr("Show remaining tab count in group previews")],['capture',tr("Capture screenshots")],['previewQuality',tr("Screenshot quality"),[[20,tr("Low — smaller files")],[40,tr("Standard — balanced")],[80,tr("High — more detail")]]],['previewSites',tr("Websites excluded from previews"),'sites'],['previewLimit',tr("Preview storage limit (MiB)"),[1,1024]]]
};
export function mountSettings({background,dialog,privateMode,getPrefs,save,rpc,getGroups,getProtected,setProtected,isNestedForced=()=>false,onApplied,motion}) {
    const body=node('div');body.className='settings-layout';const rail=node('div');rail.className='settings-tabs';rail.setAttribute('role','tablist');rail.setAttribute('aria-label',tr("Settings categories"));rail.setAttribute('aria-orientation','vertical');
    const sidebar=node('aside');sidebar.className='settings-sidebar';sidebar.append(rail);const panels=node('div');panels.className='settings-panels';body.append(sidebar,panels);dialog.append(body);
    const help=mountSettingsHelp(dialog);
    const controls=new Map(),presetsByKey=new Map(),siteEditors=new Map(),fieldRows=new Map(),customKeys=new Set(),sections=new Map(),error=node('p');error.id='settings-error';error.setAttribute('role','alert');dialog.append(error);
    const act=async work=>{error.textContent='';try{return await work();}catch(e){error.textContent=translateError(e.message);return null;}};
    const button=(text,handler)=>{const b=node('button',text);b.type='button';b.onclick=handler;return b;};
    let active='general';
    function show(id,focus=false){const change=()=>{active=id;for(const b of rail.children){b.setAttribute('aria-selected',String(b.dataset.section===id));b.tabIndex=b.dataset.section===id?0:-1;}for(const [key,p]of sections)p.hidden=key!==id;};if(motion&&dialog.open)motion.layout([panels],change);else change();if(focus)rail.querySelector(`[data-section=${id}]`).focus();if(id==='previews')usage();if(id==='search')history();if(id==='keyboard')bindings();}
    for(const [id,label,iconName]of categories){const b=button('',()=>show(id));const icon=node('span');icon.className='ui-icon';icon.dataset.icon=iconName;icon.setAttribute('aria-hidden','true');b.append(icon,node('span',label));b.dataset.section=id;b.id=`settings-tab-${id}`;b.setAttribute('role','tab');b.setAttribute('aria-controls',`settings-panel-${id}`);rail.append(b);const p=node('section');p.id=`settings-panel-${id}`;p.setAttribute('role','tabpanel');p.setAttribute('aria-labelledby',b.id);p.append(node('h3',label));sections.set(id,p);panels.append(p);}
    rail.onkeydown=e=>{if(!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();const i=categories.findIndex(([id])=>id===active);show(categories[e.key==='Home'?0:e.key==='End'?categories.length-1:(i+(e.key==='ArrowDown'?1:-1)+categories.length)%categories.length][0],true);};
    const groupDefinitions={
        general:[[tr('Language'),['language']],[tr("Remember your place"),['rememberOptions','rememberScope','rememberRootScroll','rememberGroupScroll','rememberRootQuery','rememberGroupQuery']],[tr("Search focus"),['autofocus','selectQuery']]],
        appearance:[[tr("Motion and card details"),['motion','showAddress','showLastUsed','showWindow','showGroup']]],
        search:[[tr("Matching"),['matchTargets','matchMode','nested','searchGroups']],[tr("Visible filters"),['filterWebsite','filterGroup','filterPinned','filterAudible','filterMuted']],[tr("Search history"),['historyEnabled','historyCount','historyDays']]],
        tabs:[[tr("Opening and selection"),['switchNewTab','closeAfterSwitch','blankClear','blankExit']],[tr("Closing and undo"),['swipeClose','closePolicy','closeThreshold','undoMs']],[tr("Idle tabs"),['inactiveDays','idleSites']],[tr("Group destinations"),['dragGrouping','dropGroups']]],
        previews:[[tr('Group previews'),['groupPreviewOverflow']],[tr("Capture"),['capture','previewQuality','previewSites']],[tr("Storage"),['previewLimit']]]
    };
    const fieldGroups=new Map();
    for(const [section,groups]of Object.entries(groupDefinitions))for(const [title,keys]of groups){
        const fieldset=node('fieldset');fieldset.className='settings-group';fieldset.append(node('legend',title));sections.get(section).append(fieldset);for(const key of keys)fieldGroups.set(key,fieldset);
    }
    for(const [section,fields]of Object.entries(definitions))for(const [key,label,kind]of fields){
        const restricted=privateMode&&(['historyEnabled','historyCount','historyDays','idleSites','inactiveDays','capture','previewQuality','previewSites','previewLimit'].includes(key));
        if(kind==='sites'){const editor=mountSiteList(fieldGroups.get(key),{key,label,getPrefs,save,act,disabled:restricted});siteEditors.set(key,editor);fieldRows.set(key,editor.box);continue;}
        const wrap=node('label'),input=node(kind==='sites'?'textarea':Array.isArray(kind)&&Array.isArray(kind[0])?'select':'input');input.id=`pref-${key}`;input.setAttribute('aria-describedby','settings-error');
        if(!kind){input.type='checkbox';input.setAttribute('role','switch');wrap.className='checkbox-label';}
        else if(kind==='sites'){input.rows=4;input.placeholder='example.com';}
        else if(input.tagName==='SELECT')for(const [value,text]of kind){const opt=node('option',text);opt.value=value;input.append(opt);}
        else{input.type='number';input.min=kind[0];input.max=kind[1];input.step='1';input.required=true;}
        wrap.append(node('span',label),input);fieldGroups.get(key).append(wrap);controls.set(key,input);fieldRows.set(key,wrap);input.disabled=restricted;
        input.onchange=()=>act(async()=>{
            if(!input.checkValidity()){input.setAttribute('aria-invalid','true');throw Error(tr("Enter a whole number between {0} and {1}.", [input.min, input.max]));}
            const value=!kind?(key==='motion'?(input.checked?'off':'system'):input.checked):kind==='sites'?input.value.split(/\n/).map(v=>v.trim()).filter(Boolean):typeof DEFAULTS[key]==='number'?Number(input.value):input.value;
            try{await save(key==='matchTargets'?{matchTitle:value!=='url',matchUrl:value!=='title'}:{[key]:value});input.removeAttribute('aria-invalid');sync();if(key==='historyEnabled')await history();}catch(e){input.setAttribute('aria-invalid','true');throw e;}
        });
        if(key==='previewQuality'){
            const hint=node('small',tr("Applies to future captures. Higher quality uses more storage."));hint.id='preview-quality-hint';
            wrap.firstChild.id='preview-quality-label';input.setAttribute('aria-labelledby','preview-quality-label');input.setAttribute('aria-describedby','preview-quality-hint settings-error');help(wrap.firstChild,hint);
        }
        if(['historyDays','inactiveDays'].includes(key)){
            const presets=node('select');presets.setAttribute('aria-label',key==='historyDays'?tr("History expiry preset"):tr("Idle duration preset"));
            for(const value of key==='historyDays'?[0,7,30,90,'custom']:[0,7,14,30,'custom']){const o=node('option',value==='custom'?tr("Custom"):value===0?tr("Never"):tr("{0} days", [value]));o.value=value;presets.append(o);}
            presetsByKey.set(key,presets);presets.disabled=restricted;presets.onchange=()=>act(async()=>{if(presets.value==='custom'){customKeys.add(key);const unfold=()=>{input.hidden=false;};if(motion)motion.layout([fieldGroups.get(key)],unfold);else unfold();if(Number(input.value)===0)input.value='7';input.focus();return;}customKeys.delete(key);await save({[key]:Number(presets.value)});input.removeAttribute('aria-invalid');sync();});input.min=1;input.setAttribute('aria-label',key==='historyDays'?tr("Custom history expiry (days)"):tr("Custom Idle duration (days)"));wrap.insertBefore(presets,input);
        }
    }
    for(const [key,text]of [['closeAfterSwitch',tr("Close TabGrid only after selecting a tab card. Your view is restored next time. TabGrid stays open while Undo is available.")],['swipeClose',tr("When enabled, drag a card left or right with the mouse and release past the fade-out threshold to close it. Hold card to drag.")],['dragGrouping',tr("Drag a card over another tab or group until the target highlights, then release to group. Inside an open group, drag to the bottom “Remove from group” area and release to ungroup. Hold the card outside the group panel to continue dragging on the main grid. To reorder, keep moving past the target’s far edge until the cards shift.")]]){const hint=node('p',text);hint.className='setting-hint';hint.id=`hint-${key}`;help(fieldRows.get(key).firstChild,hint);controls.get(key).setAttribute('aria-describedby',hint.id);}
    help(fieldRows.get('language').firstChild,tr('Language changes reload TabGrid. Tab titles, group names, and searches are not translated.'));
    const appearance=mountAppearance(sections.get('appearance'),{background,getPrefs,save,rpc,act,motion,privateMode,help});
    help(fieldGroups.get('rememberOptions').querySelector('legend'),tr("Queries and scroll positions last for the current Chrome session. Preferences remain saved after Chrome restarts."));
    const groupProtection=node('fieldset');groupProtection.className='settings-group group-protection';groupProtection.append(node('legend',tr("Protect open groups from Idle (current Chrome session)")));const groupList=node('div');groupProtection.append(groupList);fieldGroups.get('idleSites').append(groupProtection);
    function syncGroups(){groupList.replaceChildren();for(const g of getGroups()){const label=node('label'),input=node('input');label.className='checkbox-label';input.type='checkbox';input.setAttribute('role','switch');input.setAttribute('aria-label',tr("Protect {0} from Idle", [g.title||tr("Untitled group")]));input.checked=getProtected().includes(g.id);input.disabled=privateMode;label.append(groupLabel(g),input);input.onchange=()=>act(async()=>{const ids=new Set(getProtected());if(input.checked)ids.add(g.id);else ids.delete(g.id);await setProtected([...ids]);});groupList.append(label);}}
    const historyList=node('div'),historyClear=button(tr("Clear all search history"),()=>act(async()=>{await rpc('searchHistory','clear');await history();}));historyClear.disabled=privateMode;sections.get('search').append(historyClear,historyList);
    help(fieldGroups.get('historyEnabled').querySelector('legend'),tr("History is recorded only when you submit a search or use a result. Turning it off retains entries, hidden until enabled or cleared."));
    async function history(){historyList.replaceChildren();if(privateMode||!getPrefs().historyEnabled)return;const entries=await act(()=>rpc('searchHistory'));if(!entries)return;for(const entry of entries){const row=node('div');row.className='settings-history-row';row.append(node('span',entry.query),button(tr("Remove"),()=>act(async()=>{await rpc('searchHistory','remove',entry.query);history();})));row.lastChild.setAttribute('aria-label',tr("Remove search {0}", [entry.query]));historyList.append(row);}}
    const usageText=node('p'),clearPreviews=button(tr("Clear stored previews"),()=>act(async()=>{await rpc('preview','clearAll');await usage();}));clearPreviews.disabled=privateMode;sections.get('previews').append(usageText,clearPreviews);help(fieldGroups.get('capture').querySelector('legend'),tr("Disabling capture keeps existing previews. Website exclusions include subdomains and remove matching previews."));help(fieldGroups.get('previewLimit').querySelector('legend'),tr("Oldest previews are removed first when the limit is reached."));
    async function usage(){if(privateMode){usageText.textContent=tr("Preview management is unavailable in Incognito.");return;}const value=await act(()=>rpc('preview','usage'));if(value)usageText.textContent=tr("{0} MiB used by {1} previews · limit {2} MiB", [(value.bytes/1048576).toFixed(2), value.count, value.limit/1048576]);}
    const keyboard=sections.get('keyboard'),openBinding=node('p');keyboard.append(openBinding,button(tr("Change Open TabGrid shortcut in Chrome"),()=>act(()=>chrome.tabs.create({url:'chrome://extensions/shortcuts'}))));
    const mac=/Mac|iPhone|iPad/.test(navigator.platform),rows=new Map();let recording=null;
    const display=value=>value.replace(/Mod/g,mac?'⌘':'Ctrl');
    async function bindings(){const commands=await chrome.commands?.getAll().catch(()=>[])||[];openBinding.textContent=tr("Open TabGrid: {0}", [commands.find(c=>c.name==='_execute_action')?.shortcut||tr("Unassigned (configured in Chrome)")]);for(const [key,control]of rows)if(recording!==key)control.textContent=display(getPrefs().shortcuts[key])||tr("Record shortcut");}
    for(const [key,label]of Object.entries(SHORTCUTS)){
        const row=node('div');row.className='shortcut-row';const record=button(tr("Record shortcut"),()=>{recording=key;record.textContent=tr("Press keys… (Escape cancels)");record.focus();});record.setAttribute('aria-label',tr("Record shortcut: {0}", [label]));rows.set(key,record);
        record.onblur=()=>{if(recording===key){recording=null;bindings();}};
        record.onkeydown=e=>{if(recording!==key)return;e.preventDefault();e.stopPropagation();if(e.key==='Escape'){recording=null;bindings();return;}const binding=keyBinding(e,mac);if(!binding)return;act(async()=>{await save({shortcuts:{...getPrefs().shortcuts,[key]:binding}});recording=null;await bindings();});};
        const clear=button(tr("Clear"),()=>act(async()=>{await save({shortcuts:{...getPrefs().shortcuts,[key]:''}});bindings();}));clear.setAttribute('aria-label',tr("Clear shortcut: {0}", [label]));
        row.append(node('span',label),record,clear);keyboard.append(row);
    }
    const resetShortcuts=button(tr("Reset page shortcuts"),()=>act(async()=>{await save({shortcuts:DEFAULTS.shortcuts});bindings();}));resetShortcuts.className='reset-shortcuts';keyboard.append(resetShortcuts);
    const hintLabel=node('label',tr("Show shortcut hints beside actions")),hints=node('input');hints.type='checkbox';hints.setAttribute('role','switch');hintLabel.className='checkbox-label';hintLabel.append(hints);hints.onchange=()=>act(()=>save({shortcutHints:hints.checked}));controls.set('shortcutHints',hints);const hintGroup=node('fieldset');hintGroup.className='settings-group';hintGroup.append(hintLabel);keyboard.children[0].after(hintGroup);help(keyboard.querySelector('h3'),tr("Reference: arrows navigate cards; Shift+arrows extend selection; Ctrl/Cmd+A selects all; Delete closes the selection; Escape dismisses menus. Text editing and Chrome’s restore shortcut stay unchanged."));
    const backup=sections.get('backup'),file=node('input');file.type='file';file.accept='.json,application/json';file.setAttribute('aria-label',tr("Import settings file"));file.disabled=privateMode;file.hidden=true;const fileLabel=node('span',tr("No file chosen"));fileLabel.className='import-file-name';const chooseFile=button(tr("Choose settings file"),()=>file.click());chooseFile.disabled=privateMode;
    const summary=node('pre'),apply=button(tr("Apply imported settings"),()=>act(async()=>{if(!pending)return;const p=await rpc('importSettings',pending,true);pending=null;apply.disabled=true;file.value='';fileLabel.textContent=tr("No file chosen");summary.textContent=tr("Settings imported.");onApplied(p);sync();}));let pending=null;apply.disabled=true;
    file.onchange=()=>act(async()=>{pending=null;apply.disabled=true;summary.textContent='';const f=file.files[0];fileLabel.textContent=f?.name||tr("No file chosen");if(!f)return;if(f.size>1048576)throw Error(tr("Choose a file smaller than 1 MiB."));const text=await f.text(),p=await rpc('importSettings',text,false);pending=text;
        const labels=new Map(Object.values(definitions).flat().map(([key,label])=>[key,label]));
        const describe=(key,value)=>key==='shortcuts'?Object.entries(value).filter(([,binding])=>binding).map(([action,binding])=>`${SHORTCUTS[action]}: ${display(binding)}`).join('; ')||tr("None"):Array.isArray(value)?value.join(', ')||tr("None"):typeof value==='boolean'?value?tr("On"):tr("Off"):String(value);
        const changes=Object.keys(p).filter(key=>key!=='version'&&JSON.stringify(p[key])!==JSON.stringify(getPrefs()[key]));
        summary.textContent=tr("Ready to replace settings: {0} changes\n\n{1}\n\nMissing preferences use defaults. Browser-wide shortcuts and browsing data are not included.", [changes.length, changes.map(key=>`${labels.get(key)||({colorMode:tr("Color mode"),theme:tr("Theme"),font:tr("Interface font"),preferredColumns:tr("Cards per row"),sortMode:tr("Sort order"),shortcutHints:tr("Shortcut hints"),shortcuts:tr("Page shortcuts")})[key]||key}: ${describe(key,getPrefs()[key])} → ${describe(key,p[key])}`).join('\n')]);apply.disabled=false;});
    const exp=button(tr("Export settings"),()=>{const url=URL.createObjectURL(new Blob([exportSettings(getPrefs())],{type:'application/json'})),a=node('a');a.href=url;a.download='tabgrid-settings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});exp.disabled=privateMode;
    help(backup.querySelector('h3'),tr("Back up preferences, website exclusions, and page shortcuts locally. Search history, screenshots, custom background images, open tabs, and session state are excluded."));const backupActions=node('div');backupActions.className='backup-actions';backupActions.append(exp,chooseFile,fileLabel,file);backup.append(backupActions,summary,apply);
    if(privateMode)for(const key of ['search','tabs','previews','backup'])help(sections.get(key).querySelector('h3'),tr("History, idle protection, previews, and backup are managed in regular windows."),tr("Incognito restrictions"));
    function sync(){const change=()=>{
        appearance.sync();syncSpeed();const prefs=getPrefs();
        for(const [key,input]of controls){if(input===document.activeElement)continue;if(input.type==='checkbox')input.checked=key==='motion'?prefs.motion==='off':prefs[key];else input.value=key==='matchTargets'?(prefs.matchTitle?(prefs.matchUrl?'both':'title'):'url'):prefs[key];}
        for(const [key,preset]of presetsByKey){if(!customKeys.has(key))preset.value=[...preset.options].some(o=>o.value===String(prefs[key]))?String(prefs[key]):'custom';controls.get(key).hidden=preset.value!=='custom';}
        controls.get('nested').disabled=isNestedForced();if(isNestedForced())controls.get('nested').checked=true;
        fieldRows.get('closeThreshold').hidden=prefs.closePolicy!=='above';
        for(const key of ['historyCount','historyDays'])fieldRows.get(key).hidden=!prefs.historyEnabled;
        historyClear.hidden=!prefs.historyEnabled;historyList.hidden=!prefs.historyEnabled;
        fieldRows.get('previewQuality').hidden=!prefs.capture;siteEditors.get('previewSites').box.hidden=!prefs.capture;siteEditors.get('idleSites').box.hidden=!prefs.inactiveDays;
        groupProtection.hidden=!prefs.inactiveDays;for(const editor of siteEditors.values())editor.sync();syncGroups();bindings();
        for(const key of ['closePolicy','inactiveDays','capture'])fieldRows.get(key).classList.add('connected-setting');fieldRows.get('closeThreshold').classList.add('dependent-setting');
    };if(motion&&dialog.open)motion.layout([...new Set(fieldGroups.values())],change);else change();}
    const speedRow=node('fieldset');speedRow.className='animation-speed';speedRow.append(node('legend',tr("Animation speed")));
    const speedOptions=node('div');speedOptions.className='speed-options';speedRow.append(speedOptions);
    for(const [value,label,symbol]of [['efficient',tr("Efficient"),'›››'],['standard',tr("Standard"),'››'],['smooth',tr("Smooth"),'∿']]){
        const choice=node('label'),radio=node('input'),mark=node('span',symbol);radio.type='radio';radio.name='animation-speed';radio.value=value;radio.setAttribute('aria-label',label);mark.className='speed-symbol';mark.setAttribute('aria-hidden','true');choice.append(radio,mark,node('span',label));speedOptions.append(choice);radio.onchange=()=>act(async()=>{await save({animationSpeed:value});sync();});
    }
    fieldRows.get('motion').after(speedRow);
    const reducedMedia=matchMedia('(prefers-reduced-motion: reduce)');
    function syncSpeed(){speedRow.hidden=getPrefs().motion==='off'||reducedMedia.matches;for(const radio of speedOptions.querySelectorAll('input'))radio.checked=radio.value===getPrefs().animationSpeed;}
    reducedMedia.addEventListener('change',syncSpeed);
    let highlighted;
    function clearHighlight(){if(!highlighted)return;highlighted.classList.remove('settings-search-hit');if(document.activeElement===highlighted)highlighted.blur();highlighted=null;}
    dialog.addEventListener('pointerdown',event=>{if(highlighted&&!highlighted.contains(event.target))clearHighlight();},true);
    dialog.addEventListener('close',clearHighlight);
    mountSettingsSearch(sidebar, {
        entries(){const entries=[],seen=new Set();for(const [id,category]of categories){const panel=sections.get(id);for(const target of panel.querySelectorAll('label,button,legend,.shortcut-row')){
            if(target.matches('.settings-help-button')||target.closest('.settings-history-row')||target.closest('.settings-search-results')||(target.matches('button')&&target.closest('.shortcut-row')))continue;
            const caption=target.cloneNode(true);caption.querySelectorAll('.settings-help-button').forEach(icon=>icon.remove());
            let label=caption.querySelector(':scope > span:not(.ui-icon):not(.speed-symbol)')?.textContent||caption.querySelector('input')?.getAttribute('aria-label')||caption.firstChild?.textContent||caption.textContent;
            label=label?.trim();const key=id+':'+label;if(!label||label.length>110||seen.has(key)||[tr("Clear"),tr("Record shortcut"),'−','+'].includes(label))continue;
            seen.add(key);entries.push({label,category,id,target});
        }}return entries;},
        choose(entry){show(entry.id);highlighted?.classList.remove('settings-search-hit');let target=entry.target;
            // Dependent settings stay conditional: guide to their visible fieldset.
            if(!target.getClientRects().length)target=target.closest('fieldset')||sections.get(entry.id);
            highlighted=target;target.classList.add('settings-search-hit');target.scrollIntoView({block:'center',behavior:getPrefs().motion==='off'||reducedMedia.matches?'instant':'smooth'});
            const selector='input:not([type=hidden]):not(:disabled),select:not(:disabled),textarea:not(:disabled),button:not(.settings-help-button):not(:disabled)';
            const control=target.matches(selector)?target:[...target.querySelectorAll(selector)].find(element=>element.getClientRects().length);
            if(control?.getClientRects().length)control.focus({preventScroll:true});else {target.tabIndex=-1;target.focus({preventScroll:true});}
        }
    });
    show(active);return {open(){error.textContent='';sync();show(active);dialog.showModal();rail.querySelector('[aria-selected=true]').focus();},sync};
}
