import test from 'node:test';
import assert from 'node:assert/strict';

import { getFactionByKey, getFactionKeys } from '../src/data/factions/index.js';
import { getTargetingStateForEffect } from '../src/systems/cardTargeting.js';
import {
  createInitialBattleState,
  drawCards,
  getUnitArmor,
  getUnitAttack,
  playEffectCard,
  playOrRedeployUnit,
  resolveCombat,
  resolveTargetedEffectCard,
} from '../src/systems/GameState.js';
import { chooseBattleAction } from '../src/systems/enemyDecision.js';

const faction = getFactionByKey('Attrition Swarm');
const baseSwarm = getFactionByKey('Swarm');
const emptyFaction = { name: 'Empty', deck: [] };

function card(id) {
  const found = faction.deck.find((item) => item.id === id);
  assert.ok(found, `missing card ${id}`);
  return { ...found };
}

function swarmCard(id) {
  const found = baseSwarm.deck.find((item) => item.id === id);
  assert.ok(found, `missing card ${id}`);
  return { ...found };
}

function state() {
  return createInitialBattleState(faction, faction, { firstActor: 'player' });
}

function unit({ owner = 'player', id = 'unit', attack = 1, hp = 1, armor = 0, effectId = null, name = id }) {
  return { id, cardId: id, name, type: 'unit', owner, attack, hp, maxHp: hp, armor, effectId };
}

function addHand(stateObj, owner, ...cards) {
  const side = owner === 'player' ? stateObj.player : stateObj.enemy;
  side.hand.push(...cards);
}

test('Attrition Swarm faction exists, is selectable, has exactly 10 no-cost cards', () => {
  assert.ok(getFactionKeys().includes('Attrition Swarm'));
  assert.equal(faction.deck.length, 10);
  faction.deck.forEach((item) => {
    assert.equal(Object.hasOwn(item, 'cost'), false, item.id);
    assert.equal(Object.hasOwn(item, 'mana'), false, item.id);
    assert.equal(Object.hasOwn(item, 'energy'), false, item.id);
  });
});

test('Husk deals combat-only lane damage with no hero fallback, and not from draw-only Feast', () => {
  const combat = state();
  combat.board[6] = unit({ id: 'husk', effectId: 'combat_death_damage_enemy_lane_1' });
  combat.board[0] = unit({ owner: 'enemy', id: 'killer', attack: 1, hp: 3 });
  resolveCombat(combat);
  assert.equal(combat.enemyHP, 12);
  assert.equal(combat.board[0]?.hp, 1);

  const killLane = state();
  killLane.board[6] = unit({ id: 'husk', effectId: 'combat_death_damage_enemy_lane_1' });
  killLane.board[0] = unit({ owner: 'enemy', id: 'killer', attack: 1, hp: 1 });
  resolveCombat(killLane);
  assert.equal(killLane.board[0], null);
  assert.equal(killLane.enemyHP, 12);

  const emptyLane = state();
  emptyLane.board[6] = unit({ id: 'husk', attack: 0, hp: 0, effectId: 'combat_death_damage_enemy_lane_1' });
  resolveCombat(emptyLane);
  assert.equal(emptyLane.enemyHP, 12);

  const feast = state();
  feast.board[6] = unit({ id: 'husk', effectId: 'combat_death_damage_enemy_lane_1' });
  addHand(feast, 'player', card('attrition_swarm_feast_1'));
  feast.player.deck = [unit({ id: 'draw-a' }), unit({ id: 'draw-b' })];
  const result = playEffectCard(feast, 'player', 'attrition_swarm_feast_1');
  assert.equal(result.ok, true);
  assert.equal(feast.enemyHP, 12);
  assert.equal(feast.board[6]?.id, 'husk');
  assert.equal(feast.player.hand.length, 1);
  assert.equal(feast.player.deck.length, 1);
});

test('Carrier summons only on combat death and preserves owner', () => {
  const combat = state();
  combat.board[6] = unit({ id: 'carrier', hp: 1, effectId: 'combat_death_summon_grunt' });
  combat.board[0] = unit({ owner: 'enemy', id: 'killer', attack: 1, hp: 2 });
  resolveCombat(combat);
  assert.equal(combat.board[6]?.owner, 'player');
  assert.equal(combat.board[6]?.attack, 1);
  assert.equal(combat.board[6]?.hp, 1);

  const feast = state();
  feast.board[6] = unit({ id: 'carrier', effectId: 'combat_death_summon_grunt' });
  feast.player.deck = [unit({ id: 'draw-a' })];
  addHand(feast, 'player', card('attrition_swarm_feast_1'));
  playEffectCard(feast, 'player', 'attrition_swarm_feast_1');
  assert.equal(feast.board[6]?.id, 'carrier');
});

test('Abomination damages both heroes only on combat death', () => {
  const combat = state();
  combat.board[6] = unit({ id: 'abomination', hp: 1, effectId: 'combat_death_damage_both_heroes_1' });
  combat.board[0] = unit({ owner: 'enemy', id: 'killer', attack: 1, hp: 4 });
  resolveCombat(combat);
  assert.equal(combat.playerHP, 11);
  assert.equal(combat.enemyHP, 11);

  const feast = state();
  feast.board[6] = unit({ id: 'abomination', effectId: 'combat_death_damage_both_heroes_1' });
  feast.player.deck = [unit({ id: 'draw-a' })];
  addHand(feast, 'player', card('attrition_swarm_feast_1'));
  playEffectCard(feast, 'player', 'attrition_swarm_feast_1');
  assert.equal(feast.playerHP, 12);
  assert.equal(feast.enemyHP, 12);
});

test('Funeral Pyre deals capped lane-only damage, cleans defeated units, does not stack, and clears', () => {
  const noDeath = state();
  addHand(noDeath, 'player', card('attrition_swarm_funeral_pyre_1'));
  assert.equal(playEffectCard(noDeath, 'player', 'attrition_swarm_funeral_pyre_1').ok, true);
  resolveCombat(noDeath);
  assert.equal(noDeath.enemyHP, 12);

  const oneDeath = state();
  oneDeath.board[6] = unit({ id: 'one', attack: 0 });
  oneDeath.board[0] = unit({ owner: 'enemy', id: 'killer', attack: 1, hp: 2 });
  addHand(oneDeath, 'player', card('attrition_swarm_funeral_pyre_1'));
  playEffectCard(oneDeath, 'player', 'attrition_swarm_funeral_pyre_1');
  resolveCombat(oneDeath);
  assert.equal(oneDeath.enemyHP, 12);
  assert.equal(oneDeath.board[0]?.hp, 1);

  const cleanup = state();
  cleanup.board[6] = unit({ id: 'cleanup-victim', attack: 0 });
  cleanup.board[0] = unit({ owner: 'enemy', id: 'cleanup-killer', attack: 1, hp: 1 });
  addHand(cleanup, 'player', card('attrition_swarm_funeral_pyre_1'));
  playEffectCard(cleanup, 'player', 'attrition_swarm_funeral_pyre_1');
  resolveCombat(cleanup);
  assert.equal(cleanup.board[0], null, 'Funeral Pyre lane damage uses normal defeated-unit cleanup');
  assert.equal(cleanup.enemyHP, 12);

  const emptyLane = state();
  emptyLane.board[6] = unit({ id: 'empty-lane-victim', attack: 0, hp: 0 });
  addHand(emptyLane, 'player', card('attrition_swarm_funeral_pyre_1'));
  playEffectCard(emptyLane, 'player', 'attrition_swarm_funeral_pyre_1');
  resolveCombat(emptyLane);
  assert.equal(emptyLane.enemyHP, 12, 'Funeral Pyre has no empty-lane hero fallback');

  const capped = state();
  [6, 7, 8].forEach((index, lane) => {
    capped.board[index] = unit({ id: `ally-${lane}`, attack: 0 });
    capped.board[lane] = unit({ owner: 'enemy', id: `enemy-${lane}`, attack: 1, hp: 3 });
  });
  addHand(capped, 'player', card('attrition_swarm_funeral_pyre_1'), card('attrition_swarm_funeral_pyre_1'));
  playEffectCard(capped, 'player', 'attrition_swarm_funeral_pyre_1');
  playEffectCard(capped, 'player', 'attrition_swarm_funeral_pyre_1');
  resolveCombat(capped);
  assert.equal(capped.enemyHP, 12);
  assert.equal(capped.board[0]?.hp, 2);
  assert.equal(capped.board[1]?.hp, 2);
  assert.equal(capped.board[2]?.hp, 3, 'third allied death is above the cap');
  assert.equal(capped.funeralPyreThisCombat, undefined);

  capped.board[6] = unit({ id: 'later', attack: 0 });
  capped.board[0] = unit({ owner: 'enemy', id: 'later-killer', attack: 1, hp: 2 });
  resolveCombat(capped);
  assert.equal(capped.board[0]?.hp, 2, 'pyre cleared before the next combat');
});

test('Feast is draw-only utility with no target, sacrifice, base damage, or death trigger', () => {
  const feast = state();
  feast.board[6] = unit({ id: 'victim' });
  feast.board[0] = unit({ owner: 'enemy', id: 'enemy-unit' });
  addHand(feast, 'player', card('attrition_swarm_funeral_pyre_1'), card('attrition_swarm_feast_1'));
  feast.player.deck = [unit({ id: 'draw-a' }), unit({ id: 'draw-b' })];
  playEffectCard(feast, 'player', 'attrition_swarm_funeral_pyre_1');
  const feastResult = playEffectCard(feast, 'player', 'attrition_swarm_feast_1');
  assert.equal(feastResult.ok, true);
  assert.equal(resolveTargetedEffectCard(feast, 'player', 'attrition_swarm_feast_1', 6).ok, false);
  assert.equal(feast.board[6]?.id, 'victim');
  assert.equal(feast.board[0]?.id, 'enemy-unit');
  assert.equal(feast.player.hand.length, 1);
  assert.equal(feast.player.deck.length, 1);
  assert.equal(feast.player.discard.some((item) => item.id === 'attrition_swarm_feast_1'), true);
  assert.equal(feast.playerHP, 12);
  assert.equal(feast.enemyHP, 12);

  const infect = state();
  infect.board[0] = unit({ owner: 'enemy', id: 'target', hp: 1 });
  addHand(infect, 'enemy', card('attrition_swarm_funeral_pyre_1'));
  addHand(infect, 'player', card('attrition_swarm_infect_1'));
  playEffectCard(infect, 'enemy', 'attrition_swarm_funeral_pyre_1');
  resolveTargetedEffectCard(infect, 'player', 'attrition_swarm_infect_1', 0);
  assert.equal(infect.playerHP, 12);
});

test('Funeral Pyre lane damage does not count as hero damage for simultaneous lethal', () => {
  const s = state();
  s.playerHP = 1;
  s.enemyHP = 1;
  s.board[6] = unit({ id: 'victim', attack: 0 });
  s.board[0] = unit({ owner: 'enemy', id: 'killer', attack: 1, hp: 2 });
  s.board[1] = unit({ owner: 'enemy', id: 'open', attack: 1, hp: 2 });
  addHand(s, 'player', card('attrition_swarm_funeral_pyre_1'));
  playEffectCard(s, 'player', 'attrition_swarm_funeral_pyre_1');
  resolveCombat(s);
  assert.equal(s.enemyHP, 1);
  assert.equal(s.board[0]?.hp, 1);
  assert.equal(s.heroDeathResolution.simultaneousLethal, false);
  assert.equal(s.winner, 'enemy');
});

test('Leech heals owner hero on every combat attack, capped by max HP', () => {
  const noKill = state();
  noKill.playerHP = 10;
  noKill.board[6] = unit({ id: 'leech', attack: 1, hp: 2, effectId: 'leech_heal_hero_on_attack' });
  noKill.board[0] = unit({ owner: 'enemy', id: 'large', attack: 0, hp: 2 });
  const noKillEvents = resolveCombat(noKill);
  assert.equal(noKill.playerHP, 11);
  assert.equal(noKill.board[0]?.hp, 1);
  assert.equal(noKillEvents.some((event) => event.healFeedback?.targetType === 'hero' && event.healFeedback.amount === 1), true);

  const dies = state();
  dies.playerHP = 10;
  dies.board[6] = unit({ id: 'leech', attack: 2, hp: 1, effectId: 'leech_heal_hero_on_attack' });
  dies.board[0] = unit({ owner: 'enemy', id: 'trade', attack: 1, hp: 1 });
  const diesEvents = resolveCombat(dies);
  assert.equal(dies.playerHP, 11);
  assert.equal(dies.board[6], null);
  assert.equal(diesEvents.some((event) => event.healFeedback?.targetType === 'hero' && event.healFeedback.amount === 1), true);

  const openLane = state();
  openLane.playerHP = 10;
  openLane.board[6] = unit({ id: 'leech', attack: 2, hp: 1, effectId: 'leech_heal_hero_on_attack' });
  const openLaneEvents = resolveCombat(openLane);
  assert.equal(openLane.playerHP, 11);
  assert.equal(openLane.enemyHP, 10);
  assert.equal(openLaneEvents.some((event) => event.targetType === 'hero' && event.healFeedback?.amount === 1), true);

  const capped = state();
  capped.playerHP = 12;
  capped.board[6] = unit({ id: 'leech', attack: 2, hp: 2, effectId: 'leech_heal_hero_on_attack' });
  capped.board[0] = unit({ owner: 'enemy', id: 'prey', attack: 0, hp: 1 });
  const cappedEvents = resolveCombat(capped);
  assert.equal(capped.playerHP, 12);
  assert.equal(cappedEvents.some((event) => event.healFeedback), false);
});

test('Rotcaller gets capped temporary attack from first adjacent ally combat death only', () => {
  const adjacent = state();
  adjacent.board[6] = unit({ id: 'left-victim', attack: 0 });
  adjacent.board[7] = unit({ id: 'rotcaller', attack: 1, hp: 2, effectId: 'rotcaller_adjacent_death_atk_1' });
  adjacent.board[0] = unit({ owner: 'enemy', id: 'left-killer', attack: 1, hp: 2 });
  adjacent.board[1] = unit({ owner: 'enemy', id: 'rot-prey', attack: 0, hp: 2 });
  resolveCombat(adjacent);
  assert.equal(adjacent.board[1], null, 'Rotcaller used +1 ATK before its lane resolved');
  assert.equal(adjacent.board[7]?.tempAttackMod, undefined, 'temporary ATK clears after combat');

  const nonAdjacent = state();
  nonAdjacent.board[6] = unit({ id: 'far-victim', attack: 0 });
  nonAdjacent.board[8] = unit({ id: 'rotcaller', attack: 1, hp: 2, effectId: 'rotcaller_adjacent_death_atk_1' });
  nonAdjacent.board[0] = unit({ owner: 'enemy', id: 'far-killer', attack: 1, hp: 2 });
  nonAdjacent.board[2] = unit({ owner: 'enemy', id: 'survivor', attack: 0, hp: 2 });
  resolveCombat(nonAdjacent);
  assert.equal(nonAdjacent.board[2]?.hp, 1);

  const capped = state();
  capped.board[6] = unit({ id: 'left-victim', attack: 0 });
  capped.board[7] = unit({ id: 'rotcaller', attack: 1, hp: 2, effectId: 'rotcaller_adjacent_death_atk_1' });
  capped.board[8] = unit({ id: 'right-victim', attack: 0 });
  capped.board[0] = unit({ owner: 'enemy', id: 'left-killer', attack: 1, hp: 2 });
  capped.board[1] = unit({ owner: 'enemy', id: 'rot-blocker', attack: 0, hp: 3 });
  capped.board[2] = unit({ owner: 'enemy', id: 'right-killer', attack: 1, hp: 2 });
  resolveCombat(capped);
  assert.equal(capped.board[1]?.hp, 1, 'Rotcaller gained exactly +1 ATK, not +2');
});

test('Infect targets enemies, deals 1, buffs opposite ally on survivor, and never damages heroes', () => {
  const s = state();
  s.board[0] = unit({ owner: 'enemy', id: 'enemy', hp: 3, armor: 1 });
  s.board[6] = unit({ owner: 'player', id: 'friendly', attack: 1, hp: 3, armor: 1 });
  addHand(s, 'player', card('attrition_swarm_infect_1'));
  assert.equal(resolveTargetedEffectCard(s, 'player', 'attrition_swarm_infect_1', 6).ok, false);
  const hit = resolveTargetedEffectCard(s, 'player', 'attrition_swarm_infect_1', 0);
  assert.equal(hit.ok, true);
  assert.equal(s.board[0].owner, 'enemy');
  assert.equal(s.board[0].hp, 2);
  assert.equal(s.board[0].tempArmorMod, undefined);
  assert.equal(getUnitArmor(s.board[0]), 1);
  assert.equal(s.board[6].tempAttackMod, 1);
  assert.equal(getUnitAttack(s.board[6]), 2);
  assert.equal(s.enemyHP, 12);
  assert.equal(s.playerHP, 12);

  s.board[0].attack = 0;
  resolveCombat(s);
  assert.equal(s.board[6]?.tempAttackMod, undefined);

  const noOpposite = state();
  noOpposite.board[1] = unit({ owner: 'enemy', id: 'enemy', hp: 3 });
  addHand(noOpposite, 'player', card('attrition_swarm_infect_1'));
  assert.equal(resolveTargetedEffectCard(noOpposite, 'player', 'attrition_swarm_infect_1', 1).ok, true);
  assert.equal(noOpposite.board[7], null);

  const kill = state();
  kill.board[0] = unit({ owner: 'enemy', id: 'enemy', hp: 1, armor: 2 });
  kill.board[6] = unit({ owner: 'player', id: 'friendly', attack: 1 });
  addHand(kill, 'enemy', card('attrition_swarm_funeral_pyre_1'));
  addHand(kill, 'player', card('attrition_swarm_infect_1'));
  playEffectCard(kill, 'enemy', 'attrition_swarm_funeral_pyre_1');
  const result = resolveTargetedEffectCard(kill, 'player', 'attrition_swarm_infect_1', 0);
  assert.equal(result.ok, true);
  assert.equal(kill.board[0], null, 'dead Infect targets are cleaned up without an ATK buff');
  assert.equal(kill.board[6].tempAttackMod, undefined);
  assert.equal(kill.enemyHP, 12);
  assert.equal(kill.playerHP, 12);

  const enemyCast = state();
  enemyCast.board[0] = unit({ owner: 'enemy', id: 'enemy-friendly', attack: 1 });
  enemyCast.board[6] = unit({ owner: 'player', id: 'player-target', hp: 3, armor: 1 });
  addHand(enemyCast, 'enemy', card('attrition_swarm_infect_1'));
  const enemyResult = resolveTargetedEffectCard(enemyCast, 'enemy', 'attrition_swarm_infect_1', 6);
  assert.equal(enemyResult.ok, true);
  assert.equal(enemyCast.board[6].owner, 'player');
  assert.equal(enemyCast.board[6].hp, 2);
  assert.equal(enemyCast.board[0].owner, 'enemy');
  assert.equal(enemyCast.board[0].tempAttackMod, 1);
  assert.equal(resolveTargetedEffectCard(enemyCast, 'enemy', 'missing', 0).ok, false);
});

test('Rise Again and Grave Call are deterministic and preserve owner integrity', () => {
  const revive = state();
  revive.player.fallen.push({
    card: card('attrition_swarm_abomination_1'),
    sequence: 1,
    reason: 'combat-death',
    combat: true,
  });
  addHand(revive, 'player', card('attrition_swarm_rise_again_1'));
  const reviveResult = playEffectCard(revive, 'player', 'attrition_swarm_rise_again_1');
  assert.equal(reviveResult.ok, true);
  assert.equal(revive.board[6].name, 'Abomination');
  assert.equal(revive.board[6].hp, 1);
  assert.equal(revive.board[6].owner, 'player');

  const one = state();
  one.board[6] = unit({ id: 'ally' });
  addHand(one, 'player', card('attrition_swarm_grave_call_1'));
  assert.equal(playEffectCard(one, 'player', 'attrition_swarm_grave_call_1').ok, true);
  assert.equal(one.board[7]?.owner, 'player');
  assert.equal(one.board[8], null);

  const two = state();
  addHand(two, 'enemy', card('attrition_swarm_grave_call_1'));
  assert.equal(playEffectCard(two, 'enemy', 'attrition_swarm_grave_call_1').ok, true);
  assert.equal(two.board[0]?.owner, 'enemy');
  assert.equal(two.board[1]?.owner, 'enemy');
  assert.equal(two.board[2], null);

  const full = state();
  [6, 7, 8].forEach((index) => { full.board[index] = unit({ id: `ally-${index}` }); });
  addHand(full, 'player', card('attrition_swarm_grave_call_1'));
  assert.equal(playEffectCard(full, 'player', 'attrition_swarm_grave_call_1').ok, false);
});

test('Attrition Swarm UI targeting metadata matches resolver expectations', () => {
  assert.equal(getTargetingStateForEffect('funeral_pyre', 'attrition_swarm_funeral_pyre_1'), null);
  assert.equal(getTargetingStateForEffect('revive_friendly_1hp', 'attrition_swarm_rise_again_1'), null);
  assert.equal(getTargetingStateForEffect('grave_call', 'attrition_swarm_grave_call_1'), null);
  assert.deepEqual(getTargetingStateForEffect('infect_damage_1_opposite_ally_atk_1', 'attrition_swarm_infect_1'), {
    cardId: 'attrition_swarm_infect_1',
    targetType: 'enemy-unit',
    requiredTargets: 1,
    targetIndexes: [],
  });
  assert.equal(getTargetingStateForEffect('draw_1', 'attrition_swarm_feast_1'), null);
});

test('Base Swarm Substrate applies temporary enemy armor debuff without draw or sacrifice', () => {
  const s = state();
  const substrate = getFactionByKey('Swarm').deck.find((item) => item.id === 'swarm_recycle_1');
  s.board[0] = unit({ owner: 'enemy', id: 'substrate-target', armor: 1 });
  s.board[6] = unit({ owner: 'player', id: 'substrate-ally' });
  addHand(s, 'player', substrate);

  const result = playEffectCard(s, 'player', 'swarm_recycle_1');

  assert.equal(result.ok, true);
  assert.equal(s.board[0].tempArmorMod, -1);
  assert.equal(s.board[6].id, 'substrate-ally');
  assert.equal(s.player.hand.length, 0);
  assert.equal(s.player.fallen.length, 0);
  assert.equal(substrate.targeting, 'none');
  assert.equal(substrate.effectId, 'enemy_all_armor_minus_1');
});

test('AI handles Attrition Swarm legal action constraints and Funeral Pyre valuation', () => {
  const noDeaths = createInitialBattleState(emptyFaction, faction, { firstActor: 'enemy' });
  noDeaths.enemy.hand.push(card('attrition_swarm_funeral_pyre_1'), card('attrition_swarm_grave_call_1'));
  const noDeathAction = chooseBattleAction(noDeaths, 'enemy');
  assert.equal(noDeathAction.cardId, 'attrition_swarm_grave_call_1');

  const twoDeaths = createInitialBattleState(emptyFaction, faction, { firstActor: 'enemy' });
  twoDeaths.enemy.hand.push(card('attrition_swarm_funeral_pyre_1'), card('attrition_swarm_grave_call_1'));
  twoDeaths.board[0] = unit({ owner: 'enemy', id: 'a', attack: 0 });
  twoDeaths.board[1] = unit({ owner: 'enemy', id: 'b', attack: 0 });
  twoDeaths.board[2] = unit({ owner: 'enemy', id: 'c', attack: 1, hp: 2 });
  twoDeaths.board[6] = unit({ owner: 'player', id: 'ka', attack: 1, hp: 2 });
  twoDeaths.board[7] = unit({ owner: 'player', id: 'kb', attack: 1, hp: 2 });
  const pyreAction = chooseBattleAction(twoDeaths, 'enemy');
  assert.equal(pyreAction.cardId, 'attrition_swarm_funeral_pyre_1');
  assert.equal(pyreAction.aiEvaluation.likelyDeaths, 2);

  const noGrave = createInitialBattleState(emptyFaction, faction, { firstActor: 'enemy' });
  noGrave.enemy.hand.push(card('attrition_swarm_grave_call_1'));
  [0, 1, 2].forEach((index) => { noGrave.board[index] = unit({ owner: 'enemy', id: `full-${index}` }); });
  assert.notEqual(chooseBattleAction(noGrave, 'enemy').cardId, 'attrition_swarm_grave_call_1');

  const noRise = createInitialBattleState(emptyFaction, faction, { firstActor: 'enemy' });
  noRise.enemy.hand.push(card('attrition_swarm_rise_again_1'));
  assert.notEqual(chooseBattleAction(noRise, 'enemy').cardId, 'attrition_swarm_rise_again_1');

  const infectTarget = createInitialBattleState(emptyFaction, faction, { firstActor: 'enemy' });
  infectTarget.enemy.hand.push(card('attrition_swarm_infect_1'));
  infectTarget.board[6] = unit({ owner: 'player', id: 'infect-ai-target', hp: 3, armor: 1 });
  const infectAction = chooseBattleAction(infectTarget, 'enemy');
  assert.equal(infectAction.cardId, 'attrition_swarm_infect_1');
  assert.equal(infectAction.targetIndex, 6);
  assert.equal(resolveTargetedEffectCard(infectTarget, 'enemy', infectAction.cardId, infectAction.targetIndex).ok, true);
});
