import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getTutorialBattleData, getTutorialEnemyActionScript } from '../src/data/tutorial/tutorialDecks.js';
import { createInitialBattleState, playOrRedeployUnit, recordPassAction } from '../src/systems/GameState.js';
import { applyTutorialOpeningSetup } from '../src/systems/tutorialOpening.js';
import { selectNextTutorialEnemyAction } from '../src/systems/tutorialEnemyActions.js';

function createTutorialState() {
  const { playerFaction, enemyFaction, openingConfig } = getTutorialBattleData();
  const state = createInitialBattleState(playerFaction, enemyFaction, {
    playerHP: openingConfig.playerStartingHp,
    playerMaxHP: openingConfig.playerStartingHp,
    enemyHP: openingConfig.enemyStartingHp,
    enemyMaxHP: openingConfig.enemyStartingHp,
    firstActor: 'player',
  });
  applyTutorialOpeningSetup(state, openingConfig);
  return state;
}

const battleSceneSource = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

test('tutorial enemy script contains deterministic Tutorial V1 foundation actions with tutorial-only card ids', () => {
  const script = getTutorialEnemyActionScript();
  assert.deepEqual(script, [
    { type: 'play-unit', cardId: 'tutorial_enemy_blocker_a_1', slotIndex: 0 },
    { type: 'pass' },
    { type: 'play-unit', cardId: 'tutorial_enemy_blocker_b_1', slotIndex: 1 },
    { type: 'play-unit', cardId: 'tutorial_enemy_blocker_c_1', slotIndex: 2 },
    { type: 'play-unit', cardId: 'tutorial_enemy_blocker_d_1', slotIndex: 0 },
    { type: 'pass' },
  ]);
});

test('tutorial enemy action selection advances cursor and resolves play-unit through existing play path', () => {
  const state = createTutorialState();
  const selected = selectNextTutorialEnemyAction(state, 0);

  assert.deepEqual(selected, {
    action: { type: 'play-unit', cardId: 'tutorial_enemy_blocker_a_1', slotIndex: 0 },
    nextCursor: 1,
    fallbackReason: null,
  });

  const result = playOrRedeployUnit(state, 'enemy', selected.action.cardId, selected.action.slotIndex);
  assert.equal(result.ok, true);
  assert.equal(state.board[0].id, 'tutorial_enemy_blocker_a_1');
  assert.equal(state.enemy.hand.some((card) => card.id === 'tutorial_enemy_blocker_a_1'), false);
});

test('tutorial enemy action selection resolves scripted pass and advances cursor', () => {
  const state = createTutorialState();
  const selected = selectNextTutorialEnemyAction(state, 1);

  assert.deepEqual(selected, {
    action: { type: 'pass' },
    nextCursor: 2,
    fallbackReason: null,
  });

  state.battleExhausted.pendingPassOwner = 'player';
  recordPassAction(state, 'enemy');
  assert.equal(state.enemyLanePlayBlockedThisTurn.every((blocked) => blocked === false), true);
  assert.equal(state.battleExhausted.pendingPassOwner, null);
});

test('tutorial enemy action selection uses safe PASS fallback when script is exhausted', () => {
  const state = createTutorialState();
  const selected = selectNextTutorialEnemyAction(state, getTutorialEnemyActionScript().length);

  assert.deepEqual(selected, {
    action: { type: 'pass', tutorialFallbackReason: 'script_exhausted' },
    nextCursor: getTutorialEnemyActionScript().length,
    fallbackReason: 'script_exhausted',
  });
});

test('invalid tutorial scripted play-unit fails safely with PASS fallback', () => {
  const state = createTutorialState();
  state.enemy.hand = state.enemy.hand.filter((card) => card.id !== 'tutorial_enemy_blocker_a_1');

  const selected = selectNextTutorialEnemyAction(state, 0);

  assert.equal(selected.action.type, 'pass');
  assert.equal(selected.action.tutorialFallbackReason, 'invalid_play_unit:tutorial_enemy_blocker_a_1:0');
  assert.equal(selected.nextCursor, 1);
  assert.equal(selected.fallbackReason, 'invalid_play_unit:tutorial_enemy_blocker_a_1:0');
});

test('BattleScene selects tutorial enemy script without normal AI and preserves normal modes', () => {
  const selectBlock = battleSceneSource.slice(
    battleSceneSource.indexOf('  selectEnemyAction() {'),
    battleSceneSource.indexOf('  buildEnemyMovementFeedback('),
  );
  const revealBlock = battleSceneSource.slice(
    battleSceneSource.indexOf('  async revealAndApplyEnemyAction() {'),
    battleSceneSource.indexOf('  getNextTutorialEnemyAction() {'),
  );

  assert.match(selectBlock, /if \(this\.isTutorialBattle\(\)\) return this\.getNextTutorialEnemyAction\(\);/);
  assert.match(selectBlock, /return chooseEnemyAction\(this\.gameState\);/);
  assert.doesNotMatch(revealBlock, /chooseEnemyAction\(this\.gameState\)/);
  assert.match(revealBlock, /const result = this\.enemyTakeAction\(action\);/);
});

test('Arena, Campaign, Balance Lab, and GameMenu tutorial launch remain separate from tutorial battle script', () => {
  const factionSource = readFileSync(new URL('../src/data/factions/index.js', import.meta.url), 'utf8');
  const gameMenuSource = readFileSync(new URL('../src/scenes/GameMenuScene.js', import.meta.url), 'utf8');
  assert.doesNotMatch(factionSource, /tutorialEnemyActionScript|tutorial-enemy|tutorial_enemy_blocker/);
  assert.match(gameMenuSource, /enterBattleScene\(this, \{[\s\S]*battleContext:[\s\S]*mode:\s*'tutorial'[\s\S]*tutorialId:\s*'tutorial_v1'[\s\S]*returnSceneKey:\s*'GameMenuScene'/);
  assert.doesNotMatch(gameMenuSource, /this\.scene\.start\('TutorialScene'/);
});
