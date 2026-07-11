import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

test('battle entry router exposes direct BattleScene entry and restart helpers', () => {
  const source = read('src/scenes/battleEntryRouter.js');
  assert.match(source, /export const BATTLE_SCENE_KEY = 'BattleScene';/);
  assert.match(source, /export function enterBattleScene\(scene, payload = \{\}\) \{[\s\S]*scene\?\.scene\?\.start\?\.\(BATTLE_SCENE_KEY, normalizeBattlePayload\(payload\)\)/);
  assert.match(source, /export function restartBattleScene\(scene, payload = \{\}\) \{[\s\S]*scene\?\.scene\?\.restart\?\.\(normalizeBattlePayload\(payload\)\)/);
  assert.match(source, /factionKey/);
  assert.match(source, /enemyFactionKey/);
  assert.match(source, /battleContext/);
});

test('BattleScene visually-ready event is named, reset per runtime state, and emitted once after startup setup', () => {
  const source = read('src/scenes/BattleScene.js');
  assert.match(source, /import \{ BATTLE_SCENE_VISUALLY_READY_EVENT, restartBattleScene \} from '\.\/battleEntryRouter\.js';/);
  assert.match(source, /this\.battleVisuallyReadyEmitted = false;/);
  assert.match(source, /emitBattleVisuallyReady\(\) \{\s*if \(this\.battleVisuallyReadyEmitted\) return false;\s*this\.battleVisuallyReadyEmitted = true;[\s\S]*this\.events\.emit\(BATTLE_SCENE_VISUALLY_READY_EVENT/);
  assert.match(source, /this\.input\.on\('pointerup', this\.onScenePointerUp, this\);[\s\S]*this\.events\.once\(Phaser\.Scenes\.Events\.SHUTDOWN, this\.shutdown, this\);[\s\S]*this\.startCampaignBattleTimer\(\);\s*this\.emitBattleVisuallyReady\(\);\s*this\.time\.delayedCall\(560, \(\) => this\.startBattleAmbience\(\)\);/);
});
