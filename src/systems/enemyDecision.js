const ENEMY_ROW_INDEXES = [0, 1, 2];

export function chooseEnemyAction(state) {
  const openSlotIndex = ENEMY_ROW_INDEXES.find((index) => !state?.board?.[index]);

  if (openSlotIndex === undefined) {
    return { type: 'pass' };
  }

  const enemyHand = Array.isArray(state?.enemy?.hand) ? state.enemy.hand : [];
  const firstUnitCard = enemyHand.find((card) => card?.type === 'unit');
  if (!firstUnitCard) {
    return { type: 'pass' };
  }

  return { type: 'play', slotIndex: openSlotIndex, cardId: firstUnitCard.id };
}
