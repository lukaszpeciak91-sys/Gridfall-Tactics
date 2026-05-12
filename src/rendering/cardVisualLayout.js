import { getCardDisplayName, getCardTextShort } from '../localization/cardDisplay.js';

export const CARD_ZONE_RATIOS = Object.freeze({
  statBar: 0.13,
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
  const statBarHeight = Math.round(innerHeight * CARD_ZONE_RATIOS.statBar);
  const nameHeight = Math.round(innerHeight * CARD_ZONE_RATIOS.name);
  const textHeight = Math.round(innerHeight * CARD_ZONE_RATIOS.text);
  const artHeight = Math.max(1, innerHeight - statBarHeight - nameHeight - textHeight - gap * 3);
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
    statBar: makeRect(statBarHeight),
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
    return scene.add.triangle(x, y, 0, size * 0.5, size * 0.5, -size * 0.45, size, size * 0.5, color, alpha)
      .setOrigin(0.5);
  }

  if (statKey === 'armor') {
    return scene.add.rectangle(x, y, size * 0.76, size * 0.76, color, alpha)
      .setRotation(Math.PI / 4);
  }

  return scene.add.circle(x, y, size * 0.43, color, alpha);
}

function getStatHitAreaSize(height, width) {
  return Math.max(18, Math.min(height * 0.86, width * 0.24));
}

function createStatGlyph(scene, x, y, size, key, value, style, isKnown, fontSize) {
  const glyph = scene.add.container(x, y);
  const valueText = isKnown ? String(value) : '–';
  const symbolAlpha = isKnown ? 0.96 : 0.24;
  const strokeAlpha = isKnown ? 0.58 : 0.18;
  const glow = drawStatSymbol(scene, 0, 0, size * 1.08, key, style.glow, isKnown ? 0.16 : 0.04);
  const shadow = drawStatSymbol(scene, 0, size * 0.045, size * 1.02, key, style.shadow, isKnown ? 0.42 : 0.14);
  const symbol = drawStatSymbol(scene, 0, 0, size, key, style.color, symbolAlpha);
  const glass = drawStatSymbol(scene, -size * 0.08, -size * 0.15, size * 0.5, key, 0xffffff, isKnown ? 0.12 : 0.03);
  const text = scene.add.text(0, key === 'attack' ? size * 0.055 : 0, valueText, {
    fontFamily: 'Arial, sans-serif',
    fontSize: `${fontSize}px`,
    color: isKnown ? CARD_COLORS.ivoryText : '#94a3b8',
    fontStyle: 'bold',
    align: 'center',
    fixedWidth: Math.ceil(size * 0.88),
    fixedHeight: Math.ceil(size * 0.72),
  }).setOrigin(0.5);

  if (symbol.setStrokeStyle) {
    symbol.setStrokeStyle(Math.max(1, Math.round(size * 0.055)), 0xffffff, strokeAlpha);
  }

  glyph.add([glow, shadow, symbol, glass, text]);
  glyph.statFeedback = {
    key,
    baseColor: style.color,
    glow,
    shadow,
    symbol,
    glass,
    valueText: text,
    setDimmed(dimmed = true) {
      glyph.setAlpha(dimmed ? 0.48 : 1);
    },
  };

  return glyph;
}

export function createStatBar(scene, x, y, width, height, stats, depth = 0) {
  const container = scene.add.container(x, y).setDepth(depth);
  const keys = ['attack', 'armor', 'health'];
  const stripWidth = Math.min(width, Math.max(width * 0.64, height * 4.2));
  const slotWidth = stripWidth / 3;
  const symbolSize = getStatHitAreaSize(height, width);
  const fontSize = Math.max(10, Math.floor(symbolSize * 0.52));
  const back = scene.add.rectangle(0, 0, stripWidth, height * 0.9, 0x020617, 0.52)
    .setStrokeStyle(1, 0x7dd3fc, 0.18);
  const spine = scene.add.rectangle(0, height * 0.32, stripWidth * 0.88, 1, 0xffffff, 0.06);
  const statGlyphs = {};

  keys.forEach((key, index) => {
    const slotCenterX = -stripWidth / 2 + slotWidth * (index + 0.5);
    const statStyle = CARD_STAT_STYLES[key];
    const value = stats[key];
    const isKnown = value !== null && value !== undefined;
    const slotGlow = scene.add.rectangle(slotCenterX, 0, slotWidth * 0.9, height * 0.72, statStyle.color, isKnown ? 0.045 : 0.015);
    const glyph = createStatGlyph(scene, slotCenterX, 0, symbolSize, key, value, statStyle, isKnown, fontSize);

    statGlyphs[key] = glyph.statFeedback;
    container.add([slotGlow, glyph]);

    if (index > 0) {
      const divider = scene.add.rectangle(slotCenterX - slotWidth / 2, 0, 1, height * 0.48, 0xffffff, 0.08);
      container.add(divider);
    }
  });

  container.addAt(back, 0);
  container.addAt(spine, 1);
  container.statFeedback = statGlyphs;

  return container;
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
    body: typeof getCardTextShort(card, locale) === 'string' ? getCardTextShort(card, locale).trim() : '',
    type: card?.type ? String(card.type).toUpperCase() : '',
  };
}
