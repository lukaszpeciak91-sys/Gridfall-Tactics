import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
const zoomPreviewMethod = source.slice(
  source.indexOf('  showSelectedCardZoomPreview()'),
  source.indexOf('  resetCardHighlights()'),
);

test('hand card zoom preview is visual-only and avoids focus gameplay state', () => {
  assert.doesNotMatch(source, /focusedCardId|focusedCardView|focusHandCard|playFocusedCard|HAND_CARD_FOCUS|getHandCardFocusTarget/);
  assert.match(source, /this\.cardZoomPreview = null;/);
  assert.match(source, /destroyCardZoomPreview\(\) \{/);
  assert.match(source, /showSelectedCardZoomPreview\(\) \{/);
  assert.match(source, /if \(this\.openingMulliganPending \|\| !this\.selectedCardId\) return;/);
  assert.doesNotMatch(zoomPreviewMethod, /setInteractive/);
  assert.doesNotMatch(source, /hitArea|previousBoundaryX|nextBoundaryX|hitAreaWidth/);
});

test('mulligan tap toggles only mulligan selection and never creates gameplay zoom', () => {
  assert.match(source, /if \(this\.openingMulliganPending\) \{\s*this\.selectedCardId = null;\s*this\.targetingState = null;\s*this\.pendingSwapIndex = null;\s*this\.toggleOpeningMulliganCard\(cardId\);\s*return;\s*\}/);
  assert.match(source, /if \(this\.selectedMulliganCardIds\.includes\(cardId\)\) \{\s*this\.selectedMulliganCardIds = this\.selectedMulliganCardIds\.filter\(\(id\) => id !== cardId\);\s*\} else if \(this\.selectedMulliganCardIds\.length < MAX_OPENING_MULLIGAN_CARDS\) \{\s*this\.selectedMulliganCardIds\.push\(cardId\);\s*\}/);
  assert.match(source, /const isMulliganSelected = this\.openingMulliganPending && this\.selectedMulliganCardIds\.includes\(card\.cardId\);/);
  assert.match(source, /const isGameplaySelected = !this\.openingMulliganPending && card\.cardId === this\.selectedCardId;/);
  assert.match(source, /const isHighlighted = isGameplaySelected \|\| isMulliganSelected;/);
});

test('normal gameplay card taps toggle selection while selectedCardId remains source of truth', () => {
  assert.match(source, /this\.pendingSwapIndex = null;\s*this\.targetingState = null;\s*if \(this\.selectedCardId === cardId\) \{\s*this\.selectedCardId = null;\s*\} else \{\s*this\.selectedCardId = cardId;\s*this\.targetingState = this\.isUnitCard\(card\) \? null : this\.getTargetingStateForCard\(card\);\s*\}\s*this\.resetCardHighlights\(\);/);
  assert.match(source, /const cardView = this\.cardViews\.find\(\(view\) => view\.cardId === this\.selectedCardId\);/);
  assert.match(source, /const card = this\.gameState\.player\.hand\.find\(\(item\) => item\.id === this\.selectedCardId\);/);
  assert.match(source, /const result = resolveTargetedEffectCard\(this\.gameState, 'player', this\.selectedCardId, boardIndex, targetIndexes\);/);
  assert.match(source, /const result = playEffectCard\(this\.gameState, 'player', this\.selectedCardId\);/);
  assert.match(source, /const result = playOrRedeployUnit\(this\.gameState, 'player', this\.selectedCardId, boardIndex\);/);
});

test('outside taps clear selection without intercepting board, pass, or card input', () => {
  assert.match(source, /this\.input\.on\('pointerup', this\.onScenePointerUp, this\);/);
  assert.match(source, /this\.input\.off\('pointerup', this\.onScenePointerUp, this\);/);
  assert.match(source, /onScenePointerUp\(pointer, currentlyOver = \[\]\) \{\s*if \(this\.openingMulliganPending \|\| this\.battleResultModalShown \|\| this\.isFlowResolving\) return;\s*if \(!this\.selectedCardId && !this\.targetingState\) return;\s*if \(Array\.isArray\(currentlyOver\) && currentlyOver\.length > 0\) return;\s*this\.clearHandCardSelection\(\);\s*\}/);
  assert.match(source, /button\.on\('pointerup', \(\) => \{\s*if \(this\.openingMulliganPending\) \{\s*this\.confirmOpeningMulligan\(\);\s*return;\s*\}\s*this\.resolvePassTurn\(\);\s*\}\);/);
  assert.match(source, /background\.on\('pointerup', \(\) => \{\s*this\.onBoardCellTap\(boardIndex\);\s*\}\);/);
});

test('zoom preview shifts toward screen center and clamps inside the canvas', () => {
  assert.match(source, /const targetX = cardView\.baseX \+ \(width \* 0\.5 - cardView\.baseX\) \* 0\.45;/);
  assert.match(source, /const targetY = cardView\.baseY \+ \(height \* 0\.5 - cardView\.baseY\) \* 0\.68;/);
  assert.match(source, /x: Phaser\.Math\.Clamp\(targetX, minX, maxX\),/);
  assert.match(source, /y: Phaser\.Math\.Clamp\(targetY, minY, maxY\),/);
});
