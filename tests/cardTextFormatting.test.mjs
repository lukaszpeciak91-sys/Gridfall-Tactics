import test from 'node:test';
import assert from 'node:assert/strict';

import { formatCardEffectTextShort } from '../src/localization/cardTextFormatting.js';
import { formatCardDetailLines } from '../src/rendering/cardRenderModes.js';
import { getFactionByKey } from '../src/data/factions/index.js';
import { getCardDisplayContent, getInlineStatSymbolColor, layoutInlineStatText, tokenizeInlineStatText } from '../src/rendering/cardVisualLayout.js';

test('formats English stat abbreviations in card effect text as compact symbols', () => {
  assert.equal(formatCardEffectTextShort('+1 ATK', 'en'), '+1 ▲');
  assert.equal(formatCardEffectTextShort('+1 ARM', 'en'), '+1 ◆');
  assert.equal(formatCardEffectTextShort('After attack: lose 1 HP.', 'en'), 'After attack: lose -1 ●.');
  assert.equal(
    formatCardEffectTextShort('Ally: heal 1, +1 ATK this turn. Draw if it kills.', 'en'),
    'Ally: heal +1 ●, +1 ▲ this turn. Draw if it kills.',
  );
});

test('formats localized Polish stat terms while preserving surrounding text', () => {
  assert.equal(formatCardEffectTextShort('Gdy uszkodzony: +1 ATK.', 'pl'), 'Gdy uszkodzony: +1 ▲.');
  assert.equal(formatCardEffectTextShort('Sojusznik +1 PANC do końca walki.', 'pl'), 'Sojusznik +1 ◆ do końca walki.');
  assert.equal(formatCardEffectTextShort('Wskrześ jednostkę z 1 HP.', 'pl'), 'Wskrześ jednostkę z 1 ●.');
  assert.equal(formatCardEffectTextShort('Po ataku: traci 1 HP.', 'pl'), 'Po ataku: traci -1 ●.');
  assert.equal(formatCardEffectTextShort('Zabije w walce i przetrwa: ulecz bohatera o 1.', 'pl'), 'Zabije w walce i przetrwa: ulecz bohatera o +1 ●.');
});


test('formats HP-related healing and damage language without replacing unrelated numbers', () => {
  assert.equal(formatCardEffectTextShort('Combat kill and survive: heal hero 1.', 'en'), 'Combat kill and survive: heal hero +1 ●.');
  assert.equal(formatCardEffectTextShort('Combat death: both heroes take 1.', 'en'), 'Combat death: both heroes take 1 ●.');
  assert.equal(formatCardEffectTextShort('On death: enemy hero takes 1.', 'en'), 'On death: enemy hero takes 1 ●.');
  assert.equal(formatCardEffectTextShort('Heal all allies 1.', 'en'), 'Heal all allies +1 ●.');
  assert.equal(formatCardEffectTextShort('First 2 ally combat deaths deal 1 to opposing enemy.', 'en'), 'First 2 ally combat deaths deal 1 ● to opposing enemy.');
  assert.equal(formatCardEffectTextShort('Destroy ally. Draw 1.', 'en'), 'Destroy ally. Draw 1.');
  assert.equal(formatCardEffectTextShort('Combat death: summon 1/1 here.', 'en'), 'Combat death: summon 1/1 here.');
  assert.equal(formatCardEffectTextShort('Śmierć w walce: obaj bohaterowie otrzymują 1.', 'pl'), 'Śmierć w walce: obaj bohaterowie otrzymują 1 ●.');
  assert.equal(formatCardEffectTextShort('Po śmierci: wrogi bohater otrzymuje 1.', 'pl'), 'Po śmierci: wrogi bohater otrzymuje 1 ●.');
  assert.equal(formatCardEffectTextShort('Celowany wróg atakuje własnego bohatera w następnej walce, potem otrzymuje 1 obrażenie.', 'pl'), 'Celowany wróg atakuje własnego bohatera w następnej walce, potem otrzymuje 1 ●.');
  assert.equal(formatCardEffectTextShort('Pierwsze 2 śmierci sojuszników w walce: 1 wrogowi naprzeciw.', 'pl'), 'Pierwsze 2 śmierci sojuszników w walce: 1 ● wrogowi naprzeciw.');
  assert.equal(formatCardEffectTextShort('Zniszcz sojusznika. Dobierz 1.', 'pl'), 'Zniszcz sojusznika. Dobierz 1.');
  assert.equal(formatCardEffectTextShort('Śmierć w walce: przyzwij tutaj 1/1.', 'pl'), 'Śmierć w walce: przyzwij tutaj 1/1.');
});


test('formats HP symbols for localized Attrition Swarm card effect display text', () => {
  const { deck } = getFactionByKey('Attrition Swarm');
  const cardById = (id) => deck.find((card) => card.id === id);

  assert.equal(getCardDisplayContent(cardById('attrition_swarm_leech_1'), 'en').body, 'Combat kill and survive: heal hero +1 ●.');
  assert.equal(getCardDisplayContent(cardById('attrition_swarm_leech_1'), 'pl').body, 'Zabije w walce i przetrwa: ulecz bohatera o +1 ●.');
  assert.equal(getCardDisplayContent(cardById('attrition_swarm_abomination_1'), 'en').body, 'Combat death: both heroes take 1 ●.');
  assert.equal(getCardDisplayContent(cardById('attrition_swarm_abomination_1'), 'pl').body, 'Śmierć w walce: obaj bohaterowie otrzymują 1 ●.');
  assert.equal(getCardDisplayContent(cardById('attrition_swarm_funeral_pyre_1'), 'en').body, 'First 2 ally combat deaths deal 1 ● to opposing enemy.');
  assert.equal(getCardDisplayContent(cardById('attrition_swarm_funeral_pyre_1'), 'pl').body, 'Pierwsze 2 śmierci sojuszników w walce: 1 ● wrogowi naprzeciw.');
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

  assert.equal(formatCardDetailLines(card, 'en').at(-1), 'Ally: heal +1 ●, +1 ▲ this turn.');
});


test('inline stat text renderer maps compact symbols to top badge colors', () => {
  assert.equal(getInlineStatSymbolColor('▲'), '#24c6a7');
  assert.equal(getInlineStatSymbolColor('◆'), '#3d63c7');
  assert.equal(getInlineStatSymbolColor('●'), '#d24b5f');
  assert.equal(getInlineStatSymbolColor('x'), null);
});

test('inline stat text tokenizer preserves localized copy while tagging stat symbols', () => {
  assert.deepEqual(tokenizeInlineStatText('Sojusznik +1 ◆ i 1 ●.').filter((token) => token.type !== 'space'), [
    { type: 'text', text: 'Sojusznik' },
    { type: 'text', text: '+1' },
    { type: 'statSymbol', text: '◆' },
    { type: 'text', text: 'i' },
    { type: 'text', text: '1' },
    { type: 'statSymbol', text: '●' },
    { type: 'text', text: '.' },
  ]);
});

test('inline stat text layout wraps by measured token width and keeps stat symbols inline', () => {
  const lines = layoutInlineStatText('Ally +1 ▲ this turn.', {
    maxWidth: 10,
    measureTokenWidth: (token) => token.length,
  });

  assert.deepEqual(lines.map((line) => line.segments.map((segment) => segment.text).join('')), [
    'Ally+1▲',
    'thisturn.',
  ]);
  assert.equal(lines[0].segments.at(-1).type, 'statSymbol');
});
