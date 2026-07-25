export const COLLECTION_AUTO_SCROLL_DURATION_MS = 220;
export const COLLECTION_AUTO_SCROLL_EASE = 'Quad.easeOut';

export function getCollectionAutoScrollTarget({
  contentY,
  bannerTop,
  viewportTop,
  topSpacing,
  minY,
  maxY,
}) {
  const desiredBannerTop = viewportTop + topSpacing;
  return Math.min(maxY, Math.max(minY, contentY + desiredBannerTop - bannerTop));
}
