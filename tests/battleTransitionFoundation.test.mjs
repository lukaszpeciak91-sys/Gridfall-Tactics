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
  assert.match(source, /this\.input\.on\('pointerup', this\.onScenePointerUp, this\);[\s\S]*this\.events\.once\(Phaser\.Scenes\.Events\.SHUTDOWN, this\.shutdown, this\);[\s\S]*this\.emitBattleVisuallyReady\(\);\s*this\.time\.delayedCall\(560, \(\) => this\.startBattleAmbience\(\)\);/);
});


test('BattleTransitionScene exits with a cinematic crossfade instead of CRT band choreography', () => {
  const source = read('src/scenes/BattleTransitionScene.js');
  assert.match(source, /const READY_SETTLE_MS = 100;/);
  assert.match(source, /const EXIT_DIM_MS = 150;/);
  assert.match(source, /const EXIT_CROSSFADE_MS = 560;/);
  assert.match(source, /dimIllustrationForCrossfade\(\)/);
  assert.match(source, /crossfadeToBattleScene\(\)/);
  assert.match(source, /targets: this\.root,[\s\S]*alpha: 0,[\s\S]*duration: EXIT_CROSSFADE_MS,[\s\S]*ease: 'Sine\.easeInOut'/);
  assert.match(source, /this\.tweens\.add\(\{ targets: image,[^}]*duration: MOTION_DURATION_MS,[^}]*ease: 'Sine\.easeInOut' \}\);/);
  assert.doesNotMatch(source, /signalBand|scanline|arenaCurtains|TransmissionBand|BroadcastExit|ArenaAcquisition|SignalLoss|EXIT_COLLAPSE|EXIT_ACQUIRE|EXIT_BAND|EXIT_SCANLINE|scaleY|yoyo: true|repeat: -1/);
});
