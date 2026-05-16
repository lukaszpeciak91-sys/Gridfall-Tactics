import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CARD_ILLUSTRATION_SOURCE,
  getCardIllustrationAsset,
  getCardIllustrationAssetId,
  getCardIllustrationPublicPath,
  getCardIllustrationRuntimePath,
  getCardIllustrationTextureKey,
  getLoadedCardIllustrationTextureKey,
  preloadCardIllustrationAsset,
  preloadCardIllustrationsForFaction,
} from '../src/rendering/cardIllustrationAssets.js';

function createFakeScene({ existingTextures = [] } = {}) {
  const textureKeys = new Set(existingTextures);
  const loadCalls = [];
  const listeners = new Map();
  return {
    textures: {
      exists: (key) => textureKeys.has(key),
    },
    load: {
      image: (key, path) => loadCalls.push({ key, path }),
      on: (event, callback) => listeners.set(event, callback),
      off: (event, callback) => {
        if (listeners.get(event) === callback) listeners.delete(event);
      },
    },
    loadCalls,
    listeners,
  };
}

test('card illustration keys and source paths are deterministic', () => {
  assert.equal(getCardIllustrationTextureKey('aggro', 'aggro_01'), 'card.aggro.aggro_01');
  assert.equal(getCardIllustrationTextureKey('control', 'control_09'), 'card.control.control_09');
  assert.equal(getCardIllustrationTextureKey('control', 'control_override_1'), 'card.control.control_override_1');
  assert.equal(getCardIllustrationPublicPath('aggro', 'aggro_01'), 'public/assets/cards/aggro/aggro_01.webp');
  assert.equal(getCardIllustrationPublicPath('control', 'control_09'), 'public/assets/cards/control/control_09.webp');
  assert.equal(getCardIllustrationPublicPath('control', 'control_override_1'), 'public/assets/cards/control/control_override_1.webp');
  assert.equal(getCardIllustrationRuntimePath('aggro', 'aggro_01'), './assets/cards/aggro/aggro_01.webp');
  assert.deepEqual(CARD_ILLUSTRATION_SOURCE, {
    width: 512,
    height: 768,
    aspectRatio: '2:3 portrait',
    preferredFormat: 'webp',
  });
});

test('card illustration assets prefer stable art asset ids from existing card data', () => {
  assert.equal(getCardIllustrationAssetId({ id: 'aggro_runner_1' }), 'aggro_01');
  assert.deepEqual(getCardIllustrationAsset({ id: 'aggro_runner_1' }), {
    key: 'card.aggro.aggro_01',
    path: './assets/cards/aggro/aggro_01.webp',
    publicPath: 'public/assets/cards/aggro/aggro_01.webp',
    factionId: 'aggro',
    cardId: 'aggro_runner_1',
    artAssetId: 'aggro_01',
  });

  assert.deepEqual(getCardIllustrationAsset({ id: 'renamed_control_card', artAssetId: 'control_04', factionId: 'control' }), {
    key: 'card.control.control_04',
    path: './assets/cards/control/control_04.webp',
    publicPath: 'public/assets/cards/control/control_04.webp',
    factionId: 'control',
    cardId: 'renamed_control_card',
    artAssetId: 'control_04',
  });

  assert.deepEqual(getCardIllustrationAsset({ id: 'future_card_without_art_id', factionId: 'aggro' }), {
    key: 'card.aggro.future_card_without_art_id',
    path: './assets/cards/aggro/future_card_without_art_id.webp',
    publicPath: 'public/assets/cards/aggro/future_card_without_art_id.webp',
    factionId: 'aggro',
    cardId: 'future_card_without_art_id',
    artAssetId: 'future_card_without_art_id',
  });

  assert.equal(getCardIllustrationAsset({ id: 'missing_card' }), null);
});

test('preload helper queues each texture key once per scene and skips loaded textures', () => {
  const scene = createFakeScene();
  const asset = getCardIllustrationAsset({ id: 'control_system_override_1' });

  assert.equal(preloadCardIllustrationAsset(scene, asset), true);
  assert.equal(preloadCardIllustrationAsset(scene, asset), false);
  assert.deepEqual(scene.loadCalls, [{
    key: 'card.control.control_09',
    path: './assets/cards/control/control_09.webp',
  }]);

  const loadedScene = createFakeScene({ existingTextures: ['card.control.control_09'] });
  assert.equal(preloadCardIllustrationAsset(loadedScene, asset), false);
  assert.deepEqual(loadedScene.loadCalls, []);
});

test('faction preload returns queued count without duplicating later calls', () => {
  const scene = createFakeScene();
  const firstCount = preloadCardIllustrationsForFaction(scene, 'Aggro');
  const secondCount = preloadCardIllustrationsForFaction(scene, 'Aggro');

  assert.ok(firstCount > 0);
  assert.equal(secondCount, 0);
  assert.equal(scene.loadCalls.length, firstCount);
  assert.equal(scene.loadCalls[0].key, 'card.aggro.aggro_01');
});

test('missing illustrations fall back to placeholder-compatible null texture keys and warn once', () => {
  const scene = createFakeScene();
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (message) => warnings.push(message);
  try {
    assert.equal(getLoadedCardIllustrationTextureKey(scene, { id: 'aggro_runner_1' }), null);
    assert.equal(getLoadedCardIllustrationTextureKey(scene, { id: 'aggro_runner_1' }), null);
  } finally {
    console.warn = originalWarn;
  }

  assert.deepEqual(warnings, ['Card illustration missing: public/assets/cards/aggro/aggro_01.webp']);
});
