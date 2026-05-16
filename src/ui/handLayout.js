export const MAX_VISIBLE_HAND_CARDS = 5;
export const HAND_CARD_ASPECT_RATIO = 1.86;
export const HAND_CARD_READABILITY_SCALE = 1.35;
export const HAND_CARD_WIDTH_POLISH_SCALE = 1.04;
export const MIN_HAND_CONTROL_TOUCH_SIZE = 48;
export const MAX_HAND_CONTROL_TOUCH_SIZE = 54;
export const HAND_CARD_PRE_POLISH_MAX_WIDTH_RATIO = 0.28;
export const HAND_CARD_MAX_WIDTH_RATIO = 0.292;
export const HAND_CARD_TRACK_BLEED_RATIO = 1;
export const HAND_CARD_BOTTOM_SAFE_INSET_RATIO = 0.1;
export const HAND_CARD_ROW_DOWN_SHIFT_PX = 8;
export const HAND_CARD_EDGE_SAFE_MARGIN_PX = 8;

export function calculateHandLayoutMetrics({
  contentWidth,
  margin,
  handY,
  handHeight,
  viewportHeight,
  maxHandSize,
}) {
  const controlTouchSize = Math.max(
    MIN_HAND_CONTROL_TOUCH_SIZE,
    Math.min(MAX_HAND_CONTROL_TOUCH_SIZE, viewportHeight * 0.061),
  );
  const controlBottomInset = Math.max(5, Math.round(handHeight * 0.026));
  const controlTopInset = Math.max(3, Math.round(handHeight * 0.015));
  const controlRowHeight = controlTouchSize + controlBottomInset + controlTopInset;
  const cardTopInset = Math.max(5, Math.round(handHeight * 0.024));
  const cardControlGap = Math.max(5, Math.round(handHeight * 0.024));
  const baseCardBottomSafeInset = Math.max(22, Math.round(handHeight * HAND_CARD_BOTTOM_SAFE_INSET_RATIO));
  const cardRowDownShift = Math.min(
    HAND_CARD_ROW_DOWN_SHIFT_PX,
    Math.max(0, baseCardBottomSafeInset - Math.max(14, Math.round(handHeight * 0.055))),
  );
  const cardBottomSafeInset = Math.max(0, baseCardBottomSafeInset - cardRowDownShift);
  const cardSizingRowHeight = Math.max(0, handHeight - baseCardBottomSafeInset);
  const cardRowHeight = Math.max(0, handHeight - cardBottomSafeInset);
  const maxCardHeight = Math.max(0, cardSizingRowHeight - cardTopInset);
  const baseCardWidth = Math.min(contentWidth * 0.27, maxCardHeight / HAND_CARD_ASPECT_RATIO, handHeight * 0.9);
  const readableCardWidth = Math.min(
    baseCardWidth * HAND_CARD_READABILITY_SCALE,
    contentWidth * HAND_CARD_PRE_POLISH_MAX_WIDTH_RATIO,
    maxCardHeight / HAND_CARD_ASPECT_RATIO,
  );
  const cardWidth = Math.min(
    readableCardWidth * HAND_CARD_WIDTH_POLISH_SCALE,
    contentWidth * HAND_CARD_MAX_WIDTH_RATIO,
  );
  const cardHeight = readableCardWidth * HAND_CARD_ASPECT_RATIO;
  const trackBleed = margin * 2 * HAND_CARD_TRACK_BLEED_RATIO;
  const trackSafeInset = HAND_CARD_EDGE_SAFE_MARGIN_PX;
  const trackWidth = Math.max(cardWidth, contentWidth + trackBleed - trackSafeInset * 2);
  const cardsVisible = Math.min(MAX_VISIBLE_HAND_CARDS, maxHandSize);
  const fittedStep = cardsVisible > 1 ? (trackWidth - cardWidth) / (cardsVisible - 1) : 0;
  const overlapStep = cardWidth * 1.0;
  const step = cardsVisible > 1 ? Math.min(fittedStep, overlapStep) : 0;
  const usedTrackWidth = cardWidth + step * Math.max(0, cardsVisible - 1);
  const trackLeft = margin - trackBleed / 2 + trackSafeInset + (trackWidth - usedTrackWidth) / 2;
  const cardCenterY = handY + cardTopInset + cardHeight / 2 + cardRowDownShift;
  const controlCenterY = handY + handHeight - controlBottomInset - controlTouchSize / 2;

  return {
    y: handY,
    h: handHeight,
    centerY: handY + handHeight / 2,
    cardRowHeight,
    controlRowHeight,
    controlTopInset,
    cardControlGap,
    cardBottomSafeInset,
    cardRowDownShift,
    trackSafeInset,
    cardCenterY,
    controlCenterY,
    controlTouchSize,
    cardWidth,
    cardHeight,
    handTrackWidth: trackWidth,
    handTrackLeft: trackLeft,
    cardsVisible,
    step,
  };
}
