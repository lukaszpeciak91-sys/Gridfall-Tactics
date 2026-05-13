import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { getTargetingStateForEffect } from '../src/systems/cardTargeting.js';
import { createInitialBattleState, playOrRedeployUnit } from '../src/systems/GameState.js';

const factionDir = 'src/data/factions';
const factionFiles = ['aggro.json', 'attrition-swarm.json', 'control.json', 'swarm.json', 'tank.json', 'wardens.json'];

const expectedTextShort = new Map(Object.entries({
  aggro_runner_1: 'Open enemy line: +2 hero dmg.',
  aggro_flanker_1: 'If nearby ally slot empty: +1 ATK.',
  aggro_scout_1: 'On play: block enemy unit play here this turn.',
  aggro_rush_1: 'Swap with first adjacent ally; fight that line.',
  aggro_pierce_strike_1: 'Deal 1. Next combat hit ignores its armor.',
  aggro_quick_fix_1: 'Ally: heal 1, +1 ATK this turn. Draw if it kills.',
  control_disruptor_1: 'On play: cancel next enemy effect this turn.',
  control_sniper_1: 'Attacks lowest-HP enemy unit.',
  control_controller_1: 'On play: swap first 2 enemies.',
  control_jam_signal_1: 'Leftmost 2 enemies -1 ATK this turn.',
  control_pulse_wave_1: 'Deal 1 to all enemy units, ignoring ARM.',
  control_system_override_1: 'Target enemy attacks its own hero in next combat, then takes 1 damage.',
  swarm_spitter_1: 'On play: deal 1 to opposing enemy.',
  swarm_brood_1: 'On death: summon 1/1 here.',
  swarm_alpha_1: 'Adjacent allies +1 ATK, ignore 1 ARM.',
  swarm_spawn_1: 'Summon 1/1 in first empty ally slot.',
  swarm_regrow_1: 'Revive first discarded unit at 1 HP.',
  swarm_flood_1: 'Fill up to 2 empty ally slots with temporary 1/1 Tokens.',
  swarm_recycle_1: 'Destroy ally. Draw 1.',
  tank_shieldbearer_1: 'Adjacent allies have +1 ARM in combat.',
  tank_guardian_1: 'Intercepts combat damage for adjacent ally.',
  tank_bruiser_1: 'When damaged and survives: +1 ATK this turn.',
  tank_stability_1: 'Allies can’t be moved/disabled this turn.',
  tank_last_stand_1: 'Allies can’t drop below 1 HP this turn.',
  tank_repair_kit_1: 'Target ally +1 ARM until combat ends.',
  wardens_sentinel_1: 'Enemy attacking this: -1 ATK.',
  wardens_spearwall_1: 'Adjacent allies: attackers -1 ATK.',
  wardens_halberdier_1: 'If opposed: +1 ATK.',
  wardens_brace_1: 'Target ally +1 ARM until combat ends.',
  wardens_shield_push_1: 'Swap leftmost adjacent enemies.',
  wardens_stand_firm_1: 'All allies can’t be moved this turn.',
  wardens_reinforce_line_1: 'Leftmost ally +1 ARM until combat ends.',
  wardens_hold_the_line_1: 'Leftmost 2 allies +1 ARM until combat ends.',
  attrition_swarm_husk_1: 'Combat death: deal 1 to opposing enemy.',
  attrition_swarm_carrier_1: 'Combat death: summon 1/1 here.',
  attrition_swarm_leech_1: 'Combat kill and survive: heal hero 1.',
  attrition_swarm_rotcaller_1: 'First adjacent ally combat death: +1 ATK.',
  attrition_swarm_abomination_1: 'Combat death: both heroes take 1.',
  attrition_swarm_funeral_pyre_1: 'First 2 ally combat deaths deal 1 to opposing enemy.',
  attrition_swarm_infect_1: 'Deal 1 to enemy. If survives, opposite ally +1 ATK.',
  attrition_swarm_feast_1: 'Destroy ally. Draw 1.',
  attrition_swarm_rise_again_1: 'Revive first discarded unit at 1 HP.',
  attrition_swarm_grave_call_1: 'Summon 1/1. If no allies, summon 2.',
}));

function loadFactions() {
  return factionFiles.map((file) => JSON.parse(fs.readFileSync(path.join(factionDir, file), 'utf8')));
}

function allCards() {
  return loadFactions().flatMap((faction) => faction.deck.map((card) => ({ faction, card })));
}

function parseCanonicalRows() {
  const doc = fs.readFileSync('docs/rules/mvp-battle-rules.md', 'utf8');
  return doc.split('\n')
    .filter((line) => line.startsWith('| ') && !line.includes('---'))
    .slice(1)
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
    .map(([faction, card, type, stats, effectId]) => ({ faction, card, type, stats, effectId }));
}

test('MVP faction cards have no cost or duplicated faction fields', () => {
  for (const { card } of allCards()) {
    assert.equal(Object.hasOwn(card, 'cost'), false, `${card.id} must not define cost`);
    assert.equal(Object.hasOwn(card, 'mana'), false, `${card.id} must not define mana`);
    assert.equal(Object.hasOwn(card, 'energy'), false, `${card.id} must not define energy`);
    assert.equal(Object.hasOwn(card, 'faction'), false, `${card.id} inherits faction from its JSON file`);
  }
});

test('visible textShort values match the MVP wording pass', () => {
  const cardsById = new Map(allCards().map(({ card }) => [card.id, card]));
  for (const [id, textShort] of expectedTextShort) {
    assert.equal(cardsById.get(id)?.textShort, textShort, id);
  }
});

test('canonical behavior matrix matches source card faction, type, stats, and effectId', () => {
  const rowsByFactionAndName = new Map(parseCanonicalRows().map((row) => [`${row.faction}:${row.card}`, row]));

  for (const { faction, card } of allCards()) {
    const row = rowsByFactionAndName.get(`${faction.name}:${card.name}`);
    assert.ok(row, `Missing canonical row for ${faction.name}:${card.name}`);
    const expectedStats = card.type === 'unit' ? `${card.attack}/${card.hp}/${card.armor}` : '-';
    assert.equal(row.type, card.type, `${card.id} type`);
    assert.equal(row.stats, expectedStats, `${card.id} stats`);
    assert.equal(row.effectId, String(card.effectId), `${card.id} effectId`);
  }
});

test('Reactive Plating wording avoids immediate-lane-combat cleanup language', () => {
  const reactivePlating = allCards().find(({ card }) => card.id === 'tank_repair_kit_1').card;
  assert.equal(reactivePlating.textShort, 'Target ally +1 ARM until combat ends.');
  assert.doesNotMatch(reactivePlating.textShort, /this combat/i);

  const doc = fs.readFileSync('docs/rules/mvp-battle-rules.md', 'utf8');
  const row = doc.split('\n').find((line) => line.startsWith('| Tank | Reactive Plating |'));
  assert.match(row, /until combat ends/);
  assert.doesNotMatch(row, /this combat/i);
});

test('deterministic effects remain outside manual targeting metadata', () => {
  for (const [effectId, cardId] of [
    ['summon_grunt_empty_slot', 'swarm_spawn_1'],
    ['revive_friendly_1hp', 'swarm_regrow_1'],
    ['fill_empty_slots_0_1', 'swarm_flood_1'],
    ['can_hit_any_lane', 'control_sniper_1'],
    ['enemy_all_atk_minus_1', 'control_jam_signal_1'],
    ['damage_all_enemies_1_ignore_armor', 'control_pulse_wave_1'],
    ['swap_leftmost_adjacent_enemies', 'wardens_shield_push_1'],
    ['leftmost_friendly_temp_armor_1', 'wardens_reinforce_line_1'],
    ['friendly_immovable_this_turn', 'wardens_stand_firm_1'],
    ['leftmost_2_friendly_temp_armor_1', 'wardens_hold_the_line_1'],
    ['funeral_pyre', 'attrition_swarm_funeral_pyre_1'],
    ['revive_friendly_1hp', 'attrition_swarm_rise_again_1'],
    ['grave_call', 'attrition_swarm_grave_call_1'],
  ]) {
    assert.equal(getTargetingStateForEffect(effectId, cardId), null, `${cardId} should not open manual targeting`);
  }
});


test('Controller unit on-play stays deterministic even though its effectId has direct resolver metadata', () => {
  const control = JSON.parse(fs.readFileSync('src/data/factions/control.json', 'utf8'));
  const controller = control.deck.find((card) => card.id === 'control_controller_1');
  const state = createInitialBattleState({ name: 'Control', deck: [] });
  state.player.hand.push({ ...controller });
  state.board[0] = { id: 'enemy-left', name: 'Enemy Left', type: 'unit', owner: 'enemy', attack: 1, hp: 2, maxHp: 2, armor: 0, effectId: null };
  state.board[1] = { id: 'enemy-mid', name: 'Enemy Mid', type: 'unit', owner: 'enemy', attack: 1, hp: 2, maxHp: 2, armor: 0, effectId: null };
  state.board[2] = { id: 'enemy-right', name: 'Enemy Right', type: 'unit', owner: 'enemy', attack: 1, hp: 2, maxHp: 2, armor: 0, effectId: null };

  const result = playOrRedeployUnit(state, 'player', controller.id, 6);

  assert.equal(result.ok, true);
  assert.equal(state.board[0].id, 'enemy-mid');
  assert.equal(state.board[1].id, 'enemy-left');
  assert.equal(state.board[2].id, 'enemy-right');
});


test('battle-end documentation names current stall, mulligan, retry, and tiebreak rules', () => {
  const read = (file) => fs.readFileSync(file, 'utf8');
  const readme = read('README.md');
  const rules = read('docs/rules/mvp-battle-rules.md');
  const historicalSpec = read('docs/battle_mvp_v1.md');
  const decisions = read('docs/project/decisions.md');
  const combined = [readme, rules, historicalSpec, decisions].join('\n');

  assert.match(readme, /Battles end by hero death, no-progress deadlock, or the 50 completed-turn cap/);
  assert.match(rules, /There is no repeated-PASS or 3-pass stall counter/);
  assert.match(rules, /Meaningful Actions for No-Progress Detection/);
  assert.match(rules, /Empty board \+ no meaningful playable cards is a no-progress deadlock/);
  assert.match(rules, /Runner-only edge cases follow these same rules/);
  assert.match(rules, /RETRY.*same player faction key and the same enemy faction key/s);
  assert.match(rules, /EXIT.*starts `FactionSelectScene`/s);
  assert.match(historicalSpec, /Any implication that there is no opening mulligan/);
  assert.match(decisions, /superseded on 2026-05-06 by the Simple Opening Mulligan MVP decision/);

  assert.doesNotMatch(combined, /mulligan remains deferred\/not active in MVP\./);
  assert.doesNotMatch(combined, /Any implication that mulligan is active in MVP\./);
  assert.doesNotMatch(combined, /3x pass/i);
});
