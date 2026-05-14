let lastFocusedTarget = null;
const PENDING_DRAFT_STORAGE_KEY = "pendingEmailInsert";
const CONTEXT_STORAGE_KEY = "activeEmailContext";
const COMPOSER_TRIGGER_STYLE_ID = "ai-email-writer-compose-trigger-style";

function isGmailPage() {
  return window.location.hostname === "mail.google.com";
}

function isVisibleElement(element) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && element.offsetParent !== null;
}

function findVisibleElement(selectors) {
  for (const selector of selectors) {
    const nodes = document.querySelectorAll(selector);
    for (const node of nodes) {
      if (isVisibleElement(node)) {
        return node;
      }
    }
  }
  return null;
}

function findGmailComposeButton() {
  return findVisibleElement([
    'div[gh="cm"]',
    'button[gh="cm"]',
    '[role="button"][gh="cm"]',
    ".T-I.T-I-KE.L3"
  ]);
}

function findGmailReplyButton() {
  return findVisibleElement([
    'div[role="button"][data-tooltip^="Reply"]',
    'span[role="button"][data-tooltip^="Reply"]',
    'div[role="button"][aria-label^="Reply"]',
    'span[role="button"][aria-label^="Reply"]',
    'div[command="rd"]',
    'span[command="rd"]'
  ]);
}

function findGmailSubjectInput() {
  return findVisibleElement([
    'input[name="subjectbox"]',
    'input[placeholder="Subject"]'
  ]);
}

function findGmailThreadSubject() {
  const subjectNode = findVisibleElement([
    "h2[data-thread-perm-id]",
    "h2.hP",
    'h2[role="heading"]'
  ]);
  return subjectNode?.innerText?.trim() || "";
}

function extractGmailReplyContext() {
  if (!isGmailPage()) {
    return { subject: "", preview: "", fullText: "" };
  }

  const visibleBodies = Array.from(
    document.querySelectorAll('.a3s.aiL, .a3s.aXjCH, div[data-message-id] .a3s')
  )
    .filter((node) => isVisibleElement(node) && node.innerText?.trim())
    .map((node) => node.innerText.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim())
    .filter(Boolean);

  const threadSubject = findGmailThreadSubject();
  const latestMessage = visibleBodies[visibleBodies.length - 1] || "";
  const preview = latestMessage
    ? `${latestMessage.slice(0, 280).trim()}${latestMessage.length > 280 ? "..." : ""}`
    : "";

  return {
    subject: threadSubject,
    preview,
    fullText: latestMessage,
  };
}

function isGmailBodyTarget(target) {
  return (
    target instanceof HTMLElement &&
    target.getAttribute("role") === "textbox" &&
    target.getAttribute("g_editable") === "true"
  );
}

function findGmailBodyTarget() {
  if (isGmailBodyTarget(document.activeElement) && isVisibleElement(document.activeElement)) {
    return document.activeElement;
  }

  return findVisibleElement([
    'div[role="textbox"][g_editable="true"]',
    'div[aria-label="Message Body"][role="textbox"]'
  ]);
}

function isEditableTarget(target) {
  if (!target) {
    return false;
  }

  if (target instanceof HTMLTextAreaElement) {
    return true;
  }

  if (target instanceof HTMLInputElement) {
    return /^(text|search|email)$/i.test(target.type || "text");
  }

  return target instanceof HTMLElement && target.isContentEditable;
}

function rememberFocusedTarget(target) {
  if (!isEditableTarget(target)) {
    return;
  }
  lastFocusedTarget = target;
}

function getCurrentComposeState() {
  const gmailBody = isGmailPage() ? findGmailBodyTarget() : null;
  const gmailSubject = isGmailPage() ? findGmailSubjectInput() : null;
  const gmailContext = extractGmailReplyContext();
  const activeTarget = isEditableTarget(document.activeElement)
    ? document.activeElement
    : gmailBody || lastFocusedTarget;

  return {
    pageTitle: document.title || "",
    hasEditableTarget: Boolean(activeTarget || gmailSubject),
    targetTag: activeTarget?.tagName || "",
    targetLabel:
      gmailSubject?.getAttribute?.("aria-label") ||
      activeTarget?.getAttribute?.("aria-label") ||
      activeTarget?.getAttribute?.("placeholder") ||
      (isGmailPage() ? "Gmail compose" : ""),
    isGmail: isGmailPage(),
    emailSubject: gmailContext.subject,
    emailContextPreview: gmailContext.preview,
    emailContextFull: gmailContext.fullText,
  };
}

function insertIntoTarget(target, text) {
  if (!isEditableTarget(target)) {
    throw new Error("Click inside an email field first.");
  }

  const normalized = String(text || "");
  if (!normalized.trim()) {
    throw new Error("Nothing to insert.");
  }

  target.focus();

  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    const start = Number.isFinite(target.selectionStart) ? target.selectionStart : target.value.length;
    const end = Number.isFinite(target.selectionEnd) ? target.selectionEnd : target.value.length;
    const before = target.value.slice(0, start);
    const after = target.value.slice(end);
    target.value = `${before}${normalized}${after}`;
    const caret = start + normalized.length;
    target.selectionStart = caret;
    target.selectionEnd = caret;
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }

  const selection = window.getSelection();
  if (!selection) {
    throw new Error("Unable to access page selection.");
  }

  const range = selection.rangeCount ? selection.getRangeAt(0) : document.createRange();
  range.deleteContents();
  const textNode = document.createTextNode(normalized);
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  target.dispatchEvent(new Event("input", { bubbles: true }));
}

function setInputValue(target, value) {
  const normalized = String(value || "");
  target.focus();
  const descriptor = Object.getOwnPropertyDescriptor(target.constructor.prototype, "value");
  if (descriptor?.set) {
    descriptor.set.call(target, normalized);
  } else {
    target.value = normalized;
  }
  target.dispatchEvent(new Event("input", { bubbles: true }));
  target.dispatchEvent(new Event("change", { bubbles: true }));
}

async function waitFor(getter, timeoutMs = 8000, stepMs = 150) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = getter();
    if (value) {
      return value;
    }
    await new Promise((resolve) => window.setTimeout(resolve, stepMs));
  }
  return null;
}

async function ensureGmailComposer() {
  if (!isGmailPage()) {
    throw new Error("Gmail is not open in this tab.");
  }

  let body = findGmailBodyTarget();
  let subject = findGmailSubjectInput();
  if (body || subject) {
    return { body, subject };
  }

  const composeButton = findGmailComposeButton();
  if (!composeButton) {
    throw new Error("Unable to find the Gmail compose button.");
  }

  composeButton.click();
  body = await waitFor(findGmailBodyTarget);
  subject = await waitFor(findGmailSubjectInput);
  if (!body && !subject) {
    throw new Error("Gmail compose did not open.");
  }

  return { body, subject };
}

async function ensureGmailReplyComposer() {
  let body = findGmailBodyTarget();
  let subject = findGmailSubjectInput();
  if (body || subject) {
    return { body, subject };
  }

  const replyButton = findGmailReplyButton();
  if (replyButton) {
    replyButton.click();
    body = await waitFor(findGmailBodyTarget, 6000);
    subject = await waitFor(findGmailSubjectInput, 1500, 120);
    if (body || subject) {
      return { body, subject };
    }
  }

  return ensureGmailComposer();
}

async function insertDraftIntoGmail(draft) {
  const { subject, body } = await ensureGmailReplyComposer();
  if (subject && draft.subject) {
    setInputValue(subject, draft.subject);
  }
  if (body && draft.body) {
    insertIntoTarget(body, draft.body);
  }
  await chrome.storage.local.remove(PENDING_DRAFT_STORAGE_KEY);
}

function findComposeRoot(target) {
  if (!target) {
    return null;
  }

  return (
    target.closest('[role="dialog"]') ||
    target.closest(".M9") ||
    target.closest(".AD") ||
    target.closest(".nH.Hd") ||
    target.closest(".I5") ||
    null
  );
}

function findComposeFooter(root) {
  if (!root) {
    return null;
  }

  return (
    root.querySelector(".gU.Up") ||
    root.querySelector(".btC") ||
    root.querySelector(".aDh") ||
    root.querySelector(".HE") ||
    null
  );
}

function findComposeActionAnchor(root) {
  if (!root) {
    return null;
  }

  return findVisibleElement([
    '.aDh .dC',
    '.btC .dC',
    '.gU.Up .dC',
    '.HE .dC',
    '.aDh [role="button"][data-tooltip^="Send"]',
    '.btC [role="button"][data-tooltip^="Send"]',
    '.gU.Up [role="button"][data-tooltip^="Send"]',
    '.HE [role="button"][data-tooltip^="Send"]'
  ]);
}

function ensureComposeTriggerStyles() {
  if (document.getElementById(COMPOSER_TRIGGER_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = COMPOSER_TRIGGER_STYLE_ID;
  style.textContent = `
    .aiew-compose-trigger-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 36px;
      margin: 0 10px;
      flex: 0 0 auto;
      vertical-align: middle;
    }
    .aiew-compose-trigger {
      min-width: 112px;
      height: 36px;
      padding: 0 14px;
      border-radius: 18px;
      border: 1px solid rgba(26,115,232,0.18);
      background: linear-gradient(180deg, #1a73e8 0%, #0b57d0 100%);
      box-shadow: 0 4px 10px rgba(26,115,232,0.12);
      color: #fff;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      font-size: 12px;
      font-weight: 700;
      line-height: 36px;
      letter-spacing: 0;
      transition: transform 0.14s ease, box-shadow 0.14s ease;
      z-index: 2;
      white-space: nowrap;
    }
    .aiew-compose-trigger:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 12px rgba(26,115,232,0.16);
    }
  `;
  document.head.appendChild(style);
}

async function openSidePanelForCurrentEmail() {
  const context = extractGmailReplyContext();
  await chrome.storage.local.set({
    [CONTEXT_STORAGE_KEY]: {
      subject: String(context.subject || ""),
      preview: String(context.preview || ""),
      fullText: String(context.fullText || ""),
      updatedAt: Date.now(),
    },
  });

  return chrome.runtime.sendMessage({
    type: "openSidePanelForTab",
  });
}

function mountComposeTriggerForTarget(target) {
  const root = findComposeRoot(target);
  if (!root || root.querySelector(".aiew-compose-trigger")) {
    return;
  }

  const footer = findComposeFooter(root);
  if (!(footer instanceof HTMLElement)) {
    return;
  }
  const anchor = findComposeActionAnchor(root);

  const wrapper = document.createElement("span");
  wrapper.className = "aiew-compose-trigger-wrap";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "aiew-compose-trigger";
  button.textContent = "Write with AI";
  button.addEventListener("click", () => {
    rememberFocusedTarget(target);
    void openSidePanelForCurrentEmail();
  });

  wrapper.appendChild(button);
  if (anchor instanceof HTMLElement && anchor.parentElement) {
    anchor.insertAdjacentElement("afterend", wrapper);
    return;
  }
  footer.appendChild(wrapper);
}

function ensureComposeTriggers() {
  if (!isGmailPage()) {
    return;
  }

  ensureComposeTriggerStyles();
  const targets = Array.from(document.querySelectorAll('div[role="textbox"][g_editable="true"]')).filter(isVisibleElement);
  targets.forEach((target) => {
    if (isGmailBodyTarget(target)) {
      mountComposeTriggerForTarget(target);
    }
  });
}

async function consumePendingDraftIfNeeded() {
  if (!isGmailPage()) {
    return;
  }

  const result = await chrome.storage.local.get([PENDING_DRAFT_STORAGE_KEY]);
  const draft = result?.[PENDING_DRAFT_STORAGE_KEY];
  if (!draft?.body) {
    return;
  }

  try {
    await insertDraftIntoGmail(draft);
  } catch (_error) {
    window.setTimeout(() => {
      void consumePendingDraftIfNeeded();
    }, 1000);
  }
}

document.addEventListener(
  "focusin",
  (event) => {
    rememberFocusedTarget(event.target);
    if (isGmailBodyTarget(event.target)) {
      ensureComposeTriggers();
    }
  },
  true
);

if (isGmailPage()) {
  window.setTimeout(() => {
    void consumePendingDraftIfNeeded();
    ensureComposeTriggers();
  }, 600);

  const observer = new MutationObserver(() => {
    ensureComposeTriggers();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message?.type) {
    return false;
  }

  if (message.type === "getComposeState") {
    sendResponse({ ok: true, state: getCurrentComposeState() });
    return false;
  }

  if (message.type === "insertGeneratedEmail") {
    try {
      const target = isEditableTarget(document.activeElement) ? document.activeElement : lastFocusedTarget;
      insertIntoTarget(target, message.text);
      sendResponse({ ok: true });
    } catch (error) {
      sendResponse({ ok: false, error: error.message || "Unable to insert generated email." });
    }
    return false;
  }

  if (message.type === "ensureEmailComposer") {
    void ensureGmailComposer()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message || "Unable to open Gmail composer." }));
    return true;
  }

  if (message.type === "insertGeneratedEmailDraft") {
    const draft = {
      subject: String(message.subject || ""),
      body: String(message.body || ""),
    };

    if (isGmailPage()) {
      void insertDraftIntoGmail(draft)
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: error.message || "Unable to insert draft into Gmail." }));
      return true;
    }

    try {
      const target = isEditableTarget(document.activeElement) ? document.activeElement : lastFocusedTarget;
      insertIntoTarget(target, draft.body);
      sendResponse({ ok: true });
    } catch (error) {
      sendResponse({ ok: false, error: error.message || "Unable to insert generated email." });
    }
    return false;
  }

  return false;
});
