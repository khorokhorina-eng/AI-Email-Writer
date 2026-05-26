const APP_BASE_URL = "https://mail.voicetext.world";

async function configureSidePanelBehavior() {
  if (!chrome.sidePanel?.setPanelBehavior) {
    return;
  }

  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (_error) {
    // Best effort only.
  }
}

async function configureUninstallUrl() {
  if (!chrome.runtime?.setUninstallURL) {
    return;
  }

  try {
    await chrome.runtime.setUninstallURL(`${APP_BASE_URL}/uninstall.html`);
  } catch (_error) {
    // Best effort only.
  }
}

void configureSidePanelBehavior();
void configureUninstallUrl();

chrome.runtime.onInstalled.addListener((details) => {
  void configureSidePanelBehavior();
  void configureUninstallUrl();
  if (details.reason !== "install") {
    return;
  }

  chrome.storage.local.set({ welcomeShown: true });
  chrome.tabs.create({ url: `${APP_BASE_URL}/welcome.html` });
});

chrome.runtime.onStartup?.addListener(() => {
  void configureSidePanelBehavior();
  void configureUninstallUrl();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "openSidePanelForTab") {
    return false;
  }

  const tabId = Number(message.tabId || sender.tab?.id);
  const windowId = Number(message.windowId || sender.tab?.windowId);
  if (!Number.isFinite(tabId) || !Number.isFinite(windowId) || !chrome.sidePanel?.open) {
    sendResponse({ ok: false });
    return false;
  }

  void chrome.sidePanel
    .open({ tabId, windowId })
    .then(() => sendResponse({ ok: true }))
    .catch(() => sendResponse({ ok: false }));

  return true;
});
