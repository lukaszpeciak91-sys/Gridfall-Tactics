import assert from 'node:assert/strict';
import test from 'node:test';

import { TUTORIAL_STEPS } from '../src/data/tutorial/tutorialSteps.js';
import { checkTutorialInputGate } from '../src/systems/tutorialInputGate.js';
import { calculateCentralBattleBannerLayout, calculateHandCardFocusBounds, calculateTutorialBannerLayout } from '../src/ui/tutorialUxLayout.js';

function makeTutorialState(stepId = 'adjacent_swap') {
  return { steps: TUTORIAL_STEPS, currentStepIndex: TUTORIAL_STEPS.findIndex((step) => step.id === stepId), completed: false, lastEvent: null };
}

function makeLayout() {
  return {
    width: 900,
    height: 700,
    margin: 24,
    board: { x: 150, y: 120, width: 600, height: 300, centerY: 270, cellWidth: 200, cellHeight: 100 },
    playerHero: { y: 450, h: 70, centerY: 485 },
    hand: { y: 560, h: 120, centerY: 620 },
  };
}

test('tutorial banner targetY sits above player board row', () => {
  const scene = { layout: makeLayout() };

  const layout = calculateTutorialBannerLayout(scene.layout);
  const playerRowTop = scene.layout.board.centerY + scene.layout.board.cellHeight * 0.5;
  const enemyRowBottom = scene.layout.board.centerY - scene.layout.board.cellHeight * 0.5;

  assert.ok(layout.targetY < playerRowTop, `expected ${layout.targetY} above ${playerRowTop}`);
  assert.ok(layout.targetY > enemyRowBottom, `expected ${layout.targetY} below ${enemyRowBottom}`);
  assert.ok(layout.targetY < scene.layout.playerHero.y, 'banner should not overlap action row');
});

test('central battle banner layout remains centered for arena/campaign banners', () => {
  const scene = { layout: makeLayout() };

  const layout = calculateCentralBattleBannerLayout({ ...scene.layout, baseWidthRatio: 0.88, horizontalPadding: 16 });
  assert.equal(layout.targetY, scene.layout.board.centerY);
});

for (const [stepId, cardId] of [
  ['play_unit_a', 'tutorial_unit_a_1'],
  ['play_unit_b', 'tutorial_unit_b_1'],
  ['redeploy', 'tutorial_unit_c_1'],
  ['effect_card', 'tutorial_all_attack_1'],
]) {
  test(`${stepId} resolves focus to ${cardId} hand card`, () => {
    const cardViews = [{ cardId, card: { id: cardId }, root: { active: true, x: 123, y: 456, alpha: 1 }, background: { active: true, x: 0, y: 0, width: 70, height: 100, displayWidth: 70, displayHeight: 100 } }];

    const bounds = calculateHandCardFocusBounds(cardViews, cardId, (object, padding) => ({ x: object.x, y: object.y, width: object.displayWidth + padding * 2, height: object.displayHeight + padding * 2 }));
    assert.deepEqual(bounds, { x: 123, y: 456, width: 84, height: 114 });
  });
}

test('required hand card focus has no fallback when card is not visible', () => {
  assert.equal(calculateHandCardFocusBounds([], 'tutorial_unit_a_1', () => null), null);
});

test('tutorial swap gate accepts both directions for expected adjacent player units', () => {
  const board = [];
  board[6] = { owner: 'player' };
  board[7] = { owner: 'player' };

  assert.equal(checkTutorialInputGate(makeTutorialState(), { type: 'swap_adjacent_units', fromIndex: 6, toIndex: 7, board }).allowed, true);
  assert.equal(checkTutorialInputGate(makeTutorialState(), { type: 'swap_adjacent_units', fromIndex: 7, toIndex: 6, board }).allowed, true);
});

test('tutorial swap gate blocks wrong, enemy, and non-adjacent pairs', () => {
  const playerBoard = [];
  playerBoard[6] = { owner: 'player' };
  playerBoard[7] = { owner: 'player' };
  playerBoard[8] = { owner: 'player' };
  assert.equal(checkTutorialInputGate(makeTutorialState(), { type: 'swap_adjacent_units', fromIndex: 6, toIndex: 8, board: playerBoard }).allowed, false);

  const enemyBoard = [];
  enemyBoard[0] = { owner: 'enemy' };
  enemyBoard[1] = { owner: 'enemy' };
  assert.equal(checkTutorialInputGate(makeTutorialState(), { type: 'swap_adjacent_units', fromIndex: 0, toIndex: 1, board: enemyBoard }).allowed, false);

  const wrongBoard = [];
  wrongBoard[7] = { owner: 'player' };
  wrongBoard[8] = { owner: 'player' };
  assert.equal(checkTutorialInputGate(makeTutorialState(), { type: 'swap_adjacent_units', fromIndex: 7, toIndex: 8, board: wrongBoard }).allowed, false);
});
