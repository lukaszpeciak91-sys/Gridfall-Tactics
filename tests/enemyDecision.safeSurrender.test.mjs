import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialBattleState } from '../src/systems/GameState.js';
import { chooseBattleAction, isVerySafeConcedableState } from '../src/systems/enemyDecision.js';

function createState() {
  const state = createInitialBattleState({ name: 'P', deck: [] }, { name: 'E', deck: [] }, { firstActor: 'enemy' });
  state.playerHP = 12;
  state.enemyHP = 10;
  state.enemy.hand = [];
  state.enemy.deck = [];
  state.player.hand = [];
  state.player.deck = [{ id: 'p-future', name: 'P Future', type: 'unit', attack: 2, hp: 2, armor: 0, effectId: null }];
  return state;
}

test('does not mark safe-concedable with unknown effect card in enemy hand', () => {
  const state = createState();
  state.enemy.hand.push({ id: 'mystery', name: 'Mystery', type: 'order', effectId: 'unknown_effect_xyz' });
  assert.equal(isVerySafeConcedableState(state, 'enemy'), false);
});

test('does not mark safe-concedable when immediate no-progress already resolves', () => {
  const state = createState();
  state.playerHP = 9;
  state.enemyHP = 1;
  state.player.hand = [];
  state.player.deck = [];
  assert.equal(isVerySafeConcedableState(state, 'enemy'), false);
});

test('does not mark safe-concedable when enemy hp is equal or higher', () => {
  const equal = createState();
  equal.enemyHP = equal.playerHP;
  assert.equal(isVerySafeConcedableState(equal, 'enemy'), false);

  const higher = createState();
  higher.enemyHP = higher.playerHP + 1;
  assert.equal(isVerySafeConcedableState(higher, 'enemy'), false);
});

test('does not mark safe-concedable if enemy has any unit on board', () => {
  const state = createState();
  state.board[0] = { id: 'u', cardId: 'u', name: 'U', type: 'unit', owner: 'enemy', attack: 0, hp: 2, maxHp: 2, armor: 0, effectId: null };
  assert.equal(isVerySafeConcedableState(state, 'enemy'), false);
});

test('does not mark safe-concedable with meaningful known cards in hand or deck', () => {
  const handState = createState();
  handState.enemy.hand.push({ id: 'striker', name: 'Striker', type: 'unit', attack: 2, hp: 2, armor: 0, effectId: null });
  assert.equal(isVerySafeConcedableState(handState, 'enemy'), false);

  const deckState = createState();
  deckState.enemy.deck.push({ id: 'summon', name: 'Summon', type: 'order', effectId: 'summon_grunt_empty_slot' });
  assert.equal(isVerySafeConcedableState(deckState, 'enemy'), false);
});

test('does not surrender on first eligible pass and surrenders on second consecutive eligible pass', () => {
  const state = createState();
  const first = chooseBattleAction(state, 'enemy', { aiSafeSurrenderEnabled: true });
  assert.equal(first.type, 'pass');
  assert.equal(state.aiSafeSurrender.enemy, 1);

  const second = chooseBattleAction(state, 'enemy', { aiSafeSurrenderEnabled: true });
  assert.equal(second.type, 'surrender');
  assert.equal(second.reason, 'ai-safe-surrender');
});

test('safe surrender counter resets when state becomes non-eligible', () => {
  const state = createState();
  const first = chooseBattleAction(state, 'enemy', { aiSafeSurrenderEnabled: true });
  assert.equal(first.type, 'pass');
  assert.equal(state.aiSafeSurrender.enemy, 1);

  state.enemyHP = 12;
  const second = chooseBattleAction(state, 'enemy', { aiSafeSurrenderEnabled: true });
  assert.notEqual(second.type, 'surrender');
  assert.equal(state.aiSafeSurrender.enemy, 0);
});

test('equal-HP frozen states keep passing and do not surrender', () => {
  const state = createState();
  state.playerHP = 10;
  state.enemyHP = 10;
  const first = chooseBattleAction(state, 'enemy', { aiSafeSurrenderEnabled: true });
  const second = chooseBattleAction(state, 'enemy', { aiSafeSurrenderEnabled: true });
  assert.equal(first.type, 'pass');
  assert.equal(second.type, 'pass');
});

test('player-side strict concedable detection eligible only in safe state', () => {
  const state = createState();
  state.firstActor = 'player';
  state.playerHP = 4;
  state.enemyHP = 7;
  state.player.hand = [];
  state.player.deck = [];
  state.enemy.hand = [];
  state.enemy.deck = [{ id: 'e-future', name: 'E Future', type: 'unit', attack: 2, hp: 2, armor: 0, effectId: null }];
  assert.equal(isVerySafeConcedableState(state, 'player'), true);
});

test('player-side concedable detection blocked by hp parity, board presence, meaningful and unknown cards', () => {
  const hpState = createState();
  hpState.playerHP = 8;
  hpState.enemyHP = 8;
  assert.equal(isVerySafeConcedableState(hpState, 'player'), false);

  const boardState = createState();
  boardState.playerHP = 4;
  boardState.enemyHP = 7;
  boardState.player.hand = [];
  boardState.player.deck = [];
  boardState.board[6] = { id: 'p-u', cardId: 'p-u', name: 'P U', type: 'unit', owner: 'player', attack: 0, hp: 2, maxHp: 2, armor: 0, effectId: null };
  assert.equal(isVerySafeConcedableState(boardState, 'player'), false);

  const meaningfulState = createState();
  meaningfulState.playerHP = 4;
  meaningfulState.enemyHP = 7;
  meaningfulState.player.hand = [{ id: 'summon', name: 'Summon', type: 'order', effectId: 'summon_grunt_empty_slot' }];
  meaningfulState.player.deck = [];
  assert.equal(isVerySafeConcedableState(meaningfulState, 'player'), false);

  const unknownState = createState();
  unknownState.playerHP = 4;
  unknownState.enemyHP = 7;
  unknownState.player.hand = [{ id: 'mystery', name: 'Mystery', type: 'order', effectId: 'unknown_effect_xyz' }];
  unknownState.player.deck = [];
  assert.equal(isVerySafeConcedableState(unknownState, 'player'), false);
});

test('player-side concedable detection blocked when immediate no-progress already resolves', () => {
  const state = createState();
  state.playerHP = 1;
  state.enemyHP = 9;
  state.player.hand = [];
  state.player.deck = [];
  state.enemy.hand = [];
  state.enemy.deck = [];
  assert.equal(isVerySafeConcedableState(state, 'player'), false);
});
