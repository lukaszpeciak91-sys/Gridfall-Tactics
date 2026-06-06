import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { calculateBattleLayoutMetrics } from '../src/ui/battleLayout.js';
import { calculateHandLayoutMetrics } from '../src/ui/handLayout.js';

const battleSource = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

function legacyBattleLayoutMetrics(width, height, { maxHandSize = 7 } = {}) {
  const margin = Math.max(8, Math.round(width * 0.025));
  const contentWidth = width - margin * 2;
  const sectionRatios = {
    topHero: 0.06,
    board: 0.54,
    playerHero: 0.06,
    action: 0.05,
    hand: 0.265,
  };
  const gapRatio = 0.008;
  const topBottomPadRatio = 0.008;
  const sectionCount = Object.keys(sectionRatios).length;
  const totalGapHeight = height * gapRatio * (sectionCount - 1);
  const totalPadHeight = height * topBottomPadRatio * 2;
  const usableHeight = Math.max(0, height - totalGapHeight - totalPadHeight);
  const totalSectionRatio = Object.values(sectionRatios).reduce((sum, ratio) => sum + ratio, 0);

  const topHeroHeight = usableHeight * (sectionRatios.topHero / totalSectionRatio);
  const boardHeight = usableHeight * (sectionRatios.board / totalSectionRatio);
  const playerHeroHeight = usableHeight * (sectionRatios.playerHero / totalSectionRatio);
  const actionHeight = usableHeight * (sectionRatios.action / totalSectionRatio);
  const handHeight = usableHeight * (sectionRatios.hand / totalSectionRatio);

  const gapHeight = height * gapRatio;
  const topBottomPad = height * topBottomPadRatio;

  let cursorY = topBottomPad;
  const topHeroY = cursorY;
  cursorY += topHeroHeight + gapHeight;
  const boardY = cursorY;
  cursorY += boardHeight + gapHeight;
  const playerHeroY = cursorY;
  cursorY += playerHeroHeight + gapHeight;
  const actionY = cursorY;
  cursorY += actionHeight + gapHeight;
  const handY = cursorY;

  const boardWidth = Math.min(contentWidth * 0.985, contentWidth);
  const slotWidth = boardWidth / 3;
  const slotHeight = slotWidth * 1.34;
  const boardScale = Math.min(1, boardHeight / (slotHeight * 3));
  const cellWidth = slotWidth * boardScale;
  const cellHeight = slotHeight * boardScale;

  const handLayout = calculateHandLayoutMetrics({
    contentWidth,
    margin,
    handY,
    handHeight,
    viewportHeight: height,
    maxHandSize,
  });

  return {
    width,
    height,
    margin,
    contentWidth,
    gapHeight,
    topHero: { y: topHeroY, h: topHeroHeight, centerY: topHeroY + topHeroHeight / 2 },
    board: { y: boardY, h: boardHeight, centerY: boardY + boardHeight / 2, cellWidth, cellHeight, width: cellWidth * 3, height: cellHeight * 3 },
    playerHero: { y: playerHeroY, h: playerHeroHeight, centerY: playerHeroY + playerHeroHeight / 2 },
    action: { y: actionY, h: actionHeight, centerY: actionY + actionHeight / 2 },
    hand: handLayout,
  };
}

function bottomVisibleBoardSlotGap(layout) {
  const startY = layout.board.centerY - layout.board.height / 2;
  const visibleSlotBottom = startY + layout.board.height - 5;
  return layout.playerHero.y - visibleSlotBottom;
}

test('obsolete central action band is collapsed and recovered into the board/base region', () => {
  for (const [width, height] of [[360, 800], [390, 844], [414, 896]]) {
    const legacy = legacyBattleLayoutMetrics(width, height);
    const polished = calculateBattleLayoutMetrics(width, height, { maxHandSize: 7 });
    const recoverableSpace = legacy.action.h + legacy.gapHeight;

    assert.equal(polished.action, undefined);
    assert.ok(Math.abs(polished.board.recoveredActionSpace - recoverableSpace) < 0.000001);
    assert.ok(Math.abs((polished.board.h - legacy.board.h) - recoverableSpace) < 0.000001);
    assert.ok(Math.abs((polished.playerHero.y - legacy.playerHero.y) - recoverableSpace) < 0.000001);
  }
});

test('player base and hand are separated by one normal gap with no fake action-button band', () => {
  for (const [width, height] of [[360, 800], [390, 844], [414, 896]]) {
    const layout = calculateBattleLayoutMetrics(width, height, { maxHandSize: 7 });
    const normalGap = height * 0.008;

    assert.ok(Math.abs((layout.hand.y - (layout.playerHero.y + layout.playerHero.h)) - normalGap) < 0.000001);
    assert.equal('action' in layout, false);
  }
});

test('hand card dimensions remain unchanged after action-band collapse', () => {
  for (const [width, height] of [[360, 800], [390, 844], [414, 896]]) {
    const legacy = legacyBattleLayoutMetrics(width, height);
    const polished = calculateBattleLayoutMetrics(width, height, { maxHandSize: 7 });

    assert.ok(Math.abs(polished.hand.y - legacy.hand.y) < 0.000001);
    assert.ok(Math.abs(polished.hand.h - legacy.hand.h) < 0.000001);
    assert.ok(Math.abs(polished.hand.cardWidth - legacy.hand.cardWidth) < 0.000001);
    assert.ok(Math.abs(polished.hand.cardHeight - legacy.hand.cardHeight) < 0.000001);
  }
});

test('board readability layout applies final board shift and effective slot growth', () => {
  const legacy = legacyBattleLayoutMetrics(390, 844);
  const polished = calculateBattleLayoutMetrics(390, 844, { maxHandSize: 7 });

  assert.equal(polished.board.readabilityScale, 1);
  assert.equal(polished.board.readabilityShiftY, 4);
  assert.ok(polished.board.cellWidth / legacy.board.cellWidth > 1.09);
  assert.ok(polished.board.cellHeight / legacy.board.cellHeight > 1.09);
});

test('bottom board slot keeps the player base safety gap on common portrait sizes', () => {
  for (const [width, height] of [[360, 800], [390, 844], [414, 896]]) {
    const layout = calculateBattleLayoutMetrics(width, height, { maxHandSize: 7 });
    assert.ok(
      bottomVisibleBoardSlotGap(layout) >= 8,
      `${width}x${height} gap should remain at least 8px`,
    );
  }
});

test('inspect positioning no longer depends on a real action layout band', () => {
  assert.doesNotMatch(battleSource, /layout\.action/);
  assert.doesNotMatch(battleSource, /action\.h/);
  assert.match(battleSource, /const inspectSafeBottomLimitY = hand\.y - margin;/);
});

test('board slot rectangle remains derived from the board cell size', () => {
  assert.match(battleSource, /\.rectangle\(x, y, board\.cellWidth - 10, board\.cellHeight - 10,/);
});

test('board unit visual remains derived from the visible slot rectangle', () => {
  assert.match(battleSource, /const unitWidth = Math\.max\(1, cell\.background\.width - 8\);/);
  assert.match(battleSource, /const unitHeight = Math\.max\(1, cell\.background\.height - 8\);/);
});

test('board targeting and inspect source positions continue to use the slot background hitbox', () => {
  assert.match(battleSource, /\.setInteractive\(\{ useHandCursor: true \}\);/);
  assert.match(battleSource, /background\.on\('pointerdown', \(\) => \{\s*this\.onBoardCellPointerDown\(boardIndex\);/);
  assert.match(battleSource, /background\.on\('pointerup', \(pointer\) => \{\s*this\.onBoardCellPointerUp\(boardIndex, pointer\);/);
  assert.match(battleSource, /getBoardCellCenter\(index\) \{\s*const cell = this\.getCellByIndex\(index\);\s*if \(!cell\?\.background\) return null;\s*return \{ x: cell\.background\.x, y: cell\.background\.y \};/);
  assert.match(battleSource, /sourceX: cell\.background\.x,\s*sourceY: cell\.background\.y,/);
});
