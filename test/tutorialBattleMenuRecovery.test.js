import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { TUTORIAL_STEPS } from '../src/data/tutorial/tutorialSteps.js';
import { checkTutorialInputGate } from '../src/systems/tutorialInputGate.js';

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
