import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('targeted cancel-enemy-order resolution funnels through completePlayerAction', () => {
  const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

  assert.match(
    source,
    /if \(result\.type === 'targeted-effect' && this\.gameState\.cancelEnemyOrderThisTurn\?\.enemy\) \{\s*this\.gameState\.cancelEnemyOrderThisTurn\.enemy = false;\s*\}[\s\S]*this\.completePlayerAction\(/,
  );

  assert.doesNotMatch(
    source,
    /if \(result\.type === 'targeted-effect' && this\.gameState\.cancelEnemyOrderThisTurn\?\.enemy\) \{\s*this\.gameState\.cancelEnemyOrderThisTurn\.enemy = false;\s*this\.refreshAfterPlayerAction\(\);\s*return;\s*\}/,
  );
});

test('non-targeted effect cast no longer short-circuits to refreshAfterPlayerAction', () => {
  const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

  assert.doesNotMatch(
    source,
    /if \(this\.gameState\.cancelEnemyOrderThisTurn\?\.enemy\) \{\s*this\.gameState\.cancelEnemyOrderThisTurn\.enemy = false;\s*this\.isEffectCastResolving = false;\s*this\.refreshAfterPlayerAction\(\);\s*return;\s*\}/,
  );

  assert.match(
    source,
    /if \(result\.type === 'effect' && this\.gameState\.cancelEnemyOrderThisTurn\?\.enemy\) \{\s*this\.gameState\.cancelEnemyOrderThisTurn\.enemy = false;\s*\}[\s\S]*this\.completePlayerAction\(/,
  );
});
