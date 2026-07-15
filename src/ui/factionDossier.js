import { translate } from '../localization/localeService.js';
import { FACTION_CARD_DETAILS } from './factionCards.js';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function getFactionDossierViewModel(factionKey, locale = 'en') {
  const details = FACTION_CARD_DETAILS[factionKey];
  if (!details) {
    return null;
  }

  const description = translate(`ui.factionSelect.descriptions.${factionKey}`, locale, details.description ?? '');
  const tags = Array.isArray(details.tags) ? details.tags.filter(isNonEmptyString) : [];
  const hasDescription = isNonEmptyString(description);
  if (!hasDescription && tags.length === 0) {
    return null;
  }

  return {
    title: translate('ui.collection.factionDossier.title', locale, locale === 'pl' ? 'Akta frakcji' : 'Faction dossier'),
    description: hasDescription ? description : '',
    tags,
  };
}
