import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createInitialBattleState } from '../src/systems/GameState.js';
import { getFactionByKey } from '../src/data/factions/index.js';
import { buildActionCandidates, chooseBattleAction, getAiScoreDiagnosticRecord, scoreAction } from '../src/systems/enemyDecision.js';

function unit(id, owner, attack = 1, hp = 1, effectId = null) {
  return { id, cardId: id, name: id, type: 'unit', owner, attack, hp, maxHp: hp, armor: 0, effectId };
}

function baseState() {
  const state = createInitialBattleState(getFactionByKey('aggro'), getFactionByKey('wardens'), { firstActor: 'enemy', randomFn: () => 0.1 });
  state.player.hand = [];
  state.enemy.hand = [];
  state.player.deck = [];
  state.enemy.deck = [];
  state.board = Array(9).fill(null);
  state.aiSafeSurrender = { player: 0, enemy: 0 };
  return state;
}

function sumComponents(action) {
  return Object.values(action.aiEvaluation?.scoreComponents ?? {}).reduce((total, value) => total + value, 0);
}

test('score components preserve exact score for generic open-lane unit', () => {
  const state = baseState();
  const card = { id: 'plain', name: 'Plain', type: 'unit', targeting: 'lane', attack: 2, hp: 2, armor: 0 };
  state.enemy.hand = [card];
  const action = { type: 'play-unit', cardId: 'plain', slotIndex: 0 };
  const score = scoreAction(state, 'enemy', action);
  assert.equal(score, 4304);
  assert.deepEqual(action.aiEvaluation.scoreComponents, {
    heroPressureGain: 960,
    boardPressureGain: 964,
    openLaneImprovement: 1010,
    openLanePlacement: 1200,
    playUnitBase: 150,
    immediateBattleImpact: 20,
  });
  assert.equal(sumComponents(action), score);
});

test('score components preserve exact score for unit blocking incoming damage', () => {
  const state = baseState();
  const card = { id: 'blocker', name: 'Blocker', type: 'unit', targeting: 'lane', attack: 1, hp: 2, armor: 0 };
  state.enemy.hand = [card];
  state.board[6] = unit('attacker', 'player', 2, 2);
  const action = { type: 'play-unit', cardId: 'blocker', slotIndex: 0 };
  const score = scoreAction(state, 'enemy', action);
  assert.equal(score, 2551);
  assert.equal(action.aiEvaluation.scoreComponents.laneBlocking, 1240);
  assert.equal(sumComponents(action), score);
});

test('adjacency-dependent middle placement and Wardens stacking are named', () => {
  const state = baseState();
  const card = { id: 'wardens_spearwall_1', name: 'Spearwall', type: 'unit', targeting: 'lane', attack: 1, hp: 1, armor: 0, effectId: 'warden_defensive_friction_adjacent' };
  state.enemy.hand = [card];
  state.board[0] = unit('ally', 'enemy', 1, 1);
  const action = { type: 'play-unit', cardId: card.id, slotIndex: 1 };
  const score = scoreAction(state, 'enemy', action);
  assert.equal(score, sumComponents(action));
  assert.equal(action.aiEvaluation.scoreComponents.adjacencyFormation, 198);
  assert.equal(action.aiEvaluation.scoreComponents.wardensAdjacency, 200);
  assert.equal(action.aiEvaluation.scoreComponents.wardensMiddleFormation, 80);
});

test('PASS diagnostics remain score 0 without artificial components', () => {
  const state = baseState();
  const action = { type: 'pass' };
  assert.equal(scoreAction(state, 'enemy', action), 0);
  assert.equal(action.aiEvaluation.kind, 'hold');
  assert.equal(action.aiEvaluation.scoreComponents, undefined);
});

test('negative utility cost reconciles with component total for meaningful utility', () => {
  const state = baseState();
  const card = { id: 'armor', name: 'Armor', type: 'utility', targeting: 'friendly_unit', effectId: 'temp_armor_1' };
  state.enemy.hand = [card];
  state.board[0] = unit('ally', 'enemy', 3, 2);
  state.board[6] = unit('threat', 'player', 2, 2);
  const action = { type: 'play-targeted-effect', cardId: 'armor', targetIndex: 0, targetIndexes: [0], effectId: 'temp_armor_1' };
  const score = scoreAction(state, 'enemy', action);
  assert.equal(action.aiEvaluation.scoreComponents.utilityOpportunityCost, -400);
  assert.equal(action.aiEvaluation.utilityScoreBeforeCost - action.aiEvaluation.utilityOpportunityCost, action.aiEvaluation.utilityScoreAfterCost);
  assert.equal(sumComponents(action), score);
});

test('-Infinity rejected action remains rejected', () => {
  const state = baseState();
  const card = { id: 'last', name: 'Last', type: 'special', targeting: 'all_friendly_units', effectId: 'cannot_drop_below_1_this_turn' };
  state.enemy.hand = [card];
  const action = { type: 'play-effect', cardId: 'last', effectId: 'cannot_drop_below_1_this_turn' };
  assert.equal(scoreAction(state, 'enemy', action), Number.NEGATIVE_INFINITY);
});

test('utility threshold filtering and seeded exact ties keep selected action stable', () => {
  const state = baseState();
  const badUtility = { id: 'draw', name: 'Draw', type: 'utility', targeting: 'none', effectId: 'draw_1' };
  const a = { id: 'a', name: 'A', type: 'unit', targeting: 'lane', attack: 1, hp: 1, armor: 0 };
  const b = { id: 'b', name: 'B', type: 'unit', targeting: 'lane', attack: 1, hp: 1, armor: 0 };
  state.enemy.hand = [badUtility, a, b];
  const actions = buildActionCandidates(state, 'enemy', state.enemy.hand);
  assert.deepEqual(actions.map((action) => [action.type, action.cardId ?? null, action.slotIndex ?? null]), [
    ['pass', null, null],
    ['play-effect', 'draw', null],
    ['play-unit', 'a', 0],
    ['play-unit', 'a', 1],
    ['play-unit', 'a', 2],
    ['play-unit', 'b', 0],
    ['play-unit', 'b', 1],
    ['play-unit', 'b', 2],
  ]);
  const chosen = chooseBattleAction(state, 'enemy', { aiSafeSurrenderEnabled: false, randomFn: () => 0, tieBreakPolicy: 'seeded-random' });
  assert.equal(chosen.cardId, 'a');
  assert.equal(chosen.slotIndex, 0);
});

test('normalized diagnostic record exposes expected schema', () => {
  const state = baseState();
  state.enemy.hand = [{ id: 'plain', name: 'Plain', type: 'unit', targeting: 'lane', attack: 2, hp: 2, armor: 0 }];
  const action = { type: 'play-unit', cardId: 'plain', slotIndex: 0 };
  const score = scoreAction(state, 'enemy', action);
  const record = getAiScoreDiagnosticRecord(action, score);
  assert.equal(record.actionType, 'play-unit');
  assert.equal(record.totalScore, score);
  assert.equal(record.components.openLanePlacement, 1200);
  assert.equal(record.hasImmediateBattleImpact, true);
});

test('normal simulator mode does not print detailed score-component diagnostics', () => {
  const output = execFileSync(process.execPath, ['scripts/simulate-battles.mjs', '1', '1337', '--only=Aggro:Aggro'], { encoding: 'utf8' });
  assert.doesNotMatch(output, /AI score-component diagnostics/);
});

test('diagnostic-summary aggregates selected components and decision flips', () => {
  const output = execFileSync(process.execPath, ['scripts/simulate-battles.mjs', '1', '1337', '--only=Aggro:Aggro', '--ai-diagnostics=summary'], { encoding: 'utf8' });
  assert.match(output, /AI score-component diagnostics/);
  assert.match(output, /Selected component contribution/);
  assert.match(output, /Decision-flip contribution/);
});

test('diagnostic-sample respects bound and is deterministic', () => {
  const args = ['scripts/simulate-battles.mjs', '1', '1337', '--only=Aggro:Aggro', '--ai-diagnostics=sample', '--ai-diagnostic-sample-limit=2'];
  const first = execFileSync(process.execPath, args, { encoding: 'utf8' });
  const second = execFileSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(first, second);
  assert.match(first, /AI score-component diagnostic samples \(2\/2\)/);
});

