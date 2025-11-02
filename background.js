const DEFAULT_SETTINGS = {
  streamUrl: "https://pub.chasing.codes/stream",
  autoClaimBonus: true,
  autoClaimReloads: true,
  reloadCheckIntervalMinutes: 60,
  shortReloadThresholdMinutes: 10,
  currency: "usdt",
};

const GRAPHQL_URL = "https://stake.com/_api/graphql";
const FORBIDDEN_REQUEST_HEADERS = new Set([
  "origin",
  "referer",
  "cookie",
  "host",
]);

const STATUS_KEY = "chaserStatus";
const SETTINGS_KEY = "chaserSettings";

let inMemoryStatus = {
  connected: false,
  lastBonusCode: null,
  lastBonusResult: null,
  lastReloadClaim: null,
  nextReloadAt: null,
  lastUpdated: null,
  log: [],
};

async function initDefaults() {
  const stored = await chrome.storage.local.get([SETTINGS_KEY, STATUS_KEY]);
  if (!stored[SETTINGS_KEY]) {
    await chrome.storage.local.set({ [SETTINGS_KEY]: DEFAULT_SETTINGS });
  } else {
    const normalized = normalizeSettings(stored[SETTINGS_KEY]);
    if (JSON.stringify(normalized) !== JSON.stringify(stored[SETTINGS_KEY])) {
      await chrome.storage.local.set({ [SETTINGS_KEY]: normalized });
    }
  }
  if (!stored[STATUS_KEY]) {
    await chrome.storage.local.set({ [STATUS_KEY]: inMemoryStatus });
  } else {
    inMemoryStatus = { ...inMemoryStatus, ...stored[STATUS_KEY] };
  }
}

async function getSettings() {
  const { [SETTINGS_KEY]: settings } =
    await chrome.storage.local.get(SETTINGS_KEY);
  const normalized = normalizeSettings(settings);
  if (!settings || settings.streamUrl !== normalized.streamUrl) {
    await chrome.storage.local.set({ [SETTINGS_KEY]: normalized });
  }
  return normalized;
}

async function saveSettings(patch) {
  const current = await getSettings();
  const next = normalizeSettings({ ...current, ...patch });
  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

function normalizeSettings(raw) {
  const settings = { ...DEFAULT_SETTINGS, ...(raw || {}) };
  if (!settings.streamUrl) {
    settings.streamUrl = DEFAULT_SETTINGS.streamUrl;
  }
  if (settings.streamUrl === "https://pub.chasing.codes/stream") {
    settings.streamUrl = DEFAULT_SETTINGS.streamUrl;
  }
  settings.autoClaimBonus = Boolean(settings.autoClaimBonus);
  settings.autoClaimReloads = Boolean(settings.autoClaimReloads);
  const reloadInterval = Number(settings.reloadCheckIntervalMinutes);
  if (!Number.isFinite(reloadInterval) || reloadInterval <= 0) {
    settings.reloadCheckIntervalMinutes =
      DEFAULT_SETTINGS.reloadCheckIntervalMinutes;
  }
  const shortThreshold = Number(settings.shortReloadThresholdMinutes);
  if (!Number.isFinite(shortThreshold) || shortThreshold <= 0) {
    settings.shortReloadThresholdMinutes =
      DEFAULT_SETTINGS.shortReloadThresholdMinutes;
  }
  return settings;
}

async function updateStatus(partial) {
  inMemoryStatus = {
    ...inMemoryStatus,
    ...partial,
    lastUpdated: new Date().toISOString(),
  };
  await chrome.storage.local.set({ [STATUS_KEY]: inMemoryStatus });
}

async function appendLog(entry) {
  const MAX_LOG = 200;
  const nextLog = [
    {
      timestamp: new Date().toISOString(),
      ...entry,
    },
    ...inMemoryStatus.log,
  ].slice(0, MAX_LOG);
  await updateStatus({ log: nextLog });
}

async function handleGraphqlRequest(payload = {}) {
  try {
    const { body, headers: rawHeaders } = payload;
    if (!body) {
      return { ok: false, error: "missing_body" };
    }

    const headers = new Headers();
    if (rawHeaders && typeof rawHeaders === "object") {
      for (const [key, value] of Object.entries(rawHeaders)) {
        if (!value) continue;
        const normalized = String(key).toLowerCase();
        if (FORBIDDEN_REQUEST_HEADERS.has(normalized)) continue;
        headers.set(key, value);
      }
    }

    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (error) {
      data = null;
    }

    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      ok: response.ok,
      status: response.status,
      data,
      text,
      headers: responseHeaders,
    };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

chrome.runtime.onInstalled.addListener(() => {
  initDefaults();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case "GET_SETTINGS": {
        const settings = await getSettings();
        sendResponse({ ok: true, settings });
        break;
      }
      case "SAVE_SETTINGS": {
        const settings = await saveSettings(message.payload || {});
        sendResponse({ ok: true, settings });
        break;
      }
      case "STATUS_UPDATE": {
        await updateStatus(message.payload || {});
        sendResponse({ ok: true });
        break;
      }
      case "APPEND_LOG": {
        await appendLog(message.payload || {});
        sendResponse({ ok: true });
        break;
      }
      case "GRAPHQL_REQUEST": {
        const result = await handleGraphqlRequest(message.payload || {});
        sendResponse(result);
        break;
      }
      case "GET_STATUS": {
        const status = await chrome.storage.local.get(STATUS_KEY);
        sendResponse({
          ok: true,
          status: status[STATUS_KEY] || inMemoryStatus,
        });
        break;
      }
      case "INJECT_TURNSTILE": {
        const { instanceId, sitekey } = message.payload || {};
        if (!sender.tab?.id) {
          sendResponse({ ok: false, error: "no_tab_id" });
          break;
        }
        try {
          await chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            world: "MAIN",
            func: (instanceId, sitekey) => {
              // Create container
              if (!document.getElementById('cf-container-' + instanceId)) {
                var container = document.createElement('div');
                container.id = 'cf-container-' + instanceId;
                container.style.position = 'fixed';
                container.style.top = '12px';
                container.style.right = '12px';
                container.style.zIndex = '2147483647';
                document.body.appendChild(container);
              }

              // Load Turnstile script
              if (!document.getElementById('cf-turnstile-sdk')) {
                var script = document.createElement('script');
                script.id = 'cf-turnstile-sdk';
                script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
                script.async = true;
                script.defer = true;

                script.onload = function() {
                  try {
                    var widgetId = turnstile.render('#cf-container-' + instanceId, {
                      sitekey: sitekey,
                      callback: function(token) {
                        window.__chaserTurnstileToken = token;
                        window.dispatchEvent(new CustomEvent('chaser-turnstile-token', {
                          detail: { token: token, instanceId: instanceId }
                        }));
                      },
                      'error-callback': function(error) {
                        console.error('[ChaserOSS] Turnstile error:', error);
                        window.dispatchEvent(new CustomEvent('chaser-turnstile-error', {
                          detail: { error: error, instanceId: instanceId }
                        }));
                      }
                    });
                    window.__chaserTurnstileWidgetId = widgetId;
                  } catch (err) {
                    console.error('[ChaserOSS] Failed to render Turnstile:', err);
                  }
                };

                script.onerror = function() {
                  console.error('[ChaserOSS] Failed to load Turnstile script');
                };

                document.head.appendChild(script);
              } else {
                if (window.turnstile && window.__chaserTurnstileWidgetId) {
                  try {
                    turnstile.reset(window.__chaserTurnstileWidgetId);
                  } catch(e) {}
                }
              }
            },
            args: [instanceId, sitekey]
          });
          sendResponse({ ok: true });
        } catch (error) {
          console.error("[ChaserOSS] Inject Turnstile failed:", error);
          sendResponse({ ok: false, error: String(error) });
        }
        break;
      }
      default: {
        sendResponse({ ok: false, error: "unknown_message" });
      }
    }
  })();
  return true;
});

chrome.runtime.onMessageExternal?.addListener(
  (message, sender, sendResponse) => {
    if (message === "ping") {
      sendResponse("pong");
    }
  },
);

initDefaults();
