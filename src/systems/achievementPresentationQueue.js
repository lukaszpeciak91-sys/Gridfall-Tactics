export const ACHIEVEMENT_PRESENTATION_STORAGE_KEY = 'gridfall:tactics:achievement-presentation:v1';
export const ACHIEVEMENT_PRESENTATION_VERSION = 1;

function getLocalStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch (error) {
    console.warn('Achievement presentation localStorage is unavailable; popups will remain in memory only.', error);
    return null;
  }
}

function isObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizeAchievementId(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (isObject(value) && typeof value.id === 'string') {
    const trimmed = value.id.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function normalizePresented(presented) {
  const normalized = {};
  if (!isObject(presented)) return normalized;

  for (const [achievementId, value] of Object.entries(presented)) {
    const normalizedId = normalizeAchievementId(achievementId);
    if (normalizedId && value === true) normalized[normalizedId] = true;
  }
  return normalized;
}

export function createDefaultAchievementPresentationQueue() {
  return {
    version: ACHIEVEMENT_PRESENTATION_VERSION,
    pending: [],
    presented: {},
  };
}

export function normalizeAchievementPresentationQueue(queue = {}) {
  const presented = normalizePresented(queue?.presented);
  const queued = new Set();
  const pending = [];

  if (Array.isArray(queue?.pending)) {
    for (const entry of queue.pending) {
      const achievementId = normalizeAchievementId(entry);
      if (!achievementId || presented[achievementId] === true || queued.has(achievementId)) continue;
      queued.add(achievementId);
      pending.push(achievementId);
    }
  }

  return {
    version: ACHIEVEMENT_PRESENTATION_VERSION,
    pending,
    presented,
  };
}

export function loadAchievementPresentationQueue() {
  const storage = getLocalStorage();
  if (!storage) return createDefaultAchievementPresentationQueue();

  try {
    const rawQueue = storage.getItem(ACHIEVEMENT_PRESENTATION_STORAGE_KEY);
    if (!rawQueue) return createDefaultAchievementPresentationQueue();
    return normalizeAchievementPresentationQueue(JSON.parse(rawQueue));
  } catch (error) {
    console.warn('Achievement presentation localStorage read failed; defaults will be used.', error);
    return createDefaultAchievementPresentationQueue();
  }
}

export function saveAchievementPresentationQueue(queue) {
  const normalizedQueue = normalizeAchievementPresentationQueue(queue);
  const storage = getLocalStorage();
  if (!storage) return normalizedQueue;

  try {
    storage.setItem(ACHIEVEMENT_PRESENTATION_STORAGE_KEY, JSON.stringify(normalizedQueue));
  } catch (error) {
    console.warn('Achievement presentation localStorage write failed; popup queue was not persisted.', error);
  }
  return normalizedQueue;
}


export function setAchievementPresentationBatch(ids = []) {
  const queue = loadAchievementPresentationQueue();
  const pending = [];
  const queued = new Set();

  for (const entry of Array.isArray(ids) ? ids : [ids]) {
    const achievementId = normalizeAchievementId(entry);
    if (!achievementId || queue.presented[achievementId] === true || queued.has(achievementId)) continue;
    queued.add(achievementId);
    pending.push(achievementId);
  }

  return saveAchievementPresentationQueue({ ...queue, pending });
}

export function enqueueAchievementPresentation(ids = []) {
  const queue = loadAchievementPresentationQueue();
  const pending = [...queue.pending];
  const queued = new Set(pending);

  for (const entry of Array.isArray(ids) ? ids : [ids]) {
    const achievementId = normalizeAchievementId(entry);
    if (!achievementId || queue.presented[achievementId] === true || queued.has(achievementId)) continue;
    queued.add(achievementId);
    pending.push(achievementId);
  }

  return saveAchievementPresentationQueue({ ...queue, pending });
}

export function peekAchievementPresentation(limit = Infinity) {
  const queue = loadAchievementPresentationQueue();
  const normalizedLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : queue.pending.length;
  return queue.pending.slice(0, normalizedLimit);
}

export function markAchievementPresented(ids = []) {
  const queue = loadAchievementPresentationQueue();
  const presentedIds = new Set();
  for (const entry of Array.isArray(ids) ? ids : [ids]) {
    const achievementId = normalizeAchievementId(entry);
    if (achievementId) presentedIds.add(achievementId);
  }

  if (presentedIds.size === 0) return queue;

  const presented = { ...queue.presented };
  for (const achievementId of presentedIds) presented[achievementId] = true;
  const pending = queue.pending.filter((achievementId) => !presentedIds.has(achievementId));

  return saveAchievementPresentationQueue({ ...queue, pending, presented });
}

export function clearPresentedQueue() {
  const queue = loadAchievementPresentationQueue();
  return saveAchievementPresentationQueue({ ...queue, pending: [] });
}
