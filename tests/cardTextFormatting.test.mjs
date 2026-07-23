import test from 'node:test';
import assert from 'node:assert/strict';

import { CARD_EFFECT_GAMEPLAY_SYMBOLS, formatCardEffectTextShort } from '../src/localization/cardTextFormatting.js';
import { formatCardDetailLines } from '../src/rendering/cardRenderModes.js';
import { getFactionByKey } from '../src/data/factions/index.js';
import {
  getCardDisplayContent,
  createInlineStatText,
  getInlineGameplaySymbolColor,
  getInlineGameplaySymbolStyle,
  getInlineStatSymbolColor,
  getCardLayoutZones,
  getCardTypography,
  INLINE_EFFECT_ICON_BASELINE_OFFSET_RATIO,
  INLINE_EFFECT_ICON_MIN_FONT_SIZE,
  INLINE_EFFECT_ICON_STAT_FONT_SCALE,
  INLINE_STAT_ICON_LEADING_SPACE_SCALE,
  INLINE_STAT_ICON_TRAILING_SPACE_SCALE,
  INLINE_ATTACK_ICON_OPTICAL_OFFSET_X,
  INLINE_GAMEPLAY_ICON_BASELINE_OFFSET_RATIO,
  INLINE_GAMEPLAY_ICON_SPACE_SCALE,
  layoutInlineStatText,
  tokenizeInlineStatText,
} from '../src/rendering/cardVisualLayout.js';
import { HAND_CARD_ASPECT_RATIO } from '../src/ui/handLayout.js';
import {
  HAND_CARD_BODY_LINE_SPACING,
  HAND_CARD_TYPOGRAPHY_SCALE,
  INSPECT_CARD_BODY_LINE_SPACING,
  INSPECT_CARD_TYPOGRAPHY_SCALE,
} from '../src/rendering/cardViewConfig.js';

test('formats English stat abbreviations in card effect text as compact symbols', () => {
  assert.equal(formatCardEffectTextShort('+1 ATK', 'en'), '+1 ▲');
  assert.equal(formatCardEffectTextShort('+1 ARM', 'en'), '+1 ◆');
  assert.equal(formatCardEffectTextShort('After attack: lose 1 HP', 'en'), 'After attack: lose 1 ●');
  assert.equal(
    formatCardEffectTextShort('Heal [ALLY] 1. +1 ATK until combat. Kills in combat: draw 1', 'en'),
    'Heal ♙ 1. +1 ▲ until combat. Kills in combat: draw 1',
  );
});


test('formats pilot ally icon markers without globally replacing ally terms', () => {
  assert.equal(CARD_EFFECT_GAMEPLAY_SYMBOLS.ally, '♙');
  assert.equal(CARD_EFFECT_GAMEPLAY_SYMBOLS.allies, '♙♙');
  assert.equal(CARD_EFFECT_GAMEPLAY_SYMBOLS.enemy, '♟');
  assert.equal(CARD_EFFECT_GAMEPLAY_SYMBOLS.enemies, '♟♟');
  assert.equal(formatCardEffectTextShort('Target [ALLY] +1 ARM until combat', 'en'), 'Target ♙ +1 ◆ until combat');
  assert.equal(formatCardEffectTextShort('All [ALLY] +1 ATK until combat', 'en'), 'All ♙♙ +1 ▲ until combat');
  assert.equal(formatCardEffectTextShort('Return [ALLY] to hand. Draw 1', 'en'), 'Return ♙ to hand. Draw 1');
  assert.equal(formatCardEffectTextShort('Wybrany [ALLY] +1 ARM do walki', 'pl'), 'Wybrany ♙ +1 ◆ do walki');
  assert.equal(formatCardEffectTextShort('Target ally +1 ARM until combat', 'en'), 'Target ally +1 ◆ until combat');
  assert.equal(formatCardEffectTextShort('Target [ENEMY] -1 ARM until combat', 'en'), 'Target ♟ -1 ◆ until combat');
  assert.equal(formatCardEffectTextShort('All [ENEMIES] -1 ATK until combat', 'en'), 'All ♟♟ -1 ▲ until combat');
});

test('formats localized Polish stat terms while preserving surrounding text', () => {
  assert.equal(formatCardEffectTextShort('Gdy uszkodzony: +1 ATK', 'pl'), 'Gdy uszkodzony: +1 ▲');
  assert.equal(formatCardEffectTextShort('Sojusznik +1 PANC do walki', 'pl'), 'Sojusznik +1 ◆ do walki');
  assert.equal(formatCardEffectTextShort('Wskrześ jednostkę z 1 HP', 'pl'), 'Wskrześ jednostkę z 1 ●');
  assert.equal(formatCardEffectTextShort('Po ataku: traci 1 HP', 'pl'), 'Po ataku: traci 1 ●');
  assert.equal(formatCardEffectTextShort('Zabójstwo w walce i przetrwanie: ulecz swoją bazę o 1', 'pl'), 'Zabójstwo w walce i przetrwanie: ulecz swoją bazę o +1 ●');
});


test('formats HP-related healing and damage language without replacing unrelated numbers', () => {
  assert.equal(formatCardEffectTextShort('On attack: heal your base 1', 'en'), 'On attack: heal your base +1 ●');
  assert.equal(formatCardEffectTextShort('When this dies, both bases lose 1 HP', 'en'), 'When this dies, both bases lose 1 ●');
  assert.equal(formatCardEffectTextShort('On death: enemy base loses 1 HP', 'en'), 'On death: enemy base loses 1 ●');
  assert.equal(formatCardEffectTextShort('Heal all [ALLY] by 1', 'en'), 'Heal all ♙♙ by +1 ●');
  assert.equal(formatCardEffectTextShort('First [ALLY] death each turn:\nenemy base loses 1 HP', 'en'), 'First ♙ death each turn:\nenemy base loses 1 ●');
  assert.equal(formatCardEffectTextShort('Destroy [ALLY]. Draw 1', 'en'), 'Destroy ♙. Draw 1');
  assert.equal(formatCardEffectTextShort('When this dies, summon 1/1 here', 'en'), 'When this dies, summon 1/1 here');
  assert.equal(formatCardEffectTextShort('Gdy ginie, obie bazy otrzymują 1', 'pl'), 'Gdy ginie, obie bazy otrzymują 1 ●');
  assert.equal(formatCardEffectTextShort('Po śmierci: wroga baza otrzymuje 1', 'pl'), 'Po śmierci: wroga baza otrzymuje 1 ●');
  assert.equal(formatCardEffectTextShort('Celowany wróg atakuje własną bazę w następnej walce, potem otrzymuje 1 obrażenie', 'pl'), 'Celowany wróg atakuje własną bazę w następnej walce, potem otrzymuje 1 ●');
  assert.equal(formatCardEffectTextShort('Pierwszy zgon [ALLY] w turze:\nbaza wroga traci 1 HP', 'pl'), 'Pierwszy zgon ♙ w turze:\nbaza wroga traci 1 ●');
  assert.equal(formatCardEffectTextShort('Zniszcz [ALLY]. Dobierz 1', 'pl'), 'Zniszcz ♙. Dobierz 1');
  assert.equal(formatCardEffectTextShort('Gdy ginie, przywołaj tu 1/1', 'pl'), 'Gdy ginie, przywołaj tu 1/1');
});


test('formats HP symbols for localized Attrition Swarm card effect display text', () => {
  const { deck } = getFactionByKey('Attrition Swarm');
  const cardById = (id) => deck.find((card) => card.id === id);

  assert.equal(getCardDisplayContent(cardById('attrition_swarm_leech_1'), 'en').body, 'On attack: heal your base +1 ●');
  assert.equal(getCardDisplayContent(cardById('attrition_swarm_leech_1'), 'pl').body, 'Przy ataku: ulecz swoją bazę o +1 ●');
  assert.equal(getCardDisplayContent(cardById('attrition_swarm_abomination_1'), 'en').body, 'When this dies, both bases lose 1 ●');
  assert.equal(getCardDisplayContent(cardById('attrition_swarm_abomination_1'), 'pl').body, 'Gdy ginie, obie bazy tracą 1 ●');
  assert.equal(getCardDisplayContent(cardById('attrition_swarm_funeral_pyre_1'), 'en').body, 'First ♙ death each turn:\nenemy base loses 1 ●');
  assert.equal(getCardDisplayContent(cardById('attrition_swarm_funeral_pyre_1'), 'pl').body, 'Pierwszy zgon ♙ w turze:\nbaza wroga traci 1 ●');
});



test('polished card text stays within mobile collection and inspect rules panels', () => {
  const cardCases = [
    { factionKey: 'Aggro', cardId: 'aggro_pierce_strike_1', locale: 'en', expectedBody: 'Deal 1 to ♟.\nNext hit ignores ◆' },
    { factionKey: 'Aggro', cardId: 'aggro_pierce_strike_1', locale: 'pl', expectedBody: 'Zadaj 1 ♟.\nNastępny cios ignoruje ◆' },
    { factionKey: 'Attrition Swarm', cardId: 'attrition_swarm_funeral_pyre_1', locale: 'en', expectedBody: 'First ♙ death each turn:\nenemy base loses 1 ●' },
    { factionKey: 'Attrition Swarm', cardId: 'attrition_swarm_funeral_pyre_1', locale: 'pl', expectedBody: 'Pierwszy zgon ♙ w turze:\nbaza wroga traci 1 ●' },
    { factionKey: 'Attrition Swarm', cardId: 'attrition_swarm_infect_1', locale: 'en', expectedBody: 'Deal 1 to ♟.\nOpposed ♙ gains +1 ▲' },
    { factionKey: 'Attrition Swarm', cardId: 'attrition_swarm_infect_1', locale: 'pl', expectedBody: 'Zadaj 1 ♟.\n♙ naprzeciwko +1 ▲' },
    { factionKey: 'Tank', cardId: 'tank_stability_1', locale: 'en', expectedBody: "Until combat, ♙♙ cannot be moved" },
    { factionKey: 'Tank', cardId: 'tank_stability_1', locale: 'pl', expectedBody: 'Do walki ♙♙ nie można przesuwać' },
    { factionKey: 'Wardens', cardId: 'wardens_shield_push_1', locale: 'en', expectedBody: 'Swap two adjacent ♟♟.\n-1 ▲ this combat' },
    { factionKey: 'Wardens', cardId: 'wardens_shield_push_1', locale: 'pl', expectedBody: 'Zamień dwóch sąsiednich ♟♟.\n-1 ▲ do walki' },
  ];

  const measureFits = ({ body, width, height, typographyScale, lineSpacing }) => {
    const zones = getCardLayoutZones(width, height);
    const baseTypography = getCardTypography(width, height);
    const startingBodyFontSize = Math.round(baseTypography.body * typographyScale) - 2;
    const effectiveLineSpacing = lineSpacing - 8;
    const minBodyFontSize = Math.max(8, startingBodyFontSize - 2);
    const bodyTopPadding = Math.max(5, zones.text.height * (typographyScale > 1 ? 0.11 : 0.1));
    const bodyBottomPadding = Math.max(5, zones.text.height * (typographyScale > 1 ? 0.1 : 0.09));
    const maxWidth = zones.text.width - Math.max(8, zones.pad * (typographyScale > 1 ? 1.15 : 1.05));
    const maxHeight = zones.text.height - bodyTopPadding - bodyBottomPadding;
    const layoutAtFontSize = (bodyFontSize) => {
      const measureTokenWidth = (token) => {
        if (token === ' ') return Math.ceil(bodyFontSize * 0.3);
        if (/^[♙♟]+$/u.test(token)) return Math.ceil(bodyFontSize * 1.08);
        if (/^[●▲◆]$/u.test(token)) return Math.ceil(bodyFontSize * 1.05);
        return Math.ceil(token.length * bodyFontSize * 0.45);
      };
      const lines = layoutInlineStatText(body, { maxWidth, measureTokenWidth });
      const lineHeight = Math.ceil(Math.max(bodyFontSize * 1.12, bodyFontSize * 1.38 * 1.03)) + effectiveLineSpacing;
      return { lines, heightUsed: lines.length * lineHeight - effectiveLineSpacing };
    };
    let fontSize = startingBodyFontSize;
    let fitted = layoutAtFontSize(fontSize);
    while (fitted.heightUsed > maxHeight && fontSize > minBodyFontSize) {
      fontSize -= 1;
      fitted = layoutAtFontSize(fontSize);
    }

    assert.ok(fitted.lines.length <= 3, `${width}x${height} should render in 3 lines or fewer`);
    assert.ok(Math.max(...fitted.lines.map((line) => line.width)) <= maxWidth, `${width}x${height} line width should fit the rules panel`);
    assert.ok(fitted.heightUsed <= maxHeight, `${width}x${height} text height should fit the rules panel`);
  };

  const collectionScreen = { width: 390, height: 844 };
  const collectionCardWidth = (collectionScreen.width - 14 * 2 - 10) / 2;
  const collectionCardHeight = Math.round(collectionCardWidth * HAND_CARD_ASPECT_RATIO);
  const viewport = { viewportTop: 98, viewportBottom: collectionScreen.height - 88 };
  const maxInspectWidth = Math.min(collectionScreen.width * 0.78, collectionScreen.width - 14 * 2);
  const maxInspectHeight = Math.min(collectionScreen.height * 0.58, viewport.viewportBottom - viewport.viewportTop - 14 * 2);
  const inspectScale = Math.min(2.06, maxInspectWidth / collectionCardWidth, maxInspectHeight / (collectionCardHeight * 0.96));
  const inspect = {
    width: collectionCardWidth * inspectScale,
    height: collectionCardHeight * inspectScale * 0.96,
  };

  for (const { factionKey, cardId, locale, expectedBody } of cardCases) {
    const { deck } = getFactionByKey(factionKey);
    const card = deck.find((candidate) => candidate.id === cardId);
    const body = getCardDisplayContent(card, locale).body;
    assert.equal(body, expectedBody, `${cardId} ${locale}`);
    measureFits({
      body,
      width: collectionCardWidth,
      height: collectionCardHeight,
      typographyScale: HAND_CARD_TYPOGRAPHY_SCALE,
      lineSpacing: HAND_CARD_BODY_LINE_SPACING,
    });
    measureFits({
      body,
      width: inspect.width,
      height: inspect.height,
      typographyScale: INSPECT_CARD_TYPOGRAPHY_SCALE,
      lineSpacing: INSPECT_CARD_BODY_LINE_SPACING,
    });
  }
});

test('Polish Mercy uses established inline ally, HP, and ATK icons with readable spacing', () => {
  const { deck } = getFactionByKey('Aggro');
  const mercy = deck.find((card) => card.id === 'aggro_quick_fix_1');

  assert.equal(
    getCardDisplayContent(mercy, 'pl').body,
    '+1 ●, +1 ▲ do walki.\nZabije: dobierz 1',
  );
  assert.equal(
    getCardDisplayContent(mercy, 'en').body,
    'Heal ♙ 1. +1 ▲ until combat. Kills in combat: draw 1',
  );
});

test('pilot card display content renders ally icon markers', () => {
  const aggro = getFactionByKey('Aggro');
  const swarm = getFactionByKey('Swarm');
  const tank = getFactionByKey('Tank');
  const control = getFactionByKey('Control');
  const cardById = (faction, id) => faction.deck.find((card) => card.id === id);

  assert.equal(getCardDisplayContent(cardById(aggro, 'aggro_full_attack_1'), 'en').body, 'All ♙♙ +2 ▲ until combat');
  assert.equal(getCardDisplayContent(cardById(aggro, 'aggro_scout_1'), 'en').body, "Until opponent\'s next action: no unit in this lane");
  assert.equal(getCardDisplayContent(cardById(aggro, 'aggro_rush_1'), 'en').body, 'Swap with adjacent ♙, then that lane immediately fights');
  assert.equal(getCardDisplayContent(cardById(aggro, 'aggro_adrenaline_1'), 'en').body, 'Selected ♙ immediately fights in its lane');
  assert.equal(getCardDisplayContent(cardById(swarm, 'swarm_grunt_1'), 'en').body, '');
  assert.equal(getCardDisplayContent(cardById(swarm, 'swarm_rusher_1'), 'en').body, 'This unit ignores ◆');
  assert.equal(getCardDisplayContent(cardById(swarm, 'swarm_alpha_1'), 'en').body, 'Adjacent ♙♙ in combat: +1 ▲ and ignores 1 ◆');
  assert.equal(getCardDisplayContent(cardById(swarm, 'swarm_swarm_attack_1'), 'en').body, 'All ♙♙ +1 ▲ until combat');
  assert.equal(getCardDisplayContent(cardById(swarm, 'swarm_recycle_1'), 'en').body, '♟♟: -1 ◆ until combat');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_repair_kit_1'), 'en').body, 'Target ♙ +1 ◆ until combat');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_shieldbearer_1'), 'en').body, 'Adjacent ♙♙ +1 ◆ until combat');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_fortify_1'), 'en').body, 'All ♙♙ +1 ◆ until combat');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_stability_1'), 'en').body, "Until combat, ♙♙ cannot be moved");
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_wall_1'), 'en').body, '');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_reinforce_1'), 'en').body, 'Heal all ♙♙ by +1 ●');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_heavy_1'), 'en').body, '');
  assert.equal(getCardDisplayContent(cardById(control, 'control_recall_1'), 'en').body, 'Return ♙ to hand. Draw 1');
  assert.equal(getCardDisplayContent(cardById(control, 'control_disruptor_1'), 'en').body, "Until combat, opponent cannot play effect cards");
  assert.equal(getCardDisplayContent(cardById(control, 'control_swap_1'), 'en').body, 'Swap 2 ♙♙ or 2 ♟♟');
  assert.equal(getCardDisplayContent(cardById(control, 'control_pulse_wave_1'), 'en').body, 'Deal 1 to all ♟♟, ignoring ◆');
  assert.equal(getCardDisplayContent(cardById(swarm, 'swarm_spitter_1'), 'en').body, 'On play: deal 1 to opposed ♟');
  const attritionSwarm = getFactionByKey('Attrition Swarm');
  assert.equal(getCardDisplayContent(cardById(attritionSwarm, 'attrition_swarm_infect_1'), 'en').body, 'Deal 1 to ♟.\nOpposed ♙ gains +1 ▲');
  const wardens = getFactionByKey('Wardens');

  assert.equal(getCardDisplayContent(cardById(aggro, 'aggro_full_attack_1'), 'pl').body, '♙♙ +2 ▲ do walki');
  assert.equal(getCardDisplayContent(cardById(aggro, 'aggro_scout_1'), 'pl').body, 'Do akcji przeciwnika: nie może zagrać jednostki w tej linii');
  assert.equal(getCardDisplayContent(cardById(aggro, 'aggro_rush_1'), 'pl').body, 'Zamień z sąsiednim ♙, potem ta linia natychmiast walczy');
  assert.equal(getCardDisplayContent(cardById(aggro, 'aggro_adrenaline_1'), 'pl').body, 'Wybrany ♙ natychmiast walczy w swojej linii');
  assert.equal(getCardDisplayContent(cardById(swarm, 'swarm_grunt_1'), 'pl').body, '');
  assert.equal(getCardDisplayContent(cardById(swarm, 'swarm_rusher_1'), 'pl').body, 'Ignoruje ◆');
  assert.equal(getCardDisplayContent(cardById(swarm, 'swarm_alpha_1'), 'pl').body, 'Sąsiedni ♙♙ w walce: +1 ▲ i ignoruje 1 ◆');
  assert.equal(getCardDisplayContent(cardById(swarm, 'swarm_swarm_attack_1'), 'pl').body, '♙♙ +1 ▲ do walki');
  assert.equal(getCardDisplayContent(cardById(swarm, 'swarm_recycle_1'), 'pl').body, '♟♟: -1 ◆ do walki');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_repair_kit_1'), 'pl').body, 'Wybrany ♙ +1 ◆ do walki');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_shieldbearer_1'), 'pl').body, 'Sąsiedni ♙♙ +1 ◆ do walki');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_fortify_1'), 'pl').body, '♙♙ +1 ◆ do walki');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_stability_1'), 'pl').body, 'Do walki ♙♙ nie można przesuwać');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_wall_1'), 'pl').body, '');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_reinforce_1'), 'pl').body, 'Ulecz wszystkich ♙♙ o +1 ●');
  assert.equal(getCardDisplayContent(cardById(tank, 'tank_heavy_1'), 'pl').body, '');
  assert.equal(getCardDisplayContent(cardById(wardens, 'wardens_brace_1'), 'en').body, 'Target ♙ +1 ◆ until combat');
  assert.equal(getCardDisplayContent(cardById(wardens, 'wardens_halberdier_1'), 'en').body, 'If opposed: +1 ▲');
  assert.equal(getCardDisplayContent(cardById(wardens, 'wardens_stand_firm_1'), 'en').body, "Heal ♙ +1 ●");
  assert.equal(getCardDisplayContent(cardById(control, 'control_disruptor_1'), 'pl').body, 'Do walki przeciwnik nie może zagrać kart efektu');
  assert.equal(getCardDisplayContent(cardById(control, 'control_swap_1'), 'pl').body, 'Zamień miejscami 2 ♙♙ lub 2 ♟♟');
  assert.equal(getCardDisplayContent(cardById(control, 'control_system_override_1'), 'pl').body, 'Wybrany ♟ atakuje własną bazę, potem traci 1 ●');
  assert.equal(getCardDisplayContent(cardById(control, 'control_pulse_wave_1'), 'pl').body, 'Zadaj 1 wszystkim ♟♟, ignorując ◆');
  assert.equal(getCardDisplayContent(cardById(swarm, 'swarm_spitter_1'), 'pl').body, 'Po zagraniu: zadaj 1 ♟ naprzeciw');
  assert.equal(getCardDisplayContent(cardById(attritionSwarm, 'attrition_swarm_rotcaller_1'), 'pl').body, 'Zgon pierwszego sąsiedniego ♙:\n+1 ▲ na stałe');
  assert.equal(getCardDisplayContent(cardById(attritionSwarm, 'attrition_swarm_infect_1'), 'pl').body, 'Zadaj 1 ♟.\n♙ naprzeciwko +1 ▲');
  assert.equal(getCardDisplayContent(cardById(wardens, 'wardens_halberdier_1'), 'pl').body, 'Jeśli naprzeciw: +1 ▲');
  assert.equal(getCardDisplayContent(cardById(wardens, 'wardens_spearwall_1'), 'pl').body, '♟♟ atakujący\nsąsiednich ♙♙: -1 ▲');
  assert.equal(getCardDisplayContent(cardById(wardens, 'wardens_stand_firm_1'), 'pl').body, 'Ulecz ♙ +1 ●');
  assert.equal(getCardDisplayContent(cardById(wardens, 'wardens_reinforce_line_1'), 'en').body, 'Until combat, ♙♙ cannot be moved');
  assert.equal(getCardDisplayContent(cardById(wardens, 'wardens_reinforce_line_1'), 'pl').body, 'Do walki ♙♙ nie można przesuwać');
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
    textShort: 'Target [ALLY] +1 ARM until combat',
  };

  assert.equal(getCardDisplayContent(unitCard, 'en').body, '');
  assert.equal(getCardDisplayContent(unitCard, 'pl').body, '');
  assert.equal(getCardDisplayContent(missingTextCard, 'en').body, '');
  assert.equal(getCardDisplayContent(effectCard, 'en').body, 'Target ♙ +1 ◆ until combat');
});

test('does not mutate source card data when formatting visual card content', () => {
  const card = {
    id: 'example_card',
    name: 'Example',
    type: 'order',
    textShort: 'Target ally +1 ARM until combat',
  };

  const content = getCardDisplayContent(card, 'en');

  assert.equal(content.body, 'Target ally +1 ◆ until combat');
  assert.equal(card.textShort, 'Target ally +1 ARM until combat');
});

test('detail text uses the same compact formatter as card textShort display', () => {
  const card = {
    id: 'detail_card',
    name: 'Detail',
    type: 'order',
    targeting: 'friendly-unit',
    textShort: 'Heal [ALLY] 1. +1 ATK until combat',
  };

  assert.equal(formatCardDetailLines(card, 'en').at(-1), 'Heal ♙ 1. +1 ▲ until combat');
});


test('inline stat text renderer maps compact symbols to top badge colors', () => {
  assert.equal(getInlineStatSymbolColor('▲'), '#24c6a7');
  assert.equal(getInlineStatSymbolColor('◆'), '#3d63c7');
  assert.equal(getInlineStatSymbolColor('●'), '#d24b5f');
  assert.equal(getInlineGameplaySymbolColor('♙'), '#facc15');
  assert.equal(getInlineGameplaySymbolColor('♙♙'), '#facc15');
  assert.equal(getInlineGameplaySymbolColor('♟'), '#e879f9');
  assert.equal(getInlineGameplaySymbolColor('♟♟'), '#e879f9');
  assert.equal(getInlineStatSymbolColor('x'), null);
  assert.equal(getInlineGameplaySymbolColor('x'), null);
});

test('enemy gameplay icons match ally geometry, outline, spacing, and grouping with only a different fill color', () => {
  const withoutColorAndGlyph = ({ color, baseGlyph, ...style }) => style;

  assert.deepEqual(
    withoutColorAndGlyph(getInlineGameplaySymbolStyle('♟')),
    withoutColorAndGlyph(getInlineGameplaySymbolStyle('♙')),
  );
  assert.deepEqual(
    withoutColorAndGlyph(getInlineGameplaySymbolStyle('♟♟')),
    withoutColorAndGlyph(getInlineGameplaySymbolStyle('♙♙')),
  );
  assert.equal(getInlineGameplaySymbolStyle('♙♙').stroke, '#061426');
  assert.equal(getInlineGameplaySymbolStyle('♟♟').stroke, '#061426');
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
  assert.deepEqual(tokenizeInlineStatText('♟ ♟♟').filter((token) => token.type !== 'space'), [
    { type: 'gameplaySymbol', text: '♟' },
    { type: 'gameplaySymbol', text: '♟♟' },
  ]);
});

test('grouped enemy gameplay icons render overlapping enemy glyphs rather than ally glyphs', () => {
  const drawnTexts = [];
  const scene = {
    add: {
      container: () => ({ add: () => {} }),
      text: (x, y, text) => {
        const node = {
          text,
          width: String(text).length * 10,
          setVisible() { return this; },
          setText(value) { this.text = value; this.width = String(value).length * 10; return this; },
          setFontSize() { return this; },
          setOrigin() { return this; },
          setAlpha() { return this; },
          setShadow() { return this; },
          destroy() {},
        };
        drawnTexts.push(node);
        return node;
      },
    },
  };

  assert.equal(getInlineGameplaySymbolStyle('♟♟').baseGlyph, '♟');
  assert.equal(getInlineGameplaySymbolStyle('♟♟').count, 2);
  createInlineStatText(scene, 0, 0, '♟♟');
  assert.equal(drawnTexts.filter(({ text }) => text === '♟').length, 2);
  assert.equal(drawnTexts.some(({ text }) => text === '♙'), false);
});

test('inline effect icon typography uses glyph-sized symbols, centered baseline, and compact icon spacing', () => {
  assert.equal(INLINE_EFFECT_ICON_STAT_FONT_SCALE, 1.38);
  assert.equal(INLINE_EFFECT_ICON_MIN_FONT_SIZE, 15);
  assert.equal(INLINE_EFFECT_ICON_BASELINE_OFFSET_RATIO, -0.16);
  assert.equal(INLINE_STAT_ICON_LEADING_SPACE_SCALE, 0.4);
  assert.equal(INLINE_STAT_ICON_TRAILING_SPACE_SCALE, 0.72);
  assert.equal(INLINE_ATTACK_ICON_OPTICAL_OFFSET_X, -1);
  assert.equal(INLINE_GAMEPLAY_ICON_BASELINE_OFFSET_RATIO, -0.06);
  assert.equal(INLINE_GAMEPLAY_ICON_SPACE_SCALE, 1);

  const lines = layoutInlineStatText('+1 ▲ until combat', {
    maxWidth: 100,
    measureTokenWidth: (token) => (token === ' ' ? 10 : token.length * 10),
  });

  assert.equal(lines[0].segments[1].text, '▲');
  assert.equal(lines[0].segments[1].x, 24);
  assert.equal(lines[0].segments[2].text, 'until');
  assert.equal(lines[0].segments[2].x, 42);
});

test('inline gameplay icons keep full word spacing while stat icons retain compact spacing', () => {
  const measureTokenWidth = (token) => (token === ' ' ? 10 : token.length * 10);
  const allyLine = layoutInlineStatText('Atakuje ♙ z najniższym HP.', { maxWidth: 500, measureTokenWidth })[0];
  const enemyLine = layoutInlineStatText('Atakuje ♟ z najniższym HP.', { maxWidth: 500, measureTokenWidth })[0];

  assert.equal(allyLine.segments[1].text, '♙');
  assert.equal(allyLine.segments[1].x, 80);
  assert.equal(allyLine.segments[2].text, 'z');
  assert.equal(allyLine.segments[2].x, 100);
  assert.deepEqual(enemyLine.segments, allyLine.segments.map((segment) => ({
    ...segment,
    text: segment.text === '♙' ? '♟' : segment.text,
  })));
});

test('inline ATK icon renderer applies only a subtle visual optical x-offset', () => {
  const drawInlineText = (text) => {
    const drawnTexts = [];
    const scene = {
      add: {
        container: () => ({ add: () => {} }),
        text: (x, y, value) => {
          const node = {
            x,
            y,
            text: value,
            width: String(value).length * 10,
            setVisible() { return this; },
            setText(nextValue) { this.text = nextValue; this.width = String(nextValue).length * 10; return this; },
            setFontSize() { return this; },
            setOrigin() { return this; },
            setAlpha() { return this; },
            setShadow() { return this; },
            destroy() {},
          };
          drawnTexts.push(node);
          return node;
        },
      },
    };

    createInlineStatText(scene, 0, 0, text, {
      align: 'left',
      fontSize: 12,
      maxWidth: 500,
    });
    return drawnTexts.filter((node) => node.text === text)[0];
  };

  assert.equal(drawInlineText('▲').x, INLINE_ATTACK_ICON_OPTICAL_OFFSET_X);
  assert.equal(drawInlineText('◆').x, 0);
  assert.equal(drawInlineText('●').x, 0);
  assert.equal(drawInlineText('♙').x, 0);
  assert.equal(drawInlineText('♟').x, 0);
});

test('inline stat text layout keeps number-stat modifiers compact while giving following words breathing room', () => {
  const measureTokenWidth = (token) => token.length;
  const compactTextLines = (text, maxWidth) => layoutInlineStatText(text, {
    maxWidth,
    measureTokenWidth,
  }).map((line) => line.segments.map((segment) => segment.text).join(''));

  assert.deepEqual(compactTextLines('+1 ▲ w walce.', 4), ['+1▲', 'w', 'walce.']);
  assert.deepEqual(compactTextLines('traci 1 ●.', 7), ['traci', '1●.']);
  assert.deepEqual(compactTextLines('ignoruje 1 ◆.', 9), ['ignoruje', '1◆.']);
  assert.deepEqual(compactTextLines('♙♙ +2 ▲ do walki.', 15), [
    '♙♙+2▲do',
    'walki.',
  ]);
  assert.deepEqual(compactTextLines('♙♙ +2 ▲ do walki.', 7), [
    '♙♙+2▲',
    'do',
    'walki.',
  ]);

  const measuredLine = layoutInlineStatText('+2 ▲ do walki', {
    maxWidth: 500,
    measureTokenWidth: (token) => (token === ' ' ? 10 : token.length * 10),
  })[0];
  const statSegment = measuredLine.segments.find((segment) => segment.text === '▲');
  const followingWord = measuredLine.segments.find((segment) => segment.text === 'do');
  assert.equal(statSegment.x, 24);
  assert.equal(followingWord.x - (statSegment.x + statSegment.width), 8);
});

test('inline stat text layout wraps by measured token width and keeps symbols inline', () => {
  const lines = layoutInlineStatText('♙ +1 ▲ until combat.', {
    maxWidth: 10,
    measureTokenWidth: (token) => token.length,
  });

  assert.deepEqual(lines.map((line) => line.segments.map((segment) => segment.text).join('')), [
    '♙+1▲',
    'until',
    'combat.',
  ]);
  assert.equal(lines[0].segments[0].type, 'gameplaySymbol');
  assert.equal(lines[0].segments.at(-1).type, 'statSymbol');
});
