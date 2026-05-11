import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
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

test('enemy action summaries cover every non-unit card effect in English and Polish', () => {
  const factionFiles = fs.readdirSync('src/data/factions').filter((file) => file.endsWith('.json'));
  const cards = factionFiles.flatMap((file) => JSON.parse(fs.readFileSync(`src/data/factions/${file}`, 'utf8')).deck ?? []);
  const effectIds = [...new Set(cards.filter((card) => card.type !== 'unit').map((card) => card.effectId))];

  for (const effectId of effectIds) {
    assert.equal(typeof getPath(en, `ui.battle.effectSummaries.${effectId}`), 'string', `missing English enemy action summary for ${effectId}`);
    assert.equal(typeof getPath(pl, `ui.battle.effectSummaries.${effectId}`), 'string', `missing Polish enemy action summary for ${effectId}`);
  }
});

test('card detail targeting labels cover every source targeting value in English and Polish', () => {
  const factionFiles = fs.readdirSync('src/data/factions').filter((file) => file.endsWith('.json'));
  const cards = factionFiles.flatMap((file) => JSON.parse(fs.readFileSync(`src/data/factions/${file}`, 'utf8')).deck ?? []);
  const targetingValues = [...new Set(cards.map((card) => card.targeting ?? 'none'))];

  for (const targeting of targetingValues) {
    assert.equal(typeof getPath(en, `ui.cardDetails.targetingLabels.${targeting}`), 'string', `missing English targeting label for ${targeting}`);
    assert.equal(typeof getPath(pl, `ui.cardDetails.targetingLabels.${targeting}`), 'string', `missing Polish targeting label for ${targeting}`);
  }
});
