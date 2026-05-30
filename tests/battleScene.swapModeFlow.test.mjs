import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('swap selection is implicit and uses pendingSwapIndex flow', () => {
  const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
  assert.match(source, /if \(this\.pendingSwapIndex !== null\) \{/);
  assert.match(source, /if \(!unit \|\| unit\.owner !== 'player'\) \{\s*this\.pendingSwapIndex = null;/);
  assert.match(source, /const result = performSwap\(this\.gameState, 'player', fromIndex, boardIndex\);/);
  assert.match(source, /if \(!result\.ok\) \{\s*this\.clearSwapPrompt\(\);/);
  assert.match(source, /this\.completePlayerAction\(beforeStats, \[\], \[\{ type: 'swap', fromIndex, toIndex: boardIndex, label: 'SWAP', kind: 'swap' \}\]\);/);
});

test('pass no longer enters or cancels explicit swap mode', () => {
  const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

  const resolvePassTurnBlock = source.slice(
    source.indexOf('  resolvePassTurn() {'),
    source.indexOf('  getOpeningTurnStartBannerConfig() {'),
  );

  assert.doesNotMatch(resolvePassTurnBlock, /actionMode === 'swap'/);
  assert.doesNotMatch(resolvePassTurnBlock, /canPlayerStartSwap/);
});

test('action button does not show standalone SWAP label', () => {
  const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
  const updateActionButtonLabelBlock = source.slice(
    source.indexOf('  updateActionButtonLabel() {'),
    source.indexOf('  canHoldPassToSurrender() {'),
  );
  assert.doesNotMatch(updateActionButtonLabelBlock, /swapAction/);
  assert.doesNotMatch(updateActionButtonLabelBlock, /swapModeCancel/);
});

test('board inspect remains long-press only and suppresses quick-tap inspect', () => {
  const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

  assert.match(source, /background\.on\('pointerdown', \(\) => \{\s*this\.onBoardCellPointerDown\(boardIndex\);\s*\}\);/);
  assert.match(source, /background\.on\('pointerup', \(\) => \{\s*this\.onBoardCellPointerUp\(boardIndex\);\s*\}\);/);
  assert.match(source, /startBoardCellLongPress\(boardIndex\) \{[\s\S]*this\.time\.delayedCall\(BOARD_INSPECT_LONG_PRESS_MS,[\s\S]*if \(this\.showBoardUnitInspect\(boardIndex\)\) \{/);
  assert.match(source, /onBoardCellPointerUp\(boardIndex\) \{[\s\S]*if \(this\.boardLongPressTriggeredIndex === boardIndex\) \{[\s\S]*return;\s*\}[\s\S]*this\.onBoardCellTap\(boardIndex\);\s*\}/);

  const onBoardCellTapBlock = source.slice(
    source.indexOf('  onBoardCellTap(boardIndex) {'),
    source.indexOf('  getEffectSummary(effectId, fallbackText = \'\') {'),
  );
  assert.doesNotMatch(onBoardCellTapBlock, /showBoardUnitInspect\(boardIndex\)/);
});

test('scene-level pointerup routes board quick taps while pending swap exists even without a selected hand card', () => {
  const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

  const onScenePointerUpBlock = source.slice(
    source.indexOf('  onScenePointerUp(pointer, currentlyOver = []) {'),
    source.indexOf('  clearSelectedHandInspectFromOutsideTap(pointer, currentlyOver = []) {'),
  );

  assert.match(onScenePointerUpBlock, /const hasActiveBoardTapMode = this\.pendingSwapIndex !== null;/);
  assert.match(onScenePointerUpBlock, /if \(boardCell\) \{[\s\S]*if \(hasActiveBoardTapMode\) \{[\s\S]*this\.onBoardCellTap\(boardCell\.index\);[\s\S]*return;\s*\}/);
});
