import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialBattleState, performSwap, playOrRedeployUnit } from '../src/systems/GameState.js';
import { chooseBattleAction, recordBattleActionUse } from '../src/systems/enemyDecision.js';

const unitCard = (id, attack, hp = 2) => ({
  id,
  name: id,
  type: 'unit',
  attack,
  hp,
  armor: 0,
  effectId: null,
});

const boardUnit = (owner, id, attack, hp = 2) => ({
  ...unitCard(id, attack, hp),
  owner,
  maxHp: hp,
  cardId: id,
});

test('AI redeploys a hand unit over a weaker blocked lane when pressure improves', () => {
  const state = createInitialBattleState({ name: 'Player', deck: [] }, { name: 'Enemy', deck: [] }, { firstActor: 'enemy' });
  state.enemy.hand.push(unitCard('heavy-replacement', 4, 4));
  state.board[0] = boardUnit('enemy', 'weak-lane', 1, 1);
  state.board[1] = boardUnit('enemy', 'steady-lane', 2, 3);
  state.board[2] = boardUnit('enemy', 'steady-lane-2', 2, 3);
  state.board[6] = boardUnit('player', 'blocker', 2, 2);

  const telemetry = {};
  const action = chooseBattleAction(state, 'enemy', { telemetry });

  assert.equal(action.type, 'play-unit');
  assert.equal(action.placementType, 'redeploy');
  assert.equal(action.aiEvaluation.kind, 'replace');

  const result = playOrRedeployUnit(state, 'enemy', action.cardId, action.slotIndex);
  assert.equal(result.ok, true);
  recordBattleActionUse(state, 'enemy', action, telemetry);
  assert.equal(telemetry.replaceUsed, 1);
  assert.equal(telemetry.meaningfulGameplayActions, 1);
});

test('AI repositions adjacent friendly units to move stronger pressure into an open lane', () => {
  const state = createInitialBattleState({ name: 'Player', deck: [] }, { name: 'Enemy', deck: [] }, { firstActor: 'enemy' });
  state.board[0] = boardUnit('enemy', 'blocked-heavy', 4, 3);
  state.board[1] = boardUnit('enemy', 'open-light', 1, 2);
  state.board[6] = boardUnit('player', 'lane-blocker', 1, 4);

  const telemetry = {};
  const action = chooseBattleAction(state, 'enemy', { telemetry });

  assert.equal(action.type, 'swap-units');
  assert.deepEqual([action.fromIndex, action.toIndex], [0, 1]);
  assert.equal(action.aiEvaluation.kind, 'reposition');
  assert.ok(action.aiEvaluation.openLaneImprovement > 0);

  const result = performSwap(state, 'enemy', action.fromIndex, action.toIndex);
  assert.equal(result.ok, true);
  recordBattleActionUse(state, 'enemy', action, telemetry);
  assert.equal(telemetry.repositionUsed, 1);
  assert.equal(telemetry.openLaneImprovements, 1);
});

test('AI loop memory prevents repeating the same adjacent reposition', () => {
  const state = createInitialBattleState({ name: 'Player', deck: [] }, { name: 'Enemy', deck: [] }, { firstActor: 'enemy' });
  state.board[0] = boardUnit('enemy', 'blocked-heavy', 4, 3);
  state.board[1] = boardUnit('enemy', 'open-light', 1, 2);
  state.board[6] = boardUnit('player', 'lane-blocker', 1, 4);

  const telemetry = {};
  const firstAction = chooseBattleAction(state, 'enemy', { telemetry });
  assert.equal(firstAction.type, 'swap-units');
  recordBattleActionUse(state, 'enemy', firstAction, telemetry);

  const secondAction = chooseBattleAction(state, 'enemy', { telemetry });
  assert.notEqual(secondAction.type, 'swap-units');
  assert.equal(telemetry.repeatedLoopPreventions, 1);
});
