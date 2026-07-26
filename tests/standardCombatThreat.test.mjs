import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStandardCombatAttackPlan, createInitialBattleState } from '../src/systems/GameState.js';
import { scoreAction } from '../src/systems/enemyDecision.js';
import { summarizeStandardCombatThreat } from '../src/systems/standardCombatThreat.js';
const makeState = () => createInitialBattleState({ name: 'Player', deck: [] }, { name: 'Enemy', deck: [] });
const unit = (owner, id, attack, hp, extra = {}) => ({ id, cardId: id, name: id, type: 'unit', owner, attack, hp, maxHp: hp, armor: 0, effectId: null, ...extra });

test('canonical threat summary mirrors ordinary plan and aggregates damage', () => {
  const state = makeState(); state.board[0] = unit('enemy', 'ordinary', 2, 2); state.board[6] = unit('player', 'target', 1, 2);
  const plan = buildStandardCombatAttackPlan(state); const summary = summarizeStandardCombatThreat(state);
  assert.deepEqual(summary.plannedAttacks.map(({ sourceIndex, targetIndex, damage }) => ({ sourceIndex, targetIndex, damage })), plan.plans.map(({ sourceIndex, targetIndex, damage }) => ({ sourceIndex, targetIndex, damage })));
  assert.deepEqual(summary.predictedDeadUnitIndexes, [6]);
});

test('ordinary lane armor, lethality, and frozen attack entitlement remain canonical', () => {
  const state = makeState(); state.board[0] = unit('enemy', 'attacker', 2, 1); state.board[6] = unit('player', 'armored', 3, 1, { armor: 2 });
  const summary = summarizeStandardCombatThreat(state); const attack = summary.plannedAttacks.find(item => item.sourceIndex === 0);
  assert.equal(attack.targetIndex, 6); assert.equal(attack.damage, 0); assert.equal(attack.attackEntitled, true);
  assert.equal(summary.predictedDeadUnitIndexes.includes(0), true); assert.equal(summary.predictedDeadUnitIndexes.includes(6), false);
});

test('open lanes attack bases and occupied lanes receive normal blocking credit', () => {
  const state = makeState(); state.board[0] = unit('enemy', 'attacker', 2, 2);
  assert.equal(summarizeStandardCombatThreat(state).baseDamageByOwner.player, 2);
  const blocker = unit('player', 'blocker', 1, 2); delete blocker.owner; state.player.hand = [blocker];
  const action = { type: 'play-unit', cardId: blocker.id, slotIndex: 6 }; scoreAction(state, 'player', action);
  assert.ok(action.aiEvaluation.scoreComponents.laneBlocking > 0);
});

test('standard threat diagnostics expose no deleted Sniper prediction schema', () => {
  const summary = summarizeStandardCombatThreat(makeState());
  for (const key of ['sniperAttacks', 'sniperDiagnostics', 'selectedSniperTargetIndexes']) assert.equal(key in summary, false);
});
