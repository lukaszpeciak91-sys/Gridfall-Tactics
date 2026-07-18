import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createInitialBattleState,
  isBattleExhaustedEligible,
  recordPassAction,
  resolveImmediateNoProgressWinner,
} from '../src/systems/GameState.js';
import fs from 'node:fs';

const faction = {
  id: 'test',
  name: 'Test',
  deck: [],
};

function createDeadBattleExhaustedEligibleState(playerHP = 3, enemyHP = 2) {
  const state = createInitialBattleState(faction, faction, { firstActor: 'player' });
  state.playerHP = playerHP;
  state.enemyHP = enemyHP;
  state.player.hand = [];
  state.enemy.hand = [];
  state.player.deck = [];
  state.enemy.deck = [];
  state.board = Array.from({ length: 12 }, () => null);
  return state;
}

test('simulator no-progress check yields to Battle Exhausted pass resolution while eligible', () => {
  const state = createDeadBattleExhaustedEligibleState(3, 2);
  assert.equal(isBattleExhaustedEligible(state), true);

  assert.equal(resolveImmediateNoProgressWinner(structuredClone(state)), 'player');
  if (!isBattleExhaustedEligible(state)) resolveImmediateNoProgressWinner(state);
  assert.equal(state.winner, null);
  assert.equal(state.endingReason, null);

  recordPassAction(state, 'player');
  recordPassAction(state, 'enemy');
  assert.equal(state.winner, null);
  assert.equal(state.battleExhausted.fullPassRounds, 1);

  recordPassAction(state, 'player');
  recordPassAction(state, 'enemy');
  assert.equal(state.winner, 'player');
  assert.equal(state.endingReason, 'battle_exhausted');
  assert.equal(state.battleExhaustedResolvedBy, 'remaining-hero-hp');
});

test('simulator no-progress check preserves existing tiebreak behavior when Battle Exhausted is ineligible', () => {
  const state = createDeadBattleExhaustedEligibleState(5, 4);
  assert.equal(isBattleExhaustedEligible(state), false);

  if (!isBattleExhaustedEligible(state)) resolveImmediateNoProgressWinner(state);
  assert.equal(state.winner, 'player');
  assert.equal(state.endingReason, 'no-progress-deadlock');
  assert.equal(state.noProgressResolvedBy, 'remaining-hero-hp');
});

test('simulator guards every immediate no-progress call behind Battle Exhausted eligibility', () => {
  const source = fs.readFileSync('scripts/simulate-battles.mjs', 'utf8');
  const guardedCalls = source.match(/if \(!isBattleExhaustedEligible\(state\)\) resolveImmediateNoProgressWinner\(state\);/g) ?? [];
  const directCalls = source.match(/(?<!if \(!isBattleExhaustedEligible\(state\)\) )resolveImmediateNoProgressWinner\(state\);/g) ?? [];

  assert.equal(guardedCalls.length, 3);
  assert.equal(directCalls.length, 0);
});
