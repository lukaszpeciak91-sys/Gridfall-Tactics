import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { createCardArtwork } from '../src/rendering/cardVisualLayout.js';

function chainable(displayObject = {}) {
  return {
    ...displayObject,
    setStrokeStyle(...args) {
      this.strokeStyle = args;
      return this;
    },
    setRotation(value) {
      this.rotation = value;
      return this;
    },
    setDisplaySize(width, height) {
      this.displayWidth = width;
      this.displayHeight = height;
      return this;
    },
    setCrop(x, y, width, height) {
      this.crop = { x, y, width, height };
      return this;
    },
  };
}

function createArtworkScene({ loadedTextureKeys = [] } = {}) {
  const textureKeys = new Set(loadedTextureKeys);
  return {
    textures: {
      exists: (key) => textureKeys.has(key),
    },
    add: {
      container: (x, y) => chainable({ type: 'container', x, y, children: [], add(items) { this.children.push(...items); return this; } }),
      rectangle: (x, y, width, height, color, alpha) => chainable({ type: 'rectangle', x, y, width, height, color, alpha }),
      image: (x, y, key) => chainable({
        type: 'image',
        x,
        y,
        key,
        width: 512,
        height: 768,
        texture: {
          getSourceImage: () => ({ width: 512, height: 768 }),
        },
      }),
    },
  };
}

const artZone = Object.freeze({
  centerX: 12,
  centerY: 24,
  width: 120,
  height: 160,
});

test('standardized card illustrations render only when enabled by hand/inspect callers', () => {
  const scene = createArtworkScene({ loadedTextureKeys: ['card.aggro.aggro_runner_1'] });

  const disabledArtwork = createCardArtwork(scene, artZone, { id: 'aggro_runner_1' });
  assert.equal(disabledArtwork.type, 'container');

  const enabledArtwork = createCardArtwork(scene, artZone, { id: 'aggro_runner_1' }, { enableCardIllustration: true });
  assert.equal(enabledArtwork.type, 'image');
  assert.equal(enabledArtwork.key, 'card.aggro.aggro_runner_1');
  assert.equal(enabledArtwork.crop.x, 0);
  assert.equal(enabledArtwork.crop.width, 512);
  assert.ok(Math.abs(enabledArtwork.crop.y - 42.6667) < 0.001);
  assert.ok(Math.abs(enabledArtwork.crop.height - 682.6667) < 0.001);
});

test('missing standardized card illustrations keep the existing placeholder fallback', () => {
  const scene = createArtworkScene();
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (message) => warnings.push(message);
  try {
    const artwork = createCardArtwork(scene, artZone, { id: 'aggro_runner_1' }, { enableCardIllustration: true });
    assert.equal(artwork.type, 'container');
    assert.equal(artwork.children.length, 4);
  } finally {
    console.warn = originalWarn;
  }

  assert.deepEqual(warnings, ['Card illustration missing: public/assets/cards/aggro/aggro_runner_1.webp']);
});

test('battle scene enables illustrations for hand cards and hand inspect, not board inspect', () => {
  const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
  const drawHand = source.slice(source.indexOf('  drawHand()'), source.indexOf('  createHandCardView({'));
  const inspectRequest = source.slice(source.indexOf('  getCurrentInspectCardRequest()'), source.indexOf('  showSelectedHandCardZoom()'));
  const inspectZoom = source.slice(source.indexOf('  showSelectedHandCardZoom()'), source.indexOf('  applyInspectDimming('));

  assert.match(drawHand, /enableCardIllustration: true/);
  assert.match(inspectRequest, /sourceY: cardView\.baseY,[\s\S]*enableCardIllustration: true/);
  assert.match(inspectRequest, /sourceY: cell\.background\.y,[\s\S]*enableCardIllustration: false/);
  assert.match(inspectZoom, /enableCardIllustration: inspectRequest\.enableCardIllustration/);
});

test('collection scene does not opt into task 2 hand/inspect illustration rendering', () => {
  const source = fs.readFileSync('src/scenes/CollectionScene.js', 'utf8');
  assert.doesNotMatch(source, /preloadAllCardIllustrations/);
  assert.doesNotMatch(source, /enableCardIllustration: true/);
});
