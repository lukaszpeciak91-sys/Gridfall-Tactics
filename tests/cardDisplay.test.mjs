import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  getCardDisplayName,
  getCardTextShort,
  getCardTypeLabel,
  getStatLabel,
} from '../src/localization/cardDisplay.js';

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

test('deck info panel routes card name, type label, and unknown fallback through display adapter', () => {
  const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
  const start = source.indexOf('  summarizeCardEntries(cards) {');
  const end = source.indexOf('  drawHand() {');
  const deckInfoSummarySource = source.slice(start, end);

  assert.match(source, /import \{ getCardDisplayName, getCardTypeLabel \} from '\.\.\/localization\/cardDisplay\.js';/);
  assert.match(deckInfoSummarySource, /const name = getCardDisplayName\(card\) \?\? 'Unknown Card';/);
  assert.match(deckInfoSummarySource, /const typeLabel = getCardTypeLabel\(card\);/);
  assert.doesNotMatch(deckInfoSummarySource, /const name = card\.name \?\? 'Unknown Card'/);
  assert.doesNotMatch(deckInfoSummarySource, /card\.type === 'effect' \? 'Effect' : 'Unit'/);
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
