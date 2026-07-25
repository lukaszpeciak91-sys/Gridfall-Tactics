import test from 'node:test';
import assert from 'node:assert/strict';
import { buildActionCandidates, chooseBattleAction, scoreAction } from '../src/systems/enemyDecision.js';
import { createInitialBattleState } from '../src/systems/GameState.js';
import { getFactionByKey } from '../src/data/factions/index.js';

function fresh(player = 'Aggro', enemy = 'Swarm') {
  const state = createInitialBattleState(getFactionByKey(player), getFactionByKey(enemy), { firstActor: 'enemy' });
  state.player.deck = []; state.enemy.deck = []; state.player.hand = []; state.enemy.hand = [];
  return state;
}
const generic = { id: 'profile_generic', name: 'Body', type: 'unit', targeting: 'lane', effectId: null, attack: 1, hp: 2, armor: 0 };
const alpha = { owner: 'enemy', cardId: 'swarm_alpha_1', id: 'swarm_alpha_1', name: 'Alpha', effectId: 'adjacent_allies_atk_plus_1_ignore_armor_1', attack: 1, hp: 2, armor: 0 };

test('profile off preserves production selection, candidates, scores, and components exactly', () => {
  const a = fresh(); const b = structuredClone(a); a.enemy.hand = [structuredClone(generic)]; b.enemy.hand = [structuredClone(generic)];
  const candidatesA = buildActionCandidates(a, 'enemy', a.enemy.hand);
  const before = candidatesA.map((action) => ({ score: scoreAction(a, 'enemy', action), components: action.aiEvaluation?.scoreDiagnostics?.components }));
  const off = chooseBattleAction(a, 'enemy', { aiSafeSurrenderEnabled: false, randomFn: () => .7, swarmProfile: 'off' });
  const candidatesB = buildActionCandidates(b, 'enemy', b.enemy.hand);
  const after = candidatesB.map((action) => ({ score: scoreAction(b, 'enemy', action), components: action.aiEvaluation?.scoreDiagnostics?.components }));
  const omitted = chooseBattleAction(b, 'enemy', { aiSafeSurrenderEnabled: false, randomFn: () => .7 });
  assert.deepEqual(before, after); assert.deepEqual(candidatesA.map(a => [a.type, a.slotIndex]), candidatesB.map(a => [a.type, a.slotIndex]));
  assert.deepEqual({ type: off.type, slotIndex: off.slotIndex }, { type: omitted.type, slotIndex: omitted.slotIndex });
});

test('non-Swarm faction is behaviorally identical and records zero profile telemetry', () => {
  const a = fresh('Swarm', 'Aggro'); const b = structuredClone(a); a.enemy.hand = [structuredClone(generic)]; b.enemy.hand = [structuredClone(generic)];
  const telemetry = {};
  const off = chooseBattleAction(a, 'enemy', { aiSafeSurrenderEnabled: false, randomFn: () => .2, swarmProfile: 'off' });
  const on = chooseBattleAction(b, 'enemy', { aiSafeSurrenderEnabled: false, randomFn: () => .2, swarmProfile: 'alpha-width-v1', telemetry });
  assert.deepEqual({ type: off.type, slotIndex: off.slotIndex }, { type: on.type, slotIndex: on.slotIndex });
  assert.equal(telemetry.swarmProfile, undefined);
});

test('close Swarm placement prefers Alpha formation without changing base score components', () => {
  const state = fresh(); state.board[0] = alpha; state.enemy.hand = [structuredClone(generic)];
  const actions = buildActionCandidates(state, 'enemy', state.enemy.hand).filter(a => a.type === 'play-unit');
  const componentSnapshots = actions.map(action => { scoreAction(state, 'enemy', action); return structuredClone(action.aiEvaluation.scoreComponents); });
  const chosen = chooseBattleAction(state, 'enemy', { aiSafeSurrenderEnabled: false, randomFn: () => .99, swarmProfile: 'alpha-width-v1', swarmProfileWindow: 80 });
  assert.equal(chosen.slotIndex, 1);
  assert.equal(typeof chosen.aiEvaluation.swarmProfile.reason, 'string');
  actions.forEach((action, i) => { scoreAction(state, 'enemy', action); assert.deepEqual(action.aiEvaluation.scoreComponents, componentSnapshots[i]); });
});

test('profile never selects PASS personality action or exceeds configured shortlist', () => {
  const state = fresh(); state.board[0] = alpha; state.enemy.hand = [structuredClone(generic)];
  state.board[7] = { owner: 'player', id: 'threat', attack: 10, hp: 5, armor: 0 };
  const chosen = chooseBattleAction(state, 'enemy', { aiSafeSurrenderEnabled: false, randomFn: () => .5, swarmProfile: 'alpha-width-v1', swarmProfileWindow: 40 });
  assert.notEqual(chosen.type, 'pass');
  assert.ok(chosen.aiEvaluation.swarmProfile.baseScoreDelta <= 40);
});
