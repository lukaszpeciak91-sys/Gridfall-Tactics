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



test('resolveCombat includes non-enumerable attacker indexes for hero attack animation', () => {
  const state = makeState();
  state.board[7] = unit('player', { attack: 2 });
  state.board[2] = unit('enemy', { attack: 3 });

  const events = resolveCombat(state);

  assert.equal(events[0].attackerIndex, 7);
  assert.equal(Object.prototype.propertyIsEnumerable.call(events[0], 'attackerIndex'), false);
  assert.equal(events[1].attackerIndex, 2);
  assert.equal(Object.prototype.propertyIsEnumerable.call(events[1], 'attackerIndex'), false);
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


test('System Override makes the targeted enemy attack its own hero, then take 1 damage', () => {
  const state = makeState();
  const systemOverride = {
    id: 'system-override-test-card',
    name: 'System Override',
    type: 'special',
    targeting: 'enemy_unit',
    effectId: 'control_enemy_unit_this_turn',
  };
  state.player.hand.push(systemOverride);
  state.board[0] = unit('enemy', { id: 'overridden-enemy', attack: 2, hp: 2, maxHp: 2 });
  state.board[6] = unit('player', { attack: 0, hp: 2, maxHp: 2 });

  const result = resolveTargetedEffectCard(state, 'player', systemOverride.id, 0);
  const events = resolveCombat(state);

  assert.equal(result.ok, true);
  assert.deepEqual(events.map((event) => [event.lane, event.attackerSide, event.targetSide, event.damage, event.openLane]), [
    [0, 'player', 'enemy', 0, false],
    [0, 'enemy', 'enemy', 2, false],
  ]);
  assert.equal(state.enemyHP, 10);
  assert.equal(state.playerHP, 12);
  assert.equal(state.board[0].hp, 1);
  assert.equal(state.board[0].controlledAttackThisTurn, undefined);
});

test('System Override self-damage uses normal defeated-unit cleanup after combat', () => {
  const state = makeState();
  const systemOverride = {
    id: 'system-override-test-card',
    name: 'System Override',
    type: 'special',
    targeting: 'enemy_unit',
    effectId: 'control_enemy_unit_this_turn',
  };
  state.player.hand.push(systemOverride);
  state.board[1] = unit('enemy', { id: 'fragile-overridden-enemy', attack: 1, hp: 1, maxHp: 1 });

  const result = resolveTargetedEffectCard(state, 'player', systemOverride.id, 1);
  const events = resolveCombat(state);

  assert.equal(result.ok, true);
  assert.deepEqual(events.map((event) => [event.lane, event.attackerSide, event.targetSide, event.damage, event.openLane]), [
    [1, 'enemy', 'enemy', 1, false],
  ]);
  assert.equal(state.enemyHP, 11);
  assert.equal(state.board[1], null);
});

test('simultaneous lethal uses raw overkill depth so -1 HP beats -4 HP', () => {
  const state = makeState();
  state.playerHP = 5;
  state.enemyHP = 1;
  state.board[6] = unit('player', { attack: 5 });
  state.board[1] = unit('enemy', { attack: 6 });

  const events = resolveCombat(state);

  assert.deepEqual(events.map((event) => [event.lane, event.attackerSide, event.targetSide, event.damage]), [
    [0, 'player', 'enemy', 5],
    [1, 'enemy', 'player', 6],
  ]);
  assert.equal(state.heroDeathResolution.simultaneousLethal, true);
  assert.equal(state.heroDeathResolution.rawPlayerHP, -1);
  assert.equal(state.heroDeathResolution.rawEnemyHP, -4);
  assert.equal(state.heroDeathResolution.resolvedBy, 'higher-raw-hero-hp');
  assert.equal(state.playerHP, 0);
  assert.equal(state.enemyHP, 0);
  assert.equal(state.winner, 'player');
});

test('simultaneous lethal with equal raw overkill depth remains a draw', () => {
  const state = makeState();
  state.playerHP = 2;
  state.enemyHP = 2;
  state.board[6] = unit('player', { attack: 4 });
  state.board[1] = unit('enemy', { attack: 4 });

  resolveCombat(state);

  assert.equal(state.heroDeathResolution.simultaneousLethal, true);
  assert.equal(state.heroDeathResolution.rawPlayerHP, -2);
  assert.equal(state.heroDeathResolution.rawEnemyHP, -2);
  assert.equal(state.heroDeathResolution.resolvedBy, 'equal-raw-hero-hp');
  assert.equal(state.winner, 'draw');
});

test('single-hero combat lethal is unchanged', () => {
  const state = makeState();
  state.enemyHP = 3;
  state.board[6] = unit('player', { attack: 5 });

  resolveCombat(state);

  assert.equal(state.heroDeathResolution.simultaneousLethal, false);
  assert.equal(state.heroDeathResolution.resolvedBy, 'single-hero-lethal');
  assert.equal(state.playerHP, 12);
  assert.equal(state.enemyHP, 0);
  assert.equal(state.winner, 'player');
});

test('non-lethal combat remains unresolved and preserves final hero HP', () => {
  const state = makeState();
  state.playerHP = 9;
  state.enemyHP = 10;
  state.board[6] = unit('player', { attack: 2 });
  state.board[1] = unit('enemy', { attack: 3 });

  resolveCombat(state);

  assert.equal(state.heroDeathResolution.simultaneousLethal, false);
  assert.equal(state.heroDeathResolution.resolvedBy, null);
  assert.equal(state.playerHP, 6);
  assert.equal(state.enemyHP, 8);
  assert.equal(state.winner, null);
});

test('simultaneous lethal still applies both hero attacks before winner resolution', () => {
  const state = makeState();
  state.playerHP = 4;
  state.enemyHP = 4;
  state.board[6] = unit('player', { attack: 6 });
  state.board[1] = unit('enemy', { attack: 5 });

  const events = resolveCombat(state);

  assert.deepEqual(events.map((event) => [event.lane, event.attackerSide, event.targetSide, event.damage]), [
    [0, 'player', 'enemy', 6],
    [1, 'enemy', 'player', 5],
  ]);
  assert.equal(state.heroDeathResolution.rawPlayerHP, -1);
  assert.equal(state.heroDeathResolution.rawEnemyHP, -2);
  assert.equal(state.winner, 'player');
});

test('Last Stand combat prevention payload explains lethal damage clamped to 1 HP', () => {
  const state = makeState();
  state.cannotDropBelowOneThisTurn = { player: true, enemy: false };
  state.board[0] = unit('enemy', { attack: 5, hp: 3, maxHp: 3 });
  state.board[6] = unit('player', { attack: 0, hp: 3, maxHp: 3 });

  const events = resolveCombat(state);
  const preventedHit = events.find((event) => event.targetSide === 'player');

  assert.equal(preventedHit.lethal, false);
  assert.deepEqual(preventedHit.prevention, {
    targetIndex: 6,
    prevented: true,
    preventedBy: 'LAST_STAND',
    attemptedDamage: 5,
    visibleDamage: 2,
    finalHp: 1,
  });
  assert.equal(state.board[6].hp, 1);
  assert.equal(state.cannotDropBelowOneThisTurn.player, false);
});

test('Last Stand combat prevention payload supports simultaneous protected survivors', () => {
  const state = makeState();
  state.cannotDropBelowOneThisTurn = { player: true, enemy: true };
  state.board[0] = unit('enemy', { attack: 4, hp: 2, maxHp: 2 });
  state.board[6] = unit('player', { attack: 3, hp: 2, maxHp: 2 });

  const events = resolveCombat(state);

  assert.equal(events.length, 2);
  assert.equal(events.every((event) => event.prevention?.prevented === true), true);
  assert.deepEqual(events.map((event) => [event.targetSide, event.prevention.preventedBy, event.prevention.finalHp]), [
    ['enemy', 'LAST_STAND', 1],
    ['player', 'LAST_STAND', 1],
  ]);
  assert.equal(state.board[0].hp, 1);
  assert.equal(state.board[6].hp, 1);
});

test('Last Stand does not emit prevention metadata for non-lethal damage or after expiry', () => {
  const nonLethal = makeState();
  nonLethal.cannotDropBelowOneThisTurn = { player: true, enemy: false };
  nonLethal.board[0] = unit('enemy', { attack: 1, hp: 3, maxHp: 3 });
  nonLethal.board[6] = unit('player', { attack: 0, hp: 3, maxHp: 3 });

  const nonLethalEvents = resolveCombat(nonLethal);
  assert.equal(nonLethalEvents.some((event) => event.prevention), false);
  assert.equal(nonLethal.board[6].hp, 2);

  const expired = makeState();
  expired.board[0] = unit('enemy', { attack: 2, hp: 3, maxHp: 3 });
  expired.board[6] = unit('player', { attack: 0, hp: 1, maxHp: 3 });

  const expiredEvents = resolveCombat(expired);
  assert.equal(expiredEvents.some((event) => event.prevention), false);
  assert.equal(expired.board[6], null);
});

test('Last Stand prevention metadata reflects armor-mitigated combat damage', () => {
  const state = makeState();
  state.cannotDropBelowOneThisTurn = { player: true, enemy: false };
  state.board[0] = unit('enemy', { attack: 5, hp: 3, maxHp: 3 });
  state.board[6] = unit('player', { attack: 0, hp: 2, maxHp: 2, armor: 2 });

  const events = resolveCombat(state);
  const preventedHit = events.find((event) => event.targetSide === 'player');

  assert.equal(preventedHit.damage, 3);
  assert.equal(preventedHit.prevention?.attemptedDamage, 3);
  assert.equal(preventedHit.prevention?.visibleDamage, 1);
  assert.equal(state.board[6].hp, 1);
});

test('Last Stand prevention metadata reflects ignore-armor combat damage', () => {
  const state = makeState();
  state.cannotDropBelowOneThisTurn = { player: true, enemy: false };
  state.board[0] = unit('enemy', { attack: 5, hp: 3, maxHp: 3 });
  state.board[6] = unit('player', { attack: 0, hp: 2, maxHp: 2, armor: 4, ignoreArmorNext: true });

  const events = resolveCombat(state);
  const preventedHit = events.find((event) => event.targetSide === 'player');

  assert.equal(preventedHit.damage, 5);
  assert.equal(preventedHit.prevention?.attemptedDamage, 5);
  assert.equal(preventedHit.prevention?.visibleDamage, 1);
  assert.equal(state.board[6].hp, 1);
});
