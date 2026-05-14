import test from 'node:test';
import assert from 'node:assert/strict';

import wardens from '../src/data/factions/wardens.json' with { type: 'json' };
import { getFactionByKey, getFactionKeys } from '../src/data/factions/index.js';
import { getTargetingStateForEffect } from '../src/systems/cardTargeting.js';
import {
  createInitialBattleState,
  playEffectCard,
  playOrRedeployUnit,
  resolveCombat,
  resolveTargetedEffectCard,
} from '../src/systems/GameState.js';
import { chooseBattleAction } from '../src/systems/enemyDecision.js';

function unit({ id, owner, attack = 1, hp = 3, armor = 0, effectId = null }) {
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
  };
}

function card(id) {
  return wardens.deck.find((item) => item.id === id);
}

function createWardensState() {
  return createInitialBattleState(wardens, wardens, { firstActor: 'player' });
}

test('Wardens faction is registered and selectable with exactly 10 cards', () => {
  assert.equal(getFactionByKey('Wardens')?.name, 'Wardens');
  assert.equal(getFactionByKey('Wardens')?.deck.length, 10);
  assert.equal(wardens.deck.length, 10);
  assert.ok(getFactionKeys().includes('Wardens'));
});

test('Shield Push swaps only the leftmost adjacent enemy pair and preserves side ownership', () => {
  const state = createWardensState();
  state.player.hand.push({ ...card('wardens_shield_push_1') });
  state.board[0] = unit({ id: 'enemy-left', owner: 'enemy' });
  state.board[1] = unit({ id: 'enemy-mid', owner: 'enemy' });
  state.board[2] = unit({ id: 'enemy-right', owner: 'enemy' });
  state.board[6] = unit({ id: 'player-left', owner: 'player' });

  const result = playEffectCard(state, 'player', 'wardens_shield_push_1');

  assert.equal(result.ok, true);
  assert.equal(state.board[0].id, 'enemy-mid');
  assert.equal(state.board[1].id, 'enemy-left');
  assert.equal(state.board[2].id, 'enemy-right');
  assert.equal(state.board[6].id, 'player-left');
  assert.deepEqual(state.board.map((u) => u?.owner ?? null), ['enemy', 'enemy', 'enemy', null, null, null, 'player', null, null]);
});

test('Shield Push is rejected without an adjacent enemy pair and does not discard', () => {
  const state = createWardensState();
  state.player.hand.push({ ...card('wardens_shield_push_1') });
  state.board[0] = unit({ id: 'enemy-left', owner: 'enemy' });
  state.board[2] = unit({ id: 'enemy-right', owner: 'enemy' });

  const result = playEffectCard(state, 'player', 'wardens_shield_push_1');

  assert.equal(result.ok, false);
  assert.equal(state.player.hand.length, 1);
  assert.equal(state.player.discard.length, 0);
});

test('Wardens unit summon, placement, and redeploy remain owner-correct', () => {
  const state = createWardensState();
  state.player.hand.push({ ...card('wardens_sentinel_1') }, { ...card('wardens_bastion_guard_1') });

  assert.equal(playOrRedeployUnit(state, 'player', 'wardens_sentinel_1', 6).ok, true);
  assert.equal(state.board[6].owner, 'player');
  assert.equal(playOrRedeployUnit(state, 'player', 'wardens_bastion_guard_1', 6).ok, true);
  assert.equal(state.board[6].owner, 'player');
  assert.equal(state.player.hand.find((item) => item.id === 'wardens_sentinel_1')?.owner, undefined);
});

test('Sentinel reduces incoming attacker ATK by 1 during combat only against itself', () => {
  const state = createWardensState();
  state.board[0] = unit({ id: 'attacker', owner: 'enemy', attack: 2, hp: 3 });
  state.board[6] = unit({ id: 'sentinel', owner: 'player', attack: 0, hp: 3, effectId: 'warden_defensive_friction_self' });
  resolveCombat(state);
  assert.equal(state.board[6].hp, 2);

  const otherState = createWardensState();
  otherState.board[0] = unit({ id: 'attacker', owner: 'enemy', attack: 2, hp: 3 });
  otherState.board[6] = unit({ id: 'ally', owner: 'player', attack: 0, hp: 3 });
  otherState.board[7] = unit({ id: 'sentinel', owner: 'player', attack: 0, hp: 3, effectId: 'warden_defensive_friction_self' });
  resolveCombat(otherState);
  assert.equal(otherState.board[6].hp, 1);
});

test('Spearwall protects adjacent allies only', () => {
  const adjacent = createWardensState();
  adjacent.board[0] = unit({ id: 'attacker', owner: 'enemy', attack: 2, hp: 3 });
  adjacent.board[6] = unit({ id: 'ally', owner: 'player', attack: 0, hp: 3 });
  adjacent.board[7] = unit({ id: 'spearwall', owner: 'player', attack: 0, hp: 3, effectId: 'warden_defensive_friction_adjacent' });
  resolveCombat(adjacent);
  assert.equal(adjacent.board[6].hp, 2);

  const nonAdjacent = createWardensState();
  nonAdjacent.board[0] = unit({ id: 'attacker', owner: 'enemy', attack: 2, hp: 3 });
  nonAdjacent.board[6] = unit({ id: 'ally', owner: 'player', attack: 0, hp: 3 });
  nonAdjacent.board[8] = unit({ id: 'spearwall', owner: 'player', attack: 0, hp: 3, effectId: 'warden_defensive_friction_adjacent' });
  resolveCombat(nonAdjacent);
  assert.equal(nonAdjacent.board[6].hp, 1);
});

test('Multiple Wardens friction effects are capped at -1 total', () => {
  const state = createWardensState();
  state.board[0] = unit({ id: 'attacker', owner: 'enemy', attack: 3, hp: 3 });
  state.board[6] = unit({ id: 'sentinel', owner: 'player', attack: 0, hp: 5, effectId: 'warden_defensive_friction_self' });
  state.board[7] = unit({ id: 'spearwall', owner: 'player', attack: 0, hp: 3, effectId: 'warden_defensive_friction_adjacent' });
  resolveCombat(state);
  assert.equal(state.board[6].hp, 3);
});

test('Halberdier gets +1 ATK only when opposing lane has enemy', () => {
  const blocked = createWardensState();
  blocked.board[0] = unit({ id: 'enemy', owner: 'enemy', attack: 0, hp: 4 });
  blocked.board[6] = unit({ id: 'halberdier', owner: 'player', attack: 2, hp: 3, effectId: 'opposing_lane_atk_plus_1' });
  resolveCombat(blocked);
  assert.equal(blocked.board[0].hp, 1);

  const open = createWardensState();
  open.board[6] = unit({ id: 'halberdier', owner: 'player', attack: 2, hp: 3, effectId: 'opposing_lane_atk_plus_1' });
  resolveCombat(open);
  assert.equal(open.enemyHP, 10);
});

test('Brace, Reinforce Line, and Hold The Line grant adjacent temporary armor that cleans up after combat', () => {
  const state = createWardensState();
  state.player.hand.push({ ...card('wardens_brace_1') }, { ...card('wardens_reinforce_line_1') }, { ...card('wardens_hold_the_line_1') });
  state.board[6] = unit({ id: 'left', owner: 'player', attack: 0, hp: 3 });
  state.board[7] = unit({ id: 'mid', owner: 'player', attack: 0, hp: 3 });
  state.board[8] = unit({ id: 'right', owner: 'player', attack: 0, hp: 3 });

  assert.equal(resolveTargetedEffectCard(state, 'player', 'wardens_brace_1', 7).ok, true);
  assert.equal(state.board[7].tempArmorMod, 1);
  assert.equal(playEffectCard(state, 'player', 'wardens_reinforce_line_1').ok, true);
  assert.equal(state.board[6].tempArmorMod, 1);
  assert.equal(state.board[7].tempArmorMod, 2);
  assert.equal(state.board[8].tempArmorMod, 1);
  assert.equal(playEffectCard(state, 'player', 'wardens_hold_the_line_1').ok, true);
  assert.equal(state.board[6].tempArmorMod, 2);
  assert.equal(state.board[7].tempArmorMod, 3);
  assert.equal(state.board[8].tempArmorMod, 2);

  resolveCombat(state);
  assert.equal(state.board[6].tempArmorMod, undefined);
  assert.equal(state.board[7].tempArmorMod, undefined);
  assert.equal(state.board[8].tempArmorMod, undefined);
});

test('Wardens adjacent armor orders buff one adjacent ally from an edge pair and preserve ownership', () => {
  const state = createWardensState();
  state.player.hand.push({ ...card('wardens_reinforce_line_1') });
  state.board[6] = unit({ id: 'left', owner: 'player', attack: 0, hp: 3 });
  state.board[7] = unit({ id: 'mid', owner: 'player', attack: 0, hp: 3 });
  state.board[8] = unit({ id: 'enemy-in-friendly-row', owner: 'enemy', attack: 0, hp: 3 });

  assert.equal(playEffectCard(state, 'player', 'wardens_reinforce_line_1').ok, true);
  assert.equal(state.board[6].tempArmorMod, 1);
  assert.equal(state.board[7].tempArmorMod, 1);
  assert.equal(state.board[8].tempArmorMod, undefined);
  assert.deepEqual(state.board.map((item) => item?.owner ?? null).slice(6, 9), ['player', 'player', 'enemy']);
});

test('Wardens adjacent armor orders are rejected for isolated units and do not discard', () => {
  const state = createWardensState();
  state.player.hand.push({ ...card('wardens_reinforce_line_1') }, { ...card('wardens_hold_the_line_1') });
  state.board[6] = unit({ id: 'isolated-left', owner: 'player', attack: 0, hp: 3 });
  state.board[8] = unit({ id: 'isolated-right', owner: 'player', attack: 0, hp: 3 });

  const reinforceResult = playEffectCard(state, 'player', 'wardens_reinforce_line_1');
  const holdResult = playEffectCard(state, 'player', 'wardens_hold_the_line_1');

  assert.equal(reinforceResult.ok, false);
  assert.equal(holdResult.ok, false);
  assert.equal(state.board[6].tempArmorMod, undefined);
  assert.equal(state.board[8].tempArmorMod, undefined);
  assert.equal(state.player.hand.length, 2);
  assert.equal(state.player.discard.length, 0);
});

test('Wardens targeting metadata uses only Brace manual targeting', () => {
  assert.deepEqual(getTargetingStateForEffect('temp_armor_1', 'wardens_brace_1'), {
    cardId: 'wardens_brace_1',
    targetType: 'friendly-unit',
    requiredTargets: 1,
    targetIndexes: [],
  });
  assert.equal(getTargetingStateForEffect('swap_leftmost_adjacent_enemies', 'wardens_shield_push_1'), null);
  assert.equal(getTargetingStateForEffect('adjacent_allies_temp_armor_1', 'wardens_reinforce_line_1'), null);
  assert.equal(getTargetingStateForEffect('adjacent_allies_temp_armor_1', 'wardens_hold_the_line_1'), null);
});

test('AI avoids Shield Push without legal pair and Reinforce Line without adjacent allies', () => {
  const shieldState = createWardensState();
  shieldState.enemy.hand.push({ ...card('wardens_shield_push_1') });
  shieldState.board[6] = unit({ id: 'player-left', owner: 'player' });
  shieldState.board[8] = unit({ id: 'player-right', owner: 'player' });
  assert.notEqual(chooseBattleAction(shieldState, 'enemy').cardId, 'wardens_shield_push_1');

  const reinforceState = createWardensState();
  reinforceState.enemy.hand.push({ ...card('wardens_reinforce_line_1') });
  reinforceState.board[0] = unit({ id: 'isolated-left', owner: 'enemy' });
  reinforceState.board[2] = unit({ id: 'isolated-right', owner: 'enemy' });
  assert.notEqual(chooseBattleAction(reinforceState, 'enemy').cardId, 'wardens_reinforce_line_1');
});

test('AI can play Wardens without invalid actions in a representative turn', () => {
  const state = createWardensState();
  state.enemy.hand.push(
    { ...card('wardens_sentinel_1') },
    { ...card('wardens_shield_push_1') },
    { ...card('wardens_reinforce_line_1') },
  );
  state.board[6] = unit({ id: 'player-left', owner: 'player' });
  state.board[7] = unit({ id: 'player-mid', owner: 'player' });
  const action = chooseBattleAction(state, 'enemy');
  assert.notEqual(action.type, 'pass');
  let result;
  if (action.type === 'play-unit') result = playOrRedeployUnit(state, 'enemy', action.cardId, action.slotIndex);
  if (action.type === 'play-effect') result = playEffectCard(state, 'enemy', action.cardId);
  assert.equal(result?.ok, true);
});
