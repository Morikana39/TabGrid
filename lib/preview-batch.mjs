import {canCaptureUrl} from './preview-capture.mjs';
import {siteMatches} from './preferences.mjs';
import {isGridUrl} from './tab-model.mjs';

export const BATCH_KEY = 'tabgridThumbnailUpdate';
// One worker-owned run across all regular windows. Activation is unavoidable:
// captureVisibleTab cannot photograph an arbitrary background tab.
export class PreviewBatch {
    constructor(api, personal, gridUrl, {wait = ms => new Promise(resolve => setTimeout(resolve, ms)), captureTimeout = 5000} = {}) {
        Object.assign(this, {api, personal, gridUrl, wait, captureTimeout});
        this.run = null; this.writes = Promise.resolve();
        api.tabs.onActivated.addListener(({tabId, windowId}) => {
            const run = this.run;
            if (run && run.expected.get(windowId) !== tabId) this.cancel(true, windowId);
        });
        api.windows.onFocusChanged.addListener(id => {
            if (this.run && !this.run.done && id !== this.run.focus) this.cancel(true, id);
        });
        api.tabs.onRemoved.addListener(id => { if (id === this.run?.sourceId) this.cancel(true); });
    }
    get active() { return Boolean(this.run); }
    snapshot(run) {
        return {id:run.id, active:!run.done, total:run.total, processed:run.processed,
            updated:run.updated, skipped:run.skipped, cancelled:run.controller.signal.aborted, time:Date.now()};
    }
    publish(run) {
        const status = this.snapshot(run);
        const save = async () => {
            await this.api.storage.session.set({[BATCH_KEY]:status});
            await this.api.action?.setBadgeText({text:status.active ? `${status.processed}/${status.total}` : ''});
        };
        this.writes = this.writes.then(save, save).catch(() => {});
        return this.writes;
    }
    async status() {
        if (this.run) return this.snapshot(this.run);
        const saved = (await this.api.storage.session.get(BATCH_KEY))[BATCH_KEY];
        // A restarted worker must never leave the UI claiming work is running.
        if (saved?.active) {
            const stopped = {...saved, active:false, cancelled:true};
            await this.api.storage.session.set({[BATCH_KEY]:stopped});
            await this.api.action?.setBadgeText({text:''});
            return stopped;
        }
        return saved || null;
    }
    cancel(interrupted = false, windowId = null) {
        if (this.run) {
            this.run.interrupted ||= interrupted;
            if (interrupted) this.run.untouched.add(windowId);
            this.run.controller.abort();
            this.personal.previews.invalidateCaptures();
        }
        return this.run ? this.snapshot(this.run) : null;
    }
    start(sourceId) {
        if (this.run) return this.snapshot(this.run);
        const run = {id:crypto.randomUUID(), sourceId, controller:new AbortController(), expected:new Map(),
            original:new Map(), windowStates:new Map(), visited:new Set(), untouched:new Set(), focus:null, originalFocus:null, total:0, processed:0, updated:0, skipped:0};
        this.run = run;
        // Return immediately so status/cancel requests do not wait behind capture.
        this.finished = this.execute(run).finally(() => { if (this.run === run) this.run = null; });
        return this.snapshot(run);
    }
    async eligible(tab, prefs) {
        if (!tab || tab.incognito || isGridUrl(tab.url, this.gridUrl) || siteMatches(tab.url, prefs.previewSites)) return false;
        if (canCaptureUrl(tab.url)) return true;
        const grant = `tabgridPreviewGrant_${tab.id}`;
        return canCaptureUrl(tab.url, true) && (await this.api.storage.session.get(grant))[grant] === tab.url;
    }
    async settle(run, id) {
        // Bound slow/discarded pages; poll Chrome so the worker stays alive.
        for (let n = 0; n < 20 && !run.controller.signal.aborted; n++) {
            await this.wait(250);
            const tab = await this.api.tabs.get(id);
            if (tab.status !== 'loading' && !tab.discarded) { await this.wait(350); return tab; }
        }
        return null;
    }
    async capture(run, tab) {
        const controller = new AbortController();
        let timer, stop;
        const interrupted = new Promise(resolve => {
            stop = () => { controller.abort(); resolve(false); };
            run.controller.signal.addEventListener('abort', stop, {once:true});
            timer = setTimeout(stop, this.captureTimeout);
            if (run.controller.signal.aborted) stop();
        });
        try {
            return await Promise.race([interrupted, this.personal.previews.capture(tab.id, {
                signal:controller.signal, expectedUrl:tab.url
            })]);
        } finally {
            clearTimeout(timer); run.controller.signal.removeEventListener('abort', stop);
            controller.abort();
        }
    }
    async execute(run) {
        try {
            await this.personal.ready;
            if (this.personal.private || !(await this.personal.preferences()).capture) { run.controller.abort(); return; }
            const [tabs, windows, source] = await Promise.all([
                this.api.tabs.query({}), this.api.windows.getAll({windowTypes:['normal']}), this.api.tabs.get(run.sourceId)
            ]);
            if (source.incognito || !isGridUrl(source.url, this.gridUrl)) { run.controller.abort(); return; }
            const normal = new Set(windows.filter(w => !w.incognito).map(w => w.id));
            for (const win of windows) if (normal.has(win.id)) run.windowStates.set(win.id, win.state);
            run.originalFocus = windows.find(w => w.focused)?.id ?? source.windowId;
            run.focus = run.originalFocus;
            for (const tab of tabs) if (tab.active && normal.has(tab.windowId)) {
                run.original.set(tab.windowId, tab.id); run.expected.set(tab.windowId, tab.id);
            }
            const targets = tabs.filter(t => normal.has(t.windowId) && !t.incognito && !isGridUrl(t.url, this.gridUrl));
            run.total = targets.length;
            this.personal.previews.invalidateCaptures();
            await this.publish(run);
            for (const initial of targets) {
                if (run.controller.signal.aborted) break;
                const prefs = await this.personal.preferences();
                if (!prefs.capture) { run.controller.abort(); break; }
                let updated = false;
                try {
                    const current = await this.api.tabs.get(initial.id);
                    if (current.windowId === initial.windowId && await this.eligible(current, prefs)) {
                        if (run.controller.signal.aborted) break;
                        run.expected.set(current.windowId, current.id);
                        await this.api.tabs.update(current.id, {active:true});
                        if (run.controller.signal.aborted) break;
                        if (run.focus !== current.windowId) {
                            run.focus = current.windowId;
                            run.visited.add(current.windowId);
                            await this.api.windows.update(current.windowId, {focused:true, ...(run.windowStates.get(current.windowId) === 'minimized' ? {state:'normal'} : {})});
                        }
                        const settled = await this.settle(run, current.id);
                        if (settled && !run.controller.signal.aborted) updated = Boolean(await this.capture(run, settled));
                    }
                } catch { /* Closed, moved or inaccessible pages are skipped. */ }
                run.processed++;
                if (updated) run.updated++; else run.skipped++;
                await this.publish(run);
            }
        } catch { run.controller.abort(); }
        finally {
            // Restore only selections still owned by this run. Never pull the
            // user away from a tab/window they selected to interrupt the tour.
            for (const [windowId, tabId] of run.original) {
                if (run.untouched.has(windowId)) continue;
                try {
                    const [active] = await this.api.tabs.query({windowId, active:true});
                    if (active?.id !== run.expected.get(windowId) || active.id === tabId) continue;
                    run.expected.set(windowId, tabId);
                    await this.api.tabs.update(tabId, {active:true});
                } catch { /* Original tab/window closed. */ }
            }
            if (!run.interrupted && run.originalFocus !== null) {
                run.focus = run.originalFocus;
                await this.api.windows.update(run.originalFocus, {focused:true}).catch(() => {});
            }
            run.done = true;
            for (const windowId of run.visited) {
                if (!run.untouched.has(windowId) && run.windowStates.get(windowId) === 'minimized') {
                    await this.api.windows.update(windowId, {state:'minimized'}).catch(() => {});
                }
            }
            await this.publish(run);
        }
    }
}
