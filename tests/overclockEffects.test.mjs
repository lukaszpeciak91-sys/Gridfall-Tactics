import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialBattleState,
  getEffectiveBoardAttack,
  isBoardUnitOffline,
  normalizeOfflineReservations,
  playEffectCard,
  playOrRedeployUnit,
  resolveCombat,
  resolveTargetedEffectCard,
} from '../src/systems/GameState.js';
import { buildActionCandidates, scoreAction } from '../src/systems/enemyDecision.js';

const unitCard = (id, attack = 2, hp = 5, effectId = null) => ({
  id,
  name: id,
  type: 'unit',
  targeting: 'lane',
  attack,
  hp,
  armor: 0,
  effectId,
});

const orderCard = (id, effectId) => ({
  id,
  name: id,
  type: 'order',
  targeting: 'friendly_unit',
  effectId,
});

function stateWithHands(playerHand = [], enemyHand = []) {
  const state = createInitialBattleState({ id: 'p', name: 'P', deck: [] }, { id: 'e', name: 'E', deck: [] }, { firstActor: 'player' });
  state.player.hand.push(...playerHand);
  state.enemy.hand.push(...enemyHand);
  return state;
}

test('decay_attack_after_combat reduces attack after combat and does not go below 1', () => {
  const card = unitCard('decayer', 3, 6, 'decay_attack_after_combat');
  const state = stateWithHands([card]);
  assert.equal(playOrRedeployUnit(state, 'player', 'decayer', 6).ok, true);
  assert.equal(getEffectiveBoardAttack(state, 6), 3);

  resolveCombat(state);
  assert.equal(state.board[6].attackDecay, 1);
  assert.equal(getEffectiveBoardAttack(state, 6), 2);

  resolveCombat(state);
  assert.equal(state.board[6].attackDecay, 2);
  assert.equal(getEffectiveBoardAttack(state, 6), 1);

  resolveCombat(state);
  assert.equal(state.board[6].attackDecay, 2);
  assert.equal(getEffectiveBoardAttack(state, 6), 1);
});

test('decay is instance-based and does not mutate card JSON', () => {
  const card = unitCard('decayer', 2, 4, 'decay_attack_after_combat');
  const state = stateWithHands([card]);
  playOrRedeployUnit(state, 'player', 'decayer', 6);
  resolveCombat(state);

  assert.equal(card.attack, 2);
  assert.equal(card.attackDecay, undefined);
  assert.equal(state.board[6].attackDecay, 1);

  state.board[6] = null;
  state.player.hand.push(card);
  playOrRedeployUnit(state, 'player', 'decayer', 7);
  assert.equal(state.board[7].attackDecay, undefined);
  assert.equal(getEffectiveBoardAttack(state, 7), 2);
});

test('atk_plus_per_other_ally counts other allied units only, not itself or enemies', () => {
  const state = stateWithHands([
    unitCard('alpha', 1, 3, 'atk_plus_per_other_ally'),
    unitCard('ally', 2, 3),
  ], [unitCard('enemy', 2, 3)]);
  playOrRedeployUnit(state, 'player', 'alpha', 6);
  assert.equal(getEffectiveBoardAttack(state, 6), 1);
  playOrRedeployUnit(state, 'player', 'ally', 7);
  assert.equal(getEffectiveBoardAttack(state, 6), 2);
  playOrRedeployUnit(state, 'enemy', 'enemy', 0);
  assert.equal(getEffectiveBoardAttack(state, 6), 2);
});

test('swap_any_two_friendly_units_buff_both_atk_1 swaps two friendly units and buffs both until combat', () => {
  const swap = orderCard('swap', 'swap_any_two_friendly_units_buff_both_atk_1');
  const a = unitCard('a', 1, 4);
  const b = unitCard('b', 2, 4);
  const state = stateWithHands([a, b, swap]);
  playOrRedeployUnit(state, 'player', 'a', 6);
  playOrRedeployUnit(state, 'player', 'b', 8);

  const result = resolveTargetedEffectCard(state, 'player', 'swap', 6, [6, 8]);
  assert.equal(result.ok, true);
  assert.equal(state.board[6].cardId, 'b');
  assert.equal(state.board[8].cardId, 'a');
  assert.equal(getEffectiveBoardAttack(state, 6), 3);
  assert.equal(getEffectiveBoardAttack(state, 8), 2);

  resolveCombat(state);
  assert.equal(state.board[6]?.tempAttackMod, undefined);
  assert.equal(state.board[8]?.tempAttackMod, undefined);
});

test('invalid friendly swap targets do not partially resolve', () => {
  const swap = orderCard('swap', 'swap_any_two_friendly_units_buff_both_atk_1');
  const state = stateWithHands([unitCard('a', 1, 4), swap], [unitCard('e', 3, 4)]);
  playOrRedeployUnit(state, 'player', 'a', 6);
  playOrRedeployUnit(state, 'enemy', 'e', 0);

  const result = resolveTargetedEffectCard(state, 'player', 'swap', 6, [6, 0]);
  assert.equal(result.ok, false);
  assert.equal(state.board[6].cardId, 'a');
  assert.equal(state.board[0].cardId, 'e');
  assert.equal(state.board[6].tempAttackMod, undefined);
  assert.equal(state.board[0].tempAttackMod, undefined);
  assert.equal(state.player.hand.some((card) => card.id === 'swap'), true);
});

test('Overclock effects work for enemy owner', () => {
  const swap = orderCard('swap', 'swap_any_two_friendly_units_buff_both_atk_1');
  const state = stateWithHands([], [
    unitCard('decayer', 2, 5, 'decay_attack_after_combat'),
    unitCard('alpha', 1, 5, 'atk_plus_per_other_ally'),
    swap,
  ]);
  playOrRedeployUnit(state, 'enemy', 'decayer', 0);
  playOrRedeployUnit(state, 'enemy', 'alpha', 2);
  assert.equal(getEffectiveBoardAttack(state, 2), 2);

  const result = resolveTargetedEffectCard(state, 'enemy', 'swap', 0, [0, 2]);
  assert.equal(result.ok, true);
  assert.equal(state.board[0].cardId, 'alpha');
  assert.equal(state.board[2].cardId, 'decayer');
  assert.equal(getEffectiveBoardAttack(state, 0), 3);

  resolveCombat(state);
  assert.equal(getEffectiveBoardAttack(state, 2), 1);
});

test('enemy_atk_to_0_until_combat zeroes selected enemy attack until combat without mutating card JSON', () => {
  const debuff = { id: 'mercy', name: 'Mercy', type: 'utility', targeting: 'enemy_unit', effectId: 'enemy_atk_to_0_until_combat' };
  const enemyCard = unitCard('enemy-bruiser', 3, 5);
  const state = stateWithHands([debuff], [enemyCard]);
  playOrRedeployUnit(state, 'enemy', 'enemy-bruiser', 0);
  const beforeHp = state.board[0].hp;
  const beforeArmor = state.board[0].armor;

  const result = resolveTargetedEffectCard(state, 'player', 'mercy', 0, [0]);

  assert.equal(result.ok, true);
  assert.equal(getEffectiveBoardAttack(state, 0), 0);
  assert.equal(state.board[0].hp, beforeHp);
  assert.equal(state.board[0].armor, beforeArmor);
  assert.equal(enemyCard.attack, 3);
  assert.equal(enemyCard.tempAttackSetToZeroUntilCombat, undefined);

  resolveCombat(state);
  assert.equal(getEffectiveBoardAttack(state, 0), 3);
  assert.equal(state.board[0].tempAttackSetToZeroUntilCombat, undefined);
});

test('enemy_atk_to_0_until_combat works for enemy owner and suppresses combat base damage', () => {
  const debuff = { id: 'mercy', name: 'Mercy', type: 'utility', targeting: 'enemy_unit', effectId: 'enemy_atk_to_0_until_combat' };
  const state = stateWithHands([unitCard('player-striker', 2, 5)], [debuff]);
  playOrRedeployUnit(state, 'player', 'player-striker', 6);

  const result = resolveTargetedEffectCard(state, 'enemy', 'mercy', 6, [6]);

  assert.equal(result.ok, true);
  assert.equal(getEffectiveBoardAttack(state, 6), 0);
  resolveCombat(state);
  assert.equal(state.enemyHP, 12);
  assert.equal(getEffectiveBoardAttack(state, 6), 2);
});

test('enemy_atk_to_0_until_combat cleanup is safe when target leaves board before combat', () => {
  const debuff = { id: 'mercy', name: 'Mercy', type: 'utility', targeting: 'enemy_unit', effectId: 'enemy_atk_to_0_until_combat' };
  const state = stateWithHands([debuff], [unitCard('fragile-enemy', 1, 1)]);
  playOrRedeployUnit(state, 'enemy', 'fragile-enemy', 0);
  assert.equal(resolveTargetedEffectCard(state, 'player', 'mercy', 0, [0]).ok, true);
  state.board[0] = null;

  assert.doesNotThrow(() => resolveCombat(state));
});

test('lane_tempo_mod_until_combat supports enemy_unit target and opposing ally ATK until combat', () => {
  const mercy = { id: 'mercy-v11', name: 'Mercy', type: 'order', targeting: 'enemy_unit', effectId: 'lane_tempo_mod_until_combat', effectParams: { targetEnemyAtk: -1, opposingAllyAtk: 2 } };
  const state = stateWithHands([unitCard('ally', 1, 5), mercy], [unitCard('enemy', 1, 5)]);
  playOrRedeployUnit(state, 'player', 'ally', 6);
  playOrRedeployUnit(state, 'enemy', 'enemy', 0);

  const result = resolveTargetedEffectCard(state, 'player', 'mercy-v11', 0, [0]);
  assert.equal(result.ok, true);
  assert.equal(getEffectiveBoardAttack(state, 0), 0);
  assert.equal(getEffectiveBoardAttack(state, 6), 3);

  resolveCombat(state);
  assert.equal(state.board[0]?.tempAttackMod, undefined);
  assert.equal(state.board[6]?.tempAttackMod, undefined);
});

test('lane_tempo_mod_until_combat enemy_unit works without opposing ally', () => {
  const mercy = { id: 'mercy-v11', name: 'Mercy', type: 'order', targeting: 'enemy_unit', effectId: 'lane_tempo_mod_until_combat', effectParams: { targetEnemyAtk: -1, opposingAllyAtk: 2 } };
  const state = stateWithHands([mercy], [unitCard('enemy', 0, 5)]);
  playOrRedeployUnit(state, 'enemy', 'enemy', 0);

  const result = resolveTargetedEffectCard(state, 'player', 'mercy-v11', 0, [0]);
  assert.equal(result.ok, true);
  assert.equal(getEffectiveBoardAttack(state, 0), 0);
});


test('lane_tempo_mod_until_combat enemy_unit targetEnemyMaxAtk caps high enemy ATK but does not raise low ATK', () => {
  const cap = { id: 'atk-cap', name: 'ATK Cap', type: 'order', targeting: 'enemy_unit', effectId: 'lane_tempo_mod_until_combat', effectParams: { targetEnemyMaxAtk: 2 } };
  const lowState = stateWithHands([unitCard('ally-low', 0, 5), cap], [unitCard('enemy-low', 1, 5)]);
  playOrRedeployUnit(lowState, 'player', 'ally-low', 6);
  playOrRedeployUnit(lowState, 'enemy', 'enemy-low', 0);
  assert.equal(resolveTargetedEffectCard(lowState, 'player', 'atk-cap', 0, [0]).ok, true);
  assert.equal(getEffectiveBoardAttack(lowState, 0), 1);
  resolveCombat(lowState);
  assert.equal(lowState.board[6].hp, 4);

  const highState = stateWithHands([unitCard('ally-high', 0, 5), cap], [unitCard('enemy-high', 3, 5)]);
  playOrRedeployUnit(highState, 'player', 'ally-high', 6);
  playOrRedeployUnit(highState, 'enemy', 'enemy-high', 0);
  assert.equal(resolveTargetedEffectCard(highState, 'player', 'atk-cap', 0, [0]).ok, true);
  assert.equal(getEffectiveBoardAttack(highState, 0), 2);
  resolveCombat(highState);
  assert.equal(highState.board[6].hp, 3);
});

test('lane_tempo_mod_until_combat enemy_unit targetEnemyMaxAtk clears after combat cleanup', () => {
  const cap = { id: 'atk-cap-clear', name: 'ATK Cap', type: 'order', targeting: 'enemy_unit', effectId: 'lane_tempo_mod_until_combat', effectParams: { targetEnemyMaxAtk: 2 } };
  const state = stateWithHands([unitCard('ally-clear', 0, 8), cap], [unitCard('enemy-clear', 3, 8)]);
  playOrRedeployUnit(state, 'player', 'ally-clear', 6);
  playOrRedeployUnit(state, 'enemy', 'enemy-clear', 0);
  assert.equal(resolveTargetedEffectCard(state, 'player', 'atk-cap-clear', 0, [0]).ok, true);
  assert.equal(getEffectiveBoardAttack(state, 0), 2);
  resolveCombat(state);
  assert.equal(state.board[0]?.tempAttackMaxUntilCombat, undefined);
  assert.equal(getEffectiveBoardAttack(state, 0), 3);
});

test('AI values targetEnemyMaxAtk on enemies above the cap more than enemies already under it', () => {
  const cap = { id: 'enemy-cap-ai', name: 'Enemy Cap AI', type: 'order', targeting: 'enemy_unit', effectId: 'lane_tempo_mod_until_combat', effectParams: { targetEnemyMaxAtk: 2 } };
  const state = stateWithHands([unitCard('player-low', 1, 5), unitCard('player-high', 4, 5)], [cap]);
  playOrRedeployUnit(state, 'player', 'player-low', 6);
  playOrRedeployUnit(state, 'player', 'player-high', 7);

  const actions = buildActionCandidates(state, 'enemy', state.enemy.hand, {});
  const lowAction = actions.find((action) => action.cardId === 'enemy-cap-ai' && action.targetIndex === 6);
  const highAction = actions.find((action) => action.cardId === 'enemy-cap-ai' && action.targetIndex === 7);
  assert.ok(lowAction);
  assert.ok(highAction);
  assert.equal(scoreAction(state, 'enemy', lowAction), Number.NEGATIVE_INFINITY);
  assert.ok(scoreAction(state, 'enemy', highAction) > 0);
});

test('AI combat-swing valuation rewards temporary enemy ATK debuff preventing allied unit death', () => {
  const mercy = { id: 'mercy-save', name: 'Mercy Save', type: 'order', targeting: 'enemy_unit', effectId: 'lane_tempo_mod_until_combat', effectParams: { targetEnemyAtk: -1, opposingAllyAtk: 2 } };
  const saveState = stateWithHands([unitCard('ally-saved', 1, 3), mercy], [unitCard('enemy-threat', 3, 5)]);
  playOrRedeployUnit(saveState, 'player', 'ally-saved', 6);
  playOrRedeployUnit(saveState, 'enemy', 'enemy-threat', 0);
  const saveAction = buildActionCandidates(saveState, 'player', saveState.player.hand, {})
    .find((action) => action.cardId === 'mercy-save' && action.targetIndex === 0);

  const noSaveState = stateWithHands([unitCard('ally-safe', 1, 5), mercy], [unitCard('enemy-threat', 3, 5)]);
  playOrRedeployUnit(noSaveState, 'player', 'ally-safe', 6);
  playOrRedeployUnit(noSaveState, 'enemy', 'enemy-threat', 0);
  const noSaveAction = buildActionCandidates(noSaveState, 'player', noSaveState.player.hand, {})
    .find((action) => action.cardId === 'mercy-save' && action.targetIndex === 0);

  assert.ok(saveAction);
  assert.ok(noSaveAction);
  assert.ok(scoreAction(saveState, 'player', saveAction) > scoreAction(noSaveState, 'player', noSaveAction) + 800);
});

test('AI combat-swing valuation rewards temporary allied ATK buff enabling an opposing enemy kill', () => {
  const mercy = { id: 'mercy-kill', name: 'Mercy Kill', type: 'order', targeting: 'enemy_unit', effectId: 'lane_tempo_mod_until_combat', effectParams: { targetEnemyAtk: -1, opposingAllyAtk: 2 } };
  const killState = stateWithHands([unitCard('ally-killer', 1, 5), mercy], [unitCard('enemy-killable', 2, 3)]);
  playOrRedeployUnit(killState, 'player', 'ally-killer', 6);
  playOrRedeployUnit(killState, 'enemy', 'enemy-killable', 0);
  const killAction = buildActionCandidates(killState, 'player', killState.player.hand, {})
    .find((action) => action.cardId === 'mercy-kill' && action.targetIndex === 0);

  const noKillState = stateWithHands([unitCard('ally-low', 0, 5), mercy], [unitCard('enemy-survivor', 2, 4)]);
  playOrRedeployUnit(noKillState, 'player', 'ally-low', 6);
  playOrRedeployUnit(noKillState, 'enemy', 'enemy-survivor', 0);
  const noKillAction = buildActionCandidates(noKillState, 'player', noKillState.player.hand, {})
    .find((action) => action.cardId === 'mercy-kill' && action.targetIndex === 0);

  assert.ok(killAction);
  assert.ok(noKillAction);
  assert.ok(scoreAction(killState, 'player', killAction) > scoreAction(noKillState, 'player', noKillAction) + 700);
});

test('AI combat-swing valuation rewards enemy-only debuff reducing open-lane base damage', () => {
  const mercy = { id: 'mercy-open', name: 'Mercy Open', type: 'order', targeting: 'enemy_unit', effectId: 'lane_tempo_mod_until_combat', effectParams: { targetEnemyAtk: -1, opposingAllyAtk: 2 } };
  const state = stateWithHands([mercy], [unitCard('open-enemy', 1, 5)]);
  playOrRedeployUnit(state, 'enemy', 'open-enemy', 0);
  const action = buildActionCandidates(state, 'player', state.player.hand, {})
    .find((candidate) => candidate.cardId === 'mercy-open' && candidate.targetIndex === 0);

  assert.ok(action);
  assert.ok(scoreAction(state, 'player', action) >= 2500);
});

test('AI combat-swing valuation stays conservative when buff/debuff does not change combat outcome', () => {
  const mercy = { id: 'mercy-no-swing', name: 'Mercy No Swing', type: 'order', targeting: 'enemy_unit', effectId: 'lane_tempo_mod_until_combat', effectParams: { targetEnemyAtk: -1, opposingAllyAtk: 2 } };
  const swingState = stateWithHands([unitCard('ally-swing', 1, 5), mercy], [unitCard('enemy-dies', 2, 3)]);
  playOrRedeployUnit(swingState, 'player', 'ally-swing', 6);
  playOrRedeployUnit(swingState, 'enemy', 'enemy-dies', 0);
  const swingAction = buildActionCandidates(swingState, 'player', swingState.player.hand, {})
    .find((action) => action.cardId === 'mercy-no-swing' && action.targetIndex === 0);

  const noSwingState = stateWithHands([unitCard('ally-no-swing', 0, 5), mercy], [unitCard('enemy-lives', 2, 5)]);
  playOrRedeployUnit(noSwingState, 'player', 'ally-no-swing', 6);
  playOrRedeployUnit(noSwingState, 'enemy', 'enemy-lives', 0);
  const noSwingAction = buildActionCandidates(noSwingState, 'player', noSwingState.player.hand, {})
    .find((action) => action.cardId === 'mercy-no-swing' && action.targetIndex === 0);

  assert.ok(swingAction);
  assert.ok(noSwingAction);
  assert.ok(scoreAction(swingState, 'player', swingAction) > scoreAction(noSwingState, 'player', noSwingAction) + 700);
});

test('Temper Shift remains generated and finite with and without an opposing ally', () => {
  const mercy = { id: 'overclock_mercy_1', name: 'Temper Shift', type: 'order', targeting: 'enemy_unit', effectId: 'lane_tempo_mod_until_combat', effectParams: { targetEnemyAtk: -1, opposingAllyAtk: 2 } };
  const withAlly = stateWithHands([unitCard('ally', 1, 5), mercy], [unitCard('enemy', 2, 5)]);
  playOrRedeployUnit(withAlly, 'player', 'ally', 6);
  playOrRedeployUnit(withAlly, 'enemy', 'enemy', 0);
  const withAllyAction = buildActionCandidates(withAlly, 'player', withAlly.player.hand, {})
    .find((action) => action.cardId === 'overclock_mercy_1' && action.targetIndex === 0);

  const withoutAlly = stateWithHands([mercy], [unitCard('enemy', 2, 5)]);
  playOrRedeployUnit(withoutAlly, 'enemy', 'enemy', 0);
  const withoutAllyAction = buildActionCandidates(withoutAlly, 'player', withoutAlly.player.hand, {})
    .find((action) => action.cardId === 'overclock_mercy_1' && action.targetIndex === 0);

  assert.ok(withAllyAction);
  assert.ok(withoutAllyAction);
  assert.ok(Number.isFinite(scoreAction(withAlly, 'player', withAllyAction)));
  assert.ok(Number.isFinite(scoreAction(withoutAlly, 'player', withoutAllyAction)));
});

test('AI combat-swing valuation improves enemy_lane_atk_minus_1 unit scoring without breaking candidates', () => {
  const hog = unitCard('hog', 1, 2, 'enemy_lane_atk_minus_1');
  const state = stateWithHands([hog], [unitCard('enemy-threat', 2, 2)]);
  playOrRedeployUnit(state, 'enemy', 'enemy-threat', 0);
  const action = buildActionCandidates(state, 'player', state.player.hand, {})
    .find((candidate) => candidate.cardId === 'hog' && candidate.slotIndex === 6);

  assert.ok(action);
  assert.ok(scoreAction(state, 'player', action) > 0);
});

test('Hot Runner takes opposed enemy offline for exactly one combat and returns it without Fallen bookkeeping', () => {
  const runner = unitCard('runner', 1, 1, 'opposed_enemy_offline_next_combat');
  const state = stateWithHands([runner], [unitCard('wall', 3, 5)]);
  playOrRedeployUnit(state, 'enemy', 'wall', 0);
  const enemyUnit = state.board[0];

  const result = playOrRedeployUnit(state, 'player', 'runner', 6);
  assert.equal(result.ok, true);
  assert.equal(state.board[0], enemyUnit);
  assert.equal(isBoardUnitOffline(state, 0), true);
  assert.equal(state.offlineReservations.length, 1);

  resolveCombat(state);
  assert.equal(state.board[0], enemyUnit);
  assert.equal(state.board[0].cardId, 'wall');
  assert.equal(state.enemy.fallen.length, 0);
  assert.equal(state.player.fallen.length, 0);
  assert.equal(state.offlineReservations.length, 0);
  assert.equal(isBoardUnitOffline(state, 0), false);
  assert.equal(state.enemyHP, 11);
  assert.equal(state.hotRunnerOfflineTelemetry.baseHits, 1);
  assert.equal(state.hotRunnerOfflineTelemetry.returned, 1);

  resolveCombat(state);
  assert.equal(state.enemyHP, 11, 'returned enemy blocks a second free base hit');
});

test('Hot Runner into empty lane creates no offline reservation', () => {
  const runner = unitCard('runner', 1, 1, 'opposed_enemy_offline_next_combat');
  const state = stateWithHands([runner]);
  const result = playOrRedeployUnit(state, 'player', 'runner', 6);
  assert.equal(result.ok, true);
  assert.equal(state.offlineReservations, undefined);
  assert.equal(state.hotRunnerOfflineTelemetry.noEnemy, 1);
});

test('Hot Runner offline reservation keeps a real board unit renderable and normalizes legacy placeholders', () => {
  const runner = unitCard('runner', 1, 1, 'opposed_enemy_offline_next_combat');
  const state = stateWithHands([runner], [unitCard('wall', 3, 5)]);
  playOrRedeployUnit(state, 'enemy', 'wall', 0);
  const enemyUnit = state.board[0];
  playOrRedeployUnit(state, 'player', 'runner', 6);

  assert.equal(state.board[0], enemyUnit);
  assert.equal(state.board[0]?.owner, 'enemy');
  assert.equal(state.board[0]?.offlineReservedSlot, undefined);

  const reservation = state.offlineReservations[0];
  state.board[0] = { offlineReservedSlot: true, reservationId: reservation.id };
  normalizeOfflineReservations(state);
  assert.equal(state.board[0], enemyUnit);
  assert.equal(isBoardUnitOffline(state, 0), true);
});

test('Hot Runner offline is consumed by immediate lane combat', () => {
  const runner = unitCard('runner', 1, 1, 'opposed_enemy_offline_next_combat');
  const ignition = { id: 'ignition', name: 'Ignition', type: 'order', targeting: 'friendly_unit', effectId: 'quick_strike' };
  const state = stateWithHands([runner, ignition], [unitCard('wall', 3, 5)]);
  playOrRedeployUnit(state, 'enemy', 'wall', 0);
  const enemyUnit = state.board[0];
  playOrRedeployUnit(state, 'player', 'runner', 6);

  const result = resolveTargetedEffectCard(state, 'player', 'ignition', 6, [6]);
  assert.equal(result.ok, true);
  assert.equal(state.board[0], enemyUnit);
  assert.equal(isBoardUnitOffline(state, 0), false);
  assert.equal(state.offlineReservations.length, 0);
  assert.equal(state.enemyHP, 11);

  resolveCombat(state);
  assert.equal(state.enemyHP, 11);
});

test('lane_tempo_mod_until_combat enemy_unit validates target params and rejects friendly params', async () => {
  const { execFileSync } = await import('node:child_process');
  const faction = {
    id: 'overclock-v11-validation',
    name: 'Overclock v11 Validation',
    deck: Array.from({ length: 10 }, (_, index) => ({
      id: `overclock_v11_validation_${index + 1}`,
      cardNumber: index + 1,
      artAssetId: `overclock_${String(index + 1).padStart(2, '0')}`,
      name: index === 0 ? 'Mercy' : `Filler ${index + 1}`,
      type: index === 0 ? 'order' : 'unit',
      targeting: index === 0 ? 'enemy_unit' : 'lane',
      effectId: index === 0 ? 'lane_tempo_mod_until_combat' : null,
      textShort: index === 0 ? 'Selected enemy -1 ATK, opposing ally +2 ATK until combat.' : 'Filler unit.',
      ...(index === 0 ? { effectParams: { targetEnemyAtk: -1, opposingAllyAtk: 2 } } : { attack: 1, hp: 1, armor: 0 }),
    })),
  };
  const script = `import importlib.util, json
from pathlib import Path
spec = importlib.util.spec_from_file_location('bl', '${process.cwd()}/tools/balance-lab/run_balance_lab.py')
bl = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bl)
root = Path(${JSON.stringify(process.cwd())})
faction = json.loads(${JSON.stringify(JSON.stringify(faction))})
validated = bl.validate_custom_factions(root, [faction])
assert validated[0]['deck'][0]['effectParams']['targetEnemyAtk'] == -1
valid_cap = json.loads(${JSON.stringify(JSON.stringify(faction))})
valid_cap['id'] = 'valid-cap'
valid_cap['deck'][0]['effectParams'] = {'targetEnemyMaxAtk': 2}
assert bl.validate_custom_factions(root, [valid_cap])[0]['deck'][0]['effectParams']['targetEnemyMaxAtk'] == 2
for params in [
  {'allyAtk': 2},
  {'targetEnemyAtk': 'bad'},
  {'targetEnemyMaxAtk': '2'},
  {'targetEnemyMaxAtk': -1},
  {'targetEnemyHp': 1},
  {'bogus': 1},
]:
    bad = json.loads(${JSON.stringify(JSON.stringify(faction))})
    bad['id'] = 'bad-' + str(len(str(params)))
    bad['deck'][0]['effectParams'] = params
    try:
        bl.validate_custom_factions(root, [bad])
    except bl.BalanceLabError:
        pass
    else:
        raise AssertionError(f'accepted invalid enemy_unit params: {params}')
`;
  execFileSync('python3', ['-c', script], { stdio: 'pipe' });
});

test('Hot Runner enemy-owner offline returns after forced combat and does not fire Attrition death triggers', () => {
  const runner = unitCard('enemy-runner', 1, 1, 'opposed_enemy_offline_next_combat');
  const rush = { id: 'rush', name: 'Ignition', type: 'order', targeting: 'friendly_unit', effectId: 'quick_strike' };
  const carrier = unitCard('carrier', 2, 1, 'combat_death_summon_grunt');
  const state = stateWithHands([carrier], [runner, unitCard('pivot', 0, 3), rush]);
  playOrRedeployUnit(state, 'player', 'carrier', 6);
  const reserved = state.board[6];
  playOrRedeployUnit(state, 'enemy', 'pivot', 1);
  playOrRedeployUnit(state, 'enemy', 'enemy-runner', 0);

  assert.equal(state.board[6], reserved);
  assert.equal(isBoardUnitOffline(state, 6), true);
  const result = resolveTargetedEffectCard(state, 'enemy', 'rush', 0, [0]);

  assert.equal(result.ok, true);
  assert.equal(state.board[6], reserved);
  assert.equal(state.playerHP, 11, 'enemy Hot Runner hit base while the player unit was offline');
  assert.equal(state.player.fallen.length, 0);
  assert.equal(state.combatOnlyDeathSummons ?? 0, 0);
  assert.equal(state.board.filter((unit) => unit === reserved).length, 1);
  assert.equal(state.offlineReservations.length, 0);
  assert.equal(isBoardUnitOffline(state, 6), false);

  resolveCombat(state);
  assert.equal(state.playerHP, 11, 'returned player unit prevents a second free base hit');
});

test('decay_hp_after_combat reduces HP after combat without mutating card JSON', () => {
  const card = unitCard('hp-decayer', 1, 3, 'decay_hp_after_combat');
  const state = stateWithHands([card]);
  assert.equal(playOrRedeployUnit(state, 'player', 'hp-decayer', 6).ok, true);

  resolveCombat(state);

  assert.equal(state.board[6].hp, 2);
  assert.equal(state.board[6].maxHp, 3);
  assert.equal(card.hp, 3);
});

test('decay_hp_after_combat can kill through normal post-combat damage cleanup', () => {
  const card = unitCard('hp-decayer', 0, 1, 'decay_hp_after_combat');
  const state = stateWithHands([card]);
  playOrRedeployUnit(state, 'player', 'hp-decayer', 6);

  resolveCombat(state);

  assert.equal(state.board[6], null);
  assert.equal(state.player.fallen.length, 1);
  assert.equal(state.player.fallen[0].card.id, 'hp-decayer');
  assert.equal(state.player.fallen[0].reason, 'damage-death');
  assert.equal(state.player.fallen[0].combat, false);
});

test('decay_hp_after_combat works for both owners and preserves attack decay behavior', () => {
  const state = stateWithHands([
    unitCard('player-hp-decayer', 1, 4, 'decay_hp_after_combat'),
    unitCard('attack-decayer', 3, 4, 'decay_attack_after_combat'),
  ], [unitCard('enemy-hp-decayer', 1, 4, 'decay_hp_after_combat')]);
  playOrRedeployUnit(state, 'player', 'player-hp-decayer', 6);
  playOrRedeployUnit(state, 'player', 'attack-decayer', 7);
  playOrRedeployUnit(state, 'enemy', 'enemy-hp-decayer', 2);

  resolveCombat(state);

  assert.equal(state.board[6].hp, 3);
  assert.equal(state.board[2].hp, 3);
  assert.equal(state.board[7].hp, 4);
  assert.equal(state.board[7].attackDecay, 1);
  assert.equal(getEffectiveBoardAttack(state, 7), 2);
});

test('Balance Lab validation accepts all_enemies_atk_cap_until_combat with all_enemy_units targeting', async () => {
  const { mkdtempSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const { default: aggro } = await import('../src/data/factions/aggro.json', { with: { type: 'json' } });
  const faction = {
    id: 'atk-cap-validation-candidate',
    name: 'Atk Cap Validation Candidate',
    frameImage: 'frame_default',
    deck: aggro.deck.map((card, index) => ({
      ...structuredClone(card),
      id: `atk_cap_validation_card_${index + 1}`,
      name: `Atk Cap Validation ${index + 1}`,
      artAssetId: card.artAssetId ?? 'aggro_01',
    })),
  };
  faction.deck[0] = {
    ...faction.deck[0],
    type: 'order',
    targeting: 'all_enemy_units',
    effectId: 'all_enemies_atk_cap_until_combat',
    textShort: 'All [ENEMY] ATK is capped at 2 until combat.',
  };
  const dir = mkdtempSync(join(tmpdir(), 'gridfall-atk-cap-validation-'));
  const path = join(dir, 'experiment.json');
  writeFileSync(path, JSON.stringify({ name: 'atk-cap-validation', customFactions: [faction] }), 'utf8');
  const output = execFileSync('node', ['scripts/simulate-battles.mjs', '--total=1', `--experiment=${path}`], { cwd: process.cwd(), encoding: 'utf8' });
  assert.match(output, /Battle simulation complete/);
});

test('all_enemies_atk_cap_until_combat caps all current enemies at 2 until combat without mutating cards', () => {
  const cap = { id: 'global-cap', name: 'Global Cap', type: 'order', targeting: 'all_enemy_units', effectId: 'all_enemies_atk_cap_until_combat' };
  const enemyOne = unitCard('enemy-one', 1, 8);
  const enemyTwo = unitCard('enemy-two', 2, 8);
  const enemyHigh = unitCard('enemy-high', 4, 8);
  const state = stateWithHands([unitCard('ally-a', 0, 8), unitCard('ally-b', 0, 8), cap], [enemyOne, enemyTwo, enemyHigh]);
  playOrRedeployUnit(state, 'player', 'ally-a', 6);
  playOrRedeployUnit(state, 'player', 'ally-b', 8);
  playOrRedeployUnit(state, 'enemy', 'enemy-one', 0);
  playOrRedeployUnit(state, 'enemy', 'enemy-two', 1);
  playOrRedeployUnit(state, 'enemy', 'enemy-high', 2);

  const result = playEffectCard(state, 'player', 'global-cap');
  assert.equal(result.ok, true);
  assert.equal(getEffectiveBoardAttack(state, 0), 1);
  assert.equal(getEffectiveBoardAttack(state, 1), 2);
  assert.equal(getEffectiveBoardAttack(state, 2), 2);
  assert.equal(enemyHigh.attack, 4);
  assert.equal(enemyHigh.tempAttackMaxUntilCombat, undefined);

  resolveCombat(state);
  assert.equal(state.board[6].hp, 7);
  assert.equal(state.board[8].hp, 6);
  assert.equal(state.board[2]?.tempAttackMaxUntilCombat, undefined);
  assert.equal(getEffectiveBoardAttack(state, 2), 4);
});

test('all_enemies_atk_cap_until_combat works for both owners and is invalid with no high-ATK enemies', () => {
  const cap = { id: 'enemy-global-cap', name: 'Enemy Global Cap', type: 'utility', targeting: 'all_enemy_units', effectId: 'all_enemies_atk_cap_until_combat' };
  const state = stateWithHands([unitCard('player-high', 3, 8)], [cap]);
  playOrRedeployUnit(state, 'player', 'player-high', 6);

  assert.equal(playEffectCard(state, 'enemy', 'enemy-global-cap').ok, true);
  assert.equal(getEffectiveBoardAttack(state, 6), 2);
  resolveCombat(state);
  assert.equal(state.enemyHP, 10);
  assert.equal(getEffectiveBoardAttack(state, 6), 3);

  const lowState = stateWithHands([unitCard('player-low', 2, 8)], [{ ...cap, id: 'low-cap' }]);
  playOrRedeployUnit(lowState, 'player', 'player-low', 6);
  const lowResult = playEffectCard(lowState, 'enemy', 'low-cap');
  assert.equal(lowResult.ok, false);
});

test('Stock Reassignment requires a selected adjacent ally instead of auto-selecting left', () => {
  const swap = { id: 'stock', name: 'Stock Reassignment', type: 'order', targeting: 'friendly_unit', effectId: 'swap_adjacent_then_resolve' };
  const state = stateWithHands([swap]);
  state.board[6] = { ...unitCard('left', 0, 3), owner: 'player', cardId: 'left', maxHp: 3 };
  state.board[7] = { ...unitCard('first', 0, 3), owner: 'player', cardId: 'first', maxHp: 3 };

  const pending = resolveTargetedEffectCard(state, 'player', 'stock', 7, [7]);

  assert.equal(pending.ok, true);
  assert.equal(pending.type, 'targeted-effect-pending');
  assert.equal(state.board[6].cardId, 'left');
  assert.equal(state.board[7].cardId, 'first');
  assert.equal(state.player.hand.some((card) => card.id === 'stock'), true);
});

test('Stock Reassignment swaps with only a left adjacent ally after explicit second selection', () => {
  const swap = { id: 'stock-left', name: 'Stock Reassignment', type: 'order', targeting: 'friendly_unit', effectId: 'swap_adjacent_then_resolve' };
  const state = stateWithHands([swap]);
  state.board[6] = { ...unitCard('left', 0, 3), owner: 'player', cardId: 'left', maxHp: 3 };
  state.board[7] = { ...unitCard('first', 0, 3), owner: 'player', cardId: 'first', maxHp: 3 };

  const result = resolveTargetedEffectCard(state, 'player', 'stock-left', 7, [7, 6]);

  assert.equal(result.ok, true);
  assert.equal(state.board[6].cardId, 'first');
  assert.equal(state.board[7].cardId, 'left');
  assert.equal(result.combatSnapshot.board[6].cardId, 'first');
});

test('Stock Reassignment swaps with only a right adjacent ally after explicit second selection', () => {
  const swap = { id: 'stock-right', name: 'Stock Reassignment', type: 'order', targeting: 'friendly_unit', effectId: 'swap_adjacent_then_resolve' };
  const state = stateWithHands([swap]);
  state.board[6] = { ...unitCard('first', 0, 3), owner: 'player', cardId: 'first', maxHp: 3 };
  state.board[7] = { ...unitCard('right', 0, 3), owner: 'player', cardId: 'right', maxHp: 3 };

  const result = resolveTargetedEffectCard(state, 'player', 'stock-right', 6, [6, 7]);

  assert.equal(result.ok, true);
  assert.equal(state.board[6].cardId, 'right');
  assert.equal(state.board[7].cardId, 'first');
  assert.equal(result.combatSnapshot.board[7].cardId, 'first');
});

test('Stock Reassignment middle unit can choose left when both adjacent allies are available', () => {
  const swap = { id: 'stock-left-choice', name: 'Stock Reassignment', type: 'order', targeting: 'friendly_unit', effectId: 'swap_adjacent_then_resolve' };
  const state = stateWithHands([swap]);
  state.board[6] = { ...unitCard('left', 0, 3), owner: 'player', cardId: 'left', maxHp: 3 };
  state.board[7] = { ...unitCard('first', 0, 3), owner: 'player', cardId: 'first', maxHp: 3 };
  state.board[8] = { ...unitCard('right', 0, 3), owner: 'player', cardId: 'right', maxHp: 3 };

  const result = resolveTargetedEffectCard(state, 'player', 'stock-left-choice', 7, [7, 6]);

  assert.equal(result.ok, true);
  assert.equal(state.board[6].cardId, 'first');
  assert.equal(state.board[7].cardId, 'left');
  assert.equal(state.board[8].cardId, 'right');
});

test('Stock Reassignment middle unit can choose right when both adjacent allies are available', () => {
  const swap = { id: 'stock-right-choice', name: 'Stock Reassignment', type: 'order', targeting: 'friendly_unit', effectId: 'swap_adjacent_then_resolve' };
  const state = stateWithHands([swap]);
  state.board[6] = { ...unitCard('left', 0, 3), owner: 'player', cardId: 'left', maxHp: 3 };
  state.board[7] = { ...unitCard('first', 0, 3), owner: 'player', cardId: 'first', maxHp: 3 };
  state.board[8] = { ...unitCard('right', 0, 3), owner: 'player', cardId: 'right', maxHp: 3 };

  const result = resolveTargetedEffectCard(state, 'player', 'stock-right-choice', 7, [7, 8]);

  assert.equal(result.ok, true);
  assert.equal(state.board[6].cardId, 'left');
  assert.equal(state.board[7].cardId, 'right');
  assert.equal(state.board[8].cardId, 'first');
});

test('Stock Reassignment rejects non-adjacent, enemy, and empty second targets without consuming action', () => {
  const swap = { id: 'stock-invalid', name: 'Stock Reassignment', type: 'order', targeting: 'friendly_unit', effectId: 'swap_adjacent_then_resolve' };
  const state = stateWithHands([swap], [unitCard('enemy', 1, 3)]);
  state.board[6] = { ...unitCard('first', 0, 3), owner: 'player', cardId: 'first', maxHp: 3 };
  state.board[8] = { ...unitCard('far', 0, 3), owner: 'player', cardId: 'far', maxHp: 3 };
  playOrRedeployUnit(state, 'enemy', 'enemy', 0);

  assert.equal(resolveTargetedEffectCard(state, 'player', 'stock-invalid', 6, [6, 8]).ok, false);
  assert.equal(resolveTargetedEffectCard(state, 'player', 'stock-invalid', 6, [6, 0]).ok, false);
  assert.equal(resolveTargetedEffectCard(state, 'player', 'stock-invalid', 6, [6, 7]).ok, false);
  assert.equal(state.player.hand.some((card) => card.id === 'stock-invalid'), true);
  assert.equal(state.board[6].cardId, 'first');
  assert.equal(state.board[8].cardId, 'far');
});

test('Stock Reassignment resolves immediate combat in the first unit destination lane', () => {
  const swap = { id: 'stock-lane', name: 'Stock Reassignment', type: 'order', targeting: 'friendly_unit', effectId: 'swap_adjacent_then_resolve' };
  const state = stateWithHands([swap], [unitCard('enemy-left', 0, 5)]);
  state.board[7] = { ...unitCard('first', 2, 3), owner: 'player', cardId: 'first', maxHp: 3 };
  state.board[6] = { ...unitCard('left', 0, 3), owner: 'player', cardId: 'left', maxHp: 3 };
  playOrRedeployUnit(state, 'enemy', 'enemy-left', 0);

  const result = resolveTargetedEffectCard(state, 'player', 'stock-lane', 7, [7, 6]);

  assert.equal(result.ok, true);
  assert.equal(result.combatEvents.length, 2);
  assert.equal(result.combatEvents[0].lane, 0);
  assert.equal(result.combatEvents[0].attackerIndex, 6);
  assert.equal(result.combatEvents[1].lane, 0);
  assert.equal(result.combatEvents[1].attackerIndex, 0);
  assert.equal(state.board[6].cardId, 'first');
});

test('Stock Reassignment handles unit death during immediate destination-lane combat', () => {
  const swap = { id: 'stock-death', name: 'Stock Reassignment', type: 'order', targeting: 'friendly_unit', effectId: 'swap_adjacent_then_resolve' };
  const state = stateWithHands([swap], [unitCard('enemy-left', 3, 1)]);
  state.board[7] = { ...unitCard('first', 1, 1), owner: 'player', cardId: 'first', maxHp: 1 };
  state.board[6] = { ...unitCard('left', 0, 3), owner: 'player', cardId: 'left', maxHp: 3 };
  playOrRedeployUnit(state, 'enemy', 'enemy-left', 0);

  const result = resolveTargetedEffectCard(state, 'player', 'stock-death', 7, [7, 6]);

  assert.equal(result.ok, true);
  assert.equal(state.board[6], null);
  assert.equal(state.board[0], null);
  assert.equal(state.player.fallen.some((entry) => entry.card.id === 'first'), true);
  assert.equal(state.enemy.fallen.some((entry) => entry.card.id === 'enemy-left'), true);
});

test('Temper Shift board feedback reuses existing buff and debuff stat-delta conventions', async () => {
  const { readFileSync } = await import('node:fs');
  const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
  const buildEffectDeltaFeedback = source.slice(
    source.indexOf('  buildEffectDeltaFeedback('),
    source.indexOf('  buildActionFeedback(', source.indexOf('  buildEffectDeltaFeedback(')),
  );

  assert.match(
    buildEffectDeltaFeedback,
    /const debuffEffects = new Set\(\['enemy_lane_atk_minus_1', 'enemy_up_to_2_atk_minus_1', 'lane_tempo_mod_until_combat'\]\);/,
  );
  assert.match(
    buildEffectDeltaFeedback,
    /effectId === 'infect_damage_1_opposite_ally_atk_1' \|\| effectId === 'heal_1_atk_1_draw_on_kill_this_turn' \|\| effectId === 'lane_tempo_mod_until_combat'/,
  );
  assert.match(buildEffectDeltaFeedback, /feedback\.push\(\{ type: 'slot-text', index, label: `\$\{attackDelta\} ATK`, kind: 'debuff', phase: 'pre', order: 10 \}\);/);
  assert.match(buildEffectDeltaFeedback, /feedback\.push\(\{ type: 'slot-text', index, label: `\+\$\{attackDelta\} ATK`, kind: 'buff', phase: 'pre', order: 20 \}\);/);
});
