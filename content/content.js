(() => {
  const DEFAULT_SETTINGS = {
    streamUrl: "https://pub.chasing.codes/stream",
    autoClaimBonus: true,
    autoClaimReloads: true,
    reloadCheckIntervalMinutes: 60,
    shortReloadThresholdMinutes: 10,
  };

  const LOG_NS = "[ChaserOSS]";

  const CLAIM_BONUS_QUERY = `
    mutation ClaimConditionBonusCode($code: String!, $currency: CurrencyEnum!, $turnstileToken: String!) {
      claimConditionBonusCode(code: $code, currency: $currency, turnstileToken: $turnstileToken) {
        amount
        currency
        bonusCode {
          id
          code
        }
      }
    }
  `;

  const VIP_META_QUERY = `query VipMeta($dailyBonusEnabled: Boolean!, $topUpEnabled: Boolean!) {
    user {
      id
      isBanned
      isSuspended
      rakeback {
        enabled
        balances {
          currency
          availableAmount
        }
      }
      flags {
        flag
      }
      depositBonusList(status: claimed) {
        currency
        bonusMultiplier
        transactions {
          amount
          currency
          createdAt
        }
      }
      activeRollovers {
        id
        amount
        maxBet
        currency
        progress
        expectedAmount
        expectedAmountMin
        type
      }
      vipInfo {
        host {
          name
          contactHandle
          contactLink
          email
          availableDays
        }
        hostProgress {
          status
          progress
          requirementPeriod
          requirementValue
        }
        hostStatus
      }
      reload: faucet {
        id
        value
        active
        claimInterval
        lastClaim
        expireAt
        createdAt
        updatedAt
        expireCount
      }
      dailyBonus @include(if: $dailyBonusEnabled) {
        id
        amounts {
          currency
          amount
        }
        active
        lastClaim
        createdAt
        updatedAt
      }
      topUpBonus @include(if: $topUpEnabled) {
        id
        amounts {
          currency
          amount
        }
        active
        claimCount
        lastClaim
        createdAt
        updatedAt
      }
    }
  }`;

  const CLAIM_RELOAD_MUTATION = `
    mutation ClaimFaucet($currency: CurrencyEnum!, $turnstileToken: String!) {
      claimReload: claimFaucet(currency: $currency, turnstileToken: $turnstileToken) {
        id
        amount(currency: $currency)
      }
    }
  `;

  let settings = { ...DEFAULT_SETTINGS };
  let turnstileManager = null;
  let eventSource = null;
  let reloadPollTimer = null;
  let scheduledReloadTimer = null;
  let lastVipMeta = null;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function sendRuntimeMessage(message) {
    try {
      const response = await chrome.runtime.sendMessage(message);
      return response || {};
    } catch (error) {
      console.warn(LOG_NS, "runtime message failed", error);
      return { ok: false, error: String(error) };
    }
  }

  async function updateStatus(partial) {
    await sendRuntimeMessage({ type: "STATUS_UPDATE", payload: partial });
  }

  async function log(entry) {
    // Logs are stored in storage and visible in the UI
    await sendRuntimeMessage({ type: "APPEND_LOG", payload: entry });
  }

  async function loadSettings() {
    const response = await sendRuntimeMessage({ type: "GET_SETTINGS" });
    if (response?.ok && response.settings) {
      settings = { ...DEFAULT_SETTINGS, ...response.settings };
    } else {
      settings = { ...DEFAULT_SETTINGS };
    }
  }

  function observeSettingChanges() {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !changes?.chaserSettings) {
        return;
      }
      settings = {
        ...DEFAULT_SETTINGS,
        ...(changes.chaserSettings.newValue || {}),
      };
      log({ event: "settings_updated", settings });
      restartStream();
      restartReloadPolling();
    });
  }

  function ensureTurnstileManager() {
    if (!turnstileManager) {
      turnstileManager = new TurnstileManager({
        sitekey: "0x4AAAAAAAGD4gMGOTFnvupz",
        auto: false,
      });
      // Eagerly load Turnstile on first manager creation
      turnstileManager.loadTurnstile().catch(err => {
        console.error(LOG_NS, "Failed to load Turnstile on init:", err);
      });
    }
    return turnstileManager;
  }

  async function createTurnstileToken() {
    const manager = ensureTurnstileManager();
    try {
      const token = await manager.createToken();
      if (!token) {
        throw new Error("Empty turnstile token");
      }
      return token;
    } catch (error) {
      manager.invalidate();
      throw error;
    }
  }

  function readCookies() {
    return document.cookie || "";
  }

  function getCookieValue(name) {
    const cookies = readCookies().split(";");
    for (const cookie of cookies) {
      const [key, value] = cookie.trim().split("=");
      if (key === name) {
        return decodeURIComponent(value || "");
      }
    }
    return "";
  }

  function tryParseJSON(value) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  function discoverAccessToken() {
    // Stake.com uses a simple 'session' cookie for authentication
    const sessionCookie = getCookieValue("session");
    if (!sessionCookie) {
      console.warn(LOG_NS, "No session cookie found. Ensure you are logged into Stake.com");
      return "";
    }
    return sessionCookie;
  }

  function getPreferredCurrency() {
    // Use extension settings first if available
    if (settings?.currency) {
      return String(settings.currency).toLowerCase();
    }

    // Check for currency_currency cookie (Stake.com's currency preference)
    const currencyCookie = getCookieValue("currency_currency");
    if (currencyCookie) {
      return String(currencyCookie).toLowerCase();
    }

    // Fallback to localStorage if cookie not found
    const stored =
      localStorage.getItem("stake-currency") ||
      localStorage.getItem("currency");
    if (stored) {
      const parsed = tryParseJSON(stored);
      if (typeof parsed === "string") {
        return parsed.toLowerCase();
      }
      if (parsed?.currency) {
        return String(parsed.currency).toLowerCase();
      }
    }

    // Default to USDT if nothing found
    return "usdt";
  }

  async function graphqlRequest({
    operationName,
    operationType,
    query,
    variables,
  }) {
    const accessToken = discoverAccessToken();
    if (!accessToken) {
      throw new Error("Unable to locate Stake access token");
    }

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-access-token": accessToken,
      "x-operation-name": operationName,
      "x-operation-type": operationType,
    };
    const response = await sendRuntimeMessage({
      type: "GRAPHQL_REQUEST",
      payload: {
        body: { operationName, query, variables },
        headers,
      },
    });

    if (!response?.ok) {
      const status = response?.status ?? 0;
      if (status === 403) {
        throw new Error("403 Forbidden - Cloudflare challenge");
      }
      const errorText =
        response?.text || response?.error || "Unknown GraphQL error";
      throw new Error(`GraphQL error ${status}: ${errorText}`);
    }

    return response.data ?? {};
  }

  async function claimBonus(code, source = "stream") {
    if (!code) {
      await log({ event: "bonus_skipped", reason: "missing_code", source });
      return;
    }
    if (!settings.autoClaimBonus && source === "stream") {
      return;
    }
    try {
      await updateStatus({
        lastBonusCode: code,
        lastBonusResult: "pending",
      });

      const turnstileToken = await createTurnstileToken();
      const currency = getPreferredCurrency();
      const currencyEnum = String(currency || "usdt").toLowerCase();

      const result = await graphqlRequest({
        operationName: "ClaimConditionBonusCode",
        operationType: "mutation",
        query: CLAIM_BONUS_QUERY,
        variables: {
          code,
          currency: currencyEnum,
          turnstileToken,
        },
      });

      const payload = result?.data?.claimConditionBonusCode;
      if (!payload) {
        throw new Error(JSON.stringify(result?.errors || {}));
      }

      await log({
        event: "bonus_claimed",
        code,
        amount: payload.amount,
        currency: payload.currency,
        bonusCode: payload.bonusCode?.code,
        source,
      });

      await updateStatus({
        lastBonusResult: `claimed ${payload.amount} ${payload.currency}`,
      });
    } catch (error) {
      await log({ event: "bonus_failed", code, error: String(error) });
      await updateStatus({ lastBonusResult: `failed: ${String(error)}` });
    }
  }

  async function fetchVipMeta() {
    try {
      const result = await graphqlRequest({
        operationName: "VipMeta",
        operationType: "query",
        query: VIP_META_QUERY,
        variables: {
          dailyBonusEnabled: false,
          topUpEnabled: false,
        },
      });

      lastVipMeta = result?.data?.user?.reload || null;
      return lastVipMeta;
    } catch (error) {
      await log({ event: "vip_meta_failed", error: String(error) });
      return null;
    }
  }

  function clearReloadTimers() {
    if (reloadPollTimer) {
      clearInterval(reloadPollTimer);
      reloadPollTimer = null;
    }
    if (scheduledReloadTimer) {
      clearTimeout(scheduledReloadTimer);
      scheduledReloadTimer = null;
    }
  }

  async function claimReload(currency, trigger = "schedule") {
    if (!settings.autoClaimReloads && trigger === "schedule") {
      return;
    }

    try {
      const turnstileToken = await createTurnstileToken();
      const requestedCurrency = currency || getPreferredCurrency();
      const currencyEnum = String(requestedCurrency || "usdt").toLowerCase();
      const result = await graphqlRequest({
        operationName: "ClaimFaucet",
        operationType: "mutation",
        query: CLAIM_RELOAD_MUTATION,
        variables: {
          currency: currencyEnum,
          turnstileToken,
        },
      });

      const payload = result?.data?.claimReload;
      if (!payload) {
        throw new Error(JSON.stringify(result?.errors || {}));
      }

      await log({
        event: "reload_claimed",
        currency: currencyEnum,
        amount: payload.amount,
        reloadId: payload.id,
        trigger,
      });

      await updateStatus({
        lastReloadClaim: new Date().toISOString(),
        nextReloadAt: null,
      });
    } catch (error) {
      await log({ event: "reload_failed", currency, error: String(error) });
    }
  }

  function scheduleReload(nextClaimTs, currency) {
    if (scheduledReloadTimer) {
      clearTimeout(scheduledReloadTimer);
    }
    const now = Date.now();
    const delay = Math.max(nextClaimTs - now, 0);

    scheduledReloadTimer = setTimeout(async () => {
      await claimReload(currency, "scheduled");
      await sleep(5000);
      await fetchVipMeta();
      scheduleReloadPolling();
    }, delay);

    updateStatus({ nextReloadAt: new Date(nextClaimTs).toISOString() });
  }

  function scheduleReloadPolling() {
    if (reloadPollTimer) {
      clearInterval(reloadPollTimer);
    }

    const intervalMinutes = Math.max(
      5,
      Number(settings.reloadCheckIntervalMinutes) ||
        DEFAULT_SETTINGS.reloadCheckIntervalMinutes,
    );

    reloadPollTimer = setInterval(
      async () => {
        await processReloadCheck();
      },
      intervalMinutes * 60 * 1000,
    );
  }

  async function processReloadCheck(emitResult = false) {
    try {
      const reload = await fetchVipMeta();

      if (!reload?.active) {
        await updateStatus({ nextReloadAt: null });

        if (emitResult) {
          window.dispatchEvent(new CustomEvent('chaser-reload-check-result', {
            detail: {
              success: true,
              reloadAvailable: false,
              nextReloadAt: null,
              message: 'No active reload program'
            }
          }));
        }
        return;
      }

      const lastClaimTs = reload.lastClaim
        ? Date.parse(reload.lastClaim)
        : Date.now();
      const nextClaimTs = lastClaimTs + Number(reload.claimInterval || 0);
      const minutesUntilNext = (nextClaimTs - Date.now()) / 60000;

      if (nextClaimTs <= Date.now()) {
        if (emitResult) {
          window.dispatchEvent(new CustomEvent('chaser-reload-check-result', {
            detail: {
              success: true,
              reloadAvailable: true,
              amount: reload.amount,
              currency: reload.currency,
              message: 'Reload available now'
            }
          }));
        }

        await claimReload(reload.currency || getPreferredCurrency(), "poll");
        await sleep(5000);
        await fetchVipMeta();
        return;
      }

      const shortThreshold =
        Number(settings.shortReloadThresholdMinutes) ||
        DEFAULT_SETTINGS.shortReloadThresholdMinutes;

      const nextReloadAt = new Date(nextClaimTs).toISOString();

      if (minutesUntilNext <= shortThreshold) {
        scheduleReload(nextClaimTs, reload.currency || getPreferredCurrency());
      } else {
        await updateStatus({ nextReloadAt });
      }

      if (emitResult) {
        window.dispatchEvent(new CustomEvent('chaser-reload-check-result', {
          detail: {
            success: true,
            reloadAvailable: false,
            nextReloadAt,
            amount: reload.amount,
            currency: reload.currency,
            minutesUntil: Math.ceil(minutesUntilNext),
            message: 'Reload scheduled'
          }
        }));
      }

    } catch (error) {
      console.error(LOG_NS, 'processReloadCheck failed:', error);

      if (emitResult) {
        window.dispatchEvent(new CustomEvent('chaser-reload-check-result', {
          detail: {
            success: false,
            error: error.message || 'Failed to check reload status',
            message: 'Check failed'
          }
        }));
      }
    }
  }

  function restartReloadPolling() {
    clearReloadTimers();
    scheduleReloadPolling();
    processReloadCheck();
  }

  function closeStream() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  }

  function restartStream() {
    closeStream();
    startStream();
  }

  function parseEventData(event) {
    try {
      return JSON.parse(event.data);
    } catch (error) {
      console.warn(LOG_NS, "Failed to parse event", error);
      return null;
    }
  }

  function startStream() {
    if (!settings.streamUrl) {
      return;
    }

    try {
      eventSource = new EventSource(settings.streamUrl);
      eventSource.onopen = () => {
        log({ event: "stream_connected", url: settings.streamUrl });
        updateStatus({ connected: true });
      };
      eventSource.onerror = (error) => {
        const detail = {
          message: error?.message || String(error),
          readyState: eventSource?.readyState,
          url: settings.streamUrl,
        };
        log({ event: "stream_error", error: detail });
        updateStatus({ connected: false });
        closeStream();
        setTimeout(startStream, 5000);
      };
      eventSource.onmessage = async (event) => {
        const payload = parseEventData(event);
        if (!payload) return;

        if (payload.type === "bonus_code" && payload.code) {
          await claimBonus(payload.code, "stream");
        }

        if (payload.type === "reload_alert") {
          await processReloadCheck();
        }
      };
    } catch (error) {
      log({ event: "stream_init_failed", error: String(error) });
    }
  }

  function setupMessageBridge() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      (async () => {
        switch (message?.type) {
          case "MANUAL_BONUS_CLAIM": {
            await claimBonus(message.code, "manual");
            sendResponse({ ok: true });
            break;
          }
          case "MANUAL_RELOAD_POLL": {
            await processReloadCheck();
            sendResponse({ ok: true });
            break;
          }
          case "MANUAL_RELOAD_CLAIM": {
            await claimReload(
              message.currency || getPreferredCurrency(),
              "manual",
            );
            sendResponse({ ok: true });
            break;
          }
          default:
            sendResponse({ ok: false, error: "unknown_command" });
        }
      })();
      return true;
    });

    // Bridge UI events to actions
    window.addEventListener("chaser-manual-claim", (event) => {
      const { code } = event.detail || {};
      if (code) {
        claimBonus(code, "manual");
      }
    });

    window.addEventListener("chaser-refresh-reload", () => {
      processReloadCheck(true); // Pass true to emit result event
    });
  }

  async function bootstrap() {
    if (window.__chaserOssInitialized) {
      return;
    }
    window.__chaserOssInitialized = true;

    await loadSettings();
    observeSettingChanges();
    ensureTurnstileManager();
    setupMessageBridge();

    startStream();
    restartReloadPolling();

    await log({ event: "content_initialized" });
  }

  /**
   * Lightweight Turnstile manager inspired by the obfuscated extension,
   * cleaned up for readability and safety.
   */
  class TurnstileManager {
    constructor({ sitekey, auto = false } = {}) {
      this.sitekey = sitekey || "0x4AAAAAAAGD4gMGOTFnvupz";
      this.auto = auto;
      this.widgetId = null;
      this.token = null;
      this.tokenConsumed = false;
      this.process = false;
      this.resolvers = [];
      this.instanceId = `turnstile-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      this.maxInitRetries = 50;
      this.initRetryCount = 0;
      this.resolverTimeout = 30000;
      this.cleanupTimeout = null;
      this.retryTimeout = null;
      this.retryCount = 0;
      this.maxRetries = 3;
      this.metaObserver = null;
      this.startResolverCleanup();
    }

    async createToken() {
      if (this.process) {
        return new Promise((resolve, reject) => {
          this.resolvers.push({
            resolve: (value) => {
              if (value) {
                resolve(value);
              } else {
                reject(new Error("Turnstile token empty"));
              }
            },
            reject,
            timestamp: Date.now(),
          });
        });
      }

      if (this.token && !this.tokenConsumed) {
        this.tokenConsumed = true;
        return this.token;
      }

      this.process = true;
      this.tokenConsumed = false;

      try {
        await this.loadTurnstile();
      } catch (error) {
        this.process = false;
        this.tokenConsumed = false;
        throw error;
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.removeResolver(resolver);
          reject(new Error("Turnstile token timeout"));
        }, this.resolverTimeout);

        const resolver = {
          resolve: (value) => {
            clearTimeout(timeout);
            if (value) {
              resolve(value);
            } else {
              reject(new Error("Turnstile token empty"));
            }
          },
          reject: (error) => {
            clearTimeout(timeout);
            reject(error);
          },
          timestamp: Date.now(),
        };

        this.resolvers.push(resolver);
      });
    }

    invalidate() {
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
        this.retryTimeout = null;
      }
      if (this.cleanupTimeout) {
        clearTimeout(this.cleanupTimeout);
        this.cleanupTimeout = null;
      }
      this.token = null;
      this.tokenConsumed = false;
      this.process = false;
      this.retryCount = 0;
      this.initRetryCount = 0;
      if (this.metaObserver) {
        try {
          this.metaObserver.disconnect();
        } catch (error) {
          console.warn(LOG_NS, "meta observer disconnect failed", error);
        }
        this.metaObserver = null;
      }
      if (this.widgetId && window.turnstile?.remove) {
        try {
          window.turnstile.remove(this.widgetId);
        } catch (error) {
          console.warn(LOG_NS, "turnstile remove failed", error);
        }
      }
      this.widgetId = null;
      const container = document.getElementById(`cf-container-${this.instanceId}`);
      container?.remove();
    }

    waitForDOM() {
      if (document.body) {
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        if (document.readyState === "loading") {
          document.addEventListener(
            "DOMContentLoaded",
            () => resolve(),
            { once: true },
          );
        } else {
          const check = () => {
            if (document.body) {
              resolve();
            } else {
              setTimeout(check, 50);
            }
          };
          check();
        }
      });
    }

    ensureContainer() {
      this.removeMetaCSP();
      this.ensureMetaObserver();
      let container = document.getElementById(`cf-container-${this.instanceId}`);
      if (!container) {
        container = document.createElement("div");
        container.id = `cf-container-${this.instanceId}`;
        Object.assign(container.style, {
          position: "fixed",
          top: "12px",
          right: "12px",
          zIndex: "2147483647",
        });
        document.body.appendChild(container);
      }
      return container;
    }

    removeMetaCSP() {
      try {
        const metaTags = document.querySelectorAll(
          'meta[http-equiv="content-security-policy"]',
        );
        metaTags.forEach((meta) => meta.parentElement?.removeChild(meta));
      } catch (error) {
        console.warn(LOG_NS, "removeMetaCSP failed", error);
      }
    }

    ensureMetaObserver() {
      if (this.metaObserver) {
        return;
      }
      try {
        this.metaObserver = new MutationObserver(() => {
          this.removeMetaCSP();
        });
        this.metaObserver.observe(document.documentElement || document, {
          childList: true,
          subtree: true,
        });
      } catch (error) {
        console.warn(LOG_NS, "meta observer failed", error);
      }
    }

    async loadTurnstile() {
      await this.waitForDOM();
      this.removeMetaCSP();

      // Setup token listener first
      this.setupTokenListener();

      const instanceId = this.instanceId;
      const sitekey = this.sitekey;

      // Execute in MAIN world (page context) to bypass extension CSP
      try {
        await chrome.runtime.sendMessage({
          type: "INJECT_TURNSTILE",
          payload: { instanceId, sitekey }
        });
      } catch (error) {
        console.error(LOG_NS, "Failed to inject Turnstile:", error);
        this.resolveAll(null, new Error("Failed to inject Turnstile"));
      }
    }

    setupTokenListener() {
      window.addEventListener('chaser-turnstile-token', (event) => {
        const { token, instanceId } = event.detail;
        if (instanceId === this.instanceId) {
          this.token = token;
          this.process = false;
          this.tokenConsumed = false;
          this.retryCount = 0;
          this.resolveAll(token, null);
          if (!this.auto) {
            this.scheduleCleanup();
          }
        }
      });

      window.addEventListener('chaser-turnstile-error', (event) => {
        const { error, instanceId } = event.detail;
        if (instanceId === this.instanceId) {
          console.error(LOG_NS, "Error from MAIN world:", error);
          this.handleTurnstileError(error?.code || error, error, {});
        }
      });
    }

    initTurnstile() {
      if (typeof window.turnstile === "undefined") {
        if (this.initRetryCount++ >= this.maxInitRetries) {
          this.resolveAll(null, new Error("Turnstile failed to initialize"));
          this.initRetryCount = 0;
          return;
        }
        setTimeout(() => this.initTurnstile(), 200);
        return;
      }

      this.initRetryCount = 0;
      let container = this.ensureContainer();
      if (!container) {
        return;
      }

      const options = {
        sitekey: this.sitekey,
        callback: (token) => {
          this.token = token;
          this.process = false;
          this.tokenConsumed = false;
          this.retryCount = 0;
          this.resolveAll(token, null);
          if (!this.auto) {
            this.scheduleCleanup();
          }
        },
        "error-callback": (error) => {
          const code = typeof error === "number" ? error : error?.code ?? error;
          this.handleTurnstileError(code, error, options);
        },
      };

      if (this.widgetId && window.turnstile) {
        try {
          window.turnstile.reset(this.widgetId);
        } catch (error) {
          this.widgetId = null;
        }
      }

      if (!this.widgetId && window.turnstile) {
        try {
          this.widgetId = window.turnstile.render(container, options);
        } catch (error) {
          this.resolveAll(null, new Error("Failed to render Turnstile widget"));
        }
      }
    }

    handleTurnstileError(code, detail, options) {
      switch (code) {
        case 300030:
        case 300031:
          try {
            if (this.widgetId && window.turnstile?.remove) {
              window.turnstile.remove(this.widgetId);
            }
          } catch (error) {
            console.warn(LOG_NS, "turnstile remove failed", error);
          }
          this.widgetId = null;
          setTimeout(() => {
            try {
              const container = this.ensureContainer();
              if (!window.turnstile || !container) {
                return;
              }
              this.widgetId = window.turnstile.render(container, options);
            } catch (error) {
              console.warn(LOG_NS, "turnstile re-render failed", error);
            }
          }, 300);
          break;
        case 600000:
        case 600010: {
          const err = new Error(`Turnstile configuration error: ${code}`);
          this.resolveAll(null, err);
          break;
        }
        default:
          if (this.auto && this.retryCount < this.maxRetries) {
            this.retryCount += 1;
            this.retryTimeout = setTimeout(
              () => this.initTurnstile(),
              1000 * Math.pow(2, this.retryCount),
            );
          } else {
            const err =
              detail instanceof Error
                ? detail
                : new Error(`Turnstile error: ${code}`);
            this.resolveAll(null, err);
          }
      }
    }

    scheduleCleanup() {
      if (this.cleanupTimeout) {
        clearTimeout(this.cleanupTimeout);
      }
      this.cleanupTimeout = setTimeout(() => {
        if (!this.tokenConsumed) {
          this.cleanup();
        }
      }, 30000);
    }

    cleanup() {
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
        this.retryTimeout = null;
      }
      if (this.cleanupTimeout) {
        clearTimeout(this.cleanupTimeout);
        this.cleanupTimeout = null;
      }
      if (this.widgetId && window.turnstile?.remove) {
        try {
          window.turnstile.remove(this.widgetId);
        } catch (error) {
          console.warn(LOG_NS, "cleanup remove failed", error);
        }
      }
      this.widgetId = null;
      this.token = null;
      this.process = false;
      this.tokenConsumed = false;
      const container = document.getElementById(`cf-container-${this.instanceId}`);
      container?.remove();
      if (this.metaObserver) {
        try {
          this.metaObserver.disconnect();
        } catch (error) {
          console.warn(LOG_NS, "meta observer disconnect failed", error);
        }
        this.metaObserver = null;
      }
    }

    resolveAll(token, error) {
      this.process = false;
      const pending = [...this.resolvers];
      this.resolvers = [];
      for (const resolver of pending) {
        try {
          if (token) {
            resolver.resolve(token);
          } else if (error) {
            resolver.reject(error);
          } else {
            resolver.reject(new Error("Turnstile token unavailable"));
          }
        } catch (resolverError) {
          console.warn(LOG_NS, "turnstile resolver failed", resolverError);
        }
      }
    }

    removeResolver(target) {
      this.resolvers = this.resolvers.filter((resolver) => resolver !== target);
    }

    startResolverCleanup() {
      setInterval(() => {
        const now = Date.now();
        const timedOut = this.resolvers.filter(
          (resolver) => now - resolver.timestamp > this.resolverTimeout,
        );
        if (timedOut.length > 0) {
          for (const resolver of timedOut) {
            try {
              resolver.reject(new Error("Turnstile timeout"));
            } catch (error) {
              console.warn(LOG_NS, "resolver cleanup failed", error);
            }
          }
          this.resolvers = this.resolvers.filter(
            (resolver) => now - resolver.timestamp <= this.resolverTimeout,
          );
        }
      }, 5000);
    }
  }

bootstrap();
})();
