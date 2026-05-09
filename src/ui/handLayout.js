export const MAX_VISIBLE_HAND_CARDS = 5;
export const HAND_CARD_ASPECT_RATIO = 1.34;
export const MIN_HAND_CONTROL_TOUCH_SIZE = 48;
export const MAX_HAND_CONTROL_TOUCH_SIZE = 58;

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
    Math.min(MAX_HAND_CONTROL_TOUCH_SIZE, viewportHeight * 0.066),
  );
  const controlBottomInset = Math.max(6, Math.round(handHeight * 0.035));
  const controlTopInset = Math.max(4, Math.round(handHeight * 0.02));
  const controlRowHeight = controlTouchSize + controlBottomInset + controlTopInset;
  const cardTopInset = Math.max(6, Math.round(handHeight * 0.03));
  const cardControlGap = Math.max(8, Math.round(handHeight * 0.04));
  const cardRowHeight = Math.max(0, handHeight - controlRowHeight);
  const maxCardHeight = Math.max(0, cardRowHeight - cardTopInset - cardControlGap);
  const cardWidth = Math.min(contentWidth * 0.27, maxCardHeight / HAND_CARD_ASPECT_RATIO, handHeight * 0.9);
  const cardHeight = cardWidth * HAND_CARD_ASPECT_RATIO;
  const trackWidth = contentWidth;
  const cardsVisible = Math.min(MAX_VISIBLE_HAND_CARDS, maxHandSize);
  const fittedStep = cardsVisible > 1 ? (trackWidth - cardWidth) / (cardsVisible - 1) : 0;
  const overlapStep = cardWidth * 1.08;
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
