import {splitMembers} from './lib/split-view.mjs';
const GROUP_LAYOUTS = {grid:4, split:2, featured:3};
let groupLayouts = {};
const groupLayoutKey = id => `tabgridGroupLayout:${privateMode?'private':'regular'}:${id}`;
const groupLayout = id => Object.hasOwn(GROUP_LAYOUTS,groupLayouts[groupLayoutKey(id)]) ? groupLayouts[groupLayoutKey(id)] : 'grid';
import {mountThumbnailUpdate} from './lib/thumbnail-update-ui.mjs';
import {mountNoticePopover} from './lib/notice-popover.mjs';
import {createCardReturn,isCardReturning} from './lib/card-return.mjs';
import { tr, currentLanguage, resolveLanguage, translateError } from './lib/i18n.mjs';
import { createDragGrouping } from './lib/drag-grouping.mjs';
import { mountCardSwipe, mouseSwipeEnabled } from './lib/card-swipe.mjs';
import { createCategoryTransition } from './lib/category-transition.mjs';
import { mountCategorySwipe } from './lib/category-swipe.mjs';
import { mountBackground, applyBackgroundAdjustments } from './lib/background-image.mjs';
import { mountGlassSurfaces } from './lib/glass-surfaces.mjs';
import { mountLiquidInteractions } from './lib/liquid-motion.mjs';
import { mountGlassTabs } from './lib/glass-tabs.mjs';
import { createGroupTransition, GROUP_MORPH_MS } from './lib/group-transition.mjs';
import { createDropFeedback } from './lib/drop-feedback.mjs';
import { bindSubmenuHover } from './lib/tab-menu.mjs';
import { groupColors as colors, groupLabel, groupColorPicker } from './lib/group-presentation.mjs';
import { dragPolicy } from './lib/drag-policy.mjs';
import { numberedWindow } from './lib/window-order.mjs';
import { applyAppearance } from './lib/appearance.mjs';
import { createMaterialMotion, materialMotionAllowed, materialTiming } from './lib/material-motion.mjs';
import { DEFAULTS, PREFS_KEY, needsConfirmation, siteMatches } from './lib/preferences.mjs';
import { mountGroupDrawer } from './lib/group-drawer.mjs';
import { mountSettings } from './lib/settings-panel.mjs';
import { setupGridPersonalization } from './lib/grid-personalization.mjs';
import { isLastOpened, groupPreviewTiles } from './lib/tab-focus.mjs';
import Sortable, { AutoScroll } from './node_modules/sortablejs/modular/sortable.core.esm.js';
import autoAnimate from './node_modules/@formkit/auto-animate/index.mjs';
import { windowLabel, relativeTabIds, siteOrigins, anchoredMenuLayout } from './lib/tab-menu.mjs';
import { containMenuFocus } from './lib/menu-focus.mjs';
import { gridMotion } from './lib/tab-motion.mjs';
import { mergeVisibleOrder, keyFor, isGridUrl, matches, selectedTabs, openItems, recentItems, filterRecentItems } from './lib/tab-model.mjs';

import { dropTargetTabIds } from './lib/tab-gestures.mjs';
import { attachCardIntent, cardColumns, idleDays, selectionActive, acceptsGroupDrop, windowSections, UndoNotice } from './lib/tab-ui.mjs';
import { inactiveTabIds, bookmarkFolders } from './lib/tab-library.mjs';

Sortable.mount(new AutoScroll());

const privateMode = Boolean(chrome.extension?.inIncognitoContext);
const $ = id => document.getElementById(id);
const gridUrl = chrome.runtime.getURL('grid.html');
const state = { tabs: [], groups: [], screenshots: {}, recent: [], recentError: '', view: 'open', groupId: null, windowId: null, busy: false, dragging: false, revision: 0, returned: {}, lastOpened: {}, pointerDown: false, windowOrder: [] };
let preferences = structuredClone(DEFAULTS), features, settingsPanel, protectedGroups = [];
const motionMedia = matchMedia('(prefers-reduced-motion: reduce)');
const materialMotion = createMaterialMotion({ liquid: () => preferences.visualStyle === 'glass', allowed: () => materialMotionAllowed(preferences.visualStyle, preferences.motion, motionMedia.matches), timing: () => materialTiming(preferences.visualStyle, preferences.animationSpeed) });
let groupMotionId=null, handoffPreview=null;
const groupTransition=createGroupTransition({
    dialog:$('group-dialog'),motion:materialMotion,
    source:()=>document.querySelector(`.grid-container[data-scope="root"] > .card[data-key="group:${groupMotionId}"]`),
    allowed:()=>materialMotionAllowed(preferences.visualStyle,preferences.motion,motionMedia.matches),
    speed:()=>({efficient:.65,standard:1,smooth:1.6}[preferences.animationSpeed]||1),
    dragging:()=>state.dragging
});
document.querySelectorAll('dialog,[popover]:not(#status):not(#undo-toast)').forEach(surface => materialMotion.native(surface,surface.id==='group-dialog'?{transition:groupTransition.toggle}:{}));
motionMedia.addEventListener('change', () => {
    materialMotion.sync(); groupTransition.sync();
    cardSwipe.cancel();
    if (motionMedia.matches) document.querySelectorAll('.card-surface').forEach(surface => surface.getAnimations().forEach(animation => animation.cancel()));
});
const selections = { root: new Set(), group: new Set() };
const selecting = { root: false, group: false };
const anchors = { root: null, group: null };
const visibleItems = { root: [], group: [] };
const sortables = new Map();
const animations = new Map();
const dropSortables = { root: [], group: [] };
const motionViews = new Map();
function captureGridLayout() {
    if (!materialMotionAllowed(preferences.visualStyle, preferences.motion, motionMedia.matches) || state.dragging) return;
    for (const motion of motionViews.values()) motion.captureLayout();
}
function flushGridLayout() {
    if (!materialMotionAllowed(preferences.visualStyle, preferences.motion, motionMedia.matches) || state.dragging) return;
    for (const container of motionViews.keys()) {
        // A non-card cue only asks the existing plugin to move live surfaces.
        const cue=document.createElement('span');cue.hidden=true;cue.dataset.motionCue='';container.append(cue);cue.remove();
    }
}
const intentCleanup = new Map();
const windowViews = new Map();
let refreshTimer;
let refreshPending = false;
let statusTimer;
let groupOpener;
let recentRevision = 0;
let actionHandler;
let pendingNewTab = null;

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}
function button(text, handler, className = '') {
    const node = el('button', className, text); node.type = 'button';
    node.addEventListener('click', handler); return node;
}
const noticeOptions={motion:materialMotion,timing:()=>materialTiming(preferences.visualStyle,preferences.animationSpeed),allowed:()=>materialMotionAllowed(preferences.visualStyle,preferences.motion,motionMedia.matches)};
const statusPopover=mountNoticePopover($('status'),noticeOptions),undoPopover=mountNoticePopover($('undo-toast'),noticeOptions);
let actionMessage='',dragMessage='';
function paintNotice(){const text=dragMessage||actionMessage;$('status-message').textContent=text;statusPopover.set(Boolean(text));}
function announce(message,error=false){actionMessage=message;$('status-message').setAttribute('role',error?'alert':'status');paintNotice();clearTimeout(statusTimer);statusTimer=setTimeout(()=>{actionMessage='';paintNotice();},10000);}
function dragNotice(message){dragMessage=message;paintNotice();}
async function rpc(action, ...args) {
    const response = await chrome.runtime.sendMessage({ type: 'tabgrid-action', action, args });
    if (response?.error) throw new Error(response.error);
    return response?.result;
}
async function run(work, success = '') {
    if (state.busy) return;
    state.busy = true; syncSelection();
    try {
        const result = await work();
        if (result?.error) announce(result.error, true);
        else if (success) announce(success);
        return result;
    } catch (error) { announce(translateError(error.message) || tr("The action could not be completed."), true); }
    finally { state.busy = false; await refresh(); await refreshRecent(); await updateUndo(); syncSelection(); }
}
function scopeNow() { return $('group-dialog').open ? 'group' : 'root'; }
function tabIds(scope) { return selectedTabs(selections[scope], state.tabs).map(t => t.id); }
function actionTabs(scope) { return features?.hasFilters(scope) ? selectedTabs(new Set(visibleItems[scope].map(item => item.key)), state.tabs) : state.tabs; }
function currentGroup() { return state.groups.find(g => g.id === state.groupId); }
function image(src, className) {
    const img = el('img', className); img.alt = ''; img.draggable = false; img.src = src;
    img.addEventListener('error', () => { if (!img.src.endsWith('/tileIcon.png')) img.src = 'tileIcon.png'; });
    return img;
}
function favicon(tab) {
    const url = new URL(chrome.runtime.getURL('/_favicon/'));
    url.searchParams.set('pageUrl', tab.url || ''); url.searchParams.set('size', '32');
    return url.href;
}
function domain(url) { try { return new URL(url).hostname || url; } catch { return url || tr("New tab"); } }
function focusToken() {
    const active = document.activeElement;
    const card = active?.closest('[data-key]');
    return card ? { key: card.dataset.key, part: active.dataset.part, parent: card.parentElement.id } : null;
}
function restoreFocus(token) {
    if (!token || document.activeElement?.closest('#action-dialog, #context-menu')) return;
    const container = $(token.parent);
    const card = [...(container?.children || [])].find(c => c.dataset.key === token.key);
    const target = card?.querySelector(`[data-part="${token.part || 'open'}"]`) || card?.querySelector('[data-part=expand]') || container?.querySelector('.card-open, [data-part=open]');
    target?.focus({ preventScroll: true });
}

function buildToolbar(scope) {
    const bar = el('div', 'toolbar'); bar.setAttribute('aria-label', tr("Tab selection actions"));
    const toggle = button(tr("Select"), () => {
        selecting[scope] = !(selecting[scope] || selections[scope].size > 0);
        if (!selecting[scope]) selections[scope].clear();
        syncSelection();
    }); toggle.dataset.role = 'toggle';
    bar.append(toggle);
    const count = el('span', 'selection-count'); count.dataset.role = 'count'; count.setAttribute('aria-live', 'polite'); bar.append(count);
    const actions = [
        [tr("Select all"), () => { selecting[scope] = true; selections[scope] = new Set(visibleItems[scope].map(i => i.key)); syncSelection(); }, false],
        [tr("Clear"), () => { selections[scope].clear(); syncSelection(); }, true],
        [tr("Edit"), e => showSelectionMenu(scope, e), true]
    ];
    actions.forEach(([label, handler, needsSelection]) => {
        const b = button(label, handler); b.dataset.role = 'selection-action'; b.dataset.needsSelection = needsSelection;
        if (label === tr("Edit")) { b.setAttribute('aria-haspopup', 'menu'); b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-label', tr("Edit selected tabs")); }
        bar.append(b);
    });
    return bar;
}
$('root-toolbar').append(buildToolbar('root')); $('group-toolbar').append(buildToolbar('group'));
function syncSelection(layout=true) {
    if(layout)captureGridLayout();
    const finishMotion=materialMotion.capture([$('root-toolbar'),$('group-toolbar')]);
    for (const scope of ['root', 'group']) {
        const keys = selections[scope];
        const hasSelection = keys.size > 0;
        const active = selecting[scope] || hasSelection;
        document.body.classList.toggle(`${scope}-selection-active`,active);
        const bar = $(`${scope}-toolbar`);
        bar.hidden = scope === 'group' && !active;
        bar.querySelector('[data-role=toggle]').textContent = active ? tr("Done") : tr("Select");
        bar.querySelector('[data-role=toggle]').setAttribute('aria-pressed', String(active));
        bar.querySelector('[data-role=count]').textContent = active ? tr("{0} {1} selected", [tabIds(scope).length, tabIds(scope).length === 1 ? tr('tab') : tr('tabs')]) : '';
        bar.querySelectorAll('[data-role=selection-action]').forEach(b => { b.hidden = !active || (b.dataset.inactive && state.view !== 'inactive'); b.disabled = state.busy || (b.dataset.needsSelection === 'true' && !hasSelection); });
        const containers = scopeGrids(scope);
        containers.forEach(container => { container.classList.toggle('selecting', active); [...container.children].forEach(card => {
            const selected = keys.has(card.dataset.key);
            card.classList.toggle('selected', selected);
            const checkbox = card.querySelector('.card-select');
            if (checkbox) { checkbox.hidden = !active; checkbox.checked = selected; }
            card.querySelectorAll('.card-menu, .card-close').forEach(b => { b.hidden = active; });
            const open = card.querySelector('.card-open');
            if (open) { if (active) open.setAttribute('aria-pressed', String(selected)); else open.removeAttribute('aria-pressed'); }
        }); });
    }
    $('root-toolbar').hidden = !selectionActive(selecting.root, selections.root);
    finishMotion();if(layout)flushGridLayout();
    $('undo-btn').disabled = state.busy;
    for (const [container, sortable] of sortables) { sortable.option('disabled', !canDrag(container)); sortable.option('sort', canReorder(container)); }
    if (!state.dragging) renderDropTargets();
}
function selectItem(item, scope, event) {
    const keys = selections[scope];
    if (event.shiftKey && anchors[scope]) {
        const order = visibleItems[scope].map(i => i.key);
        const a = order.indexOf(anchors[scope]), b = order.indexOf(item.key);
        if (a >= 0 && b >= 0) { keys.clear(); order.slice(Math.min(a, b), Math.max(a, b) + 1).forEach(k => keys.add(k)); }
    } else {
        if (keys.has(item.key)) keys.delete(item.key); else keys.add(item.key);
        anchors[scope] = item.key;
    }
    selecting[scope] = true; syncSelection();
}
async function activate(item, scope, event) {
    if (state.dragging || (event.detail !== 0 && Date.now() < (state.dragEnded || 0) + 250)) return;
    if (selecting[scope] || event.ctrlKey || event.metaKey || event.shiftKey) { selectItem(item, scope, event); return; }
    const quickView=preferences.closeAfterSwitch&&item.kind==='tab'?features?.snapshot():null;
    await features?.consume(scope);
    if (item.kind === 'group') openGroup(item.group.id);
    else await run(async () => { await rpc('rememberOpened', `tab:${item.tab.id}`); await rpc('switchFromGrid',item.tab.id,{keepOpen:Boolean(undoNotice.entry),view:quickView}); });
}
function createSplitCard(item, scope) {
    const card = el('article', 'card split-card');
    card.dataset.key = item.key; card.dataset.kind = 'tab'; card.itemModel = item;
    const surface = el('div', 'card-surface');
    const members = item.members;
    for (const tab of members) {
        const single = createCard({kind:'tab',key:`tab:${tab.id}`,tab,windowId:tab.windowId,index:tab.index}, scope);
        const pane = el('div', 'split-pane');
        pane.append(...single.querySelector('.card-surface').childNodes);
        pane.querySelector('.card-menu').remove();
        pane.querySelector('.card-close').setAttribute('aria-label',tr(surface.children.length?'Close right view':'Close left view'));
        const check = pane.querySelector('.card-select');
        check.replaceWith(check.cloneNode());
        const selection = pane.querySelector('.card-select');
        selection.addEventListener('click',event=>{event.stopPropagation();selectItem(card.itemModel,scope,event);});
        if(surface.children.length)selection.remove();
        pane.addEventListener('click', event => {
            if (!event.target.closest('.card-menu, .card-close, .card-mute, input')) activate({...card.itemModel,tab}, scope, event);
        });
        surface.append(pane);
    }
    const menu = button('⋮', event => showMenu(card.itemModel, scope, event), 'card-menu split-menu');
    menu.dataset.part = 'menu'; menu.setAttribute('aria-label',tr('Arrange split view'));
    menu.setAttribute('aria-haspopup','menu');menu.setAttribute('aria-expanded','false');surface.lastElementChild.querySelector('.card-info').insertBefore(menu,surface.lastElementChild.querySelector('.card-close'));
    card.append(surface);
    card.addEventListener('contextmenu', event => {event.preventDefault();showMenu(card.itemModel,scope,event);});
    return card;
}
function createCard(item, scope) {
    if (item.splitViewId !== undefined) return createSplitCard(item, scope);
    const data = item.tab || item.group;
    const title = data.title || (item.kind === 'group' ? tr("Untitled group") : data.url || tr("New tab"));
    const card = el('article', `card ${item.kind === 'group' ? 'group-card' : ''}`);
    card.dataset.key = item.key; card.dataset.kind = item.kind; card.itemModel = item;
    const info = el('div', 'card-info');
    const check = el('input', 'card-select'); check.type = 'checkbox'; check.dataset.part = 'select'; check.setAttribute('aria-label', tr("Select {0}", [title]));
    check.addEventListener('click', e => { e.stopPropagation(); selectItem(item, scope, e); }); info.append(check);
    if (item.tab) info.append(image(favicon(item.tab), 'favicon'));
    else { const dot = el('span', 'group-color-dot'); dot.setAttribute('aria-hidden', 'true'); info.append(dot); }
    const name = el('span', 'card-title', title); name.title = title; info.append(name);
    if(item.tab?.mutedInfo?.muted){const mute=button('',e=>{e.stopPropagation();run(()=>chrome.tabs.update(card.itemModel.tab.id,{muted:false}),tr("Tab unmuted."));},'card-mute');mute.dataset.part='mute';mute.setAttribute('aria-label',tr("Unmute {0}",[title]));mute.title=tr("Unmute tab");info.append(mute);}
    const menu = button('⋮', e => showMenu(item, scope, e), 'card-menu'); menu.setAttribute('aria-label', tr("Actions for {0}", [title])); menu.dataset.part = 'menu'; menu.setAttribute('aria-haspopup', 'menu'); menu.setAttribute('aria-expanded', 'false');
    const close = button('×', () => item.kind === 'group' ? confirmClose(item.members.map(t => t.id), tr("Close “{0}”?", [title])) : closeTabs([item.tab.id]), 'card-close'); close.setAttribute('aria-label', tr("Close {0}", [title])); close.dataset.part = 'close'; info.append(menu, close);
    const open = el('button', 'card-open'); open.type = 'button'; open.dataset.part = 'open'; open.setAttribute('aria-label', `${item.kind === 'group' ? tr("Open group") : tr("Switch to")} ${title}`);
    const preview = el('div', 'card-preview');
    if (item.kind === 'group') {
        card.style.setProperty('--group-color', colors[data.color]);
        preview.classList.add('group-preview');
        preview.dataset.layout = groupLayout(data.id);
        preview.setAttribute('aria-hidden', 'true');
        for (const tile of groupPreviewTiles(item.members,handoffPreview?.tabIds,{sort:$('sort-select').value,capacity:GROUP_LAYOUTS[groupLayout(data.id)],overflow:preferences.groupPreviewOverflow!==false})) {
            const cell = el('div', 'group-tile');
            if (tile.tab) {
                const screenshot = state.screenshots[`screenshot_${tile.tab.id}`];
                cell.title = tile.tab.title || tile.tab.url || tr("New tab");
                if (screenshot) cell.append(image(screenshot, 'preview-image'));
                cell.append(image(favicon(tile.tab), 'tile-favicon'));
            } else if (tile.remaining) {
                cell.classList.add('group-overflow'); cell.textContent = `+${tile.remaining}`;
                cell.title = tr("{0} more tabs", [tile.remaining]);
            } else cell.classList.add('group-tile-empty');
            preview.append(cell);
        }
    } else {
        const screenshot = state.screenshots[`screenshot_${data.id}`];
        preview.append(image(screenshot || favicon(data), screenshot ? 'preview-image' : 'fallback'));
    }
    const details = [];
    if (item.tab) {
        if (data.pinned) details.push(tr("Pinned")); if (data.audible) details.push(tr("Playing audio")); if (data.mutedInfo?.muted) details.push(tr("Muted"));
        if (preferences.showAddress) details.push(domain(data.url));
        if (preferences.showGroup && scope === 'root' && $('search-input').value.trim() && $('opt-nested').checked && data.groupId !== -1) details.push(state.groups.find(g=>g.id===data.groupId)?.title || tr("Untitled group"));
        if (preferences.showLastUsed) details.push(Number.isFinite(data.lastAccessed) && data.lastAccessed > 0 ? tr("Last used {0}", [new Date(data.lastAccessed).toLocaleString(currentLanguage())]) : tr("Last used unavailable"));
    } else details.push(`${item.members.length} ${item.members.length===1?tr('tab'):tr('tabs')}`);
    if (preferences.showWindow) details.push(numberedWindow(data.windowId, state.windowOrder));
    open.append(preview, el('div', 'card-meta', details.join(' · ')));
    const surface = el('div', 'card-surface'); surface.append(info, open); card.append(surface);
    card.addEventListener('click', e => { if (!e.target.closest('.card-menu, .card-close, .card-mute, input')) activate(card.itemModel, scope, e); });
    card.addEventListener('contextmenu', e => {
        e.preventDefault();
        if (selectionActive(selecting[scope], selections[scope])) {
            selections[scope].add(card.itemModel.key); anchors[scope] = card.itemModel.key; selecting[scope] = true; syncSelection();
            showSelectionMenu(scope, e);
        } else showMenu(card.itemModel, scope, e);
    });
    return card;
}
function paintCards(container, items, scope) {
    // Keyed reconciliation keeps focused cards and animation ownership stable.
    const liveChildren = () => [...container.children].filter(c => c.dataset.key && c.itemModel);
    const old = new Map(liveChildren().map(c => [c.dataset.key, c]));
    const wanted = new Set(items.map(i => i.key));
    for (const child of liveChildren()) if (!wanted.has(child.dataset.key)) {
        delete child.dataset.key; delete child.dataset.kind;
        child.inert = true; child.setAttribute('aria-hidden', 'true'); child.remove();
    }
    items.forEach((item, index) => {
        const signature = JSON.stringify([$('sort-select').value, preferences.groupPreviewOverflow, item.group && groupLayout(item.group.id), preferences.showAddress, preferences.showLastUsed, preferences.showWindow, preferences.showGroup, state.windowOrder, Boolean($(scope === 'group' ? 'group-search' : 'search-input').value.trim()), $('opt-nested').checked, Boolean(features?.hasFilters(scope)), item.tab ? {...item.tab, index: undefined} : item.group, item.members?.map(t => [t, state.screenshots[`screenshot_${t.id}`]]), state.screenshots[`screenshot_${item.tab?.id}`], $('opt-all-windows').checked]);
        let card = old.get(item.key);
        if (card && card.classList.contains('split-card') !== (item.splitViewId !== undefined)) {
            delete card.dataset.key; delete card.dataset.kind;
            card.inert = true; card.setAttribute('aria-hidden', 'true');
            card.remove(); card = null;
        }
        if (!card) card = createCard(item, scope);
        else if (card.dataset.signature !== signature) {
            card.itemModel = item;
            const next = createCard(card.itemModel, scope);
            // Keep the animated surface alive across native index/title updates.
            card.querySelector('.card-surface').replaceChildren(...next.querySelector('.card-surface').childNodes);
            card.style.cssText = next.style.cssText;
            card.classList.toggle('split-card',Boolean(item.members && item.splitViewId !== undefined));
            const surface = card.querySelector('.card-surface');
            if(next.querySelector('.card-surface').dataset.splitLayout) surface.dataset.splitLayout = next.querySelector('.card-surface').dataset.splitLayout;
            else delete surface.dataset.splitLayout;
        }
        // Native positions change after a close without changing the card artwork.
        card.itemModel = item;
        card.dataset.signature = signature;
        card.classList.toggle('last-opened', isLastOpened(item, state.lastOpened));
        const open = card.querySelector('.card-open');
        if (isLastOpened(item, state.lastOpened)) open.setAttribute('aria-description', tr("Last opened"));
        else open.removeAttribute('aria-description');
        if (liveChildren()[index] !== card) container.insertBefore(card, liveChildren()[index] || null);
    });
}
function gridPolicy(container) {
    const scope=container.dataset.scope||'root';
    return dragPolicy({query:$(scope==='group'?'group-search':'search-input').value,filters:features?.filters[scope],sort:$('sort-select').value,view:scope==='group'?'open':state.view,selecting:selectionActive(selecting[scope],selections[scope]),busy:state.busy});
}
function canReorder(container) { return gridPolicy(container).reorder; }
function canDrag(container) { return gridPolicy(container).drag; }
function gridWindow(container) { return Number(container.dataset.windowId)||(container=== $('group-grid')?currentGroup()?.windowId:state.windowId); }
function gridPinned(container) { return container.dataset.pinned==='true'||container===$('pinned-grid'); }
const returnCard=createCardReturn({getGhost:()=>Sortable.ghost,motion:materialMotion,allowed:()=>materialMotionAllowed(preferences.visualStyle,preferences.motion,motionMedia.matches),speed:()=>({efficient:.65,standard:1,smooth:1.6}[preferences.animationSpeed]||1)});
const dropFeedback = createDropFeedback({ getGhost: () => Sortable.ghost, motion: materialMotion });
const drawers = Object.fromEntries(['root', 'group'].map(scope => [scope, mountGroupDrawer($(`${scope}-drop-targets`), {
    getPrefs: () => preferences, save: savePreferences, dragging: () => state.dragging, announce, motion: materialMotion
})]));
function renderDropTargets() {
    for (const scope of ['root', 'group']) {
        const tray = $(`${scope}-drop-targets`);
        const enabled = preferences.dropGroups && !document.body.classList.contains('dragging-pinned') && (scope === 'root' ? state.view !== 'recent' : state.groupId !== null);
        tray.hidden = !enabled;
        if (!enabled) { drawers[scope].collapse(); continue; }
        const windowId = scope === 'group' ? currentGroup()?.windowId : state.windowId;
        const groups = state.groups.filter(g => (scope==='root'&&$('opt-all-windows').checked||g.windowId === windowId) && (scope !== 'group' || g.id !== state.groupId));
        const signature = JSON.stringify([windowId, groups.map(g => [g.id, g.title, g.color, g.windowId])]);
        if (tray.dataset.signature !== signature) {
            const focusedDestination = tray.contains(document.activeElement) ? document.activeElement.dataset.destination : null;
            dropSortables[scope].forEach(s => s.destroy()); dropSortables[scope] = [];
            drawers[scope].list.replaceChildren(); tray.dataset.signature = signature;
            const destinations = [['new', tr("New group")], ['ungroup', tr("Ungroup")], ...groups.map(g => [g.id, g.title || tr("Untitled group")])];
            for (const [destination, label] of destinations) {
                const target = el('div', 'drop-target'); target.dataset.destination = destination; const destinationGroup = groups.find(g => g.id === destination); if (destinationGroup) { target.classList.add('group-drop-target'); target.style.setProperty('--group-color', colors[destinationGroup.color] || colors.grey); } const receiver = el('div', 'drop-receiver'); receiver.dataset.destination = destination; receiver.dataset.windowId = destinationGroup?.windowId || windowId; receiver.dataset.scope = scope; receiver.setAttribute('aria-hidden', 'true');
                const action = button(label, async () => {
                    const ids = tabIds(scope);
                    if (!ids.length) { announce(tr("Select tabs, then choose a group target, or drag a tab card here.")); return; }
                    if (state.tabs.some(tab => ids.includes(tab.id) && tab.pinned)) { announce(tr("Unpin selected tabs before grouping them."), true); return; }
                    if(destination==='new')createGroupDialog(ids,windowId);
                    else await run(() => rpc('dropIntoGroup', ids, destination, destinationGroup?.windowId || windowId), destination === 'ungroup' ? tr("Tabs ungrouped.") : tr("Tabs grouped."));
                    drawers[scope].collapse();
                }); if (destinationGroup) action.replaceChildren(groupLabel(destinationGroup)); action.dataset.destination = destination; action.setAttribute('aria-label', `${destination === 'ungroup' ? tr("Ungroup selected tabs") : tr("Move selected tabs to {0}", [label])}`); target.append(action, receiver); drawers[scope].list.append(target);
                dropSortables[scope].push(Sortable.create(receiver, {
                    group: { name: 'tabgrid', pull: false, put(to, from, card) { return (acceptsGroupDrop(card) && destination !== 'ungroup' || destination === 'ungroup' && card.dataset.kind === 'group' && /^group:\d+$/.test(card.dataset.key)) && state.dragging && preferences.dropGroups && from.el.dataset.scope === scope; } },
                    draggable: '.card[data-key]', sort: false, animation: 0,
                    selectedClass: 'sortable-selected', ghostClass: 'sortable-ghost'
                }));
            }
            if (focusedDestination !== null) [...tray.querySelectorAll('button')].find(b => b.dataset.destination === focusedDestination)?.focus({ preventScroll: true });
        }
        tray.querySelectorAll('button').forEach(b => { b.disabled = state.busy; });
        drawers[scope].sync();
    }
}
// Empty pinned destinations are useful only while a pinned tab is being moved.
function syncPinnedDropAreas(showEmpty) {
    for (const view of windowViews.values()) if (view.pinnedArea.dataset.empty === 'true') view.pinnedArea.hidden = !showEmpty;
}
function scopeGrids(scope) {
    return [...document.querySelectorAll('.grid-container[data-scope]')].filter(c => c.dataset.scope === scope && sortables.has(c) && !c.closest('[hidden],[inert]'));
}
const dragGrouping=createDragGrouping({notify:dragNotice,enabled:()=>preferences.dragGrouping,canReorder:card=>canReorder(card.parentElement),dialog:$('group-dialog'),feedback:dropFeedback,handoff(card,groupId){
    handoffPreview={tabIds:card.itemModel.members?.map(tab=>tab.id)||[card.itemModel.tab.id],groupId};updateHandoffPreview(groupId);
    // Move only Sortable's fallback; its live slot remains owned by Sortable.
    const ghost=Sortable.ghost;if(ghost){const r=ghost.getBoundingClientRect(),matrix=new DOMMatrix(getComputedStyle(ghost).transform);document.body.append(ghost);Object.assign(ghost.style,{position:'fixed',left:`${r.left-matrix.e}px`,top:`${r.top-matrix.f}px`});}
    groupTransition.handoff();
}});
function clearHandoffPreview(){
    if(handoffPreview){const {groupId}=handoffPreview;handoffPreview=null;updateHandoffPreview(groupId);}
}
function updateHandoffPreview(groupId){
    const card=document.querySelector(`.grid-container[data-scope="root"] > .card[data-key="group:${groupId}"]`);
    if(!card)return;
    const next=createCard(card.itemModel,'root');
    card.querySelector('.group-preview').replaceChildren(...next.querySelector('.group-preview').childNodes);
}
function registerGrid(container, scope) {
    container.dataset.scope = scope;
    intentCleanup.set(container, attachCardIntent(container));
    const motion = gridMotion(container, { reducedMotion: () => preferences.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches, layoutTiming: () => materialTiming(preferences.visualStyle, preferences.animationSpeed), dragDuration: () => ({efficient:80,standard:120,smooth:200})[preferences.animationSpeed] });
    animations.set(container, autoAnimate(container, motion.plugin));motionViews.set(container,motion);
    sortables.set(container, Sortable.create(container, {
        group: { name: 'tabgrid', pull: true, put(to,from,card){return (to.el.dataset.scope===from.el.dataset.scope||(dragGrouping.handedOff()&&to.el.dataset.scope==='root'))&&canDrag(to.el)&&gridPinned(to.el)===Boolean(card.itemModel?.tab?.pinned)&&!(to.el===$('group-grid')&&card.dataset.kind==='group');} },
        sort:canReorder(container),
        animation: 0, forceFallback: true, fallbackOnBody: scope !== 'group', supportPointer: false, draggable: '.card[data-key]',
        fallbackTolerance: 6, delay: 250, delayOnTouchOnly: !mouseSwipeEnabled(preferences), touchStartThreshold: 2,
        filter(event) { return isCardReturning(event.target.closest('.card[data-key]')) || Boolean(event.target.closest('.card-menu, .card-close, .card-mute, input')) || !canDrag(container); },
        preventOnFilter: false, ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen', dragClass: 'sortable-drag',
        onMove(evt) {
            const direction=!evt.to.dataset.destination?dragGrouping.sortMove(evt):undefined;
            if(direction===false)return false;
            if (!evt.to.dataset.destination && drawers[scope].isNear(evt.originalEvent?.clientX,evt.originalEvent?.clientY)) return false;
            dropFeedback.destination(evt.to.dataset.destination); motionViews.get(evt.from)?.capture(); if(evt.to!==evt.from)motionViews.get(evt.to)?.capture(); return direction; },
        onChange(){dragGrouping.reordered();},
        onChoose(evt) { dropFeedback.choose(evt.item,mouseSwipeEnabled(preferences)); },
        onUnchoose() { dropFeedback.unchoose(); },
        onClone(evt) {
            // Sortable's temporary copy is not a live card, even if auto-animate
            // briefly retains it to finish a removal.
            delete evt.clone.dataset.key; delete evt.clone.dataset.kind;
            evt.clone.inert = true; evt.clone.setAttribute('aria-hidden', 'true');
        },
        onStart(evt) {
            // Native group entry changes the coordinate space. Refresh the
            // neighbor baselines before Sortable's clone mutation is observed.
            motion.captureLayout();
            closeMenu();
            state.dragging = true; document.body.classList.add('dragging');
            document.body.classList.toggle('dragging-group', evt.item.dataset.kind === 'group');
            const pinned = Boolean(evt.item.itemModel?.tab?.pinned);
            document.body.classList.toggle('dragging-pinned', pinned);
            syncPinnedDropAreas(pinned);
            renderDropTargets();
            dropFeedback.start(pinned ? null : evt.item.dataset.kind,mouseSwipeEnabled(preferences));
            dragGrouping.start(evt.item,scope,state.groupId);
            Object.values(drawers).forEach(drawer => drawer.sync());
        },
        async onEnd(evt) {
            let returning=false;
            try {
            const direct=dragGrouping.finish(evt.originalEvent);
            dropFeedback.reset();
            Object.values(drawers).forEach(drawer => drawer.collapse());
            state.dragging = false; document.body.classList.remove('dragging', 'dragging-group', 'dragging-pinned'); state.dragEnded = Date.now();
            syncPinnedDropAreas(false);
            renderDropTargets();
            if(direct?.cancelled){await refresh();clearHandoffPreview();if(direct.handedOff&&direct.groupId!==null)openGroup(direct.groupId);return;}
            if(!evt.to.dataset.destination&&(direct?.target||(direct?.ungroup&&!(direct.handedOff&&evt.to!==evt.from)))){
                const item=evt.item.itemModel,ids=item.members?.map(t=>t.id)||[item.tab.id];
                const target=direct.target;
                if(target?.destination==='new'){createGroupDialog([...new Set([...ids,...(target.targetIds || [target.targetId])])],target.windowId);await refresh();}
                else await run(()=>rpc('dropIntoGroup',ids,target?.destination??'ungroup',target?.windowId??(item.tab||item.group).windowId),target?tr("Tabs grouped."):tr("Tab ungrouped."));
                return;
            }
            if (evt.to.dataset.destination) {
                const raw = evt.to.dataset.destination;
                try {
                    const ids = await dropTargetTabIds([evt.item], raw, id => chrome.tabs.query({groupId:id}));
                    if(raw==='new'){createGroupDialog(ids,Number(evt.to.dataset.windowId)); await refresh();}
                    else await run(() => rpc('dropIntoGroup', ids, raw==='ungroup' ? raw : Number(raw), Number(evt.to.dataset.windowId)), raw === 'ungroup' ? tr("Tabs ungrouped.") : tr("Tabs grouped."));
                } catch (error) { announce(translateError(error.message), true); await refresh(); }
                finally {
                    evt.to.querySelectorAll('.card').forEach(c => { c.remove(); });
                    animations.get(container).enable();
                    if (refreshPending) scheduleRefresh();
                }
                return;
            }
            const target=evt.to,source=evt.from,targetCanReorder=canReorder(evt.to);
            // Sortable has already placed the slot. Start its surface return now,
            // before asynchronous persistence/refresh can show the resting card.
            returnCard(evt.item);returning=true;
            if(target===source&&evt.oldIndex===evt.newIndex){syncSelection();if(refreshPending)scheduleRefresh();return;}
            await run(async()=>{
                if(target!==source){
                    if(direct?.handedOff)await rpc('dropIntoGroup',evt.item.itemModel.members?.map(t=>t.id)||[evt.item.itemModel.tab.id],'ungroup',gridWindow(target));
                    const draggedIds=new Set(evt.item.itemModel.members?.map(tab=>tab.id)||[evt.item.itemModel.tab.id]);
                    const removesSourceGroup=direct?.handedOff && state.tabs.filter(tab=>tab.groupId===direct.groupId).every(tab=>draggedIds.has(tab.id));
                    const cards=[...target.children].filter(c=>c.dataset.key&&c.itemModel && !(removesSourceGroup&&c.dataset.key===`group:${direct.groupId}`)),index=cards.indexOf(evt.item),following=cards[index+1],previous=cards[index-1];
                    const anchor=targetCanReorder?following?.dataset.key||previous?.dataset.key||null:null;
                    return rpc('dropAt',{keys:[evt.item.dataset.key],windowId:gridWindow(target),pinned:gridPinned(target),anchor,after:!following&&Boolean(previous)});
                }
                let keys=[...target.children].filter(c=>c.dataset.key&&c.itemModel).map(c=>c.dataset.key);
                const groupFilter=features?.filters[scope].groups;
                const groupId=scope==='group'?state.groupId:groupFilter?.length===1?groupFilter[0]:null;
                if(groupId!==null){
                    const allKeys=openItems(state.tabs,state.groups,{windowId:gridWindow(target),groupId}).map(item=>item.key);keys=mergeVisibleOrder(allKeys,keys);
                }else{
                    const allKeys=openItems(state.tabs,state.groups,{windowId:gridWindow(target)}).filter(item=>Boolean(item.tab?.pinned)===gridPinned(target)).map(item=>item.key);keys=mergeVisibleOrder(allKeys,keys);
                }
                return rpc('reorder',{keys,windowId:gridWindow(target),groupId,pinned:gridPinned(target)});
            });
            animations.get(container).enable();
            if (refreshPending) scheduleRefresh();
            } finally {
                clearHandoffPreview();if(!returning)returnCard(evt.item);
            }
        }
    }));
}

function unregisterGrid(container) {
    sortables.get(container)?.destroy(); sortables.delete(container);
    animations.get(container)?.disable(); animations.delete(container);
    motionViews.delete(container);
    intentCleanup.get(container)?.(); intentCleanup.delete(container);
}
for (const container of [$('grid'), $('pinned-grid'), $('group-grid')]) registerGrid(container, container === $('group-grid') ? 'group' : 'root');

const cardSwipe=mountCardSwipe({getPrefs:()=>preferences,available:card=>!state.busy&&!state.dragging&&state.view==='open'&&!selecting[card.closest('.grid-container')?.dataset.scope||'root'],close:item=>closeTabs(item.members?.map(t=>t.id)||[item.tab.id]),motion:materialMotion});

const collapsedWindows = new Set((()=>{try{const saved=JSON.parse(sessionStorage.getItem('tabgridCollapsedWindows')||'[]');return Array.isArray(saved)?saved.filter(Number.isInteger):[];}catch{return [];}})());
function rememberWindowExpansion(){try{sessionStorage.setItem('tabgridCollapsedWindows',JSON.stringify([...collapsedWindows]));}catch{/* Session persistence may be unavailable. */}}
function paintWindowSections(items) {
    const sections = $('opt-all-windows').checked ? windowSections(items, state.windowId, state.windowOrder) : windowSections(items,state.windowId);
    const ids = new Set(sections.map(s => s.windowId));
    for (const [id, view] of windowViews) if (!ids.has(id)) {
        unregisterGrid(view.pinned); unregisterGrid(view.regular); view.section.remove(); windowViews.delete(id);
    }
    const ordered = [];
    for (const { windowId, items: members } of sections) {
        let view = windowViews.get(windowId);
        if (!view) {
            const section = el('section', 'window-section');
            const heading = el('h3'); const title = el('button','window-toggle'); title.type='button'; heading.append(title); title.id = `window-${windowId}-heading`; section.setAttribute('aria-labelledby', title.id);
            const pinnedArea = el('div', 'window-pinned'); pinnedArea.append(el('h4', '', tr("Pinned")));
            const pinned = el('div', 'grid-container'); pinned.id = `window-${windowId}-pinned`;pinned.dataset.windowId=windowId;pinned.dataset.pinned='true';
            const regular = el('div', 'grid-container'); regular.id = `window-${windowId}-grid`;regular.dataset.windowId=windowId;
            pinnedArea.append(pinned); const content=el('div','window-content'); content.id=`window-${windowId}-content`; content.append(pinnedArea,regular); section.append(heading,content); title.setAttribute('aria-controls',content.id);
            title.onclick=()=>{if(collapsedWindows.has(windowId))collapsedWindows.delete(windowId);else collapsedWindows.add(windowId);rememberWindowExpansion();render({disclosure:true});title.focus({preventScroll:true});};
            view = { section, title, content, pinnedArea, pinned, regular }; windowViews.set(windowId, view);
            $('window-sections').append(section); registerGrid(pinned, 'root'); registerGrid(regular, 'root');
        }
        const wasHidden=view.content.hasAttribute('data-collapsed'), collapsed=collapsedWindows.has(windowId);
        if(wasHidden!==collapsed)materialMotion.disclose(view.content,!collapsed,view.section);
        view.title.setAttribute('aria-expanded',String(!collapsed));
        view.section.style.setProperty('--window-color',Object.values(colors)[state.windowOrder.indexOf(windowId)%Object.values(colors).length]||colors.blue);
        const count = new Set(members.flatMap(i => i.members?.map(t => t.id) || [i.tab.id])).size;
        view.title.textContent = `${numberedWindow(windowId,state.windowOrder)}${windowId===state.windowId?tr(" · This window"):''} · ${count} ${count===1?tr('tab'):tr('tabs')}`;
        const pinned = members.filter(i => i.tab?.pinned), regular = members.filter(i => !i.tab?.pinned);
        paintCards(view.pinned, pinned, 'root'); paintCards(view.regular, regular, 'root'); view.pinnedArea.dataset.empty = String(!pinned.length); view.pinnedArea.hidden = !pinned.length;
        const index=sections.findIndex(s=>s.windowId===windowId),at=$('window-sections').children[index];if(at!==view.section)$('window-sections').insertBefore(view.section,at||null); if(!collapsed)ordered.push(...pinned, ...regular);

    }
    return ordered;
}

let renderedView;
function render(options) {
    const disclosure = options?.disclosure === true;
    if (state.pointerDown || state.dragging) { refreshPending = true; return; }
    const returningToTabs = renderedView === 'recent' && state.view !== 'recent';
    if(!returningToTabs&&!disclosure)captureGridLayout();
    renderedView=state.view;
    const finishNavigation=preferences.visualStyle==='glass'?()=>{}:materialMotion.capture([document.querySelector('.sources')]);
    features?.sync();
    const token = focusToken();
    const idleEnabled = !privateMode && preferences.inactiveDays > 0;
    document.querySelector('[data-view=inactive]').hidden = !idleEnabled;
    if (!idleEnabled && state.view === 'inactive') state.view = 'open';
    const query = $('search-input').value.trim();
    document.querySelector('[data-view=all]').hidden = !query;
    document.querySelectorAll('[data-view]').forEach(b => { if (b.dataset.view === state.view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    $('open-section').hidden = !['open', 'all', 'inactive'].includes(state.view);
    $('recent-section').hidden = privateMode || !['recent', 'all'].includes(state.view) || (state.view === 'all' && features?.hasFilters('root'));
    $('tab-count').textContent = `(${state.tabs.filter(t => $('opt-all-windows').checked || t.windowId === state.windowId).length})`;
    const inactive = privateMode ? new Set() : inactiveTabIds(state.tabs, preferences.inactiveDays, state.returned, Date.now(), { sites: preferences.idleSites, groups: protectedGroups });
    for (const tab of state.tabs) {
        const pair = splitMembers(tab,state.tabs);
        if (pair.some(member=>!inactive.has(member.id))) pair.forEach(member=>inactive.delete(member.id));
    }
    const shown = state.tabs.filter(t => state.view === 'inactive' ? inactive.has(t.id) : state.view === 'all' || !inactive.has(t.id));
    const items = openItems(shown, state.groups, { windowId: state.windowId, allWindows: $('opt-all-windows').checked, query, nested: $('opt-nested').checked, showGroups: $('opt-groups').checked, sort: $('sort-select').value, preferences, filters: features?.filters.root });
    const allWindows = $('opt-all-windows').checked;
    $('window-sections').hidden = !allWindows; $('grid').hidden = allWindows;
    const pinned = items.filter(i => i.tab?.pinned), regular = items.filter(i => !i.tab?.pinned);
    visibleItems.root = allWindows ? paintWindowSections(items) : [...pinned, ...regular];
    if (allWindows) { paintCards($('pinned-grid'), [], 'root'); paintCards($('grid'), [], 'root'); }
    else { paintWindowSections([]); paintCards($('pinned-grid'), pinned, 'root'); paintCards($('grid'), regular, 'root'); }
    const visibleKeys = new Set(visibleItems.root.map(i => i.key));
    selections.root = new Set([...selections.root].filter(k => visibleKeys.has(k)));
    $('pinned-section').hidden = allWindows || !pinned.length; $('open-empty').hidden = Boolean(items.length);
    $('open-empty').textContent = query ? tr("No open tabs match your search.") : tr("No tabs in this view. Open a new tab to get started.");
    if (state.groupId !== null) {
        const group = currentGroup();
        if (!group || !state.tabs.some(tab=>tab.groupId===group.id)) $('group-dialog').close();
        else {
            $('group-heading').replaceChildren(groupLabel(group),document.createTextNode(` (${state.tabs.filter(t => t.groupId === group.id).length})`));
            const groupItems = openItems(state.tabs, state.groups, { windowId: group.windowId, groupId: group.id, query: $('group-search').value, sort: $('sort-select').value, preferences, filters: features?.filters.group });
            visibleItems.group = groupItems;
            selections.group = new Set([...selections.group].filter(k => groupItems.some(i => i.key === k)));
            paintCards($('group-grid'), groupItems, 'group'); $('group-empty').hidden = Boolean(groupItems.length);
        }
    }
    renderSessions('recent', state.recent, state.recentError, tr("No recently closed tabs are available."));
    for(const scope of ['root','group']){const tip=$(`${scope}-drag-tip`),policy=gridPolicy($(scope==='root'?'grid':'group-grid'));tip.textContent=policy.tip;tip.hidden=!policy.tip;}
    if(returningToTabs)for(const motion of motionViews.values())motion.revealNext();
    syncSelection(false); restoreFocus(token); scrollToCreatedTab(); if(!disclosure)flushGridLayout();finishNavigation();
}
const expandedRecentWindows = new Set();
function renderSessions(source, items, error, empty) {
    const query = $('search-input').value;
    const filtered = filterRecentItems(items, query, preferences);
    const windowKeys = new Set(items.filter(item => item.isWindow).map(item => item.key));
    for (const key of expandedRecentWindows) if (!windowKeys.has(key)) expandedRecentWindows.delete(key);
    const list = $(`${source}-list`);
    const signature = JSON.stringify(filtered);
    if (list.dataset.signature !== signature) {
        list.dataset.signature = signature; list.replaceChildren();
        for (const item of filtered) {
            const row = el('div', 'session-row'); row.dataset.key = item.key;
            const details = el(item.isWindow ? 'span' : 'div', 'session-details'); details.append(el(item.isWindow ? 'span' : 'p', 'session-title', item.title));
            const when = item.time ? new Date(item.time * 1000).toLocaleString(currentLanguage()) : '';
            details.append(el(item.isWindow ? 'span' : 'div', 'session-meta', `${item.isWindow ? tr("Closed window") : domain(item.url)}${when ? ` · ${when}` : ''}`));
            const action = button(item.isWindow ? tr("Restore window") : tr("Restore tab"), () => run(async () => {
                await features?.record('root');
                await rpc('restoreSession', item.sessionId);
                await refreshRecent();
            }, tr("Session restored."))); action.dataset.part = 'open'; action.setAttribute('aria-label', `${action.textContent}: ${item.title}`);
            row.append(details, action); list.append(row);
            if (item.isWindow) {
                row.classList.add('session-window');
                const header = el('div', 'session-window-header');
                const content = el('div', 'session-window-content');
                const tabs = el('ul', 'session-tabs');
                content.id = `${source}-window-${item.sessionId}-tabs`;
                content.append(tabs);
                const toggle = button('', () => {
                    if (expandedRecentWindows.has(item.key)) expandedRecentWindows.delete(item.key);
                    else expandedRecentWindows.add(item.key);
                    syncExpanded();
                }, 'session-expand');
                toggle.dataset.part = 'expand';
                toggle.setAttribute('aria-controls', content.id);
                const chevron = el('span', 'session-chevron'); chevron.setAttribute('aria-hidden', 'true'); toggle.append(chevron, details);
                function syncExpanded() {
                    const expanded = expandedRecentWindows.has(item.key);
                    if (!expanded && content.contains(document.activeElement)) toggle.focus({preventScroll: true});
                    toggle.setAttribute('aria-expanded', String(expanded));
                    toggle.setAttribute('aria-label', `${expanded ? tr("Collapse window tabs") : tr("Expand window tabs")}: ${item.title}`);
                    content.toggleAttribute('data-collapsed', !expanded);
                    content.inert = !expanded;
                    content.setAttribute('aria-hidden', String(!expanded));
                }
                syncExpanded();
                for (const tab of item.tabs) {
                    const child = el('li', 'session-tab');
                    const title = tab.title || tab.url || tr("Closed tab");
                    const childDetails = el('div', 'session-details');
                    childDetails.append(el('p', 'session-title', title), el('div', 'session-meta', tab.url || ''));
                    const restore = button(tr("Restore tab"), () => run(async () => {
                        await features?.record('root');
                        await rpc('restoreSession', tab.sessionId);
                        await refreshRecent();
                    }, tr("Session restored.")));
                    restore.dataset.part = `restore-${tab.sessionId}`;
                    restore.setAttribute('aria-label', `${tr("Restore tab")}: ${title}`);
                    restore.disabled = !tab.sessionId;
                    if (restore.disabled) restore.title = tr("This session is no longer available to restore.");
                    child.append(childDetails, restore);
                    tabs.append(child);
                }
                header.append(toggle, action); row.replaceChildren(header, content);
                row.addEventListener('click', event => {
                    if (!event.target.closest('button,a,input,select,textarea') && !window.getSelection()?.toString()) toggle.click();
                });
            }
        }
    }
    $(`${source}-empty`).hidden = filtered.length > 0 && !error;
    $(`${source}-empty`).textContent = error || (query && items.length ? tr("No matches in this section.") : empty);
}
async function refresh() {
    if (state.pointerDown || state.dragging || state.busy) { refreshPending = true; return; }
    const revision = ++state.revision;
    try {
        const [tabs, groups, windowOrder] = await Promise.all([chrome.tabs.query({}), chrome.tabGroups.query({}), rpc('windowOrder')]);
        const safeTabs = tabs.filter(t => Boolean(t.incognito) === privateMode && !isGridUrl(t.url || t.pendingUrl, gridUrl));
        const [screenshots, lastOpened, returned] = await Promise.all([privateMode ? {} : chrome.storage.local.get(safeTabs.map(t => `screenshot_${t.id}`)), rpc('lastOpenedSnapshot'), privateMode ? state.returned : rpc('activitySnapshot')]);
        if (revision !== state.revision || state.pointerDown || state.dragging || state.busy) { refreshPending = true; return; }
        state.returned = returned;
        state.windowOrder = windowOrder || [...new Set(safeTabs.map(t=>t.windowId))]; state.lastOpened = lastOpened || {}; state.tabs = safeTabs; state.groups = groups; state.screenshots = screenshots; refreshPending = false; render();
    } catch (error) { announce(tr("Could not refresh tabs: {0}", [translateError(error.message)]), true); }
}
function scheduleRefresh() { clearTimeout(refreshTimer); refreshTimer = setTimeout(refresh, 100); }
async function refreshRecent() {
    if (privateMode) return;
    const revision = ++recentRevision;
    try { const sessions = await chrome.sessions.getRecentlyClosed(); if (revision !== recentRevision) return; state.recent = recentItems(sessions, gridUrl); state.recentError = ''; }
    catch { state.recentError = tr("Recently closed tabs could not be loaded. Try Refresh."); }
    if (!state.dragging && !state.busy) render();
}
function placeUndo(){undoPopover.place();statusPopover.place();}
const undoNotice = new UndoNotice({ duration: () => preferences.undoMs, change(entry) {
    const toast = $('undo-toast');
    const focused = toast.contains(document.activeElement);
    undoPopover.set(Boolean(entry));
    if (entry) $('undo-message').textContent = entry.kind==='split'?tr('Split views separated.'):entry.kind==='grouping'?tr("Tab grouping changed."):tr("{0} closed tab(s)", [entry.tabs.filter(t => t.state === 'closed' || t.state === 'restored').length]);
    else if (focused) ($('action-dialog').open ? $('action-cancel') : $('group-dialog').open ? $('group-done') : $('search-input')).focus({ preventScroll: true });
    placeUndo();
} });
let undoRevision = 0;
async function updateUndo() {
    if (privateMode) { undoNotice.dismiss(); return; }
    const revision = ++undoRevision;
    const { tabgridUndo = [] } = await chrome.storage.session.get('tabgridUndo');
    if (revision === undoRevision) undoNotice.observe(tabgridUndo);
}
$('undo-toast').addEventListener('pointerenter', () => undoNotice.pause('hover'));
$('undo-toast').addEventListener('pointerleave', () => undoNotice.resume('hover'));
$('undo-toast').addEventListener('focusin', () => undoNotice.pause('focus'));
$('undo-toast').addEventListener('focusout', e => { if (!$('undo-toast').contains(e.relatedTarget)) undoNotice.resume('focus'); });
let modalScroll, headerFolded = false;
function syncHeaderFold(folded) {
    if (folded === headerFolded) return;
    const header = document.querySelector('.page-header'), surface = header.querySelector('.header-surface'), current = getComputedStyle(surface);
    const before = {transform:current.transform,opacity:current.opacity};
    materialMotion.cancel(surface); headerFolded = folded;
    header.classList.toggle('header-folded', folded); header.inert = folded;
    const after = getComputedStyle(surface);
    materialMotion.play(header, surface, [before,{transform:after.transform,opacity:after.opacity}], {anchor:header});
}
function syncModal() {
    const menuOpen = $('context-menu').matches(':popover-open') || $('page-menu').matches(':popover-open');
    const open = $('group-dialog').open || $('action-dialog').open || $('settings-dialog').open || $('thumbnail-tour').open || menuOpen;
    document.documentElement.classList.toggle('menu-open', menuOpen);
    syncHeaderFold($('context-menu').matches(':popover-open') && menuFocus?.scope === 'root' && !$('group-dialog').open);
    document.querySelectorAll('.card.menu-active').forEach(card => card.classList.remove('menu-active'));
    if ($('context-menu').matches(':popover-open') && menuFocus?.key) {
        const container = menuFocus.scope === 'group' ? $('group-grid') : document.querySelector('main');
        [...container.querySelectorAll('.card')].find(card => card.dataset.key === menuFocus.key)?.classList.add('menu-active');
    }
    if (open && !document.documentElement.classList.contains('modal-open')) modalScroll = { x: scrollX, y: scrollY };
    document.documentElement.classList.toggle('modal-open', open);
    if (!open && modalScroll) { window.scrollTo(modalScroll.x, modalScroll.y); modalScroll = null; }
    placeUndo();
}
async function closeTabs(ids, confirmed = false) {
    ids = [...new Set(ids)].filter(id => state.tabs.some(t => t.id === id));
    if (!ids.length) return;
    if (!confirmed && needsConfirmation(ids.length, preferences)) { showCloseConfirmation(ids, tr("Close selected tabs?")); return; }
    const result = await run(() => rpc('close', ids));
    if (result?.count && !result.error) announce(tr("{0} tab(s) closed.{1}", [result.count, privateMode ? '' : tr(" Undo is available.")]));
}
let actionOpener;
function showAction(title, fields, handler, submit = tr("Apply")) {
    actionOpener=document.activeElement; features?.hideHistory(); closeMenu(); closePageMenu();
    $('action-title').textContent = title; $('action-fields').replaceChildren(...fields); $('action-submit').textContent = submit; $('action-submit').disabled = false; $('action-error').textContent = '';
    actionHandler = handler; $('action-dialog').showModal(); syncModal();
}
function field(label, input) { const wrapper = el('label', input.type === 'checkbox' ? 'checkbox-label' : ''); wrapper.append(document.createTextNode(label), input); return wrapper; }
function options(entries) { const select = el('select'); entries.forEach(([value, text]) => { const o = el('option', '', text); o.value = value; select.append(o); }); return select; }
function confirmClose(ids, title) {
    ids = [...new Set(ids)].filter(id => state.tabs.some(t => t.id === id));
    if (!ids.length) return;
    if (!needsConfirmation(ids.length, preferences)) { closeTabs(ids, true); return; }
    showCloseConfirmation(ids, title);
}
function showCloseConfirmation(ids, title) {
    showAction(title, [el('p', '', tr("{0} {1} will close.{2}", [ids.length, ids.length === 1 ? tr('tab') : tr('tabs'), privateMode ? tr(" Incognito closes cannot be undone here.") : tr(" You can undo this action.")]))], () => rpc('close', ids), tr("Close tabs"));
}
function createGroupDialog(ids = null, windowId = null) {
    const name=el('input');name.type='text';name.placeholder=tr("Group name");
    const color=groupColorPicker();
    showAction(tr("New tab group"),[field(tr("Name"),name),color.field],async()=>{
        if(ids){
            if(windowId!==null)return rpc('dropIntoGroup',ids,'new',windowId,{title:name.value,color:color.value});
            return rpc('group',ids,null,name.value,color.value);
        }
        const tab=await chrome.tabs.create({windowId:state.windowId,active:false});
        const groupId=await rpc('group',[tab.id],null,name.value,color.value);
        await finishNewTab({...tab,groupId});
    },tr("Create group"));
}
function openGroup(id) {
    features?.capture('root');
    groupOpener = document.activeElement; groupMotionId=id;
    state.groupId = id; selections.group.clear(); selecting.group = false; $('group-search').value = '';
    const motion=motionViews.get($('group-grid')); motion?.beginReveal();
    render(); if (!$('group-dialog').open) $('group-dialog').showModal(); syncModal();
    return Promise.resolve(features?.openGroup(id)).catch(error => announce(translateError(error.message),true)).finally(() => {
        requestAnimationFrame(() => requestAnimationFrame(() => { if(state.groupId===id)motion?.endReveal(); }));
    });
}
let menuOpener;
let menuFocus;
function focusMenuOpener() {
    const container = menuFocus?.scope === 'group' ? $('group-grid') : document.querySelector('main');
    const card = [...(container?.querySelectorAll('[data-key]') || [])].find(c => c.dataset.key === menuFocus?.key);
    (menuOpener?.isConnected ? menuOpener : card?.querySelector('.card-menu') || $('search-input')).focus({ preventScroll: true });
}
let submenuOpener, submenuHover;
const submenuHovers = new Set();
function closeSubmenu() { submenuRevision++; const sub = $('context-submenu'); if (sub.matches(':popover-open')) sub.hidePopover(); submenuOpener?.setAttribute('aria-expanded', 'false'); }
window.addEventListener('resize', closeMenu);
$('context-menu').addEventListener('beforetoggle', e => { if (e.newState === 'closed') { for(const hover of submenuHovers)hover.reset(); closeSubmenu(); } });
$('context-menu').addEventListener('toggle', syncModal);
function closeMenu() { menuOpener?.setAttribute('aria-expanded', 'false'); closeSubmenu(); const menu = $('context-menu'); if (menu.matches(':popover-open')) menu.hidePopover(); syncModal(); }
function menuContent(menu){let content=menu.querySelector(':scope > .menu-scroll');if(!content){content=el('div','menu-scroll');content.append(...[...menu.childNodes].filter(n=>!n.matches?.('.filter-glass-surface,[data-motion-cue],[popover]')));menu.append(content);}return content;}
menuContent($('page-menu'));
function menuDivider(menu) { const d = el('div'); d.setAttribute('role', 'separator'); menuContent(menu).append(d); }
function menuAction(menu, label, handler, { disabled = false, danger = false } = {}) {
    const b = button(label, () => { closeMenu(); handler(); }, danger ? 'danger' : '');
    b.setAttribute('role', 'menuitem'); b.disabled = state.busy || disabled;
    if (menu === $('context-menu')) b.addEventListener('pointerenter', () => {if(!submenuHover?.inGrace())closeSubmenu();});
    menuContent(menu).append(b); return b;
}
function menuSubmenu(menu, label, entries, disabled = false) {
    const trigger = button(label, () => {}, 'has-submenu');
    trigger.setAttribute('role', 'menuitem'); trigger.setAttribute('aria-haspopup', 'menu'); trigger.setAttribute('aria-expanded', 'false'); trigger.disabled = state.busy || disabled;
    const hover=bindSubmenuHover(trigger,{
        active:()=>trigger.isConnected&&menu.matches(':popover-open'),
        submenu:()=>submenuOpener===trigger&&$('context-submenu').matches(':popover-open')?$('context-submenu'):null,
        blocked:()=>submenuHover!==hover&&submenuHover?.inGrace(),
        contains:node=>trigger.contains(node)||(submenuOpener===trigger&&$('context-submenu').contains(node)),
        open:()=>{submenuHover=hover;openSubmenu(trigger,entries,false);},
        close:()=>{if(submenuOpener===trigger)closeSubmenu();}
    });
    trigger.addEventListener('keydown',event=>{if(event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();hover.reset();submenuHover=hover;openSubmenu(trigger,entries,true);}});
    trigger.addEventListener('click',()=>{
        const opened=submenuOpener===trigger&&$('context-submenu').matches(':popover-open');
        hover.reset();
        if(opened)closeSubmenu();else{submenuHover=hover;openSubmenu(trigger,entries,false);}
    });
    submenuHovers.add(hover);
    menuContent(menu).append(trigger);
}
async function windowEntries(ids) {
    const sourceWindows = new Set(state.tabs.filter(t => ids.includes(t.id)).map(t => t.windowId));
    const windows = (await chrome.windows.getAll({ windowTypes: ['normal'], populate: true })).filter(w => Boolean(w.incognito) === privateMode && !(sourceWindows.size === 1 && sourceWindows.has(w.id)));
    const entries = [[tr("New Window"), () => run(() => rpc('move', ids, null), tr("Tabs moved."))]];
    if (windows.length) entries.push(null);
    for (const window of windows) {
        const tabs = window.tabs || await chrome.tabs.query({ windowId: window.id });
        entries.push([windowLabel(tabs), () => run(() => rpc('move', ids, window.id), tr("Tabs moved."))]);
    }
    return entries;
}
function populateTabActions(menu, ids, scope, item = null, { insideGroup = false } = {}) {
    const members = state.tabs.filter(t => ids.includes(t.id));
    const oneWindow = new Set(members.map(t => t.windowId)).size === 1;
    const group = item?.kind === 'group';
    const title = item?.tab?.title || item?.group?.title || tr("Selected tabs");
    const add = (label, handler, opts = {}) => menuAction(menu, label, handler, { disabled: !members.length, ...opts });
    if (group) {
        add(tr("New Tab in Group"), () => newTab(item.group.id));
        if (!insideGroup) menuSubmenu(menu,tr('Thumbnail layout'),()=>[
            ['grid',tr('Grid')],['split',tr('Side by side')],['featured',tr('Featured')]
        ].map(([layout,label])=>[label,()=>run(async()=>{
            const key=groupLayoutKey(item.group.id);
            await chrome.storage.session.set({[key]:layout});groupLayouts[key]=layout;render();
        }),null,{layout,selected:groupLayout(item.group.id)===layout}]));
    }
    else add(tr("New Tab After Selected"), () => run(async () => { const tab=await rpc('newAfter', ids, false); await finishNewTab(tab);return tab; }), { disabled: !oneWindow });
    if (item?.splitViewId !== undefined) {
        menuSubmenu(menu,tr('Arrange split view'),()=>{
            return [
                [tr('Separate views'),()=>run(()=>rpc('separateSplit',item.splitViewId))],null,
                [tr('Close left view'),()=>closeTabs([item.members[0].id])],
                [tr('Close right view'),()=>closeTabs([item.members[1].id])]
            ];
        });
    }
    menuSubmenu(menu, members.length > 1 ? tr("Add Tabs to Group") : tr("Add Tab to Group"), () => {
        const groups = state.groups.filter(g => g.windowId === members[0]?.windowId);
        return [
            [tr("New Group"), () => createGroupDialog(ids)],
            ...(groups.length ? [null] : []),
            ...groups.map(g => [g.title || tr("Untitled group"), () => run(() => rpc('group', ids, g.id), tr("Tabs grouped.")),g])
        ];
    }, !oneWindow || members.some(t => t.pinned));
    if (members.some(t => t.groupId !== -1)) add(tr("Ungroup"), () => run(() => rpc('ungroup',ids), tr("Tabs ungrouped.")));
    menuSubmenu(menu, members.length > 1 ? tr("Move Tabs to Another Window") : tr("Move Tab to Another Window"), () => windowEntries(ids), members.some(tab=>tab.splitViewId>=0));
    if (!group) {
        menuDivider(menu);
        add(tr("Reload"), () => run(async () => { for (const tab of members) { if (!privateMode && /^https?:/.test(tab.url || '')) await rpc('preview', 'clear', tab.id); await chrome.tabs.reload(tab.id); } }));
        add(tr("Duplicate"), () => run(() => rpc('duplicate', ids)));
        const pinned = members.length > 0 && members.every(t => t.pinned);
        add(pinned ? tr("Unpin") : tr("Pin"), () => run(async () => { for (const tab of members) await chrome.tabs.update(tab.id, { pinned: !pinned }); }));
        let muted = false;
        const sound = add(tr("Mute Site"), async () => {
            let permission;
            try { permission = await chrome.permissions.request({ permissions: ['contentSettings'] }); }
            catch (error) { announce(translateError(error.message), true); return; }
            if (!permission) { announce(tr("Site sound permission was not granted."), true); return; }
            await run(async () => { const current = await rpc('siteSoundSnapshot', ids); return rpc('setSiteSound', ids, !(current?.muted ?? muted)); }, tr("Site sound updated."));
        }, { disabled: !siteOrigins(members).length });
        rpc('siteSoundSnapshot', ids).then(value => { if (sound.isConnected && value) { muted = value.muted; sound.textContent = muted ? tr("Unmute Site") : tr("Mute Site"); } }).catch(() => {});
    }
    if (!privateMode) {
        menuDivider(menu);
        add(members.length > 1 ? tr("Add Tabs to Reading List") : tr("Add Tab to Reading List"), () => addLinks(ids, 'readingList', title));
    }
    if (!privateMode && item?.tab && item.splitViewId === undefined && /^https?:/.test(item.tab.url || '')) {
        menuDivider(menu);
        menuContent(menu).append(el('div','menu-name',tr("Preview")));
        const excluded = siteMatches(item.tab.url, preferences.previewSites);
        add(excluded ? tr("Allow previews for this website") : tr("Stop previews for this website"), () => run(() => rpc('preview', excluded ? 'allow' : 'exclude', item.tab.id), tr("Preview preference updated.")));
        add(tr("Clear this tab’s preview"), () => run(() => rpc('preview','clear',item.tab.id), tr("Preview cleared.")));
    }
    menuDivider(menu);
    if (insideGroup) add(selectionActive(selecting.group, selections.group) ? tr("Done") : tr("Select Tabs"), () => {
        selecting.group = !selectionActive(selecting.group, selections.group); selections.group.clear(); syncSelection();
    });
    else if (!selectionActive(selecting[scope], selections[scope]) && item) add(tr("Select"), () => { selecting[scope] = true; selections[scope].add(item.key); syncSelection(); });
    if (!privateMode) add(tr("Bookmark Tabs…"), () => addLinks(ids, 'bookmarks', title));
    add(tr("Copy Links"), () => copyLinks(ids));
    if (state.view === 'inactive') add(tr("Return to Tabs"), () => run(() => rpc('returnActive', ids), tr("Returned to tabs.")));
    menuDivider(menu);
    add(insideGroup && features?.hasFilters('group') ? tr("Close Matching Tabs") : tr("Close"), () => group || ids.length > 1 ? confirmClose(ids, group ? tr("Delete this group?") : tr("Close selected tabs?")) : closeTabs(ids), { danger: true });
    if (insideGroup) return;
    const others = relativeTabIds(actionTabs(scope), ids, 'others'), after = relativeTabIds(actionTabs(scope), ids, 'after');
    add(tr("Close Other Unpinned Tabs…"), () => confirmClose(others, tr("Close other unpinned tabs?")), { danger: true, disabled: !others.length });
    add(tr("Close Unpinned Tabs After Selected…"), () => confirmClose(after, tr("Close unpinned tabs after selected?")), { danger: true, disabled: !after.length });
}
function prepareMenu(scope, event, key) {
    features?.hideHistory();
    const opener = event.currentTarget.matches('button') ? event.currentTarget : event.currentTarget.querySelector('.card-menu:not([hidden]), .card-open') || event.currentTarget;
    if ($('context-menu').matches(':popover-open') && menuOpener === opener) { closeMenu(); focusMenuOpener(); return null; }
    closeMenu(); closePageMenu(); menuFocus = { key, scope }; menuOpener = opener;
    const menu = $('context-menu');
    ($('group-dialog').open ? $('group-dialog') : document.body).append(menu);
    for(const hover of submenuHovers)hover.reset(); submenuHovers.clear();
    document.body.append($('context-submenu')); menuContent(menu).replaceChildren();
    return menu;
}
containMenuFocus(document, () => {
    if ($('context-menu').matches(':popover-open')) return {
        menu: $('context-menu'), submenu: $('context-submenu').matches(':popover-open') ? $('context-submenu') : null,
        close: () => { closeMenu(); focusMenuOpener(); },
        escape: () => { if ($('context-submenu').matches(':popover-open')) { closeSubmenu(); submenuOpener?.focus(); } else { closeMenu(); focusMenuOpener(); } }
    };
    if ($('page-menu').matches(':popover-open')) return { menu: $('page-menu'), close: () => { closePageMenu(); $('page-menu-btn').focus(); }, escape: () => { closePageMenu(); $('page-menu-btn').focus(); } };
    return null;
});
function showSelectionMenu(scope, event) {
    const menu = prepareMenu(scope, event); if (!menu) return;
    menu.setAttribute('aria-label', tr("Edit selected tabs"));
    const ids = tabIds(scope); menuContent(menu).append(el('div', 'menu-name', tr("{0} selected tabs", [ids.length])));
    populateTabActions(menu, ids, scope); positionMenu(menu, event);
}
function showMenu(item, scope, event, { insideGroup = false } = {}) {
    const menu = prepareMenu(scope, event, item.key); if (!menu) return;
    menu.setAttribute('aria-label', item.kind === 'group' ? tr("Group actions") : tr("Tab actions"));
    const ids = item.kind === 'group' ? (insideGroup ? actionTabs(scope) : state.tabs).filter(t => t.groupId === item.group.id).map(t => t.id) : item.members?.map(tab => tab.id) || [item.tab.id];
    if (item.kind === 'group') {
        const header = el('div', 'menu-group-header');
        const input = el('input'); input.type = 'text'; input.value = item.group.title || ''; input.placeholder = tr("Name this group"); input.setAttribute('aria-label', tr("Group name"));
        const rename = () => { if (input.value !== item.group.title) run(() => chrome.tabGroups.update(item.group.id, { title: input.value }), tr("Group renamed.")); };
        input.addEventListener('change', rename);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); rename(); } });
        const palette = el('div', 'menu-colors'); palette.setAttribute('role', 'group'); palette.setAttribute('aria-label', tr("Group color"));
        for (const [color, value] of Object.entries(colors)) {
            const dot = button('', () => run(async () => { await chrome.tabGroups.update(item.group.id, { color }); palette.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(b === dot))); }, tr("Group color changed.")));
            dot.style.setProperty('--dot', value); dot.setAttribute('aria-label', color); dot.title = color; dot.setAttribute('role', 'menuitemradio'); dot.setAttribute('aria-checked', String(item.group.color === color)); palette.append(dot);
        }
        header.append(input, palette); menuContent(menu).append(header);
    } else menuContent(menu).append(el('div', 'menu-name', item.members?.map(tab=>tab.title || tab.url).join(' · ') || item.tab.title || item.tab.url || 'Tab'));
    populateTabActions(menu, ids, scope, item, { insideGroup }); positionMenu(menu, event);
}
function positionMenu(menu, event) {
    menu.style.maxHeight = '';
    menu.showPopover(); menuOpener?.setAttribute('aria-expanded', 'true'); syncModal();
    const bounds = menuOpener.getBoundingClientRect();
    const context = event.type === 'contextmenu' && event.clientX;
    const x = context ? event.clientX : bounds.left;
    let y;
    if (context) y = Math.max(8, Math.min(event.clientY, innerHeight - menu.offsetHeight - 8));
    else {
        const layout = anchoredMenuLayout(bounds, menu.offsetWidth, menu.offsetHeight, innerWidth, innerHeight);
        menu.style.maxHeight = `${layout.height}px`;
        y = layout.top;
    }
    menu.style.left = `${Math.max(8, Math.min(x, innerWidth - menu.offsetWidth - 8))}px`;
    menu.style.top = `${Math.max(8, y)}px`;
    menu.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
}
let submenuRevision = 0;
async function openSubmenu(trigger, entries, focus = true) {
    if (submenuOpener === trigger && $('context-submenu').matches(':popover-open')) { if (focus) $('context-submenu').querySelector('button')?.focus(); return; }
    closeSubmenu(); submenuOpener = trigger; const revision = ++submenuRevision;
    const sub = $('context-submenu'); $('context-menu').append(sub); menuContent(sub).replaceChildren(); sub.classList.remove('layout-submenu'); sub.setAttribute('aria-label', trigger.textContent);
    menuContent(sub).append(el('div', 'menu-name', tr("Loading…"))); sub.showPopover(); trigger.setAttribute('aria-expanded', 'true');
    const place = () => { const r = trigger.getBoundingClientRect(); sub.style.left = `${Math.max(8, r.right + sub.offsetWidth + 8 < innerWidth ? r.right : r.left - sub.offsetWidth)}px`; sub.style.top = `${Math.max(8, Math.min(r.top, innerHeight - sub.offsetHeight - 8))}px`; };
    place();
    try {
        const values = typeof entries === 'function' ? await entries() : entries;
        if (revision !== submenuRevision || !sub.matches(':popover-open')) return;
        menuContent(sub).replaceChildren();
        for (const entry of values) { if (!entry) { menuDivider(sub); continue; } const [label, handler, group, view] = entry; const action=menuAction(sub,label,handler);if(group)action.replaceChildren(groupLabel(group));
            if(view){
                sub.classList.add('layout-submenu');action.setAttribute('role','menuitemradio');action.setAttribute('aria-checked',String(view.selected));
                const sample=el('span','layout-sample group-preview');sample.dataset.layout=view.layout;sample.setAttribute('aria-hidden','true');
                for(let i=0;i<GROUP_LAYOUTS[view.layout];i++)sample.append(el('span','group-tile'));
                action.setAttribute('aria-label',label);
                action.replaceChildren(sample);
            }
        }
        place(); if (focus) sub.querySelector('button')?.focus();
    } catch (error) { if (revision === submenuRevision && sub.matches(':popover-open')) menuContent(sub).replaceChildren(el('div', 'menu-name', translateError(error.message))); }
}
for(const type of ['pointerout','mouseout'])$('context-submenu').addEventListener(type,event=>submenuHover?.leave(event));
$('context-submenu').addEventListener('keydown', e => {
    e.stopPropagation();
    if (['ArrowLeft', 'Escape'].includes(e.key)) { e.preventDefault(); closeSubmenu(); submenuOpener?.focus(); return; }
    const buttons = [...$('context-submenu').querySelectorAll('button')]; const i = buttons.indexOf(document.activeElement);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) { e.preventDefault(); buttons[e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus(); }
    if (e.key === 'Tab') closeMenu();
});
$('context-menu').addEventListener('keydown', e => {
    if (e.target.matches('input') && e.key !== 'Escape') return;
    const buttons = [...$('context-menu').querySelectorAll('button:not(:disabled)')].filter(b => !b.closest('#context-submenu'));
    const i = buttons.indexOf(document.activeElement);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
        e.preventDefault(); e.stopPropagation();
        const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next]?.focus();
    }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(); focusMenuOpener(); }
    if (e.key === 'Tab') closeMenu();
});
async function addLinks(ids, destination, title = tr("Saved tabs")) {
    // Request directly from the click handler, before any other asynchronous work.
    try {
        const granted = await chrome.permissions.request({ permissions: [destination] });
        if (!granted) { announce(tr("Permission was not granted. Nothing was saved.")); return; }
        if (destination !== 'bookmarks') { await run(() => rpc('addLinks', ids, destination, title), tr("Tabs added to Reading List.")); return; }
        const [tree, preferences] = await Promise.all([chrome.bookmarks.getTree(), chrome.storage.local.get('bookmarkParentId')]);
        const folders = bookmarkFolders(tree);
        if (!folders.length) throw new Error(tr("No writable bookmark folders are available."));
        const target = options(folders.map(f => [f.id, f.path]));
        target.value = folders.find(f => f.id === preferences.bookmarkParentId)?.id || folders.find(f => f.folderType === 'other')?.id || folders[0].id;
        const createFolder = el('input'); createFolder.type = 'checkbox'; createFolder.setAttribute('role', 'switch');
        const name = el('input'); name.type = 'text'; name.value = title; name.required = true; name.disabled = true;
        const nameField = field(tr("New folder name"), name); nameField.hidden = true;
        createFolder.onchange = () => { nameField.hidden = name.disabled = !createFolder.checked; };
        showAction(tr("Bookmark tabs"), [field(tr("Destination folder"), target), field(tr("Create a new subfolder"), createFolder), nameField],
            () => rpc('addLinks', ids, destination, title, { parentId: target.value, ...(createFolder.checked ? { newFolderTitle: name.value } : {}) }), tr("Bookmark tabs"));
    } catch (error) { announce(translateError(error.message), true); }
}
async function copyLinks(ids) {
    const text = state.tabs.filter(t => ids.includes(t.id)).map(t => `${t.title || t.url}\n${t.url || t.pendingUrl}`).join('\n\n');
    try { await navigator.clipboard.writeText(text); announce(tr("Links copied.")); }
    catch { const input = el('textarea'); input.value = text; input.readOnly = true; input.rows = 8; showAction(tr("Copy links"), [field(tr("Select and copy these links"), input)], async () => {}, tr("Done")); input.focus(); input.select(); }
}
async function finishNewTab(tab) {
    if(preferences.switchNewTab){await chrome.tabs.update(tab.id,{active:true});await chrome.windows.update(tab.windowId,{focused:true});}
    else {await rpc('returnActive',[tab.id]);pendingNewTab={id:tab.id,groupId:tab.groupId};}
}
function scrollToCreatedTab() {
    const pending=pendingNewTab;if(!pending)return;pendingNewTab=null;
    requestAnimationFrame(()=>{
        const groupId=state.tabs.find(t=>t.id===pending.id)?.groupId??pending.groupId;
        const grid=$('group-dialog').open&&state.groupId===groupId?$('group-grid'):$('open-section');
        const key=grid===$('group-grid')?`tab:${pending.id}`:groupId!==-1&&groupId!==undefined?`group:${groupId}`:`tab:${pending.id}`;
        const card=[...grid.querySelectorAll('.card[data-key]')].find(c=>c.dataset.key===key&&!c.closest('[hidden],[inert]'))||[...grid.querySelectorAll('.card[data-key]')].find(c=>c.dataset.key===`tab:${pending.id}`&&!c.closest('[hidden],[inert]'));
        if(card)card.scrollIntoView({block:'nearest',behavior:materialMotionAllowed(preferences.visualStyle,preferences.motion,motionMedia.matches)?'smooth':'instant'});else announce(tr("New tab created. Clear the active search or filters to see it."));
    });
}
async function newTab(groupId = null) {
    await run(async () => {
        const group = groupId === null ? null : await chrome.tabGroups.get(groupId);
        const tab = await chrome.tabs.create({ windowId: group?.windowId || state.windowId, active: false });
        if (group) await chrome.tabs.group({ tabIds: [tab.id], groupId });
        await finishNewTab({...tab,groupId:groupId??-1});
    });
}

$('action-form').addEventListener('submit', async e => {
    e.preventDefault(); if (state.busy) return;
    state.busy = true; $('action-submit').disabled = true; let partial = false;
    try { const result = await actionHandler(); if (result?.error) { partial = result.count > 0; $('action-error').textContent = result.error; } else { $('action-dialog').close(); announce(tr("Done.")); } }
    catch (error) { $('action-error').textContent = translateError(error.message); }
    finally { state.busy = false; $('action-submit').disabled = partial; await refresh(); await refreshRecent(); await updateUndo(); }
});
$('action-dialog').addEventListener('close', () => { syncModal(); (actionOpener?.isConnected&&actionOpener.getClientRects().length?actionOpener:$('page-menu-btn')).focus({preventScroll:true}); });
let actionBackdropPress=false;
const actionBackdrop=e=>{const dialog=$('action-dialog'),r=dialog.getBoundingClientRect();return e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);};
$('action-dialog').addEventListener('pointerdown',e=>{actionBackdropPress=e.button===0&&actionBackdrop(e);});
$('action-dialog').addEventListener('pointerup',e=>{if(actionBackdropPress&&actionBackdrop(e)&&!state.busy)$('action-dialog').close();actionBackdropPress=false;});
$('action-dialog').addEventListener('pointercancel',()=>{actionBackdropPress=false;});
$('action-cancel').onclick = () => $('action-dialog').close();
$('group-done').onclick = () => groupTransition.close();
$('group-dialog').addEventListener('cancel',event=>{event.preventDefault();groupTransition.close();});
$('group-dialog').addEventListener('close', () => {
    features?.closeGroup();
    const id = state.groupId; state.groupId = null; selections.group.clear(); selecting.group = false;
    syncModal(); closeMenu();
    const opener = scopeGrids('root').flatMap(grid => [...grid.children]).find(c => c.dataset.key === keyFor('group', id))?.querySelector('.card-open');
    if(!state.dragging)(opener || (groupOpener?.isConnected ? groupOpener : $('search-input'))).focus({ preventScroll: true });
});
let backdropPress = false;
const onBackdrop = e => {
    const rect = $('group-dialog').getBoundingClientRect();
    return e.target === $('group-dialog') && (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom);
};
$('group-dialog').addEventListener('pointerdown', e => { backdropPress = e.button === 0 && onBackdrop(e); });
$('group-dialog').addEventListener('pointerup', e => { if (backdropPress && onBackdrop(e)) groupTransition.close(); backdropPress = false; });
$('group-dialog').addEventListener('pointercancel', () => { backdropPress = false; });
$('group-new').onclick = () => newTab(state.groupId);
$('group-menu-btn').onclick = event => {
    const group = currentGroup(); if (!group) return;
    showMenu({ kind: 'group', key: keyFor('group', group.id), group }, 'group', event, { insideGroup: true });
};
$('group-search').addEventListener('input', render);
function closePageMenu() {
    if ($('page-menu').matches(':popover-open')) $('page-menu').hidePopover();
    syncModal();
}
$('page-menu-btn').onclick = () => {
    const menu = $('page-menu');
    if (menu.matches(':popover-open')) { closePageMenu(); return; }
    closeMenu(); menu.style.maxHeight = ''; menu.showPopover(); syncModal();
    placePageMenu();
    menu.querySelector('input,button').focus({ preventScroll: true });
};
function placePageMenu() {
    const menu=$('page-menu'); if (!menu.matches(':popover-open')) return;
    const layout = anchoredMenuLayout($('page-menu-btn').getBoundingClientRect(), menu.offsetWidth, menu.offsetHeight, innerWidth, innerHeight, 'right');
    menu.style.maxHeight = `${layout.height}px`;
    menu.style.left = `${layout.left}px`; menu.style.top = `${layout.top}px`;
}
window.addEventListener('scroll', placePageMenu, {passive:true});
window.addEventListener('resize', placePageMenu);
$('page-menu').addEventListener('toggle', syncModal);
$('page-menu').addEventListener('beforetoggle', e => $('page-menu-btn').setAttribute('aria-expanded', String(e.newState === 'open')));
$('page-menu').addEventListener('click', e => { if (e.target.closest('button')) closePageMenu(); }, true);
$('page-menu').addEventListener('keydown', e => {
    e.stopPropagation();
    const buttons = [...$('page-menu').querySelectorAll('button:not(:disabled),input:not(:disabled)')];
    const i = buttons.indexOf(document.activeElement);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
        e.preventDefault(); buttons[e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
    }
    if (e.key === 'Escape') { e.preventDefault(); closePageMenu(); $('page-menu-btn').focus(); }
    if (e.key === 'Tab') closePageMenu();
});
window.addEventListener('resize', closePageMenu);
$('settings-btn').onclick = () => { features?.hideHistory(); settingsPanel.open(); syncModal(); };
$('settings-done').onclick = () => $('settings-dialog').close();
let settingsBackdropPress=false;
function settingsBackdrop(e){const r=$('settings-dialog').getBoundingClientRect();return e.target===$('settings-dialog')&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);}
$('settings-dialog').addEventListener('pointerdown',e=>{settingsBackdropPress=e.button===0&&settingsBackdrop(e);});
$('settings-dialog').addEventListener('pointerup',e=>{if(settingsBackdropPress&&settingsBackdrop(e))$('settings-dialog').close();settingsBackdropPress=false;});
$('settings-dialog').addEventListener('pointercancel',()=>{settingsBackdropPress=false;});
$('settings-dialog').addEventListener('close', () => { syncModal(); $('page-menu-btn').focus(); });
$('select-tabs-btn').onclick = () => {
    state.view = 'open'; selecting.root = true; render();
    $('root-toolbar').querySelector('[data-role=toggle]').focus();
};
$('new-group-btn').onclick = () => createGroupDialog();
$('new-tab-btn').onclick = () => newTab();
$('undo-btn').onclick = () => { const id = undoNotice.entry?.id; if (id) run(() => rpc('undo', id), tr("Action undone.")); };
$('dismiss-undo').onclick = () => undoNotice.dismiss();
$('close-window-btn').onclick = () => confirmClose(actionTabs('root').filter(t => t.windowId === state.windowId && !t.pinned).map(t => t.id), features?.hasFilters('root') ? tr("Close matching unpinned tabs in this window?") : tr("Close unpinned tabs in this window?"));
$('search-input').addEventListener('input', () => {
    if (state.view !== 'inactive') state.view = $('search-input').value.trim() ? 'all' : 'open'; render();
});
for (const [id,key] of [['opt-all-windows','allWindows'],['opt-nested','nested'],['opt-groups','searchGroups']]) $(id).addEventListener('change', () => { if(id==='opt-all-windows'){closePageMenu();$('opt-all-windows').setAttribute('aria-checked',String($('opt-all-windows').checked));}render(); if (!privateMode && (id === 'opt-all-windows' ? preferences.rememberScope : preferences.rememberOptions)) savePreferences({[key]:$(id).checked}).catch(e=>announce(translateError(e.message),true)); });
$('sort-select').addEventListener('change', () => { savePreferences({ sortMode: $('sort-select').value }).catch(e=>announce(translateError(e.message),true)); render(); });
const compactColumns = matchMedia('(max-width:650px)'), mediumColumns = matchMedia('(max-width:900px)');
function syncCardSizeLabel() {
    const preferred = 7 - Number($('size-slider').value);
    const columns = Math.min(preferred, compactColumns.matches ? 2 : mediumColumns.matches ? 3 : 6);
    $('size-slider').setAttribute('aria-valuetext', tr("{0} {1} per row{2}", [columns, columns === 1 ? tr('tab') : tr('tabs'), columns < preferred ? tr(" ({0} preferred on wider windows)", [preferred]) : '']));
    $('size-value').textContent = tr("{0} per row", [columns]);
}
compactColumns.addEventListener('change', syncCardSizeLabel);
mediumColumns.addEventListener('change', syncCardSizeLabel);
function applyCardSize(columns) {
    captureGridLayout();
    columns = cardColumns(columns);
    $('size-slider').value = 7 - columns;
    syncCardSizeLabel();
    const slider=$('size-range'), before=getComputedStyle(slider).getPropertyValue('--size-progress').trim(), after=`${(6 - columns) * 20}%`;
    if(slider.style.getPropertyValue('--size-progress')!==after){
        materialMotion.cancel(slider); slider.style.setProperty('--size-progress', after);
        if(before&&before!==after)materialMotion.play(slider.parentElement,slider,[{'--size-progress':before},{'--size-progress':after}]);
    }
    document.documentElement.style.setProperty('--card-columns', columns);
    flushGridLayout();
}
$('size-slider').addEventListener('input', () => applyCardSize(7 - Number($('size-slider').value)));
$('size-slider').addEventListener('change', () => savePreferences({ preferredColumns: 7 - Number($('size-slider').value) }).catch(e=>announce(translateError(e.message),true)));
const searchDisclosure = $('search-disclosure');
function syncSearchFocus() {}
const categoryTransition=createCategoryTransition({content:$('tab-content'),motion:materialMotion});
function switchCategory(view) {
    if(view===state.view)return;
    const views=[...document.querySelectorAll('.sources [data-view]:not([hidden])')].map(b=>b.dataset.view);
    const direction=views.indexOf(view)-views.indexOf(state.view);
    state.view=view;render();categoryTransition(direction);if(view==='recent')refreshRecent();
}
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => switchCategory(b.dataset.view)));
mountCategorySwipe({
    nav:document.querySelector('.sources'),
    available:()=>!state.busy&&!state.dragging&&!state.pointerDown&&!document.querySelector('dialog[open], [popover]:popover-open'),
    getView:()=>state.view,
    change:switchCategory
});
document.addEventListener('click',event=>{
    const summary=event.target.closest('summary');if(!summary)return;
    captureGridLayout();
},true);
document.addEventListener('toggle',event=>{const details=event.target;if(details.tagName!=='DETAILS')return;flushGridLayout();if(details.open){const content=details.querySelector('.live-filters,.theme-options');if(content)materialMotion.reveal(content,true,details);}},true);
$('refresh-btn').onclick = async () => { $('refresh-btn').disabled = true; try { await Promise.all([refresh(), refreshRecent()]); } finally { $('refresh-btn').disabled = false; } };

// Native dialogs provide focus trapping and Escape. Card navigation is shared by both grids.
document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.target.matches('input, textarea, select') || $('thumbnail-tour').open || $('settings-dialog').open || $('page-menu').matches(':popover-open') || $('action-dialog').open || $('context-menu').matches(':popover-open')) return;
    const scope = scopeNow();
    if (scope === 'root' && !['open', 'all', 'inactive'].includes(state.view)) return;
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 't') return; // Chrome owns native restore.
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); selecting[scope] = true; selections[scope] = new Set(visibleItems[scope].map(i => i.key)); syncSelection(); return; }
    if (e.key === 'Escape' && ! $('group-dialog').open) { selections.root.clear(); selecting.root = false; syncSelection(); return; }
    const card = e.target.closest('.card');
    if (!card) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); const ids = selections[scope].size ? tabIds(scope) : selectedTabs(new Set([card.dataset.key]), state.tabs).map(t => t.id); closeTabs(ids); return; }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const cards = scopeGrids(scope).flatMap(grid => [...grid.querySelectorAll('.card[data-key]')]);
    let index = cards.indexOf(card), offset = 1;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { const row = [...card.parentElement.children].filter(c => Math.abs(c.offsetTop - card.offsetTop) < 4); offset = Math.max(1, row.length); }
    index = Math.max(0, Math.min(cards.length - 1, index + (['ArrowLeft', 'ArrowUp'].includes(e.key) ? -offset : offset)));
    const target = cards[index]; target?.querySelector('.card-open')?.focus();
    if (e.shiftKey && target) { anchors[scope] ||= card.dataset.key; selectItem(visibleItems[scope].find(i => i.key === target.dataset.key), scope, e); }
});

for (const name of ['onCreated', 'onUpdated', 'onRemoved', 'onMoved', 'onAttached', 'onDetached', 'onActivated', 'onReplaced']) chrome.tabs[name].addListener(scheduleRefresh);
for (const name of ['onCreated', 'onUpdated', 'onRemoved', 'onMoved']) chrome.tabGroups[name].addListener(scheduleRefresh);
chrome.windows.onRemoved.addListener(scheduleRefresh);
chrome.sessions.onChanged.addListener(() => { refreshRecent(); });
chrome.storage.onChanged.addListener((changes, area) => {
    if(area==='session' && Object.keys(changes).some(key=>key.startsWith('tabgridGroupLayout:'))){for(const [key,value] of Object.entries(changes))if(key.startsWith('tabgridGroupLayout:'))groupLayouts[key]=value.newValue;render();}
    if (area === 'local' && changes[PREFS_KEY]?.newValue) applyPreferences(changes[PREFS_KEY].newValue);
    if (!privateMode && area === 'session' && changes.tabgridProtectedGroups) { protectedGroups = changes.tabgridProtectedGroups.newValue || []; scheduleRefresh(); }
    if (!privateMode && (area === 'local' && Object.keys(changes).some(k => k.startsWith('screenshot_') || k === 'tabActivity') || area === 'session' && changes.returnedTabs)) scheduleRefresh();
    if (area === 'session' && changes.tabgridUndo) updateUndo();
    if (area === 'session' && changes.tabgridLastOpened) scheduleRefresh();
});
let pointerReleaseTimer;
document.addEventListener('pointerdown', e => {
    if (!e.target.closest('.card')) return;
    clearTimeout(pointerReleaseTimer); state.pointerDown = true;
}, true);
function releaseCardPointer() {
    clearTimeout(pointerReleaseTimer);
    pointerReleaseTimer = setTimeout(() => {
        state.pointerDown = false;
        syncSearchFocus();
        if (refreshPending) scheduleRefresh();
    }, 0);
}
document.addEventListener('pointerup', releaseCardPointer, true);
document.addEventListener('pointercancel', releaseCardPointer, true);
window.addEventListener('blur', releaseCardPointer);
window.addEventListener('focus', scheduleRefresh);

const customBackground = mountBackground(chrome);
const appearanceMedia = matchMedia('(prefers-color-scheme: dark)');
appearanceMedia.addEventListener('change', () => applyAppearance(document.documentElement, preferences, appearanceMedia.matches));
function applyPreferences(next) {
    if (resolveLanguage(next.language, chrome.i18n?.getUILanguage?.() || navigator.language) !== currentLanguage()) { location.reload(); return; }
    const previous = preferences; preferences = next;
    applyBackgroundAdjustments(document.documentElement, preferences);
    applyAppearance(document.documentElement, preferences, appearanceMedia.matches);
    document.documentElement.classList.toggle('motion-off', preferences.motion === 'off');
    document.documentElement.style.setProperty('--motion-duration', `${materialTiming(preferences.visualStyle, preferences.animationSpeed).duration}ms`);
    document.documentElement.style.setProperty('--group-morph-duration',`${GROUP_MORPH_MS*({efficient:.65,standard:1,smooth:1.6}[preferences.animationSpeed]||1)}ms`);
    materialMotion.sync(); groupTransition.sync();
    for(const sortable of sortables.values())sortable.option('delayOnTouchOnly',!mouseSwipeEnabled(preferences));
    cardSwipe.cancel();
    document.body.classList.toggle('group-drawer-enabled', preferences.dropGroups);
    if (preferences.motion === 'off') document.querySelectorAll('.card-surface').forEach(el => el.getAnimations().forEach(animation => animation.cancel()));
    if (!privateMode && (preferences.rememberOptions || previous.nested !== preferences.nested || previous.searchGroups !== preferences.searchGroups)) { if (!$('opt-nested').disabled) $('opt-nested').checked = preferences.nested; $('opt-groups').checked = preferences.searchGroups; }
    if (preferences.rememberScope && !privateMode && previous.allWindows !== preferences.allWindows) {
        $('opt-all-windows').checked = preferences.allWindows;
    }
    $('sort-select').value = preferences.sortMode;
    applyCardSize(preferences.preferredColumns);
    features?.preferencesChanged(); settingsPanel?.sync(); render(); updateShortcutHints();
}
async function savePreferences(patch) { const next = await rpc('updatePreferences', patch); applyPreferences(next); return next; }
function updateShortcutHints() {
    const mapping = {'undo-btn':'undo','select-tabs-btn':'select','sort-select':`sort${({default:'Default',title:'Title',domain:'Domain',accessed:'Accessed'})[preferences.sortMode]}`,'opt-all-windows':'allWindows','search-input':'focusSearch','group-search':'focusSearch','size-slider':['smaller','larger']};
    document.querySelectorAll('.shortcut-hint').forEach(e=>e.remove());
    for (const [id,action] of Object.entries(mapping)) {
        const control=$(id),actions=[action].flat(),bindings=actions.map(key=>preferences.shortcuts[key]).filter(Boolean),binding=bindings.join(' ');
        if(binding)control.setAttribute('aria-keyshortcuts',binding.replace(/Mod/g,/Mac/.test(navigator.platform)?'Meta':'Control'));else control.removeAttribute('aria-keyshortcuts');
        if(preferences.shortcutHints&&binding&&id!=='sort-select'){const hint=el('span','shortcut-hint',bindings.join(' / ').replace(/Mod/g,/Mac/.test(navigator.platform)?'⌘':'Ctrl'));hint.setAttribute('aria-hidden','true');if(id==='select-tabs-btn')control.append(hint);else control.after(hint);}
    }
}
async function init() {
    const [win, saved] = await Promise.all([chrome.windows.getCurrent(), rpc('preferences')]);
    state.windowId = win.id; preferences = saved;
    groupLayouts = Object.fromEntries(Object.entries(await chrome.storage.session.get(null)).filter(([key])=>key.startsWith('tabgridGroupLayout:')));
    $('privacy-note').hidden = !privateMode;
    if (privateMode) {
        document.querySelector('h1').firstChild.textContent = tr("Incognito Tabs ");
        for (const view of ['inactive','recent']) document.querySelector(`[data-view=${view}]`).hidden = true;
        $('all-windows-label').textContent = tr("Show all windows");
    }
    $('opt-nested').checked = preferences.rememberOptions && !privateMode ? preferences.nested : DEFAULTS.nested;
    $('opt-groups').checked = preferences.rememberOptions && !privateMode ? preferences.searchGroups : DEFAULTS.searchGroups;
    $('opt-all-windows').checked = preferences.rememberScope && !privateMode ? preferences.allWindows : false;
    protectedGroups = privateMode ? [] : await rpc('protectedGroups');
    features = setupGridPersonalization({api:chrome,privateMode,getState:()=>state,getPrefs:()=>preferences,savePrefs:savePreferences,rpc,render,announce,motion:materialMotion,
        selection: (scope,mode) => { if(mode==='clear') {selections[scope].clear();} else if(mode==='exit'){selections[scope].clear();selecting[scope]=false;}else{selecting[scope]=!selectionActive(selecting[scope],selections[scope]);if(!selecting[scope])selections[scope].clear();}syncSelection(); },
        undo: () => $('undo-btn').click(), resize: delta => { const columns = Math.max(1,Math.min(6,preferences.preferredColumns+delta));savePreferences({preferredColumns:columns}).catch(e=>announce(translateError(e.message),true)); }
    });
    settingsPanel = mountSettings({background:customBackground,dialog:$('settings-dialog'),privateMode,getPrefs:()=>preferences,save:savePreferences,rpc,getGroups:()=>state.groups,getProtected:()=>protectedGroups,isNestedForced:()=>$('opt-nested').disabled,setProtected:async ids=>{protectedGroups=await rpc('protectedGroups',ids);render();},onApplied:applyPreferences,motion:materialMotion});
    applyPreferences(preferences);
    mountGlassTabs(document.querySelector('.sources'), () => preferences);
    mountGlassSurfaces(document.querySelector('#custom-background img'));
    mountLiquidInteractions(() => preferences);
    await Promise.all([refresh(), refreshRecent(), updateUndo()]);
    await features.init(); await features.resume(await rpc('takeQuickView'),openGroup); updateShortcutHints();
    mountThumbnailUpdate({api:chrome,rpc,getPrefs:()=>preferences,privateMode,announce,syncModal,refresh});
}
async function openGridWindow(incognito) {
    await run(async()=>{
        if(incognito&&!await chrome.extension.isAllowedIncognitoAccess()){announce(tr("Enable Allow in Incognito in Chrome’s extension details, then try again."));return;}
        await chrome.windows.create({incognito,url:gridUrl});
    });
}
$('regular-window-btn').onclick=()=>openGridWindow(false);
$('private-window-btn').onclick=()=>openGridWindow(true);
setInterval(() => { if (!state.busy && !state.dragging) render(); }, 60000);
init().catch(error => announce(translateError(error.message), true));
