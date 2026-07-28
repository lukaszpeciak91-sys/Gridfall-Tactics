import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

function extractMethodBody(name, nextName) {
  let start = source.indexOf(`\n  ${name}(`);
  if (start < 0) start = source.indexOf(`\n  async ${name}(`);
  let end = source.indexOf(`\n  ${nextName}(`, start + 1);
  if (end < 0) end = source.indexOf(`\n  async ${nextName}(`, start + 1);
  if (start < 0 || end < 0) throw new Error(`Failed to extract ${name}`);
  return source.slice(start, end);
}

function compileMethod(name, nextName, params = []) {
  const block = extractMethodBody(name, nextName);
  const bodyStart = block.indexOf(') {') + 3;
  const bodyEnd = block.lastIndexOf('}');
  const MethodConstructor = block.includes(`async ${name}(`)
    ? Object.getPrototypeOf(async function () {}).constructor
    : Function;
  return new MethodConstructor(...params, block.slice(bodyStart, bodyEnd));
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
    updatePlayerBaseActionState() {},
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

test('closing mulligan inspect preview preserves selected exchange cards and consumes the outside tap', () => {
  const clearOpeningMulliganPreviewFromOutsideTap = compileMethod('clearOpeningMulliganPreviewFromOutsideTap', 'isPointerInsidePlayerBaseAction', ['pointer', 'currentlyOver']);
  const scene = {
    previewedMulliganCardId: 'unit-a',
    selectedHandCardZoom: { root: {} },
    selectedMulliganCardIds: ['unit-a'],
    hoverInspectCardId: 'unit-a',
    boardInspectIndex: null,
    pressedHandCardId: 'unit-a',
    isPointerInsideMulliganHandOrPreview() { return false; },
    isPointerInsidePlayerBaseAction() { return false; },
    updatePlayerBaseActionStateCalled: false,
    updatePlayerBaseActionState() { this.updatePlayerBaseActionStateCalled = true; },
    resetCardHighlightsCalledWith: null,
    resetCardHighlights(options) { this.resetCardHighlightsCalledWith = options; },
  };

  clearOpeningMulliganPreviewFromOutsideTap.call(scene, {}, []);

  assert.deepEqual(scene.selectedMulliganCardIds, ['unit-a']);
  assert.equal(scene.previewedMulliganCardId, null);
  assert.equal(scene.pressedHandCardId, null);
  assert.equal(scene.updatePlayerBaseActionStateCalled, true);
  assert.deepEqual(scene.resetCardHighlightsCalledWith, { showPreview: false });
});

test('tutorial mulligan confirmation preserves selection through outside-tap spam and remains immediately confirmable', async () => {
  const clearOutsideTap = compileMethod('clearOpeningMulliganPreviewFromOutsideTap', 'isPointerInsidePlayerBaseAction', ['pointer', 'currentlyOver']);
  const getActionLabel = compileMethod('getOpeningMulliganActionLabel', 'getPlayerBaseMode', ['translateActive']);
  const confirmMulligan = compileMethod('confirmOpeningMulligan', 'resetOpeningMulliganInputState', [
    'isTutorialBattleContext',
    'performTutorialOpeningMulligan',
    'getTutorialBattleData',
    'performOpeningMulligan',
    'AUDIO_KEYS',
  ]);
  const selectedId = 'unit-a';
  const scene = {
    battleContext: { mode: 'tutorial' },
    openingMulliganPending: true,
    openingMulliganActive: true,
    selectedMulliganCardIds: [selectedId],
    previewedMulliganCardId: null,
    selectedHandCardZoom: null,
    hoverInspectCardId: null,
    boardInspectIndex: null,
    pressedHandCardId: null,
    tutorialStep: { id: 'mulligan_confirm' },
    tutorialFocusedTarget: { type: 'player_base_button' },
    gameState: { player: { hand: [{ id: selectedId }] } },
    isTutorialBattle() { return true; },
    getCurrentTutorialStep() { return this.tutorialStep; },
    isPointerInsideMulliganHandOrPreview() { return false; },
    isPointerInsidePlayerBaseAction() { return false; },
    updatePlayerBaseActionState() {},
    resetCardHighlights() {},
    cancelPassHoldToSurrender() {},
    isFlowResolving: false,
    isTutorialInputAllowed() { return true; },
    playBattleSfx() {},
    handleTutorialEvent(event, payload) { this.confirmEvent = { event, payload }; },
    resetOpeningMulliganInputState() { this.selectedMulliganCardIds = []; },
    cleanupOpeningMulliganRevealControllers() {},
    redrawHand() {},
    refreshDeckCounter() {},
    async showOpeningTurnStartBanner() {},
    startCampaignBattleTimer() {},
    startTurn() { this.started = true; },
  };

  for (const target of ['board background', 'empty slot', 'blank hand space']) {
    clearOutsideTap.call(scene, { target }, []);
    assert.deepEqual(scene.selectedMulliganCardIds, [selectedId], target);
    assert.equal(scene.tutorialStep.id, 'mulligan_confirm', target);
    assert.deepEqual(scene.tutorialFocusedTarget, { type: 'player_base_button' }, target);
    assert.equal(getActionLabel.call(scene, (_key, fallback, values) => fallback.replace('{count}', values?.count)), 'MULLIGAN 1', target);
  }
  for (let tap = 0; tap < 5; tap += 1) clearOutsideTap.call(scene, {}, []);
  assert.deepEqual(scene.selectedMulliganCardIds, [selectedId]);

  await confirmMulligan.call(
    scene,
    () => true,
    (_state, selectedIds) => ({ ok: selectedIds[0] === selectedId }),
    () => ({ openingConfig: {} }),
    () => { throw new Error('tutorial confirmation must use the tutorial mulligan'); },
    { UI_CLICK: 'ui-click' },
  );
  assert.deepEqual(scene.confirmEvent, { event: 'mulligan_confirmed', payload: { selectedIds: [selectedId] } });
  assert.equal(scene.started, true);
});

test('tutorial confirmation inspect dismissal closes preview while retaining selection and visual source state', () => {
  const clearOutsideTap = compileMethod('clearOpeningMulliganPreviewFromOutsideTap', 'isPointerInsidePlayerBaseAction', ['pointer', 'currentlyOver']);
  const scene = {
    openingMulliganPending: true,
    selectedMulliganCardIds: ['unit-a'],
    previewedMulliganCardId: 'unit-a',
    selectedHandCardZoom: { root: {} },
    hoverInspectCardId: 'unit-a',
    boardInspectIndex: null,
    pressedHandCardId: 'unit-a',
    isTutorialBattle() { return true; },
    getCurrentTutorialStep() { return { id: 'mulligan_confirm' }; },
    isPointerInsideMulliganHandOrPreview() { return false; },
    isPointerInsidePlayerBaseAction() { return false; },
    updatePlayerBaseActionState() {},
    resetCardHighlights(options) { this.highlightOptions = options; },
  };
  clearOutsideTap.call(scene, {}, []);
  assert.equal(scene.previewedMulliganCardId, null);
  assert.deepEqual(scene.selectedMulliganCardIds, ['unit-a']);
  assert.equal(scene.selectedMulliganCardIds.includes('unit-a'), true);
  assert.deepEqual(scene.highlightOptions, { showPreview: false });
});

test('outside taps retain ordinary mulligan and tutorial selection-step deselection behavior', () => {
  const clearOutsideTap = compileMethod('clearOpeningMulliganPreviewFromOutsideTap', 'isPointerInsidePlayerBaseAction', ['pointer', 'currentlyOver']);
  const makeScene = ({ tutorial, stepId }) => ({
    openingMulliganPending: true,
    selectedMulliganCardIds: ['unit-a'],
    previewedMulliganCardId: null,
    selectedHandCardZoom: null,
    isTutorialBattle() { return tutorial; },
    getCurrentTutorialStep() { return { id: stepId }; },
    isPointerInsideMulliganHandOrPreview() { return false; },
    isPointerInsidePlayerBaseAction() { return false; },
    updatePlayerBaseActionState() {},
    resetCardHighlights() {},
  });
  for (const config of [{ tutorial: false, stepId: null }, { tutorial: true, stepId: 'mulligan_select' }]) {
    const scene = makeScene(config);
    clearOutsideTap.call(scene, {}, []);
    assert.deepEqual(scene.selectedMulliganCardIds, []);
  }
});
