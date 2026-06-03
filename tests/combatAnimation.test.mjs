import test from 'node:test';
import assert from 'node:assert/strict';

import { getCombatAttackPresentation, getCombatEventInterceptOriginalTargetIndex, getLaneLethalTargetIndexes, getLaneSimultaneousUnitClash, shouldAnimateCombatAttacker, shouldUseControlledHeroStrikePresentation } from '../src/systems/combatAnimation.js';

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

const eventWithHiddenIndexes = (overrides = {}) => {
  const visible = event(overrides);
  const withIndexes = { ...visible };
  const attackerIndex = Object.hasOwn(overrides, 'attackerIndex') ? overrides.attackerIndex : visible.attackerIndex;
  const targetIndex = Object.hasOwn(overrides, 'targetIndex') ? overrides.targetIndex : visible.targetIndex;
  Object.defineProperties(withIndexes, {
    attackerIndex: { value: attackerIndex, enumerable: false },
    targetIndex: { value: targetIndex, enumerable: false },
  });
  return withIndexes;
};

test('lane simultaneous clash groups opposing valid unit attacks in the same lane', () => {
  const playerAttack = eventWithHiddenIndexes({ attackerIndex: 6, targetIndex: 0, lethal: true });
  const enemyAttack = eventWithHiddenIndexes({ attackerSide: 'enemy', attackerIndex: 0, targetSide: 'player', targetIndex: 6 });
  const board = snapshot();
  board[0] = unit('enemy');

  const clash = getLaneSimultaneousUnitClash(0, [playerAttack, enemyAttack], board);

  assert.deepEqual(clash.events, [playerAttack, enemyAttack]);
  assert.deepEqual(clash.attackers.map((attacker) => attacker.index), [6, 0]);
  assert.equal(clash.lethalTargetIndexes.has(0), true);
});

test('lane simultaneous clash rejects one-sided or passive unit exchanges', () => {
  const playerAttack = eventWithHiddenIndexes({ attackerIndex: 6, targetIndex: 0 });
  const enemyZeroAttack = eventWithHiddenIndexes({ attackerSide: 'enemy', attackerIndex: 0, targetSide: 'player', targetIndex: 6 });
  const board = snapshot();
  board[0] = unit('enemy', { attack: 0 });

  assert.equal(getLaneSimultaneousUnitClash(0, [playerAttack, enemyZeroAttack], board), null);
  assert.equal(getLaneSimultaneousUnitClash(0, [playerAttack], board), null);
});

test('lane simultaneous clash ignores off-lane targets and hero attacks', () => {
  const sniperAttack = eventWithHiddenIndexes({ attackerIndex: 6, targetIndex: 1 });
  const enemyAttack = eventWithHiddenIndexes({ attackerSide: 'enemy', attackerIndex: 0, targetSide: 'player', targetIndex: 6 });
  const heroAttack = eventWithHiddenIndexes({ attackerSide: 'enemy', attackerIndex: 0, targetType: 'hero', targetSide: 'player', targetIndex: undefined });
  const board = snapshot();
  board[0] = unit('enemy');
  board[1] = unit('enemy');

  assert.equal(getLaneSimultaneousUnitClash(0, [sniperAttack, enemyAttack], board), null);
  assert.equal(getLaneSimultaneousUnitClash(0, [sniperAttack, heroAttack], board), null);
});

test('lane lethal target index collection uses event target indexes and lane fallbacks', () => {
  const lethalEnemy = eventWithHiddenIndexes({ targetIndex: 0, lethal: true });
  const lethalPlayerFallback = eventWithHiddenIndexes({ targetSide: 'player', targetIndex: undefined, lethal: true });
  const nonLethal = eventWithHiddenIndexes({ targetIndex: 1, lethal: false });

  const lethalIndexes = getLaneLethalTargetIndexes([lethalEnemy, lethalPlayerFallback, nonLethal]);

  assert.equal(lethalIndexes.has(0), true);
  assert.equal(lethalIndexes.has(6), true);
  assert.equal(lethalIndexes.has(1), false);
});


test('guardian intercept original target index is available from non-enumerable combat metadata', () => {
  const intercepted = eventWithHiddenIndexes({ targetIndex: 7 });
  Object.defineProperty(intercepted, 'interceptOriginalTargetIndex', { value: 6, enumerable: false });

  assert.equal(getCombatEventInterceptOriginalTargetIndex(intercepted), 6);
  assert.equal(Object.keys(intercepted).includes('interceptOriginalTargetIndex'), false);
  assert.equal(getCombatEventInterceptOriginalTargetIndex(event()), null);
});

test('controlled own-base hero attacks request the override presentation path', () => {
  assert.equal(shouldUseControlledHeroStrikePresentation(event({
    targetType: 'hero',
    targetSide: 'player',
    controlledAttackFeedback: { label: 'CONTROLLED\nOVERRIDE' },
  })), true);
});

test('controlled own-base hero attacks request override presentation even for beam attackers', () => {
  const beamBoard = snapshot(unit('player', { attackPresentation: 'beam' }));
  const controlledBeamEvent = event({
    targetType: 'hero',
    targetSide: 'player',
    controlledAttackFeedback: { label: 'CONTROLLED\nOVERRIDE' },
  });

  assert.equal(getCombatAttackPresentation(controlledBeamEvent, beamBoard), 'beam');
  assert.equal(shouldUseControlledHeroStrikePresentation(controlledBeamEvent), true);
});

test('normal non-controlled beam attacks remain beam-presented and do not use override presentation', () => {
  const beamBoard = snapshot(unit('player', { attackPresentation: 'beam' }));
  const normalBeamEvent = event({ targetType: 'unit', targetSide: 'enemy' });

  assert.equal(getCombatAttackPresentation(normalBeamEvent, beamBoard), 'beam');
  assert.equal(shouldUseControlledHeroStrikePresentation(normalBeamEvent), false);
});
