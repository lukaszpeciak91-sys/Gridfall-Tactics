import { getBuildMarkerText } from '../buildInfo.js';

export function createBuildMarker(scene, { width = null, height = null, inset = 8 } = {}) {
  const gameSize = scene.scale?.gameSize ?? scene.scale ?? {};
  const resolvedWidth = width ?? gameSize.width;
  const resolvedHeight = height ?? gameSize.height;

  return scene.add.text(resolvedWidth - inset, resolvedHeight - inset, getBuildMarkerText(), {
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
    color: '#facc15',
    backgroundColor: '#111827',
    padding: { x: 5, y: 3 },
  }).setOrigin(1, 1).setDepth(1000);
}
