import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
const zoomMethod = source.slice(
  source.indexOf('  showSelectedHandCardZoom()'),
  source.indexOf('  resetCardHighlights()'),
);

test('hand card zoom is visual-only and avoids focus gameplay state', () => {
  assert.doesNotMatch(source, /focusedCardId|focusedCardView|focusHandCard|playFocusedCard|HAND_CARD_FOCUS|getHandCardFocusTarget/);
  assert.match(source, /this\.selectedHandCardZoom = null;/);
  assert.match(source, /this\.previewedMulliganCardId = null;/);
  assert.match(source, /destroySelectedHandCardZoom\(\) \{/);
  assert.match(source, /showSelectedHandCardZoom\(\) \{/);
  assert.match(zoomMethod, /const isMulliganPreview = this\.openingMulliganPending;/);
  assert.match(zoomMethod, /const previewCardId = isMulliganPreview \? this\.previewedMulliganCardId : this\.selectedCardId;/);
  assert.doesNotMatch(zoomMethod, /setInteractive/);
  assert.doesNotMatch(source, /hitArea|previousBoundaryX|nextBoundaryX|hitAreaWidth/);
});

test('mulligan tap toggles only mulligan selection and uses separate preview state', () => {
  assert.match(source, /if \(this\.openingMulliganPending\) \{\s*this\.selectedCardId = null;\s*this\.targetingState = null;\s*this\.pendingSwapIndex = null;\s*this\.previewedMulliganCardId = null;\s*this\.toggleOpeningMulliganCard\(cardId, \{ showPreview: false \}\);\s*return;\s*\}/);
  assert.match(source, /this\.previewedMulliganCardId = this\.selectedMulliganCardIds\.includes\(cardId\) \? cardId : null;/);
  assert.match(source, /this\.resetCardHighlights\(\{ showPreview: true \}\);/);
  assert.match(source, /if \(this\.selectedMulliganCardIds\.includes\(cardId\)\) \{\s*this\.selectedMulliganCardIds = this\.selectedMulliganCardIds\.filter\(\(id\) => id !== cardId\);\s*\} else if \(this\.selectedMulliganCardIds\.length < MAX_OPENING_MULLIGAN_CARDS\) \{\s*this\.selectedMulliganCardIds\.push\(cardId\);\s*\}/);
  assert.match(source, /const isMulliganSelected = this\.openingMulliganPending && this\.selectedMulliganCardIds\.includes\(card\.cardId\);/);
  assert.match(source, /const isGameplaySelected = !this\.openingMulliganPending && card\.cardId === this\.selectedCardId;/);
  assert.match(source, /const isHighlighted = isGameplaySelected \|\| isMulliganSelected;/);
});

test('normal gameplay card pointerdown toggles selection and pointerup reveals preview', () => {
  assert.match(source, /background\.on\('pointerdown', \(\) => \{\s*this\.onCardPointerDown\(cardId\);\s*\}\);/);
  assert.match(source, /background\.on\('pointerup', \(\) => \{\s*this\.onCardPointerUp\(cardId\);\s*\}\);/);
  assert.match(source, /this\.pendingSwapIndex = null;\s*this\.targetingState = null;\s*if \(this\.selectedCardId === cardId\) \{\s*this\.selectedCardId = null;\s*\} else \{\s*this\.selectedCardId = cardId;\s*this\.targetingState = this\.isUnitCard\(card\) \? null : this\.getTargetingStateForCard\(card\);\s*\}\s*this\.resetCardHighlights\(\{ showPreview: false \}\);/);
  assert.match(source, /onCardPointerUp\(cardId\) \{[\s\S]*this\.resetCardHighlights\(\{ showPreview: true \}\);/);
  assert.match(source, /const cardView = this\.cardViews\.find\(\(view\) => view\.cardId === previewCardId\);/);
  assert.match(source, /const card = this\.gameState\.player\.hand\.find\(\(item\) => item\.id === previewCardId\);/);
  assert.match(source, /const result = resolveTargetedEffectCard\(this\.gameState, 'player', this\.selectedCardId, boardIndex, targetIndexes\);/);
  assert.match(source, /const result = playEffectCard\(this\.gameState, 'player', this\.selectedCardId\);/);
  assert.match(source, /const result = playOrRedeployUnit\(this\.gameState, 'player', this\.selectedCardId, boardIndex\);/);
});

test('outside taps clear selection without intercepting board, pass, or card input', () => {
  assert.match(source, /canPass, canPlayOrRedeploy, playEffectCard/);
  assert.match(source, /this\.input\.on\('pointerup', this\.onScenePointerUp, this\);/);
  assert.match(source, /this\.input\.off\('pointerup', this\.onScenePointerUp, this\);/);
  assert.match(source, /this\.bottomControlViews = \[\];/);
  assert.match(source, /this\.bottomControlViews = \[controls\.back, controls\.rules, controls\.fullscreen\]\.filter\(Boolean\);/);
  assert.match(source, /onScenePointerUp\(pointer, currentlyOver = \[\]\) \{\s*if \(this\.battleResultModalShown \|\| this\.isFlowResolving\) return;\s*if \(this\.openingMulliganPending\) \{\s*this\.clearOpeningMulliganPreviewFromOutsideTap\(pointer, currentlyOver\);\s*return;\s*\}\s*if \(!this\.selectedCardId && !this\.targetingState\) return;\s*if \(this\.isPointerUpReservedForUi\(pointer, currentlyOver\)\) return;/);
  assert.match(source, /clearOpeningMulliganPreviewFromOutsideTap\(pointer, currentlyOver = \[\]\) \{\s*if \(!this\.previewedMulliganCardId && !this\.selectedHandCardZoom\) return;\s*if \(this\.isPointerInsideMulliganHandOrPreview\(pointer, currentlyOver\)\) return;\s*this\.previewedMulliganCardId = null;\s*this\.pressedHandCardId = null;\s*this\.resetCardHighlights\(\{ showPreview: false \}\);\s*\}/);
  assert.match(source, /isPointerInsideMulliganHandOrPreview\(pointer, currentlyOver = \[\]\) \{[\s\S]*const handTop = hand\.y;[\s\S]*return pointer\.x >= handLeft && pointer\.x <= handRight && pointer\.y >= handTop && pointer\.y <= handBottom;/);
  assert.match(source, /const boardCell = this\.getBoardCellFromPointerUp\(pointer, currentlyOver\);\s*if \(boardCell\) \{\s*const selectedCard = this\.gameState\.player\.hand\.find\(\(card\) => card\.id === this\.selectedCardId\);\s*if \(!selectedCard \|\| this\.isBoardCellTapReservedForCardAction\(boardCell\.index, selectedCard\)\) return;\s*\}/);
  assert.match(source, /this\.pressedHandCardId = null;\s*this\.clearHandCardSelection\(\);/);
  assert.match(source, /isPointerUpReservedForUi\(pointer, currentlyOver = \[\]\) \{[\s\S]*this\.cardViews\.some\(\(view\) => overObjects\.includes\(view\.background\)\);/);
  assert.match(source, /this\.actionButton && \(overObjects\.includes\(this\.actionButton\) \|\| this\.isPointerInsideGameObject\(pointer, this\.actionButton\)\)/);
  assert.match(source, /this\.deckCounterView && \[this\.deckCounterView\.backing, this\.deckCounterView\.text\]/);
  assert.match(source, /this\.bottomControlViews\.some\(\(control\) => \[control\.backing, control\.text\]/);
  assert.match(source, /getBoardCellFromPointerUp\(pointer, currentlyOver = \[\]\) \{[\s\S]*this\.boardCells\.find\(\(cell\) => overObjects\.includes\(cell\.background\)/);
  assert.match(source, /isBoardCellTapReservedForCardAction\(boardIndex, selectedCard\) \{\s*if \(this\.targetingState\) \{\s*return this\.isValidTarget\(boardIndex, this\.targetingState\.targetType\);\s*\}\s*if \(!this\.isUnitCard\(selectedCard\)\) \{\s*return true;\s*\}\s*return canPlayOrRedeploy\(this\.gameState, 'player', selectedCard\.id, boardIndex\)\.ok;\s*\}/);
  assert.match(source, /button\.on\('pointerup', \(\) => \{\s*if \(this\.openingMulliganPending\) \{\s*this\.confirmOpeningMulligan\(\);\s*return;\s*\}\s*this\.resolvePassTurn\(\);\s*\}\);/);
  assert.match(source, /background\.on\('pointerup', \(\) => \{\s*this\.onBoardCellTap\(boardIndex\);\s*\}\);/);
});

test('gameplay zoom nudges to center while mulligan preview stays above its hand slot', () => {
  assert.match(source, /const SELECTED_HAND_CARD_ZOOM_SCALE = 1\.22;/);
  assert.match(source, /const MULLIGAN_HAND_CARD_PREVIEW_SCALE = 1\.08;/);
  assert.match(source, /const MULLIGAN_HAND_CARD_RAISE_RATIO = 0\.06;/);
  assert.match(source, /const HAND_CARD_PREVIEW_TWEEN_MS = 110;/);
  assert.match(source, /const nudgeX = isMulliganPreview \? 0 : \(width \* 0\.5 - cardView\.baseX\) \* SELECTED_HAND_CARD_CENTER_NUDGE_RATIO;/);
  assert.match(source, /const raiseRatio = isMulliganPreview \? MULLIGAN_HAND_CARD_RAISE_RATIO : SELECTED_HAND_CARD_RAISE_RATIO;/);
  assert.match(source, /const targetY = cardView\.baseY - hand\.cardHeight \* raiseRatio;/);
  assert.match(source, /this\.layout\.action\.y \+ this\.layout\.action\.h \+ zoomHeight \/ 2 \+ 6/);
  assert.match(source, /this\.tweens\.add\(\{\s*targets: \[glow, background\]/);
  assert.match(source, /x: Phaser\.Math\.Clamp\(targetX, minX, maxX\),/);
  assert.match(source, /y: Phaser\.Math\.Clamp\(targetY, minY, maxY\),/);
});
