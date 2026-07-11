import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildDebugIllustrationEntries, buildDebugIllustrationPool, summarizeDebugIllustrationEntries } from '../src/scenes/debugIllustrationPool.js';

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
  assert.equal(summary.total, 72);
  assert.equal(summary.normalFactionCount, 60);
  assert.equal(summary.tutorialCount, 9);
  assert.equal(summary.generatedTokenCount, 3);
  assert.equal(summary.skippedDuplicates, 0);
  assert.ok(entries.some((entry) => entry.sourceType === 'tutorial-card' && entry.factionId === 'tutorial' && entry.artAssetId === 'ally_01'));
  assert.ok(entries.some((entry) => entry.sourceType === 'tutorial-card' && entry.factionId === 'tutorial' && entry.artAssetId === 'enemy_01'));
  assert.ok(entries.some((entry) => entry.sourceType === 'generated-unit' && entry.artAssetId === 'token_grunt_01'));
  assert.ok(entries.every((entry) => entry.dedupeKey === `${entry.factionId}::${entry.artAssetId}`));
});

test('debug illustration pool reports source counts and skipped duplicate candidates', () => {
  const { entries, summary } = buildDebugIllustrationPool();

  assert.equal(entries.length, 72);
  assert.equal(summary.total, 72);
  assert.equal(summary.normalFactionCount, 60);
  assert.equal(summary.tutorialCount, 9);
  assert.equal(summary.generatedTokenCount, 3);
  assert.equal(summary.skippedDuplicates, 7);
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
  assert.doesNotMatch(scene, /artPositionY01|boardArtPositionY01|cardArtCropOverrides/);
});


test('battle transition preview debug saved selections use resolved asset identity and debug-only export', () => {
  const scene = read('src/scenes/BattleTransitionArtPreviewDebugScene.js');

  assert.match(scene, /SAVED_SELECTIONS_STORAGE_KEY = 'gridfall:battle-transition-art-preview-debug:saved-selections'/);
  assert.ok(scene.includes('getEntryStorageKey(entry)'));
  assert.ok(scene.includes('return entry ? `${entry.factionId}::${entry.artAssetId}` :'));
  assert.match(scene, /tool: 'battle-transition-art-selection'/);
  assert.match(scene, /version: 1/);
  assert.match(scene, /navigator\.clipboard/);
  assert.match(scene, /localStorage/);
  assert.doesNotMatch(scene, /hand.*crop|board.*crop/i);
});

test('battle transition preview debug exposes saved filter and immediate save controls', () => {
  const scene = read('src/scenes/BattleTransitionArtPreviewDebugScene.js');

  assert.match(scene, /const FILTER_ALL = 'ALL';/);
  assert.match(scene, /const FILTER_SAVED = 'SAVED';/);
  assert.match(scene, /toggleSavedSelection/);
  assert.match(scene, /toggleFilter/);
  assert.match(scene, /this\.activeFilter === FILTER_SAVED/);
  assert.match(scene, /No saved illustrations yet/);
  assert.match(scene, /preloadCardIllustrationAsset/);
  assert.match(scene, /buildDebugIllustrationPool/);
  assert.match(scene, /this\.saveButton\?\.text\?\.setText\(isSaved \? 'UNSAVE' : 'SAVE'\)/);
});
