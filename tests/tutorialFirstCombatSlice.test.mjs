import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getTutorialBattleData } from '../src/data/tutorial/tutorialDecks.js';
import { createInitialBattleState, performSwap, playOrRedeployUnit, resolveCombat } from '../src/systems/GameState.js';
import { applyTutorialOpeningSetup, performTutorialOpeningMulligan } from '../src/systems/tutorialOpening.js';
import { checkTutorialInputGate } from '../src/systems/tutorialInputGate.js';
import { createTutorialControllerState, handleTutorialEvent, getCurrentTutorialStep } from '../src/systems/tutorialController.js';
import { selectNextTutorialEnemyAction } from '../src/systems/tutorialEnemyActions.js';

function applyGatedPlayerUnitPlay(state, controller, cardId, slotIndex) {
  const gate = checkTutorialInputGate(controller, { type: 'play_card_to_slot', cardId, slotIndex });
  if (!gate.allowed) return { ok: false, reason: gate.reason, gated: true };
  return playOrRedeployUnit(state, 'player', cardId, slotIndex);
}

function createTutorialHarness() {
  const { playerFaction, enemyFaction, openingConfig } = getTutorialBattleData();
  const state = createInitialBattleState(playerFaction, enemyFaction, {
    playerHP: openingConfig.playerStartingHp,
    playerMaxHP: openingConfig.playerStartingHp,
    enemyHP: openingConfig.enemyStartingHp,
    enemyMaxHP: openingConfig.enemyStartingHp,
    firstActor: 'player',
  });
  applyTutorialOpeningSetup(state, openingConfig);
  const controller = createTutorialControllerState();
  for (const eventName of ['tap_continue', 'tap_continue', 'deck_opened', 'deck_closed', 'battle_menu_opened', 'battle_menu_closed', 'tap_continue']) {
    handleTutorialEvent(controller, eventName);
  }
  handleTutorialEvent(controller, 'mulligan_card_selected', { cardId: openingConfig.requiredPlayerMulliganCardId });
  performTutorialOpeningMulligan(state, [openingConfig.requiredPlayerMulliganCardId], openingConfig);
  handleTutorialEvent(controller, 'mulligan_confirmed', { target: 'player_base_button' });
  return { state, controller };
}

test('tutorial first combat slice starts player-first and blocks enemy before Unit A', () => {
  const { state, controller } = createTutorialHarness();

  assert.equal(state.firstActor, 'player');
  assert.equal(getCurrentTutorialStep(controller).id, 'play_unit_a');
  assert.equal(state.board[0], null);
  assert.equal(state.board[6], null);
  assert.equal(checkTutorialInputGate(controller, { type: 'wait_enemy_action' }).allowed, false);
});

test('tutorial Unit A gate blocks wrong card and slot, then real unit play advances step', () => {
  const { state, controller } = createTutorialHarness();

  assert.equal(applyGatedPlayerUnitPlay(state, controller, 'tutorial_unit_b_1', 6).ok, false);
  assert.equal(state.board[6], null);
  assert.equal(state.player.hand.some((card) => card.id === 'tutorial_unit_b_1'), true);

  const retry = createTutorialHarness();
  assert.equal(applyGatedPlayerUnitPlay(retry.state, retry.controller, 'tutorial_unit_a_1', 7).ok, false);
  assert.equal(retry.state.board[7], null);
  assert.equal(retry.state.player.hand.some((card) => card.id === 'tutorial_unit_a_1'), true);

  const correct = createTutorialHarness();
  assert.equal(checkTutorialInputGate(correct.controller, { type: 'play_card_to_slot', cardId: 'tutorial_unit_a_1', slotIndex: 6 }).allowed, true);
  const result = applyGatedPlayerUnitPlay(correct.state, correct.controller, 'tutorial_unit_a_1', 6);
  assert.equal(result.ok, true);
  assert.equal(result.type, 'play');
  assert.equal(correct.state.board[6].id, 'tutorial_unit_a_1');
  assert.equal(correct.state.player.hand.some((card) => card.id === 'tutorial_unit_a_1'), false);
  handleTutorialEvent(correct.controller, 'unit_played', { cardId: 'tutorial_unit_a_1', slotIndex: 6 });
  assert.equal(getCurrentTutorialStep(correct.controller).id, 'enemy_action');
});

test('tutorial enemy response uses scripted Blocker A, then normal combat advances safely', () => {
  const { state, controller } = createTutorialHarness();
  playOrRedeployUnit(state, 'player', 'tutorial_unit_a_1', 6);
  handleTutorialEvent(controller, 'unit_played', { cardId: 'tutorial_unit_a_1', slotIndex: 6 });

  const selected = selectNextTutorialEnemyAction(state, 0);
  assert.deepEqual(selected.action, { type: 'play-unit', cardId: 'tutorial_enemy_blocker_a_1', slotIndex: 0 });
  const enemyResult = playOrRedeployUnit(state, 'enemy', selected.action.cardId, selected.action.slotIndex);
  assert.equal(enemyResult.ok, true);
  assert.equal(selected.nextCursor, 1);
  assert.equal(state.board[0].id, 'tutorial_enemy_blocker_a_1');
  handleTutorialEvent(controller, 'enemy_action_completed', { actionType: 'play-unit', cardId: selected.action.cardId, slotIndex: selected.action.slotIndex });
  assert.equal(getCurrentTutorialStep(controller).id, 'combat_after_actions');

  const combatEvents = resolveCombat(state);
  handleTutorialEvent(controller, 'combat_completed', { combatEvents });
  assert.equal(combatEvents.some((event) => event.attackerIndex === 6 && event.targetIndex === 0), true);
  assert.equal(state.board[6].hp, 3);
  assert.equal(state.board[0].hp, 1);
  assert.equal(state.winner, null);
  assert.equal(getCurrentTutorialStep(controller).id, 'play_unit_b');
  assert.equal(checkTutorialInputGate(controller, { type: 'swap_adjacent_units', fromIndex: 6, toIndex: 7 }).allowed, false);
});

test('tutorial Unit B is required before adjacent swap can be reached', () => {
  const { state, controller } = createTutorialHarness();
  playOrRedeployUnit(state, 'player', 'tutorial_unit_a_1', 6);
  handleTutorialEvent(controller, 'unit_played', { cardId: 'tutorial_unit_a_1', slotIndex: 6 });
  const selected = selectNextTutorialEnemyAction(state, 0);
  playOrRedeployUnit(state, 'enemy', selected.action.cardId, selected.action.slotIndex);
  handleTutorialEvent(controller, 'enemy_action_completed', { actionType: 'play-unit', cardId: selected.action.cardId, slotIndex: selected.action.slotIndex });
  resolveCombat(state);
  handleTutorialEvent(controller, 'combat_completed', {});

  assert.equal(getCurrentTutorialStep(controller).id, 'play_unit_b');
  assert.equal(applyGatedPlayerUnitPlay(state, controller, 'tutorial_unit_a_1', 7).ok, false);
  assert.equal(applyGatedPlayerUnitPlay(state, controller, 'tutorial_unit_b_1', 8).ok, false);
  assert.equal(state.board[7], null);
  const result = applyGatedPlayerUnitPlay(state, controller, 'tutorial_unit_b_1', 7);
  assert.equal(result.ok, true);
  assert.equal(state.board[7].id, 'tutorial_unit_b_1');
  handleTutorialEvent(controller, 'unit_played', { cardId: 'tutorial_unit_b_1', slotIndex: 7 });
  assert.equal(getCurrentTutorialStep(controller).id, 'adjacent_swap');
  assert.equal(checkTutorialInputGate(controller, { type: 'swap_adjacent_units', fromIndex: 6, toIndex: 7 }).allowed, true);
});

test('tutorial Unit B survives scripted enemy pass and combat before adjacent swap', () => {
  const { state, controller } = createTutorialHarness();
  playOrRedeployUnit(state, 'player', 'tutorial_unit_a_1', 6);
  handleTutorialEvent(controller, 'unit_played', { cardId: 'tutorial_unit_a_1', slotIndex: 6 });
  const blockerA = selectNextTutorialEnemyAction(state, 0);
  playOrRedeployUnit(state, 'enemy', blockerA.action.cardId, blockerA.action.slotIndex);
  handleTutorialEvent(controller, 'enemy_action_completed', { actionType: 'play-unit', cardId: blockerA.action.cardId, slotIndex: blockerA.action.slotIndex });
  resolveCombat(state);
  handleTutorialEvent(controller, 'combat_completed', {});

  assert.equal(playOrRedeployUnit(state, 'player', 'tutorial_unit_b_1', 7).ok, true);
  handleTutorialEvent(controller, 'unit_played', { cardId: 'tutorial_unit_b_1', slotIndex: 7 });
  assert.equal(getCurrentTutorialStep(controller).id, 'adjacent_swap');
  const scriptedPass = selectNextTutorialEnemyAction(state, blockerA.nextCursor);
  assert.deepEqual(scriptedPass.action, { type: 'pass' });
  handleTutorialEvent(controller, 'enemy_action_completed', { actionType: 'pass' });
  const combatEvents = resolveCombat(state);
  handleTutorialEvent(controller, 'combat_completed', { combatEvents });

  assert.equal(state.board[6].owner, 'player');
  assert.equal(state.board[6].id, 'tutorial_unit_a_1');
  assert.equal(state.board[7].owner, 'player');
  assert.equal(state.board[7].id, 'tutorial_unit_b_1');
  assert.equal(state.winner, null);
  assert.equal(getCurrentTutorialStep(controller).id, 'adjacent_swap');
});

test('tutorial adjacent swap gates wrong pairs and real swap advances to redeploy', () => {
  const { state, controller } = createTutorialHarness();
  playOrRedeployUnit(state, 'player', 'tutorial_unit_a_1', 6);
  handleTutorialEvent(controller, 'unit_played', { cardId: 'tutorial_unit_a_1', slotIndex: 6 });
  const selected = selectNextTutorialEnemyAction(state, 0);
  playOrRedeployUnit(state, 'enemy', selected.action.cardId, selected.action.slotIndex);
  handleTutorialEvent(controller, 'enemy_action_completed', { actionType: 'play-unit', cardId: selected.action.cardId, slotIndex: selected.action.slotIndex });
  resolveCombat(state);
  handleTutorialEvent(controller, 'combat_completed', {});
  playOrRedeployUnit(state, 'player', 'tutorial_unit_b_1', 7);
  handleTutorialEvent(controller, 'unit_played', { cardId: 'tutorial_unit_b_1', slotIndex: 7 });

  assert.equal(checkTutorialInputGate(controller, { type: 'swap_adjacent_units', fromIndex: 7, toIndex: 6, board: state.board }).allowed, true);
  assert.equal(checkTutorialInputGate(controller, { type: 'swap_adjacent_units', fromIndex: 6, toIndex: 8, board: state.board }).allowed, false);
  assert.equal(checkTutorialInputGate(controller, { type: 'swap_adjacent_units', fromIndex: 6, toIndex: 0, board: state.board }).allowed, false);
  assert.equal(checkTutorialInputGate(controller, { type: 'swap_adjacent_units', fromIndex: 6, toIndex: 7, board: Array(9).fill(null) }).allowed, false);

  const beforeSix = state.board[6].id;
  const beforeSeven = state.board[7].id;
  assert.deepEqual(performSwap(state, 'player', 6, 7), { ok: true });
  assert.equal(state.board[6].id, beforeSeven);
  assert.equal(state.board[7].id, beforeSix);
  handleTutorialEvent(controller, 'adjacent_swap_completed', { fromIndex: 6, toIndex: 7 });
  assert.equal(getCurrentTutorialStep(controller).id, 'redeploy');
});

test('BattleScene enforces tutorial player-first without changing normal first actor option and does not focus enemy action', () => {
  const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
  assert.match(source, /firstActor: isTutorialBattle \? 'player' : undefined/);
  const normal = createInitialBattleState({ id: 'p', deck: [] }, { id: 'e', deck: [] }, { firstActor: 'enemy' });
  assert.equal(normal.firstActor, 'enemy');
  assert.equal(getTutorialBattleData().enemyActionScript[0].cardId, 'tutorial_enemy_blocker_a_1');
});
