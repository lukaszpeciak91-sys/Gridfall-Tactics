import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { TUTORIAL_STEPS } from '../src/data/tutorial/tutorialSteps.js';
import { checkTutorialInputGate } from '../src/systems/tutorialInputGate.js';
import { calculateCentralBattleBannerLayout, calculateHandCardFocusBounds, calculateTutorialBannerLayout } from '../src/ui/tutorialUxLayout.js';

const battleSceneSource = await readFile(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

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

test('lifecycle recovery refreshes tutorial banners after rebuild or non-rebuild paths', () => {
  const recoverBody = battleSceneSource.match(/recoverFromLifecycle\(reason = 'unknown', diagnostics = null\) \{(?<body>[\s\S]*?)\n  \}\n\n  normalizeLifecycleUiState/)?.groups?.body;
  assert.ok(recoverBody, 'recoverFromLifecycle body should be present');
  assert.match(recoverBody, /if \(this\.shouldRebuildBattleView\(reason, recoveryDiagnostics\)\) \{[\s\S]*?this\.rebuildBattleView\(reason\);[\s\S]*?\} else \{[\s\S]*?this\.resetCardHighlights\(\);[\s\S]*?\}\s*this\.refreshLifecycleBanners\(reason\);/);
});

test('lifecycle banner refresh is tutorial-only and result-modal safe', () => {
  const helperBody = battleSceneSource.match(/refreshLifecycleBanners\(reason = 'unknown'\) \{(?<body>[\s\S]*?)\n  \}\n\n  shouldRebuildBattleView/)?.groups?.body;
  assert.ok(helperBody, 'refreshLifecycleBanners helper should be present');
  assert.match(helperBody, /!this\.isTutorialBattle\?\.\(\)/);
  assert.match(helperBody, /this\.battleResultModalShown \|\| this\.battleResultModalPending \|\| this\.gameState\?\.winner/);
  assert.match(helperBody, /this\.updateTutorialBanner\?\.\(\);/);
  assert.match(helperBody, /this\.updateTutorialFocus\?\.\(step\);/);
  assert.doesNotMatch(helperBody, /showEnemyActionBanner|showPlayerActionBanner|showInvalidActionBanner|showOpeningTurnStartBanner|deferTransientBattleBanner|flushDeferredTransientBattleBanner/);
});

test('existing tutorial banner object state is normalized when updated', () => {
  const updateBody = battleSceneSource.match(/updateTutorialBanner\(\) \{(?<body>[\s\S]*?)\n  \}\n\n  onTutorialBannerPointerDown/)?.groups?.body;
  assert.ok(updateBody, 'updateTutorialBanner body should be present');
  assert.match(updateBody, /\.setVisible\(true\)\s*\.setAlpha\(0\.98\)\s*\.setDepth\(TUTORIAL_BANNER_DEPTH\)\s*\.setScale\(1\)/);
  assert.match(updateBody, /setWordWrapWidth\?\.\(layout\.maxTextWidth\)/);
});

test('tap-continue overlay is re-laid out and reconfigured without duplication', () => {
  const updateBody = battleSceneSource.match(/updateTutorialBanner\(\) \{(?<body>[\s\S]*?)\n  \}\n\n  onTutorialBannerPointerDown/)?.groups?.body;
  assert.ok(updateBody, 'updateTutorialBanner body should be present');
  assert.match(updateBody, /if \(!this\.tutorialBannerOverlay\?\.active\) \{/);
  assert.match(updateBody, /this\.tutorialBannerOverlay\.setPosition\(layout\.overlayX, layout\.overlayY\)\.setSize\(layout\.overlayWidth, layout\.overlayHeight\);/);
  assert.match(updateBody, /this\.tutorialBannerOverlay\.setDepth\(TUTORIAL_BANNER_OVERLAY_DEPTH\);/);
  assert.match(updateBody, /this\.tutorialBannerOverlay\.setVisible\(canTapContinue\);/);
  assert.match(updateBody, /this\.tutorialBannerOverlay\.input\.enabled = canTapContinue/);
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
