import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');

function extractMethodBody(name, nextName) {
  const start = source.indexOf(`\n  ${name}(`);
  const normalEnd = source.indexOf(`\n  ${nextName}(`, start + 1);
  const asyncEnd = source.indexOf(`\n  async ${nextName}(`, start + 1);
  const end = normalEnd >= 0 ? normalEnd : asyncEnd;
  if (start < 0 || end < 0) throw new Error(`Failed to extract ${name}`);
  return source.slice(start, end);
}

function compileMethod(name, nextName, params) {
  const block = extractMethodBody(name, nextName);
  const bodyStart = block.indexOf(') {') + 3;
  const bodyEnd = block.lastIndexOf('}');
  return new Function(...params, block.slice(bodyStart, bodyEnd));
}

const beginPlayerTargetingSession = compileMethod('beginPlayerTargetingSession', 'playEffectCastSweep', ['targetingState']);
const cancelEffectTargeting = compileMethod('cancelEffectTargeting', 'applyEnemyOpeningMulligan', []);
const onScenePointerUp = compileMethod('onScenePointerUp', 'clearSelectedHandInspectFromOutsideTap', ['pointer', 'currentlyOver']);
const onBoardCellTap = compileMethod('onBoardCellTap', 'getActivePlayerEffectCard', ['boardIndex', 'playOrRedeployUnit']);

test('targeted effect-card pointerdown begins a cloned targeting session with its first instruction immediately', () => {
  assert.match(source, /const targetingState = this\.isUnitCard\(card\) \? null : this\.getTargetingStateForCard\(card\);\s*if \(targetingState\) \{\s*this\.beginPlayerTargetingSession\(targetingState\);/);

  const targetingState = { cardId: 'order', targetType: 'enemy-unit', requiredTargets: 2, targetIndexes: [] };
  const calls = [];
  const scene = {
    targetingState: null,
    resetCardHighlights(options) { calls.push(['highlights', options]); },
    updateActionButtonLabel() { calls.push(['button']); },
    showTargetingInstruction() { calls.push(['instruction']); },
  };

  beginPlayerTargetingSession.call(scene, targetingState);

  assert.notEqual(scene.targetingState, targetingState);
  assert.notEqual(scene.targetingState.targetIndexes, targetingState.targetIndexes);
  assert.deepEqual(scene.targetingState, targetingState);
  assert.deepEqual(calls, [
    ['highlights', { showPreview: false }],
    ['button'],
    ['instruction'],
  ]);
});

test('effect-card cancel clears scene targeting without mutating the card hand', () => {
  const hand = [{ id: 'order' }];
  const scene = {
    gameState: { player: { hand } },
    targetingState: { cardId: 'order', targetIndexes: [] },
    effectCastState: null,
    pendingSwapIndex: null,
    hoverInspectCardId: null,
    boardInspectIndex: null,
    pressedHandCardId: null,
    pressedHandCardWasSelected: false,
    destroyTargetingInstruction() {},
    destroySelectedHandCardZoom() {},
    updateActionButtonLabel() {},
    resetCardHighlights() {},
  };

  cancelEffectTargeting.call(scene);

  assert.equal(scene.targetingState, null);
  assert.equal(scene.effectCastState, null);
  assert.deepEqual(scene.gameState.player.hand, [{ id: 'order' }]);
});

test('Controller play and redeploy use the explicit safe manual-targeting path without making Hacker generic', () => {
  assert.match(source, /if \(\(result\.type === 'play' \|\| result\.type === 'redeploy'\) && result\.card\?\.effectId === 'swap_two_enemy_units'\) \{\s*this\.startPlayerUnitOnPlayTargeting\(result\.card, boardIndex, beforeStats\);/);
  assert.doesNotMatch(source, /result\.card\?\.effectId === 'enemy_lane_atk_minus_1'[\s\S]*startPlayerUnitOnPlayTargeting/);
  assert.doesNotMatch(source, /getTargetingStateForEffect\(result\.card/);
});


test('Controller play and redeploy start manual targeting after placement while Hacker completes automatically', () => {
  const runUnitPlacement = (result) => {
    const calls = [];
    const scene = {
      openingMulliganPending: false,
      utilityMenuPanel: null,
      navigationInProgress: false,
      pointerInputGuardActive: false,
      battleResultModalShown: false,
      isFlowResolving: false,
      isEffectCastResolving: false,
      playerActionUsed: false,
      selectedCardId: result.card.id,
      targetingState: null,
      effectCastState: null,
      pendingSwapIndex: null,
      gameState: { player: { hand: [result.card] }, board: [] },
      getActivePlayerEffectCard: () => null,
      isUnitCard: () => true,
      captureBoardStats: () => ({ before: true }),
      clearHandCardSelection() { calls.push('clear-selection'); },
      buildActionFeedback: () => [],
      startPlayerUnitOnPlayTargeting(card, boardIndex, beforeStats) { calls.push(['targeting', card.id, boardIndex, beforeStats]); },
      completePlayerAction(beforeStats) { calls.push(['complete', beforeStats]); },
    };

    onBoardCellTap.call(scene, 7, () => result);
    return calls;
  };

  const controller = { id: 'control_controller_1', type: 'unit', effectId: 'swap_two_enemy_units' };
  const hacker = { id: 'control_hacker_1', type: 'unit', effectId: 'enemy_lane_atk_minus_1' };

  assert.deepEqual(runUnitPlacement({ ok: true, type: 'play', card: controller }), [
    ['targeting', 'control_controller_1', 7, { before: true }],
  ]);
  assert.deepEqual(runUnitPlacement({ ok: true, type: 'redeploy', card: controller }), [
    ['targeting', 'control_controller_1', 7, { before: true }],
  ]);
  assert.deepEqual(runUnitPlacement({ ok: true, type: 'play', card: hacker }), [
    ['complete', { before: true }],
  ]);
});

test('Controller empty-background cancel routes through the unit-on-play finalization path', () => {
  const calls = [];
  const scene = {
    effectCastState: { source: 'unit-on-play' },
    pendingSwapIndex: null,
    selectedCardId: null,
    targetingState: { cardId: 'control_controller_1', targetIndexes: [] },
    boardInspectIndex: null,
    boardLongPressSuppressNextScenePointerUpIndex: null,
    pressedHandCardId: null,
    pressedHandCardWasSelected: false,
    navigationInProgress: false,
    battleResultModalShown: false,
    isFlowResolving: false,
    isEffectCastResolving: false,
    openingMulliganPending: false,
    isPointerEventGuarded: () => false,
    isPointerUpReservedForUi: () => false,
    getBoardCellFromPointerUp: () => null,
    isPointerInsideHandArea: () => false,
    clearSelectedHandInspectFromOutsideTap: () => false,
    cancelEffectTargeting() { calls.push('cancel-targeting'); },
    clearHandCardSelection() { calls.push('clear-selection'); },
  };

  onScenePointerUp.call(scene, { x: 1, y: 1 }, []);

  assert.deepEqual(calls, ['cancel-targeting']);
});

test('Controller cancel preserves placement context and finalizes the already-spent unit action', () => {
  const boardUnit = { id: 'control_controller_1' };
  const scene = {
    gameState: { board: [boardUnit] },
    targetingState: { cardId: 'control_controller_1', targetIndexes: [] },
    effectCastState: { source: 'unit-on-play', beforeStats: { marker: true } },
    pendingSwapIndex: null,
    hoverInspectCardId: null,
    boardInspectIndex: null,
    pressedHandCardId: null,
    pressedHandCardWasSelected: false,
    playerActionUsed: false,
    isFlowResolving: false,
    destroyTargetingInstruction() {},
    destroySelectedHandCardZoom() {},
    updateActionButtonLabel() {},
    resetCardHighlights() {},
    completePlayerAction(beforeStats) { this.completedWith = beforeStats; this.playerActionUsed = true; },
  };

  cancelEffectTargeting.call(scene);

  assert.equal(scene.gameState.board[0], boardUnit);
  assert.deepEqual(scene.completedWith, { marker: true });
  assert.equal(scene.playerActionUsed, true);
});

test('Controller deck-panel click cancels and finalizes targeting before the panel can clear session state', () => {
  const openDeckInfoPanel = compileMethod('openDeckInfoPanel', 'bindDeckInfoScrollHandlers', []);
  const calls = [];
  const scene = {
    gameState: { player: {} },
    battleResultModalShown: false,
    isFlowResolving: false,
    effectCastState: { source: 'unit-on-play' },
    cancelEffectTargeting() { calls.push('cancel-targeting'); },
    destroyDeckInfoPanel() { calls.push('destroy-panel'); },
  };

  openDeckInfoPanel.call(scene);

  assert.deepEqual(calls, ['cancel-targeting']);
});

test('Controller utility navigation click cancels and finalizes targeting before navigation clears session state', () => {
  const prepareUtilityMenuNavigation = compileMethod('prepareUtilityMenuNavigation', 'getBattleResultText', []);
  const calls = [];
  const scene = {
    navigationInProgress: false,
    effectCastState: { source: 'unit-on-play' },
    cancelEffectTargeting() { calls.push('cancel-targeting'); },
    guardPointerEvent() { calls.push('guard-pointer'); },
  };

  const navigated = prepareUtilityMenuNavigation.call(scene);

  assert.equal(navigated, false);
  assert.equal(scene.navigationInProgress, false);
  assert.deepEqual(calls, ['cancel-targeting']);
});

test('selected targeted card pointerdown keeps its session available for long-press inspect', () => {
  const onCardPointerDown = compileMethod('onCardPointerDown', 'startHandCardLongPress', ['cardId']);
  const targetingState = { cardId: 'control_swap_1', targetType: 'any-unit', requiredTargets: 2, targetIndexes: [0] };
  const calls = [];
  const scene = {
    utilityMenuPanel: null,
    navigationInProgress: false,
    pointerInputGuardActive: false,
    battleResultModalShown: false,
    isFlowResolving: false,
    openingMulliganPending: false,
    playerActionUsed: false,
    isEffectCastResolving: false,
    selectedCardId: 'control_swap_1',
    targetingState,
    effectCastState: null,
    cancelHandCardLongPress() { calls.push('cancel-long-press'); },
    startHandCardLongPress(cardId) { calls.push(['start-long-press', cardId]); },
    cancelEffectTargeting() { calls.push('cancel-targeting'); },
  };

  onCardPointerDown.call(scene, 'control_swap_1');

  assert.equal(scene.targetingState, targetingState);
  assert.deepEqual(scene.targetingState.targetIndexes, [0]);
  assert.deepEqual(calls, ['cancel-long-press', ['start-long-press', 'control_swap_1']]);
});

test('long-press inspect keeps selected targeted card session and hand card intact', () => {
  const startHandCardLongPress = compileMethod('startHandCardLongPress', 'cancelHandCardLongPress', ['cardId', 'CARD_INSPECT_LONG_PRESS_MS']);
  const card = { id: 'control_swap_1', type: 'order', effectId: 'swap_any_two_units' };
  const targetingState = { cardId: card.id, targetType: 'any-unit', requiredTargets: 2, targetIndexes: [0] };
  const calls = [];
  const scene = {
    pressedHandCardId: card.id,
    utilityMenuPanel: null,
    navigationInProgress: false,
    pointerInputGuardActive: false,
    battleResultModalShown: false,
    isFlowResolving: false,
    playerActionUsed: false,
    openingMulliganPending: false,
    selectedCardId: card.id,
    targetingState,
    effectCastState: null,
    boardInspectIndex: null,
    hoverInspectCardId: null,
    gameState: { player: { hand: [card] } },
    cancelHandCardLongPress() {},
    time: { delayedCall(_delay, callback) { callback(); return { remove() {} }; } },
    destroyTargetingInstruction() { calls.push('destroy-instruction'); },
    resetCardHighlights(options) { calls.push(['highlights', options]); },
    updateActionButtonLabel() { calls.push('button'); },
  };

  startHandCardLongPress.call(scene, card.id, 350);

  assert.equal(scene.selectedCardId, card.id);
  assert.equal(scene.targetingState, targetingState);
  assert.deepEqual(scene.targetingState.targetIndexes, [0]);
  assert.deepEqual(scene.gameState.player.hand, [card]);
  assert.equal(scene.hoverInspectCardId, card.id);
  assert.deepEqual(calls, [['highlights', { showPreview: true }], 'button']);
});

test('Signal Shift first target refreshes instruction without Inspect and second target resolves', () => {
  const onBoardCellTapWithResolvers = compileMethod('onBoardCellTap', 'getActivePlayerEffectCard', [
    'boardIndex',
    'playOrRedeployUnit',
    'resolveTargetedUnitOnPlayEffect',
    'resolveTargetedEffectCard',
  ]);
  const signalShift = { id: 'control_swap_1', type: 'order', effectId: 'swap_any_two_units' };
  const calls = [];
  const scene = {
    openingMulliganPending: false,
    utilityMenuPanel: null,
    navigationInProgress: false,
    pointerInputGuardActive: false,
    battleResultModalShown: false,
    isFlowResolving: false,
    isEffectCastResolving: false,
    playerActionUsed: false,
    selectedCardId: signalShift.id,
    targetingState: { cardId: signalShift.id, targetType: 'any-unit', requiredTargets: 2, targetIndexes: [] },
    effectCastState: null,
    pendingSwapIndex: null,
    gameState: { player: { hand: [signalShift] }, board: [{ owner: 'player' }, { owner: 'enemy' }] },
    getActivePlayerEffectCard: () => null,
    isValidTarget: () => true,
    resetCardHighlights(options) { calls.push(['highlights', options]); },
    updateActionButtonLabel() { calls.push(['button']); },
    showTargetingInstruction() { calls.push(['instruction', [...this.targetingState.targetIndexes]]); },
    captureBoardStats: () => ({ before: true }),
    buildMovementFeedbackForAction: () => [],
    buildActionFeedback: () => [],
    completePlayerAction(beforeStats) { calls.push(['complete', beforeStats]); },
  };
  const resolveTargetedEffectCard = (_state, _side, cardId, boardIndex, targetIndexes) => {
    calls.push(['resolve', cardId, boardIndex, [...targetIndexes]]);
    return { ok: true, type: 'targeted-effect' };
  };

  onBoardCellTapWithResolvers.call(scene, 0, () => { throw new Error('unit placement must not run'); }, () => {}, resolveTargetedEffectCard);

  assert.deepEqual(scene.targetingState.targetIndexes, [0]);
  assert.deepEqual(scene.gameState.player.hand, [signalShift]);
  assert.deepEqual(calls, [
    ['highlights', { showPreview: false }],
    ['button'],
    ['instruction', [0]],
  ]);

  onBoardCellTapWithResolvers.call(scene, 1, () => { throw new Error('unit placement must not run'); }, () => {}, resolveTargetedEffectCard);

  assert.deepEqual(calls.slice(3), [
    ['resolve', signalShift.id, 1, [0, 1]],
    ['complete', { before: true }],
  ]);
});

test('Jam Signal optional partial targeting refresh does not open Inspect', () => {
  const onBoardCellTapWithResolvers = compileMethod('onBoardCellTap', 'getActivePlayerEffectCard', ['boardIndex']);
  const jamSignal = { id: 'control_jam_signal_1', type: 'order', effectId: 'enemy_up_to_2_atk_minus_1' };
  const calls = [];
  const scene = {
    openingMulliganPending: false,
    utilityMenuPanel: null,
    navigationInProgress: false,
    pointerInputGuardActive: false,
    battleResultModalShown: false,
    isFlowResolving: false,
    isEffectCastResolving: false,
    playerActionUsed: false,
    selectedCardId: jamSignal.id,
    targetingState: { cardId: jamSignal.id, targetType: 'enemy-unit', minTargets: 1, requiredTargets: 2, targetIndexes: [] },
    effectCastState: null,
    pendingSwapIndex: null,
    gameState: { player: { hand: [jamSignal] }, board: [{ owner: 'enemy' }] },
    getActivePlayerEffectCard: () => null,
    isValidTarget: () => true,
    resetCardHighlights(options) { calls.push(['highlights', options]); },
    updateActionButtonLabel() { calls.push(['button']); },
    showTargetingInstruction() { calls.push(['instruction', [...this.targetingState.targetIndexes]]); },
  };

  onBoardCellTapWithResolvers.call(scene, 0);

  assert.deepEqual(scene.targetingState.targetIndexes, [0]);
  assert.deepEqual(scene.gameState.player.hand, [jamSignal]);
  assert.deepEqual(calls, [
    ['highlights', { showPreview: false }],
    ['button'],
    ['instruction', [0]],
  ]);
});
