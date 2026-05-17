import { getCardDisplayName, getCardTextShort } from '../localization/cardDisplay.js';
import { CARD_EFFECT_GAMEPLAY_SYMBOLS, formatCardEffectTextShort } from '../localization/cardTextFormatting.js';
import { getLoadedCardIllustrationTextureKey } from './cardIllustrationAssets.js';

export const CARD_ZONE_RATIOS = Object.freeze({
  statBadges: 0.112,
  art: 0.45,
  name: 0.135,
  text: 0.315,
});

export const CARD_CORNER_RADIUS_RATIO = 0.055;

export const CARD_COLORS = Object.freeze({
  frame: 0x172033,
  frameSelected: 0x334155,
  emptyFrame: 0x111827,
  innerPanel: 0x0b1220,
  artTop: 0x1e293b,
  artBottom: 0x0f172a,
  divider: 0x64748b,
  namePanel: 0x111827,
  textPanel: 0x0f172a,
  ivoryText: '#fff7ed',
  bodyText: '#dbeafe',
  mutedText: '#94a3b8',
});

export const CARD_STAT_STYLES = Object.freeze({
  attack: Object.freeze({
    color: 0x24c6a7,
    glow: 0x6ee7d8,
    shadow: 0x0f766e,
    label: 'attack',
  }),
  armor: Object.freeze({
    color: 0x3d63c7,
    glow: 0x93b4ff,
    shadow: 0x1e3a8a,
    label: 'armor',
  }),
  health: Object.freeze({
    color: 0xd24b5f,
    glow: 0xffb4a8,
    shadow: 0x8f2638,
    label: 'health',
  }),
});

export const CARD_ACCENT_COLORS = Object.freeze({
  unit: 0x4da6ff,
  effect: 0xb06cff,
  default: 0x94a3b8,
});

export function getDefaultCardAccentColor(card) {
  if (card?.type === 'unit') return CARD_ACCENT_COLORS.unit;
  if (card?.type === 'effect') return CARD_ACCENT_COLORS.effect;
  return CARD_ACCENT_COLORS.default;
}

const CARD_STAT_SYMBOL_KEYS = Object.freeze({
  '▲': 'attack',
  '◆': 'armor',
  '●': 'health',
});

export const INLINE_EFFECT_ICON_STAT_FONT_SCALE = 1.18;
export const INLINE_EFFECT_ICON_BASELINE_OFFSET_RATIO = -0.06;
export const INLINE_EFFECT_ICON_SPACE_SCALE = 0.34;

const CARD_GAMEPLAY_SYMBOL_STYLES = Object.freeze({
  [CARD_EFFECT_GAMEPLAY_SYMBOLS.ally]: Object.freeze({
    color: '#facc15',
    fontStyle: 'bold',
    icon: 'single',
    fontScale: 1.02,
    widthScale: 0.58,
  }),
  [CARD_EFFECT_GAMEPLAY_SYMBOLS.allies]: Object.freeze({
    color: '#facc15',
    fontStyle: 'bold',
    icon: 'group',
    fontScale: 1.0,
    widthScale: 0.84,
  }),
});

function colorNumberToCss(color) {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export function getInlineStatSymbolColor(symbol) {
  const statKey = CARD_STAT_SYMBOL_KEYS[symbol];
  return statKey ? colorNumberToCss(CARD_STAT_STYLES[statKey].color) : null;
}

export function getInlineGameplaySymbolColor(symbol) {
  return CARD_GAMEPLAY_SYMBOL_STYLES[symbol]?.color ?? null;
}

function getInlineSymbolStyle(symbol) {
  const statColor = getInlineStatSymbolColor(symbol);
  if (statColor) {
    return {
      type: 'statSymbol',
      color: statColor,
      fontStyle: 'bold',
      fontScale: INLINE_EFFECT_ICON_STAT_FONT_SCALE,
      widthScale: 0.86,
    };
  }

  const gameplayStyle = CARD_GAMEPLAY_SYMBOL_STYLES[symbol];
  if (gameplayStyle) {
    return { type: 'gameplaySymbol', ...gameplayStyle };
  }

  return { type: 'text', color: null, fontStyle: undefined };
}

export function tokenizeInlineStatText(text) {
  if (typeof text !== 'string' || text.length === 0) return [];
  return text
    .split(/(♙♙|▲|◆|●|♙|\n|\s+)/u)
    .filter((token) => token.length > 0)
    .map((token) => {
      if (token === '\n') return { type: 'newline', text: token };
      if (/^\s+$/u.test(token)) return { type: 'space', text: token };
      const symbolStyle = getInlineSymbolStyle(token);
      return {
        type: symbolStyle.type,
        text: token,
      };
    });
}

function isInlineSymbolToken(token) {
  return token?.type === 'statSymbol' || token?.type === 'gameplaySymbol';
}

function getInlineSpaceWidth(spaceWidth, previousToken, nextToken) {
  if (spaceWidth <= 0 || (!isInlineSymbolToken(previousToken) && !isInlineSymbolToken(nextToken))) {
    return spaceWidth;
  }

  return Math.max(1, Math.ceil(spaceWidth * INLINE_EFFECT_ICON_SPACE_SCALE));
}

export function layoutInlineStatText(text, { maxWidth, measureTokenWidth }) {
  const tokens = tokenizeInlineStatText(text);
  const lines = [];
  let currentLine = [];
  let currentWidth = 0;
  let pendingSpaceWidth = 0;

  const pushLine = () => {
    lines.push({ segments: currentLine, width: currentWidth });
    currentLine = [];
    currentWidth = 0;
    pendingSpaceWidth = 0;
  };

  tokens.forEach((token) => {
    if (token.type === 'newline') {
      pushLine();
      return;
    }

    const width = measureTokenWidth(token.text);
    if (token.type === 'space') {
      if (currentLine.length === 0) return;
      pendingSpaceWidth += width;
      return;
    }

    const previousSegment = currentLine.at(-1);
    const inlineSpaceWidth = getInlineSpaceWidth(pendingSpaceWidth, previousSegment, token);
    const nextX = currentWidth + inlineSpaceWidth;
    if (currentLine.length > 0 && nextX + width > maxWidth) {
      pushLine();
    }

    const segmentX = currentLine.length > 0 ? currentWidth + inlineSpaceWidth : 0;
    currentLine.push({ ...token, x: segmentX, width });
    currentWidth = segmentX + width;
    pendingSpaceWidth = 0;
  });

  if (currentLine.length > 0 || lines.length === 0) {
    pushLine();
  }

  return lines;
}

export function createInlineStatText(scene, x, y, text, {
  fontFamily = 'Arial, sans-serif',
  fontSize = 12,
  minFontSize = 9,
  color = CARD_COLORS.bodyText,
  statFontStyle = 'bold',
  align = 'center',
  maxWidth = 160,
  maxHeight = null,
  lineSpacing = 0,
} = {}) {
  const container = scene.add.container(x, y);
  let fittedFontSize = fontSize;
  const measureText = scene.add.text(0, 0, '', {
    fontFamily,
    fontSize: `${fittedFontSize}px`,
    color,
  }).setVisible(false);
  const measureTokenWidth = (value) => {
    const symbolStyle = getInlineSymbolStyle(value);
    if (symbolStyle.type === 'gameplaySymbol') {
      return Math.ceil(fittedFontSize * (symbolStyle.widthScale ?? 0.78));
    }
    if (symbolStyle.type === 'statSymbol') {
      return Math.ceil(fittedFontSize * (symbolStyle.widthScale ?? 0.86));
    }

    measureText.setText(value);
    return measureText.width;
  };
  const layoutForFontSize = (size) => {
    measureText.setFontSize(size);
    const linesForSize = layoutInlineStatText(text, { maxWidth, measureTokenWidth });
    const lineHeightForSize = Math.ceil(size * 1.12) + lineSpacing;
    return {
      lines: linesForSize,
      lineHeight: lineHeightForSize,
      height: Math.max(size, linesForSize.length * lineHeightForSize - lineSpacing),
    };
  };
  let fittedLayout = layoutForFontSize(fittedFontSize);

  while (Number.isFinite(maxHeight) && fittedLayout.height > maxHeight && fittedFontSize > minFontSize) {
    fittedFontSize -= 1;
    fittedLayout = layoutForFontSize(fittedFontSize);
  }

  const baseStyle = {
    fontFamily,
    fontSize: `${fittedFontSize}px`,
    color,
  };
  const { lines, lineHeight } = fittedLayout;

  lines.forEach((line, lineIndex) => {
    const startX = align === 'center' ? -line.width / 2 : 0;
    const baselineY = lineIndex * lineHeight;
    const inlineIconYOffset = Math.round(fittedFontSize * INLINE_EFFECT_ICON_BASELINE_OFFSET_RATIO);
    line.segments.forEach((segment) => {
      const symbolStyle = getInlineSymbolStyle(segment.text);
      const segmentX = startX + segment.x;
      if (symbolStyle.type === 'gameplaySymbol' && symbolStyle.icon === 'group') {
        const group = scene.add.container(segmentX + segment.width / 2, baselineY + lineHeight * 0.49 + inlineIconYOffset);
        const iconFontSize = Math.round(fittedFontSize * (symbolStyle.fontScale ?? 1));
        const backIcon = scene.add.text(-segment.width * 0.16, -iconFontSize * 0.02, CARD_EFFECT_GAMEPLAY_SYMBOLS.ally, {
          ...baseStyle,
          fontSize: `${iconFontSize}px`,
          color: symbolStyle.color ?? color,
          fontStyle: symbolStyle.fontStyle,
          stroke: '#4a3200',
          strokeThickness: Math.max(1, Math.round(iconFontSize * 0.12)),
        }).setOrigin(0.5).setAlpha(0.92);
        const frontIcon = scene.add.text(segment.width * 0.15, iconFontSize * 0.03, CARD_EFFECT_GAMEPLAY_SYMBOLS.ally, {
          ...baseStyle,
          fontSize: `${iconFontSize}px`,
          color: symbolStyle.color ?? color,
          fontStyle: symbolStyle.fontStyle,
          stroke: '#4a3200',
          strokeThickness: Math.max(1, Math.round(iconFontSize * 0.12)),
        }).setOrigin(0.5);
        backIcon.setShadow(0, 1, 'rgba(0, 0, 0, 0.55)', 1);
        frontIcon.setShadow(0, 1, 'rgba(0, 0, 0, 0.55)', 1);
        group.add([backIcon, frontIcon]);
        container.add(group);
        return;
      }

      const isInlineSymbol = symbolStyle.type === 'statSymbol' || symbolStyle.type === 'gameplaySymbol';
      const iconFontSize = isInlineSymbol
        ? Math.round(fittedFontSize * (symbolStyle.fontScale ?? 1))
        : fittedFontSize;
      const segmentY = isInlineSymbol ? baselineY + lineHeight * 0.5 + inlineIconYOffset : baselineY;
      const segmentText = scene.add.text(segmentX, segmentY, segment.text, {
        ...baseStyle,
        fontSize: `${iconFontSize}px`,
        color: symbolStyle.color ?? color,
        fontStyle: symbolStyle.type === 'statSymbol' ? statFontStyle : symbolStyle.fontStyle,
        stroke: isInlineSymbol ? '#061426' : undefined,
        strokeThickness: isInlineSymbol ? Math.max(1, Math.round(iconFontSize * 0.1)) : 0,
      }).setOrigin(0, isInlineSymbol ? 0.5 : 0);
      if (isInlineSymbol) {
        segmentText.setShadow(0, 1, 'rgba(0, 0, 0, 0.58)', 1);
      }
      container.add(segmentText);
    });
  });

  measureText.destroy();
  container.inlineTextMetrics = {
    lineCount: lines.length,
    width: Math.max(0, ...lines.map((line) => line.width)),
    height: fittedLayout.height,
    fontSize: fittedFontSize,
  };
  return container;
}

export function isCardUnit(card) {
  return card?.type === 'unit' || (Number.isFinite(card?.attack) && Number.isFinite(card?.hp));
}

export function getCardStatValues(card) {
  if (!isCardUnit(card)) {
    return { attack: null, armor: null, health: null };
  }

  return {
    attack: Number.isFinite(card?.attack) ? card.attack : 0,
    armor: Number.isFinite(card?.armor) ? card.armor : 0,
    health: Number.isFinite(card?.hp) ? card.hp : 0,
  };
}

export function getCardLayoutZones(width, height) {
  const pad = Math.max(4, Math.round(width * 0.055));
  const gap = Math.max(2, Math.round(height * 0.007));
  const innerWidth = Math.max(1, width - pad * 2);
  const innerHeight = Math.max(1, height - pad * 2);
  const statBadgeRowHeight = Math.round(innerHeight * CARD_ZONE_RATIOS.statBadges);
  const nameHeight = Math.round(innerHeight * CARD_ZONE_RATIOS.name);
  const textHeight = Math.round(innerHeight * CARD_ZONE_RATIOS.text);
  const artHeight = Math.max(1, innerHeight - statBadgeRowHeight - nameHeight - textHeight - gap * 3);
  const left = -width / 2 + pad;
  let top = -height / 2 + pad;

  const makeRect = (h) => {
    const rect = { x: left, y: top, width: innerWidth, height: h, centerX: left + innerWidth / 2, centerY: top + h / 2 };
    top += h + gap;
    return rect;
  };

  return {
    pad,
    gap,
    outer: { x: -width / 2, y: -height / 2, width, height, centerX: 0, centerY: 0 },
    statBadges: makeRect(statBadgeRowHeight),
    statBar: null,
    art: makeRect(artHeight),
    name: makeRect(nameHeight),
    text: makeRect(textHeight),
  };
}

export function getCardTypography(width, height) {
  return {
    stat: Math.max(10, Math.floor(width * 0.112)),
    name: Math.max(11, Math.floor(width * 0.114)),
    type: Math.max(8, Math.floor(width * 0.065)),
    body: Math.max(9, Math.floor(width * 0.088)),
  };
}

export function drawStatSymbol(scene, x, y, size, statKey, color, alpha = 1) {
  if (statKey === 'attack') {
    const symbol = scene.add.graphics({ x, y });
    symbol.fillStyle(color, alpha);
    symbol.fillTriangle(0, -size * 0.5, size * 0.52, size * 0.43, -size * 0.52, size * 0.43);
    return symbol;
  }

  if (statKey === 'armor') {
    return scene.add.rectangle(x, y, size * 0.75, size * 0.75, color, alpha)
      .setRotation(Math.PI / 4);
  }

  return scene.add.circle(x, y, size * 0.43, color, alpha);
}

function getStatBadgeSize(height, width, scale = 1) {
  const baseSize = Math.max(18, Math.min(24, height * 0.9, width * 0.2));
  return baseSize * scale;
}

function createStatGlyph(scene, x, y, size, key, value, style, isKnown, fontSize) {
  const glyph = scene.add.container(x, y);
  const valueText = isKnown ? String(value) : '–';
  const symbolAlpha = isKnown ? 0.98 : 0.26;
  const outlineAlpha = isKnown ? 0.16 : 0.06;
  const glow = drawStatSymbol(scene, 0, 0, size * 1.12, key, style.glow, isKnown ? 0.12 : 0.03);
  const outline = drawStatSymbol(scene, 0, 0, size * 1.05, key, 0xfff7ed, outlineAlpha);
  const symbol = drawStatSymbol(scene, 0, 0, size, key, style.color, symbolAlpha);
  const glass = drawStatSymbol(scene, -size * 0.08, -size * 0.14, size * 0.46, key, 0xffffff, isKnown ? 0.1 : 0.025);
  const textOffsetY = key === 'attack' ? size * 0.09 : 0;
  const text = scene.add.text(0, textOffsetY, valueText, {
    fontFamily: 'Arial, sans-serif',
    fontSize: `${fontSize}px`,
    color: isKnown ? '#020817' : '#94a3b8',
    fontStyle: 'bold',
    align: 'center',
    stroke: isKnown ? '#fff1d6' : '#0f172a',
    strokeThickness: isKnown ? Math.max(2, Math.round(size * 0.105)) : 1,
    fixedWidth: Math.ceil(size * 1.02),
    fixedHeight: Math.ceil(size * 0.84),
  }).setOrigin(0.5);
  if (isKnown) {
    text.setShadow(0, 1, 'rgba(255, 255, 255, 0.46)', 2);
  }

  glyph.add([glow, outline, symbol, glass, text]);
  glyph.statFeedback = {
    key,
    baseColor: style.color,
    glow,
    outline,
    symbol,
    glass,
    valueText: text,
    setDimmed(dimmed = true) {
      glyph.setAlpha(dimmed ? 0.48 : 1);
    },
  };

  return glyph;
}

export function createStatBadges(scene, x, y, width, height, stats, depth = 0, options = {}) {
  const container = scene.add.container(x, y).setDepth(depth);
  const keys = ['attack', 'armor', 'health'];
  const {
    sizeScale = 1,
    fontScale = 1,
    spacingScale = 1,
    maxGroupWidthRatio = 0.86,
  } = options;
  const symbolSize = getStatBadgeSize(height, width, sizeScale);
  const fontSize = Math.max(11, Math.floor(symbolSize * 0.63 * fontScale));
  const groupWidth = Math.min(width * maxGroupWidthRatio, symbolSize * 4.45 * spacingScale);
  const slotWidth = groupWidth / 3;
  const statGlyphs = {};

  keys.forEach((key, index) => {
    const slotCenterX = -groupWidth / 2 + slotWidth * (index + 0.5);
    const statStyle = CARD_STAT_STYLES[key];
    const value = stats[key];
    const isKnown = value !== null && value !== undefined;
    const glyph = createStatGlyph(scene, slotCenterX, 0, symbolSize, key, value, statStyle, isKnown, fontSize);

    statGlyphs[key] = glyph.statFeedback;
    container.add(glyph);
  });

  container.statFeedback = statGlyphs;
  container.badgeMetrics = {
    size: symbolSize,
    groupWidth,
    slotWidth,
    topMargin: Math.max(4, Math.round(height * 0.09)),
  };

  return container;
}

export function createStatBar(...args) {
  return createStatBadges(...args);
}

export function createArtPlaceholder(scene, zone) {
  const container = scene.add.container(zone.centerX, zone.centerY);
  const back = scene.add.rectangle(0, 0, zone.width, zone.height, CARD_COLORS.artBottom, 0.95)
    .setStrokeStyle(1, 0x38bdf8, 0.16);
  const upper = scene.add.rectangle(0, -zone.height * 0.22, zone.width, zone.height * 0.56, CARD_COLORS.artTop, 0.72);
  const silhouette = scene.add.rectangle(0, zone.height * 0.04, zone.width * 0.48, zone.height * 0.62, 0x020617, 0.22)
    .setRotation(-0.08);
  const horizon = scene.add.rectangle(0, zone.height * 0.26, zone.width * 0.82, 1, 0x67e8f9, 0.18);
  container.add([back, upper, silhouette, horizon]);
  return container;
}

function getCardArtTextureKey(scene, card, { enableCardIllustration = false } = {}) {
  const explicitTextureKey = card?.artTextureKey ?? card?.artKey ?? card?.art?.textureKey ?? null;
  if (explicitTextureKey) return explicitTextureKey;

  return enableCardIllustration ? getLoadedCardIllustrationTextureKey(scene, card) : null;
}

export function createCardArtwork(scene, zone, card, options = {}) {
  const textureKey = getCardArtTextureKey(scene, card, options);
  if (textureKey && scene.textures?.exists?.(textureKey)) {
    const image = scene.add.image(zone.centerX, zone.centerY, textureKey);
    const texture = image.texture?.getSourceImage?.();
    const sourceWidth = texture?.width ?? image.width;
    const sourceHeight = texture?.height ?? image.height;
    const scale = Math.max(zone.width / Math.max(1, sourceWidth), zone.height / Math.max(1, sourceHeight));
    image.setDisplaySize(sourceWidth * scale, sourceHeight * scale);

    const cropWidth = Math.min(sourceWidth, zone.width / scale);
    const cropHeight = Math.min(sourceHeight, zone.height / scale);
    image.setCrop(
      Math.max(0, (sourceWidth - cropWidth) / 2),
      Math.max(0, (sourceHeight - cropHeight) / 2),
      cropWidth,
      cropHeight,
    );
    return image;
  }

  return createArtPlaceholder(scene, zone);
}

export function getCardDisplayContent(card, locale = 'en') {
  if (!card) {
    return { name: '', body: '', type: '' };
  }

  return {
    name: getCardDisplayName(card, locale) ?? '',
    body: typeof getCardTextShort(card, locale) === 'string' ? formatCardEffectTextShort(getCardTextShort(card, locale), locale).trim() : '',
    type: card?.type ? String(card.type).toUpperCase() : '',
  };
}

export function createCardPreviewView(scene, {
  card,
  cardId = null,
  x,
  y,
  width,
  height,
  accentColor = getDefaultCardAccentColor(card),
  depth = 0,
  locale = 'en',
  statBadgeScale = 1.1,
  typographyScale = 1,
  titleTypographyScale = typographyScale,
  bodyLineSpacing = 2,
  frameAlpha = card ? 0.84 : 0.48,
  enableCardIllustration = false,
} = {}) {
  const zones = getCardLayoutZones(width, height);
  const baseTypography = getCardTypography(width, height);
  const typography = {
    stat: Math.round(baseTypography.stat * typographyScale),
    name: Math.round(baseTypography.name * titleTypographyScale),
    type: Math.round(baseTypography.type * typographyScale),
    body: Math.round(baseTypography.body * typographyScale),
  };
  const content = getCardDisplayContent(card, locale);
  const stats = getCardStatValues(card);
  const root = scene.add.container(x, y).setDepth(depth);
  const glow = scene.add.rectangle(0, 0, width + 8, height + 8, 0xfacc15, 0)
    .setStrokeStyle(5, 0xfacc15, 0);
  const background = scene.add.rectangle(0, 0, width, height, CARD_COLORS.frame, frameAlpha)
    .setStrokeStyle(3, accentColor, card ? 0.82 : 0.7);
  const inner = scene.add.rectangle(0, 0, width - zones.pad * 0.9, height - zones.pad * 0.9, CARD_COLORS.innerPanel, 0.36)
    .setStrokeStyle(1, 0xffffff, 0.055);
  const statBadges = createStatBadges(
    scene,
    zones.statBadges.centerX,
    zones.statBadges.centerY,
    zones.statBadges.width,
    zones.statBadges.height,
    stats,
    0,
    {
      sizeScale: statBadgeScale,
      fontScale: typographyScale > 1 ? 1.06 : 1.1,
      maxGroupWidthRatio: 0.9,
      spacingScale: typographyScale > 1 ? 1.16 : 1.12,
    },
  );
  const art = createCardArtwork(scene, zones.art, card, { enableCardIllustration });
  const namePanel = scene.add.rectangle(zones.name.centerX, zones.name.centerY, zones.name.width, zones.name.height, CARD_COLORS.namePanel, 0.95)
    .setStrokeStyle(1, accentColor, card ? (typographyScale > 1 ? 0.52 : 0.44) : 0.14);
  const nameHorizontalInset = Math.max(10, zones.pad * (typographyScale > 1 ? 1.45 : 1.32));
  const nameText = scene.add.text(zones.name.centerX, zones.name.centerY, content.name || '—', {
    fontFamily: 'Arial, sans-serif',
    fontSize: `${typography.name}px`,
    color: card ? CARD_COLORS.ivoryText : CARD_COLORS.mutedText,
    fontStyle: 'bold',
    align: 'center',
    lineSpacing: Math.max(1, Math.round(typography.name * 0.08)),
    wordWrap: { width: zones.name.width - nameHorizontalInset },
  }).setOrigin(0.5);
  const minNameFontSize = Math.max(9, typography.name - (typographyScale > 1 ? 4 : 3));
  const maxNameHeight = zones.name.height - Math.max(4, zones.gap * 1.5);
  while (nameText.height > maxNameHeight && Number.parseFloat(nameText.style.fontSize) > minNameFontSize) {
    nameText.setFontSize(Number.parseFloat(nameText.style.fontSize) - 1);
  }
  const textPanel = scene.add.rectangle(zones.text.centerX, zones.text.centerY, zones.text.width, zones.text.height, CARD_COLORS.textPanel, 0.91)
    .setStrokeStyle(1, 0x94a3b8, typographyScale > 1 ? 0.24 : 0.2);
  const bodyTopPadding = Math.max(5, zones.text.height * (typographyScale > 1 ? 0.11 : 0.1));
  const bodyBottomPadding = Math.max(5, zones.text.height * (typographyScale > 1 ? 0.1 : 0.09));
  const bodyText = createInlineStatText(scene, zones.text.centerX, zones.text.y + bodyTopPadding, content.body, {
    fontFamily: 'Arial, sans-serif',
    fontSize: typography.body,
    minFontSize: Math.max(8, typography.body - 2),
    color: card ? '#cfe7ff' : CARD_COLORS.mutedText,
    align: 'center',
    lineSpacing: bodyLineSpacing,
    maxWidth: zones.text.width - Math.max(14, zones.pad * (typographyScale > 1 ? 2.0 : 1.5)),
    maxHeight: zones.text.height - bodyTopPadding - bodyBottomPadding,
  });
  const dividers = [zones.art.y - zones.gap / 2, zones.name.y - zones.gap / 2, zones.text.y - zones.gap / 2]
    .map((dividerY) => scene.add.rectangle(0, dividerY, zones.outer.width - zones.pad * 2.15, 1, CARD_COLORS.divider, 0.22));
  const selectionOutline = scene.add.rectangle(0, 0, width + 3, height + 3, 0xfacc15, 0)
    .setStrokeStyle(0, 0xfacc15, 0);

  root.add([glow, background, inner, statBadges, art, namePanel, nameText, textPanel, bodyText, ...dividers, selectionOutline]);

  return {
    cardId,
    root,
    glow,
    background,
    label: nameText,
    nameText,
    bodyText,
    selectionOutline,
    statBar: statBadges,
    statBadges,
    art,
    baseX: x,
    baseY: y,
    labelBaseX: x,
    labelBaseY: y,
    baseDepth: depth,
    baseFontSize: typography.name,
  };
}
