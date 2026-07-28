import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import en from '../src/localization/translations/en.json' with { type: 'json' };
import pl from '../src/localization/translations/pl.json' with { type: 'json' };
import uk from '../src/localization/translations/uk.json' with { type: 'json' };
import { TUTORIAL_STEPS } from '../src/data/tutorial/tutorialSteps.js';

const source = await readFile(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
const battleMenuSource = await readFile(new URL('../src/scenes/BattleMenuScene.js', import.meta.url), 'utf8');

function methodBody(name, nextName) {
  const start = source.search(new RegExp(`  (?:async )?${name}\\(`));
  assert.notEqual(start, -1, `${name} should exist`);
  const rest = source.slice(start + 2);
  const end = rest.search(new RegExp(`\\n  (?:async )?${nextName}\\(`));
  return end < 0 ? source.slice(start) : source.slice(start, start + 2 + end);
}

function compileMethod(name, nextName, params = []) {
  const block = methodBody(name, nextName);
  const bodyStart = block.indexOf(') {') + 3;
  return new Function(...params, block.slice(bodyStart, block.lastIndexOf('}')));
}

const isBlocked = compileMethod('isTutorialMulliganUtilityActionBlocked', 'rejectTutorialMulliganUtilityAction', ['actionId']);
const rejectAction = compileMethod('rejectTutorialMulliganUtilityAction', 'launchBattleRulesPanel', ['actionId']);
const openRules = compileMethod('openRulesPanel', 'openBattleMenu');
const openSettings = compileMethod('openSettingsScene', 'exitBattleToMainMenu');
const openDeck = compileMethod('openDeckInfoPanel', 'bindDeckInfoScrollHandlers');
const closeDeck = compileMethod('destroyDeckInfoPanel', 'addDeckInfoGlassPanel');

function harness({ tutorial = true, pending = true, stepId = 'mulligan_confirm' } = {}) {
  const trace = [];
  const scene = {
    battleContext: { mode: tutorial ? 'tutorial' : 'arena' },
    openingMulliganPending: pending,
    openingMulliganActive: pending,
    selectedMulliganCardIds: ['card-a', 'card-b'],
    expectedTutorialInput: { type: stepId },
    tutorialFocusedTarget: { type: 'mulligan_card', cardId: 'card-a' },
    tutorialFocusGraphics: { active: true },
    cardViews: [{ cardId: 'card-a', root: { active: true } }],
    inspectPreview: { cardId: 'card-a' },
    tutorialControllerState: {
      steps: TUTORIAL_STEPS,
      currentStepIndex: TUTORIAL_STEPS.findIndex((step) => step.id === stepId),
      completed: false,
    },
    navigationInProgress: false,
    pointerInputGuardActive: false,
    deckInfoPanel: null,
    utilityMenuPanel: { active: true },
    isTutorialBattle() { return this.battleContext.mode === 'tutorial'; },
    isTutorialMulliganUtilityActionBlocked(actionId) { return isBlocked.call(this, actionId); },
    rejectTutorialMulliganUtilityAction(actionId) { return rejectAction.call(this, actionId); },
    showInvalidActionFeedback(payload) { trace.push(['feedback', payload]); },
    launchBattleRulesPanel() { trace.push(['launch', 'RulesPanelScene']); return true; },
    prepareUtilityMenuNavigation() { this.navigationInProgress = true; this.pointerInputGuardActive = true; trace.push(['prepare']); return true; },
    cancelEffectTargeting() { trace.push(['cancel-targeting']); },
    scene: {
      launch(key) { trace.push(['launch', key]); },
      bringToTop(key) { trace.push(['top', key]); },
      pause() { trace.push(['pause']); },
    },
  };
  return { scene, trace };
}

function snapshot(scene) {
  return {
    pending: scene.openingMulliganPending,
    active: scene.openingMulliganActive,
    selected: [...scene.selectedMulliganCardIds],
    tutorial: structuredClone(scene.tutorialControllerState),
    navigation: scene.navigationInProgress,
    pointer: scene.pointerInputGuardActive,
    deck: scene.deckInfoPanel,
    menu: scene.utilityMenuPanel,
    expected: structuredClone(scene.expectedTutorialInput),
    focus: structuredClone(scene.tutorialFocusedTarget),
    focusActive: scene.tutorialFocusGraphics.active,
    cardViews: structuredClone(scene.cardViews),
    inspect: structuredClone(scene.inspectPreview),
  };
}

test('Deck/TALIA is rejected at the panel boundary without state mutation during the playable-tutorial mulligan', () => {
  const { scene, trace } = harness();
  scene.gameState = { player: { deck: [] } };
  scene.effectCastState = { source: 'unit-on-play' };
  const before = snapshot(scene);

  assert.equal(openDeck.call(scene), false);

  assert.deepEqual(snapshot(scene), before);
  assert.deepEqual(trace, [['feedback', { reason: 'Finish the mulligan first.', scope: 'global' }]]);
  assert.equal(trace.some(([event]) => event === 'cancel-targeting' || event === 'prepare' || event === 'pause'), false);
});

test('Deck/TALIA remains available for the required deck and Battle History tutorial steps', () => {
  for (const stepId of ['deck_counter_open', 'battle_history']) {
    const { scene, trace } = harness({ stepId });
    scene.gameState = { player: { deck: [] } };
    scene.effectCastState = { source: 'unit-on-play' };

    assert.equal(openDeck.call(scene), undefined);
    assert.deepEqual(trace, [['cancel-targeting']]);
  }
});

test('closing Battle History advances beyond the required sequence before Deck/TALIA locks', () => {
  const { scene } = harness({ stepId: 'battle_history' });
  scene.deckInfoPanel = {};
  scene.input = { off() {}, keyboard: { off() {} } };
  scene.isTutorialInputAllowed = () => true;
  scene.unregisterBattleModalScrollHint = () => {};
  scene.restoreDeckInfoBackgroundHelpers = () => {};
  scene.updatePlayerBaseActionState = () => {};
  scene.updateTutorialBanner = () => {};
  scene.handleTutorialEvent = (eventName) => {
    assert.equal(eventName, 'deck_closed');
    scene.tutorialControllerState.currentStepIndex += 1;
  };

  assert.equal(scene.isTutorialMulliganUtilityActionBlocked('deck'), false);
  closeDeck.call(scene);
  assert.equal(scene.deckInfoPanel, null);
  assert.equal(scene.isTutorialMulliganUtilityActionBlocked('deck'), true);
});

test('Deck/TALIA uses its normal action immediately after tutorial mulligan completion', () => {
  const { scene, trace } = harness({ pending: false });
  scene.gameState = { player: { deck: [] } };
  scene.effectCastState = { source: 'unit-on-play' };

  openDeck.call(scene);

  assert.deepEqual(trace, [['cancel-targeting']]);
});

test('Deck/TALIA remains available during a non-tutorial mulligan', () => {
  const { scene, trace } = harness({ tutorial: false, pending: true });
  scene.gameState = { player: { deck: [] } };
  scene.effectCastState = { source: 'unit-on-play' };

  openDeck.call(scene);

  assert.deepEqual(trace, [['cancel-targeting']]);
});

for (const [action, invoke] of [['Rules', openRules], ['Settings', openSettings]]) {
  test(`${action} is rejected without state mutation during the playable-tutorial mulligan`, () => {
    const { scene, trace } = harness();
    const before = snapshot(scene);
    assert.equal(invoke.call(scene), false);
    assert.deepEqual(snapshot(scene), before);
    assert.deepEqual(trace, [['feedback', { reason: 'Finish the mulligan first.', scope: 'global' }]]);
    assert.equal(trace.some(([event]) => event === 'launch' || event === 'prepare' || event === 'pause'), false);
  });
}

test('Deck, Rules, and Settings tap spam preserves every protected mulligan step', () => {
  for (const stepId of ['inspect_card', 'mulligan_select', 'mulligan_confirm']) {
    const { scene, trace } = harness({ stepId });
    scene.gameState = { player: { deck: [] } };
    const before = snapshot(scene);
    for (let tap = 0; tap < 4; tap += 1) {
      assert.equal(openDeck.call(scene), false);
      assert.equal(openRules.call(scene), false);
      assert.equal(openSettings.call(scene), false);
    }
    assert.deepEqual(snapshot(scene), before);
    assert.equal(trace.length, 12);
    assert.ok(trace.every(([event, payload]) => event === 'feedback'
      && payload.reason === 'Finish the mulligan first.' && payload.scope === 'global'));
  }
});

test('Rules and Settings are immediately available after tutorial mulligan completion', () => {
  const { scene, trace } = harness({ pending: false });
  assert.equal(openRules.call(scene), true);
  openSettings.call(scene);
  assert.deepEqual(trace.filter(([event]) => event === 'launch').map(([, key]) => key), ['RulesPanelScene', 'SettingsScene']);
});

test('Rules and Settings remain available during a non-tutorial mulligan', () => {
  const { scene, trace } = harness({ tutorial: false, pending: true });
  assert.equal(openRules.call(scene), true);
  openSettings.call(scene);
  assert.deepEqual(trace.filter(([event]) => event === 'launch').map(([, key]) => key), ['RulesPanelScene', 'SettingsScene']);
});

test('dedicated feedback is localized in every supported language', () => {
  assert.equal(pl.ui.battle.invalidAction.finishMulliganFirst, 'Najpierw dokończ mulligan.');
  assert.equal(en.ui.battle.invalidAction.finishMulliganFirst, 'Finish the mulligan first.');
  assert.equal(uk.ui.battle.invalidAction.finishMulliganFirst, 'Спочатку завершіть муліган.');
});

test('restriction is checked before the pointer guard and uses the visible invalid-action banner', () => {
  const button = methodBody('createUtilityMenuButton', 'destroyUtilityMenuPanel');
  assert.ok(button.indexOf('rejectBeforePointerGuard?.()') < button.indexOf('this.guardPointerEvent(pointer)'));
  assert.match(source, /showInvalidActionBanner\(message, \{ allowDuringTutorial: true \}\)/);
  assert.match(source, /setDepth\(allowDuringTutorial \? 730 : 222\)/);
  const deckCounter = methodBody('drawDeckCounter', 'refreshDeckCounter');
  assert.ok(deckCounter.indexOf("rejectTutorialMulliganUtilityAction?.('deck')") < deckCounter.indexOf('isTutorialInputAllowed?.'));
  assert.match(methodBody('openDeckInfoPanel', 'bindDeckInfoScrollHandlers'), /^  openDeckInfoPanel\(\) \{\n    if \(this\.rejectTutorialMulliganUtilityAction\?\.\('deck'\)\) return false;/);
  assert.match(battleMenuSource, /openRulesPanel\(\) \{[\s\S]*rejectTutorialMulliganUtilityAction\?\.\('rules'\)[\s\S]*this\.scene\.stop\(\)/);
});

test('copy report, surrender, confirmation, and close actions remain outside the restriction', () => {
  const menu = methodBody('showUtilityMenuPanel', 'openSurrenderConfirmationFromUtilityMenu');
  assert.match(menu, /id: 'surrender'[\s\S]*openSurrenderConfirmationFromUtilityMenu/);
  assert.match(menu, /id: 'battleReport'[\s\S]*openBattleReportFromUtilityMenu/);
  assert.match(menu, /close_battle_menu/);
  assert.doesNotMatch(menu, /id: 'surrender'[^\n]*rejectBeforePointerGuard/);
  assert.match(battleMenuSource, /copyReport/);
  assert.match(source, /showSurrenderConfirmation\(\)/);
});
