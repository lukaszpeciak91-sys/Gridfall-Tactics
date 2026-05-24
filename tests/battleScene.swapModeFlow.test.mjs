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
  assert.match(source, /if \(this\.actionMode === 'swap'\) \{\s*this\.pendingSwapIndex = null;\s*this\.actionMode = null;/);
  assert.match(source, /this\.actionMode = 'swap';\s*this\.pendingSwapIndex = null;/);
});
