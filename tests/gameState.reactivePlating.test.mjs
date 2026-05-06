import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  createInitialBattleState,
  getUnitArmor,
  resolveCombat,
  resolveTargetedEffectCard,
} from '../src/systems/GameState.js';
import { getTargetingStateForEffect } from '../src/systems/cardTargeting.js';

const loadFaction = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));

const unit = (owner, overrides = {}) => ({
  id: `${owner}-unit`,
  cardId: `${owner}-unit`,
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

function stateWithReactivePlating() {
  const tank = loadFaction('src/data/factions/tank.json');
  const reactivePlating = tank.deck.find((card) => card.id === 'tank_repair_kit_1');
  const state = createInitialBattleState({ name: 'Tank', deck: [] });
  state.player.hand.push({ ...reactivePlating });
  return { state, reactivePlating };
}

test('Reactive Plating keeps the Tank deck slot and friendly targeting metadata', () => {
  const tank = loadFaction('src/data/factions/tank.json');
  const reactivePlating = tank.deck.find((card) => card.id === 'tank_repair_kit_1');

  assert.equal(reactivePlating.name, 'Reactive Plating');
  assert.equal(reactivePlating.targeting, 'friendly_unit');
  assert.equal(reactivePlating.effectId, 'temp_armor_1');
  assert.equal(reactivePlating.textShort, 'Target ally +1 armor this combat.');
  assert.deepEqual(getTargetingStateForEffect(reactivePlating.effectId, reactivePlating.id), {
    cardId: 'tank_repair_kit_1',
    targetType: 'friendly-unit',
    requiredTargets: 1,
    targetIndexes: [],
  });
});

test('Reactive Plating grants exactly +1 armor this combat and does not restore HP', () => {
  const { state } = stateWithReactivePlating();
  state.board[6] = unit('player', { hp: 1, maxHp: 3, armor: 0 });

  const result = resolveTargetedEffectCard(state, 'player', 'tank_repair_kit_1', 6);

  assert.equal(result.ok, true);
  assert.equal(result.type, 'targeted-effect');
  assert.equal(state.board[6].tempArmorMod, 1);
  assert.equal(getUnitArmor(state.board[6]), 1);
  assert.equal(state.board[6].hp, 1);
});

test('Reactive Plating temporary armor expires after combat cleanup', () => {
  const { state } = stateWithReactivePlating();
  state.board[6] = unit('player', { hp: 3, maxHp: 3, armor: 0 });

  resolveTargetedEffectCard(state, 'player', 'tank_repair_kit_1', 6);
  assert.equal(getUnitArmor(state.board[6]), 1);

  resolveCombat(state);

  assert.equal(state.board[6].tempArmorMod, undefined);
  assert.equal(getUnitArmor(state.board[6]), 0);
});

test('Reactive Plating temporary armor reduces combat damage correctly', () => {
  const { state } = stateWithReactivePlating();
  state.board[0] = unit('enemy', { attack: 2, hp: 2, maxHp: 2 });
  state.board[6] = unit('player', { attack: 0, hp: 3, maxHp: 3, armor: 0 });

  resolveTargetedEffectCard(state, 'player', 'tank_repair_kit_1', 6);
  resolveCombat(state);

  assert.equal(state.board[6].hp, 2);
});

test('Reactive Plating stacks with existing permanent armor', () => {
  const { state } = stateWithReactivePlating();
  state.board[0] = unit('enemy', { attack: 3, hp: 2, maxHp: 2 });
  state.board[6] = unit('player', { attack: 0, hp: 3, maxHp: 3, armor: 1 });

  resolveTargetedEffectCard(state, 'player', 'tank_repair_kit_1', 6);
  assert.equal(getUnitArmor(state.board[6]), 2);

  resolveCombat(state);

  assert.equal(state.board[6].hp, 2);
  assert.equal(getUnitArmor(state.board[6]), 1);
});

test('Reactive Plating keeps friendly targeting parity and rejects enemy units', () => {
  const { state } = stateWithReactivePlating();
  state.board[0] = unit('enemy');
  state.board[6] = unit('player');

  const enemyResult = resolveTargetedEffectCard(state, 'player', 'tank_repair_kit_1', 0);
  assert.equal(enemyResult.ok, false);
  assert.equal(enemyResult.reason, 'Target must be friendly');
  assert.equal(state.player.hand.length, 1);

  const friendlyResult = resolveTargetedEffectCard(state, 'player', 'tank_repair_kit_1', 6);
  assert.equal(friendlyResult.ok, true);
  assert.equal(state.player.hand.length, 0);
  assert.equal(state.player.discard[0].id, 'tank_repair_kit_1');
});
