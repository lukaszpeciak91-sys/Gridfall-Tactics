import test from 'node:test';
import assert from 'node:assert/strict';

import fs from 'node:fs';
import {
  createInitialBattleState,
  getEffectiveBoardArmor,
  getCombatPresentationStatsForBoardIndex,
  getEffectiveBoardAttack,
  getUnitAttack,
  resolveTargetedEffectCard,
} from '../src/systems/GameState.js';

const unit = (owner, overrides = {}) => ({
  id: `${owner}-unit`,
  name: 'Test Unit',
  type: 'unit',
  attack: 2,
  hp: 3,
  maxHp: 3,
  armor: 0,
  effectId: null,
  owner,
  ...overrides,
});

const stateWithBoard = () => createInitialBattleState({ name: 'Test', deck: [] });

test('getEffectiveBoardAttack projects Flanker empty-adjacent bonus on and off without temp mutation', () => {
  const state = stateWithBoard();
  state.board[6] = unit('player', { attack: 2, effectId: 'empty_adjacent_bonus_atk' });
  state.board[7] = null;

  assert.equal(getEffectiveBoardAttack(state, 6), 3);
  assert.equal(getUnitAttack(state.board[6]), 2);
  assert.equal(state.board[6].tempAttackMod, undefined);

  state.board[7] = unit('player');
  assert.equal(getEffectiveBoardAttack(state, 6), 2);
  assert.equal(state.board[6].tempAttackMod, undefined);
});

test('getEffectiveBoardAttack projects Ice Pike and Halberdier opposing-lane bonus on and off', () => {
  const state = stateWithBoard();
  state.board[1] = unit('enemy', { attack: 2, effectId: 'opposing_lane_atk_plus_1' });

  assert.equal(getEffectiveBoardAttack(state, 1), 2);

  state.board[7] = unit('player');
  assert.equal(getEffectiveBoardAttack(state, 1), 3);

  state.board[7] = null;
  assert.equal(getEffectiveBoardAttack(state, 1), 2);
});

test('getEffectiveBoardAttack projects Runner open-lane bonus on and off', () => {
  const state = stateWithBoard();
  state.board[6] = unit('player', { attack: 2, effectId: 'lane_empty_bonus_damage' });

  assert.equal(getEffectiveBoardAttack(state, 6), 4);
  assert.equal(getUnitAttack(state.board[6]), 2);

  state.board[0] = unit('enemy');
  assert.equal(getEffectiveBoardAttack(state, 6), 2);
});

test('getEffectiveBoardAttack projects Alpha adjacent aura on and off without ignore-armor ARM math', () => {
  const state = stateWithBoard();
  state.board[6] = unit('player', { attack: 1, effectId: 'adjacent_allies_atk_plus_1_ignore_armor_1' });
  state.board[7] = unit('player', { attack: 2, armor: 2 });

  assert.equal(getEffectiveBoardAttack(state, 7), 3);
  assert.equal(getEffectiveBoardArmor(state, 7), 2);
  assert.equal(state.board[7].tempAttackMod, undefined);

  state.board[6] = null;
  assert.equal(getEffectiveBoardAttack(state, 7), 2);
});

test('getEffectiveBoardArmor projects Shieldbearer adjacent aura on and off without temp mutation', () => {
  const state = stateWithBoard();
  state.board[7] = unit('player', { attack: 0, effectId: 'lane_armor_aura_1' });
  state.board[6] = unit('player', { armor: 1 });

  assert.equal(getEffectiveBoardArmor(state, 6), 2);
  assert.equal(state.board[6].tempArmorMod, undefined);

  state.board[7] = null;
  assert.equal(getEffectiveBoardArmor(state, 6), 1);
});

test('getEffectiveBoardAttack projects Warden friction on attackers based on protected opposing defender', () => {
  const state = stateWithBoard();
  state.board[0] = unit('enemy', { attack: 3 });
  state.board[6] = unit('player', { effectId: 'warden_defensive_friction_self' });

  assert.equal(getEffectiveBoardAttack(state, 0), 2);
  assert.equal(state.board[0].tempAttackMod, undefined);

  state.board[6] = unit('player');
  assert.equal(getEffectiveBoardAttack(state, 0), 3);
});

test('getEffectiveBoardAttack projects Tundra Hunter adjacent Warden friction and caps multiple sources at -1', () => {
  const state = stateWithBoard();
  state.board[1] = unit('enemy', { attack: 3 });
  state.board[7] = unit('player', { effectId: 'warden_defensive_friction_self' });
  state.board[6] = unit('player', { effectId: 'warden_defensive_friction_adjacent' });
  state.board[8] = unit('player', { effectId: 'warden_defensive_friction_adjacent' });

  assert.equal(getEffectiveBoardAttack(state, 1), 2);
  assert.equal(state.board[1].tempAttackMod, undefined);

  state.board[7] = unit('player');
  assert.equal(getEffectiveBoardAttack(state, 1), 2);

  state.board[6] = null;
  state.board[8] = null;
  assert.equal(getEffectiveBoardAttack(state, 1), 3);
});


test('combat presentation stats preserve contextual pre-combat board values for both sides', () => {
  const state = stateWithBoard();
  state.board[1] = unit('enemy', { attack: 2, effectId: 'opposing_lane_atk_plus_1' });
  state.board[2] = unit('enemy', { attack: 4, tempAttackMaxUntilCombat: 2 });
  state.board[6] = unit('player', { attack: 2, effectId: 'lane_empty_bonus_damage', hp: 1, maxHp: 3 });
  state.board[7] = unit('player', { attack: 2, armor: 1, tempArmorMod: 1 });
  state.board[8] = unit('player', { attack: 1, effectId: 'lane_armor_aura_1' });

  assert.deepEqual(getCombatPresentationStatsForBoardIndex(state, 6), {
    attack: 4,
    armor: 0,
    health: 1,
    maxHp: 3,
  });
  assert.deepEqual(getCombatPresentationStatsForBoardIndex(state, 7), {
    attack: 2,
    armor: 3,
    health: 3,
    maxHp: 3,
  });
  assert.deepEqual(getCombatPresentationStatsForBoardIndex(state, 1), {
    attack: 3,
    armor: 0,
    health: 3,
    maxHp: 3,
  });
  assert.deepEqual(getCombatPresentationStatsForBoardIndex(state, 2), {
    attack: 2,
    armor: 0,
    health: 3,
    maxHp: 3,
  });

  const auraState = stateWithBoard();
  auraState.board[6] = unit('player', { attack: 1, effectId: 'adjacent_allies_atk_plus_1_ignore_armor_1' });
  auraState.board[7] = unit('player', { attack: 2 });
  assert.deepEqual(getCombatPresentationStatsForBoardIndex(auraState, 7), {
    attack: 3,
    armor: 0,
    health: 3,
    maxHp: 3,
  });
});

test('Quick Strike immediate combat snapshots carry effective presentation stats without changing damage', () => {
  const state = stateWithBoard();
  const quickStrike = {
    id: 'quick-strike-presentation-test',
    name: 'Quick Strike',
    type: 'special',
    targeting: 'friendly_unit',
    effectId: 'quick_strike',
  };
  state.player.hand.push(quickStrike);
  state.enemyHP = 12;
  state.board[6] = unit('player', { id: 'runner', attack: 2, effectId: 'lane_empty_bonus_damage' });

  const result = resolveTargetedEffectCard(state, 'player', quickStrike.id, 6);

  assert.equal(result.ok, true);
  assert.equal(result.combatEvents[0].damage, 4);
  assert.equal(result.combatSnapshot.board[6].attack, 2);
  assert.deepEqual(result.combatSnapshot.board[6].__presentationStats, {
    attack: 4,
    armor: 0,
    health: 3,
    maxHp: 3,
  });
  assert.equal(state.enemyHP, 8);
  assert.equal(getEffectiveBoardAttack(state, 6), 4);
});

test('System Override immediate combat snapshots preserve enemy-side effective presentation stats', () => {
  const state = stateWithBoard();
  const systemOverride = {
    id: 'system-override-presentation-test',
    name: 'System Override',
    type: 'special',
    targeting: 'enemy_unit',
    effectId: 'control_enemy_unit_this_turn',
  };
  state.player.hand.push(systemOverride);
  state.board[0] = unit('enemy', { id: 'enemy-capped', attack: 4, tempAttackSetToZeroUntilCombat: true });

  const result = resolveTargetedEffectCard(state, 'player', systemOverride.id, 0);

  assert.equal(result.ok, true);
  assert.equal(result.combatEvents[0].damage, 0);
  assert.equal(result.combatSnapshot.board[0].attack, 4);
  assert.deepEqual(result.combatSnapshot.board[0].__presentationStats, {
    attack: 0,
    armor: 0,
    health: 3,
    maxHp: 3,
  });
  assert.equal(state.board[0].hp, 2);
});

test('BattleScene.getBoardUnitStats and render snapshots use effective board helpers', () => {
  const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
  const getBoardUnitStatsSource = source.slice(
    source.indexOf('  getBoardUnitStats('),
    source.indexOf('  getBoardUnitBaseStats('),
  );
  const snapshotSource = source.slice(
    source.indexOf('  createBoardRenderStatSnapshot()'),
    source.indexOf('  getChangedBoardUnitStatKeys('),
  );

  assert.match(source, /getEffectiveBoardAttack, getEffectiveBoardArmor, getCombatPresentationStatsForBoardIndex/);
  assert.match(getBoardUnitStatsSource, /unit\.__presentationStats/);
  assert.match(getBoardUnitStatsSource, /getEffectiveBoardAttack\(this\.gameState, effectiveBoardIndex\)/);
  assert.match(getBoardUnitStatsSource, /getEffectiveBoardArmor\(this\.gameState, effectiveBoardIndex\)/);
  assert.match(snapshotSource, /getEffectiveBoardAttack\(this\.gameState, index\)/);
  assert.match(snapshotSource, /getEffectiveBoardArmor\(this\.gameState, index\)/);
});
