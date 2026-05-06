import { canPlayOrRedeploy, canSwap, performSwap, playEffectCard, playOrRedeployUnit, resolveTargetedEffectCard, getUnitAttack } from './GameState.js';

const ENEMY_ROW_INDEXES = [0, 1, 2];
const PLAYER_ROW_INDEXES = [6, 7, 8];


const LOW_TEMPO_EFFECTS = new Set([
  'heal_2',
  'heal_3',
  'heal_all_1',
  'cannot_drop_below_1_this_turn',
  'immune_move_disable_this_turn',
  'return_friendly_draw_1',
  'destroy_friendly_draw_2',
  'revive_friendly_1hp',
]);

const BOARD_SYNERGY_EFFECTS = new Set([
  'aggro_buff_all_atk_2',
  'buff_all_atk_1',
  'buff_all_armor_1',
  'quick_strike',
  'swap_adjacent_then_resolve',
  'heal_1_atk_1_draw_on_kill_this_turn',
]);

function scoreOpeningCard(card, hand, factionName = '') {
  if (!card) return Number.NEGATIVE_INFINITY;
  const unitsInHand = hand.filter((item) => item?.type === 'unit').length;
  const nonUnitCount = hand.length - unitsInHand;
  const faction = String(factionName ?? '').toLowerCase();

  if (card.type === 'unit') {
    const attack = Number.isFinite(card.attack) ? card.attack : 0;
    const hp = Number.isFinite(card.hp) ? card.hp : 0;
    const armor = Number.isFinite(card.armor) ? card.armor : 0;
    let score = 60 + attack * 18 + hp * 9 + armor * 10;
    if (attack <= 0 || card.effectId === 'cannot_attack') score -= 42;
    if (attack >= 2) score += 16;
    if (card.effectId === 'lane_empty_bonus_damage') score += 22;
    if (card.effectId === 'empty_adjacent_bonus_atk') score += 14;
    if (card.effectId === 'on_play_lane_damage_1') score += 12;
    if (card.effectId === 'adjacent_allies_atk_plus_1') score += unitsInHand >= 2 ? 18 : -4;
    if (faction === 'aggro') score += attack >= 2 ? 14 : -8;
    if (faction === 'control' && attack <= 1 && hp <= 1) score -= 10;
    return score;
  }

  let score = 26;
  if (unitsInHand === 0) score -= 90;
  else if (unitsInHand === 1) score -= 48;
  else if (nonUnitCount >= 3) score -= 30;

  if (LOW_TEMPO_EFFECTS.has(card.effectId)) score -= 36;
  if (BOARD_SYNERGY_EFFECTS.has(card.effectId)) score += unitsInHand >= 2 ? 18 : -28;
  if (card.effectId === 'damage_all_enemies_1' || card.effectId === 'enemy_all_atk_minus_1') score -= 12;
  if (card.effectId === 'summon_grunt_empty_slot' || card.effectId === 'fill_empty_slots_0_1') score += 22;
  if (card.effectId === 'ignore_armor_next_attack' || card.effectId === 'control_enemy_unit_this_turn') score -= 16;
  if (faction === 'aggro' && card.effectId === 'aggro_buff_all_atk_2') score += unitsInHand >= 2 ? 18 : -24;
  return score;
}

export function selectOpeningMulliganCardIds(sideState, options = {}) {
  const hand = Array.isArray(sideState?.hand) ? sideState.hand : [];
  const factionName = options.factionName ?? sideState?.factionName ?? '';
  const unitCount = hand.filter((card) => card?.type === 'unit').length;
  const replaceThreshold = unitCount <= 1 ? 70 : 44;

  return hand
    .map((card, index) => ({
      card,
      index,
      score: scoreOpeningCard(card, hand, factionName),
    }))
    .filter(({ score }) => score <= replaceThreshold)
    .sort((a, b) => (a.score - b.score) || (a.index - b.index))
    .slice(0, 2)
    .map(({ card }) => card.id);
}

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


function getUnitId(unit) {
  return unit?.cardId ?? unit?.id ?? unit?.name ?? 'unit';
}

function getEffectiveHp(unit) {
  if (!unit) return 0;
  return (Number.isFinite(unit.hp) ? unit.hp : 0) + (Number.isFinite(unit.armor) ? unit.armor : 0);
}

function getOpenLaneStats(state, owner) {
  const { friendly, opposing } = getRowsForOwner(owner);
  let lanes = 0;
  let damage = 0;
  friendly.forEach((friendlyIndex, lane) => {
    const unit = state?.board?.[friendlyIndex];
    if (!unit || state?.board?.[opposing[lane]]) return;
    lanes += 1;
    damage += getUnitAttack(unit) + (unit.effectId === 'lane_empty_bonus_damage' ? 1 : 0);
  });
  return { lanes, damage };
}

function getBoardPressureValue(state, owner) {
  const { friendly, opposing } = getRowsForOwner(owner);
  let value = getGuaranteedHeroDamage(state, owner) * 250;
  friendly.forEach((friendlyIndex, lane) => {
    const friendlyUnit = state?.board?.[friendlyIndex];
    const enemyUnit = state?.board?.[opposing[lane]];
    if (friendlyUnit && !enemyUnit) {
      value += getUnitAttack(friendlyUnit) * 110 + getEffectiveHp(friendlyUnit) * 12;
      if (friendlyUnit.effectId === 'lane_empty_bonus_damage') value += 80;
      return;
    }
    if (!friendlyUnit && enemyUnit) {
      value -= getUnitAttack(enemyUnit) * 130 + getEffectiveHp(enemyUnit) * 8;
      return;
    }
    if (friendlyUnit && enemyUnit) {
      const friendlyAttack = getUnitAttack(friendlyUnit);
      const enemyAttack = getUnitAttack(enemyUnit);
      const friendlyCanKill = friendlyAttack >= getEffectiveHp(enemyUnit);
      const enemyCanKill = enemyAttack >= getEffectiveHp(friendlyUnit);
      if (friendlyCanKill) value += 220;
      if (enemyCanKill) value -= 160;
      value += (friendlyAttack - enemyAttack) * 35;
      value += (getEffectiveHp(friendlyUnit) - getEffectiveHp(enemyUnit)) * 8;
    }
  });
  return value;
}

function getActionLoopKey(state, owner, action) {
  if (action?.aiEvaluation?.loopKey) return action.aiEvaluation.loopKey;
  if (action?.type === 'swap-units') {
    const first = Math.min(action.fromIndex, action.toIndex);
    const second = Math.max(action.fromIndex, action.toIndex);
    const firstId = getUnitId(state?.board?.[first]);
    const secondId = getUnitId(state?.board?.[second]);
    return `reposition:${owner}:${first}:${second}:${[firstId, secondId].sort().join('|')}`;
  }
  if (action?.placementType === 'redeploy') {
    const displaced = getUnitId(state?.board?.[action.slotIndex]);
    return `replace:${owner}:${action.slotIndex}:${action.cardId}:${displaced}`;
  }
  return null;
}

function wasRecentlyLooped(state, owner, action) {
  const key = getActionLoopKey(state, owner, action);
  if (!key) return false;
  const recent = state?.aiDecisionMemory?.[owner]?.recentLoopKeys;
  return Array.isArray(recent) && recent.includes(key);
}

export function recordBattleActionUse(state, owner, action, telemetry = null) {
  if (!state || !action) return;
  const key = getActionLoopKey(state, owner, action);
  if (key) {
    state.aiDecisionMemory ??= {};
    state.aiDecisionMemory[owner] ??= { recentLoopKeys: [] };
    const recent = state.aiDecisionMemory[owner].recentLoopKeys;
    recent.unshift(key);
    state.aiDecisionMemory[owner].recentLoopKeys = recent.slice(0, 6);
  }

  if (!telemetry || !action.aiEvaluation) return;
  const kind = action.aiEvaluation.kind;
  if (kind === 'replace') telemetry.replaceUsed = (telemetry.replaceUsed ?? 0) + 1;
  if (kind === 'reposition') telemetry.repositionUsed = (telemetry.repositionUsed ?? 0) + 1;
  if (kind === 'replace' || kind === 'reposition') {
    if (action.aiEvaluation.meaningful) telemetry.meaningfulGameplayActions = (telemetry.meaningfulGameplayActions ?? 0) + 1;
    else telemetry.pointlessGameplayActions = (telemetry.pointlessGameplayActions ?? 0) + 1;
    if ((action.aiEvaluation.openLaneImprovement ?? 0) > 0) {
      telemetry.openLaneImprovements = (telemetry.openLaneImprovements ?? 0) + 1;
    }
  }
}

function getCandidateTargetIndexes(state, owner, effectId) {
  const board = Array.isArray(state?.board) ? state.board : [];
  const friendlyOwner = owner;
  const opponentOwner = owner === 'enemy' ? 'player' : 'enemy';

  switch (effectId) {
    case 'return_friendly_draw_1':
    case 'destroy_friendly_draw_2':
    case 'heal_2':
    case 'heal_1_atk_1_draw_on_kill_this_turn':
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


function getActionTargetIndexes(action) {
  if (Array.isArray(action?.targetIndexes) && action.targetIndexes.length > 0) {
    return action.targetIndexes;
  }
  return [action.targetIndex];
}

function isTwoTargetSwapEffect(effectId) {
  return effectId === 'swap_any_two_units' || effectId === 'swap_two_enemy_units';
}

function isTargetedOnlyEffect(effectId) {
  return isTwoTargetSwapEffect(effectId)
    || effectId === 'return_friendly_draw_1'
    || effectId === 'destroy_friendly_draw_2'
    || effectId === 'heal_2'
    || effectId === 'heal_1_atk_1_draw_on_kill_this_turn'
    || effectId === 'heal_3'
    || effectId === 'quick_strike'
    || effectId === 'swap_adjacent_then_resolve'
    || effectId === 'control_enemy_unit_this_turn'
    || effectId === 'ignore_armor_next_attack'
    || effectId === 'enemy_lane_atk_minus_1';
}

function getBoardPressureSignature(state, owner) {
  const opponent = owner === 'enemy' ? 'player' : 'enemy';
  return JSON.stringify({
    ownerPressure: getGuaranteedHeroDamage(state, owner),
    opponentPressure: getGuaranteedHeroDamage(state, opponent),
    board: (Array.isArray(state?.board) ? state.board : []).map((unit) => {
      if (!unit) return null;
      return {
        owner: unit.owner ?? null,
        id: unit.cardId ?? unit.id ?? null,
        attack: getUnitAttack(unit),
        hp: unit.hp ?? null,
        armor: unit.armor ?? null,
        effectId: unit.effectId ?? null,
      };
    }),
  });
}

function hasMeaningfulBoardOrPressureChange(beforeState, afterState, owner) {
  return getBoardPressureSignature(beforeState, owner) !== getBoardPressureSignature(afterState, owner);
}

function addTwoTargetSwapCandidates(actions, state, owner, card) {
  const targets = getCandidateTargetIndexes(state, owner, card.effectId ?? null);
  for (let first = 0; first < targets.length - 1; first += 1) {
    for (let second = first + 1; second < targets.length; second += 1) {
      const targetIndexes = [targets[first], targets[second]];
      if (!state.board[targetIndexes[0]] || !state.board[targetIndexes[1]]) continue;

      const probeState = cloneState(state);
      const targetedProbe = resolveTargetedEffectCard(probeState, owner, card.id, targetIndexes[0], targetIndexes);
      if (!targetedProbe.ok || targetedProbe.type === 'targeted-effect-pending' || targetedProbe.type === 'targeted-effect-blocked') {
        continue;
      }
      if (!hasMeaningfulBoardOrPressureChange(state, probeState, owner)) continue;

      actions.push({
        type: 'play-targeted-effect',
        cardId: card.id,
        targetIndex: targetIndexes[0],
        targetIndexes,
        effectId: card.effectId ?? null,
      });
    }
  }
}

function addRepositionCandidates(actions, state, owner, telemetry = null) {
  const { friendly } = getRowsForOwner(owner);
  for (let lane = 0; lane < friendly.length - 1; lane += 1) {
    const fromIndex = friendly[lane];
    const toIndex = friendly[lane + 1];
    if (!canSwap(state, fromIndex, toIndex, owner)) continue;
    const action = { type: 'swap-units', fromIndex, toIndex };
    if (wasRecentlyLooped(state, owner, action)) {
      if (telemetry) telemetry.repeatedLoopPreventions = (telemetry.repeatedLoopPreventions ?? 0) + 1;
      continue;
    }
    actions.push(action);
  }
}

function buildActionCandidates(state, owner, hand, telemetry = null) {
  const actions = [];

  addRepositionCandidates(actions, state, owner, telemetry);

  hand.forEach((card) => {
    if (!card) return;
    if (card.type === 'unit') {
      const { friendly } = getRowsForOwner(owner);
      friendly.forEach((slotIndex) => {
        const canPlay = canPlayOrRedeploy(state, owner, card.id, slotIndex);
        if (canPlay.ok && (canPlay.type === 'play' || canPlay.type === 'redeploy')) {
          const action = { type: 'play-unit', cardId: card.id, slotIndex, placementType: canPlay.type };
          if (canPlay.type === 'redeploy' && wasRecentlyLooped(state, owner, action)) {
            if (telemetry) telemetry.repeatedLoopPreventions = (telemetry.repeatedLoopPreventions ?? 0) + 1;
            return;
          }
          actions.push(action);
        }
      });
      return;
    }

    if (isTwoTargetSwapEffect(card.effectId ?? null)) {
      addTwoTargetSwapCandidates(actions, state, owner, card);
      return;
    }

    if (!isTargetedOnlyEffect(card.effectId ?? null)) {
      const simpleProbe = playEffectCard(cloneState(state), owner, card.id);
      if (simpleProbe.ok && simpleProbe.type !== 'effect-blocked') {
        actions.push({ type: 'play-effect', cardId: card.id, effectId: card.effectId ?? null });
      }
    }

    const targets = getCandidateTargetIndexes(state, owner, card.effectId ?? null);
    targets.forEach((targetIndex) => {
      const targetedProbe = resolveTargetedEffectCard(cloneState(state), owner, card.id, targetIndex, [targetIndex]);
      if (targetedProbe.ok && targetedProbe.type !== 'targeted-effect-pending' && targetedProbe.type !== 'targeted-effect-blocked') {
        actions.push({
          type: 'play-targeted-effect',
          cardId: card.id,
          targetIndex,
          targetIndexes: [targetIndex],
          effectId: card.effectId ?? null,
        });
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
  const currentOpponentPressure = getGuaranteedHeroDamage(state, owner === 'enemy' ? 'player' : 'enemy');
  const currentBoardPressure = getBoardPressureValue(state, owner);
  const currentOpenLaneStats = getOpenLaneStats(state, owner);

  if (action.type === 'play-unit') {
    const result = playOrRedeployUnit(nextState, owner, action.cardId, action.slotIndex);
    if (!result.ok) return Number.NEGATIVE_INFINITY;
    action.placementType = result.type;
  } else if (action.type === 'swap-units') {
    const result = performSwap(nextState, owner, action.fromIndex, action.toIndex);
    if (!result.ok) return Number.NEGATIVE_INFINITY;
  } else if (action.type === 'play-effect') {
    const result = playEffectCard(nextState, owner, action.cardId);
    if (!result.ok || result.type === 'effect-blocked') return Number.NEGATIVE_INFINITY;
  } else if (action.type === 'play-targeted-effect') {
    const targetIndexes = getActionTargetIndexes(action);
    const result = resolveTargetedEffectCard(nextState, owner, action.cardId, action.targetIndex, targetIndexes);
    if (!result.ok || result.type === 'targeted-effect-pending' || result.type === 'targeted-effect-blocked') {
      return Number.NEGATIVE_INFINITY;
    }
  }

  const nextOpponentHp = nextState?.[getOpponentHpKey(owner)] ?? 0;
  const nextOwnHp = nextState?.[getHeroHpKey(owner)] ?? 0;
  const immediateHeroDamage = Math.max(0, currentOpponentHp - nextOpponentHp);
  const heroPressureGain = Math.max(0, getGuaranteedHeroDamage(nextState, owner) - currentHeroPressure);
  const opponentPressureReduced = Math.max(
    0,
    currentOpponentPressure - getGuaranteedHeroDamage(nextState, owner === 'enemy' ? 'player' : 'enemy'),
  );
  const boardPressureGain = getBoardPressureValue(nextState, owner) - currentBoardPressure;
  const nextOpenLaneStats = getOpenLaneStats(nextState, owner);
  const openLaneImprovement = (nextOpenLaneStats.damage - currentOpenLaneStats.damage)
    + Math.max(0, nextOpenLaneStats.lanes - currentOpenLaneStats.lanes);

  let score = 0;

  if (nextOpponentHp <= 0) score += 100000;
  if (immediateHeroDamage > 0) score += 30000 + immediateHeroDamage * 300;
  if (heroPressureGain > 0) score += 800 + heroPressureGain * 80;
  if (opponentPressureReduced > 0) score += 700 + opponentPressureReduced * 70;

  const hpSaved = Math.max(0, nextOwnHp - currentOwnHp);
  if (hpSaved > 0) score += 700 + hpSaved * 120;
  if (boardPressureGain > 0) score += 220 + boardPressureGain;
  if (openLaneImprovement > 0) score += 650 + openLaneImprovement * 120;

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
    if (action.placementType === 'redeploy') {
      const meaningful = boardPressureGain > 20 || heroPressureGain > 0 || opponentPressureReduced > 0 || openLaneImprovement > 0;
      action.aiEvaluation = {
        kind: 'replace',
        meaningful,
        pressureGain: boardPressureGain,
        heroPressureGain,
        openLaneImprovement,
        loopKey: getActionLoopKey(state, owner, action),
      };
      if (!meaningful) return Number.NEGATIVE_INFINITY;
      score += 450;
    } else {
      score += 150;
    }
  }

  if (action.type === 'swap-units') {
    const meaningful = boardPressureGain > 20 || heroPressureGain > 0 || opponentPressureReduced > 0 || openLaneImprovement > 0;
    action.aiEvaluation = {
      kind: 'reposition',
      meaningful,
      pressureGain: boardPressureGain,
      heroPressureGain,
      openLaneImprovement,
      loopKey: getActionLoopKey(state, owner, action),
    };
    if (!meaningful) return Number.NEGATIVE_INFINITY;
    score += 380;
  }

  const enemyBoardBefore = state.board.filter((unit) => unit && unit.owner !== owner).length;
  const enemyBoardAfter = nextState.board.filter((unit) => unit && unit.owner !== owner).length;
  const kills = Math.max(0, enemyBoardBefore - enemyBoardAfter);
  if (kills > 0) score += 1400 + kills * 350;

  if (isTwoTargetSwapEffect(action.effectId ?? null)) {
    score += 900;
  }

  if (action.effectId === 'quick_strike') {
    score += immediateHeroDamage > 0 || kills > 0 ? 2000 : -2500;
  }

  if ((action.effectId === 'heal_2' || action.effectId === 'heal_3') && hpSaved <= 0) {
    score -= 2000;
  }

  if (action.effectId === 'heal_1_atk_1_draw_on_kill_this_turn') {
    const { friendly, opposing } = getRowsForOwner(owner);
    const lane = friendly.indexOf(action.targetIndex);
    const targetUnit = nextState.board[action.targetIndex];
    const targetCanPressureHero = targetUnit
      && targetUnit.owner === owner
      && lane >= 0
      && !nextState.board[opposing[lane]];
    score += 250;
    if (targetCanPressureHero) score += 500;
  }

  if (action.effectId === 'buff_all_atk_1' || action.effectId === 'aggro_buff_all_atk_2' || action.effectId === 'buff_all_armor_1') {
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

export function chooseBattleAction(state, owner = 'enemy', options = {}) {
  const side = owner === 'enemy' ? state?.enemy : state?.player;
  const hand = Array.isArray(side?.hand) ? side.hand : [];
  const actions = buildActionCandidates(state, owner, hand, options.telemetry ?? null);

  if (actions.length === 0) return { type: 'pass' };

  const scoredActions = actions
    .map((action) => ({ action, score: scoreAction(state, owner, action) }))
    .filter(({ score }) => Number.isFinite(score));

  if (scoredActions.length === 0) return { type: 'pass' };

  const bestScore = scoredActions.reduce((max, entry) => Math.max(max, entry.score), Number.NEGATIVE_INFINITY);
  const tiedBest = scoredActions.filter((entry) => entry.score === bestScore).map((entry) => entry.action);

  if (tiedBest.length === 1) return tiedBest[0];

  const randomFn = typeof options.randomFn === 'function' ? options.randomFn : null;
  const tieBreakPolicy = options.tieBreakPolicy ?? 'first';

  if (tieBreakPolicy === 'seeded-random' && randomFn) {
    const index = Math.floor(randomFn() * tiedBest.length);
    return tiedBest[Math.max(0, Math.min(tiedBest.length - 1, index))];
  }

  if (tieBreakPolicy === 'rotation') {
    const rotationIndex = Number.isInteger(options.tieBreakIndex) ? options.tieBreakIndex : 0;
    const normalized = ((rotationIndex % tiedBest.length) + tiedBest.length) % tiedBest.length;
    return tiedBest[normalized];
  }

  return tiedBest[0];
}
