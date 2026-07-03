import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialBattleState, resolveTargetedEffectCard } from '../src/systems/GameState.js';
import { buildActionCandidates } from '../src/systems/enemyDecision.js';
import { getTargetingStateForEffect } from '../src/systems/cardTargeting.js';

const EFFECT_ID = 'swap_any_two_friendly_units';

function effectCard(id = 'mercy_swap') {
  return { id, name: 'Overclock Mercy', type: 'order', targeting: 'friendly_unit', effectId: EFFECT_ID, textShort: 'Swap any 2 [ALLY].' };
}

function unit(id, owner, attack = 1) {
  return { id, cardId: id, name: id, type: 'unit', owner, attack, hp: 2, maxHp: 2, armor: 0, effectId: null };
}

function makeState(owner = 'player') {
  const state = createInitialBattleState({ id: 'p', name: 'P', deck: [] }, { id: 'e', name: 'E', deck: [] }, { firstActor: owner });
  state.player.hand = owner === 'player' ? [effectCard()] : [];
  state.enemy.hand = owner === 'enemy' ? [effectCard()] : [];
  state.board[6] = unit('player_left', 'player', 1);
  state.board[8] = unit('player_right', 'player', 3);
  state.board[0] = unit('enemy_left', 'enemy', 2);
  state.board[2] = unit('enemy_right', 'enemy', 4);
  return state;
}

function snapshot(state) {
  return JSON.stringify({ board: state.board, playerHand: state.player.hand, playerDiscard: state.player.discard, enemyHand: state.enemy.hand, enemyDiscard: state.enemy.discard });
}

test('targeting uses a two-friendly-unit mode', () => {
  assert.deepEqual(getTargetingStateForEffect(EFFECT_ID, 'c'), { cardId: 'c', targetType: 'friendly-unit', requiredTargets: 2, targetIndexes: [] });
});

test('swaps two friendly units successfully without stat buffs', () => {
  const state = makeState('player');
  const first = state.board[6];
  const second = state.board[8];
  const result = resolveTargetedEffectCard(state, 'player', 'mercy_swap', 6, [6, 8]);
  assert.equal(result.ok, true);
  assert.equal(state.board[6], second);
  assert.equal(state.board[8], first);
  assert.equal(state.board[6].tempAttackMod ?? 0, 0);
  assert.equal(state.board[8].tempAttackMod ?? 0, 0);
});

test('rejects enemy plus enemy pair with no partial resolve', () => {
  const state = makeState('player');
  const before = snapshot(state);
  const result = resolveTargetedEffectCard(state, 'player', 'mercy_swap', 0, [0, 2]);
  assert.equal(result.ok, false);
  assert.match(result.reason, /friendly|No target|Target/i);
  assert.equal(snapshot(state), before);
});

test('rejects friendly plus enemy pair with no partial resolve', () => {
  const state = makeState('player');
  const before = snapshot(state);
  const result = resolveTargetedEffectCard(state, 'player', 'mercy_swap', 6, [6, 0]);
  assert.equal(result.ok, false);
  assert.match(result.reason, /friendly/i);
  assert.equal(snapshot(state), before);
});

test('rejects duplicate target slot with no partial resolve', () => {
  const state = makeState('player');
  const before = snapshot(state);
  const result = resolveTargetedEffectCard(state, 'player', 'mercy_swap', 6, [6, 6]);
  assert.equal(result.ok, false);
  assert.match(result.reason, /different/i);
  assert.equal(snapshot(state), before);
});

test('rejects missing or empty target with no partial resolve', () => {
  const state = makeState('player');
  state.board[7] = null;
  const before = snapshot(state);
  const result = resolveTargetedEffectCard(state, 'player', 'mercy_swap', 6, [6, 7]);
  assert.equal(result.ok, false);
  assert.match(result.reason, /contain units/i);
  assert.equal(snapshot(state), before);
});

test('works for enemy owner relative to enemy friendly units', () => {
  const state = makeState('enemy');
  const first = state.board[0];
  const second = state.board[2];
  const result = resolveTargetedEffectCard(state, 'enemy', 'mercy_swap', 0, [0, 2]);
  assert.equal(result.ok, true);
  assert.equal(state.board[0], second);
  assert.equal(state.board[2], first);
});

test('AI can produce a legal friendly pair without invalid spam', () => {
  const state = makeState('enemy');
  state.board[6] = null;
  const telemetry = {};
  const actions = buildActionCandidates(state, 'enemy', state.enemy.hand, telemetry);
  const swapActions = actions.filter((action) => action.effectId === EFFECT_ID);
  assert.ok(swapActions.length >= 1);
  assert.ok(swapActions.every((action) => action.targetIndexes.length === 2 && action.targetIndexes.every((index) => state.board[index]?.owner === 'enemy')));
  assert.equal(telemetry.invalidActions ?? 0, 0);
});
