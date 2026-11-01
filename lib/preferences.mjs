import { tr } from './i18n.mjs';
import { THEMES, FONTS, STYLES } from './appearance.mjs';
export const PREFS_KEY = 'tabgridPreferences';
export const SHORTCUTS = { focusSearch: tr("Focus search"), sortDefault: tr("Sort by tab order"), sortTitle: tr("Sort by title"), sortDomain: tr("Sort by website"), sortAccessed: tr("Sort by last used"), undo: tr("Undo close"), allWindows: tr("Toggle all windows"), larger: tr("Increase card size"), smaller: tr("Decrease card size"), select: tr("Select tabs") };
export const DEFAULTS = {
    version: 1, language: 'auto', rememberOptions: true, rememberScope: true, rememberRootScroll: true, rememberGroupScroll: true,
    rememberRootQuery: false, rememberGroupQuery: false, autofocus: true, selectQuery: false,
    backgroundTransparency: 35, backgroundBlur: 0, backgroundZoom: 100, backgroundX: 50, backgroundY: 50, visualStyle: 'classic', colorMode: 'system', theme: 'calm', font: 'geist', motion: 'system', animationSpeed: 'standard', showAddress: true, showLastUsed: false, showWindow: false, showGroup: true, groupPreviewOverflow: true, matchTitle: true, matchUrl: true, matchMode: 'phrase',
    nested: true, searchGroups: true, allWindows: false, filterWebsite: true, filterGroup: true, filterPinned: true, filterAudible: true, filterMuted: true,
    historyEnabled: false, historyCount: 5, historyDays: 0,
    switchNewTab: true, closeAfterSwitch: false, blankClear: true, blankExit: true, closePolicy: 'multiple', closeThreshold: 5, undoMs: 5000,
    inactiveDays: 0, idleSites: [], capture: true, previewQuality: 40, previewSites: [], previewLimit: 100, shortcutHints: false,
    preferredColumns: 4, sortMode: 'default', dropGroups: false, dragGrouping: true, swipeClose: false, drawerEdge: 'left', drawerOffset: 0, drawerLength: 128,
    shortcuts: Object.fromEntries(Object.keys(SHORTCUTS).map(key => [key, key === 'focusSearch' ? '/' : key === 'undo' ? 'Mod+Z' : '']))
};
export function normalizeHost(value) {
    if (typeof value !== 'string' || !value.trim() || /[\s*]/.test(value.trim())) throw Error(tr("Enter a hostname or an HTTP(S) website URL."));
    let url; try { url = new URL(value.includes('://') ? value.trim() : `https://${value.trim()}`); } catch { throw Error(tr("Enter a valid website.")); }
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw Error(tr("Enter an HTTP(S) website without a username or password."));
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (!host.startsWith('[') && (host.length > 253 || host.split('.').some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)))) throw Error(tr("Enter a valid website hostname."));
    return host;
}
export function siteMatches(url, sites = []) {
    try { const host = new URL(url).hostname.toLowerCase().replace(/\.$/, ''); return sites.some(site => host === site || host.endsWith(`.${site}`)); } catch { return false; }
}
export function validateShortcuts(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(tr("Invalid shortcut settings."));
    const used = new Set(), result = {};
    for (const key of Object.keys(SHORTCUTS)) {
        const binding = value[key] ?? DEFAULTS.shortcuts[key];
        if (typeof binding !== 'string' || (binding && !/^(?:(?:Mod|Ctrl|Alt|Shift)\+)*(?:[A-Z0-9]|\/|F(?:[1-9]|1[0-2]))$/.test(binding))) throw Error(tr("Invalid shortcut for {0}.", [SHORTCUTS[key]]));
        const parts = binding.split('+'), main = parts.pop();
        if (new Set(parts).size !== parts.length || (parts.includes('Mod') && parts.includes('Ctrl'))) throw Error(tr("Repeated shortcut modifiers are not allowed."));
        const canonical = [...['Mod','Ctrl','Alt','Shift'].filter(p => parts.includes(p)),main].join('+');
        if (binding && canonical !== binding) throw Error(tr("Invalid shortcut modifier order."));
        if (binding && ((parts.some(p => p === 'Mod' || p === 'Ctrl') && ['A','C','V','X','W','T','N','L','R','F','P','S','O','J','H','D','Q','E','U','B','G','Y','I','K','M','0','1','2','3','4','5','6','7','8','9'].includes(main)) || (parts.includes('Alt') && ['D','E','F'].includes(main)) || /^F(?:1|3|4|5|6|7|10|11|12)$/.test(main))) throw Error(tr("That shortcut is reserved for browser navigation or editing."));
        if (binding && used.has(binding)) throw Error(tr("Each shortcut must be unique."));
        if (binding) used.add(binding); result[key] = binding;
    }
    return result;
}
export function keyBinding(event, mac = false) {
    if (event.isComposing || (!mac && event.metaKey) || ['Control','Meta','Alt','Shift'].includes(event.key)) return null;
    let key = event.key === '/' ? '/' : event.key.toUpperCase();
    return [((mac && event.metaKey) || (!mac && event.ctrlKey)) && 'Mod', mac && event.ctrlKey && 'Ctrl', event.altKey && 'Alt', event.shiftKey && 'Shift', key].filter(Boolean).join('+');
}
const ranges = { backgroundZoom:[100,300], backgroundX:[0,100], backgroundY:[0,100], backgroundTransparency:[0,100], backgroundBlur:[0,40], drawerLength:[64,320], drawerOffset:[0,100], historyDays:[0,3650], closeThreshold:[1,100000], undoMs:[1,300000], inactiveDays:[0,3650], previewLimit:[1,1024], preferredColumns:[1,6] };
const enums = { language:['auto','en','zh-CN','ja'], previewQuality:[20,40,80], visualStyle:STYLES.map(s=>s.id), colorMode:['system','light','dark'], theme:THEMES.map(t=>t.id), font:FONTS.map(f=>f.id), drawerEdge:['left','right'], motion:['system','off'], animationSpeed:['efficient','standard','smooth'], matchMode:['phrase','words'], historyCount:[5,10,20], closePolicy:['always','multiple','above'], sortMode:['default','title','domain','accessed'] };
export function validatePreferences(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error(tr("Settings must be an object."));
    if (input.version !== undefined && input.version !== 1) throw Error(tr("Unsupported settings version."));
    if (input.undoMs === undefined && input.undoSeconds !== undefined) {
        if (!Number.isInteger(input.undoSeconds) || input.undoSeconds < 1 || input.undoSeconds > 300) throw Error(tr("Invalid legacy undo timeout."));
        input = {...input, undoMs: input.undoSeconds * 1000};
    }
    if (['neumorphic','clay'].includes(input.visualStyle)) input={...input,visualStyle:'classic'};
    // Preserve old backups while migrating retired top/bottom docking positions.
    if (['top','bottom'].includes(input.drawerEdge) && input.drawerOffset !== undefined && (!Number.isInteger(input.drawerOffset) || input.drawerOffset < 0 || input.drawerOffset > 100)) throw Error(tr("Invalid drawer offset."));
    if (['top','bottom'].includes(input.drawerEdge)) input = {...input, drawerEdge: (input.drawerOffset ?? 0) < 50 ? 'left' : 'right', drawerOffset: input.drawerEdge === 'top' ? 0 : 100};
    const result = structuredClone(DEFAULTS);
    for (const [key, fallback] of Object.entries(DEFAULTS)) {
        if (!(key in input)) continue;
        const value = input[key];
        if (typeof fallback === 'boolean' && typeof value !== 'boolean') throw Error(tr("Invalid value for {0}.", [key]));
        if (ranges[key] && (!Number.isInteger(value) || value < ranges[key][0] || value > ranges[key][1])) throw Error(tr("{0} must be a whole number from {1} to {2}.", [key, ranges[key][0], ranges[key][1]]));
        if (enums[key] && !enums[key].includes(value)) throw Error(tr("Invalid choice for {0}.", [key]));
        if (key === 'idleSites' || key === 'previewSites') {
            if (!Array.isArray(value) || value.length > 1000) throw Error(tr("Use a list of at most 1,000 websites."));
            result[key] = [...new Set(value.map(normalizeHost))];
        } else if (key === 'shortcuts') result[key] = validateShortcuts(value);
        else result[key] = value;
    }
    if (!result.matchTitle && !result.matchUrl) throw Error(tr("Enable title or URL matching."));
    return result;
}
export function migratePreferences(storage, columns = 4) {
    if (storage[PREFS_KEY]) return validatePreferences(storage[PREFS_KEY]);
    const next = { ...DEFAULTS, preferredColumns: columns };
    for (const key of ['preferredColumns','sortMode','inactiveDays','dropGroups']) if (storage[key] !== undefined) next[key] = storage[key];
    return validatePreferences(next);
}
export const needsConfirmation = (count, prefs) => count > 0 && (prefs.closePolicy === 'always' || (prefs.closePolicy === 'multiple' ? count > 1 : count > prefs.closeThreshold));
export function cleanHistory(entries, days, now = Date.now()) {
    const seen = new Set();
    return (Array.isArray(entries) ? entries : []).filter(e => {
        if (!e || typeof e.query !== 'string' || !Number.isFinite(e.time) || !e.query.trim() || (days && now - e.time > days * 86400000)) return false;
        const key = e.query.trim().toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true;
    }).slice(0,20).map(e => ({query:e.query.trim().slice(0,500),time:e.time}));
}
export function importSettings(text) {
    if (typeof text !== 'string' || text.length > 1024 * 1024) throw Error(tr("Choose a settings file smaller than 1 MiB."));
    const data = JSON.parse(text);
    if (data?.format !== 'TabGrid settings' || data.version !== 1) throw Error(tr("Unsupported settings backup."));
    return validatePreferences(data.preferences);
}
export const exportSettings = prefs => JSON.stringify({format:'TabGrid settings',version:1,preferences:validatePreferences(prefs)},null,2);
