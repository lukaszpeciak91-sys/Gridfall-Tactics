import { canPlayOrRedeploy } from './GameState.js';
const ENEMY_ROW_INDEXES = [0, 1, 2];
const PLAYER_ROW_INDEXES = [6, 7, 8];

const SIMPLE_EFFECT_IDS = new Set([
  'damage_all_enemies_1',
  'enemy_all_atk_minus_1',
  'buff_all_atk_1',
  'cancel_enemy_order',
  'immune_move_disable_this_turn',
  'peek_enemy_slot',
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

function findBestLaneForOwner(state, owner, unitCardId) {
  const rowIndexes = owner === 'enemy' ? ENEMY_ROW_INDEXES : PLAYER_ROW_INDEXES;
  let bestLaneIndex = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  rowIndexes.forEach((slotIndex) => {
    const score = getLaneScoreForOwner(state, owner, slotIndex, unitCardId);
    if (score > bestScore) {
      bestScore = score;
      bestLaneIndex = slotIndex;
    }
  });

  return bestLaneIndex;
}

function getLaneScoreForOwner(state, owner, slotIndex, unitCardId) {
  const isEnemyOwner = owner === 'enemy';
  const friendlyRows = isEnemyOwner ? ENEMY_ROW_INDEXES : PLAYER_ROW_INDEXES;
  const opposingRows = isEnemyOwner ? PLAYER_ROW_INDEXES : ENEMY_ROW_INDEXES;
  const lane = friendlyRows.indexOf(slotIndex);
  if (lane < 0) return Number.NEGATIVE_INFINITY;

  const opposingIndex = opposingRows[lane];
  const opposingUnit = state?.board?.[opposingIndex] ?? null;

  const canPlayHere = canPlayOrRedeploy(state, owner, unitCardId, slotIndex);
  if (!canPlayHere.ok || canPlayHere.type !== 'play') return Number.NEGATIVE_INFINITY;
  if (!opposingUnit) return 2;

  const opposingAttack = opposingUnit.attack ?? 0;
  const opposingHp = opposingUnit.hp ?? 0;
  if (opposingAttack <= 1 || opposingHp <= 1) return 1;

  return 0;
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
  return chooseBattleAction(state, 'enemy');
}

export function chooseBattleAction(state, owner = 'enemy') {
  const side = owner === 'enemy' ? state?.enemy : state?.player;
  const hand = Array.isArray(side?.hand) ? side.hand : [];

  const firstUnitCard = hand.find((card) => card?.type === 'unit');
  if (firstUnitCard) {
    const bestLaneIndex = findBestLaneForOwner(state, owner, firstUnitCard.id);
    if (bestLaneIndex !== null) {
      return { type: 'play-unit', slotIndex: bestLaneIndex, cardId: firstUnitCard.id };
    }
  }

  const simpleEffectCard = hand.find((card) => card?.type !== 'unit' && SIMPLE_EFFECT_IDS.has(card?.effectId));
  if (simpleEffectCard) return { type: 'play-effect', cardId: simpleEffectCard.id };

  const targetedCard = hand.find((card) => card?.type !== 'unit' && TARGETED_EFFECT_IDS.has(card?.effectId));
  if (targetedCard) {
    const targetIndex = getFirstValidTargetIndex(state, owner, targetedCard.effectId);
    if (targetIndex >= 0) return { type: 'play-targeted-effect', cardId: targetedCard.id, targetIndex };
  }

  return { type: 'pass' };
}
