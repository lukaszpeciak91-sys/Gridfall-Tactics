import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { TUTORIAL_STEPS } from '../src/data/tutorial/tutorialSteps.js';
import { checkTutorialInputGate } from '../src/systems/tutorialInputGate.js';
import { handleTutorialEvent } from '../src/systems/tutorialController.js';

const battleSceneSource = await readFile(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
const battleMenuSource = await readFile(new URL('../src/scenes/BattleMenuScene.js', import.meta.url), 'utf8');
const rulesPanelSource = await readFile(new URL('../src/scenes/RulesPanelScene.js', import.meta.url), 'utf8');
const settingsSource = await readFile(new URL('../src/scenes/SettingsScene.js', import.meta.url), 'utf8');

function methodBody(source, name, nextName) {
  const start = source.search(new RegExp(`  (?:async )?${name}\\(`));
  assert.notEqual(start, -1, `${name} body should be present`);
  const end = nextName
    ? source.slice(start + 2).search(new RegExp(`\\n  (?:async )?${nextName}\\(`))
    : -1;
  return end < 0 ? source.slice(start) : source.slice(start, start + 2 + end);
}

function tutorialStateAt(stepId) {
  const currentStepIndex = TUTORIAL_STEPS.findIndex((step) => step.id === stepId);
  assert.notEqual(currentStepIndex, -1);
  return { steps: TUTORIAL_STEPS, currentStepIndex, completed: false, lastEvent: null };
}

function compileMethod(source, name, nextName, params = []) {
  const block = methodBody(source, name, nextName);
  const bodyStart = block.indexOf(') {') + 3;
  const bodyEnd = block.lastIndexOf('}');
  return new Function(...params, block.slice(bodyStart, bodyEnd));
}

function createBattleHarness(stepId = 'inspect_card') {
  const requiredCard = { id: 'tutorial_mulligan_bait_1' };
  const scene = {
    battleContext: { mode: 'tutorial' },
    factionKey: 'tutorial-player',
    enemyFactionKey: 'tutorial-enemy',
    gameState: { player: { hand: [requiredCard] } },
    tutorialControllerState: tutorialStateAt(stepId),
    openingMulliganPending: true,
    openingMulliganActive: true,
    selectedMulliganCardIds: ['kept-selection'],
    navigationInProgress: false,
    pointerInputGuardActive: false,
    isFlowResolving: true,
    isTutorialBattle: () => true,
    handleTutorialEvent(eventName, payload) {
      return handleTutorialEvent(this.tutorialControllerState, eventName, payload);
    },
    guardPointerEvent() {
      this.pointerInputGuardActive = true;
    },
    clearPointerInputGuard() {
      this.pointerInputGuardActive = false;
    },
    closeInspectPreview() {},
    destroyUtilityMenuPanel() {},
    destroyDeckInfoPanel() {},
    restoreRulesPanelBackgroundHelpers() {},
    recoverFromLifecycle(reason) {
      this.lastRecoveryReason = reason;
    },
    scene: {
      launch() {},
      pause() {},
      resume() {},
    },
  };
  return scene;
}

test('real BattleScene Battle Menu open and return callbacks preserve tutorial mulligan state', () => {
  const prepare = compileMethod(battleSceneSource, 'prepareUtilityMenuNavigation', 'getBattleResultText', ['{ includeBattleResultModal = false, preserveBattleFlow = false } = {}']);
  const open = compileMethod(battleSceneSource, 'openBattleMenu', 'openBattleReportFromUtilityMenu');
  const resume = compileMethod(battleSceneSource, 'resumeFromBattleMenu', 'resumeFromBattleReport');
  const scene = createBattleHarness();
  scene.prepareUtilityMenuNavigation = (options) => prepare.call(scene, options);

  open.call(scene);
  assert.equal(scene.openingMulliganPending, true);
  assert.equal(scene.tutorialControllerState.steps[scene.tutorialControllerState.currentStepIndex].id, 'inspect_card');
  assert.deepEqual(scene.selectedMulliganCardIds, ['kept-selection']);
  assert.equal(scene.navigationInProgress, true);

  resume.call(scene);
  assert.equal(scene.navigationInProgress, false);
  assert.equal(scene.pointerInputGuardActive, false);
  assert.equal(scene.openingMulliganPending, true);
  assert.equal(scene.lastRecoveryReason, 'battle-menu-return');
});

test('real Battle Menu callback does not recreate mulligan after completion and keeps non-tutorial defaults', () => {
  const prepare = compileMethod(battleSceneSource, 'prepareUtilityMenuNavigation', 'getBattleResultText', ['{ includeBattleResultModal = false, preserveBattleFlow = false } = {}']);
  const open = compileMethod(battleSceneSource, 'openBattleMenu', 'openBattleReportFromUtilityMenu');

  const completedTutorial = createBattleHarness();
  completedTutorial.openingMulliganPending = false;
  completedTutorial.prepareUtilityMenuNavigation = (options) => prepare.call(completedTutorial, options);
  open.call(completedTutorial);
  assert.equal(completedTutorial.openingMulliganPending, false);

  const normalBattle = createBattleHarness();
  normalBattle.isTutorialBattle = () => false;
  normalBattle.isFlowResolving = true;
  normalBattle.openingMulliganPending = true;
  normalBattle.prepareUtilityMenuNavigation = (options) => prepare.call(normalBattle, options);
  open.call(normalBattle);
  assert.equal(normalBattle.openingMulliganPending, false);
  assert.equal(normalBattle.isFlowResolving, false);
});

test('real Rules return callback preserves tutorial mulligan and restores accepted long press', () => {
  const resume = compileMethod(battleSceneSource, 'resumeFromRulesPanel', 'resumeFromBattleMenu');
  const mechanical = compileMethod(battleSceneSource, 'isTutorialFocusTargetMechanicallyPossible', 'ensureTutorialFocusLayer', ['target', 'step = this.getCurrentTutorialStep()', 'getTutorialBattleData', 'canPlayEffectCard']);
  const startLongPress = compileMethod(battleSceneSource, 'startHandCardLongPress', 'cancelHandCardLongPress', ['cardId', 'CARD_INSPECT_LONG_PRESS_MS']);
  const scene = createBattleHarness();
  scene.navigationInProgress = true;
  scene.pointerInputGuardActive = true;
  scene.getCurrentTutorialStep = () => scene.tutorialControllerState.steps[scene.tutorialControllerState.currentStepIndex];
  scene.isOpeningMulliganInputLocked = () => false;
  scene.isTutorialInputAllowed = (proposal) => checkTutorialInputGate(scene.tutorialControllerState, proposal).allowed;
  scene.utilityMenuPanel = null;
  scene.battleResultModalShown = false;
  scene.playerActionUsed = false;
  scene.isFlowResolving = false;
  scene.pressedHandCardId = 'tutorial_mulligan_bait_1';
  scene.cancelHandCardLongPress = () => {};
  scene.resetCardHighlights = () => {};
  scene.updateTutorialFocus = () => { scene.focusRestoreCount = (scene.focusRestoreCount ?? 0) + 1; };
  scene.time = { delayedCall(_delay, callback) { scene.longPressCallback = callback; return {}; } };

  resume.call(scene);
  const step = scene.getCurrentTutorialStep();
  assert.equal(mechanical.call(scene, step.highlightTarget, step, () => ({ openingConfig: { requiredPlayerMulliganCardId: 'tutorial_mulligan_bait_1' } }), () => ({ ok: true })), true);

  startLongPress.call(scene, 'tutorial_mulligan_bait_1', 425);
  scene.longPressCallback();
  assert.equal(scene.tutorialControllerState.steps[scene.tutorialControllerState.currentStepIndex].id, 'mulligan_select');
  assert.equal(scene.focusRestoreCount, 1);
});

for (const stepId of ['inspect_card', 'mulligan_confirm']) {
  test(`real Settings open/return callbacks clear guards and preserve ${stepId}`, () => {
    const prepare = compileMethod(battleSceneSource, 'prepareUtilityMenuNavigation', 'getBattleResultText', ['{ includeBattleResultModal = false, preserveBattleFlow = false } = {}']);
    const openSettings = compileMethod(battleSceneSource, 'openSettingsScene', 'exitBattleToMainMenu');
    const resumeSettings = compileMethod(battleSceneSource, 'resumeFromSettings', 'openSettingsScene');
    const returnFromSettings = compileMethod(settingsSource, 'returnToMainMenu', 'getBattleReturnScene');
    const battle = createBattleHarness(stepId);
    const trace = [];
    battle.prepareUtilityMenuNavigation = (options) => prepare.call(battle, options);
    battle.resumeFromSettings = () => { trace.push('resume'); resumeSettings.call(battle); };
    battle.scene.launch = () => {};
    battle.scene.bringToTop = () => {};
    battle.scene.pause = () => {};
    const settings = {
      returnSceneKey: 'BattleScene',
      scene: {
        get: () => battle,
        stop: () => trace.push('stop'),
        isPaused: () => true,
        resume: () => { throw new Error('fallback resume must not bypass BattleScene cleanup'); },
        start: () => { throw new Error('battle Settings return must not start MainMenuScene'); },
      },
    };

    openSettings.call(battle);
    assert.equal(battle.openingMulliganPending, true);
    returnFromSettings.call(settings);
    assert.deepEqual(trace, ['resume', 'stop']);
    assert.equal(battle.navigationInProgress, false);
    assert.equal(battle.pointerInputGuardActive, false);
    assert.equal(battle.tutorialControllerState.steps[battle.tutorialControllerState.currentStepIndex].id, stepId);
    assert.deepEqual(battle.selectedMulliganCardIds, ['kept-selection']);
    assert.equal(battle.lastRecoveryReason, 'settings-return');
    assert.equal(checkTutorialInputGate(battle.tutorialControllerState, {
      type: stepId === 'mulligan_confirm' ? 'confirm_mulligan' : 'inspect_card',
      ...(stepId === 'mulligan_confirm' ? { target: 'player_base_button' } : { cardId: 'tutorial_mulligan_bait_1' }),
    }).allowed, true);
  });
}

test('tutorial Battle Menu preserves active mulligan flow while non-tutorial navigation keeps its existing default', () => {
  const openBattleMenu = methodBody(battleSceneSource, 'openBattleMenu', 'openBattleReportFromUtilityMenu');
  assert.match(openBattleMenu, /prepareUtilityMenuNavigation\(\{ preserveBattleFlow: this\.isTutorialBattle\?\.\(\) \?\? false \}\)/);

  const prepareNavigation = methodBody(battleSceneSource, 'prepareUtilityMenuNavigation', 'getBattleResultText');
  assert.match(prepareNavigation, /if \(!preserveBattleFlow\) \{[\s\S]*?this\.isFlowResolving = false;[\s\S]*?this\.openingMulliganPending = false;/);
  assert.doesNotMatch(openBattleMenu, /openingMulliganPending\s*=/);
});

test('Battle Menu close and Rules return use the matching BattleScene recovery hooks', () => {
  const leaveBattleMenu = methodBody(battleMenuSource, 'leaveBattleMenu', 'buildFreshBattleReport');
  assert.match(leaveBattleMenu, /returnScene\?\.resumeFromBattleMenu/);
  assert.match(leaveBattleMenu, /returnScene\.resumeFromBattleMenu\(\)/);

  const openRules = methodBody(battleMenuSource, 'openRulesPanel', 'leaveBattleMenu');
  assert.match(openRules, /launchBattleRulesPanel\(\{ prepareNavigation: false \}\)/);

  const closeRules = methodBody(rulesPanelSource, 'closePanel');
  assert.match(closeRules, /returnScene\?\.resumeFromRulesPanel/);
  assert.match(closeRules, /returnScene\.resumeFromRulesPanel\(\)/);
});

test('matching return hooks clear navigation guards and restore presentation without recreating mulligan ownership', () => {
  for (const [name, nextName, reason] of [
    ['resumeFromRulesPanel', 'resumeFromBattleMenu', 'rules-panel-return'],
    ['resumeFromBattleMenu', 'resumeFromBattleReport', 'battle-menu-return'],
    ['resumeFromSettings', 'openSettingsScene', 'settings-return'],
  ]) {
    const body = methodBody(battleSceneSource, name, nextName);
    assert.match(body, /this\.navigationInProgress = false;/);
    assert.match(body, /this\.clearPointerInputGuard\(\);/);
    assert.match(body, new RegExp(`recoverFromLifecycle\\('${reason}'\\)`));
    assert.doesNotMatch(body, /openingMulliganPending\s*=/);
  }

  const recovery = methodBody(battleSceneSource, 'recoverFromLifecycle', 'normalizeLifecycleUiState');
  assert.match(recovery, /this\.normalizeLifecycleUiState\(reason\);/);
  assert.match(recovery, /this\.refreshLifecycleBanners\(reason\);/);
  assert.doesNotMatch(recovery, /openingMulliganPending\s*=/);
});

test('preserved inspect step remains gated to the required mulligan card', () => {
  const state = tutorialStateAt('inspect_card');
  assert.equal(state.steps[state.currentStepIndex].id, 'inspect_card');
  assert.equal(checkTutorialInputGate(state, { type: 'inspect_card', cardId: 'tutorial_mulligan_bait_1' }).allowed, true);

  const mechanicalCheck = methodBody(battleSceneSource, 'isTutorialFocusTargetMechanicallyPossible', 'ensureTutorialFocusLayer');
  assert.match(mechanicalCheck, /type === 'mulligan_card'[\s\S]*?this\.openingMulliganPending[\s\S]*?some\(\(card\) => card\.id === cardId\)/);

  const longPress = methodBody(battleSceneSource, 'startHandCardLongPress', 'cancelHandCardLongPress');
  assert.match(longPress, /if \(this\.openingMulliganPending\) \{[\s\S]*?handleTutorialEvent\?\.\('card_inspected', \{ cardId \}\)/);
});

test('mulligan selection and confirmation remain owned by their existing input paths', () => {
  const select = methodBody(battleSceneSource, 'toggleOpeningMulliganCard', 'confirmOpeningMulligan');
  assert.match(select, /isTutorialInputAllowed\?\.\(\{ type: 'select_mulligan_card', cardId \}\)/);
  assert.match(select, /handleTutorialEvent\?\.\('mulligan_card_selected', \{ cardId \}\)/);

  const confirm = methodBody(battleSceneSource, 'confirmOpeningMulligan', 'resetOpeningMulliganInputState');
  assert.match(confirm, /isTutorialInputAllowed\?\.\(\{ type: 'confirm_mulligan', target: 'player_base_button' \}\)/);
  assert.match(confirm, /this\.openingMulliganPending = false;/);
});

test('focus restoration retains the single forced recreation path', () => {
  const refresh = methodBody(battleSceneSource, 'refreshLifecycleBanners', 'shouldBlockTutorialUiRecovery');
  assert.equal((refresh.match(/restoreTutorialPresentationState/g) ?? []).length, 1);
  assert.match(refresh, /restoreTutorialPresentationState\(reason, \{ forceRecreate: true \}\)/);

  const restore = methodBody(battleSceneSource, 'restoreTutorialPresentationState', 'shouldRebuildBattleView');
  assert.match(restore, /if \(forceRecreate\) \{[\s\S]*?destroyTutorialBanner\?\.\(\);[\s\S]*?destroyTutorialFocus\?\.\(\);[\s\S]*?forceFocusRedraw = true;[\s\S]*?\}/);
  assert.equal((restore.match(/updateTutorialFocus\?\.\(step/g) ?? []).length, 1);
});

test('Settings and lifecycle/fullscreen recovery boundaries remain unchanged', () => {
  const openSettings = methodBody(battleSceneSource, 'openSettingsScene', 'exitBattleToMainMenu');
  assert.match(openSettings, /prepareUtilityMenuNavigation\(\{ preserveBattleFlow: true \}\)/);

  const settingsReturn = methodBody(settingsSource, 'returnToMainMenu', 'getBattleReturnScene');
  assert.match(settingsReturn, /returnScene\?\.resumeFromSettings/);

  const fullscreen = methodBody(battleSceneSource, 'onFullscreenChanged', 'onTutorialDocumentFullscreenChanged');
  assert.match(fullscreen, /recoverFromLifecycle\(this\.scale\.isFullscreen \? 'enterfullscreen' : 'leavefullscreen'\)/);
  assert.doesNotMatch(fullscreen, /prepareUtilityMenuNavigation|openingMulliganPending\s*=/);
});
