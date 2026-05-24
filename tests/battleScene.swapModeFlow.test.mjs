import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('swap mode is explicit and uses two-tap adjacent friendly swap flow', () => {
  const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
  assert.match(source, /this\.actionMode === 'swap' && this\.pendingSwapIndex !== null/);
  assert.match(source, /this\.actionMode === 'swap'\) \{\s*if \(!unit \|\| unit\.owner !== 'player'\) return;\s*this\.pendingSwapIndex = boardIndex;/);
  assert.match(source, /const result = performSwap\(this\.gameState, 'player', fromIndex, boardIndex\);/);
  assert.match(source, /if \(!result\.ok\) \{\s*return;\s*\}/);
  assert.match(source, /this\.completePlayerAction\(beforeStats, \[\], \[\{ type: 'swap', fromIndex, toIndex: boardIndex, label: 'SWAP', kind: 'swap' \}\]\);/);
});

test('action button enters and cancels explicit swap mode before pass', () => {
  const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

  const resolvePassTurnBlock = source.slice(
    source.indexOf('  resolvePassTurn() {'),
    source.indexOf('  getOpeningTurnStartBannerConfig() {'),
  );

  assert.match(resolvePassTurnBlock, /if \(this\.actionMode === 'swap'\) \{\s*this\.pendingSwapIndex = null;\s*this\.actionMode = null;/);
  assert.match(resolvePassTurnBlock, /if \(this\.isUnitCard\(selectedCard\)\) \{\s*this\.actionMode = 'swap';\s*this\.pendingSwapIndex = null;/);
});

test('board inspect remains long-press only and suppresses quick-tap inspect', () => {
  const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

  assert.match(source, /background\.on\('pointerdown', \(\) => \{\s*this\.onBoardCellPointerDown\(boardIndex\);\s*\}\);/);
  assert.match(source, /background\.on\('pointerup', \(\) => \{\s*this\.onBoardCellPointerUp\(boardIndex\);\s*\}\);/);
  assert.match(source, /startBoardCellLongPress\(boardIndex\) \{[\s\S]*this\.time\.delayedCall\(HAND_CARD_LONG_PRESS_MS,[\s\S]*if \(this\.showBoardUnitInspect\(boardIndex\)\) \{/);
  assert.match(source, /onBoardCellPointerUp\(boardIndex\) \{[\s\S]*if \(this\.boardLongPressTriggeredIndex === boardIndex\) \{[\s\S]*return;\s*\}[\s\S]*this\.onBoardCellTap\(boardIndex\);\s*\}/);

  const onBoardCellTapBlock = source.slice(
    source.indexOf('  onBoardCellTap(boardIndex) {'),
    source.indexOf('  getEffectSummary(effectId, fallbackText = \'\') {'),
  );
  assert.doesNotMatch(onBoardCellTapBlock, /showBoardUnitInspect\(boardIndex\)/);
});
