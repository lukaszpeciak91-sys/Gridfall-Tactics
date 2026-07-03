import { getCardPresentationName } from '../data/presentation/factionPresentation.js';
import { translate } from './localeService.js';

const STAT_LABELS_EN = Object.freeze({
  attack: 'ATK',
  atk: 'ATK',
  hp: 'HP',
  health: 'HP',
  armor: 'ARM',
  arm: 'ARM',
});

const MISSING_CARD_FIELD = Symbol('missing-card-field');

function translateCardField(key, locale, fallbackValue) {
  if (typeof key !== 'string' || key.length === 0) {
    return fallbackValue;
  }

  const value = translate(key, locale, MISSING_CARD_FIELD);
  return value === MISSING_CARD_FIELD ? fallbackValue : value;
}

export function getCardDisplayName(card, locale = 'en') {
  const idNameKey = typeof card?.id === 'string' ? `cards.${card.id}.name` : null;
  const localizedFallbackName = locale === 'pl' && typeof card?.namePl === 'string' && card.namePl.length > 0
    ? card.namePl
    : card?.name;
  const keyedName = translateCardField(card?.nameKey, locale, undefined);
  const localizedName = keyedName ?? translateCardField(idNameKey, locale, localizedFallbackName);
  return getCardPresentationName({ ...card, name: localizedName }, locale);
}

export function getCardTextShort(card, locale = 'en') {
  const idTextKey = typeof card?.id === 'string' ? `cards.${card.id}.textShort` : null;
  const localizedFallbackText = locale === 'pl' && typeof card?.textShortPl === 'string'
    ? card.textShortPl
    : card?.textShort;
  const keyedText = translateCardField(card?.textKey, locale, undefined);
  return keyedText ?? translateCardField(idTextKey, locale, localizedFallbackText);
}

export function getCardTypeLabel(card, locale = 'en') {
  return card?.type && card.type !== 'unit'
    ? translate('cardTypes.effect', locale, 'Effect')
    : translate('cardTypes.unit', locale, 'Unit');
}

export function getStatLabel(statKey, locale = 'en') {
  return translate(`stats.${statKey}`, locale, STAT_LABELS_EN[statKey] ?? statKey);
}
