import assert from 'node:assert/strict';
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
