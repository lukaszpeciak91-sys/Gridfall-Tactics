import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldAnimateCombatAttacker } from '../src/systems/combatAnimation.js';

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

const event = (overrides = {}) => ({
  lane: 0,
  attackerSide: 'player',
  attackerIndex: 6,
  targetType: 'unit',
  targetSide: 'enemy',
  targetIndex: 0,
  damage: 1,
  openLane: false,
  lethal: false,
  ...overrides,
});

const snapshot = (attacker = unit('player')) => {
  const board = Array(9).fill(null);
  board[6] = attacker;
  return board;
};

test('combat attack animation requires a real attacker in the pre-combat slot', () => {
  assert.equal(shouldAnimateCombatAttacker(event(), snapshot()), true);
  assert.equal(shouldAnimateCombatAttacker(event(), snapshot(null)), false);
});

test('combat attack animation ignores empty lane fallback and side mismatches', () => {
  assert.equal(shouldAnimateCombatAttacker(event({ attackerIndex: undefined }), snapshot()), false);
  assert.equal(shouldAnimateCombatAttacker(event({ attackerSide: 'enemy' }), snapshot()), false);
  assert.equal(shouldAnimateCombatAttacker(event({ lane: 1 }), snapshot()), false);
});

test('combat attack animation blocks 0 ATK units but allows blocked positive-ATK attacks', () => {
  assert.equal(shouldAnimateCombatAttacker(event({ damage: 0 }), snapshot(unit('player', { attack: 1 }))), true);
  assert.equal(shouldAnimateCombatAttacker(event(), snapshot(unit('player', { attack: 0 }))), false);
  assert.equal(shouldAnimateCombatAttacker(event(), snapshot(unit('player', { attack: 3 }))), true);
});
