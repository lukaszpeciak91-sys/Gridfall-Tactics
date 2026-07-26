import test from 'node:test';
import assert from 'node:assert/strict';
import control from '../src/data/factions/control.json' with { type: 'json' };
import { createInitialBattleState, playOrRedeployUnit, resolveTargetedUnitOnPlayEffect, resolveCombat } from '../src/systems/GameState.js';
import { buildActionCandidates, scoreAction } from '../src/systems/enemyDecision.js';
import { summarizeStandardCombatThreat } from '../src/systems/standardCombatThreat.js';
const sniper = () => structuredClone(control.deck.find(card => card.id === 'control_sniper_1'));
const enemy = (id, hp, attack = 1, extra = {}) => ({ id, cardId: id, type: 'unit', owner: 'player', hp, maxHp: hp, attack, armor: 0, ...extra });
const sniperActions = (state, slotIndex = 0) => buildActionCandidates(state, 'enemy', state.enemy.hand).filter(action => action.effectId === 'on_deploy_damage_enemy_unit_2' && action.slotIndex === slotIndex);

test('Sniper remains 2/1 and deploy shot deals exactly 2 ignoring unit armor under the current direct-damage rule', () => {
  const card = sniper(); assert.deepEqual([card.attack, card.hp, card.armor], [2, 1, 0]);
  const state = createInitialBattleState(control, control, { firstActor: 'enemy' }); state.enemy.hand = [card]; state.board[6] = enemy('armored', 3, 1, { armor: 9 });
  assert.equal(playOrRedeployUnit(state, 'enemy', card.id, 0).ok, true);
  const result = resolveTargetedUnitOnPlayEffect(state, 'enemy', 0, [6]);
  assert.equal(state.board[6].hp, 1); assert.equal(state.board[0].cardId, card.id); assert.equal(result.targetedEffect.damageDealt, 2);
  assert.equal(result.feedback[0].attackPresentation, 'beam'); assert.equal(result.combatSnapshot.board[6].hp, 3);
});

test('deploy shot rejects friendly, empty, and base-like targets and cannot damage either base', () => {
  const state = createInitialBattleState(control, control); state.board[0] = { ...sniper(), cardId: 'control_sniper_1', owner: 'enemy' }; state.board[1] = enemy('friendly', 2); state.board[1].owner = 'enemy';
  const hp = [state.playerHP, state.enemyHP];
  assert.equal(resolveTargetedUnitOnPlayEffect(state, 'enemy', 0, [1]).ok, false);
  assert.equal(resolveTargetedUnitOnPlayEffect(state, 'enemy', 0, [6]).ok, false);
  assert.equal(resolveTargetedUnitOnPlayEffect(state, 'enemy', 0, [null]).ok, false);
  assert.deepEqual([state.playerHP, state.enemyHP], hp);
});

test('zero-target deploy is legal and cancellation leaves the already-deployed unit and spent action intact', () => {
  const candidateState = createInitialBattleState(control, control); candidateState.enemy.hand = [sniper()];
  const zeroTargetActions = buildActionCandidates(candidateState, 'enemy', candidateState.enemy.hand).filter(action => action.cardId === 'control_sniper_1');
  assert.equal(zeroTargetActions.length, 3); assert.equal(zeroTargetActions.every(action => action.targetIndexes === undefined), true);
  const state = createInitialBattleState(control, control); state.enemy.hand = [sniper()];
  const played = playOrRedeployUnit(state, 'enemy', 'control_sniper_1', 0); assert.equal(played.ok, true);
  const pending = resolveTargetedUnitOnPlayEffect(state, 'enemy', 0, []); assert.equal(pending.type, 'unit-on-play-targeted-effect-pending');
  assert.equal(state.board[0].cardId, 'control_sniper_1'); assert.equal(state.enemy.hand.length, 0); assert.equal(state.enemy.discard[0].id, 'control_sniper_1');
});

test('lethal deploy cleanup and universal death triggers execute exactly once', () => {
  const state = createInitialBattleState(control, control); state.enemy.hand = [sniper()]; state.board[6] = enemy('drone', 2, 1, { effectId: 'death_damage_enemy_hero_1' });
  playOrRedeployUnit(state, 'enemy', 'control_sniper_1', 0); const result = resolveTargetedUnitOnPlayEffect(state, 'enemy', 0, [6]);
  assert.equal(result.targetedEffect.lethal, true); assert.equal(state.board[6], null); assert.equal(state.player.fallen.length, 1); assert.equal(state.enemyHP, 11);
  assert.equal(state.board[0].cardId, 'control_sniper_1');
});

test('later combat is ordinary opposing-lane combat and threat diagnostics have no Sniper prediction schema', () => {
  const state = createInitialBattleState(control, control); state.board[6] = { ...sniper(), cardId: 'control_sniper_1', owner: 'player' }; state.board[0] = { ...enemy('opposed', 4), owner: 'enemy' }; state.board[1] = { ...enemy('weak', 1), owner: 'enemy' };
  const summary = summarizeStandardCombatThreat(state); assert.equal(summary.plannedAttacks.find(a => a.sourceIndex === 6).targetIndex, 0);
  assert.equal(Object.keys(summary).some(key => key.toLowerCase().includes('sniper')), false);
  resolveCombat(state); assert.equal(state.board[1].hp, 1); assert.equal(state.board[0].hp, 2);
});

test('AI enumerates every target and selected-target simulation matches runtime resolution', () => {
  const state = createInitialBattleState(control, control); state.enemy.hand = [sniper()]; state.board[6] = enemy('a', 2, 3); state.board[7] = enemy('b', 4, 4); state.board[8] = enemy('c', 3, 2);
  const shots = sniperActions(state); assert.deepEqual(shots.map(a => a.targetIndex).sort(), [6, 7, 8]);
  const chosen = shots.find(action => action.targetIndex === 7); scoreAction(state, 'enemy', chosen);
  const runtime = structuredClone(state); playOrRedeployUnit(runtime, 'enemy', chosen.cardId, chosen.slotIndex); const result = resolveTargetedUnitOnPlayEffect(runtime, 'enemy', chosen.slotIndex, chosen.targetIndexes);
  assert.equal(result.targetedEffect.targetIndex, 7); assert.equal(runtime.board[7].hp, 2); assert.equal(runtime.board[6].hp, 2);
});

test('target scoring values important kills, can prefer a superior nonlethal shot, and ranks multiple lethal targets tactically', () => {
  const state = createInitialBattleState(control, control); state.enemy.hand = [sniper()]; state.board[6] = enemy('trivial', 1, 0); state.board[7] = enemy('valuable-survivor', 3, 6);
  let shots = sniperActions(state, 2); const trivial = shots.find(a => a.targetIndex === 6); const setup = shots.find(a => a.targetIndex === 7);
  assert.ok(scoreAction(state, 'enemy', setup) > scoreAction(state, 'enemy', trivial));
  state.board[6] = enemy('low-value-lethal', 2, 1); state.board[7] = enemy('high-value-lethal', 2, 6); shots = sniperActions(state, 2);
  const low = shots.find(a => a.targetIndex === 6); const high = shots.find(a => a.targetIndex === 7);
  assert.ok(scoreAction(state, 'enemy', high) > scoreAction(state, 'enemy', low));
  assert.equal('precisionShotLethal' in high.aiEvaluation.scoreComponents, false);
  assert.equal(Object.keys(high.aiEvaluation.scoreComponents).filter(key => key === 'kills').length, 1);
  assert.equal(Object.keys(high.aiEvaluation.scoreComponents).filter(key => key === 'precisionShotTargetValue').length, 1);
});
