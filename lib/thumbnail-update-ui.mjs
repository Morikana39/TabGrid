import {tr, translateError} from './i18n.mjs';
import {BATCH_KEY} from './preview-batch.mjs';

const TOUR_KEY = 'tabgridThumbnailTourSeen';
export function mountThumbnailUpdate({api, rpc, getPrefs, privateMode, announce, syncModal, refresh}) {
    const button = document.getElementById('update-thumbnails-btn');
    const label = button.querySelector('.thumbnail-update-label');
    const tour = document.getElementById('thumbnail-tour');
    const opener = document.getElementById('page-menu-btn');
    let status = null, poll, openingTour = false, showMenu = false, seen = false;
    function sync() {
        button.hidden = privateMode;
        button.disabled = !status?.active && !getPrefs().capture;
        label.textContent = status?.active ? tr('Stop updating thumbnails') : tr('Update all thumbnails');
    }
    function paint(next) {
        status = next; sync(); clearTimeout(poll);
        if (next?.active) {
            if (!document.hidden) announce(tr('Updating thumbnails… {0} of {1}', [next.processed, next.total]));
            poll = setTimeout(check, 1000);
        } else if (next && Date.now() - next.time < 60000 && sessionStorage.getItem(BATCH_KEY) !== next.id) {
            sessionStorage.setItem(BATCH_KEY, next.id);
            announce(next.cancelled
                ? tr('Thumbnail update stopped. Updated: {0}. Skipped: {1}.', [next.updated, next.skipped])
                : tr('Thumbnails updated: {0}. Skipped: {1}.', [next.updated, next.skipped]));
            refresh();
        }
    }
    async function check() {
        try { paint(await rpc('thumbnailUpdateStatus')); } catch { clearTimeout(poll); }
    }
    button.addEventListener('click', async () => {
        button.disabled = true;
        try { paint(await rpc(status?.active ? 'cancelThumbnailUpdate' : 'startThumbnailUpdate')); }
        catch (error) { announce(translateError(error.message), true); }
        finally { sync(); }
    });
    api.storage.onChanged.addListener((changes, area) => {
        if (area === 'session' && changes[BATCH_KEY]) check();
        if (area === 'local') {
            if (changes[TOUR_KEY]) seen = Boolean(changes[TOUR_KEY].newValue);
            if (changes.tabgridPreferences) sync();
        }
    });
    async function tutorial() {
        if (privateMode || seen || openingTour || document.hidden || !document.hasFocus() || document.querySelector('dialog[open],[popover]:popover-open')) return;
        openingTour = true;
        try {
            seen = Boolean((await api.storage.local.get(TOUR_KEY))[TOUR_KEY]);
            if (seen || document.hidden || document.querySelector('dialog[open],[popover]:popover-open')) return;
            tour.showModal(); syncModal();
            await api.storage.local.set({[TOUR_KEY]:true}); seen = true;
        } catch { /* Onboarding must not prevent using the grid. */ }
        finally { openingTour = false; }
    }
    document.getElementById('thumbnail-tour-done').onclick = () => tour.close();
    document.getElementById('thumbnail-tour-show').onclick = () => { showMenu = true; tour.close(); };
    tour.addEventListener('close', () => {
        syncModal();
        if (showMenu) {
            showMenu = false;
            opener.click();
            button.scrollIntoView({block:'nearest'});
            if (!button.disabled) button.focus({preventScroll:true});
        } else opener.focus({preventScroll:true});
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { check(); tutorial(); } });
    window.addEventListener('focus', tutorial);
    document.addEventListener('close', tutorial, true);
    sync(); check(); tutorial();
    return {sync};
}
