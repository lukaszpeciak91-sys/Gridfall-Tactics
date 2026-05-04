const ENEMY_ROW_INDEXES = [0, 1, 2];
const PLAYER_ROW_INDEXES = [6, 7, 8];

const SIMPLE_EFFECT_IDS = new Set([
  'damage_all_enemies_1',
  'enemy_all_atk_minus_1',
  'buff_all_atk_1',
]);

const TARGETED_EFFECT_IDS = new Set([
  'enemy_lane_atk_minus_1',
  'ignore_armor_next_attack',
  'swap_two_enemy_units',
  'return_friendly_draw_1',
  'destroy_friendly_draw_2',
  'control_enemy_unit_this_turn',
  'heal_2',
  'heal_3',
]);

function getLaneScore(state, enemyIndex) {
  const lane = ENEMY_ROW_INDEXES.indexOf(enemyIndex);
  if (lane < 0) return Number.NEGATIVE_INFINITY;

  const playerIndex = PLAYER_ROW_INDEXES[lane];
  const enemyUnit = state?.board?.[enemyIndex] ?? null;
  const playerUnit = state?.board?.[playerIndex] ?? null;

  if (enemyUnit) return Number.NEGATIVE_INFINITY;
  if (!playerUnit) return 2;

  const playerAttack = playerUnit.attack ?? 0;
  const playerHp = playerUnit.hp ?? 0;
  if (playerAttack <= 1 || playerHp <= 1) {
    return 1;
  }

  return 0;
}

function findBestLaneForUnit(state) {
  let bestLaneIndex = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  ENEMY_ROW_INDEXES.forEach((enemyIndex) => {
    const score = getLaneScore(state, enemyIndex);
    if (score > bestScore) {
      bestScore = score;
      bestLaneIndex = enemyIndex;
    }
  });

  return bestLaneIndex;
}

function getFirstValidTargetIndex(state, owner, effectId) {
  const board = Array.isArray(state?.board) ? state.board : [];
  const isEnemyOwner = owner === 'enemy';
  const friendlyOwner = isEnemyOwner ? 'enemy' : 'player';
  const opponentOwner = isEnemyOwner ? 'player' : 'enemy';

  if (effectId === 'return_friendly_draw_1' || effectId === 'destroy_friendly_draw_2' || effectId === 'heal_2' || effectId === 'heal_3') {
    return board.findIndex((unit) => unit?.owner === friendlyOwner);
  }

  return board.findIndex((unit) => unit?.owner === opponentOwner);
}

export function chooseEnemyAction(state) {
  const enemyHand = Array.isArray(state?.enemy?.hand) ? state.enemy.hand : [];

  const firstUnitCard = enemyHand.find((card) => card?.type === 'unit');
  if (firstUnitCard) {
    const bestLaneIndex = findBestLaneForUnit(state);
    if (bestLaneIndex !== null && state?.board?.[bestLaneIndex] == null) {
      return { type: 'play-unit', slotIndex: bestLaneIndex, cardId: firstUnitCard.id };
    }
  }

  const simpleEffectCard = enemyHand.find((card) => card?.type !== 'unit' && SIMPLE_EFFECT_IDS.has(card?.effectId));
  if (simpleEffectCard) {
    return { type: 'play-effect', cardId: simpleEffectCard.id };
  }

  const targetedCard = enemyHand.find((card) => card?.type !== 'unit' && TARGETED_EFFECT_IDS.has(card?.effectId));
  if (targetedCard) {
    const targetIndex = getFirstValidTargetIndex(state, 'enemy', targetedCard.effectId);
    if (targetIndex >= 0) {
      return { type: 'play-targeted-effect', cardId: targetedCard.id, targetIndex };
    }
  }

  return { type: 'pass' };
}
