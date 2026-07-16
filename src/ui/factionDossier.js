import { getFactionPresentationLore } from '../data/presentation/factionPresentation.js';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function getFactionDossierViewModel(factionKey, locale = 'en') {
  const lore = getFactionPresentationLore(factionKey, locale);
  if (!lore || !isNonEmptyString(lore.dimension) || !isNonEmptyString(lore.body)) {
    return null;
  }

  return {
    dimension: lore.dimension,
    body: lore.body,
  };
}
