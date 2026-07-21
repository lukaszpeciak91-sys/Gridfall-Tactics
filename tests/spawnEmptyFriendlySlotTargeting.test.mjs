import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import swarm from '../src/data/factions/swarm.json' with { type: 'json' };
import en from '../src/localization/translations/en.json' with { type: 'json' };
import pl from '../src/localization/translations/pl.json' with { type: 'json' };
import { getTargetingStateForEffect } from '../src/systems/cardTargeting.js';
import {
  createInitialBattleState,
  isLegalEmptyFriendlySlotForUnitPlacement,
  playEffectCard,
  resolveTargetedEffectCard,
} from '../src/systems/GameState.js';
import { buildActionCandidates, chooseBattleAction, scoreAction } from '../src/systems/enemyDecision.js';

const battleSceneSource = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
const emptyFaction = { id: 'empty', name: 'Empty', deck: [] };
const spawnCard = () => ({ ...swarm.deck.find((card) => card.id === 'swarm_spawn_1') });
const unit = (owner, id = `${owner}-unit`) => ({ id, cardId: id, name: id, type: 'unit', owner, attack: 1, hp: 1, maxHp: 1, armor: 0, effectId: null });

function stateWithSpawn(owner = 'player') {
  const state = createInitialBattleState(emptyFaction, emptyFaction, { skipInitialDraw: true, firstActor: owner });
  state[owner].hand.push(spawnCard());
  return state;
}

function extractMethodBody(name, nextName) {
  const start = battleSceneSource.indexOf(`\n  ${name}(`);
  const normalEnd = battleSceneSource.indexOf(`\n  ${nextName}(`, start + 1);
  const asyncEnd = battleSceneSource.indexOf(`\n  async ${nextName}(`, start + 1);
  const end = normalEnd >= 0 ? normalEnd : asyncEnd;
  if (start < 0 || end < 0) throw new Error(`Failed to extract ${name}`);
  return battleSceneSource.slice(start, end);
}

function compileMethod(name, nextName, params, prelude = '') {
  const block = extractMethodBody(name, nextName);
  const bodyStart = block.indexOf(') {') + 3;
  const bodyEnd = block.lastIndexOf('}');
  return new Function(...params, `${prelude}${block.slice(bodyStart, bodyEnd)}`);
}

const getTargetingStateForCard = compileMethod('getTargetingStateForCard', 'isValidTarget', ['card', 'getTargetingStateForEffect', 'canPlayEffectCard']);
const cancelEffectTargeting = compileMethod('cancelEffectTargeting', 'applyEnemyOpeningMulligan', []);

test('Spawn promotes empty_friendly_slot card data into a reusable runtime target type', () => {
  const card = spawnCard();
  assert.deepEqual(getTargetingStateForEffect(card.effectId, card.id, card.targeting), {
    cardId: 'swarm_spawn_1',
    targetType: 'empty-friendly-slot',
    requiredTargets: 1,
    targetIndexes: [],
  });

  const state = stateWithSpawn();
  const scene = { gameState: state, isUnitCard: (item) => item?.type === 'unit' };
  assert.equal(getTargetingStateForCard.call(scene, card, getTargetingStateForEffect, () => ({ ok: true })).targetType, 'empty-friendly-slot');
});

test('shared empty-friendly-slot legality accepts only legal empty player fields', () => {
  const state = stateWithSpawn();
  state.board[7] = unit('player', 'occupied-ally');
  state.board[0] = null;
  state.playerLanePlayBlockedThisTurn = [false, false, true];

  assert.equal(isLegalEmptyFriendlySlotForUnitPlacement(state, 'player', 6), true);
  assert.equal(isLegalEmptyFriendlySlotForUnitPlacement(state, 'player', 7), false);
  assert.equal(isLegalEmptyFriendlySlotForUnitPlacement(state, 'player', 8), false);
  assert.equal(isLegalEmptyFriendlySlotForUnitPlacement(state, 'player', 0), false);
});

test('BattleScene source wires empty-friendly-slot into existing highlights and banner path', () => {
  assert.match(battleSceneSource, /isValidEmptyFriendlySlotTarget = this\.isValidTarget\(cell\.index, 'empty-friendly-slot'/);
  assert.match(battleSceneSource, /targetType === 'empty-friendly-slot' && isValidEmptyFriendlySlotTarget[\s\S]*strokeColor = 0x22c55e/);
  assert.match(battleSceneSource, /targetType === 'empty-friendly-slot'[\s\S]*ui\.battle\.targeting\.selectFreeSlot/);
  assert.equal(en.ui.battle.targeting.selectFreeSlot, 'CHOOSE A FREE SLOT');
  assert.equal(pl.ui.battle.targeting.selectFreeSlot, 'WYBIERZ WOLNE POLE');
});

test('Spawn waits for targeted confirmation and selected legal field receives the Grunt', () => {
  const state = stateWithSpawn();

  const result = resolveTargetedEffectCard(state, 'player', 'swarm_spawn_1', 8, [8]);

  assert.equal(result.ok, true);
  assert.equal(state.board[6], null);
  assert.equal(state.board[7], null);
  assert.match(state.board[8]?.id, /summoned_grunt/);
  assert.equal(state.player.hand.length, 0);
  assert.equal(state.player.discard[0].id, 'swarm_spawn_1');
});

test('Spawn final validation rejects stale occupied and blocked targets without consumption', () => {
  const occupied = stateWithSpawn();
  occupied.board[8] = unit('player', 'stale-occupant');
  const occupiedResult = resolveTargetedEffectCard(occupied, 'player', 'swarm_spawn_1', 8, [8]);
  assert.equal(occupiedResult.ok, false);
  assert.equal(occupied.player.hand.length, 1);
  assert.equal(occupied.player.discard.length, 0);

  const blocked = stateWithSpawn();
  blocked.playerLanePlayBlockedThisTurn = [false, false, true];
  const blockedResult = resolveTargetedEffectCard(blocked, 'player', 'swarm_spawn_1', 8, [8]);
  assert.equal(blockedResult.ok, false);
  assert.equal(blocked.player.hand.length, 1);
  assert.equal(blocked.player.discard.length, 0);
});

test('Spawn with one or zero legal fields follows targeted-effect commitment rules', () => {
  const one = stateWithSpawn();
  one.board[6] = unit('player', 'left');
  one.board[7] = unit('player', 'mid');
  assert.equal(getTargetingStateForEffect(spawnCard().effectId, 'swarm_spawn_1', 'empty_friendly_slot').targetType, 'empty-friendly-slot');
  assert.equal(resolveTargetedEffectCard(one, 'player', 'swarm_spawn_1', 8, [8]).ok, true);

  const zero = stateWithSpawn();
  zero.board[6] = unit('player', 'left');
  zero.board[7] = unit('player', 'mid');
  zero.board[8] = unit('player', 'right');
  const result = playEffectCard(zero, 'player', 'swarm_spawn_1');
  assert.equal(result.ok, false);
  assert.equal(zero.player.hand.length, 1);
  assert.equal(zero.player.discard.length, 0);
});

test('Spawn targeting cancellation keeps card and action state clear', () => {
  const state = stateWithSpawn();
  const scene = {
    gameState: state,
    playerActionUsed: false,
    isFlowResolving: false,
    targetingState: { cardId: 'swarm_spawn_1', targetType: 'empty-friendly-slot', requiredTargets: 1, targetIndexes: [] },
    effectCastState: { cardId: 'swarm_spawn_1' },
    pendingSwapIndex: null,
    hoverInspectCardId: null,
    boardInspectIndex: null,
    pressedHandCardId: null,
    pressedHandCardWasSelected: false,
    bannerDestroyed: false,
    highlightsReset: false,
    recordBattleReportEvent() {},
    destroyTargetingInstruction() { this.bannerDestroyed = true; },
    destroySelectedHandCardZoom() {},
    updatePlayerBaseActionState() {},
    resetCardHighlights() { this.highlightsReset = true; },
  };

  cancelEffectTargeting.call(scene);

  assert.equal(scene.targetingState, null);
  assert.equal(scene.effectCastState, null);
  assert.equal(scene.bannerDestroyed, true);
  assert.equal(scene.highlightsReset, true);
  assert.equal(state.player.hand.length, 1);
  assert.equal(state.player.discard.length, 0);
  assert.equal(scene.playerActionUsed, false);
});

test('AI Spawn generates one simulated candidate for each legal empty friendly field', () => {
  const state = createInitialBattleState(emptyFaction, emptyFaction, { skipInitialDraw: true, firstActor: 'enemy' });
  state.enemy.hand.push(spawnCard());

  const actions = buildActionCandidates(state, 'enemy', state.enemy.hand).filter((action) => action.cardId === 'swarm_spawn_1');

  assert.deepEqual(actions.map((action) => action.targetIndex), [0, 1, 2]);
  assert.deepEqual(actions.map((action) => action.targetIndexes), [[0], [1], [2]]);
  actions.forEach((action) => {
    const probe = structuredClone(state);
    const result = resolveTargetedEffectCard(probe, 'enemy', action.cardId, action.targetIndex, action.targetIndexes);
    assert.equal(result.ok, true);
    assert.match(probe.board[action.targetIndex]?.id, /summoned_grunt/);
    assert.equal(state.board[action.targetIndex], null);
  });
});

test('AI Spawn scoring chooses open-lane defense over hard-coded center preference', () => {
  const state = createInitialBattleState(emptyFaction, emptyFaction, { skipInitialDraw: true, firstActor: 'enemy' });
  state.enemy.hand.push(spawnCard());
  state.board[6] = unit('player', 'side-threat');
  state.board[6].attack = 10;
  state.board[6].hp = 2;
  state.board[6].maxHp = 2;

  const scores = Object.fromEntries(buildActionCandidates(state, 'enemy', state.enemy.hand)
    .filter((action) => action.cardId === 'swarm_spawn_1')
    .map((action) => [action.targetIndex, scoreAction(state, 'enemy', action)]));
  const action = chooseBattleAction(state, 'enemy', { aiSafeSurrenderEnabled: false, randomFn: () => 0.5 });

  assert.ok(scores[0] > scores[1]);
  assert.equal(action.cardId, 'swarm_spawn_1');
  assert.equal(action.targetIndex, 0);
});

test('AI Spawn scoring can choose adjacency/context over hard-coded lowest-index preference', () => {
  const state = createInitialBattleState(emptyFaction, emptyFaction, { skipInitialDraw: true, firstActor: 'enemy' });
  state.enemy.hand.push(spawnCard());
  state.board[0] = unit('enemy', 'alpha');
  state.board[0].effectId = 'adjacent_allies_atk_plus_1_ignore_armor_1';
  state.board[0].hp = 2;
  state.board[0].maxHp = 2;

  const scores = Object.fromEntries(buildActionCandidates(state, 'enemy', state.enemy.hand)
    .filter((action) => action.cardId === 'swarm_spawn_1')
    .map((action) => [action.targetIndex, scoreAction(state, 'enemy', action)]));
  const action = chooseBattleAction(state, 'enemy', { aiSafeSurrenderEnabled: false, randomFn: () => 0.9 });

  assert.ok(scores[1] > scores[2]);
  assert.equal(action.cardId, 'swarm_spawn_1');
  assert.equal(action.targetIndex, 1);
});

test('AI Spawn equal scores use existing seeded deterministic tie-break', () => {
  const stateA = createInitialBattleState(emptyFaction, emptyFaction, { skipInitialDraw: true, firstActor: 'enemy' });
  stateA.enemy.hand.push(spawnCard());
  const selectedA = chooseBattleAction(stateA, 'enemy', { aiSafeSurrenderEnabled: false, randomFn: () => 0.9 });

  const stateB = createInitialBattleState(emptyFaction, emptyFaction, { skipInitialDraw: true, firstActor: 'enemy' });
  stateB.enemy.hand.push(spawnCard());
  const selectedB = chooseBattleAction(stateB, 'enemy', { aiSafeSurrenderEnabled: false, randomFn: () => 0.9 });

  assert.equal(selectedA.targetIndex, 2);
  assert.equal(selectedB.targetIndex, selectedA.targetIndex);
  assert.equal(selectedA.aiEvaluation.tieBreak.reason, 'seeded exact-score tie-break');
  assert.equal(selectedA.aiEvaluation.tieBreak.tieCount, 3);
});
