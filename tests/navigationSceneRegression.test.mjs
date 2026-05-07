import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const readScene = (path) => fs.readFileSync(path, 'utf8');

test('faction selection starts BattleScene without stopping itself or clearing global input listeners', () => {
  const source = readScene('src/scenes/FactionSelectScene.js');

  assert.match(source, /button\.on\('pointerup', \(\) => this\.startBattle\(factionKey\)\)/);
  assert.match(source, /this\.scene\.start\('BattleScene', \{ factionKey \}\)/);
  assert.doesNotMatch(source, /this\.scene\.stop\('FactionSelectScene'\)/);
  assert.doesNotMatch(source, /this\.input\.removeAllListeners\(\)/);
});

test('faction selection diagnoses blocked transitions and clears stale battle/menu scenes before starting', () => {
  const source = readScene('src/scenes/FactionSelectScene.js');

  assert.match(source, /getBattleTransitionDiagnostics\(factionKey\)/);
  assert.match(source, /blockedReason: battleScene \? null : 'missing BattleScene'/);
  assert.match(source, /staleInteractiveObjects: this\.getStaleInteractiveObjects\(\)/);
  assert.match(source, /stopStaleBattleScenes\(transitionDiagnostics\)/);
  assert.match(source, /'BattleScene', 'BattleMenuScene'/);
  assert.match(source, /this\.scene\.stop\(sceneKey\)/);
  assert.match(source, /Faction select battle transition threw before BattleScene start/);
  assert.match(source, /Faction select battle transition did not activate BattleScene/);
  assert.match(source, /resetStartBattleGuard\(\)/);
});

test('BattleScene imports every GameState helper used during create', () => {
  const source = readScene('src/scenes/BattleScene.js');

  assert.match(source, /import \{[^}]*\bshuffleDeck\b[^}]*\} from '\.\.\/systems\/GameState\.js';/s);
  assert.match(source, /shuffleDeck\(this\.gameState\.player\.deck\)/);
  assert.match(source, /shuffleDeck\(this\.gameState\.enemy\.deck\)/);
});

test('BattleScene returns to faction select through a cleanup path and retry stays in BattleScene', () => {
  const source = readScene('src/scenes/BattleScene.js');

  assert.match(source, /leftIcon\.on\('pointerup', \(\) => this\.exitBattleToFactionSelect\(\)\)/);
  assert.match(source, /this\.scene\.start\('FactionSelectScene'\)/);
  assert.match(source, /this\.scene\.restart\(\{ factionKey, enemyFactionKey \}\)/);
  assert.match(source, /exitBattleToFactionSelect\(\) \{[\s\S]*this\.scene\.start\('FactionSelectScene'\)/);
  assert.match(source, /retryBattle\(\) \{[\s\S]*this\.scene\.restart\(\{ factionKey, enemyFactionKey \}\)/);
  assert.doesNotMatch(source, /this\.scene\.stop\('BattleScene'\)/);
});

test('BattleScene lifecycle destroys stale interactive objects, overlays, timers, and tweens before each navigation loop', () => {
  const source = readScene('src/scenes/BattleScene.js');
  const expectedFiveLoopCoverage = [
    'launch → faction select → battle',
    'battle back → faction select → battle',
    'battle result exit → faction select → battle',
    'retry → exit → faction select → battle',
    'repeat navigation loop 5x',
  ];

  assert.match(source, /init\(\) \{\s*this\.cleanupSceneObjects\(\);\s*this\.resetRuntimeState\(\);\s*\}/);
  assert.match(source, /create\(data\) \{\s*this\.cleanupSceneObjects\(\);/);
  assert.match(source, /shutdown\(\) \{\s*this\.cleanupSceneObjects\(\);/);
  assert.match(source, /cleanupSceneObjects\(\) \{[\s\S]*this\.destroyBattleResultModal\(\);[\s\S]*this\.tweens\?\.killAll\?\.\(\);[\s\S]*this\.time\?\.removeAllEvents\?\.\(\);[\s\S]*this\.children\.removeAll\(true\);[\s\S]*\}/);
  assert.match(source, /destroyBattleResultModal\(\) \{[\s\S]*overlay[\s\S]*buttons[\s\S]*item\?\.removeAllListeners\?\.\(\);[\s\S]*item\?\.destroy\?\.\(\);[\s\S]*\}/);
  assert.equal(expectedFiveLoopCoverage.length, 5);
});


test('BattleScene routes every winner branch through delayed result modal completion', () => {
  const source = readScene('src/scenes/BattleScene.js');

  assert.match(source, /completeBattleFlow\(delayMs = 500\) \{[\s\S]*this\.updateInitiativeIndicator\(\);[\s\S]*this\.scheduleBattleResultModal\(delayMs\);[\s\S]*\}/);
  assert.match(source, /scheduleBattleResultModal\(delayMs = 500\) \{[\s\S]*this\.battleResultModalPending = true;[\s\S]*this\.time\.delayedCall\(delayMs, \(\) => this\.showBattleResultModal\(\)\);[\s\S]*\}/);
  assert.match(source, /resolveNoProgressStallWinner\(this\.gameState\);\s*if \(this\.gameState\.winner\) \{\s*this\.completeBattleFlow\(500\);\s*return;\s*\}/);
  assert.match(source, /resolveTurnCapWinner\(this\.gameState, this\.gameState\.turnsCompleted\);[\s\S]*if \(this\.gameState\.winner\) \{\s*this\.completeBattleFlow\(500\);\s*return;\s*\}/);
});

test('BattleScene still opens the result modal when a player action sets winner', () => {
  const source = readScene('src/scenes/BattleScene.js');
  const completePlayerActionStart = source.indexOf('async completePlayerAction');
  const finishTurnStart = source.indexOf('async finishTurnAfterBothActions');
  const completePlayerActionSource = source.slice(completePlayerActionStart, finishTurnStart);

  assert.doesNotMatch(completePlayerActionSource, /this\.gameState\.winner \|\| this\.isFlowResolving/);
  assert.match(completePlayerActionSource, /await this\.playBuffFeedback\(beforeStats, 'player'\);\s*if \(this\.gameState\.winner\) \{\s*this\.completeBattleFlow\(500\);\s*return;\s*\}/);
});
