import test from 'node:test';
import assert from 'node:assert/strict';

import { CARD_EFFECT_GAMEPLAY_SYMBOLS, formatCardEffectTextShort } from '../src/localization/cardTextFormatting.js';
import { formatCardDetailLines } from '../src/rendering/cardRenderModes.js';
import { getFactionByKey } from '../src/data/factions/index.js';
import {
  getCardDisplayContent,
  getInlineGameplaySymbolColor,
  getInlineStatSymbolColor,
  INLINE_EFFECT_ICON_BASELINE_OFFSET_RATIO,
  INLINE_EFFECT_ICON_SPACE_SCALE,
  INLINE_EFFECT_ICON_STAT_FONT_SCALE,
  layoutInlineStatText,
  tokenizeInlineStatText,
} from '../src/rendering/cardVisualLayout.js';

test('formats English stat abbreviations in card effect text as compact symbols', () => {
  assert.equal(formatCardEffectTextShort('+1 ATK', 'en'), '+1 ▲');
  assert.equal(formatCardEffectTextShort('+1 ARM', 'en'), '+1 ◆');
  assert.equal(formatCardEffectTextShort('After attack: lose 1 HP.', 'en'), 'After attack: lose 1 ●.');
  assert.equal(
    formatCardEffectTextShort('Target [ALLY]: heal 1, +1 ATK this turn. Draw if it kills.', 'en'),
    'Target ♙: heal +1 ●, +1 ▲ this turn. Draw if it kills.',
  );
});


test('formats pilot ally icon markers without globally replacing ally terms', () => {
  assert.equal(CARD_EFFECT_GAMEPLAY_SYMBOLS.ally, '♙');
  assert.equal(CARD_EFFECT_GAMEPLAY_SYMBOLS.allies, '♙♙');
  assert.equal(formatCardEffectTextShort('Target [ALLY] +1 ARM until combat ends.', 'en'), 'Target ♙ +1 ◆ until combat ends.');
  assert.equal(formatCardEffectTextShort('All [ALLY] +1 ATK this turn.', 'en'), 'All ♙♙ +1 ▲ this turn.');
  assert.equal(formatCardEffectTextShort('Return [ALLY] to hand. Draw 1.', 'en'), 'Return ♙ to hand. Draw 1.');
  assert.equal(formatCardEffectTextShort('Wybrany [ALLY] +1 ARM do końca walki.', 'pl'), 'Wybrany ♙ +1 ◆ do końca walki.');
  assert.equal(formatCardEffectTextShort('Target ally +1 ARM until combat ends.', 'en'), 'Target ally +1 ◆ until combat ends.');
});

test('formats localized Polish stat terms while preserving surrounding text', () => {
  assert.equal(formatCardEffectTextShort('Gdy uszkodzony: +1 ATK.', 'pl'), 'Gdy uszkodzony: +1 ▲.');
  assert.equal(formatCardEffectTextShort('Sojusznik +1 PANC do końca walki.', 'pl'), 'Sojusznik +1 ◆ do końca walki.');
  assert.equal(formatCardEffectTextShort('Wskrześ jednostkę z 1 HP.', 'pl'), 'Wskrześ jednostkę z 1 ●.');
  assert.equal(formatCardEffectTextShort('Po ataku: traci 1 HP.', 'pl'), 'Po ataku: traci 1 ●.');
  assert.equal(formatCardEffectTextShort('Zabójstwo w walce i przetrwanie: ulecz swojego bohatera o 1.', 'pl'), 'Zabójstwo w walce i przetrwanie: ulecz swojego bohatera o +1 ●.');
});


test('formats HP-related healing and damage language without replacing unrelated numbers', () => {
  assert.equal(formatCardEffectTextShort('Combat kill and survive: heal your hero 1.', 'en'), 'Combat kill and survive: heal your hero +1 ●.');
  assert.equal(formatCardEffectTextShort('Combat death: both heroes lose 1 HP.', 'en'), 'Combat death: both heroes lose 1 ●.');
  assert.equal(formatCardEffectTextShort('On death: enemy hero loses 1 HP.', 'en'), 'On death: enemy hero loses 1 ●.');
  assert.equal(formatCardEffectTextShort('Heal all [ALLY] by 1.', 'en'), 'Heal all ♙♙ by +1 ●.');
  assert.equal(formatCardEffectTextShort('First 2 ally combat deaths: deal 1 to opposing enemy.', 'en'), 'First 2 ally combat deaths: deal 1 ● to opposing enemy.');
  assert.equal(formatCardEffectTextShort('Destroy [ALLY]. Draw 1.', 'en'), 'Destroy ♙. Draw 1.');
  assert.equal(formatCardEffectTextShort('Combat death: summon 1/1 here.', 'en'), 'Combat death: summon 1/1 here.');
  assert.equal(formatCardEffectTextShort('Śmierć w walce: obaj bohaterowie otrzymują 1.', 'pl'), 'Śmierć w walce: obaj bohaterowie otrzymują 1 ●.');
  assert.equal(formatCardEffectTextShort('Po śmierci: wrogi bohater otrzymuje 1.', 'pl'), 'Po śmierci: wrogi bohater otrzymuje 1 ●.');
  assert.equal(formatCardEffectTextShort('Celowany wróg atakuje własnego bohatera w następnej walce, potem otrzymuje 1 obrażenie.', 'pl'), 'Celowany wróg atakuje własnego bohatera w następnej walce, potem otrzymuje 1 ●.');
  assert.equal(formatCardEffectTextShort('Pierwsze 2 śmierci sojuszników w walce: 1 wrogowi naprzeciw.', 'pl'), 'Pierwsze 2 śmierci sojuszników w walce: 1 ● wrogowi naprzeciw.');
  assert.equal(formatCardEffectTextShort('Zniszcz [ALLY]. Dobierz 1.', 'pl'), 'Zniszcz ♙. Dobierz 1.');
  assert.equal(formatCardEffectTextShort('Śmierć w walce: przyzwij tutaj 1/1.', 'pl'), 'Śmierć w walce: przyzwij tutaj 1/1.');
});


test('formats HP symbols for localized Attrition Swarm card effect display text', () => {
  const { deck } = getFactionByKey('Attrition Swarm');
  const cardById = (id) => deck.find((card) => card.id === id);

  assert.equal(getCardDisplayContent(cardById('attrition_swarm_leech_1'), 'en').body, 'Combat kill and survive: heal your hero +1 ●.');
  assert.equal(getCardDisplayContent(cardById('attrition_swarm_leech_1'), 'pl').body, 'Zabójstwo w walce i przetrwanie: ulecz swojego bohatera o +1 ●.');
  assert.equal(getCardDisplayContent(cardById('attrition_swarm_abomination_1'), 'en').body, 'Combat death: both heroes lose 1 ●.');
  assert.equal(getCardDisplayContent(cardById('attrition_swarm_abomination_1'), 'pl').body, 'Śmierć w walce: obaj bohaterowie tracą 1 ●.');
  assert.equal(getCardDisplayContent(cardById('attrition_swarm_funeral_pyre_1'), 'en').body, 'First 2 ♙♙ combat deaths: deal 1 ● to opposed enemy.');
  assert.equal(getCardDisplayContent(cardById('attrition_swarm_funeral_pyre_1'), 'pl').body, 'Pierwsze 2 śmierci ♙♙ w walce: zadaj 1 ● wrogowi naprzeciw.');
});

test('pilot card display content renders ally icon markers', () => {
  const aggro = getFactionByKey('Aggro');
  const swarm = getFactionByKey('Swarm');
  const tank = getFactionByKey('Tank');
  const control = getFactionByKey('Control');
  const cardById = (faction, id) => faction.deck.find((card) => card.id === id);

  assert.equal(getCardDisplayContent(cardById(aggro, 'aggro_full_attack_1'), 'en').body, 'All ♙♙ +2 ▲ this turn.');
  assert.equal(getCardDisplayContent(cardById(aggro, 'aggro_scout_1'), 'en').body, 'On play: block this lane this turn.');
  assert.equal(getCardDisplayContent(cardById(aggro, 'aggro_rush_1'), 'en').body, 'Swap with adjacent ♙. Fight immediately.');
  assert.equal(getCardDisplayContent(cardById(aggro, 'aggro_adrenaline_1'), 'en').body, 'Target ♙ fights immediately.');
  assert.equal(getCardDisplayContent(cardById(swarm, 'swarm_grunt_1'), 'en').body, '');
  assert.equal(getCardDisplayContent(cardById(swarm, 'swarm_rusher_1'), 'en').body, '');
  assert.equal(getCardDisplayContent(cardById(swarm, 'swarm_alpha_1'), 'en').body, 'Adjacent ♙♙ +1 ▲, ignore 1 ◆.');
  assert.equal(getCardDisplayContent(cardById(swarm, 'swarm_swarm_attack_1'), 'en').body, 'All ♙♙ +1 ▲ this turn.');
  assert.equal(getCardDisplayContent(cardById(swarm, 'swarm_recycle_1'), 'en').body, 'Destroy ♙. Draw 1.');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_repair_kit_1'), 'en').body, 'Target ♙ +1 ◆ until combat ends.');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_shieldbearer_1'), 'en').body, 'Adjacent ♙♙ +1 ◆ in combat.');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_fortify_1'), 'en').body, 'All ♙♙ +1 ◆ this turn.');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_stability_1'), 'en').body, 'All ♙♙ are immovable this turn.');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_wall_1'), 'en').body, '');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_reinforce_1'), 'en').body, 'Heal all ♙♙ by +1 ●.');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_heavy_1'), 'en').body, '');
  assert.equal(getCardDisplayContent(cardById(control, 'control_recall_1'), 'en').body, 'Return ♙ to hand. Draw 1.');
  assert.equal(getCardDisplayContent(cardById(control, 'control_disruptor_1'), 'en').body, 'On play: cancel the next enemy effect.');
  assert.equal(getCardDisplayContent(cardById(control, 'control_swap_1'), 'en').body, 'Swap 2 ♙♙ or 2 enemies.');
  const wardens = getFactionByKey('Wardens');

  assert.equal(getCardDisplayContent(cardById(aggro, 'aggro_full_attack_1'), 'pl').body, 'Wszyscy ♙♙ +2 ▲ w tej turze.');
  assert.equal(getCardDisplayContent(cardById(aggro, 'aggro_scout_1'), 'pl').body, 'Po zagraniu: zablokuj tę linię w tej turze.');
  assert.equal(getCardDisplayContent(cardById(aggro, 'aggro_rush_1'), 'pl').body, 'Zamień się z sąsiednim ♙. Natychmiast walcz.');
  assert.equal(getCardDisplayContent(cardById(aggro, 'aggro_adrenaline_1'), 'pl').body, 'Wybrany ♙ natychmiast walczy.');
  assert.equal(getCardDisplayContent(cardById(swarm, 'swarm_grunt_1'), 'pl').body, '');
  assert.equal(getCardDisplayContent(cardById(swarm, 'swarm_rusher_1'), 'pl').body, '');
  assert.equal(getCardDisplayContent(cardById(swarm, 'swarm_alpha_1'), 'pl').body, 'Sąsiedni ♙♙ +1 ▲, ignorują 1 ◆.');
  assert.equal(getCardDisplayContent(cardById(swarm, 'swarm_swarm_attack_1'), 'pl').body, 'Wszyscy ♙♙ +1 ▲ w tej turze.');
  assert.equal(getCardDisplayContent(cardById(swarm, 'swarm_recycle_1'), 'pl').body, 'Zniszcz ♙. Dobierz 1.');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_repair_kit_1'), 'pl').body, 'Wybrany ♙ +1 ◆ do końca walki.');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_shieldbearer_1'), 'pl').body, 'Sąsiedni ♙♙ +1 ◆ w walce.');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_fortify_1'), 'pl').body, 'Wszyscy ♙♙ +1 ◆ w tej turze.');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_stability_1'), 'pl').body, 'Wszyscy ♙♙ nie mogą być ruszani w tej turze.');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_wall_1'), 'pl').body, '');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_reinforce_1'), 'pl').body, 'Ulecz wszystkich ♙♙ o +1 ●.');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_heavy_1'), 'pl').body, '');
  assert.equal(getCardDisplayContent(cardById(wardens, 'wardens_brace_1'), 'en').body, 'Target ♙ +1 ◆ until combat ends.');
  assert.equal(getCardDisplayContent(cardById(wardens, 'wardens_halberdier_1'), 'en').body, 'If opposed: +1 ▲.');
  assert.equal(getCardDisplayContent(cardById(wardens, 'wardens_stand_firm_1'), 'en').body, "All ♙♙ can't be moved this turn.");
  assert.equal(getCardDisplayContent(cardById(control, 'control_disruptor_1'), 'pl').body, 'Po zagraniu: anuluj następny efekt wroga.');
  assert.equal(getCardDisplayContent(cardById(control, 'control_swap_1'), 'pl').body, 'Zamień miejscami 2 ♙♙ lub 2 wrogów.');
  assert.equal(getCardDisplayContent(cardById(wardens, 'wardens_halberdier_1'), 'pl').body, 'Jeśli naprzeciw: +1 ▲.');
  assert.equal(getCardDisplayContent(cardById(wardens, 'wardens_reinforce_line_1'), 'pl').body, 'Sąsiedni ♙♙ +1 ◆ do końca walki.');
});

test('visual card content keeps empty rules text empty instead of falling back to type labels', () => {
  const unitCard = {
    id: 'plain_unit',
    name: 'Plain Unit',
    type: 'unit',
    attack: 2,
    hp: 2,
    armor: 0,
    textShort: '',
  };
  const missingTextCard = {
    id: 'missing_text_unit',
    name: 'Missing Text Unit',
    type: 'unit',
    attack: 1,
    hp: 1,
    armor: 0,
  };
  const effectCard = {
    id: 'effect_card',
    name: 'Effect Card',
    type: 'effect',
    textShort: 'Target [ALLY] +1 ARM until combat ends.',
  };

  assert.equal(getCardDisplayContent(unitCard, 'en').body, '');
  assert.equal(getCardDisplayContent(unitCard, 'pl').body, '');
  assert.equal(getCardDisplayContent(missingTextCard, 'en').body, '');
  assert.equal(getCardDisplayContent(effectCard, 'en').body, 'Target ♙ +1 ◆ until combat ends.');
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
    textShort: 'Target [ALLY]: heal 1, +1 ATK this turn.',
  };

  assert.equal(formatCardDetailLines(card, 'en').at(-1), 'Target ♙: heal +1 ●, +1 ▲ this turn.');
});


test('inline stat text renderer maps compact symbols to top badge colors', () => {
  assert.equal(getInlineStatSymbolColor('▲'), '#24c6a7');
  assert.equal(getInlineStatSymbolColor('◆'), '#3d63c7');
  assert.equal(getInlineStatSymbolColor('●'), '#d24b5f');
  assert.equal(getInlineGameplaySymbolColor('♙'), '#facc15');
  assert.equal(getInlineGameplaySymbolColor('♙♙'), '#facc15');
  assert.equal(getInlineStatSymbolColor('x'), null);
  assert.equal(getInlineGameplaySymbolColor('x'), null);
});

test('inline stat text tokenizer preserves localized copy while tagging stat and gameplay symbols', () => {
  assert.deepEqual(tokenizeInlineStatText('Sojusznik ♙♙ +1 ◆ i 1 ●.').filter((token) => token.type !== 'space'), [
    { type: 'text', text: 'Sojusznik' },
    { type: 'gameplaySymbol', text: '♙♙' },
    { type: 'text', text: '+1' },
    { type: 'statSymbol', text: '◆' },
    { type: 'text', text: 'i' },
    { type: 'text', text: '1' },
    { type: 'statSymbol', text: '●' },
    { type: 'text', text: '.' },
  ]);
});

test('inline effect icon typography uses glyph-sized symbols, centered baseline, and compact icon spacing', () => {
  assert.equal(INLINE_EFFECT_ICON_STAT_FONT_SCALE, 1.08);
  assert.equal(INLINE_EFFECT_ICON_BASELINE_OFFSET_RATIO, -0.04);
  assert.equal(INLINE_EFFECT_ICON_SPACE_SCALE, 0.42);

  const lines = layoutInlineStatText('+1 ▲ this turn', {
    maxWidth: 100,
    measureTokenWidth: (token) => (token === ' ' ? 10 : token.length * 10),
  });

  assert.equal(lines[0].segments[1].text, '▲');
  assert.equal(lines[0].segments[1].x, 25);
  assert.equal(lines[0].segments[2].text, 'this');
  assert.equal(lines[0].segments[2].x, 40);
});

test('inline stat text layout wraps by measured token width and keeps symbols inline', () => {
  const lines = layoutInlineStatText('♙ +1 ▲ this turn.', {
    maxWidth: 10,
    measureTokenWidth: (token) => token.length,
  });

  assert.deepEqual(lines.map((line) => line.segments.map((segment) => segment.text).join('')), [
    '♙+1▲',
    'thisturn.',
  ]);
  assert.equal(lines[0].segments[0].type, 'gameplaySymbol');
  assert.equal(lines[0].segments.at(-1).type, 'statSymbol');
});
