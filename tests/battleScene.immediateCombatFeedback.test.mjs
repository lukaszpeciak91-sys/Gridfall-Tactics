import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

test('BattleScene routes targeted immediate combat events through normal combat animation before refresh', () => {
  assert.match(source, /this\.getImmediateCombatFeedback\(result\)/);
  assert.match(source, /await this\.playImmediateCombatFeedback\(immediateCombatFeedback\);\n\s*this\.refreshAfterPlayerAction\(\);/);
  assert.match(source, /await this\.playImmediateCombatFeedback\(immediateCombatFeedback\);\n\s*this\.refreshBoardLabels\(\);/);
  assert.match(source, /this\.refreshBoardLabelsFromSnapshot\(combatSnapshot\.board\);\n\s*await this\.playCombatAnimations\(combatEvents, combatSnapshot\.board\);/);
});
