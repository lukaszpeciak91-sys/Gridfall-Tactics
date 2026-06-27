import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const battleSource = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
const battleMenuSource = readFileSync(new URL('../src/scenes/BattleMenuScene.js', import.meta.url), 'utf8');

function methodSource(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert.notEqual(start, -1, `${startNeedle} should exist`);
  const end = source.indexOf(endNeedle, start);
  assert.notEqual(end, -1, `${endNeedle} should exist after ${startNeedle}`);
  return source.slice(start, end);
}

test('BattleScene utility menu exposes canonical active-battle surrender and resolves as enemy win', () => {
  assert.match(battleSource, /translateActive\('ui\.battle\.utilityMenuSurrender', 'Surrender'\), \(\) => this\.showBattleMenuSurrenderConfirmation\(\)\)/);
  assert.doesNotMatch(battleSource, /translateActive\('ui\.battle\.utilityMenuReturn', 'Return'\), \(\) => this\.handleUtilityMenuReturn\(\)\)/);
  assert.doesNotMatch(battleSource, /translateActive\('ui\.battle\.utilityMenuMainMenu', 'Main Menu'\), \(\) => this\.handleUtilityMenuMainMenu\(\)\)/);
  const guardSource = methodSource(battleSource, '  canPlayerMenuSurrender(', '  showBattleMenuSurrenderConfirmation() {');
  [
    'sceneActiveOrResumable',
    'this.battleStartedAt !== null',
    '!this.gameState.winner',
    '!this.battleResultModalShown',
    '!this.battleResultModalPending',
    '!this.openingMulliganPending',
    '!this.isFlowResolving',
    '(allowMenuNavigation || !this.navigationInProgress)',
    '!this.battleMenuSurrenderModal',
  ].forEach((needle) => assert.ok(guardSource.includes(needle), `${needle} guard should be present`));
  assert.doesNotMatch(guardSource, /canPlayerBaseHoldToSurrender|canHoldPassToSurrender|isVerySafeConcedableState/);
  const modalSource = methodSource(battleSource, '  showBattleMenuSurrenderConfirmation() {', '  destroyBattleMenuSurrenderConfirmation() {');
  assert.match(modalSource, /translateActive\('ui\.battle\.surrenderConfirmTitle', 'SURRENDER\?'\)/);
  assert.match(modalSource, /translateActive\('ui\.battle\.surrenderConfirmBody', 'This counts as a defeat\.'\)/);
  assert.match(modalSource, /translateActive\('ui\.common\.cancel', 'Cancel'\)/);
  assert.match(modalSource, /translateActive\('ui\.battle\.surrenderConfirmButton', 'Surrender'\)/);
  const resolveSource = methodSource(battleSource, '  resolvePlayerMenuSurrender() {', '  guardPointerEvent(pointer = null) {');
  assert.match(resolveSource, /this\.gameState\.winner = 'enemy';/);
  assert.match(resolveSource, /this\.gameState\.endingReason = 'player_menu_surrender';/);
  assert.match(resolveSource, /this\.showPlayerMenuSurrenderResultPanel\(\);/);
  assert.doesNotMatch(resolveSource, /completeBattleFlow|scheduleBattleResultModal/);
  assert.match(resolveSource, /this\.destroyBattleMenuSurrenderConfirmation\(\);/);
  assert.match(resolveSource, /this\.destroyUtilityMenuPanel\(\);/);
  assert.match(resolveSource, /this\.closeInspectPreview\(\{ animate: false, clearSelection: true \}\);/);
  assert.match(resolveSource, /this\.destroyDeckInfoPanel\(\);/);
  assert.match(resolveSource, /this\.selectedCardId = null;/);
  assert.match(resolveSource, /this\.pendingSwapIndex = null;/);
  assert.match(resolveSource, /this\.targetingState = null;/);
  assert.match(resolveSource, /this\.effectCastState = null;/);
  assert.match(resolveSource, /this\.isEffectCastResolving = false;/);
  assert.match(resolveSource, /this\.navigationInProgress = false;/);
  assert.match(resolveSource, /this\.clearPointerInputGuard\(\);/);
});

test('separate BattleMenuScene no longer owns active-battle surrender behavior', () => {
  assert.doesNotMatch(battleMenuSource, /translateActive\('ui\.battleMenu\.surrender', 'SURRENDER'\)/);
  assert.doesNotMatch(battleMenuSource, /canPlayerMenuSurrender/);
  assert.doesNotMatch(battleMenuSource, /requestActiveBattleExit/);
  assert.doesNotMatch(battleMenuSource, /resolvePlayerMenuSurrender/);
});

test('surrender defeat flavor uses the normal defeat result subtitle path', () => {
  const subtitleSource = methodSource(battleSource, '  getBattleResultSubtitle() {', '  showBattleResultModal() {');
  assert.match(subtitleSource, /if \(this\.gameState\.winner === 'enemy'\) \{/);
  assert.match(subtitleSource, /this\.gameState\.endingReason === 'player_menu_surrender'/);
  assert.match(subtitleSource, /translateActive\('ui\.battle\.resultSubtitles\.surrenderDefeat'/);
});

test('menu surrender uses a synchronous dedicated result panel instead of the normal completion pipeline', () => {
  const panelSource = methodSource(battleSource, '  showPlayerMenuSurrenderResultPanel() {', '  showBattleResultModal() {');
  assert.match(panelSource, /this\.gameState\?\.endingReason !== 'player_menu_surrender'/);
  assert.match(panelSource, /this\.gameState\?\.winner !== 'enemy'/);
  assert.match(panelSource, /this\.battleResultModalPendingEvent\?\.remove\?\.\(false\);/);
  assert.match(panelSource, /this\.battleResultModalPending = false;/);
  assert.match(panelSource, /this\.stopCampaignBattleTimer\(\);/);
  assert.match(panelSource, /this\.stopBattleAmbience\(\{ fadeMs: 350 \}\);/);
  assert.match(panelSource, /this\.destroyBattleMenuSurrenderConfirmation\(\);/);
  assert.match(panelSource, /this\.destroyUtilityMenuPanel\(\);/);
  assert.match(panelSource, /this\.closeInspectPreview\(\{ animate: false, clearSelection: true \}\);/);
  assert.match(panelSource, /this\.destroyDeckInfoPanel\(\);/);
  assert.match(panelSource, /this\.destroyActiveSelectionMessage\(\);/);
  assert.match(panelSource, /this\.resetCardHighlights\(\{ showPreview: false \}\);/);
  assert.match(panelSource, /this\.showBattleResultModal\(\);/);
  assert.doesNotMatch(panelSource, /completeBattleFlow|scheduleBattleResultModal|delayedCall|showBattleExhaustedBannerThenScheduleResult/);
});

test('menu surrender cannot bypass defeat result navigation', () => {
  const resolveSource = methodSource(battleSource, '  resolvePlayerMenuSurrender() {', '  guardPointerEvent(pointer = null) {');
  const panelSource = methodSource(battleSource, '  showPlayerMenuSurrenderResultPanel() {', '  showBattleResultModal() {');
  assert.match(resolveSource, /this\.gameState\.winner = 'enemy';/);
  assert.match(resolveSource, /this\.gameState\.endingReason = 'player_menu_surrender';/);
  assert.match(resolveSource, /this\.showPlayerMenuSurrenderResultPanel\(\);/);
  assert.match(panelSource, /this\.showBattleResultModal\(\);/);
  assert.doesNotMatch(resolveSource + panelSource, /scene\.start\('MainMenuScene'|scene\.start\('FactionSelectScene'|exitBattleToFactionSelect|exitBattleToCampaignEnemySelect|handleUtilityMenuReturn/);
});

test('campaign menu surrender continues through normal defeat attempt loss', () => {
  const modalSource = methodSource(battleSource, '  showBattleResultModal() {', '  createResultModalButton');
  const continueSource = methodSource(battleSource, '  continueCampaignBattleResult() {', '  routeAfterIgnoredCampaignResult');
  assert.match(modalSource, /this\.isCampaignBattle\(\)[\s\S]*translateActive\('ui\.common\.continue', 'CONTINUE'\)[\s\S]*\(\) => this\.continueCampaignBattleResult\(\)/);
  assert.match(continueSource, /winner: this\.gameState\?\.winner === 'player' \? 'player' : \(this\.gameState\?\.winner === 'draw' \? 'draw' : 'enemy'\)/);
  assert.match(continueSource, /applyCampaignBattleResult\(campaign, result\)/);
  assert.match(continueSource, /this\.scene\.start\('CampaignEnemySelectScene', \{ campaign: updatedCampaign \}\)/);
});

test('menu surrender result title and flavor use surrender-specific defeat copy', () => {
  const titleSource = methodSource(battleSource, '  getBattleResultText() {', '  playBattleSfx(key, options = {}) {');
  assert.match(titleSource, /this\.gameState\.endingReason === 'player_menu_surrender'/);
  assert.match(titleSource, /translateActive\('ui\.battle\.surrenderDefeatTitle', 'DEFEAT'\)/);
  assert.match(battleSource, /surrenderDefeat: 'Not every story earns applause\.'/);
});

test('menu surrender result stats display at least one turn without changing other results', () => {
  const statsSource = methodSource(battleSource, '  getBattleResultStatsText() {', '  scheduleBattleResultModal');
  assert.match(statsSource, /const rawTurns = Math\.max\(0, this\.gameState\?\.turnsCompleted \?\? 0\);/);
  assert.match(statsSource, /this\.gameState\?\.endingReason === 'player_menu_surrender'/);
  assert.match(statsSource, /Math\.max\(1, rawTurns\)/);
  assert.match(statsSource, /: rawTurns;/);
});

test('menu surrender modal depth cannot outlive cleanup above normal result modal depth', () => {
  const modalSource = methodSource(battleSource, '  showBattleMenuSurrenderConfirmation() {', '  destroyBattleMenuSurrenderConfirmation() {');
  const destroySource = methodSource(battleSource, '  destroyBattleMenuSurrenderConfirmation() {', '  resolvePlayerMenuSurrender() {');
  const resultSource = methodSource(battleSource, '  showBattleResultModal() {', '  createResultModalButton');
  assert.match(modalSource, /const depth = 940;/);
  assert.match(modalSource, /depth: depth \+ 4/);
  assert.match(destroySource, /modal\.overlay/);
  assert.match(destroySource, /modal\.glow/);
  assert.match(destroySource, /modal\.frame/);
  assert.match(destroySource, /modal\.title/);
  assert.match(destroySource, /modal\.body/);
  assert.match(destroySource, /modal\.buttons \?\? \[\]\)\.flatMap\(\(button\) => button\.items \?\? \[\]\)/);
  assert.match(destroySource, /this\.battleMenuSurrenderModal = null;/);
  assert.match(resultSource, /\.setDepth\(900\)/);
  assert.match(resultSource, /\.setDepth\(904\)/);
});

test('opening Battle Menu clears active gameplay selection layers', () => {
  const menuSource = methodSource(battleSource, '  showUtilityMenuPanel() {', '  createUtilityMenuButton');
  assert.match(menuSource, /this\.closeInspectPreview\(\{ animate: false, clearSelection: true \}\);/);
  const cleanupSource = methodSource(battleSource, '  closeInspectPreview({ animate = false, clearSelection = false } = {}) {', '  prepareUtilityMenuNavigation');
  assert.match(cleanupSource, /if \(clearSelection\) \{/);
  assert.match(cleanupSource, /this\.selectedCardId = null;/);
  assert.match(cleanupSource, /this\.pendingSwapIndex = null;/);
  assert.match(cleanupSource, /this\.targetingState = null;/);
  assert.match(cleanupSource, /this\.effectCastState = null;/);
  assert.match(cleanupSource, /this\.destroyActiveSelectionMessage\(\);/);
});
