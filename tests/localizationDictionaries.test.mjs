import assert from 'node:assert/strict';
import test from 'node:test';
import { getFactionByKey, getFactionKeys } from '../src/data/factions/index.js';
import en from '../src/localization/translations/en.json' with { type: 'json' };
import pl from '../src/localization/translations/pl.json' with { type: 'json' };

const REQUIRED_UI_GROUPS = [
  'start',
  'mainMenu',
  'factionSelect',
  'settings',
  'collection',
  'battleMenu',
  'battle',
  'rules',
  'cardDetails',
  'common',
];

function getPath(root, path) {
  return path.split('.').reduce((value, segment) => value?.[segment], root);
}

test('major UI-facing localization groups exist in English and Polish dictionaries', () => {
  for (const group of REQUIRED_UI_GROUPS) {
    assert.equal(typeof getPath(en, `ui.${group}`), 'object', `missing English ui.${group}`);
    assert.equal(typeof getPath(pl, `ui.${group}`), 'object', `missing Polish ui.${group}`);
  }
});

test('faction select title copy is localized for English and Polish', () => {
  assert.equal(getPath(en, 'ui.factionSelect.title'), 'SELECT YOUR TEAM');
  assert.equal(getPath(pl, 'ui.factionSelect.title'), 'WYBIERZ DRUŻYNĘ');
});


test('faction select descriptions cover every runtime faction key in English and Polish', () => {
  for (const factionKey of getFactionKeys()) {
    assert.equal(typeof getPath(en, `ui.factionSelect.descriptions.${factionKey}`), 'string', `missing English faction select description for ${factionKey}`);
    assert.equal(typeof getPath(pl, `ui.factionSelect.descriptions.${factionKey}`), 'string', `missing Polish faction select description for ${factionKey}`);
  }
});

test('faction select chip tag localization matches current English and Polish labels', () => {
  const expectedEn = {
    Rush: 'Rush',
    Burst: 'Burst',
    Armor: 'Armor',
    Sustain: 'Sustain',
    Disrupt: 'Disrupt',
    Move: 'Move',
    Swarm: 'Swarm',
    Growth: 'Growth',
    Attrition: 'Attrition',
    Return: 'Return',
    Formation: 'Formation',
  };
  const expectedPl = {
    Rush: 'Szarża',
    Burst: 'Wybuch',
    Armor: 'Pancerz',
    Sustain: 'Utrzymanie',
    Disrupt: 'Zakłócenia',
    Move: 'Ruch',
    Swarm: 'Rój',
    Growth: 'Wzrost',
    Attrition: 'Wyniszczenie',
    Return: 'Powrót',
    Formation: 'Formacja',
  };

  assert.deepEqual(getPath(en, 'ui.factionSelect.tags'), expectedEn);
  assert.deepEqual(getPath(pl, 'ui.factionSelect.tags'), expectedPl);
});

test('retry button copy stays short in Polish without changing English', () => {
  assert.equal(getPath(en, 'ui.common.retry'), 'RETRY');
  assert.equal(getPath(pl, 'ui.common.retry'), 'PONÓW');
});


test('battle result modal flavor subtitles are localized for English and Polish', () => {
  assert.deepEqual(
    ['victory', 'defeat', 'draw'].map((key) => getPath(en, `ui.battle.resultSubtitles.${key}`)),
    ['Audience delighted.', 'Audience demands more.', 'Production ordered a rematch.'],
  );
  assert.deepEqual(
    ['victory', 'defeat', 'draw'].map((key) => getPath(pl, `ui.battle.resultSubtitles.${key}`)),
    ['Publiczność zachwycona.', 'Publiczność domaga się więcej.', 'Produkcja zarządziła dogrywkę.'],
  );
});

test('battle utility drawer labels are explicit in English and Polish', () => {
  assert.deepEqual(
    ['utilityMenuRules', 'utilityMenuSettings', 'utilityMenuReturn', 'utilityMenuMainMenu'].map((key) => getPath(en, `ui.battle.${key}`)),
    ['Rules', 'Settings', 'Return', 'Main Menu'],
  );
  assert.deepEqual(
    ['utilityMenuRules', 'utilityMenuSettings', 'utilityMenuReturn', 'utilityMenuMainMenu'].map((key) => getPath(pl, `ui.battle.${key}`)),
    ['Zasady', 'Ustawienia', 'Powrót', 'Menu główne'],
  );
});

test('player effect confirmation banner copy is localized for English and Polish', () => {
  assert.equal(getPath(en, 'ui.battle.playerPlayed'), 'YOU PLAYED');
  assert.equal(getPath(pl, 'ui.battle.playerPlayed'), 'ZAGRANO');
});

test('invalid action feedback copy is localized for English and Polish', () => {
  const expectedEn = {
    handFull: 'Hand full',
    noValidTarget: 'No valid target',
    noValidAlly: 'No valid ally',
    noValidEnemy: 'No valid enemy',
    noEmptySlot: 'No empty slot',
    deckEmpty: 'Deck empty',
    fullHp: 'Already full HP',
    moveBlocked: 'Move blocked',
    effectBlocked: 'Effect blocked',
    immune: 'Immune',
    noAdjacentAlly: 'No adjacent ally',
    noFallenUnit: 'No fallen unit',
    laneBlocked: 'Lane blocked',
    occupied: 'Slot occupied',
    invalidSwap: 'Invalid swap',
  };
  const expectedPl = {
    handFull: 'Ręka pełna',
    noValidTarget: 'Brak prawidłowego celu',
    noValidAlly: 'Brak prawidłowego sojusznika',
    noValidEnemy: 'Brak prawidłowego wroga',
    noEmptySlot: 'Brak wolnego pola',
    deckEmpty: 'Talia pusta',
    fullHp: 'Pełne HP',
    moveBlocked: 'Ruch zablokowany',
    effectBlocked: 'Efekt zablokowany',
    immune: 'Odporność',
    noAdjacentAlly: 'Brak sąsiedniego sojusznika',
    noFallenUnit: 'Brak poległej jednostki',
    laneBlocked: 'Linia zablokowana',
    occupied: 'Pole zajęte',
    invalidSwap: 'Nieprawidłowa zamiana',
  };

  assert.deepEqual(getPath(en, 'ui.battle.invalidAction'), expectedEn);
  assert.deepEqual(getPath(pl, 'ui.battle.invalidAction'), expectedPl);
});

test('hold-pass surrender helper copy is localized for English and Polish', () => {
  assert.equal(getPath(en, 'ui.battle.holdPassToSurrender'), 'Hold PASS to surrender');
  assert.equal(getPath(pl, 'ui.battle.holdPassToSurrender'), 'Przytrzymaj PASS, aby się poddać');
});

test('effect targeting cancel and instruction copy is localized for English and Polish', () => {
  assert.equal(getPath(en, 'ui.common.cancel'), 'CANCEL');
  assert.equal(getPath(pl, 'ui.common.cancel'), 'ANULUJ');
  for (const key of ['selectEnemy', 'selectFirstEnemy', 'selectSecondEnemy', 'selectAdjacentEnemy', 'selectAlly', 'selectUnit']) {
    assert.equal(typeof getPath(en, `ui.battle.targeting.${key}`), 'string', `missing English targeting instruction ${key}`);
    assert.equal(typeof getPath(pl, `ui.battle.targeting.${key}`), 'string', `missing Polish targeting instruction ${key}`);
  }
});

test('rules glossary explains gameplay icons in English and Polish', () => {
  assert.equal(getPath(en, 'ui.rules.glossaryDescriptions.effectCard'), 'Effect card — not a unit and has no ATK / ARM / HP.');
  assert.equal(getPath(pl, 'ui.rules.glossaryDescriptions.effectCard'), 'Karta efektu — nie jest jednostką i nie ma ATK / ARM / HP.');
  assert.equal(getPath(en, 'ui.rules.glossaryDescriptions.ENEMY'), 'One opposing unit.');
  assert.equal(getPath(en, 'ui.rules.glossaryDescriptions.ENEMIES'), 'Opposing units.');
  assert.equal(getPath(pl, 'ui.rules.glossaryDescriptions.ENEMY'), 'Jedna jednostka przeciwnika.');
  assert.equal(getPath(pl, 'ui.rules.glossaryDescriptions.ENEMIES'), 'Jednostki przeciwnika.');
});

test('selected Control cards keep their intended German-themed names in both dictionaries', () => {
  const expectedNames = {
    control_hacker_1: 'Signalegel',
    control_disruptor_1: 'Störführer',
    control_sniper_1: 'Rotes Auge',
    control_controller_1: 'Kommandant',
    control_pulse_wave_1: 'Wunderwaffe',
  };

  for (const [cardId, name] of Object.entries(expectedNames)) {
    assert.equal(en.cards[cardId].name, name, `English ${cardId}`);
    assert.equal(pl.cards[cardId].name, name, `Polish ${cardId}`);
  }
});

test('selected localized card texts use enemy board-unit markers without changing base, effect, or UI copy', () => {
  const migrated = {
    en: {
      attrition_swarm_husk_1: 'Combat death: deal 1 to opposed [ENEMY].',
      attrition_swarm_funeral_pyre_1: 'First 2 [ALLY]\ncombat deaths:\n1 HP to opposed [ENEMY].',
      attrition_swarm_infect_1: 'Deal 1 to [ENEMY]. If it survives, opposed [ALLY] +1 ATK.',
      control_hacker_1: 'Opposed [ENEMY]: -1 ATK this turn.',
      control_sniper_1: 'Attacks the lowest-HP [ENEMY].',
      control_controller_1: 'On play: swap two [ENEMIES].',
      control_swap_1: 'Swap 2 [ALLY] or 2 [ENEMIES].',
      control_jam_signal_1: 'Choose up to 2 [ENEMIES]: -1 ATK this turn.',
      control_pulse_wave_1: 'Deal 1 to all [ENEMIES], ignoring ARM.',
      control_system_override_1: '[ENEMY] attacks own base, then loses 1 HP.',
      swarm_spitter_1: 'On play: deal 1 to opposed [ENEMY].',
      wardens_shield_push_1: 'Swap two adjacent [ENEMIES].',
    },
    pl: {
      attrition_swarm_husk_1: 'Śmierć w walce: zadaj 1 [ENEMY] naprzeciw.',
      attrition_swarm_funeral_pyre_1: 'Pierwsze 2 zgony [ALLIES] w walce:\npo 1 ● [ENEMY] naprzeciw.',
      attrition_swarm_infect_1: 'Zadaj 1 [ENEMY]. Jeśli przetrwa, [ALLY] naprzeciwko +1 ATK.',
      control_hacker_1: '[ENEMY] naprzeciwko: -1 ATK w tej turze.',
      control_sniper_1: 'Atakuje [ENEMY] z najniższym HP.',
      control_controller_1: 'Po zagraniu: zamień dwóch [ENEMIES].',
      control_swap_1: 'Zamień miejscami 2 [ALLY] lub 2 [ENEMIES].',
      control_jam_signal_1: 'Wybierz do 2 [ENEMIES]: -1 ATK w tej turze.',
      control_pulse_wave_1: 'Zadaj 1 wszystkim [ENEMIES], ignorując ARM.',
      control_system_override_1: '[ENEMY] atakuje własną\nbazę, potem\ntraci 1 HP.',
      swarm_spitter_1: 'Po zagraniu: zadaj 1 [ENEMY] naprzeciw.',
      wardens_spearwall_1: '[ENEMIES] atakujący\nsąsiednich [ALLIES]: -1 ATK.',
      wardens_shield_push_1: 'Zamień dwóch sąsiadujących [ENEMIES].',
    },
  };

  for (const [locale, dictionary] of Object.entries({ en, pl })) {
    for (const [cardId, textShort] of Object.entries(migrated[locale])) {
      assert.equal(dictionary.cards[cardId].textShort, textShort, `${locale} ${cardId}`);
    }
  }

  assert.equal(en.cards.aggro_runner_1.textShort, 'Open line: enemy base loses 2 HP.');
  assert.equal(en.cards.control_drone_1.textShort, 'On death: enemy base loses 1 HP.');
  assert.equal(en.cards.control_disruptor_1.textShort, "On play: cancel the opponent's next effect.");
  assert.equal(pl.cards.aggro_runner_1.textShort, 'Otwarta linia: baza wroga traci 2 HP.');
  assert.equal(pl.cards.control_drone_1.textShort, 'Po śmierci: baza wroga traci 1 HP.');
  assert.equal(pl.cards.control_disruptor_1.textShort, 'Po zagraniu: anuluj następny efekt przeciwnika.');
  assert.doesNotMatch(JSON.stringify(en.ui), /\[(?:ENEMY|ENEMIES)\]/u);
  assert.doesNotMatch(JSON.stringify(pl.ui), /\[(?:ENEMY|ENEMIES)\]/u);
});

test('card type and stat labels exist in English and Polish dictionaries', () => {
  for (const key of ['cardTypes.unit', 'cardTypes.effect', 'stats.attack', 'stats.hp', 'stats.armor']) {
    assert.equal(typeof getPath(en, key), 'string', `missing English ${key}`);
    assert.equal(typeof getPath(pl, key), 'string', `missing Polish ${key}`);
  }
});

test('every English card display entry has a Polish card display entry', () => {
  for (const [cardId, card] of Object.entries(en.cards)) {
    assert.equal(typeof card.name, 'string', `missing English name for ${cardId}`);
    assert.equal(typeof card.textShort, 'string', `missing English textShort for ${cardId}`);
    assert.equal(typeof pl.cards[cardId]?.name, 'string', `missing Polish name for ${cardId}`);
    assert.equal(typeof pl.cards[cardId]?.textShort, 'string', `missing Polish textShort for ${cardId}`);
  }
});

function allSourceCards() {
  return getFactionKeys().flatMap((factionKey) => getFactionByKey(factionKey)?.deck ?? []);
}

test('enemy action summaries cover every non-unit card effect in English and Polish', () => {
  const cards = allSourceCards();
  const effectIds = [...new Set(cards.filter((card) => card.type !== 'unit').map((card) => card.effectId))];

  for (const effectId of effectIds) {
    assert.equal(typeof getPath(en, `ui.battle.effectSummaries.${effectId}`), 'string', `missing English enemy action summary for ${effectId}`);
    assert.equal(typeof getPath(pl, `ui.battle.effectSummaries.${effectId}`), 'string', `missing Polish enemy action summary for ${effectId}`);
  }
});

test('card detail targeting labels cover every source targeting value in English and Polish', () => {
  const cards = allSourceCards();
  const targetingValues = [...new Set(cards.map((card) => card.targeting ?? 'none'))];

  for (const targeting of targetingValues) {
    assert.equal(typeof getPath(en, `ui.cardDetails.targetingLabels.${targeting}`), 'string', `missing English targeting label for ${targeting}`);
    assert.equal(typeof getPath(pl, `ui.cardDetails.targetingLabels.${targeting}`), 'string', `missing Polish targeting label for ${targeting}`);
  }
});
