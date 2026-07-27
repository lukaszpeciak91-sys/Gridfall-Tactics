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

const UK_NEWLINE_PARITY_EXCEPTIONS = [
  'cards.attrition_swarm_rise_again_1.textShort',
  'cards.control_sniper_1.textShort',
  'cards.swarm_alpha_1.textShort',
  'cards.swarm_regrow_1.textShort',
];

test('registered dictionaries preserve keys, placeholders, markers, and explicit newlines', () => {
  assert.deepEqual(validateLocalizationDictionary(en, uk, { ignoredPaths: UK_NEWLINE_PARITY_EXCEPTIONS }), []);
  assert.deepEqual(validateLocalizationDictionary(en, pl, { ignoredPaths: LEGACY_PARITY_EXCEPTIONS }), []);
});

test('Ukrainian card copy keeps polished short names and compact priority rules', () => {
  assert.equal(uk.cards.overclock_gap_hunter_1.name, 'Баран-таран');
  assert.equal(uk.cards.overclock_mob_champion_1.name, 'Командна квочка');
  assert.equal(factionPresentation.overclock.cardNameOverrides.overclock_gap_hunter_1.name.uk, 'Баран-таран');
  assert.equal(factionPresentation.overclock.cardNameOverrides.overclock_mob_champion_1.name.uk, 'Командна квочка');

  const expectedRules = {
    overclock_gap_hunter_1: 'Якщо сусіднє поле вільне +1 [ATK]',
    overclock_mob_champion_1: '+1 [ATK] за кожного іншого [ALLY]',
    overclock_forced_march_1: 'Обмін із сусіднім [ALLY]\nЛінія б’ється зараз',
    attrition_swarm_rise_again_1: 'Повернути останнього полеглого [ALLY]\nз 1 [HP] у вільне поле',
    aggro_quick_fix_1: 'Зцілити [ALLY] на 1\n+1 [ATK] до бою\nВбив у бою добери 1',
    aggro_rush_1: 'Обмін із сусіднім [ALLY]\nЛінія б’ється зараз',
  };
  for (const [cardId, rules] of Object.entries(expectedRules)) {
    assert.equal(uk.cards[cardId].textShort, rules, cardId);
    assert.doesNotMatch(rules, /[,:;.!?]\[|\][,:;.!?]/u, `${cardId} must not put punctuation beside an icon marker`);
  }
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
  assert.equal(getFactionPresentationName('aggro', 'uk'), 'Порцеляновий двір');
  assert.equal(getFactionPresentationLore('aggro', 'uk').dimension, 'Вимір C-69');
  assert.match(resolveLocalizedValue(TUTORIAL_STEPS[0].text, 'uk'), /Ласкаво просимо/);
});

test('tutorial cards and canonical card markers fall back without locale branches', () => {
  const tutorialCard = tutorialPlayerFaction.deck[0];
  assert.equal(getCardDisplayName(tutorialCard, 'pl'), tutorialCard.localizedName.pl);
  assert.equal(getCardDisplayName(tutorialCard, 'uk'), tutorialCard.localizedName.uk);
  const card = { id: 'canonical', name: 'Canonical', type: 'order', textShort: '[ALLIES] +1 [ATK]\n[ENEMY] loses 1 [HP]' };
  assert.equal(getCardDisplayContent(card, 'uk').body, '♙♙ +1 ▲\n♟ loses 1 ●');
});
