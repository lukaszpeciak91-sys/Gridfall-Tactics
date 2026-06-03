import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

test('controlled self-base attacks have priority over beam presentation routing', () => {
  assert.match(source, /if \(shouldUseControlledHeroStrikePresentation\(event\)\) \{\s*await this\.animateControlledHeroStrike\(event, preCombatBoardSnapshot\);\s*\} else if \(attackerWasDefeatedInThisLane\) \{[\s\S]*?\} else if \(getCombatAttackPresentation\(event, preCombatBoardSnapshot\) === COMBAT_ATTACK_PRESENTATIONS\.beam\)/);
});

test('controlled self-base attacks use a dedicated own-base strike cue with movement instead of a targeting beam', () => {
  assert.match(source, /async animateControlledHeroStrike\(event, preCombatBoardSnapshot = null\) \{[\s\S]*const strikePoint = this\.getControlledHeroStrikePoint\(attackerCell, hero, event\);[\s\S]*await this\.tweenToPromise\(\{ targets, y: strikeY, duration: 165, ease: 'Quad\.easeOut' \}\);[\s\S]*this\.restoreUnitVisualState\(visualState\);/);
  assert.match(source, /createControlledAttackCue\(attackerCell, hero, event\) \{[\s\S]*const vectorCue = this\.add\.graphics\(\)\.setDepth\(235\)\.setAlpha\(0\);[\s\S]*vectorCue\.lineTo\(cueEndX, cueEndY\);[\s\S]*event\.controlledAttackFeedback\.label \?\? 'CONTROLLED\\nOVERRIDE'/);
  assert.doesNotMatch(source, /createControlledAttackCue\(attackerCell, hero, event\) \{[\s\S]*targetFlash/);
});
