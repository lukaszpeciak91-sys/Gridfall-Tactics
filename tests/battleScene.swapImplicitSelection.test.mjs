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

test('base PASS remains PASS and no SWAP/CANCEL labels remain', () => {
  assert.doesNotMatch(source, /swapModeCancel/);
  assert.doesNotMatch(source, /swapAction/);
  assert.match(source, /translateActive\('ui\.common\.pass', 'PASS'\)/);
});
