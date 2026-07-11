import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildDebugIllustrationEntries, summarizeDebugIllustrationEntries } from '../src/scenes/debugIllustrationPool.js';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

test('battle transition art preview debug scene is registered and launched from mode selector', () => {
  const main = read('src/main.js');
  const selector = read('src/scenes/ArtDebugModeSelectScene.js');
  const scene = read('src/scenes/BattleTransitionArtPreviewDebugScene.js');

  assert.match(main, /import BattleTransitionArtPreviewDebugScene from '\.\/scenes\/BattleTransitionArtPreviewDebugScene\.js';/);
  assert.match(main, /BoardUnitArtViewportDebugScene, BattleTransitionArtPreviewDebugScene/);
  assert.match(selector, /'Battle Transition'/);
  assert.match(selector, /this\.scene\.start\('BattleTransitionArtPreviewDebugScene'\)/);
  assert.match(scene, /super\('BattleTransitionArtPreviewDebugScene'\)/);
});

test('debug illustration pool includes faction, tutorial, and generated art deduped by faction plus art asset', () => {
  const entries = buildDebugIllustrationEntries();
  const summary = summarizeDebugIllustrationEntries(entries);
  const dedupeKeys = entries.map((entry) => entry.dedupeKey);

  assert.equal(new Set(dedupeKeys).size, entries.length);
  assert.ok(summary['faction-card'] > 0);
  assert.ok(summary['tutorial-card'] > 0);
  assert.ok(summary['generated-unit'] >= 3);
  assert.ok(entries.some((entry) => entry.sourceType === 'generated-unit' && entry.artAssetId === 'token_grunt_01'));
  assert.ok(entries.every((entry) => entry.dedupeKey === `${entry.factionId}::${entry.artAssetId}`));
});

test('battle transition preview defaults are slow and restrained debug-only values', () => {
  const scene = read('src/scenes/BattleTransitionArtPreviewDebugScene.js');

  assert.match(scene, /const MOTION_ZOOM_TO = 1\.08;/);
  assert.match(scene, /const DRIFT_X = 16;/);
  assert.match(scene, /const DRIFT_Y = -30;/);
  assert.match(scene, /const MOTION_DURATION_MS = 11000;/);
  assert.match(scene, /const VEIL_ALPHA = 0\.34;/);
  assert.match(scene, /const FOG_ALPHA = 0\.12;/);
});

test('battle transition preview scene owns cleanup and does not write production crop fields', () => {
  const scene = read('src/scenes/BattleTransitionArtPreviewDebugScene.js');

  assert.match(scene, /this\.previewRoot = this\.add\.container/);
  assert.match(scene, /this\.previewTweens\.forEach\(\(tween\) => tween\?\.remove\?\.\(\)\)/);
  assert.match(scene, /this\.scale\.on\('resize', this\.onResize\)/);
  assert.match(scene, /this\.scale\.off\('resize', this\.onResize\)/);
  assert.doesNotMatch(scene, /artPositionY01|boardArtPositionY01|cardArtCropOverrides|localStorage|clipboard/);
});
