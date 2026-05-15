import { getStatLabel } from './cardDisplay.js';

export const CARD_EFFECT_STAT_SYMBOLS = Object.freeze({
  attack: '▲',
  armor: '◆',
  health: '●',
});

export const CARD_EFFECT_GAMEPLAY_SYMBOLS = Object.freeze({
  ally: '♙',
});

// Matches the visual colors used by card stat badges and lightweight gameplay
// glyphs. Kept with the plain-text formatter so rich inline rendering can
// reuse the same symbol metadata.
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

const HEALTH_SYMBOL = CARD_EFFECT_STAT_SYMBOLS.health;
const ALLY_SYMBOL = CARD_EFFECT_GAMEPLAY_SYMBOLS.ally;

const ALLY_ICON_MARKER_PATTERN = /\[(?:ALLY|ALLIES|ALLY_ICON)\]/giu;

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

function signedHealthAmount(amount, sign = '') {
  return `${sign}${amount} ${HEALTH_SYMBOL}`;
}

function formatEnglishHealthEffectPhrases(text) {
  return text
    .replace(/\b(heal(?:s)?(?:\s+(?:the\s+)?(?:(?:all|friendly)\s+)?(?:hero|heroes|ally|allies|unit|units|self|it|target))?\s+)(\d+)(?!\s*●)\b/giu, (match, prefix, amount) => `${prefix}${signedHealthAmount(amount, '+')}`)
    .replace(/\b(gain(?:s)?\s+)(\d+)\s+HP\b(?!\s*●)/giu, (match, prefix, amount) => `${prefix}${signedHealthAmount(amount, '+')}`)
    .replace(/\b(lose(?:s)?\s+)(\d+)\s+HP\b(?!\s*●)/giu, (match, prefix, amount) => `${prefix}${signedHealthAmount(amount)}`)
    .replace(/\b((?:(?:both|all)\s+)?(?:(?:enemy|friendly|opposing|allied)\s+)?(?:hero|heroes)\s+take(?:s)?\s+)(\d+)(?!\s*●)\b/giu, (match, prefix, amount) => `${prefix}${signedHealthAmount(amount)}`)
    .replace(/\b(take(?:s)?\s+)(\d+)\s+damage\b(?!\s*●)/giu, (match, prefix, amount) => `${prefix}${signedHealthAmount(amount)}`)
    .replace(/\b(deal(?:s)?\s+)(\d+)(\s+to\s+(?:(?:the|an|a)\s+)?(?:opposing\s+)?(?:enemy|enemies|hero|heroes|unit|units|ally|allies)\b)(?!\s*●)/giu, (match, prefix, amount, suffix) => `${prefix}${signedHealthAmount(amount)}${suffix}`);
}

function formatPolishHealthEffectPhrases(text) {
  return text
    .replace(/\b(ulecz\s+)(\d+)(?!\s*●)\b/giu, (match, prefix, amount) => `${prefix}${signedHealthAmount(amount, '+')}`)
    .replace(/\b(ulecz\b[^.,;:!?]*?\bo\s+)(\d+)(?!\s*●)\b/giu, (match, prefix, amount) => `${prefix}${signedHealthAmount(amount, '+')}`)
    .replace(/\b((?:traci|tracą)\s+)(\d+)\s+HP\b(?!\s*●)/giu, (match, prefix, amount) => `${prefix}${signedHealthAmount(amount)}`)
    .replace(/\b((?:(?:obaj|wszyscy)\s+)?(?:(?:wrogi|własny|przeciwny|sojuszniczy)\s+)?bohater(?:owie)?\s+otrzymuj(?:e|ą)\s+)(\d+)(?!\s*●)\b/giu, (match, prefix, amount) => `${prefix}${signedHealthAmount(amount)}`)
    .replace(/\b((?:zadaj|zadaje|zadają)\s+)(\d+)\s+(?:obrażeń|obrażenia|obrażenie|obr\.)\b(?!\s*●)/giu, (match, prefix, amount) => `${prefix}${signedHealthAmount(amount)}`)
    .replace(/\b((?:zadaj|zadaje|zadają)\s+)(\d+)(\s+(?:wrogowi|wrogom|bohaterowi|bohaterom|jednostce|jednostkom)\b)(?!\s*●)/giu, (match, prefix, amount, suffix) => `${prefix}${signedHealthAmount(amount)}${suffix}`)
    .replace(/([:;]\s*)(\d+)(\s+(?:wrogowi|wrogom|bohaterowi|bohaterom|jednostce|jednostkom)\b)(?!\s*●)/giu, (match, prefix, amount, suffix) => `${prefix}${signedHealthAmount(amount)}${suffix}`)
    .replace(/\b(\d+)\s+(obrażeń|obrażenia|obrażenie|obr\.)\b(?!\s*●)/giu, (match, amount) => signedHealthAmount(amount));
}

function formatHealthEffectPhrases(text, locale) {
  return locale === 'pl'
    ? formatPolishHealthEffectPhrases(text)
    : formatEnglishHealthEffectPhrases(text);
}

function formatGameplayIconMarkers(text) {
  return text.replace(ALLY_ICON_MARKER_PATTERN, ALLY_SYMBOL);
}

export function formatCardEffectTextShort(textShort, locale = 'en') {
  if (typeof textShort !== 'string') {
    return textShort;
  }

  const healthFormattedText = formatHealthEffectPhrases(textShort, locale);
  const gameplayIconFormattedText = formatGameplayIconMarkers(healthFormattedText);

  return [
    ['attack', CARD_EFFECT_STAT_SYMBOLS.attack],
    ['armor', CARD_EFFECT_STAT_SYMBOLS.armor],
    ['health', CARD_EFFECT_STAT_SYMBOLS.health],
  ].reduce((formatted, [statKey, symbol]) => replaceStatTerms(formatted, getLocalizedStatTerms(statKey, locale), symbol), gameplayIconFormattedText);
}
