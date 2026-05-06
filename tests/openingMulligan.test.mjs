import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialBattleState,
  drawCards,
  performOpeningMulligan,
  canOpeningMulligan,
  STARTING_HAND_SIZE,
} from '../src/systems/GameState.js';
import { selectOpeningMulliganCardIds } from '../src/systems/enemyDecision.js';

const makeDeck = () => [
  { id: 'unit-a', name: 'Unit A', type: 'unit', attack: 2, hp: 2, armor: 0, effectId: null },
  { id: 'heal-a', name: 'Heal A', type: 'utility', effectId: 'heal_3' },
  { id: 'buff-a', name: 'Buff A', type: 'order', effectId: 'buff_all_atk_1' },
  { id: 'unit-b', name: 'Unit B', type: 'unit', attack: 1, hp: 1, armor: 0, effectId: null },
  { id: 'unit-c', name: 'Unit C', type: 'unit', attack: 3, hp: 1, armor: 0, effectId: null },
  { id: 'unit-d', name: 'Unit D', type: 'unit', attack: 2, hp: 3, armor: 0, effectId: null },
];

test('opening mulligan replaces up to two cards, shuffles them into deck, and preserves hand size', () => {
  const state = createInitialBattleState({ name: 'Test', deck: makeDeck() });
  drawCards(state.player, STARTING_HAND_SIZE);
  const openingHandSize = state.player.hand.length;
  const result = performOpeningMulligan(state, 'player', ['heal-a', 'buff-a', 'unit-b'], () => 0);

  assert.equal(result.ok, true);
  assert.equal(result.replaced, 2);
  assert.equal(state.player.hand.length, openingHandSize);
  assert.equal(state.mulligan.playerUsed, true);
  assert.equal(state.mulligan.playerReplaced, 2);
  assert.equal(state.player.hand.some((card) => card.id === 'unit-b'), true);
  assert.equal(canOpeningMulligan(state, 'player'), false);
});

test('opening mulligan is blocked after game start', () => {
  const state = createInitialBattleState({ name: 'Test', deck: makeDeck() });
  drawCards(state.player, STARTING_HAND_SIZE);
  state.turnsCompleted = 1;

  const result = performOpeningMulligan(state, 'player', ['heal-a']);
  assert.equal(result.ok, false);
});

test('AI opening mulligan deterministically prefers low-tempo and low-synergy cards', () => {
  const side = {
    factionName: 'Aggro',
    hand: [
      { id: 'rush', name: 'Rush', type: 'order', effectId: 'swap_adjacent_then_resolve' },
      { id: 'repair', name: 'Repair', type: 'utility', effectId: 'heal_3' },
      { id: 'runner', name: 'Runner', type: 'unit', attack: 2, hp: 1, armor: 0, effectId: 'lane_empty_bonus_damage' },
      { id: 'striker', name: 'Striker', type: 'unit', attack: 2, hp: 2, armor: 0, effectId: null },
    ],
  };

  assert.deepEqual(selectOpeningMulliganCardIds(side), ['repair', 'rush']);
});
