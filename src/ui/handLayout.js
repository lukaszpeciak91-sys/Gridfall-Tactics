export const MAX_VISIBLE_HAND_CARDS = 5;
export const HAND_CARD_ASPECT_RATIO = 1.86;
export const HAND_CARD_READABILITY_SCALE = 1.35;
export const MIN_HAND_CONTROL_TOUCH_SIZE = 48;
export const MAX_HAND_CONTROL_TOUCH_SIZE = 54;
export const HAND_CARD_MAX_WIDTH_RATIO = 0.28;
export const HAND_CARD_BOTTOM_SAFE_INSET_RATIO = 0.1;

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
  const cardBottomSafeInset = Math.max(22, Math.round(handHeight * HAND_CARD_BOTTOM_SAFE_INSET_RATIO));
  const cardRowHeight = Math.max(0, handHeight - cardBottomSafeInset);
  const maxCardHeight = Math.max(0, cardRowHeight - cardTopInset);
  const baseCardWidth = Math.min(contentWidth * 0.27, maxCardHeight / HAND_CARD_ASPECT_RATIO, handHeight * 0.9);
  const cardWidth = Math.min(baseCardWidth * HAND_CARD_READABILITY_SCALE, contentWidth * HAND_CARD_MAX_WIDTH_RATIO, maxCardHeight / HAND_CARD_ASPECT_RATIO);
  const cardHeight = cardWidth * HAND_CARD_ASPECT_RATIO;
  const trackWidth = contentWidth;
  const cardsVisible = Math.min(MAX_VISIBLE_HAND_CARDS, maxHandSize);
  const fittedStep = cardsVisible > 1 ? (trackWidth - cardWidth) / (cardsVisible - 1) : 0;
  const overlapStep = cardWidth * 1.0;
  const step = cardsVisible > 1 ? Math.min(fittedStep, overlapStep) : 0;
  const usedTrackWidth = cardWidth + step * Math.max(0, cardsVisible - 1);
  const trackLeft = margin + (contentWidth - usedTrackWidth) / 2;
  const cardCenterY = handY + cardTopInset + cardHeight / 2;
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
