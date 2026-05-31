import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialBattleState,
  resolveCombat,
  resolveImmediateResourceExhaustionWinner,
} from '../src/systems/GameState.js';

const makeState = () => createInitialBattleState(
  { name: 'Test', deck: [] },
  { name: 'Test Enemy', deck: [] },
  { firstActor: 'player' },
);

const makeUnit = (owner, id) => ({
  id,
  cardId: id,
  name: id,
  type: 'unit',
  owner,
  attack: 1,
  hp: 1,
  maxHp: 1,
  armor: 0,
});

const makeCard = (id) => ({ id, name: id, type: 'unit', attack: 1, hp: 1, armor: 0 });

test('resource exhaustion awards enemy win when player has no hand, deck, or board units and lower HP', () => {
  const state = makeState();
  state.playerHP = 4;
  state.enemyHP = 7;

  assert.equal(resolveImmediateResourceExhaustionWinner(state), 'enemy');
  assert.equal(state.winner, 'enemy');
  assert.equal(state.endingReason, 'resource_exhaustion');
});

test('resource exhaustion awards player win when enemy has no hand, deck, or board units and lower HP', () => {
  const state = makeState();
  state.playerHP = 9;
  state.enemyHP = 3;

  assert.equal(resolveImmediateResourceExhaustionWinner(state), 'player');
  assert.equal(state.winner, 'player');
  assert.equal(state.endingReason, 'resource_exhaustion');
});

test('resource exhaustion does not resolve hand-empty-only state when a future deck card exists', () => {
  const state = makeState();
  state.playerHP = 4;
  state.enemyHP = 7;
  state.player.deck.push(makeCard('future-draw'));

  assert.equal(resolveImmediateResourceExhaustionWinner(state), null);
  assert.equal(state.winner, null);
});

test('resource exhaustion does not resolve while a hand card exists', () => {
  const state = makeState();
  state.playerHP = 4;
  state.enemyHP = 7;
  state.player.hand.push(makeCard('held-card'));

  assert.equal(resolveImmediateResourceExhaustionWinner(state), null);
  assert.equal(state.winner, null);
});

test('resource exhaustion does not resolve while an owned board unit exists', () => {
  const state = makeState();
  state.playerHP = 4;
  state.enemyHP = 7;
  state.board[6] = makeUnit('player', 'remaining-unit');

  assert.equal(resolveImmediateResourceExhaustionWinner(state), null);
  assert.equal(state.winner, null);
});

test('resource exhaustion leaves equal-HP exhausted state for no-progress draw handling', () => {
  const state = makeState();
  state.playerHP = 5;
  state.enemyHP = 5;

  assert.equal(resolveImmediateResourceExhaustionWinner(state), null);
  assert.equal(state.winner, null);
});

test('base lethal resolved during combat has priority over resource exhaustion', () => {
  const state = makeState();
  state.board[6] = { ...makeUnit('player', 'lethal-attacker'), attack: 20 };

  resolveCombat(state);

  assert.equal(state.winner, 'player');
  assert.equal(state.heroDeathResolution.resolvedBy, 'single-hero-lethal');
  assert.equal(resolveImmediateResourceExhaustionWinner(state), 'player');
  assert.notEqual(state.endingReason, 'resource_exhaustion');
});
