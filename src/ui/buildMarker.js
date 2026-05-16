import { getBuildMarkerText } from '../buildInfo.js';

export function createBuildMarker(scene, {
  width = null,
  height = null,
  inset = 8,
  corner = 'bottom-right',
  alpha = 1,
  depth = 1000,
  fontSize = '12px',
} = {}) {
  const gameSize = scene.scale?.gameSize ?? scene.scale ?? {};
  const resolvedWidth = width ?? gameSize.width;
  const resolvedHeight = height ?? gameSize.height;

  const isTopRight = corner === 'top-right';

  return scene.add.text(resolvedWidth - inset, isTopRight ? inset : resolvedHeight - inset, getBuildMarkerText(), {
    fontFamily: 'Arial, sans-serif',
    fontSize,
    color: '#facc15',
    backgroundColor: '#111827',
    padding: { x: 5, y: 3 },
  })
    .setOrigin(1, isTopRight ? 0 : 1)
    .setAlpha(alpha)
    .setDepth(depth);
}
