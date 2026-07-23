import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialBattleState,
  playEffectCard,
  playOrRedeployUnit,
  resolveCombat,
  resolveTargetedEffectCard,
} from '../src/systems/GameState.js';

const empty = { id: 'empty', name: 'Empty', deck: [] };

function state() {
  return createInitialBattleState(empty, empty, { firstActor: 'player' });
}

function unit(id, owner = 'player', attack = 0, hp = 1, effectId = null, extra = {}) {
  return { id, cardId: id, name: id, type: 'unit', owner, attack, hp, maxHp: hp, armor: 0, effectId, ...extra };
}

function card(id, effectId, type = 'order', targeting = 'enemy_unit') {
  return { id, name: id, type, effectId, targeting };
}

function addHand(s, owner, item) {
  s[owner].hand.push(item);
  return item.id;
}

function playPyre(s, owner) {
  const id = addHand(s, owner, card(`${owner}_pyre_${s[owner].hand.length}`, 'funeral_pyre', 'order', 'none'));
  assert.equal(playEffectCard(s, owner, id).ok, true);
}

function quickStrike(s, index, owner = 'player') {
  const id = addHand(s, owner, card(`${owner}_quick_${index}`, 'quick_strike', 'special', 'friendly_unit'));
  return resolveTargetedEffectCard(s, owner, id, index, [index]);
}

function infect(s, targetIndex, owner = 'enemy') {
  const id = addHand(s, owner, card(`${owner}_infect_${targetIndex}`, 'infect_damage_1_opposite_ally_atk_1'));
  return resolveTargetedEffectCard(s, owner, id, targetIndex, [targetIndex]);
}

function systemOverride(s, targetIndex, owner = 'player') {
  const id = addHand(s, owner, card(`${owner}_system_${targetIndex}`, 'control_enemy_unit_this_turn', 'special', 'enemy_unit'));
  return resolveTargetedEffectCard(s, owner, id, targetIndex, [targetIndex]);
}

const deathEffects = [
  {
    name: 'Carrier',
    effectId: 'combat_death_summon_grunt',
    assertTriggered(s, owner, index) {
      assert.equal(s[owner].fallen.at(-1).card.id, `${this.name}-victim`);
      assert.equal(s.board[index]?.owner, owner);
      assert.equal(s.board[index]?.name, 'Grunt');
      assert.equal(s.deathSummons, 1);
      assert.equal(s.combatOnlyDeathSummons, 1);
    },
  },
  {
    name: 'Husk',
    effectId: 'combat_death_damage_enemy_lane_1',
    assertTriggered(s, owner, index) {
      const targetIndex = owner === 'player' ? index - 6 : index + 6;
      assert.equal(s.board[targetIndex], null);
      assert.equal(s.deathWaveDiagnostics.some((wave) => wave.indexes.includes(index)), true);
      assert.equal(s.deathWaveDiagnostics.some((wave) => wave.indexes.includes(targetIndex)), true);
      assert.equal(s.deathLaneDamageTriggers, 1);
      assert.equal(s.combatOnlyDeathLaneDamageTriggers, 1);
    },
  },
  {
    name: 'Abomination',
    effectId: 'combat_death_damage_both_heroes_1',
    assertTriggered(s) {
      assert.equal(s.playerHP, 0);
      assert.equal(s.enemyHP, 0);
      assert.equal(s.winner, 'draw');
      assert.equal(s.deathHeroTriggers, 1);
      assert.equal(s.combatOnlyDeathHeroTriggers, 1);
    },
    lowBases: true,
  },
];

const sources = {
  standard(effect) {
    const s = state();
    if (effect.lowBases) { s.playerHP = 1; s.enemyHP = 1; }
    s.board[6] = unit(`${effect.name}-victim`, 'player', 0, 1, effect.effectId);
    s.board[0] = unit('standard-killer', 'enemy', 1, effect.name === 'Husk' ? 1 : 3);
    resolveCombat(s);
    effect.assertTriggered(s, 'player', 6);
  },
  immediate(effect) {
    const s = state();
    if (effect.lowBases) { s.playerHP = 1; s.enemyHP = 1; }
    s.board[6] = unit(`${effect.name}-victim`, 'player', 0, 1, effect.effectId);
    s.board[0] = unit('immediate-killer', 'enemy', 1, effect.name === 'Husk' ? 1 : 3);
    assert.equal(quickStrike(s, 6).ok, true);
    effect.assertTriggered(s, 'player', 6);
  },
  direct(effect) {
    const s = state();
    if (effect.lowBases) { s.playerHP = 1; s.enemyHP = 1; }
    s.board[6] = unit(`${effect.name}-victim`, 'player', 0, 1, effect.effectId);
    if (effect.name === 'Husk') s.board[0] = unit('husk-lane-target', 'enemy', 0, 1);
    assert.equal(infect(s, 6).ok, true);
    effect.assertTriggered(s, 'player', 6);
  },
  systemOverride(effect) {
    const s = state();
    if (effect.lowBases) { s.playerHP = 1; s.enemyHP = 1; }
    s.board[0] = unit(`${effect.name}-victim`, 'enemy', 1, 1, effect.effectId);
    if (effect.name === 'Husk') s.board[6] = unit('husk-lane-target', 'player', 0, 1);
    assert.equal(systemOverride(s, 0).ok, true);
    effect.assertTriggered(s, 'enemy', 0);
  },
};

function setupDecayDeathEffect(effect) {
  const s = state();
  if (effect.lowBases) { s.playerHP = 1; s.enemyHP = 1; }
  s.board[6] = unit(`${effect.name}-victim`, 'player', 1, 1, effect.effectId, { decayHpAfterCombat: true });
  if (effect.name === 'Husk') s.board[0] = unit('husk-lane-target', 'enemy', 0, 2);
  return s;
}

test('universal HP-death source matrix covers dying-unit-owned effects', () => {
  for (const effect of deathEffects) {
    for (const sourceName of ['standard', 'immediate', 'direct', 'systemOverride']) {
      sources[sourceName](effect);
    }

    const decayState = setupDecayDeathEffect(effect);
    resolveCombat(decayState);
    effect.assertTriggered(decayState, 'player', 6);

    const triggerState = state();
    if (effect.lowBases) { triggerState.playerHP = 1; triggerState.enemyHP = 1; }
    triggerState.board[6] = unit('trigger-husk', 'player', 0, 1, 'combat_death_damage_enemy_lane_1');
    triggerState.board[0] = unit(`${effect.name}-victim`, 'enemy', 1, 1, effect.effectId);
    if (effect.name === 'Husk') triggerState.board[6].effectId = 'death_damage_enemy_lane_1';
    assert.equal(quickStrike(triggerState, 6).ok, true);
    effect.assertTriggered(triggerState, 'enemy', 0);
  }
});

test('universal HP-death source matrix covers surviving allied observers', () => {
  const run = (sourceName) => {
    const s = state();
    if (sourceName === 'systemOverride' || sourceName === 'trigger') {
      s.board[0] = unit('observer-victim', 'enemy', 1, 1);
      s.board[1] = unit('rot', 'enemy', 1, 2, 'rotcaller_adjacent_death_atk_1');
      playPyre(s, 'enemy');
      if (sourceName === 'systemOverride') systemOverride(s, 0);
      else {
        s.board[6] = unit('trigger-husk', 'player', 0, 1, 'combat_death_damage_enemy_lane_1');
        quickStrike(s, 6);
      }
      assert.equal(s.board[1].attack, 2);
    } else {
      s.board[6] = unit('observer-victim', 'player', sourceName === 'decay' ? 1 : 0, 1, sourceName === 'decay' ? 'decay_hp_after_combat' : null);
      s.board[7] = unit('rot', 'player', 1, 2, 'rotcaller_adjacent_death_atk_1');
      playPyre(s, 'player');
      if (sourceName === 'standard' || sourceName === 'decay') {
        s.board[0] = unit('killer', 'enemy', sourceName === 'standard' ? 1 : 0, 3);
        resolveCombat(s);
      } else if (sourceName === 'immediate') {
        s.board[0] = unit('killer', 'enemy', 1, 3);
        quickStrike(s, 6);
      } else if (sourceName === 'direct') infect(s, 6);
      assert.equal(s.board[7].attack, 2);
    }
    assert.equal(s.rotcallerCombatTriggers, 1);
    assert.equal(s.funeralPyreCombatTriggers, 1);
  };

  ['standard', 'immediate', 'direct', 'systemOverride', 'decay', 'trigger'].forEach(run);
});

test('Brood and Control Drone remain universal HP-death effects', () => {
  const brood = state();
  brood.board[6] = unit('brood', 'player', 0, 1, 'on_death_summon_grunt');
  assert.equal(infect(brood, 6).ok, true);
  assert.equal(brood.board[6]?.name, 'Grunt');

  const drone = state();
  drone.board[6] = unit('drone', 'player', 0, 1, 'death_damage_enemy_hero_1');
  assert.equal(infect(drone, 6).ok, true);
  assert.equal(drone.enemyHP, 11);
});

test('canonical universal death aliases preserve legacy death behavior', () => {
  const carrier = state();
  carrier.board[6] = unit('carrier', 'player', 0, 1, 'death_summon_grunt');
  assert.equal(infect(carrier, 6).ok, true);
  assert.equal(carrier.board[6]?.name, 'Grunt');

  const husk = state();
  husk.board[6] = unit('husk', 'player', 0, 1, 'death_damage_enemy_lane_1');
  husk.board[0] = unit('lane-target', 'enemy', 0, 1);
  assert.equal(infect(husk, 6).ok, true);
  assert.equal(husk.board[0], null);

  const abomination = state();
  abomination.playerHP = 1;
  abomination.enemyHP = 1;
  abomination.board[6] = unit('abomination', 'player', 0, 1, 'death_damage_both_heroes_1');
  assert.equal(infect(abomination, 6).ok, true);
  assert.equal(abomination.winner, 'draw');
});

test('multiple Stos instances each react once per turn to non-combat HP death', () => {
  const s = state();
  s.board[6] = unit('victim', 'player', 0, 1);
  playPyre(s, 'player');
  playPyre(s, 'player');

  assert.equal(infect(s, 6).ok, true);

  assert.equal(s.funeralPyreCombatTriggers, 2);
  assert.equal(s.funeralPyreBaseDamage, 2);
  assert.equal(s.funeralPyreThisCombat.player.triggers, 2);
  assert.equal(s.enemyHP, 10);
});

test('Husk direct-effect lethal creates later child wave for lane damage deaths', () => {
  const s = state();
  s.board[6] = unit('husk', 'player', 0, 1, 'combat_death_damage_enemy_lane_1');
  s.board[0] = unit('lane-target', 'enemy', 0, 1);

  assert.equal(infect(s, 6).ok, true);

  assert.deepEqual(s.deathWaveDiagnostics.map((wave) => wave.indexes), [[6], [0]]);
  assert.equal(s.deathLaneDamageTriggers, 1);
});

test('Carrier same-slot summon is preserved for direct-effect and decay lethal HP deaths', () => {
  const direct = state();
  direct.board[6] = unit('carrier', 'player', 0, 1, 'combat_death_summon_grunt');
  assert.equal(infect(direct, 6).ok, true);
  assert.equal(direct.board[6]?.name, 'Grunt');

  const decay = state();
  decay.board[6] = unit('carrier', 'player', 1, 1, 'combat_death_summon_grunt', { decayHpAfterCombat: true });
  decay.board[0] = unit('wall', 'enemy', 0, 3);
  resolveCombat(decay);
  assert.equal(decay.board[6]?.name, 'Grunt');
});

test('dead observers, explicit destroy, return, redeploy, and Flood expiry remain non-scope', () => {
  const sameWave = state();
  sameWave.board[6] = unit('victim', 'player', 0, 1);
  sameWave.board[7] = unit('dead-rot', 'player', 0, 1, 'rotcaller_adjacent_death_atk_1');
  sameWave.board[0] = unit('k0', 'enemy', 1, 3);
  sameWave.board[1] = unit('k1', 'enemy', 1, 3);
  resolveCombat(sameWave);
  assert.equal(sameWave.rotcallerCombatTriggers ?? 0, 0);

  const destroy = state();
  destroy.board[6] = unit('carrier', 'player', 0, 1, 'combat_death_summon_grunt');
  addHand(destroy, 'player', card('destroy', 'destroy_friendly_draw_1', 'utility', 'friendly_unit'));
  assert.equal(resolveTargetedEffectCard(destroy, 'player', 'destroy', 6).ok, true);
  assert.equal(destroy.board[6], null);
  assert.equal(destroy.deathSummons ?? 0, 0);

  const returned = state();
  returned.board[6] = unit('carrier', 'player', 0, 1, 'combat_death_summon_grunt');
  addHand(returned, 'player', card('recall', 'return_friendly_draw_1', 'utility', 'friendly_unit'));
  assert.equal(resolveTargetedEffectCard(returned, 'player', 'recall', 6).ok, true);
  assert.equal(returned.deathSummons ?? 0, 0);

  const redeploy = state();
  redeploy.board[6] = unit('carrier', 'player', 0, 1, 'combat_death_summon_grunt');
  addHand(redeploy, 'player', unit('replacement', 'player', 1, 1));
  assert.equal(playOrRedeployUnit(redeploy, 'player', 'replacement', 6).ok, true);
  assert.equal(redeploy.deathSummons ?? 0, 0);

  const flood = state();
  flood.board[6] = unit('flood', 'player', 1, 1, 'combat_death_summon_grunt', { temporaryFloodToken: true });
  flood.board[0] = unit('wall', 'enemy', 0, 3);
  resolveCombat(flood);
  assert.equal(flood.board[6], null);
  assert.equal(flood.deathSummons ?? 0, 0);
  assert.deepEqual(flood.player.fallen, []);
});
