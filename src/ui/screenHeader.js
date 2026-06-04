import { PREMIUM_BROADCAST_FONT_STACK } from './imageButton.js';

const DEFAULT_HEADER_COLOR = '#f5f1e6';
const DEFAULT_HEADER_SHADOW_COLOR = 'rgba(3, 17, 40, 0.74)';
const DEFAULT_HEADER_GLOW_COLOR = 'rgba(250, 204, 21, 0.32)';
const DEFAULT_HEADER_DEPTH = 5;

export function getMenuScreenHeaderLayout({ width, height, y } = {}) {
  const isPortrait = height >= width;
  const isExtraNarrowPortrait = isPortrait && width <= 360;
  const safeWidth = Math.max(220, width - 36);

  return {
    x: width * 0.5,
    y: Number.isFinite(y) ? y : (isPortrait ? 66 : 70),
    safeWidth,
    fontSize: isExtraNarrowPortrait ? 31 : (isPortrait ? 36 : 40),
    letterSpacing: isExtraNarrowPortrait ? 1.45 : 1.9,
  };
}

export function createMenuScreenHeader(scene, {
  title,
  width = scene.scale.width,
  height = scene.scale.height,
  x,
  y,
  color = DEFAULT_HEADER_COLOR,
  depth = DEFAULT_HEADER_DEPTH,
  maxLines = 2,
} = {}) {
  const layout = getMenuScreenHeaderLayout({ width, height, y });
  const headerX = Number.isFinite(x) ? x : layout.x;
  const titleText = String(title ?? '').toLocaleUpperCase();

  const glow = scene.add.text(headerX, layout.y, titleText, {
    fontFamily: PREMIUM_BROADCAST_FONT_STACK,
    fontSize: `${layout.fontSize}px`,
    fontStyle: '700',
    color,
    align: 'center',
    letterSpacing: layout.letterSpacing,
    maxLines,
    wordWrap: { width: layout.safeWidth, useAdvancedWrap: true },
  })
    .setOrigin(0.5)
    .setAlpha(0.28)
    .setDepth(depth - 0.2)
    .setShadow(0, 0, DEFAULT_HEADER_GLOW_COLOR, 10, true, true);
  glow.setBlendMode?.('ADD');

  const titleObject = scene.add.text(headerX, layout.y, titleText, {
    fontFamily: PREMIUM_BROADCAST_FONT_STACK,
    fontSize: `${layout.fontSize}px`,
    fontStyle: '700',
    color,
    align: 'center',
    letterSpacing: layout.letterSpacing,
    maxLines,
    wordWrap: { width: layout.safeWidth, useAdvancedWrap: true },
  })
    .setOrigin(0.5)
    .setDepth(depth)
    .setShadow(0, 2, DEFAULT_HEADER_SHADOW_COLOR, 3, true, true);

  return {
    title: titleObject,
    glow,
    items: [glow, titleObject],
    bottomY: layout.y + titleObject.height * 0.5,
  };
}
