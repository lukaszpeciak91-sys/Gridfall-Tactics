import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  calculateCardArtworkCoverPosition,
  createCardArtwork,
  createCardPreviewView,
  getCardLayoutZones,
} from '../src/rendering/cardVisualLayout.js';

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
    setOrigin(x, y = x) {
      this.origin = { x, y };
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


function createPreviewScene({ loadedTextureKeys = [] } = {}) {
  const scene = createArtworkScene({ loadedTextureKeys });
  const makeChainable = (displayObject = {}) => chainable({
    ...displayObject,
    active: true,
    setDepth(value) { this.depth = value; return this; },
    setAlpha(value) { this.alpha = value; return this; },
    setShadow(...args) { this.shadow = args; return this; },
    setVisible(value) { this.visible = value; return this; },
    setText(value) { this.text = value; this.width = String(value ?? '').length * 6; return this; },
    setFontSize(value) { this.style = { ...(this.style ?? {}), fontSize: `${value}px` }; this.height = Number(value) || this.height; return this; },
    destroy() { this.destroyed = true; },
  });

  scene.add.container = (x, y) => makeChainable({
    type: 'container',
    x,
    y,
    children: [],
    add(items) {
      const normalizedItems = Array.isArray(items) ? items : [items];
      this.children.push(...normalizedItems.filter(Boolean));
      return this;
    },
  });
  scene.add.rectangle = (x, y, width, height, color, alpha) => makeChainable({ type: 'rectangle', x, y, width, height, color, alpha });
  scene.add.circle = (x, y, radius, color, alpha) => makeChainable({ type: 'circle', x, y, radius, color, alpha });
  scene.add.text = (x, y, text, style = {}) => makeChainable({
    type: 'text',
    x,
    y,
    text,
    style: { ...style },
    width: String(text ?? '').length * 6,
    height: Number.parseFloat(style.fontSize) || 12,
  });
  scene.add.graphics = () => makeChainable({
    type: 'graphics',
    fillStyle() { return this; },
    fillRect(...args) { this.fillRectArgs = args; return this; },
    createGeometryMask() { return { shape: this }; },
  });

  return scene;
}

const artZone = Object.freeze({
  centerX: 12,
  centerY: 24,
  width: 120,
  height: 160,
});

test('card artwork cover positioning keeps frame fixed and defaults to centered source position', () => {
  const crop = calculateCardArtworkCoverPosition(artZone, 512, 768);
  assert.equal(crop.scale, 0.234375);
  assert.equal(crop.displayWidth, 120);
  assert.equal(crop.displayHeight, 180);
  assert.equal(crop.cropX, 0);
  assert.equal(crop.cropWidth, 512);
  assert.equal(crop.cropY, 43);
  assert.equal(crop.cropHeight, 683);
  assert.equal(Number.isInteger(crop.cropX), true);
  assert.equal(Number.isInteger(crop.cropY), true);
  assert.equal(Number.isInteger(crop.cropWidth), true);
  assert.equal(Number.isInteger(crop.cropHeight), true);
  assert.ok(Math.abs(crop.lostTopPercent - crop.lostBottomPercent) < 0.14);
  assert.ok(Math.abs(crop.artPositionY - 0.5) < 0.006);
});

test('dry card layout experiment expands collection artwork viewport without shrinking stat row', () => {
  const zones = getCardLayoutZones(176, 250);
  const crop = calculateCardArtworkCoverPosition(zones.art, 512, 768);

  assert.equal(zones.statBadges.height, 26);
  assert.equal(zones.art.width, 156);
  assert.equal(zones.art.height, 111);
  assert.ok(crop.visibleSourceHeightPercent >= 47 && crop.visibleSourceHeightPercent <= 49);
});


test('card preview art recess shadow preserves layout while avoiding an art-bottom-aligned hard edge', () => {
  const width = 160;
  const height = 227;
  const zones = getCardLayoutZones(width, height);
  const scene = createPreviewScene();
  const preview = createCardPreviewView(scene, {
    card: null,
    x: 0,
    y: 0,
    width,
    height,
  });

  const [glow, background, inner, statPanel, statPanelTopEdge, artRecessShadow, art, artRecessHighlight] = preview.root.children;

  assert.equal(glow.type, 'rectangle');
  assert.equal(background.width, width);
  assert.equal(background.height, height);
  assert.equal(inner.width, width - zones.pad * 0.9);
  assert.equal(statPanel.width, zones.statBadges.width);
  assert.equal(statPanelTopEdge.height, 1);
  assert.equal(artRecessShadow.type, 'rectangle');
  assert.equal(art.type, 'container');
  assert.equal(artRecessHighlight.type, 'rectangle');

  // The artwork viewport and layout zones stay fixed; only the recess shadow treatment is softened.
  assert.equal(zones.art.width, 142);
  assert.equal(zones.art.height, 101);
  assert.equal(art.x, zones.art.centerX);
  assert.equal(art.y, zones.art.centerY);

  const shadowBottom = artRecessShadow.y + artRecessShadow.height / 2;
  const artBottom = zones.art.y + zones.art.height;
  assert.ok(shadowBottom < artBottom, `expected shadow bottom ${shadowBottom} to sit above art bottom ${artBottom}`);
  assert.equal(artRecessShadow.height, zones.art.height - Math.max(2, Math.round(zones.gap * 0.6)) * 2);
  assert.deepEqual(artRecessShadow.strokeStyle, [1, 0x020617, 0.18]);
  assert.equal(artRecessShadow.alpha, 0.16);
});

test('card artwork crop Y selects source window while keeping viewport covered and image position fixed', () => {
  const scene = createArtworkScene({ loadedTextureKeys: ['card.aggro.aggro_01'] });

  const topArtwork = createCardArtwork(scene, artZone, { id: 'aggro_runner_1' }, {
    enableCardIllustration: true,
    artPositionY: 0,
  });
  const middleArtwork = createCardArtwork(scene, artZone, { id: 'aggro_runner_1' }, {
    enableCardIllustration: true,
    artPositionY: 0.5,
  });
  const bottomArtwork = createCardArtwork(scene, artZone, { id: 'aggro_runner_1' }, {
    enableCardIllustration: true,
    artPositionY: 1,
  });

  assert.equal(topArtwork.x, artZone.centerX);
  assert.equal(middleArtwork.x, artZone.centerX);
  assert.equal(bottomArtwork.x, artZone.centerX);
  assert.equal(topArtwork.y, artZone.centerY);
  assert.equal(middleArtwork.y, artZone.centerY);
  assert.equal(bottomArtwork.y, artZone.centerY);

  assert.equal(topArtwork.crop.y, 0);
  assert.equal(middleArtwork.crop.y, 43);
  assert.ok(Math.abs(bottomArtwork.crop.y - bottomArtwork.cropDebugMetrics.maxCropY) < 0.001);
  assert.ok(bottomArtwork.crop.y > middleArtwork.crop.y);

  [topArtwork, middleArtwork, bottomArtwork].forEach((artwork) => {
    assert.ok((artwork.crop.width * artwork.cropDebugMetrics.scale) >= artZone.width);
    assert.ok((artwork.crop.height * artwork.cropDebugMetrics.scale) >= artZone.height);
    assert.ok(((artwork.crop.width * artwork.cropDebugMetrics.scale) - artZone.width) <= artwork.cropDebugMetrics.scale);
    assert.ok(((artwork.crop.height * artwork.cropDebugMetrics.scale) - artZone.height) <= artwork.cropDebugMetrics.scale);
    assert.equal(artwork.displayWidth, 120);
    assert.equal(artwork.displayHeight, 180);
  });

  assert.ok(topArtwork.origin.y < middleArtwork.origin.y);
  assert.ok(middleArtwork.origin.y < bottomArtwork.origin.y);
});


test('card artwork crop values are integer-stabilized and remain inside texture bounds', () => {
  const crop = calculateCardArtworkCoverPosition(artZone, 512, 768, { artPositionY: 0.5 });

  assert.equal(Number.isInteger(crop.cropX), true);
  assert.equal(Number.isInteger(crop.cropY), true);
  assert.equal(Number.isInteger(crop.cropWidth), true);
  assert.equal(Number.isInteger(crop.cropHeight), true);
  assert.ok(crop.cropX >= 0);
  assert.ok(crop.cropY >= 0);
  assert.ok(crop.cropX + crop.cropWidth <= 512);
  assert.ok(crop.cropY + crop.cropHeight <= 768);
  assert.equal(crop.displayWidth, 120);
  assert.equal(crop.displayHeight, 180);
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
  assert.equal(enabledArtwork.crop.y, 43);
  assert.equal(enabledArtwork.crop.height, 683);

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

test('battle scene enables illustrations for hand cards, board cards, and board inspect', () => {
  const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
  const drawHand = source.slice(source.indexOf('  drawHand()'), source.indexOf('  createHandCardView({'));
  const inspectRequest = source.slice(source.indexOf('  getCurrentInspectCardRequest()'), source.indexOf('  showSelectedHandCardZoom()'));
  const inspectZoom = source.slice(source.indexOf('  showSelectedHandCardZoom()'), source.indexOf('  applyInspectDimming('));

  assert.match(drawHand, /enableCardIllustration: true/);
  assert.match(inspectRequest, /sourceY: cardView\.baseY,[\s\S]*enableCardIllustration: true/);
  assert.match(inspectRequest, /sourceY: cell\.background\.y,[\s\S]*enableCardIllustration: true/);
  const boardUnitView = source.slice(source.indexOf('  createBoardUnitView(cell, unit) {'), source.indexOf('  refreshBoardLabels() {'));

  assert.match(inspectZoom, /enableCardIllustration: inspectRequest\.enableCardIllustration/);
  assert.match(boardUnitView, /createCardArtwork\(/);
  assert.match(boardUnitView, /enableCardIllustration: true/);
});

test('collection scene enables standardized illustrations through the shared preview renderer', () => {
  const source = fs.readFileSync('src/scenes/CollectionScene.js', 'utf8');
  const previewSource = source.slice(source.indexOf('  drawCardPreview('), source.indexOf('  createBackButton('));

  assert.match(source, /preloadAllCardIllustrations\(this\)/);
  assert.match(previewSource, /createCardPreviewView\(this, \{/);
  assert.match(previewSource, /enableCardIllustration: true/);
  assert.doesNotMatch(previewSource, /createCardArtwork\(/);
});

test('card preview artwork crop metrics are source-space viewport dimensions that map back to the visible card window', () => {
  const targetWidth = 220;
  const targetHeight = 409;
  const zones = getCardLayoutZones(targetWidth, targetHeight);
  const crop = calculateCardArtworkCoverPosition(zones.art, 512, 768);

  // cropDebugMetrics values are in source-image pixel space.
  assert.ok(crop.cropWidth > zones.art.width);
  assert.ok(crop.cropHeight > zones.art.height);

  // Mapping source-space crop window back by render scale covers the visible art zone
  // with less than one source pixel of safe overscan after integer stabilization.
  assert.ok((crop.cropWidth * crop.scale) >= zones.art.width);
  assert.ok((crop.cropHeight * crop.scale) >= zones.art.height);
  assert.ok(((crop.cropWidth * crop.scale) - zones.art.width) <= crop.scale);
  assert.ok(((crop.cropHeight * crop.scale) - zones.art.height) <= crop.scale);
});

test('art viewport debug renders final card preview and applies movement only on Y', () => {
  const source = fs.readFileSync('src/scenes/ArtViewportDebugScene.js', 'utf8');

  assert.match(source, /createCardPreviewView\(this, \{/);
  assert.match(source, /preview\?\.art\?\.cropDebugMetrics/);
  assert.match(source, /temporaryArtCropY01: this\.currentY01/);
  assert.match(source, /this\.previewNodes = this\.drawRenderedCardPane\(card\)/);
  assert.doesNotMatch(source, /drawSourceSelectionPane/);
  assert.doesNotMatch(source, /selectorWidth = Number\.isFinite\(viewportWidth\)/);
  assert.doesNotMatch(source, /const cropX = \(sourceWidth - selectorWidth\)/);
});
