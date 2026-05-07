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

test('focused hand card render movement is edge-clamped while the invisible hit area follows the playable card body', () => {
  assert.match(source, /getHandCardFocusTarget\(card, isSelected\) \{/);
  assert.match(source, /Phaser\.Math\.Clamp\(card\.baseX, minX, maxX\)/);
  assert.match(source, /Phaser\.Math\.Clamp\(preferredY,[\s\S]*canvasMaxY\)\)/);
  assert.match(source, /const bodyTargets = \[card\.glow, card\.background, card\.hitArea\]\.filter\(Boolean\);/);
  assert.match(source, /card\.hitArea\.setPosition\(card\.baseX, card\.baseY\);\s*card\.hitArea\.setScale\(1\);/);
  assert.match(source, /card\.hitArea\.setDepth\(topDepth \+ 3\);/);
  assert.match(source, /targets: bodyTargets,\s*x: focusTarget\.x,\s*y: focusTarget\.y,\s*scaleX: focusTarget\.scale,\s*scaleY: focusTarget\.scale,/);
  assert.doesNotMatch(source, /card\.hitArea\.setDepth\(card\.baseDepth \+ 3\);/);
});

test('hand card focus state stays separate from gameplay and mulligan selection state', () => {
  assert.match(source, /this\.focusedCardId = null;\s*this\.focusedCardView = null;\s*this\.selectedCardId = null;/);
  assert.match(source, /if \(this\.openingMulliganPending\) \{\s*this\.selectedCardId = null;\s*this\.focusedCardId = null;\s*this\.focusedCardView = null;\s*this\.targetingState = null;\s*this\.pendingSwapIndex = null;\s*this\.toggleOpeningMulliganCard\(cardId\);\s*return;\s*\}/);
  assert.doesNotMatch(source, /if \(this\.openingMulliganPending\) \{\s*this\.focusHandCard\(cardId\);/);
  assert.match(source, /this\.selectedMulliganCardIds\.length < MAX_OPENING_MULLIGAN_CARDS/);
  assert.match(source, /const isMulliganSelected = this\.openingMulliganPending && this\.selectedMulliganCardIds\.includes\(card\.cardId\);/);
  assert.match(source, /const isGameplaySelected = !this\.openingMulliganPending && card\.cardId === this\.selectedCardId;/);
  assert.match(source, /const isFocused = !this\.openingMulliganPending && \(card\.cardId === this\.focusedCardId \|\| isGameplaySelected\);/);
});

test('opening mulligan cleanup resets mulligan-only and transient input without removing gameplay handlers', () => {
  assert.match(source, /this\.resetOpeningMulliganInputState\(\);\s*this\.openingMulliganPending = false;\s*this\.redrawHand\(\);\s*this\.updateActionButtonLabel\(\);\s*this\.resetCardHighlights\(\);\s*this\.startTurn\(\);/);
  assert.match(source, /resetOpeningMulliganInputState\(\) \{\s*this\.selectedMulliganCardIds = \[\];\s*this\.selectedCardId = null;\s*this\.focusedCardId = null;\s*this\.focusedCardView = null;\s*this\.targetingState = null;\s*this\.pendingSwapIndex = null;\s*\}/);
  assert.match(source, /hitArea\.on\('pointerup', \(pointer, localX, localY, event\) => \{\s*event\?\.stopPropagation\?\.\(\);\s*this\.onCardTap\(cardId\);\s*\}\);/);
  assert.match(source, /button\.on\('pointerup', \(pointer, localX, localY, event\) => \{\s*event\?\.stopPropagation\?\.\(\);\s*if \(this\.openingMulliganPending\) \{\s*this\.confirmOpeningMulligan\(\);\s*return;\s*\}\s*this\.resolvePassTurn\(\);\s*\}\);/);
});

test('interactive card, board, and pass handlers stop scene-level outside-tap clearing', () => {
  assert.match(source, /background\.on\('pointerup', \(pointer, localX, localY, event\) => \{\s*event\?\.stopPropagation\?\.\(\);\s*this\.onBoardCellTap\(boardIndex\);\s*\}\);/);
  assert.match(source, /button\.on\('pointerup', \(pointer, localX, localY, event\) => \{\s*event\?\.stopPropagation\?\.\(\);/);
  assert.match(source, /hitArea\.on\('pointerup', \(pointer, localX, localY, event\) => \{\s*event\?\.stopPropagation\?\.\(\);\s*this\.onCardTap\(cardId\);\s*\}\);/);
});
