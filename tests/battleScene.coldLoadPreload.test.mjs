import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getCardIllustrationAssetsForFaction } from '../src/rendering/cardIllustrationAssets.js';
import { AUDIO_KEYS } from '../src/audio/audioAssets.js';
import { getArenaBattlegroundAsset } from '../src/data/arenaBattlegrounds.js';
import { getFactionByKey, getFactionKeys } from '../src/data/factions/index.js';

const battleSceneSource = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

function getUniqueBattleAssets(playerFaction, enemyFaction) {
  const byKey = new Map();
  [playerFaction, enemyFaction].forEach((faction) => {
    getCardIllustrationAssetsForFaction(faction, { includeGeneratedUnitArt: true })
      .forEach((asset) => byKey.set(asset.key, asset));
  });
  return [...byKey.values()];
}

function uniqueFactionIdsFromAssetKeys(assets) {
  return [...new Set(assets.map((asset) => asset.key.split('.')[1]).filter(Boolean))].sort();
}

test('BattleScene cold preload no longer preloads every faction illustration', () => {
  assert.doesNotMatch(battleSceneSource, /preloadAllCardIllustrations\(this\)/);
  assert.match(battleSceneSource, /preloadCurrentBattleCardIllustrations\(\)/);
  assert.match(battleSceneSource, /getUniqueCardIllustrationAssetsForBattleFactions\(playerFaction, enemyFaction\)/);
});

test('only player and enemy faction illustrations and generated art are selected', () => {
  const playerFactionKey = 'Aggro';
  const enemyFactionKey = 'Tank';
  const excludedFactionKey = getFactionKeys().find((key) => ![playerFactionKey, enemyFactionKey].includes(key));
  const assets = getUniqueBattleAssets(playerFactionKey, enemyFactionKey);

  assert.deepEqual(uniqueFactionIdsFromAssetKeys(assets), [
    getFactionByKey(playerFactionKey).id,
    getFactionByKey(enemyFactionKey).id,
  ].sort());
  assert.ok(assets.length > 0);
  assert.equal(assets.some((asset) => asset.key.includes(`.${getFactionByKey(excludedFactionKey).id}.`)), false);

  const allFactionAssets = getFactionKeys().flatMap((factionKey) => getUniqueBattleAssets(factionKey, null));
  assert.ok(assets.length < allFactionAssets.length);
});

test('duplicate faction overlap loads only once', () => {
  const aggroAssets = getUniqueBattleAssets('Aggro', 'Aggro');
  assert.equal(aggroAssets.length, new Set(aggroAssets.map((asset) => asset.key)).size);
});

test('BattleScene queues active battleground only', () => {
  assert.match(battleSceneSource, /preloadBattleBackgroundArt\(this, \[this\.resolveBattleBackgroundAsset\(\)\]\)/);
  assert.doesNotMatch(battleSceneSource, /preloadBattleBackgroundArt\(this, getArenaBattlegrounds\(\)\)/);
  assert.equal(getArenaBattlegroundAsset('b03').key, 'background.arena.b03');
  assert.notEqual(getArenaBattlegroundAsset('b03').key, getArenaBattlegroundAsset('b04').key);
});

test('BattleScene audio preload excludes menu music and skips cached audio through shared helper', () => {
  assert.match(battleSceneSource, /preloadAudioAssetsByKey\(this, BATTLE_SCENE_PRELOAD_AUDIO_KEYS\)/);
  assert.match(battleSceneSource, /export const BATTLE_SCENE_PRELOAD_AUDIO_KEYS = Object\.freeze\(\[/);
  assert.doesNotMatch(battleSceneSource, /AUDIO_KEYS\.MENU_MUSIC/);

  const audioAssetsSource = readFileSync(new URL('../src/audio/audioAssets.js', import.meta.url), 'utf8');
  assert.match(audioAssetsSource, /hasCachedAudioAsset\(scene, asset\.key\)/);
  assert.equal(AUDIO_KEYS.MENU_MUSIC, 'music.menu');
});

test('BattleScene card preloader uses existing cache-aware asset helper', () => {
  assert.match(battleSceneSource, /preloadCardIllustrationAsset\(this, asset\)/);
  const cardAssetsSource = readFileSync(new URL('../src/rendering/cardIllustrationAssets.js', import.meta.url), 'utf8');
  assert.match(cardAssetsSource, /scene\.textures\?\.exists\?\.\(asset\.key\)/);
  assert.match(cardAssetsSource, /queuedTextureKeys\.has\(asset\.key\)/);
});

test('Arena preload uses explicit enemy key and does not reroll when payload is complete', () => {
  assert.match(battleSceneSource, /playerFactionKey: typeof context\?\.playerFactionKey === 'string'/);
  assert.match(battleSceneSource, /enemyFactionKey: typeof context\?\.enemyFactionKey === 'string'/);
  const preloadContext = battleSceneSource.slice(battleSceneSource.indexOf('  preparePreloadContext(data = {})'), battleSceneSource.indexOf('  preloadCurrentBattleCardIllustrations()'));
  assert.match(preloadContext, /const arenaEnemyFactionKey = this\.battleContext\?\.mode === 'arena'[\s\S]*this\.battleContext\.enemyFactionKey/);
  assert.match(preloadContext, /requestedEnemyFactionKey \?\? arenaEnemyFactionKey \?\? this\.selectEnemyFactionKey\(this\.factionKey\)/);
});

test('Arena-only current enemy card-art readiness repairs exact missing selected enemy textures', () => {
  assert.match(battleSceneSource, /getArenaEnemyCardIllustrationAssets\(\) \{[\s\S]*this\.battleContext\?\.mode !== 'arena'[\s\S]*getCardIllustrationAssetsForFaction\(this\.enemyFactionKey, \{ includeGeneratedUnitArt: true \}\)/);
  assert.match(battleSceneSource, /getMissingArenaEnemyCardIllustrationAssets\(\)[\s\S]*!this\.textures\?\.exists\?\.\(asset\.key\)[\s\S]*!this\.arenaCardArtLoadFailures\?\.has\?\.\(asset\.key\)/);
  assert.match(battleSceneSource, /ensureArenaCardArtReadyBeforeVisualReady\(onReady\)[\s\S]*this\.battleContext\?\.mode !== 'arena'[\s\S]*onReady\?\.\(\)/);
  assert.match(battleSceneSource, /missingAssets\.forEach\(\(asset\) => \{[\s\S]*preloadImageAsset\(this, asset/);
  assert.doesNotMatch(battleSceneSource, /preloadAllCardIllustrations\(this\)/);
});

test('Arena visual-ready waits for Arena repair while failed assets do not hang', () => {
  const createSource = battleSceneSource.slice(battleSceneSource.indexOf('  create(data) {'), battleSceneSource.indexOf('    if (this.isCampaignCompletionPreview())'));
  assert.match(createSource, /this\.ensureArenaCardArtReadyBeforeVisualReady\(\(\) => \{[\s\S]*this\.emitBattleVisuallyReady\(\);[\s\S]*this\.scheduleOpeningRevealTransitionHandoffGuard\(\);/);
  assert.match(battleSceneSource, /recordArenaCardArtLoadFailure\(asset\)[\s\S]*this\.arenaCardArtLoadFailures\.add\(asset\.key\)/);
  assert.match(battleSceneSource, /this\.load\.once\?\.\('complete', finish\)/);
});

test('card.aggro.aggro_01 is part of the repairable normal enemy deck asset set', () => {
  const aggroAssets = getCardIllustrationAssetsForFaction('Aggro', { includeGeneratedUnitArt: true });
  assert.ok(aggroAssets.some((asset) => asset.key === 'card.aggro.aggro_01'));
});
