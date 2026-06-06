import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canPass,
  canPlayEffectCard,
  canPlayOrRedeploy,
  canSwap,
  createInitialBattleState,
  playEffectCard,
  playOrRedeployUnit,
  resolveCombat,
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

test('Disruptor blocks player effect card availability without consuming the block on attempts', () => {
  const state = createInitialBattleState({ name: 'Player', deck: [] }, { name: 'Enemy', deck: [] }, { firstActor: 'enemy' });
  state.enemy.hand.push(unitCard('disruptor', 1, 2, 'block_enemy_effect_cards_until_combat'));
  state.player.hand.push(
    effectCard('pulse', 'damage_all_enemies_1_ignore_armor'),
    effectCard('heal', 'heal_2'),
    unitCard('soldier', 2, 2),
  );
  state.board[0] = boardUnit('enemy', 'enemy-target', 1, 2);
  state.board[6] = boardUnit('player', 'player-target', 1, 1);
  state.board[7] = boardUnit('player', 'swap-a', 1, 2);
  state.board[8] = boardUnit('player', 'swap-b', 1, 2);

  assert.equal(playOrRedeployUnit(state, 'enemy', 'disruptor', 1).ok, true);
  assert.equal(state.effectCardsBlockedUntilCombat.player, true);

  assert.deepEqual(canPlayEffectCard(state, 'player', state.player.hand[0]), { ok: false, reason: 'You cannot play effect cards.' });
  assert.equal(playEffectCard(state, 'player', 'pulse').ok, false);
  assert.equal(resolveTargetedEffectCard(state, 'player', 'heal', 6).ok, false);
  assert.equal(state.player.hand.some((card) => card.id === 'pulse'), true);
  assert.equal(state.player.hand.some((card) => card.id === 'heal'), true);
  assert.equal(state.effectCardsBlockedUntilCombat.player, true);

  assert.equal(canPlayOrRedeploy(state, 'player', 'soldier', 7).ok, true);
  assert.equal(canSwap(state, 7, 8, 'player'), true);
  assert.equal(canPass(state), true);
});

test('Disruptor clears at combat cleanup and effect cards become playable again', () => {
  const state = createInitialBattleState({ name: 'Player', deck: [] }, { name: 'Enemy', deck: [] }, { firstActor: 'enemy' });
  state.enemy.hand.push(unitCard('disruptor', 1, 2, 'block_enemy_effect_cards_until_combat'));
  state.player.hand.push(effectCard('pulse', 'damage_all_enemies_1_ignore_armor'));
  state.board[0] = boardUnit('enemy', 'enemy-target', 1, 2);

  playOrRedeployUnit(state, 'enemy', 'disruptor', 1);
  assert.equal(playEffectCard(state, 'player', 'pulse').ok, false);

  resolveCombat(state);

  assert.equal(state.effectCardsBlockedUntilCombat.player, false);
  assert.equal(playEffectCard(state, 'player', 'pulse').ok, true);
});

test('Disruptor applies symmetrically when player blocks enemy effect cards', () => {
  const state = createInitialBattleState({ name: 'Player', deck: [] }, { name: 'Enemy', deck: [] }, { firstActor: 'player' });
  state.player.hand.push(unitCard('disruptor', 1, 2, 'block_enemy_effect_cards_until_combat'));
  state.enemy.hand.push(effectCard('pulse', 'damage_all_enemies_1_ignore_armor'));

  playOrRedeployUnit(state, 'player', 'disruptor', 6);

  assert.equal(state.effectCardsBlockedUntilCombat.enemy, true);
  assert.equal(playEffectCard(state, 'enemy', 'pulse').ok, false);
});
