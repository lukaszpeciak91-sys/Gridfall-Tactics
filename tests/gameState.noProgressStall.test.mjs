import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialBattleState,
  NO_PROGRESS_STALL_ROUNDS,
  recordPassAction,
  resolveCombat,
  resolveNoProgressStallWinner,
  performSwap,
} from '../src/systems/GameState.js';

const makeState = () => createInitialBattleState({ name: 'Test', deck: [] }, { name: 'Test Enemy', deck: [] }, { firstActor: 'player' });

const makeUnit = (owner, id, attack = 0, hp = 3, armor = 0) => ({
  id,
  cardId: id,
  name: id,
  type: 'unit',
  owner,
  attack,
  hp,
  maxHp: hp,
  armor,
  effectId: null,
});

const completePassRound = (state) => {
  recordPassAction(state, 'player');
  recordPassAction(state, 'enemy');
  resolveCombat(state);
  state.turnsCompleted += 1;
  return resolveNoProgressStallWinner(state);
};

test('empty-board pass loop ends after three no-progress rounds by hero HP', () => {
  const state = makeState();
  state.playerHP = 8;
  state.enemyHP = 5;
  resolveNoProgressStallWinner(state);

  assert.equal(completePassRound(state), null);
  assert.equal(state.noProgressStall.consecutiveRounds, 1);
  assert.equal(completePassRound(state), null);
  assert.equal(state.noProgressStall.consecutiveRounds, 2);

  assert.equal(completePassRound(state), 'player');
  assert.equal(state.winner, 'player');
  assert.equal(state.endingReason, 'no-progress-stall');
  assert.equal(state.noProgressStallResolvedBy, 'remaining-hero-hp');
  assert.equal(state.turnsCompleted, NO_PROGRESS_STALL_ROUNDS);
});

test('empty-board exhausted-deck pass loop resolves to draw on equal hero HP', () => {
  const state = makeState();
  state.playerHP = 4;
  state.enemyHP = 4;
  state.player.deck = [];
  state.enemy.deck = [];
  state.player.hand = [];
  state.enemy.hand = [];
  resolveNoProgressStallWinner(state);

  completePassRound(state);
  completePassRound(state);
  assert.equal(completePassRound(state), 'draw');
  assert.equal(state.endingReason, 'no-progress-stall');
  assert.equal(state.noProgressStallResolvedBy, 'equal-hero-hp');
});

test('runner/pass loops with unchanged board and HP trigger no-progress stall', () => {
  const state = makeState();
  state.board[0] = makeUnit('enemy', 'enemy-runner', 0, 2, 0);
  state.board[6] = makeUnit('player', 'player-runner', 0, 2, 0);
  resolveNoProgressStallWinner(state);

  completePassRound(state);
  completePassRound(state);

  assert.equal(completePassRound(state), 'draw');
  assert.equal(state.endingReason, 'no-progress-stall');
});

test('ongoing combat damage prevents no-progress stall from advancing', () => {
  const state = makeState();
  state.board[0] = makeUnit('enemy', 'enemy-attacker', 1, 5, 0);
  state.board[7] = makeUnit('player', 'player-attacker', 1, 5, 0);
  resolveNoProgressStallWinner(state);

  completePassRound(state);
  completePassRound(state);
  completePassRound(state);

  assert.equal(state.winner, null);
  assert.equal(state.endingReason, null);
  assert.equal(state.noProgressStall.consecutiveRounds, 0);
  assert.equal(state.playerHP, 9);
  assert.equal(state.enemyHP, 9);
});

test('reposition resets the no-progress stall counter', () => {
  const state = makeState();
  state.board[6] = makeUnit('player', 'player-left', 0, 2, 0);
  state.board[7] = makeUnit('player', 'player-mid', 0, 2, 0);
  resolveNoProgressStallWinner(state);

  completePassRound(state);
  completePassRound(state);
  assert.equal(state.noProgressStall.consecutiveRounds, 2);

  assert.deepEqual(performSwap(state, 'player', 6, 7), { ok: true });
  recordPassAction(state, 'enemy');
  resolveCombat(state);
  state.turnsCompleted += 1;
  assert.equal(resolveNoProgressStallWinner(state), null);
  assert.equal(state.noProgressStall.consecutiveRounds, 0);

  completePassRound(state);
  completePassRound(state);
  assert.equal(state.winner, null);
  assert.equal(completePassRound(state), 'draw');
});
