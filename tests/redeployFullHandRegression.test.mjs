import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { canPlayOrRedeploy, createInitialBattleState, playOrRedeployUnit } from '../src/systems/GameState.js';

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

const unitCard = (id, attack = 1, hp = 2) => ({
  id,
  name: id,
  type: 'unit',
  attack,
  hp,
  armor: 0,
  effectId: null,
});

const boardUnit = (owner, id, attack = 1, hp = 2) => ({
  ...unitCard(id, attack, hp),
  owner,
  cardId: id,
  maxHp: hp,
});

function makeFullHandRedeployState() {
  const state = createInitialBattleState({ name: 'Player', deck: [] }, { name: 'Enemy', deck: [] }, { firstActor: 'player' });
  state.player.hand.push(
    unitCard('selected-unit', 3, 2),
    unitCard('filler-1'),
    unitCard('filler-2'),
    unitCard('filler-3'),
    unitCard('filler-4'),
  );
  assert.equal(state.player.hand.length, state.player.maxHandSize);
  state.board[6] = boardUnit('player', 'displaced-unit', 2, 3);
  return state;
}

test('redeploy with full hand is legal when final hand size does not overflow', () => {
  const state = makeFullHandRedeployState();

  assert.deepEqual(canPlayOrRedeploy(state, 'player', 'selected-unit', 6), { ok: true, type: 'redeploy' });

  const result = playOrRedeployUnit(state, 'player', 'selected-unit', 6);

  assert.equal(result.ok, true);
  assert.equal(result.type, 'redeploy');
  assert.equal(state.player.hand.length, state.player.maxHandSize);
  assert.equal(state.player.hand.some((card) => card.id === 'displaced-unit'), true);
  assert.equal(state.player.hand.some((card) => card.id === 'selected-unit'), false);
  assert.equal(state.board[6].cardId, 'selected-unit');
  assert.equal(state.board[6].owner, 'player');
});

test('full-hand selected redeploy board tap uses redeploy path and does not enter implicit swap', () => {
  const onScenePointerUp = compileMethod('onScenePointerUp', 'clearSelectedHandInspectFromOutsideTap', ['pointer', 'currentlyOver']);
  const state = makeFullHandRedeployState();
  const prompts = [];
  const invalidFeedback = [];
  const scene = {
    isPointerEventGuarded: () => false,
    navigationInProgress: false,
    playerSurrenderArmed: false,
    battleResultModalShown: false,
    isFlowResolving: false,
    isEffectCastResolving: false,
    openingMulliganPending: false,
    pendingSwapIndex: null,
    selectedCardId: 'selected-unit',
    targetingState: null,
    effectCastState: null,
    boardLongPressSuppressNextScenePointerUpIndex: null,
    boardInspectIndex: null,
    selectedHandCardZoom: null,
    boardPointerDownSelectedSwapSource: false,
    pressedHandCardId: null,
    pressedHandCardWasSelected: false,
    gameState: state,
    boardCells: [{ index: 6, background: { getBounds: () => ({ contains: () => true }) } }],
    cardViews: [],
    bottomControlViews: [],
    deckCounterView: null,
    deckInfoPanel: null,
    utilityMenuPanel: null,
    isPointerUpReservedForUi() { return false; },
    clearBoardInspectFromOutsideTap() { return false; },
    isPointerInsideSelectedHandCardZoom() { return false; },
    normalizePointerUpObjects(over) { return over; },
    isPointerInsideGameObject() { return true; },
    isPointerInsideHandArea() { return false; },
    getBoardCellFromPointerUp() { return this.boardCells[0]; },
    isUnitCard(card) { return card?.type === 'unit'; },
    isBoardCellTapReservedForCardAction(boardIndex, selectedCard) { return selectedCard && this.isUnitCard(selectedCard); },
    onBoardCellTap(boardIndex) {
      const result = playOrRedeployUnit(this.gameState, 'player', this.selectedCardId, boardIndex);
      assert.equal(result.ok, true);
      assert.equal(result.type, 'redeploy');
    },
    showSwapPrompt(step) { prompts.push(step); },
    showInvalidActionFeedback(feedback) { invalidFeedback.push(feedback); },
    clearSelectedHandInspectFromOutsideTap() { return false; },
    clearHandCardSelection() {},
  };

  onScenePointerUp.call(scene, { x: 1, y: 1 }, []);

  assert.equal(state.board[6].cardId, 'selected-unit');
  assert.equal(scene.pendingSwapIndex, null);
  assert.deepEqual(prompts, []);
  assert.deepEqual(invalidFeedback, []);
});

test('invalid selected-card board tap does not fall back into implicit swap', () => {
  const onScenePointerUp = compileMethod('onScenePointerUp', 'clearSelectedHandInspectFromOutsideTap', ['pointer', 'currentlyOver']);
  const prompts = [];
  const invalidFeedback = [];
  const scene = {
    isPointerEventGuarded: () => false,
    navigationInProgress: false,
    playerSurrenderArmed: false,
    battleResultModalShown: false,
    isFlowResolving: false,
    isEffectCastResolving: false,
    openingMulliganPending: false,
    pendingSwapIndex: null,
    selectedCardId: 'selected-unit',
    targetingState: null,
    effectCastState: null,
    boardLongPressSuppressNextScenePointerUpIndex: null,
    boardInspectIndex: null,
    selectedHandCardZoom: null,
    boardPointerDownSelectedSwapSource: false,
    pressedHandCardId: null,
    pressedHandCardWasSelected: false,
    gameState: { player: { hand: [unitCard('selected-unit')] }, board: [null, null, null, null, null, null, null, { owner: 'player' }, null] },
    boardCells: [{ index: 7, background: { getBounds: () => ({ contains: () => true }) } }],
    cardViews: [],
    bottomControlViews: [],
    deckCounterView: null,
    deckInfoPanel: null,
    utilityMenuPanel: null,
    isPointerUpReservedForUi() { return false; },
    clearBoardInspectFromOutsideTap() { return false; },
    isPointerInsideSelectedHandCardZoom() { return false; },
    normalizePointerUpObjects(over) { return over; },
    isPointerInsideGameObject() { return true; },
    isPointerInsideHandArea() { return false; },
    getBoardCellFromPointerUp() { return this.boardCells[0]; },
    isUnitCard(card) { return card?.type === 'unit'; },
    isBoardCellTapReservedForCardAction(boardIndex, selectedCard) { return selectedCard && this.isUnitCard(selectedCard); },
    onBoardCellTap(boardIndex) {
      this.pendingSwapIndex = null;
      this.showInvalidActionFeedback({ reason: 'Invalid row for unit placement', boardIndex, scope: 'slot' });
    },
    showSwapPrompt(step) { prompts.push(step); },
    showInvalidActionFeedback(feedback) { invalidFeedback.push(feedback); },
    clearSelectedHandInspectFromOutsideTap() { return false; },
    clearHandCardSelection() {},
  };

  onScenePointerUp.call(scene, { x: 1, y: 1 }, []);

  assert.equal(scene.pendingSwapIndex, null);
  assert.deepEqual(prompts, []);
  assert.equal(invalidFeedback.length, 1);
});
