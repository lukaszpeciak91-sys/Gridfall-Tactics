import test from 'node:test';
import assert from 'node:assert/strict';
import { buildActionCandidates, chooseBattleAction, scoreAction } from '../src/systems/enemyDecision.js';
import { createInitialBattleState } from '../src/systems/GameState.js';
import { BOARD_SLOT_VISUAL_MAP, createSeededRandom, getAdjacentSlotDiagnostics } from '../src/systems/aiOpeningDiagnostics.js';

const generic = { id: 'generic', name: 'Generic', type: 'unit', targeting: 'lane', attack: 1, hp: 1, armor: 0 };
const strong = { id: 'strong', name: 'Strong', type: 'unit', targeting: 'lane', attack: 3, hp: 3, armor: 0 };
const alpha = { id: 'swarm_alpha_1', name: 'Alpha', type: 'unit', targeting: 'lane', effectId: 'adjacent_allies_atk_plus_1_ignore_armor_1', attack: 1, hp: 2, armor: 0 };
const playerFaction = { id: 'p', name: 'Player', deck: [] };
const enemyFaction = { id: 'e', name: 'Enemy', deck: [] };

function stateWithEnemyHand(hand) {
  const state = createInitialBattleState(playerFaction, enemyFaction, { firstActor: 'enemy' });
  state.enemy.hand = hand;
  return state;
}

function unitActionsFor(state) {
  return buildActionCandidates(state, 'enemy', state.enemy.hand).filter((action) => action.type === 'play-unit');
}

test('diagnostic visual map documents board index rows and middle slots', () => {
  assert.equal(BOARD_SLOT_VISUAL_MAP[0].rowMeaning, 'enemy');
  assert.equal(BOARD_SLOT_VISUAL_MAP[0].laneMeaning, 'left/top edge');
  assert.equal(BOARD_SLOT_VISUAL_MAP[1].laneMeaning, 'middle');
  assert.equal(BOARD_SLOT_VISUAL_MAP[2].laneMeaning, 'right/bottom edge');
  assert.equal(BOARD_SLOT_VISUAL_MAP[6].rowMeaning, 'player');
  assert.equal(BOARD_SLOT_VISUAL_MAP[7].laneMeaning, 'middle');
});

test('unit placement candidates are generated in friendly slot-index order after pass', () => {
  const state = stateWithEnemyHand([generic]);
  const actions = buildActionCandidates(state, 'enemy', state.enemy.hand);
  assert.deepEqual(actions.map((action) => action.slotIndex).filter(Number.isInteger), [0, 1, 2]);
});

test('generic non-adjacency units receive no artificial center bonus', () => {
  const state = stateWithEnemyHand([generic]);
  const actions = unitActionsFor(state);
  assert.deepEqual(actions.map((action) => scoreAction(state, 'enemy', action)), [3732, 3732, 3732]);
  assert.deepEqual(actions.map((action) => action.aiEvaluation?.adjacencyFormationValue ?? 0), [0, 0, 0]);
});

test('empty-board Alpha middle score is greater because of adjacencyFormationValue', () => {
  const state = stateWithEnemyHand([alpha]);
  const actions = unitActionsFor(state);
  const scores = actions.map((action) => scoreAction(state, 'enemy', action));
  assert.deepEqual(scores, [3762, 3780, 3762]);
  assert.deepEqual(actions.map((action) => action.aiEvaluation.adjacencyFormationValue), [18, 36, 18]);
  assert.deepEqual(actions.map((action) => action.aiEvaluation.futureAdjacencyCapacityValue), [18, 36, 18]);
  assert.deepEqual(actions.map((action) => action.aiEvaluation.occupiedAdjacencyValue), [0, 0, 0]);
  const selected = chooseBattleAction(state, 'enemy', { aiSafeSurrenderEnabled: false, randomFn: createSeededRandom(7) });
  assert.equal(selected.slotIndex, 1);
  assert.equal(selected.aiEvaluation.utilityChosenReason, 'highest scored legal action');
  assert.equal(getAdjacentSlotDiagnostics(state, 'enemy', 0, alpha).possibleAdjacentPositions, 1);
  assert.equal(getAdjacentSlotDiagnostics(state, 'enemy', 1, alpha).possibleAdjacentPositions, 2);
});

test('edge remains selectable when immediate tactical value exceeds formation bonus', () => {
  const state = stateWithEnemyHand([alpha]);
  state.board[6] = { owner: 'player', id: 'threat', name: 'Threat', attack: 10, hp: 2, armor: 0 };
  const actions = unitActionsFor(state);
  const scores = Object.fromEntries(actions.map((action) => [action.slotIndex, scoreAction(state, 'enemy', action)]));
  assert.ok(scores[0] > scores[1]);
  const selected = chooseBattleAction(state, 'enemy', { aiSafeSurrenderEnabled: false, randomFn: createSeededRandom(3) });
  assert.equal(selected.slotIndex, 0);
});

test('current adjacent allies are valued more than future empty adjacency capacity', () => {
  const state = stateWithEnemyHand([alpha]);
  state.board[0] = { owner: 'enemy', id: 'ally', name: 'Ally', attack: 1, hp: 1, armor: 0 };
  const middle = { type: 'play-unit', cardId: alpha.id, slotIndex: 1 };
  const farEdge = { type: 'play-unit', cardId: alpha.id, slotIndex: 2 };
  scoreAction(state, 'enemy', middle);
  scoreAction(state, 'enemy', farEdge);
  assert.equal(middle.aiEvaluation.occupiedAdjacencyValue, 180);
  assert.equal(middle.aiEvaluation.futureAdjacencyCapacityValue, 18);
  assert.ok(middle.aiEvaluation.occupiedAdjacencyValue > middle.aiEvaluation.futureAdjacencyCapacityValue);
  assert.ok(scoreAction(state, 'enemy', middle) > scoreAction(state, 'enemy', farEdge));
});

test('exact ties use seeded deterministic selection instead of always first generated', () => {
  const state = stateWithEnemyHand([generic]);
  const selectedA = chooseBattleAction(state, 'enemy', { aiSafeSurrenderEnabled: false, randomFn: () => 0.6 });
  const selectedB = chooseBattleAction(state, 'enemy', { aiSafeSurrenderEnabled: false, randomFn: () => 0.6 });
  assert.equal(selectedA.slotIndex, selectedB.slotIndex);
  assert.notEqual(selectedA.slotIndex, 0);
  assert.equal(selectedA.aiEvaluation.tieBreak.reason, 'seeded exact-score tie-break');
  assert.equal(selectedA.aiEvaluation.tieBreak.tieCount, 3);
});

test('multiple deterministic tie-break seeds produce more than one tied slot', () => {
  const slots = new Set();
  for (let seed = 1; seed <= 12; seed += 1) {
    const state = stateWithEnemyHand([generic]);
    slots.add(chooseBattleAction(state, 'enemy', { aiSafeSurrenderEnabled: false, randomFn: () => ((seed * 37) % 100) / 100 }).slotIndex);
  }
  assert.ok(slots.size > 1);
});

test('non-tied best action and explicit alternative tie-break policies are preserved', () => {
  const nonTie = stateWithEnemyHand([strong, generic]);
  const selectedStrong = chooseBattleAction(nonTie, 'enemy', { aiSafeSurrenderEnabled: false, randomFn: createSeededRandom(1) });
  assert.equal(selectedStrong.cardId, 'strong');

  const tie = stateWithEnemyHand([generic]);
  const firstPolicy = chooseBattleAction(tie, 'enemy', { aiSafeSurrenderEnabled: false, tieBreakPolicy: 'first', randomFn: createSeededRandom(1) });
  assert.equal(firstPolicy.slotIndex, 0);

  const rotation = stateWithEnemyHand([generic]);
  const rotated = chooseBattleAction(rotation, 'enemy', { aiSafeSurrenderEnabled: false, tieBreakPolicy: 'rotation', tieBreakIndex: 2, randomFn: createSeededRandom(1) });
  assert.equal(rotated.slotIndex, 2);
});

const spearwall = { id: 'wardens_spearwall_1', name: 'Spearwall', type: 'unit', targeting: 'lane', effectId: 'warden_defensive_friction_adjacent', attack: 0, hp: 3, armor: 0 };
const rotcaller = { id: 'attrition_swarm_rotcaller_1', name: 'Rotcaller', type: 'unit', targeting: 'lane', effectId: 'rotcaller_adjacent_death_atk_1', attack: 1, hp: 2, armor: 0 };
const gapHunter = { id: 'overclock_gap_hunter_1', name: 'Breach Ram', type: 'unit', targeting: 'lane', effectId: 'empty_adjacent_bonus_atk', attack: 2, hp: 2, armor: 0 };

function slotScoresFor(card) {
  const state = stateWithEnemyHand([card]);
  const actions = unitActionsFor(state);
  return actions.map((action) => {
    const score = scoreAction(state, 'enemy', action);
    return {
      slotIndex: action.slotIndex,
      score,
      adjacencyFormationValue: action.aiEvaluation?.adjacencyFormationValue ?? 0,
      occupiedAdjacencyValue: action.aiEvaluation?.occupiedAdjacencyValue ?? 0,
      futureAdjacencyCapacityValue: action.aiEvaluation?.futureAdjacencyCapacityValue ?? 0,
    };
  });
}

test('approved adjacency effects remain classified for formation scoring', () => {
  for (const card of [alpha, spearwall, rotcaller]) {
    assert.deepEqual(slotScoresFor(card).map((entry) => entry.adjacencyFormationValue), [18, 36, 18]);
  }
});

test('empty adjacency bonus is excluded from formation scoring', () => {
  const scores = slotScoresFor(gapHunter);
  assert.deepEqual(scores.map((entry) => entry.adjacencyFormationValue), [0, 0, 0]);
  assert.deepEqual(scores.map((entry) => entry.occupiedAdjacencyValue), [0, 0, 0]);
  assert.deepEqual(scores.map((entry) => entry.futureAdjacencyCapacityValue), [0, 0, 0]);
});

test('Gap Hunter receives no artificial middle preference and uses seeded exact ties', () => {
  const scores = slotScoresFor(gapHunter);
  assert.deepEqual(scores.map((entry) => entry.score), [4754, 4754, 4754]);

  const stateA = stateWithEnemyHand([gapHunter]);
  const selectedA = chooseBattleAction(stateA, 'enemy', { aiSafeSurrenderEnabled: false, randomFn: () => 0.6 });
  const stateB = stateWithEnemyHand([gapHunter]);
  const selectedB = chooseBattleAction(stateB, 'enemy', { aiSafeSurrenderEnabled: false, randomFn: () => 0.6 });
  assert.equal(selectedA.slotIndex, selectedB.slotIndex);
  assert.equal(selectedA.aiEvaluation.tieBreak.reason, 'seeded exact-score tie-break');
  assert.equal(selectedA.aiEvaluation.tieBreak.tieCount, 3);

  const slots = new Set();
  for (const value of [0.1, 0.4, 0.8]) {
    const state = stateWithEnemyHand([gapHunter]);
    slots.add(chooseBattleAction(state, 'enemy', { aiSafeSurrenderEnabled: false, randomFn: () => value }).slotIndex);
  }
  assert.ok(slots.size > 1);
});

test('Gap Hunter diagnostic classifies empty-adjacent bonus separately from formation scoring', () => {
  const state = stateWithEnemyHand([gapHunter]);
  for (const slot of [0, 1, 2]) {
    const diagnostic = getAdjacentSlotDiagnostics(state, 'enemy', slot, gapHunter);
    assert.equal(diagnostic.adjacencyDependent, false);
    assert.equal(diagnostic.allyAdjacencyFormationEffect, false);
    assert.equal(diagnostic.emptyAdjacencyBonusEffect, true);
    assert.equal(diagnostic.hasAdjacencyDependentMechanics, true);
  }
});

test('slot mapping remains enemy 0-2 and player 6-8', () => {
  assert.deepEqual(BOARD_SLOT_VISUAL_MAP.slice(0, 3).map((slot) => slot.rowMeaning), ['enemy', 'enemy', 'enemy']);
  assert.deepEqual(BOARD_SLOT_VISUAL_MAP.slice(0, 3).map((slot) => slot.index), [0, 1, 2]);
  assert.deepEqual(BOARD_SLOT_VISUAL_MAP.slice(6, 9).map((slot) => slot.rowMeaning), ['player', 'player', 'player']);
  assert.deepEqual(BOARD_SLOT_VISUAL_MAP.slice(6, 9).map((slot) => slot.index), [6, 7, 8]);
});
