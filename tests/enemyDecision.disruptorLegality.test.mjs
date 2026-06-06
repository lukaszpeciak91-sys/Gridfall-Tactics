import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialBattleState } from '../src/systems/GameState.js';
import { chooseBattleAction } from '../src/systems/enemyDecision.js';

const unitCard = (id, attack = 2, hp = 2) => ({ id, name: id, type: 'unit', attack, hp, armor: 0, effectId: null });
const effectCard = (id, effectId = 'damage_all_enemies_1_ignore_armor') => ({ id, name: id, type: 'order', effectId });
const boardUnit = (owner, id, attack = 1, hp = 2) => ({ ...unitCard(id, attack, hp), owner, cardId: id, maxHp: hp });

test('AI blocked by Disruptor chooses a legal unit instead of a blocked effect', () => {
  const state = createInitialBattleState({ name: 'Player', deck: [] }, { name: 'Enemy', deck: [] }, { firstActor: 'enemy' });
  state.effectCardsBlockedUntilCombat.enemy = true;
  state.enemy.hand.push(effectCard('pulse'), unitCard('soldier', 3, 2));
  state.board[6] = boardUnit('player', 'target', 1, 2);

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.type, 'play-unit');
  assert.equal(action.cardId, 'soldier');
});

test('AI blocked by Disruptor passes when only effect cards are available', () => {
  const state = createInitialBattleState({ name: 'Player', deck: [] }, { name: 'Enemy', deck: [] }, { firstActor: 'enemy' });
  state.effectCardsBlockedUntilCombat.enemy = true;
  state.enemy.hand.push(effectCard('pulse'), effectCard('buff', 'buff_all_atk_1'));
  state.board[6] = boardUnit('player', 'target', 1, 2);

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.type, 'pass');
});

test('player-side AI also respects Disruptor blocked effect legality', () => {
  const state = createInitialBattleState({ name: 'Player', deck: [] }, { name: 'Enemy', deck: [] }, { firstActor: 'player' });
  state.effectCardsBlockedUntilCombat.player = true;
  state.player.hand.push(effectCard('pulse'), unitCard('soldier', 3, 2));
  state.board[0] = boardUnit('enemy', 'target', 1, 2);

  const action = chooseBattleAction(state, 'player');

  assert.equal(action.type, 'play-unit');
  assert.equal(action.cardId, 'soldier');
});
