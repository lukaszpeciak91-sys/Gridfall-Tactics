export const BATTLE_TRANSITION_INITIAL_OVERSCAN = 1.06;
export const BATTLE_TRANSITION_MOTION_ZOOM_TO = 1.08;
export const BATTLE_TRANSITION_DRIFT_X = 3;
export const BATTLE_TRANSITION_DRIFT_Y = -48;

export function calculateBattleTransitionArtworkLayout({
  viewportWidth,
  viewportHeight,
  sourceWidth,
  sourceHeight,
  coverScale,
  originX = 0.5,
  originY = 0.5,
  initialOverscan = BATTLE_TRANSITION_INITIAL_OVERSCAN,
  zoomTo = BATTLE_TRANSITION_MOTION_ZOOM_TO,
  driftX = BATTLE_TRANSITION_DRIFT_X,
  driftY = BATTLE_TRANSITION_DRIFT_Y,
} = {}) {
  const safeViewportWidth = Math.max(1, Number(viewportWidth) || 0);
  const safeViewportHeight = Math.max(1, Number(viewportHeight) || 0);
  const safeSourceWidth = Math.max(1, Number(sourceWidth) || 0);
  const safeSourceHeight = Math.max(1, Number(sourceHeight) || 0);
  const resolvedCoverScale = Number.isFinite(coverScale) && coverScale > 0
    ? coverScale
    : Math.max(safeViewportWidth / safeSourceWidth, safeViewportHeight / safeSourceHeight);
  const safeOriginX = Number.isFinite(originX) ? Math.min(1, Math.max(0, originX)) : 0.5;
  const safeOriginY = Number.isFinite(originY) ? Math.min(1, Math.max(0, originY)) : 0.5;
  const startScale = resolvedCoverScale * initialOverscan;
  const endScale = startScale * zoomTo;
  const start = createBattleTransitionArtworkEndpoint({
    viewportWidth: safeViewportWidth,
    viewportHeight: safeViewportHeight,
    sourceWidth: safeSourceWidth,
    sourceHeight: safeSourceHeight,
    originX: safeOriginX,
    originY: safeOriginY,
    scale: startScale,
    x: safeViewportWidth / 2 - driftX / 2,
    y: safeViewportHeight / 2 - driftY / 2,
  });
  const end = createBattleTransitionArtworkEndpoint({
    viewportWidth: safeViewportWidth,
    viewportHeight: safeViewportHeight,
    sourceWidth: safeSourceWidth,
    sourceHeight: safeSourceHeight,
    originX: safeOriginX,
    originY: safeOriginY,
    scale: endScale,
    x: safeViewportWidth / 2 + driftX / 2,
    y: safeViewportHeight / 2 + driftY / 2,
  });
  return { coverScale: resolvedCoverScale, originX: safeOriginX, originY: safeOriginY, startScale, endScale, start, end };
}

function createBattleTransitionArtworkEndpoint({ viewportWidth, viewportHeight, sourceWidth, sourceHeight, originX, originY, scale, x, y }) {
  const displayWidth = sourceWidth * scale;
  const displayHeight = sourceHeight * scale;
  const bounds = {
    left: x - displayWidth * originX,
    right: x + displayWidth * (1 - originX),
    top: y - displayHeight * originY,
    bottom: y + displayHeight * (1 - originY),
  };
  return {
    x,
    y,
    scale,
    displayWidth,
    displayHeight,
    bounds,
    coversViewport: bounds.left <= 0 && bounds.top <= 0 && bounds.right >= viewportWidth && bounds.bottom >= viewportHeight,
  };
}
