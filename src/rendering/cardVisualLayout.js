import { getCardDisplayName, getCardTextShort } from '../localization/cardDisplay.js';
import { formatCardEffectTextShort } from '../localization/cardTextFormatting.js';

export const CARD_ZONE_RATIOS = Object.freeze({
  statBadges: 0.13,
  art: 0.535,
  name: 0.115,
  text: 0.22,
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

const CARD_STAT_SYMBOL_KEYS = Object.freeze({
  '▲': 'attack',
  '◆': 'armor',
  '●': 'health',
});

function colorNumberToCss(color) {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export function getInlineStatSymbolColor(symbol) {
  const statKey = CARD_STAT_SYMBOL_KEYS[symbol];
  return statKey ? colorNumberToCss(CARD_STAT_STYLES[statKey].color) : null;
}

export function tokenizeInlineStatText(text) {
  if (typeof text !== 'string' || text.length === 0) return [];
  return text
    .split(/(▲|◆|●|\n|\s+)/u)
    .filter((token) => token.length > 0)
    .map((token) => {
      if (token === '\n') return { type: 'newline', text: token };
      if (/^\s+$/u.test(token)) return { type: 'space', text: token };
      return {
        type: getInlineStatSymbolColor(token) ? 'statSymbol' : 'text',
        text: token,
      };
    });
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

    const nextX = currentWidth + pendingSpaceWidth;
    if (currentLine.length > 0 && nextX + width > maxWidth) {
      pushLine();
    }

    const segmentX = currentLine.length > 0 ? currentWidth + pendingSpaceWidth : 0;
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
  color = CARD_COLORS.bodyText,
  statFontStyle = 'bold',
  align = 'center',
  maxWidth = 160,
  lineSpacing = 0,
} = {}) {
  const container = scene.add.container(x, y);
  const baseStyle = {
    fontFamily,
    fontSize: `${fontSize}px`,
    color,
  };
  const measureText = scene.add.text(0, 0, '', baseStyle).setVisible(false);
  const measureTokenWidth = (value) => {
    measureText.setText(value);
    return measureText.width;
  };
  const lines = layoutInlineStatText(text, { maxWidth, measureTokenWidth });
  const lineHeight = Math.ceil(fontSize * 1.12) + lineSpacing;

  lines.forEach((line, lineIndex) => {
    const startX = align === 'center' ? -line.width / 2 : 0;
    const baselineY = lineIndex * lineHeight;
    line.segments.forEach((segment) => {
      const statColor = getInlineStatSymbolColor(segment.text);
      const segmentText = scene.add.text(startX + segment.x, baselineY, segment.text, {
        ...baseStyle,
        color: statColor ?? color,
        fontStyle: statColor ? statFontStyle : undefined,
      }).setOrigin(0, 0);
      container.add(segmentText);
    });
  });

  measureText.destroy();
  container.inlineTextMetrics = {
    lineCount: lines.length,
    width: Math.max(0, ...lines.map((line) => line.width)),
    height: Math.max(fontSize, lines.length * lineHeight - lineSpacing),
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
    stat: Math.max(10, Math.floor(width * 0.108)),
    name: Math.max(10, Math.floor(width * 0.102)),
    type: Math.max(8, Math.floor(width * 0.065)),
    body: Math.max(9, Math.floor(width * 0.076)),
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


function getStatBadgeSize(height, width) {
  return Math.max(18, Math.min(24, height * 0.9, width * 0.2));
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
    color: isKnown ? CARD_COLORS.ivoryText : '#94a3b8',
    fontStyle: 'bold',
    align: 'center',
    fixedWidth: Math.ceil(size * 0.95),
    fixedHeight: Math.ceil(size * 0.76),
  }).setOrigin(0.5);

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

export function createStatBadges(scene, x, y, width, height, stats, depth = 0) {
  const container = scene.add.container(x, y).setDepth(depth);
  const keys = ['attack', 'armor', 'health'];
  const symbolSize = getStatBadgeSize(height, width);
  const fontSize = Math.max(10, Math.floor(symbolSize * 0.54));
  const groupWidth = Math.min(width * 0.82, symbolSize * 4.15);
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
