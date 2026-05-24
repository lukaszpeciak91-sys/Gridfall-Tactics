import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('enemyTakeAction surrender branch sets player winner and ai_safe_surrender ending reason', () => {
  const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
  assert.match(source, /if \(action\.type === 'surrender'\) \{\s*this\.gameState\.winner = 'player';\s*this\.gameState\.endingReason = 'ai_safe_surrender';/);
});
