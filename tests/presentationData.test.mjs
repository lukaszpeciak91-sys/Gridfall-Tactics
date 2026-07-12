import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { getFactionByKey, getFactionKeys } from '../src/data/factions/index.js';
import { getCardDisplayName } from '../src/localization/cardDisplay.js';
import {
  factionPresentation,
  getCardPresentationName,
  getFactionPresentation,
  getFactionPresentationName,
} from '../src/data/presentation/factionPresentation.js';

function loadFactions() {
  return getFactionKeys().map((factionKey) => getFactionByKey(factionKey));
}

function allCards() {
  return loadFactions().flatMap((faction) => faction.deck.map((card) => ({ faction, card })));
}

test('presentation metadata exists for every current faction id', () => {
  const missingPresentation = loadFactions()
    .map((faction) => faction.id)
    .filter((factionId) => !getFactionPresentation(factionId));

  assert.deepEqual(missingPresentation, []);
});

test('every presentation card override points at an existing card id', () => {
  const cardIds = new Set(allCards().map(({ card }) => card.id));
  const missingCardIds = Object.values(factionPresentation)
    .flatMap((presentation) => Object.keys(presentation.cardNameOverrides))
    .filter((cardId) => !cardIds.has(cardId));

  assert.deepEqual(missingCardIds, []);
});

test('selected Control card names are sourced from localization instead of presentation overrides', () => {
  const localizedControlCardIds = [
    'control_hacker_1',
    'control_disruptor_1',
    'control_sniper_1',
    'control_controller_1',
    'control_pulse_wave_1',
  ];

  for (const cardId of localizedControlCardIds) {
    assert.equal(factionPresentation.control.cardNameOverrides[cardId], undefined, cardId);
  }
});

test('presentation helper resolves English and Polish override names without replacing gameplay card names', () => {
  const cardsById = new Map(allCards().map(({ card }) => [card.id, card]));
  const runner = cardsById.get('aggro_runner_1');

  assert.equal(runner.name, 'Runner');
  assert.equal(getCardPresentationName(runner), 'Ballroom Duelist');
  assert.equal(getCardPresentationName(runner, 'en'), 'Ballroom Duelist');
  assert.equal(getCardPresentationName(runner, 'pl'), 'Balowy Pojedynkowicz');
  assert.equal(getCardPresentationName(runner, 'de'), 'Ballroom Duelist');
  assert.equal(runner.name, 'Runner');
});

test('presentation helper falls back from missing Polish names to English overrides', async () => {
  const source = fs
    .readFileSync('src/data/presentation/factionPresentation.js', 'utf8')
    .replace("aggro_runner_1: { nameEn: 'Ballroom Duelist', namePl: 'Balowy Pojedynkowicz' }", "aggro_runner_1: { nameEn: 'Ballroom Duelist' }");
  const moduleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
  const { getCardPresentationName: getFixtureCardPresentationName } = await import(moduleUrl);

  assert.equal(getFixtureCardPresentationName({ id: 'aggro_runner_1', name: 'Runner' }, 'pl'), 'Ballroom Duelist');
});

test('presentation helper falls back from missing English override to original card name', async () => {
  const source = fs
    .readFileSync('src/data/presentation/factionPresentation.js', 'utf8')
    .replace("aggro_runner_1: { nameEn: 'Ballroom Duelist', namePl: 'Balowy Pojedynkowicz' }", "aggro_runner_1: { namePl: 'Balowy Pojedynkowicz' }");
  const moduleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
  const { getCardPresentationName: getFixtureCardPresentationName } = await import(moduleUrl);

  assert.equal(getFixtureCardPresentationName({ id: 'aggro_runner_1', name: 'Runner' }, 'en'), 'Runner');
});

test('faction presentation names resolve by locale with safe fallbacks', () => {
  assert.equal(getFactionPresentationName('aggro', 'en'), 'Porcelain Court');
  assert.equal(getFactionPresentationName('aggro'), 'Porcelain Court');
  assert.equal(getFactionPresentationName('aggro', 'pl'), 'Porcelanowy Dwór');
  assert.equal(getFactionPresentationName('attrition-swarm', 'en'), 'Gravehearts');
  assert.equal(getFactionPresentationName('attrition-swarm', 'pl'), 'Gravehearts');
  assert.equal(getFactionPresentationName('aggro', 'de'), 'Porcelain Court');
  assert.equal(getFactionPresentationName('missing-faction', 'pl'), 'missing-faction');
  assert.equal(getFactionPresentationName('missing-faction', 'pl', 'Raw Faction Name'), 'Raw Faction Name');
});

test('Gravehearts Polish presentation names match the short-name localization pass', () => {
  const attritionSwarm = getFactionByKey('Attrition Swarm');
  const cardsByNumber = new Map(attritionSwarm.deck.map((card) => [card.cardNumber, card]));
  const expectedNames = [
    [1, 'attrition_swarm_husk_1', 'Hollow Groom', 'Pusty Pan Młody'],
    [2, 'attrition_swarm_carrier_1', 'Coffin Bearer', 'Trumniarz'],
    [3, 'attrition_swarm_leech_1', 'Grave Leech', 'Pijawka'],
    [4, 'attrition_swarm_rotcaller_1', 'Party Host', 'Wodzirej'],
    [5, 'attrition_swarm_abomination_1', 'Mourning Giant', 'Żałobny Olbrzym'],
    [6, 'attrition_swarm_funeral_pyre_1', 'Funeral Pyre', 'Stos'],
    [7, 'attrition_swarm_infect_1', 'Rotten Gift', 'Zgniły Upominek'],
    [8, 'attrition_swarm_feast_1', 'Feast', 'Ostatnia Wieczerza'],
    [9, 'attrition_swarm_rise_again_1', 'Dance Again', 'Zatańcz Raz Jeszcze'],
    [10, 'attrition_swarm_grave_call_1', 'Grave Call', 'Wezwanie Grobu'],
  ];

  expectedNames.forEach(([cardNumber, cardId, nameEn, namePl]) => {
    const card = cardsByNumber.get(cardNumber);
    assert.equal(card.id, cardId);
    assert.equal(getCardPresentationName(card, 'en'), nameEn);
    assert.equal(getCardPresentationName(card, 'pl'), namePl);
    assert.equal(getCardDisplayName(card, 'en'), nameEn);
    assert.equal(getCardDisplayName(card, 'pl'), namePl);
  });
});

test('Empire of the Golden Sun presentation names match the current flavor pass', () => {
  const tank = getFactionByKey('Tank');
  const cardsByNumber = new Map(tank.deck.map((card) => [card.cardNumber, card]));
  const expectedNames = [
    [1, 'tank_shieldbearer_1', 'Throne Guardian', 'Strażnik Tronu'],
    [2, 'tank_heavy_1', 'Imperial Colossus', 'Imperialny Kolos'],
    [3, 'tank_guardian_1', 'Goldscale', 'Złotołuski'],
    [4, 'tank_wall_1', 'Elder Tam-Tam', 'Stary Tam-Tam'],
    [5, 'tank_bruiser_1', 'Fang Veteran', 'Weteran Kła'],
    [6, 'tank_fortify_1', 'Solar Fortification', 'Solarne Umocnienie'],
    [7, 'tank_stability_1', "Emperor's Will", 'Wola Imperatora'],
    [8, 'tank_reinforce_1', 'Rite of Renewal', 'Rytuał Odnowy'],
    [9, 'tank_last_stand_1', 'Last Legion', 'Ostatni Legion'],
    [10, 'tank_repair_kit_1', 'Golden Carapace', 'Złoty Karapaks'],
  ];

  expectedNames.forEach(([cardNumber, cardId, nameEn, namePl]) => {
    const card = cardsByNumber.get(cardNumber);
    assert.equal(card.id, cardId);
    assert.equal(getCardPresentationName(card, 'en'), nameEn);
    assert.equal(getCardPresentationName(card, 'pl'), namePl);
    assert.equal(getCardDisplayName(card, 'en'), nameEn);
    assert.equal(getCardDisplayName(card, 'pl'), namePl);
  });
});

test('Empire of the Golden Sun flavor pass preserves gameplay-critical card data', () => {
  const tank = getFactionByKey('Tank');
  const expectedGameplayData = [
    ['tank_shieldbearer_1', 1, 'tank_01', 'lane_armor_aura_1', 'Adjacent [ALLY] +1 ARM until combat', 1, 2, 0],
    ['tank_heavy_1', 2, 'tank_02', null, '', 2, 3, 0],
    ['tank_guardian_1', 3, 'tank_03', 'intercept_lane_damage', 'Takes combat damage for adjacent [ALLY]', 1, 3, 0],
    ['tank_wall_1', 4, 'tank_04', 'cannot_attack', '', 0, 2, 0],
    ['tank_bruiser_1', 5, 'tank_05', 'gain_atk_when_damaged', 'After surviving damage: +1 ATK until next combat', 2, 3, 0],
    ['tank_fortify_1', 6, 'tank_06', 'buff_all_armor_1', 'All [ALLY] +1 ARM until combat', undefined, undefined, undefined],
    ['tank_stability_1', 7, 'tank_07', 'immune_move_disable_this_turn', "Until combat, [ALLIES] cannot be moved", undefined, undefined, undefined],
    ['tank_reinforce_1', 8, 'tank_08', 'heal_all_1', 'Heal all [ALLY] by 1', undefined, undefined, undefined],
    ['tank_last_stand_1', 9, 'tank_09', 'cannot_drop_below_1_this_turn', "Until combat, [ALLIES] cannot drop below 1 HP", undefined, undefined, undefined],
    ['tank_repair_kit_1', 10, 'tank_10', 'temp_armor_1', 'Target [ALLY] +1 ARM until combat', undefined, undefined, undefined],
  ];

  expectedGameplayData.forEach(([cardId, cardNumber, artAssetId, effectId, textShort, attack, hp, armor]) => {
    const card = tank.deck.find((item) => item.id === cardId);
    assert.equal(card.cardNumber, cardNumber);
    assert.equal(card.artAssetId, artAssetId);
    assert.equal(card.effectId, effectId);
    assert.equal(card.textShort, textShort);
    assert.equal(card.attack, attack);
    assert.equal(card.hp, hp);
    assert.equal(card.armor, armor);
  });
});

test('Empire of the Golden Sun render-fit diagnostic stays inside previous presentation envelope', () => {
  const tank = getFactionByKey('Tank');
  const presentation = getFactionPresentation(tank.id);
  const localizedNames = tank.deck.flatMap((card) => [
    getCardPresentationName(card, 'en'),
    getCardPresentationName(card, 'pl'),
  ]);
  const maxNameLength = Math.max(...localizedNames.map((name) => name.length));
  const maxWordLength = Math.max(...localizedNames.flatMap((name) => name.split(/\s+/u).map((word) => word.length)));

  assert.equal(getFactionPresentationName(tank.id, 'pl'), 'Imperium Złotego Słońca');
  assert.ok(maxNameLength <= 'Weteran Grzebieniastego Kła'.length);
  assert.ok(maxWordLength <= 'Reinforcements'.length);
  assert.match(presentation.cardArtDirections.tank_wall_1, /armored sauropod/);
  assert.match(presentation.cardArtDirections.tank_wall_1, /not an obsidian fortress or object/);
});


test('faction select metadata covers every faction with two updated chip tags', () => {
  const source = fs.readFileSync('src/ui/factionCards.js', 'utf8');
  const detailsStart = source.indexOf('const FACTION_CARD_DETAILS = {');
  const detailsEnd = source.indexOf('const CARD_SCROLL_DRAG_THRESHOLD');
  const detailsSource = source.slice(detailsStart, detailsEnd);
  const expectedTags = new Map([
    ['Aggro', ['Rush', 'Burst']],
    ['Tank', ['Armor', 'Sustain']],
    ['Control', ['Disrupt', 'Move']],
    ['Swarm', ['Swarm', 'Growth']],
    ['Wardens', ['Support', 'Formation']],
    ['Attrition Swarm', ['Attrition', 'Return']],
    ['Overclock', ['Tempo', 'Overload']],
  ]);

  for (const [factionKey, tags] of expectedTags) {
    const factionSource = detailsSource.slice(
      detailsSource.indexOf(`${factionKey.includes(' ') ? `'${factionKey}'` : factionKey}: {`),
    );
    assert.match(factionSource, new RegExp(`tags: \\[${tags.map((tag) => `'${tag}'`).join(', ')}\\]`), factionKey);
    assert.equal(tags.length, 2, `${factionKey} should render exactly two chips`);
  }
});

test('faction presentation helper falls back safely when display metadata is incomplete', async () => {
  const source = fs
    .readFileSync('src/data/presentation/factionPresentation.js', 'utf8')
    .replace("displayNameEn: 'Porcelain Court',", "")
    .replace("displayNamePl: 'Porcelanowy Dwór',", "");
  const moduleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
  const { getFactionPresentationName: getFixtureFactionPresentationName } = await import(moduleUrl);

  assert.equal(getFixtureFactionPresentationName('aggro', 'pl', 'Aggro'), 'Aggro');
  assert.equal(getFixtureFactionPresentationName('aggro', 'en'), 'aggro');
});

test('presentation helper falls back to original card.name when no override exists', () => {
  assert.equal(getCardPresentationName({ id: 'missing_card_id', name: 'Original Name' }), 'Original Name');
  assert.equal(getCardPresentationName({ name: 'Nameless Original' }, 'pl'), 'Nameless Original');
});

test('presentation lookups do not mutate gameplay faction data', () => {
  const before = JSON.stringify(loadFactions());

  for (const { faction, card } of allCards()) {
    getFactionPresentation(faction.id);
    getCardPresentationName(card);
    getCardPresentationName(card, 'pl');
  }

  const after = JSON.stringify(loadFactions());
  assert.equal(after, before);
});
