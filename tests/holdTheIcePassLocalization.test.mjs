import assert from 'node:assert/strict';
import test from 'node:test';
import en from '../src/localization/translations/en.json' with { type: 'json' };
import pl from '../src/localization/translations/pl.json' with { type: 'json' };
import uk from '../src/localization/translations/uk.json' with { type: 'json' };

const CARD_ID = 'wardens_hold_the_line_1';
const expectedByLocale = {
  pl: 'Sąsiadujący [ALLY] +1 [ARM] do walki',
  en: 'Neighboring [ALLY] +1 [ARM] until combat',
  uk: 'Сусідній [ALLY] +1 [ARM] до бою',
};

test('Hold the Ice Pass identifies a directly neighboring ally in every locale', () => {
  for (const [locale, dictionary] of Object.entries({ pl, en, uk })) {
    const textShort = dictionary.cards[CARD_ID].textShort;

    assert.equal(textShort, expectedByLocale[locale], `${locale} exact card effect copy`);
    assert.deepEqual(
      textShort.match(/\[[A-Z]+\]/gu),
      ['[ALLY]', '[ARM]'],
      `${locale} preserves the singular ally and armor placeholders`,
    );
    assert.doesNotMatch(textShort, /\r|\n/u, `${locale} remains on one explicit line`);
  }
});
