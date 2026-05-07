import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialBattleState, resolveCombat, resolveTargetedEffectCard } from '../src/systems/GameState.js';

const makeState = () => createInitialBattleState({ name: 'Test', deck: [] });

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
  ...overrides,
});

test('resolveCombat returns unit-vs-unit combat events and preserves winner resolution', () => {
  const state = makeState();
  state.board[0] = unit('enemy', { attack: 1, hp: 2, maxHp: 2 });
  state.board[6] = unit('player', { attack: 2, hp: 2, maxHp: 2 });

  const events = resolveCombat(state);

  assert.deepEqual(events, [
    {
      lane: 0,
      attackerSide: 'player',
      targetType: 'unit',
      targetSide: 'enemy',
      damage: 2,
      openLane: false,
      lethal: true,
    },
    {
      lane: 0,
      attackerSide: 'enemy',
      targetType: 'unit',
      targetSide: 'player',
      damage: 1,
      openLane: false,
      lethal: false,
    },
  ]);
  assert.equal(state.board[0], null);
  assert.equal(state.board[6].hp, 1);
  assert.equal(state.winner, null);
});

test('resolveCombat returns a player open-lane hero attack event and sets winner', () => {
  const state = makeState();
  state.enemyHP = 2;
  state.board[7] = unit('player', { attack: 2 });

  const events = resolveCombat(state);

  assert.deepEqual(events, [
    {
      lane: 1,
      attackerSide: 'player',
      targetType: 'hero',
      targetSide: 'enemy',
      damage: 2,
      openLane: true,
      lethal: false,
    },
  ]);
  assert.equal(state.enemyHP, 0);
  assert.equal(state.winner, 'player');
});

test('resolveCombat returns an enemy open-lane hero attack event', () => {
  const state = makeState();
  state.board[2] = unit('enemy', { attack: 3 });

  const events = resolveCombat(state);

  assert.deepEqual(events, [
    {
      lane: 2,
      attackerSide: 'enemy',
      targetType: 'hero',
      targetSide: 'player',
      damage: 3,
      openLane: true,
      lethal: false,
    },
  ]);
  assert.equal(state.playerHP, 9);
  assert.equal(state.winner, null);
});


test('Rush finalizes immediate lane combat after resolving only the swapped lane', () => {
  const state = makeState();
  const rush = {
    id: 'rush-test-card',
    name: 'Rush',
    type: 'order',
    targeting: 'friendly_unit',
    effectId: 'swap_adjacent_then_resolve',
  };
  state.player.hand.push(rush);
  state.enemyHP = 1;
  state.board[6] = unit('player', { id: 'left-ally', attack: 0, hp: 2, maxHp: 2 });
  state.board[7] = unit('player', { id: 'rushing-ally', attack: 2, hp: 2, maxHp: 2 });
  state.board[1] = unit('enemy', { id: 'unresolved-enemy', attack: 3, hp: 2, maxHp: 2 });

  const result = resolveTargetedEffectCard(state, 'player', rush.id, 7);

  assert.equal(result.ok, true);
  assert.equal(state.board[6].id, 'rushing-ally');
  assert.equal(state.board[7].id, 'left-ally');
  assert.equal(state.enemyHP, 0);
  assert.equal(state.winner, 'player');
  assert.equal(state.playerHP, 12);
  assert.equal(state.board[1].id, 'unresolved-enemy');
});

test('Quick Strike finalizes immediate lane combat and resolves only its target lane', () => {
  const state = makeState();
  const quickStrike = {
    id: 'quick-strike-test-card',
    name: 'Quick Strike',
    type: 'special',
    targeting: 'friendly_unit',
    effectId: 'quick_strike',
  };
  state.player.hand.push(quickStrike);
  state.enemyHP = 1;
  state.board[7] = unit('player', { id: 'quick-ally', attack: 2, hp: 2, maxHp: 2 });
  state.board[0] = unit('enemy', { id: 'unresolved-enemy', attack: 3, hp: 2, maxHp: 2 });

  const result = resolveTargetedEffectCard(state, 'player', quickStrike.id, 7);

  assert.equal(result.ok, true);
  assert.equal(state.enemyHP, 0);
  assert.equal(state.winner, 'player');
  assert.equal(state.playerHP, 12);
  assert.equal(state.board[0].id, 'unresolved-enemy');
});

test('Runner deals +2 extra hero damage through an empty opposing lane', () => {
  const state = makeState();
  state.board[6] = unit('player', { attack: 2, effectId: 'lane_empty_bonus_damage' });

  const events = resolveCombat(state);

  assert.deepEqual(events, [
    {
      lane: 0,
      attackerSide: 'player',
      targetType: 'hero',
      targetSide: 'enemy',
      damage: 4,
      openLane: true,
      lethal: false,
    },
  ]);
  assert.equal(state.enemyHP, 8);
});

test('Runner behaves normally when an enemy unit is present', () => {
  const state = makeState();
  state.board[6] = unit('player', { attack: 2, effectId: 'lane_empty_bonus_damage' });
  state.board[0] = unit('enemy', { attack: 0, hp: 3, maxHp: 3 });

  const events = resolveCombat(state);

  assert.deepEqual(events, [
    {
      lane: 0,
      attackerSide: 'player',
      targetType: 'unit',
      targetSide: 'enemy',
      damage: 2,
      openLane: false,
      lethal: false,
    },
    {
      lane: 0,
      attackerSide: 'enemy',
      targetType: 'unit',
      targetSide: 'player',
      damage: 0,
      openLane: false,
      lethal: false,
    },
  ]);
  assert.equal(state.enemyHP, 12);
  assert.equal(state.board[0].hp, 1);
});

test('Runner open-lane bonus affects hero only, not units', () => {
  const state = makeState();
  state.board[7] = unit('player', { attack: 2, effectId: 'lane_empty_bonus_damage' });
  state.board[1] = unit('enemy', { attack: 0, hp: 4, maxHp: 4 });

  resolveCombat(state);

  assert.equal(state.enemyHP, 12);
  assert.equal(state.board[1].hp, 2);
});

test('Runner keeps existing combat timing and simultaneous open-lane order', () => {
  const state = makeState();
  state.playerHP = 4;
  state.enemyHP = 4;
  state.board[6] = unit('player', { attack: 2, effectId: 'lane_empty_bonus_damage' });
  state.board[1] = unit('enemy', { attack: 2, effectId: 'lane_empty_bonus_damage' });

  const events = resolveCombat(state);

  assert.deepEqual(events, [
    {
      lane: 0,
      attackerSide: 'player',
      targetType: 'hero',
      targetSide: 'enemy',
      damage: 4,
      openLane: true,
      lethal: false,
    },
    {
      lane: 1,
      attackerSide: 'enemy',
      targetType: 'hero',
      targetSide: 'player',
      damage: 4,
      openLane: true,
      lethal: false,
    },
  ]);
  assert.equal(state.winner, 'draw');
});

test('Multiple Runner attacks resolve consistently', () => {
  const state = makeState();
  state.board[6] = unit('player', { attack: 2, effectId: 'lane_empty_bonus_damage' });
  state.board[8] = unit('player', { attack: 2, effectId: 'lane_empty_bonus_damage' });

  const events = resolveCombat(state);

  assert.deepEqual(events.map((event) => event.damage), [4, 4]);
  assert.deepEqual(events.map((event) => event.lane), [0, 2]);
  assert.equal(state.enemyHP, 4);
});
