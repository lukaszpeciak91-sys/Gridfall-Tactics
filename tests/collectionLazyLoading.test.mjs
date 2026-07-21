import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const { AUDIO_KEYS } = await import('../src/audio/audioAssets.js');
const { getCardIllustrationAssetsForFaction, preloadCardIllustrationAsset } = await import('../src/rendering/cardIllustrationAssets.js');

const read = (path) => fs.readFileSync(path, 'utf8');

function createFakeScene({ cached = [] } = {}) {
  const textureKeys = new Set(cached);
  const loadCalls = [];
  return {
    textures: { exists: (key) => textureKeys.has(key) },
    load: { image: (key, path) => loadCalls.push({ key, path }), on: () => {}, off: () => {} },
    loadCalls,
  };
}

test('CollectionScene initial preload avoids global card art and battle audio', () => {
  const source = read('src/scenes/CollectionScene.js');
  const preloadBody = source.match(/  preload\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
  assert.doesNotMatch(preloadBody, /preloadAllCardIllustrations\(/);
  assert.doesNotMatch(preloadBody, /preloadAudioAssets\(this\)/);
  assert.match(preloadBody, /preloadAudioAssetsByKey\(this, \[AUDIO_KEYS\.MENU_MUSIC, AUDIO_KEYS\.UI_CLICK\]\)/);
  assert.doesNotMatch(preloadBody, /BATTLE_AMBIENCE|BATTLE_VICTORY|BATTLE_DEFEAT|BATTLE_START|CARD_DEPLOY|ATTACK_IMPACT|UNIT_DEATH|BASE_BREAK/);
});

test('initial Collection UI starts collapsed and create can draw with zero cached art', () => {
  const source = read('src/scenes/CollectionScene.js');
  const createBody = source.match(/  create\(\) \{[\s\S]*?this\.scheduleTransitionReadyAfterFirstRender\(\);\n  \}/)?.[0] ?? '';
  assert.match(createBody, /this\.expandedFactionKeys = new Set\(\);/);
  assert.match(createBody, /this\.drawCollectionList\(\{ width, height \}\);/);
  assert.doesNotMatch(createBody, /ensureFactionArtLoadedForExpansion|preloadCardIllustration/);
});

test('faction asset planning includes only that faction card art and generated unit art', () => {
  const swarmKeys = getCardIllustrationAssetsForFaction('Swarm', { includeGeneratedUnitArt: true }).map((asset) => asset.key);
  assert.ok(swarmKeys.every((key) => key.startsWith('card.swarm.')));
  assert.ok(swarmKeys.includes('card.swarm.token_grunt_01'));
  assert.ok(swarmKeys.includes('card.swarm.token_flood_01'));
  assert.ok(!swarmKeys.some((key) => key.startsWith('card.aggro.') || key.startsWith('card.control.') || key.startsWith('card.attrition-swarm.')));
});

test('queued faction assets skip cached textures and duplicate requests', () => {
  const aggroAssets = getCardIllustrationAssetsForFaction('Aggro', { includeGeneratedUnitArt: true });
  const cachedKey = aggroAssets[0].key;
  const scene = createFakeScene({ cached: [cachedKey] });
  const firstQueued = aggroAssets.map((asset) => preloadCardIllustrationAsset(scene, asset)).filter(Boolean).length;
  const secondQueued = aggroAssets.map((asset) => preloadCardIllustrationAsset(scene, asset)).filter(Boolean).length;
  assert.equal(firstQueued, aggroAssets.length - 1);
  assert.equal(secondQueued, 0);
  assert.ok(!scene.loadCalls.some((call) => call.key === cachedKey));
});

test('CollectionScene tracks per-faction loading state, guards stale completions, and clears failed loads', () => {
  const source = read('src/scenes/CollectionScene.js');
  assert.match(source, /this\.factionArtLoadState = new Map\(\);/);
  assert.match(source, /state = \{ loading: false, loaded: false, refreshValid: false \}/);
  assert.match(source, /if \(state\.loading\) return false;/);
  assert.match(source, /state\.loading = false;[\s\S]*state\.loaded = this\.getMissingFactionArtAssets\(factionKey\)\.length === 0;/);
  assert.match(source, /if \(!this\.isCollectionSceneActive \|\| !this\.scene\?\.isActive\?\.\(this\.scene\.key\) \|\| !state\.refreshValid/);
  assert.match(source, /this\.load\?\.on\?\.\('loaderror', fail\);/);
});

test('Collection audio preload boundary is menu music plus click only', () => {
  const source = read('src/scenes/CollectionScene.js');
  assert.match(source, new RegExp(`AUDIO_KEYS\\.${Object.keys(AUDIO_KEYS).find((key) => AUDIO_KEYS[key] === AUDIO_KEYS.MENU_MUSIC) ?? 'MENU_MUSIC'}`));
  assert.match(source, /AUDIO_KEYS\.UI_CLICK/);
  assert.doesNotMatch(source.match(/  preload\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '', /AUDIO_KEYS\.BATTLE_AMBIENCE/);
});
