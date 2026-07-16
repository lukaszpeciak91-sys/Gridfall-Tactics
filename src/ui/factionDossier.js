import { getFactionPresentationLoreBlurb } from '../data/presentation/factionPresentation.js';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function getFactionDossierViewModel(factionKey, locale = 'en') {
  const loreBlurb = getFactionPresentationLoreBlurb(factionKey, locale);
  if (!isNonEmptyString(loreBlurb)) {
    return null;
  }

  return {
    description: loreBlurb,
  };
}
