import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
const inspectMethod = source.slice(
  source.indexOf('  showSelectedHandCardZoom()'),
  source.indexOf('  resetCardHighlights({ showPreview = true } = {})'),
);

test('card inspect is visual-only and avoids focus gameplay state', () => {
  assert.doesNotMatch(source, /focusedCardId|focusedCardView|focusHandCard|playFocusedCard|HAND_CARD_FOCUS|getHandCardFocusTarget/);
  assert.match(source, /this\.selectedHandCardZoom = null;/);
  assert.match(source, /this\.previewedMulliganCardId = null;/);
  assert.match(source, /this\.hoverInspectCardId = null;/);
  assert.match(source, /this\.boardInspectIndex = null;/);
  assert.match(source, /destroySelectedHandCardZoom\(\{ animate = false \} = \{\}\) \{/);
  assert.match(source, /showSelectedHandCardZoom\(\) \{/);
  assert.match(source, /getCurrentInspectCardRequest\(\) \{/);
  assert.match(inspectMethod, /const inspectRequest = this\.getCurrentInspectCardRequest\(\);/);
  assert.match(inspectMethod, /this\.createHandCardView\(\{/);
  assert.match(inspectMethod, /card: inspectRequest\.card,/);
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

test('normal gameplay card pointerdown keeps selected card when closing inspect and pointerup reveals inspect preview', () => {
  assert.match(source, /background\.on\('pointerdown', \(\) => \{\s*this\.onCardPointerDown\(cardId\);\s*\}\);/);
  assert.match(source, /background\.on\('pointerup', \(\) => \{\s*this\.onCardPointerUp\(cardId\);\s*\}\);/);
  assert.match(source, /background\.on\('pointerover', \(\) => \{\s*this\.onHandCardPointerOver\(cardId\);\s*\}\);/);
  assert.match(source, /const isInspectOpenForSelectedCard = Boolean\(\s*this\.selectedHandCardZoom && !this\.openingMulliganPending && this\.selectedCardId === cardId,\s*\);/);
  assert.match(source, /this\.pendingSwapIndex = null;\s*if \(isInspectOpenForSelectedCard\) \{\s*this\.resetCardHighlights\(\{ showPreview: false \}\);\s*return;\s*\}\s*this\.targetingState = null;\s*if \(this\.selectedCardId === cardId\) \{\s*this\.selectedCardId = null;\s*\} else \{\s*this\.selectedCardId = cardId;\s*this\.targetingState = this\.isUnitCard\(card\) \? null : this\.getTargetingStateForCard\(card\);\s*\}\s*this\.resetCardHighlights\(\{ showPreview: false \}\);/);
  assert.match(source, /onCardPointerUp\(cardId\) \{[\s\S]*this\.resetCardHighlights\(\{ showPreview: true \}\);/);
  assert.match(source, /const handCardId = isMulliganPreview\s*\? this\.previewedMulliganCardId\s*: \(this\.selectedCardId \?\? this\.hoverInspectCardId\);/);
  assert.match(source, /const cardView = this\.cardViews\.find\(\(view\) => view\.cardId === handCardId\);/);
  assert.match(source, /const card = this\.gameState\.player\.hand\.find\(\(item\) => item\.id === handCardId\);/);
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
  assert.match(source, /clearOpeningMulliganPreviewFromOutsideTap\(pointer, currentlyOver = \[\]\) \{\s*if \(!this\.previewedMulliganCardId && !this\.selectedHandCardZoom\) return;\s*if \(this\.isPointerInsideMulliganHandOrPreview\(pointer, currentlyOver\)\) return;\s*this\.previewedMulliganCardId = null;[\s\S]*this\.pressedHandCardId = null;\s*this\.resetCardHighlights\(\{ showPreview: false \}\);\s*\}/);
  assert.match(source, /isPointerInsideMulliganHandOrPreview\(pointer, currentlyOver = \[\]\) \{[\s\S]*const handTop = hand\.y;[\s\S]*return pointer\.x >= handLeft && pointer\.x <= handRight && pointer\.y >= handTop && pointer\.y <= handBottom;/);
  assert.match(source, /const boardCell = this\.getBoardCellFromPointerUp\(pointer, currentlyOver\);\s*if \(boardCell\) \{\s*const selectedCard = this\.gameState\.player\.hand\.find\(\(card\) => card\.id === this\.selectedCardId\);/);
  assert.match(source, /if \(this\.isBoardCellTapReservedForCardAction\(boardCell\.index, selectedCard\)\) \{\s*this\.pressedHandCardId = null;\s*this\.onBoardCellTap\(boardCell\.index\);\s*return;\s*\}/);
  assert.match(source, /this\.pressedHandCardId = null;\s*this\.clearHandCardSelection\(\);/);
  assert.match(source, /isPointerUpReservedForUi\(pointer, currentlyOver = \[\]\) \{[\s\S]*this\.cardViews\.some\(\(view\) => overObjects\.includes\(view\.background\)\);/);
  assert.doesNotMatch(inspectMethod, /setInteractive\(\)|setInteractive\(\{ useHandCursor: true \}\)|startInspectDragCandidate/);
  assert.doesNotMatch(source, /if \(this\.isPointerInsideInspectCard\(pointer, overObjects\)\) return true;/);
  assert.match(source, /this\.actionButton && \(overObjects\.includes\(this\.actionButton\) \|\| this\.isPointerInsideGameObject\(pointer, this\.actionButton\)\)/);
  assert.match(source, /this\.deckCounterView && \[this\.deckCounterView\.backing, this\.deckCounterView\.text\]/);
  assert.match(source, /this\.bottomControlViews\.some\(\(control\) => \[control\.backing, control\.text\]/);
  assert.match(source, /getBoardCellFromPointerUp\(pointer, currentlyOver = \[\]\) \{[\s\S]*this\.boardCells\.find\(\(cell\) => overObjects\.includes\(cell\.background\)/);
  assert.match(source, /isBoardCellTapReservedForCardAction\(boardIndex, selectedCard\) \{\s*if \(this\.targetingState\) \{\s*return this\.isValidTarget\(boardIndex, this\.targetingState\.targetType\);\s*\}\s*if \(!this\.isUnitCard\(selectedCard\)\) \{\s*return true;\s*\}\s*return canPlayOrRedeploy\(this\.gameState, 'player', selectedCard\.id, boardIndex\)\.ok;\s*\}/);
  assert.match(source, /button\.on\('pointerup', \(\) => \{\s*if \(this\.openingMulliganPending\) \{\s*this\.confirmOpeningMulligan\(\);\s*return;\s*\}\s*this\.resolvePassTurn\(\);\s*\}\);/);
  assert.match(source, /background\.on\('pointerup', \(\) => \{\s*this\.onBoardCellTap\(boardIndex\);\s*\}\);/);
});

test('inspect zoom anchors above player lanes, dims gameplay, stays bounded, and animates in/out', () => {
  assert.match(source, /const INSPECT_CARD_TARGET_SCALE = 1\.76;/);
  assert.match(source, /const INSPECT_CARD_OVERLAY_ALPHA = 0\.22;/);
  assert.match(source, /const INSPECT_CARD_OVERLAY_DEPTH = 840;/);
  assert.match(source, /const INSPECT_CARD_DEPTH = 850;/);
  assert.match(source, /const INSPECT_CARD_TWEEN_IN_MS = 150;/);
  assert.match(source, /const INSPECT_CARD_TWEEN_OUT_MS = 95;/);
  assert.doesNotMatch(source, /INSPECT_DRAG_START_THRESHOLD_PX|startInspectDragCandidate|inspectDragState/);
  assert.match(source, /const targetScale = Math\.min\([\s\S]*INSPECT_CARD_TARGET_SCALE,[\s\S]*maxInspectWidth \/ hand\.cardWidth,[\s\S]*maxInspectHeight \/ hand\.cardHeight,[\s\S]*\);/);
  assert.match(source, /x: Phaser\.Math\.Clamp\(width \* 0\.5, minX, maxX\),/);
  assert.match(source, /const INSPECT_CARD_PLAYER_ROW_GAP_RATIO = 0\.08;/);
  assert.match(source, /const playerRowTopY = boardTopY \+ board\.cellHeight \* 2;/);
  assert.match(source, /const targetY = playerRowTopY - playerRowGap - inspectHeight \/ 2;/);
  assert.match(source, /y: Phaser\.Math\.Clamp\(targetY, minY, maxY\),/);
  assert.match(inspectMethod, /const overlay = this\.add\.rectangle\(width \* 0\.5, height \* 0\.5, width, height, 0x000000, 0\)/);
  assert.match(inspectMethod, /alpha: INSPECT_CARD_OVERLAY_ALPHA,/);
  assert.match(inspectMethod, /duration: INSPECT_CARD_TWEEN_IN_MS,/);
  assert.match(source, /duration: INSPECT_CARD_TWEEN_OUT_MS,/);
});

test('board card inspect reuses full hand card layout without adding board text', () => {
  assert.match(source, /background\.on\('pointerover', \(\) => \{\s*this\.onBoardCellPointerOver\(boardIndex\);\s*\}\);/);
  assert.match(source, /background\.on\('pointerout', \(\) => \{\s*this\.onBoardCellPointerOut\(boardIndex\);\s*\}\);/);
  assert.match(source, /if \(this\.boardInspectIndex !== null\) \{\s*const card = this\.gameState\.board\[this\.boardInspectIndex\];\s*const cell = this\.getBoardCellByIndex\(this\.boardInspectIndex\);/);
  assert.match(source, /sourceX: cell\.background\.x,\s*sourceY: cell\.background\.y,/);
  assert.match(inspectMethod, /this\.createHandCardView\(\{/);
  assert.match(source, /cell\.label\.setText\(this\.getBoardUnitLabel\(unit\)\);/);
});
