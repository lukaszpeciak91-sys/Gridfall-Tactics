import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canPass,
  canPlayEffectCard,
  canPlayOrRedeploy,
  canSwap,
  createInitialBattleState,
  performSwap,
  playEffectCard,
  playOrRedeployUnit,
  resolveTargetedEffectCard,
} from '../src/systems/GameState.js';

const unitCard = (id, attack = 1, hp = 2, effectId = null) => ({
  id,
  name: id,
  type: 'unit',
  attack,
  hp,
  armor: 0,
  effectId,
});

const effectCard = (id, effectId, type = 'order') => ({
  id,
  name: id,
  type,
  effectId,
});

const boardUnit = (owner, id, attack = 1, hp = 2) => ({
  ...unitCard(id, attack, hp),
  owner,
  cardId: id,
  maxHp: hp,
});

function createEmptyBattleState() {
  return createInitialBattleState({ name: 'Player', deck: [] }, { name: 'Enemy', deck: [] }, { firstActor: 'player' });
}

test('basic board swap succeeds for adjacent friendly player-row units', () => {
  const state = createEmptyBattleState();
  state.board[6] = boardUnit('player', 'left');
  state.board[7] = boardUnit('player', 'middle');

  assert.equal(canSwap(state, 6, 7, 'player'), true);

  const result = performSwap(state, 'player', 6, 7);

  assert.deepEqual(result, { ok: true });
  assert.equal(state.board[6].cardId, 'middle');
  assert.equal(state.board[7].cardId, 'left');
});

test('basic board swap rejects non-adjacent friendly player-row units', () => {
  const state = createEmptyBattleState();
  state.board[6] = boardUnit('player', 'left');
  state.board[8] = boardUnit('player', 'right');

  assert.equal(canSwap(state, 6, 8, 'player'), false);

  const result = performSwap(state, 'player', 6, 8);

  assert.deepEqual(result, { ok: false, reason: 'Swap is not valid' });
  assert.equal(state.board[6].cardId, 'left');
  assert.equal(state.board[8].cardId, 'right');
});

test('basic board swap still rejects empty slots and opponent-owned slots', () => {
  const state = createEmptyBattleState();
  state.board[6] = boardUnit('player', 'left');
  state.board[7] = null;
  state.board[8] = boardUnit('enemy', 'intruder');

  assert.equal(canSwap(state, 6, 7, 'player'), false);
  assert.equal(canSwap(state, 6, 8, 'player'), false);
  assert.deepEqual(performSwap(state, 'player', 6, 7), { ok: false, reason: 'Swap is not valid' });
  assert.deepEqual(performSwap(state, 'player', 6, 8), { ok: false, reason: 'Swap is not valid' });
  assert.equal(state.board[6].cardId, 'left');
  assert.equal(state.board[8].cardId, 'intruder');
});

test('basic enemy swap uses the same adjacent-only rule', () => {
  const state = createEmptyBattleState();
  state.board[0] = boardUnit('enemy', 'left');
  state.board[2] = boardUnit('enemy', 'right');

  assert.equal(canSwap(state, 0, 2, 'enemy'), false);
  assert.deepEqual(performSwap(state, 'enemy', 0, 2), { ok: false, reason: 'Swap is not valid' });

  state.board[1] = boardUnit('enemy', 'middle');
  assert.equal(canSwap(state, 0, 1, 'enemy'), true);
  assert.deepEqual(performSwap(state, 'enemy', 0, 1), { ok: true });
  assert.equal(state.board[0].cardId, 'middle');
  assert.equal(state.board[1].cardId, 'left');
});

test('unit, effect, redeploy, PASS, and explicit swap card behavior remain available', () => {
  const state = createEmptyBattleState();
  state.player.hand.push(
    unitCard('soldier', 2, 2),
    unitCard('replacement', 3, 3),
    effectCard('heal', 'heal_2'),
    effectCard('signal-shift', 'swap_any_two_units'),
  );
  state.board[0] = boardUnit('enemy', 'enemy-left');
  state.board[2] = boardUnit('enemy', 'enemy-right');
  state.board[6] = boardUnit('player', 'wounded', 1, 3);
  state.board[6].hp = 1;

  assert.equal(canPass(state), true);
  assert.equal(canPlayOrRedeploy(state, 'player', 'soldier', 7).ok, true);
  assert.equal(playOrRedeployUnit(state, 'player', 'soldier', 7).ok, true);

  assert.equal(canPlayOrRedeploy(state, 'player', 'replacement', 7).type, 'redeploy');
  assert.equal(playOrRedeployUnit(state, 'player', 'replacement', 7).ok, true);

  assert.equal(canPlayEffectCard(state, 'player', state.player.hand.find((card) => card.id === 'heal')).ok, true);
  assert.equal(playEffectCard(state, 'player', 'heal').ok, true);

  const signalShift = state.player.hand.find((card) => card.id === 'signal-shift');
  assert.equal(canPlayEffectCard(state, 'player', signalShift).ok, true);
  const explicitSwapResult = resolveTargetedEffectCard(state, 'player', 'signal-shift', 0, [0, 2]);
  assert.equal(explicitSwapResult.ok, true);
  assert.equal(state.board[0].cardId, 'enemy-right');
  assert.equal(state.board[2].cardId, 'enemy-left');
});
