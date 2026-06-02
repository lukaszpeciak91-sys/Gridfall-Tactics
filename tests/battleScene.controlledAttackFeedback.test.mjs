import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

test('controlled self-base attacks use a dedicated cue instead of the normal forward hero lunge', () => {
  assert.match(source, /if \(event\.controlledAttackFeedback\) \{[\s\S]*this\.animateControlledHeroStrike\(event, preCombatBoardSnapshot\)/);
  assert.match(source, /createControlledAttackCue\(attackerCell, hero, event\)[\s\S]*line\.lineTo\(hero\.x, heroEdgeY\)/);
  assert.match(source, /event\.controlledAttackFeedback\.label \?\? 'CONTROLLED\\nOVERRIDE'/);
});
