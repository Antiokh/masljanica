export const PWA_DAILY_STORAGE_KEYS = Object.freeze({
  storageNoticeAck: 'masljanica-storage-notice-ack-v1',
  lastStandaloneDate: 'masljanica-pwa-last-standalone-date-v1',
  dailyOffer: 'masljanica-pwa-daily-offer-v1',
});

export const PWA_DAILY_ACTIONS = Object.freeze({
  install: 'install',
  offlineDownload: 'offline-download',
  offlineUpdate: 'offline-update',
});

export const PWA_DAILY_STATES = Object.freeze({
  blocked: 'blocked',
  none: 'none',
  install: PWA_DAILY_ACTIONS.install,
  offlineDownload: PWA_DAILY_ACTIONS.offlineDownload,
  offlineUpdate: PWA_DAILY_ACTIONS.offlineUpdate,
  offlineUpdateAutomatic: 'offline-update-automatic',
});

const VALID_ACTIONS = new Set(Object.values(PWA_DAILY_ACTIONS));

export function localDayKey(date = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError('localDayKey requires a valid Date.');
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDailyOffer(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const value = JSON.parse(raw);
    if (
      value?.schema !== 1
      || typeof value.date !== 'string'
      || !/^\d{4}-\d{2}-\d{2}$/.test(value.date)
      || !VALID_ACTIONS.has(value.action)
    ) return null;
    return {
      schema: 1,
      date: value.date,
      action: value.action,
    };
  } catch {
    return null;
  }
}

export function serializeDailyOffer(action, today = localDayKey()) {
  if (!VALID_ACTIONS.has(action)) {
    throw new TypeError(`Unknown PWA daily action: ${action}`);
  }
  if (typeof today !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    throw new TypeError(`Invalid local day key: ${today}`);
  }
  return JSON.stringify({ schema: 1, date: today, action });
}

export function dailyOfferShownToday(dailyOffer, today = localDayKey()) {
  const value = typeof dailyOffer === 'string' ? parseDailyOffer(dailyOffer) : dailyOffer;
  return Boolean(value && value.date === today && VALID_ACTIONS.has(value.action));
}

export function resolvePwaDailyState({
  storageAccepted,
  today = localDayKey(),
  isStandalone = false,
  lastStandaloneDate = null,
  dailyOffer = null,
  installPromptAvailable = false,
  offlinePackCapabilityAvailable = false,
  offlineCopyAvailable = false,
  offlineCopyStale = false,
  offlineAutoUpdateEnabled = false,
} = {}) {
  if (!storageAccepted) {
    return { state: PWA_DAILY_STATES.blocked, reason: 'storage-gate' };
  }

  // Durable automatic updates are permission for automatic offline maintenance, not only stale-copy
  // refreshes. If the complete copy disappeared after that choice, rebuild it without spending the
  // daily product-offer budget. Wait for the current controller capability before starting any work.
  if (!offlineCopyAvailable && offlineAutoUpdateEnabled) {
    if (!offlinePackCapabilityAvailable) {
      return { state: PWA_DAILY_STATES.none, reason: 'offline-pack-capability-not-ready' };
    }
    return {
      state: PWA_DAILY_STATES.offlineUpdateAutomatic,
      reason: 'offline-copy-missing-auto-update-enabled',
    };
  }

  // A stale copy with automatic updates enabled is not a product offer.
  // It must be resolved even if another product offer was already shown today.
  if (offlineCopyAvailable) {
    if (!offlineCopyStale) {
      return { state: PWA_DAILY_STATES.none, reason: 'offline-copy-current' };
    }
    if (offlineAutoUpdateEnabled) {
      return {
        state: PWA_DAILY_STATES.offlineUpdateAutomatic,
        reason: 'offline-copy-stale-auto-update-enabled',
      };
    }
  }

  if (dailyOfferShownToday(dailyOffer, today)) {
    return { state: PWA_DAILY_STATES.none, reason: 'daily-offer-already-shown' };
  }

  if (offlineCopyAvailable && offlineCopyStale) {
    return { state: PWA_DAILY_STATES.offlineUpdate, reason: 'offline-copy-stale-auto-update-disabled' };
  }

  if (isStandalone || lastStandaloneDate === today) {
    if (!offlinePackCapabilityAvailable) {
      return { state: PWA_DAILY_STATES.none, reason: 'offline-pack-capability-not-ready' };
    }
    return { state: PWA_DAILY_STATES.offlineDownload, reason: 'app-stage-reached' };
  }

  if (installPromptAvailable) {
    return { state: PWA_DAILY_STATES.install, reason: 'browser-installable' };
  }

  return { state: PWA_DAILY_STATES.none, reason: 'no-actionable-state' };
}
