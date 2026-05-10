import { getUnitAttack } from './GameState.js';

export function getCombatEventAttackerIndex(event) {
  return Number.isInteger(event?.attackerIndex) ? event.attackerIndex : null;
}

export function shouldAnimateCombatAttacker(event, preCombatBoardSnapshot) {
  if (event?.targetType !== 'unit' && event?.targetType !== 'hero') return false;

  const attackerIndex = getCombatEventAttackerIndex(event);
  if (!Number.isInteger(attackerIndex)) return false;
  if (!Array.isArray(preCombatBoardSnapshot)) return false;

  const attacker = preCombatBoardSnapshot[attackerIndex];
  if (!attacker) return false;
  if (attacker.owner !== event.attackerSide) return false;

  const expectedLane = attackerIndex % 3;
  if (Number.isInteger(event.lane) && event.lane !== expectedLane) return false;

  return getUnitAttack(attacker) > 0;
}
