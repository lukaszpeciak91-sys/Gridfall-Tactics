import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BATTLEFIELD_BACKGROUND_OVERSCAN,
  applyCoverBackgroundLayout,
  calculateCoverBackgroundLayout,
} from '../src/rendering/backgroundArt.js';

function assertCovers(layout, width, height) {
  assert.equal(layout.coversViewport, true);
  assert.ok(layout.bounds.left <= 0);
  assert.ok(layout.bounds.top <= 0);
  assert.ok(layout.bounds.right >= width);
  assert.ok(layout.bounds.bottom >= height);
}

function createImageBackground(width = 1440, height = 2560) {
  return {
    active: true,
    type: 'Image',
    texture: { key: 'background.test' },
    width,
    height,
    setOrigin(x, y) { this.originX = x; this.originY = y; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setScale(scale) { this.scaleX = scale; this.scaleY = scale; this.displayWidth = this.width * scale; this.displayHeight = this.height * scale; return this; },
  };
}

test('battle background cover scale fills portrait viewport with minimal overscan', () => {
  const layout = calculateCoverBackgroundLayout({ viewportWidth: 390, viewportHeight: 844, textureWidth: 1440, textureHeight: 2560, overscan: BATTLEFIELD_BACKGROUND_OVERSCAN });
  assert.equal(layout.coverScale, 844 / 2560);
  assert.equal(layout.scale, layout.coverScale * BATTLEFIELD_BACKGROUND_OVERSCAN);
  assertCovers(layout, 390, 844);
  assert.ok(layout.scale / layout.coverScale <= 1.011);
});

test('battle background cover scale fills wider and taller viewport variants', () => {
  for (const [viewportWidth, viewportHeight, textureWidth, textureHeight] of [
    [1024, 768, 1440, 2560],
    [320, 900, 1440, 2560],
    [768, 1024, 2160, 3840],
    [390, 844, 2048, 1024],
  ]) {
    const layout = calculateCoverBackgroundLayout({ viewportWidth, viewportHeight, textureWidth, textureHeight, overscan: BATTLEFIELD_BACKGROUND_OVERSCAN });
    assertCovers(layout, viewportWidth, viewportHeight);
  }
});

test('small overscan prevents top-edge exposure from subpixel resize jitter', () => {
  const withoutOverscan = calculateCoverBackgroundLayout({ viewportWidth: 390, viewportHeight: 844, textureWidth: 1440, textureHeight: 2560, overscan: 1 });
  const withOverscan = calculateCoverBackgroundLayout({ viewportWidth: 390, viewportHeight: 844, textureWidth: 1440, textureHeight: 2560, overscan: BATTLEFIELD_BACKGROUND_OVERSCAN });
  assert.equal(withoutOverscan.bounds.top, 0);
  assert.ok(withOverscan.bounds.top < -4);
  assertCovers(withOverscan, 390, 844);
});

test('authored Y-position override remains applied while preserving coverage', () => {
  const centered = calculateCoverBackgroundLayout({ viewportWidth: 1024, viewportHeight: 768, textureWidth: 1440, textureHeight: 2560, overscan: BATTLEFIELD_BACKGROUND_OVERSCAN, artPositionY: 0.5 });
  const authored = calculateCoverBackgroundLayout({ viewportWidth: 1024, viewportHeight: 768, textureWidth: 1440, textureHeight: 2560, overscan: BATTLEFIELD_BACKGROUND_OVERSCAN, artPositionY: 0.25 });
  assert.notEqual(authored.y, centered.y);
  assertCovers(authored, 1024, 768);
});

test('resize and lifecycle relayout reapplies full coverage without a per-frame loop', () => {
  const background = createImageBackground();
  const first = applyCoverBackgroundLayout(background, { width: 390, height: 844, overscan: BATTLEFIELD_BACKGROUND_OVERSCAN });
  assertCovers(first, 390, 844);
  const resized = applyCoverBackgroundLayout(background, { width: 844, height: 390, overscan: BATTLEFIELD_BACKGROUND_OVERSCAN });
  assertCovers(resized, 844, 390);
  assert.equal(background.scaleX, resized.scale);
  assert.equal(background.scaleY, resized.scale);
});
