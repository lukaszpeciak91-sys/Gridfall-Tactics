import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');

test('focused hand card selection still routes board cells through existing play and targeting logic', () => {
  assert.match(source, /if \(this\.selectedCardId === cardId\) \{\s*this\.playFocusedCard\(card\);\s*return;\s*\}/);
  assert.match(source, /this\.selectedCardId = cardId;\s*this\.targetingState = this\.isUnitCard\(card\) \? null : this\.getTargetingStateForCard\(card\);\s*this\.resetCardHighlights\(\);/);
  assert.match(source, /const result = resolveTargetedEffectCard\(this\.gameState, 'player', this\.selectedCardId, boardIndex, targetIndexes\);/);
  assert.match(source, /const result = playOrRedeployUnit\(this\.gameState, 'player', this\.selectedCardId, boardIndex\);/);
});

test('focused hand card render movement is edge-clamped while the invisible hit area stays unscaled in the hand', () => {
  assert.match(source, /getHandCardFocusTarget\(card, isSelected\) \{/);
  assert.match(source, /Phaser\.Math\.Clamp\(card\.baseX, minX, maxX\)/);
  assert.match(source, /Phaser\.Math\.Clamp\(preferredY,[\s\S]*canvasMaxY\)\)/);
  assert.match(source, /const renderTargets = \[card\.glow, card\.background\]\.filter\(Boolean\);/);
  assert.match(source, /card\.hitArea\.setPosition\(card\.baseX, card\.baseY\);\s*card\.hitArea\.setScale\(1\);/);
  assert.match(source, /card\.hitArea\.setDepth\(card\.baseDepth \+ 3\);/);
  assert.doesNotMatch(source, /const bodyTargets = \[card\.glow, card\.background, card\.hitArea\]/);
});
