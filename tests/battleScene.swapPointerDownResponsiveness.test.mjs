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
  const onBoardCellPointerUp = compileMethod('onBoardCellPointerUp', 'onBoardCellPointerOut', ['boardIndex']);

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
  assert.equal(scene.boardPointerDownSelectedSwapSource, false);
});
