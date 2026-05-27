import Phaser from 'phaser';
import {
  INSPECT_CARD_MAX_HEIGHT_RATIO,
  INSPECT_CARD_MAX_WIDTH_RATIO,
  INSPECT_CARD_TARGET_SCALE,
  INSPECT_CARD_VERTICAL_COMPACT_RATIO,
} from '../rendering/cardViewConfig.js';

export const COLLECTION_VIEWPORT_TOP = 98;
export const COLLECTION_VIEWPORT_BOTTOM_INSET = 88;

export function getCollectionViewportBounds(scaleHeight) {
  return {
    viewportTop: COLLECTION_VIEWPORT_TOP,
    viewportBottom: scaleHeight - COLLECTION_VIEWPORT_BOTTOM_INSET,
  };
}

export function getCollectionInspectCardTransform({
  screenWidth,
  screenHeight,
  sourceWidth,
  sourceHeight,
  viewportTop,
  viewportBottom,
  margin = 14,
}) {
  const resolvedViewportTop = Number.isFinite(viewportTop) ? viewportTop : margin;
  const resolvedViewportBottom = Number.isFinite(viewportBottom) ? viewportBottom : screenHeight - margin;
  const maxInspectWidth = Math.min(screenWidth * INSPECT_CARD_MAX_WIDTH_RATIO, screenWidth - margin * 2);
  const maxInspectHeight = Math.min(
    screenHeight * INSPECT_CARD_MAX_HEIGHT_RATIO,
    resolvedViewportBottom - resolvedViewportTop - margin * 2,
  );
  const targetScale = Math.min(
    INSPECT_CARD_TARGET_SCALE,
    maxInspectWidth / sourceWidth,
    maxInspectHeight / (sourceHeight * INSPECT_CARD_VERTICAL_COMPACT_RATIO),
  );
  const width = sourceWidth * targetScale;
  const height = sourceHeight * targetScale * INSPECT_CARD_VERTICAL_COMPACT_RATIO;
  const minX = margin + width / 2;
  const maxX = screenWidth - margin - width / 2;
  const minY = resolvedViewportTop + margin + height / 2;
  const maxY = Math.max(minY, resolvedViewportBottom - margin - height / 2);

  return {
    x: Phaser.Math.Clamp(screenWidth * 0.5, minX, maxX),
    y: Phaser.Math.Clamp((resolvedViewportTop + resolvedViewportBottom) * 0.5, minY, maxY),
    width,
    height,
  };
}
