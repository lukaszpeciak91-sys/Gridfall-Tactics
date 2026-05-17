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
  assert.match(source, /if \(this\.openingMulliganPending\) \{[\s\S]*this\.selectedCardId = null;[\s\S]*this\.targetingState = null;[\s\S]*this\.effectCastState = null;[\s\S]*this\.toggleOpeningMulliganCard\(cardId, \{ showPreview: false \}\);[\s\S]*return;[\s\S]*\}/);
  assert.match(source, /this\.previewedMulliganCardId = this\.selectedMulliganCardIds\.includes\(cardId\) \? cardId : null;/);
  assert.match(source, /this\.resetCardHighlights\(\{ showPreview: true \}\);/);
  assert.match(source, /if \(this\.selectedMulliganCardIds\.includes\(cardId\)\) \{\s*this\.selectedMulliganCardIds = this\.selectedMulliganCardIds\.filter\(\(id\) => id !== cardId\);\s*\} else if \(this\.selectedMulliganCardIds\.length < MAX_OPENING_MULLIGAN_CARDS\) \{\s*this\.selectedMulliganCardIds\.push\(cardId\);\s*\}/);
  assert.match(source, /const isMulliganSelected = this\.openingMulliganPending && this\.selectedMulliganCardIds\.includes\(card\.cardId\);/);
  assert.match(source, /const isGameplaySelected = !this\.openingMulliganPending && card\.cardId === this\.selectedCardId;/);
  assert.match(source, /const isHighlighted = isGameplaySelected \|\| isMulliganSelected;/);
});

test('normal gameplay quick tap selects only and long press opens inspect without losing selection', () => {
  assert.match(source, /const HAND_CARD_LONG_PRESS_MS = 425;/);
  assert.match(source, /this\.handCardLongPressEvent = null;/);
  assert.match(source, /this\.longPressTriggeredCardId = null;/);
  assert.match(source, /background\.on\('pointerdown', \(\) => \{\s*this\.onCardPointerDown\(cardId\);\s*\}\);/);
  assert.match(source, /background\.on\('pointerup', \(\) => \{\s*this\.onCardPointerUp\(cardId\);\s*\}\);/);
  assert.match(source, /onHandCardPointerOver\(cardId\) \{\s*\/\/ Hand-card inspect is intentionally long-press driven so quick taps only select for play\.\s*if \(!cardId\) return;\s*\}/);
  assert.match(source, /this\.pendingSwapIndex = null;\s*this\.selectedCardId = cardId;\s*this\.targetingState = this\.isUnitCard\(card\) \? null : this\.getTargetingStateForCard\(card\);\s*this\.resetCardHighlights\(\{ showPreview: false \}\);\s*this\.updateActionButtonLabel\(\);\s*this\.startHandCardLongPress\(cardId\);/);
  assert.match(source, /startHandCardLongPress\(cardId\) \{\s*this\.cancelHandCardLongPress\(\);\s*this\.handCardLongPressEvent = this\.time\.delayedCall\(HAND_CARD_LONG_PRESS_MS, \(\) => \{[\s\S]*this\.longPressTriggeredCardId = cardId;[\s\S]*this\.resetCardHighlights\(\{ showPreview: true \}\);/);
  assert.match(source, /cancelHandCardLongPress\(\) \{\s*if \(!this\.handCardLongPressEvent\) return;\s*this\.handCardLongPressEvent\.remove\(false\);\s*this\.handCardLongPressEvent = null;\s*\}/);
  assert.match(source, /onCardPointerUp\(cardId\) \{[\s\S]*this\.cancelHandCardLongPress\(\);[\s\S]*if \(this\.longPressTriggeredCardId === cardId\) \{[\s\S]*return;\s*\}[\s\S]*this\.resetCardHighlights\(\{ showPreview: false \}\);/);
  assert.match(source, /const handCardId = isMulliganPreview\s*\? this\.previewedMulliganCardId\s*: \(this\.selectedCardId \?\? this\.hoverInspectCardId\);/);
  assert.match(source, /const cardView = this\.cardViews\.find\(\(view\) => view\.cardId === handCardId\);/);
  assert.match(source, /const card = this\.gameState\.player\.hand\.find\(\(item\) => item\.id === handCardId\);/);
  assert.match(source, /const result = this\.effectCastState\?\.source === 'unit-on-play'\s*\? resolveTargetedUnitOnPlayEffect\(this\.gameState, 'player', this\.effectCastState\.boardIndex, targetIndexes\)\s*: resolveTargetedEffectCard\(this\.gameState, 'player', effectCardId, boardIndex, targetIndexes\);/);
  assert.match(source, /const result = playEffectCard\(this\.gameState, 'player', card\.id\);/);
  assert.match(source, /const result = playOrRedeployUnit\(this\.gameState, 'player', this\.selectedCardId, boardIndex\);/);
});

test('outside taps clear selection without intercepting board, pass, or card input', () => {
  assert.match(source, /canPass, canPlayOrRedeploy, playEffectCard/);
  assert.match(source, /this\.input\.on\('pointerup', this\.onScenePointerUp, this\);/);
  assert.match(source, /this\.input\.off\('pointerup', this\.onScenePointerUp, this\);/);
  assert.match(source, /this\.bottomControlViews = \[\];/);
  assert.match(source, /this\.bottomControlViews = \[menu\];/);
  assert.match(source, /onScenePointerUp\(pointer, currentlyOver = \[\]\) \{\s*if \(this\.isPointerEventGuarded\(pointer\) \|\| this\.navigationInProgress\) return;\s*if \(this\.battleResultModalShown \|\| this\.isFlowResolving \|\| this\.isEffectCastResolving\) return;[\s\S]*if \(!this\.selectedCardId && !this\.targetingState && !this\.effectCastState\) \{\s*this\.clearBoardInspectFromOutsideTap\(pointer, currentlyOver\);\s*return;\s*\}\s*if \(this\.isPointerUpReservedForUi\(pointer, currentlyOver\)\) return;/);
  assert.match(source, /clearOpeningMulliganPreviewFromOutsideTap\(pointer, currentlyOver = \[\]\) \{\s*if \(!this\.previewedMulliganCardId && !this\.selectedHandCardZoom\) return;\s*if \(this\.isPointerInsideMulliganHandOrPreview\(pointer, currentlyOver\)\) return;\s*this\.previewedMulliganCardId = null;[\s\S]*this\.pressedHandCardId = null;\s*this\.resetCardHighlights\(\{ showPreview: false \}\);\s*\}/);
  assert.match(source, /isPointerInsideMulliganHandOrPreview\(pointer, currentlyOver = \[\]\) \{[\s\S]*const handTop = hand\.y;[\s\S]*return pointer\.x >= handLeft && pointer\.x <= handRight && pointer\.y >= handTop && pointer\.y <= handBottom;/);
  assert.match(source, /if \(this\.pressedHandCardId\) \{\s*this\.cancelHandCardLongPress\(\);\s*this\.pressedHandCardId = null;\s*return;\s*\}\s*const boardCell = this\.getBoardCellFromPointerUp\(pointer, currentlyOver\);\s*if \(boardCell\) \{\s*const selectedCard = this\.gameState\.player\.hand\.find\(\(card\) => card\.id === this\.selectedCardId\);/);
  assert.match(source, /if \(this\.isBoardCellTapReservedForCardAction\(boardCell\.index, selectedCard\)\) \{\s*this\.pressedHandCardId = null;\s*this\.onBoardCellTap\(boardCell\.index\);\s*return;\s*\}/);
  assert.match(source, /if \(this\.targetingState\) \{\s*this\.pressedHandCardId = null;\s*return;\s*\}/);
  assert.match(source, /if \(this\.clearSelectedHandInspectFromOutsideTap\(pointer, currentlyOver\)\) \{\s*this\.pressedHandCardId = null;\s*return;\s*\}\s*this\.pressedHandCardId = null;\s*this\.clearHandCardSelection\(\);/);
  assert.match(source, /clearSelectedHandInspectFromOutsideTap\(pointer, currentlyOver = \[\]\) \{\s*if \(!this\.selectedHandCardZoom \|\| this\.boardInspectIndex !== null\) return false;\s*if \(this\.isPointerInsideSelectedHandCardZoom\(pointer, currentlyOver\)\) return false;\s*this\.resetCardHighlights\(\{ showPreview: false \}\);\s*return true;\s*\}/);
  assert.match(source, /isPointerUpReservedForUi\(pointer, currentlyOver = \[\]\) \{[\s\S]*this\.cardViews\.some\(\(view\) => overObjects\.includes\(view\.background\)\);/);
  assert.doesNotMatch(inspectMethod, /setInteractive\(\)|setInteractive\(\{ useHandCursor: true \}\)|startInspectDragCandidate/);
  assert.doesNotMatch(source, /if \(this\.isPointerInsideInspectCard\(pointer, overObjects\)\) return true;/);
  assert.match(source, /this\.actionButton && \(overObjects\.includes\(this\.actionButton\) \|\| this\.isPointerInsideGameObject\(pointer, this\.actionButton\)\)/);
  assert.match(source, /this\.deckCounterView && \[this\.deckCounterView\.backing, this\.deckCounterView\.text\]/);
  assert.match(source, /if \(this\.utilityMenuPanel\) return true;/);
  assert.match(source, /this\.bottomControlViews\.some\(\(control\) => \[control\.backing, control\.text\]/);
  assert.match(source, /getBoardCellFromPointerUp\(pointer, currentlyOver = \[\]\) \{[\s\S]*this\.boardCells\.find\(\(cell\) => overObjects\.includes\(cell\.background\)/);
  assert.match(source, /isBoardCellTapReservedForCardAction\(boardIndex, selectedCard\) \{\s*if \(this\.targetingState\) \{\s*return this\.isValidTarget\(boardIndex, this\.targetingState\.targetType, this\.targetingState\.targetIndexes, this\.targetingState\.targetConstraint\);\s*\}\s*if \(!this\.isUnitCard\(selectedCard\)\) \{\s*return true;\s*\}\s*return canPlayOrRedeploy\(this\.gameState, 'player', selectedCard\.id, boardIndex\)\.ok;\s*\}/);
  assert.match(source, /button\.on\('pointerup', \(\) => \{\s*if \(this\.openingMulliganPending\) \{\s*this\.confirmOpeningMulligan\(\);\s*return;\s*\}\s*if \(this\.targetingState\) \{\s*this\.confirmTargetingSelection\(\);\s*return;\s*\}\s*this\.resolvePassTurn\(\);\s*\}\);/);
  assert.match(source, /background\.on\('pointerup', \(\) => \{\s*this\.onBoardCellTap\(boardIndex\);\s*\}\);/);
});



test('tactical menu and inspect are mutually safe during navigation', () => {
  assert.match(source, /this\.navigationInProgress = false;/);
  assert.match(source, /this\.pointerInputGuardActive = false;/);
  assert.match(source, /clearPointerInputGuard\(\) \{\s*this\.pointerInputGuardActive = false;\s*this\.pointerInputGuardEventId = null;\s*\}/);
  assert.match(source, /showUtilityMenuPanel\(\) \{\s*if \(this\.navigationInProgress\) return;\s*this\.closeInspectPreview\(\{ animate: false \}\);\s*this\.destroyUtilityMenuPanel\(\);/);
  assert.match(source, /closeInspectPreview\(\{ animate = false, clearSelection = false \} = \{\}\) \{[\s\S]*this\.cancelHandCardLongPress\(\);[\s\S]*this\.hoverInspectCardId = null;[\s\S]*this\.boardInspectIndex = null;[\s\S]*this\.previewedMulliganCardId = null;[\s\S]*this\.pressedHandCardId = null;[\s\S]*this\.longPressTriggeredCardId = null;[\s\S]*this\.destroySelectedHandCardZoom\(\{ animate \}\);/);
  assert.match(source, /prepareUtilityMenuNavigation\(\{ includeBattleResultModal = false \} = \{\}\) \{[\s\S]*this\.navigationInProgress = true;[\s\S]*this\.closeInspectPreview\(\{ animate: false, clearSelection: true \}\);[\s\S]*this\.destroyUtilityMenuPanel\(\);[\s\S]*this\.destroyDeckInfoPanel\(\);/);
  assert.match(source, /onCardPointerDown\(cardId\) \{\s*if \(this\.utilityMenuPanel \|\| this\.navigationInProgress \|\| this\.pointerInputGuardActive\) return;/);
  assert.match(source, /startHandCardLongPress\(cardId\) \{[\s\S]*if \(this\.utilityMenuPanel \|\| this\.navigationInProgress \|\| this\.pointerInputGuardActive\) return;/);
  assert.match(source, /onScenePointerUp\(pointer, currentlyOver = \[\]\) \{\s*if \(this\.isPointerEventGuarded\(pointer\) \|\| this\.navigationInProgress\) return;/);
});

test('effect casting is staged before targeted resolution and cancel reuses the action button', () => {
  assert.match(source, /this\.effectCastState = \{ cardId: card\.id, targetingState \};/);
  assert.match(source, /this\.selectedCardId = null;[\s\S]*this\.showPlayerEffectConfirmation\(card\);[\s\S]*this\.playPlayerEffectCastFeedback\(\)/);
  assert.match(source, /this\.showPlayerEffectConfirmation\(card, \{ allowUnit: true \}\);[\s\S]*this\.playPlayerEffectCastFeedback\(\)/);
  assert.match(source, /if \(targetingState\) \{\s*this\.targetingState = \{ \.\.\.targetingState, targetIndexes: \[\.\.\.\(targetingState\.targetIndexes \?\? \[\]\)\] \};[\s\S]*this\.showTargetingInstruction\(\);[\s\S]*return;\s*\}/);
  assert.match(source, /cancelEffectTargeting\(\) \{[\s\S]*this\.targetingState = null;[\s\S]*this\.effectCastState = null;[\s\S]*this\.updateActionButtonLabel\(\);[\s\S]*this\.resetCardHighlights\(\{ showPreview: false \}\);[\s\S]*\}/);
  assert.match(source, /this\.actionButton\.setText\(translateActive\('ui\.common\.cancel', 'CANCEL'\)\);/);
  assert.match(source, /getTargetingInstructionMessage\(\) \{[\s\S]*selectAdjacentEnemy[\s\S]*selectFirstEnemy[\s\S]*selectSecondEnemy[\s\S]*selectAlly[\s\S]*selectUnit/);
});

test('inspect zoom centers between enemy and player lanes, dims gameplay, stays bounded, and animates in/out', () => {
  assert.match(source, /const INSPECT_CARD_TARGET_SCALE = 2\.06;/);
  assert.match(source, /const INSPECT_CARD_OVERLAY_ALPHA = 0\.2;/);
  assert.match(source, /const INSPECT_CARD_OVERLAY_DEPTH = 840;/);
  assert.match(source, /const INSPECT_CARD_DEPTH = 850;/);
  assert.match(source, /const INSPECT_CARD_TWEEN_IN_MS = 150;/);
  assert.match(source, /const INSPECT_CARD_TWEEN_OUT_MS = 95;/);
  assert.doesNotMatch(source, /INSPECT_DRAG_START_THRESHOLD_PX|startInspectDragCandidate|inspectDragState/);
  assert.match(source, /const targetScale = Math\.min\([\s\S]*INSPECT_CARD_TARGET_SCALE,[\s\S]*maxInspectWidth \/ hand\.cardWidth,[\s\S]*maxInspectHeight \/ \(hand\.cardHeight \* INSPECT_CARD_VERTICAL_COMPACT_RATIO\),[\s\S]*\);/);
  assert.match(source, /const inspectHeight = hand\.cardHeight \* targetScale \* INSPECT_CARD_VERTICAL_COMPACT_RATIO;/);
  assert.match(source, /x: Phaser\.Math\.Clamp\(width \* 0\.5, minX, maxX\),/);
  assert.match(source, /const INSPECT_CARD_PLAYER_ROW_GAP_RATIO = 0\.2;/);
  assert.match(source, /const INSPECT_CARD_PLAYER_ROW_BOTTOM_LIMIT_RATIO = 2\.78;/);
  assert.match(source, /const INSPECT_CARD_VERTICAL_COMPACT_RATIO = 0\.96;/);
  assert.match(source, /const tacticalBottomLimitY = Math\.min\(boardBottomLimitY, actionBottomLimitY, height - margin\);/);
  assert.match(source, /const enemyRowBottomY = boardTopY \+ board\.cellHeight;/);
  assert.match(source, /const playerRowTopY = boardTopY \+ board\.cellHeight \* 2;/);
  assert.match(source, /const sharedLaneCenterY = \(enemyRowBottomY \+ playerRowTopY\) \* 0\.5;/);
  assert.match(source, /const targetY = sharedLaneCenterY \+ playerRowGap \* 0\.15;/);
  assert.match(source, /y: Phaser\.Math\.Clamp\(targetY, minY, maxY\),/);
  assert.match(inspectMethod, /const overlay = this\.add\.rectangle\(width \* 0\.5, height \* 0\.5, width, height, 0x000000, 0\)/);
  assert.match(inspectMethod, /alpha: INSPECT_CARD_OVERLAY_ALPHA,/);
  assert.match(inspectMethod, /duration: INSPECT_CARD_TWEEN_IN_MS,/);
  assert.match(source, /duration: INSPECT_CARD_TWEEN_OUT_MS,/);
});

test('board unit inspect opens from occupied slots and reuses the full hand-card renderer', () => {
  assert.match(source, /background\.on\('pointerup', \(\) => \{\s*this\.onBoardCellTap\(boardIndex\);\s*\}\);/);
  assert.doesNotMatch(source, /background\.on\('pointerover', \(\) => \{\s*this\.onBoardCellPointerOver\(boardIndex\);\s*\}\);/);
  assert.match(source, /onBoardCellPointerOut\(\) \{\s*\/\/ Board inspect is tap-driven and stays open until an outside tap or state change clears it\./);
  assert.match(source, /showBoardUnitInspect\(boardIndex\) \{\s*if \(this\.utilityMenuPanel \|\| this\.navigationInProgress \|\| this\.selectedCardId \|\| this\.targetingState \|\| this\.effectCastState \|\| this\.isEffectCastResolving \|\| this\.pressedHandCardId\) return false;\s*const unit = this\.gameState\?\.board\?\.\[boardIndex\] \?\? null;\s*if \(!unit\) return false;\s*this\.hoverInspectCardId = null;\s*this\.boardInspectIndex = boardIndex;\s*this\.showSelectedHandCardZoom\(\);\s*return true;\s*\}/);
  assert.match(source, /if \(!this\.selectedCardId && !this\.targetingState && !this\.effectCastState\) \{\s*const unit = this\.gameState\.board\[boardIndex\];[\s\S]*this\.showBoardUnitInspect\(boardIndex\);\s*return;\s*\}/);
  assert.match(source, /if \(this\.boardInspectIndex !== null\) \{\s*const unit = this\.gameState\.board\[this\.boardInspectIndex\];\s*const cell = this\.getCellByIndex\(this\.boardInspectIndex\);/);
  assert.match(source, /card: unit,\s*cardId: unit\.cardId \?\? unit\.id \?\? `board-\$\{this\.boardInspectIndex\}-unit`,\s*sourceX: cell\.background\.x,\s*sourceY: cell\.background\.y,/);
  assert.match(source, /clearBoardInspectFromOutsideTap\(pointer, currentlyOver = \[\]\) \{[\s\S]*this\.clearBoardInspect\(\{ animate: true \}\);\s*\}/);
  assert.match(inspectMethod, /this\.createHandCardView\(\{/);
  assert.match(source, /cell\.label\.add\(this\.createBoardUnitView\(cell, unit\)\);/);
  assert.match(source, /createBoardUnitView\(cell, unit\) \{[\s\S]*createStatBadges\(this, 0, statY, artWidth, statHeight, this\.getBoardUnitStats\(unit\)\)/);
  assert.doesNotMatch(source.slice(source.indexOf('  createBoardUnitView(cell, unit) {'), source.indexOf('  refreshBoardLabels() {')), /getCardTextShort|getCardDisplayContent|createInlineStatText|bodyText|textPanel|setInteractive/);
});
