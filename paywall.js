const statusEl = document.getElementById("status");
const refreshBtn = document.getElementById("refresh");
const closeBtn = document.getElementById("close");
const planButtons = Array.from(document.querySelectorAll("button[data-plan-id]"));
const authMessageEl = document.getElementById("authMessage");
const authCopyEl = document.getElementById("authCopy");
const authSignedInEl = document.getElementById("authSignedIn");
const authGoogleBtn = document.getElementById("authGoogle");
const authSignedInTextEl = document.getElementById("authSignedInText");
const authSignOutBtn = document.getElementById("authSignOut");

const APP_BASE_URL = "https://mail.voicetext.world";
const DEVICE_TOKEN_STORAGE_KEY = "aiEmailWriterDeviceToken";
const FREE_TRIAL_REPLIES = 15;

let currentSubscription = { active: false, plan: null };
let authState = { signedIn: false, email: "", method: null };
let deviceToken = "";
const analyticsSessionId = `aiew_paywall_${Date.now()}`;

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

async function trackEvent(name, params = {}) {
  await loadOrCreateDeviceToken();

  try {
    await apiRequest("/analytics/event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-token": deviceToken,
      },
      body: JSON.stringify({
        device_token: deviceToken,
        name,
        session_id: analyticsSessionId,
        params,
      }),
    });
  } catch (_error) {
    // Best effort only.
  }
}

function updateButtons() {
  const activePlanId = currentSubscription?.plan?.planId || "";

  planButtons.forEach((button) => {
    const planId = button.dataset.planId || "";
    const isCurrentPlan = currentSubscription?.active && activePlanId === planId;
    button.disabled = isCurrentPlan;
    button.textContent = isCurrentPlan
      ? "Current plan"
      : authState.signedIn
      ? "Upgrade"
      : "Sign in first";
  });
}

async function loadAuthState() {
  await loadOrCreateDeviceToken();
  const result = await apiRequest(`/auth/me?device_token=${encodeURIComponent(deviceToken)}`);
  authState = {
    signedIn: !!result.signedIn,
    email: result.email || "",
    method: result.method || null,
  };
  authCopyEl.hidden = authState.signedIn;
  authGoogleBtn.hidden = authState.signedIn;
  authSignedInEl.hidden = !authState.signedIn;
  authSignedInTextEl.textContent = authState.signedIn ? `Signed in as ${authState.email}` : "";
  authMessageEl.textContent = authState.signedIn
    ? ""
    : `Use your ${FREE_TRIAL_REPLIES} free replies first. Sign in with Google when you want to buy a plan.`;
  updateButtons();
  return result;
}

async function signInWithGoogle(source = "paywall_google") {
  authGoogleBtn.disabled = true;
  authGoogleBtn.textContent = "Opening Google...";
  try {
    await loadOrCreateDeviceToken();
    const returnUrl = await getActiveTabUrl();
    await trackEvent("login_started", {
      source,
      target_screen: "paywall",
    });
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
    currentSubscription = { active: false, plan: null };
    await loadAuthState();
    setStatus("Signed out. Sign in again before checkout.");
  } catch (error) {
    setStatus(error.message || "Unable to sign out.");
  }
}

async function openCheckout(planId, button) {
  if (!planId) {
    return;
  }

  await loadAuthState();
  if (!authState.signedIn) {
    setStatus("Continue with Google before checkout.");
    await signInWithGoogle(`checkout_${planId}`);
    return;
  }

  const initialLabel = button.textContent;
  button.disabled = true;
  button.textContent = "Creating checkout...";
  setStatus("Creating Stripe Checkout session...");

  try {
    await loadOrCreateDeviceToken();
    const returnUrl = await getActiveTabUrl();
    await trackEvent("checkout_started", { plan_id: planId });
    const result = await apiRequest("/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-token": deviceToken,
      },
      body: JSON.stringify({
        device_token: deviceToken,
        plan: planId,
        return_url: returnUrl,
      }),
    });

    if (!result?.url) {
      throw new Error("Checkout URL is missing.");
    }

    setStatus("Redirecting to Stripe Checkout...");
    window.location.assign(String(result.url));
  } catch (error) {
    setStatus(error.message || "Unable to open checkout.");
  } finally {
    if (button.textContent === "Creating checkout...") {
      button.textContent = initialLabel;
    }
    updateButtons();
  }
}

async function loadSubscriptionStatus() {
  setStatus("Checking subscription status...");

  try {
    await loadOrCreateDeviceToken();
    await loadAuthState();
    const result = await apiRequest(`/auth/subscription?device_token=${encodeURIComponent(deviceToken)}`);
    currentSubscription = result || { active: false, plan: null };
    updateButtons();

    if (currentSubscription.active) {
      const planName =
        currentSubscription.plan?.planId === "annual" ? "Yearly plan" : "Monthly plan";
      setStatus(`Subscription active. Current plan: ${planName}.`, true);
      return;
    }

    setStatus(
      authState.signedIn
        ? "No active subscription detected."
        : "Sign in before checkout to keep your paid plan attached to your account."
    );
  } catch (error) {
    currentSubscription = { active: false, plan: null };
    updateButtons();
    setStatus(error.message || "Failed to refresh subscription status.");
  }
}

planButtons.forEach((button) => {
  button.addEventListener("click", () => {
    void openCheckout(button.dataset.planId || "", button);
  });
});

refreshBtn.addEventListener("click", () => {
  void trackEvent("upgrade_clicked", { source: "paywall_refresh" });
  void loadSubscriptionStatus();
});

authGoogleBtn.addEventListener("click", () => {
  void signInWithGoogle();
});

authSignOutBtn.addEventListener("click", () => {
  void signOut();
});

closeBtn.addEventListener("click", () => {
  window.close();
});

window.addEventListener("focus", () => {
  void loadSubscriptionStatus();
});

updateButtons();
void loadOrCreateDeviceToken()
  .then(() => trackEvent("paywall_opened", { source: "standalone_paywall" }))
  .then(() => trackEvent("extension_opened", { source: "standalone_paywall" }))
  .then(() => loadSubscriptionStatus());
