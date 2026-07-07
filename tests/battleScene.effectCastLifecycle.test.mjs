import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTutorialControllerState, getCurrentTutorialStep, handleTutorialEvent } from '../src/systems/tutorialController.js';

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

function extractMethodBody(name, nextName) {
  const start = source.indexOf(`\n  ${name}(`) >= 0
    ? source.indexOf(`\n  ${name}(`)
    : source.indexOf(`\n  async ${name}(`);
  const normalEnd = source.indexOf(`\n  ${nextName}(`, start + 1);
  const asyncEnd = source.indexOf(`\n  async ${nextName}(`, start + 1);
  const candidates = [normalEnd, asyncEnd].filter((index) => index >= 0);
  const end = Math.min(...candidates);
  if (start < 0 || !Number.isFinite(end)) throw new Error(`Failed to extract ${name}`);
  const block = source.slice(start, end);
  const bodyStart = block.indexOf(') {') + 3;
  const bodyEnd = block.lastIndexOf('}');
  return block.slice(bodyStart, bodyEnd);
}

function compileAsyncMethod(name, nextName, params = []) {
  return new Function(...params, `return (async function(${params.join(',')}) {${extractMethodBody(name, nextName)}});`)();
}

const startPlayerEffectCast = compileAsyncMethod('startPlayerEffectCast', 'beginPlayerTargetingSession', [
  'card',
  'playEffectCard',
  'PLAYER_EFFECT_CAST_BEAT_MS',
]);

const playEffectCastSweep = compileAsyncMethod('playEffectCastSweep', 'cancelEffectTargeting', [
  'side',
  'playSound',
  'AUDIO_KEYS',
  'EFFECT_CAST_SWEEP_STYLE',
  'BOARD_GUIDE_SLOT_STROKE_ALPHA',
  'BOARD_GUIDE_SLOT_FILL_ALPHA',
  'PLAYER_EFFECT_CAST_SWEEP_STEP_MS',
]);

function createEffectScene(overrides = {}) {
  const calls = [];
  const scene = {
    calls,
    gameState: { player: { hand: [{ id: 'tutorial_all_attack_1' }] }, winner: null },
    effectCastState: null,
    isEffectCastResolving: false,
    playerActionUsed: false,
    battleResultModalShown: false,
    isUnitCard() { return false; },
    getTargetingStateForCard() { return null; },
    clearSwapPrompt() { calls.push('clearSwapPrompt'); },
    destroySelectedHandCardZoom() {},
    destroyTargetingInstruction() {},
    updatePlayerBaseActionState() { calls.push('updatePlayerBaseActionState'); },
    resetCardHighlights() { calls.push('resetCardHighlights'); },
    showPlayerEffectConfirmation() { calls.push('showPlayerEffectConfirmation'); },
    playEffectCastSweep() { calls.push('playEffectCastSweep'); return Promise.resolve(); },
    delay() { calls.push('delay'); return Promise.resolve(); },
    captureBoardStats() { calls.push('captureBoardStats'); return { before: true }; },
    buildMovementFeedbackForAction() { calls.push('buildMovementFeedbackForAction'); return [{ type: 'movement' }]; },
    createCardRef(card) { return { name: card.id, side: 'player' }; },
    queueBattleHistoryAction() { calls.push('queueBattleHistoryAction'); },
    buildActionFeedback() { calls.push('buildActionFeedback'); return [{ type: 'feedback' }]; },
    completePlayerAction(beforeStats, actionFeedback, movementFeedback) {
      calls.push(['completePlayerAction', beforeStats, actionFeedback, movementFeedback, this.pendingTutorialEvent]);
      this.playerActionUsed = true;
      this.effectCastState = null;
    },
    showInvalidActionFeedback(payload) { calls.push(['showInvalidActionFeedback', payload]); },
    ...overrides,
  };
  return scene;
}

test('effect-cast sweep stop/failure still completes the player action once and clears blockers', async () => {
  let applyCount = 0;
  const scene = createEffectScene({
    playEffectCastSweep() {
      this.calls.push('playEffectCastSweep:throw');
      throw new Error('destroyed visual target');
    },
  });

  await startPlayerEffectCast.call(
    scene,
    { id: 'tutorial_all_attack_1', effectId: 'buff_all_atk_1' },
    () => {
      applyCount += 1;
      return { ok: true, card: { id: 'tutorial_all_attack_1' }, feedback: [] };
    },
    1,
  );

  assert.equal(applyCount, 1);
  assert.equal(scene.isEffectCastResolving, false);
  assert.equal(scene.effectCastState, null);
  assert.equal(scene.calls.filter((call) => Array.isArray(call) && call[0] === 'completePlayerAction').length, 1);
});

test('effect-cast sweep failure does not orphan tutorial advancement from effect_card to empty_lane', async () => {
  const tutorialControllerState = createTutorialControllerState();
  while (getCurrentTutorialStep(tutorialControllerState)?.id !== 'effect_card') {
    handleTutorialEvent(tutorialControllerState, getCurrentTutorialStep(tutorialControllerState).expected.type, getCurrentTutorialStep(tutorialControllerState).expected);
  }
  assert.equal(getCurrentTutorialStep(tutorialControllerState).id, 'effect_card');

  const scene = createEffectScene({
    tutorialControllerState,
    playEffectCastSweep() { return Promise.reject(new Error('fullscreen rebuild destroyed sweep')); },
    completePlayerAction() {
      this.calls.push(['completePlayerAction', this.pendingTutorialEvent]);
      const event = this.pendingTutorialEvent;
      this.pendingTutorialEvent = null;
      handleTutorialEvent(this.tutorialControllerState, event.eventName, event.payload);
      this.playerActionUsed = true;
      this.effectCastState = null;
    },
  });

  await startPlayerEffectCast.call(
    scene,
    { id: 'tutorial_all_attack_1', effectId: 'buff_all_atk_1' },
    () => ({ ok: true, card: { id: 'tutorial_all_attack_1' }, feedback: [] }),
    1,
  );

  assert.equal(getCurrentTutorialStep(tutorialControllerState).id, 'empty_lane');
  assert.equal(scene.isEffectCastResolving, false);
  assert.equal(scene.effectCastState, null);
});

test('superseded effect-cast state prevents duplicate effect application and completion', async () => {
  let applyCount = 0;
  const scene = createEffectScene({
    playEffectCastSweep() {
      this.effectCastState = { cardId: 'other-cast' };
      return Promise.resolve();
    },
  });

  await startPlayerEffectCast.call(
    scene,
    { id: 'tutorial_all_attack_1', effectId: 'buff_all_atk_1' },
    () => {
      applyCount += 1;
      return { ok: true, card: { id: 'tutorial_all_attack_1' }, feedback: [] };
    },
    1,
  );

  assert.equal(applyCount, 0);
  assert.equal(scene.isEffectCastResolving, false);
  assert.equal(scene.calls.some((call) => Array.isArray(call) && call[0] === 'completePlayerAction'), false);
});

test('playEffectCastSweep resolves when a tween is stopped repeatedly during rebuild', async () => {
  let resolveCount = 0;
  const background = {
    active: true,
    lineWidth: 2,
    strokeColor: 0x111111,
    strokeAlpha: 0.5,
    fillColor: 0x222222,
    fillAlpha: 0.4,
    scaleX: 1,
    scaleY: 1,
    setStrokeStyle() { return this; },
    setFillStyle() { return this; },
    setScale() { return this; },
  };
  const scene = {
    boardCells: [{ row: 1, index: 4, background }],
    playBattleSfx() {},
    time: { delayedCall(_ms, cb) { cb(); return {}; } },
    tweens: {
      add(config) {
        config.onStop();
        config.onStop();
        resolveCount += 1;
        return { active: false };
      },
    },
  };

  await playEffectCastSweep.call(
    scene,
    'player',
    true,
    { SPELL_GENERIC: 'spell' },
    { player: { strokeColor: 0xffffff, strokeAlpha: 1, fillColor: 0x000000, fillAlpha: 0.2 } },
    0.25,
    0.15,
    1,
  );

  assert.equal(resolveCount, 1);
});
