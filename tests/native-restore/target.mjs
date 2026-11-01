document.querySelector('#info').textContent = JSON.stringify({ url: location.href, historyLength: history.length }, null, 2);
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || message.type !== 'native-restore-test-replace') return;
  if (!['about:blank', 'chrome://newtab/'].includes(message.url)) return;
  respond({ historyLength: history.length, url: location.href });
  setTimeout(() => location.replace(message.url), 0);
});
