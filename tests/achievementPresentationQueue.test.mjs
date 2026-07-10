import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ACHIEVEMENT_PRESENTATION_STORAGE_KEY,
  ACHIEVEMENT_PRESENTATION_VERSION,
  createDefaultAchievementPresentationQueue,
  enqueueAchievementPresentation,
  loadAchievementPresentationQueue,
  markAchievementPresented,
  normalizeAchievementPresentationQueue,
  peekAchievementPresentation,
  saveAchievementPresentationQueue,
} from '../src/systems/achievementPresentationQueue.js';

function createMemoryStorage(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    clear() { values.clear(); },
  };
}

function withWindowStorage(storage, callback) {
  const originalWindow = globalThis.window;
  globalThis.window = { localStorage: storage };
  try { return callback(); } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
}

test('presentation queue defaults to an empty versioned queue', () => {
  withWindowStorage(createMemoryStorage(), () => {
    assert.deepEqual(loadAchievementPresentationQueue(), createDefaultAchievementPresentationQueue());
  });
});

test('enqueue stores one achievement and survives reload', () => {
  const storage = createMemoryStorage();
  withWindowStorage(storage, () => {
    enqueueAchievementPresentation('general.win_first_battle');
    assert.deepEqual(loadAchievementPresentationQueue().pending, ['general.win_first_battle']);
  });
});

test('enqueue stores multiple achievements preserving unlock order', () => {
  withWindowStorage(createMemoryStorage(), () => {
    enqueueAchievementPresentation(['a', 'b', 'c']);
    assert.deepEqual(peekAchievementPresentation(10), ['a', 'b', 'c']);
  });
});

test('duplicate enqueue is ignored', () => {
  withWindowStorage(createMemoryStorage(), () => {
    enqueueAchievementPresentation(['a', 'b', 'a']);
    enqueueAchievementPresentation(['b', 'c']);
    assert.deepEqual(loadAchievementPresentationQueue().pending, ['a', 'b', 'c']);
  });
});

test('already presented achievements are ignored by enqueue', () => {
  withWindowStorage(createMemoryStorage(), () => {
    saveAchievementPresentationQueue({ pending: [], presented: { a: true } });
    enqueueAchievementPresentation(['a', 'b']);
    assert.deepEqual(loadAchievementPresentationQueue(), {
      version: ACHIEVEMENT_PRESENTATION_VERSION,
      pending: ['b'],
      presented: { a: true },
    });
  });
});

test('peek limit does not remove pending achievements', () => {
  withWindowStorage(createMemoryStorage(), () => {
    enqueueAchievementPresentation(['a', 'b', 'c']);
    assert.deepEqual(peekAchievementPresentation(2), ['a', 'b']);
    assert.deepEqual(loadAchievementPresentationQueue().pending, ['a', 'b', 'c']);
  });
});

test('markAchievementPresented removes from pending and preserves remaining pending', () => {
  withWindowStorage(createMemoryStorage(), () => {
    enqueueAchievementPresentation(['a', 'b', 'c']);
    markAchievementPresented(['a', 'c']);
    assert.deepEqual(loadAchievementPresentationQueue(), {
      version: ACHIEVEMENT_PRESENTATION_VERSION,
      pending: ['b'],
      presented: { a: true, c: true },
    });
  });
});

test('malformed storage recovers to defaults', () => {
  withWindowStorage(createMemoryStorage({ [ACHIEVEMENT_PRESENTATION_STORAGE_KEY]: '{bad json' }), () => {
    assert.deepEqual(loadAchievementPresentationQueue(), createDefaultAchievementPresentationQueue());
  });
});

test('storage unavailable recovers without throwing', () => {
  const originalWindow = globalThis.window;
  delete globalThis.window;
  try {
    assert.deepEqual(loadAchievementPresentationQueue(), createDefaultAchievementPresentationQueue());
    assert.deepEqual(enqueueAchievementPresentation(['a']).pending, ['a']);
    assert.deepEqual(peekAchievementPresentation(3), []);
    assert.deepEqual(markAchievementPresented(['a']), {
      version: ACHIEVEMENT_PRESENTATION_VERSION,
      pending: [],
      presented: { a: true },
    });
  } finally {
    if (originalWindow !== undefined) globalThis.window = originalWindow;
  }
});

test('version normalization removes invalid and presented pending entries', () => {
  assert.deepEqual(normalizeAchievementPresentationQueue({
    version: 999,
    pending: ['a', '', 'b', 'a', { id: 'c' }, 'd'],
    presented: { b: true, c: false, d: true, empty: false },
  }), {
    version: ACHIEVEMENT_PRESENTATION_VERSION,
    pending: ['a', 'c'],
    presented: { b: true, d: true },
  });
});
