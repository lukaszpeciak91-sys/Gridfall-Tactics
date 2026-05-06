import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  createInitialBattleState,
  getUnitAttack,
  playEffectCard,
  resolveCombat,
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

test('Alpha is a 1/2 unit with the same adjacent attack aura', () => {
  const swarm = loadFaction('src/data/factions/swarm.json');
  const alpha = swarm.deck.find((card) => card.id === 'swarm_alpha_1');

  assert.equal(alpha.attack, 1);
  assert.equal(alpha.hp, 2);
  assert.equal(alpha.effectId, 'adjacent_allies_atk_plus_1');
  assert.equal(alpha.textShort, 'Adjacent allies +1 ATK.');
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

test('Quick Fix heals a friendly unit and grants +1 temporary attack for combat', () => {
  const aggro = loadFaction('src/data/factions/aggro.json');
  const quickFix = aggro.deck.find((card) => card.id === 'aggro_quick_fix_1');
  const state = createInitialBattleState({ name: 'Test', deck: [] });

  state.player.hand.push({ ...quickFix });
  state.board[6] = unit('player', { attack: 2, hp: 1, maxHp: 3 });

  const result = resolveTargetedEffectCard(state, 'player', quickFix.id, 6, [6]);
  assert.equal(result.ok, true);
  assert.equal(state.board[6].hp, 3);
  assert.equal(state.board[6].tempAttackMod, 1);
  assert.equal(getUnitAttack(state.board[6]), 3);
  assert.equal(quickFix.effectId, 'heal_2_atk_1_this_turn');
  assert.equal(quickFix.targeting, 'friendly_unit');
  assert.equal(quickFix.textShort, 'Heal a unit 2. It gets +1 ATK this turn.');

  resolveCombat(state);

  assert.equal(state.board[6].tempAttackMod, undefined);
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
