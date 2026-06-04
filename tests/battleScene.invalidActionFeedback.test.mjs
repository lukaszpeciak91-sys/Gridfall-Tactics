import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

function methodBlock(name, nextName) {
  return source.slice(source.indexOf(`  ${name}`), source.indexOf(`  ${nextName}`));
}

test('BattleScene exposes coordinated invalid action feedback helpers', () => {
  assert.match(source, /showInvalidActionFeedback\(\{ reason, cardId = null, boardIndex = null, scope = 'global', card = null \} = \{\}\) \{/);
  assert.match(source, /getInvalidActionMessage\(reason, card = null\) \{/);
  assert.match(source, /pulseInvalidCard\(cardId\) \{/);
  assert.match(source, /showInvalidActionBanner\(message\) \{/);

  const feedbackBlock = methodBlock('showInvalidActionFeedback', 'pulseInvalidCard');
  assert.match(feedbackBlock, /this\.showSlotPulse\(boardIndex, 'damage'\);/);
  assert.match(feedbackBlock, /this\.showFloatingTextAtSlot\(boardIndex, message, 'damage'\);/);
  assert.match(feedbackBlock, /this\.showInvalidActionBanner\(message\);/);
  assert.match(feedbackBlock, /if \(cardId\) this\.pulseInvalidCard\(cardId\);/);
});

test('failed targeted effects in board tap and confirm paths show invalid feedback without completing action', () => {
  const boardTapBlock = source.slice(
    source.indexOf('  onBoardCellTap(boardIndex) {'),
    source.indexOf('  getActivePlayerEffectCard() {'),
  );
  assert.match(boardTapBlock, /const result = this\.effectCastState\?\.source === 'unit-on-play'[\s\S]*resolveTargetedEffectCard\(this\.gameState, 'player', effectCardId, boardIndex, targetIndexes\);[\s\S]*if \(!result\.ok\) \{\s*this\.showInvalidActionFeedback\?\.\(\{ reason: result\.reason, cardId: effectCardId, boardIndex, scope: this\.getInvalidActionScope\(result\.reason\) \}\);\s*return;\s*\}/);

  const confirmBlock = source.slice(
    source.indexOf('  confirmTargetingSelection() {'),
    source.indexOf('  resolvePassTurn() {'),
  );
  assert.match(confirmBlock, /resolveTargetedEffectCard\(this\.gameState, 'player', effectCardId, targetIndexes\[0\], targetIndexes\);[\s\S]*if \(!result\.ok\) \{\s*this\.showInvalidActionFeedback\?\.\(\{ reason: result\.reason, cardId: effectCardId, boardIndex: targetIndexes\[0\], scope: this\.getInvalidActionScope\(result\.reason\) \}\);\s*return;\s*\}/);
  assert.match(confirmBlock, /if \(result\.type === 'targeted-effect-pending' \|\| result\.type === 'unit-on-play-targeted-effect-pending'\) return;/);
});

test('failed non-targeted effects show global banner and card pulse before any action completion', () => {
  const effectBlock = source.slice(
    source.indexOf('  async startPlayerEffectCast(card) {'),
    source.indexOf('  beginPlayerTargetingSession(targetingState) {'),
  );
  assert.match(effectBlock, /const result = playEffectCard\(this\.gameState, 'player', card\.id\);/);
  assert.match(effectBlock, /if \(!result\.ok\) \{[\s\S]*this\.showInvalidActionFeedback\?\.\(\{ reason: result\.reason, cardId: card\.id, card, scope: 'global' \}\);[\s\S]*return;\s*\}/);
  assert.doesNotMatch(effectBlock.match(/if \(!result\.ok\) \{[\s\S]*?return;\s*\}/)?.[0] ?? '', /completePlayerAction/);
});

test('failed unit placement and redeploy show invalid feedback without completing action', () => {
  const boardTapBlock = source.slice(
    source.indexOf('  onBoardCellTap(boardIndex) {'),
    source.indexOf('  getActivePlayerEffectCard() {'),
  );
  assert.match(boardTapBlock, /const result = playOrRedeployUnit\(this\.gameState, 'player', this\.selectedCardId, boardIndex\);/);
  assert.match(boardTapBlock, /if \(!result\.ok\) \{\s*const invalidCardId = this\.selectedCardId;[\s\S]*this\.clearHandCardSelection\(\);\s*this\.showInvalidActionFeedback\?\.\(\{ reason: result\.reason, cardId: invalidCardId, boardIndex, scope: this\.getInvalidActionScope\(result\.reason\) \}\);\s*return;\s*\}/);
});

test('failed manual swap second tap shows slot invalid feedback and preserves cleanup', () => {
  const boardTapBlock = source.slice(
    source.indexOf('  onBoardCellTap(boardIndex) {'),
    source.indexOf('  getActivePlayerEffectCard() {'),
  );
  assert.match(boardTapBlock, /if \(!unit \|\| unit\.owner !== 'player'\) \{\s*this\.pendingSwapIndex = null;\s*this\.showInvalidActionFeedback\?\.\(\{ reason: 'Swap is not valid', boardIndex, scope: 'slot' \}\);[\s\S]*this\.clearSwapPrompt\(\);[\s\S]*return;\s*\}/);
  assert.match(boardTapBlock, /if \(!result\.ok\) \{\s*this\.clearSwapPrompt\(\);\s*this\.showInvalidActionFeedback\?\.\(\{ reason: result\.reason, boardIndex, scope: 'slot' \}\);[\s\S]*this\.updateActionButtonLabel\(\);\s*return;\s*\}/);
});

test('invalid banner participates in central banner coordinator and existing blocked movement feedback remains intact', () => {
  assert.match(source, /'invalid-action': 3/);
  assert.match(source, /if \(this\.invalidActionBanner\?\.active\) return 'invalid-action';/);
  assert.match(source, /if \(deferred\.owner === 'invalid-action'\) \{\s*this\.showInvalidActionBanner\(deferred\.payload\.message\);\s*return true;\s*\}/);
  assert.match(source, /showMovementBlockedFeedback\(index, label = 'BLOCKED'\) \{\s*return Promise\.all\(\[\s*this\.showSlotPulse\(index, 'damage'\),\s*this\.showFloatingTextAtSlot\(index, label, 'damage'\),\s*\]\);\s*\}/);
});
