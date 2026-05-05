import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialBattleState, resolveCombat } from '../src/systems/GameState.js';

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
