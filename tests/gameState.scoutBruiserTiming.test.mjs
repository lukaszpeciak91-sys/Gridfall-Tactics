import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canPlayOrRedeploy,
  createInitialBattleState,
  getUnitAttack,
  playEffectCard,
  playOrRedeployUnit,
  recordPassAction,
  resolveCombat,
  resolveTargetedEffectCard,
} from '../src/systems/GameState.js';

const makeState = () => createInitialBattleState({ name: 'Test', deck: [] });

const unitCard = (id, overrides = {}) => ({
  id,
  name: id,
  type: 'unit',
  targeting: 'lane',
  attack: 1,
  hp: 1,
  armor: 0,
  effectId: null,
  ...overrides,
});

const effectCard = (id, effectId) => ({
  id,
  name: id,
  type: 'order',
  targeting: 'all_friendly_units',
  effectId,
  textShort: '',
});

const boardUnit = (owner, overrides = {}) => ({
  id: `${owner}-unit`,
  cardId: `${owner}-unit`,
  name: `${owner} Unit`,
  type: 'unit',
  owner,
  attack: 1,
  hp: 2,
  maxHp: 2,
  armor: 0,
  effectId: null,
  ...overrides,
});

test('Scout played before opponent action blocks only matching enemy unit lane until that action resolves', () => {
  const state = makeState();
  state.player.hand.push(unitCard('scout', { attack: 2, hp: 1, effectId: 'block_enemy_lane_play_this_turn' }));
  state.enemy.hand.push(unitCard('enemy-lane-0'), unitCard('enemy-lane-1'), unitCard('enemy-lane-0-after'));

  assert.equal(playOrRedeployUnit(state, 'player', 'scout', 6).ok, true);

  assert.equal(canPlayOrRedeploy(state, 'enemy', 'enemy-lane-0', 0).ok, false);
  assert.equal(canPlayOrRedeploy(state, 'enemy', 'enemy-lane-1', 1).ok, true);

  const otherLaneResult = playOrRedeployUnit(state, 'enemy', 'enemy-lane-1', 1);
  assert.equal(otherLaneResult.ok, true);
  assert.equal(canPlayOrRedeploy(state, 'enemy', 'enemy-lane-0-after', 0).ok, true);
});

test('Scout block permits legal effects and clears after the opponent action opportunity', () => {
  const state = makeState();
  state.player.hand.push(unitCard('scout', { attack: 2, hp: 1, effectId: 'block_enemy_lane_play_this_turn' }));
  state.enemy.hand.push(effectCard('enemy-effect', 'heal_all_1'), unitCard('enemy-after-effect'));

  assert.equal(playOrRedeployUnit(state, 'player', 'scout', 6).ok, true);
  assert.equal(canPlayOrRedeploy(state, 'enemy', 'enemy-after-effect', 0).ok, false);

  const effectResult = playEffectCard(state, 'enemy', 'enemy-effect');
  assert.equal(effectResult.ok, true);
  assert.equal(canPlayOrRedeploy(state, 'enemy', 'enemy-after-effect', 0).ok, true);
});

test('Scout played after opponent already acted persists through combat into their next action opportunity', () => {
  const state = makeState();
  state.enemy.hand.push(unitCard('enemy-first'), unitCard('enemy-blocked'));
  state.player.hand.push(unitCard('scout', { attack: 2, hp: 1, effectId: 'block_enemy_lane_play_this_turn' }));

  assert.equal(playOrRedeployUnit(state, 'enemy', 'enemy-first', 1).ok, true);
  assert.equal(playOrRedeployUnit(state, 'player', 'scout', 6).ok, true);

  resolveCombat(state);
  assert.equal(canPlayOrRedeploy(state, 'enemy', 'enemy-blocked', 0).ok, false);

  recordPassAction(state, 'enemy');
  assert.equal(canPlayOrRedeploy(state, 'enemy', 'enemy-blocked', 0).ok, true);
});

test('Scout block does not persist indefinitely after an opponent pass opportunity', () => {
  const state = makeState();
  state.player.hand.push(unitCard('scout', { attack: 2, hp: 1, effectId: 'block_enemy_lane_play_this_turn' }));
  state.enemy.hand.push(unitCard('enemy-after-pass'));

  assert.equal(playOrRedeployUnit(state, 'player', 'scout', 6).ok, true);
  assert.equal(canPlayOrRedeploy(state, 'enemy', 'enemy-after-pass', 0).ok, false);

  recordPassAction(state, 'enemy');
  resolveCombat(state);
  assert.equal(canPlayOrRedeploy(state, 'enemy', 'enemy-after-pass', 0).ok, true);
});

test('Bruiser damage survival after attacking carries +1 ATK into the next combat damage calculation', () => {
  const state = makeState();
  state.board[6] = boardUnit('player', { id: 'bruiser', attack: 2, hp: 3, maxHp: 3, effectId: 'gain_atk_when_damaged' });
  state.board[0] = boardUnit('enemy', { id: 'target', attack: 1, hp: 5, maxHp: 5 });

  resolveCombat(state);

  assert.equal(state.board[6].hp, 2);
  assert.equal(state.board[0].hp, 3);
  assert.equal(getUnitAttack(state.board[6]), 3);

  state.board[0].attack = 0;
  const nextEvents = resolveCombat(state);

  assert.equal(nextEvents.find((event) => event.attackerSide === 'player')?.damage, 3);
  assert.equal(state.board[0], null);
  assert.equal(getUnitAttack(state.board[6]), 2);
});

test('Bruiser carried bonus clears after being available for next combat even if it does not kill', () => {
  const state = makeState();
  state.board[6] = boardUnit('player', { id: 'bruiser', attack: 2, hp: 3, maxHp: 3, effectId: 'gain_atk_when_damaged' });
  state.board[0] = boardUnit('enemy', { id: 'durable-target', attack: 1, hp: 8, maxHp: 8 });

  resolveCombat(state);
  assert.equal(getUnitAttack(state.board[6]), 3);

  state.board[0].attack = 0;
  resolveCombat(state);

  assert.equal(state.board[0].hp, 3);
  assert.equal(getUnitAttack(state.board[6]), 2);
});

test('Bruiser pending attack bonus is capped at +1 across repeated pre-combat damage survival', () => {
  const state = makeState();
  state.board[6] = boardUnit('player', { id: 'bruiser', attack: 2, hp: 3, maxHp: 3, effectId: 'gain_atk_when_damaged' });
  state.enemy.hand.push(
    { ...effectCard('ping-1', 'ignore_armor_next_attack'), targeting: 'enemy_unit' },
    { ...effectCard('ping-2', 'ignore_armor_next_attack'), targeting: 'enemy_unit' },
  );

  assert.equal(resolveTargetedEffectCard(state, 'enemy', 'ping-1', 6).ok, true);
  assert.equal(resolveTargetedEffectCard(state, 'enemy', 'ping-2', 6).ok, true);

  assert.equal(state.board[6].hp, 1);
  assert.equal(getUnitAttack(state.board[6]), 3);
});
