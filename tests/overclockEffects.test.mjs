import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialBattleState,
  getEffectiveBoardAttack,
  playOrRedeployUnit,
  resolveCombat,
  resolveTargetedEffectCard,
} from '../src/systems/GameState.js';

const unitCard = (id, attack = 2, hp = 5, effectId = null) => ({
  id,
  name: id,
  type: 'unit',
  targeting: 'lane',
  attack,
  hp,
  armor: 0,
  effectId,
});

const orderCard = (id, effectId) => ({
  id,
  name: id,
  type: 'order',
  targeting: 'friendly_unit',
  effectId,
});

function stateWithHands(playerHand = [], enemyHand = []) {
  const state = createInitialBattleState({ id: 'p', name: 'P', deck: [] }, { id: 'e', name: 'E', deck: [] }, { firstActor: 'player' });
  state.player.hand.push(...playerHand);
  state.enemy.hand.push(...enemyHand);
  return state;
}

test('decay_attack_after_combat reduces attack after combat and does not go below 1', () => {
  const card = unitCard('decayer', 3, 6, 'decay_attack_after_combat');
  const state = stateWithHands([card]);
  assert.equal(playOrRedeployUnit(state, 'player', 'decayer', 6).ok, true);
  assert.equal(getEffectiveBoardAttack(state, 6), 3);

  resolveCombat(state);
  assert.equal(state.board[6].attackDecay, 1);
  assert.equal(getEffectiveBoardAttack(state, 6), 2);

  resolveCombat(state);
  assert.equal(state.board[6].attackDecay, 2);
  assert.equal(getEffectiveBoardAttack(state, 6), 1);

  resolveCombat(state);
  assert.equal(state.board[6].attackDecay, 2);
  assert.equal(getEffectiveBoardAttack(state, 6), 1);
});

test('decay is instance-based and does not mutate card JSON', () => {
  const card = unitCard('decayer', 2, 4, 'decay_attack_after_combat');
  const state = stateWithHands([card]);
  playOrRedeployUnit(state, 'player', 'decayer', 6);
  resolveCombat(state);

  assert.equal(card.attack, 2);
  assert.equal(card.attackDecay, undefined);
  assert.equal(state.board[6].attackDecay, 1);

  state.board[6] = null;
  state.player.hand.push(card);
  playOrRedeployUnit(state, 'player', 'decayer', 7);
  assert.equal(state.board[7].attackDecay, undefined);
  assert.equal(getEffectiveBoardAttack(state, 7), 2);
});

test('atk_plus_per_other_ally counts other allied units only, not itself or enemies', () => {
  const state = stateWithHands([
    unitCard('alpha', 1, 3, 'atk_plus_per_other_ally'),
    unitCard('ally', 2, 3),
  ], [unitCard('enemy', 2, 3)]);
  playOrRedeployUnit(state, 'player', 'alpha', 6);
  assert.equal(getEffectiveBoardAttack(state, 6), 1);
  playOrRedeployUnit(state, 'player', 'ally', 7);
  assert.equal(getEffectiveBoardAttack(state, 6), 2);
  playOrRedeployUnit(state, 'enemy', 'enemy', 0);
  assert.equal(getEffectiveBoardAttack(state, 6), 2);
});

test('swap_any_two_friendly_units_buff_both_atk_1 swaps two friendly units and buffs both until combat', () => {
  const swap = orderCard('swap', 'swap_any_two_friendly_units_buff_both_atk_1');
  const a = unitCard('a', 1, 4);
  const b = unitCard('b', 2, 4);
  const state = stateWithHands([a, b, swap]);
  playOrRedeployUnit(state, 'player', 'a', 6);
  playOrRedeployUnit(state, 'player', 'b', 8);

  const result = resolveTargetedEffectCard(state, 'player', 'swap', 6, [6, 8]);
  assert.equal(result.ok, true);
  assert.equal(state.board[6].cardId, 'b');
  assert.equal(state.board[8].cardId, 'a');
  assert.equal(getEffectiveBoardAttack(state, 6), 3);
  assert.equal(getEffectiveBoardAttack(state, 8), 2);

  resolveCombat(state);
  assert.equal(state.board[6]?.tempAttackMod, undefined);
  assert.equal(state.board[8]?.tempAttackMod, undefined);
});

test('invalid friendly swap targets do not partially resolve', () => {
  const swap = orderCard('swap', 'swap_any_two_friendly_units_buff_both_atk_1');
  const state = stateWithHands([unitCard('a', 1, 4), swap], [unitCard('e', 3, 4)]);
  playOrRedeployUnit(state, 'player', 'a', 6);
  playOrRedeployUnit(state, 'enemy', 'e', 0);

  const result = resolveTargetedEffectCard(state, 'player', 'swap', 6, [6, 0]);
  assert.equal(result.ok, false);
  assert.equal(state.board[6].cardId, 'a');
  assert.equal(state.board[0].cardId, 'e');
  assert.equal(state.board[6].tempAttackMod, undefined);
  assert.equal(state.board[0].tempAttackMod, undefined);
  assert.equal(state.player.hand.some((card) => card.id === 'swap'), true);
});

test('Overclock effects work for enemy owner', () => {
  const swap = orderCard('swap', 'swap_any_two_friendly_units_buff_both_atk_1');
  const state = stateWithHands([], [
    unitCard('decayer', 2, 5, 'decay_attack_after_combat'),
    unitCard('alpha', 1, 5, 'atk_plus_per_other_ally'),
    swap,
  ]);
  playOrRedeployUnit(state, 'enemy', 'decayer', 0);
  playOrRedeployUnit(state, 'enemy', 'alpha', 2);
  assert.equal(getEffectiveBoardAttack(state, 2), 2);

  const result = resolveTargetedEffectCard(state, 'enemy', 'swap', 0, [0, 2]);
  assert.equal(result.ok, true);
  assert.equal(state.board[0].cardId, 'alpha');
  assert.equal(state.board[2].cardId, 'decayer');
  assert.equal(getEffectiveBoardAttack(state, 0), 3);

  resolveCombat(state);
  assert.equal(getEffectiveBoardAttack(state, 2), 1);
});
