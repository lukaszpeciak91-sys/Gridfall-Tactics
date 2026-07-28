import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import en from '../src/localization/translations/en.json' with { type: 'json' };
import pl from '../src/localization/translations/pl.json' with { type: 'json' };
import uk from '../src/localization/translations/uk.json' with { type: 'json' };

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

const isLocked = compileMethod('isTutorialOpeningMulliganUtilityNavigationLocked', 'rejectTutorialMulliganUtilityNavigation');
const reject = compileMethod('rejectTutorialMulliganUtilityNavigation', 'launchBattleRulesPanel');
const openRules = compileMethod('openRulesPanel', 'openBattleMenu');
const openSettings = compileMethod('openSettingsScene', 'exitBattleToMainMenu');

function harness({ tutorial = true, pending = true } = {}) {
  const trace = [];
  const scene = {
    battleContext: { mode: tutorial ? 'tutorial' : 'arena' },
    openingMulliganPending: pending,
    openingMulliganActive: pending,
    selectedMulliganCardIds: ['card-a', 'card-b'],
    tutorialControllerState: { currentStepIndex: 4, expected: { type: 'confirm_mulligan' } },
    navigationInProgress: false,
    pointerInputGuardActive: false,
    utilityMenuPanel: { active: true },
    isTutorialBattle() { return this.battleContext.mode === 'tutorial'; },
    isTutorialOpeningMulliganUtilityNavigationLocked() { return isLocked.call(this); },
    rejectTutorialMulliganUtilityNavigation() { return reject.call(this); },
    showInvalidActionFeedback(payload) { trace.push(['feedback', payload]); },
    launchBattleRulesPanel() { trace.push(['launch', 'RulesPanelScene']); return true; },
    prepareUtilityMenuNavigation() { this.navigationInProgress = true; this.pointerInputGuardActive = true; trace.push(['prepare']); return true; },
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
    menu: scene.utilityMenuPanel,
  };
}

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
