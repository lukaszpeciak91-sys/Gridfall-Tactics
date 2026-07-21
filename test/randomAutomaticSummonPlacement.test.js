import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  chooseRandomLegalOwnerSlots,
  createInitialBattleState,
  playEffectCard,
  resolveCombat,
} from '../src/systems/GameState.js';

const PLAYER = { id: 'p', name: 'P', deck: [] };
const ENEMY = { id: 'e', name: 'E', deck: [] };
const FLOOD_CARD = { id: 'flood', name: 'Flood', type: 'special', effectId: 'fill_empty_slots_0_1' };
const GRAVE_CALL_CARD = { id: 'grave', name: 'Grave Call', type: 'order', effectId: 'grave_call' };

function state(seed = 1, owner = 'player') {
  const battle = createInitialBattleState(PLAYER, ENEMY, { firstActor: owner, gameplayRandomState: seed });
  battle[owner].hand = [];
  return battle;
}

function unit(id, owner = 'player') {
  return { id, cardId: id, name: id, type: 'unit', owner, attack: 1, hp: 2, maxHp: 2, armor: 0, effectId: null };
}

function play(state, owner, card) {
  state[owner].hand.push({ ...card });
  const result = playEffectCard(state, owner, card.id);
  assert.equal(result.ok, true, result.reason);
  return result;
}

function occupiedIndexes(state, owner = 'player') {
  return state.board.map((slot, index) => slot?.owner === owner ? index : null).filter(Number.isInteger);
}

function generatedIndexes(state, owner = 'player') {
  return state.board
    .map((slot, index) => slot?.owner === owner && slot.id !== 'anchor' && !['a', 'b', 'c', 'blocker'].includes(slot.id) ? index : null)
    .filter(Number.isInteger);
}

function seedsForAllPairs(legal = [6, 7, 8]) {
  const seen = new Map();
  for (let seed = 1; seed < 4294967296 && seen.size < 3; seed += 100000000) {
    const selected = chooseRandomLegalOwnerSlots({ gameplayRandomState: seed }, legal, 2).join(',');
    seen.set(selected, seed);
  }
  return seen;
}

test('random two-slot helper reaches each legal pair and preserves stable order', () => {
  const seen = seedsForAllPairs();
  assert.deepEqual([...seen.keys()].sort(), ['6,7', '6,8', '7,8']);
  for (const pair of seen.keys()) {
    const slots = pair.split(',').map(Number);
    assert.deepEqual(slots, [...slots].sort((a, b) => a - b));
  }
});

test('random helper is structurally uniform over two-slot combinations', () => {
  const legal = [6, 7, 8];
  const combinations = [];
  for (let first = 0; first < legal.length - 1; first += 1) {
    for (let second = first + 1; second < legal.length; second += 1) combinations.push([legal[first], legal[second]].join(','));
  }
  assert.deepEqual(combinations, ['6,7', '6,8', '7,8']);
  const observed = new Set(Array.from({ length: 45 }, (_, i) => chooseRandomLegalOwnerSlots({ gameplayRandomState: i * 100000000 + 1 }, legal, 2).join(',')));
  assert.deepEqual([...observed].sort(), combinations);
});

test('Flood with three legal slots reaches all pairs across controlled seeds and fixed seed repeats', () => {
  const seen = new Set();
  for (const seed of seedsForAllPairs().values()) {
    const battle = state(seed);
    play(battle, 'player', FLOOD_CARD);
    seen.add(occupiedIndexes(battle).join(','));
  }
  assert.deepEqual([...seen].sort(), ['6,7', '6,8', '7,8']);

  const first = state(42);
  const second = state(42);
  play(first, 'player', FLOOD_CARD);
  play(second, 'player', FLOOD_CARD);
  assert.deepEqual(occupiedIndexes(first), occupiedIndexes(second));
});

test('Flood supports partial placement, blocked slots, temporary cleanup, and Fallen exclusion', () => {
  const twoSlots = state(1);
  twoSlots.board[6] = unit('blocker', 'enemy');
  play(twoSlots, 'player', FLOOD_CARD);
  assert.deepEqual(generatedIndexes(twoSlots), [7, 8]);

  const oneSlot = state(1);
  oneSlot.board[6] = unit('a', 'enemy');
  oneSlot.board[7] = unit('b', 'enemy');
  play(oneSlot, 'player', FLOOD_CARD);
  assert.deepEqual(generatedIndexes(oneSlot), [8]);

  const zeroSlots = state(1);
  zeroSlots.board[6] = unit('a');
  zeroSlots.board[7] = unit('b');
  zeroSlots.board[8] = unit('c');
  zeroSlots.player.hand.push({ ...FLOOD_CARD });
  assert.equal(playEffectCard(zeroSlots, 'player', FLOOD_CARD.id).ok, true);
  assert.deepEqual(generatedIndexes(zeroSlots), []);

  const blocked = state(1);
  blocked.player.hand.push({ ...FLOOD_CARD });
  blocked.playerLanePlayBlockedThisTurn = [false, true, false];
  playEffectCard(blocked, 'player', FLOOD_CARD.id);
  assert.deepEqual(occupiedIndexes(blocked), [6, 8]);

  resolveCombat(blocked);
  assert.deepEqual(occupiedIndexes(blocked), []);
  assert.equal(blocked.player.fallen.length, 0);
});

test('Grave Call two-grunt branch uses random legal pairs and partial placement', () => {
  const seen = new Set();
  for (const seed of seedsForAllPairs().values()) {
    const battle = state(seed);
    play(battle, 'player', GRAVE_CALL_CARD);
    seen.add(occupiedIndexes(battle).join(','));
  }
  assert.deepEqual([...seen].sort(), ['6,7', '6,8', '7,8']);

  const twoSlots = state(1);
  twoSlots.board[6] = unit('blocker', 'enemy');
  play(twoSlots, 'player', GRAVE_CALL_CARD);
  assert.deepEqual(generatedIndexes(twoSlots), [7, 8]);

  const oneSlot = state(1);
  oneSlot.board[6] = unit('a', 'enemy');
  oneSlot.board[7] = unit('b', 'enemy');
  play(oneSlot, 'player', GRAVE_CALL_CARD);
  assert.deepEqual(generatedIndexes(oneSlot), [8]);
});

test('Grave Call one-grunt branch chooses one random slot reproducibly and preserves ally-count branching', () => {
  const seen = new Set();
  for (let seed = 1; seed < 4294967296; seed += 100000000) {
    const battle = state(seed);
    battle.board[6] = unit('anchor');
    play(battle, 'player', GRAVE_CALL_CARD);
    seen.add(generatedIndexes(battle).join(','));
  }
  assert.deepEqual([...seen].sort(), ['7', '8']);

  const first = state(42);
  const second = state(42);
  first.board[6] = unit('anchor');
  second.board[6] = unit('anchor');
  play(first, 'player', GRAVE_CALL_CARD);
  play(second, 'player', GRAVE_CALL_CARD);
  assert.deepEqual(generatedIndexes(first), generatedIndexes(second));
  assert.equal(generatedIndexes(first).length, 1);
});

test('Grave Call no legal slot creates no Grunt, and enemy row placement uses seeded GameState logic', () => {
  const full = state(1);
  full.board[6] = unit('a');
  full.board[7] = unit('b');
  full.board[8] = unit('c');
  full.player.hand.push({ ...GRAVE_CALL_CARD });
  assert.equal(playEffectCard(full, 'player', GRAVE_CALL_CARD.id).ok, false);

  const enemyState = state(3, 'enemy');
  play(enemyState, 'enemy', GRAVE_CALL_CARD);
  assert.equal(occupiedIndexes(enemyState, 'enemy').length, 2);
  assert.ok(occupiedIndexes(enemyState, 'enemy').every((index) => [0, 1, 2].includes(index)));
});

test('summon placement change does not introduce new direct Math.random call sites in GameState', () => {
  const source = readFileSync(new URL('../src/systems/GameState.js', import.meta.url), 'utf8');
  const helperStart = source.indexOf('function nextGameplayRandom');
  const helperEnd = source.indexOf('function createBoardUnitFromCard');
  assert.ok(helperStart >= 0 && helperEnd > helperStart);
  assert.equal(source.slice(helperStart, helperEnd).includes('Math.random'), false);
});
