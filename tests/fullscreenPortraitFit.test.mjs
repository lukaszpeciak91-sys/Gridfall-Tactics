import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateForcedLandscapePortraitFit } from '../src/systems/fullscreenPortraitFit.js';

test('forced landscape fullscreen fit maximizes portrait height without exceeding 9:16 width', () => {
  const fit = calculateForcedLandscapePortraitFit(915, 412);

  assert.equal(fit.width, 190);
  assert.equal(fit.height, 412);
  assert.equal(fit.availableWidth, 915);
  assert.equal(fit.availableHeight, 412);
  assert.ok(fit.width <= fit.height * (390 / 844));
});

test('forced landscape fullscreen fit falls back to width limit on narrow safe areas', () => {
  const fit = calculateForcedLandscapePortraitFit(360, 900, {
    safeHorizontal: 20,
    safeVertical: 0,
  });

  assert.equal(fit.availableWidth, 340);
  assert.equal(fit.width, 340);
  assert.equal(fit.height, 735);
  assert.ok(fit.height <= fit.availableHeight);
});
