const statusEl = document.getElementById("status");
const hintEl = document.getElementById("hint");
const taskInputEl = document.getElementById("taskInput");
const toneSelectEl = document.getElementById("toneSelect");
const draftOutputEl = document.getElementById("draftOutput");
const contextTitleEl = document.getElementById("contextTitle");
const contextNoteEl = document.getElementById("contextNote");
const contextBarEl = document.querySelector(".context-bar");
const refreshContextBtn = document.getElementById("refreshContextBtn");
const insertDraftBtn = document.getElementById("insertDraftBtn");
const generateBtn = document.getElementById("generateBtn");
const openPaywallBtn = document.getElementById("openPaywallBtn");
const monthlyPlanBtn = document.getElementById("monthlyPlanBtn");
const yearlyPlanBtn = document.getElementById("yearlyPlanBtn");
const profileTriggerBtn = document.getElementById("profileTrigger");
const closeDrawerBtn = document.getElementById("closeDrawer");
const drawerBackdropEl = document.getElementById("drawerBackdrop");
const drawerUpgradeBtn = document.getElementById("drawerUpgrade");
const accountActionBtn = document.getElementById("accountAction");
const drawerPlanNameEl = document.getElementById("drawerPlanName");
const drawerPlanMetaEl = document.getElementById("drawerPlanMeta");
const backToReaderBtn = document.getElementById("backToReader");
const readerScreenEl = document.getElementById("readerScreen");
const paywallScreenEl = document.getElementById("paywallScreen");

const GMAIL_INBOX_URL = "https://mail.google.com/mail/u/0/#inbox";
const APP_BASE_URL = "https://mail.voicetext.world";
const CONTEXT_STORAGE_KEY = "activeEmailContext";
const DEVICE_TOKEN_STORAGE_KEY = "aiEmailWriterDeviceToken";
const FREE_TRIAL_REPLIES = 15;

const state = {
  status: "Ready",
  message: "Open a Gmail email. Click “Write with AI”. Type what you want, then insert the reply.",
  activeScreen: "reader",
  gmailAutoOpened: false,
  isGmailTab: false,
  activeTabId: null,
  deviceToken: "",
  emailContext: {
    subject: "",
    preview: "",
    fullText: "",
    language: "",
  },
  account: {
    signedIn: false,
    email: "",
    paid: false,
    plan: null,
    subscriptionStatus: "none",
  },
  trial: {
    repliesLeft: FREE_TRIAL_REPLIES,
  },
};

function updateUI() {
  statusEl.textContent = state.status;
  hintEl.textContent = state.message;
  const showingPaywall = state.activeScreen === "paywall";
  readerScreenEl.classList.toggle("hidden", showingPaywall);
  paywallScreenEl.classList.toggle("hidden", !showingPaywall);
  backToReaderBtn.classList.toggle("hidden", !showingPaywall);
  updateContextUI();
  updateTrialUI();
  updateActionState();
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

function sendTabMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

function openExternalPage(url) {
  chrome.tabs.create({ url });
}

async function detectEmailLanguage(text) {
  const source = String(text || "").trim();
  if (!source) {
    return "";
  }

  try {
    const result = await chrome.i18n.detectLanguage(source);
    return String(result?.languages?.[0]?.language || "").trim();
  } catch (_error) {
    return "";
  }
}

function buildReplySubject(subject) {
  const base = String(subject || "").trim();
  if (!base) {
    return "";
  }
  return /^re:/i.test(base) ? base : `Re: ${base}`;
}

function renderContext(context) {
  state.emailContext = {
    subject: String(context?.subject || ""),
    preview: String(context?.preview || ""),
    fullText: String(context?.fullText || ""),
    language: String(context?.language || ""),
  };
}

function updateContextUI() {
  const subject = state.emailContext.subject.trim();
  contextTitleEl.textContent = subject || "No Gmail email selected";
  contextNoteEl.textContent = subject ? "" : "Open a Gmail thread, then click “Write with AI”.";
  contextBarEl.classList.toggle("has-context", Boolean(subject));
}

function updateActionState() {
  const hasDraft = Boolean(draftOutputEl.value.trim());
  insertDraftBtn.disabled = !hasDraft;
  generateBtn.textContent = hasDraft ? "Regenerate reply" : "Generate reply";
  if (isTrialExhausted()) {
    generateBtn.disabled = true;
    insertDraftBtn.disabled = !hasDraft;
  } else {
    generateBtn.disabled = false;
  }
}

function isTrialExhausted() {
  return !state.account.paid && Number(state.trial.repliesLeft || 0) <= 0;
}

function updateTrialUI() {
  const repliesLeft = Math.max(0, Number(state.trial.repliesLeft || 0));
  const exhausted = repliesLeft <= 0;
  const signedIn = Boolean(state.account.signedIn);
  const paid = Boolean(state.account.paid);
  openPaywallBtn.classList.toggle("hidden", paid || !exhausted);
  drawerUpgradeBtn.classList.toggle("hidden", paid || !exhausted);
  accountActionBtn.textContent = signedIn ? "Sign out" : "Sign in with Google";

  if (paid) {
    drawerPlanNameEl.textContent = "Premium";
    drawerPlanMetaEl.textContent = "Unlimited email writing is active on this account.";
    if (state.activeScreen === "reader") {
      statusEl.textContent = state.status === "Trial ended" ? "Ready" : state.status;
    }
    return;
  }

  drawerPlanNameEl.textContent = exhausted ? "Trial Ended" : "Free Trial";
  drawerPlanMetaEl.textContent = signedIn
    ? exhausted
      ? `Signed in as ${state.account.email || "your account"}. Your 15 free replies are used up.`
      : `${repliesLeft} of ${FREE_TRIAL_REPLIES} free replies left. Signed in as ${state.account.email || "your account"}.`
    : exhausted
      ? "Your 15 free replies are used up. Upgrade to keep writing."
      : `${repliesLeft} of ${FREE_TRIAL_REPLIES} free replies left.`;
  if (exhausted) {
    if (state.activeScreen === "reader") {
      statusEl.textContent = "Trial ended";
      hintEl.textContent = "Your free trial is over. Choose a plan to keep writing replies.";
    }
    return;
  }
}

async function loadTrialState() {
  state.trial = { repliesLeft: FREE_TRIAL_REPLIES };
}

async function loadStoredContext() {
  const result = await chrome.storage.local.get([CONTEXT_STORAGE_KEY]);
  const context = result?.[CONTEXT_STORAGE_KEY];
  if (!context) {
    return false;
  }

  renderContext(context);
  return true;
}

function createDeviceToken() {
  if (globalThis.crypto?.randomUUID) {
    return `aiew_${globalThis.crypto.randomUUID()}`;
  }
  return `aiew_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

async function loadOrCreateDeviceToken() {
  const result = await chrome.storage.local.get([DEVICE_TOKEN_STORAGE_KEY]);
  const existing = String(result?.[DEVICE_TOKEN_STORAGE_KEY] || "").trim();
  if (existing) {
    state.deviceToken = existing;
    return existing;
  }

  const token = createDeviceToken();
  state.deviceToken = token;
  await chrome.storage.local.set({ [DEVICE_TOKEN_STORAGE_KEY]: token });
  return token;
}

async function apiRequest(pathname, options = {}) {
  const url = `${APP_BASE_URL}${pathname}`;
  const response = await fetch(url, options);
  let data = {};
  try {
    data = await response.json();
  } catch (_error) {
    data = {};
  }

  if (!response.ok) {
    throw new Error(String(data?.error || `Request failed with ${response.status}`));
  }

  return data;
}

async function loadAccountState() {
  if (!state.deviceToken) {
    await loadOrCreateDeviceToken();
  }

  try {
    const data = await apiRequest(`/auth/me?device_token=${encodeURIComponent(state.deviceToken)}`);
    state.account = {
      signedIn: Boolean(data?.signedIn),
      email: String(data?.email || ""),
      paid: Boolean(data?.paid),
      plan: String(data?.plan || ""),
      subscriptionStatus: String(data?.subscriptionStatus || "none"),
    };
    if (Number.isFinite(Number(data?.repliesLeft))) {
      state.trial = {
        repliesLeft: Math.max(0, Math.min(FREE_TRIAL_REPLIES, Math.floor(Number(data.repliesLeft)))),
      };
    }
  } catch (_error) {
    state.account = {
      signedIn: false,
      email: "",
      paid: false,
      plan: null,
      subscriptionStatus: "none",
    };
    state.trial = { repliesLeft: FREE_TRIAL_REPLIES };
  }
}

async function startGoogleSignIn() {
  if (!state.deviceToken) {
    await loadOrCreateDeviceToken();
  }
  openExternalPage(`${APP_BASE_URL}/auth/google/start?device_token=${encodeURIComponent(state.deviceToken)}`);
}

async function signOutAccount() {
  if (!state.deviceToken) {
    await loadOrCreateDeviceToken();
  }
  await apiRequest("/auth/logout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-device-token": state.deviceToken,
    },
    body: JSON.stringify({ device_token: state.deviceToken }),
  });
  await loadAccountState();
}

async function startCheckout(planId) {
  if (!state.deviceToken) {
    await loadOrCreateDeviceToken();
  }

  const data = await apiRequest("/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-device-token": state.deviceToken,
    },
    body: JSON.stringify({
      device_token: state.deviceToken,
      plan: planId,
    }),
  });

  if (!data?.url) {
    throw new Error("Unable to open checkout.");
  }

  openExternalPage(String(data.url));
}

async function refreshActivePageContext() {
  try {
    const tab = await queryActiveTab();
    state.activeTabId = Number.isFinite(tab?.id) ? tab.id : null;
    const url = String(tab?.url || "");
    state.isGmailTab = /^https:\/\/mail\.google\.com\//i.test(url);

    if (!state.isGmailTab) {
      await loadStoredContext();
      if (!state.gmailAutoOpened) {
        state.gmailAutoOpened = true;
        setStatus("Opening Gmail", "Gmail is opening automatically so you can click “Write with AI”.");
        openExternalPage(GMAIL_INBOX_URL);
        return;
      }
      setStatus("Ready", "Open a Gmail email and click “Write with AI”.");
      return;
    }

    state.gmailAutoOpened = false;
    const response = await sendTabMessage(state.activeTabId, { type: "getComposeState" });
    const composeState = response?.state || {};
    const fullText = String(composeState.emailContextFull || "");
    const preview = String(composeState.emailContextPreview || "");
    const subject = String(composeState.emailSubject || "");
    const language = await detectEmailLanguage([subject, fullText, preview].filter(Boolean).join("\n"));

    renderContext({
      subject,
      preview,
      fullText,
      language,
    });

    if (state.emailContext.preview || state.emailContext.subject) {
      setStatus("Email loaded", "Describe what the reply should do, then generate and insert it.");
    } else {
      setStatus("Ready", "Open a Gmail email and click “Write with AI”.");
    }
  } catch (_error) {
    await loadStoredContext();
    setStatus("Ready", "Open a Gmail email and click “Write with AI”.");
  }
}

async function generateDraft() {
  if (isTrialExhausted()) {
    setActiveScreen("paywall");
    setStatus("Trial ended", "Your free trial is over. Choose a plan to keep writing replies.");
    return null;
  }
  const taskPrompt = taskInputEl.value.trim();
  if (!taskPrompt) {
    setStatus("Add a task", "Describe the reply you want before generating it.");
    taskInputEl.focus();
    return null;
  }
  if (!state.deviceToken) {
    await loadOrCreateDeviceToken();
  }

  const previousLabel = draftOutputEl.value.trim() ? "Regenerate reply" : "Generate reply";
  generateBtn.disabled = true;
  generateBtn.textContent = "Generating...";
  setStatus("Generating", "Writing your reply...");

  try {
    const data = await apiRequest("/generate-reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-token": state.deviceToken,
      },
      body: JSON.stringify({
        device_token: state.deviceToken,
        task: taskPrompt,
        tone: toneSelectEl.value,
        subject: state.emailContext.subject,
        emailContext: state.emailContext.fullText || state.emailContext.preview,
        sourceLanguage: state.emailContext.language,
      }),
    });

    const subject = String(data?.subject || "").trim() || buildReplySubject(state.emailContext.subject);
    const body = String(data?.body || "").trim();
    if (!body) {
      throw new Error("The reply came back empty.");
    }

    draftOutputEl.value = body;
    state.account.paid = Boolean(data?.paid);
    state.account.subscriptionStatus = String(data?.subscriptionStatus || state.account.subscriptionStatus || "none");
    state.account.plan = String(data?.plan || state.account.plan || "");
    if (Number.isFinite(Number(data?.repliesLeft))) {
      state.trial = {
        repliesLeft: Math.max(0, Math.min(FREE_TRIAL_REPLIES, Math.floor(Number(data.repliesLeft)))),
      };
    }

    updateActionState();
    if (state.account.paid) {
      setStatus("Draft ready", "Review the draft, then insert it into Gmail.");
    } else if (isTrialExhausted()) {
      setStatus("Draft ready", "This was your last free reply. Choose a plan to keep writing.");
    } else {
      setStatus("Draft ready", `Review the draft, then insert it into Gmail. ${state.trial.repliesLeft} free replies left.`);
    }

    return { subject, body };
  } catch (error) {
    if (/not-enough-replies/i.test(String(error.message || ""))) {
      state.trial = { repliesLeft: 0 };
      updateUI();
      setActiveScreen("paywall");
      setStatus("Trial ended", "Your free trial is over. Choose a plan to keep writing replies.");
      return null;
    }

    setStatus("Generation failed", error.message || "Unable to generate a reply right now.");
    return null;
  } finally {
    generateBtn.textContent = previousLabel;
    updateActionState();
  }
}

async function insertDraft() {
  const body = draftOutputEl.value.trim();
  const draft = body
    ? { subject: buildReplySubject(state.emailContext.subject), body }
    : await generateDraft();
  if (!draft) {
    return;
  }

  if (!state.activeTabId) {
    setStatus("Needs Gmail", "Open Gmail and click the composer button before inserting a draft.");
    return;
  }

  try {
    const response = await sendTabMessage(state.activeTabId, {
      type: "insertGeneratedEmailDraft",
      subject: draft.subject,
      body: draft.body,
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Unable to insert draft into Gmail.");
    }

    setStatus("Inserted", "Draft inserted into Gmail.");
  } catch (_error) {
    setStatus("Needs Gmail", "Open Gmail and click the composer button before inserting a draft.");
  }
}

function initializePopup() {
  void Promise.all([loadTrialState(), loadOrCreateDeviceToken(), loadAccountState()]).then(() => {
    updateUI();
    void refreshActivePageContext();
  });

  taskInputEl.addEventListener("input", updateActionState);
  draftOutputEl.addEventListener("input", updateActionState);

  generateBtn.addEventListener("click", () => {
    void generateDraft();
  });
  insertDraftBtn.addEventListener("click", () => {
    void insertDraft();
  });

  openPaywallBtn.addEventListener("click", () => {
    setActiveScreen("paywall");
  });
  refreshContextBtn.addEventListener("click", () => {
    void refreshActivePageContext();
  });
  backToReaderBtn.addEventListener("click", () => {
    setActiveScreen("reader");
  });

  monthlyPlanBtn.addEventListener("click", () => {
    void startCheckout("monthly").catch((error) => {
      setStatus("Checkout unavailable", error.message || "Unable to open checkout.");
    });
  });
  yearlyPlanBtn.addEventListener("click", () => {
    void startCheckout("annual").catch((error) => {
      setStatus("Checkout unavailable", error.message || "Unable to open checkout.");
    });
  });

  profileTriggerBtn.addEventListener("click", openDrawer);
  closeDrawerBtn.addEventListener("click", closeDrawer);
  drawerBackdropEl.addEventListener("click", closeDrawer);
  drawerUpgradeBtn.addEventListener("click", () => {
    setActiveScreen("paywall");
    closeDrawer();
  });
  accountActionBtn.addEventListener("click", () => {
    if (state.account.signedIn) {
      void signOutAccount()
        .then(() => {
          updateUI();
          setStatus("Signed out", "You can still use your free replies on this device.");
        })
        .catch((error) => {
          setStatus("Sign-out failed", error.message || "Unable to sign out right now.");
        });
      return;
    }
    void startGoogleSignIn();
  });

  window.addEventListener("focus", () => {
    void loadAccountState().then(updateUI);
    void refreshActivePageContext();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      void loadAccountState().then(updateUI);
      void refreshActivePageContext();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePopup, { once: true });
} else {
  initializePopup();
}
