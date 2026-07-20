import assert from 'node:assert/strict';
import test from 'node:test';

import { createInitialBattleState, playEffectCard } from '../src/systems/GameState.js';
import { buildActionCandidates, chooseBattleAction, scoreAction } from '../src/systems/enemyDecision.js';

const pulseWaveCard = {
  id: 'control_pulse_wave_1',
  name: 'Pulse Wave',
  type: 'order',
  targeting: 'all_enemy_units',
  effectId: 'damage_all_enemies_1_ignore_armor',
};

const deadCycleCard = (id) => ({
  id,
  name: id,
  type: 'order',
  targeting: 'none',
  effectId: 'test_noop_effect',
});

const usefulUnitCard = {
  id: 'useful_unit',
  name: 'Useful Unit',
  type: 'unit',
  targeting: 'lane',
  attack: 2,
  hp: 2,
  armor: 0,
  effectId: null,
};

const stabilityCard = {
  id: 'tank_stability_1',
  name: 'Stability',
  type: 'order',
  targeting: 'none',
  effectId: 'immune_move_disable_this_turn',
};

function unit(owner, overrides = {}) {
  return {
    id: overrides.id ?? `${owner}-unit`,
    cardId: overrides.id ?? `${owner}-unit`,
    name: overrides.id ?? 'Unit',
    type: 'unit',
    owner,
    attack: overrides.attack ?? 1,
    hp: overrides.hp ?? 2,
    maxHp: overrides.maxHp ?? overrides.hp ?? 2,
    armor: overrides.armor ?? 0,
    effectId: overrides.effectId ?? null,
  };
}

function baseState(hand, deck = [{ id: 'future', name: 'Future', type: 'unit', attack: 3, hp: 3 }]) {
  const state = createInitialBattleState({ name: 'Player', deck: [] }, { name: 'Enemy', deck: [] }, { firstActor: 'enemy' });
  state.enemy.hand = hand.map((card) => ({ ...card }));
  state.enemy.deck = deck.map((card) => ({ ...card }));
  state.player.hand = [];
  state.player.deck = [];
  state.board[0] = unit('enemy', { id: 'enemy-anchor', attack: 1 });
  return state;
}

function scoredActions(state) {
  return buildActionCandidates(state, 'enemy', state.enemy.hand)
    .map((action) => ({ action, score: scoreAction(state, 'enemy', action), evaluation: action.aiEvaluation }));
}

function scoreFor(state, predicate) {
  const entry = scoredActions(state).find(({ action }) => predicate(action));
  assert.ok(entry, 'expected action candidate');
  return entry;
}

test('zero-target Pulse Wave below hand limit prefers PASS even when deck has cards', () => {
  const state = baseState([pulseWaveCard]);

  const pass = scoreFor(state, (action) => action.type === 'pass');
  const pulse = scoreFor(state, (action) => action.cardId === pulseWaveCard.id);
  const action = chooseBattleAction(state, 'enemy', { aiSafeSurrenderEnabled: false });

  assert.equal(pass.score, 0);
  assert.equal(pulse.score, -1);
  assert.equal(pulse.evaluation.zeroImpactRejectedReason, 'no immediate battle impact and no meaningful hand-cycling value');
  assert.equal(action.type, 'pass');
});

test('zero-target Pulse Wave may be cycled when a full hand would block future draws', () => {
  const state = baseState([
    pulseWaveCard,
    deadCycleCard('dead_1'),
    deadCycleCard('dead_2'),
    deadCycleCard('dead_3'),
    deadCycleCard('dead_4'),
  ]);

  const pulse = scoreFor(state, (action) => action.cardId === pulseWaveCard.id);
  const action = chooseBattleAction(state, 'enemy', { aiSafeSurrenderEnabled: false });

  assert.equal(pulse.score, 140);
  assert.equal(pulse.evaluation.handCycling, true);
  assert.equal(action.type, 'play-effect');
  assert.ok([pulseWaveCard.id, 'dead_1', 'dead_2', 'dead_3', 'dead_4'].includes(action.cardId));
});

test('zero-target Pulse Wave at hand limit does not cycle with an empty deck', () => {
  const state = baseState([
    pulseWaveCard,
    deadCycleCard('dead_1'),
    deadCycleCard('dead_2'),
    deadCycleCard('dead_3'),
    deadCycleCard('dead_4'),
  ], []);

  const pulse = scoreFor(state, (action) => action.cardId === pulseWaveCard.id);
  const action = chooseBattleAction(state, 'enemy', { aiSafeSurrenderEnabled: false });

  assert.equal(pulse.score, -1);
  assert.equal(action.type, 'pass');
});

test('useful immediate action beats speculative zero-target hand cycling', () => {
  const state = baseState([
    pulseWaveCard,
    usefulUnitCard,
    deadCycleCard('dead_1'),
    deadCycleCard('dead_2'),
    deadCycleCard('dead_3'),
  ]);

  const pulse = scoreFor(state, (action) => action.cardId === pulseWaveCard.id);
  const action = chooseBattleAction(state, 'enemy', { aiSafeSurrenderEnabled: false });

  assert.equal(pulse.score, 140);
  assert.equal(action.type, 'play-unit');
  assert.equal(action.cardId, usefulUnitCard.id);
});

test('non-damage until-combat immunity effects are recognized as immediate battle impact', () => {
  const state = baseState([stabilityCard], []);
  state.board[1] = unit('enemy', { id: 'second-anchor', attack: 3 });

  const stability = scoreFor(state, (action) => action.cardId === stabilityCard.id);

  assert.ok(stability.score > 0);
  assert.equal(stability.evaluation.hasImmediateBattleImpact, true);
  assert.equal(stability.evaluation.zeroImpactRejectedReason, undefined);
});

test('Pulse Wave remains valuable with one 1-HP target and removes it', () => {
  const state = baseState([pulseWaveCard], []);
  state.board[6] = unit('player', { id: 'one-hp-target', hp: 1, maxHp: 1 });

  const pulse = scoreFor(state, (action) => action.cardId === pulseWaveCard.id);
  const action = chooseBattleAction(state, 'enemy', { aiSafeSurrenderEnabled: false });

  assert.equal(action.type, 'play-effect');
  assert.equal(action.cardId, pulseWaveCard.id);
  assert.ok(pulse.score > 0);

  const result = playEffectCard(state, 'enemy', action.cardId);
  assert.equal(result.ok, true);
  assert.equal(state.board[6], null);
});

test('Pulse Wave continues to ignore armor across multiple targets', () => {
  const state = baseState([pulseWaveCard], []);
  state.board[6] = unit('player', { id: 'armored-a', hp: 2, maxHp: 2, armor: 3 });
  state.board[7] = unit('player', { id: 'armored-b', hp: 1, maxHp: 1, armor: 5 });
  state.board[8] = unit('player', { id: 'armored-c', hp: 3, maxHp: 3, armor: 2 });

  const action = chooseBattleAction(state, 'enemy', { aiSafeSurrenderEnabled: false });
  assert.equal(action.type, 'play-effect');

  const result = playEffectCard(state, 'enemy', action.cardId);
  assert.equal(result.ok, true);
  assert.equal(state.board[6].hp, 1);
  assert.equal(state.board[6].armor, 3);
  assert.equal(state.board[7], null);
  assert.equal(state.board[8].hp, 2);
  assert.equal(state.board[8].armor, 2);
});
