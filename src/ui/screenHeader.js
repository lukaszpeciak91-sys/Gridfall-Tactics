import { PREMIUM_BROADCAST_FONT_STACK } from './imageButton.js';

const DEFAULT_HEADER_TINT = 0xf5f1e6;
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
    y: Number.isFinite(y) ? y : (isPortrait ? 48 : 50),
    safeWidth,
    fontSize: isExtraNarrowPortrait ? 25 : (isPortrait ? 29 : 32),
    letterSpacing: isExtraNarrowPortrait ? 1.4 : 1.8,
    lineOffsetY: isExtraNarrowPortrait ? 26 : 29,
  };
}

export function createMenuScreenHeader(scene, {
  title,
  width = scene.scale.width,
  height = scene.scale.height,
  x,
  y,
  tint = DEFAULT_HEADER_TINT,
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

  const measuredWidth = Math.min(layout.safeWidth, Math.max(titleObject.width, layout.safeWidth * 0.38));
  const lineWidth = Math.min(layout.safeWidth * 0.58, Math.max(58, measuredWidth * 0.5));
  const lineY = layout.y + Math.max(layout.lineOffsetY, titleObject.height * 0.55 + 9);
  const lineGlow = scene.add.line(headerX, lineY, -lineWidth * 0.5, 0, lineWidth * 0.5, 0, tint, 0.22)
    .setOrigin(0.5)
    .setDepth(depth - 0.1);
  lineGlow.lineWidth = 3;
  lineGlow.setBlendMode?.('ADD');

  const line = scene.add.line(headerX, lineY, -lineWidth * 0.5, 0, lineWidth * 0.5, 0, tint, 0.58)
    .setOrigin(0.5)
    .setDepth(depth);
  line.lineWidth = 1;

  return {
    title: titleObject,
    glow,
    line,
    lineGlow,
    items: [glow, titleObject, lineGlow, line],
    bottomY: lineY + 1,
  };
}
