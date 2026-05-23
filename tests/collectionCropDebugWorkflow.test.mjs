import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('collection crop debug loads persisted artPositionY before draft edits', () => {
  const source = fs.readFileSync('src/scenes/CollectionScene.js', 'utf8');
  const method = source.slice(source.indexOf('  getCardArtPositionY(card) {'), source.indexOf('  nudgeCardArtPosition(card, delta) {'));

  assert.match(method, /const draftValue = this\.cardArtCropDebug\?\.draftByCardId\?\.get\(cardId\);/);
  assert.match(method, /const persistedValue = getSavedCardArtPositionY\(cardId\);/);
  assert.match(method, /return 0\.5;/);
});

test('collection crop debug COPY CURRENT and COPY ALL share normalized 3-digit value formatting', () => {
  const source = fs.readFileSync('src/scenes/CollectionScene.js', 'utf8');

  assert.match(source, /normalizeCardArtDebugValue\(value, precision = 3\)/);
  assert.match(source, /result\[cardId\] = \{ artPositionY: this\.normalizeCardArtDebugValue\(value\.artPositionY\) \};/);
  assert.match(source, /artPositionY: this\.normalizeCardArtDebugValue\(this\.getCardArtPositionY\(card\)\)/);
});

test('collection crop debug buffer actions remain explicit and isolated', () => {
  const source = fs.readFileSync('src/scenes/CollectionScene.js', 'utf8');

  assert.match(source, /'ADD', \(\) => \{\s*debug\.sessionOverrides\.set\(cardId, \{ artPositionY: this\.getCardArtPositionY\(card\) \}\);/);
  assert.match(source, /'COPY ALL', async \(\) => \{[\s\S]*this\.buildCardArtCropDebugJson\(\)/);
  assert.match(source, /'CLEAR BUFFER', \(\) => \{\s*debug\.sessionOverrides\.clear\(\);/);
});
