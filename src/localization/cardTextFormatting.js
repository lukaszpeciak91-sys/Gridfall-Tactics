import { getStatLabel } from './cardDisplay.js';

export const CARD_EFFECT_STAT_SYMBOLS = Object.freeze({
  attack: '▲',
  armor: '◆',
  health: '●',
});

// Matches the visual colors used by card stat badges. Kept with the plain-text
// formatter so future rich inline rendering can reuse the same symbol metadata.
export const CARD_EFFECT_STAT_SYMBOL_STYLES = Object.freeze({
  attack: Object.freeze({ symbol: CARD_EFFECT_STAT_SYMBOLS.attack, color: '#24c6a7' }),
  armor: Object.freeze({ symbol: CARD_EFFECT_STAT_SYMBOLS.armor, color: '#3d63c7' }),
  health: Object.freeze({ symbol: CARD_EFFECT_STAT_SYMBOLS.health, color: '#d24b5f' }),
});

const STAT_TERM_ALIASES = Object.freeze({
  attack: Object.freeze(['ATK']),
  armor: Object.freeze(['ARM', 'armor', 'PANC', 'pancerz', 'pancerza']),
  health: Object.freeze(['HP']),
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function uniqueTerms(terms) {
  return [...new Set(terms.filter((term) => typeof term === 'string' && term.trim().length > 0))];
}

function getLocalizedStatTerms(statKey, locale) {
  const labelKeys = statKey === 'health' ? ['hp', 'health'] : [statKey];
  const localizedLabels = labelKeys.map((labelKey) => getStatLabel(labelKey, locale));
  return uniqueTerms([...localizedLabels, ...(STAT_TERM_ALIASES[statKey] ?? [])]);
}

function replaceStatTerms(text, terms, symbol) {
  if (!terms.length) return text;
  const pattern = terms
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');
  const statTermPattern = new RegExp(`(^|[^\\p{L}\\p{N}_])(${pattern})(?=$|[^\\p{L}\\p{N}_])`, 'giu');
  return text.replace(statTermPattern, (match, prefix) => `${prefix}${symbol}`);
}

export function formatCardEffectTextShort(textShort, locale = 'en') {
  if (typeof textShort !== 'string') {
    return textShort;
  }

  return [
    ['attack', CARD_EFFECT_STAT_SYMBOLS.attack],
    ['armor', CARD_EFFECT_STAT_SYMBOLS.armor],
    ['health', CARD_EFFECT_STAT_SYMBOLS.health],
  ].reduce((formatted, [statKey, symbol]) => replaceStatTerms(formatted, getLocalizedStatTerms(statKey, locale), symbol), textShort);
}
