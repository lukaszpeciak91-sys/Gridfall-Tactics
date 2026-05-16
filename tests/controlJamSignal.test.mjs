import test from 'node:test';
import assert from 'node:assert/strict';

import control from '../src/data/factions/control.json' with { type: 'json' };
import aggro from '../src/data/factions/aggro.json' with { type: 'json' };
import { getTargetingStateForEffect } from '../src/systems/cardTargeting.js';
import {
  createInitialBattleState,
  playEffectCard,
  resolveCombat,
  resolveTargetedEffectCard,
} from '../src/systems/GameState.js';
import { chooseBattleAction } from '../src/systems/enemyDecision.js';

function jamSignalCard() {
  return control.deck.find((card) => card.id === 'control_jam_signal_1');
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

test('Jam Signal exposes Shield Push-style multi-target enemy metadata with one-target minimum', () => {
  assert.deepEqual(getTargetingStateForEffect('enemy_up_to_2_atk_minus_1', 'control_jam_signal_1'), {
    cardId: 'control_jam_signal_1',
    targetType: 'enemy-unit',
    requiredTargets: 2,
    minTargets: 1,
    targetIndexes: [],
  });
});

test('Jam Signal can resolve with one selected enemy and expires after combat', () => {
  const state = createControlState();
  state.player.hand.push({ ...jamSignalCard() });
  state.board[0] = unit({ id: 'enemy-left', owner: 'enemy', attack: 3 });
  state.board[1] = unit({ id: 'enemy-mid', owner: 'enemy', attack: 2 });

  const result = resolveTargetedEffectCard(state, 'player', 'control_jam_signal_1', 0, [0]);

  assert.equal(result.ok, true);
  assert.equal(result.type, 'targeted-effect');
  assert.equal(state.board[0].tempAttackMod, -1);
  assert.equal(state.board[1].tempAttackMod, undefined);
  assert.equal(state.player.hand.length, 0);
  assert.equal(state.player.discard[0].id, 'control_jam_signal_1');

  resolveCombat(state);
  assert.equal(state.board[0]?.tempAttackMod, undefined);
  assert.equal(state.board[1]?.tempAttackMod, undefined);
});

test('Jam Signal can resolve with two selected enemies without debuffing unselected enemies', () => {
  const state = createControlState();
  state.player.hand.push({ ...jamSignalCard() });
  state.board[0] = unit({ id: 'enemy-left', owner: 'enemy', attack: 3 });
  state.board[1] = unit({ id: 'enemy-mid', owner: 'enemy', attack: 2 });
  state.board[2] = unit({ id: 'enemy-right', owner: 'enemy', attack: 4 });

  const result = resolveTargetedEffectCard(state, 'player', 'control_jam_signal_1', 2, [2, 0]);

  assert.equal(result.ok, true);
  assert.equal(state.board[0].tempAttackMod, -1);
  assert.equal(state.board[1].tempAttackMod, undefined);
  assert.equal(state.board[2].tempAttackMod, -1);
});

test('Jam Signal rejects duplicate, friendly, empty, and deterministic resolutions without discarding', () => {
  const duplicate = createControlState();
  duplicate.player.hand.push({ ...jamSignalCard() });
  duplicate.board[0] = unit({ id: 'enemy-left', owner: 'enemy' });
  const duplicateResult = resolveTargetedEffectCard(duplicate, 'player', 'control_jam_signal_1', 0, [0, 0]);
  assert.equal(duplicateResult.ok, false);
  assert.equal(duplicate.player.hand.length, 1);
  assert.equal(duplicate.player.discard.length, 0);

  const friendly = createControlState();
  friendly.player.hand.push({ ...jamSignalCard() });
  friendly.board[0] = unit({ id: 'enemy-left', owner: 'enemy' });
  friendly.board[6] = unit({ id: 'player-left', owner: 'player' });
  const friendlyResult = resolveTargetedEffectCard(friendly, 'player', 'control_jam_signal_1', 6, [0, 6]);
  assert.equal(friendlyResult.ok, false);
  assert.equal(friendly.player.hand.length, 1);
  assert.equal(friendly.player.discard.length, 0);

  const empty = createControlState();
  empty.player.hand.push({ ...jamSignalCard() });
  empty.board[0] = unit({ id: 'enemy-left', owner: 'enemy' });
  const emptyResult = resolveTargetedEffectCard(empty, 'player', 'control_jam_signal_1', 0, [0, 1]);
  assert.equal(emptyResult.ok, false);
  assert.equal(empty.player.hand.length, 1);
  assert.equal(empty.player.discard.length, 0);

  const deterministic = createControlState();
  deterministic.player.hand.push({ ...jamSignalCard() });
  deterministic.board[0] = unit({ id: 'enemy-left', owner: 'enemy' });
  const deterministicResult = playEffectCard(deterministic, 'player', 'control_jam_signal_1');
  assert.equal(deterministicResult.ok, false);
  assert.equal(deterministic.player.hand.length, 1);
  assert.equal(deterministic.player.discard.length, 0);
});

test('AI chooses meaningful Jam Signal targets and avoids invalid target counts', () => {
  const state = createControlState();
  state.enemy.hand.push({ ...jamSignalCard() });
  state.board[6] = unit({ id: 'player-left', owner: 'player', attack: 3 });
  state.board[7] = unit({ id: 'player-mid', owner: 'player', attack: 0 });
  state.board[8] = unit({ id: 'player-right', owner: 'player', attack: 2 });

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.type, 'play-targeted-effect');
  assert.equal(action.effectId, 'enemy_up_to_2_atk_minus_1');
  assert.deepEqual(action.targetIndexes, [6, 8]);

  const result = resolveTargetedEffectCard(state, 'enemy', action.cardId, action.targetIndex, action.targetIndexes);
  assert.equal(result.ok, true);
  assert.equal(state.board[6].tempAttackMod, -1);
  assert.equal(state.board[7].tempAttackMod, undefined);
  assert.equal(state.board[8].tempAttackMod, -1);
});

test('AI can use Jam Signal on a single relevant target without crashing', () => {
  const state = createControlState();
  state.enemy.hand.push({ ...jamSignalCard() });
  state.board[6] = unit({ id: 'player-left', owner: 'player', attack: 3 });
  state.board[7] = unit({ id: 'player-mid', owner: 'player', attack: 0 });

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.type, 'play-targeted-effect');
  assert.equal(action.effectId, 'enemy_up_to_2_atk_minus_1');
  assert.deepEqual(action.targetIndexes, [6]);

  const result = resolveTargetedEffectCard(state, 'enemy', action.cardId, action.targetIndex, action.targetIndexes);
  assert.equal(result.ok, true);
});
