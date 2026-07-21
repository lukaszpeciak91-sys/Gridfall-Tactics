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
