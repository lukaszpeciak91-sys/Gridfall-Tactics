import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { getFactionByKey, getFactionKeys } from '../src/data/factions/index.js';
import { getTargetingStateForEffect } from '../src/systems/cardTargeting.js';
import { createInitialBattleState, playOrRedeployUnit, resolveTargetedUnitOnPlayEffect } from '../src/systems/GameState.js';
import { getCardPresentationName } from '../src/data/presentation/factionPresentation.js';

const expectedTextShort = new Map(Object.entries({
  aggro_runner_1: 'Open line: enemy base loses 2 HP.',
  aggro_flanker_1: 'Empty adjacent [ALLY] slot: +1 ATK.',
  aggro_scout_1: 'On play: block this lane this turn.',
  aggro_rush_1: 'Swap with adjacent [ALLY], then fight immediately.',
  aggro_pierce_strike_1: 'Deal 1. Next combat hit ignores ARM.',
  aggro_quick_fix_1: 'Target [ALLY]: heal 1, +1 ATK this turn. Draw if it kills.',
  control_disruptor_1: "On play: cancel the opponent's next effect.",
  control_sniper_1: 'Attacks the lowest-HP [ENEMY].',
  control_controller_1: 'On play: swap two [ENEMIES].',
  control_jam_signal_1: 'Choose up to 2 [ENEMIES]: -1 ATK this turn.',
  control_pulse_wave_1: 'Deal 1 to all [ENEMIES], ignoring ARM.',
  control_system_override_1: '[ENEMY] attacks own base, then loses 1 HP.',
  swarm_spitter_1: 'On play: deal 1 to opposed [ENEMY].',
  swarm_brood_1: 'On death: summon 1/1 here.',
  swarm_alpha_1: 'Adjacent [ALLY] +1 ATK, ignore 1 ARM.',
  swarm_spawn_1: 'Summon 1/1 in an empty [ALLY] slot.',
  swarm_regrow_1: 'Revive the newest fallen unit at 1 HP.',
  swarm_flood_1: 'Fill up to 2 empty [ALLY] slots with temporary 1/1s.',
  swarm_recycle_1: 'Destroy [ALLY]. Draw 1.',
  tank_shieldbearer_1: 'Adjacent [ALLY] +1 ARM in combat.',
  tank_guardian_1: 'Takes combat damage for adjacent [ALLY].',
  tank_bruiser_1: 'Survives damage: +1 ATK this turn.',
  tank_stability_1: 'All [ALLY] cannot be moved or disabled this turn.',
  tank_last_stand_1: "[ALLY] can't drop below 1 HP this turn.",
  tank_repair_kit_1: 'Target [ALLY] +1 ARM until combat ends.',
  wardens_sentinel_1: 'Attackers: -1 ATK.',
  wardens_spearwall_1: 'Attackers of adjacent [ALLIES]: -1 ATK.',
  wardens_halberdier_1: 'If opposed: +1 ATK.',
  wardens_brace_1: 'Target [ALLY] +1 ARM until combat ends.',
  wardens_shield_push_1: 'Swap two adjacent [ENEMIES].',
  wardens_stand_firm_1: "All [ALLY] can't be moved this turn.",
  wardens_reinforce_line_1: 'Adjacent [ALLY] +1 ARM until combat ends.',
  wardens_hold_the_line_1: 'Adjacent [ALLY] +1 ARM until combat ends.',
  attrition_swarm_husk_1: 'Combat death: deal 1 to opposed [ENEMY].',
  attrition_swarm_carrier_1: 'Combat death: summon 1/1 here.',
  attrition_swarm_leech_1: 'On attack: heal your base 1.',
  attrition_swarm_rotcaller_1: 'First adjacent [ALLY] combat death: +1 ATK.',
  attrition_swarm_abomination_1: 'Combat death: both bases lose 1 HP.',
  attrition_swarm_funeral_pyre_1: 'First 2 [ALLY]\ncombat deaths:\n1 HP to opposed [ENEMY].',
  attrition_swarm_infect_1: 'Deal 1 to [ENEMY]. If it survives, opposed [ALLY] +1 ATK.',
  attrition_swarm_feast_1: 'Destroy [ALLY]. Draw 1.',
  attrition_swarm_rise_again_1: 'Revive the newest fallen unit at 1 HP.',
  attrition_swarm_grave_call_1: 'Summon 1/1. If no [ALLY], summon 2.',
}));

function loadFactions() {
  return getFactionKeys().map((factionKey) => getFactionByKey(factionKey));
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

test('MVP faction card ids are unique across source decks', () => {
  const ids = allCards().map(({ card }) => card.id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);

  assert.deepEqual(duplicateIds, []);
});


test('MVP faction cards have stable internal art asset ids decoupled from deck order', () => {
  for (const faction of loadFactions()) {
    const cardNumbers = new Set();

    faction.deck.forEach((card) => {
      assert.equal(typeof card.cardNumber, 'number', `${card.id} cardNumber must be numeric`);
      assert.equal(Number.isFinite(card.cardNumber), true, `${card.id} cardNumber must be finite`);
      assert.equal(Number.isInteger(card.cardNumber), true, `${card.id} cardNumber must be an integer`);
      assert.ok(card.cardNumber > 0, `${card.id} cardNumber must be positive`);
      assert.equal(cardNumbers.has(card.cardNumber), false, `${card.id} cardNumber must be unique within ${faction.id}`);
      cardNumbers.add(card.cardNumber);

      const twoDigitCardNumber = String(card.cardNumber).padStart(2, '0');
      assert.equal(card.artAssetId, `${faction.id}_${twoDigitCardNumber}`, `${card.id} artAssetId`);
    });
  }
});

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

test('all source cards have exactly one English and Polish localization entry', () => {
  const sourceIds = allCards().map(({ card }) => card.id).sort();

  for (const locale of ['en', 'pl']) {
    const translations = JSON.parse(fs.readFileSync(`src/localization/translations/${locale}.json`, 'utf8'));
    const localizedIds = Object.keys(translations.cards ?? {}).sort();
    assert.deepEqual(localizedIds, sourceIds, `${locale} localization card ids`);

    for (const cardId of sourceIds) {
      assert.equal(typeof translations.cards[cardId].name, 'string', `${locale} name for ${cardId}`);
      assert.equal(typeof translations.cards[cardId].textShort, 'string', `${locale} textShort for ${cardId}`);
    }
  }
});

test('Wardens vanilla units keep visually empty text boxes', () => {
  const cardsById = new Map(allCards().map(({ card }) => [card.id, card]));
  for (const id of ['wardens_bastion_guard_1', 'wardens_watch_captain_1']) {
    assert.equal(cardsById.get(id)?.textShort, '', `${id} source text`);
    for (const locale of ['en', 'pl']) {
      const translations = JSON.parse(fs.readFileSync(`src/localization/translations/${locale}.json`, 'utf8'));
      assert.equal(translations.cards[id].textShort, '', `${id} ${locale} localized text`);
    }
  }
});

test('canonical behavior matrix has exactly one row per source card', () => {
  const rows = parseCanonicalRows();
  const rowKeys = rows.map((row) => `${row.faction}:${row.card}`);
  const duplicateRows = rowKeys.filter((key, index) => rowKeys.indexOf(key) !== index);

  assert.deepEqual(duplicateRows, []);
  assert.equal(rows.length, allCards().length);
});

test('canonical behavior matrix matches source card faction, type, stats, and effectId', () => {
  const rowsByFactionAndName = new Map(parseCanonicalRows().map((row) => [`${row.faction}:${row.card}`, row]));

  for (const { faction, card } of allCards()) {
    const gameplayKey = `${faction.name}:${card.name}`;
    const presentationKey = `${faction.name}:${getCardPresentationName(card, 'en')}`;
    const row = rowsByFactionAndName.get(gameplayKey) ?? rowsByFactionAndName.get(presentationKey);
    assert.ok(row, `Missing canonical row for ${gameplayKey}`);
    const expectedStats = card.type === 'unit' ? `${card.attack}/${card.hp}/${card.armor}` : '-';
    assert.equal(row.type, card.type, `${card.id} type`);
    assert.equal(row.stats, expectedStats, `${card.id} stats`);
    assert.equal(row.effectId, String(card.effectId), `${card.id} effectId`);
  }
});

test('Reactive Plating wording avoids immediate-lane-combat cleanup language', () => {
  const reactivePlating = allCards().find(({ card }) => card.id === 'tank_repair_kit_1').card;
  assert.equal(reactivePlating.textShort, 'Target [ALLY] +1 ARM until combat ends.');
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
    ['damage_all_enemies_1_ignore_armor', 'control_pulse_wave_1'],
    ['adjacent_allies_temp_armor_1', 'wardens_reinforce_line_1'],
    ['friendly_immovable_this_turn', 'wardens_stand_firm_1'],
    ['adjacent_allies_temp_armor_1', 'wardens_hold_the_line_1'],
    ['funeral_pyre', 'attrition_swarm_funeral_pyre_1'],
    ['revive_friendly_1hp', 'attrition_swarm_rise_again_1'],
    ['grave_call', 'attrition_swarm_grave_call_1'],
  ]) {
    assert.equal(getTargetingStateForEffect(effectId, cardId), null, `${cardId} should not open manual targeting`);
  }
});

test('Controller unit on-play waits for manual enemy targets before swapping', () => {
  const control = JSON.parse(fs.readFileSync('src/data/factions/control.json', 'utf8'));
  const controller = control.deck.find((card) => card.id === 'control_controller_1');
  const state = createInitialBattleState({ name: 'Control', deck: [] });
  state.player.hand.push({ ...controller });
  state.board[0] = { id: 'enemy-left', name: 'Enemy Left', type: 'unit', owner: 'enemy', attack: 1, hp: 2, maxHp: 2, armor: 0, effectId: null };
  state.board[1] = { id: 'enemy-mid', name: 'Enemy Mid', type: 'unit', owner: 'enemy', attack: 1, hp: 2, maxHp: 2, armor: 0, effectId: null };
  state.board[2] = { id: 'enemy-right', name: 'Enemy Right', type: 'unit', owner: 'enemy', attack: 1, hp: 2, maxHp: 2, armor: 0, effectId: null };

  const result = playOrRedeployUnit(state, 'player', controller.id, 6);

  assert.equal(result.ok, true);
  assert.equal(state.board[6].cardId, 'control_controller_1');
  assert.equal(state.board[0].id, 'enemy-left');
  assert.equal(state.board[1].id, 'enemy-mid');

  const targeted = resolveTargetedUnitOnPlayEffect(state, 'player', 6, [0, 2]);
  assert.equal(targeted.ok, true);
  assert.equal(state.board[0].id, 'enemy-right');
  assert.equal(state.board[2].id, 'enemy-left');
});

test('battle-end documentation names current stall, mulligan, retry, and tiebreak rules', () => {
  const read = (file) => fs.readFileSync(file, 'utf8');
  const readme = read('README.md');
  const rules = read('docs/rules/mvp-battle-rules.md');
  const historicalSpec = read('docs/battle_mvp_v1.md');
  const decisions = read('docs/project/decisions.md');
  const combined = [readme, rules, historicalSpec, decisions].join('\n');

  assert.match(readme, /Battles end by base defeat, no-progress deadlock, or the 24-completed-turn fallback cap/);
  assert.match(rules, /There is no repeated-PASS or 3-pass stall counter/);
  assert.match(rules, /Meaningful Actions for No-Progress Detection/);
  assert.match(rules, /A board state with no realistic outcome-changing path is a no-progress deadlock/);
  assert.match(rules, /Runner-only edge cases follow these same rules/);
  assert.match(rules, /RETRY.*same player faction key and the same enemy faction key/s);
  assert.match(rules, /EXIT.*starts `FactionSelectScene`/s);
  assert.match(historicalSpec, /Any implication that there is no opening mulligan/);
  assert.match(decisions, /superseded on 2026-05-06 by the Simple Opening Mulligan MVP decision/);

  assert.doesNotMatch(combined, /mulligan remains deferred\/not active in MVP\./);
  assert.doesNotMatch(combined, /Any implication that mulligan is active in MVP\./);
  assert.doesNotMatch(combined, /3x pass/i);
});
