import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

function extractMethodBody(name, nextName) {
  const start = source.indexOf(`\n  ${name}(`);
  let end = source.indexOf(`\n  ${nextName}(`, start + 1);
  if (end < 0) end = source.indexOf(`\n  async ${nextName}(`, start + 1);
  if (start < 0 || end < 0) throw new Error(`Failed to extract ${name}`);
  return source.slice(start, end);
}

function compileMethod(name, nextName, params = []) {
  const block = extractMethodBody(name, nextName);
  const bodyStart = block.indexOf(') {') + 3;
  const bodyEnd = block.lastIndexOf('}');
  return new Function(...params, block.slice(bodyStart, bodyEnd));
}

test('mulligan hand taps still mark and unmark cards for exchange', () => {
  const toggleOpeningMulliganCard = compileMethod('toggleOpeningMulliganCard', 'confirmOpeningMulligan', ['cardId', '{ showPreview = true } = {}', 'MAX_OPENING_MULLIGAN_CARDS']);
  const onCardPointerUp = compileMethod('onCardPointerUp', 'onScenePointerUp', ['cardId', 'pointer']);
  const card = { id: 'unit-a' };
  const scene = {
    openingMulliganPending: true,
    utilityMenuPanel: null,
    navigationInProgress: false,
    pointerInputGuardActive: false,
    battleResultModalShown: false,
    isFlowResolving: false,
    selectedMulliganCardIds: [],
    previewedMulliganCardId: null,
    pressedHandCardId: card.id,
    pressedHandCardWasSelected: false,
    longPressTriggeredCardId: null,
    gameState: { player: { hand: [card] } },
    cancelHandCardLongPress() {},
    updateActionButtonLabel() {},
    resetCardHighlights() {},
    toggleOpeningMulliganCard(cardId, options) {
      return toggleOpeningMulliganCard.call(this, cardId, options, 2);
    },
  };

  onCardPointerUp.call(scene, card.id);
  assert.deepEqual(scene.selectedMulliganCardIds, [card.id]);

  scene.pressedHandCardId = card.id;
  onCardPointerUp.call(scene, card.id);
  assert.deepEqual(scene.selectedMulliganCardIds, []);
});

test('mulligan hand long press still opens inspect preview', () => {
  const startHandCardLongPress = compileMethod('startHandCardLongPress', 'cancelHandCardLongPress', ['cardId', 'CARD_INSPECT_LONG_PRESS_MS']);
  const card = { id: 'unit-a' };
  let timerCallback = null;
  const scene = {
    openingMulliganPending: true,
    pressedHandCardId: card.id,
    utilityMenuPanel: null,
    navigationInProgress: false,
    pointerInputGuardActive: false,
    battleResultModalShown: false,
    isFlowResolving: false,
    playerActionUsed: false,
    gameState: { player: { hand: [card] } },
    time: { delayedCall(_delay, callback) { timerCallback = callback; return {}; } },
    cancelHandCardLongPress() {},
    resetCardHighlightsCalledWith: null,
    resetCardHighlights(options) { this.resetCardHighlightsCalledWith = options; },
  };

  startHandCardLongPress.call(scene, card.id, 350);
  timerCallback();

  assert.equal(scene.previewedMulliganCardId, card.id);
  assert.equal(scene.longPressTriggeredCardId, card.id);
  assert.equal(scene.boardInspectIndex, null);
  assert.deepEqual(scene.resetCardHighlightsCalledWith, { showPreview: true });
});

test('mulligan board pointerdown and tap cannot select swaps, show banners, or start card actions', () => {
  const onBoardCellPointerDown = compileMethod('onBoardCellPointerDown', 'startBoardCellLongPress', ['boardIndex']);
  const trySelectImplicitSwapSourceOnPointerDown = compileMethod('trySelectImplicitSwapSourceOnPointerDown', 'onCardPointerDown', ['boardIndex']);
  const onBoardCellTap = compileMethod('onBoardCellTap', 'getActivePlayerEffectCard', ['boardIndex']);
  const card = { id: 'effect-a', type: 'order' };
  const scene = {
    openingMulliganPending: true,
    utilityMenuPanel: null,
    navigationInProgress: false,
    pointerInputGuardActive: false,
    pendingSwapIndex: null,
    boardInspectIndex: null,
    targetingState: null,
    effectCastState: null,
    activeSelectionBanner: null,
    selectedCardId: card.id,
    battleResultModalShown: false,
    isFlowResolving: false,
    isEffectCastResolving: false,
    playerActionUsed: false,
    gameState: { board: [{ owner: 'player' }], player: { hand: [card] } },
    showSwapPrompt() { throw new Error('mulligan board input must not show a swap prompt'); },
    startPlayerEffectCast() { throw new Error('mulligan board input must not begin an effect cast'); },
    cancelBoardCellLongPress() { throw new Error('mulligan pointerdown must return before board state cleanup'); },
  };

  onBoardCellPointerDown.call(scene, 0);
  assert.equal(trySelectImplicitSwapSourceOnPointerDown.call(scene, 0), false);
  onBoardCellTap.call(scene, 0);

  assert.equal(scene.pendingSwapIndex, null);
  assert.equal(scene.boardInspectIndex, null);
  assert.equal(scene.targetingState, null);
  assert.equal(scene.effectCastState, null);
  assert.equal(scene.activeSelectionBanner, null);
});

test('mulligan board pointerup and unit long press inspect return without mutating board interaction state', () => {
  const onBoardCellPointerUp = compileMethod('onBoardCellPointerUp', 'onBoardCellPointerOut', ['boardIndex', 'pointer']);
  const showBoardUnitInspect = compileMethod('showBoardUnitInspect', 'onBoardCellPointerDown', ['boardIndex']);
  const targetingState = { targetIndexes: [] };
  const effectCastState = { cardId: 'effect-a' };
  const banner = { owner: 'existing' };
  const scene = {
    openingMulliganPending: true,
    pendingSwapIndex: null,
    boardInspectIndex: null,
    targetingState,
    effectCastState,
    activeSelectionBanner: banner,
    pressedBoardCellIndex: 0,
    utilityMenuPanel: null,
    navigationInProgress: false,
    selectedCardId: null,
    isEffectCastResolving: false,
    pressedHandCardId: null,
    gameState: { board: [{ owner: 'player' }] },
    cancelBoardCellLongPress() { throw new Error('mulligan pointerup must return without board state mutation'); },
    showSelectedHandCardZoom() { throw new Error('mulligan board inspect must stay closed'); },
  };

  onBoardCellPointerUp.call(scene, 0);
  assert.equal(showBoardUnitInspect.call(scene, 0), false);

  assert.equal(scene.pendingSwapIndex, null);
  assert.equal(scene.boardInspectIndex, null);
  assert.equal(scene.targetingState, targetingState);
  assert.equal(scene.effectCastState, effectCastState);
  assert.equal(scene.activeSelectionBanner, banner);
});

test('board swap interaction resumes after mulligan completes', () => {
  const trySelectImplicitSwapSourceOnPointerDown = compileMethod('trySelectImplicitSwapSourceOnPointerDown', 'onCardPointerDown', ['boardIndex']);
  const scene = {
    openingMulliganPending: false,
    pendingSwapIndex: null,
    selectedCardId: null,
    targetingState: null,
    effectCastState: null,
    battleResultModalShown: false,
    isFlowResolving: false,
    isEffectCastResolving: false,
    playerActionUsed: false,
    boardPointerDownSelectedSwapSource: false,
    gameState: { board: [{ owner: 'player' }] },
    showSwapPromptCalledWith: null,
    showSwapPrompt(step) { this.showSwapPromptCalledWith = step; },
    clearBoardInspect() {},
    resetCardHighlights() {},
  };

  assert.equal(trySelectImplicitSwapSourceOnPointerDown.call(scene, 0), true);
  assert.equal(scene.pendingSwapIndex, 0);
  assert.equal(scene.showSwapPromptCalledWith, 'selectAdjacent');
  assert.equal(scene.boardPointerDownSelectedSwapSource, true);
});

test('confirming mulligan input reset clears hand inspect preview and pending press state', () => {
  const resetOpeningMulliganInputState = compileMethod('resetOpeningMulliganInputState', 'hasBasePassBlocker');
  const scene = {
    selectedMulliganCardIds: ['unit-a'],
    previewedMulliganCardId: 'unit-a',
    selectedCardId: 'stale-card',
    targetingState: { targetIndexes: [0] },
    effectCastState: { cardId: 'stale-card' },
    isEffectCastResolving: true,
    pendingSwapIndex: 0,
    hoverInspectCardId: 'unit-a',
    boardInspectIndex: 0,
    pressedHandCardId: 'unit-a',
    pressedHandCardWasSelected: true,
    longPressTriggeredCardId: 'unit-a',
    pressedBoardCellIndex: 0,
    boardLongPressTriggeredIndex: 0,
    boardLongPressSuppressNextScenePointerUpIndex: 0,
    boardPointerDownSelectedSwapSource: true,
    cancelHandCardLongPressCalled: false,
    cancelHandCardLongPress() { this.cancelHandCardLongPressCalled = true; },
    cancelBoardCellLongPressCalled: false,
    cancelBoardCellLongPress() { this.cancelBoardCellLongPressCalled = true; },
    destroyActiveSelectionMessage() {},
    destroySelectedHandCardZoomCalledWith: null,
    destroySelectedHandCardZoom(options) { this.destroySelectedHandCardZoomCalledWith = options; },
  };

  resetOpeningMulliganInputState.call(scene);

  assert.equal(scene.cancelHandCardLongPressCalled, true);
  assert.equal(scene.cancelBoardCellLongPressCalled, true);
  assert.deepEqual(scene.selectedMulliganCardIds, []);
  assert.equal(scene.previewedMulliganCardId, null);
  assert.equal(scene.pressedHandCardId, null);
  assert.equal(scene.longPressTriggeredCardId, null);
  assert.equal(scene.pendingSwapIndex, null);
  assert.equal(scene.boardInspectIndex, null);
  assert.deepEqual(scene.destroySelectedHandCardZoomCalledWith, { animate: true });
});
