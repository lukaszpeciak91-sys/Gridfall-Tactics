import test from 'node:test';
import assert from 'node:assert/strict';

import control from '../src/data/factions/control.json' with { type: 'json' };
import tank from '../src/data/factions/tank.json' with { type: 'json' };
import aggro from '../src/data/factions/aggro.json' with { type: 'json' };
import { getTargetingStateForEffect } from '../src/systems/cardTargeting.js';
import {
  createInitialBattleState,
  playEffectCard,
  playOrRedeployUnit,
  resolveCombat,
  resolveTargetedUnitOnPlayEffect,
} from '../src/systems/GameState.js';
import { chooseBattleAction } from '../src/systems/enemyDecision.js';

function controllerCard() {
  return control.deck.find((card) => card.id === 'control_controller_1');
}

function tankCard(cardId) {
  return tank.deck.find((card) => card.id === cardId);
}

function unit({ id, owner, attack = 2, hp = 3, armor = 0, effectId = null }) {
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

function createControlState() {
  return createInitialBattleState(control, aggro, { firstActor: 'player' });
}

test('Controller exposes staged two-enemy targeting metadata', () => {
  assert.deepEqual(getTargetingStateForEffect('swap_two_enemy_units', 'control_controller_1'), {
    cardId: 'control_controller_1',
    targetType: 'enemy-unit',
    requiredTargets: 2,
    targetIndexes: [],
  });
});

test('Controller placement enters pending targeted on-play resolution without auto-swapping', () => {
  const state = createControlState();
  state.player.hand.push({ ...controllerCard() });
  state.board[0] = unit({ id: 'enemy-left', owner: 'enemy' });
  state.board[1] = unit({ id: 'enemy-mid', owner: 'enemy' });

  const playResult = playOrRedeployUnit(state, 'player', 'control_controller_1', 6);
  const pendingResult = resolveTargetedUnitOnPlayEffect(state, 'player', 6, [0]);

  assert.equal(playResult.ok, true);
  assert.equal(state.board[6].cardId, 'control_controller_1');
  assert.equal(state.player.discard[0].id, 'control_controller_1');
  assert.equal(state.board[0].id, 'enemy-left');
  assert.equal(state.board[1].id, 'enemy-mid');
  assert.equal(pendingResult.ok, true);
  assert.equal(pendingResult.type, 'unit-on-play-targeted-effect-pending');
});

test('canceling Controller targeting preserves the played Controller on board', () => {
  const state = createControlState();
  state.player.hand.push({ ...controllerCard() });
  state.board[0] = unit({ id: 'enemy-left', owner: 'enemy' });
  state.board[1] = unit({ id: 'enemy-mid', owner: 'enemy' });

  const result = playOrRedeployUnit(state, 'player', 'control_controller_1', 7);

  assert.equal(result.ok, true);
  assert.equal(state.board[7].cardId, 'control_controller_1');
  assert.equal(state.player.hand.some((card) => card.id === 'control_controller_1'), false);
  assert.equal(state.player.discard[0].id, 'control_controller_1');
  assert.equal(state.board[0].id, 'enemy-left');
  assert.equal(state.board[1].id, 'enemy-mid');
});

test('Controller swaps two selected enemies immediately without changing ownership or stats', () => {
  const state = createControlState();
  state.player.hand.push({ ...controllerCard() });
  state.board[0] = unit({ id: 'enemy-left', owner: 'enemy', attack: 4, hp: 5, armor: 1 });
  state.board[2] = unit({ id: 'enemy-right', owner: 'enemy', attack: 1, hp: 2, armor: 0 });

  playOrRedeployUnit(state, 'player', 'control_controller_1', 6);
  const result = resolveTargetedUnitOnPlayEffect(state, 'player', 6, [0, 2]);

  assert.equal(result.ok, true);
  assert.equal(result.type, 'unit-on-play-targeted-effect');
  assert.equal(state.board[0].id, 'enemy-right');
  assert.equal(state.board[2].id, 'enemy-left');
  assert.equal(state.board[0].owner, 'enemy');
  assert.equal(state.board[2].owner, 'enemy');
  assert.equal(state.board[2].attack, 4);
  assert.equal(state.board[2].hp, 5);
  assert.equal(state.board[2].armor, 1);
});

test('Controller rejects duplicate, friendly, and empty targets without removing the played unit', () => {
  const duplicate = createControlState();
  duplicate.player.hand.push({ ...controllerCard() });
  duplicate.board[0] = unit({ id: 'enemy-left', owner: 'enemy' });
  playOrRedeployUnit(duplicate, 'player', 'control_controller_1', 6);
  const duplicateResult = resolveTargetedUnitOnPlayEffect(duplicate, 'player', 6, [0, 0]);
  assert.equal(duplicateResult.ok, false);
  assert.equal(duplicate.board[6].cardId, 'control_controller_1');

  const friendly = createControlState();
  friendly.player.hand.push({ ...controllerCard() });
  friendly.board[0] = unit({ id: 'enemy-left', owner: 'enemy' });
  friendly.board[7] = unit({ id: 'player-mid', owner: 'player' });
  playOrRedeployUnit(friendly, 'player', 'control_controller_1', 6);
  const friendlyResult = resolveTargetedUnitOnPlayEffect(friendly, 'player', 6, [0, 7]);
  assert.equal(friendlyResult.ok, false);
  assert.equal(friendly.board[6].cardId, 'control_controller_1');

  const empty = createControlState();
  empty.player.hand.push({ ...controllerCard() });
  empty.board[0] = unit({ id: 'enemy-left', owner: 'enemy' });
  playOrRedeployUnit(empty, 'player', 'control_controller_1', 6);
  const emptyResult = resolveTargetedUnitOnPlayEffect(empty, 'player', 6, [0, 1]);
  assert.equal(emptyResult.ok, false);
  assert.equal(empty.board[6].cardId, 'control_controller_1');
});



test('Stability blocks Controller on-play swap while preserving normal unit play', () => {
  const state = createInitialBattleState(tank, control, { firstActor: 'enemy' });
  state.player.hand = [{ ...tankCard('tank_stability_1') }];
  state.enemy.hand = [{ ...controllerCard() }];
  state.board = Array(9).fill(null);
  state.board[6] = unit({ id: 'tank-left', owner: 'player', attack: 0, hp: 4 });
  state.board[8] = unit({ id: 'tank-right', owner: 'player', attack: 4, hp: 2 });

  assert.equal(playEffectCard(state, 'player', 'tank_stability_1').ok, true);

  const playResult = playOrRedeployUnit(state, 'enemy', 'control_controller_1', 0);
  const directResult = resolveTargetedUnitOnPlayEffect(state, 'enemy', 0, [6, 8]);

  assert.equal(playResult.ok, true);
  assert.equal(playResult.type, 'play');
  assert.equal(playResult.unitOnPlayEffectBlocked, true);
  assert.equal(playResult.unitOnPlayEffectType, 'unit-on-play-targeted-effect-blocked');
  assert.equal(state.board[0].cardId, 'control_controller_1');
  assert.equal(state.enemy.hand.some((card) => card.id === 'control_controller_1'), false);
  assert.equal(state.enemy.discard[0].id, 'control_controller_1');
  assert.equal(state.board[6].id, 'tank-left');
  assert.equal(state.board[8].id, 'tank-right');
  assert.equal(directResult.ok, true);
  assert.equal(directResult.type, 'unit-on-play-targeted-effect-blocked');
  assert.equal(state.board[6].id, 'tank-left');
  assert.equal(state.board[8].id, 'tank-right');
  assert.equal(state.immuneMoveDisableThisTurn.player, true);
});

test('Controller can target and swap again after Stability expires', () => {
  const state = createInitialBattleState(tank, control, { firstActor: 'enemy' });
  state.player.hand = [{ ...tankCard('tank_stability_1') }];
  state.enemy.hand = [{ ...controllerCard() }];
  state.board = Array(9).fill(null);
  state.board[6] = unit({ id: 'tank-left', owner: 'player', attack: 0, hp: 4 });
  state.board[8] = unit({ id: 'tank-right', owner: 'player', attack: 4, hp: 2 });

  playEffectCard(state, 'player', 'tank_stability_1');
  resolveCombat(state);
  assert.equal(state.immuneMoveDisableThisTurn.player, false);

  const playResult = playOrRedeployUnit(state, 'enemy', 'control_controller_1', 0);
  const swapResult = resolveTargetedUnitOnPlayEffect(state, 'enemy', 0, [6, 8]);

  assert.equal(playResult.ok, true);
  assert.equal(playResult.unitOnPlayEffectBlocked, undefined);
  assert.equal(swapResult.ok, true);
  assert.equal(swapResult.type, 'unit-on-play-targeted-effect');
  assert.equal(state.board[6].id, 'tank-right');
  assert.equal(state.board[8].id, 'tank-left');
});

test('AI plays Controller only with meaningful enemy swap targets', () => {
  const state = createControlState();
  state.enemy.hand.push({ ...controllerCard() });
  state.board[6] = unit({ id: 'player-left', owner: 'player', attack: 0, hp: 4 });
  state.board[8] = unit({ id: 'player-right', owner: 'player', attack: 4, hp: 2 });

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.type, 'play-unit');
  assert.equal(action.effectId, 'swap_two_enemy_units');
  assert.deepEqual(action.targetIndexes, [6, 8]);

  const playResult = playOrRedeployUnit(state, 'enemy', action.cardId, action.slotIndex);
  assert.equal(playResult.ok, true);
  const targetResult = resolveTargetedUnitOnPlayEffect(state, 'enemy', action.slotIndex, action.targetIndexes);
  assert.equal(targetResult.ok, true);
  assert.equal(state.board[6].id, 'player-right');
  assert.equal(state.board[8].id, 'player-left');
});

test('AI avoids random Controller swaps between equivalent enemies', () => {
  const state = createControlState();
  state.enemy.hand.push({ ...controllerCard() });
  state.board[6] = unit({ id: 'same-a', owner: 'player', attack: 2, hp: 2 });
  state.board[7] = unit({ id: 'same-b', owner: 'player', attack: 2, hp: 2 });

  const action = chooseBattleAction(state, 'enemy');

  assert.notEqual(action.effectId, 'swap_two_enemy_units');
});
