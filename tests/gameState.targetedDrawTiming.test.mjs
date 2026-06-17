import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialBattleState,
  playEffectCard,
  resolveCombat,
  resolveTargetedEffectCard,
} from '../src/systems/GameState.js';

function makeState() {
  return createInitialBattleState({ name: 'Test', deck: [] }, { name: 'Enemy', deck: [] }, { firstActor: 'player' });
}

function unit(owner = 'player', id = 'ally') {
  return { id, cardId: id, name: id, type: 'unit', owner, attack: 1, hp: 1, maxHp: 1, armor: 0, effectId: null };
}

function recallCard(id = 'recall') {
  return { id, name: 'Recall', type: 'utility', targeting: 'friendly_unit', effectId: 'return_friendly_draw_1' };
}

function filler(id) {
  return { id, name: id, type: 'utility', effectId: 'noop' };
}

test('Recall can be played at full hand with a valid friendly target and does not burn blocked draws', () => {
  const state = makeState();
  state.board[6] = unit('player', 'returned-ally');
  state.player.hand.push(recallCard(), filler('filler-1'), filler('filler-2'), filler('filler-3'), filler('filler-4'));
  state.player.deck.push(filler('top-deck'));

  const result = resolveTargetedEffectCard(state, 'player', 'recall', 6, [6]);

  assert.equal(result.ok, true);
  assert.equal(state.board[6], null);
  assert.equal(state.player.discard.map((card) => card.id).join(','), 'recall');
  assert.equal(state.player.hand.length, 5);
  assert.equal(state.player.hand.some((card) => card.id === 'returned-ally'), true);
  assert.equal(state.player.hand.some((card) => card.id === 'top-deck'), false);
  assert.equal(state.player.deck.map((card) => card.id).join(','), 'top-deck');
  assert.deepEqual(result.feedback, [{ type: 'draw', owner: 'player', requested: 1, drawn: 0, blockedReason: 'hand-full' }]);
});

test('Recall at four cards returns an ally and draws one when space and deck are available', () => {
  const state = makeState();
  state.board[6] = unit('player', 'returned-ally');
  state.player.hand.push(recallCard(), filler('filler-1'), filler('filler-2'), filler('filler-3'));
  state.player.deck.push(filler('top-deck'));

  const result = resolveTargetedEffectCard(state, 'player', 'recall', 6, [6]);

  assert.equal(result.ok, true);
  assert.equal(state.board[6], null);
  assert.equal(state.player.discard.map((card) => card.id).join(','), 'recall');
  assert.equal(state.player.hand.length, 5);
  assert.equal(state.player.hand.map((card) => card.id).join(','), 'filler-1,filler-2,filler-3,returned-ally,top-deck');
  assert.equal(state.player.deck.length, 0);
  assert.deepEqual(result.feedback, [{ type: 'draw', owner: 'player', requested: 1, drawn: 1, blockedReason: null }]);
});

test('Feast draw_1 still leaves hand before drawing and replaces itself from full hand', () => {
  const state = makeState();
  state.player.hand.push(
    { id: 'feast', name: 'Feast', type: 'utility', targeting: 'none', effectId: 'draw_1' },
    filler('filler-1'),
    filler('filler-2'),
    filler('filler-3'),
    filler('filler-4'),
  );
  state.player.deck.push(filler('top-deck'));

  const result = playEffectCard(state, 'player', 'feast');

  assert.equal(result.ok, true);
  assert.equal(state.player.discard.map((card) => card.id).join(','), 'feast');
  assert.equal(state.player.hand.length, 5);
  assert.equal(state.player.hand.at(-1).id, 'top-deck');
  assert.equal(state.player.deck.length, 0);
});

test('Quick Fix delayed draw behavior remains capped by hand size without burning deck cards', () => {
  const state = makeState();
  state.player.hand.push(
    { id: 'quick-fix', name: 'Quick Fix', type: 'utility', targeting: 'friendly_unit', effectId: 'heal_1_atk_1_draw_on_kill_this_turn' },
    filler('filler-1'),
    filler('filler-2'),
    filler('filler-3'),
    filler('filler-4'),
  );
  state.player.deck.push(filler('top-deck'));
  state.board[6] = { ...unit('player', 'attacker'), attack: 1, hp: 2, maxHp: 3 };
  state.board[0] = { ...unit('enemy', 'victim'), attack: 0, hp: 2, maxHp: 2 };

  const result = resolveTargetedEffectCard(state, 'player', 'quick-fix', 6, [6]);
  assert.equal(result.ok, true);
  assert.equal(state.player.hand.length, 4);

  state.player.hand.push(filler('refill-slot'));
  const combatEvents = resolveCombat(state);

  assert.equal(state.player.hand.length, 5);
  assert.equal(state.player.deck.map((card) => card.id).join(','), 'top-deck');
  assert.equal(state.quickFixTempoDraws, 0);
  assert.equal(combatEvents.some((event) => event.quickFixDrawFeedback?.blockedReason === 'hand-full'), true);
});
