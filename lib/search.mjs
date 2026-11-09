import { cleanHistory } from './preferences.mjs';
import { isTabMuted } from './tab-sound.mjs';
export const emptyFilters = () => ({ websites: [], groups: [], pinned: 'any', audible: 'any', muted: 'any' });
export const hasFilters = f => f && (f.websites.length || f.groups.length || ['pinned','audible','muted'].some(k => f[k] !== 'any'));
export function textMatches(item, query, prefs = {}) {
    const fields = [(prefs.matchTitle !== false ? item.title : '') || '', (prefs.matchUrl !== false ? item.url : '') || ''].map(s => s.toLowerCase());
    const q = query.trim().toLowerCase();
    return !q || (prefs.matchMode === 'words' ? q.split(/\s+/).every(word => fields.some(s => s.includes(word))) : fields.some(s => s.includes(q)));
}
export function tabMatches(tab, filters = emptyFilters()) {
    let host='';try {host=new URL(tab.url || tab.pendingUrl).hostname;}catch{}
    return (!filters.websites.length || filters.websites.includes(host)) && (!filters.groups.length || filters.groups.includes(tab.groupId)) &&
        ['pinned','audible','muted'].every(k => filters[k] === 'any' || Boolean(k === 'muted' ? isTabMuted(tab) : tab[k]) === (filters[k] === 'yes'));
}
// History is independent of live results and of retired suggestion preferences.
export function recentSearches(history, prefs, privateMode = false, query = '') {
    return !privateMode && prefs.historyEnabled ? cleanHistory(history, prefs.historyDays).filter(entry=>entry.query.toLowerCase().includes(query.trim().toLowerCase())).slice(0, prefs.historyCount) : [];
}

// Automatic focus is quiet even when history finishes loading asynchronously.
export class HistoryFocus {
    automatic(){this.quiet=true;}
    interact(){this.quiet=false;}
    blur(){this.quiet=false;}
    get allowed(){return !this.quiet;}
}
