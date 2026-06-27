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
  assert.match(resolveSource, /this\.completeBattleFlow\(0\);/);
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
