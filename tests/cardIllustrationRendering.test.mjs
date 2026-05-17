import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { calculateCardArtworkCoverCrop, createCardArtwork, getCardLayoutZones } from '../src/rendering/cardVisualLayout.js';

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

test('card artwork cover crop diagnostics report centered source-space loss', () => {
  const crop = calculateCardArtworkCoverCrop(artZone, 512, 768);

  assert.equal(crop.cropX, 0);
  assert.equal(crop.cropWidth, 512);
  assert.ok(Math.abs(crop.cropY - 42.6667) < 0.001);
  assert.ok(Math.abs(crop.cropHeight - 682.6667) < 0.001);
  assert.equal(crop.visibleSourceWidthPercent, 100);
  assert.ok(Math.abs(crop.visibleSourceHeightPercent - 88.8889) < 0.001);
  assert.ok(Math.abs(crop.lostTopPercent - crop.lostBottomPercent) < 0.001);
  assert.equal(crop.lostLeftPercent, 0);
  assert.equal(crop.lostRightPercent, 0);
});

test('dry card layout experiment expands collection artwork viewport without shrinking stat row', () => {
  const zones = getCardLayoutZones(176, 250);
  const crop = calculateCardArtworkCoverCrop(zones.art, 512, 768);

  assert.equal(zones.statBadges.height, 26);
  assert.equal(zones.art.width, 156);
  assert.equal(zones.art.height, 111);
  assert.ok(crop.visibleSourceHeightPercent >= 47 && crop.visibleSourceHeightPercent <= 49);
});

test('standardized card illustrations render only when callers enable them', () => {
  const scene = createArtworkScene({ loadedTextureKeys: ['card.aggro.aggro_01', 'card.control.control_04'] });

  const disabledArtwork = createCardArtwork(scene, artZone, { id: 'aggro_runner_1' });
  assert.equal(disabledArtwork.type, 'container');

  const enabledArtwork = createCardArtwork(scene, artZone, { id: 'aggro_runner_1' }, { enableCardIllustration: true });
  assert.equal(enabledArtwork.type, 'image');
  assert.equal(enabledArtwork.key, 'card.aggro.aggro_01');
  assert.equal(enabledArtwork.crop.x, 0);
  assert.equal(enabledArtwork.crop.width, 512);
  assert.ok(Math.abs(enabledArtwork.crop.y - 42.6667) < 0.001);
  assert.ok(Math.abs(enabledArtwork.crop.height - 682.6667) < 0.001);

  const controlArtwork = createCardArtwork(scene, artZone, { id: 'control_controller_1' }, { enableCardIllustration: true });
  assert.equal(controlArtwork.type, 'image');
  assert.equal(controlArtwork.key, 'card.control.control_04');
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

  assert.deepEqual(warnings, ['Card illustration missing: public/assets/cards/aggro/aggro_01.webp']);
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

test('collection scene enables standardized illustrations through the shared preview renderer', () => {
  const source = fs.readFileSync('src/scenes/CollectionScene.js', 'utf8');
  const previewSource = source.slice(source.indexOf('  drawCardPreview('), source.indexOf('  openDetailPanel('));

  assert.match(source, /preloadAllCardIllustrations\(this\)/);
  assert.match(previewSource, /createCardPreviewView\(this, \{/);
  assert.match(previewSource, /enableCardIllustration: true/);
  assert.doesNotMatch(previewSource, /createCardArtwork\(/);
});
