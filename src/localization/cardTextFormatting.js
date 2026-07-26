export const CARD_EFFECT_STAT_SYMBOLS = Object.freeze({
  attack: '▲',
  armor: '◆',
  health: '●',
});

export const CARD_EFFECT_GAMEPLAY_SYMBOLS = Object.freeze({
  ally: '♙',
  allies: '♙♙',
  enemy: '♟',
  enemies: '♟♟',
});

// Matches the visual colors used by card stat badges and lightweight gameplay
// glyphs. Kept with the plain-text formatter so rich inline rendering can
// reuse the same symbol metadata.
export const CARD_EFFECT_STAT_SYMBOL_STYLES = Object.freeze({
  attack: Object.freeze({ symbol: CARD_EFFECT_STAT_SYMBOLS.attack, color: '#24c6a7' }),
  armor: Object.freeze({ symbol: CARD_EFFECT_STAT_SYMBOLS.armor, color: '#3d63c7' }),
  health: Object.freeze({ symbol: CARD_EFFECT_STAT_SYMBOLS.health, color: '#d24b5f' }),
});

export const CARD_EFFECT_CANONICAL_MARKERS = Object.freeze({
  '[ATK]': CARD_EFFECT_STAT_SYMBOLS.attack,
  '[ARM]': CARD_EFFECT_STAT_SYMBOLS.armor,
  '[HP]': CARD_EFFECT_STAT_SYMBOLS.health,
  '[ALLY]': CARD_EFFECT_GAMEPLAY_SYMBOLS.ally,
  '[ALLIES]': CARD_EFFECT_GAMEPLAY_SYMBOLS.allies,
  '[ALLY_ICON]': CARD_EFFECT_GAMEPLAY_SYMBOLS.ally,
  '[ENEMY]': CARD_EFFECT_GAMEPLAY_SYMBOLS.enemy,
  '[ENEMIES]': CARD_EFFECT_GAMEPLAY_SYMBOLS.enemies,
});

export function formatCardEffectTextShort(textShort) {
  if (typeof textShort !== 'string') {
    return textShort;
  }

  const canonicalText = Object.entries(CARD_EFFECT_CANONICAL_MARKERS).reduce(
    (formatted, [marker, symbol]) => formatted.replaceAll(marker, symbol),
    textShort,
  );
  return canonicalText
    .replace(/(^|[^\p{L}\p{N}_])ATK(?=$|[^\p{L}\p{N}_])/gu, `$1${CARD_EFFECT_STAT_SYMBOLS.attack}`)
    .replace(/(^|[^\p{L}\p{N}_])ARM(?=$|[^\p{L}\p{N}_])/gu, `$1${CARD_EFFECT_STAT_SYMBOLS.armor}`)
    .replace(/(^|[^\p{L}\p{N}_])HP(?=$|[^\p{L}\p{N}_])/gu, `$1${CARD_EFFECT_STAT_SYMBOLS.health}`);
}
