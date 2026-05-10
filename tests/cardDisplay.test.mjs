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

test('card display helper falls back to current card name fields without translation data', () => {
  assert.equal(getCardDisplayName({ name: 'Shield Drone' }), 'Shield Drone');
  assert.equal(getCardDisplayName({ name: 'Shield Drone' }, 'pl'), 'Shield Drone');
  assert.equal(getCardDisplayName({}), undefined);
});

test('card display helper falls back to current textShort fields without translation data', () => {
  assert.equal(getCardTextShort({ textShort: 'Target ally +1 ARM until combat ends.' }), 'Target ally +1 ARM until combat ends.');
  assert.equal(getCardTextShort({ textShort: 'Target ally +1 ARM until combat ends.' }, 'pl'), 'Target ally +1 ARM until combat ends.');
  assert.equal(getCardTextShort({}), undefined);
});

test('card display helper keeps current English type and stat labels', () => {
  assert.equal(getCardTypeLabel({ type: 'effect' }), 'Effect');
  assert.equal(getCardTypeLabel({ type: 'unit' }), 'Unit');
  assert.equal(getCardTypeLabel({ type: 'order' }), 'Unit');
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
    textShort: 'Blocks lane. Cannot attack.',
    description: 'A long rules description that must stay off compact board units.',
    targeting: 'ally',
    effectId: 'cannot_attack',
  };

  assert.equal(formatBoardUnitLabel(card), 'Shield Drone\nATK 1 / HP 4 / ARM 2');
  assert.doesNotMatch(formatBoardUnitLabel(card), /Blocks lane|Cannot attack|long rules description|textShort/);
  assert.equal(formatHandCardLabel(card), 'Shield Drone\n1/4 ARM 2\nBlocks lane. Cannot attack.');
  assert.deepEqual(formatCollectionRowLabel(card), {
    name: 'Shield Drone',
    typeStats: 'unit • ATK 1 / HP 4',
    textShort: 'Blocks lane. Cannot attack.',
  });
  assert.deepEqual(formatCardDetailLines(card), [
    'Shield Drone',
    'Type: unit',
    'ATK/HP: 1 / 4',
    'targeting: ally',
    'effectId: cannot_attack',
    '',
    'Blocks lane. Cannot attack.',
  ]);
});


test('hand/full formatter includes textShort and preserves unit stat line output', () => {
  const card = {
    name: 'Shield Drone',
    type: 'unit',
    attack: 1,
    hp: 4,
    armor: 2,
    textShort: ' Blocks lane. Cannot attack. ',
  };

  assert.equal(formatHandCardLabel(card), 'Shield Drone\n1/4 ARM 2\nBlocks lane. Cannot attack.');
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

  assert.equal(formatHandCardLabel(card), 'Repair Kit\nHeal 3.');
});

test('battle hand labels route through HAND/FULL formatter and preserve visible output', () => {
  const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
  const start = source.indexOf('  getHandCardLabel(card) {');
  const end = source.indexOf('  onCardPointerDown(cardId) {');
  const handLabelSource = source.slice(start, end);
  const unitCard = {
    name: 'Shield Drone',
    type: 'unit',
    attack: 1,
    hp: 4,
    armor: 2,
    textShort: ' Blocks lane. Cannot attack. ',
  };
  const effectCard = {
    name: 'Repair Kit',
    type: 'effect',
    textShort: 'Heal 3.',
  };

  assert.match(source, /import \{ formatDeckSummaryEntry, formatHandCardLabel \} from '\.\.\/rendering\/cardRenderModes\.js';/);
  assert.match(source, /import \{ getActiveLocale \} from '\.\.\/localization\/localeService\.js';/);
  assert.match(handLabelSource, /return formatHandCardLabel\(card, getActiveLocale\(\)\);/);
  assert.doesNotMatch(handLabelSource, /card\.textShort/);
  assert.doesNotMatch(handLabelSource, /`\$\{atk\}\/\$\{hp\} ARM \$\{armor\}`/);
  assert.equal(formatHandCardLabel(unitCard), 'Shield Drone\n1/4 ARM 2\nBlocks lane. Cannot attack.');
  assert.equal(formatHandCardLabel(effectCard), 'Repair Kit\nHeal 3.');
  assert.equal(formatHandCardLabel(null), 'Empty');
});

test('card render mode helpers preserve English fallback behavior for future locales', () => {
  const card = { name: 'Shield Drone', type: 'effect', textShort: 'Target ally +1 ARM until combat ends.' };

  assert.equal(formatHandCardLabel(card, 'pl'), 'Shield Drone\nTarget ally +1 ARM until combat ends.');
  assert.deepEqual(formatDeckSummaryEntry(card, 'pl'), { name: 'Shield Drone', typeLabel: 'Effect', count: 1 });
  assert.deepEqual(formatDeckSummaryEntry({}, 'pl'), { name: 'Unknown Card', typeLabel: 'Unit', count: 1 });
});

test('deck info panel routes card summary entries through render mode formatter', () => {
  const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
  const start = source.indexOf('  summarizeCardEntries(cards) {');
  const end = source.indexOf('  drawHand() {');
  const deckInfoSummarySource = source.slice(start, end);

  assert.match(source, /import \{ formatDeckSummaryEntry, formatHandCardLabel \} from '\.\.\/rendering\/cardRenderModes\.js';/);
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

  assert.match(deckInfoFormattingSource, /return `\$\{heading\} \(\$\{total\}\)\\n• None`;/);
  assert.match(deckInfoFormattingSource, /`• \$\{entry\.name\} — \$\{entry\.typeLabel\} ×\$\{entry\.count\}`/);
  assert.match(source, /return groups\.map\(\(\[heading, cards\]\) => this\.formatDeckInfoGroup\(heading, cards\)\)\.join\('\\n\\n'\);/);
});
