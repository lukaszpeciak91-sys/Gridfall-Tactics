import { canPlayOrRedeploy, playEffectCard, resolveTargetedEffectCard, getUnitAttack } from './GameState.js';

const ENEMY_ROW_INDEXES = [0, 1, 2];
const PLAYER_ROW_INDEXES = [6, 7, 8];

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function getRowsForOwner(owner) {
  return owner === 'enemy'
    ? { friendly: ENEMY_ROW_INDEXES, opposing: PLAYER_ROW_INDEXES }
    : { friendly: PLAYER_ROW_INDEXES, opposing: ENEMY_ROW_INDEXES };
}

function getHeroHpKey(owner) {
  return owner === 'enemy' ? 'enemyHP' : 'playerHP';
}

function getOpponentHpKey(owner) {
  return owner === 'enemy' ? 'playerHP' : 'enemyHP';
}

function getGuaranteedHeroDamage(state, owner) {
  const { friendly, opposing } = getRowsForOwner(owner);
  let total = 0;
  friendly.forEach((friendlyIndex, lane) => {
    const attacker = state?.board?.[friendlyIndex];
    const blocker = state?.board?.[opposing[lane]];
    if (!attacker || blocker) return;
    const laneBonus = attacker.effectId === 'lane_empty_bonus_damage' ? 1 : 0;
    total += getUnitAttack(attacker) + laneBonus;
  });
  return total;
}

function getCandidateTargetIndexes(state, owner, effectId) {
  const board = Array.isArray(state?.board) ? state.board : [];
  const friendlyOwner = owner;
  const opponentOwner = owner === 'enemy' ? 'player' : 'enemy';

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

function buildActionCandidates(state, owner, hand) {
  const actions = [];

  hand.forEach((card) => {
    if (!card) return;
    if (card.type === 'unit') {
      const { friendly } = getRowsForOwner(owner);
      friendly.forEach((slotIndex) => {
        const canPlay = canPlayOrRedeploy(state, owner, card.id, slotIndex);
        if (canPlay.ok && canPlay.type === 'play') {
          actions.push({ type: 'play-unit', cardId: card.id, slotIndex });
        }
      });
      return;
    }

    const simpleProbe = playEffectCard(cloneState(state), owner, card.id);
    if (simpleProbe.ok && simpleProbe.type !== 'effect-blocked') {
      actions.push({ type: 'play-effect', cardId: card.id, effectId: card.effectId ?? null });
    }

    const targets = getCandidateTargetIndexes(state, owner, card.effectId ?? null);
    targets.forEach((targetIndex) => {
      const targetedProbe = resolveTargetedEffectCard(cloneState(state), owner, card.id, targetIndex, [targetIndex]);
      if (targetedProbe.ok && targetedProbe.type !== 'targeted-effect-pending' && targetedProbe.type !== 'targeted-effect-blocked') {
        actions.push({ type: 'play-targeted-effect', cardId: card.id, targetIndex, effectId: card.effectId ?? null });
      }
    });
  });

  return actions;
}

function scoreAction(state, owner, action) {
  const nextState = cloneState(state);
  const currentOpponentHp = state?.[getOpponentHpKey(owner)] ?? 0;
  const currentOwnHp = state?.[getHeroHpKey(owner)] ?? 0;
  const currentHeroPressure = getGuaranteedHeroDamage(state, owner);

  if (action.type === 'play-unit') {
    const canPlay = canPlayOrRedeploy(nextState, owner, action.cardId, action.slotIndex);
    if (!canPlay.ok) return Number.NEGATIVE_INFINITY;
    const side = owner === 'enemy' ? nextState.enemy : nextState.player;
    const handIndex = side.hand.findIndex((card) => card?.id === action.cardId);
    if (handIndex < 0) return Number.NEGATIVE_INFINITY;
    const [card] = side.hand.splice(handIndex, 1);
    nextState.board[action.slotIndex] = {
      ...card,
      owner,
      maxHp: card.hp,
      cardId: card.id,
    };
  } else if (action.type === 'play-effect') {
    const result = playEffectCard(nextState, owner, action.cardId);
    if (!result.ok || result.type === 'effect-blocked') return Number.NEGATIVE_INFINITY;
  } else if (action.type === 'play-targeted-effect') {
    const result = resolveTargetedEffectCard(nextState, owner, action.cardId, action.targetIndex, [action.targetIndex]);
    if (!result.ok || result.type === 'targeted-effect-pending' || result.type === 'targeted-effect-blocked') {
      return Number.NEGATIVE_INFINITY;
    }
  }

  const nextOpponentHp = nextState?.[getOpponentHpKey(owner)] ?? 0;
  const nextOwnHp = nextState?.[getHeroHpKey(owner)] ?? 0;
  const immediateHeroDamage = Math.max(0, currentOpponentHp - nextOpponentHp);
  const heroPressureGain = Math.max(0, getGuaranteedHeroDamage(nextState, owner) - currentHeroPressure);

  let score = 0;

  if (nextOpponentHp <= 0) score += 100000;
  if (immediateHeroDamage > 0) score += 30000 + immediateHeroDamage * 300;
  if (heroPressureGain > 0) score += 800 + heroPressureGain * 80;

  const hpSaved = Math.max(0, nextOwnHp - currentOwnHp);
  if (hpSaved > 0) score += 700 + hpSaved * 120;

  if (action.type === 'play-unit') {
    const { friendly, opposing } = getRowsForOwner(owner);
    const lane = friendly.indexOf(action.slotIndex);
    if (lane >= 0) {
      const opposingIndex = opposing[lane];
      const enemyUnit = state.board[opposingIndex];
      if (!enemyUnit) {
        score += 1200;
      } else {
        const incomingDamage = getUnitAttack(enemyUnit);
        if (incomingDamage > 0) score += 1000 + incomingDamage * 120;
      }
    }
    score += 150;
  }

  const enemyBoardBefore = state.board.filter((unit) => unit && unit.owner !== owner).length;
  const enemyBoardAfter = nextState.board.filter((unit) => unit && unit.owner !== owner).length;
  const kills = Math.max(0, enemyBoardBefore - enemyBoardAfter);
  if (kills > 0) score += 1400 + kills * 350;

  if (action.effectId === 'quick_strike') {
    score += immediateHeroDamage > 0 || kills > 0 ? 2000 : -2500;
  }

  if ((action.effectId === 'heal_2' || action.effectId === 'heal_3') && hpSaved <= 0) {
    score -= 2000;
  }

  if (action.effectId === 'buff_all_atk_1' || action.effectId === 'buff_all_armor_1') {
    const friendlyUnits = nextState.board.filter((unit) => unit && unit.owner === owner).length;
    if (friendlyUnits <= 1) score -= 1200;
    else score += friendlyUnits * 120;
  }

  if (action.type !== 'pass') score += 20;
  return score;
}

export function chooseEnemyAction(state) {
  return chooseBattleAction(state, 'enemy');
}

export function chooseBattleAction(state, owner = 'enemy') {
  const side = owner === 'enemy' ? state?.enemy : state?.player;
  const hand = Array.isArray(side?.hand) ? side.hand : [];
  const actions = buildActionCandidates(state, owner, hand);

  if (actions.length === 0) return { type: 'pass' };

  let bestAction = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  actions.forEach((action) => {
    const score = scoreAction(state, owner, action);
    if (score > bestScore) {
      bestScore = score;
      bestAction = action;
    }
  });

  return bestAction ?? { type: 'pass' };
}
