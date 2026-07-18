import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  BATTLE_TRANSITION_INITIAL_OVERSCAN,
  calculateBattleTransitionArtworkLayout,
} from '../src/rendering/battleTransitionArtworkLayout.js';

const source = readFileSync('src/scenes/BattleTransitionScene.js', 'utf8');
const layoutSource = readFileSync('src/rendering/battleTransitionArtworkLayout.js', 'utf8');

function assertCovers(endpoint, viewportWidth, viewportHeight) {
  assert.equal(endpoint.coversViewport, true);
  assert.ok(endpoint.bounds.left <= 0, `left edge exposed: ${endpoint.bounds.left}`);
  assert.ok(endpoint.bounds.top <= 0, `top edge exposed: ${endpoint.bounds.top}`);
  assert.ok(endpoint.bounds.right >= viewportWidth, `right edge exposed: ${endpoint.bounds.right}`);
  assert.ok(endpoint.bounds.bottom >= viewportHeight, `bottom edge exposed: ${endpoint.bounds.bottom}`);
}

function interpolate(a, b, progress) {
  return a + (b - a) * progress;
}

function interpolatedEndpoint(layout, progress) {
  const displayWidth = interpolate(layout.start.displayWidth, layout.end.displayWidth, progress);
  const displayHeight = interpolate(layout.start.displayHeight, layout.end.displayHeight, progress);
  const x = interpolate(layout.start.x, layout.end.x, progress);
  const y = interpolate(layout.start.y, layout.end.y, progress);
  const bounds = {
    left: x - displayWidth * layout.originX,
    right: x + displayWidth * (1 - layout.originX),
    top: y - displayHeight * layout.originY,
    bottom: y + displayHeight * (1 - layout.originY),
  };
  return { bounds, coversViewport: bounds.left <= 0 && bounds.top <= 0 };
}

test('initial transition frame fully covers portrait viewport with 1.06 overscan', () => {
  const viewportWidth = 390;
  const viewportHeight = 844;
  const sourceWidth = 1440;
  const sourceHeight = 2560;
  const coverScale = viewportHeight / sourceHeight;
  const layout = calculateBattleTransitionArtworkLayout({ viewportWidth, viewportHeight, sourceWidth, sourceHeight, coverScale });

  assert.equal(BATTLE_TRANSITION_INITIAL_OVERSCAN, 1.06);
  assert.equal(layout.startScale, coverScale * BATTLE_TRANSITION_INITIAL_OVERSCAN);
  assertCovers(layout.start, viewportWidth, viewportHeight);
  assert.ok(layout.start.bounds.top < 0);
});

test('initial transition frame fully covers fullscreen landscape viewport', () => {
  const viewportWidth = 1920;
  const viewportHeight = 1080;
  const sourceWidth = 1440;
  const sourceHeight = 2560;
  const coverScale = viewportWidth / sourceWidth;
  const layout = calculateBattleTransitionArtworkLayout({ viewportWidth, viewportHeight, sourceWidth, sourceHeight, coverScale });

  assertCovers(layout.start, viewportWidth, viewportHeight);
});

test('every tween endpoint covers the viewport and interpolated tween values cannot expose the top edge', () => {
  const viewportWidth = 390;
  const viewportHeight = 844;
  const layout = calculateBattleTransitionArtworkLayout({
    viewportWidth,
    viewportHeight,
    sourceWidth: 1440,
    sourceHeight: 2560,
    coverScale: viewportHeight / 2560,
  });

  assertCovers(layout.start, viewportWidth, viewportHeight);
  assertCovers(layout.end, viewportWidth, viewportHeight);
  for (const progress of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
    const endpoint = interpolatedEndpoint(layout, progress);
    assert.ok(endpoint.bounds.top <= 0, `top edge exposed at ${progress}: ${endpoint.bounds.top}`);
  }
});

test('existing focal positioning remains applied through the shared overscan layout', () => {
  const layout = calculateBattleTransitionArtworkLayout({
    viewportWidth: 1024,
    viewportHeight: 768,
    sourceWidth: 1440,
    sourceHeight: 2560,
    coverScale: 1024 / 1440,
    originX: 0.5,
    originY: 0.35,
  });

  assert.equal(layout.originY, 0.35);
  assert.ok(layout.start.y > 768 / 2, 'start drift remains applied around authored focal point');
});

test('resize/fullscreen relayout uses resolved viewport and lifecycle handlers without changing duration', () => {
  assert.match(source, /getResolvedViewportDimensions\(\)/);
  assert.match(source, /this\.scale\.on\('enterfullscreen', this\.resizeHandler\)/);
  assert.match(source, /this\.scale\.on\('leavefullscreen', this\.resizeHandler\)/);
  assert.match(source, /if \(!this\.isCancelled\) this\.rebuildPresentation\(\);/);
  assert.match(source, /const MOTION_DURATION_MS = 11000;/);
});

test('no per-asset offsets are introduced for transition artwork', () => {
  assert.doesNotMatch(source, /assetOffset|perAsset|selection\?\.[a-zA-Z]*(?:Offset|Overscan)|card\?\.[a-zA-Z]*(?:Offset|Overscan)/);
  assert.match(layoutSource, /BATTLE_TRANSITION_INITIAL_OVERSCAN/);
});
