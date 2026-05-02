const ENEMY_ROW_INDEXES = [0, 1, 2];

export function chooseEnemyAction(state) {
  const openSlotIndex = ENEMY_ROW_INDEXES.find((index) => !state?.board?.[index]);

  if (openSlotIndex === undefined) {
    return { type: 'pass' };
  }

  return {
    type: 'play',
    slotIndex: openSlotIndex,
    unit: {
      name: 'Enemy Unit',
      owner: 'enemy',
      kind: 'unit',
      attack: 1,
      hp: 1,
    },
  };
}
