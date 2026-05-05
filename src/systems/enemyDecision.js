import { canPlayOrRedeploy, playEffectCard, resolveTargetedEffectCard } from './GameState.js';
const ENEMY_ROW_INDEXES = [0, 1, 2];
const PLAYER_ROW_INDEXES = [6, 7, 8];

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

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function getCandidateTargetIndexes(state, owner, effectId) {
  const board = Array.isArray(state?.board) ? state.board : [];
  const isEnemyOwner = owner === 'enemy';
  const friendlyOwner = isEnemyOwner ? 'enemy' : 'player';
  const opponentOwner = isEnemyOwner ? 'player' : 'enemy';

  switch (effectId) {
    case 'return_friendly_draw_1':
    case 'destroy_friendly_draw_2':
    case 'heal_2':
    case 'heal_3':
    case 'quick_strike':
    case 'swap_adjacent_then_resolve':
      return board.map((unit, index) => (unit?.owner === friendlyOwner ? index : -1)).filter((index) => index >= 0);
    case 'control_enemy_unit_this_turn':
    case 'ignore_armor_next_attack':
    case 'enemy_lane_atk_minus_1':
    case 'swap_two_enemy_units':
      return board.map((unit, index) => (unit?.owner === opponentOwner ? index : -1)).filter((index) => index >= 0);
    case 'swap_any_two_units':
      return board.map((unit, index) => (unit ? index : -1)).filter((index) => index >= 0);
    default:
      return board.map((_, index) => index);
  }
}

function choosePlayableEffectAction(state, owner, hand) {
  const nonUnitCards = hand.filter((card) => card?.type !== 'unit');

  for (const card of nonUnitCards) {
    const effectId = card?.effectId ?? null;
    if (!effectId) continue;

    const simpleProbe = playEffectCard(cloneState(state), owner, card.id);
    if (simpleProbe.ok && simpleProbe.type !== 'effect-blocked') {
      return { type: 'play-effect', cardId: card.id };
    }

    const candidateTargets = getCandidateTargetIndexes(state, owner, effectId);
    for (const targetIndex of candidateTargets) {
      const targetedProbe = resolveTargetedEffectCard(cloneState(state), owner, card.id, targetIndex, [targetIndex]);
      if (targetedProbe.ok && targetedProbe.type !== 'targeted-effect-pending' && targetedProbe.type !== 'targeted-effect-blocked') {
        return { type: 'play-targeted-effect', cardId: card.id, targetIndex };
      }
    }
  }

  return null;
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

  const effectAction = choosePlayableEffectAction(state, owner, hand);
  if (effectAction) return effectAction;

  return { type: 'pass' };
}
