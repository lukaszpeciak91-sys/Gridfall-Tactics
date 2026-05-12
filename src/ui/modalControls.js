import { translateActive } from '../localization/localeService.js';
import { createImageButton } from './imageButton.js';

export function createModalBackButton(scene, {
  x,
  y,
  onPointerUp,
  depth = 3,
  width = Math.min(210, Math.max(150, Math.round((scene.scale.gameSize?.width ?? scene.scale.width) * 0.46))),
  height = 54,
  label = translateActive('ui.common.back', 'BACK'),
} = {}) {
  return createImageButton(scene, {
    x,
    y,
    width,
    height,
    label,
    onPointerUp,
    depth,
    fontSize: '18px',
    textStyle: { color: '#f8fafc' },
    fallbackFill: 0x93c5fd,
    fallbackStroke: 0xe0f2fe,
    fallbackStrokeAlpha: 0.9,
  });
}
