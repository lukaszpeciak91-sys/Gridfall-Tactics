import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  createInitialBattleState,
  playEffectCard,
  playOrRedeployUnit,
  resolveCombat,
  resolveTargetedEffectCard,
} from '../src/systems/GameState.js';

const loadFaction = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const swarm = loadFaction('src/data/factions/swarm.json');
const control = loadFaction('src/data/factions/control.json');

const card = (id, overrides = {}) => ({
  id,
  name: id,
  type: 'unit',
  attack: 1,
  hp: 1,
  armor: 0,
  effectId: null,
  ...overrides,
});

const boardUnit = (id, overrides = {}) => ({
  ...card(id),
  cardId: id,
  owner: 'player',
  maxHp: 1,
  ...overrides,
});

function summonFloodToken(state) {
  const flood = swarm.deck.find((item) => item.id === 'swarm_flood_1');
  state.player.hand.push({ ...flood });
  assert.equal(playEffectCard(state, 'player', flood.id).ok, true);
  assert.equal(state.board[6].temporaryFloodToken, true);
  return state.board[6];
}

test('redeploy over a normal unit returns the displaced unit to hand', () => {
  const state = createInitialBattleState({ name: 'Test', deck: [] });
  state.board[6] = boardUnit('normal-unit', { hp: 1, maxHp: 2 });
  state.player.hand.push(card('replacement'));

  assert.equal(playOrRedeployUnit(state, 'player', 'replacement', 6).ok, true);
  assert.equal(state.board[6].id, 'replacement');
  assert.equal(state.player.hand.find((item) => item.id === 'normal-unit')?.hp, 2);
});

test('redeploy over a Generated Grunt returns the persistent generated unit to hand', () => {
  const state = createInitialBattleState({ name: 'Test', deck: [] });
  const spawn = swarm.deck.find((item) => item.id === 'swarm_spawn_1');
  state.player.hand.push({ ...spawn });
  assert.equal(playEffectCard(state, 'player', spawn.id).ok, true);
  const generatedGrunt = state.board[6];
  state.player.hand.push(card('replacement'));

  assert.equal(playOrRedeployUnit(state, 'player', 'replacement', 6).ok, true);
  const returnedGrunt = state.player.hand.find((item) => item.id === generatedGrunt.id);
  assert.equal(returnedGrunt?.tokenType, 'grunt');
  assert.equal(returnedGrunt?.artAssetId, generatedGrunt.artAssetId);
});

test('redeploy over a Flood Token makes it vanish without hand, discard, or death effects', () => {
  const state = createInitialBattleState({ name: 'Test', deck: [] });
  const floodToken = summonFloodToken(state);
  floodToken.effectId = 'death_damage_enemy_hero_1';
  state.player.hand.push(card('replacement'));
  const enemyHpBefore = state.enemyHP;

  assert.equal(playOrRedeployUnit(state, 'player', 'replacement', 6).ok, true);
  assert.equal(state.board[6].id, 'replacement');
  assert.equal(state.player.hand.some((item) => item.id === floodToken.id), false);
  assert.equal(state.player.discard.some((item) => item.id === floodToken.id), false);
  assert.deepEqual(state.player.fallen, []);
  assert.equal(state.enemyHP, enemyHpBefore);
});

test('redeploy over a Flood Token is allowed when hand is full because the token cannot return to hand', () => {
  const state = createInitialBattleState({ name: 'Test', deck: [] });
  summonFloodToken(state);
  state.player.hand.push(card('replacement'));
  while (state.player.hand.length < state.player.maxHandSize) {
    state.player.hand.push(card(`filler-${state.player.hand.length}`));
  }

  assert.equal(playOrRedeployUnit(state, 'player', 'replacement', 6).ok, true);
  assert.equal(state.board[6].id, 'replacement');
});

test('Recall returns a Generated Grunt to hand with its generated metadata', () => {
  const state = createInitialBattleState({ name: 'Test', deck: [] });
  const spawn = swarm.deck.find((item) => item.id === 'swarm_spawn_1');
  const recall = control.deck.find((item) => item.id === 'control_recall_1');
  state.player.hand.push({ ...spawn });
  assert.equal(playEffectCard(state, 'player', spawn.id).ok, true);
  const generatedGrunt = state.board[6];
  state.player.hand.push({ ...recall });

  assert.equal(resolveTargetedEffectCard(state, 'player', recall.id, 6).ok, true);
  const returnedGrunt = state.player.hand.find((item) => item.id === generatedGrunt.id);
  assert.equal(returnedGrunt?.tokenType, 'grunt');
  assert.equal(returnedGrunt?.artAssetId, generatedGrunt.artAssetId);
});

test('Recall makes a Flood Token vanish without adding it to hand or discard', () => {
  const state = createInitialBattleState({ name: 'Test', deck: [] });
  const floodToken = summonFloodToken(state);
  const recall = control.deck.find((item) => item.id === 'control_recall_1');
  floodToken.effectId = 'death_damage_enemy_hero_1';
  state.player.deck.push(card('drawn-after-recall'));
  state.player.hand.push({ ...recall });
  const enemyHpBefore = state.enemyHP;

  const result = resolveTargetedEffectCard(state, 'player', recall.id, 6);
  assert.equal(result.ok, true);
  assert.equal(result.feedback[0].drawn, 1);
  assert.equal(state.board[6], null);
  assert.equal(state.player.hand.some((item) => item.id === floodToken.id), false);
  assert.equal(state.player.hand.some((item) => item.id === 'drawn-after-recall'), true);
  assert.equal(state.player.discard.some((item) => item.id === floodToken.id), false);
  assert.deepEqual(state.player.fallen, []);
  assert.equal(state.enemyHP, enemyHpBefore);
});

test('Flood Tokens still vanish after combat without entering discard', () => {
  const state = createInitialBattleState({ name: 'Test', deck: [] });
  const floodToken = summonFloodToken(state);

  resolveCombat(state);

  assert.equal(state.board[6], null);
  assert.equal(state.player.discard.some((item) => item.id === floodToken.id), false);
  assert.deepEqual(state.player.fallen, []);
});
