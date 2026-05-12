import { translateActive } from '../localization/localeService.js';
import { PREMIUM_BROADCAST_FONT_STACK, createImageButton } from './imageButton.js';

export function createModalBackButton(scene, {
  x,
  y,
  onPointerUp,
  depth = 3,
  width = Math.round((scene.scale.gameSize?.width ?? scene.scale.width) * 0.46),
  height = 52,
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
    textStyle: {
      color: '#f5f1e6',
      fontFamily: PREMIUM_BROADCAST_FONT_STACK,
      fontStyle: '700',
      letterSpacing: 1.9,
    },
    fallbackFill: 0x93c5fd,
    fallbackStroke: 0xe0f2fe,
    fallbackStrokeAlpha: 0.9,
    shadowAlpha: 0.22,
    hoverScale: 1.03,
    downScale: 0.98,
  });
}
