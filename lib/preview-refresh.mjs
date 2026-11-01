import {canCaptureUrl} from './preview-capture.mjs';
import {siteMatches} from './preferences.mjs';

// Bound the extra wait when the toolbar/extension shortcut opens TabGrid.
// An expired capture cannot later write over the cached preview.
export async function captureBeforeOpen(personalization, tab, {
    timeout, schedule = (fn, ms) => setTimeout(fn, ms), cancel = id => clearTimeout(id)
} = {}) {
    if (personalization.private || tab.incognito || !canCaptureUrl(tab.url,true)) return;
    // Leave room for the shared 600ms capture-quota wait, pixel capture and
    // validation, including the first toolbar click after a worker restart.
    timeout ??= 1500;
    const controller = new AbortController();
    let timer;
    try {
        await Promise.race([
            personalization.ready.then(async () => {
                const cache=personalization.previews;
                if(await cache.canReuse(tab.id,tab.url)||controller.signal.aborted)return;
                cache.invalidateCaptures?.();
                await cache.capture(tab.id, {signal: controller.signal, expectedUrl: tab.url, backgroundSave:true, userInvoked:true});
            }),
            new Promise(resolve => { timer = schedule(() => { controller.abort(); resolve(); }, timeout); })
        ]);
    } catch { /* Capture failure must not prevent opening TabGrid. */ }
    finally { cancel(timer); controller.abort(); }
}

export const PREVIEW_ALARM='tabgrid-preview-refresh';
export function installPreviewRefresh(api, personalization, {paused = () => false} = {}) {
    const cache = personalization.previews, pending = new Map(), pageRequests = new Map();
    const regular = !personalization.private;
    async function attach(tabId) {
        if (!regular || paused()) return;
        try {
            await personalization.ready;
            const [tab, prefs] = await Promise.all([api.tabs.get(tabId), personalization.preferences()]);
            if (tab.incognito || !tab.active || !/^https?:/.test(tab.url || '') || !prefs.capture || siteMatches(tab.url, prefs.previewSites)) return;
            // Default target is frame 0, in Chrome's isolated world. The script
            // is idempotent, including on tabs already open at extension reload.
            await api.scripting.executeScript({target: {tabId}, files: ['preview-activity.js']});
        } catch { /* Restricted or closed tabs keep their existing fallback. */ }
    }
    function cancelWindow(windowId) {
        clearTimeout(pending.get(windowId)); pending.delete(windowId);
    }
    function schedule(tabId, windowId) {
        if (!regular || paused()) return;
        cancelWindow(windowId);
        pending.set(windowId, setTimeout(() => {
            pending.delete(windowId);
            personalization.ready.then(() => paused() ? undefined : cache.capture(tabId)).catch(() => {});
        }, 500));
    }
    api.tabs.onCreated?.addListener(tab=>{if(tab.active&&!tab.incognito){schedule(tab.id,tab.windowId);attach(tab.id);}});
    api.tabs.onActivated.addListener(({tabId, windowId}) => {
        if (!paused()) cache.invalidateCaptures(); schedule(tabId, windowId); attach(tabId);
    });
    api.tabs.onUpdated.addListener((id, change, tab) => {
        if (!regular || tab.incognito) return;
        if (change.url) cache.clear(id).catch(() => {});
        if (change.status === 'complete' && tab.active) { schedule(id, tab.windowId); attach(id); }
    });
    api.tabs.onRemoved.addListener(id => { if (regular) cache.clear(id).catch(() => {}); pageRequests.delete(id); });
    api.windows.onRemoved.addListener(cancelWindow);
    api.windows.onFocusChanged.addListener(async id => {
        if (!regular || id < 0) return;
        try { for (const tab of await api.tabs.query({active: true, windowId: id})) { schedule(tab.id, id); attach(tab.id); } } catch { /* Window closed. */ }
    });
    async function attachActive() {
        if (!regular || paused()) return;
        try { for (const tab of await api.tabs.query({active: true})) {await attach(tab.id);schedule(tab.id,tab.windowId);} } catch { /* Browser shutting down. */ }
    }
    api.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes.tabgridPreferences) return;
        cache.invalidate();
        if (regular) personalization.ready.then(() => cache.reconcile()).then(attachActive).catch(() => {});
    });
    // Alarms survive MV3 worker suspension and also cover pages where injection
    // fails. Only the visible tab in a focused regular window is sampled.
    async function periodic(){
        if(!regular || paused())return;
        await personalization.ready;
        const prefs=await personalization.preferences();if(!prefs.capture)return;
        for(const tab of await api.tabs.query({active:true})){
            if(!tab.active||tab.incognito)continue;
            const win=await api.windows.get(tab.windowId).catch(()=>null);
            if(!paused()&&win?.focused&&win.state!=='minimized')await cache.capture(tab.id,{expectedUrl:tab.url});
        }
    }
    api.alarms?.onAlarm.addListener(alarm=>{if(alarm.name===PREVIEW_ALARM)periodic().catch(()=>{});});
    if(regular)Promise.resolve(api.alarms?.create(PREVIEW_ALARM,{periodInMinutes:.5})).catch(()=>{});
    personalization.ready.then(attachActive).catch(() => {});
    return {
        fromPage(message, sender) {
            if (!regular || paused() || message?.type !== 'tabgrid-preview-activity' || sender.id !== api.runtime.id || sender.frameId !== 0 ||
                !sender.tab || sender.tab.incognito || !/^https?:/.test(sender.url || '')) return Promise.resolve();
            const id = sender.tab.id;
            // Repeated signals while capture/storage is busy share one request.
            if (pageRequests.has(id)) return pageRequests.get(id);
            const result = personalization.ready.then(() => paused() ? undefined : cache.capture(id, {expectedUrl: sender.url})).catch(() => {})
                .finally(() => { if (pageRequests.get(id) === result) pageRequests.delete(id); });
            pageRequests.set(id, result);
            return result;
        }
    };
}
