import { translateActive } from '../localization/localeService.js';
import { PREMIUM_BROADCAST_FONT_STACK, createImageButton } from './imageButton.js';

export function createModalBackButton(scene, {
  x,
  y,
  onPointerUp,
  depth = 3,
  width = Math.round((scene.scale.gameSize?.width ?? scene.scale.width) * 0.46),
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
    fontSize: '20px',
    textStyle: {
      color: '#eef7ff',
      fontFamily: PREMIUM_BROADCAST_FONT_STACK,
      fontStyle: '700',
      letterSpacing: 1.5,
    },
    fallbackFill: 0x93c5fd,
    fallbackStroke: 0xe0f2fe,
    fallbackStrokeAlpha: 0.9,
    shadowAlpha: 0.22,
    hoverScale: 1.018,
    downScale: 0.982,
  });
}
