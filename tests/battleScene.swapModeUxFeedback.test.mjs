import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

function extractMethodBody(name, nextName) {
  const start = source.indexOf(`
  ${name}(`);
  const end = source.indexOf(`
  ${nextName}(`, start + 1);
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

test('swap mode runtime flow: select, highlight, swap, clear, and invalid tap behavior', () => {
  const onBoardCellTap = compileMethod('onBoardCellTap', 'getActivePlayerEffectCard', ['boardIndex', 'performSwap']);
  const resetCardHighlights = compileMethod('resetCardHighlights', 'isUnitCard', ['options'], "const { showPreview = true } = options ?? {};\nconst BOARD_GUIDE_SLOT_STROKE_ALPHA = 0.18;\nconst BOARD_SLOT_STROKE_ALPHA = 0.36;\nconst BOARD_TARGET_STROKE_ALPHA = 0.9;\n");

  const makeUnit = (id) => ({ id, owner: 'player', hp: 1, attack: 1 });
  const state = {
    board: [
      null, null, null,
      null, null, null,
      makeUnit('A'), makeUnit('B'), null,
    ],
    player: { hand: [] },
    enemy: { hand: [] },
  };

  const strokes = new Map();
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
    actionMode: 'swap',
    pendingSwapIndex: null,
    hoverInspectCardId: null,
    gameState: state,
    cardViews: [],
    boardCells: [6, 7, 8].map((index) => ({
      index,
      row: 2,
      background: {
        setStrokeStyle: (lineWidth, strokeColor, strokeAlpha) => {
          strokes.set(index, { lineWidth, strokeColor, strokeAlpha });
        },
      },
    })),
    clearBoardInspect: () => {},
    resetCardHighlights: function (opts) { return resetCardHighlights.call(this, opts); },
    showSelectedHandCardZoom: () => {},
    destroySelectedHandCardZoom: () => {},
    isValidTarget: () => false,
    captureBoardStats: () => ({}),
    completeCalls: 0,
    completePlayerAction: function () { this.completeCalls += 1; this.actionMode = null; this.pendingSwapIndex = null; },
    showSwapPrompt: () => {},
    clearSwapPrompt: () => {},
    getActivePlayerEffectCard: () => null,
  };

  // First tap selects source.
  onBoardCellTap.call(scene, 6, (s, owner, from, to) => ({ ok: true }));
  assert.equal(scene.pendingSwapIndex, 6);
  assert.equal(scene.completeCalls, 0);

  // Highlight step: source + legal adjacent ally (7).
  resetCardHighlights.call(scene, { showPreview: false });
  assert.equal(strokes.get(6)?.strokeColor, 0xfacc15);
  assert.equal(strokes.get(7)?.strokeColor, 0x22c55e);

  // Invalid tap in swap mode: enemy/empty tap should not consume action.
  onBoardCellTap.call(scene, 8, (s, owner, from, to) => ({ ok: false }));
  assert.equal(scene.completeCalls, 0);

  // Valid second tap performs swap and completes action.
  onBoardCellTap.call(scene, 7, (s, owner, from, to) => {
    const temp = s.board[from];
    s.board[from] = s.board[to];
    s.board[to] = temp;
    return { ok: true };
  });
  assert.equal(scene.completeCalls, 1);
  assert.equal(scene.actionMode, null);
  assert.equal(scene.pendingSwapIndex, null);
  assert.equal(scene.gameState.board[6].id, 'B');
  assert.equal(scene.gameState.board[7].id, 'A');
});
