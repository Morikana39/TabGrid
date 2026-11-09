// Pointer intent is independent of Sortable's DOM ownership.
export class CardIntent {
    begin({ id, key, x, y, time, type = 'mouse' }) {
        this.pointer = { id, key, x, y, time, type, moved: false, cancelled: false };
    }
    move({ id, x, y }) {
        const p = this.pointer;
        if (p?.id === id) p.moved ||= Math.max(Math.abs(x - p.x), Math.abs(y - p.y)) >= 6;
    }
    cancel() { if (this.pointer) this.pointer.cancelled = true; }
    end({ id, key, x, y, time }) {
        const p = this.pointer;
        if (!p || p.id !== id) return false;
        this.move({ id, x, y });
        this.pointer = null;
        return p.cancelled || p.moved || p.key !== key || time - p.time >= (p.type === 'touch' ? 250 : 500);
    }
}

export const cardSize = value => {
    const number = typeof value === 'number' ? value : /^\d+(?:px)?$/.test(value || '') ? Number.parseInt(value, 10) : NaN;
    return Number.isFinite(number) ? Math.max(220, Math.min(450, Math.round(number))) : 220;
};
// Migrate the old pixel preference once a row width is known; keep the old key intact.
export function cardColumns(value, legacySize, width = 1320) {
    if (typeof value === 'number' && Number.isFinite(value)) return Math.max(1, Math.min(6, Math.round(value)));
    if (legacySize !== undefined) return Math.max(1, Math.min(6, Math.floor((width + 20) / (cardSize(legacySize) + 20))));
    return 4;
}
export const idleDays = value => Number.isInteger(value) && value >= 0 && value <= 3650 ? value : 0;
export const selectionActive = (selecting, keys) => selecting || keys.size > 0;
export const acceptsGroupDrop = card => card?.dataset.kind === 'tab' && /^tab:\d+$/.test(card.dataset.key) && !card.itemModel?.tab?.pinned;
export function windowSections(items, currentWindowId, windowOrder) {
    const order = windowOrder ?? [...new Set(items.map(item => item.windowId))].sort((a, b) => a - b);
    const ids = [...order.filter(id => id === currentWindowId), ...order.filter(id => id !== currentWindowId)];
    return ids.map(windowId => ({ windowId, items: items.filter(item => item.windowId === windowId) }));
}

// Completed journal writes drive notifications; historical entries never resurface.
export class UndoNotice {
    constructor({ change, now = () => Date.now(), schedule = (fn, delay) => setTimeout(fn, delay), cancel = id => clearTimeout(id), duration = () => 5000 }) {
        Object.assign(this, { change, now, schedule, cancel, duration });
        this.seen = new Set(); this.pauses = new Set(); this.initialized = false; this.entry = null;
    }
    observe(entries) {
        if (!this.initialized) {
            entries.filter(e => e.completedAt).forEach(e => this.seen.add(e.id));
            this.initialized = true;
            return;
        }
        const fresh = entries.filter(e => e.completedAt && !this.seen.has(e.id));
        fresh.forEach(e => this.seen.add(e.id));
        const newest = fresh.at(-1);
        if ((newest?.splitRestorePending || newest?.tabs.some(t => t.state === 'closed' || t.state === 'changed'))) {
            this.cancel(this.timer); this.entry = newest; this.remaining = this.duration();
            this.change(this.entry); this.arm();
        } else if (this.entry) {
            const current = entries.find(e => e.id === this.entry.id);
            if (!(current?.splitRestorePending || current?.tabs.some(t => t.state === 'closed' || t.state === 'changed'))) this.dismiss();
            else { this.entry = current; this.change(current); }
        }
    }
    arm() {
        if (!this.entry || this.pauses.size) return;
        this.started = this.now();
        this.timer = this.schedule(() => this.dismiss(), this.remaining);
    }
    pause(reason) {
        if (!this.pauses.size && this.entry) { this.remaining = Math.max(0, this.remaining - (this.now() - this.started)); this.cancel(this.timer); }
        this.pauses.add(reason);
    }
    resume(reason) { if (this.pauses.delete(reason) && !this.pauses.size) this.arm(); }
    dismiss() { this.cancel(this.timer); this.entry = null; this.change(null); }
}

export function attachCardIntent(container) {
    const controller = new AbortController();
    const options = { capture: true, signal: controller.signal };
    const intent = new CardIntent();
    let suppressUntil = 0;
    const point = e => ({ id: e.pointerId, x: e.clientX, y: e.clientY, time: performance.now() });
    const cardKey = target => target?.closest?.('.card')?.dataset.key;
    container.addEventListener('pointerdown', e => {
        if (!e.isPrimary) { intent.cancel(); return; }
        if (e.button !== 0 || e.target.closest('.card-menu, .card-close, .card-mute, .card-pin, input')) return;
        const key = cardKey(e.target);
        if (key) { suppressUntil = 0; intent.begin({ ...point(e), key, type: e.pointerType }); }
    }, options);
    document.addEventListener('pointermove', e => intent.move(point(e)), options);
    document.addEventListener('pointerup', e => {
        // Hit testing, rather than event.target, handles touch pointer capture.
        const key = cardKey(document.elementFromPoint(e.clientX, e.clientY));
        if (intent.end({ ...point(e), key })) suppressUntil = performance.now() + 700;
    }, options);
    document.addEventListener('pointercancel', () => { intent.cancel(); suppressUntil = performance.now() + 700; }, options);
    // Element blur does not mean the browser window lost focus. Listening in
    // capture mode here used to cancel the first click on each different card.
    window.addEventListener('blur', () => { intent.cancel(); suppressUntil = performance.now() + 700; }, { signal: controller.signal });
    container.addEventListener('click', e => {
        if (e.detail !== 0 && performance.now() < suppressUntil && !e.target.closest('.card-menu, .card-close, .card-mute, .card-pin, input')) {
            e.preventDefault(); e.stopImmediatePropagation();
        }
    }, options);
    return () => controller.abort();
}
