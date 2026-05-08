import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');

test('hand card input has no focus zoom, outside-tap clearing, or hitbox overlay artifacts', () => {
  assert.doesNotMatch(source, /focusedCardId|focusedCardView|focusHandCard|playFocusedCard|HAND_CARD_FOCUS|getHandCardFocusTarget/);
  assert.doesNotMatch(source, /onScenePointerUp|this\.input\.on\('pointerup'|this\.input\.off\('pointerup'/);
  assert.doesNotMatch(source, /zoomScale|raisedY|topDepth|this\.tweens\.add\(\{\s*targets: \[?card/);
  assert.doesNotMatch(source, /hitArea|previousBoundaryX|nextBoundaryX|hitAreaWidth/);
  assert.doesNotMatch(source, /event\?\.stopPropagation\?\.\(\)/);
});

test('mulligan tap toggles only mulligan selection and caps selection count', () => {
  assert.match(source, /if \(this\.openingMulliganPending\) \{\s*this\.selectedCardId = null;\s*this\.targetingState = null;\s*this\.pendingSwapIndex = null;\s*this\.toggleOpeningMulliganCard\(cardId\);\s*return;\s*\}/);
  assert.match(source, /if \(this\.selectedMulliganCardIds\.includes\(cardId\)\) \{\s*this\.selectedMulliganCardIds = this\.selectedMulliganCardIds\.filter\(\(id\) => id !== cardId\);\s*\} else if \(this\.selectedMulliganCardIds\.length < MAX_OPENING_MULLIGAN_CARDS\) \{\s*this\.selectedMulliganCardIds\.push\(cardId\);\s*\}/);
  assert.match(source, /const isMulliganSelected = this\.openingMulliganPending && this\.selectedMulliganCardIds\.includes\(card\.cardId\);/);
  assert.match(source, /const isGameplaySelected = !this\.openingMulliganPending && card\.cardId === this\.selectedCardId;/);
  assert.match(source, /const isHighlighted = isGameplaySelected \|\| isMulliganSelected;/);
});

test('normal gameplay tap directly selects a card and board routes play or effect resolution', () => {
  assert.match(source, /this\.pendingSwapIndex = null;\s*this\.targetingState = null;\s*this\.selectedCardId = cardId;\s*this\.targetingState = this\.isUnitCard\(card\) \? null : this\.getTargetingStateForCard\(card\);\s*this\.resetCardHighlights\(\);/);
  assert.doesNotMatch(source, /if \(this\.selectedCardId === cardId\) \{\s*this\.selectedCardId = null;/);
  assert.match(source, /const result = resolveTargetedEffectCard\(this\.gameState, 'player', this\.selectedCardId, boardIndex, targetIndexes\);/);
  assert.match(source, /const result = playEffectCard\(this\.gameState, 'player', this\.selectedCardId\);/);
  assert.match(source, /const result = playOrRedeployUnit\(this\.gameState, 'player', this\.selectedCardId, boardIndex\);/);
});

test('opening mulligan confirm clears mulligan state, exits mulligan, and redraws interactive hand', () => {
  assert.match(source, /this\.resetOpeningMulliganInputState\(\);\s*this\.openingMulliganPending = false;\s*this\.redrawHand\(\);\s*this\.updateActionButtonLabel\(\);\s*this\.resetCardHighlights\(\);\s*this\.startTurn\(\);/);
  assert.match(source, /resetOpeningMulliganInputState\(\) \{\s*this\.selectedMulliganCardIds = \[\];\s*this\.selectedCardId = null;\s*this\.targetingState = null;\s*this\.pendingSwapIndex = null;\s*\}/);
  assert.match(source, /if \(card\) \{\s*background\.setInteractive\(\{ useHandCursor: true \}\);\s*background\.on\('pointerup', \(\) => \{\s*this\.onCardTap\(cardId\);\s*\}\);\s*\}/);
  assert.match(source, /button\.on\('pointerup', \(\) => \{\s*if \(this\.openingMulliganPending\) \{\s*this\.confirmOpeningMulligan\(\);\s*return;\s*\}\s*this\.resolvePassTurn\(\);\s*\}\);/);
});
