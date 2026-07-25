import test from 'node:test';
import assert from 'node:assert/strict';

import { getFactionByKey } from '../src/data/factions/index.js';
import {
  createInitialBattleState,
  playOrRedeployUnit,
  resolveCombat,
  resolveQuickStrike,
} from '../src/systems/GameState.js';

const swarm = getFactionByKey('Swarm');
const emptyFaction = { name: 'Empty', deck: [] };

function productionCard(id) {
  const card = swarm.deck.find((candidate) => candidate.id === id);
  assert.ok(card, `missing production card ${id}`);
  return structuredClone(card);
}

function state(firstActor = 'player') {
  return createInitialBattleState(emptyFaction, emptyFaction, { firstActor });
}

function boardUnit(card, owner, overrides = {}) {
  return {
    ...structuredClone(card),
    cardId: card.id,
    owner,
    maxHp: card.hp,
    ...overrides,
  };
}

function defender(owner, overrides = {}) {
  return boardUnit({ id: `${owner}-defender`, name: 'Defender', type: 'unit', attack: 0, hp: 4, armor: 2 }, owner, overrides);
}

test('production Rusher ignores unit armor in standard combat for both owners without affecting normal attackers', () => {
  for (const owner of ['player', 'enemy']) {
    const s = state(owner);
    const attackerIndex = owner === 'player' ? 6 : 0;
    const defenderIndex = owner === 'player' ? 0 : 6;
    s.board[attackerIndex] = boardUnit(productionCard('swarm_rusher_1'), owner);
    s.board[defenderIndex] = defender(owner === 'player' ? 'enemy' : 'player');

    const events = resolveCombat(s);

    const rusherAttack = events.find((event) => event.attackerIndex === attackerIndex);
    assert.equal(rusherAttack.damage, 2);
    assert.equal(s.board[defenderIndex].hp, 2);
    assert.deepEqual(s.board[attackerIndex].combatKeywords, ['ignoreArmor']);
  }

  const control = state();
  control.board[6] = boardUnit({ id: 'ordinary', name: 'Ordinary', type: 'unit', attack: 2, hp: 2, armor: 0 }, 'player');
  control.board[0] = defender('enemy');
  const events = resolveCombat(control);
  assert.equal(events.find((event) => event.attackerIndex === 6).damage, 0);
  assert.equal(control.board[0].hp, 4);
});

test('production Rusher preserves unarmored, lethal, Fallen, and overflow behavior', () => {
  const unarmored = state();
  unarmored.board[6] = boardUnit(productionCard('swarm_rusher_1'), 'player');
  unarmored.board[0] = defender('enemy', { armor: 0 });
  resolveCombat(unarmored);
  assert.equal(unarmored.board[0].hp, 2);

  const lethal = state();
  lethal.board[6] = boardUnit(productionCard('swarm_rusher_1'), 'player', { combatKeywords: ['ignoreArmor', 'overflow'] });
  lethal.board[0] = defender('enemy', { hp: 1, maxHp: 1, armor: 5 });
  resolveCombat(lethal);
  assert.equal(lethal.board[0], null);
  assert.equal(lethal.enemy.fallen.at(-1)?.card.id, 'enemy-defender');
  assert.equal(lethal.enemyHP, 11, 'overflow still receives armor-ignoring excess damage');
  assert.deepEqual(lethal.board[6].combatKeywords, ['ignoreArmor', 'overflow']);
});

test('production Rusher ignores armor through immediate lane combat orchestration', () => {
  const s = state();
  s.board[6] = boardUnit(productionCard('swarm_rusher_1'), 'player');
  s.board[0] = defender('enemy');

  const result = resolveQuickStrike(s, 'player', 6);

  assert.equal(result.ok, true);
  assert.equal(result.combatEvents.find((event) => event.attackerIndex === 6).damage, 2);
  assert.equal(s.board[0].hp, 2);
  assert.deepEqual(s.board[6].combatKeywords, ['ignoreArmor']);
});

test('production Spitter on-play damage is owner-symmetric, ignores current armor, and returns normal action feedback', () => {
  for (const owner of ['player', 'enemy']) {
    const s = state(owner);
    const placementIndex = owner === 'player' ? 6 : 0;
    const opposedIndex = owner === 'player' ? 0 : 6;
    const side = owner === 'player' ? s.player : s.enemy;
    side.hand.push(productionCard('swarm_spitter_1'));
    s.board[opposedIndex] = defender(owner === 'player' ? 'enemy' : 'player', { hp: 3, maxHp: 3, armor: 4 });
    const unrelatedHp = owner === 'player' ? s.enemyHP : s.playerHP;

    const result = playOrRedeployUnit(s, owner, 'swarm_spitter_1', placementIndex);

    assert.equal(result.ok, true);
    assert.equal(result.type, 'play');
    assert.equal(result.card.id, 'swarm_spitter_1');
    assert.equal(s.board[opposedIndex].hp, 2);
    assert.equal(s.board[opposedIndex].armor, 4);
    assert.equal(owner === 'player' ? s.enemyHP : s.playerHP, unrelatedHp);
    assert.equal(s.board[placementIndex].cardId, 'swarm_spitter_1');
  }
});

test('production Spitter handles lethal cleanup, Fallen, and an empty opposed lane without unrelated mutation', () => {
  const lethal = state();
  lethal.player.hand.push(productionCard('swarm_spitter_1'));
  lethal.board[0] = defender('enemy', { hp: 1, maxHp: 1, armor: 8 });
  const result = playOrRedeployUnit(lethal, 'player', 'swarm_spitter_1', 6);
  assert.equal(result.ok, true);
  assert.equal(lethal.board[0], null);
  assert.equal(lethal.enemy.fallen.at(-1)?.card.id, 'enemy-defender');
  assert.equal(lethal.playerHP, 12);
  assert.equal(lethal.enemyHP, 12);

  const empty = state();
  empty.player.hand.push(productionCard('swarm_spitter_1'));
  const beforeBoard = structuredClone(empty.board);
  const emptyResult = playOrRedeployUnit(empty, 'player', 'swarm_spitter_1', 7);
  assert.equal(emptyResult.ok, true);
  assert.deepEqual(empty.board.slice(0, 6), beforeBoard.slice(0, 6));
  assert.equal(empty.board[7].cardId, 'swarm_spitter_1');
  assert.equal(empty.playerHP, 12);
  assert.equal(empty.enemyHP, 12);
  assert.equal(empty.enemy.fallen.length, 0);
});
