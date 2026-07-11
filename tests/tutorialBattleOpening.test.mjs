import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getFactionByKey, getFactionKeys } from '../src/data/factions/index.js';
import { getTutorialBattleData } from '../src/data/tutorial/tutorialDecks.js';
import { createInitialBattleState, performOpeningMulligan, STARTING_HAND_SIZE, shuffleDeck } from '../src/systems/GameState.js';
import { applyTutorialOpeningSetup, performTutorialOpeningMulligan } from '../src/systems/tutorialOpening.js';

function createTutorialSceneHarness() {
  const { playerFaction, enemyFaction, openingConfig } = getTutorialBattleData();
  const scene = {
    battleContext: { mode: 'tutorial' },
    gameState: createInitialBattleState(playerFaction, enemyFaction, {
      playerHP: openingConfig.playerStartingHp,
      playerMaxHP: openingConfig.playerStartingHp,
      enemyHP: openingConfig.enemyStartingHp,
      enemyMaxHP: openingConfig.enemyStartingHp,
      firstActor: 'player',
    }),
  };
  applyTutorialOpeningSetup(scene.gameState, openingConfig);
  scene.applyEnemyOpeningMulligan = () => undefined;
  return scene;
}

test('tutorial battle opening uses tutorial-only data, HP, deterministic hands, and no enemy mulligan disruption', () => {
  const { openingConfig } = getTutorialBattleData();
  const scene = createTutorialSceneHarness();
  const beforeEnemyHand = scene.gameState.enemy.hand.map((card) => card.id);
  const beforeEnemyDeck = scene.gameState.enemy.deck.map((card) => card.id);

  scene.applyEnemyOpeningMulligan();

  assert.equal(scene.gameState.player.factionId, 'tutorial');
  assert.equal(scene.gameState.enemy.factionId, 'tutorial-enemy');
  assert.equal(scene.gameState.playerHP, 7);
  assert.equal(scene.gameState.enemyHP, 7);
  assert.deepEqual(scene.gameState.player.hand.map((card) => card.id), openingConfig.playerStartingHandCardIds);
  assert.equal(scene.gameState.player.hand.length, STARTING_HAND_SIZE);
  assert.equal(scene.gameState.player.hand.some((card) => card.id === 'tutorial_mulligan_bait_1'), true);
  assert.deepEqual(scene.gameState.player.deck.map((card) => card.id).slice(0, 3), [
    'tutorial_unit_b_1',
    'tutorial_unit_c_1',
    'tutorial_all_attack_1',
  ]);
  assert.deepEqual(scene.gameState.enemy.hand.map((card) => card.id), beforeEnemyHand);
  assert.deepEqual(scene.gameState.enemy.deck.map((card) => card.id), beforeEnemyDeck);
  assert.equal(scene.gameState.mulligan.enemyUsed, false);
});

test('tutorial mulligan deterministically replaces bait with configured card and clears state prerequisites', () => {
  const scene = createTutorialSceneHarness();
  const result = performTutorialOpeningMulligan(scene.gameState, ['tutorial_mulligan_bait_1'], getTutorialBattleData().openingConfig);

  assert.equal(result.ok, true);
  assert.equal(result.replaced, 1);
  assert.equal(scene.gameState.player.hand.length, STARTING_HAND_SIZE);
  assert.equal(scene.gameState.player.hand.some((card) => card.id === 'tutorial_unit_b_1'), true);
  assert.equal(scene.gameState.player.hand.some((card) => card.id === 'tutorial_mulligan_bait_1'), false);
  assert.equal(scene.gameState.mulligan.playerUsed, true);
  assert.equal(scene.gameState.mulligan.playerReplaced, 1);
  scene.openingMulliganPending = false;
  assert.equal(scene.gameState.turnsCompleted, 0);
  assert.equal(scene.gameState.winner, null);
});

test('normal opening shuffle and mulligan helpers remain random-function driven outside tutorial', () => {
  const deck = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
  shuffleDeck(deck, () => 0);
  assert.deepEqual(deck.map((card) => card.id), ['b', 'c', 'd', 'a']);

  const normalDeck = [
    { id: 'a', type: 'unit' }, { id: 'b', type: 'unit' }, { id: 'c', type: 'unit' },
    { id: 'd', type: 'unit' }, { id: 'e', type: 'unit' }, { id: 'f', type: 'unit' },
  ];
  const state = createInitialBattleState({ id: 'normal', name: 'Normal', deck: normalDeck }, undefined, { firstActor: 'player' });
  state.player.hand = state.player.deck.splice(0, 4);
  const result = performOpeningMulligan(state, 'player', ['a'], () => 0);
  assert.equal(result.ok, true);
  assert.equal(state.mulligan.playerUsed, true);
  assert.equal(state.player.hand.length, STARTING_HAND_SIZE);
});

test('tutorial data stays outside normal faction registry and GameMenu tutorial launches playable BattleScene', () => {
  assert.equal(getFactionKeys().includes('tutorial'), false);
  assert.equal(getFactionByKey('tutorial'), null);
  const source = readFileSync(new URL('../src/scenes/GameMenuScene.js', import.meta.url), 'utf8');
  assert.match(source, /enterBattleScene\(this, \{[\s\S]*battleContext:[\s\S]*mode:\s*'tutorial'[\s\S]*tutorialId:\s*'tutorial_v1'[\s\S]*returnSceneKey:\s*'GameMenuScene'/);
  assert.doesNotMatch(source, /this\.scene\.start\('TutorialScene'/);
});
