import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

test('controlled self-base attacks have priority over beam presentation routing', () => {
  assert.match(source, /if \(shouldUseControlledHeroStrikePresentation\(event\)\) \{\s*await this\.animateControlledHeroStrike\(event, preCombatBoardSnapshot\);\s*\} else if \(attackerWasDefeatedInThisLane\) \{[\s\S]*?\} else if \(getCombatAttackPresentation\(event, preCombatBoardSnapshot\) === COMBAT_ATTACK_PRESENTATIONS\.beam\)/);
});

test('controlled self-base attacks show override text and movement without any targeting line', () => {
  assert.match(source, /async animateControlledHeroStrike\(event, preCombatBoardSnapshot = null\) \{[\s\S]*const strikePoint = this\.getControlledHeroStrikePoint\(attackerCell, hero, event\);[\s\S]*await this\.tweenToPromise\(\{ targets, y: strikeY, duration: 165, ease: 'Quad\.easeOut' \}\);[\s\S]*this\.restoreUnitVisualState\(visualState\);/);
  assert.match(source, /createControlledAttackCue\(attackerCell, hero, event\) \{[\s\S]*event\.controlledAttackFeedback\.label \?\? 'CONTROLLED\\nOVERRIDE'[\s\S]*targets: label/);
  assert.doesNotMatch(source, /createControlledAttackCue\(attackerCell, hero, event\) \{[\s\S]*this\.add\.graphics/);
  assert.doesNotMatch(source, /createControlledAttackCue\(attackerCell, hero, event\) \{[\s\S]*\.lineTo\(/);
  assert.doesNotMatch(source, /createControlledAttackCue\(attackerCell, hero, event\) \{[\s\S]*targetFlash/);
});
