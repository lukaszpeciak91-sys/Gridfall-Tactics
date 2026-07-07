import { canPlayOrRedeploy, canSwap, performSwap, playEffectCard, playOrRedeployUnit, resolveTargetedEffectCard, resolveTargetedUnitOnPlayEffect, getUnitAttack, getUnitArmor, getEffectiveBoardAttack, RUNNER_OPEN_LANE_ATK_BONUS, resolveImmediateNoProgressWinner, battleCanRealisticallyChangeOutcome, canPlayEffectCard } from './GameState.js';
import { ACTIVE_EFFECT_VARIANTS } from './effectVariantRegistry.generated.js';

const ENEMY_ROW_INDEXES = [0, 1, 2];
const PLAYER_ROW_INDEXES = [6, 7, 8];
export const AI_SAFE_SURRENDER_ENABLED = true;
const AI_SAFE_SURRENDER_CONFIRMATION_PASSES = 2;

const SAFE_SURRENDER_MEANINGFUL_EFFECT_IDS = new Set([
  'lane_empty_bonus_damage',
  'lane_empty_bonus_damage_1',
  'on_play_lane_damage_1',
  'death_damage_enemy_hero_1',
  'combat_death_damage_enemy_lane_1',
  'combat_death_summon_grunt',
  'leech_heal_hero_on_attack',
  'rotcaller_adjacent_death_atk_1',
  'combat_death_damage_both_heroes_1',
  'adjacent_allies_atk_plus_1_ignore_armor_1',
  'gain_atk_when_damaged',
  'wounded_atk_plus_1',
  'can_hit_any_lane',
  'opposing_lane_atk_plus_1',
  'aggro_buff_all_atk_2',
  'buff_all_atk_1',
  'heal_1_atk_1_draw_on_kill_this_turn',
  'quick_strike',
  'swap_adjacent_then_resolve',
  'ignore_armor_next_attack',
  'damage_all_enemies_1_ignore_armor',
  'control_enemy_unit_this_turn',
  'swap_any_two_units',
  'swap_adjacent_enemy_units',
  'summon_grunt_empty_slot',
  'grave_call',
  'funeral_pyre',
  'revive_friendly_1hp',
  'fill_empty_slots_0_1',
  'infect_damage_1_opposite_ally_atk_1',
  'destroy_friendly_draw_1',
  'destroy_friendly_damage_enemy_base_1',
  'return_friendly_draw_1',
  'enemy_up_to_2_atk_minus_1',
  'enemy_atk_to_0_until_combat',
  'enemy_all_atk_minus_1',
  'enemy_lane_atk_minus_1',
  'buff_all_armor_1',
  'enemy_all_armor_minus_1',
  'heal_all_1',
  'heal_1',
  'cannot_drop_below_1_this_turn',
  'temp_armor_1',
  'swap_leftmost_adjacent_enemies',
  'heal_2',
  'heal_3',
  'swap_two_enemy_units',
  'decay_attack_after_combat',
  'atk_plus_per_other_ally',
  'swap_any_two_friendly_units_buff_both_atk_1',
  'swap_any_two_friendly_units',
]);


const LOW_TEMPO_EFFECTS = new Set([
  'heal_1',
  'heal_2',
  'heal_3',
  'temp_armor_1',
  'heal_all_1',
  'cannot_drop_below_1_this_turn',
  'immune_move_disable_this_turn',
  'return_friendly_draw_1',
  'destroy_friendly_draw_1',
  'revive_friendly_1hp',
  'friendly_immovable_this_turn',
  'adjacent_allies_temp_armor_1',
]);

const BOARD_SYNERGY_EFFECTS = new Set([
  'aggro_buff_all_atk_2',
  'buff_all_atk_1',
  'buff_all_armor_1',
  'quick_strike',
  'swap_adjacent_then_resolve',
  'heal_1_atk_1_draw_on_kill_this_turn',
  'adjacent_allies_temp_armor_1',
]);

const MOVEMENT_TOOL_ARCHETYPES = new Set([
  'Aggro',
  'Control',
  'Wardens',
]);

const UTILITY_EFFECT_IDS = new Set([
  'draw_1',
  'return_friendly_draw_1',
  'destroy_friendly_draw_1',
  'destroy_friendly_damage_enemy_base_1',
  'revive_friendly_1hp',
  'grave_call',
  'fill_empty_slots_0_1',
  'summon_grunt_empty_slot',
  'heal_1',
  'heal_2',
  'heal_3',
  'heal_all_1',
  'temp_armor_1',
  'adjacent_allies_temp_armor_1',
  'buff_all_armor_1',
  'cannot_drop_below_1_this_turn',
  'immune_move_disable_this_turn',
  'friendly_immovable_this_turn',
  'swap_any_two_units',
  'swap_two_enemy_units',
  'swap_adjacent_enemy_units',
  'swap_leftmost_adjacent_enemies',
  'enemy_up_to_2_atk_minus_1',
  'enemy_atk_to_0_until_combat',
  'enemy_lane_atk_minus_1',
  'enemy_all_atk_minus_1',
  'control_enemy_unit_this_turn',
  'swap_any_two_friendly_units',
  'swap_any_two_friendly_units_buff_both_atk_1',
]);

const DELAYED_VALUE_EFFECT_IDS = new Set([
  'draw_1',
  'return_friendly_draw_1',
  'destroy_friendly_draw_1',
  'revive_friendly_1hp',
  'grave_call',
  'fill_empty_slots_0_1',
  'summon_grunt_empty_slot',
  'cannot_drop_below_1_this_turn',
  'immune_move_disable_this_turn',
  'friendly_immovable_this_turn',
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
    if (card.effectId === 'lane_empty_bonus_damage_1') score += 11;
    if (card.effectId === 'empty_adjacent_bonus_atk') score += 14;
    if (card.effectId === 'on_play_lane_damage_1') score += 12;
    if (card.effectId === 'combat_death_damage_enemy_lane_1') score += 8;
    if (card.effectId === 'combat_death_summon_grunt') score += 12;
    if (card.effectId === 'leech_heal_hero_on_attack') score += 10;
    if (card.effectId === 'rotcaller_adjacent_death_atk_1') score += unitsInHand >= 2 ? 12 : -2;
    if (card.effectId === 'combat_death_damage_both_heroes_1') score += 10;
    if (card.effectId === 'warden_defensive_friction_self') score += 18;
    if (card.effectId === 'warden_defensive_friction_adjacent') score += unitsInHand >= 2 ? 20 : 8;
    if (card.effectId === 'opposing_lane_atk_plus_1') score += 12;
    if (card.effectId === 'adjacent_allies_atk_plus_1_ignore_armor_1') score += unitsInHand >= 2 ? 18 : -4;
    if (card.effectId === 'atk_plus_per_other_ally') score += unitsInHand >= 2 ? 20 : -2;
    if (card.effectId === 'decay_attack_after_combat') score += Math.max(0, attack - 1) * 4;
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
  if (card.effectId === 'damage_all_enemies_1_ignore_armor' || card.effectId === 'enemy_all_atk_minus_1' || card.effectId === 'enemy_up_to_2_atk_minus_1' || card.effectId === 'enemy_atk_to_0_until_combat') score -= 12;
  if (card.effectId === 'summon_grunt_empty_slot' || card.effectId === 'fill_empty_slots_0_1' || card.effectId === 'grave_call') score += 22;
  if (card.effectId === 'funeral_pyre') score += unitsInHand >= 2 ? -4 : -34;
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
    total += getEffectiveBoardAttack(state, friendlyIndex);
  });
  return total;
}


function getUnitId(unit) {
  return unit?.cardId ?? unit?.id ?? unit?.name ?? 'unit';
}

function getEffectiveHp(unit) {
  if (!unit) return 0;
  return (Number.isFinite(unit.hp) ? unit.hp : 0) + getUnitArmor(unit);
}

function getOpenLaneStats(state, owner) {
  const { friendly, opposing } = getRowsForOwner(owner);
  let lanes = 0;
  let damage = 0;
  friendly.forEach((friendlyIndex, lane) => {
    const unit = state?.board?.[friendlyIndex];
    if (!unit || state?.board?.[opposing[lane]]) return;
    lanes += 1;
    damage += getEffectiveBoardAttack(state, friendlyIndex);
  });
  return { lanes, damage };
}

function getLikelyFriendlyCombatDeaths(state, owner) {
  const { friendly, opposing } = getRowsForOwner(owner);
  let deaths = 0;
  friendly.forEach((friendlyIndex, lane) => {
    const friendlyUnit = state?.board?.[friendlyIndex];
    const enemyUnit = state?.board?.[opposing[lane]];
    if (!friendlyUnit || !enemyUnit) return;
    if (getEffectiveBoardAttack(state, opposing[lane]) >= getEffectiveHp(friendlyUnit)) deaths += 1;
  });
  return deaths;
}

function getLikelyThreatenedFriendlyIndexes(state, owner) {
  const { friendly, opposing } = getRowsForOwner(owner);
  return friendly.filter((friendlyIndex, lane) => {
    const friendlyUnit = state?.board?.[friendlyIndex];
    const enemyUnit = state?.board?.[opposing[lane]];
    return Boolean(friendlyUnit && enemyUnit && getEffectiveBoardAttack(state, opposing[lane]) >= getEffectiveHp(friendlyUnit));
  });
}

function getFriendlyBoardStats(state, owner) {
  const { friendly, opposing } = getRowsForOwner(owner);
  let count = 0;
  let attack = 0;
  let openLaneAttack = 0;
  let emptySlots = 0;
  let threatened = 0;
  friendly.forEach((friendlyIndex, lane) => {
    const friendlyUnit = state?.board?.[friendlyIndex];
    if (!friendlyUnit) {
      emptySlots += 1;
      return;
    }
    const unitAttack = getEffectiveBoardAttack(state, friendlyIndex);
    const enemyUnit = state?.board?.[opposing[lane]];
    count += 1;
    attack += unitAttack;
    if (!enemyUnit) openLaneAttack += unitAttack;
    if (enemyUnit && getEffectiveBoardAttack(state, opposing[lane]) >= getEffectiveHp(friendlyUnit)) threatened += 1;
  });
  return { count, attack, openLaneAttack, emptySlots, threatened };
}

function getImmediateOpenLaneThreat(state, owner) {
  return getGuaranteedHeroDamage(state, owner === 'enemy' ? 'player' : 'enemy');
}

function opponentArchetypeHasMovementTools(state, owner) {
  const opponentSide = owner === 'enemy' ? state?.player : state?.enemy;
  return MOVEMENT_TOOL_ARCHETYPES.has(opponentSide?.factionName ?? '');
}

function getFeastTargetValue(state, owner, targetIndex) {
  const target = state?.board?.[targetIndex];
  if (!target || target.owner !== owner) return Number.NEGATIVE_INFINITY;
  const { friendly, opposing } = getRowsForOwner(owner);
  const lane = friendly.indexOf(targetIndex);
  const enemyUnit = lane >= 0 ? state?.board?.[opposing[lane]] : null;
  const targetAttack = getUnitAttack(target);
  const targetEffectiveHp = getEffectiveHp(target);
  const selfHp = state?.[getHeroHpKey(owner)] ?? 0;
  const opponentHp = state?.[getOpponentHpKey(owner)] ?? 0;

  if (!enemyUnit && targetAttack >= opponentHp) return Number.NEGATIVE_INFINITY;
  if (enemyUnit && !targetAttack && getUnitAttack(enemyUnit) >= selfHp) return Number.NEGATIVE_INFINITY;
  if (enemyUnit && getUnitAttack(enemyUnit) >= selfHp && getUnitAttack(target) < getEffectiveHp(enemyUnit)) {
    return Number.NEGATIVE_INFINITY;
  }

  let value = 0;
  const wouldDieInCombat = Boolean(enemyUnit && getUnitAttack(enemyUnit) >= targetEffectiveHp);
  if (wouldDieInCombat) value += 950;
  if (targetAttack <= 0) value += 520;
  if (targetAttack === 1) value += 240;
  if (target.effectId === 'combat_death_damage_enemy_lane_1'
    || target.effectId === 'combat_death_summon_grunt'
    || target.effectId === 'combat_death_damage_both_heroes_1') value += 260;
  if (target.effectId === 'rotcaller_adjacent_death_atk_1') value -= 260;
  if (targetAttack >= 3) value -= 900;
  if (!enemyUnit && targetAttack > 0) value -= 750;
  return value;
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
      if (friendlyUnit.effectId === 'lane_empty_bonus_damage_1') value += 40;
      if (friendlyUnit.effectId === 'combat_death_damage_enemy_lane_1') value += 20;
      if (friendlyUnit.effectId === 'combat_death_summon_grunt') value += 35;
      if (friendlyUnit.effectId === 'leech_heal_hero_on_attack') value += 30;
      if (friendlyUnit.effectId === 'rotcaller_adjacent_death_atk_1') value += 25;
      if (friendlyUnit.effectId === 'combat_death_damage_both_heroes_1') value += 35;
      if (friendlyUnit.effectId === 'warden_defensive_friction_self') value += 35;
      if (friendlyUnit.effectId === 'warden_defensive_friction_adjacent') value += 30;
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
      if (friendlyUnit.effectId === 'warden_defensive_friction_self') value += 40;
      if (friendlyUnit.effectId === 'warden_defensive_friction_adjacent') value += 35;
      if (friendlyUnit.effectId === 'combat_death_damage_enemy_lane_1') value += enemyCanKill ? 35 : 10;
      if (friendlyUnit.effectId === 'combat_death_summon_grunt') value += enemyCanKill ? 45 : 15;
      if (friendlyUnit.effectId === 'leech_heal_hero_on_attack') value += 35;
      if (friendlyUnit.effectId === 'rotcaller_adjacent_death_atk_1') value += 20;
      if (friendlyUnit.effectId === 'combat_death_damage_both_heroes_1') value += enemyCanKill ? 35 : 15;
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
  if (kind === 'shield-push') telemetry.shieldPushUses = (telemetry.shieldPushUses ?? 0) + 1;
  if (kind === 'jam-signal') telemetry.jamSignalUses = (telemetry.jamSignalUses ?? 0) + 1;
  if (kind === 'controller') telemetry.controllerUses = (telemetry.controllerUses ?? 0) + 1;
  if (kind === 'replace' || kind === 'reposition') {
    if (action.aiEvaluation.meaningful) telemetry.meaningfulGameplayActions = (telemetry.meaningfulGameplayActions ?? 0) + 1;
    else telemetry.pointlessGameplayActions = (telemetry.pointlessGameplayActions ?? 0) + 1;
    if ((action.aiEvaluation.openLaneImprovement ?? 0) > 0) {
      telemetry.openLaneImprovements = (telemetry.openLaneImprovements ?? 0) + 1;
    }
  }
}

function getCandidateTargetIndexesForTargeting(state, owner, targeting) {
  const board = Array.isArray(state?.board) ? state.board : [];
  const friendlyOwner = owner;
  const opponentOwner = owner === 'enemy' ? 'player' : 'enemy';

  switch (targeting) {
    case 'enemy_unit':
    case 'enemy_units':
    case 'any_enemy_unit':
      return board.map((unit, index) => (unit?.owner === opponentOwner ? index : -1)).filter((index) => index >= 0);
    case 'friendly_unit':
      return board.map((unit, index) => (unit?.owner === friendlyOwner ? index : -1)).filter((index) => index >= 0);
    case 'any_unit':
      return board.map((unit, index) => (unit ? index : -1)).filter((index) => index >= 0);
    default:
      return null;
  }
}

function getCandidateTargetIndexes(state, owner, effectId) {
  const board = Array.isArray(state?.board) ? state.board : [];
  const friendlyOwner = owner;
  const opponentOwner = owner === 'enemy' ? 'player' : 'enemy';

  switch (effectId) {
    case 'return_friendly_draw_1':
    case 'destroy_friendly_draw_1':
    case 'destroy_friendly_damage_enemy_base_1':
    case 'heal_1':
    case 'heal_2':
    case 'heal_1_atk_1_draw_on_kill_this_turn':
    case 'heal_3':
    case 'temp_armor_1':
    case 'quick_strike':
    case 'swap_adjacent_then_resolve':
      return board.map((unit, index) => (unit?.owner === friendlyOwner ? index : -1)).filter((index) => index >= 0);
    case 'control_enemy_unit_this_turn':
    case 'ignore_armor_next_attack':
    case 'infect_damage_1_opposite_ally_atk_1':
    case 'enemy_lane_atk_minus_1':
    case 'enemy_atk_to_0_until_combat':
    case 'enemy_up_to_2_atk_minus_1':
    case 'swap_two_enemy_units':
    case 'swap_adjacent_enemy_units':
      return board.map((unit, index) => (unit?.owner === opponentOwner ? index : -1)).filter((index) => index >= 0);
    case 'swap_any_two_friendly_units':
    case 'swap_any_two_friendly_units_buff_both_atk_1':
      return board.map((unit, index) => (unit?.owner === friendlyOwner ? index : -1)).filter((index) => index >= 0);
    case 'swap_any_two_units':
      return board.map((unit, index) => (unit ? index : -1)).filter((index) => index >= 0);
    default:
      return board.map((_, index) => index);
  }
}


function isSkipBaseEffectVariantAction(state, owner, action) {
  if (!state || !action?.cardId || !action?.effectId) return false;
  const side = owner === 'enemy' ? state.enemy : state.player;
  const factionId = side?.factionId;
  if (!factionId) return false;
  const registryKey = `${factionId}::${action.cardId}::${action.effectId}`;
  const registry = state.effectVariantRegistry ?? ACTIVE_EFFECT_VARIANTS;
  const variant = registry?.[registryKey];
  const firstOperation = Array.isArray(variant?.sequence) ? variant.sequence[0] : null;
  return variant?.baseEffectId === action.effectId
    && firstOperation?.operation === 'skipBaseEffect'
    && Object.keys(firstOperation).length === 1;
}

function getActionTargetIndexes(action) {
  if (Array.isArray(action?.targetIndexes) && action.targetIndexes.length > 0) {
    return action.targetIndexes;
  }
  return [action.targetIndex];
}

function isTwoTargetSwapEffect(effectId) {
  return effectId === 'swap_any_two_units'
    || effectId === 'swap_any_two_friendly_units'
    || effectId === 'swap_any_two_friendly_units_buff_both_atk_1'
    || effectId === 'swap_two_enemy_units'
    || effectId === 'swap_adjacent_enemy_units';
}

function areAdjacentTargetIndexes(firstIndex, secondIndex) {
  return Math.floor(firstIndex / 3) === Math.floor(secondIndex / 3)
    && Math.abs((firstIndex % 3) - (secondIndex % 3)) === 1;
}

function isTargetedOnlyEffect(effectId) {
  return isTwoTargetSwapEffect(effectId)
    || effectId === 'return_friendly_draw_1'
    || effectId === 'destroy_friendly_draw_1'
    || effectId === 'destroy_friendly_damage_enemy_base_1'
    || effectId === 'heal_1'
    || effectId === 'heal_2'
    || effectId === 'heal_1_atk_1_draw_on_kill_this_turn'
    || effectId === 'heal_3'
    || effectId === 'temp_armor_1'
    || effectId === 'quick_strike'
    || effectId === 'swap_adjacent_then_resolve'
    || effectId === 'control_enemy_unit_this_turn'
    || effectId === 'ignore_armor_next_attack'
    || effectId === 'infect_damage_1_opposite_ally_atk_1'
    || effectId === 'enemy_lane_atk_minus_1'
    || effectId === 'enemy_up_to_2_atk_minus_1';
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
        attack: getEffectiveBoardAttack(state, state.board.indexOf(unit)),
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

function addTwoTargetCandidates(actions, state, owner, card) {
  const targets = getCandidateTargetIndexes(state, owner, card.effectId ?? null);
  for (let first = 0; first < targets.length; first += 1) {
    for (let second = 0; second < targets.length; second += 1) {
      if (first === second) continue;
      if (isTwoTargetSwapEffect(card.effectId ?? null) && second < first) continue;
      const targetIndexes = [targets[first], targets[second]];
      if (card.effectId === 'swap_adjacent_enemy_units' && !areAdjacentTargetIndexes(targetIndexes[0], targetIndexes[1])) continue;
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

function getJamSignalTargetValue(state, owner, targetIndex) {
  const target = state?.board?.[targetIndex];
  if (!target || target.owner === owner) return Number.NEGATIVE_INFINITY;
  const attack = getUnitAttack(target);
  if (attack <= 0) return Number.NEGATIVE_INFINITY;
  const { opposing } = getRowsForOwner(owner);
  const lane = opposing.indexOf(targetIndex);
  const friendlyBlocker = lane >= 0 ? state.board[getRowsForOwner(owner).friendly[lane]] : null;
  let value = attack * 120;
  if (!friendlyBlocker) value += attack * 180;
  else value += Math.max(0, attack - getUnitAttack(friendlyBlocker)) * 80;
  if (target.effectId === 'lane_empty_bonus_damage' && !friendlyBlocker) value += 180;
  if (target.effectId === 'lane_empty_bonus_damage_1' && !friendlyBlocker) value += 90;
  return value;
}

function addJamSignalCandidates(actions, state, owner, card) {
  const rankedTargets = getCandidateTargetIndexes(state, owner, card.effectId ?? null)
    .map((targetIndex) => ({ targetIndex, value: getJamSignalTargetValue(state, owner, targetIndex) }))
    .filter(({ value }) => Number.isFinite(value) && value > 0)
    .sort((a, b) => (b.value - a.value) || (a.targetIndex - b.targetIndex));

  const targetIndexes = rankedTargets.slice(0, 2).map(({ targetIndex }) => targetIndex);
  if (targetIndexes.length < 1) return;

  const targetedProbe = resolveTargetedEffectCard(cloneState(state), owner, card.id, targetIndexes[0], targetIndexes);
  if (targetedProbe.ok && targetedProbe.type !== 'targeted-effect-pending' && targetedProbe.type !== 'targeted-effect-blocked') {
    actions.push({ type: 'play-targeted-effect', cardId: card.id, targetIndex: targetIndexes[0], targetIndexes, effectId: card.effectId ?? null });
  }
}



function hasMeaningfulPressureChange(beforeState, afterState, owner) {
  const opponent = owner === 'enemy' ? 'player' : 'enemy';
  const beforeOpen = getOpenLaneStats(beforeState, owner);
  const afterOpen = getOpenLaneStats(afterState, owner);
  return getBoardPressureValue(afterState, owner) !== getBoardPressureValue(beforeState, owner)
    || getGuaranteedHeroDamage(afterState, owner) !== getGuaranteedHeroDamage(beforeState, owner)
    || getGuaranteedHeroDamage(afterState, opponent) !== getGuaranteedHeroDamage(beforeState, opponent)
    || afterOpen.damage !== beforeOpen.damage
    || afterOpen.lanes !== beforeOpen.lanes;
}

function addControllerUnitCandidates(actions, state, owner, card, slotIndex, placementType) {
  const targets = getCandidateTargetIndexes(state, owner, card.effectId ?? null);
  if (targets.length < 2) return;

  for (let first = 0; first < targets.length - 1; first += 1) {
    for (let second = first + 1; second < targets.length; second += 1) {
      const targetIndexes = [targets[first], targets[second]];
      const placementState = cloneState(state);
      const playProbe = playOrRedeployUnit(placementState, owner, card.id, slotIndex);
      if (!playProbe.ok) continue;
      const probeState = cloneState(placementState);
      const targetedProbe = resolveTargetedUnitOnPlayEffect(probeState, owner, slotIndex, targetIndexes);
      if (!targetedProbe.ok || targetedProbe.type === 'unit-on-play-targeted-effect-pending') continue;
      if (!hasMeaningfulPressureChange(placementState, probeState, owner)) continue;
      actions.push({
        type: 'play-unit',
        cardId: card.id,
        slotIndex,
        placementType,
        effectId: card.effectId ?? null,
        targetIndex: targetIndexes[0],
        targetIndexes,
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

export function buildActionCandidates(state, owner, hand, telemetry = null) {
  const actions = [{ type: 'pass', reason: 'hold-card-action' }];

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
          if (card.effectId === 'swap_two_enemy_units') {
            addControllerUnitCandidates(actions, state, owner, card, slotIndex, canPlay.type);
            return;
          }
          actions.push(action);
        }
      });
      return;
    }

    const effectLegality = canPlayEffectCard(state, owner, card);
    if (!effectLegality.ok) return;

    if (isTwoTargetSwapEffect(card.effectId ?? null)) {
      addTwoTargetCandidates(actions, state, owner, card);
      return;
    }

    if (card.effectId === 'enemy_up_to_2_atk_minus_1') {
      addJamSignalCandidates(actions, state, owner, card);
      return;
    }

    const targetingOverrideNone = card.targeting === 'none';

    if (targetingOverrideNone || !isTargetedOnlyEffect(card.effectId ?? null)) {
      const simpleProbe = playEffectCard(cloneState(state), owner, card.id);
      if (simpleProbe.ok && simpleProbe.type !== 'effect-blocked') {
        actions.push({ type: 'play-effect', cardId: card.id, effectId: card.effectId ?? null });
      }
    }

    if (targetingOverrideNone) return;

    const variantTargetCandidates = isSkipBaseEffectVariantAction(state, owner, { cardId: card.id, effectId: card.effectId ?? null })
      ? getCandidateTargetIndexesForTargeting(state, owner, card.targeting)
      : null;
    const targets = variantTargetCandidates ?? getCandidateTargetIndexes(state, owner, card.effectId ?? null);
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


function getActionCard(state, owner, action) {
  if (!action?.cardId) return null;
  const side = owner === 'enemy' ? state?.enemy : state?.player;
  return (Array.isArray(side?.hand) ? side.hand : []).find((card) => card?.id === action.cardId) ?? null;
}

function isUtilityAction(state, owner, action) {
  if (!action || action.type === 'pass' || action.type === 'swap-units') return false;
  if (action.type === 'play-unit') return UTILITY_EFFECT_IDS.has(action.effectId ?? null) && action.effectId === 'swap_two_enemy_units';
  const card = getActionCard(state, owner, action);
  return card?.type !== 'unit' && UTILITY_EFFECT_IDS.has(action.effectId ?? null);
}

function getUtilityOpportunityCost(state, owner, action) {
  if (!isUtilityAction(state, owner, action)) return 0;
  const side = owner === 'enemy' ? state?.enemy : state?.player;
  const hand = Array.isArray(side?.hand) ? side.hand : [];
  const unitsInHand = hand.filter((card) => card?.type === 'unit').length;
  const { friendly } = getRowsForOwner(owner);
  const emptySlots = friendly.filter((index) => !state.board?.[index]).length;
  let cost = 280;
  if (action.type === 'play-effect' || action.type === 'play-targeted-effect') cost += 160;
  if (DELAYED_VALUE_EFFECT_IDS.has(action.effectId ?? null)) cost += 120;
  if (unitsInHand > 0 && emptySlots > 0) cost += 180;
  if ((side?.hand?.length ?? 0) <= 2) cost -= 120;
  if (action.effectId === 'draw_1') cost -= 260;
  if (action.effectId === 'destroy_friendly_draw_1' || action.effectId === 'return_friendly_draw_1') cost += 60;
  if (action.effectId === 'revive_friendly_1hp') cost += 260;
  if (action.effectId === 'temp_armor_1' || action.effectId === 'adjacent_allies_temp_armor_1' || action.effectId === 'buff_all_armor_1') cost += 80;
  if (isTwoTargetSwapEffect(action.effectId ?? null) || action.effectId === 'enemy_up_to_2_atk_minus_1' || action.effectId === 'control_enemy_unit_this_turn') cost += 80;
  if (action.effectId === 'swap_any_two_units') cost += 180;
  if (action.effectId === 'swap_any_two_friendly_units_buff_both_atk_1') cost -= 80;
  return Math.max(0, cost);
}

function getUtilityChoiceReason(state, owner, action, metrics) {
  if (isSkipBaseEffectVariantAction(state, owner, action)) return 'variant creates direct utility value';
  if (metrics.nextOpponentHp <= 0) return 'creates lethal';
  if (metrics.currentOpponentPressure >= metrics.currentOwnHp && metrics.opponentPressureReduced > 0) return 'prevents lethal';
  if (metrics.kills > 0) return 'removes immediate major threat';
  if (metrics.savedThreatenedUnits > 0) return 'saves a key unit';
  if (metrics.preventedMeaningfulBaseDamage) return 'prevents meaningful incoming base damage';
  if (metrics.cardAdvantageWithoutTempoLoss) return 'creates card advantage without major tempo loss';
  if (metrics.acceptableSacrificeValue) return 'uses acceptable sacrifice target for card advantage';
  if (metrics.protectsImportantBoard) return 'protects an important board';
  if (metrics.heroPressureGain > 0 || metrics.openLaneImprovement > 0) return 'creates clear lane/hero pressure improvement';
  if (metrics.opponentPressureReduced >= 2 || metrics.boardPressureGain >= 600) return 'meaningful pressure swing';
  return null;
}

function getUtilityThreshold(action, reason) {
  if (!action || action.type === 'pass' || action.type === 'swap-units') return 0;
  if (!UTILITY_EFFECT_IDS.has(action.effectId ?? null)) return 0;
  if (reason) return 0;
  if (action.effectId === 'draw_1') return 120;
  if (DELAYED_VALUE_EFFECT_IDS.has(action.effectId ?? null)) return 420;
  if (action.effectId === 'temp_armor_1' || action.effectId === 'adjacent_allies_temp_armor_1' || action.effectId === 'buff_all_armor_1') return 340;
  return 320;
}

function getUtilityCategory(action) {
  const effectId = action?.effectId ?? null;
  if (effectId === 'draw_1') return 'draw-only';
  if (effectId === 'destroy_friendly_draw_1' || effectId === 'destroy_friendly_damage_enemy_base_1') return 'sacrifice';
  if (effectId === 'return_friendly_draw_1') return 'recall';
  if (effectId === 'temp_armor_1' || effectId === 'adjacent_allies_temp_armor_1' || effectId === 'buff_all_armor_1' || effectId === 'heal_all_1' || effectId === 'cannot_drop_below_1_this_turn') return 'defensive';
  if (effectId === 'immune_move_disable_this_turn' || effectId === 'friendly_immovable_this_turn') return 'stability';
  if (isTwoTargetSwapEffect(effectId) || effectId === 'enemy_up_to_2_atk_minus_1' || effectId === 'control_enemy_unit_this_turn') return 'control';
  return effectId ? 'utility' : null;
}

export function scoreAction(state, owner, action) {
  if (action?.type === 'pass') {
    action.aiEvaluation = { kind: 'hold', holdScore: 0, reason: 'do not spend this action/card now' };
    return 0;
  }

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
    if (Array.isArray(action.targetIndexes) && action.effectId === 'swap_two_enemy_units') {
      const targetedResult = resolveTargetedUnitOnPlayEffect(nextState, owner, action.slotIndex, action.targetIndexes);
      if (!targetedResult.ok || targetedResult.type === 'unit-on-play-targeted-effect-pending') return Number.NEGATIVE_INFINITY;
    }
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
    const placedUnit = nextState.board[action.slotIndex];
    if (placedUnit?.owner === owner && String(placedUnit.cardId ?? placedUnit.id ?? '').startsWith('wardens_')) {
      const adjacentAllyCount = [friendly[lane - 1], friendly[lane + 1]]
        .filter((index) => nextState.board[index]?.owner === owner).length;
      if (adjacentAllyCount > 0) score += 120 + adjacentAllyCount * 80;
      if (lane === 1 && adjacentAllyCount > 0) score += 80;
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

  if (action.effectId === 'draw_1') {
    const side = owner === 'enemy' ? state.enemy : state.player;
    const hasDeck = (side?.deck?.length ?? 0) > 0;
    const handAfterSpend = Math.max(0, (side?.hand?.length ?? 0) - 1);
    score += hasDeck ? 620 : -1200;
    if (hasDeck && handAfterSpend <= 2) score += 260;
  }

  if (isSkipBaseEffectVariantAction(state, owner, action)) {
    score += 1100;
  }

  if (action.effectId === 'swap_two_enemy_units') {
    const meaningful = boardPressureGain > 20 || heroPressureGain > 0 || opponentPressureReduced > 0 || openLaneImprovement > 0;
    action.aiEvaluation = {
      kind: action.type === 'play-unit' ? 'controller' : 'shield-push',
      meaningful,
      pressureGain: boardPressureGain,
      heroPressureGain,
      openLaneImprovement,
    };
    if (!meaningful) return Number.NEGATIVE_INFINITY;
    score += action.type === 'play-unit' ? 720 : 760;
  }

  if (action.effectId === 'swap_leftmost_adjacent_enemies' || action.effectId === 'swap_adjacent_enemy_units') {
    const meaningful = boardPressureGain > 20 || heroPressureGain > 0 || opponentPressureReduced > 0 || openLaneImprovement > 0;
    action.aiEvaluation = {
      kind: 'shield-push',
      meaningful,
      pressureGain: boardPressureGain,
      heroPressureGain,
      openLaneImprovement,
    };
    if (!meaningful) return Number.NEGATIVE_INFINITY;
    score += 760;
  }

  if (action.effectId === 'adjacent_allies_temp_armor_1') {
    const { friendly } = getRowsForOwner(owner);
    const targetIndexes = friendly.filter((index, rowPosition) => (
      state.board[index]?.owner === owner
      && (state.board[friendly[rowPosition - 1]]?.owner === owner
        || state.board[friendly[rowPosition + 1]]?.owner === owner)
    ));
    const armorGain = targetIndexes.reduce((total, index) => (
      total + Math.max(0, getUnitArmor(nextState.board[index]) - getUnitArmor(state.board[index]))
    ), 0);
    score += armorGain > 0 ? 620 + armorGain * 120 : -2000;
  }

  if (action.effectId === 'funeral_pyre') {
    const likelyDeaths = Math.min(2, getLikelyFriendlyCombatDeaths(state, owner));
    action.aiEvaluation = { kind: 'funeral-pyre', likelyDeaths };
    if (likelyDeaths <= 0) score -= 2600;
    else score += 300 + likelyDeaths * 450;
  }

  if (action.effectId === 'grave_call') {
    const { friendly } = getRowsForOwner(owner);
    const emptySlots = friendly.filter((index) => !state.board[index]).length;
    const friendlyUnits = friendly.filter((index) => state.board[index]?.owner === owner).length;
    if (emptySlots <= 0) score -= 5000;
    else score += (friendlyUnits === 0 ? 900 : 450) + Math.min(emptySlots, friendlyUnits === 0 ? 2 : 1) * 160;
  }

  if (action.effectId === 'fill_empty_slots_0_1') {
    const { friendly } = getRowsForOwner(owner);
    const occupiedBefore = friendly.filter((index) => state.board[index]?.owner === owner).length;
    const occupiedAfter = friendly.filter((index) => nextState.board[index]?.owner === owner).length;
    const laneGain = Math.max(0, occupiedAfter - occupiedBefore);
    const opponentOccupiedBefore = getRowsForOwner(owner === 'enemy' ? 'player' : 'enemy').friendly
      .filter((index) => state.board[index]?.owner !== owner && state.board[index]).length;
    const opponentOccupiedAfter = getRowsForOwner(owner === 'enemy' ? 'player' : 'enemy').friendly
      .filter((index) => nextState.board[index]?.owner !== owner && nextState.board[index]).length;
    const ownerLaneDeltaBefore = occupiedBefore - opponentOccupiedBefore;
    const ownerLaneDeltaAfter = occupiedAfter - opponentOccupiedAfter;
    const laneDifferentialGain = Math.max(0, ownerLaneDeltaAfter - ownerLaneDeltaBefore);
    const preventedImmediateHeroDamage = Math.min(currentOpponentPressure, opponentPressureReduced);
    const preventsImmediateLethal = currentOpponentPressure >= currentOwnHp
      && getGuaranteedHeroDamage(nextState, owner === 'enemy' ? 'player' : 'enemy') < currentOwnHp;

    if (laneGain <= 0) score -= 5000;
    else {
      const isBehindOnLanes = occupiedBefore < opponentOccupiedBefore;
      const preservesContestedWidth = isBehindOnLanes && opponentPressureReduced > 0;
      const lanePreservationBonus = preservesContestedWidth ? laneGain * 160 + laneDifferentialGain * 120 : 0;
      const openLaneDefenseBonus = opponentPressureReduced > 0
        ? opponentPressureReduced * 180 + preventedImmediateHeroDamage * 100
        : 0;
      score += lanePreservationBonus + openLaneDefenseBonus;
      if (preventsImmediateLethal) score += 900;
      action.aiEvaluation = {
        kind: 'flood-lane-preservation',
        laneGain,
        laneDifferentialGain,
        isBehindOnLanes,
        preservesContestedWidth,
        opponentPressureReduced,
        preventedImmediateHeroDamage,
        preventsImmediateLethal,
      };
    }
  }

  if (action.effectId === 'revive_friendly_1hp') {
    const { friendly } = getRowsForOwner(owner);
    const side = owner === 'enemy' ? state.enemy : state.player;
    const hasEmpty = friendly.some((index) => !state.board[index]);
    const hasFallenUnit = side.fallen?.some((entry) => entry?.card?.type === 'unit');
    if (!hasEmpty || !hasFallenUnit) score -= 5000;
    else score += 500;
  }

  if (action.effectId === 'summon_grunt_empty_slot') {
    const openLaneBlocked = Math.max(0, currentOpponentPressure - getGuaranteedHeroDamage(nextState, owner === 'enemy' ? 'player' : 'enemy'));
    const preventsLethalLane = currentOpponentPressure >= currentOwnHp && openLaneBlocked > 0;
    if (preventsLethalLane) score += 1600 + openLaneBlocked * 160;
  }

  if (action.effectId === 'infect_damage_1_opposite_ally_atk_1') {
    const target = state.board[action.targetIndex];
    const lethal = target && target.hp <= 1;
    const { opposing } = getRowsForOwner(owner);
    const lane = opposing.indexOf(action.targetIndex);
    const oppositeAlly = lane >= 0 ? state.board[getRowsForOwner(owner).friendly[lane]] : null;
    score += lethal ? 650 : (oppositeAlly?.owner === owner ? 780 : 120);
  }

  if (action.effectId === 'enemy_up_to_2_atk_minus_1') {
    const targetIndexes = getActionTargetIndexes(action);
    const targetValue = targetIndexes.reduce((total, index) => total + Math.max(0, getJamSignalTargetValue(state, owner, index)), 0);
    const meaningful = opponentPressureReduced > 0 || targetValue > 0;
    action.aiEvaluation = {
      kind: 'jam-signal',
      meaningful,
      targetCount: targetIndexes.length,
      opponentPressureReduced,
    };
    if (!meaningful) return Number.NEGATIVE_INFINITY;
    score += 360 + targetValue + targetIndexes.length * 90;
  }

  if (action.effectId === 'enemy_atk_to_0_until_combat') {
    const target = state.board[action.targetIndex];
    const targetAttack = getEffectiveBoardAttack(state, action.targetIndex);
    const meaningful = target?.owner === (owner === 'enemy' ? 'player' : 'enemy') && targetAttack > 0;
    action.aiEvaluation = { kind: 'enemy-atk-to-0', meaningful, targetAttack, opponentPressureReduced };
    if (!meaningful) return Number.NEGATIVE_INFINITY;
    score += 420 + targetAttack * 180 + Math.max(0, opponentPressureReduced) * 90;
  }

  if (action.effectId === 'control_enemy_unit_this_turn') {
    const target = state.board[action.targetIndex];
    const targetAttack = getUnitAttack(target);
    score += 900 + targetAttack * 220;
    if ((target?.hp ?? 0) <= 1) score += 650;
  }

  if ((action.effectId === 'destroy_friendly_draw_1' || action.effectId === 'destroy_friendly_damage_enemy_base_1') && !isSkipBaseEffectVariantAction(state, owner, action)) {
    const targetValue = getFeastTargetValue(state, owner, action.targetIndex);
    if (!Number.isFinite(targetValue)) return Number.NEGATIVE_INFINITY;
    const side = owner === 'enemy' ? state.enemy : state.player;
    const lowHandBonus = action.effectId === 'destroy_friendly_draw_1' && (side?.hand?.length ?? 0) <= 2 ? 420 : 0;
    const baseDamageBonus = action.effectId === 'destroy_friendly_damage_enemy_base_1' ? 360 : 0;
    score += 520 + targetValue + lowHandBonus + baseDamageBonus;
  }

  if (action.effectId === 'quick_strike') {
    score += immediateHeroDamage > 0 || kills > 0 ? 2000 : -2500;
  }

  if (action.effectId === 'heal_1' || action.effectId === 'heal_2' || action.effectId === 'heal_3') {
    const beforeTarget = state.board[action.targetIndex];
    const afterTarget = nextState.board[action.targetIndex];
    const unitHpRestored = beforeTarget?.owner === owner && afterTarget?.owner === owner
      ? Math.max(0, (afterTarget.hp ?? 0) - (beforeTarget.hp ?? 0))
      : 0;
    if (unitHpRestored <= 0) score -= 2000;
    else score += 1800 + unitHpRestored * 260;
  }

  if (action.effectId === 'heal_all_1') {
    const { friendly } = getRowsForOwner(owner);
    const healedUnits = friendly.filter((index) => {
      const before = state.board[index];
      const after = nextState.board[index];
      return before?.owner === owner && after?.owner === owner && (after.hp ?? 0) > (before.hp ?? 0);
    });
    if (healedUnits.length <= 0) score -= 2200;
    else {
      const threatenedHealedUnits = healedUnits.filter((index) => {
        const lane = friendly.indexOf(index);
        const enemyUnit = state.board[getRowsForOwner(owner).opposing[lane]];
        return enemyUnit && getUnitAttack(enemyUnit) >= getEffectiveHp(state.board[index]);
      }).length;
      score += 500 + healedUnits.length * 180 + threatenedHealedUnits * 420;
    }
  }

  if (action.effectId === 'temp_armor_1') {
    const targetUnit = nextState.board[action.targetIndex];
    const armorGain = Math.max(0, getUnitArmor(targetUnit) - getUnitArmor(state.board[action.targetIndex]));
    score += armorGain > 0 ? 700 + armorGain * 140 : -2000;
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

  if (action.effectId === 'return_friendly_draw_1') {
    const target = state.board[action.targetIndex];
    const { friendly, opposing } = getRowsForOwner(owner);
    const lane = friendly.indexOf(action.targetIndex);
    const enemyUnit = lane >= 0 ? state.board[opposing[lane]] : null;
    const targetAttack = getUnitAttack(target);
    const targetWouldDie = Boolean(target?.owner === owner && enemyUnit && getUnitAttack(enemyUnit) >= getEffectiveHp(target));
    const hasDeck = (owner === 'enemy' ? state.enemy?.deck : state.player?.deck)?.length > 0;
    if (targetWouldDie) score += 720 + targetAttack * 160;
    if (hasDeck) score += 240;
    if (!targetWouldDie && targetAttack <= 1) score -= 360;
  }

  if (action.effectId === 'buff_all_atk_1' || action.effectId === 'aggro_buff_all_atk_2' || action.effectId === 'buff_all_armor_1' || action.effectId === 'enemy_all_armor_minus_1') {
    const friendlyUnits = nextState.board.filter((unit) => unit && unit.owner === owner).length;
    if (friendlyUnits <= 1) score -= 1200;
    else score += friendlyUnits * 120;
  }

  if (action.effectId === 'cannot_drop_below_1_this_turn') {
    const threatenedIndexes = getLikelyThreatenedFriendlyIndexes(state, owner);
    if (threatenedIndexes.length <= 0) return Number.NEGATIVE_INFINITY;
    const friendlyStats = getFriendlyBoardStats(state, owner);
    const importantThreatenedAttack = threatenedIndexes.reduce((total, index) => total + Math.max(0, getUnitAttack(state.board[index])), 0);
    const lethalPrevention = getImmediateOpenLaneThreat(state, owner) >= currentOwnHp ? 900 : 0;
    const contestedBoardBonus = friendlyStats.count >= 2 ? 240 : 0;
    score += 560 + threatenedIndexes.length * 300 + importantThreatenedAttack * 90 + lethalPrevention + contestedBoardBonus;
  }

  if (action.effectId === 'immune_move_disable_this_turn') {
    const friendlyStats = getFriendlyBoardStats(state, owner);
    if (friendlyStats.count < 2 || friendlyStats.attack <= 1) return Number.NEGATIVE_INFINITY;
    const opponentHasMovementArchetype = opponentArchetypeHasMovementTools(state, owner);
    const importantBoardBonus = friendlyStats.attack * 80 + friendlyStats.count * 120;
    const openLaneBonus = friendlyStats.openLaneAttack > 0 ? 320 : 0;
    if (!opponentHasMovementArchetype && (friendlyStats.count < 2 || friendlyStats.attack < 3)) return Number.NEGATIVE_INFINITY;
    score += (opponentHasMovementArchetype ? 360 : 280) + importantBoardBonus + openLaneBonus;
  }

  if (action.effectId === 'friendly_immovable_this_turn') {
    const hasEnemyMoveCard = (owner === 'enemy' ? state.player?.hand : state.enemy?.hand)?.some((card) => (
      card?.effectId === 'swap_any_two_units'
      || card?.effectId === 'swap_two_enemy_units'
      || card?.effectId === 'swap_adjacent_enemy_units'
      || card?.effectId === 'swap_adjacent_then_resolve'
      || card?.effectId === 'swap_leftmost_adjacent_enemies'
    ));
    const friendlyStats = getFriendlyBoardStats(state, owner);
    const importantBoardBonus = friendlyStats.attack * 70 + friendlyStats.count * 90 + (friendlyStats.openLaneAttack > 0 ? 260 : 0);
    score += hasEnemyMoveCard ? 260 + importantBoardBonus : -600;
  }

  const savedThreatenedUnits = Math.max(0, getLikelyFriendlyCombatDeaths(state, owner) - getLikelyFriendlyCombatDeaths(nextState, owner));
  const utilityOpportunityCost = getUtilityOpportunityCost(state, owner, action);
  const utilityScoreBeforeCost = score;
  const side = owner === 'enemy' ? state.enemy : state.player;
  const preventedMeaningfulBaseDamage = opponentPressureReduced >= 2;
  const cardAdvantageWithoutTempoLoss = action.effectId === 'draw_1'
    && (side?.deck?.length ?? 0) > 0
    && ((side?.hand?.length ?? 0) <= 3 || currentOpponentPressure <= 0);
  const acceptableSacrificeValue = action.effectId === 'destroy_friendly_draw_1'
    && Number.isFinite(getFeastTargetValue(state, owner, action.targetIndex))
    && getFeastTargetValue(state, owner, action.targetIndex) >= 500;
  const friendlyStatsForUtility = getFriendlyBoardStats(state, owner);
  const protectsImportantBoard = (
    action.effectId === 'immune_move_disable_this_turn'
    || action.effectId === 'friendly_immovable_this_turn'
    || action.effectId === 'temp_armor_1'
    || action.effectId === 'adjacent_allies_temp_armor_1'
    || action.effectId === 'buff_all_armor_1'
    || action.effectId === 'heal_all_1'
    || action.effectId === 'cannot_drop_below_1_this_turn'
  ) && (savedThreatenedUnits > 0 || friendlyStatsForUtility.attack >= 4 || friendlyStatsForUtility.openLaneAttack >= 2);
  const utilityReason = utilityOpportunityCost > 0 ? getUtilityChoiceReason(state, owner, action, {
    nextOpponentHp,
    currentOpponentPressure,
    currentOwnHp,
    opponentPressureReduced,
    kills,
    savedThreatenedUnits,
    heroPressureGain,
    openLaneImprovement,
    boardPressureGain,
    preventedMeaningfulBaseDamage,
    cardAdvantageWithoutTempoLoss,
    acceptableSacrificeValue,
    protectsImportantBoard,
  }) : null;
  if (utilityOpportunityCost > 0) {
    score -= utilityOpportunityCost;
    action.aiEvaluation = {
      ...(action.aiEvaluation ?? {}),
      utility: true,
      cardId: action.cardId ?? null,
      utilityCategory: getUtilityCategory(action),
      utilityScoreBeforeCost,
      utilityOpportunityCost,
      utilityCostApplied: utilityOpportunityCost,
      utilityScoreAfterCost: score,
      utilityReason,
      utilityThreshold: getUtilityThreshold(action, utilityReason),
    };
  }

  score += 20;
  return score;
}

function getOwnerRowIndexes(owner) {
  return owner === 'enemy' ? ENEMY_ROW_INDEXES : PLAYER_ROW_INDEXES;
}

function noProgressWouldAlreadyResolve(state) {
  if (!state || state.winner) return Boolean(state?.winner);
  const snapshot = JSON.parse(JSON.stringify(state));
  return Boolean(resolveImmediateNoProgressWinner(snapshot));
}

function cardIsKnownMeaningfulForSafeSurrender(card) {
  if (!card) return false;
  if (card.type === 'unit') {
    if (!Number.isFinite(card.attack) || !Number.isFinite(card.hp)) return true;
    if ((card.attack ?? 0) > 0) return true;
    if (!card.effectId) return false;
    return SAFE_SURRENDER_MEANINGFUL_EFFECT_IDS.has(card.effectId);
  }
  if (!card.effectId) return true;
  return SAFE_SURRENDER_MEANINGFUL_EFFECT_IDS.has(card.effectId);
}

function cardIsUnknownForSafeSurrender(card) {
  if (!card) return false;
  if (card.type !== 'unit' && !card.effectId) return true;
  if (!card.effectId) return false;
  return !SAFE_SURRENDER_MEANINGFUL_EFFECT_IDS.has(card.effectId);
}

export function isVerySafeConcedableState(state, owner = 'enemy') {
  if (!state || (owner !== 'enemy' && owner !== 'player')) return false;
  if (noProgressWouldAlreadyResolve(state)) return false;
  const selfHp = owner === 'enemy' ? (state.enemyHP ?? 0) : (state.playerHP ?? 0);
  const opponentHp = owner === 'enemy' ? (state.playerHP ?? 0) : (state.enemyHP ?? 0);
  if (selfHp >= opponentHp) return false;

  const ownerHasUnits = getOwnerRowIndexes(owner).some((index) => state.board?.[index]?.owner === owner);
  if (ownerHasUnits) return false;

  const ownerSide = owner === 'enemy' ? state.enemy : state.player;
  const ownerHand = Array.isArray(ownerSide?.hand) ? ownerSide.hand : [];
  const ownerDeck = Array.isArray(ownerSide?.deck) ? ownerSide.deck : [];

  if (ownerHand.some(cardIsUnknownForSafeSurrender) || ownerDeck.some(cardIsUnknownForSafeSurrender)) return false;
  if (ownerHand.some(cardIsKnownMeaningfulForSafeSurrender)) return false;
  if (ownerDeck.some(cardIsKnownMeaningfulForSafeSurrender)) return false;

  return true;
}

function updateSafeSurrenderPassCounter(state, owner, stillEligible) {
  if (!state) return 0;
  state.aiSafeSurrender ??= { player: 0, enemy: 0 };
  if (stillEligible) {
    state.aiSafeSurrender[owner] = (state.aiSafeSurrender[owner] ?? 0) + 1;
  } else {
    state.aiSafeSurrender[owner] = 0;
  }
  return state.aiSafeSurrender[owner];
}

export function chooseEnemyAction(state) {
  return chooseBattleAction(state, 'enemy');
}

export function chooseBattleAction(state, owner = 'enemy', options = {}) {
  const safeSurrenderEnabled = options.aiSafeSurrenderEnabled ?? AI_SAFE_SURRENDER_ENABLED;
  if (owner === 'enemy' && safeSurrenderEnabled) {
    const isSafeConcedable = isVerySafeConcedableState(state, owner);
    const confirmations = updateSafeSurrenderPassCounter(state, owner, isSafeConcedable);
    if (isSafeConcedable && confirmations >= AI_SAFE_SURRENDER_CONFIRMATION_PASSES) {
      return { type: 'surrender', reason: 'ai-safe-surrender' };
    }
  }

  if (!battleCanRealisticallyChangeOutcome(state)) return { type: 'pass' };

  const side = owner === 'enemy' ? state?.enemy : state?.player;
  const hand = Array.isArray(side?.hand) ? side.hand : [];
  const actions = buildActionCandidates(state, owner, hand, options.telemetry ?? null);

  if (actions.length === 0) return { type: 'pass' };

  const holdAction = actions.find((action) => action.type === 'pass') ?? { type: 'pass', reason: 'hold-card-action' };
  const holdScore = scoreAction(state, owner, holdAction);
  const scoredActions = actions
    .map((action) => ({ action, score: action === holdAction ? holdScore : scoreAction(state, owner, action) }))
    .filter(({ action, score }) => {
      if (!Number.isFinite(score)) return false;
      const threshold = action?.aiEvaluation?.utilityThreshold ?? 0;
      if (threshold > 0 && score < holdScore + threshold) {
        action.aiEvaluation = { ...(action.aiEvaluation ?? {}), holdScore, marginOverHold: score - holdScore, chosenAction: false, utilityRejectedReason: 'below utility usefulness threshold' };
        return false;
      }
      action.aiEvaluation = { ...(action.aiEvaluation ?? {}), holdScore, marginOverHold: score - holdScore, chosenAction: false };
      return true;
    });

  if (scoredActions.length === 0) return { type: 'pass' };

  const bestScore = scoredActions.reduce((max, entry) => Math.max(max, entry.score), Number.NEGATIVE_INFINITY);
  const tiedBest = scoredActions.filter((entry) => entry.score === bestScore).map((entry) => entry.action);

  if (tiedBest.length === 1) {
    tiedBest[0].aiEvaluation = { ...(tiedBest[0].aiEvaluation ?? {}), chosenAction: true, utilityChosenReason: tiedBest[0].aiEvaluation?.utilityReason ?? tiedBest[0].aiEvaluation?.reason ?? 'highest scored legal action' };
    if (owner === 'enemy' && tiedBest[0]?.type !== 'pass') updateSafeSurrenderPassCounter(state, owner, false);
    return tiedBest[0];
  }

  const randomFn = typeof options.randomFn === 'function' ? options.randomFn : null;
  const tieBreakPolicy = options.tieBreakPolicy ?? 'first';

  if (tieBreakPolicy === 'seeded-random' && randomFn) {
    const index = Math.floor(randomFn() * tiedBest.length);
    const picked = tiedBest[Math.max(0, Math.min(tiedBest.length - 1, index))];
    picked.aiEvaluation = { ...(picked.aiEvaluation ?? {}), chosenAction: true, utilityChosenReason: picked.aiEvaluation?.utilityReason ?? picked.aiEvaluation?.reason ?? 'seeded random tie break' };
    if (owner === 'enemy' && picked?.type !== 'pass') updateSafeSurrenderPassCounter(state, owner, false);
    return picked;
  }

  if (tieBreakPolicy === 'rotation') {
    const rotationIndex = Number.isInteger(options.tieBreakIndex) ? options.tieBreakIndex : 0;
    const normalized = ((rotationIndex % tiedBest.length) + tiedBest.length) % tiedBest.length;
    const picked = tiedBest[normalized];
    picked.aiEvaluation = { ...(picked.aiEvaluation ?? {}), chosenAction: true, utilityChosenReason: picked.aiEvaluation?.utilityReason ?? picked.aiEvaluation?.reason ?? 'rotation tie break' };
    if (owner === 'enemy' && picked?.type !== 'pass') updateSafeSurrenderPassCounter(state, owner, false);
    return picked;
  }

  tiedBest[0].aiEvaluation = { ...(tiedBest[0].aiEvaluation ?? {}), chosenAction: true, utilityChosenReason: tiedBest[0].aiEvaluation?.utilityReason ?? tiedBest[0].aiEvaluation?.reason ?? 'first best action' };
  if (owner === 'enemy' && tiedBest[0]?.type !== 'pass') updateSafeSurrenderPassCounter(state, owner, false);
  return tiedBest[0];
}
