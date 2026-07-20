import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getBattleMenuActionDescriptors, serializeBattleReportSnapshot, buildBattleReportSummary, canShowBattleReportForceReveal } from '../src/ui/battleMenuReport.js';
import { SHOW_BATTLE_REPORT_TOOL } from '../src/config/debugTools.js';
import en from '../src/localization/translations/en.json' with { type: 'json' };
import pl from '../src/localization/translations/pl.json' with { type: 'json' };

const source = readFileSync(new URL('../src/scenes/BattleMenuScene.js', import.meta.url), 'utf8');
const helperSource = readFileSync(new URL('../src/ui/battleMenuReport.js', import.meta.url), 'utf8');
const battleSource = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

function methodBody(sourceText, methodName) {
  const match = sourceText.match(new RegExp(`\n  ${methodName}\\(\\) \{([\\s\\S]*?)\n  \}`));
  assert.ok(match, `${methodName} method exists`);
  return match[0];
}

test('battle report feature flag defaults on and appends final battle menu action', () => {
  assert.equal(SHOW_BATTLE_REPORT_TOOL, true);
  assert.equal(getBattleMenuActionDescriptors().at(-1).id, 'battleReport');
  assert.equal(getBattleMenuActionDescriptors({ showBattleReportTool: false }).some((a) => a.id === 'battleReport'), false);
});

test('BattleScene utility menu keeps four distinct actions with battle report last', () => {
  assert.match(battleSource, /const utilityMenuActions = \[[\s\S]*id: 'rules'[\s\S]*onClick: \(\) => this\.openRulesPanel\(\)[\s\S]*id: 'settings'[\s\S]*onClick: \(\) => this\.openSettingsScene\(\)[\s\S]*id: 'surrender'[\s\S]*onClick: \(\) => this\.openSurrenderConfirmationFromUtilityMenu\(\)[\s\S]*id: 'battleReport'[\s\S]*onClick: \(\) => this\.openBattleReportFromUtilityMenu\(\)[\s\S]*\];/);
  assert.doesNotMatch(battleSource, /id: 'battleReport'[\s\S]{0,240}openBattleMenu\(\)/);
  assert.doesNotMatch(battleSource, /id: 'battleReport'[\s\S]{0,240}openRulesPanel\(\)/);
  assert.doesNotMatch(battleSource, /id: 'battleReport'[\s\S]{0,240}openSettingsScene\(\)/);
  assert.doesNotMatch(battleSource, /id: 'battleReport'[\s\S]{0,240}openSurrenderConfirmationFromUtilityMenu\(\)/);
});

test('battle report utility route opens report-only panel without placeholder navigation', () => {
  assert.match(battleSource, /openBattleReportFromUtilityMenu\(\) \{[\s\S]*prepareUtilityMenuNavigation\(\{ preserveBattleFlow: true \}\)[\s\S]*this\.scene\.launch\('BattleMenuScene', \{[\s\S]*openBattleReportPanel: true,[\s\S]*reportOnly: true,[\s\S]*\}\);[\s\S]*this\.scene\.pause\(\);[\s\S]*\}/);
  const route = methodBody(battleSource, 'openBattleReportFromUtilityMenu');
  assert.doesNotMatch(route, /scene\.start\(/);
  assert.doesNotMatch(route, /RulesPanelScene/);
  assert.doesNotMatch(route, /SettingsScene/);
  assert.doesNotMatch(route, /showSurrenderConfirmation/);
});

test('report-only BattleMenuScene immediately opens panel and skips placeholder menu chrome', () => {
  assert.match(source, /if \(data\?\.openBattleReportPanel === true && this\.reportOnly\) \{\n\s*this\.openBattleReportPanel\(\);\n\s*this\.events\.once\(Phaser\.Scenes\.Events\.SHUTDOWN, \(\) => this\.destroyBattleReportPanel\(\)\);\n\s*return;\n\s*\}\n\n\s*this\.cameras\.main\.setBackgroundColor/);
  assert.match(source, /closeBattleReportPanel\(\) \{[\s\S]*if \(this\.reportOnly\) this\.leaveBattleMenu\(\);[\s\S]*\}/);
  assert.match(source, /if \(this\.reportOnly && returnScene\?\.resumeFromBattleReport\) \{[\s\S]*returnScene\.resumeFromBattleReport\(\);[\s\S]*return;[\s\S]*\}/);
  assert.match(battleSource, /resumeFromBattleReport\(\) \{[\s\S]*this\.scene\.resume\(\);[\s\S]*this\.handleTutorialEvent\?\.\('battle_menu_closed'\);[\s\S]*\}/);
  assert.doesNotMatch(methodBody(battleSource, 'resumeFromBattleReport'), /recoverFromLifecycle/);
  assert.doesNotMatch(methodBody(source, 'leaveBattleMenu').split('if (returnScene?.resumeFromBattleMenu)')[0], /enterBattleScene/);
});


test('battle report uses localization keys and the shared battle menu button builder path', () => {
  assert.equal(en.ui.battleMenu.battleReport, 'BATTLE REPORT');
  assert.equal(pl.ui.battleMenu.battleReport, 'RAPORT BITWY');
  assert.equal(en.ui.battleMenu.copyReport, 'COPY REPORT');
  assert.equal(pl.ui.battleMenu.copyReport, 'KOPIUJ RAPORT');
  assert.match(source, /getBattleMenuActionDescriptors\(\)\.map[\s\S]*this\.createBattleMenuButton/);
  assert.match(helperSource, /labelKey: 'ui\.battleMenu\.battleReport'/);
});

test('opening battle report builds fresh manual snapshot every time', () => {
  assert.match(source, /buildBattleReportSnapshot\(\{ captureSource: BATTLE_REPORT_CAPTURE_SOURCE \}\)/);
  assert.match(helperSource, /BATTLE_REPORT_CAPTURE_SOURCE = 'battle-menu-manual'/);
  assert.match(source, /openBattleReportPanel\(\) \{[\s\S]*const \{ snapshot, reportText, summaryText, battleScene \} = this\.buildFreshBattleReport\(\)/);
  assert.match(source, /serializeBattleReportSnapshot\(snapshot\)/);
});

test('summary is compact and full displayed/copy text share same snapshot serialization', () => {
  const snapshot = { capturedAt: 'now', warnings: ['x'], battle: { mode: 'arena', sessionBattleSequenceNumber: 2, turnNumber: 3, playerFactionKey: 'A', enemyFactionKey: 'B', battlegroundId: 'bg' }, scenes: { topSceneKey: 'BattleMenuScene', battleScene: { paused: true } }, environment: {}, capture: { captureSource: 'battle-menu-manual' } };
  const text = serializeBattleReportSnapshot(snapshot);
  assert.equal(text, JSON.stringify(snapshot, null, 2));
  const summary = buildBattleReportSummary(snapshot);
  assert.match(summary, /Warnings: 1/);
  assert.match(summary, /Mode: arena/);
  assert.match(summary, /Top scene: BattleMenuScene/);
  assert.doesNotMatch(summary, /"warnings"/);
  assert.match(source, /report\.textContent = reportText/);
  assert.match(source, /writeText\?\.\(this\.battleReportText\)/);
});

test('report text is selectable scrollable and bottom controls are force copy close', () => {
  assert.match(source, /overflow:auto[\s\S]*user-select:text/);
  assert.match(source, /panel\.append\(title, summary, report, status, controls\)/);
  assert.match(source, /controls\.appendChild\(makeButton\('ui\.battleMenu\.forceReveal'[\s\S]*controls\.appendChild\(makeButton\('ui\.battleMenu\.copyReport'[\s\S]*controls\.appendChild\(makeButton\('ui\.battleMenu\.closeReport'/);
});

test('copy failure is non fatal and close only destroys report panel', () => {
  assert.match(source, /catch \(_\) \{[\s\S]*Copy failed/);
  assert.match(source, /closeBattleReportPanel\(\) \{\n\s*this\.destroyBattleReportPanel\(\);/);
  assert.doesNotMatch(source, /closeReport[\s\S]{0,200}resumeFromBattleMenu/);
});

test('force reveal is conditional and uses existing reconciliation before refreshing report', () => {
  const normal = { openingMulliganPending: true, gameState: {}, reconcileOpeningMulliganPresentation() {} };
  assert.equal(canShowBattleReportForceReveal(normal, { reveal: {} }), false);
  const suspicious = { openingMulliganPending: true, gameState: {}, reconcileOpeningMulliganPresentation() {} };
  assert.equal(canShowBattleReportForceReveal(suspicious, { reveal: { invalidHiddenFrontCount: 1 } }), true);
  assert.match(source, /reconcileOpeningMulliganPresentation\(\{ reason: 'diagnostic-force-reveal' \}\);\n\s*this\.openBattleReportPanel\(\)/);
});

test('floating reveal diagnostic button and automatic overlay creation are removed from BattleScene', () => {
  assert.doesNotMatch(battleSource, /textContent = 'REVEAL DIAG'/);
  assert.doesNotMatch(battleSource, /showOpeningRevealDiagnosticControl\(\)/);
  assert.match(battleSource, /globalThis\.localStorage\?\.setItem\?\.\(OPENING_REVEAL_DIAG_STORAGE_KEY, JSON\.stringify\(snapshot\)\)/);
  assert.match(battleSource, /events: \[\.\.\.\(this\.openingRevealDiagEvents \?\? \[\]\)\]/);
});
