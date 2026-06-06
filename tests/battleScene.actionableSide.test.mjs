import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');

function extractMethodBody(name, nextName) {
  const normalStart = source.indexOf(`\n  ${name}(`);
  const asyncStart = source.indexOf(`\n  async ${name}(`);
  const start = normalStart >= 0 ? normalStart : asyncStart;
  const normalEnd = source.indexOf(`\n  ${nextName}(`, start + 1);
  const asyncEnd = source.indexOf(`\n  async ${nextName}(`, start + 1);
  const end = normalEnd >= 0 ? normalEnd : asyncEnd;
  if (start < 0 || end < 0) throw new Error(`Failed to extract ${name}`);
  return source.slice(start, end);
}

function compileMethod(name, nextName, params = []) {
  const block = extractMethodBody(name, nextName);
  const bodyStart = block.indexOf(') {') + 3;
  const bodyEnd = block.lastIndexOf('}');
  return new Function(...params, block.slice(bodyStart, bodyEnd));
}

const getCurrentActionableSide = compileMethod('getCurrentActionableSide', 'updatePlayerBaseActionState');
const isBasePassAvailable = compileMethod('isBasePassAvailable', 'canHoldPassToSurrender', ['canPass']);

function createScene(overrides = {}) {
  return {
    gameState: { firstActor: 'player', winner: null },
    battleResultModalShown: false,
    isFlowResolving: false,
    isEffectCastResolving: false,
    playerActionUsed: false,
    enemyActionUsed: false,
    selectedCardId: null,
    targetingState: null,
    boardInspectIndex: null,
    hoverInspectCardId: null,
    selectedHandCardZoom: null,
    pendingSwapIndex: null,
    deckInfoPanel: null,
    utilityMenuPanel: null,
    effectCastState: null,
    openingMulliganPending: false,
    getCurrentActionableSide() { return getCurrentActionableSide.call(this); },
    hasBasePassBlocker() {
      return Boolean(
        this.selectedCardId
        || this.targetingState
        || this.boardInspectIndex !== null
        || this.hoverInspectCardId
        || this.selectedHandCardZoom
        || this.pendingSwapIndex !== null
        || this.deckInfoPanel
        || this.utilityMenuPanel
        || this.battleResultModalShown
        || this.isFlowResolving
        || this.isEffectCastResolving
        || this.effectCastState
        || this.openingMulliganPending,
      );
    },
    ...overrides,
  };
}

function canPass(state) {
  return Boolean(state) && !state.winner;
}

test('current actionable side follows action-window flags instead of firstActor alone', () => {
  assert.equal(getCurrentActionableSide.call(createScene({ gameState: { firstActor: 'player' } })), 'player');
  assert.equal(getCurrentActionableSide.call(createScene({ gameState: { firstActor: 'player' }, playerActionUsed: true })), 'enemy');
  assert.equal(getCurrentActionableSide.call(createScene({ gameState: { firstActor: 'enemy' } })), 'enemy');
  assert.equal(getCurrentActionableSide.call(createScene({ gameState: { firstActor: 'enemy' }, enemyActionUsed: true })), 'player');
  assert.equal(getCurrentActionableSide.call(createScene({ gameState: { firstActor: 'enemy' }, enemyActionUsed: true, playerActionUsed: true })), null);
});

test('current actionable side returns null while battle UI is locked or ended', () => {
  assert.equal(getCurrentActionableSide.call(createScene({ isFlowResolving: true })), null);
  assert.equal(getCurrentActionableSide.call(createScene({ isEffectCastResolving: true })), null);
  assert.equal(getCurrentActionableSide.call(createScene({ battleResultModalShown: true })), null);
  assert.equal(getCurrentActionableSide.call(createScene({ gameState: { firstActor: 'player', winner: 'enemy' } })), null);
  assert.equal(getCurrentActionableSide.call(createScene({ gameState: null })), null);
});

test('base PASS appears only in the player action window and preserves existing blockers', () => {
  assert.equal(isBasePassAvailable.call(createScene({ gameState: { firstActor: 'player' } }), canPass), true);
  assert.equal(isBasePassAvailable.call(createScene({ gameState: { firstActor: 'enemy' } }), canPass), false);
  assert.equal(isBasePassAvailable.call(createScene({ gameState: { firstActor: 'enemy' }, enemyActionUsed: true }), canPass), true);

  const blockers = [
    { selectedCardId: 'card-1' },
    { targetingState: {} },
    { boardInspectIndex: 0 },
    { hoverInspectCardId: 'card-1' },
    { selectedHandCardZoom: {} },
    { pendingSwapIndex: 6 },
    { deckInfoPanel: {} },
    { utilityMenuPanel: {} },
    { battleResultModalShown: true },
    { isFlowResolving: true },
    { isEffectCastResolving: true },
    { effectCastState: {} },
    { openingMulliganPending: true },
  ];

  for (const blocker of blockers) {
    assert.equal(isBasePassAvailable.call(createScene(blocker), canPass), false, JSON.stringify(blocker));
  }
});

test('mulligan-start pass timing gates player and enemy starts correctly', () => {
  assert.equal(isBasePassAvailable.call(createScene({ gameState: { firstActor: 'player' }, openingMulliganPending: false }), canPass), true);
  assert.equal(isBasePassAvailable.call(createScene({ gameState: { firstActor: 'enemy' }, openingMulliganPending: false }), canPass), false);
  assert.equal(isBasePassAvailable.call(createScene({ gameState: { firstActor: 'enemy' }, openingMulliganPending: false, isFlowResolving: true }), canPass), false);
  assert.equal(isBasePassAvailable.call(createScene({ gameState: { firstActor: 'enemy' }, openingMulliganPending: false, enemyActionUsed: true }), canPass), true);
});

test('initiative indicator and enemy-first unlock refresh use current actionability', () => {
  const updateInitiativeIndicator = extractMethodBody('updateInitiativeIndicator', 'refreshAfterPlayerAction');
  const resolveEnemyFirstTurnOpening = extractMethodBody('resolveEnemyFirstTurnOpening', 'finishTurnAfterBothActions');

  assert.match(updateInitiativeIndicator, /const active = this\.getCurrentActionableSide\(\);/);
  assert.doesNotMatch(updateInitiativeIndicator, /this\.gameState\.firstActor/);
  assert.match(resolveEnemyFirstTurnOpening, /this\.isFlowResolving = false;\s*this\.updateInitiativeIndicator\(\);\s*this\.resetCardHighlights\(\);/);
});
