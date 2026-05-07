import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  createInitialBattleState,
  getUnitAttack,
  playEffectCard,
  resolveCombat,
  resolveQuickStrike,
  resolveTargetedEffectCard,
} from '../src/systems/GameState.js';

const loadFaction = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));

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


test('Runner remains a 2/1 Aggro unit with +2 open-lane hero damage text', () => {
  const aggro = loadFaction('src/data/factions/aggro.json');
  const runner = aggro.deck.find((card) => card.id === 'aggro_runner_1');

  assert.equal(runner.attack, 2);
  assert.equal(runner.hp, 1);
  assert.equal(runner.armor, 0);
  assert.equal(runner.effectId, 'lane_empty_bonus_damage');
  assert.equal(runner.targeting, 'lane');
  assert.equal(runner.textShort, 'If lane empty: +2 hero dmg.');
});

test('Alpha is a 1/2 unit with the adjacent attack and anti-armor aura', () => {
  const swarm = loadFaction('src/data/factions/swarm.json');
  const alpha = swarm.deck.find((card) => card.id === 'swarm_alpha_1');

  assert.equal(alpha.attack, 1);
  assert.equal(alpha.hp, 2);
  assert.equal(alpha.effectId, 'adjacent_allies_atk_plus_1_ignore_armor_1');
  assert.equal(alpha.textShort, 'Adjacent allies +1 ATK and ignore 1 armor.');
});

test('Alpha still gives adjacent friendly units +1 ATK in combat', () => {
  const state = createInitialBattleState({ name: 'Test', deck: [] });

  state.board[6] = unit('player', { id: 'alpha', name: 'Alpha', attack: 1, hp: 2, maxHp: 2, effectId: 'adjacent_allies_atk_plus_1_ignore_armor_1' });
  state.board[7] = unit('player', { id: 'adjacent', attack: 1, hp: 2, maxHp: 2 });
  state.board[1] = unit('enemy', { id: 'target', attack: 0, hp: 3, maxHp: 3 });

  resolveCombat(state);

  assert.equal(state.board[1].hp, 1);
});

test('Alpha lets adjacent friendly units ignore exactly 1 armor during combat damage', () => {
  const state = createInitialBattleState({ name: 'Test', deck: [] });

  state.board[6] = unit('player', { id: 'alpha', name: 'Alpha', attack: 1, hp: 2, maxHp: 2, effectId: 'adjacent_allies_atk_plus_1_ignore_armor_1' });
  state.board[7] = unit('player', { id: 'adjacent', attack: 1, hp: 2, maxHp: 2 });
  state.board[1] = unit('enemy', { id: 'armored-target', attack: 0, hp: 3, maxHp: 3, armor: 1 });

  resolveCombat(state);

  assert.equal(state.board[1].hp, 1);
});

test('Alpha does not let non-adjacent friendly units ignore armor', () => {
  const state = createInitialBattleState({ name: 'Test', deck: [] });

  state.board[6] = unit('player', { id: 'alpha', name: 'Alpha', attack: 1, hp: 2, maxHp: 2, effectId: 'adjacent_allies_atk_plus_1_ignore_armor_1' });
  state.board[8] = unit('player', { id: 'distant', attack: 2, hp: 2, maxHp: 2 });
  state.board[2] = unit('enemy', { id: 'armored-target', attack: 0, hp: 3, maxHp: 3, armor: 1 });

  resolveCombat(state);

  assert.equal(state.board[2].hp, 2);
});

test('Alpha itself does not ignore armor by default', () => {
  const state = createInitialBattleState({ name: 'Test', deck: [] });

  state.board[6] = unit('player', { id: 'alpha', name: 'Alpha', attack: 1, hp: 2, maxHp: 2, effectId: 'adjacent_allies_atk_plus_1_ignore_armor_1' });
  state.board[0] = unit('enemy', { id: 'armored-target', attack: 0, hp: 3, maxHp: 3, armor: 1 });

  resolveCombat(state);

  assert.equal(state.board[0].hp, 3);
});

test('Alpha aura ignores only 1 armor and remaining armor reduces combat damage', () => {
  const state = createInitialBattleState({ name: 'Test', deck: [] });

  state.board[6] = unit('player', { id: 'alpha', name: 'Alpha', attack: 1, hp: 2, maxHp: 2, effectId: 'adjacent_allies_atk_plus_1_ignore_armor_1' });
  state.board[7] = unit('player', { id: 'adjacent', attack: 1, hp: 2, maxHp: 2 });
  state.board[1] = unit('enemy', { id: 'heavily-armored-target', attack: 0, hp: 3, maxHp: 3, armor: 2 });

  resolveCombat(state);

  assert.equal(state.board[1].hp, 2);
});

test('Flanker is a 2/2 Aggro unit with the same empty-adjacent attack role', () => {
  const aggro = loadFaction('src/data/factions/aggro.json');
  const flanker = aggro.deck.find((card) => card.id === 'aggro_flanker_1');

  assert.equal(flanker.attack, 2);
  assert.equal(flanker.hp, 2);
  assert.equal(flanker.armor, 0);
  assert.equal(flanker.effectId, 'empty_adjacent_bonus_atk');
  assert.equal(flanker.targeting, 'lane');
  assert.equal(flanker.textShort, 'If adjacent slot empty: +1 ATK.');
});


test('Hacker is a 1/1 Control unit with the same lane attack debuff role', () => {
  const control = loadFaction('src/data/factions/control.json');
  const hacker = control.deck.find((card) => card.id === 'control_hacker_1');

  assert.equal(hacker.attack, 1);
  assert.equal(hacker.hp, 1);
  assert.equal(hacker.armor, 0);
  assert.equal(hacker.effectId, 'enemy_lane_atk_minus_1');
  assert.equal(hacker.targeting, 'lane');
  assert.equal(hacker.textShort, 'Enemy in lane -1 ATK this turn.');
});

test('Disruptor is a 1/2 Control unit with the same order-cancel role', () => {
  const control = loadFaction('src/data/factions/control.json');
  const disruptor = control.deck.find((card) => card.id === 'control_disruptor_1');

  assert.equal(disruptor.attack, 1);
  assert.equal(disruptor.hp, 2);
  assert.equal(disruptor.armor, 0);
  assert.equal(disruptor.effectId, 'cancel_enemy_order');
  assert.equal(disruptor.targeting, 'enemy');
  assert.equal(disruptor.textShort, 'Cancel enemy order this turn.');
});

test('Scout is a 2/1 Aggro unit with the same lane-block role', () => {
  const aggro = loadFaction('src/data/factions/aggro.json');
  const scout = aggro.deck.find((card) => card.id === 'aggro_scout_1');

  assert.equal(scout.attack, 2);
  assert.equal(scout.hp, 1);
  assert.equal(scout.armor, 0);
  assert.equal(scout.effectId, 'block_enemy_lane_play_this_turn');
  assert.equal(scout.targeting, 'enemy');
  assert.equal(scout.textShort, "On play: enemy can't play units in this lane this turn.");
});

test('Fortify grants all friendly units +1 temporary armor for combat', () => {
  const tank = loadFaction('src/data/factions/tank.json');
  const fortify = tank.deck.find((card) => card.id === 'tank_fortify_1');
  const state = createInitialBattleState({ name: 'Test', deck: [] });

  state.player.hand.push({ ...fortify });
  state.board[0] = unit('enemy', { attack: 1, hp: 2, maxHp: 2 });
  state.board[6] = unit('player', { attack: 0, hp: 2, maxHp: 2 });

  const result = playEffectCard(state, 'player', fortify.id);
  assert.equal(result.ok, true);
  assert.equal(state.board[6].tempArmorMod, 1);

  resolveCombat(state);

  assert.equal(state.board[6].hp, 2);
  assert.equal(state.board[6].tempArmorMod, undefined);
  assert.equal(fortify.textShort, 'All allies +1 armor this turn.');
});

test('Full Attack grants all Aggro friendly units +2 temporary attack for combat', () => {
  const aggro = loadFaction('src/data/factions/aggro.json');
  const fullAttack = aggro.deck.find((card) => card.id === 'aggro_full_attack_1');
  const state = createInitialBattleState({ name: 'Test', deck: [] });

  state.player.hand.push({ ...fullAttack });
  state.board[6] = unit('player', { attack: 1, hp: 2, maxHp: 2 });
  state.board[7] = unit('player', { attack: 2, hp: 2, maxHp: 2 });

  const result = playEffectCard(state, 'player', fullAttack.id);
  assert.equal(result.ok, true);
  assert.equal(state.board[6].tempAttackMod, 2);
  assert.equal(state.board[7].tempAttackMod, 2);
  assert.equal(fullAttack.effectId, 'aggro_buff_all_atk_2');
  assert.equal(fullAttack.textShort, 'All allies +2 ATK this turn.');

  resolveCombat(state);

  assert.equal(state.board[6].tempAttackMod, undefined);
  assert.equal(state.board[7].tempAttackMod, undefined);
});

test('Quick Fix heals a friendly unit by 1 and grants +1 temporary attack for combat', () => {
  const aggro = loadFaction('src/data/factions/aggro.json');
  const quickFix = aggro.deck.find((card) => card.id === 'aggro_quick_fix_1');
  const state = createInitialBattleState({ name: 'Test', deck: [] });

  state.player.hand.push({ ...quickFix });
  state.board[6] = unit('player', { attack: 2, hp: 1, maxHp: 3 });

  const result = resolveTargetedEffectCard(state, 'player', quickFix.id, 6, [6]);
  assert.equal(result.ok, true);
  assert.equal(state.board[6].hp, 2);
  assert.equal(state.board[6].tempAttackMod, 1);
  assert.equal(getUnitAttack(state.board[6]), 3);
  assert.equal(quickFix.effectId, 'heal_1_atk_1_draw_on_kill_this_turn');
  assert.equal(quickFix.targeting, 'friendly_unit');
  assert.equal(quickFix.textShort, 'Heal a unit 1. +1 ATK this turn. Draw 1 if it destroys a unit.');

  resolveCombat(state);

  assert.equal(state.board[6].tempAttackMod, undefined);
});


test('Quick Fix draws once when the buffed unit destroys an enemy in combat', () => {
  const aggro = loadFaction('src/data/factions/aggro.json');
  const quickFix = aggro.deck.find((card) => card.id === 'aggro_quick_fix_1');
  const state = createInitialBattleState({ name: 'Test', deck: [] });
  const drawCard = { id: 'drawn-card', name: 'Drawn Card', type: 'unit', attack: 1, hp: 1, armor: 0, effectId: null };

  state.player.hand.push({ ...quickFix });
  state.player.deck.push(drawCard);
  state.board[6] = unit('player', { attack: 1, hp: 2, maxHp: 3 });
  state.board[0] = unit('enemy', { attack: 0, hp: 2, maxHp: 2 });

  const result = resolveTargetedEffectCard(state, 'player', quickFix.id, 6, [6]);
  assert.equal(result.ok, true);

  resolveCombat(state);

  assert.equal(state.board[0], null);
  assert.equal(state.player.hand.length, 1);
  assert.equal(state.player.hand[0].id, 'drawn-card');
  assert.equal(state.quickFixTempoDraws, 1);
});


test('Quick Fix draw trigger does not duplicate across immediate and later combat', () => {
  const aggro = loadFaction('src/data/factions/aggro.json');
  const quickFix = aggro.deck.find((card) => card.id === 'aggro_quick_fix_1');
  const state = createInitialBattleState({ name: 'Test', deck: [] });

  state.player.hand.push({ ...quickFix });
  state.player.deck.push(
    { id: 'first-draw', name: 'First Draw', type: 'unit', attack: 1, hp: 1, armor: 0, effectId: null },
    { id: 'second-draw', name: 'Second Draw', type: 'unit', attack: 1, hp: 1, armor: 0, effectId: null },
  );
  state.board[6] = unit('player', { attack: 1, hp: 3, maxHp: 3 });
  state.board[0] = unit('enemy', { attack: 0, hp: 2, maxHp: 2 });

  const quickFixResult = resolveTargetedEffectCard(state, 'player', quickFix.id, 6, [6]);
  assert.equal(quickFixResult.ok, true);
  const quickStrikeResult = resolveQuickStrike(state, 'player', 6);
  assert.equal(quickStrikeResult.ok, true);
  assert.equal(state.player.hand.map((card) => card.id).join(','), 'first-draw');

  state.board[0] = unit('enemy', { attack: 0, hp: 2, maxHp: 2 });
  resolveCombat(state);

  assert.equal(state.player.hand.map((card) => card.id).join(','), 'first-draw');
  assert.equal(state.quickFixTempoDraws, 1);
});

test('Quick Fix does not draw when the buffed unit fails to destroy an enemy', () => {
  const aggro = loadFaction('src/data/factions/aggro.json');
  const quickFix = aggro.deck.find((card) => card.id === 'aggro_quick_fix_1');
  const state = createInitialBattleState({ name: 'Test', deck: [] });

  state.player.hand.push({ ...quickFix });
  state.player.deck.push({ id: 'undrawn-card', name: 'Undrawn Card', type: 'unit', attack: 1, hp: 1, armor: 0, effectId: null });
  state.board[6] = unit('player', { attack: 1, hp: 2, maxHp: 3 });
  state.board[0] = unit('enemy', { attack: 0, hp: 3, maxHp: 3 });

  const result = resolveTargetedEffectCard(state, 'player', quickFix.id, 6, [6]);
  assert.equal(result.ok, true);

  resolveCombat(state);

  assert.equal(state.player.hand.length, 0);
  assert.equal(state.quickFixTempoDraws ?? 0, 0);
});

test('Jam Signal applies -1 temporary attack to up to two enemy units', () => {
  const control = loadFaction('src/data/factions/control.json');
  const jamSignal = control.deck.find((card) => card.id === 'control_jam_signal_1');
  const state = createInitialBattleState({ name: 'Test', deck: [] });

  state.player.hand.push({ ...jamSignal });
  state.board[0] = unit('enemy', { attack: 2, hp: 2, maxHp: 2 });
  state.board[1] = unit('enemy', { attack: 2, hp: 2, maxHp: 2 });
  state.board[2] = unit('enemy', { attack: 2, hp: 2, maxHp: 2 });

  const result = playEffectCard(state, 'player', jamSignal.id);
  assert.equal(result.ok, true);
  assert.equal(state.board[0].tempAttackMod, -1);
  assert.equal(state.board[1].tempAttackMod, -1);
  assert.equal(state.board[2].tempAttackMod, undefined);
  assert.equal(jamSignal.targeting, 'all_enemy_units');
  assert.equal(jamSignal.effectId, 'enemy_all_atk_minus_1');
  assert.equal(jamSignal.textShort, 'Up to 2 enemies -1 ATK this turn.');

  resolveCombat(state);

  assert.equal(state.board[0]?.tempAttackMod, undefined);
  assert.equal(state.board[1]?.tempAttackMod, undefined);
  assert.equal(state.board[2]?.tempAttackMod, undefined);
});


test('Pulse Wave damages only the two leftmost occupied enemy lanes', () => {
  const control = loadFaction('src/data/factions/control.json');
  const pulseWave = control.deck.find((card) => card.id === 'control_pulse_wave_1');
  const state = createInitialBattleState({ name: 'Test', deck: [] });

  state.player.hand.push({ ...pulseWave });
  state.board[0] = unit('enemy', { id: 'left-enemy', hp: 1, maxHp: 1 });
  state.board[1] = unit('enemy', { id: 'middle-enemy', hp: 2, maxHp: 2 });
  state.board[2] = unit('enemy', { id: 'right-enemy', hp: 1, maxHp: 1 });

  const result = playEffectCard(state, 'player', pulseWave.id);

  assert.equal(result.ok, true);
  assert.equal(state.board[0], null);
  assert.equal(state.board[1].hp, 1);
  assert.equal(state.board[2].hp, 1);
  assert.equal(pulseWave.targeting, 'all_enemy_units');
  assert.equal(pulseWave.effectId, 'damage_up_to_2_enemies_1');
  assert.equal(pulseWave.textShort, 'Deal 1 to up to 2 enemies.');
});

test('Pulse Wave skips empty lanes and damages a single enemy if only one exists', () => {
  const control = loadFaction('src/data/factions/control.json');
  const pulseWave = control.deck.find((card) => card.id === 'control_pulse_wave_1');
  const state = createInitialBattleState({ name: 'Test', deck: [] });

  state.player.hand.push({ ...pulseWave });
  state.board[2] = unit('enemy', { id: 'right-only-enemy', hp: 2, maxHp: 2 });

  const result = playEffectCard(state, 'player', pulseWave.id);

  assert.equal(result.ok, true);
  assert.equal(state.board[0], null);
  assert.equal(state.board[1], null);
  assert.equal(state.board[2].hp, 1);
});

test('Swarm Attack remains a +1 temporary attack buff', () => {
  const swarm = loadFaction('src/data/factions/swarm.json');
  const swarmAttack = swarm.deck.find((card) => card.id === 'swarm_swarm_attack_1');
  const state = createInitialBattleState({ name: 'Test', deck: [] });

  state.player.hand.push({ ...swarmAttack });
  state.board[6] = unit('player', { attack: 1, hp: 2, maxHp: 2 });

  const result = playEffectCard(state, 'player', swarmAttack.id);
  assert.equal(result.ok, true);
  assert.equal(state.board[6].tempAttackMod, 1);
  assert.equal(swarmAttack.effectId, 'buff_all_atk_1');
  assert.equal(swarmAttack.textShort, 'All allies +1 ATK this turn.');

  resolveCombat(state);

  assert.equal(state.board[6].tempAttackMod, undefined);
});
