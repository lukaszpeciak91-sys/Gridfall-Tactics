import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SETTINGS_STORAGE_KEY } from '../src/localization/localeConfig.js';

function createMemoryStorage(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

async function loadFreshStartupPromptModule() {
  return import(`../src/startupReadyPrompt.js?test=${Date.now()}-${Math.random()}`);
}

async function withWindowStorage(storage, callback) {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  globalThis.window = { localStorage: storage };
  delete globalThis.document;
  try {
    return await callback();
  } finally {
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }

    if (originalDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDocument;
    }
  }
}

test('saved Polish language produces localized startup ready prompt', async () => {
  await withWindowStorage(createMemoryStorage({
    [SETTINGS_STORAGE_KEY]: JSON.stringify({ language: 'pl' }),
  }), async () => {
    const { getStartupReadyPrompt } = await loadFreshStartupPromptModule();
    assert.equal(getStartupReadyPrompt(), 'DOTKNIJ GDZIEKOLWIEK');
  });
});

test('saved English language produces English startup ready prompt', async () => {
  await withWindowStorage(createMemoryStorage({
    [SETTINGS_STORAGE_KEY]: JSON.stringify({ language: 'en' }),
  }), async () => {
    const { getStartupReadyPrompt } = await loadFreshStartupPromptModule();
    assert.equal(getStartupReadyPrompt(), 'TAP ANYWHERE');
  });
});

test('missing storage defaults startup ready prompt to English', async () => {
  await withWindowStorage(null, async () => {
    const { getStartupReadyPrompt } = await loadFreshStartupPromptModule();
    assert.equal(getStartupReadyPrompt(), 'TAP ANYWHERE');
  });
});

test('malformed startup settings JSON defaults ready prompt to English', async () => {
  await withWindowStorage(createMemoryStorage({ [SETTINGS_STORAGE_KEY]: '{bad json' }), async () => {
    const { getStartupReadyPrompt } = await loadFreshStartupPromptModule();
    assert.equal(getStartupReadyPrompt(), 'TAP ANYWHERE');
  });
});

test('unsupported saved language defaults startup ready prompt to English', async () => {
  await withWindowStorage(createMemoryStorage({
    [SETTINGS_STORAGE_KEY]: JSON.stringify({ language: 'de' }),
  }), async () => {
    const { getStartupReadyPrompt } = await loadFreshStartupPromptModule();
    assert.equal(getStartupReadyPrompt(), 'TAP ANYWHERE');
  });
});

test('storage access failure defaults startup ready prompt to English', async () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  globalThis.window = {};
  Object.defineProperty(globalThis.window, 'localStorage', {
    get() {
      throw new Error('blocked');
    },
  });
  delete globalThis.document;

  try {
    const { getStartupReadyPrompt } = await loadFreshStartupPromptModule();
    assert.equal(getStartupReadyPrompt(), 'TAP ANYWHERE');
  } finally {
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }

    if (originalDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDocument;
    }
  }
});

test('startup prompt uses existing settings storage key without introducing a new key', () => {
  const source = fs.readFileSync('src/startupReadyPrompt.js', 'utf8');
  assert.match(source, /SETTINGS_STORAGE_KEY/);
  assert.doesNotMatch(source, /setItem\(/);
  assert.doesNotMatch(source, /gridfall:tactics:(?!settings:v1)/);
});

test('startup loading and reveal timing remains unchanged', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /animation: startup-ready-copy-pulse 3200ms ease-in-out 220ms infinite;/);
  assert.match(html, /animation: startup-signal-final-rotate 360ms cubic-bezier\(0\.16, 1, 0\.3, 1\) forwards;/);
  assert.match(html, /transition: opacity 140ms ease;/);
});
