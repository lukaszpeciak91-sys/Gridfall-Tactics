import {
  getCardDisplayName,
  getCardTextShort,
  getCardTypeLabel,
  getStatLabel,
} from '../localization/cardDisplay.js';

const UNKNOWN_CARD_LABEL = 'Unknown Card';

function isUnitCard(card) {
  return card?.type === 'unit' || (Number.isFinite(card?.attack) && Number.isFinite(card?.hp));
}

function getNumericStat(card, key, fallback = 0) {
  return Number.isFinite(card?.[key]) ? card[key] : fallback;
}

function compactUnitStats(card, locale = 'en') {
  if (!isUnitCard(card)) return null;
  const attack = getNumericStat(card, 'attack');
  const hp = getNumericStat(card, 'hp');
  const armor = getNumericStat(card, 'armor');
  return `${getStatLabel('attack', locale)} ${attack} / ${getStatLabel('hp', locale)} ${hp} / ${getStatLabel('armor', locale)} ${armor}`;
}

function shortTextLine(card, locale = 'en') {
  const textShort = getCardTextShort(card, locale);
  return typeof textShort === 'string' ? textShort.trim() : '';
}

export function formatHandCardLabel(card, locale = 'en') {
  if (!card) {
    return 'Empty';
  }

  const name = getCardDisplayName(card, locale) ?? '';
  const description = shortTextLine(card, locale);
  const hasUnitStats = card.type === 'unit';
  const attack = getNumericStat(card, 'attack');
  const hp = getNumericStat(card, 'hp');
  const armor = getNumericStat(card, 'armor');

  const statLine = hasUnitStats ? `${attack}/${hp} ${getStatLabel('armor', locale)} ${armor}` : '';
  const lines = [name];
  if (statLine) lines.push(statLine);
  if (description) lines.push(description);
  return lines.join('\n');
}

export function formatBoardUnitLabel(unit, locale = 'en') {
  if (!unit) {
    return '';
  }

  const name = getCardDisplayName(unit, locale) ?? 'Unit';
  const stats = compactUnitStats(unit, locale);
  return [name, stats].filter(Boolean).join('\n');
}

export function formatCollectionRowLabel(card, locale = 'en') {
  const name = getCardDisplayName(card, locale) ?? '';
  const type = card?.type ?? '';
  const stats = isUnitCard(card)
    ? `${getStatLabel('attack', locale)} ${card.attack ?? '-'} / ${getStatLabel('hp', locale)} ${card.hp ?? '-'}`
    : null;
  const textShort = getCardTextShort(card, locale) ?? '';

  return {
    name,
    typeStats: stats ? `${type} • ${stats}` : type,
    textShort,
  };
}

export function formatCardDetailLines(card, locale = 'en') {
  const name = getCardDisplayName(card, locale) ?? '';
  return [
    name,
    `Type: ${card?.type}`,
    ...(isUnitCard(card) ? [`ATK/HP: ${card.attack ?? '-'} / ${card.hp ?? '-'}`] : []),
    `targeting: ${card?.targeting ?? 'none'}`,
    `effectId: ${card?.effectId ?? 'none'}`,
    '',
    getCardTextShort(card, locale) ?? '',
  ];
}

export function formatDeckSummaryEntry(card, locale = 'en') {
  return {
    name: getCardDisplayName(card, locale) ?? UNKNOWN_CARD_LABEL,
    typeLabel: getCardTypeLabel(card, locale),
    count: Number.isFinite(card?.count) ? card.count : 1,
  };
}
