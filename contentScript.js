let lastFocusedTarget = null;
const PENDING_DRAFT_STORAGE_KEY = "pendingEmailInsert";
const INLINE_ASSISTANT_ID = "ai-email-writer-inline-assistant";
const INLINE_ASSISTANT_STYLE_ID = "ai-email-writer-inline-style";
const INLINE_RESPONSE_TYPES = ["Interested", "Need more info", "Not now", "Schedule a call", "Custom"];
const INLINE_TONES = ["Professional", "Friendly", "Direct"];

const INLINE_COPY = {
  en: {
    opening: { Professional: "Hi,", Friendly: "Hi there,", Direct: "Hello," },
    response: {
      Interested: "Thanks for the note. I'm interested and would be happy to keep the conversation moving.",
      "Need more info": "Thanks for the message. I'd be glad to continue once I have a bit more detail.",
      "Not now": "Thanks for reaching out. This is not the right time for me to move forward.",
      "Schedule a call": "Thanks for the message. A quick call sounds like a good next step.",
      Custom: "Thanks for your message."
    },
    tone: {
      Professional: "Keep the reply clear, concise, and polished.",
      Friendly: "Keep the reply warm, helpful, and easy to read.",
      Direct: "Keep the reply brief, confident, and action-oriented."
    },
    context: "I am replying to this email:",
    thread: "I am replying to the current email thread.",
    task: "Task for this reply:",
    signoff: "Best,"
  },
  ru: {
    opening: { Professional: "Здравствуйте,", Friendly: "Привет,", Direct: "Здравствуйте," },
    response: {
      Interested: "Спасибо за письмо. Мне интересно, и я буду рад(а) продолжить разговор.",
      "Need more info": "Спасибо за сообщение. Я с удовольствием продолжу, когда получу немного больше деталей.",
      "Not now": "Спасибо, что написали. Сейчас не лучший момент, чтобы двигаться дальше.",
      "Schedule a call": "Спасибо за сообщение. Короткий звонок будет хорошим следующим шагом.",
      Custom: "Спасибо за ваше сообщение."
    },
    tone: {
      Professional: "Сделай ответ ясным, кратким и аккуратным.",
      Friendly: "Сделай ответ тёплым, доброжелательным и лёгким для чтения.",
      Direct: "Сделай ответ коротким, уверенным и по делу."
    },
    context: "Я отвечаю на это письмо:",
    thread: "Я отвечаю на текущее письмо.",
    task: "Задача для этого ответа:",
    signoff: "С уважением,"
  },
  es: {
    opening: { Professional: "Hola,", Friendly: "Hola,", Direct: "Hola," },
    response: {
      Interested: "Gracias por tu mensaje. Me interesa y con gusto puedo seguir la conversación.",
      "Need more info": "Gracias por el mensaje. Con gusto continúo cuando tenga un poco más de información.",
      "Not now": "Gracias por escribir. Este no es el mejor momento para avanzar.",
      "Schedule a call": "Gracias por el mensaje. Una llamada breve sería un buen siguiente paso.",
      Custom: "Gracias por tu mensaje."
    },
    tone: {
      Professional: "Mantén la respuesta clara, breve y profesional.",
      Friendly: "Mantén la respuesta cálida, amable y fácil de leer.",
      Direct: "Mantén la respuesta breve, segura y directa."
    },
    context: "Estoy respondiendo a este correo:",
    thread: "Estoy respondiendo al hilo actual.",
    task: "Objetivo de esta respuesta:",
    signoff: "Saludos,"
  },
  fr: {
    opening: { Professional: "Bonjour,", Friendly: "Bonjour,", Direct: "Bonjour," },
    response: {
      Interested: "Merci pour votre message. Cela m'intéresse et je serais ravi(e) de poursuivre la conversation.",
      "Need more info": "Merci pour votre message. Je serai ravi(e) de continuer avec un peu plus de détails.",
      "Not now": "Merci pour votre message. Ce n'est pas le bon moment pour aller plus loin.",
      "Schedule a call": "Merci pour votre message. Un court appel serait une bonne prochaine étape.",
      Custom: "Merci pour votre message."
    },
    tone: {
      Professional: "Garde une réponse claire, concise et soignée.",
      Friendly: "Garde une réponse chaleureuse, utile et facile à lire.",
      Direct: "Garde une réponse brève, claire et directe."
    },
    context: "Je réponds à cet email :",
    thread: "Je réponds au fil actuel.",
    task: "Objectif de cette réponse :",
    signoff: "Bien à vous,"
  },
  de: {
    opening: { Professional: "Hallo,", Friendly: "Hallo,", Direct: "Hallo," },
    response: {
      Interested: "Danke für die Nachricht. Ich bin interessiert und würde das Gespräch gern fortsetzen.",
      "Need more info": "Danke für die Nachricht. Ich mache gern weiter, sobald ich etwas mehr Details habe.",
      "Not now": "Danke für die Nachricht. Im Moment ist nicht der richtige Zeitpunkt, um weiterzugehen.",
      "Schedule a call": "Danke für die Nachricht. Ein kurzes Gespräch wäre ein guter nächster Schritt.",
      Custom: "Danke für die Nachricht."
    },
    tone: {
      Professional: "Halte die Antwort klar, knapp und professionell.",
      Friendly: "Halte die Antwort freundlich, warm und leicht lesbar.",
      Direct: "Halte die Antwort kurz, klar und direkt."
    },
    context: "Ich antworte auf diese E-Mail:",
    thread: "Ich antworte auf den aktuellen E-Mail-Verlauf.",
    task: "Ziel dieser Antwort:",
    signoff: "Viele Grüße,"
  },
  it: {
    opening: { Professional: "Ciao,", Friendly: "Ciao,", Direct: "Ciao," },
    response: {
      Interested: "Grazie per il messaggio. Mi interessa e sarei felice di continuare la conversazione.",
      "Need more info": "Grazie per il messaggio. Posso continuare volentieri quando avrò qualche dettaglio in più.",
      "Not now": "Grazie per aver scritto. Questo non è il momento giusto per andare avanti.",
      "Schedule a call": "Grazie per il messaggio. Una breve call sarebbe un buon passo successivo.",
      Custom: "Grazie per il tuo messaggio."
    },
    tone: {
      Professional: "Mantieni la risposta chiara, concisa e curata.",
      Friendly: "Mantieni la risposta cordiale, utile e facile da leggere.",
      Direct: "Mantieni la risposta breve, sicura e diretta."
    },
    context: "Sto rispondendo a questa email:",
    thread: "Sto rispondendo al thread corrente.",
    task: "Obiettivo di questa risposta:",
    signoff: "Cordiali saluti,"
  },
  pt: {
    opening: { Professional: "Olá,", Friendly: "Olá,", Direct: "Olá," },
    response: {
      Interested: "Obrigado pela mensagem. Tenho interesse e ficarei feliz em continuar a conversa.",
      "Need more info": "Obrigado pela mensagem. Posso continuar assim que tiver um pouco mais de informação.",
      "Not now": "Obrigado por entrar em contato. Este não é o melhor momento para avançar.",
      "Schedule a call": "Obrigado pela mensagem. Uma breve chamada seria um bom próximo passo.",
      Custom: "Obrigado pela mensagem."
    },
    tone: {
      Professional: "Mantenha a resposta clara, concisa e profissional.",
      Friendly: "Mantenha a resposta calorosa, útil e fácil de ler.",
      Direct: "Mantenha a resposta breve, confiante e direta."
    },
    context: "Estou respondendo a este email:",
    thread: "Estou respondendo ao email atual.",
    task: "Objetivo desta resposta:",
    signoff: "Atenciosamente,"
  },
  tr: {
    opening: { Professional: "Merhaba,", Friendly: "Merhaba,", Direct: "Merhaba," },
    response: {
      Interested: "Mesajınız için teşekkür ederim. İlgileniyorum ve konuşmaya devam etmek isterim.",
      "Need more info": "Mesajınız için teşekkür ederim. Biraz daha detay aldıktan sonra memnuniyetle devam edebilirim.",
      "Not now": "Yazdığınız için teşekkür ederim. Şu an ilerlemek için doğru zaman değil.",
      "Schedule a call": "Mesajınız için teşekkür ederim. Kısa bir görüşme iyi bir sonraki adım olabilir.",
      Custom: "Mesajınız için teşekkür ederim."
    },
    tone: {
      Professional: "Yanıtı net, kısa ve profesyonel tut.",
      Friendly: "Yanıtı sıcak, yardımcı ve kolay okunur tut.",
      Direct: "Yanıtı kısa, net ve doğrudan tut."
    },
    context: "Bu e-postaya yanıt veriyorum:",
    thread: "Mevcut e-posta dizisine yanıt veriyorum.",
    task: "Bu yanıtın görevi:",
    signoff: "Saygılarımla,"
  }
};

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
    '.T-I.T-I-KE.L3'
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
    'h2[data-thread-perm-id]',
    'h2.hP',
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
    ? latestMessage.slice(0, 280).trim() + (latestMessage.length > 280 ? "..." : "")
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
  const pageTitle = document.title || "";
  const hasEditableTarget = Boolean(activeTarget || gmailSubject);

  return {
    pageTitle,
    hasEditableTarget,
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
  const { subject, body } = await ensureGmailComposer();
  if (subject && draft.subject) {
    setInputValue(subject, draft.subject);
  }
  if (body && draft.body) {
    insertIntoTarget(body, draft.body);
  }
  await chrome.storage.local.remove(PENDING_DRAFT_STORAGE_KEY);
}

function normalizeInlineLanguageCode(code) {
  const normalized = String(code || "en").toLowerCase();
  if (normalized.startsWith("ru")) return "ru";
  if (normalized.startsWith("es")) return "es";
  if (normalized.startsWith("fr")) return "fr";
  if (normalized.startsWith("de")) return "de";
  if (normalized.startsWith("it")) return "it";
  if (normalized.startsWith("pt")) return "pt";
  if (normalized.startsWith("tr")) return "tr";
  return "en";
}

async function detectInlineLanguage(text) {
  const source = String(text || "").trim();
  if (!source) {
    return "en";
  }

  try {
    const result = await chrome.i18n.detectLanguage(source);
    return normalizeInlineLanguageCode(result?.languages?.[0]?.language);
  } catch (_error) {
    return "en";
  }
}

function buildInlineReplyBody({ taskPrompt, responseType, tone, context, languageCode }) {
  const copy = INLINE_COPY[normalizeInlineLanguageCode(languageCode)] || INLINE_COPY.en;
  const contextSnippet = context?.fullText
    ? `${copy.context} "${context.fullText.slice(0, 360).trim()}${context.fullText.length > 360 ? "..." : ""}"`
    : copy.thread;
  const taskLine = taskPrompt ? `${copy.task} ${taskPrompt.trim()}` : "";

  return [
    copy.opening[tone] || copy.opening.Professional,
    "",
    copy.response[responseType] || copy.response.Custom,
    contextSnippet,
    taskLine,
    copy.tone[tone] || copy.tone.Professional,
    "",
    copy.signoff,
    "[Your name]",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildInlineReplySubject(context) {
  const base = String(context?.subject || "").trim();
  if (!base) {
    return "";
  }
  return /^re:/i.test(base) ? base : `Re: ${base}`;
}

function ensureInlineAssistantStyles() {
  if (document.getElementById(INLINE_ASSISTANT_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = INLINE_ASSISTANT_STYLE_ID;
  style.textContent = `
    #${INLINE_ASSISTANT_ID} {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 2147483640;
      font-family: "Segoe UI", Arial, sans-serif;
    }
    .aiew-launcher {
      min-width: 196px;
      min-height: 58px;
      padding: 0 18px;
      border-radius: 18px;
      border: 1px solid rgba(26,115,232,0.18);
      background: linear-gradient(180deg, #1a73e8 0%, #0b57d0 100%);
      box-shadow: 0 16px 34px rgba(26,115,232,0.28);
      color: #ffffff;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.01em;
      transition: transform 0.14s ease, box-shadow 0.14s ease, opacity 0.14s ease;
    }
    .aiew-launcher:hover {
      transform: translateY(-1px);
      box-shadow: 0 20px 36px rgba(26,115,232,0.32);
    }
    .aiew-launcher-label {
      display: inline-block;
    }
    .aiew-panel {
      width: 360px;
      margin-top: 12px;
      padding: 18px;
      border-radius: 20px;
      background: rgba(255,255,255,0.98);
      border: 1px solid #d7e2f4;
      box-shadow: 0 18px 42px rgba(60,64,67,0.18);
      color: #202124;
    }
    .aiew-hidden { display: none !important; }
    .aiew-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; }
    .aiew-title { margin:0; font-size:18px; font-weight:700; letter-spacing:-0.02em; }
    .aiew-close {
      border: 0; background: transparent; color: #5f6368; cursor:pointer; font-size:18px; line-height:1;
    }
    .aiew-label { margin: 0 0 8px; font-size: 12px; font-weight: 700; color: #5f6368; text-transform: uppercase; letter-spacing: 0.04em; }
    .aiew-context {
      padding: 12px; border-radius: 14px; background: #f7faff; border: 1px solid #e0e9f8; margin-bottom: 14px;
    }
    .aiew-context-subject { margin:0 0 8px; font-size:14px; font-weight:600; }
    .aiew-context-preview { margin:0; font-size:13px; line-height:1.5; color:#5f6368; max-height: 110px; overflow:auto; white-space:pre-wrap; }
    .aiew-chip-row { display:flex; flex-wrap:wrap; gap:8px; margin-bottom: 14px; }
    .aiew-chip {
      border: 1px solid #d7e2f4; background:#fff; color:#334155; border-radius: 999px; padding:8px 12px; font-size:12px; font-weight:600; cursor:pointer;
    }
    .aiew-chip.is-active {
      background: #e8f0fe; color:#0b57d0; border-color:#bfd3fb;
    }
    .aiew-textarea {
      width: 100%; min-height: 84px; border-radius: 14px; border:1px solid #d7e2f4; padding: 12px 13px; font: inherit; font-size: 13px; line-height: 1.5; resize: vertical; margin-bottom: 14px;
    }
    .aiew-preview {
      width: 100%; min-height: 140px; border-radius: 14px; border:1px solid #d7e2f4; padding: 12px 13px; background:#fbfcff; font: inherit; font-size: 13px; line-height: 1.55; color:#202124; resize: vertical; margin-bottom: 14px;
    }
    .aiew-actions { display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
    .aiew-primary, .aiew-secondary {
      min-height: 44px; border-radius: 14px; cursor:pointer; font: inherit; font-size: 14px; font-weight: 700;
    }
    .aiew-primary { border:0; background:#1a73e8; color:#fff; }
    .aiew-secondary { border:1px solid #d7e2f4; background:#fff; color:#334155; }
  `;
  document.head.appendChild(style);
}

function createInlineAssistant() {
  if (document.getElementById(INLINE_ASSISTANT_ID)) {
    return document.getElementById(INLINE_ASSISTANT_ID);
  }

  ensureInlineAssistantStyles();
  const root = document.createElement("div");
  root.id = INLINE_ASSISTANT_ID;
  root.innerHTML = `
    <button class="aiew-launcher" type="button" aria-label="Write with AI"><span class="aiew-launcher-label">Write with AI</span></button>
    <div class="aiew-panel aiew-hidden" role="dialog" aria-label="AI Email Writer">
      <div class="aiew-head">
        <h2 class="aiew-title">Write with AI</h2>
        <button class="aiew-close" type="button" aria-label="Close">×</button>
      </div>
      <div class="aiew-context">
        <p class="aiew-label">Message context</p>
        <p class="aiew-context-subject"></p>
        <p class="aiew-context-preview"></p>
      </div>
      <p class="aiew-label">Quick intents</p>
      <div class="aiew-chip-row aiew-response-row"></div>
      <p class="aiew-label">Task for AI</p>
      <textarea class="aiew-textarea aiew-task" placeholder="Ask for a deadline and say you will get back next week."></textarea>
      <p class="aiew-label">Tone</p>
      <div class="aiew-chip-row aiew-tone-row"></div>
      <p class="aiew-label">Draft preview</p>
      <textarea class="aiew-preview" placeholder="Your generated reply will appear here."></textarea>
      <div class="aiew-actions">
        <button class="aiew-secondary" type="button" data-action="insert">Insert</button>
        <button class="aiew-primary" type="button" data-action="generate">Generate</button>
      </div>
    </div>
  `;
  document.body.appendChild(root);
  return root;
}

function setActiveChip(container, value) {
  container.querySelectorAll(".aiew-chip").forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.value === value);
  });
}

function initializeChipRow(container, values, initialValue) {
  container.innerHTML = "";
  values.forEach((value) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "aiew-chip";
    chip.dataset.value = value;
    chip.textContent = value;
    container.appendChild(chip);
  });
  setActiveChip(container, initialValue);
}

function initializeInlineAssistant() {
  if (!isGmailPage()) {
    return;
  }

  const root = createInlineAssistant();
  const launcher = root.querySelector(".aiew-launcher");
  const panel = root.querySelector(".aiew-panel");
  const closeButton = root.querySelector(".aiew-close");
  const contextSubject = root.querySelector(".aiew-context-subject");
  const contextPreview = root.querySelector(".aiew-context-preview");
  const responseRow = root.querySelector(".aiew-response-row");
  const toneRow = root.querySelector(".aiew-tone-row");
  const taskInput = root.querySelector(".aiew-task");
  const previewOutput = root.querySelector(".aiew-preview");
  const generateButton = root.querySelector('[data-action="generate"]');
  const insertButton = root.querySelector('[data-action="insert"]');

  initializeChipRow(responseRow, INLINE_RESPONSE_TYPES, "Interested");
  initializeChipRow(toneRow, INLINE_TONES, "Professional");

  function currentContext() {
    return extractGmailReplyContext();
  }

  function syncContext() {
    const context = currentContext();
    contextSubject.textContent = context.subject || "Current email";
    contextPreview.textContent = context.preview || "Open a Gmail thread to use contextual replies.";
    return context;
  }

  function selectedValue(container, fallback) {
    return container.querySelector(".aiew-chip.is-active")?.dataset.value || fallback;
  }

  launcher.addEventListener("click", () => {
    panel.classList.toggle("aiew-hidden");
    if (!panel.classList.contains("aiew-hidden")) {
      syncContext();
    }
  });

  closeButton.addEventListener("click", () => {
    panel.classList.add("aiew-hidden");
  });

  responseRow.addEventListener("click", (event) => {
    const chip = event.target.closest(".aiew-chip");
    if (!chip) {
      return;
    }
    setActiveChip(responseRow, chip.dataset.value);
    const value = chip.dataset.value;
    if (!taskInput.value.trim()) {
      taskInput.value = value;
      return;
    }
    if (!taskInput.value.toLowerCase().includes(value.toLowerCase())) {
      taskInput.value = `${taskInput.value.trim()}. ${value}`.trim();
    }
  });

  toneRow.addEventListener("click", (event) => {
    const chip = event.target.closest(".aiew-chip");
    if (!chip) {
      return;
    }
    setActiveChip(toneRow, chip.dataset.value);
  });

  generateButton.addEventListener("click", async () => {
    const context = syncContext();
    const languageCode = await detectInlineLanguage(`${context.subject}\n${context.fullText}`);
    const body = buildInlineReplyBody({
      taskPrompt: taskInput.value,
      responseType: selectedValue(responseRow, "Interested"),
      tone: selectedValue(toneRow, "Professional"),
      context,
      languageCode,
    });
    previewOutput.value = body;
  });

  insertButton.addEventListener("click", async () => {
    const context = syncContext();
    const body = previewOutput.value.trim();
    if (!body) {
      const languageCode = await detectInlineLanguage(`${context.subject}\n${context.fullText}`);
      previewOutput.value = buildInlineReplyBody({
        taskPrompt: taskInput.value,
        responseType: selectedValue(responseRow, "Interested"),
        tone: selectedValue(toneRow, "Professional"),
        context,
        languageCode,
      });
    }

    void ensureGmailReplyComposer()
      .then(({ body: composeBody, subject }) => {
        if (subject && context.subject) {
          const replySubject = buildInlineReplySubject(context);
          if (replySubject) {
            setInputValue(subject, replySubject);
          }
        }
        insertIntoTarget(composeBody || findGmailBodyTarget(), previewOutput.value.trim());
      })
      .catch(() => null);
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
  },
  true
);

if (isGmailPage()) {
  window.setTimeout(() => {
    void consumePendingDraftIfNeeded();
  }, 600);
  window.setTimeout(() => {
    initializeInlineAssistant();
  }, 900);
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
      body: String(message.body || "")
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
