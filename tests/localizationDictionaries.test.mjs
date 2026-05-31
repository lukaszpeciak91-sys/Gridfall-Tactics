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

test('retry button copy stays short in Polish without changing English', () => {
  assert.equal(getPath(en, 'ui.common.retry'), 'RETRY');
  assert.equal(getPath(pl, 'ui.common.retry'), 'PONÓW');
});

test('player effect confirmation banner copy is localized for English and Polish', () => {
  assert.equal(getPath(en, 'ui.battle.playerPlayed'), 'YOU PLAYED');
  assert.equal(getPath(pl, 'ui.battle.playerPlayed'), 'ZAGRANO');
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

test('rules glossary explains the non-unit effect indicator in English and Polish', () => {
  assert.equal(getPath(en, 'ui.rules.glossaryDescriptions.effectCard'), 'Effect card — not a unit and has no ATK / ARM / HP.');
  assert.equal(getPath(pl, 'ui.rules.glossaryDescriptions.effectCard'), 'Karta efektu — nie jest jednostką i nie ma ATK / ARM / HP.');
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
