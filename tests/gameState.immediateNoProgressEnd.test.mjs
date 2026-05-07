import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialBattleState,
  resolveImmediateNoProgressWinner,
  performSwap,
} from '../src/systems/GameState.js';

const makeState = () => createInitialBattleState({ name: 'Test', deck: [] }, { name: 'Test Enemy', deck: [] }, { firstActor: 'player' });

const makeUnit = (owner, id, attack = 0, hp = 3, armor = 0, effectId = null) => ({
  id,
  cardId: id,
  name: id,
  type: 'unit',
  owner,
  attack,
  hp,
  maxHp: hp,
  armor,
  effectId,
});

const makeCard = (id, type = 'unit', attack = 1, hp = 1, effectId = null) => ({
  id,
  name: id,
  type,
  attack,
  hp,
  armor: 0,
  effectId,
});

test('empty board ends immediately by higher hero HP without pass cycles', () => {
  const state = makeState();
  state.playerHP = 8;
  state.enemyHP = 5;

  assert.equal(resolveImmediateNoProgressWinner(state), 'player');
  assert.equal(state.winner, 'player');
  assert.equal(state.endingReason, 'no-progress-deadlock');
  assert.equal(state.noProgressResolvedBy, 'remaining-hero-hp');
  assert.equal(state.turnsCompleted, 0);
  assert.equal(state.noProgressStall, undefined);
});

test('empty-board exhausted-deck deadlock resolves to draw on equal hero HP', () => {
  const state = makeState();
  state.playerHP = 4;
  state.enemyHP = 4;
  state.player.deck = [];
  state.enemy.deck = [];
  state.player.hand = [];
  state.enemy.hand = [];

  assert.equal(resolveImmediateNoProgressWinner(state), 'draw');
  assert.equal(state.endingReason, 'no-progress-deadlock');
  assert.equal(state.noProgressResolvedBy, 'equal-hero-hp');
});

test('runner-related dead states end immediately when combat and resources cannot change HP', () => {
  const state = makeState();
  state.board[0] = makeUnit('enemy', 'enemy-runner', 0, 2, 0, 'lane_empty_bonus_damage');
  state.board[6] = makeUnit('player', 'player-runner', 0, 2, 0, 'lane_empty_bonus_damage');

  assert.equal(resolveImmediateNoProgressWinner(state), 'draw');
  assert.equal(state.endingReason, 'no-progress-deadlock');
});

test('blocked boards end immediately when units cannot ever deal hero damage', () => {
  const state = makeState();
  state.playerHP = 7;
  state.enemyHP = 10;
  state.board[0] = makeUnit('enemy', 'enemy-wall', 0, 3, 0, 'cannot_attack');
  state.board[6] = makeUnit('player', 'player-wall', 0, 3, 0, 'cannot_attack');

  assert.equal(resolveImmediateNoProgressWinner(state), 'enemy');
  assert.equal(state.endingReason, 'no-progress-deadlock');
});

test('combat that can eventually reach hero HP prevents immediate no-progress end', () => {
  const state = makeState();
  state.board[0] = makeUnit('enemy', 'enemy-blocker', 1, 2, 0);
  state.board[6] = makeUnit('player', 'player-attacker', 2, 5, 0);

  assert.equal(resolveImmediateNoProgressWinner(state), null);
  assert.equal(state.winner, null);
  assert.equal(state.playerHP, 12);
  assert.equal(state.enemyHP, 12);
});

test('future playable cards prevent a deadlock tiebreak', () => {
  const state = makeState();
  state.playerHP = 8;
  state.enemyHP = 5;
  state.player.deck.push(makeCard('future-striker', 'unit', 2, 2));

  assert.equal(resolveImmediateNoProgressWinner(state), null);
  assert.equal(state.winner, null);
});

test('meaningful reposition prevents a deadlock tiebreak', () => {
  const state = makeState();
  state.board[6] = makeUnit('player', 'player-left', 2, 2, 0);
  state.board[7] = makeUnit('player', 'player-mid', 0, 2, 0);
  state.board[1] = makeUnit('enemy', 'enemy-blocker', 0, 2, 0);

  assert.equal(resolveImmediateNoProgressWinner(state), null);
  assert.deepEqual(performSwap(state, 'player', 6, 7), { ok: true });
  assert.equal(resolveImmediateNoProgressWinner(state), null);
});
