const statusEl = document.getElementById("status");
const hintEl = document.getElementById("hint");
const pageContextEl = document.getElementById("pageContext");
const modeSelectEl = document.getElementById("modeSelect");
const toneSelectEl = document.getElementById("toneSelect");
const promptInputEl = document.getElementById("promptInput");
const generateBtn = document.getElementById("generateBtn");
const subjectOutputEl = document.getElementById("subjectOutput");
const bodyOutputEl = document.getElementById("bodyOutput");
const copyBtn = document.getElementById("copyBtn");
const insertBtn = document.getElementById("insertBtn");
const openPaywallBtn = document.getElementById("openPaywall");
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

const DRAFT_STORAGE_KEY = "emailWriterDraft";

const state = {
  status: "Ready",
  message: "Describe the email you need to write.",
  activePage: "Checking current tab…",
  hasEditableTarget: false,
  activeScreen: "reader",
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

function openDrawer() {
  document.body.classList.add("drawer-open");
  drawerBackdropEl.classList.remove("hidden");
}

function closeDrawer() {
  document.body.classList.remove("drawer-open");
  drawerBackdropEl.classList.add("hidden");
}

function setActiveScreen(screen) {
  state.activeScreen = screen === "paywall" ? "paywall" : "reader";
  updateUI();
}

function readStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => resolve(result || {}));
  });
}

function writeStorage(payload) {
  return new Promise((resolve) => {
    chrome.storage.local.set(payload, () => resolve());
  });
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

function sendMessageToActiveTab(message) {
  return queryActiveTab().then((tab) => {
    if (!tab?.id) {
      throw new Error("No active tab found.");
    }
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response?.ok) {
          reject(new Error(response?.error || "Tab request failed."));
          return;
        }
        resolve(response);
      });
    });
  });
}

function sentenceCase(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function guessSubject(prompt, mode) {
  const cleaned = sentenceCase(prompt.replace(/[.?!]+$/, ""));
  if (!cleaned) {
    return "Draft email";
  }
  if (mode === "reply") {
    return `Re: ${cleaned}`;
  }
  if (mode === "rewrite") {
    return `Updated draft: ${cleaned}`;
  }
  return cleaned.length > 58 ? `${cleaned.slice(0, 55).trim()}...` : cleaned;
}

function buildOpening(mode, tone) {
  if (mode === "reply") {
    if (tone === "friendly") return "Thanks for your message.";
    if (tone === "polite") return "Thank you for reaching out.";
    if (tone === "confident") return "Thanks for the note.";
    return "Thank you for your email.";
  }

  if (mode === "rewrite") {
    if (tone === "friendly") return "Here is a cleaner version of the message:";
    if (tone === "confident") return "Here is a sharper version of the draft:";
    return "Here is a revised version of the draft:";
  }

  if (tone === "friendly") return "Hi,";
  if (tone === "polite") return "Hello,";
  if (tone === "confident") return "Hello,";
  return "Hello,";
}

function buildBody(prompt, mode, tone) {
  const normalizedPrompt = sentenceCase(prompt.replace(/\s+/g, " "));
  const toneHint =
    tone === "friendly"
      ? "Keep the wording warm and easy to read."
      : tone === "polite"
      ? "Keep the wording respectful and clear."
      : tone === "confident"
      ? "Keep the wording direct and decisive."
      : "Keep the wording professional and concise.";

  const taskLine =
    mode === "reply"
      ? `I'm replying regarding: ${normalizedPrompt}.`
      : mode === "rewrite"
      ? `Please revise this draft with the following goal: ${normalizedPrompt}.`
      : `I'm writing about: ${normalizedPrompt}.`;

  return [
    buildOpening(mode, tone),
    "",
    taskLine,
    toneHint,
    "",
    "Best,",
    "[Your name]",
  ].join("\n");
}

function generateEmailDraft(prompt, mode, tone) {
  return {
    subject: guessSubject(prompt, mode),
    body: buildBody(prompt, mode, tone),
  };
}

async function refreshActivePageContext() {
  try {
    const tab = await queryActiveTab();
    const stateResponse = await sendMessageToActiveTab({ type: "getComposeState" }).catch(() => null);
    const pageTitle = stateResponse?.state?.pageTitle || tab?.title || "Current tab";
    const targetLabel = stateResponse?.state?.targetLabel || "";
    state.hasEditableTarget = Boolean(stateResponse?.state?.hasEditableTarget);
    state.activePage = targetLabel ? `${pageTitle} · ${targetLabel}` : pageTitle;
    setStatus(
      "Ready",
      state.hasEditableTarget
        ? "Generate an email, then insert it into the active field."
        : "Generate an email and copy it, or click into an editable field first."
    );
  } catch (_error) {
    state.hasEditableTarget = false;
    state.activePage = "Unable to inspect the current tab";
    setStatus("Ready", "Generate an email and copy it into your browser-based inbox.");
  }
}

async function saveDraft() {
  await writeStorage({
    [DRAFT_STORAGE_KEY]: {
      mode: modeSelectEl.value,
      tone: toneSelectEl.value,
      prompt: promptInputEl.value,
      subject: subjectOutputEl.value,
      body: bodyOutputEl.value,
    },
  });
}

async function restoreDraft() {
  const result = await readStorage([DRAFT_STORAGE_KEY]);
  const draft = result?.[DRAFT_STORAGE_KEY];
  if (!draft) {
    return;
  }

  modeSelectEl.value = draft.mode || "write";
  toneSelectEl.value = draft.tone || "professional";
  promptInputEl.value = draft.prompt || "";
  subjectOutputEl.value = draft.subject || "";
  bodyOutputEl.value = draft.body || "";
}

async function handleGenerate() {
  const prompt = promptInputEl.value.trim();
  if (!prompt) {
    setStatus("Needs prompt", "Add a short instruction like “follow up after interview”.");
    promptInputEl.focus();
    return;
  }

  generateBtn.disabled = true;
  generateBtn.textContent = "Generating...";
  try {
    const draft = generateEmailDraft(prompt, modeSelectEl.value, toneSelectEl.value);
    subjectOutputEl.value = draft.subject;
    bodyOutputEl.value = draft.body;
    await saveDraft();
    setStatus("Ready", state.hasEditableTarget ? "Email generated. You can insert it into the current page." : "Email generated. Copy it into your browser-based inbox.");
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "Generate email";
  }
}

async function handleCopy() {
  const fullText = `Subject: ${subjectOutputEl.value.trim()}\n\n${bodyOutputEl.value.trim()}`.trim();
  if (!fullText) {
    setStatus("Nothing to copy", "Generate an email first.");
    return;
  }

  await navigator.clipboard.writeText(fullText);
  setStatus("Copied", "Email copied to clipboard.");
}

async function handleInsert() {
  const body = bodyOutputEl.value.trim();
  if (!body) {
    setStatus("Nothing to insert", "Generate an email first.");
    return;
  }

  try {
    await sendMessageToActiveTab({ type: "insertGeneratedEmail", text: body });
    setStatus("Inserted", "Generated email was inserted into the current field.");
  } catch (error) {
    setStatus("Insert failed", error.message || "Click into an editable field first.");
  }
}

function openExternalPage(url) {
  chrome.tabs.create({ url });
}

function initializeQuickChips() {
  document.querySelectorAll(".quick-chip").forEach((button) => {
    button.addEventListener("click", () => {
      promptInputEl.value = button.dataset.prompt || "";
      void saveDraft();
      promptInputEl.focus();
    });
  });
}

function initializePopup() {
  updateUI();
  void restoreDraft().then(() => {
    void refreshActivePageContext();
  });
  initializeQuickChips();

  promptInputEl.addEventListener("input", () => { void saveDraft(); });
  modeSelectEl.addEventListener("change", () => { void saveDraft(); });
  toneSelectEl.addEventListener("change", () => { void saveDraft(); });
  subjectOutputEl.addEventListener("input", () => { void saveDraft(); });
  bodyOutputEl.addEventListener("input", () => { void saveDraft(); });

  generateBtn.addEventListener("click", () => { void handleGenerate(); });
  copyBtn.addEventListener("click", () => { void handleCopy(); });
  insertBtn.addEventListener("click", () => { void handleInsert(); });

  openPaywallBtn.addEventListener("click", () => { setActiveScreen("paywall"); });
  backToReaderBtn.addEventListener("click", () => { setActiveScreen("reader"); });
  monthlyPlanBtn.addEventListener("click", () => {
    openExternalPage("https://example.com/ai-email-writer/pricing");
  });
  yearlyPlanBtn.addEventListener("click", () => {
    openExternalPage("https://example.com/ai-email-writer/pricing");
  });

  profileTriggerBtn.addEventListener("click", openDrawer);
  closeDrawerBtn.addEventListener("click", closeDrawer);
  drawerBackdropEl.addEventListener("click", closeDrawer);
  drawerUpgradeBtn.addEventListener("click", () => { setActiveScreen("paywall"); closeDrawer(); });
  accountActionBtn.addEventListener("click", () => {
    openExternalPage("mailto:hello@example.com?subject=AI%20Email%20Writer");
  });

  window.addEventListener("focus", () => {
    void refreshActivePageContext();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePopup, { once: true });
} else {
  initializePopup();
}
