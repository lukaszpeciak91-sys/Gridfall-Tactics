const STAT_LABELS_EN = Object.freeze({
  attack: 'ATK',
  atk: 'ATK',
  hp: 'HP',
  health: 'HP',
  armor: 'ARM',
  arm: 'ARM',
});

export function getCardDisplayName(card, locale = 'en') {
  void locale;
  return card?.name;
}

export function getCardTextShort(card, locale = 'en') {
  void locale;
  return card?.textShort;
}

export function getCardTypeLabel(card, locale = 'en') {
  void locale;
  return card?.type === 'effect' ? 'Effect' : 'Unit';
}

export function getStatLabel(statKey, locale = 'en') {
  void locale;
  return STAT_LABELS_EN[statKey] ?? statKey;
}
