import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');

test('hand card input uses simple selection and existing board play/targeting routes', () => {
  assert.doesNotMatch(source, /focusedCardId|focusedCardView|focusHandCard|playFocusedCard|HAND_CARD_FOCUS|getHandCardFocusTarget/);
  assert.match(source, /this\.pendingSwapIndex = null;\s*this\.targetingState = null;\s*if \(this\.selectedCardId === cardId\) \{\s*this\.selectedCardId = null;\s*this\.resetCardHighlights\(\);\s*return;\s*\}\s*this\.selectedCardId = cardId;\s*this\.targetingState = this\.isUnitCard\(card\) \? null : this\.getTargetingStateForCard\(card\);\s*this\.resetCardHighlights\(\);/);
  assert.match(source, /const result = resolveTargetedEffectCard\(this\.gameState, 'player', this\.selectedCardId, boardIndex, targetIndexes\);/);
  assert.match(source, /const result = playEffectCard\(this\.gameState, 'player', this\.selectedCardId\);/);
  assert.match(source, /const result = playOrRedeployUnit\(this\.gameState, 'player', this\.selectedCardId, boardIndex\);/);
});

test('hand card rendering keeps cards fixed at their base hit area, size, and depth', () => {
  assert.match(source, /card\.glow\.setPosition\(card\.baseX, card\.baseY\)\.setScale\(1\)\.setDepth\(card\.baseDepth\);/);
  assert.match(source, /card\.background\.setPosition\(card\.baseX, card\.baseY\)\.setScale\(1\)\.setDepth\(card\.baseDepth \+ 1\);/);
  assert.match(source, /card\.label\.setPosition\(card\.labelBaseX, card\.labelBaseY\)\.setScale\(1\)\.setDepth\(card\.baseDepth \+ 2\);/);
  assert.match(source, /card\.hitArea\.setPosition\(card\.baseX, card\.baseY\)\.setScale\(1\)\.setDepth\(card\.baseDepth \+ 3\);/);
  assert.match(source, /card\.label\.setFontSize\(card\.baseFontSize\);/);
  assert.doesNotMatch(source, /this\.tweens\.add\(\{\s*targets: \[?card|scaleX: focusTarget\.scale|raisedOffset|topDepth/);
});

test('overlapped hand visuals use partitioned hit areas so adjacent cards receive distinct taps', () => {
  assert.match(source, /const previousBoundaryX = index === 0 \? x - hand\.cardWidth \/ 2 : x - hand\.step \/ 2;/);
  assert.match(source, /const nextBoundaryX = index === hand\.cardsVisible - 1 \? x \+ hand\.cardWidth \/ 2 : x \+ hand\.step \/ 2;/);
  assert.match(source, /const hitAreaWidth = Math\.max\(1, nextBoundaryX - previousBoundaryX\);/);
  assert.match(source, /const hitArea = this\.add\.rectangle\(x, baseY, hitAreaWidth, hand\.cardHeight, 0x000000, 0\)\s*\.setInteractive\(\{ useHandCursor: true \}\);/);
});

test('mulligan tap toggles only mulligan selection and caps selection count', () => {
  assert.match(source, /if \(this\.openingMulliganPending\) \{\s*this\.selectedCardId = null;\s*this\.targetingState = null;\s*this\.pendingSwapIndex = null;\s*this\.toggleOpeningMulliganCard\(cardId\);\s*return;\s*\}/);
  assert.match(source, /if \(this\.selectedMulliganCardIds\.includes\(cardId\)\) \{\s*this\.selectedMulliganCardIds = this\.selectedMulliganCardIds\.filter\(\(id\) => id !== cardId\);\s*\} else if \(this\.selectedMulliganCardIds\.length < MAX_OPENING_MULLIGAN_CARDS\) \{\s*this\.selectedMulliganCardIds\.push\(cardId\);\s*\}/);
  assert.match(source, /const isMulliganSelected = this\.openingMulliganPending && this\.selectedMulliganCardIds\.includes\(card\.cardId\);/);
  assert.match(source, /const isGameplaySelected = !this\.openingMulliganPending && card\.cardId === this\.selectedCardId;/);
  assert.match(source, /const isHighlighted = isGameplaySelected \|\| isMulliganSelected;/);
});

test('opening mulligan cleanup resets transient input without focus state or handler removal', () => {
  assert.match(source, /this\.resetOpeningMulliganInputState\(\);\s*this\.openingMulliganPending = false;\s*this\.redrawHand\(\);\s*this\.updateActionButtonLabel\(\);\s*this\.resetCardHighlights\(\);\s*this\.startTurn\(\);/);
  assert.match(source, /resetOpeningMulliganInputState\(\) \{\s*this\.selectedMulliganCardIds = \[\];\s*this\.selectedCardId = null;\s*this\.targetingState = null;\s*this\.pendingSwapIndex = null;\s*\}/);
  assert.match(source, /hitArea\.on\('pointerup', \(pointer, localX, localY, event\) => \{\s*event\?\.stopPropagation\?\.\(\);\s*this\.onCardTap\(cardId\);\s*\}\);/);
  assert.match(source, /button\.on\('pointerup', \(pointer, localX, localY, event\) => \{\s*event\?\.stopPropagation\?\.\(\);\s*if \(this\.openingMulliganPending\) \{\s*this\.confirmOpeningMulligan\(\);\s*return;\s*\}\s*this\.resolvePassTurn\(\);\s*\}\);/);
});

test('interactive card, board, and pass handlers stop propagation without scene-level outside-tap clearing', () => {
  assert.doesNotMatch(source, /this\.input\.on\('pointerup', this\.onScenePointerUp, this\)|onScenePointerUp\(/);
  assert.match(source, /background\.on\('pointerup', \(pointer, localX, localY, event\) => \{\s*event\?\.stopPropagation\?\.\(\);\s*this\.onBoardCellTap\(boardIndex\);\s*\}\);/);
  assert.match(source, /button\.on\('pointerup', \(pointer, localX, localY, event\) => \{\s*event\?\.stopPropagation\?\.\(\);/);
  assert.match(source, /hitArea\.on\('pointerup', \(pointer, localX, localY, event\) => \{\s*event\?\.stopPropagation\?\.\(\);\s*this\.onCardTap\(cardId\);\s*\}\);/);
});
