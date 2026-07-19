import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

test('BattleScene routes targeted immediate combat events through normal combat animation before refresh', () => {
  assert.match(source, /this\.getImmediateCombatFeedback\(result\)/);
  assert.match(source, /await this\.playImmediateCombatFeedback\(immediateCombatFeedback\);\n\s*this\.refreshAfterPlayerAction\(\);/);
  assert.match(source, /await this\.playImmediateCombatFeedback\(immediateCombatFeedback\);\n\s*this\.refreshBoardLabels\(\);/);
  assert.match(source, /this\.refreshBoardLabelsFromSnapshot\(combatSnapshot\.board\);\n\s*await this\.playCombatAnimations\(combatEvents, combatSnapshot\.board\);/);
  assert.match(source, /statValues: unit\.__presentationStats \?\? null/);
});

test('BattleScene plays first-class death-trigger events inline and dedupes legacy reconstruction', () => {
  assert.match(source, /isDeathTriggerPresentationEvent\(event\)/);
  assert.match(source, /await this\.playDeathTriggerPresentationEvent\(event, preCombatBoardSnapshot\);\n\s*continue;/);
  assert.match(source, /death-trigger-hero-damage/);
  assert.match(source, /death-trigger-lane-damage/);
  assert.match(source, /death-trigger-both-hero-damage/);
  assert.match(source, /death-trigger-rotcaller-buff/);
  assert.match(source, /hasOrderedDeathTriggerEvents[\s\S]*beforeRefresh = hasOrderedDeathTriggerEvents \? \[\] : \[...recordedRotcallerFeedback\]/);
});
