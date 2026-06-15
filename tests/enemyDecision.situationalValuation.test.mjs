import test from 'node:test';
import assert from 'node:assert/strict';

import { getFactionByKey } from '../src/data/factions/index.js';
import { createInitialBattleState } from '../src/systems/GameState.js';
import { chooseBattleAction } from '../src/systems/enemyDecision.js';

const emptyFaction = { name: 'Empty', deck: [] };

function factionCard(factionName, cardId) {
  const card = getFactionByKey(factionName).deck.find((item) => item.id === cardId);
  assert.ok(card, `missing card ${cardId}`);
  return { ...card };
}

function unit({ owner = 'enemy', id = 'unit', attack = 1, hp = 1, armor = 0, effectId = null }) {
  return {
    id,
    cardId: id,
    name: id,
    type: 'unit',
    owner,
    attack,
    hp,
    maxHp: hp,
    armor,
    effectId,
  };
}

test('AI values Spawn when behind on board with empty friendly slots', () => {
  const state = createInitialBattleState(emptyFaction, emptyFaction, { firstActor: 'enemy' });
  state.enemy.hand.push(factionCard('Swarm', 'swarm_spawn_1'));
  state.board[6] = unit({ owner: 'player', id: 'player-left', attack: 2, hp: 2 });
  state.board[7] = unit({ owner: 'player', id: 'player-mid', attack: 1, hp: 1 });

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.type, 'play-effect');
  assert.equal(action.cardId, 'swarm_spawn_1');
});

test('AI does not choose Spawn over a strong immediate removal action', () => {
  const state = createInitialBattleState(emptyFaction, emptyFaction, { firstActor: 'enemy' });
  state.enemy.hand.push(
    factionCard('Swarm', 'swarm_spawn_1'),
    factionCard('Control', 'control_pulse_wave_1'),
  );
  state.board[6] = unit({ owner: 'player', id: 'left-target', attack: 2, hp: 1 });
  state.board[7] = unit({ owner: 'player', id: 'mid-target', attack: 2, hp: 1 });
  state.board[8] = unit({ owner: 'player', id: 'right-target', attack: 2, hp: 1 });

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.cardId, 'control_pulse_wave_1');
});

test('AI values Flood when it preserves board width against open-lane pressure', () => {
  const state = createInitialBattleState(emptyFaction, emptyFaction, { firstActor: 'enemy' });
  state.enemy.hand.push(factionCard('Swarm', 'swarm_flood_1'));
  state.board[6] = unit({ owner: 'player', id: 'player-left', attack: 2, hp: 2 });
  state.board[7] = unit({ owner: 'player', id: 'player-mid', attack: 1, hp: 1 });

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.type, 'play-effect');
  assert.equal(action.cardId, 'swarm_flood_1');
});

test('AI does not choose Flood over a strong immediate removal action', () => {
  const state = createInitialBattleState(emptyFaction, emptyFaction, { firstActor: 'enemy' });
  state.enemy.hand.push(
    factionCard('Swarm', 'swarm_flood_1'),
    factionCard('Control', 'control_pulse_wave_1'),
  );
  state.board[6] = unit({ owner: 'player', id: 'left-target', attack: 2, hp: 1 });
  state.board[7] = unit({ owner: 'player', id: 'mid-target', attack: 2, hp: 1 });
  state.board[8] = unit({ owner: 'player', id: 'right-target', attack: 2, hp: 1 });

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.cardId, 'control_pulse_wave_1');
});

test('AI values Last Stand when multiple friendly units are threatened', () => {
  const state = createInitialBattleState(emptyFaction, emptyFaction, { firstActor: 'enemy' });
  state.enemy.hand.push(factionCard('Tank', 'tank_last_stand_1'));
  state.board[0] = unit({ owner: 'enemy', id: 'enemy-left', attack: 1, hp: 1 });
  state.board[1] = unit({ owner: 'enemy', id: 'enemy-mid', attack: 1, hp: 1 });
  state.board[6] = unit({ owner: 'player', id: 'player-left', attack: 2, hp: 2 });
  state.board[7] = unit({ owner: 'player', id: 'player-mid', attack: 2, hp: 2 });

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.type, 'play-effect');
  assert.equal(action.cardId, 'tank_last_stand_1');
});

test('AI does not play Last Stand when no friendly unit is threatened', () => {
  const state = createInitialBattleState(emptyFaction, emptyFaction, { firstActor: 'enemy' });
  state.enemy.hand.push(factionCard('Tank', 'tank_last_stand_1'));
  state.board[0] = unit({ owner: 'enemy', id: 'safe-left', attack: 1, hp: 3 });
  state.board[6] = unit({ owner: 'player', id: 'small-attacker', attack: 1, hp: 2 });

  const action = chooseBattleAction(state, 'enemy');

  assert.notEqual(action.cardId, 'tank_last_stand_1');
});

test('AI does not play Stability on an empty or irrelevant board', () => {
  const state = createInitialBattleState(emptyFaction, emptyFaction, { firstActor: 'enemy' });
  state.enemy.hand.push(factionCard('Tank', 'tank_stability_1'));
  state.board[6] = unit({ owner: 'player', id: 'player-threat', attack: 1, hp: 1 });

  const action = chooseBattleAction(state, 'enemy');

  assert.notEqual(action.cardId, 'tank_stability_1');
});

test('AI may play Stability when a meaningful board faces a public movement archetype', () => {
  const state = createInitialBattleState(getFactionByKey('Control'), getFactionByKey('Tank'), { firstActor: 'enemy' });
  state.player.hand = [];
  state.enemy.hand = [factionCard('Tank', 'tank_stability_1')];
  state.board[0] = unit({ owner: 'enemy', id: 'important-left', attack: 2, hp: 3 });
  state.board[1] = unit({ owner: 'enemy', id: 'important-mid', attack: 2, hp: 3 });
  state.board[6] = unit({ owner: 'player', id: 'player-left', attack: 1, hp: 2 });

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.type, 'play-effect');
  assert.equal(action.cardId, 'tank_stability_1');
});

test('AI may play Feast as draw-only cycle without targeting a unit', () => {
  const state = createInitialBattleState(emptyFaction, emptyFaction, { firstActor: 'enemy' });
  state.enemy.hand.push(factionCard('Attrition Swarm', 'attrition_swarm_feast_1'));
  state.enemy.deck.push(factionCard('Attrition Swarm', 'attrition_swarm_husk_1'));
  state.board[0] = unit({ owner: 'enemy', id: 'doomed-wall', attack: 0, hp: 1 });
  state.board[6] = unit({ owner: 'player', id: 'attacker', attack: 2, hp: 2 });

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.type, 'play-effect');
  assert.equal(action.cardId, 'attrition_swarm_feast_1');
  assert.equal(action.targetIndex, undefined);
});

test('AI Feast cycle does not remove the only blocker preventing lethal open-lane damage', () => {
  const state = createInitialBattleState(emptyFaction, emptyFaction, { firstActor: 'enemy' });
  state.enemyHP = 2;
  state.enemy.hand.push(factionCard('Attrition Swarm', 'attrition_swarm_feast_1'));
  state.enemy.deck.push(factionCard('Attrition Swarm', 'attrition_swarm_husk_1'));
  state.board[0] = unit({ owner: 'enemy', id: 'only-blocker', attack: 0, hp: 2 });
  state.board[6] = unit({ owner: 'player', id: 'lethal-attacker', attack: 3, hp: 2 });

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.type, 'play-effect');
  assert.equal(action.cardId, 'attrition_swarm_feast_1');
  assert.equal(state.board[0]?.id, 'only-blocker');
});
