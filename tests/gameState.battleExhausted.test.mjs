import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createInitialBattleState,
  isBattleExhaustedEligible,
  playOrRedeployUnit,
  recordPassAction,
} from '../src/systems/GameState.js';

const faction = {
  id: 'test',
  name: 'Test',
  deck: [
    { id: 'unit-a', name: 'Unit A', type: 'unit', attack: 1, hp: 1 },
    { id: 'unit-b', name: 'Unit B', type: 'unit', attack: 1, hp: 1 },
  ],
};

function stateAtHp(playerHP = 3, enemyHP = 2) {
  const state = createInitialBattleState(faction, faction, { firstActor: 'player' });
  state.playerHP = playerHP;
  state.enemyHP = enemyHP;
  state.player.hand.push({ id: 'unit-a', name: 'Unit A', type: 'unit', attack: 1, hp: 1 });
  return state;
}

test('Battle Exhausted is ineligible while both bases are above 3 HP', () => {
  const state = stateAtHp(4, 4);
  assert.equal(isBattleExhaustedEligible(state), false);

  recordPassAction(state, 'player');
  recordPassAction(state, 'enemy');
  recordPassAction(state, 'enemy');
  recordPassAction(state, 'player');

  assert.equal(state.winner, null);
  assert.equal(state.endingReason, null);
  assert.deepEqual(state.battleExhausted, { pendingPassOwner: null, fullPassRounds: 0 });
});

test('Battle Exhausted resolves after two consecutive full pass rounds in player-first order', () => {
  const state = stateAtHp(3, 2);

  recordPassAction(state, 'player');
  recordPassAction(state, 'enemy');
  assert.equal(state.winner, null);
  assert.equal(state.battleExhausted.fullPassRounds, 1);

  recordPassAction(state, 'player');
  recordPassAction(state, 'enemy');

  assert.equal(state.winner, 'player');
  assert.equal(state.endingReason, 'battle_exhausted');
  assert.equal(state.battleExhaustedResolvedBy, 'remaining-hero-hp');
});

test('Battle Exhausted supports enemy-first pass order and can draw on equal HP', () => {
  const state = stateAtHp(3, 3);

  recordPassAction(state, 'enemy');
  recordPassAction(state, 'player');
  recordPassAction(state, 'enemy');
  recordPassAction(state, 'player');

  assert.equal(state.winner, 'draw');
  assert.equal(state.endingReason, 'battle_exhausted');
  assert.equal(state.battleExhaustedResolvedBy, 'equal-hero-hp');
});

test('meaningful gameplay resets the Battle Exhausted pass tracker', () => {
  const state = stateAtHp(3, 2);

  recordPassAction(state, 'player');
  recordPassAction(state, 'enemy');
  assert.equal(state.battleExhausted.fullPassRounds, 1);

  const result = playOrRedeployUnit(state, 'player', 'unit-a', 6);
  assert.equal(result.ok, true);
  assert.deepEqual(state.battleExhausted, { pendingPassOwner: null, fullPassRounds: 0 });

  recordPassAction(state, 'enemy');
  recordPassAction(state, 'player');
  assert.equal(state.winner, null);
  assert.equal(state.battleExhausted.fullPassRounds, 1);
});
