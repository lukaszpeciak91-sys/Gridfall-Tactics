import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

function extractMethodBody(name, nextName) {
  const start = source.indexOf(`\n  ${name}(`);
  const end = source.indexOf(`\n  ${nextName}(`, start + 1);
  if (start < 0 || end < 0) throw new Error(`Failed to extract ${name}`);
  return source.slice(start, end);
}

function compileMethod(name, nextName, params, prelude = '') {
  const block = extractMethodBody(name, nextName);
  const bodyStart = block.indexOf(') {') + 3;
  const bodyEnd = block.lastIndexOf('}');
  const body = block.slice(bodyStart, bodyEnd);
  return new Function(...params, `${prelude}${body}`);
}

test('idle tap on own unit starts implicit swap selection', () => {
  const onBoardCellTap = compileMethod('onBoardCellTap', 'getActivePlayerEffectCard', ['boardIndex', 'performSwap']);

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
    pendingSwapIndex: null,
    hoverInspectCardId: null,
    gameState: { board: [null, null, null, null, null, null, { owner: 'player' }, { owner: 'player' }, null], player: { hand: [] } },
    clearBoardInspect: () => {},
    showSwapPromptCalledWith: null,
    showSwapPrompt(step) { this.showSwapPromptCalledWith = step; },
    resetCardHighlightsCalled: false,
    resetCardHighlights() { this.resetCardHighlightsCalled = true; },
    getActivePlayerEffectCard: () => null,
  };

  onBoardCellTap.call(scene, 6, () => ({ ok: true }));

  assert.equal(scene.pendingSwapIndex, 6);
  assert.equal(scene.showSwapPromptCalledWith, 'selectAdjacent');
  assert.equal(scene.resetCardHighlightsCalled, true);
});

test('hand unit redeploy onto occupied friendly slot does not enter implicit swap', () => {
  const onBoardCellTap = compileMethod('onBoardCellTap', 'getActivePlayerEffectCard', ['boardIndex', 'playOrRedeployUnit']);

  const handUnit = { id: 'hand-unit', type: 'unit' };
  const boardUnit = { id: 'board-unit', owner: 'player', cardId: 'board-unit' };
  let redeployCalled = false;
  const scene = {
    utilityMenuPanel: null,
    navigationInProgress: false,
    pointerInputGuardActive: false,
    battleResultModalShown: false,
    isFlowResolving: false,
    isEffectCastResolving: false,
    playerActionUsed: false,
    selectedCardId: handUnit.id,
    pressedHandCardId: null,
    pressedHandCardWasSelected: false,
    targetingState: null,
    effectCastState: null,
    pendingSwapIndex: null,
    hoverInspectCardId: null,
    boardInspectIndex: null,
    gameState: {
      board: [null, null, null, null, null, null, boardUnit, null, null],
      player: { hand: [handUnit] },
    },
    hasActiveHandCardInteraction() { return Boolean(this.selectedCardId || this.pressedHandCardId || this.pressedHandCardWasSelected); },
    getActivePlayerEffectCard: () => null,
    isUnitCard: (card) => card?.type === 'unit',
    captureBoardStats: () => [],
    buildActionFeedback: () => [],
    completePlayerAction() { this.completed = true; },
    startPlayerUnitOnPlayTargeting() { throw new Error('plain unit should not enter on-play targeting'); },
    startPlayerEffectCast() { throw new Error('unit card should not start effect cast'); },
    clearHandCardSelection() { throw new Error('valid redeploy should not clear hand selection'); },
    showInvalidActionFeedback() { throw new Error('valid redeploy should not show invalid feedback'); },
    getInvalidActionScope: () => 'global',
    showSwapPrompt() { throw new Error('redeploy must not show adjacent swap prompt'); },
  };

  onBoardCellTap.call(scene, 6, (_state, _owner, cardId, boardIndex) => {
    redeployCalled = true;
    assert.equal(cardId, handUnit.id);
    assert.equal(boardIndex, 6);
    return { ok: true, type: 'redeploy', card: handUnit };
  });

  assert.equal(redeployCalled, true);
  assert.equal(scene.completed, true);
  assert.equal(scene.pendingSwapIndex, null);
});

test('second hand unit redeploy attempt after prior success still does not enter implicit swap', () => {
  const onBoardCellTap = compileMethod('onBoardCellTap', 'getActivePlayerEffectCard', ['boardIndex', 'playOrRedeployUnit']);

  const makeScene = (cardId) => ({
    utilityMenuPanel: null,
    navigationInProgress: false,
    pointerInputGuardActive: false,
    battleResultModalShown: false,
    isFlowResolving: false,
    isEffectCastResolving: false,
    playerActionUsed: false,
    selectedCardId: cardId,
    pressedHandCardId: null,
    pressedHandCardWasSelected: false,
    targetingState: null,
    effectCastState: null,
    pendingSwapIndex: null,
    hoverInspectCardId: null,
    boardInspectIndex: null,
    gameState: {
      board: [null, null, null, null, null, null, { id: 'old', owner: 'player', cardId: 'old' }, null, null],
      player: { hand: [{ id: cardId, type: 'unit' }] },
    },
    hasActiveHandCardInteraction() { return Boolean(this.selectedCardId || this.pressedHandCardId || this.pressedHandCardWasSelected); },
    getActivePlayerEffectCard: () => null,
    isUnitCard: (card) => card?.type === 'unit',
    captureBoardStats: () => [],
    buildActionFeedback: () => [],
    completePlayerAction() { this.completed = true; },
    startPlayerUnitOnPlayTargeting() {},
    clearHandCardSelection() { throw new Error('valid redeploy should not clear hand selection'); },
    showInvalidActionFeedback() { throw new Error('valid redeploy should not show invalid feedback'); },
    getInvalidActionScope: () => 'global',
    showSwapPrompt() { throw new Error('redeploy must not show adjacent swap prompt'); },
  });

  const firstScene = makeScene('first-hand-unit');
  onBoardCellTap.call(firstScene, 6, () => ({ ok: true, type: 'redeploy', card: firstScene.gameState.player.hand[0] }));
  assert.equal(firstScene.completed, true);
  assert.equal(firstScene.pendingSwapIndex, null);

  const secondScene = makeScene('second-hand-unit');
  onBoardCellTap.call(secondScene, 6, () => ({ ok: true, type: 'redeploy', card: secondScene.gameState.player.hand[0] }));
  assert.equal(secondScene.completed, true);
  assert.equal(secondScene.pendingSwapIndex, null);
});

test('pressed hand-card gesture blocks implicit board swap source selection', () => {
  const trySelectImplicitSwapSourceOnPointerDown = compileMethod('trySelectImplicitSwapSourceOnPointerDown', 'onCardPointerDown', ['boardIndex']);
  const onBoardCellTap = compileMethod('onBoardCellTap', 'getActivePlayerEffectCard', ['boardIndex']);

  const scene = {
    openingMulliganPending: false,
    pendingSwapIndex: null,
    selectedCardId: null,
    pressedHandCardId: 'hand-unit',
    pressedHandCardWasSelected: false,
    targetingState: null,
    effectCastState: null,
    battleResultModalShown: false,
    isFlowResolving: false,
    isEffectCastResolving: false,
    playerActionUsed: false,
    gameState: { board: [null, null, null, null, null, null, { owner: 'player' }, null, null], player: { hand: [{ id: 'hand-unit', type: 'unit' }] } },
    hasActiveHandCardInteraction() { return Boolean(this.selectedCardId || this.pressedHandCardId || this.pressedHandCardWasSelected); },
    clearBoardInspect() {},
    showSwapPrompt() { throw new Error('pressed hand card must block adjacent swap prompt'); },
    resetCardHighlights() {},
    getActivePlayerEffectCard: () => null,
  };

  assert.equal(trySelectImplicitSwapSourceOnPointerDown.call(scene, 6), false);
  onBoardCellTap.call(scene, 6);
  assert.equal(scene.pendingSwapIndex, null);
});

test('idle implicit board swap still selects source and resolves adjacent target', () => {
  const onBoardCellTap = compileMethod('onBoardCellTap', 'getActivePlayerEffectCard', ['boardIndex', 'performSwap']);
  const scene = {
    utilityMenuPanel: null,
    navigationInProgress: false,
    pointerInputGuardActive: false,
    battleResultModalShown: false,
    isFlowResolving: false,
    isEffectCastResolving: false,
    playerActionUsed: false,
    selectedCardId: null,
    pressedHandCardId: null,
    pressedHandCardWasSelected: false,
    targetingState: null,
    effectCastState: null,
    pendingSwapIndex: null,
    hoverInspectCardId: null,
    gameState: { board: [null, null, null, null, null, null, { owner: 'player', id: 'a' }, { owner: 'player', id: 'b' }, null], player: { hand: [] } },
    hasActiveHandCardInteraction() { return Boolean(this.selectedCardId || this.pressedHandCardId || this.pressedHandCardWasSelected); },
    clearBoardInspect() {},
    showSwapPromptCalledWith: null,
    showSwapPrompt(step) { this.showSwapPromptCalledWith = step; },
    clearSwapPromptCalled: false,
    clearSwapPrompt() { this.clearSwapPromptCalled = true; },
    resetCardHighlights() {},
    updatePlayerBaseActionState() {},
    getActivePlayerEffectCard: () => null,
    captureBoardStats: () => [],
    completePlayerAction() { this.completed = true; },
  };

  onBoardCellTap.call(scene, 6, () => ({ ok: true }));
  assert.equal(scene.pendingSwapIndex, 6);
  assert.equal(scene.showSwapPromptCalledWith, 'selectAdjacent');

  onBoardCellTap.call(scene, 7, () => ({ ok: true }));
  assert.equal(scene.pendingSwapIndex, null);
  assert.equal(scene.clearSwapPromptCalled, true);
  assert.equal(scene.completed, true);
});

test('base PASS remains PASS and no SWAP/CANCEL labels remain', () => {
  assert.doesNotMatch(source, /swapModeCancel/);
  assert.doesNotMatch(source, /swapAction/);
  assert.match(source, /translateActive\('ui\.common\.pass', 'PASS'\)/);
});
