const statusEl = document.getElementById("status");
const hintEl = document.getElementById("hint");
const pageContextEl = document.getElementById("pageContext");
const openGmailBtn = document.getElementById("openGmailBtn");
const openPaywallBtn = document.getElementById("openPaywallBtn");
const monthlyPlanBtn = document.getElementById("monthlyPlanBtn");
const yearlyPlanBtn = document.getElementById("yearlyPlanBtn");
const profileTriggerBtn = document.getElementById("profileTrigger");
const closeDrawerBtn = document.getElementById("closeDrawer");
const drawerBackdropEl = document.getElementById("drawerBackdrop");
const drawerUpgradeBtn = document.getElementById("drawerUpgrade");
const accountActionBtn = document.getElementById("accountAction");
const backToReaderBtn = document.getElementById("backToReader");
const readerScreenEl = document.getElementById("readerScreen");
const paywallScreenEl = document.getElementById("paywallScreen");

const GMAIL_INBOX_URL = "https://mail.google.com/mail/u/0/#inbox";

const state = {
  status: "Ready",
  message: "Open Gmail and use the Write with AI button inside the page.",
  activePage: "Checking current tab…",
  activeScreen: "reader",
  gmailAutoOpened: false,
};

function updateUI() {
  statusEl.textContent = state.status;
  hintEl.textContent = state.message;
  pageContextEl.textContent = state.activePage;

  const showingPaywall = state.activeScreen === "paywall";
  readerScreenEl.classList.toggle("hidden", showingPaywall);
  paywallScreenEl.classList.toggle("hidden", !showingPaywall);
  backToReaderBtn.classList.toggle("hidden", !showingPaywall);
}

function setStatus(status, message) {
  state.status = status;
  state.message = message;
  updateUI();
}

function setActiveScreen(screen) {
  state.activeScreen = screen === "paywall" ? "paywall" : "reader";
  updateUI();
}

function openDrawer() {
  document.body.classList.add("drawer-open");
  drawerBackdropEl.classList.remove("hidden");
}

function closeDrawer() {
  document.body.classList.remove("drawer-open");
  drawerBackdropEl.classList.add("hidden");
}

function queryActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(tabs?.[0] || null);
    });
  });
}

function openExternalPage(url) {
  chrome.tabs.create({ url });
}

async function refreshActivePageContext() {
  try {
    const tab = await queryActiveTab();
    const title = tab?.title || "Current tab";
    const url = String(tab?.url || "");
    state.activePage = title;

    if (/^https:\/\/mail\.google\.com\//i.test(url)) {
      state.gmailAutoOpened = false;
      setStatus("Ready", "Use the Write with AI button inside Gmail to generate and insert replies.");
      return;
    }

    if (!state.gmailAutoOpened) {
      state.gmailAutoOpened = true;
      setStatus("Opening Gmail", "Gmail is opening automatically so you can use the inline assistant.");
      openExternalPage(GMAIL_INBOX_URL);
      return;
    }

    setStatus("Ready", "Open Gmail to use the inline Write with AI experience.");
  } catch (_error) {
    state.activePage = "Unable to inspect the current tab";
    setStatus("Ready", "Open Gmail to use the inline Write with AI experience.");
  }
}

function initializePopup() {
  updateUI();
  void refreshActivePageContext();

  openGmailBtn.addEventListener("click", () => {
    openExternalPage(GMAIL_INBOX_URL);
  });
  openPaywallBtn.addEventListener("click", () => {
    setActiveScreen("paywall");
  });
  backToReaderBtn.addEventListener("click", () => {
    setActiveScreen("reader");
  });

  monthlyPlanBtn.addEventListener("click", () => {
    openExternalPage("https://example.com/ai-email-writer/pricing");
  });
  yearlyPlanBtn.addEventListener("click", () => {
    openExternalPage("https://example.com/ai-email-writer/pricing");
  });

  profileTriggerBtn.addEventListener("click", openDrawer);
  closeDrawerBtn.addEventListener("click", closeDrawer);
  drawerBackdropEl.addEventListener("click", closeDrawer);
  drawerUpgradeBtn.addEventListener("click", () => {
    setActiveScreen("paywall");
    closeDrawer();
  });
  accountActionBtn.addEventListener("click", () => {
    openExternalPage("https://accounts.google.com/ServiceLogin?service=mail");
  });

  window.addEventListener("focus", () => {
    void refreshActivePageContext();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      void refreshActivePageContext();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePopup, { once: true });
} else {
  initializePopup();
}
