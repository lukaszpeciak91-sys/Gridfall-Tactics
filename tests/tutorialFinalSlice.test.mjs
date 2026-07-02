import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { TUTORIAL_STEPS } from '../src/data/tutorial/tutorialSteps.js';
import { getTutorialBattleData, getTutorialEnemyActionScript } from '../src/data/tutorial/tutorialDecks.js';
import { createInitialBattleState, drawCards, getEffectiveBoardArmor, performSwap, playEffectCard, playOrRedeployUnit, resolveCombat } from '../src/systems/GameState.js';
import { applyTutorialOpeningSetup, performTutorialOpeningMulligan } from '../src/systems/tutorialOpening.js';
import { selectNextTutorialEnemyAction } from '../src/systems/tutorialEnemyActions.js';

function createReadyTutorialState() {
  const data = getTutorialBattleData();
  const state = createInitialBattleState(data.playerFaction, data.enemyFaction, {
    playerHP: data.openingConfig.playerStartingHp,
    playerMaxHP: data.openingConfig.playerStartingHp,
    enemyHP: data.openingConfig.enemyStartingHp,
    enemyMaxHP: data.openingConfig.enemyStartingHp,
    firstActor: 'player',
  });
  applyTutorialOpeningSetup(state, data.openingConfig);
  performTutorialOpeningMulligan(state, [data.openingConfig.requiredPlayerMulliganCardId], data.openingConfig);
  return { state, data, cursor: 0 };
}

function applyScriptedEnemyAndCombat(ctx) {
  const selected = selectNextTutorialEnemyAction(ctx.state, ctx.cursor);
  ctx.cursor = selected.nextCursor;
  if (selected.action.type === 'play-unit') {
    const result = playOrRedeployUnit(ctx.state, 'enemy', selected.action.cardId, selected.action.slotIndex);
    assert.equal(result.ok, true, `scripted enemy action should resolve: ${JSON.stringify(selected.action)}`);
  }
  const combatEvents = resolveCombat(ctx.state);
  if (!ctx.state.winner) {
    drawCards(ctx.state.player, 1);
    drawCards(ctx.state.enemy, 1);
  }
  return { selected, combatEvents };
}

function playPlayerActionAndResolve(ctx, action) {
  const result = action();
  assert.equal(result.ok, true);
  const flow = applyScriptedEnemyAndCombat(ctx);
  return { result, ...flow };
}

test('final Tutorial V1 step progression ends with redeploy, effect, empty-lane information, and final PASS', () => {
  assert.deepEqual(TUTORIAL_STEPS.map((step) => step.id).slice(-4), [
    'redeploy',
    'effect_card',
    'empty_lane',
    'final_pass',
  ]);
  assert.deepEqual(TUTORIAL_STEPS.find((step) => step.id === 'redeploy').expected, { type: 'redeploy_unit', cardId: 'tutorial_unit_c_1', slotIndex: 6 });
  assert.deepEqual(TUTORIAL_STEPS.find((step) => step.id === 'effect_card').expected, { type: 'play_effect', cardId: 'tutorial_all_attack_1' });
  assert.deepEqual(TUTORIAL_STEPS.find((step) => step.id === 'empty_lane').highlightTarget, { type: 'empty_lane', slotIndex: 8 });
  assert.deepEqual(TUTORIAL_STEPS.find((step) => step.id === 'final_pass').highlightTarget, { type: 'player_base_button' });
});

test('redeploy and effect use real paths, scripted blockers prevent early victory, and final PASS wins through combat', () => {
  const ctx = createReadyTutorialState();

  playPlayerActionAndResolve(ctx, () => playOrRedeployUnit(ctx.state, 'player', 'tutorial_unit_a_1', 6));
  playPlayerActionAndResolve(ctx, () => playOrRedeployUnit(ctx.state, 'player', 'tutorial_unit_b_1', 7));
  playPlayerActionAndResolve(ctx, () => performSwap(ctx.state, 'player', 6, 7));

  const redeployFlow = playPlayerActionAndResolve(ctx, () => playOrRedeployUnit(ctx.state, 'player', 'tutorial_unit_c_1', 6));
  assert.equal(redeployFlow.result.type, 'redeploy');
  assert.equal(ctx.state.board[6].cardId, 'tutorial_unit_c_1');
  assert.equal(ctx.state.player.hand.some((card) => card.id === 'tutorial_unit_b_1'), true, 'displaced Unit B returns to hand through redeploy mechanics');
  assert.deepEqual(redeployFlow.selected.action, { type: 'play-unit', cardId: 'tutorial_enemy_blocker_c_1', slotIndex: 2 });
  assert.equal(ctx.state.winner, null, 'final blocker response must not cause an early ending');

  const beforeEffectUnitCount = ctx.state.board.filter((unit) => unit?.owner === 'player').length;
  const effectFlow = playPlayerActionAndResolve(ctx, () => playEffectCard(ctx.state, 'player', 'tutorial_all_attack_1'));
  assert.equal(effectFlow.result.type, 'effect');
  assert.equal(effectFlow.result.card.effectId, 'buff_all_atk_1');
  assert.equal(ctx.state.player.discard.some((card) => card.id === 'tutorial_all_attack_1'), true);
  assert.equal(ctx.state.board.filter((unit) => unit?.owner === 'player').length, beforeEffectUnitCount, 'effect card must not become a board unit');
  assert.deepEqual(effectFlow.selected.action, { type: 'play-unit', cardId: 'tutorial_enemy_blocker_d_1', slotIndex: 0 });
  assert.equal(ctx.state.enemyHP, 1, 'effect combat leaves enemy base low but alive for final PASS');
  assert.equal(ctx.state.winner, null);

  const beforePassHp = ctx.state.enemyHP;
  const finalFlow = applyScriptedEnemyAndCombat(ctx);
  assert.deepEqual(finalFlow.selected.action, { type: 'pass' });
  assert.equal(beforePassHp, 1);
  assert.equal(ctx.state.enemyHP, 0);
  assert.equal(ctx.state.winner, 'player');
  assert.ok(ctx.state.playerHP > 0, 'tutorial player cannot accidentally lose in the final slice');
});

test('redeployed Unit C grants Shieldbearer armor only to adjacent allies during combat projection', () => {
  const ctx = createReadyTutorialState();

  playPlayerActionAndResolve(ctx, () => playOrRedeployUnit(ctx.state, 'player', 'tutorial_unit_a_1', 6));
  playPlayerActionAndResolve(ctx, () => playOrRedeployUnit(ctx.state, 'player', 'tutorial_unit_b_1', 7));
  playPlayerActionAndResolve(ctx, () => performSwap(ctx.state, 'player', 6, 7));

  const redeployResult = playOrRedeployUnit(ctx.state, 'player', 'tutorial_unit_c_1', 6);
  assert.equal(redeployResult.ok, true);
  assert.equal(redeployResult.type, 'redeploy');
  assert.equal(ctx.state.board[6].effectId, 'lane_armor_aura_1');
  assert.equal(ctx.state.player.hand.some((card) => card.id === 'tutorial_unit_b_1'), true);

  ctx.state.board[8] = { id: 'distant-ally', cardId: 'distant-ally', owner: 'player', type: 'unit', attack: 0, hp: 2, maxHp: 2, armor: 0 };
  ctx.state.board[0] = { id: 'enemy-left', cardId: 'enemy-left', owner: 'enemy', type: 'unit', attack: 0, hp: 2, maxHp: 2, armor: 0 };

  assert.equal(getEffectiveBoardArmor(ctx.state, 7), 1, 'adjacent ally receives +1 ARM from Unit C');
  assert.equal(getEffectiveBoardArmor(ctx.state, 8), 0, 'non-adjacent ally is not buffed');
  assert.equal(getEffectiveBoardArmor(ctx.state, 0), 0, 'enemy unit is not buffed');

  const combatEvents = resolveCombat(ctx.state);
  assert.equal(ctx.state.board[7].armor, 0, 'armor aura does not leave a permanent stat modifier after combat');
  assert.equal(ctx.state.board[8].armor, 0, 'non-adjacent ally remains unmodified after combat');
  assert.ok(combatEvents.some((event) => event.combatModifiers?.some((modifier) => modifier.source === 'lane_armor_aura_1')));
});

test('tutorial-only final enemy script remains deterministic and separate from normal AI', () => {
  const script = getTutorialEnemyActionScript();
  assert.equal(script[3].cardId, 'tutorial_enemy_blocker_c_1');
  assert.equal(script[3].slotIndex, 2);
  assert.equal(script[4].cardId, 'tutorial_enemy_blocker_d_1');
  assert.equal(script.every((action) => action.type === 'pass' || action.type === 'play-unit'), true);

  const battleSceneSource = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
  assert.match(battleSceneSource, /if \(this\.isTutorialBattle\(\)\) return this\.getNextTutorialEnemyAction\(\);/);
});
