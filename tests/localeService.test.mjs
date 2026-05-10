import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_LOCALE,
  SETTINGS_STORAGE_KEY,
  getActiveLocale,
  getSupportedLocales,
  normalizeLocale,
  setActiveLocale,
} from '../src/localization/localeService.js';

function createMemoryStorage(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    clear() {
      values.clear();
    },
  };
}

function withWindowStorage(storage, callback) {
  const originalWindow = globalThis.window;
  globalThis.window = { localStorage: storage };
  try {
    return callback();
  } finally {
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  }
}

test('default active locale is en when no setting is stored', () => {
  withWindowStorage(createMemoryStorage(), () => {
    assert.equal(getActiveLocale(), DEFAULT_LOCALE);
  });
});

test('pl is accepted and persisted through the existing settings key', () => {
  const storage = createMemoryStorage({
    [SETTINGS_STORAGE_KEY]: JSON.stringify({ musicVolume: 25 }),
  });

  withWindowStorage(storage, () => {
    assert.equal(setActiveLocale('pl'), 'pl');
    assert.equal(getActiveLocale(), 'pl');
    assert.deepEqual(JSON.parse(storage.getItem(SETTINGS_STORAGE_KEY)), {
      musicVolume: 25,
      language: 'pl',
    });
  });
});

test('invalid locale falls back to en', () => {
  assert.equal(normalizeLocale('de'), DEFAULT_LOCALE);
  assert.equal(normalizeLocale(undefined), DEFAULT_LOCALE);

  withWindowStorage(createMemoryStorage(), () => {
    assert.equal(setActiveLocale('de'), DEFAULT_LOCALE);
    assert.equal(getActiveLocale(), DEFAULT_LOCALE);
  });
});

test('persisted language setting is read from existing settings storage', () => {
  const storage = createMemoryStorage({
    [SETTINGS_STORAGE_KEY]: JSON.stringify({ language: 'pl', musicVolume: 80, muted: true }),
  });

  withWindowStorage(storage, () => {
    assert.equal(getActiveLocale(), 'pl');
  });
});

test('supported locale list returns en and pl as a safe copy', () => {
  const locales = getSupportedLocales();
  assert.deepEqual(locales, ['en', 'pl']);

  locales.push('de');
  assert.deepEqual(getSupportedLocales(), ['en', 'pl']);
});
