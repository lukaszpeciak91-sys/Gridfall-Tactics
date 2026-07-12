import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

test('Disruptor no longer uses delayed cancel-and-consume player effect completion branches', () => {
  assert.doesNotMatch(source, /cancelEnemyOrderThisTurn/);
  assert.doesNotMatch(source, /type === 'cancelled'/);
});

test('legal targeted and non-targeted player effects still funnel through completePlayerAction', () => {
  const targetedBlock = source.slice(
    source.indexOf('  onBoardCellTap(boardIndex) {'),
    source.indexOf('  getActivePlayerEffectCard() {'),
  );
  const nonTargetedBlock = source.slice(
    source.indexOf('  async startPlayerEffectCast(card) {'),
    source.indexOf('  beginPlayerTargetingSession(targetingState) {'),
  );

  assert.match(targetedBlock, /resolveTargetedEffectCard\(this\.gameState, 'player', effectCardId, boardIndex, targetIndexes\);[\s\S]*this\.completePlayerAction\(/);
  assert.match(nonTargetedBlock, /const result = playEffectCard\(this\.gameState, 'player', card\.id\);[\s\S]*this\.completePlayerAction\(/);
});

test('swap_adjacent_then_resolve movement feedback uses the player-selected adjacent partner before immediate combat', () => {
  const block = source.slice(
    source.indexOf('  buildMovementFeedbackForAction('),
    source.indexOf('  inferSwapFeedbackFromSnapshots(', source.indexOf('  buildMovementFeedbackForAction(')),
  );
  assert.match(block, /if \(effectId === 'swap_adjacent_then_resolve'\)/);
  assert.match(block, /const selectedPartnerIndex = targetIndexes\[1\];/);
  assert.match(block, /return \[\{ type: 'swap', fromIndex: selectedIndex, toIndex: partnerIndex, label: label \?\? 'RUSH', kind: 'rush' \}\];/);
  const completion = source.slice(
    source.indexOf('  async completePlayerAction('),
    source.indexOf('  async resolveEnemyFirstTurnOpening(', source.indexOf('  async completePlayerAction(')),
  );
  assert.ok(completion.indexOf('await this.playMovementFeedback(movementFeedback, beforeStats);') < completion.indexOf('await this.playImmediateCombatFeedback(immediateCombatFeedback);'));
});
