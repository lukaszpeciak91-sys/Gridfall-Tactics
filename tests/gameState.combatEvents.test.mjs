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

test('Sniper off-lane lethal target still makes its snapshotted later-lane attack', () => {
  const state = makeState();
  state.board[6] = unit('player', { id: 'sniper', attack: 2, hp: 1, maxHp: 1, effectId: 'can_hit_any_lane' });
  state.board[1] = unit('enemy', { id: 'later-lane-victim', attack: 3, hp: 1, maxHp: 1 });

  const events = resolveCombat(state);

  assert.equal(events.length, 2);
  assert.equal(events[0].attackerIndex, 6);
  assert.equal(events[0].targetIndex, 1);
  assert.equal(events[0].lethal, true);
  assert.equal(events[1].attackerIndex, 1);
  assert.equal(events[1].targetType, 'hero');
  assert.equal(state.board[1], null);
  assert.equal(state.playerHP, 9);
});

test('Sniper immediately cleans an off-lane lethal target in an already-resolved lane', () => {
  const state = makeState();
  state.board[8] = unit('player', { id: 'late-sniper', attack: 2, hp: 1, maxHp: 1, effectId: 'can_hit_any_lane' });
  state.board[0] = unit('enemy', { id: 'earlier-lane-victim', attack: 0, hp: 1, maxHp: 1 });

  const events = resolveCombat(state);

  assert.equal(events.length, 2);
  assert.equal(events[0].attackerIndex, 0);
  assert.equal(events[0].targetType, 'hero');
  assert.equal(events[1].attackerIndex, 8);
  assert.equal(events[1].targetIndex, 0);
  assert.equal(state.board[0], null);
});

test('multiple Snipers preserve snapshotted target choice even when targeting the same unit', () => {
  const state = makeState();
  state.board[6] = unit('player', { id: 'first-sniper', attack: 2, hp: 1, maxHp: 1, effectId: 'can_hit_any_lane' });
  state.board[7] = unit('player', { id: 'second-sniper', attack: 2, hp: 1, maxHp: 1, effectId: 'can_hit_any_lane' });
  state.board[2] = unit('enemy', { id: 'lowest-hp-victim', attack: 4, hp: 1, maxHp: 1 });
  state.board[0] = unit('enemy', { id: 'next-living-target', attack: 0, hp: 3, maxHp: 3 });

  const events = resolveCombat(state);
  const sniperEvents = events.filter((event) => event.attackerSide === 'player');

  assert.deepEqual(sniperEvents.map((event) => [event.attackerIndex, event.targetIndex]), [
    [6, 2],
    [7, 2],
  ]);
  assert.equal(state.board[2], null);
  assert.equal(state.board[0].hp, 3);
  assert.equal(state.playerHP, 8);
});

test('Sniper targeting ignores non-positive HP units already present on the board', () => {
  const state = makeState();
  state.board[6] = unit('player', { id: 'sniper', attack: 2, hp: 1, maxHp: 1, effectId: 'can_hit_any_lane' });
  state.board[0] = unit('enemy', { id: 'stale-corpse', attack: 5, hp: 0, maxHp: 1 });
  state.board[1] = unit('enemy', { id: 'living-target', attack: 0, hp: 2, maxHp: 2 });

  const events = resolveCombat(state);

  assert.equal(events[0].attackerIndex, 6);
  assert.equal(events[0].targetIndex, 1);
  assert.equal(state.board[0], null);
  assert.equal(state.board[1], null);
  assert.equal(state.playerHP, 12);
});

test('Sniper HP ties target the highest effective ATK enemy before board index', () => {
  const state = makeState();
  state.board[6] = unit('player', { id: 'sniper', attack: 1, hp: 2, maxHp: 2, effectId: 'can_hit_any_lane' });
  state.board[0] = unit('enemy', { id: 'lower-index-low-attack', attack: 1, hp: 2, maxHp: 2 });
  state.board[1] = unit('enemy', { id: 'higher-attack', attack: 3, hp: 2, maxHp: 2 });

  const sniperHit = resolveCombat(state).find((event) => event.attackerIndex === 6);

  assert.equal(sniperHit.targetIndex, 1);
});

test('Sniper ATK ties still target the lower board index deterministically', () => {
  const makeTieState = () => {
    const state = makeState();
    state.board[6] = unit('player', { id: 'sniper', attack: 1, hp: 2, maxHp: 2, effectId: 'can_hit_any_lane' });
    state.board[0] = unit('enemy', { id: 'lower-index-tie', attack: 3, hp: 2, maxHp: 2 });
    state.board[1] = unit('enemy', { id: 'higher-index-tie', attack: 3, hp: 2, maxHp: 2 });
    return state;
  };

  const firstHit = resolveCombat(makeTieState()).find((event) => event.attackerIndex === 6);
  const secondHit = resolveCombat(makeTieState()).find((event) => event.attackerIndex === 6);

  assert.equal(firstHit.targetIndex, 0);
  assert.equal(secondHit.targetIndex, 0);
});

test('Sniper HP tie uses active effective ATK buffs and debuffs', () => {
  const state = makeState();
  state.board[6] = unit('player', { id: 'sniper', attack: 1, hp: 2, maxHp: 2, effectId: 'can_hit_any_lane' });
  state.board[0] = unit('enemy', { id: 'printed-high-debuffed', attack: 4, hp: 2, maxHp: 2, tempAttackMod: -3 });
  state.board[1] = unit('enemy', { id: 'printed-low-buffed', attack: 1, hp: 2, maxHp: 2, tempAttackMod: 2 });

  const sniperHit = resolveCombat(state).find((event) => event.attackerIndex === 6);

  assert.equal(sniperHit.targetIndex, 1);
});

test('Sniper off-lane cleanup records fallen units and fires death triggers exactly once', () => {
  const state = makeState();
  state.board[6] = unit('player', { id: 'sniper', attack: 2, hp: 1, maxHp: 1, effectId: 'can_hit_any_lane' });
  state.board[2] = unit('enemy', { id: 'trigger-victim', attack: 3, hp: 1, maxHp: 1, effectId: 'death_damage_enemy_hero_1' });

  const events = resolveCombat(state);

  assert.equal(events.length, 3);
  assert.equal(events[1].type, 'death-trigger-hero-damage');
  assert.equal(events[1].sourceDeathIndex, 2);
  assert.equal(events[1].targetSide, 'player');
  assert.equal(events[1].damage, 1);
  assert.equal(events[2].attackerIndex, 2);
  assert.equal(events[2].targetType, 'hero');
  assert.equal(state.playerHP, 8);
  assert.equal(state.board[2], null);
  assert.equal(state.enemy.fallen.length, 1);
  assert.equal(state.enemy.fallen[0].card.id, 'trigger-victim');
  assert.equal(state.enemy.fallen[0].reason, 'combat-death');
});

test('Sniper off-lane cleanup preserves combat-death summon handling without duplicates', () => {
  const state = makeState();
  state.board[6] = unit('player', { id: 'sniper', attack: 2, hp: 1, maxHp: 1, effectId: 'can_hit_any_lane' });
  state.board[2] = unit('enemy', { id: 'carrier-victim', attack: 3, hp: 1, maxHp: 1, effectId: 'combat_death_summon_grunt' });

  const events = resolveCombat(state);

  assert.equal(events.length, 2);
  assert.equal(events[0].attackerIndex, 6);
  assert.equal(events[0].targetIndex, 2);
  assert.equal(events[1].attackerIndex, 2);
  assert.equal(events[1].targetType, 'hero');
  assert.equal(events[1].damage, 3);
  assert.equal(state.playerHP, 9);
  assert.equal(state.board[2].effectId, null);
  assert.equal(state.board[2].attack, 1);
  assert.equal(state.enemy.fallen.length, 1);
  assert.equal(state.enemy.fallen[0].card.id, 'carrier-victim');
  assert.equal(state.combatOnlyDeathSummons, 1);
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

  const result = resolveTargetedEffectCard(state, 'player', rush.id, 7, [7, 6]);

  assert.equal(result.ok, true);
  assert.equal(result.combatEvents.length, 1);
  assert.equal(result.combatEvents[0].attackerIndex, 6);
  assert.equal(result.combatEvents[0].targetType, 'hero');
  assert.equal(result.combatEvents[0].damage, 2);
  assert.equal(result.combatSnapshot.board[6].id, 'rushing-ally');
  assert.equal(result.combatSnapshot.board[7].id, 'left-ally');
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
  assert.equal(result.combatEvents.length, 1);
  assert.equal(result.combatEvents[0].attackerIndex, 7);
  assert.equal(result.combatEvents[0].targetType, 'hero');
  assert.equal(result.combatEvents[0].damage, 2);
  assert.equal(result.combatSnapshot.board[7].id, 'quick-ally');
  assert.equal(state.enemyHP, 0);
  assert.equal(state.winner, 'player');
  assert.equal(state.playerHP, 12);
  assert.equal(state.board[0].id, 'unresolved-enemy');
});


test('Quick Strike combatEvents represent both attacks and damage is applied once', () => {
  const state = makeState();
  const quickStrike = {
    id: 'quick-strike-test-card',
    name: 'Quick Strike',
    type: 'special',
    targeting: 'friendly_unit',
    effectId: 'quick_strike',
  };
  state.player.hand.push(quickStrike);
  state.board[7] = unit('player', { id: 'quick-ally', attack: 2, hp: 4, maxHp: 4 });
  state.board[1] = unit('enemy', { id: 'quick-enemy', attack: 1, hp: 4, maxHp: 4 });

  const result = resolveTargetedEffectCard(state, 'player', quickStrike.id, 7);

  assert.equal(result.ok, true);
  assert.equal(result.combatEvents.length, 2);
  assert.deepEqual(result.combatEvents.map((event) => [event.attackerSide, event.attackerIndex, event.targetIndex, event.damage]), [
    ['player', 7, 1, 2],
    ['enemy', 1, 7, 1],
  ]);
  assert.equal(state.board[1].hp, 2);
  assert.equal(state.board[7].hp, 3);
});

test('Quick Strike immediate combat emits ordered death-trigger presentation events', () => {
  const state = makeState();
  const quickStrike = {
    id: 'quick-strike-test-card',
    name: 'Quick Strike',
    type: 'special',
    targeting: 'friendly_unit',
    effectId: 'quick_strike',
  };
  state.player.hand.push(quickStrike);
  state.board[6] = unit('player', { id: 'party-host', attack: 0, hp: 1, maxHp: 1, effectId: 'death_damage_enemy_hero_1' });
  state.board[7] = unit('player', { id: 'rotcaller', attack: 1, hp: 2, maxHp: 2, effectId: 'rotcaller_adjacent_death_atk_1' });
  state.board[0] = unit('enemy', { id: 'killer', attack: 1, hp: 2, maxHp: 2 });

  const result = resolveTargetedEffectCard(state, 'player', quickStrike.id, 6);

  assert.equal(result.ok, true);
  assert.deepEqual(result.combatEvents.map((event) => event.type ?? `${event.attackerSide}:${event.targetType}:${event.damage}`), [
    'player:unit:0',
    'enemy:unit:1',
    'death-trigger-rotcaller-buff',
    'death-trigger-hero-damage',
  ]);
  assert.equal(result.combatEvents[2].targetIndex, 7);
  assert.equal(result.combatEvents[3].targetSide, 'enemy');
});

test('Runner gains +2 ATK through an empty opposing lane', () => {
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
      combatModifiers: [
        {
          type: 'attack-bonus',
          amount: 2,
          source: 'lane_empty_bonus_damage',
          label: '+2 ATK',
        },
      ],
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

test('Runner open-lane ATK bonus affects open lanes only, not opposed units', () => {
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
      combatModifiers: [
        {
          type: 'attack-bonus',
          amount: 2,
          source: 'lane_empty_bonus_damage',
          label: '+2 ATK',
        },
      ],
    },
    {
      lane: 1,
      attackerSide: 'enemy',
      targetType: 'hero',
      targetSide: 'player',
      damage: 4,
      openLane: true,
      lethal: false,
      combatModifiers: [
        {
          type: 'attack-bonus',
          amount: 2,
          source: 'lane_empty_bonus_damage',
          label: '+2 ATK',
        },
      ],
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


const systemOverrideCard = () => ({
  id: 'system-override-test-card',
  name: 'System Override',
  type: 'special',
  targeting: 'enemy_unit',
  effectId: 'control_enemy_unit_this_turn',
});

test('System Override immediately attacks the target own base and deals 1 self-damage', () => {
  const state = makeState();
  const systemOverride = systemOverrideCard();
  state.player.hand.push(systemOverride);
  state.board[0] = unit('enemy', { id: 'overridden-enemy', attack: 2, hp: 2, maxHp: 2 });
  state.board[6] = unit('player', { attack: 0, hp: 2, maxHp: 2 });

  const result = resolveTargetedEffectCard(state, 'player', systemOverride.id, 0);

  assert.equal(result.ok, true);
  assert.deepEqual(result.combatEvents.map((event) => [event.lane, event.attackerSide, event.targetSide, event.damage, event.openLane]), [
    [0, 'enemy', 'enemy', 2, false],
  ]);
  assert.deepEqual(result.combatEvents[0].controlledAttackFeedback, { label: 'CONTROLLED\nOVERRIDE' });
  assert.deepEqual(result.combatEvents[0].selfDamageFeedback, { targetType: 'unit', index: 0, amount: 1, label: 'OVERRIDE -1' });
  assert.equal(state.enemyHP, 10);
  assert.equal(state.playerHP, 12);
  assert.equal(state.board[0].hp, 1);
});

test('System Override target remains on board and still performs normal combat later that turn', () => {
  const state = makeState();
  const systemOverride = systemOverrideCard();
  state.player.hand.push(systemOverride);
  state.board[0] = unit('enemy', { id: 'overridden-enemy', attack: 2, hp: 3, maxHp: 3 });
  state.board[6] = unit('player', { id: 'blocking-player', attack: 0, hp: 3, maxHp: 3 });

  const result = resolveTargetedEffectCard(state, 'player', systemOverride.id, 0);
  const events = resolveCombat(state);

  assert.equal(result.ok, true);
  assert.equal(state.enemyHP, 10);
  assert.deepEqual(events.map((event) => [event.lane, event.attackerSide, event.targetSide, event.damage, event.openLane]), [
    [0, 'player', 'enemy', 0, false],
    [0, 'enemy', 'player', 2, false],
  ]);
  assert.equal(state.board[0].hp, 2);
  assert.equal(state.board[6].hp, 1);
});

test('System Override self-damage immediately removes a fragile target', () => {
  const state = makeState();
  const systemOverride = systemOverrideCard();
  state.player.hand.push(systemOverride);
  state.board[1] = unit('enemy', { id: 'fragile-overridden-enemy', attack: 1, hp: 1, maxHp: 1 });

  const result = resolveTargetedEffectCard(state, 'player', systemOverride.id, 1);
  const events = resolveCombat(state);

  assert.equal(result.ok, true);
  assert.deepEqual(result.combatEvents.map((event) => [event.lane, event.attackerSide, event.targetSide, event.damage, event.openLane]), [
    [1, 'enemy', 'enemy', 1, false],
  ]);
  assert.equal(state.enemyHP, 11);
  assert.equal(state.board[1], null);
  assert.deepEqual(events, []);
});

test('System Override self-damage fires death triggers when it kills the target', () => {
  const state = makeState();
  const systemOverride = systemOverrideCard();
  state.player.hand.push(systemOverride);
  state.board[1] = unit('enemy', {
    id: 'trigger-overridden-enemy',
    attack: 1,
    hp: 1,
    maxHp: 1,
    effectId: 'death_damage_enemy_hero_1',
  });

  const result = resolveTargetedEffectCard(state, 'player', systemOverride.id, 1);

  assert.equal(result.ok, true);
  assert.equal(state.enemyHP, 11);
  assert.equal(state.playerHP, 11);
  assert.equal(state.board[1], null);
  assert.equal(state.enemy.fallen.length, 1);
  assert.equal(state.enemy.fallen[0].card.id, 'trigger-overridden-enemy');
  assert.equal(state.enemy.fallen[0].reason, 'combat-death');
});

const assertSimultaneousBaseDestructionDraw = (state, expectedRawPlayerHP, expectedRawEnemyHP) => {
  assert.equal(state.heroDeathResolution.simultaneousLethal, true);
  assert.equal(state.heroDeathResolution.rawPlayerHP, expectedRawPlayerHP);
  assert.equal(state.heroDeathResolution.rawEnemyHP, expectedRawEnemyHP);
  assert.equal(state.heroDeathResolution.resolvedBy, 'simultaneous-base-destruction-draw');
  assert.equal(state.playerHP, 0);
  assert.equal(state.enemyHP, 0);
  assert.equal(state.winner, 'draw');
};

test('simultaneous base destruction is always a draw regardless of raw overkill depth', () => {
  const cases = [
    { name: 'player 0 enemy -1', playerHP: 2, enemyHP: 3, playerAttack: 4, enemyAttack: 2, rawPlayerHP: 0, rawEnemyHP: -1 },
    { name: 'player -1 enemy 0', playerHP: 3, enemyHP: 2, playerAttack: 2, enemyAttack: 4, rawPlayerHP: -1, rawEnemyHP: 0 },
    { name: 'both exactly 0', playerHP: 2, enemyHP: 4, playerAttack: 4, enemyAttack: 2, rawPlayerHP: 0, rawEnemyHP: 0 },
    { name: 'both equal negative', playerHP: 2, enemyHP: 2, playerAttack: 4, enemyAttack: 4, rawPlayerHP: -2, rawEnemyHP: -2 },
    { name: 'both unequal negative', playerHP: 5, enemyHP: 1, playerAttack: 5, enemyAttack: 6, rawPlayerHP: -1, rawEnemyHP: -4 },
  ];

  for (const scenario of cases) {
    const state = makeState();
    state.playerHP = scenario.playerHP;
    state.enemyHP = scenario.enemyHP;
    state.board[6] = unit('player', { attack: scenario.playerAttack });
    state.board[1] = unit('enemy', { attack: scenario.enemyAttack });

    resolveCombat(state);

    assertSimultaneousBaseDestructionDraw(state, scenario.rawPlayerHP, scenario.rawEnemyHP, scenario.name);
  }
});

test('simultaneous base destruction draw is not affected by first actor or lane relocation', () => {
  const firstActorState = makeState();
  firstActorState.firstActor = 'enemy';
  firstActorState.playerHP = 2;
  firstActorState.enemyHP = 3;
  firstActorState.board[6] = unit('player', { attack: 4 });
  firstActorState.board[1] = unit('enemy', { attack: 2 });

  resolveCombat(firstActorState);

  assertSimultaneousBaseDestructionDraw(firstActorState, 0, -1);

  const laneRelocationState = makeState();
  laneRelocationState.playerHP = 2;
  laneRelocationState.enemyHP = 3;
  laneRelocationState.board[8] = unit('player', { attack: 4 });
  laneRelocationState.board[0] = unit('enemy', { attack: 1 });
  laneRelocationState.board[1] = unit('enemy', { attack: 1 });

  resolveCombat(laneRelocationState);

  assertSimultaneousBaseDestructionDraw(laneRelocationState, 0, -1);
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
  assert.equal(state.heroDeathResolution.resolvedBy, 'simultaneous-base-destruction-draw');
  assert.equal(state.winner, 'draw');
});

test('immediate combat simultaneous base destruction is a draw', () => {
  const state = makeState();
  const quickStrike = {
    id: 'quick-strike-double-lethal',
    name: 'Quick Strike',
    type: 'special',
    targeting: 'friendly_unit',
    effectId: 'quick_strike',
  };
  state.player.hand.push(quickStrike);
  state.playerHP = 1;
  state.enemyHP = 1;
  state.board[7] = unit('player', { id: 'trigger-ally', attack: 1, hp: 1, maxHp: 1, effectId: 'combat_death_damage_both_heroes_1' });
  state.board[1] = unit('enemy', { id: 'trigger-enemy', attack: 1, hp: 1, maxHp: 1 });

  const result = resolveTargetedEffectCard(state, 'player', quickStrike.id, 7);

  assert.equal(result.ok, true);
  assert.equal(state.heroDeathResolution.rawPlayerHP, 0);
  assert.equal(state.heroDeathResolution.rawEnemyHP, 0);
  assert.equal(state.heroDeathResolution.resolvedBy, 'simultaneous-base-destruction-draw');
  assert.equal(state.winner, 'draw');
});

test('death-trigger-assisted simultaneous base destruction is a draw', () => {
  const state = makeState();
  state.playerHP = 1;
  state.enemyHP = 1;
  state.board[6] = unit('player', { id: 'abomination', attack: 0, hp: 1, maxHp: 1, effectId: 'combat_death_damage_both_heroes_1' });
  state.board[0] = unit('enemy', { id: 'killer', attack: 1, hp: 2, maxHp: 2 });

  resolveCombat(state);

  assert.equal(state.heroDeathResolution.rawPlayerHP, 0);
  assert.equal(state.heroDeathResolution.rawEnemyHP, 0);
  assert.equal(state.heroDeathResolution.resolvedBy, 'simultaneous-base-destruction-draw');
  assert.equal(state.winner, 'draw');
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

test('Warden self-friction combat event metadata appears when Tusk Guard is attacked without changing attacker stats', () => {
  const state = makeState();
  state.board[0] = unit('enemy', { id: 'attacker', attack: 2, hp: 3, maxHp: 3 });
  state.board[6] = unit('player', {
    id: 'tusk-guard',
    attack: 0,
    hp: 3,
    maxHp: 3,
    effectId: 'warden_defensive_friction_self',
  });

  const events = resolveCombat(state);
  const hit = events.find((event) => event.attackerSide === 'enemy' && event.targetSide === 'player');

  assert.equal(hit.damage, 1);
  assert.equal(state.board[0].tempAttackMod, undefined);
  assert.deepEqual(hit.combatModifiers, [
    {
      type: 'attack-reduction',
      amount: -1,
      source: 'warden_defensive_friction',
      label: '-1 ATK',
    },
  ]);
});

test('Warden adjacent-friction combat event metadata appears when a Tundra Hunter protects an adjacent ally', () => {
  const state = makeState();
  state.board[0] = unit('enemy', { id: 'attacker', attack: 2, hp: 3, maxHp: 3 });
  state.board[6] = unit('player', { id: 'protected-ally', attack: 0, hp: 3, maxHp: 3 });
  state.board[7] = unit('player', {
    id: 'tundra-hunter',
    attack: 0,
    hp: 3,
    maxHp: 3,
    effectId: 'warden_defensive_friction_adjacent',
  });

  const events = resolveCombat(state);
  const hit = events.find((event) => event.attackerSide === 'enemy' && event.targetSide === 'player');

  assert.equal(hit.damage, 1);
  assert.deepEqual(hit.combatModifiers, [
    {
      type: 'attack-reduction',
      amount: -1,
      source: 'warden_defensive_friction',
      label: '-1 ATK',
    },
  ]);
});

test('Warden friction metadata is omitted for unprotected defenders and open-lane base attacks', () => {
  const unprotected = makeState();
  unprotected.board[0] = unit('enemy', { id: 'attacker', attack: 2, hp: 3, maxHp: 3 });
  unprotected.board[6] = unit('player', { id: 'unprotected-ally', attack: 0, hp: 3, maxHp: 3 });
  unprotected.board[8] = unit('player', {
    id: 'off-lane-tusk-guard',
    attack: 0,
    hp: 3,
    maxHp: 3,
    effectId: 'warden_defensive_friction_self',
  });

  const unprotectedEvents = resolveCombat(unprotected);
  assert.equal(unprotectedEvents.some((event) => event.combatModifiers), false);

  const openLane = makeState();
  openLane.board[0] = unit('enemy', {
    id: 'open-lane-attacker',
    attack: 2,
    hp: 3,
    maxHp: 3,
    effectId: 'lane_empty_bonus_damage',
  });

  const openLaneEvents = resolveCombat(openLane);
  assert.equal(openLaneEvents.length, 1);
  assert.equal(openLaneEvents[0].targetType, 'hero');
  assert.equal(openLaneEvents[0].openLane, true);
  assert.deepEqual(openLaneEvents[0].combatModifiers, [
    {
      type: 'attack-bonus',
      amount: 2,
      source: 'lane_empty_bonus_damage',
      label: '+2 ATK',
    },
  ]);
});

test('Multiple Warden friction sources produce one capped -1 ATK metadata entry', () => {
  const state = makeState();
  state.board[0] = unit('enemy', { id: 'attacker', attack: 3, hp: 3, maxHp: 3 });
  state.board[6] = unit('player', {
    id: 'tusk-guard',
    attack: 0,
    hp: 5,
    maxHp: 5,
    effectId: 'warden_defensive_friction_self',
  });
  state.board[7] = unit('player', {
    id: 'tundra-hunter',
    attack: 0,
    hp: 3,
    maxHp: 3,
    effectId: 'warden_defensive_friction_adjacent',
  });

  const events = resolveCombat(state);
  const hit = events.find((event) => event.attackerSide === 'enemy' && event.targetSide === 'player');

  assert.equal(hit.damage, 2);
  assert.deepEqual(hit.combatModifiers, [
    {
      type: 'attack-reduction',
      amount: -1,
      source: 'warden_defensive_friction',
      label: '-1 ATK',
    },
  ]);
});

test('combat-only attack and armor modifiers emit feedback metadata only when active without changing board stats', () => {
  const alphaState = makeState();
  alphaState.board[6] = unit('player', { id: 'alpha', attack: 1, hp: 2, maxHp: 2, effectId: 'adjacent_allies_atk_plus_1_ignore_armor_1' });
  alphaState.board[7] = unit('player', { id: 'alpha-ally', attack: 1, hp: 2, maxHp: 2 });
  alphaState.board[1] = unit('enemy', { id: 'armored-target', attack: 0, hp: 3, maxHp: 3, armor: 1 });

  const alphaHit = resolveCombat(alphaState).find((event) => event.attackerIndex === 7);
  assert.equal(alphaHit.damage, 2);
  assert.equal(alphaState.board[7].attack, 1);
  assert.deepEqual(alphaHit.combatModifiers, [
    { type: 'attack-bonus', amount: 1, source: 'adjacent_allies_atk_plus_1_ignore_armor_1', label: '+1 ATK' },
    { type: 'armor-ignore', amount: 1, source: 'adjacent_allies_atk_plus_1_ignore_armor_1', label: 'IGNORE ARM' },
  ]);

  const shieldState = makeState();
  shieldState.board[0] = unit('enemy', { id: 'attacker', attack: 2, hp: 3, maxHp: 3 });
  shieldState.board[6] = unit('player', { id: 'shielded', attack: 0, hp: 3, maxHp: 3, armor: 0 });
  shieldState.board[7] = unit('player', { id: 'shieldbearer', attack: 0, hp: 3, maxHp: 3, effectId: 'lane_armor_aura_1' });

  const shieldHit = resolveCombat(shieldState).find((event) => event.attackerSide === 'enemy');
  assert.equal(shieldHit.damage, 1);
  assert.equal(shieldState.board[6].armor, 0);
  assert.deepEqual(shieldHit.combatModifiers, [
    { type: 'armor-bonus', amount: 1, source: 'lane_armor_aura_1', label: '+1 ARM', feedback: 'target' },
  ]);

  const inactiveState = makeState();
  inactiveState.board[6] = unit('player', { id: 'distant-alpha', attack: 1, hp: 2, maxHp: 2, effectId: 'adjacent_allies_atk_plus_1_ignore_armor_1' });
  inactiveState.board[8] = unit('player', { id: 'distant-ally', attack: 1, hp: 2, maxHp: 2 });
  inactiveState.board[2] = unit('enemy', { id: 'target', attack: 0, hp: 3, maxHp: 3, armor: 1 });

  const inactiveHit = resolveCombat(inactiveState).find((event) => event.attackerIndex === 8);
  assert.equal(inactiveHit.damage, 0);
  assert.equal(inactiveHit.combatModifiers, undefined);
});

test('Halberdier, Flanker, Runner, Pierce, Guardian, and Sniper emit combat feedback only on real application', () => {
  const halberdierState = makeState();
  halberdierState.board[6] = unit('player', { id: 'halberdier', attack: 2, hp: 3, maxHp: 3, effectId: 'opposing_lane_atk_plus_1' });
  halberdierState.board[0] = unit('enemy', { id: 'opposed', attack: 0, hp: 4, maxHp: 4 });
  const halberdierHit = resolveCombat(halberdierState).find((event) => event.attackerIndex === 6);
  assert.equal(halberdierHit.damage, 3);
  assert.deepEqual(halberdierHit.combatModifiers, [
    { type: 'attack-bonus', amount: 1, source: 'opposing_lane_atk_plus_1', label: '+1 ATK' },
  ]);

  const flankerState = makeState();
  flankerState.board[7] = unit('player', { id: 'flanker', attack: 2, hp: 3, maxHp: 3, effectId: 'empty_adjacent_bonus_atk' });
  flankerState.board[1] = unit('enemy', { id: 'flanked', attack: 0, hp: 4, maxHp: 4 });
  const flankerHit = resolveCombat(flankerState).find((event) => event.attackerIndex === 7);
  assert.equal(flankerHit.damage, 3);
  assert.deepEqual(flankerHit.combatModifiers, [
    { type: 'attack-bonus', amount: 1, source: 'empty_adjacent_bonus_atk', label: '+1 ATK' },
  ]);

  const runnerState = makeState();
  runnerState.board[6] = unit('player', { id: 'runner', attack: 2, hp: 2, maxHp: 2, effectId: 'lane_empty_bonus_damage' });
  const runnerHit = resolveCombat(runnerState)[0];
  assert.equal(runnerHit.damage, 4);
  assert.deepEqual(runnerHit.combatModifiers, [
    { type: 'attack-bonus', amount: 2, source: 'lane_empty_bonus_damage', label: '+2 ATK' },
  ]);

  const pierceState = makeState();
  const pierceCard = {
    id: 'pierce-strike-test-card',
    name: 'Pierce Strike',
    type: 'order',
    targeting: 'enemy_unit',
    effectId: 'ignore_armor_next_attack',
  };
  pierceState.player.hand.push(pierceCard);
  pierceState.board[0] = unit('enemy', { id: 'pierced', attack: 0, hp: 10, maxHp: 10, armor: 4 });
  pierceState.board[6] = unit('player', { id: 'piercing-attacker', attack: 5, hp: 3, maxHp: 3 });

  const pierceResult = resolveTargetedEffectCard(pierceState, 'player', pierceCard.id, 0);
  assert.equal(pierceResult.ok, true);
  assert.equal(pierceState.board[0].ignoreArmorNext, true);

  const pierceHit = resolveCombat(pierceState).find((event) => event.attackerSide === 'player');
  assert.equal(pierceHit.damage, 5);
  assert.equal(pierceState.board[0].ignoreArmorNext, false);
  assert.deepEqual(pierceHit.combatModifiers, [
    { type: 'armor-ignore', amount: 0, source: 'ignore_armor_next_attack', label: 'IGNORE ARM' },
  ]);

  const normalArmorState = makeState();
  normalArmorState.board[0] = unit('enemy', { id: 'armored', attack: 0, hp: 10, maxHp: 10, armor: 4 });
  normalArmorState.board[6] = unit('player', { id: 'normal-attacker', attack: 5, hp: 3, maxHp: 3 });
  const normalArmorHit = resolveCombat(normalArmorState).find((event) => event.attackerSide === 'player');
  assert.equal(normalArmorHit.damage, 1);
  assert.equal(normalArmorHit.combatModifiers, undefined);

  const guardianState = makeState();
  guardianState.board[0] = unit('enemy', { id: 'attacker', attack: 2, hp: 3, maxHp: 3 });
  guardianState.board[6] = unit('player', { id: 'protected', attack: 0, hp: 3, maxHp: 3 });
  guardianState.board[7] = unit('player', { id: 'guardian', attack: 0, hp: 3, maxHp: 3, effectId: 'intercept_lane_damage' });
  const guardianHit = resolveCombat(guardianState).find((event) => event.attackerSide === 'enemy');
  assert.equal(guardianHit.targetIndex, 7);
  assert.equal(guardianHit.interceptOriginalTargetIndex, 6);
  assert.equal(Object.keys(guardianHit).includes('interceptOriginalTargetIndex'), false);
  assert.deepEqual(guardianHit.combatModifiers, [
    { type: 'intercept', amount: 0, source: 'intercept_lane_damage', label: 'INTERCEPT', feedback: 'target' },
  ]);

  const sniperState = makeState();
  sniperState.board[6] = unit('player', { id: 'sniper', attack: 1, hp: 2, maxHp: 2, effectId: 'can_hit_any_lane' });
  sniperState.board[0] = unit('enemy', { id: 'tough', attack: 0, hp: 5, maxHp: 5 });
  sniperState.board[1] = unit('enemy', { id: 'weak', attack: 0, hp: 2, maxHp: 2 });
  const sniperHit = resolveCombat(sniperState).find((event) => event.attackerIndex === 6);
  assert.equal(sniperHit.targetIndex, 1);
  assert.deepEqual(sniperHit.combatModifiers, [
    { type: 'retarget', amount: 0, source: 'can_hit_any_lane', label: 'LOWEST HP' },
  ]);
});

test('overflow keyword deals only excess armor-mitigated combat damage to defender base', () => {
  const state = makeState();
  state.enemyHP = 12;
  state.board[0] = unit('enemy', { attack: 0, hp: 1, maxHp: 1, armor: 1 });
  state.board[6] = unit('player', {
    id: 'swarm_rusher_1',
    cardId: 'swarm_rusher_1',
    attack: 3,
    hp: 1,
    maxHp: 1,
    combatKeywords: ['overflow'],
  });

  resolveCombat(state);

  assert.equal(state.enemyHP, 11);
  assert.equal(state.board[0], null);
  assert.equal(state.overflowCombatTriggers, 1);
  assert.equal(state.overflowCombatDamage, 1);
  assert.deepEqual(state.overflowCombatTriggersByCardId, { swarm_rusher_1: 1 });
  assert.deepEqual(state.overflowCombatDamageByCardId, { swarm_rusher_1: 1 });
});

test('overflow keyword does not trigger without excess damage, on survivors, or on open lanes', () => {
  const noExcess = makeState();
  noExcess.board[0] = unit('enemy', { attack: 0, hp: 1, maxHp: 1, armor: 1 });
  noExcess.board[6] = unit('player', { attack: 2, hp: 1, maxHp: 1, combatKeywords: ['overflow'] });
  resolveCombat(noExcess);
  assert.equal(noExcess.enemyHP, 12);
  assert.equal(noExcess.overflowCombatTriggers ?? 0, 0);

  const survivor = makeState();
  survivor.board[0] = unit('enemy', { attack: 0, hp: 3, maxHp: 3, armor: 0 });
  survivor.board[6] = unit('player', { attack: 2, hp: 1, maxHp: 1, combatKeywords: ['overflow'] });
  resolveCombat(survivor);
  assert.equal(survivor.enemyHP, 12);
  assert.equal(survivor.board[0].hp, 1);
  assert.equal(survivor.overflowCombatTriggers ?? 0, 0);

  const openLane = makeState();
  openLane.board[6] = unit('player', { attack: 2, hp: 1, maxHp: 1, combatKeywords: ['overflow'] });
  resolveCombat(openLane);
  assert.equal(openLane.enemyHP, 10);
  assert.equal(openLane.overflowCombatTriggers ?? 0, 0);
});
