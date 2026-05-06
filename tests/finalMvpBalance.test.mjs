import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { createInitialBattleState, playEffectCard, resolveCombat } from '../src/systems/GameState.js';

const loadFaction = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));

const unit = (owner, overrides = {}) => ({
  id: `${owner}-unit`,
  name: 'Test Unit',
  type: 'unit',
  attack: 1,
  hp: 2,
  maxHp: 2,
  armor: 0,
  effectId: null,
  owner,
  ...overrides,
});

test('Alpha is a 1/2 unit with the same adjacent attack aura', () => {
  const swarm = loadFaction('src/data/factions/swarm.json');
  const alpha = swarm.deck.find((card) => card.id === 'swarm_alpha_1');

  assert.equal(alpha.attack, 1);
  assert.equal(alpha.hp, 2);
  assert.equal(alpha.effectId, 'adjacent_allies_atk_plus_1');
  assert.equal(alpha.textShort, 'Adjacent allies +1 ATK.');
});

test('Fortify grants all friendly units +1 temporary armor for combat', () => {
  const tank = loadFaction('src/data/factions/tank.json');
  const fortify = tank.deck.find((card) => card.id === 'tank_fortify_1');
  const state = createInitialBattleState({ name: 'Test', deck: [] });

  state.player.hand.push({ ...fortify });
  state.board[0] = unit('enemy', { attack: 1, hp: 2, maxHp: 2 });
  state.board[6] = unit('player', { attack: 0, hp: 2, maxHp: 2 });

  const result = playEffectCard(state, 'player', fortify.id);
  assert.equal(result.ok, true);
  assert.equal(state.board[6].tempArmorMod, 1);

  resolveCombat(state);

  assert.equal(state.board[6].hp, 2);
  assert.equal(state.board[6].tempArmorMod, undefined);
  assert.equal(fortify.textShort, 'All allies +1 armor this turn.');
});

test('Full Attack grants all Aggro friendly units +2 temporary attack for combat', () => {
  const aggro = loadFaction('src/data/factions/aggro.json');
  const fullAttack = aggro.deck.find((card) => card.id === 'aggro_full_attack_1');
  const state = createInitialBattleState({ name: 'Test', deck: [] });

  state.player.hand.push({ ...fullAttack });
  state.board[6] = unit('player', { attack: 1, hp: 2, maxHp: 2 });
  state.board[7] = unit('player', { attack: 2, hp: 2, maxHp: 2 });

  const result = playEffectCard(state, 'player', fullAttack.id);
  assert.equal(result.ok, true);
  assert.equal(state.board[6].tempAttackMod, 2);
  assert.equal(state.board[7].tempAttackMod, 2);
  assert.equal(fullAttack.effectId, 'aggro_buff_all_atk_2');
  assert.equal(fullAttack.textShort, 'All allies +2 ATK this turn.');

  resolveCombat(state);

  assert.equal(state.board[6].tempAttackMod, undefined);
  assert.equal(state.board[7].tempAttackMod, undefined);
});

test('Swarm Attack remains a +1 temporary attack buff', () => {
  const swarm = loadFaction('src/data/factions/swarm.json');
  const swarmAttack = swarm.deck.find((card) => card.id === 'swarm_swarm_attack_1');
  const state = createInitialBattleState({ name: 'Test', deck: [] });

  state.player.hand.push({ ...swarmAttack });
  state.board[6] = unit('player', { attack: 1, hp: 2, maxHp: 2 });

  const result = playEffectCard(state, 'player', swarmAttack.id);
  assert.equal(result.ok, true);
  assert.equal(state.board[6].tempAttackMod, 1);
  assert.equal(swarmAttack.effectId, 'buff_all_atk_1');
  assert.equal(swarmAttack.textShort, 'All allies +1 ATK this turn.');

  resolveCombat(state);

  assert.equal(state.board[6].tempAttackMod, undefined);
});
