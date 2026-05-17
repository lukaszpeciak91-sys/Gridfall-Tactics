import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { getFactionByKey, getFactionKeys } from '../src/data/factions/index.js';
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


test('faction select metadata covers Attrition Swarm without Aggro fallback details', () => {
  const source = fs.readFileSync('src/scenes/FactionSelectScene.js', 'utf8');
  const detailsStart = source.indexOf('const FACTION_CARD_DETAILS = {');
  const detailsEnd = source.indexOf('const CARD_SCROLL_DRAG_THRESHOLD');
  const detailsSource = source.slice(detailsStart, detailsEnd);

  assert.match(detailsSource, /'Attrition Swarm': \{/);
  assert.match(detailsSource, /tags: \['Attrition', 'Death'\]/);
  assert.match(detailsSource, /description: 'Death value and recursion\.'/);
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
