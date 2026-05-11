import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  factionPresentation,
  getCardPresentationName,
  getFactionPresentation,
  getFactionPresentationName,
} from '../src/data/presentation/factionPresentation.js';

const factionDir = 'src/data/factions';
const factionFiles = ['aggro.json', 'attrition-swarm.json', 'control.json', 'swarm.json', 'tank.json', 'wardens.json'];

function loadFactions() {
  return factionFiles.map((file) => JSON.parse(fs.readFileSync(path.join(factionDir, file), 'utf8')));
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

test('faction presentation names resolve by locale with safe fallbacks', () => {
  assert.equal(getFactionPresentationName('aggro', 'en'), 'Porcelain Court');
  assert.equal(getFactionPresentationName('aggro'), 'Porcelain Court');
  assert.equal(getFactionPresentationName('aggro', 'pl'), 'Porcelanowy Dwór');
  assert.equal(getFactionPresentationName('aggro', 'de'), 'Porcelain Court');
  assert.equal(getFactionPresentationName('missing-faction', 'pl'), null);
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
