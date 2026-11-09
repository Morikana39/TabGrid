import { tr } from './i18n.mjs';
import { isGridUrl } from './tab-model.mjs';

// The icon and muted filter reflect Chrome's actual tab mute state.
export const isTabMuted = tab => Boolean(tab.mutedInfo?.muted);

// Use the tabs API directly so an open grid does not depend on a matching
// background-worker message version for this simple, non-journaled action.
export async function setTabMuted(api, ids, {muted = null, incognito = false, gridUrl = ''} = {}) {
    if (!Array.isArray(ids) || muted !== null && typeof muted !== 'boolean') throw new Error(tr("Invalid action arguments"));
    const wanted = new Set(ids);
    const tabs = (await api.tabs.query({})).filter(tab => wanted.has(tab.id) &&
        Boolean(tab.incognito) === incognito && !isGridUrl(tab.url || tab.pendingUrl, gridUrl));
    const target = muted ?? !tabs.every(isTabMuted);
    let count = 0; const errors = [];
    for (const tab of tabs) {
        try { await api.tabs.update(tab.id, {muted:target}); count++; }
        catch (error) { errors.push(error.message); }
    }
    return {count, error: errors.length ? tr("{0} tab(s) could not update their mute state. {1}", [errors.length, errors[0]]) : null};
}
