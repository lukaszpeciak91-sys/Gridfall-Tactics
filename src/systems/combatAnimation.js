import { getUnitAttack } from './GameState.js';

export const COMBAT_ATTACK_PRESENTATIONS = Object.freeze({
  melee: 'melee',
  beam: 'beam',
});

export function normalizeCombatAttackPresentation(presentation) {
  return presentation === COMBAT_ATTACK_PRESENTATIONS.beam
    ? COMBAT_ATTACK_PRESENTATIONS.beam
    : COMBAT_ATTACK_PRESENTATIONS.melee;
}

export function getCombatEventAttackerIndex(event) {
  return Number.isInteger(event?.attackerIndex) ? event.attackerIndex : null;
}

export function getCombatEventAttackerSnapshot(event, preCombatBoardSnapshot) {
  const attackerIndex = getCombatEventAttackerIndex(event);
  if (!Number.isInteger(attackerIndex)) return null;
  if (!Array.isArray(preCombatBoardSnapshot)) return null;

  const attacker = preCombatBoardSnapshot[attackerIndex];
  if (!attacker) return null;
  if (attacker.owner !== event.attackerSide) return null;

  return attacker;
}

export function getCombatAttackPresentation(event, preCombatBoardSnapshot) {
  return normalizeCombatAttackPresentation(
    getCombatEventAttackerSnapshot(event, preCombatBoardSnapshot)?.attackPresentation,
  );
}

export function shouldAnimateCombatAttacker(event, preCombatBoardSnapshot) {
  if (event?.targetType !== 'unit' && event?.targetType !== 'hero') return false;

  const attackerIndex = getCombatEventAttackerIndex(event);
  if (!Number.isInteger(attackerIndex)) return false;

  const attacker = getCombatEventAttackerSnapshot(event, preCombatBoardSnapshot);
  if (!attacker) return false;

  const expectedLane = attackerIndex % 3;
  if (Number.isInteger(event.lane) && event.lane !== expectedLane) return false;

  return getUnitAttack(attacker) > 0;
}

export function shouldUseMeleeCombatPresentation(event, preCombatBoardSnapshot) {
  return shouldAnimateCombatAttacker(event, preCombatBoardSnapshot)
    && getCombatAttackPresentation(event, preCombatBoardSnapshot) === COMBAT_ATTACK_PRESENTATIONS.melee;
}

export function getCombatEventInterceptOriginalTargetIndex(event) {
  return Number.isInteger(event?.interceptOriginalTargetIndex) ? event.interceptOriginalTargetIndex : null;
}

export function getCombatEventTargetIndex(event) {
  if (Number.isInteger(event?.targetIndex)) return event.targetIndex;
  if (!Number.isInteger(event?.lane)) return null;
  if (event.targetSide === 'player') return 6 + event.lane;
  if (event.targetSide === 'enemy') return event.lane;
  return null;
}

export function getLaneLethalTargetIndexes(events) {
  const lethalTargetIndexes = new Set();
  if (!Array.isArray(events)) return lethalTargetIndexes;

  events.forEach((event) => {
    if (!event?.lethal || event.targetType !== 'unit') return;
    const targetIndex = getCombatEventTargetIndex(event);
    if (Number.isInteger(targetIndex)) lethalTargetIndexes.add(targetIndex);
  });

  return lethalTargetIndexes;
}

export function getLaneSimultaneousUnitClash(lane, laneEvents, preCombatBoardSnapshot) {
  if (!Number.isInteger(lane) || !Array.isArray(laneEvents)) return null;

  const enemyIndex = lane;
  const playerIndex = 6 + lane;
  const validUnitAttacks = laneEvents
    .map((event) => ({
      event,
      attackerIndex: getCombatEventAttackerIndex(event),
      targetIndex: getCombatEventTargetIndex(event),
    }))
    .filter(({ event, attackerIndex, targetIndex }) => (
      event?.targetType === 'unit'
      && shouldUseMeleeCombatPresentation(event, preCombatBoardSnapshot)
      && Number.isInteger(attackerIndex)
      && Number.isInteger(targetIndex)
    ));

  const playerAttack = validUnitAttacks.find(({ event, attackerIndex, targetIndex }) => (
    event.attackerSide === 'player'
    && attackerIndex === playerIndex
    && targetIndex === enemyIndex
  ));
  const enemyAttack = validUnitAttacks.find(({ event, attackerIndex, targetIndex }) => (
    event.attackerSide === 'enemy'
    && attackerIndex === enemyIndex
    && targetIndex === playerIndex
  ));

  if (!playerAttack || !enemyAttack) return null;

  return {
    lane,
    events: [playerAttack.event, enemyAttack.event],
    attackers: [
      { side: 'player', index: playerAttack.attackerIndex, event: playerAttack.event },
      { side: 'enemy', index: enemyAttack.attackerIndex, event: enemyAttack.event },
    ],
    lethalTargetIndexes: getLaneLethalTargetIndexes([playerAttack.event, enemyAttack.event]),
  };
}
