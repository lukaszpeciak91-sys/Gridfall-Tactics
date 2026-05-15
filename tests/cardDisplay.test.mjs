import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  getCardDisplayName,
  getCardTextShort,
  getCardTypeLabel,
  getStatLabel,
} from '../src/localization/cardDisplay.js';
import {
  formatBoardUnitLabel,
  formatCardDetailLines,
  formatCollectionRowLabel,
  formatDeckSummaryEntry,
  formatHandCardLabel,
} from '../src/rendering/cardRenderModes.js';
import { getFactionByKey, getFactionKeys } from '../src/data/factions/index.js';

test('card display helper falls back to current card name fields when card keys are absent', () => {
  assert.equal(getCardDisplayName({ name: 'Shield Drone' }), 'Shield Drone');
  assert.equal(getCardDisplayName({ name: 'Shield Drone' }, 'pl'), 'Shield Drone');
  assert.equal(getCardDisplayName({}), undefined);
});

test('card display helper falls back to current textShort fields when card keys are absent', () => {
  assert.equal(getCardTextShort({ textShort: 'Target ally +1 ARM until combat ends.' }), 'Target ally +1 ARM until combat ends.');
  assert.equal(getCardTextShort({ textShort: 'Target ally +1 ARM until combat ends.' }, 'pl'), 'Target ally +1 ARM until combat ends.');
  assert.equal(getCardTextShort({}), undefined);
});

test('card display helper can resolve future nameKey and textKey fields through English dictionary', () => {
  const keyedCard = {
    id: 'aggro_runner_1',
    name: 'Legacy Runner Name',
    nameKey: 'cards.aggro_runner_1.name',
    textShort: 'Legacy Runner Text',
    textKey: 'cards.aggro_runner_1.textShort',
  };

  assert.equal(getCardDisplayName(keyedCard, 'en'), 'Ballroom Duelist');
  assert.equal(getCardTextShort(keyedCard, 'en'), 'Open enemy line: enemy hero loses 2 HP.');
  assert.equal(getCardDisplayName(keyedCard, 'pl'), 'Balowy Pojedynkowicz');
  assert.equal(getCardTextShort(keyedCard, 'pl'), 'Otwarta linia wroga: wrogi bohater traci 2 HP.');
});

test('card display helper uses existing card fields when future translation keys are missing', () => {
  const keyedCard = {
    name: 'Fallback Name',
    nameKey: 'cards.missing.name',
    textShort: 'Fallback text.',
    textKey: 'cards.missing.textShort',
  };

  assert.equal(getCardDisplayName(keyedCard, 'en'), 'Fallback Name');
  assert.equal(getCardTextShort(keyedCard, 'en'), 'Fallback text.');
});

test('card display helper keeps current English type and stat labels', () => {
  assert.equal(getCardTypeLabel({ type: 'effect' }), 'Effect');
  assert.equal(getCardTypeLabel({ type: 'unit' }), 'Unit');
  assert.equal(getCardTypeLabel({ type: 'order' }), 'Effect');
  assert.equal(getCardTypeLabel({}), 'Unit');
  assert.equal(getStatLabel('attack'), 'ATK');
  assert.equal(getStatLabel('hp'), 'HP');
  assert.equal(getStatLabel('armor'), 'ARM');
  assert.equal(getStatLabel('speed'), 'speed');
});

test('card render mode helpers keep compact and full card text separate', () => {
  const card = {
    name: 'Shield Drone',
    type: 'unit',
    attack: 1,
    hp: 4,
    armor: 2,
    textShort: 'Blocks line. This unit can’t attack.',
    description: 'A long rules description that must stay off compact board units.',
    targeting: 'ally',
    effectId: 'cannot_attack',
  };

  assert.equal(formatBoardUnitLabel(card), 'Shield Drone\nATK 1 / HP 4 / ARM 2');
  assert.doesNotMatch(formatBoardUnitLabel(card), /Blocks line|can’t attack|long rules description|textShort/);
  assert.equal(formatHandCardLabel(card), 'Shield Drone\n1/4 ARM 2\nBlocks line. This unit can’t attack.');
  assert.deepEqual(formatCollectionRowLabel(card), {
    name: 'Shield Drone',
    typeStats: 'Unit • ATK 1 / HP 4',
    textShort: 'Blocks line. This unit can’t attack.',
  });
  assert.deepEqual(formatCardDetailLines(card), [
    'Shield Drone',
    'Type: Unit',
    'ATK/HP: 1 / 4',
    'Target: ally',
    '',
    'Blocks line. This unit can’t attack.',
  ]);
});

test('hand/full formatter includes textShort and preserves unit stat line output', () => {
  const card = {
    name: 'Shield Drone',
    type: 'unit',
    attack: 1,
    hp: 4,
    armor: 2,
    textShort: ' Blocks line. This unit can’t attack. ',
  };

  assert.equal(formatHandCardLabel(card), 'Shield Drone\n1/4 ARM 2\nBlocks line. This unit can’t attack.');
});

test('Wardens vanilla units render without placeholder body text', () => {
  const { deck } = getFactionByKey('Wardens');
  const bastionGuard = deck.find((card) => card.id === 'wardens_bastion_guard_1');
  const watchCaptain = deck.find((card) => card.id === 'wardens_watch_captain_1');

  assert.equal(formatHandCardLabel(bastionGuard), 'Bastion Keeper\n1/3 ARM 0');
  assert.equal(formatCollectionRowLabel(bastionGuard).textShort, '');
  assert.equal(formatCardDetailLines(watchCaptain).at(-1), '');
  assert.doesNotMatch(formatHandCardLabel(bastionGuard), /UNIT|NO EFFECT|No special behavior/i);
  assert.doesNotMatch(formatHandCardLabel(watchCaptain), /UNIT|NO EFFECT|No special behavior/i);
});

test('hand/full formatter includes effect card textShort without unit stats', () => {
  const card = {
    name: 'Repair Kit',
    type: 'effect',
    attack: 99,
    hp: 99,
    armor: 99,
    textShort: 'Heal 3.',
  };

  assert.equal(formatHandCardLabel(card), 'Repair Kit\nHeal +3 ●.');
});

test('battle hand cards route content through card visual layout helpers and preserve formatter output', () => {
  const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
  const unitCard = {
    name: 'Shield Drone',
    type: 'unit',
    attack: 1,
    hp: 4,
    armor: 2,
    textShort: ' Blocks line. This unit can’t attack. ',
  };
  const effectCard = {
    name: 'Repair Kit',
    type: 'effect',
    textShort: 'Heal 3.',
  };

  assert.match(source, /import \{ formatDeckSummaryEntry \} from '\.\.\/rendering\/cardRenderModes\.js';/);
  assert.match(source, /getCardDisplayContent\(card, getActiveLocale\(\)\)/);
  assert.match(source, /getCardStatValues\(card\)/);
  assert.doesNotMatch(source, /card\.textShort/);
  assert.doesNotMatch(source, /`\$\{atk\}\/\$\{hp\} ARM \$\{armor\}`/);
  assert.equal(formatHandCardLabel(unitCard), 'Shield Drone\n1/4 ARM 2\nBlocks line. This unit can’t attack.');
  assert.equal(formatHandCardLabel(effectCard), 'Repair Kit\nHeal +3 ●.');
  assert.equal(formatHandCardLabel(null), 'Empty');
});

test('card render mode helpers preserve English fallback behavior for future locales', () => {
  const card = { name: 'Shield Drone', type: 'effect', textShort: 'Target ally +1 ARM until combat ends.' };

  assert.equal(formatHandCardLabel(card, 'pl'), 'Shield Drone\nTarget ally +1 ◆ until combat ends.');
  assert.deepEqual(formatDeckSummaryEntry(card, 'pl'), { name: 'Shield Drone', typeLabel: 'Efekt', count: 1 });
  assert.deepEqual(formatDeckSummaryEntry({}, 'pl'), { name: 'Nieznana karta', typeLabel: 'Jednostka', count: 1 });
});

test('deck info panel routes card summary entries through render mode formatter', () => {
  const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
  const start = source.indexOf('  summarizeCardEntries(cards) {');
  const end = source.indexOf('  drawHand() {');
  const deckInfoSummarySource = source.slice(start, end);

  assert.match(source, /import \{ formatDeckSummaryEntry \} from '\.\.\/rendering\/cardRenderModes\.js';/);
  assert.match(deckInfoSummarySource, /const entry = formatDeckSummaryEntry\(card, getActiveLocale\(\)\);/);
  assert.doesNotMatch(deckInfoSummarySource, /const name = card\.name \?\? 'Unknown Card'/);
  assert.doesNotMatch(deckInfoSummarySource, /card\.type === 'effect' \? 'Effect' : 'Unit'/);
});

test('deck summary entry output remains unchanged', () => {
  const entry = formatDeckSummaryEntry({ name: 'Shield Drone', type: 'unit' });

  assert.equal(`• ${entry.name} — ${entry.typeLabel} ×${entry.count}`, '• Shield Drone — Unit ×1');
});

test('deck info panel output templates remain unchanged', () => {
  const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
  const start = source.indexOf('  formatDeckInfoGroup(heading, cards) {');
  const end = source.indexOf('  summarizeCardEntries(cards) {');
  const deckInfoFormattingSource = source.slice(start, end);

  assert.match(deckInfoFormattingSource, /translateActive\('ui\.common\.none', 'None'\)/);
  assert.match(deckInfoFormattingSource, /`• \$\{entry\.name\} — \$\{entry\.typeLabel\} ×\$\{entry\.count\}`/);
  assert.match(source, /return groups\.map\(\(\[heading, cards\]\) => this\.formatDeckInfoGroup\(heading, cards\)\)\.join\('\\n\\n'\);/);
});

test('visible UI surfaces route names through active-locale presentation helpers', () => {
  const battleSource = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
  const collectionSource = fs.readFileSync('src/scenes/CollectionScene.js', 'utf8');
  const factionSelectSource = fs.readFileSync('src/scenes/FactionSelectScene.js', 'utf8');

  assert.match(battleSource, /getEnemyActionMessage\(action, card\) \{[\s\S]*const cardName = getCardDisplayName\(card, getActiveLocale\(\)\) \?\? translateActive\('ui\.common\.unknownCard', 'Unknown Card'\);/);
  assert.match(battleSource, /createBoardUnitView\(cell, unit\) \{[\s\S]*createStatBadges\(this, 0, statY, artWidth, statHeight, this\.getBoardUnitStats\(unit\)\)/);
  assert.doesNotMatch(battleSource, /getBoardUnitLabel\(unit\)/);
  assert.match(battleSource, /createHandCardView\(\{[\s\S]*card,[\s\S]*cardId,[\s\S]*x,[\s\S]*y,[\s\S]*width,[\s\S]*height,[\s\S]*accentColor,[\s\S]*depth[\s\S]*\}\) \{[\s\S]*getCardDisplayContent\(card, getActiveLocale\(\)\)/);
  assert.match(battleSource, /showSelectedHandCardZoom\(\) \{[\s\S]*this\.createHandCardView\(\{/);
  assert.match(collectionSource, /formatCollectionRowLabel\(card, getActiveLocale\(\)\)/);
  assert.match(collectionSource, /formatCardDetailLines\(card, getActiveLocale\(\)\)/);
  assert.match(collectionSource, /getFactionPresentationName\(faction\?\.id, getActiveLocale\(\), faction\?\.name \?\? factionKey\)/);
  assert.match(factionSelectSource, /getFactionPresentationName\(faction\?\.id, getActiveLocale\(\), faction\?\.name \?\? factionKey\)/);
});

test('board unit compact view keeps top stats, art space, and a bottom name strip without effect text', () => {
  const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
  const start = source.indexOf('  createBoardUnitView(cell, unit) {');
  const end = source.indexOf('  refreshBoardLabels() {');
  const boardUnitViewSource = source.slice(start, end);

  assert.match(boardUnitViewSource, /const statHeight = Math\.max\(22, Math\.min\(32, Math\.round\(unitHeight \* 0\.18\)\)\);/);
  assert.match(boardUnitViewSource, /const nameHeight = Math\.max\(18, Math\.min\(30, Math\.round\(unitHeight \* 0\.19\)\)\);/);
  assert.match(boardUnitViewSource, /const displayName = getCardDisplayName\(unit, getActiveLocale\(\)\) \?\? translateActive\('ui\.common\.unit', 'Unit'\);/);
  assert.match(boardUnitViewSource, /const stats = createStatBadges\(this, 0, statY, artWidth, statHeight, this\.getBoardUnitStats\(unit\)\);/);
  assert.match(boardUnitViewSource, /const namePanel = this\.add\.rectangle\(0, nameY, artWidth, nameHeight, CARD_COLORS\.namePanel, 0\.9\)/);
  assert.match(boardUnitViewSource, /const nameText = this\.createBoardUnitNameText\(0, nameY, artWidth, nameHeight, displayName\);/);
  assert.doesNotMatch(boardUnitViewSource, /getCardTextShort|getCardDisplayContent|createInlineStatText|bodyText|textPanel/);
});

test('current faction card display names use locale presentation overrides without mutating gameplay card names', () => {
  for (const factionKey of getFactionKeys()) {
    const faction = getFactionByKey(factionKey);
    for (const card of faction.deck) {
      const before = JSON.stringify(card);
      const displayNameEn = getCardDisplayName(card, 'en');
      const displayNamePl = getCardDisplayName(card, 'pl');
      assert.equal(typeof displayNameEn, 'string');
      assert.notEqual(displayNameEn.length, 0);
      assert.notEqual(displayNamePl.length, 0);
      assert.equal(card.id, JSON.parse(before).id);
      assert.equal(card.name, JSON.parse(before).name);
      assert.equal(JSON.stringify(card), before);
      assert.equal(getCardTextShort(card, 'en'), card.textShort);
      assert.equal(typeof getCardTextShort(card, 'pl'), 'string');
    }
  }
});

test('presentation overrides resolve through render modes and preserve gameplay ids', () => {
  const faction = getFactionByKey('Aggro');
  const runner = faction.deck.find((card) => card.id === 'aggro_runner_1');
  const before = JSON.stringify(runner);

  assert.equal(runner.name, 'Runner');
  assert.equal(getCardDisplayName(runner, 'en'), 'Ballroom Duelist');
  assert.equal(formatHandCardLabel(runner, 'en').split('\n')[0], 'Ballroom Duelist');
  assert.equal(formatBoardUnitLabel(runner, 'en').split('\n')[0], 'Ballroom Duelist');
  assert.deepEqual(formatCollectionRowLabel(runner, 'en'), {
    name: 'Ballroom Duelist',
    typeStats: 'Unit • ATK 2 / HP 1',
    textShort: 'Open enemy line: enemy hero loses 2 ●.',
  });
  assert.equal(formatDeckSummaryEntry(runner, 'en').name, 'Ballroom Duelist');
  assert.equal(getCardDisplayName(runner, 'pl'), 'Balowy Pojedynkowicz');
  assert.equal(formatHandCardLabel(runner, 'pl').split('\n')[0], 'Balowy Pojedynkowicz');
  assert.equal(formatBoardUnitLabel(runner, 'pl').split('\n')[0], 'Balowy Pojedynkowicz');
  assert.deepEqual(formatCollectionRowLabel(runner, 'pl'), {
    name: 'Balowy Pojedynkowicz',
    typeStats: 'Jednostka • ATK 2 / HP 1',
    textShort: 'Otwarta linia wroga: wrogi bohater traci 2 ●.',
  });
  assert.equal(formatDeckSummaryEntry(runner, 'pl').name, 'Balowy Pojedynkowicz');
  assert.equal(runner.id, 'aggro_runner_1');
  assert.equal(runner.name, 'Runner');
  assert.equal(JSON.stringify(runner), before);
});
