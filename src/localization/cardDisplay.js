import { translate } from './localeService.js';

const STAT_LABELS_EN = Object.freeze({
  attack: 'ATK',
  atk: 'ATK',
  hp: 'HP',
  health: 'HP',
  armor: 'ARM',
  arm: 'ARM',
});

function translateCardField(key, locale, fallbackValue) {
  if (typeof key !== 'string' || key.length === 0) {
    return fallbackValue;
  }

  return translate(key, locale, fallbackValue);
}

export function getCardDisplayName(card, locale = 'en') {
  return translateCardField(card?.nameKey, locale, card?.name);
}

export function getCardTextShort(card, locale = 'en') {
  return translateCardField(card?.textKey, locale, card?.textShort);
}

export function getCardTypeLabel(card, locale = 'en') {
  return card?.type === 'effect'
    ? translate('cardTypes.effect', locale, 'Effect')
    : translate('cardTypes.unit', locale, 'Unit');
}

export function getStatLabel(statKey, locale = 'en') {
  return translate(`stats.${statKey}`, locale, STAT_LABELS_EN[statKey] ?? statKey);
}
