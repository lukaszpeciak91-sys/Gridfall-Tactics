import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
const inspectMethod = source.slice(
  source.indexOf('  showSelectedHandCardZoom()'),
  source.indexOf('  resetCardHighlights({ showPreview = true } = {})'),
);
const cardPointerDownMethod = source.slice(
  source.indexOf('  onCardPointerDown(cardId)'),
  source.indexOf('  startHandCardLongPress(cardId)'),
);
const longPressMethod = source.slice(
  source.indexOf('  startHandCardLongPress(cardId)'),
  source.indexOf('  cancelHandCardLongPress()'),
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
  assert.match(cardPointerDownMethod, /if \(this\.openingMulliganPending\) \{/);
  assert.match(cardPointerDownMethod, /this\.selectedCardId = null;/);
  assert.match(cardPointerDownMethod, /this\.targetingState = null;/);
  assert.match(cardPointerDownMethod, /this\.effectCastState = null;/);
  assert.match(cardPointerDownMethod, /this\.startHandCardLongPress\(cardId\);/);
  assert.match(longPressMethod, /this\.previewedMulliganCardId = cardId;/);
  assert.match(longPressMethod, /this\.resetCardHighlights\(\{ showPreview: true \}\);/);
  assert.match(source, /if \(this\.longPressTriggeredCardId === cardId\) \{/);
  assert.match(source, /this\.previewedMulliganCardId = null;/);
  assert.match(source, /this\.toggleOpeningMulliganCard\(cardId, \{ showPreview: false \}\);/);
  assert.match(source, /if \(this\.selectedMulliganCardIds\.includes\(cardId\)\) \{\s*this\.selectedMulliganCardIds = this\.selectedMulliganCardIds\.filter\(\(id\) => id !== cardId\);\s*\} else if \(this\.selectedMulliganCardIds\.length < MAX_OPENING_MULLIGAN_CARDS\) \{\s*this\.selectedMulliganCardIds\.push\(cardId\);\s*\}/);
  assert.match(source, /const isMulliganSelected = this\.openingMulliganPending && this\.selectedMulliganCardIds\.includes\(card\.cardId\);/);
  assert.match(source, /const isGameplaySelected = !this\.openingMulliganPending && card\.cardId === this\.selectedCardId;/);
  assert.match(source, /const isHighlighted = isGameplaySelected \|\| isMulliganSelected;/);
  assert.match(source, /const MULLIGAN_HAND_CARD_SELECTED_DEPTH = 80;/);
  assert.match(source, /const selectedDepth = isMulliganSelected \? MULLIGAN_HAND_CARD_SELECTED_DEPTH : HAND_CARD_SELECTED_DEPTH;/);
});

test('normal gameplay quick tap selects only and long press opens inspect while preserving active targeting', () => {
  assert.match(source, /const HAND_CARD_LONG_PRESS_MS = 425;/);
  assert.match(source, /const CARD_INSPECT_LONG_PRESS_MS = 350;/);
  assert.match(source, /const BOARD_INSPECT_LONG_PRESS_MS = 350;/);
  assert.match(source, /const PASS_HOLD_TO_SURRENDER_MS = 425;/);
  assert.match(source, /this\.handCardLongPressEvent = null;/);
  assert.match(source, /this\.longPressTriggeredCardId = null;/);
  assert.match(source, /background\.on\('pointerdown', \(\) => \{\s*this\.onCardPointerDown\(cardId\);\s*\}\);/);
  assert.match(source, /background\.on\('pointerup', \(pointer\) => \{\s*this\.onCardPointerUp\(cardId, pointer\);\s*\}\);/);
  assert.match(source, /onHandCardPointerOver\(cardId\) \{\s*\/\/ Hand-card inspect is intentionally long-press driven so quick taps only select for play\.\s*if \(!cardId\) return;\s*\}/);
  assert.match(source, /this\.pendingSwapIndex = null;\s*this\.clearSwapPrompt\(\);\s*this\.selectedCardId = cardId;\s*const targetingState = this\.isUnitCard\(card\) \? null : this\.getTargetingStateForCard\(card\);\s*if \(targetingState\) \{\s*this\.beginPlayerTargetingSession\(targetingState\);\s*\} else \{\s*this\.targetingState = null;\s*this\.resetCardHighlights\(\{ showPreview: false \}\);\s*this\.updatePlayerBaseActionState\(\);\s*\}\s*this\.startHandCardLongPress\(cardId\);/);
  assert.match(longPressMethod, /this\.longPressTriggeredCardId = cardId;/);
  assert.match(longPressMethod, /const isSelectedCard = this\.selectedCardId === cardId;/);
  assert.match(longPressMethod, /const preserveTargetingSession = isSelectedCard && Boolean\(this\.targetingState\);/);
  assert.match(longPressMethod, /const preserveSelectedUnit = isSelectedCard && this\.isUnitCard\(card\);/);
  assert.match(longPressMethod, /this\.resetCardHighlights\(\{ showPreview: true \}\);/);
  assert.match(source, /cancelHandCardLongPress\(\) \{\s*if \(!this\.handCardLongPressEvent\) return;\s*this\.handCardLongPressEvent\.remove\(false\);\s*this\.handCardLongPressEvent = null;\s*\}/);
  assert.match(source, /onCardPointerUp\(cardId, pointer\) \{[\s\S]*this\.cancelHandCardLongPress\(\);[\s\S]*if \(this\.longPressTriggeredCardId === cardId\) \{[\s\S]*return;\s*\}[\s\S]*this\.resetCardHighlights\(\{ showPreview: false \}\);/);
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
  assert.match(source, /onScenePointerUp\(pointer, currentlyOver = \[\]\) \{[\s\S]*if \(this\.isPointerEventGuarded\(pointer\) \|\| this\.navigationInProgress\) return;[\s\S]*if \(this\.battleResultModalShown \|\| this\.isFlowResolving \|\| this\.isEffectCastResolving\) return;[\s\S]*const hasActiveBoardTapMode = this\.pendingSwapIndex !== null;[\s\S]*const isIdleBoardTapMode = !this\.selectedCardId && !this\.targetingState && !this\.effectCastState && !hasActiveBoardTapMode;[\s\S]*if \(this\.isPointerUpReservedForUi\(pointer, currentlyOver\)\) return;\s*const boardCell = this\.getBoardCellFromPointerUp\(pointer, currentlyOver\);[\s\S]*if \(isIdleBoardTapMode && !boardCell\) \{\s*this\.clearBoardInspectFromOutsideTap\(pointer, currentlyOver\);\s*return;\s*\}/);
  assert.match(source, /clearOpeningMulliganPreviewFromOutsideTap\(pointer, currentlyOver = \[\]\) \{\s*if \(!this\.previewedMulliganCardId && !this\.selectedHandCardZoom && this\.selectedMulliganCardIds\.length === 0\) return;\s*if \(this\.isPointerInsideMulliganHandOrPreview\(pointer, currentlyOver\)\) return;\s*if \(this\.isPointerInsidePlayerBaseAction\(pointer, currentlyOver\)\) return;\s*this\.previewedMulliganCardId = null;[\s\S]*this\.pressedHandCardId = null;\s*this\.selectedMulliganCardIds = \[\];\s*this\.updatePlayerBaseActionState\(\);\s*this\.resetCardHighlights\(\{ showPreview: false \}\);\s*\}/);
  assert.match(source, /isPointerInsidePlayerBaseAction\(pointer, currentlyOver = \[\]\) \{[\s\S]*return overObjects\.includes\(this\.playerHeroPanel\) \|\| this\.isPointerInsideGameObject\(pointer, this\.playerHeroPanel\);[\s\S]*\}/);
  assert.match(source, /isPointerInsideMulliganHandOrPreview\(pointer, currentlyOver = \[\]\) \{[\s\S]*const handTop = hand\.y;[\s\S]*return pointer\.x >= handLeft && pointer\.x <= handRight && pointer\.y >= handTop && pointer\.y <= handBottom;/);
  assert.match(source, /if \(this\.pressedHandCardId\) \{[\s\S]*this\.cancelHandCardLongPress\(\);[\s\S]*this\.pressedHandCardId = null;[\s\S]*return;\s*\}/);
  assert.match(source, /const boardCell = this\.getBoardCellFromPointerUp\(pointer, currentlyOver\);[\s\S]*if \(this\.targetingState && this\.isPointerInsideHandArea\(pointer, currentlyOver\)\) \{\s*this\.cancelEffectTargeting\(\);\s*return;\s*\}[\s\S]*if \(boardCell\) \{[\s\S]*const selectedCard = this\.gameState\.player\.hand\.find\(\(card\) => card\.id === this\.selectedCardId\);/);
  assert.match(source, /isPointerInsideHandArea\(pointer, currentlyOver = \[\]\) \{[\s\S]*const handTop = hand\.y;[\s\S]*return pointer\.x >= handLeft && pointer\.x <= handRight && pointer\.y >= handTop && pointer\.y <= handBottom;/);
  assert.match(source, /if \(this\.isBoardCellTapReservedForCardAction\(boardCell\.index, selectedCard\)\) \{[\s\S]*this\.pressedHandCardId = null;[\s\S]*this\.onBoardCellTap\(boardCell\.index\);[\s\S]*return;\s*\}/);
  assert.match(source, /if \(this\.targetingState\) \{[\s\S]*this\.pressedHandCardId = null;[\s\S]*return;\s*\}/);
  assert.match(source, /if \(this\.clearSelectedHandInspectFromOutsideTap\(pointer, currentlyOver\)\) \{[\s\S]*this\.pressedHandCardId = null;[\s\S]*return;\s*\}[\s\S]*this\.pressedHandCardId = null;[\s\S]*this\.clearHandCardSelection\(\);/);
  assert.match(source, /clearSelectedHandInspectFromOutsideTap\(pointer, currentlyOver = \[\]\) \{\s*if \(!this\.selectedHandCardZoom \|\| this\.boardInspectIndex !== null\) return false;\s*if \(this\.isPointerInsideSelectedHandCardZoom\(pointer, currentlyOver\)\) return false;\s*this\.hoverInspectCardId = null;\s*this\.resetCardHighlights\(\{ showPreview: false \}\);\s*return true;\s*\}/);
  assert.match(source, /isPointerUpReservedForUi\(pointer, currentlyOver = \[\]\) \{[\s\S]*this\.cardViews\.some\(\(view\) => overObjects\.includes\(view\.background\)\);/);
  assert.doesNotMatch(inspectMethod, /setInteractive\(\)|setInteractive\(\{ useHandCursor: true \}\)|startInspectDragCandidate/);
  assert.doesNotMatch(source, /if \(this\.isPointerInsideInspectCard\(pointer, overObjects\)\) return true;/);
  assert.doesNotMatch(source, /$^/);
  assert.equal(source.includes('action' + 'Button'), false);
  assert.match(source, /this\.deckCounterView && \[this\.deckCounterView\.backing, this\.deckCounterView\.text\]/);
  assert.match(source, /if \(this\.utilityMenuPanel\) return true;/);
  assert.match(source, /this\.bottomControlViews\.some\(\(control\) => \[control\.backing, control\.text\]/);
  assert.match(source, /getBoardCellFromPointerUp\(pointer, currentlyOver = \[\]\) \{[\s\S]*this\.boardCells\.find\(\(cell\) => overObjects\.includes\(cell\.background\)/);
  assert.match(source, /isBoardCellTapReservedForCardAction\(boardIndex, selectedCard\) \{\s*if \(this\.targetingState\) \{\s*return this\.isValidTarget\(boardIndex, this\.targetingState\.targetType, this\.targetingState\.targetIndexes, this\.targetingState\.targetConstraint\);\s*\}\s*if \(!selectedCard \|\| !this\.isUnitCard\(selectedCard\)\) \{\s*return true;\s*\}\s*return true;\s*\}/);
  assert.doesNotMatch(source, /confirmTargetingSelection|drawActionZone/);
  assert.match(source, /playerPanel\.on\('pointerdown', \(pointer, localX, localY, event\) => \{\s*this\.onPlayerBasePointerDown\(event\);\s*\}\);/);
  assert.match(source, /playerPanel\.on\('pointerup', \(pointer, localX, localY, event\) => \{\s*this\.onPlayerBasePointerUp\(event\);\s*\}\);/);
  assert.match(source, /onPlayerBasePointerUp\(event\) \{\s*if \(\(this\.isOpeningMulliganInputLocked\?\.\(\) \?\? false\)\) \{[\s\S]*?return;\s*\}\s*if \(this\.openingMulliganPending\) \{\s*event\?\.stopPropagation\?\.\(\);\s*this\.cancelPassHoldToSurrender\(\);[\s\S]*this\.confirmOpeningMulligan\(\);\s*return;\s*\}[\s\S]*if \(!basePassAvailable\) return;[\s\S]*this\.resolvePassTurn\(\);\s*\}/);
  assert.match(source, /background\.on\('pointerdown', \(\) => \{\s*this\.onBoardCellPointerDown\(boardIndex\);\s*\}\);/);
  assert.match(source, /background\.on\('pointerup', \(pointer\) => \{\s*this\.onBoardCellPointerUp\(boardIndex, pointer\);\s*\}\);/);
});



test('tactical menu and inspect are mutually safe during navigation', () => {
  assert.match(source, /this\.navigationInProgress = false;/);
  assert.match(source, /this\.pointerInputGuardActive = false;/);
  assert.match(source, /clearPointerInputGuard\(\) \{\s*this\.pointerInputGuardActive = false;\s*this\.pointerInputGuardEventId = null;\s*\}/);
  assert.match(source, /showUtilityMenuPanel\(\) \{\s*if \(this\.navigationInProgress\) return;\s*this\.closeInspectPreview\(\{ animate: false, clearSelection: true \}\);\s*this\.destroyUtilityMenuPanel\(\);/);
  assert.match(source, /closeInspectPreview\(\{ animate = false, clearSelection = false \} = \{\}\) \{[\s\S]*this\.cancelHandCardLongPress\(\);[\s\S]*this\.hoverInspectCardId = null;[\s\S]*this\.boardInspectIndex = null;[\s\S]*this\.previewedMulliganCardId = null;[\s\S]*this\.pressedHandCardId = null;[\s\S]*this\.longPressTriggeredCardId = null;[\s\S]*this\.destroySelectedHandCardZoom\(\{ animate \}\);/);
  assert.match(source, /prepareUtilityMenuNavigation\(\{ includeBattleResultModal = false, preserveBattleFlow = false \} = \{\}\) \{[\s\S]*this\.navigationInProgress = true;[\s\S]*this\.closeInspectPreview\(\{ animate: false, clearSelection: true \}\);[\s\S]*this\.destroyUtilityMenuPanel\(\);[\s\S]*this\.destroyDeckInfoPanel\(\);/);
  assert.match(source, /onCardPointerDown\(cardId\) \{\s*if \(this\.utilityMenuPanel \|\| this\.navigationInProgress \|\| this\.pointerInputGuardActive\) return;/);
  assert.match(source, /if \(this\.targetingState\) \{\s*if \(this\.selectedCardId === cardId\) \{\s*this\.startHandCardLongPress\(cardId\);\s*return;\s*\}\s*this\.cancelEffectTargeting\(\);\s*if \(this\.playerActionUsed \|\| this\.isFlowResolving \|\| this\.isEffectCastResolving\) \{\s*return;\s*\}\s*\}\s*const card = this\.gameState\.player\.hand\.find\(\(item\) => item\.id === cardId\);/);
  assert.match(source, /startHandCardLongPress\(cardId\) \{[\s\S]*if \(this\.utilityMenuPanel \|\| this\.navigationInProgress \|\| this\.pointerInputGuardActive\) return;/);
  assert.match(source, /onScenePointerUp\(pointer, currentlyOver = \[\]\) \{[\s\S]*if \(this\.isPointerEventGuarded\(pointer\) \|\| this\.navigationInProgress\) return;/);
  assert.match(source, /const outsideCatcher = this\.add\.rectangle[\s\S]*\.setInteractive\(\)[\s\S]*\.setDepth\(depth\);/);
  assert.match(source, /const panel = this\.add\.rectangle[\s\S]*\.setDepth\(depth \+ 2\)\s*\.setInteractive\(\);[\s\S]*panel\.on\('pointerdown',[\s\S]*event\?\.stopPropagation\?\.\(\);[\s\S]*panel\.on\('pointerup',[\s\S]*this\.guardPointerEvent\(pointer\);/);
});

test('effect casting is staged before targeted resolution without a dedicated cancel action control state', () => {
  assert.match(source, /this\.effectCastState = \{ cardId: card\.id, targetingState \};/);
  assert.match(source, /this\.selectedCardId = null;[\s\S]*this\.showPlayerEffectConfirmation\(card\);[\s\S]*this\.playEffectCastSweep\(\{ side: 'player' \}\)/);
  assert.match(source, /this\.showPlayerEffectConfirmation\(card, \{ allowUnit: true \}\);[\s\S]*this\.playEffectCastSweep\(\{ side: 'player' \}\)/);
  assert.match(source, /beginPlayerTargetingSession\(targetingState\) \{/);
  assert.match(source, /if \(\(targetingState\.requiredTargets \?\? 0\) <= 0\) \{/);
  assert.match(source, /this\.targetingState = \{ \.\.\.targetingState, targetIndexes: \[\.\.\.\(targetingState\.targetIndexes \?\? \[\]\)\] \};/);
  assert.match(source, /cancelEffectTargeting\(\) \{[\s\S]*this\.targetingState = null;[\s\S]*this\.effectCastState = null;[\s\S]*this\.updatePlayerBaseActionState\(\);[\s\S]*this\.resetCardHighlights\(\{ showPreview: false \}\);[\s\S]*\}/);
  assert.match(source, /this\.showTargetingInstruction\(\);/);
  assert.doesNotMatch(source, /confirmTargetingSelection/);
  assert.equal(source.includes('action' + 'Button'), false);
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
  assert.match(source, /const inspectSafeBottomLimitY = hand\.y - margin;/);
  assert.match(source, /const tacticalBottomLimitY = Math\.min\(boardBottomLimitY, inspectSafeBottomLimitY, height - margin\);/);
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
  assert.match(source, /background\.on\('pointerdown', \(\) => \{\s*this\.onBoardCellPointerDown\(boardIndex\);\s*\}\);/);
  assert.match(source, /background\.on\('pointerup', \(pointer\) => \{\s*this\.onBoardCellPointerUp\(boardIndex, pointer\);\s*\}\);/);
  assert.doesNotMatch(source, /background\.on\('pointerover', \(\) => \{\s*this\.onBoardCellPointerOver\(boardIndex\);\s*\}\);/);
  assert.match(source, /startBoardCellLongPress\(boardIndex\) \{\s*this\.cancelBoardCellLongPress\(\);\s*this\.boardCellLongPressEvent = this\.time\.delayedCall\(BOARD_INSPECT_LONG_PRESS_MS,/);
  assert.match(source, /if \(this\.showBoardUnitInspect\(boardIndex\)\) \{[\s\S]*this\.boardLongPressTriggeredIndex = boardIndex;\s*\}/);
  assert.match(source, /onBoardCellPointerUp\(boardIndex, pointer\) \{[\s\S]*if \(this\.boardLongPressTriggeredIndex === boardIndex\) \{[\s\S]*return;\s*\}[\s\S]*this\.onBoardCellTap\(boardIndex\);\s*\}/);
  assert.match(source, /showBoardUnitInspect\(boardIndex\) \{\s*if \(this\.openingMulliganPending \|\| this\.utilityMenuPanel \|\| this\.navigationInProgress \|\| this\.selectedCardId \|\| this\.targetingState \|\| this\.effectCastState \|\| this\.isEffectCastResolving \|\| this\.pressedHandCardId\) return false;\s*const unit = this\.gameState\?\.board\?\.\[boardIndex\] \?\? null;\s*if \(!unit\) return false;\s*this\.hoverInspectCardId = null;\s*this\.boardInspectIndex = boardIndex;\s*this\.showSelectedHandCardZoom\(\);\s*return true;\s*\}/);
  assert.match(source, /if \(!this\.selectedCardId && !this\.targetingState && !this\.effectCastState\) \{\s*const unit = this\.gameState\.board\[boardIndex\];[\s\S]*if \(this\.pendingSwapIndex !== null\) \{[\s\S]*\}\s*if \(!unit \|\| unit\.owner !== 'player'\) return;/);
  assert.match(source, /if \(this\.boardInspectIndex !== null\) \{\s*const unit = this\.gameState\.board\[this\.boardInspectIndex\];\s*const cell = this\.getCellByIndex\(this\.boardInspectIndex\);/);
  assert.match(source, /card: unit,\s*cardId: unit\.cardId \?\? unit\.id \?\? `board-\$\{this\.boardInspectIndex\}-unit`,\s*sourceX: cell\.background\.x,\s*sourceY: cell\.background\.y,/);
  assert.match(source, /clearBoardInspectFromOutsideTap\(pointer, currentlyOver = \[\]\) \{[\s\S]*this\.clearBoardInspect\(\{ animate: true \}\);\s*return true;\s*\}/);
  assert.match(inspectMethod, /this\.createHandCardView\(\{/);
  assert.match(source, /cell\.label\.add\(this\.createBoardUnitView\(cell, unit\)\);/);
  const boardUnitViewSource = source.slice(source.indexOf('  createBoardUnitView(cell, unit) {'), source.indexOf('  refreshBoardLabels() {'));
  assert.match(boardUnitViewSource, /const unitStats = this\.currentBoardRenderStats\?\.\[cell\.index\] \?\? this\.getBoardUnitStats\(unit\);/);
  assert.match(boardUnitViewSource, /baseStats: this\.getBoardUnitBaseStats\(unit\),/);
  assert.doesNotMatch(boardUnitViewSource, /getCardTextShort|getCardDisplayContent|createInlineStatText|bodyText|textPanel|setInteractive/);
});
