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

function compileMethod(name, nextName, params) {
  const block = extractMethodBody(name, nextName);
  const bodyStart = block.indexOf(') {') + 3;
  const bodyEnd = block.lastIndexOf('}');
  const body = block.slice(bodyStart, bodyEnd);
  return new Function(...params, body);
}

test('pointerdown immediately primes implicit swap source when idle on own unit', () => {
  const trySelectImplicitSwapSourceOnPointerDown = compileMethod('trySelectImplicitSwapSourceOnPointerDown', 'onCardPointerDown', ['boardIndex']);

  const scene = {
    pendingSwapIndex: null,
    selectedCardId: null,
    targetingState: null,
    effectCastState: null,
    battleResultModalShown: false,
    isFlowResolving: false,
    isEffectCastResolving: false,
    playerActionUsed: false,
    hoverInspectCardId: 'hover',
    boardPointerDownSelectedSwapSource: false,
    gameState: { board: [null, null, null, null, null, null, { owner: 'player' }, null, null] },
    showSwapPromptCalledWith: null,
    showSwapPrompt(step) { this.showSwapPromptCalledWith = step; },
    clearBoardInspectCalled: false,
    clearBoardInspect() { this.clearBoardInspectCalled = true; },
    resetCardHighlightsCalled: false,
    resetCardHighlights() { this.resetCardHighlightsCalled = true; },
  };

  const selected = trySelectImplicitSwapSourceOnPointerDown.call(scene, 6);

  assert.equal(selected, true);
  assert.equal(scene.pendingSwapIndex, 6);
  assert.equal(scene.showSwapPromptCalledWith, 'selectAdjacent');
  assert.equal(scene.clearBoardInspectCalled, true);
  assert.equal(scene.resetCardHighlightsCalled, true);
  assert.equal(scene.boardPointerDownSelectedSwapSource, true);
});

test('pointerup does not cancel source selected on pointerdown', () => {
  const onBoardCellPointerUp = compileMethod('onBoardCellPointerUp', 'onBoardCellPointerOut', ['boardIndex', 'pointer']);

  const tapped = [];
  const scene = {
    pendingSwapIndex: 6,
    pressedBoardCellIndex: 6,
    boardLongPressTriggeredIndex: null,
    boardPointerDownSelectedSwapSource: true,
    cancelBoardCellLongPress: () => {},
    onBoardCellTap(index) { tapped.push(index); },
  };

  onBoardCellPointerUp.call(scene, 6);

  assert.deepEqual(tapped, []);
  assert.equal(scene.pendingSwapIndex, 6);
  assert.equal(scene.boardPointerDownSelectedSwapSource, true);
});


test('scene pointerup consumes pointerdown-selected source without committing swap', () => {
  const onScenePointerUp = compileMethod('onScenePointerUp', 'clearSelectedHandInspectFromOutsideTap', ['pointer', 'currentlyOver']);

  const tapped = [];
  const scene = {
    pendingSwapIndex: 6,
    selectedCardId: null,
    targetingState: null,
    effectCastState: null,
    boardPointerDownSelectedSwapSource: true,
    navigationInProgress: false,
    battleResultModalShown: false,
    isFlowResolving: false,
    isEffectCastResolving: false,
    pressedHandCardId: null,
    pressedHandCardWasSelected: false,
    isPointerEventGuarded: () => false,
    isPointerUpReservedForUi: () => false,
    getBoardCellFromPointerUp: () => ({ index: 6 }),
    onBoardCellTap(index) { tapped.push(index); },
  };

  onScenePointerUp.call(scene, { id: 1 }, []);

  assert.deepEqual(tapped, []);
  assert.equal(scene.pendingSwapIndex, 6);
  assert.equal(scene.boardPointerDownSelectedSwapSource, false);
});

test('own unit short tap selects swap source without opening board inspect', () => {
  const trySelectImplicitSwapSourceOnPointerDown = compileMethod('trySelectImplicitSwapSourceOnPointerDown', 'onCardPointerDown', ['boardIndex']);
  const onBoardCellPointerUp = compileMethod('onBoardCellPointerUp', 'onBoardCellPointerOut', ['boardIndex', 'pointer']);

  const scene = {
    pendingSwapIndex: null,
    selectedCardId: null,
    targetingState: null,
    effectCastState: null,
    battleResultModalShown: false,
    isFlowResolving: false,
    isEffectCastResolving: false,
    playerActionUsed: false,
    hoverInspectCardId: null,
    boardInspectIndex: null,
    boardPointerDownSelectedSwapSource: false,
    pressedBoardCellIndex: 2,
    boardLongPressTriggeredIndex: null,
    gameState: { board: [null, null, { owner: 'player' }] },
    showSwapPromptCalledWith: null,
    showSwapPrompt(step) { this.showSwapPromptCalledWith = step; },
    clearBoardInspect() { this.boardInspectIndex = null; },
    resetCardHighlights() {},
    cancelBoardCellLongPress() {},
    onBoardCellTap() { throw new Error('short release should not re-process pointerdown-selected source'); },
  };

  assert.equal(trySelectImplicitSwapSourceOnPointerDown.call(scene, 2), true);
  onBoardCellPointerUp.call(scene, 2);

  assert.equal(scene.pendingSwapIndex, 2);
  assert.equal(scene.showSwapPromptCalledWith, 'selectAdjacent');
  assert.equal(scene.boardInspectIndex, null);
});

test('own unit long press preserves swap source, opens inspect, and release is not an extra tap', () => {
  const startBoardCellLongPress = compileMethod('startBoardCellLongPress', 'cancelBoardCellLongPress', ['boardIndex', 'BOARD_INSPECT_LONG_PRESS_MS']);
  const onBoardCellPointerUp = compileMethod('onBoardCellPointerUp', 'onBoardCellPointerOut', ['boardIndex', 'pointer']);
  const onScenePointerUp = compileMethod('onScenePointerUp', 'clearSelectedHandInspectFromOutsideTap', ['pointer', 'currentlyOver']);

  let timerCallback = null;
  const tapped = [];
  const scene = {
    pendingSwapIndex: 2,
    selectedCardId: null,
    targetingState: null,
    effectCastState: null,
    boardPointerDownSelectedSwapSource: true,
    pressedBoardCellIndex: 2,
    boardLongPressTriggeredIndex: null,
    boardLongPressSuppressNextScenePointerUpIndex: null,
    boardCellLongPressEvent: null,
    boardInspectIndex: null,
    utilityMenuPanel: null,
    navigationInProgress: false,
    pointerInputGuardActive: false,
    battleResultModalShown: false,
    isFlowResolving: false,
    isEffectCastResolving: false,
    playerActionUsed: false,
    pressedHandCardId: null,
    pressedHandCardWasSelected: false,
    time: { delayedCall(ms, callback) { assert.equal(ms, 350); timerCallback = callback; return { remove() {} }; } },
    cancelBoardCellLongPress() { this.boardCellLongPressEvent = null; },
    showBoardUnitInspect(index) { this.boardInspectIndex = index; return true; },
    isPointerEventGuarded: () => false,
    isPointerUpReservedForUi: () => false,
    getBoardCellFromPointerUp: () => ({ index: 2 }),
    onBoardCellTap(index) { tapped.push(index); },
  };

  startBoardCellLongPress.call(scene, 2, 350);
  timerCallback();
  onBoardCellPointerUp.call(scene, 2);
  onScenePointerUp.call(scene, { id: 1 }, []);

  assert.deepEqual(tapped, []);
  assert.equal(scene.pendingSwapIndex, 2);
  assert.equal(scene.boardInspectIndex, 2);
  assert.equal(scene.boardLongPressSuppressNextScenePointerUpIndex, null);
});

test('outside tap closes board inspect before preserving active swap source', () => {
  const onScenePointerUp = compileMethod('onScenePointerUp', 'clearSelectedHandInspectFromOutsideTap', ['pointer', 'currentlyOver']);

  const scene = {
    pendingSwapIndex: 2,
    selectedCardId: null,
    targetingState: null,
    effectCastState: null,
    boardPointerDownSelectedSwapSource: false,
    boardInspectIndex: 2,
    navigationInProgress: false,
    battleResultModalShown: false,
    isFlowResolving: false,
    isEffectCastResolving: false,
    pressedHandCardId: null,
    pressedHandCardWasSelected: false,
    selectedHandCardZoom: { background: {}, label: {}, glow: {} },
    isPointerEventGuarded: () => false,
    isPointerUpReservedForUi: () => false,
    getBoardCellFromPointerUp: () => null,
    clearBoardInspectFromOutsideTap() { this.boardInspectIndex = null; return true; },
    onBoardCellTap() { throw new Error('outside inspect-close tap should not process swap'); },
    clearHandCardSelection() { throw new Error('outside inspect-close tap should not clear selection'); },
  };

  onScenePointerUp.call(scene, { id: 1, x: 0, y: 0 }, []);

  assert.equal(scene.boardInspectIndex, null);
  assert.equal(scene.pendingSwapIndex, 2);
});

test('subsequent outside tap after inspect closes follows existing swap cancel rules', () => {
  const onBoardCellTap = compileMethod('onBoardCellTap', 'getActivePlayerEffectCard', ['boardIndex']);

  const scene = {
    utilityMenuPanel: null,
    navigationInProgress: false,
    pointerInputGuardActive: false,
    battleResultModalShown: false,
    isFlowResolving: false,
    isEffectCastResolving: false,
    playerActionUsed: false,
    selectedCardId: null,
    targetingState: null,
    effectCastState: null,
    pendingSwapIndex: 2,
    hoverInspectCardId: null,
    gameState: { board: [null, null, { owner: 'player' }, { owner: 'enemy' }], player: { hand: [] } },
    clearBoardInspect() {},
    clearSwapPromptCalled: false,
    clearSwapPrompt() { this.clearSwapPromptCalled = true; },
    resetCardHighlights() {},
    updatePlayerBaseActionState() {},
  };

  onBoardCellTap.call(scene, 3);

  assert.equal(scene.pendingSwapIndex, null);
  assert.equal(scene.clearSwapPromptCalled, true);
});

test('enemy unit long press opens inspect without starting swap selection', () => {
  const trySelectImplicitSwapSourceOnPointerDown = compileMethod('trySelectImplicitSwapSourceOnPointerDown', 'onCardPointerDown', ['boardIndex']);
  const startBoardCellLongPress = compileMethod('startBoardCellLongPress', 'cancelBoardCellLongPress', ['boardIndex', 'BOARD_INSPECT_LONG_PRESS_MS']);

  let timerCallback = null;
  const scene = {
    pendingSwapIndex: null,
    selectedCardId: null,
    targetingState: null,
    effectCastState: null,
    battleResultModalShown: false,
    isFlowResolving: false,
    isEffectCastResolving: false,
    playerActionUsed: false,
    hoverInspectCardId: null,
    boardPointerDownSelectedSwapSource: false,
    pressedBoardCellIndex: 3,
    boardLongPressTriggeredIndex: null,
    boardLongPressSuppressNextScenePointerUpIndex: null,
    boardCellLongPressEvent: null,
    boardInspectIndex: null,
    utilityMenuPanel: null,
    navigationInProgress: false,
    pointerInputGuardActive: false,
    pressedHandCardId: null,
    gameState: { board: [null, null, null, { owner: 'enemy' }] },
    showSwapPrompt() { throw new Error('enemy long press should not show swap prompt'); },
    clearBoardInspect() {},
    resetCardHighlights() {},
    cancelBoardCellLongPress() { this.boardCellLongPressEvent = null; },
    time: { delayedCall(ms, callback) { assert.equal(ms, 350); timerCallback = callback; return { remove() {} }; } },
    showBoardUnitInspect(index) { this.boardInspectIndex = index; return true; },
  };

  assert.equal(trySelectImplicitSwapSourceOnPointerDown.call(scene, 3), false);
  startBoardCellLongPress.call(scene, 3, 350);
  timerCallback();

  assert.equal(scene.pendingSwapIndex, null);
  assert.equal(scene.boardInspectIndex, 3);
});

test('hand-card long press preserves targeted session, suppresses release, and allows a later quick tap', () => {
  const startHandCardLongPress = compileMethod('startHandCardLongPress', 'cancelHandCardLongPress', ['cardId', 'CARD_INSPECT_LONG_PRESS_MS']);
  const onCardPointerUp = compileMethod('onCardPointerUp', 'onScenePointerUp', ['cardId', 'pointer']);
  const clearSelectedHandInspectFromOutsideTap = compileMethod('clearSelectedHandInspectFromOutsideTap', 'clearOpeningMulliganPreviewFromOutsideTap', ['pointer', 'currentlyOver']);
  const onCardPointerDown = compileMethod('onCardPointerDown', 'startHandCardLongPress', ['cardId']);
  const beginPlayerTargetingSession = compileMethod('beginPlayerTargetingSession', 'playEffectCastSweep', ['targetingState']);

  const signalShift = { id: 'control_swap_1', type: 'order', effectId: 'swap_any_two_units' };
  let timerCallback = null;
  const highlights = [];
  const scene = {
    utilityMenuPanel: null,
    navigationInProgress: false,
    pointerInputGuardActive: false,
    battleResultModalShown: false,
    isFlowResolving: false,
    playerActionUsed: false,
    openingMulliganPending: false,
    isEffectCastResolving: false,
    pressedHandCardId: signalShift.id,
    pressedHandCardWasSelected: false,
    longPressTriggeredCardId: null,
    handCardLongPressEvent: null,
    selectedCardId: signalShift.id,
    targetingState: { targetType: 'any-unit' },
    effectCastState: null,
    hoverInspectCardId: null,
    boardInspectIndex: null,
    pressedBoardCellIndex: null,
    boardLongPressTriggeredIndex: null,
    pendingSwapIndex: null,
    selectedHandCardZoom: {},
    gameState: { player: { hand: [signalShift] } },
    time: { delayedCall(ms, callback) { assert.equal(ms, 350); timerCallback = callback; return { remove() {} }; } },
    cancelHandCardLongPress() { this.handCardLongPressEvent = null; },
    destroyTargetingInstructionCalled: false,
    destroyTargetingInstruction() { this.destroyTargetingInstructionCalled = true; },
    resetCardHighlights(options) { highlights.push(options); },
    updatePlayerBaseActionState() {},
    isPointerInsideSelectedHandCardZoom: () => false,
    clearSwapPrompt() {},
    isUnitCard: () => false,
    getTargetingStateForCard: () => ({ targetType: 'any-unit' }),
    beginPlayerTargetingSession(targetingState) { beginPlayerTargetingSession.call(this, targetingState); },
    showTargetingInstruction() {},
    startHandCardLongPress(cardId) { this.quickTapLongPressStartedFor = cardId; },
  };

  startHandCardLongPress.call(scene, signalShift.id, 350);
  timerCallback();

  assert.equal(scene.selectedCardId, signalShift.id);
  assert.deepEqual(scene.targetingState, { targetType: 'any-unit' });
  assert.equal(scene.effectCastState, null);
  assert.equal(scene.hoverInspectCardId, signalShift.id);
  assert.equal(scene.destroyTargetingInstructionCalled, false);
  assert.deepEqual(highlights.at(-1), { showPreview: true });

  onCardPointerUp.call(scene, signalShift.id);
  assert.equal(scene.selectedCardId, signalShift.id);
  assert.deepEqual(scene.targetingState, { targetType: 'any-unit' });
  assert.equal(scene.longPressTriggeredCardId, null);

  assert.equal(clearSelectedHandInspectFromOutsideTap.call(scene, { id: 1 }, []), true);
  assert.equal(scene.hoverInspectCardId, null);
  assert.deepEqual(highlights.at(-1), { showPreview: false });

  onCardPointerDown.call(scene, signalShift.id);
  assert.equal(scene.selectedCardId, signalShift.id);
  assert.deepEqual(scene.targetingState, { targetType: 'any-unit' });
  assert.equal(scene.quickTapLongPressStartedFor, signalShift.id);
});

function createBoardInspectScene(overrides = {}) {
  const calls = [];
  return {
    pendingSwapIndex: null,
    selectedCardId: null,
    targetingState: null,
    effectCastState: null,
    boardPointerDownSelectedSwapSource: false,
    boardInspectIndex: 4,
    navigationInProgress: false,
    battleResultModalShown: false,
    isFlowResolving: false,
    isEffectCastResolving: false,
    openingMulliganPending: false,
    pressedHandCardId: null,
    pressedHandCardWasSelected: false,
    selectedHandCardZoom: { background: {}, label: {}, glow: {} },
    calls,
    isPointerEventGuarded: () => false,
    isPointerUpReservedForUi: () => false,
    getBoardCellFromPointerUp: () => null,
    isPointerInsideSelectedHandCardZoom: () => false,
    isPointerInsideHandArea: () => false,
    clearBoardInspectFromOutsideTap(pointer, currentlyOver = []) {
      if (this.boardInspectIndex === null) return false;
      if (this.isPointerInsideSelectedHandCardZoom(pointer, currentlyOver)) return false;
      this.clearBoardInspect({ animate: true });
      return true;
    },
    cancelBoardCellPressState() { calls.push('cancel-board-press'); },
    clearBoardInspect() { this.boardInspectIndex = null; calls.push('clear-board-inspect'); },
    onBoardCellTap(index) { calls.push(['board-tap', index]); },
    clearHandCardSelection() { calls.push('clear-hand-selection'); },
    cancelEffectTargeting() { calls.push('cancel-targeting'); },
    ...overrides,
  };
}

test('enemy board inspect closes on outside board tap without processing board action', () => {
  const onScenePointerUp = compileMethod('onScenePointerUp', 'clearSelectedHandInspectFromOutsideTap', ['pointer', 'currentlyOver']);
  const scene = createBoardInspectScene({
    gameState: { board: [null, { owner: 'enemy' }] },
    getBoardCellFromPointerUp: () => ({ index: 1 }),
  });

  onScenePointerUp.call(scene, { id: 1, x: 10, y: 10 }, []);

  assert.equal(scene.boardInspectIndex, null);
  assert.deepEqual(scene.calls, ['clear-board-inspect', 'cancel-board-press']);
});

test('enemy board inspect closes on empty board tap', () => {
  const onScenePointerUp = compileMethod('onScenePointerUp', 'clearSelectedHandInspectFromOutsideTap', ['pointer', 'currentlyOver']);
  const scene = createBoardInspectScene({ getBoardCellFromPointerUp: () => ({ index: 5 }) });

  onScenePointerUp.call(scene, { id: 1, x: 60, y: 60 }, []);

  assert.equal(scene.boardInspectIndex, null);
  assert.deepEqual(scene.calls, ['clear-board-inspect', 'cancel-board-press']);
});

test('enemy board inspect closes on hand tap without selecting or playing a card', () => {
  const onScenePointerUp = compileMethod('onScenePointerUp', 'clearSelectedHandInspectFromOutsideTap', ['pointer', 'currentlyOver']);
  const handBackground = {};
  const scene = createBoardInspectScene({
    cardViews: [{ background: handBackground }],
    isPointerUpReservedForUi: () => true,
    getBoardCellFromPointerUp: () => null,
  });

  onScenePointerUp.call(scene, { id: 1, x: 20, y: 300 }, [handBackground]);

  assert.equal(scene.boardInspectIndex, null);
  assert.deepEqual(scene.calls, ['clear-board-inspect', 'cancel-board-press']);
});

test('friendly board inspect closes on outside tap without swap selection', () => {
  const onScenePointerUp = compileMethod('onScenePointerUp', 'clearSelectedHandInspectFromOutsideTap', ['pointer', 'currentlyOver']);
  const scene = createBoardInspectScene({
    boardInspectIndex: 7,
    getBoardCellFromPointerUp: () => ({ index: 8 }),
  });

  onScenePointerUp.call(scene, { id: 1, x: 80, y: 80 }, []);

  assert.equal(scene.boardInspectIndex, null);
  assert.equal(scene.pendingSwapIndex, null);
  assert.deepEqual(scene.calls, ['clear-board-inspect', 'cancel-board-press']);
});

test('dismissing board inspect does not play a selected card', () => {
  const onScenePointerUp = compileMethod('onScenePointerUp', 'clearSelectedHandInspectFromOutsideTap', ['pointer', 'currentlyOver']);
  const scene = createBoardInspectScene({
    selectedCardId: 'unit_card',
    getBoardCellFromPointerUp: () => ({ index: 3 }),
    isBoardCellTapReservedForCardAction() { throw new Error('dismiss should not evaluate play action'); },
  });

  onScenePointerUp.call(scene, { id: 1, x: 30, y: 30 }, []);

  assert.equal(scene.boardInspectIndex, null);
  assert.equal(scene.selectedCardId, 'unit_card');
  assert.deepEqual(scene.calls, ['clear-board-inspect', 'cancel-board-press']);
});

test('dismissing board inspect does not trigger targeting', () => {
  const onScenePointerUp = compileMethod('onScenePointerUp', 'clearSelectedHandInspectFromOutsideTap', ['pointer', 'currentlyOver']);
  const scene = createBoardInspectScene({
    selectedCardId: 'target_card',
    targetingState: { targetType: 'enemy', targetIndexes: [] },
    getBoardCellFromPointerUp: () => ({ index: 1 }),
    isBoardCellTapReservedForCardAction() { throw new Error('dismiss should not evaluate targeting'); },
  });

  onScenePointerUp.call(scene, { id: 1, x: 30, y: 30 }, []);

  assert.equal(scene.boardInspectIndex, null);
  assert.deepEqual(scene.calls, ['clear-board-inspect', 'cancel-board-press']);
});

test('dismissing board inspect does not trigger swap', () => {
  const onScenePointerUp = compileMethod('onScenePointerUp', 'clearSelectedHandInspectFromOutsideTap', ['pointer', 'currentlyOver']);
  const scene = createBoardInspectScene({
    pendingSwapIndex: 2,
    getBoardCellFromPointerUp: () => ({ index: 3 }),
  });

  onScenePointerUp.call(scene, { id: 1, x: 30, y: 30 }, []);

  assert.equal(scene.boardInspectIndex, null);
  assert.equal(scene.pendingSwapIndex, 2);
  assert.deepEqual(scene.calls, ['clear-board-inspect', 'cancel-board-press']);
});

test('hand inspect outside tap behavior still clears hand preview state', () => {
  const clearSelectedHandInspectFromOutsideTap = compileMethod('clearSelectedHandInspectFromOutsideTap', 'clearOpeningMulliganPreviewFromOutsideTap', ['pointer', 'currentlyOver']);
  const scene = {
    selectedHandCardZoom: { background: {}, label: {}, glow: {} },
    boardInspectIndex: null,
    hoverInspectCardId: 'hand-card',
    isPointerInsideSelectedHandCardZoom: () => false,
    resetCalledWith: null,
    resetCardHighlights(options) { this.resetCalledWith = options; },
  };

  const cleared = clearSelectedHandInspectFromOutsideTap.call(scene, { id: 1, x: 0, y: 0 }, []);

  assert.equal(cleared, true);
  assert.equal(scene.hoverInspectCardId, null);
  assert.deepEqual(scene.resetCalledWith, { showPreview: false });
});
