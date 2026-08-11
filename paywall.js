const statusEl = document.getElementById("status");
const refreshBtn = document.getElementById("refresh");
const closeBtn = document.getElementById("close");
const authMessageEl = document.getElementById("authMessage");
const authCopyEl = document.getElementById("authCopy");
const authSignedInEl = document.getElementById("authSignedIn");
const authGoogleBtn = document.getElementById("authGoogle");
const authSignedInTextEl = document.getElementById("authSignedInText");
const authSignOutBtn = document.getElementById("authSignOut");

const APP_BASE_URL = "https://mail.voicetext.world";
const DEVICE_TOKEN_STORAGE_KEY = "aiEmailWriterDeviceToken";
const FREE_DAILY_REPLIES = 8;

let authState = { signedIn: false, email: "" };
let deviceToken = "";

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

async function getActiveTabUrl() {
  const tab = await queryActiveTab();
  return String(tab?.url || "https://mail.google.com/mail/u/0/#inbox");
}

function setStatus(text, ok = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("ok", ok);
}

function createDeviceToken() {
  if (globalThis.crypto?.randomUUID) {
    return `aiew_${globalThis.crypto.randomUUID()}`;
  }
  return `aiew_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

async function loadOrCreateDeviceToken() {
  if (deviceToken) {
    return deviceToken;
  }

  const result = await chrome.storage.local.get([DEVICE_TOKEN_STORAGE_KEY]);
  const existing = String(result?.[DEVICE_TOKEN_STORAGE_KEY] || "").trim();
  if (existing) {
    deviceToken = existing;
    return existing;
  }

  deviceToken = createDeviceToken();
  await chrome.storage.local.set({ [DEVICE_TOKEN_STORAGE_KEY]: deviceToken });
  return deviceToken;
}

async function apiRequest(pathname, options = {}) {
  const response = await fetch(`${APP_BASE_URL}${pathname}`, options);
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

async function loadAuthState() {
  await loadOrCreateDeviceToken();
  const result = await apiRequest(`/auth/me?device_token=${encodeURIComponent(deviceToken)}`);
  authState = {
    signedIn: !!result.signedIn,
    email: result.email || "",
  };
  authCopyEl.hidden = authState.signedIn;
  authGoogleBtn.hidden = authState.signedIn;
  authSignedInEl.hidden = !authState.signedIn;
  authSignedInTextEl.textContent = authState.signedIn ? `Signed in as ${authState.email}` : "";
  authMessageEl.textContent = authState.signedIn
    ? ""
    : `Use up to ${FREE_DAILY_REPLIES} free replies per day. Sign in with Google if you want the same daily limit across devices.`;
  return result;
}

async function signInWithGoogle() {
  authGoogleBtn.disabled = true;
  authGoogleBtn.textContent = "Opening Google...";
  try {
    await loadOrCreateDeviceToken();
    const returnUrl = await getActiveTabUrl();
    setStatus("Opening Google sign-in...");
    window.location.assign(
      `${APP_BASE_URL}/auth/google/start?device_token=${encodeURIComponent(deviceToken)}&return_url=${encodeURIComponent(returnUrl)}`
    );
  } catch (error) {
    setStatus(error.message || "Unable to start Google sign-in.");
    authGoogleBtn.disabled = false;
    authGoogleBtn.textContent = "Continue with Google";
  }
}

async function signOut() {
  try {
    await loadOrCreateDeviceToken();
    await apiRequest("/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-token": deviceToken,
      },
      body: JSON.stringify({ device_token: deviceToken }),
    });
    await loadAuthState();
    setStatus("Signed out.");
  } catch (error) {
    setStatus(error.message || "Unable to sign out.");
  }
}

async function refreshStatus() {
  setStatus("Checking daily limit...");
  try {
    const result = await loadAuthState();
    const repliesLeft = Number.isFinite(Number(result?.repliesLeft))
      ? Math.max(0, Math.floor(Number(result.repliesLeft)))
      : FREE_DAILY_REPLIES;
    setStatus(`${repliesLeft} of ${FREE_DAILY_REPLIES} replies left today.`, true);
  } catch (error) {
    setStatus(error.message || "Failed to refresh daily limit.");
  }
}

authGoogleBtn.addEventListener("click", () => {
  void signInWithGoogle();
});

authSignOutBtn.addEventListener("click", () => {
  void signOut();
});

refreshBtn.addEventListener("click", () => {
  void refreshStatus();
});

closeBtn.addEventListener("click", () => {
  window.close();
});

void refreshStatus();
