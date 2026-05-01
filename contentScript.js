let lastFocusedTarget = null;

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
  const activeTarget = isEditableTarget(document.activeElement)
    ? document.activeElement
    : lastFocusedTarget;
  const pageTitle = document.title || "";

  return {
    pageTitle,
    hasEditableTarget: Boolean(activeTarget),
    targetTag: activeTarget?.tagName || "",
    targetLabel:
      activeTarget?.getAttribute?.("aria-label") ||
      activeTarget?.getAttribute?.("placeholder") ||
      "",
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

document.addEventListener(
  "focusin",
  (event) => {
    rememberFocusedTarget(event.target);
  },
  true
);

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

  return false;
});
