import test from 'node:test';
import assert from 'node:assert/strict';

import { getFactionByKey } from '../src/data/factions/index.js';
import {
  createInitialBattleState,
  playEffectCard,
  playOrRedeployUnit,
  resolveCombat,
  resolveImmediateNoProgressWinner,
  resolveTargetedEffectCard,
} from '../src/systems/GameState.js';
import { chooseBattleAction } from '../src/systems/enemyDecision.js';

const attrition = getFactionByKey('Attrition Swarm');
const swarm = getFactionByKey('Swarm');
const control = getFactionByKey('Control');
const emptyFaction = { name: 'Empty', deck: [] };

function factionCard(faction, id) {
  const found = faction.deck.find((card) => card.id === id);
  assert.ok(found, `missing card ${id}`);
  return { ...found };
}

function unit(id, { owner = 'player', attack = 1, hp = 1, armor = 0, effectId = null, ...metadata } = {}) {
  return {
    id,
    cardId: id,
    name: id,
    type: 'unit',
    owner,
    attack,
    hp,
    maxHp: hp,
    armor,
    effectId,
    ...metadata,
  };
}

function state(playerFaction = attrition, enemyFaction = emptyFaction) {
  return createInitialBattleState(playerFaction, enemyFaction, { firstActor: 'player' });
}

function addHand(stateObj, owner, ...cards) {
  stateObj[owner].hand.push(...cards);
}

function destroyFriendlyWithSyntheticCard(stateObj, boardIndex) {
  addHand(stateObj, 'player', { id: 'synthetic_destroy', type: 'utility', effectId: 'destroy_friendly_draw_1' });
  assert.equal(resolveTargetedEffectCard(stateObj, 'player', 'synthetic_destroy', boardIndex).ok, true);
}

test('a played living unit in discard is archive-only and cannot be revived', () => {
  const s = state();
  const abomination = factionCard(attrition, 'attrition_swarm_abomination_1');
  addHand(s, 'player', abomination);
  assert.equal(playOrRedeployUnit(s, 'player', abomination.id, 6).ok, true);
  assert.deepEqual(s.player.discard.map((card) => card.id), [abomination.id]);
  assert.deepEqual(s.player.fallen, []);

  addHand(s, 'player', factionCard(attrition, 'attrition_swarm_rise_again_1'));
  const result = playEffectCard(s, 'player', 'attrition_swarm_rise_again_1');

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'Effect has no legal deterministic resolution');
  assert.equal(s.board[6].id, abomination.id);
  assert.deepEqual(s.player.discard.map((card) => card.id), [abomination.id]);
});

test('combat death enters fallen and resurrection consumes only that death event at 1 HP', () => {
  const s = state();
  s.board[6] = unit('dead-ally', { hp: 2 });
  s.board[0] = unit('killer', { owner: 'enemy', attack: 2, hp: 3 });
  resolveCombat(s);

  assert.equal(s.board[6], null);
  assert.equal(s.player.fallen.length, 1);
  assert.equal(s.player.fallen[0].card.id, 'dead-ally');
  assert.equal(s.player.fallen[0].reason, 'combat-death');
  assert.equal(s.player.fallen[0].combat, true);

  const archiveBefore = s.player.discard.map((card) => card.id);
  addHand(s, 'player', factionCard(attrition, 'attrition_swarm_rise_again_1'));
  assert.equal(playEffectCard(s, 'player', 'attrition_swarm_rise_again_1').ok, true);
  assert.equal(s.board[6].id, 'dead-ally');
  assert.equal(s.board[6].hp, 1);
  assert.deepEqual(s.player.fallen, []);
  assert.deepEqual(s.player.discard.map((card) => card.id), [...archiveBefore, 'attrition_swarm_rise_again_1']);

  addHand(s, 'player', factionCard(attrition, 'attrition_swarm_rise_again_1'));
  assert.equal(playEffectCard(s, 'player', 'attrition_swarm_rise_again_1').ok, false);
});

test('resurrection is LIFO and consumes only the newest valid fallen entry', () => {
  const s = state();
  s.board[6] = unit('fallen-a');
  destroyFriendlyWithSyntheticCard(s, 6);
  s.board[7] = unit('fallen-b');
  destroyFriendlyWithSyntheticCard(s, 7);
  assert.deepEqual(s.player.fallen.map((entry) => entry.card.id), ['fallen-a', 'fallen-b']);

  addHand(s, 'player', factionCard(attrition, 'attrition_swarm_rise_again_1'));
  assert.equal(playEffectCard(s, 'player', 'attrition_swarm_rise_again_1').ok, true);
  assert.equal(s.board[6].id, 'fallen-b');
  assert.deepEqual(s.player.fallen.map((entry) => entry.card.id), ['fallen-a']);

  addHand(s, 'player', factionCard(attrition, 'attrition_swarm_rise_again_1'));
  assert.equal(playEffectCard(s, 'player', 'attrition_swarm_rise_again_1').ok, true);
  assert.equal(s.board[7].id, 'fallen-a');
  assert.deepEqual(s.player.fallen, []);
});

test('recall and redeploy displacement return persistent units without adding fallen entries', () => {
  const recall = factionCard(control, 'control_recall_1');
  const recalled = state();
  recalled.board[6] = unit('recalled-unit');
  addHand(recalled, 'player', recall);
  assert.equal(resolveTargetedEffectCard(recalled, 'player', recall.id, 6).ok, true);
  assert.deepEqual(recalled.player.fallen, []);

  const redeployed = state();
  redeployed.board[6] = unit('displaced-unit');
  addHand(redeployed, 'player', unit('replacement'));
  assert.equal(playOrRedeployUnit(redeployed, 'player', 'replacement', 6).ok, true);
  assert.deepEqual(redeployed.player.fallen, []);
});

test('non-combat destroy records fallen without firing combat-death-only effects', () => {
  const s = state();
  s.board[6] = unit('carrier', { effectId: 'combat_death_summon_grunt' });
  destroyFriendlyWithSyntheticCard(s, 6);

  assert.equal(s.board[6], null);
  assert.equal(s.player.fallen.length, 1);
  assert.equal(s.player.fallen[0].card.id, 'carrier');
  assert.equal(s.player.fallen[0].reason, 'destroy');
  assert.equal(s.player.fallen[0].combat, false);
  assert.equal(s.combatOnlyDeathSummons ?? 0, 0);
});

test('non-combat lethal damage records fallen without firing combat-death-only effects', () => {
  const s = state();
  s.board[0] = unit('husk', { owner: 'enemy', effectId: 'combat_death_damage_enemy_lane_1' });
  s.board[6] = unit('opposite-ally', { hp: 3 });
  addHand(s, 'player', factionCard(attrition, 'attrition_swarm_infect_1'));
  assert.equal(resolveTargetedEffectCard(s, 'player', 'attrition_swarm_infect_1', 0).ok, true);

  assert.equal(s.board[0], null);
  assert.equal(s.board[6].hp, 3);
  assert.equal(s.enemy.fallen.length, 1);
  assert.equal(s.enemy.fallen[0].card.id, 'husk');
  assert.equal(s.enemy.fallen[0].reason, 'damage-death');
  assert.equal(s.enemy.fallen[0].combat, false);
  assert.equal(s.combatOnlyDeathLaneDamageTriggers ?? 0, 0);
});

test('temporary Flood Tokens never enter fallen when killed or expired', () => {
  const killed = state(swarm);
  addHand(killed, 'player', factionCard(swarm, 'swarm_flood_1'));
  assert.equal(playEffectCard(killed, 'player', 'swarm_flood_1').ok, true);
  killed.board[0] = unit('flood-killer', { owner: 'enemy', attack: 1, hp: 3 });
  resolveCombat(killed);
  assert.deepEqual(killed.player.fallen, []);

  const expired = state(swarm);
  addHand(expired, 'player', factionCard(swarm, 'swarm_flood_1'));
  assert.equal(playEffectCard(expired, 'player', 'swarm_flood_1').ok, true);
  resolveCombat(expired);
  assert.deepEqual(expired.player.fallen, []);
});

test('generated persistent Grunts preserve generated identity and art metadata through fallen resurrection', () => {
  const s = state(swarm);
  addHand(s, 'player', factionCard(swarm, 'swarm_spawn_1'));
  assert.equal(playEffectCard(s, 'player', 'swarm_spawn_1').ok, true);
  const generated = { ...s.board[6] };
  s.board[0] = unit('grunt-killer', { owner: 'enemy', attack: 1, hp: 3 });
  resolveCombat(s);

  assert.equal(s.player.fallen[0].card.id, generated.id);
  assert.equal(s.player.fallen[0].card.artAssetId, generated.artAssetId);
  addHand(s, 'player', factionCard(swarm, 'swarm_regrow_1'));
  assert.equal(playEffectCard(s, 'player', 'swarm_regrow_1').ok, true);
  assert.equal(s.board[6].id, generated.id);
  assert.equal(s.board[6].artAssetId, generated.artAssetId);
  assert.equal(s.board[6].tokenType, generated.tokenType);
  assert.equal(s.board[6].hp, 1);
});

test('dead-game and AI checks do not treat archived living units as resurrection targets', () => {
  const deadGame = state();
  deadGame.playerHP = 5;
  deadGame.enemyHP = 7;
  deadGame.player.hand = [factionCard(attrition, 'attrition_swarm_rise_again_1')];
  deadGame.player.deck = [];
  deadGame.enemy.hand = [];
  deadGame.enemy.deck = [];
  deadGame.player.discard.push(factionCard(attrition, 'attrition_swarm_abomination_1'));
  assert.equal(resolveImmediateNoProgressWinner(deadGame), 'enemy');

  const ai = state(emptyFaction, attrition);
  ai.firstActor = 'enemy';
  ai.enemy.hand = [factionCard(attrition, 'attrition_swarm_rise_again_1')];
  ai.enemy.deck = [];
  ai.enemy.discard.push(factionCard(attrition, 'attrition_swarm_abomination_1'));
  assert.equal(chooseBattleAction(ai, 'enemy').type, 'pass');
});
