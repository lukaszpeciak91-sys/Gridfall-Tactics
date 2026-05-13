import test from 'node:test';
import assert from 'node:assert/strict';

import { formatCardEffectTextShort } from '../src/localization/cardTextFormatting.js';
import { formatCardDetailLines } from '../src/rendering/cardRenderModes.js';
import { getCardDisplayContent } from '../src/rendering/cardVisualLayout.js';

test('formats English stat abbreviations in card effect text as compact symbols', () => {
  assert.equal(formatCardEffectTextShort('+1 ATK', 'en'), '+1 ▲');
  assert.equal(formatCardEffectTextShort('+1 ARM', 'en'), '+1 ◆');
  assert.equal(formatCardEffectTextShort('After attack: lose 1 HP.', 'en'), 'After attack: lose 1 ●.');
  assert.equal(
    formatCardEffectTextShort('Ally: heal 1, +1 ATK this turn. Draw if it kills.', 'en'),
    'Ally: heal 1, +1 ▲ this turn. Draw if it kills.',
  );
});

test('formats localized Polish stat terms while preserving surrounding text', () => {
  assert.equal(formatCardEffectTextShort('Gdy uszkodzony: +1 ATK.', 'pl'), 'Gdy uszkodzony: +1 ▲.');
  assert.equal(formatCardEffectTextShort('Sojusznik +1 PANC do końca walki.', 'pl'), 'Sojusznik +1 ◆ do końca walki.');
  assert.equal(formatCardEffectTextShort('Wskrześ jednostkę z 1 HP.', 'pl'), 'Wskrześ jednostkę z 1 ●.');
});

test('does not mutate source card data when formatting visual card content', () => {
  const card = {
    id: 'example_card',
    name: 'Example',
    type: 'order',
    textShort: 'Target ally +1 ARM until combat ends.',
  };

  const content = getCardDisplayContent(card, 'en');

  assert.equal(content.body, 'Target ally +1 ◆ until combat ends.');
  assert.equal(card.textShort, 'Target ally +1 ARM until combat ends.');
});

test('detail text uses the same compact formatter as card textShort display', () => {
  const card = {
    id: 'detail_card',
    name: 'Detail',
    type: 'order',
    targeting: 'friendly-unit',
    textShort: 'Ally: heal 1, +1 ATK this turn.',
  };

  assert.equal(formatCardDetailLines(card, 'en').at(-1), 'Ally: heal 1, +1 ▲ this turn.');
});
