import { getCardDisplayName, getCardTextShort } from '../localization/cardDisplay.js';

export const CARD_ZONE_RATIOS = Object.freeze({
  statBar: 0.14,
  art: 0.54,
  name: 0.11,
  text: 0.21,
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
  attack: Object.freeze({ color: 0x2dd4bf, label: 'attack' }),
  armor: Object.freeze({ color: 0x3b82f6, label: 'armor' }),
  health: Object.freeze({ color: 0xef4444, label: 'health' }),
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
  const gap = Math.max(2, Math.round(height * 0.008));
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
    stat: Math.max(11, Math.floor(width * 0.13)),
    name: Math.max(10, Math.floor(width * 0.105)),
    type: Math.max(8, Math.floor(width * 0.065)),
    body: Math.max(9, Math.floor(width * 0.078)),
  };
}

export function drawStatSymbol(scene, x, y, size, statKey, color, alpha = 1) {
  if (statKey === 'attack') {
    return scene.add.triangle(x, y, 0, size * 0.48, size * 0.5, -size * 0.42, size, size * 0.48, color, alpha)
      .setOrigin(0.5);
  }

  if (statKey === 'armor') {
    return scene.add.rectangle(x, y, size * 0.78, size * 0.78, color, alpha)
      .setRotation(Math.PI / 4);
  }

  return scene.add.circle(x, y, size * 0.42, color, alpha);
}

export function createStatBar(scene, x, y, width, height, stats, depth = 0) {
  const container = scene.add.container(x, y).setDepth(depth);
  const slotWidth = width / 3;
  const symbolSize = Math.max(9, Math.min(height * 0.68, slotWidth * 0.3));
  const fontSize = Math.max(10, Math.floor(height * 0.54));
  const keys = ['attack', 'armor', 'health'];

  keys.forEach((key, index) => {
    const slotCenterX = -width / 2 + slotWidth * (index + 0.5);
    const statStyle = CARD_STAT_STYLES[key];
    const value = stats[key];
    const isKnown = value !== null && value !== undefined;
    const slot = scene.add.rectangle(slotCenterX, 0, slotWidth - 2, height, 0x020617, 0.34)
      .setStrokeStyle(1, statStyle.color, isKnown ? 0.24 : 0.12);
    const symbol = drawStatSymbol(scene, slotCenterX - slotWidth * 0.14, 0, symbolSize, key, statStyle.color, isKnown ? 0.95 : 0.25);
    const text = scene.add.text(slotCenterX + slotWidth * 0.18, 0, isKnown ? String(value) : '—', {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${fontSize}px`,
      color: isKnown ? CARD_COLORS.ivoryText : '#64748b',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);

    container.add([slot, symbol, text]);
  });

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
