// The current back-card export includes transparent canvas padding around the
// painted card. Keep these normalized trim values presentation-only so the
// bitmap can cover the same slot footprint as renderer-built hand cards.
export const HAND_BACK_CARD_VISIBLE_TRIM = Object.freeze({
  left: 41 / 1024,
  right: 41 / 1024,
  top: 32 / 1536,
  bottom: 78 / 1536,
});

export function calculateVisibleHandBackCardCount({ handCount, maxHandSize, deckCount }) {
  return Math.min(
    Math.max(0, maxHandSize - handCount),
    Math.max(0, deckCount),
  );
}

export function shouldRenderHandBackCard({ handCount, maxHandSize, deckCount, index }) {
  const backCardCount = calculateVisibleHandBackCardCount({ handCount, maxHandSize, deckCount });
  return index >= handCount && index < handCount + backCardCount;
}

// Keep future-card visuals in their own depth band. Real hand cards use depths
// starting at realCardBaseDepth, while back-cards descend so the first future
// card is the visible top of the small deck and later cards tuck underneath it.
export function calculateHandBackCardDepth({ backCardOrder, realCardBaseDepth = 20 }) {
  return realCardBaseDepth - backCardOrder - 1;
}

export function calculateHandBackCardCoverCrop({
  sourceWidth,
  sourceHeight,
  width,
  height,
  trim = HAND_BACK_CARD_VISIBLE_TRIM,
}) {
  const safeSourceWidth = Math.max(1, sourceWidth);
  const safeSourceHeight = Math.max(1, sourceHeight);
  const trimLeft = safeSourceWidth * trim.left;
  const trimTop = safeSourceHeight * trim.top;
  const trimmedWidth = Math.max(1, safeSourceWidth * (1 - trim.left - trim.right));
  const trimmedHeight = Math.max(1, safeSourceHeight * (1 - trim.top - trim.bottom));
  const scale = Math.max(width / trimmedWidth, height / trimmedHeight);
  const cropWidth = Math.min(trimmedWidth, width / scale);
  const cropHeight = Math.min(trimmedHeight, height / scale);
  const cropX = trimLeft + (trimmedWidth - cropWidth) / 2;
  const cropY = trimTop + (trimmedHeight - cropHeight) / 2;

  return {
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    displayWidth: safeSourceWidth * scale,
    displayHeight: safeSourceHeight * scale,
    originX: (cropX + cropWidth / 2) / safeSourceWidth,
    originY: (cropY + cropHeight / 2) / safeSourceHeight,
  };
}
