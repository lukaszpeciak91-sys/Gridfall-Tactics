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
  assert.equal(step('inspect_card').highlightTarget.cardId, step('mulligan_select').highlightTarget.cardId);
  assert.deepEqual(step('play_unit_a').highlightTarget, { type: 'hand_card', cardId: 'tutorial_unit_a_1' });
  assert.equal(step('enemy_action').highlightTarget, null);
  assert.deepEqual(step('play_unit_b').highlightTarget, { type: 'hand_card', cardId: 'tutorial_unit_b_1' });
  assert.deepEqual(step('redeploy').highlightTarget, { type: 'hand_card', cardId: 'tutorial_unit_c_1' });
  assert.deepEqual(step('effect_card').highlightTarget, { type: 'effect_card', cardId: 'tutorial_all_attack_1' });
  assert.deepEqual(step('empty_lane').highlightTarget, { type: 'board_slot', slotIndex: 1 });
  assert.deepEqual(step('adjacent_swap').highlightTarget, { type: 'adjacent_units', fromIndex: 6, toIndex: 7 });
  assert.deepEqual(step('final_pass').highlightTarget, { type: 'player_base_button' });
});

test('BattleScene creates and updates tutorial focus only for tutorial battles', () => {
  assert.match(battleSource, /ensureTutorialFocusLayer\(\) \{[\s\S]*if \(!this\.isTutorialBattle\(\) \|\| !this\.add\) return null;/);
  assert.match(battleSource, /updateTutorialFocus\(step = this\.getCurrentTutorialStep\(\), \{ forceRedraw = false \} = \{\}\) \{[\s\S]*if \(!this\.isTutorialBattle\(\) \|\| !this\.layout \|\| this\.battleResultModalShown \|\| this\.battleResultModalPending\) \{/);
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
  assert.match(layoutSource, /export function isLiveCardView/);
  assert.match(layoutSource, /if \(!isLiveDisplayObject\(boundsObject\)\) return false;/);
  assert.match(layoutSource, /if \(cardView\.root && !isLiveDisplayObject\(cardView\.root\)\) return false;/);
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

test('empty-lane tutorial banner focuses the middle enemy-row board cell', () => {
  const target = step('empty_lane').highlightTarget;
  assert.deepEqual(target, { type: 'board_slot', slotIndex: 1 });
  assert.notDeepEqual(target, { type: 'empty_lane', slotIndex: 8 });
  assert.equal(target.slotIndex, 1, 'slot 1 is the top-row middle enemy slot');
  assert.notEqual(target.slotIndex, 8, 'slot 8 is the bottom-right player slot');

  const boardSlotSource = battleSource.slice(
    battleSource.indexOf("if (type === 'board_slot'"),
    battleSource.indexOf("if (type === 'adjacent_units'"),
  );
  assert.match(boardSlotSource, /getBoardSlotFocusBounds\(target\.slotIndex \?\? target\.index \?\? 0\)/);
  assert.match(battleSource, /getBoardSlotFocusBounds\(slotIndex\) \{[\s\S]*this\.boardCells \?\? \[\][\s\S]*candidate\?\.index === slotIndex[\s\S]*cell\?\.background/);
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
  assert.match(battleSource, /updateTutorialFocus\(step = this\.getCurrentTutorialStep\(\), \{ forceRedraw = false \} = \{\}\) \{[\s\S]*this\.isTutorialFocusTimingSuppressed\(step\)[\s\S]*this\.clearTutorialFocusGraphics\(\)/);
  assert.match(battleSource, /type === 'mulligan_card'[\s\S]*const inputType = expected\.type === 'inspect_card' \? 'inspect_card' : 'select_mulligan_card'[\s\S]*this\.openingMulliganPending[\s\S]*!\(this\.isOpeningMulliganInputLocked\?\.\(\) \?\? false\)[\s\S]*type: inputType, cardId/);
  assert.match(battleSource, /calculateHandCardFocusBounds\(this\.cardViews \?\? \[\], cardId/);
});

test('tutorial focus gives two-step hand card then board slot guidance', () => {
  assert.match(battleSource, /expected\.type === 'play_card_to_slot' \|\| expected\.type === 'redeploy_unit'/);
  assert.match(battleSource, /this\.selectedCardId === expected\.cardId[\s\S]*\? \{ type: expected\.type === 'redeploy_unit' \? 'occupied_board_slot' : 'board_slot', slotIndex: expected\.slotIndex \}[\s\S]*: \{ type: 'hand_card', cardId: expected\.cardId \}/);
  assert.match(battleSource, /type === 'board_slot' \|\| type === 'occupied_board_slot'[\s\S]*const proposedType = existingUnit\?\.owner === 'player' \? 'redeploy_unit' : 'play_card_to_slot'[\s\S]*this\.isTutorialInputAllowed\?\.\(\{ type: proposedType, cardId: card\.id, slotIndex \}\)/);
  assert.match(battleSource, /expected\.type === 'tap_continue' && type === 'board_slot'[\s\S]*return true;[\s\S]*if \(type === 'board_slot' \|\| type === 'occupied_board_slot'\)/);
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
  assert.equal(step('inspect_card').highlightTarget.cardId, step('mulligan_select').highlightTarget.cardId);
  assert.deepEqual(step('mulligan_confirm').highlightTarget, { type: 'player_base_button' });
  assert.match(battleSource, /this\.handleTutorialEvent\?\.\('card_inspected', \{ cardId \}\);\n\s*this\.updateTutorialFocus\?\.\(\);/);
  assert.match(battleSource, /restoreInspectDimming\(\) \{\n\s*this\.resetCardHighlights\(\{ showPreview: false \}\);\n\s*this\.updateTutorialFocus\?\.\(\);/);
  assert.match(battleSource, /if \(this\.longPressTriggeredCardId === cardId\) \{[\s\S]*return;\n\s*\}/);
});

test('GameMenuScene Tutorial launches playable tutorial BattleScene', () => {
  assert.match(gameMenuSource, /enterBattleScene\(this, \{[\s\S]*battleContext:[\s\S]*mode:\s*'tutorial'[\s\S]*tutorialId:\s*'tutorial_v1'[\s\S]*returnSceneKey:\s*'GameMenuScene'/);
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

function tutorialFocusMechanicallyPossible(target, step = this.getCurrentTutorialStep?.()) {
  if (!target || !step) return false;
  const expected = step.expected ?? {};
  const type = target.type;

  if (type === 'effect_card') {
    const card = this.gameState?.player?.hand?.find((item) => item.id === target.cardId);
    return Boolean(
      card
      && !this.openingMulliganPending
      && !this.playerActionUsed
      && card.playable
      && (this.isTutorialInputAllowed?.({ type: 'play_effect', cardId: card.id }) ?? true)
    );
  }

  if (expected.type === 'tap_continue' && type === 'board_slot') {
    return true;
  }

  if (type === 'board_slot' || type === 'occupied_board_slot') {
    const card = this.gameState?.player?.hand?.find((item) => item.id === this.selectedCardId);
    if (!card || this.playerActionUsed || this.openingMulliganPending) return false;
    const slotIndex = target.slotIndex ?? target.index;
    const existingUnit = this.gameState?.board?.[slotIndex];
    const proposedType = existingUnit?.owner === 'player' ? 'redeploy_unit' : 'play_card_to_slot';
    return this.isTutorialInputAllowed?.({ type: proposedType, cardId: card.id, slotIndex }) ?? true;
  }

  return true;
}

function updateTutorialFocusForTest(step = this.getCurrentTutorialStep(), { forceRedraw = false } = {}) {
  this.tutorialLifecycleDiagnostics.tutorialFocusUpdateCallCount += 1;
  this.logTutorialLifecycleDiagnostic('updateTutorialFocus called', { forceRedraw, stepId: step?.id ?? step?.key ?? null });
  if (!this.isTutorialBattle() || !this.layout || this.battleResultModalShown || this.battleResultModalPending) {
    this.tutorialLifecycleDiagnostics.lastTutorialFocusSkipReason = 'not_tutorial_or_missing_layout_or_result_modal';
    this.destroyTutorialFocus?.();
    return null;
  }
  if (this.isTutorialFocusTimingSuppressed(step)) {
    this.tutorialLifecycleDiagnostics.lastTutorialFocusSkipReason = 'timing_suppressed';
    this.clearTutorialFocusGraphics();
    return null;
  }
  const target = this.getTutorialFocusTarget(step);
  if (!target || !this.isTutorialFocusTargetMechanicallyPossible(target, step)) {
    this.tutorialLifecycleDiagnostics.lastTutorialFocusSkipReason = target ? 'target_not_mechanically_possible' : 'missing_target';
    this.clearTutorialFocusGraphics();
    return null;
  }
  const key = JSON.stringify(target);
  const bounds = this.resolveTutorialFocusBounds(target);
  if (!bounds) {
    this.tutorialLifecycleDiagnostics.lastTutorialFocusSkipReason = 'bounds_not_resolved';
    this.clearTutorialFocusGraphics();
    return null;
  }
  const boundsKey = `${key}:test-bounds`;
  if (!forceRedraw && this.currentTutorialFocusKey === boundsKey && this.tutorialFocusGraphics?.length > 0) return this.tutorialFocusGraphics[1] ?? this.tutorialFocusGraphics[0];
  return this.drawTutorialFocusBounds(bounds, boundsKey);
}

function createFocusScene(overrides = {}) {
  const scene = {};
  Object.assign(scene, {
    tutorialLifecycleDiagnostics: { tutorialFocusUpdateCallCount: 0, lastTutorialFocusSkipReason: null },
    logTutorialLifecycleDiagnostic() {},
    isTutorialBattle: () => true,
    layout: { width: 100, margin: 10 },
    battleResultModalShown: false,
    battleResultModalPending: false,
    isTutorialFocusTimingSuppressed: () => false,
    getTutorialFocusTarget: (step) => step.highlightTarget,
    currentTutorialFocusKey: null,
    tutorialFocusGraphics: [],
    clearTutorialFocusGraphics() { this.tutorialFocusGraphics = []; },
    drawTutorialFocusBounds(bounds, key) {
      this.drawnFocus = { bounds, key };
      this.tutorialFocusGraphics = [{}, { allowed: true }];
      return this.tutorialFocusGraphics[1];
    },
  }, overrides);
  scene.isTutorialFocusTargetMechanicallyPossible = tutorialFocusMechanicallyPossible;
  scene.updateTutorialFocus = updateTutorialFocusForTest;
  return scene;
}

test('tap_continue board_slot focus can render without mechanical playability', () => {
  const step = { id: 'empty_lane', expected: { type: 'tap_continue' }, highlightTarget: { type: 'board_slot', slotIndex: 1 } };
  const scene = createFocusScene({
    selectedCardId: null,
    playerActionUsed: false,
    openingMulliganPending: false,
    gameState: { player: { hand: [] }, board: [] },
    resolveTutorialFocusBounds: (target) => (target.type === 'board_slot' && target.slotIndex === 1 ? { x: 50, y: 20, width: 30, height: 30 } : null),
  });

  assert.equal(scene.isTutorialFocusTargetMechanicallyPossible(step.highlightTarget, step), true);
  const focus = scene.updateTutorialFocus(step, { forceRedraw: true });

  assert.deepEqual(focus, { allowed: true });
  assert.deepEqual(scene.drawnFocus.bounds, { x: 50, y: 20, width: 30, height: 30 });
  assert.equal(scene.tutorialLifecycleDiagnostics.lastTutorialFocusSkipReason, null);
});

test('real action board-slot focus remains mechanically gated', () => {
  const actionSteps = [
    { id: 'play_unit_a', expected: { type: 'play_card_to_slot', cardId: 'unit_a', slotIndex: 6 }, highlightTarget: { type: 'board_slot', slotIndex: 6 } },
    { id: 'redeploy', expected: { type: 'redeploy_unit', cardId: 'unit_c', slotIndex: 7 }, highlightTarget: { type: 'occupied_board_slot', slotIndex: 7 } },
  ];

  for (const step of actionSteps) {
    const scene = createFocusScene({
      selectedCardId: null,
      playerActionUsed: false,
      openingMulliganPending: false,
      gameState: { player: { hand: [] }, board: [] },
      resolveTutorialFocusBounds: () => ({ x: 50, y: 20, width: 30, height: 30 }),
    });

    assert.equal(scene.isTutorialFocusTargetMechanicallyPossible(step.highlightTarget, step), false);
    assert.equal(scene.updateTutorialFocus(step, { forceRedraw: true }), null);
    assert.equal(scene.tutorialLifecycleDiagnostics.lastTutorialFocusSkipReason, 'target_not_mechanically_possible');
  }
});

test('play_effect focus remains mechanically gated when effect is not playable', () => {
  const step = { id: 'effect_card', expected: { type: 'play_effect', cardId: 'missing_effect' }, highlightTarget: { type: 'effect_card', cardId: 'missing_effect' } };
  const scene = createFocusScene({
    selectedCardId: null,
    playerActionUsed: false,
    openingMulliganPending: false,
    gameState: { player: { hand: [] }, board: [] },
    resolveTutorialFocusBounds: () => ({ x: 50, y: 20, width: 30, height: 30 }),
  });

  assert.equal(scene.isTutorialFocusTargetMechanicallyPossible(step.highlightTarget, step), false);
  assert.equal(scene.updateTutorialFocus(step, { forceRedraw: true }), null);
  assert.equal(scene.tutorialLifecycleDiagnostics.lastTutorialFocusSkipReason, 'target_not_mechanically_possible');
});

test('empty_lane tap-continue still advances to final_pass in tutorial flow', () => {
  const emptyLaneIndex = TUTORIAL_STEPS.findIndex((item) => item.id === 'empty_lane');

  assert.equal(TUTORIAL_STEPS[emptyLaneIndex].expected.type, 'tap_continue');
  assert.equal(TUTORIAL_STEPS[emptyLaneIndex + 1].id, 'final_pass');
  assert.equal(TUTORIAL_STEPS[emptyLaneIndex + 1].expected.type, 'pass');
  assert.deepEqual(TUTORIAL_STEPS[emptyLaneIndex].highlightTarget, { type: 'board_slot', slotIndex: 1 });
});
