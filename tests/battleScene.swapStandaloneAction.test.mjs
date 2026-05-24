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

test('canPlayerStartSwap requires a legal adjacent friendly pair', () => {
  const canPlayerStartSwap = compileMethod('canPlayerStartSwap', 'updateActionButtonLabel', ['canPass', 'canSwap']);

  const scene = {
    gameState: {
      winner: null,
      board: [
        null, null, null,
        null, null, null,
        { owner: 'player' }, { owner: 'player' }, null,
      ],
    },
    battleResultModalShown: false,
    openingMulliganPending: false,
    playerActionUsed: false,
    isFlowResolving: false,
    isEffectCastResolving: false,
    targetingState: null,
    effectCastState: null,
    actionMode: null,
  };

  const canSwapStub = (state, fromIndex, toIndex, owner) => {
    const from = state.board[fromIndex];
    const to = state.board[toIndex];
    return Boolean(from && to && from.owner === owner && to.owner === owner && Math.abs(fromIndex - toIndex) === 1);
  };

  assert.equal(canPlayerStartSwap.call(scene, () => true, canSwapStub), true);
  scene.gameState.board[7] = null;
  assert.equal(canPlayerStartSwap.call(scene, () => true, canSwapStub), false);
});

test('resolvePassTurn enters swap mode without requiring selected hand card', () => {
  const resolvePassTurn = compileMethod('resolvePassTurn', 'getOpeningTurnStartBannerConfig', ['canPass', 'recordPassAction']);

  const scene = {
    cancelPassHoldToSurrender: () => {},
    battleResultModalShown: false,
    isFlowResolving: false,
    isEffectCastResolving: false,
    targetingState: null,
    actionMode: null,
    pendingSwapIndex: 7,
    canPlayerStartSwap: () => true,
    showSwapPrompt: () => {},
    clearBoardInspect: () => {},
    resetCardHighlights: () => {},
    updateActionButtonLabel: () => {},
    gameState: { winner: null },
  };

  resolvePassTurn.call(scene, () => true, () => {});
  assert.equal(scene.actionMode, 'swap');
  assert.equal(scene.pendingSwapIndex, null);
});
