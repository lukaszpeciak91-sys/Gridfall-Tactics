import { calculateHandLayoutMetrics } from './handLayout.js';

// Board-only readability polish after collapsing the obsolete central action band.
// The removed band is recovered by the board/player-base region while hand sizing stays unchanged.
export const BOARD_READABILITY_CELL_SCALE = 0.97;
export const BOARD_READABILITY_NARROW_CELL_SCALE = 0.995;
export const BOARD_READABILITY_NARROW_WIDTH = 360;
export const BOARD_READABILITY_BASE_WIDTH = 390;
export const BOARD_READABILITY_SHIFT_RATIO = 2 / 844;

function calculateBoardReadabilityCellScale(width) {
  if (width <= BOARD_READABILITY_NARROW_WIDTH) return BOARD_READABILITY_NARROW_CELL_SCALE;
  if (width >= BOARD_READABILITY_BASE_WIDTH) return BOARD_READABILITY_CELL_SCALE;

  const progress = (width - BOARD_READABILITY_NARROW_WIDTH) / (BOARD_READABILITY_BASE_WIDTH - BOARD_READABILITY_NARROW_WIDTH);
  return BOARD_READABILITY_NARROW_CELL_SCALE + (BOARD_READABILITY_CELL_SCALE - BOARD_READABILITY_NARROW_CELL_SCALE) * progress;
}

export function calculateBattleLayoutMetrics(width, height, { maxHandSize = 0 } = {}) {
  const margin = Math.max(8, Math.round(width * 0.025));
  const contentWidth = width - margin * 2;

  const legacySectionRatios = {
    topHero: 0.06,
    board: 0.54,
    playerHero: 0.06,
    action: 0.05,
    hand: 0.265,
  };
  const gapRatio = 0.008;
  const topBottomPadRatio = 0.008;
  const legacySectionCount = Object.keys(legacySectionRatios).length;
  const legacyTotalGapHeight = height * gapRatio * (legacySectionCount - 1);
  const totalPadHeight = height * topBottomPadRatio * 2;
  const legacyUsableHeight = Math.max(0, height - legacyTotalGapHeight - totalPadHeight);
  const legacyTotalSectionRatio = Object.values(legacySectionRatios).reduce((sum, ratio) => sum + ratio, 0);

  const topHeroHeight = legacyUsableHeight * (legacySectionRatios.topHero / legacyTotalSectionRatio);
  const legacyBoardHeight = legacyUsableHeight * (legacySectionRatios.board / legacyTotalSectionRatio);
  const playerHeroHeight = legacyUsableHeight * (legacySectionRatios.playerHero / legacyTotalSectionRatio);
  const legacyActionHeight = legacyUsableHeight * (legacySectionRatios.action / legacyTotalSectionRatio);
  const handHeight = legacyUsableHeight * (legacySectionRatios.hand / legacyTotalSectionRatio);

  const gapHeight = height * gapRatio;
  const topBottomPad = height * topBottomPadRatio;
  const recoveredActionSpace = legacyActionHeight + gapHeight;
  const boardHeight = legacyBoardHeight + recoveredActionSpace;

  let cursorY = topBottomPad;
  const topHeroY = cursorY;
  cursorY += topHeroHeight + gapHeight;
  const boardY = cursorY;
  cursorY += boardHeight + gapHeight;
  const playerHeroY = cursorY;
  cursorY += playerHeroHeight + gapHeight;
  const handY = cursorY;

  const boardWidth = Math.min(contentWidth * 0.985, contentWidth);
  const slotWidth = boardWidth / 3;
  const slotHeight = slotWidth * 1.34;
  const boardScale = Math.min(1, boardHeight / (slotHeight * 3));
  const boardReadabilityCellScale = calculateBoardReadabilityCellScale(width);
  const cellWidth = slotWidth * boardScale * boardReadabilityCellScale;
  const cellHeight = slotHeight * boardScale * boardReadabilityCellScale;
  const boardShiftY = height * BOARD_READABILITY_SHIFT_RATIO;

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
    topHero: { y: topHeroY, h: topHeroHeight, centerY: topHeroY + topHeroHeight / 2 },
    board: {
      y: boardY + boardShiftY,
      h: boardHeight,
      centerY: boardY + boardHeight / 2 + boardShiftY,
      cellWidth,
      cellHeight,
      width: cellWidth * 3,
      height: cellHeight * 3,
      readabilityShiftY: boardShiftY,
      readabilityScale: boardReadabilityCellScale,
      recoveredActionSpace,
    },
    playerHero: { y: playerHeroY, h: playerHeroHeight, centerY: playerHeroY + playerHeroHeight / 2 },
    hand: handLayout,
  };
}
