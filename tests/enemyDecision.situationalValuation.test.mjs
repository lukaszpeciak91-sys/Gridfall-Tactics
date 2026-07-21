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

  assert.equal(action.type, 'play-targeted-effect');
  assert.equal(action.cardId, 'swarm_spawn_1');
  assert.equal(Number.isInteger(action.targetIndex), true);
  assert.deepEqual(action.targetIndexes, [action.targetIndex]);
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

test('AI may hold Stability when movement protection does not beat HOLD by enough', () => {
  const state = createInitialBattleState(emptyFaction, getFactionByKey('Tank'), { firstActor: 'enemy' });
  state.player.hand = [];
  state.enemy.hand = [factionCard('Tank', 'tank_stability_1')];
  state.board[0] = unit({ owner: 'enemy', id: 'minor-left', attack: 1, hp: 3 });
  state.board[1] = unit({ owner: 'enemy', id: 'minor-mid', attack: 1, hp: 3 });
  state.board[6] = unit({ owner: 'player', id: 'player-left', attack: 1, hp: 2 });

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.type, 'pass');
});

test('AI may hold Feast as draw-only cycle without enough immediate value', () => {
  const state = createInitialBattleState(emptyFaction, emptyFaction, { firstActor: 'enemy' });
  state.enemy.hand.push(factionCard('Attrition Swarm', 'attrition_swarm_feast_1'));
  state.enemy.deck = [];
  state.board[0] = unit({ owner: 'enemy', id: 'doomed-wall', attack: 0, hp: 1 });
  state.board[6] = unit({ owner: 'player', id: 'attacker', attack: 2, hp: 2 });

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.type, 'pass');
});

test('AI plays Reinforce when healing threatened allies creates clear defensive value', () => {
  const state = createInitialBattleState(emptyFaction, emptyFaction, { firstActor: 'enemy' });
  state.enemy.hand.push(factionCard('Tank', 'tank_reinforce_1'));
  state.board[0] = unit({ owner: 'enemy', id: 'hurt-left', attack: 2, hp: 1 });
  state.board[0].maxHp = 3;
  state.board[1] = unit({ owner: 'enemy', id: 'hurt-mid', attack: 1, hp: 1 });
  state.board[1].maxHp = 3;
  state.board[6] = unit({ owner: 'player', id: 'player-left', attack: 1, hp: 2 });
  state.board[7] = unit({ owner: 'player', id: 'player-mid', attack: 1, hp: 2 });

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.cardId, 'tank_reinforce_1');
  assert.equal(action.aiEvaluation.utilityCategory, 'defensive');
  assert.equal(action.aiEvaluation.utilityCostApplied, action.aiEvaluation.utilityOpportunityCost);
});

test('AI plays Stability when an important board faces movement tools', () => {
  const state = createInitialBattleState(getFactionByKey('Control'), getFactionByKey('Tank'), { firstActor: 'enemy' });
  state.player.hand = [factionCard('Control', 'control_swap_1')];
  state.enemy.hand = [factionCard('Tank', 'tank_stability_1')];
  state.board[0] = unit({ owner: 'enemy', id: 'open-left', attack: 3, hp: 3 });
  state.board[1] = unit({ owner: 'enemy', id: 'open-mid', attack: 2, hp: 3 });

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.cardId, 'tank_stability_1');
  assert.equal(action.aiEvaluation.utilityCategory, 'stability');
  assert.equal(action.aiEvaluation.utilityReason, 'protects an important board');
});

test('AI plays Lock the Line when it protects an important open-lane board', () => {
  const state = createInitialBattleState(getFactionByKey('Control'), getFactionByKey('Wardens'), { firstActor: 'enemy' });
  state.player.hand = [factionCard('Control', 'control_swap_1')];
  state.enemy.hand = [factionCard('Wardens', 'wardens_reinforce_line_1')];
  state.board[0] = unit({ owner: 'enemy', id: 'warden-left', attack: 2, hp: 3 });
  state.board[1] = unit({ owner: 'enemy', id: 'warden-mid', attack: 2, hp: 3 });

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.cardId, 'wardens_reinforce_line_1');
  assert.equal(action.aiEvaluation.utilityCategory, 'stability');
});

test('AI plays Feast draw-only utility when it creates card advantage without tempo loss', () => {
  const state = createInitialBattleState(emptyFaction, emptyFaction, { firstActor: 'enemy' });
  state.enemy.hand.push(factionCard('Attrition Swarm', 'attrition_swarm_feast_1'));
  state.enemy.deck.push(factionCard('Attrition Swarm', 'attrition_swarm_husk_1'));

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.cardId, 'attrition_swarm_feast_1');
  assert.equal(action.aiEvaluation.utilityCategory, 'draw-only');
  assert.equal(action.aiEvaluation.utilityReason, 'creates card advantage without major tempo loss');
});

test('AI plays Recall when it saves a key unit and replaces the card', () => {
  const state = createInitialBattleState(emptyFaction, emptyFaction, { firstActor: 'enemy' });
  state.enemy.hand.push(factionCard('Control', 'control_recall_1'));
  state.enemy.deck.push(factionCard('Control', 'control_hacker_1'));
  state.board[0] = unit({ owner: 'enemy', id: 'key-unit', attack: 3, hp: 1 });
  state.board[6] = unit({ owner: 'player', id: 'player-threat', attack: 2, hp: 3 });

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.cardId, 'control_recall_1');
  assert.equal(action.aiEvaluation.utilityCategory, 'recall');
  assert.equal(action.aiEvaluation.utilityReason, 'saves a key unit');
});

test('AI does not select Controller as a meaningful swap into active Stability', () => {
  const state = createInitialBattleState(emptyFaction, emptyFaction, { firstActor: 'enemy' });
  state.enemy.hand.push(factionCard('Control', 'control_controller_1'));
  state.immuneMoveDisableThisTurn = { player: true, enemy: false };
  state.board[6] = unit({ owner: 'player', id: 'left-runner', attack: 3, hp: 1, effectId: 'lane_empty_bonus_damage' });
  state.board[7] = unit({ owner: 'player', id: 'mid-guard', attack: 0, hp: 3 });

  const action = chooseBattleAction(state, 'enemy');

  assert.notEqual(action.effectId, 'swap_two_enemy_units');
  assert.equal(action.targetIndexes, undefined);
});

test('AI Controller diagnostics expose useful control utility over HOLD', () => {
  const state = createInitialBattleState(emptyFaction, emptyFaction, { firstActor: 'enemy' });
  state.enemy.hand.push(factionCard('Control', 'control_controller_1'));
  state.board[6] = unit({ owner: 'player', id: 'left-runner', attack: 3, hp: 1, effectId: 'lane_empty_bonus_damage' });
  state.board[7] = unit({ owner: 'player', id: 'mid-guard', attack: 0, hp: 3 });

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.cardId, 'control_controller_1');
  assert.equal(action.aiEvaluation.utilityCategory, 'control');
  assert.ok(action.aiEvaluation.marginOverHold > 0);
});

test('AI Feast draw cycle does not remove the only blocker preventing lethal open-lane damage', () => {
  const state = createInitialBattleState(emptyFaction, emptyFaction, { firstActor: 'enemy' });
  state.enemyHP = 2;
  state.enemy.hand.push(factionCard('Attrition Swarm', 'attrition_swarm_feast_1'));
  state.enemy.deck.push(factionCard('Attrition Swarm', 'attrition_swarm_husk_1'));
  state.board[0] = unit({ owner: 'enemy', id: 'only-blocker', attack: 0, hp: 2 });
  state.board[6] = unit({ owner: 'player', id: 'lethal-attacker', attack: 3, hp: 2 });

  const action = chooseBattleAction(state, 'enemy');

  assert.equal(action.cardId, 'attrition_swarm_feast_1');
  assert.equal(state.board[0]?.id, 'only-blocker');
});
