import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialBattleState, playEffectCard, resolveTargetedEffectCard } from '../src/systems/GameState.js';
import { chooseBattleAction } from '../src/systems/enemyDecision.js';

const swapCard = {
  id: 'control_swap_1',
  name: 'Swap',
  type: 'order',
  targeting: 'any_units',
  effectId: 'swap_any_two_units',
  textShort: 'Swap any two units.',
};

const unit = (owner, overrides = {}) => ({
  id: `${owner}-unit`,
  name: 'Test Unit',
  type: 'unit',
  attack: 1,
  hp: 2,
  maxHp: 2,
  armor: 0,
  effectId: null,
  owner,
  cardId: `${owner}-unit`,
  ...overrides,
});

test('AI models swap_any_two_units as a resolved two-target action', () => {
  const state = createInitialBattleState({ name: 'Player', deck: [] }, { name: 'Enemy', deck: [] }, { firstActor: 'enemy' });
  state.enemy.hand.push({ ...swapCard });
  state.board[0] = unit('enemy', { id: 'blocked-striker', cardId: 'blocked-striker', attack: 3 });
  state.board[1] = unit('enemy', { id: 'open-grunt', cardId: 'open-grunt', attack: 1 });
  state.board[6] = unit('player', { id: 'lane-blocker', cardId: 'lane-blocker', attack: 1 });

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.type, 'play-targeted-effect');
  assert.equal(action.effectId, 'swap_any_two_units');
  assert.deepEqual(action.targetIndexes, [0, 1]);

  const result = resolveTargetedEffectCard(state, 'enemy', action.cardId, action.targetIndex, action.targetIndexes);
  assert.equal(result.ok, true);
  assert.equal(result.type, 'targeted-effect');
  assert.equal(state.board[0].cardId, 'open-grunt');
  assert.equal(state.board[1].cardId, 'blocked-striker');
});

test('AI does not play swap_any_two_units as a one-target pending probe', () => {
  const state = createInitialBattleState({ name: 'Player', deck: [] }, { name: 'Enemy', deck: [] }, { firstActor: 'enemy' });
  state.enemy.hand.push({ ...swapCard });
  state.board[0] = unit('enemy', { id: 'solo-unit', cardId: 'solo-unit', attack: 3 });

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.type, 'pass');
  assert.equal(state.enemy.hand.length, 1);
});

const quickFixCard = {
  id: 'aggro_quick_fix_1',
  name: 'Quick Fix',
  type: 'utility',
  targeting: 'friendly_unit',
  effectId: 'heal_1_atk_1_draw_on_kill_this_turn',
  textShort: 'Heal a unit 1. +1 ATK this turn. Draw 1 if it destroys a unit.',
};

test('AI can legally target updated Quick Fix on a friendly unit', () => {
  const state = createInitialBattleState({ name: 'Player', deck: [] }, { name: 'Enemy', deck: [] }, { firstActor: 'enemy' });
  state.enemy.hand.push({ ...quickFixCard });
  state.board[0] = unit('enemy', { id: 'damaged-raider', cardId: 'damaged-raider', attack: 2, hp: 1, maxHp: 3 });

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.type, 'play-targeted-effect');
  assert.equal(action.effectId, 'heal_1_atk_1_draw_on_kill_this_turn');
  assert.equal(action.targetIndex, 0);

  const result = resolveTargetedEffectCard(state, 'enemy', action.cardId, action.targetIndex, action.targetIndexes);
  assert.equal(result.ok, true);
  assert.equal(state.board[0].hp, 2);
  assert.equal(state.board[0].tempAttackMod, 1);
});


const pulseWaveCard = {
  id: 'control_pulse_wave_1',
  name: 'Pulse Wave',
  type: 'order',
  targeting: 'all_enemy_units',
  effectId: 'damage_up_to_2_enemies_1',
  textShort: 'Deal 1 to up to 2 enemies.',
};

test('AI models Pulse Wave as deterministic left-to-right damage on up to two occupied enemy lanes', () => {
  const state = createInitialBattleState({ name: 'Player', deck: [] }, { name: 'Enemy', deck: [] }, { firstActor: 'enemy' });
  state.enemy.hand.push({ ...pulseWaveCard });
  state.board[6] = unit('player', { id: 'left-target', cardId: 'left-target', hp: 1, maxHp: 1 });
  state.board[7] = unit('player', { id: 'middle-target', cardId: 'middle-target', hp: 1, maxHp: 1 });
  state.board[8] = unit('player', { id: 'right-safe', cardId: 'right-safe', hp: 1, maxHp: 1 });

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.type, 'play-effect');
  assert.equal(action.effectId, 'damage_up_to_2_enemies_1');

  const result = playEffectCard(state, 'enemy', action.cardId);
  assert.equal(result.ok, true);
  assert.equal(state.board[6], null);
  assert.equal(state.board[7], null);
  assert.equal(state.board[8].cardId, 'right-safe');
});
