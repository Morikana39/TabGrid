import { PreviewBatch } from './lib/preview-batch.mjs';
import { GridLifecycle } from './lib/grid-lifecycle.mjs';
import { tr } from './lib/i18n.mjs';
import { captureBeforeOpen, installPreviewRefresh } from './lib/preview-refresh.mjs';
import { WindowOrder } from './lib/window-order.mjs';
import { Personalization } from './lib/personalization.mjs';
import { TabActions } from './lib/tab-actions.mjs';
import { isGridUrl } from './lib/tab-model.mjs';

const gridUrl = chrome.runtime.getURL('grid.html');
const actions = new TabActions(chrome, gridUrl);
const personalization = new Personalization(chrome, gridUrl);
const gridLifecycle=new GridLifecycle(chrome,gridUrl,{privateMode:actions.private,preferences:()=>personalization.preferences()});
const previewBatch = new PreviewBatch(chrome, personalization, gridUrl);
const previewRefresh = installPreviewRefresh(chrome, personalization, {paused:()=>previewBatch.active});
let queue = Promise.resolve();
const windowOrder = new WindowOrder(chrome, actions.private);
const seedWindows = () => windowOrder.snapshot();
queue = queue.then(seedWindows,seedWindows);
chrome.windows.onCreated.addListener(win=>{const task=()=>windowOrder.created(win);queue=queue.then(task,task);queue.catch(()=>{});});
chrome.windows.onRemoved.addListener(id=>{const task=()=>windowOrder.removed(id);queue=queue.then(task,task);queue.catch(()=>{});});
chrome.action.onClicked.addListener(async tab => {
    try {
    if (previewBatch.active) { previewBatch.cancel(); await previewBatch.finished; await gridLifecycle.open(tab); return; }
    const remember = () => actions.rememberOpened(`tab:${tab.id}`);
    queue = queue.then(remember, remember);
    queue.catch(() => {});
    await captureBeforeOpen(personalization, tab);
    await gridLifecycle.open(tab);
    } catch { /* The source window/tab can close while capture is pending. */ }
});

// Reuse grids on explicit opening; leave restored duplicates alone so Chrome's
// recently-closed history can be consumed without generating replacement entries.
chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.type === 'tabgrid-preview-activity') {
        previewRefresh.fromPage(message, sender).then(() => respond({}));
        return true;
    }
    if (sender.id !== chrome.runtime.id || !isGridUrl(sender.url, gridUrl) || message?.type !== 'tabgrid-action') return;
    if (['startThumbnailUpdate','thumbnailUpdateStatus','cancelThumbnailUpdate'].includes(message.action)) {
        const task = async () => {
            if (message.action === 'startThumbnailUpdate') return previewBatch.start(sender.tab?.id);
            if (message.action === 'cancelThumbnailUpdate') return previewBatch.cancel();
            return previewBatch.status();
        };
        task().then(result=>respond({result}),error=>respond({error:error.message}));
        return true;
    }
    const run = async () => {
        const { action, args = [] } = message;
        if (!Array.isArray(args)) throw new Error(tr("Invalid action arguments"));
        if (action === 'switchFromGrid') return gridLifecycle.switchTo(sender.tab.id,args[0],args[1]);
        if (action === 'takeQuickView') return gridLifecycle.takeView(sender.tab?.windowId);
        if (action === 'windowOrder') return windowOrder.snapshot();
        if (action === 'preferences') return personalization.preferences();
        if (action === 'updatePreferences') return personalization.updatePreferences(args[0]);
        if (action === 'searchHistory') return personalization.history(...args);
        if (action === 'background') return personalization.background(...args);
        if (action === 'preview') return personalization.preview(...args);
        if (action === 'importSettings') return personalization.import(...args);
        if (action === 'protectedGroups') return personalization.protectedGroups(...args);
        const allowed = ['close', 'undo', 'restoreSession', 'group', 'ungroup', 'move', 'reorder', 'dropAt', 'rememberOpened', 'lastOpenedSnapshot', 'addLinks', 'returnActive', 'activitySnapshot', 'dropIntoGroup', 'newAfter', 'duplicate', 'siteSoundSnapshot', 'setSiteSound'];
        if (!allowed.includes(action)) throw new Error(tr("Unknown tab action"));
        if (action === 'undo') return actions.undo(args[0], sender.tab?.id ?? null);
        return actions[action](...args);
    };
    queue = queue.then(run, run);
    queue.then(result => respond({ result }), error => respond({ error: error.message }));
    return true;
});

function recordActivity(ids) {
    if (actions.private) return;
    const work = () => actions.returnActive(ids);
    queue = queue.then(work, work);
    queue.catch(() => {}); // A storage error must not interrupt ordinary tab use.
}
chrome.tabs.onActivated.addListener(info => {
    // Capture this decision at event delivery, before the serialized Undo ends.
    // Native restore activation is incidental, not an intentional card opening.
    if (previewBatch.active && previewBatch.run.expected.get(info.windowId) === info.tabId) return;
    const work = actions.activationTask(info.tabId);
    if (!work) return;
    queue = queue.then(work, work); queue.catch(() => {});
});
chrome.tabs.onUpdated.addListener((id, change, tab) => { if (!previewBatch.active && change.url && tab.active) recordActivity([id]); });

chrome.tabGroups.onRemoved.addListener(group => {
    personalization.protectedGroups().catch(() => {});
    chrome.storage.session.remove(`tabgridGroupView:${actions.private ? 'private' : 'regular'}:${group.id}`).catch(() => {});
});
chrome.windows.onRemoved.addListener(id => chrome.storage.session.remove([`tabgridView:${actions.private ? 'private' : 'regular'}:${id}`,gridLifecycle.viewKey(id)]).catch(() => {}));
