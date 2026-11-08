import {combineSplitItems, splitMembers} from './split-view.mjs';
import { tr } from './i18n.mjs';
import { textMatches, tabMatches, hasFilters, emptyFilters } from './search.mjs';
export const keyFor = (kind, id) => `${kind}:${id}`;
export const isGridUrl = (url, gridUrl) => Boolean(url && url.split(/[?#]/)[0] === gridUrl);
export const matches = textMatches;
export const safePageUrl = url => /^(https?:|file:|chrome:|about:)/i.test(url || '');

export function selectedTabs(keys, tabs) {
    const selected = new Set(tabs.filter(tab => keys.has(keyFor('tab', tab.id))).flatMap(tab => splitMembers(tab, tabs)).map(tab => tab.id));
    return tabs.filter(tab => selected.has(tab.id) || keys.has(keyFor('tab', tab.id)) || keys.has(keyFor('group', tab.groupId)));
}

export function compareTabItems(a,b,sort = 'default') {
    const value = item => {
        const data = item.tab || item.group;
        if (sort === 'accessed') return -(item.tab?.lastAccessed || Math.max(0, ...(item.members || []).map(t => t.lastAccessed || 0)));
        if (sort === 'domain' && item.tab) { try { return new URL(item.tab.url).hostname; } catch { return ''; } }
        return (data.title || '').toLowerCase();
    };
    return sort === 'default' ? a.windowId - b.windowId || a.index - b.index : typeof value(a) === 'number' ? value(a) - value(b) : value(a).localeCompare(value(b));
}

export function openItems(tabs, groups, { windowId, allWindows = false, groupId = null, query = '', nested = true, showGroups = true, sort = 'default', preferences = {}, filters = emptyFilters() }) {
    const pool = tabs.filter(t => allWindows || t.windowId === windowId);
    const searching = Boolean(query.trim());
    const filtered = Boolean(hasFilters(filters));
    const groupMatch = t => showGroups && groups.some(g => g.id === t.groupId && textMatches({title:g.title},query,{...preferences,matchTitle:true,matchUrl:false}));
    let visible = pool.filter(t => groupId !== null ? t.groupId === groupId : filtered ? true : searching ? (nested || t.groupId === -1) : t.groupId === -1);
    visible = visible.filter(t => tabMatches(t, filters));
    if (searching) visible = visible.filter(t => ((groupId !== null || filters.groups.length || nested || t.groupId === -1) && matches(t, query, preferences)) || (filtered && groupMatch(t)));
    const items = visible.map(tab => ({ kind: 'tab', key: keyFor('tab', tab.id), tab, index: tab.index, windowId: tab.windowId }));
    if (!filtered && groupId === null && (!searching || showGroups)) {
        groups.filter(g => pool.some(t => t.groupId === g.id) && (!searching || matches(g, query, {...preferences,matchTitle:true,matchUrl:false}))).forEach(group => {
            const members = pool.filter(t => t.groupId === group.id);
            items.push({ kind: 'group', key: keyFor('group', group.id), group, members, index: Math.min(...members.map(t => t.index)), windowId: group.windowId });
        });
    }
    items.sort((a,b)=>compareTabItems(a,b,sort));
    return combineSplitItems(items, pool);
}

// Unpacked copies can have a different ID after moving folders. This display-only
// check deliberately does not broaden live-tab identity or message authorization.
export function isRecentGridTab(tab, gridUrl) {
    if (isGridUrl(tab.url, gridUrl)) return true;
    try {
        const url = new URL(tab.url);
        return url.protocol === 'chrome-extension:' && url.pathname === '/grid.html' && tab.title === 'TabGrid';
    } catch { return false; }
}

export function recentItems(sessions, gridUrl) {
    return sessions.flatMap(session => {
        if (session.tab) {
            const tab = session.tab;
            return isRecentGridTab(tab, gridUrl) || !tab.sessionId ? [] : [{ kind: 'recent', key: `recent:${tab.sessionId}`, sessionId: tab.sessionId, title: tab.title || tab.url || tr("Closed tab"), url: tab.url || '', time: session.lastModified }];
        }
        const tabs = session.window?.tabs || [];
        const visible = tabs.filter(t => !isRecentGridTab(t, gridUrl));
        if (!visible.length || !session.window.sessionId) return [];
        // A mixed window is restored as a window, preserving Chrome's native session.
        return [{ kind: 'recent', key: `recent:${session.window.sessionId}`, sessionId: session.window.sessionId, title: tr("{0} tabs — closed window", [visible.length]), tabs: visible, time: session.lastModified, isWindow: true }];
    });
}

// Match each tab independently: words from different tabs must not combine into
// a window match, and title/URL preferences apply to the original tab fields.
export function filterRecentItems(items, query, preferences = {}) {
    return items.flatMap(item => {
        if (!item.isWindow) return matches(item, query, preferences) ? [item] : [];
        const tabs = item.tabs.filter(tab => matches(tab, query, preferences));
        return tabs.length ? [{ ...item, tabs }] : [];
    });
}

// Reorder the visible slots while leaving inactive groups/tabs in their slots.
export function mergeVisibleOrder(allKeys, visibleKeys) {
    const visible = new Set(visibleKeys);
    if (visible.size !== visibleKeys.length || visibleKeys.some(k => !allKeys.includes(k))) throw new Error(tr("Tabs changed while dragging. Please try again."));
    let next = 0;
    return allKeys.map(key => visible.has(key) ? visibleKeys[next++] : key);
}
