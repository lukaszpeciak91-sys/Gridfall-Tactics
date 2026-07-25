import test from 'node:test';
import assert from 'node:assert/strict';

import { buildStandardCombatAttackPlan, createInitialBattleState } from '../src/systems/GameState.js';
import { scoreAction } from '../src/systems/enemyDecision.js';
import { summarizeStandardCombatThreat } from '../src/systems/standardCombatThreat.js';

const makeState = () => createInitialBattleState({ name: 'Player', deck: [] }, { name: 'Enemy', deck: [] });
const unit = (owner, id, attack, hp, extra = {}) => ({
  id, cardId: id, name: id, type: 'unit', owner, attack, hp, maxHp: hp, armor: 0, effectId: null, ...extra,
});

test('canonical threat summary mirrors ordinary plan and aggregates damage', () => {
  const state = makeState();
  state.board[0] = unit('enemy', 'ordinary', 2, 2);
  state.board[6] = unit('player', 'target', 1, 2);
  const plan = buildStandardCombatAttackPlan(state);
  const summary = summarizeStandardCombatThreat(state);
  assert.deepEqual(summary.plannedAttacks.map(({ sourceIndex, targetIndex, damage }) => ({ sourceIndex, targetIndex, damage })),
    plan.plans.map(({ sourceIndex, targetIndex, damage }) => ({ sourceIndex, targetIndex, damage })));
  assert.deepEqual(summary.predictedDeadUnitIndexes, [6]);
});

test('off-lane Sniper target, HP/ATK/index ties, and lethality come from canonical plan', () => {
  const state = makeState();
  state.board[0] = unit('enemy', 'sniper', 2, 1, { effectId: 'can_hit_any_lane' });
  state.board[6] = unit('player', 'opposite', 1, 3);
  state.board[7] = unit('player', 'low-a', 1, 1);
  state.board[8] = unit('player', 'low-b', 3, 1);
  let summary = summarizeStandardCombatThreat(state);
  assert.equal(summary.sniperAttacks[0].targetIndex, 8, 'effective ATK breaks the HP tie');
  assert.equal(summary.predictedDeadUnitIndexes.includes(8), true);
  assert.equal(summary.threatenedUnitIndexes.includes(6), false);

  state.board[7].attack = 3;
  summary = summarizeStandardCombatThreat(state);
  assert.equal(summary.sniperAttacks[0].targetIndex, 7, 'lowest index breaks the remaining tie');
});

test('armor mitigates Sniper damage without changing raw-HP target identity', () => {
  const state = makeState();
  state.board[0] = unit('enemy', 'sniper', 2, 1, { effectId: 'can_hit_any_lane' });
  state.board[7] = unit('player', 'armored', 4, 1, { armor: 2 });
  state.board[8] = unit('player', 'healthy', 1, 2);
  const summary = summarizeStandardCombatThreat(state);
  assert.equal(summary.sniperAttacks[0].targetIndex, 7);
  assert.equal(summary.sniperAttacks[0].damage, 0);
  assert.equal(summary.predictedDeadUnitIndexes.includes(7), false);
});

test('Sniper attacks base only with no opposing units and keeps frozen attack when doomed', () => {
  const state = makeState();
  state.board[0] = unit('enemy', 'sniper', 2, 1, { effectId: 'can_hit_any_lane' });
  let summary = summarizeStandardCombatThreat(state);
  assert.equal(summary.sniperAttacks[0].targetType, 'hero');
  assert.equal(summary.baseDamageByOwner.player, 2);

  state.board[6] = unit('player', 'killer', 3, 2);
  summary = summarizeStandardCombatThreat(state);
  assert.equal(summary.predictedDeadUnitIndexes.includes(0), true);
  assert.equal(summary.sniperAttacks.length, 1);
  assert.equal(summary.sniperAttacks[0].attackEntitled, true);
});

test('Sniper placement diagnostics report off-lane kill and suppress false base pressure', () => {
  const state = makeState();
  const sniper = unit('enemy', 'control_sniper_1', 2, 1, { effectId: 'can_hit_any_lane' });
  delete sniper.owner;
  state.enemy.hand = [sniper];
  state.board[7] = unit('player', 'off-lane-target', 3, 1);
  const action = { type: 'play-unit', cardId: sniper.id, slotIndex: 0 };
  scoreAction(state, 'enemy', action);
  assert.equal(action.aiEvaluation.canonicalCombatPredictionUsed, true);
  assert.equal(action.aiEvaluation.canonicalCombatPrediction.sniper[0].selectedTargetIndex, 7);
  assert.equal(action.aiEvaluation.canonicalCombatPrediction.sniper[0].predictedTargetDeath, true);
  assert.equal(action.aiEvaluation.canonicalCombatPrediction.sniper[0].plannedBaseDamage, 0);
  assert.equal(action.aiEvaluation.scoreComponents.openLanePlacement ?? 0, 0);
});

test('opposite body receives no false laneBlocking credit against off-lane Sniper target', () => {
  const state = makeState();
  state.board[0] = unit('enemy', 'sniper', 2, 1, { effectId: 'can_hit_any_lane' });
  state.board[7] = unit('player', 'valuable', 4, 1);
  const blocker = unit('player', 'blocker', 1, 2); delete blocker.owner;
  state.player.hand = [blocker];
  const action = { type: 'play-unit', cardId: blocker.id, slotIndex: 6 };
  scoreAction(state, 'player', action);
  assert.equal(action.aiEvaluation.scoreComponents.laneBlocking ?? 0, 0);
  assert.equal(action.aiEvaluation.canonicalCombatPrediction.falseLaneBlockingCorrectionApplied, true);
  assert.equal(action.aiEvaluation.canonicalCombatPrediction.sniper[0].selectedTargetIndex, 7);
});

test('heal, debuff, removal, movement, and a current 1-HP body recompute canonical facts', () => {
  const state = makeState();
  state.board[0] = unit('enemy', 'sniper', 2, 1, { effectId: 'can_hit_any_lane' });
  state.board[7] = unit('player', 'valuable', 4, 1);
  state.board[8] = unit('player', 'backup', 1, 2);

  state.board[7].hp = 3;
  assert.equal(summarizeStandardCombatThreat(state).sniperAttacks[0].targetIndex, 8, 'heal redirects to new lowest HP');
  state.board[7].hp = 1;
  state.board[0].tempAttackMod = -1;
  assert.equal(summarizeStandardCombatThreat(state).predictedDeadUnitIndexes.includes(7), true, 'one damage is still lethal at 1 HP');
  state.board[7].hp = 2;
  assert.equal(summarizeStandardCombatThreat(state).predictedDeadUnitIndexes.includes(7), false, 'debuff now prevents lethal');

  state.board[6] = unit('player', 'decoy', 0, 1);
  assert.equal(summarizeStandardCombatThreat(state).sniperAttacks[0].targetIndex, 6, '1-HP decoy redirects by canonical tie-break');
  [state.board[6], state.board[7]] = [state.board[7], state.board[6]];
  assert.equal(summarizeStandardCombatThreat(state).sniperAttacks[0].targetIndex, 7, 'movement recomputes the lowest-index tie');

  state.offlineUnits = [{ boardIndex: 0, unit: state.board[0] }];
  state.board[0] = null;
  assert.equal(summarizeStandardCombatThreat(state).sniperAttacks.length, 0, 'removed/offline Sniper has no entitlement');
});
