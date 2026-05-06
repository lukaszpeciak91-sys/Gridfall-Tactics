import test from 'node:test';
import assert from 'node:assert/strict';

import { MAX_TURNS, createInitialBattleState, resolveTurnCapWinner } from '../src/systems/GameState.js';

const makeState = (playerHP, enemyHP) => {
  const state = createInitialBattleState({ name: 'Test', deck: [] }, { name: 'Test Enemy', deck: [] });
  state.playerHP = playerHP;
  state.enemyHP = enemyHP;
  return state;
};

test('turn cap awards player win to higher player hero HP', () => {
  const state = makeState(5, 3);

  const winner = resolveTurnCapWinner(state, MAX_TURNS);

  assert.equal(winner, 'player');
  assert.equal(state.winner, 'player');
  assert.equal(state.endingReason, 'turn-cap');
  assert.equal(state.turnCapResolvedBy, 'remaining-hero-hp');
});

test('turn cap awards enemy win to higher enemy hero HP', () => {
  const state = makeState(2, 7);

  const winner = resolveTurnCapWinner(state, MAX_TURNS);

  assert.equal(winner, 'enemy');
  assert.equal(state.winner, 'enemy');
  assert.equal(state.endingReason, 'turn-cap');
  assert.equal(state.turnCapResolvedBy, 'remaining-hero-hp');
});

test('turn cap preserves true draw only when hero HP is equal', () => {
  const state = makeState(4, 4);

  const winner = resolveTurnCapWinner(state, MAX_TURNS);

  assert.equal(winner, 'draw');
  assert.equal(state.winner, 'draw');
  assert.equal(state.endingReason, 'turn-cap');
  assert.equal(state.turnCapResolvedBy, 'equal-hero-hp');
});

test('turn cap helper does not resolve before max turns or overwrite existing winner', () => {
  const beforeCap = makeState(9, 1);
  assert.equal(resolveTurnCapWinner(beforeCap, MAX_TURNS - 1), null);
  assert.equal(beforeCap.winner, null);

  const alreadyWon = makeState(9, 1);
  alreadyWon.winner = 'enemy';
  assert.equal(resolveTurnCapWinner(alreadyWon, MAX_TURNS), 'enemy');
  assert.equal(alreadyWon.winner, 'enemy');
  assert.equal(alreadyWon.endingReason, null);
});
