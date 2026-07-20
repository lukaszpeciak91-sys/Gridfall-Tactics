export function getMaterialBattleStateSignature(state) {
  if (!state) return null;
  return JSON.stringify({
    playerHP: state.playerHP,
    enemyHP: state.enemyHP,
    board: state.board?.map((unit) => unit ? {
      owner: unit.owner,
      id: unit.cardId ?? unit.id,
      attack: unit.attack,
      hp: unit.hp,
      maxHp: unit.maxHp,
      armor: unit.armor,
      tempAttackMod: unit.tempAttackMod ?? 0,
      tempAttackSetToZeroUntilCombat: unit.tempAttackSetToZeroUntilCombat ?? false,
      tempAttackMaxUntilCombat: unit.tempAttackMaxUntilCombat ?? null,
      tempArmorMod: unit.tempArmorMod ?? 0,
      tempHpMod: unit.tempHpMod ?? 0,
      ignoreArmorNext: unit.ignoreArmorNext ?? false,
      quickFixDrawTriggers: unit.quickFixDrawTriggers?.map((trigger) => ({
        owner: trigger?.owner ?? null,
        triggered: trigger?.triggered ?? false,
      })) ?? [],
    } : null),
    cannotDropBelowOneThisTurn: state.cannotDropBelowOneThisTurn ?? null,
    effectCardsBlockedUntilCombat: state.effectCardsBlockedUntilCombat ?? null,
    immuneMoveDisableThisTurn: state.immuneMoveDisableThisTurn ?? null,
    immovableThisTurn: state.immovableThisTurn ?? null,
    enemyLanePlayBlockedThisTurn: state.enemyLanePlayBlockedThisTurn ?? null,
    playerLanePlayBlockedThisTurn: state.playerLanePlayBlockedThisTurn ?? null,
    funeralPyreThisCombat: state.funeralPyreThisCombat ?? null,
  });
}
