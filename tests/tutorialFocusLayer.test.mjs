import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TUTORIAL_STEPS } from '../src/data/tutorial/tutorialSteps.js';

const battleSource = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
const gameMenuSource = readFileSync(new URL('../src/scenes/GameMenuScene.js', import.meta.url), 'utf8');

const step = (id) => TUTORIAL_STEPS.find((item) => item.id === id);

test('tutorial focus targets are represented as practical BattleScene target objects', () => {
  assert.deepEqual(step('bases_goal').highlightTarget, { type: 'enemy_base' });
  assert.deepEqual(step('deck_counter_open').highlightTarget, { type: 'deck_counter' });
  assert.deepEqual(step('battle_menu_open').highlightTarget, { type: 'battle_menu_button' });
  assert.deepEqual(step('mulligan_select').highlightTarget, { type: 'mulligan_card', cardId: 'tutorial_mulligan_bait_1' });
  assert.deepEqual(step('play_unit_a').highlightTarget, { type: 'hand_card', cardId: 'tutorial_unit_a_1' });
  assert.equal(step('enemy_action').highlightTarget, null);
  assert.deepEqual(step('play_unit_b').highlightTarget, { type: 'hand_card', cardId: 'tutorial_unit_b_1' });
  assert.deepEqual(step('redeploy').highlightTarget, { type: 'hand_card', cardId: 'tutorial_unit_c_1' });
  assert.deepEqual(step('effect_card').highlightTarget, { type: 'effect_card', cardId: 'tutorial_all_attack_1' });
  assert.deepEqual(step('empty_lane').highlightTarget, { type: 'empty_lane', slotIndex: 8 });
  assert.deepEqual(step('adjacent_swap').highlightTarget, { type: 'adjacent_units', fromIndex: 6, toIndex: 7 });
  assert.deepEqual(step('final_pass').highlightTarget, { type: 'player_base_button' });
});

test('BattleScene creates and updates tutorial focus only for tutorial battles', () => {
  assert.match(battleSource, /ensureTutorialFocusLayer\(\) \{[\s\S]*if \(!this\.isTutorialBattle\(\) \|\| !this\.add\) return null;/);
  assert.match(battleSource, /updateTutorialFocus\(step = this\.getCurrentTutorialStep\(\)\) \{[\s\S]*if \(!this\.isTutorialBattle\(\) \|\| !this\.layout \|\| this\.battleResultModalShown \|\| this\.battleResultModalPending\) \{/);
  assert.match(battleSource, /this\.tutorialFocusLayer = this\.add\.container\(0, 0\)\.setDepth\(TUTORIAL_FOCUS_DEPTH\)/);
  assert.match(battleSource, /this\.updateTutorialFocus\(step\);/);
  assert.match(battleSource, /completeOpeningMulliganReveal\([\s\S]*this\.updateTutorialFocus\?\.\(\);/);
  assert.match(battleSource, /const boundsKey = `\$\{key\}:\$\{Math\.round\(bounds\.x\)\}/);
});

test('tutorial focus clears previous graphics before drawing a new target and during cleanup', () => {
  assert.match(battleSource, /drawTutorialFocusBounds\(bounds, key\) \{[\s\S]*this\.clearTutorialFocusGraphics\(\);[\s\S]*this\.currentTutorialFocusKey = key;/);
  assert.match(battleSource, /destroyTutorialFocus\(\) \{[\s\S]*this\.clearTutorialFocusGraphics\(\);[\s\S]*this\.tutorialFocusLayer\?\.destroy\?\.\(\);/);
  assert.match(battleSource, /cleanupSceneObjects\([\s\S]*this\.destroyTutorialBanner\(\);[\s\S]*this\.destroyTutorialFocus\(\);/);
  assert.match(battleSource, /this\.destroyTutorialBanner\(\);\n\s*this\.destroyTutorialFocus\(\);\n\s*this\.resetCardHighlights/);
});

test('tutorial focus supports base, UI button, hand card, and board/lane targets', () => {
  assert.match(battleSource, /type === 'enemy_base'[\s\S]*this\.enemyHeroPanel/);
  assert.match(battleSource, /type === 'player_base'[\s\S]*this\.playerHeroPanel/);
  assert.match(battleSource, /type === 'deck_counter'[\s\S]*this\.deckCounterView\?\.focusBounds/);
  assert.match(battleSource, /type === 'battle_menu_button'[\s\S]*this\.battleMenuButtonFocusBounds/);
  assert.match(battleSource, /getHandCardFocusBounds\(cardId\)/);
  assert.match(battleSource, /calculateHandCardFocusBounds\(this\.cardViews \?\? \[\], cardId/);
  const layoutSource = readFileSync('src/ui/tutorialUxLayout.js', 'utf8');
  assert.match(layoutSource, /if \(!view\?\.background\) return null;/);
  assert.match(layoutSource, /view\.root && \(!view\.root\.active \|\| \(view\.root\.alpha \?\? 1\) <= 0/);
  assert.match(battleSource, /type === 'hand_card'[\s\S]*type === 'mulligan_card'[\s\S]*getTutorialBattleData\(\)\.openingConfig\.requiredPlayerMulliganCardId/);
  assert.match(battleSource, /if \(type === 'empty_lane'\) \{[\s\S]*target\.slotIndex < 6 \|\| target\.slotIndex > 8\) return null;[\s\S]*getBoardSlotFocusBounds\(target\.slotIndex\)/);
  assert.doesNotMatch(battleSource, /empty_lane'\) return this\.getBoardSlotFocusBounds\(target\.slotIndex \?\? target\.index \?\? target\.laneIndex/);
  assert.doesNotMatch(battleSource, /type === 'effect_card'[\s\S]*find\(\(card\) => card\?\.type !== 'unit'\)/);
  assert.match(battleSource, /getBoardSlotFocusBounds\(slotIndex\)/);
  assert.match(battleSource, /type === 'adjacent_units'[\s\S]*this\.getMergedFocusBounds/);
});

test('tutorial focus uses independent Phaser primitives and does not gate input', () => {
  const focusStart = battleSource.indexOf('ensureTutorialFocusLayer()');
  const focusSource = battleSource.slice(focusStart, battleSource.indexOf('updateTutorialFocus(', focusStart));

  assert.match(focusSource, /this\.add\.rectangle\(bounds\.x, bounds\.y, bounds\.width \+ 14, bounds\.height \+ 14, TUTORIAL_FOCUS_FILL, 0\.07\)/);
  assert.match(focusSource, /this\.tweens\?\.add\?\.\(\{ targets: \[glow, outline\]/);
  assert.doesNotMatch(focusSource, /onlyTutorial|blockWrong|tutorialInputGate|preventWrong|checkTutorialInputGate/);
});

test('GameMenuScene Tutorial launches playable tutorial BattleScene', () => {
  assert.match(gameMenuSource, /this\.scene\.start\('BattleScene', \{[\s\S]*battleContext:[\s\S]*mode:\s*'tutorial'[\s\S]*tutorialId:\s*'tutorial_v1'[\s\S]*returnSceneKey:\s*'GameMenuScene'/);
  assert.doesNotMatch(gameMenuSource, /this\.scene\.start\('TutorialScene'/);
});
