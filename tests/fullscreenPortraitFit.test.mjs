import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateForcedLandscapePortraitFit,
  calculatePortraitFrameFit,
  shouldApplyPortraitFrameFit,
} from '../src/systems/fullscreenPortraitFit.js';

test('portrait frame fit maximizes portrait height without exceeding 9:16 width', () => {
  const fit = calculatePortraitFrameFit(915, 412);

  assert.equal(fit.width, 190);
  assert.equal(fit.height, 412);
  assert.equal(fit.availableWidth, 915);
  assert.equal(fit.availableHeight, 412);
  assert.ok(fit.width <= fit.height * (390 / 844));
});

test('portrait frame fit falls back to width limit on narrow safe areas', () => {
  const fit = calculatePortraitFrameFit(360, 900, {
    safeHorizontal: 20,
    safeVertical: 0,
  });

  assert.equal(fit.availableWidth, 340);
  assert.equal(fit.width, 340);
  assert.equal(fit.height, 735);
  assert.ok(fit.height <= fit.availableHeight);
});

test('legacy forced landscape fit export remains compatible with universal portrait fit', () => {
  assert.deepEqual(
    calculateForcedLandscapePortraitFit(812, 375, { safeVertical: 10 }),
    calculatePortraitFrameFit(812, 375, { safeVertical: 10 }),
  );
});

test('portrait frame fit applies in non-fullscreen landscape but not normal portrait', () => {
  assert.equal(shouldApplyPortraitFrameFit(915, 412, { isFullscreen: false }), true);
  assert.equal(shouldApplyPortraitFrameFit(390, 844, { isFullscreen: false }), false);
});

test('portrait frame fit stays active in fullscreen as a safe orientation lock fallback', () => {
  assert.equal(shouldApplyPortraitFrameFit(390, 844, { isFullscreen: true }), true);
  assert.equal(shouldApplyPortraitFrameFit(915, 412, { isFullscreen: true }), true);
});
