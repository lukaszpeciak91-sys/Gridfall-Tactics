import assert from 'node:assert/strict';
import test from 'node:test';
import en from '../src/localization/translations/en.json' with { type: 'json' };
import pl from '../src/localization/translations/pl.json' with { type: 'json' };
import uk from '../src/localization/translations/uk.json' with { type: 'json' };
import { factionPresentation, getFactionPresentationLore, getFactionPresentationName } from '../src/data/presentation/factionPresentation.js';
import { TUTORIAL_STEPS } from '../src/data/tutorial/tutorialSteps.js';
import { tutorialEnemyFaction, tutorialPlayerFaction } from '../src/data/tutorial/tutorialDecks.js';
import { ACHIEVEMENT_CATEGORY_LABELS, getAchievementDefinitions } from '../src/systems/achievements.js';
import { getCardDisplayName } from '../src/localization/cardDisplay.js';
import { getCardDisplayContent } from '../src/rendering/cardVisualLayout.js';
import { getSupportedLocales, resolveLocalizedValue } from '../src/localization/localeService.js';
import { findUnsupportedLocaleReferences, validateLocalizationDictionary } from '../src/localization/localizationValidation.js';

const LEGACY_PARITY_EXCEPTIONS = [
  'diagnostics.englishFallbackOnly',
  'cards.aggro_quick_fix_1.textShort',
  'cards.attrition_swarm_infect_1.textShort',
  'cards.tank_guardian_1.textShort',
  'cards.wardens_spearwall_1.textShort',
];

test('registered dictionaries preserve keys, placeholders, markers, and explicit newlines', () => {
  assert.deepEqual(validateLocalizationDictionary(en, uk), []);
  assert.deepEqual(validateLocalizationDictionary(en, pl, { ignoredPaths: LEGACY_PARITY_EXCEPTIONS }), []);
});

test('embedded localization maps only reference supported locales', () => {
  const supported = getSupportedLocales();
  const embedded = {
    factionPresentation,
    tutorialSteps: TUTORIAL_STEPS,
    tutorialDecks: { tutorialPlayerFaction, tutorialEnemyFaction },
    achievementCategories: ACHIEVEMENT_CATEGORY_LABELS,
    achievements: getAchievementDefinitions(),
  };
  assert.deepEqual(findUnsupportedLocaleReferences(embedded, supported), []);
});

test('generic localized values use the requested locale and English fallback', () => {
  assert.equal(resolveLocalizedValue({ en: 'English', pl: 'Polski' }, 'pl'), 'Polski');
  assert.equal(resolveLocalizedValue({ en: 'English', pl: 'Polski' }, 'uk'), 'English');
  assert.equal(getFactionPresentationName('aggro', 'uk'), getFactionPresentationName('aggro', 'en'));
  assert.deepEqual(getFactionPresentationLore('aggro', 'uk'), getFactionPresentationLore('aggro', 'en'));
  assert.equal(resolveLocalizedValue(TUTORIAL_STEPS[0].text, 'uk'), TUTORIAL_STEPS[0].text.en);
});

test('tutorial cards and canonical card markers fall back without locale branches', () => {
  const tutorialCard = tutorialPlayerFaction.deck[0];
  assert.equal(getCardDisplayName(tutorialCard, 'pl'), tutorialCard.localizedName.pl);
  assert.equal(getCardDisplayName(tutorialCard, 'uk'), tutorialCard.localizedName.en);
  const card = { id: 'canonical', name: 'Canonical', type: 'order', textShort: '[ALLIES] +1 [ATK]\n[ENEMY] loses 1 [HP]' };
  assert.equal(getCardDisplayContent(card, 'uk').body, '♙♙ +1 ▲\n♟ loses 1 ●');
});
