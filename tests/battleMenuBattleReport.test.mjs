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

test('battle report feature flag defaults on and appends final battle menu action', () => {
  assert.equal(SHOW_BATTLE_REPORT_TOOL, true);
  assert.equal(getBattleMenuActionDescriptors().at(-1).id, 'battleReport');
  assert.equal(getBattleMenuActionDescriptors({ showBattleReportTool: false }).some((a) => a.id === 'battleReport'), false);
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
  assert.match(source, /destroyBattleReportPanel\(\); \}/);
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
