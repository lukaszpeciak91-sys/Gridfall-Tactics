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


test('startup copy is localized for English and Polish', () => {
  assert.equal(getPath(en, 'ui.startup.preparingBroadcast'), 'PREPARING BROADCAST');
  assert.equal(getPath(en, 'ui.startup.tapAnywhere'), 'TAP ANYWHERE');
  assert.equal(getPath(pl, 'ui.startup.preparingBroadcast'), 'PRZYGOTOWYWANIE TRANSMISJI');
  assert.equal(getPath(pl, 'ui.startup.tapAnywhere'), 'DOTKNIJ GDZIEKOLWIEK');
});

test('faction select title copy is localized for English and Polish', () => {
  assert.equal(getPath(en, 'ui.factionSelect.title'), 'SELECT YOUR TEAM');
  assert.equal(getPath(pl, 'ui.factionSelect.title'), 'WYBIERZ DRUŻYNĘ');
});

test('arena faction select title copy is localized for English and Polish', () => {
  assert.equal(getPath(en, 'ui.factionSelect.arenaTitle'), 'ARENA');
  assert.equal(getPath(pl, 'ui.factionSelect.arenaTitle'), 'ARENA');
});

test('arena faction select helper describes random opponents and arenas', () => {
  assert.equal(
    getPath(en, 'ui.factionSelect.arenaHelper'),
    'Choose your team. Your opponent and an arena from another dimension will be selected at random.',
  );
  assert.equal(
    getPath(pl, 'ui.factionSelect.arenaHelper'),
    'Wybierz drużynę. Przeciwnik i arena z innego wymiaru zostaną wybrani losowo.',
  );
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
    Burst: 'Pressure',
    Armor: 'Armor',
    Sustain: 'Sustain',
    Support: 'Support',
    Disrupt: 'Disrupt',
    Move: 'Move',
    Swarm: 'Swarm',
    Growth: 'Growth',
    Attrition: 'Attrition',
    Return: 'Return',
    Formation: 'Formation',
    Tempo: 'Tempo',
    Overload: 'Overload',
  };
  const expectedPl = {
    Rush: 'Szarża',
    Burst: 'Presja',
    Armor: 'Pancerz',
    Sustain: 'Utrzymanie',
    Support: 'Wsparcie',
    Disrupt: 'Zakłócenia',
    Move: 'Ruch',
    Swarm: 'Rój',
    Growth: 'Wzrost',
    Attrition: 'Wyniszczenie',
    Return: 'Powrót',
    Formation: 'Formacja',
    Tempo: 'Tempo',
    Overload: 'Przeciążenie',
  };

  assert.deepEqual(getPath(en, 'ui.factionSelect.tags'), expectedEn);
  assert.deepEqual(getPath(pl, 'ui.factionSelect.tags'), expectedPl);
});

test('retry button copy stays short in Polish without changing English', () => {
  assert.equal(getPath(en, 'ui.common.retry'), 'RETRY');
  assert.equal(getPath(pl, 'ui.common.retry'), 'PONÓW');
});


test('battle result modal flavor subtitles are localized for English and Polish', () => {
  assert.deepEqual(getPath(en, 'ui.battle.resultSubtitles.victory'), [
    'The audience is delighted.',
    'What a spectacle!',
    'Total domination!',
    'The crowd is going wild!',
  ]);
  assert.deepEqual(getPath(en, 'ui.battle.resultSubtitles.defeat'), [
    'The audience demands more.',
    'The crowd expected more.',
    'It wasn’t enough this time.',
    'Not everyone gets to leave the stage in glory.',
  ]);
  assert.equal(getPath(en, 'ui.battle.resultSubtitles.draw'), 'Production ordered a rematch.');

  assert.deepEqual(getPath(pl, 'ui.battle.resultSubtitles.victory'), [
    'Publiczność zachwycona.',
    'Co za wspaniałe widowisko!',
    'Totalna dominacja!',
    'Widzowie oszaleli z zachwytu!',
  ]);
  assert.deepEqual(getPath(pl, 'ui.battle.resultSubtitles.defeat'), [
    'Publiczność domaga się więcej.',
    'Widzowie liczyli na coś więcej.',
    'Tym razem to nie wystarczyło.',
    'Nie każdy schodzi ze sceny w chwale.',
  ]);
  assert.equal(getPath(pl, 'ui.battle.resultSubtitles.draw'), 'Produkcja zarządziła dogrywkę.');
});


test('battle result stat labels are localized for English and Polish', () => {
  assert.equal(getPath(en, 'ui.battle.resultStats.turns'), 'Turns');
  assert.equal(getPath(en, 'ui.battle.resultStats.time'), 'Time');
  assert.equal(getPath(pl, 'ui.battle.resultStats.turns'), 'Tury');
  assert.equal(getPath(pl, 'ui.battle.resultStats.time'), 'Czas');
});

test('battle utility drawer labels are explicit in English and Polish', () => {
  assert.deepEqual(
    ['utilityMenuRules', 'utilityMenuSettings', 'utilityMenuSurrender'].map((key) => getPath(en, `ui.battle.${key}`)),
    ['Rules', 'Settings', 'Surrender'],
  );
  assert.deepEqual(
    ['utilityMenuRules', 'utilityMenuSettings', 'utilityMenuSurrender'].map((key) => getPath(pl, `ui.battle.${key}`)),
    ['Zasady', 'Ustawienia', 'Poddaj'],
  );
  assert.equal(getPath(en, 'ui.battle.surrenderConfirmTitle'), 'SURRENDER?');
  assert.equal(getPath(en, 'ui.battle.surrenderConfirmBody'), 'This counts as a defeat.');
  assert.equal(getPath(en, 'ui.battle.surrenderConfirm'), 'Surrender');
  assert.equal(getPath(en, 'ui.battle.surrenderCancel'), 'Cancel');
  assert.equal(getPath(pl, 'ui.battle.surrenderConfirmTitle'), 'PODDAĆ BITWĘ?');
  assert.equal(getPath(pl, 'ui.battle.surrenderConfirmBody'), 'To zostanie uznane za porażkę.');
  assert.equal(getPath(pl, 'ui.battle.surrenderConfirm'), 'Poddaj');
  assert.equal(getPath(pl, 'ui.battle.surrenderCancel'), 'Anuluj');
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
    effectCardPlayBlocked: 'You cannot play effect cards.',
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
    effectCardPlayBlocked: 'Nie możesz zagrać karty efektu.',
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
  for (const key of ['selectEnemy', 'selectFirstEnemy', 'selectSecondEnemy', 'controllerSelectFirstEnemy', 'controllerSelectSecondEnemy', 'selectAdjacentEnemy', 'selectAlly', 'selectUnit']) {
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
      attrition_swarm_husk_1: 'When this dies:\n-1 [HP] to opposed [ENEMY]',
      attrition_swarm_funeral_pyre_1: 'First [ALLY] death each turn:\nenemy base loses 1 HP',
      attrition_swarm_infect_1: 'Deal 1 to [ENEMY]\nOpposed [ALLY] gains +1 [ATK]',
      control_hacker_1: 'Opposed [ENEMY]: -1 ATK until combat',
      control_sniper_1: 'Attacks the lowest-HP [ENEMY]\nTies: highest ATK',
      control_controller_1: 'On play: swap two [ENEMIES]',
      control_swap_1: 'Swap 2 [ALLY] or 2 [ENEMIES]',
      control_jam_signal_1: 'Up to 2 [ENEMIES]: -1 ATK until combat',
      control_pulse_wave_1: 'Deal 1 to all [ENEMIES] ignoring ARM',
      control_system_override_1: 'Selected [ENEMY] attacks its own base\nThen loses 1 HP',
      swarm_spitter_1: 'On play: deal 1 to opposed [ENEMY]',
      wardens_shield_push_1: 'Swap two adjacent [ENEMIES]\n-1 ATK this combat',
    },
    pl: {
      attrition_swarm_husk_1: 'Gdy ginie:\n-1 [HP] [ENEMY] naprzeciw',
      attrition_swarm_funeral_pyre_1: 'Pierwszy zgon [ALLY] w turze:\n-1 [HP] bazie wroga',
      attrition_swarm_infect_1: 'Zadaj 1 [ENEMY]\n[ALLY] naprzeciwko +1 [ATK]',
      control_hacker_1: '[ENEMY] naprzeciwko: -1 ATK do walki',
      control_sniper_1: 'Atakuje [ENEMY] z najniższym [HP] i najwyższym [ATK]',
      control_controller_1: 'Po zagraniu: zamień dwóch [ENEMIES]',
      control_swap_1: 'Zamień miejscami 2 [ALLY] lub 2 [ENEMIES]',
      control_jam_signal_1: 'Do 2 [ENEMIES]: -1 ATK do walki',
      control_pulse_wave_1: 'Zadaj 1 wszystkim [ENEMIES] ignorując ARM',
      control_system_override_1: 'Wybrany [ENEMY] atakuje własną bazę\nPotem traci 1 HP',
      swarm_spitter_1: 'Po zagraniu: zadaj 1 [ENEMY] naprzeciw',
      wardens_spearwall_1: '[ENEMIES] atakujący\nsąsiednich [ALLIES]: -1 ATK',
      wardens_shield_push_1: 'Zamień dwóch sąsiednich [ENEMIES]\n-1 ATK do walki',
    },
  };

  for (const [locale, dictionary] of Object.entries({ en, pl })) {
    for (const [cardId, textShort] of Object.entries(migrated[locale])) {
      assert.equal(dictionary.cards[cardId].textShort, textShort, `${locale} ${cardId}`);
    }
  }

  assert.equal(en.cards.aggro_runner_1.textShort, 'Open lane: +2 ATK');
  assert.equal(en.cards.control_drone_1.textShort, 'On death: enemy base loses 1 HP');
  assert.equal(en.cards.control_disruptor_1.textShort, "Until combat opponent cannot play effect cards");
  assert.equal(pl.cards.aggro_runner_1.textShort, 'Pusta linia: +2 ATK');
  assert.equal(pl.cards.control_drone_1.textShort, 'Po śmierci: baza wroga traci 1 HP');
  assert.equal(pl.cards.control_disruptor_1.textShort, 'Do walki przeciwnik nie może zagrać kart efektu');
  assert.doesNotMatch(JSON.stringify(en.ui), /\[(?:ENEMY|ENEMIES)\]/u);
  assert.doesNotMatch(JSON.stringify(pl.ui), /\[(?:ENEMY|ENEMIES)\]/u);
});

test('Party Host Polish text states first adjacent ally death and keeps permanent ATK wording', () => {
  assert.equal(
    pl.cards.attrition_swarm_rotcaller_1.textShort,
    'Zgon pierwszego sąsiedniego [ALLY]:\n+1 [ATK] na stałe',
  );
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
