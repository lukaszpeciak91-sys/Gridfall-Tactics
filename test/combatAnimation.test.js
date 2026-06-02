import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COMBAT_ATTACK_PRESENTATIONS,
  getCombatAttackPresentation,
  getLaneSimultaneousUnitClash,
  shouldUseMeleeCombatPresentation,
} from '../src/systems/combatAnimation.js';

function combatEvent({ attackerSide, attackerIndex, targetSide, targetIndex, lane = attackerIndex % 3 }) {
  const event = {
    lane,
    attackerSide,
    targetType: 'unit',
    targetSide,
    damage: 1,
    openLane: false,
    lethal: false,
  };
  Object.defineProperties(event, {
    attackerIndex: { value: attackerIndex, enumerable: false },
    targetIndex: { value: targetIndex, enumerable: false },
  });
  return event;
}

test('combat attack presentation defaults to melee', () => {
  const event = combatEvent({ attackerSide: 'player', attackerIndex: 6, targetSide: 'enemy', targetIndex: 0, lane: 0 });
  const board = [];
  board[6] = { owner: 'player', attack: 1, hp: 1 };

  assert.equal(getCombatAttackPresentation(event, board), COMBAT_ATTACK_PRESENTATIONS.melee);
  assert.equal(shouldUseMeleeCombatPresentation(event, board), true);
});

test('beam presentation is not eligible for melee simultaneous clash lunges', () => {
  const playerBeam = combatEvent({ attackerSide: 'player', attackerIndex: 6, targetSide: 'enemy', targetIndex: 0, lane: 0 });
  const enemyMelee = combatEvent({ attackerSide: 'enemy', attackerIndex: 0, targetSide: 'player', targetIndex: 6, lane: 0 });
  const board = [];
  board[0] = { owner: 'enemy', attack: 1, hp: 1 };
  board[6] = { owner: 'player', attack: 2, hp: 1, attackPresentation: 'beam' };

  assert.equal(getCombatAttackPresentation(playerBeam, board), COMBAT_ATTACK_PRESENTATIONS.beam);
  assert.equal(shouldUseMeleeCombatPresentation(playerBeam, board), false);
  assert.equal(getLaneSimultaneousUnitClash(0, [playerBeam, enemyMelee], board), null);
});
