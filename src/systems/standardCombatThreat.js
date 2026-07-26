import { buildStandardCombatAttackPlan } from './GameState.js';

/**
 * Describe the frozen next standard-combat attack plan without resolving combat.
 *
 * This intentionally stops before death triggers, summons, hero side effects, and
 * post-combat cleanup.  Sources keep their attack entitlement even when the
 * aggregate predicts that they die in the same combat, just as the runtime's
 * frozen plan does.
 */
export function summarizeStandardCombatThreat(state) {
  const attackPlan = buildStandardCombatAttackPlan(state);
  const damageByUnitIndex = {};
  const baseDamageByOwner = { player: 0, enemy: 0 };

  attackPlan.plans.forEach((attack) => {
    if (attack.targetType === 'unit' && Number.isInteger(attack.targetIndex)) {
      damageByUnitIndex[attack.targetIndex] = (damageByUnitIndex[attack.targetIndex] ?? 0) + attack.damage;
    } else if (attack.targetType === 'hero' && attack.targetOwner) {
      baseDamageByOwner[attack.targetOwner] = (baseDamageByOwner[attack.targetOwner] ?? 0) + attack.damage;
    }
  });

  const damagedUnitIndexes = Object.keys(damageByUnitIndex).map(Number).sort((a, b) => a - b);
  const predictedDeadUnitIndexes = damagedUnitIndexes.filter((index) => {
    const unit = state.board?.[index];
    if (!unit || unit.hp <= 0 || state.cannotDropBelowOneThisTurn?.[unit.owner]) return false;
    return damageByUnitIndex[index] >= unit.hp;
  });
  const attacks = attackPlan.plans.map((attack) => ({
    ...attack,
    snapshottedAttack: attack.attack,
    mitigatedDamage: attack.damage,
    attackEntitled: true,
    overkill: attack.targetType === 'unit'
      ? Math.max(0, (damageByUnitIndex[attack.targetIndex] ?? 0) - (state.board?.[attack.targetIndex]?.hp ?? 0))
      : 0,
  }));
  return {
    kind: 'next-standard-attack-plan-outcome',
    windowId: attackPlan.windowId,
    plannedAttacks: attacks,
    damageByUnitIndex,
    baseDamageByOwner,
    damagedUnitIndexes,
    threatenedUnitIndexes: [...predictedDeadUnitIndexes],
    predictedDeadUnitIndexes,
  };
}
