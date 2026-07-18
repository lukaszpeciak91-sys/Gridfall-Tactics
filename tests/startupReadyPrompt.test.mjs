import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SETTINGS_STORAGE_KEY } from '../src/localization/localeConfig.js';
import { createLocalizationResolver, translate } from '../src/localization/localeService.js';
import { STARTUP_READY_PROMPT_KEY } from '../src/startupReadyPrompt.js';

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

test('shared startup ready key resolves English', () => {
  assert.equal(translate(STARTUP_READY_PROMPT_KEY, 'en'), 'TAP ANYWHERE');
});

test('shared startup ready key resolves Polish', () => {
  assert.equal(translate(STARTUP_READY_PROMPT_KEY, 'pl'), 'DOTKNIJ GDZIEKOLWIEK');
});

test('synthetic future supported language resolves startup ready key through generic resolver', () => {
  const resolve = createLocalizationResolver({
    translations: {
      en: { ui: { startup: { tapAnywhere: 'TAP ANYWHERE' } } },
      zz: { ui: { startup: { tapAnywhere: 'ZZ TAP' } } },
    },
    normalize: (locale) => (['en', 'zz'].includes(locale) ? locale : 'en'),
  });

  assert.equal(resolve(STARTUP_READY_PROMPT_KEY, 'zz'), 'ZZ TAP');
});

test('missing startup ready key falls back to English', () => {
  const resolve = createLocalizationResolver({
    translations: {
      en: { ui: { startup: { tapAnywhere: 'TAP ANYWHERE' } } },
      zz: { ui: { startup: {} } },
    },
    normalize: (locale) => (['en', 'zz'].includes(locale) ? locale : 'en'),
  });

  assert.equal(resolve(STARTUP_READY_PROMPT_KEY, 'zz'), 'TAP ANYWHERE');
});

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

test('ready prompt DOM element receives non-empty localized text', async () => {
  const copy = { dataset: {} };
  const splash = {
    dataset: {},
    querySelector(selector) {
      return selector === '.startup-splash__copy' ? copy : null;
    },
  };
  const documentRef = {
    getElementById(id) {
      return id === 'startup-splash' ? splash : null;
    },
  };

  await withWindowStorage(createMemoryStorage({
    [SETTINGS_STORAGE_KEY]: JSON.stringify({ language: 'pl' }),
  }), async () => {
    const { applyStartupReadyPrompt } = await loadFreshStartupPromptModule();
    applyStartupReadyPrompt(documentRef);
  });

  assert.equal(splash.dataset.readyPrompt, 'DOTKNIJ GDZIEKOLWIEK');
  assert.equal(copy.dataset.readyPrompt, 'DOTKNIJ GDZIEKOLWIEK');
  assert.notEqual(copy.dataset.readyPrompt, '');
});

test('ready-state CSS reveals ready prompt from the copy element dataset', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /#startup-splash\.is-ready \.startup-splash__copy::before[\s\S]*content: attr\(data-ready-prompt\);/);
  assert.match(html, /#startup-splash\.is-ready \.startup-splash__copy[\s\S]*color: transparent;/);
  assert.match(html, /animation: startup-ready-copy-pulse 3200ms ease-in-out 220ms infinite;/);
});

test('loading-status hiding does not hide or destroy the ready prompt element', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /<div class="startup-splash__copy">PREPARING BROADCAST<\/div>/);
  assert.doesNotMatch(html, /is-loading-complete \.startup-splash__copy\s*\{[\s\S]*display:\s*none/);
  assert.doesNotMatch(html, /is-loading-complete \.startup-splash__copy\s*\{[\s\S]*visibility:\s*hidden/);
});

test('startup prompt uses existing settings storage key without introducing a new key or startup translation map', () => {
  const source = fs.readFileSync('src/startupReadyPrompt.js', 'utf8');
  assert.doesNotMatch(source, /STARTUP_READY_PROMPTS/);
  assert.doesNotMatch(source, /\bpl\b[\s\S]*\ben\b|\ben\b[\s\S]*\bpl\b/);
  assert.doesNotMatch(source, /setItem\(/);
  assert.doesNotMatch(source, /gridfall:tactics:(?!settings:v1)/);
});

test('startup timing and input flow remains unchanged', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const startScene = fs.readFileSync('src/scenes/StartScene.js', 'utf8');
  assert.match(html, /animation: startup-ready-copy-pulse 3200ms ease-in-out 220ms infinite;/);
  assert.match(html, /animation: startup-signal-final-rotate 360ms cubic-bezier\(0\.16, 1, 0\.3, 1\) forwards;/);
  assert.match(html, /transition: opacity 140ms ease;/);
  assert.match(startScene, /const STARTUP_READY_TEXT_DELAY_MS = 520;/);
  assert.match(startScene, /splash\.addEventListener\('pointerup', this\.startupSplashTapHandler, \{ once: false \}\);/);
});
