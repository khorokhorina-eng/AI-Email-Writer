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

void configureSidePanelBehavior();

chrome.runtime.onInstalled.addListener((details) => {
  void configureSidePanelBehavior();
  if (details.reason !== "install") {
    return;
  }

  chrome.storage.local.set({ welcomeShown: true });
  chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
});

chrome.runtime.onStartup?.addListener(() => {
  void configureSidePanelBehavior();
});
