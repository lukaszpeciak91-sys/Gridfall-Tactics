import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TUTORIAL_STEPS } from '../src/data/tutorial/tutorialSteps.js';

const battleSource = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
const gameMenuSource = readFileSync(new URL('../src/scenes/GameMenuScene.js', import.meta.url), 'utf8');

const step = (id) => TUTORIAL_STEPS.find((item) => item.id === id);

test('tutorial focus targets are represented as practical BattleScene target objects', () => {
  assert.deepEqual(step('bases_goal').highlightTarget, { type: 'multi', targets: [{ type: 'enemy_base' }, { type: 'player_base' }] });
  assert.deepEqual(step('hand_lanes').highlightTarget, { type: 'player_board_lanes', slotIndexes: [6, 7, 8] });
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
  assert.match(battleSource, /const boundsKey = `\$\{key\}:\$\{this\.getTutorialFocusBoundsKey\(bounds\)\}`/);
});

test('tutorial focus clears previous graphics before drawing a new target and during cleanup', () => {
  assert.match(battleSource, /drawTutorialFocusBounds\(bounds, key\) \{[\s\S]*this\.clearTutorialFocusGraphics\(\);[\s\S]*this\.currentTutorialFocusKey = key;/);
  assert.match(battleSource, /destroyTutorialFocus\(\) \{[\s\S]*this\.clearTutorialFocusGraphics\(\);[\s\S]*this\.tutorialFocusLayer\?\.destroy\?\.\(\);/);
  assert.match(battleSource, /cleanupSceneObjects\([\s\S]*this\.destroyTutorialBanner\(\);[\s\S]*this\.destroyTutorialFocus\(\);/);
  assert.match(battleSource, /this\.destroyTutorialBanner\(\);\n\s*this\.destroyTutorialFocus\(\);\n\s*this\.resetCardHighlights/);
});

test('tutorial focus supports base, UI button, hand card, and board/lane targets', () => {
  assert.match(battleSource, /type === 'multi'[\s\S]*targets\.map\(\(item\) => this\.resolveTutorialFocusBounds\(item\)\)\.filter\(Boolean\)/);
  assert.match(battleSource, /drawTutorialFocusBounds\(bounds, key\)[\s\S]*const boundsList = Array\.isArray\(bounds\)[\s\S]*boundsList\.flatMap/);
  assert.match(battleSource, /getTutorialFocusBoundsKey\(bounds\)[\s\S]*join\('\|'/);
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
  assert.match(battleSource, /type === 'player_board_lanes'[\s\S]*\[6, 7, 8\][\s\S]*getBoardSlotFocusBounds\(slotIndex\)/);
  assert.match(battleSource, /type === 'adjacent_units'[\s\S]*this\.getMergedFocusBounds/);
});

test('first tutorial banner focuses both bases without becoming a battlefield or input gate', () => {
  const target = step('bases_goal').highlightTarget;
  assert.deepEqual(target, { type: 'multi', targets: [{ type: 'enemy_base' }, { type: 'player_base' }] });
  assert.notEqual(target.type, 'battle_lanes');
  assert.notEqual(target.type, 'board_lanes');
  assert.notEqual(target.type, 'player_hand_and_lanes');
  assert.equal(step('bases_goal').expected.type, 'tap_continue');
});


test('hand_lanes tutorial focus targets only the three player board lanes', () => {
  assert.deepEqual(step('hand_lanes').highlightTarget, { type: 'player_board_lanes', slotIndexes: [6, 7, 8] });
  assert.notEqual(step('hand_lanes').highlightTarget?.type, 'player_hand_and_lanes');
  assert.notEqual(step('hand_lanes').highlightTarget?.type, 'battle_lanes');

  const playerLaneSource = battleSource.slice(
    battleSource.indexOf("if (type === 'player_board_lanes')"),
    battleSource.indexOf("if (type === 'empty_lane')"),
  );

  assert.match(playerLaneSource, /slotIndexes[\s\S]*\[6, 7, 8\]/);
  assert.match(playerLaneSource, /getBoardSlotFocusBounds\(slotIndex\)/);
  assert.doesNotMatch(playerLaneSource, /this\.boardCells|layout\.hand|player_hand_and_lanes|battle_lanes|type === 'board_lanes'/);
});

test('tutorial focus uses independent Phaser primitives and does not gate input', () => {
  const focusStart = battleSource.indexOf('ensureTutorialFocusLayer()');
  const focusSource = battleSource.slice(focusStart, battleSource.indexOf('updateTutorialFocus(', focusStart));

  assert.match(focusSource, /this\.add\.rectangle\(item\.x, item\.y, item\.width \+ 14, item\.height \+ 14, TUTORIAL_FOCUS_FILL, 0\.07\)/);
  assert.match(focusSource, /this\.tweens\?\.add\?\.\(\{ targets: graphics/);
  assert.doesNotMatch(focusSource, /onlyTutorial|blockWrong|tutorialInputGate|preventWrong|checkTutorialInputGate/);
});


test('tutorial focus waits for visible banner and suppresses resolving/uninteractable timing', () => {
  assert.match(battleSource, /isTutorialStepBannerVisible\(step = this\.getCurrentTutorialStep\(\)\) \{[\s\S]*this\.tutorialBanner\.text === this\.getTutorialStepText\(step\)/);
  assert.match(battleSource, /isTutorialFocusTimingSuppressed\(step = this\.getCurrentTutorialStep\(\)\) \{[\s\S]*!this\.isTutorialStepBannerVisible\(step\)[\s\S]*this\.isFlowResolving \|\| this\.isEffectCastResolving[\s\S]*wait_enemy_action[\s\S]*wait_combat/);
  assert.match(battleSource, /updateTutorialFocus\(step = this\.getCurrentTutorialStep\(\)\) \{[\s\S]*this\.isTutorialFocusTimingSuppressed\(step\)[\s\S]*this\.clearTutorialFocusGraphics\(\)/);
  assert.match(battleSource, /type === 'mulligan_card'[\s\S]*this\.openingMulliganPending[\s\S]*!\(this\.isOpeningMulliganInputLocked\?\.\(\) \?\? false\)[\s\S]*select_mulligan_card/);
  assert.match(battleSource, /calculateHandCardFocusBounds\(this\.cardViews \?\? \[\], cardId/);
});

test('tutorial focus gives two-step hand card then board slot guidance', () => {
  assert.match(battleSource, /expected\.type === 'play_card_to_slot' \|\| expected\.type === 'redeploy_unit'/);
  assert.match(battleSource, /this\.selectedCardId === expected\.cardId[\s\S]*\? \{ type: expected\.type === 'redeploy_unit' \? 'occupied_board_slot' : 'board_slot', slotIndex: expected\.slotIndex \}[\s\S]*: \{ type: 'hand_card', cardId: expected\.cardId \}/);
  assert.match(battleSource, /type === 'board_slot' \|\| type === 'occupied_board_slot'[\s\S]*const proposedType = existingUnit\?\.owner === 'player' \? 'redeploy_unit' : 'play_card_to_slot'[\s\S]*this\.isTutorialInputAllowed\?\.\(\{ type: proposedType, cardId: card\.id, slotIndex \}\)/);
  assert.match(battleSource, /this\.selectedCardId = cardId;[\s\S]*this\.startHandCardLongPress\(cardId\);\s*this\.updateTutorialFocus\?\.\(\);/);
});

test('tutorial focus gates effect card and mulligan confirm to playable states', () => {
  assert.match(battleSource, /type === 'effect_card'[\s\S]*canPlayEffectCard\(this\.gameState, 'player', card\)\.ok[\s\S]*play_effect/);
  assert.match(battleSource, /type === 'player_base_button' && expected\.type === 'confirm_mulligan'[\s\S]*confirm_mulligan/);
  assert.match(battleSource, /handleTutorialEvent\?\.\('mulligan_card_selected', \{ cardId \}\);[\s\S]*this\.updateTutorialFocus\?\.\(\);/);
});

test('inspect and mulligan selection keep the same guided card before focusing confirm', () => {
  assert.deepEqual(step('inspect_card').highlightTarget, { type: 'mulligan_card', cardId: 'tutorial_mulligan_bait_1' });
  assert.deepEqual(step('mulligan_select').highlightTarget, { type: 'mulligan_card', cardId: 'tutorial_mulligan_bait_1' });
  assert.deepEqual(step('mulligan_confirm').highlightTarget, { type: 'player_base_button' });
  assert.match(battleSource, /this\.handleTutorialEvent\?\.\('card_inspected', \{ cardId \}\);\n\s*this\.updateTutorialFocus\?\.\(\);/);
  assert.match(battleSource, /restoreInspectDimming\(\) \{\n\s*this\.resetCardHighlights\(\{ showPreview: false \}\);\n\s*this\.updateTutorialFocus\?\.\(\);/);
  assert.match(battleSource, /if \(this\.longPressTriggeredCardId === cardId\) \{[\s\S]*return;\n\s*\}/);
});

test('GameMenuScene Tutorial launches playable tutorial BattleScene', () => {
  assert.match(gameMenuSource, /this\.scene\.start\('BattleScene', \{[\s\S]*battleContext:[\s\S]*mode:\s*'tutorial'[\s\S]*tutorialId:\s*'tutorial_v1'[\s\S]*returnSceneKey:\s*'GameMenuScene'/);
  assert.doesNotMatch(gameMenuSource, /this\.scene\.start\('TutorialScene'/);
});

test('utility panel close refreshes tutorial banner and focus for the current step', () => {
  const deckCloseSource = battleSource.slice(
    battleSource.indexOf('  destroyDeckInfoPanel()'),
    battleSource.indexOf('  addDeckInfoGlassPanel('),
  );
  const menuCloseSource = battleSource.slice(
    battleSource.indexOf('  destroyUtilityMenuPanel()'),
    battleSource.indexOf('  guardPointerEvent('),
  );

  assert.match(deckCloseSource, /this\.handleTutorialEvent\?\.\('deck_closed'\);[\s\S]*this\.updatePlayerBaseActionState\(\);[\s\S]*this\.updateTutorialBanner\?\.\(\);/);
  assert.match(menuCloseSource, /this\.handleTutorialEvent\?\.\('battle_menu_closed'\);[\s\S]*this\.updatePlayerBaseActionState\(\);[\s\S]*this\.updateTutorialBanner\?\.\(\);/);
});
