const output = document.querySelector('#output');
const report = { started: new Date().toISOString(), userAgent: navigator.userAgent, results: [] };
const initial = new Set((await chrome.sessions.getRecentlyClosed()).map(s => s.tab?.sessionId || s.window?.sessionId));
const owned = new Set();
const controller = await chrome.tabs.getCurrent();
const render = () => { output.textContent = JSON.stringify(report, null, 2); };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function inspect() {
  const sessions = await chrome.sessions.getRecentlyClosed();
  report.newSessions = sessions.filter(s => !initial.has(s.tab?.sessionId || s.window?.sessionId)).map(s => ({sessionId: s.tab?.sessionId || s.window?.sessionId, url: s.tab?.url, title: s.tab?.title, window: !!s.window}));
  render();
}
async function run(kind) {
  const before = new Set((await chrome.sessions.getRecentlyClosed()).map(s => s.tab?.sessionId || s.window?.sessionId));
  const result = { kind, time: new Date().toISOString() };
  report.results.push(result); render();
  const url = ['direct', 'pinned'].includes(kind) ? 'chrome://newtab/' : chrome.runtime.getURL(`tests/native-restore/target.html?case=${kind}&run=${Date.now()}`);
  const tab = await chrome.tabs.create({windowId: controller.windowId, url, active: kind === 'manual', pinned: kind === 'pinned'});
  owned.add(tab.id); result.tabId = tab.id;
  for (let n = 0; n < 40; n++) { if ((await chrome.tabs.get(tab.id)).status === 'complete') break; await pause(100); }
  if (kind === 'manual') { result.awaitingManualClose = true; render(); return; }
  if (['blank', 'newtab'].includes(kind)) {
    const destination = kind === 'blank' ? 'about:blank' : 'chrome://newtab/';
    result.beforeReplace = await chrome.tabs.sendMessage(tab.id, {type:'native-restore-test-replace', url:destination});
    for (let n = 0; n < 40; n++) { const current = await chrome.tabs.get(tab.id); if (current.url === destination && current.status === 'complete') break; await pause(100); }
  }
  const final = await chrome.tabs.get(tab.id);
  result.committedURL = final.url; result.status = final.status; result.pinned = final.pinned;
  if (!owned.has(tab.id)) throw new Error('Refusing to close an unowned tab');
  await chrome.tabs.remove(tab.id); owned.delete(tab.id);
  await pause(500);
  result.addedSessions = (await chrome.sessions.getRecentlyClosed()).filter(s => !before.has(s.tab?.sessionId || s.window?.sessionId)).map(s => ({sessionId:s.tab?.sessionId || s.window?.sessionId,url:s.tab?.url,title:s.tab?.title,window:!!s.window}));
  render();
}
for (const kind of ['baseline','blank','newtab','direct','pinned','manual']) document.getElementById(kind).onclick = async () => {
  for (const button of document.querySelectorAll('button')) button.disabled = true;
  try { await run(kind); } catch (error) { report.error = String(error); render(); }
  finally { for (const button of document.querySelectorAll('button')) button.disabled = false; }
};
document.querySelector('#inspect').onclick = inspect;
render();
