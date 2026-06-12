import { GENERATED_UNIT_ART, getGeneratedGruntArtForSource } from '../data/generatedUnitArt.js';
import { ACTIVE_EFFECT_VARIANTS } from './effectVariantRegistry.generated.js';

const BOARD_SIZE = 9;
const ENEMY_ROW = [0, 1, 2];
const PLAYER_ROW = [6, 7, 8];
const HERO_START_HP = 12;
const SWARM_ALPHA_AURA_EFFECT_ID = 'adjacent_allies_atk_plus_1_ignore_armor_1';
const WARDEN_SELF_FRICTION_EFFECT_ID = 'warden_defensive_friction_self';
const WARDEN_SPEARWALL_EFFECT_ID = 'warden_defensive_friction_adjacent';
const WARDEN_FRICTION_CAP = 1;
const FUNERAL_PYRE_TRIGGER_CAP = 2;
export const RUNNER_OPEN_LANE_HERO_BONUS = 2;

function hasSwarmAlphaAura(unit) {
  return unit?.effectId === SWARM_ALPHA_AURA_EFFECT_ID;
}
export const MAX_TURNS = 24;
export const STARTING_HAND_SIZE = 4;
export const MAX_OPENING_MULLIGAN_CARDS = 2;


function resolveHeroHpTiebreakWinner(state, endingReason, resolvedByKey) {
  if (state.playerHP > state.enemyHP) state.winner = 'player';
  else if (state.enemyHP > state.playerHP) state.winner = 'enemy';
  else state.winner = 'draw';

  state.endingReason = endingReason;
  state[resolvedByKey] = state.winner === 'draw' ? 'equal-hero-hp' : 'remaining-hero-hp';
  return state.winner;
}

export function completeActionOpportunity(state, owner) {
  if (!state || (owner !== 'player' && owner !== 'enemy')) return;
  ensureLanePlayBlocks(state);
  const blockKey = owner === 'player' ? 'playerLanePlayBlockedThisTurn' : 'enemyLanePlayBlockedThisTurn';
  state[blockKey] = [false, false, false];
}

export function recordPassAction(state = null, owner = null) {
  completeActionOpportunity(state, owner);
  // PASS no longer feeds any counter; dead games are resolved by board/resource state.
}

function recordProgressAction() {
  // Meaningful-action tracking is no longer counter-based.
}

function ownerHasReachableEmptySlot(state, owner) {
  const row = getRowForOwner(owner);
  if (row.some((index) => state.board[index] === null)) return true;

  const simulation = cloneStateForDeadGameCheck(state);
  const seen = new Set();
  const startingOccupiedSlots = row.filter((index) => simulation.board[index]?.owner === owner).length;

  for (let round = 0; round < 20; round += 1) {
    const snapshot = createDeadGameCombatSnapshot(simulation);
    if (seen.has(snapshot)) return false;
    seen.add(snapshot);
    resolveCombat(simulation);
    const occupiedSlots = row.filter((index) => simulation.board[index]?.owner === owner).length;
    if (occupiedSlots < startingOccupiedSlots) return true;
    if (simulation.winner) return false;
  }

  return false;
}

function ownerHasReachableUnitPlacement(state, owner) {
  return getRowForOwner(owner).some((index) => (
    state.board[index] === null || state.board[index]?.owner === owner
  ));
}

function ownerHasPotentialUnitCard(state, owner, predicate = () => true) {
  if (!ownerHasReachableUnitPlacement(state, owner)) return false;
  const side = owner === 'player' ? state.player : state.enemy;
  return [...(side?.hand ?? []), ...(side?.deck ?? [])]
    .some((card) => card?.type === 'unit' && predicate(card));
}

function unitCardCanUnlockOutcome(card, state, owner) {
  return getRowForOwner(owner).some((index) => {
    if (state.board[index] && state.board[index]?.owner !== owner) return false;
    const simulation = cloneStateForDeadGameCheck(state);
    simulation.board[index] = createBoardUnitFromCard(card, owner);
    return canCombatEverChangeHeroHp(simulation);
  });
}

function ownerCanReachFriendlyUnit(state, owner) {
  return getRowForOwner(owner).some((index) => state.board[index]?.owner === owner)
    || ownerHasPotentialUnitCard(state, owner);
}

function ownerCanReachAttackingUnit(state, owner) {
  return getRowForOwner(owner).some((index) => (
    state.board[index]?.owner === owner && getUnitAttack(state.board[index]) > 0
  )) || ownerHasPotentialUnitCard(state, owner, (card) => (card.attack ?? 0) > 0);
}

function applyingEffectCanUnlockOutcome(state, owner, effectId) {
  const simulation = cloneStateForDeadGameCheck(state);
  const before = createDeadGameCombatSnapshot(simulation);
  const playerHP = simulation.playerHP;
  const enemyHP = simulation.enemyHP;
  applyEffectById(simulation, owner, effectId);
  return createDeadGameCombatSnapshot(simulation) !== before
    && (simulation.playerHP !== playerHP
      || simulation.enemyHP !== enemyHP
      || canCombatEverChangeHeroHp(simulation));
}

function effectCanEnableOutcome(state, owner, effectId) {
  const simulation = cloneStateForDeadGameCheck(state);
  applyEffectById(simulation, owner, effectId);
  return canCombatEverChangeHeroHp(simulation);
}

function cardCanRealisticallyAffectOutcome(card, state, owner, visitedCardIds = new Set()) {
  if (!card) return false;

  if (card.type === 'unit') {
    if (!ownerHasReachableUnitPlacement(state, owner)) return false;
    if (unitCardCanUnlockOutcome(card, state, owner)) return true;
    return [
      'lane_empty_bonus_damage',
      'on_play_lane_damage_1',
      'death_damage_enemy_hero_1',
      'combat_death_damage_enemy_lane_1',
      'on_death_summon_grunt',
      'combat_death_summon_grunt',
      'leech_heal_hero_on_attack',
      'rotcaller_adjacent_death_atk_1',
      'combat_death_damage_both_heroes_1',
      'adjacent_allies_atk_plus_1_ignore_armor_1',
      'gain_atk_when_damaged',
      'wounded_atk_plus_1',
      'can_hit_any_lane',
      'opposing_lane_atk_plus_1',
    ].includes(card.effectId);
  }

  const friendlyUnits = getRowForOwner(owner).map((index) => state.board[index]).filter(Boolean);
  const enemyOwner = getOpponentOwner(owner);
  const enemyUnits = getRowForOwner(enemyOwner).map((index) => state.board[index]).filter(Boolean);
  const friendlyEmptySlotIsReachable = ownerHasReachableEmptySlot(state, owner);
  const friendlyUnitIsReachable = ownerCanReachFriendlyUnit(state, owner);
  const enemyUnitIsReachable = ownerCanReachFriendlyUnit(state, enemyOwner);
  const friendlyAttackerIsReachable = ownerCanReachAttackingUnit(state, owner);
  const friendlyFallenUnits = (owner === 'player' ? state.player.fallen : state.enemy.fallen)
    .some((entry) => entry?.card?.type === 'unit'
      && cardCanRealisticallyAffectOutcome(entry.card, state, owner, visitedCardIds));

  switch (card.effectId) {
    case 'aggro_buff_all_atk_2':
    case 'buff_all_atk_1':
      return effectCanEnableOutcome(state, owner, card.effectId);
    case 'heal_1_atk_1_draw_on_kill_this_turn':
      return friendlyAttackerIsReachable;
    case 'quick_strike':
    case 'swap_adjacent_then_resolve':
      return friendlyAttackerIsReachable;
    case 'ignore_armor_next_attack':
      return enemyUnitIsReachable && friendlyAttackerIsReachable;
    case 'damage_all_enemies_1_ignore_armor':
      return enemyUnits.length > 0 && applyingEffectCanUnlockOutcome(state, owner, card.effectId);
    case 'control_enemy_unit_this_turn':
      return enemyUnits.some((unit) => getUnitAttack(unit) > 0);
    case 'swap_any_two_units': {
      const ownersWithTwoUnits = ['player', 'enemy']
        .some((unitOwner) => state.board.filter((unit) => unit?.owner === unitOwner).length >= 2);
      return ownersWithTwoUnits;
    }
    case 'swap_adjacent_enemy_units': {
      const opponentRow = getRowForOwner(enemyOwner);
      return opponentRow.some((index, rowPosition) => (
        rowPosition < opponentRow.length - 1
        && state.board[index]?.owner === enemyOwner
        && state.board[opponentRow[rowPosition + 1]]?.owner === enemyOwner
      ));
    }
    case 'summon_grunt_empty_slot':
    case 'grave_call':
    case 'fill_empty_slots_0_1':
      return friendlyEmptySlotIsReachable;
    case 'funeral_pyre':
      return friendlyUnits.length > 0 && effectCanEnableOutcome(state, owner, card.effectId);
    case 'revive_friendly_1hp':
      return friendlyEmptySlotIsReachable && friendlyFallenUnits;
    case 'infect_damage_1_opposite_ally_atk_1':
      return enemyUnitIsReachable;
    case 'destroy_friendly_draw_1':
    case 'return_friendly_draw_1': {
      if (!friendlyUnitIsReachable || visitedCardIds.has(card.id)) return false;
      const nextVisitedCardIds = new Set(visitedCardIds).add(card.id);
      return (owner === 'player' ? state.player.deck : state.enemy.deck)
        .some((deckCard) => cardCanRealisticallyAffectOutcome(deckCard, state, owner, nextVisitedCardIds));
    }
    case 'enemy_up_to_2_atk_minus_1':
    case 'enemy_all_atk_minus_1':
    case 'enemy_lane_atk_minus_1':
    case 'buff_all_armor_1':
    case 'heal_all_1':
    case 'cannot_drop_below_1_this_turn':
    case 'temp_armor_1':
    case 'heal_2':
    case 'heal_3':
    case 'adjacent_allies_temp_armor_1':
      return false;
    case 'swap_leftmost_adjacent_enemies': {
      const simulation = cloneStateForDeadGameCheck(state);
      if (!applyLeftmostAdjacentEnemySwap(simulation, owner)) return false;
      return canCombatEverChangeHeroHp(simulation);
    }
    case 'immune_move_disable_this_turn':
    case 'friendly_immovable_this_turn':
    case 'block_enemy_effect_cards_until_combat':
      return false;
    default:
      return false;
  }
}

function ownerHasMeaningfulRemainingCard(state, owner) {
  const side = owner === 'player' ? state.player : state.enemy;
  return [...(side?.hand ?? []), ...(side?.deck ?? [])]
    .some((card) => cardCanRealisticallyAffectOutcome(card, state, owner));
}

function ownerHasMeaningfulSwapAction(state, owner) {
  const row = getRowForOwner(owner);
  const occupied = row.filter((index) => state.board[index]?.owner === owner);
  if (occupied.length < 2) return false;

  for (let i = 0; i < occupied.length - 1; i += 1) {
    for (let j = i + 1; j < occupied.length; j += 1) {
      const simulation = cloneStateForDeadGameCheck(state);
      const temp = simulation.board[occupied[i]];
      simulation.board[occupied[i]] = simulation.board[occupied[j]];
      simulation.board[occupied[j]] = temp;
      if (canCombatEverChangeHeroHp(simulation)) return true;
    }
  }

  return false;
}

function cloneStateForDeadGameCheck(state) {
  return JSON.parse(JSON.stringify({
    ...state,
    winner: null,
    endingReason: null,
  }));
}

function createDeadGameCombatSnapshot(state) {
  return JSON.stringify({
    playerHP: state.playerHP,
    enemyHP: state.enemyHP,
    board: state.board.map((unit) => {
      if (!unit) return null;
      return {
        owner: unit.owner,
        id: unit.cardId ?? unit.id,
        hp: unit.hp,
        maxHp: unit.maxHp,
        attack: unit.attack,
        armor: unit.armor,
        effectId: unit.effectId,
      };
    }),
  });
}

function canCombatEverChangeHeroHp(state, maxCombatRounds = 20) {
  const simulation = cloneStateForDeadGameCheck(state);
  const seen = new Set();

  for (let round = 0; round < maxCombatRounds; round += 1) {
    const snapshot = createDeadGameCombatSnapshot(simulation);
    if (seen.has(snapshot)) return false;
    seen.add(snapshot);

    const playerHP = simulation.playerHP;
    const enemyHP = simulation.enemyHP;
    resolveCombat(simulation);

    if (simulation.playerHP !== playerHP || simulation.enemyHP !== enemyHP) return true;
    if (simulation.winner) return true;
  }

  return false;
}

export function battleCanRealisticallyChangeOutcome(state) {
  if (!state || state.winner) return false;
  if (canCombatEverChangeHeroHp(state)) return true;
  if (ownerHasMeaningfulRemainingCard(state, 'player') || ownerHasMeaningfulRemainingCard(state, 'enemy')) return true;
  return ownerHasMeaningfulSwapAction(state, 'player') || ownerHasMeaningfulSwapAction(state, 'enemy');
}

export function resolveImmediateNoProgressWinner(state) {
  if (!state || state.winner) return state?.winner ?? null;
  if (battleCanRealisticallyChangeOutcome(state)) return null;

  return resolveHeroHpTiebreakWinner(state, 'no-progress-deadlock', 'noProgressResolvedBy');
}

export function resolveNoProgressDeadlockWinner(state) {
  return resolveImmediateNoProgressWinner(state);
}

export function resolveImmediateResourceExhaustionWinner(state) {
  if (!state || state.winner) return state?.winner ?? null;

  const ownerIsExhaustedAndBehind = (owner) => {
    const side = owner === 'player' ? state.player : state.enemy;
    const opponentHp = owner === 'player' ? state.enemyHP : state.playerHP;
    const ownerHp = owner === 'player' ? state.playerHP : state.enemyHP;
    return (side?.hand?.length ?? 0) === 0
      && (side?.deck?.length ?? 0) === 0
      && !state.board.some((unit) => unit?.owner === owner)
      && ownerHp < opponentHp;
  };

  if (ownerIsExhaustedAndBehind('player')) state.winner = 'enemy';
  else if (ownerIsExhaustedAndBehind('enemy')) state.winner = 'player';
  else return null;

  state.endingReason = 'resource_exhaustion';
  return state.winner;
}

function getRowForOwner(owner) {
  return owner === 'player' ? PLAYER_ROW : ENEMY_ROW;
}

function getOpponentOwner(owner) {
  return owner === 'player' ? 'enemy' : 'player';
}

function ensureEffectCardBlocks(state) {
  if (!state.effectCardsBlockedUntilCombat) {
    state.effectCardsBlockedUntilCombat = { player: false, enemy: false };
  }
}

export function isEffectCardBlockedForOwner(state, owner) {
  if (!state || (owner !== 'player' && owner !== 'enemy')) return false;
  ensureEffectCardBlocks(state);
  return Boolean(state.effectCardsBlockedUntilCombat[owner]);
}

export function canPlayEffectCard(state, owner, card = null) {
  if (!state || state.winner) return { ok: false, reason: 'Battle is over' };
  if (card?.type === 'unit') return { ok: false, reason: 'Unit cards must be placed on board' };
  if (isEffectCardBlockedForOwner(state, owner)) {
    return { ok: false, reason: 'You cannot play effect cards.' };
  }
  return { ok: true };
}

function ensureLanePlayBlocks(state) {
  if (!state.enemyLanePlayBlockedThisTurn) state.enemyLanePlayBlockedThisTurn = [false, false, false];
  if (!state.playerLanePlayBlockedThisTurn) state.playerLanePlayBlockedThisTurn = [false, false, false];
}

function isLanePlayBlockedForOwner(state, owner, boardIndex) {
  ensureLanePlayBlocks(state);
  const lane = boardIndex % 3;
  if (owner === 'enemy') return Boolean(state.enemyLanePlayBlockedThisTurn[lane]);
  if (owner === 'player') return Boolean(state.playerLanePlayBlockedThisTurn[lane]);
  return false;
}

function createBoardUnitFromCard(card, owner, cardIdOverride = null) {
  const boardUnit = {
    ...card,
    cardId: cardIdOverride ?? card.id,
    owner,
    maxHp: card.hp,
  };
  return boardUnit;
}

function createCardFromBoardUnit(unit) {
  const card = { ...unit };
  delete card.owner;
  delete card.cardId;
  delete card.maxHp;
  card.id = unit.id ?? unit.cardId;
  card.hp = unit.maxHp ?? unit.hp;
  return card;
}

function recordFallenUnit(state, unit, reason = 'damage-death') {
  if (!unit || unit.temporaryFloodToken) return false;
  const side = unit.owner === 'player' ? state.player : state.enemy;
  state.nextFallenSequence = (state.nextFallenSequence ?? 0) + 1;
  side.fallen.push({
    card: createCardFromBoardUnit(unit),
    sequence: state.nextFallenSequence,
    reason,
    combat: reason === 'combat-death',
  });
  return true;
}

function findNewestReviveableFallenIndex(side) {
  for (let index = side.fallen.length - 1; index >= 0; index -= 1) {
    if (side.fallen[index]?.card?.type === 'unit') return index;
  }
  return -1;
}

function returnBoardUnitToHand(side, unit) {
  if (!unit || unit.temporaryFloodToken) return false;
  side.hand.push(createCardFromBoardUnit(unit));
  return true;
}

function removeDefeatedUnits(state, boardIndexes) {
  cleanupDefeatedUnitsWithTriggers(state, boardIndexes);
}

function cleanupAllDefeatedUnitsWithTriggers(state, options = {}) {
  cleanupDefeatedUnitsWithTriggers(state, [...ENEMY_ROW, ...PLAYER_ROW], options);
}

export function resolveTurnCapWinner(state, turnsCompleted, maxTurns = MAX_TURNS) {
  if (!state || state.winner || turnsCompleted < maxTurns) return state?.winner ?? null;
  return resolveHeroHpTiebreakWinner(state, 'turn-cap', 'turnCapResolvedBy');
}

function clampHeroHpAndResolveWinner(state) {
  const rawPlayerHP = state.playerHP;
  const rawEnemyHP = state.enemyHP;
  const playerDead = rawPlayerHP <= 0;
  const enemyDead = rawEnemyHP <= 0;

  state.heroDeathResolution = {
    rawPlayerHP,
    rawEnemyHP,
    simultaneousLethal: playerDead && enemyDead,
    resolvedBy: null,
  };

  if (playerDead || enemyDead) {
    if (playerDead && enemyDead) {
      if (rawPlayerHP > rawEnemyHP) state.winner = 'player';
      else if (rawEnemyHP > rawPlayerHP) state.winner = 'enemy';
      else state.winner = 'draw';
      state.heroDeathResolution.resolvedBy = state.winner === 'draw'
        ? 'equal-raw-hero-hp'
        : 'higher-raw-hero-hp';
    } else {
      state.winner = playerDead ? 'enemy' : 'player';
      state.heroDeathResolution.resolvedBy = 'single-hero-lethal';
    }
  }

  state.playerHP = Math.max(0, rawPlayerHP);
  state.enemyHP = Math.max(0, rawEnemyHP);
}

function finalizeImmediateLaneCombat(state) {
  cleanupAllDefeatedUnitsWithTriggers(state, { combat: true });
  delete state.funeralPyreThisCombat;

  clampHeroHpAndResolveWinner(state);
}



function beginCombatWindow(state) {
  state.nextCombatId = (state.nextCombatId ?? 0) + 1;
  state.activeCombatId = state.nextCombatId;
  return state.activeCombatId;
}

function endCombatWindow(state, combatId) {
  state.board.forEach((unit) => {
    if (!unit) return;
    if (unit.bruiserPendingAttackBonusUsedCombatId === combatId) {
      delete unit.bruiserPendingAttackBonus;
      delete unit.bruiserPendingAttackBonusCombatId;
      delete unit.bruiserPendingAttackBonusUsedCombatId;
    }
  });
  if (state.activeCombatId === combatId) delete state.activeCombatId;
}

function getAvailableBruiserPendingAttackBonus(state, unit) {
  if (!unit || unit.effectId !== 'gain_atk_when_damaged') return 0;
  if (unit.bruiserPendingAttackBonusCombatId === state.activeCombatId) return 0;
  return Math.min(1, Math.max(0, unit.bruiserPendingAttackBonus ?? 0));
}

function markBruiserPendingAttackBonusUsed(state, unit) {
  if (getAvailableBruiserPendingAttackBonus(state, unit) <= 0) return;
  unit.bruiserPendingAttackBonusUsedCombatId = state.activeCombatId;
  const boardUnit = Number.isInteger(unit.__index) ? state.board[unit.__index] : null;
  if (boardUnit?.effectId === 'gain_atk_when_damaged') {
    boardUnit.bruiserPendingAttackBonusUsedCombatId = state.activeCombatId;
  }
}

function getSystemOverrideAdjacentAllyIndexes(unit, unitIndex) {
  if (!unit) return [];
  const rowStart = unit.owner === 'player' ? 6 : 0;
  const lane = unitIndex % 3;
  const indexes = [];
  if (lane > 0) indexes.push(rowStart + lane - 1);
  if (lane < 2) indexes.push(rowStart + lane + 1);
  return indexes;
}

function createSystemOverrideCombatModifier({ type, amount = 0, source, label, feedback = 'attacker' }) {
  const modifier = { type, amount, source, label };
  if (feedback !== 'attacker') modifier.feedback = feedback;
  return modifier;
}

function getSystemOverrideAttackWithCombatBonuses(state, unit, unitIndex) {
  const combatModifiers = [];
  if (!unit) return { attack: 0, combatModifiers };
  let attack = unit.effectId === 'cannot_attack' ? 0 : getUnitAttack(unit, { excludeCombatId: state.activeCombatId });
  const bruiserPendingAttack = getAvailableBruiserPendingAttackBonus(state, unit);
  if (bruiserPendingAttack > 0) {
    markBruiserPendingAttackBonusUsed(state, unit);
    combatModifiers.push(createSystemOverrideCombatModifier({
      type: 'attack-bonus',
      amount: bruiserPendingAttack,
      source: 'gain_atk_when_damaged',
      label: `+${bruiserPendingAttack} ATK`,
    }));
  }
  if (unit.effectId === 'opposing_lane_atk_plus_1') {
    const opposingIndex = unit.owner === 'player' ? unitIndex - 6 : unitIndex + 6;
    if (state.board[opposingIndex]?.owner === getOpponentOwner(unit.owner)) {
      attack += 1;
      combatModifiers.push(createSystemOverrideCombatModifier({
        type: 'attack-bonus',
        amount: 1,
        source: 'opposing_lane_atk_plus_1',
        label: '+1 ATK',
      }));
    }
  }
  if (unit.effectId === 'empty_adjacent_bonus_atk') {
    const hasEmptyAdjacent = getSystemOverrideAdjacentAllyIndexes(unit, unitIndex).some((idx) => state.board[idx] === null);
    if (hasEmptyAdjacent) {
      attack += 1;
      combatModifiers.push(createSystemOverrideCombatModifier({
        type: 'attack-bonus',
        amount: 1,
        source: 'empty_adjacent_bonus_atk',
        label: '+1 ATK',
      }));
    }
  }
  return { attack: Math.max(0, attack), combatModifiers };
}

function getSystemOverrideAuraBonusAttack(state, unit, unitIndex) {
  const combatModifiers = [];
  if (!unit) return { bonus: 0, combatModifiers };
  const bonus = getSystemOverrideAdjacentAllyIndexes(unit, unitIndex).reduce((total, index) => (
    total + (hasSwarmAlphaAura(state.board[index]) ? 1 : 0)
  ), 0);
  if (bonus > 0) {
    combatModifiers.push(createSystemOverrideCombatModifier({
      type: 'attack-bonus',
      amount: bonus,
      source: SWARM_ALPHA_AURA_EFFECT_ID,
      label: `+${bonus} ATK`,
    }));
  }
  return { bonus, combatModifiers };
}

function getSystemOverrideAttackProfile(state, unit, unitIndex) {
  const { attack, combatModifiers } = getSystemOverrideAttackWithCombatBonuses(state, unit, unitIndex);
  const { bonus, combatModifiers: auraCombatModifiers } = getSystemOverrideAuraBonusAttack(state, unit, unitIndex);
  return {
    attack: attack + bonus,
    combatModifiers: [...combatModifiers, ...auraCombatModifiers],
  };
}

function resolveCombatWithRawHeroDamage(state, callback) {
  const previousPreserveRawHeroHP = state.preserveRawHeroHPUntilCombatFinalization;
  state.preserveRawHeroHPUntilCombatFinalization = true;
  const result = callback();
  if (previousPreserveRawHeroHP) {
    state.preserveRawHeroHPUntilCombatFinalization = previousPreserveRawHeroHP;
  } else {
    delete state.preserveRawHeroHPUntilCombatFinalization;
  }
  return result;
}

function cloneBoardForCombatPresentation(state) {
  return state.board.map((unit) => (unit ? { ...unit } : null));
}

function cloneFuneralPyreForCombatPresentation(state) {
  return state.funeralPyreThisCombat
    ? JSON.parse(JSON.stringify(state.funeralPyreThisCombat))
    : null;
}

function captureImmediateCombatPresentationSnapshot(state) {
  return {
    board: cloneBoardForCombatPresentation(state),
    playerHP: state.playerHP,
    enemyHP: state.enemyHP,
    funeralPyreThisCombat: cloneFuneralPyreForCombatPresentation(state),
  };
}

function resolveImmediateLaneCombat(state, lane) {
  const combatSnapshot = captureImmediateCombatPresentationSnapshot(state);
  const combatId = beginCombatWindow(state);
  const combatEvents = resolveCombatLane(state, lane);
  finalizeImmediateLaneCombat(state);
  endCombatWindow(state, combatId);
  return { combatEvents, combatSnapshot };
}


function resolveImmediateSystemOverrideAttack(state, boardIndex) {
  const combatSnapshot = captureImmediateCombatPresentationSnapshot(state);
  const attacker = state.board[boardIndex];
  if (!attacker || attacker.hp <= 0) return { combatEvents: [], combatSnapshot };

  const { attack } = getSystemOverrideAttackProfile(state, attacker, boardIndex);
  const targetSide = attacker.owner;
  const event = {
    lane: boardIndex % 3,
    attackerSide: attacker.owner,
    targetType: 'hero',
    targetSide,
    damage: attack,
    openLane: false,
    lethal: false,
    controlledAttackFeedback: { label: 'CONTROLLED\nOVERRIDE' },
    selfDamageFeedback: { targetType: 'unit', index: boardIndex, amount: 1, label: 'OVERRIDE -1' },
  };
  Object.defineProperties(event, {
    attackerIndex: { value: boardIndex, enumerable: false },
    targetIndex: { value: null, enumerable: false },
    interceptOriginalTargetIndex: { value: null, enumerable: false },
  });

  damageHero(state, targetSide, attack);
  applyDamageToUnit(state, boardIndex, 1);
  triggerLeechHealsFromAttackEvents(state, [event]);
  cleanupDefeatedUnitsWithTriggers(state, [boardIndex], { combat: true });
  clampHeroHpAndResolveWinner(state);

  return { combatEvents: [event], combatSnapshot };
}

function ensureFuneralPyreState(state) {
  state.funeralPyreThisCombat ??= {
    player: { active: false, triggers: 0 },
    enemy: { active: false, triggers: 0 },
  };
  state.funeralPyreThisCombat.player ??= { active: false, triggers: 0 };
  state.funeralPyreThisCombat.enemy ??= { active: false, triggers: 0 };
  return state.funeralPyreThisCombat;
}

function damageHero(state, owner, amount) {
  if (!state || amount <= 0) return;
  const hpKey = owner === 'player' ? 'playerHP' : 'enemyHP';
  state[hpKey] = state.preserveRawHeroHPUntilCombatFinalization
    ? state[hpKey] - amount
    : Math.max(0, state[hpKey] - amount);
}

function healHero(state, owner, amount) {
  if (!state || amount <= 0) return 0;
  const hpKey = owner === 'player' ? 'playerHP' : 'enemyHP';
  const maxKey = owner === 'player' ? 'playerMaxHP' : 'enemyMaxHP';
  const maxHp = Number.isFinite(state[maxKey]) ? state[maxKey] : HERO_START_HP;
  const before = state[hpKey];
  state[hpKey] = Math.min(maxHp, state[hpKey] + amount);
  return Math.max(0, state[hpKey] - before);
}

function createGruntCard(id, name = 'Grunt', attack = 1, hp = 1, artMetadata = GENERATED_UNIT_ART.swarmGrunt) {
  return {
    id,
    name,
    type: 'unit',
    attack,
    hp,
    armor: 0,
    effectId: null,
    ...artMetadata,
  };
}

function summonGruntAt(state, index, owner, idPrefix = 'summoned_grunt', artMetadata = GENERATED_UNIT_ART.swarmGrunt) {
  if (state.board[index] !== null) return false;
  const tokenId = `${owner}_${idPrefix}_${index}_${state.nextTokenId ?? 0}`;
  state.nextTokenId = (state.nextTokenId ?? 0) + 1;
  state.board[index] = createBoardUnitFromCard(createGruntCard(tokenId, 'Grunt', 1, 1, artMetadata), owner);
  return true;
}

function triggerAdjacentRotcallers(state, deadIndex, deadOwner) {
  const row = getRowForOwner(deadOwner);
  if (!row.includes(deadIndex)) return;
  const lane = deadIndex % 3;
  const adjacentIndexes = [];
  if (lane > 0) adjacentIndexes.push(row[lane - 1]);
  if (lane < 2) adjacentIndexes.push(row[lane + 1]);
  adjacentIndexes.forEach((index) => {
    const rotcaller = state.board[index];
    if (!rotcaller || rotcaller.owner !== deadOwner || rotcaller.hp <= 0) return;
    if (rotcaller.effectId !== 'rotcaller_adjacent_death_atk_1') return;
    if (rotcaller.rotcallerTriggeredThisCombat) return;
    rotcaller.rotcallerTriggeredThisCombat = true;
    rotcaller.tempAttackMod = (rotcaller.tempAttackMod ?? 0) + 1;
    state.rotcallerCombatTriggers = (state.rotcallerCombatTriggers ?? 0) + 1;
  });
}

function dealCombatDeathLaneDamage(state, deadIndex, deadOwner, telemetryKey) {
  const enemyOwner = getOpponentOwner(deadOwner);
  const opposingIndex = deadOwner === 'player' ? deadIndex - 6 : deadIndex + 6;
  const opposingUnit = state.board[opposingIndex];
  if (opposingUnit?.owner !== enemyOwner) return false;
  state[telemetryKey] = (state[telemetryKey] ?? 0) + 1;
  applyDamageToUnit(state, opposingIndex, 1);
  cleanupDefeatedUnitsWithTriggers(state, [opposingIndex], { combat: true });
  return true;
}

function triggerFuneralPyre(state, deadIndex, deadOwner) {
  const funeralState = ensureFuneralPyreState(state)[deadOwner];
  if (!funeralState?.active || funeralState.triggers >= FUNERAL_PYRE_TRIGGER_CAP) return;
  funeralState.triggers += 1;
  state.funeralPyreCombatTriggers = (state.funeralPyreCombatTriggers ?? 0) + 1;
  dealCombatDeathLaneDamage(state, deadIndex, deadOwner, 'funeralPyreLaneDamageTriggers');
}

function triggerUnitDeathEffects(state, index, unit, options = {}) {
  if (!unit || unit.temporaryFloodToken) return;
  const owner = unit.owner;
  const enemyOwner = getOpponentOwner(owner);
  const isCombatDeath = Boolean(options.combat);

  if (isCombatDeath) {
    triggerAdjacentRotcallers(state, index, owner);
    triggerFuneralPyre(state, index, owner);
  }

  if (unit.effectId === 'death_damage_enemy_hero_1') {
    damageHero(state, enemyOwner, 1);
  }

  if (isCombatDeath && unit.effectId === 'combat_death_damage_enemy_lane_1') {
    dealCombatDeathLaneDamage(state, index, owner, 'combatOnlyDeathLaneDamageTriggers');
  }

  if (isCombatDeath && unit.effectId === 'combat_death_damage_both_heroes_1') {
    state.combatOnlyDeathHeroTriggers = (state.combatOnlyDeathHeroTriggers ?? 0) + 1;
    damageHero(state, 'player', 1);
    damageHero(state, 'enemy', 1);
  }

  if (unit.effectId === 'on_death_summon_grunt' && state.board[index] === null) {
    summonGruntAt(state, index, owner, 'death_grunt', getGeneratedGruntArtForSource(unit));
  }

  if (isCombatDeath && unit.effectId === 'combat_death_summon_grunt' && state.board[index] === null) {
    state.combatOnlyDeathSummons = (state.combatOnlyDeathSummons ?? 0) + 1;
    summonGruntAt(state, index, owner, 'combat_death_grunt', getGeneratedGruntArtForSource(unit));
  }
}

function cleanupDefeatedUnitsWithTriggers(state, boardIndexes, options = {}) {
  boardIndexes.forEach((index) => {
    const unit = state.board[index];
    if (!unit || unit.hp > 0) return;
    state.board[index] = null;
    if (!unit.temporaryFloodToken) {
      recordFallenUnit(state, unit, options.combat ? 'combat-death' : 'damage-death');
      triggerUnitDeathEffects(state, index, unit, options);
    }
  });
}

function applyDamageToUnit(state, index, amount) {
  const unit = state.board[index];
  if (!unit || amount <= 0) return;
  unit.hp -= amount;

  const minOneProtection = Boolean(state.cannotDropBelowOneThisTurn?.[unit.owner]);
  if (minOneProtection && unit.hp < 1) {
    unit.hp = 1;
  }

  if (unit.hp > 0 && unit.effectId === 'gain_atk_when_damaged') {
    unit.bruiserPendingAttackBonus = 1;
    unit.bruiserPendingAttackBonusCombatId = state.activeCombatId ?? null;
    delete unit.bruiserPendingAttackBonusUsedCombatId;
  }
}

export function getUnitAttack(unit, options = {}) {
  if (!unit) return 0;
  const baseAttack = unit.attack ?? 0;
  const tempAttack = unit.tempAttackMod ?? 0;
  const woundedAttack = unit.effectId === 'wounded_atk_plus_1' && unit.hp < (unit.maxHp ?? unit.hp) ? 1 : 0;
  const bruiserPendingAttack = unit.effectId === 'gain_atk_when_damaged'
    && unit.bruiserPendingAttackBonusCombatId !== options.excludeCombatId
    ? Math.min(1, Math.max(0, unit.bruiserPendingAttackBonus ?? 0))
    : 0;
  return Math.max(0, baseAttack + tempAttack + woundedAttack + bruiserPendingAttack);
}

export function getUnitArmor(unit) {
  if (!unit) return 0;
  const baseArmor = unit.armor ?? 0;
  const tempArmor = unit.tempArmorMod ?? 0;
  return Math.max(0, baseArmor + tempArmor);
}

function getAdjacentBoardAllyIndexes(unit, boardIndex) {
  if (!unit || !Number.isInteger(boardIndex)) return [];
  const row = getRowForOwner(unit.owner);
  if (!row.includes(boardIndex)) return [];

  const lane = boardIndex % 3;
  const indexes = [];
  if (lane > 0) indexes.push(row[lane - 1]);
  if (lane < 2) indexes.push(row[lane + 1]);
  return indexes;
}

function getOpposingLaneIndex(unit, boardIndex) {
  if (!unit || !Number.isInteger(boardIndex)) return null;
  if (!getRowForOwner(unit.owner).includes(boardIndex)) return null;
  return unit.owner === 'player' ? boardIndex - 6 : boardIndex + 6;
}

function getBoardDefensiveFrictionPenalty(state, defenderIndex) {
  const defender = state?.board?.[defenderIndex];
  if (!defender) return 0;

  let penalty = 0;
  if (defender.effectId === WARDEN_SELF_FRICTION_EFFECT_ID) penalty += 1;

  getAdjacentBoardAllyIndexes(defender, defenderIndex).forEach((index) => {
    const adjacentAlly = state.board[index];
    if (adjacentAlly?.owner === defender.owner && adjacentAlly.effectId === WARDEN_SPEARWALL_EFFECT_ID) {
      penalty += 1;
    }
  });

  return Math.min(WARDEN_FRICTION_CAP, penalty);
}

export function getEffectiveBoardAttack(state, boardIndex) {
  const unit = state?.board?.[boardIndex];
  if (!unit) return 0;

  let attack = getUnitAttack(unit);

  if (unit.effectId === 'opposing_lane_atk_plus_1') {
    const opposingIndex = getOpposingLaneIndex(unit, boardIndex);
    if (state.board[opposingIndex]?.owner === getOpponentOwner(unit.owner)) attack += 1;
  }

  if (unit.effectId === 'empty_adjacent_bonus_atk') {
    const hasEmptyAdjacent = getAdjacentBoardAllyIndexes(unit, boardIndex)
      .some((index) => state.board[index] === null);
    if (hasEmptyAdjacent) attack += 1;
  }

  const auraAttackBonus = getAdjacentBoardAllyIndexes(unit, boardIndex).reduce((total, index) => (
    total + (state.board[index]?.owner === unit.owner && hasSwarmAlphaAura(state.board[index]) ? 1 : 0)
  ), 0);
  attack += auraAttackBonus;

  const opposingIndex = getOpposingLaneIndex(unit, boardIndex);
  const defender = state.board[opposingIndex];
  if (defender?.owner === getOpponentOwner(unit.owner)) {
    attack -= getBoardDefensiveFrictionPenalty(state, opposingIndex);
  }

  return Math.max(0, attack);
}

export function getEffectiveBoardArmor(state, boardIndex) {
  const unit = state?.board?.[boardIndex];
  if (!unit) return 0;

  const auraArmorBonus = getAdjacentBoardAllyIndexes(unit, boardIndex).reduce((total, index) => (
    total + (state.board[index]?.owner === unit.owner && state.board[index]?.effectId === 'lane_armor_aura_1' ? 1 : 0)
  ), 0);

  return Math.max(0, getUnitArmor(unit) + auraArmorBonus);
}

function isMoveEffectId(effectId) {
  return effectId === 'swap_any_two_units'
    || effectId === 'swap_two_enemy_units'
    || effectId === 'swap_adjacent_enemy_units'
    || effectId === 'swap_adjacent_then_resolve'
    || effectId === 'swap_leftmost_adjacent_enemies';
}

function isDisableEffectId(effectId) {
  if (!effectId) return false;
  if (effectId === 'control_enemy_unit_this_turn' || effectId === 'cannot_attack') return true;
  return effectId.includes('disable');
}

function hasMoveDisableImmunity(state, protectedOwner, actingOwner, effectId) {
  if (getOpponentOwner(actingOwner) !== protectedOwner) return false;
  const moveBlocked = Boolean(state?.immovableThisTurn?.[protectedOwner]) && isMoveEffectId(effectId);
  const moveDisableBlocked = Boolean(state?.immuneMoveDisableThisTurn?.[protectedOwner])
    && (isMoveEffectId(effectId) || isDisableEffectId(effectId));
  return moveBlocked || moveDisableBlocked;
}

function findLeftmostAdjacentEnemyPair(state, owner) {
  const enemyOwner = getOpponentOwner(owner);
  const enemyRow = getRowForOwner(enemyOwner);
  for (let lane = 0; lane < enemyRow.length - 1; lane += 1) {
    const firstIndex = enemyRow[lane];
    const secondIndex = enemyRow[lane + 1];
    if (state.board[firstIndex]?.owner === enemyOwner && state.board[secondIndex]?.owner === enemyOwner) {
      return [firstIndex, secondIndex];
    }
  }
  return null;
}

function areSameRowAdjacentIndexes(firstIndex, secondIndex) {
  if (!Number.isInteger(firstIndex) || !Number.isInteger(secondIndex)) return false;
  if (firstIndex === secondIndex) return false;
  return Math.floor(firstIndex / 3) === Math.floor(secondIndex / 3)
    && Math.abs((firstIndex % 3) - (secondIndex % 3)) === 1;
}

function applyLeftmostAdjacentEnemySwap(state, owner) {
  const pair = findLeftmostAdjacentEnemyPair(state, owner);
  if (!pair) return false;
  const [firstIndex, secondIndex] = pair;
  const firstUnit = state.board[firstIndex];
  const secondUnit = state.board[secondIndex];
  if (hasMoveDisableImmunity(state, firstUnit.owner, owner, 'swap_leftmost_adjacent_enemies')
    || hasMoveDisableImmunity(state, secondUnit.owner, owner, 'swap_leftmost_adjacent_enemies')) {
    return false;
  }
  state.board[firstIndex] = secondUnit;
  state.board[secondIndex] = firstUnit;
  return true;
}

function canApplyEffectById(state, owner, effectId) {
  switch (effectId) {
    case 'swap_adjacent_enemy_units':
    case 'enemy_up_to_2_atk_minus_1':
      return false;
    case 'swap_leftmost_adjacent_enemies':
      return Boolean(findLeftmostAdjacentEnemyPair(state, owner))
        && !hasMoveDisableImmunity(state, getOpponentOwner(owner), owner, effectId);
    case 'adjacent_allies_temp_armor_1':
      return getAdjacentFriendlyFormationIndexes(state, owner).length > 0;
    case 'grave_call':
      return getRowForOwner(owner).some((index) => state.board[index] === null);
    case 'revive_friendly_1hp': {
      const side = owner === 'player' ? state.player : state.enemy;
      return getRowForOwner(owner).some((index) => state.board[index] === null)
        && findNewestReviveableFallenIndex(side) >= 0;
    }
    default:
      return true;
  }
}

function applyTargetedHeal(unit, amount) {
  const hpCap = Number.isFinite(unit.maxHp) ? unit.maxHp : unit.hp;
  unit.hp = Math.min(hpCap, unit.hp + amount);
}

function getLeftmostOccupiedRowIndexes(state, rowIndexes, limit) {
  return rowIndexes
    .filter((index) => state.board[index])
    .slice(0, limit);
}

function getAdjacentFriendlyFormationIndexes(state, owner) {
  const rowIndexes = getRowForOwner(owner);
  return rowIndexes.filter((index, rowPosition) => {
    if (state.board[index]?.owner !== owner) return false;
    return state.board[rowIndexes[rowPosition - 1]]?.owner === owner
      || state.board[rowIndexes[rowPosition + 1]]?.owner === owner;
  });
}

function getEffectVariantRegistryKey(state, owner, sourceCard, effectId) {
  const side = owner === 'player' ? state?.player : state?.enemy;
  const factionId = side?.factionId;
  const cardId = sourceCard?.id;
  if (!factionId || !cardId || !effectId) return null;
  return `${factionId}::${cardId}::${effectId}`;
}

function isRunBaseEffectOnlyActiveVariant(variant, effectId) {
  if (!variant || variant.baseEffectId !== effectId || variant.runBaseEffectOnly !== true) return false;
  const sequence = variant.sequence;
  return Array.isArray(sequence)
    && sequence.length === 1
    && sequence[0]?.operation === 'runBaseEffect'
    && Object.keys(sequence[0]).length === 1;
}

function getRunBaseEffectOnlyVariant(state, owner, sourceCard, effectId) {
  const registryKey = getEffectVariantRegistryKey(state, owner, sourceCard, effectId);
  if (!registryKey) return null;
  const variant = ACTIVE_EFFECT_VARIANTS[registryKey];
  return isRunBaseEffectOnlyActiveVariant(variant, effectId) ? variant : null;
}

function applyEffectById(state, owner, effectId, sourceCard = null) {
  getRunBaseEffectOnlyVariant(state, owner, sourceCard, effectId);
  switch (effectId) {
    case 'damage_all_enemies_1_ignore_armor': {
      const enemyIndexes = getRowForOwner(getOpponentOwner(owner))
        .filter((index) => state.board[index]);
      enemyIndexes.forEach((index) => {
        // Pulse Wave deals direct unit damage and intentionally bypasses armor.
        state.board[index].hp -= 1;
      });
      removeDefeatedUnits(state, enemyIndexes);
      break;
    }
    case 'heal_2':
    case 'heal_1_atk_1_draw_on_kill_this_turn':
    case 'heal_3':
    case 'temp_armor_1':
      break;
    case 'heal_all_1': {
      const friendlyIndexes = getRowForOwner(owner);
      friendlyIndexes.forEach((index) => {
        const unit = state.board[index];
        if (!unit) return;
        const hpCap = Number.isFinite(unit.maxHp) ? unit.maxHp : unit.hp;
        unit.hp = Math.min(hpCap, unit.hp + 1);
      });
      break;
    }
    case 'buff_all_atk_1':
    case 'aggro_buff_all_atk_2': {
      const attackBonus = effectId === 'aggro_buff_all_atk_2' ? 2 : 1;
      const friendlyIndexes = getRowForOwner(owner);
      friendlyIndexes.forEach((index) => {
        if (state.board[index]) {
          state.board[index].tempAttackMod = (state.board[index].tempAttackMod ?? 0) + attackBonus;
        }
      });
      break;
    }
    case 'buff_all_armor_1': {
      const friendlyIndexes = getRowForOwner(owner);
      friendlyIndexes.forEach((index) => {
        const unit = state.board[index];
        if (!unit) return;
        unit.tempArmorMod = (unit.tempArmorMod ?? 0) + 1;
      });
      break;
    }
    case 'adjacent_allies_temp_armor_1': {
      const friendlyIndexes = getAdjacentFriendlyFormationIndexes(state, owner);
      friendlyIndexes.forEach((index) => {
        const unit = state.board[index];
        if (!unit) return;
        unit.tempArmorMod = (unit.tempArmorMod ?? 0) + 1;
      });
      break;
    }
    case 'enemy_all_atk_minus_1': {
      const enemyIndexes = getLeftmostOccupiedRowIndexes(state, getRowForOwner(getOpponentOwner(owner)), 2);
      enemyIndexes.forEach((index) => {
        const enemyUnit = state.board[index];
        enemyUnit.tempAttackMod = (enemyUnit.tempAttackMod ?? 0) - 1;
      });
      break;
    }
    case 'summon_grunt_empty_slot': {
      const friendlyIndexes = getRowForOwner(owner);
      const emptySlot = friendlyIndexes.find((index) => state.board[index] === null);
      if (emptySlot === undefined) {
        break;
      }
      summonGruntAt(state, emptySlot, owner, 'summoned_grunt', getGeneratedGruntArtForSource(sourceCard));
      break;
    }
    case 'grave_call': {
      const friendlyIndexes = getRowForOwner(owner);
      const hasAlly = friendlyIndexes.some((index) => state.board[index]?.owner === owner);
      const summonLimit = hasAlly ? 1 : 2;
      let summoned = 0;
      friendlyIndexes.forEach((index) => {
        if (summoned >= summonLimit || state.board[index]) return;
        if (summonGruntAt(state, index, owner, 'grave_call_grunt', getGeneratedGruntArtForSource(sourceCard))) summoned += 1;
      });
      break;
    }
    case 'funeral_pyre': {
      const funeralState = ensureFuneralPyreState(state)[owner];
      funeralState.active = true;
      funeralState.triggers = Math.min(funeralState.triggers ?? 0, FUNERAL_PYRE_TRIGGER_CAP);
      state.funeralPyreUses = (state.funeralPyreUses ?? 0) + 1;
      break;
    }
    case 'fill_empty_slots_0_1': {
      const friendlyIndexes = getRowForOwner(owner);
      let summoned = 0;
      friendlyIndexes.forEach((index) => {
        if (summoned >= 2 || state.board[index]) return;
        state.board[index] = createBoardUnitFromCard({
          id: `${owner}_flood_token_${index}_${summoned}`,
          name: 'Token',
          type: 'unit',
          attack: 1,
          hp: 1,
          armor: 0,
          effectId: null,
          temporaryFloodToken: true,
          ...GENERATED_UNIT_ART.swarmFloodToken,
        }, owner);
        summoned += 1;
      });
      break;
    }
    // Quick Strike, Quick Fix, Jam Signal, and Control Override are targeted and handled via resolveTargetedEffectCard.
    case 'quick_strike':
    case 'enemy_up_to_2_atk_minus_1':
    case 'control_enemy_unit_this_turn':
      break;
    case 'cannot_drop_below_1_this_turn': {
      if (!state.cannotDropBelowOneThisTurn) {
        state.cannotDropBelowOneThisTurn = { player: false, enemy: false };
      }
      state.cannotDropBelowOneThisTurn[owner] = true;
      break;
    }
    case 'block_enemy_effect_cards_until_combat': {
      ensureEffectCardBlocks(state);
      state.effectCardsBlockedUntilCombat[getOpponentOwner(owner)] = true;
      break;
    }
    case 'immune_move_disable_this_turn': {
      if (!state.immuneMoveDisableThisTurn) {
        state.immuneMoveDisableThisTurn = { player: false, enemy: false };
      }
      state.immuneMoveDisableThisTurn[owner] = true;
      break;
    }
    case 'friendly_immovable_this_turn': {
      if (!state.immovableThisTurn) {
        state.immovableThisTurn = { player: false, enemy: false };
      }
      state.immovableThisTurn[owner] = true;
      break;
    }
    case 'swap_leftmost_adjacent_enemies': {
      applyLeftmostAdjacentEnemySwap(state, owner);
      break;
    }
    case 'revive_friendly_1hp': {
      const friendlyIndexes = getRowForOwner(owner);
      const emptySlot = friendlyIndexes.find((index) => state.board[index] === null);
      if (emptySlot === undefined) break;
      const side = owner === 'player' ? state.player : state.enemy;
      const reviveIndex = findNewestReviveableFallenIndex(side);
      if (reviveIndex < 0) break;
      const [{ card: reviveCard }] = side.fallen.splice(reviveIndex, 1);
      const revivedUnit = createBoardUnitFromCard(reviveCard, owner);
      revivedUnit.hp = 1;
      revivedUnit.maxHp = Number.isFinite(revivedUnit.maxHp) ? revivedUnit.maxHp : reviveCard.hp;
      state.board[emptySlot] = revivedUnit;
      break;
    }

    default:
      break;
  }
}

export function getRandomFirstActor(randomFn = Math.random) {
  const roll = typeof randomFn === 'function' ? randomFn() : Math.random();
  return roll < 0.5 ? 'player' : 'enemy';
}

export function toggleFirstActor(state) {
  if (!state) return null;
  state.firstActor = state.firstActor === 'player' ? 'enemy' : 'player';
  return state.firstActor;
}

export function createInitialBattleState(playerFactionData, enemyFactionData = playerFactionData, options = {}) {
  const playerDeck = Array.isArray(playerFactionData?.deck) ? [...playerFactionData.deck] : [];
  const enemyDeck = Array.isArray(enemyFactionData?.deck) ? [...enemyFactionData.deck] : [];
  const firstActor = options.firstActor === 'player' || options.firstActor === 'enemy'
    ? options.firstActor
    : getRandomFirstActor(options.randomFn);

  return {
    board: Array(BOARD_SIZE).fill(null),
    playerHP: HERO_START_HP,
    enemyHP: HERO_START_HP,
    playerMaxHP: HERO_START_HP,
    enemyMaxHP: HERO_START_HP,
    winner: null,
    endingReason: null,
    turnCapResolvedBy: null,
    noProgressResolvedBy: null,
    turnsCompleted: 0,
    nextFallenSequence: 0,
    firstActor,
    player: {
      factionId: playerFactionData?.id ?? 'unknown',
      factionName: playerFactionData?.name ?? 'Unknown',
      deck: playerDeck,
      hand: [],
      discard: [],
      fallen: [],
      maxHandSize: 5,
    },
    enemy: {
      factionId: enemyFactionData?.id ?? 'unknown',
      factionName: enemyFactionData?.name ?? 'Unknown',
      deck: enemyDeck,
      hand: [],
      discard: [],
      fallen: [],
      maxHandSize: 5,
    },
    cannotDropBelowOneThisTurn: {
      player: false,
      enemy: false,
    },
    effectCardsBlockedUntilCombat: {
      player: false,
      enemy: false,
    },
    immuneMoveDisableThisTurn: {
      player: false,
      enemy: false,
    },
    immovableThisTurn: {
      player: false,
      enemy: false,
    },
    enemyLanePlayBlockedThisTurn: [false, false, false],
    playerLanePlayBlockedThisTurn: [false, false, false],
    mulligan: {
      playerUsed: false,
      enemyUsed: false,
      playerReplaced: 0,
      enemyReplaced: 0,
    },
  };
}


export function shuffleDeck(deck, randomFn = Math.random) {
  if (!Array.isArray(deck)) return deck;
  const rng = typeof randomFn === 'function' ? randomFn : Math.random;
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function isOpeningMulliganWindow(state) {
  if (!state || state.winner) return false;
  if (state.turnsCompleted !== 0) return false;
  if (!Array.isArray(state.board) || state.board.some(Boolean)) return false;
  if ((state.player?.discard?.length ?? 0) > 0 || (state.enemy?.discard?.length ?? 0) > 0) return false;
  return true;
}

export function canOpeningMulligan(state, owner) {
  if (owner !== 'player' && owner !== 'enemy') return false;
  if (!isOpeningMulliganWindow(state)) return false;
  return !Boolean(state.mulligan?.[`${owner}Used`]);
}

export function performOpeningMulligan(state, owner, cardIds = [], randomFn = Math.random) {
  if (!canOpeningMulligan(state, owner)) {
    return { ok: false, reason: 'Opening mulligan is not available' };
  }

  const side = owner === 'player' ? state.player : state.enemy;
  const uniqueIds = [...new Set(Array.isArray(cardIds) ? cardIds : [])].slice(0, MAX_OPENING_MULLIGAN_CARDS);
  const replacedCards = [];

  uniqueIds.forEach((cardId) => {
    const handIndex = side.hand.findIndex((card) => card.id === cardId);
    if (handIndex < 0) return;
    const [card] = side.hand.splice(handIndex, 1);
    replacedCards.push(card);
  });

  if (replacedCards.length > 0) {
    side.deck.push(...replacedCards);
    shuffleDeck(side.deck, randomFn);
    drawCards(side, replacedCards.length);
  }

  state.mulligan ??= {};
  state.mulligan[`${owner}Used`] = true;
  state.mulligan[`${owner}Replaced`] = replacedCards.length;

  return { ok: true, type: 'opening-mulligan', replaced: replacedCards.length, cardIds: replacedCards.map((card) => card.id) };
}

function getDrawBlockedReason(sideState, requestedCount) {
  if (!sideState || requestedCount <= 0) return 'no-draw';
  if ((sideState.deck?.length ?? 0) <= 0) return 'deck-empty';
  const maxHandSize = Number.isFinite(sideState.maxHandSize) ? sideState.maxHandSize : Infinity;
  if ((sideState.hand?.length ?? 0) >= maxHandSize) return 'hand-full';
  return 'no-draw';
}

function createDrawResult(sideState, requested, drawn) {
  const blockedReason = drawn > 0 ? null : getDrawBlockedReason(sideState, requested);
  return {
    requested,
    drawn,
    blockedReason,
  };
}

export function drawCardsWithResult(sideState, count) {
  if (!sideState || count <= 0) {
    return createDrawResult(sideState, count, 0);
  }

  const drawLimit = Math.max(0, sideState.maxHandSize - sideState.hand.length);
  const cardsToDraw = Math.min(count, drawLimit, sideState.deck.length);

  for (let i = 0; i < cardsToDraw; i += 1) {
    const card = sideState.deck.shift();
    sideState.hand.push(card);
  }

  return createDrawResult(sideState, count, cardsToDraw);
}

export function drawCards(sideState, count) {
  drawCardsWithResult(sideState, count);
  return sideState;
}

function triggerLeechHealsFromAttackEvents(state, combatEvents) {
  if (!state || !Array.isArray(combatEvents)) return;

  combatEvents.forEach((event) => {
    if (event?.leechHealResolved) return;
    const attacker = state.board[event?.attackerIndex];
    if (!attacker || attacker.effectId !== 'leech_heal_hero_on_attack') return;
    Object.defineProperty(event, 'leechHealResolved', { value: true });
    const restored = healHero(state, attacker.owner, 1);
    if (restored <= 0) return;
    event.healFeedback = { targetType: 'hero', side: attacker.owner, amount: restored };
    state.leechCombatHeals = (state.leechCombatHeals ?? 0) + 1;
  });
}

function triggerQuickFixDrawsFromCombatEvents(state, combatEvents) {
  if (!state || !Array.isArray(combatEvents)) return;

  combatEvents.forEach((event) => {
    if (!event?.lethal || event.targetType !== 'unit') return;
    const attackerIndex = event.attackerIndex;
    const targetIndex = event.targetIndex;
    const attacker = state.board[attackerIndex];
    const target = state.board[targetIndex];
    if (!attacker || !target || target.hp > 0 || attacker.owner === target.owner) return;

    const pendingTriggers = Array.isArray(attacker.quickFixDrawTriggers)
      ? attacker.quickFixDrawTriggers.filter((trigger) => trigger && !trigger.triggered && trigger.owner === attacker.owner)
      : [];
    if (pendingTriggers.length === 0) return;

    const side = attacker.owner === 'player' ? state.player : state.enemy;
    pendingTriggers.forEach((trigger) => {
      if (trigger.triggered) return;
      trigger.triggered = true;
      const drawResult = drawCardsWithResult(side, 1);
      if (drawResult.drawn > 0) {
        event.quickFixDrawFeedback = {
          owner: attacker.owner,
          amount: (event.quickFixDrawFeedback?.amount ?? 0) + drawResult.drawn,
        };
      } else if (!event.quickFixDrawFeedback) {
        event.quickFixDrawFeedback = { owner: attacker.owner, amount: 0, blockedReason: drawResult.blockedReason };
      }
      state.quickFixTempoDraws = (state.quickFixTempoDraws ?? 0) + drawResult.drawn;
    });
  });
}

export function canPass(state) {
  return Boolean(state) && !state.winner;
}

export function canSwap(state, fromIndex, toIndex, owner) {
  if (!state || state.winner || fromIndex === toIndex) return false;
  const rowIndexes = owner === 'player' ? PLAYER_ROW : ENEMY_ROW;
  if (!rowIndexes.includes(fromIndex) || !rowIndexes.includes(toIndex)) return false;
  return Boolean(state.board[fromIndex] && state.board[toIndex]);
}

export function canPlayOrRedeploy(state, owner, handCardId, boardIndex) {
  if (!state || state.winner) return { ok: false, reason: 'Battle is over' };
  const side = owner === 'player' ? state.player : state.enemy;
  const rowIndexes = owner === 'player' ? PLAYER_ROW : ENEMY_ROW;
  if (!rowIndexes.includes(boardIndex)) return { ok: false, reason: 'Invalid row for unit placement' };

  const card = side.hand.find((item) => item.id === handCardId);
  if (!card) return { ok: false, reason: 'Card not in hand' };
  if (card.type && card.type !== 'unit') return { ok: false, reason: 'Only unit cards can be placed on board' };

  const occupyingUnit = state.board[boardIndex];
  if (!occupyingUnit && isLanePlayBlockedForOwner(state, owner, boardIndex)) {
    return { ok: false, reason: 'Line is blocked for unit placement' };
  }
  if (!occupyingUnit) return { ok: true, type: 'play' };
  if (occupyingUnit.owner !== owner) return { ok: false, reason: 'Slot is occupied by opponent' };

  if (!occupyingUnit.temporaryFloodToken && side.hand.length >= side.maxHandSize) {
    return { ok: false, reason: 'Redeploy blocked: hand is full' };
  }

  return { ok: true, type: 'redeploy' };
}

export function playEffectCard(state, owner, handCardId) {
  if (!state || state.winner) return { ok: false, reason: 'Battle is over' };
  const side = owner === 'player' ? state.player : state.enemy;
  const handIndex = side.hand.findIndex((item) => item.id === handCardId);
  if (handIndex < 0) return { ok: false, reason: 'Card not in hand' };

  const card = side.hand[handIndex];
  const legality = canPlayEffectCard(state, owner, card);
  if (!legality.ok) return legality;
  if (!canApplyEffectById(state, owner, card.effectId ?? null)) {
    return { ok: false, reason: 'Effect has no legal deterministic resolution' };
  }

  const [playedCard] = side.hand.splice(handIndex, 1);
  if (playedCard.type === 'unit') {
    side.hand.splice(handIndex, 0, playedCard);
    return { ok: false, reason: 'Unit cards must be placed on board' };
  }

  side.discard.push(playedCard);
  const protectedOwner = getOpponentOwner(owner);
  const blockedByImmunity = hasMoveDisableImmunity(state, protectedOwner, owner, playedCard.effectId ?? null);
  if (!blockedByImmunity) {
    applyEffectById(state, owner, playedCard.effectId ?? null, playedCard);
  }
  recordProgressAction(state, owner, blockedByImmunity ? 'effect-blocked' : 'effect');
  completeActionOpportunity(state, owner);
  return { ok: true, type: blockedByImmunity ? 'effect-blocked' : 'effect', card: playedCard };
}

export function resolveTargetedEffectCard(state, owner, handCardId, boardIndex, targetIndexes = [boardIndex]) {
  if (!state || state.winner) return { ok: false, reason: 'Battle is over' };
  const side = owner === 'player' ? state.player : state.enemy;
  const handIndex = side.hand.findIndex((item) => item.id === handCardId);
  if (handIndex < 0) return { ok: false, reason: 'Card not in hand' };

  const card = side.hand[handIndex];
  const legality = canPlayEffectCard(state, owner, card);
  if (!legality.ok) return legality;
  let immediateCombatFeedback = null;
  if (!card || card.type === 'unit') {
    return { ok: false, reason: 'Only effect cards can use targeted resolution' };
  }

  const targetUnit = state.board[boardIndex];
  if (!targetUnit) return { ok: false, reason: 'No target at selected slot' };

  const protectedOwner = targetUnit.owner;
  const blockedByImmunity = hasMoveDisableImmunity(state, protectedOwner, owner, card.effectId);
  if (blockedByImmunity) {
    const [playedCard] = side.hand.splice(handIndex, 1);
    side.discard.push(playedCard);
    recordProgressAction(state, owner, 'targeted-effect-blocked');
    completeActionOpportunity(state, owner);
    return { ok: true, type: 'targeted-effect-blocked', card: playedCard };
  }

  switch (card.effectId) {
    case 'return_friendly_draw_1': {
      if (targetUnit.owner !== owner) return { ok: false, reason: 'Target must be friendly' };
      if (side.hand.length >= side.maxHandSize) return { ok: false, reason: 'Hand is full' };
      returnBoardUnitToHand(side, targetUnit);
      state.board[boardIndex] = null;
      card.drawResult = drawCardsWithResult(side, 1);
      break;
    }
    case 'destroy_friendly_draw_1': {
      if (targetUnit.owner !== owner) return { ok: false, reason: 'Target must be friendly' };
      state.board[boardIndex] = null;
      recordFallenUnit(state, targetUnit, 'destroy');
      card.drawResult = drawCardsWithResult(side, 1);
      break;
    }
    case 'enemy_lane_atk_minus_1': {
      if (targetUnit.owner !== getOpponentOwner(owner)) return { ok: false, reason: 'Target must be enemy' };
      targetUnit.tempAttackMod = (targetUnit.tempAttackMod ?? 0) - 1;
      break;
    }
    case 'enemy_up_to_2_atk_minus_1': {
      const selectedTargets = Array.isArray(targetIndexes) ? targetIndexes : [boardIndex];
      if (targetUnit.owner !== getOpponentOwner(owner)) return { ok: false, reason: 'Target must be enemy' };
      if (selectedTargets.length < 1) return { ok: false, reason: 'Select at least one enemy target' };
      if (selectedTargets.length > 2) return { ok: false, reason: 'Select up to two enemy targets' };
      if (new Set(selectedTargets).size !== selectedTargets.length) {
        return { ok: false, reason: 'Select different enemy targets' };
      }
      const selectedUnits = selectedTargets.map((index) => state.board[index]);
      if (selectedUnits.some((unit) => !unit)) return { ok: false, reason: 'Targets must contain units' };
      if (selectedUnits.some((unit) => unit.owner !== getOpponentOwner(owner))) {
        return { ok: false, reason: 'Targets must be enemies' };
      }
      if (selectedUnits.some((unit) => getUnitAttack(unit) <= 0)) {
        return { ok: false, reason: 'Targets must have ATK above 0' };
      }
      selectedTargets.forEach((index) => {
        const enemyUnit = state.board[index];
        if (getUnitAttack(enemyUnit) > 0) {
          enemyUnit.tempAttackMod = (enemyUnit.tempAttackMod ?? 0) - 1;
        }
      });
      break;
    }
    case 'quick_strike': {
      if (targetUnit.owner !== owner) return { ok: false, reason: 'Target must be friendly' };
      const lane = boardIndex % 3;
      immediateCombatFeedback = resolveCombatWithRawHeroDamage(state, () => resolveImmediateLaneCombat(state, lane));
      break;
    }
    case 'control_enemy_unit_this_turn': {
      if (targetUnit.owner !== getOpponentOwner(owner)) return { ok: false, reason: 'Target must be enemy' };
      immediateCombatFeedback = resolveCombatWithRawHeroDamage(state, () => resolveImmediateSystemOverrideAttack(state, boardIndex));
      break;
    }
    case 'infect_damage_1_opposite_ally_atk_1': {
      if (targetUnit.owner !== getOpponentOwner(owner)) return { ok: false, reason: 'Target must be enemy' };
      applyDamageToUnit(state, boardIndex, 1);
      cleanupDefeatedUnitsWithTriggers(state, [boardIndex]);
      const updatedTarget = state.board[boardIndex];
      if (updatedTarget?.owner === getOpponentOwner(owner) && updatedTarget.hp > 0) {
        const oppositeIndex = owner === 'player' ? boardIndex + 6 : boardIndex - 6;
        const oppositeAlly = state.board[oppositeIndex];
        if (oppositeAlly?.owner === owner) {
          oppositeAlly.tempAttackMod = (oppositeAlly.tempAttackMod ?? 0) + 1;
        }
      }
      break;
    }
    case 'ignore_armor_next_attack': {
      if (targetUnit.owner !== getOpponentOwner(owner)) return { ok: false, reason: 'Target must be enemy' };
      applyDamageToUnit(state, boardIndex, 1);
      cleanupDefeatedUnitsWithTriggers(state, [boardIndex]);
      const updatedTarget = state.board[boardIndex];
      if (updatedTarget && updatedTarget.owner === getOpponentOwner(owner)) {
        updatedTarget.ignoreArmorNext = true;
      }
      break;
    }
    case 'heal_2':
    case 'heal_1_atk_1_draw_on_kill_this_turn':
    case 'heal_3': {
      if (targetUnit.owner !== owner) return { ok: false, reason: 'Target must be friendly' };
      const amount = card.effectId === 'heal_3' ? 3 : (card.effectId === 'heal_2' ? 2 : 1);
      applyTargetedHeal(targetUnit, amount);
      if (card.effectId === 'heal_1_atk_1_draw_on_kill_this_turn') {
        targetUnit.tempAttackMod = (targetUnit.tempAttackMod ?? 0) + 1;
        state.nextQuickFixDrawTriggerId = (state.nextQuickFixDrawTriggerId ?? 0) + 1;
        targetUnit.quickFixDrawTriggers ??= [];
        targetUnit.quickFixDrawTriggers.push({
          id: state.nextQuickFixDrawTriggerId,
          owner,
          triggered: false,
        });
      }
      break;
    }
    case 'temp_armor_1': {
      if (targetUnit.owner !== owner) return { ok: false, reason: 'Target must be friendly' };
      targetUnit.tempArmorMod = (targetUnit.tempArmorMod ?? 0) + 1;
      break;
    }
    case 'swap_any_two_units': {
      const selectedTargets = Array.isArray(targetIndexes) ? targetIndexes : [boardIndex];
      if (selectedTargets.length < 2) {
        return { ok: true, type: 'targeted-effect-pending' };
      }
      const [firstIndex, secondIndex] = selectedTargets;
      if (firstIndex === secondIndex) return { ok: false, reason: 'Select two different targets' };
      const firstUnit = state.board[firstIndex];
      const secondUnit = state.board[secondIndex];
      if (!firstUnit || !secondUnit) return { ok: false, reason: 'Both targets must contain units' };
      if (firstUnit.owner !== secondUnit.owner) {
        return { ok: false, reason: 'Swap targets must be on the same side' };
      }
      state.board[firstIndex] = secondUnit;
      state.board[secondIndex] = firstUnit;
      break;
    }
    case 'swap_adjacent_then_resolve': {
      if (targetUnit.owner !== owner) return { ok: false, reason: 'Target must be friendly' };
      const leftIndex = boardIndex - 1;
      const rightIndex = boardIndex + 1;
      const sameRow = (candidateIndex) => Math.floor(candidateIndex / 3) === Math.floor(boardIndex / 3);
      const isFriendlyAdjacent = (candidateIndex) => (
        candidateIndex >= 0
        && candidateIndex < BOARD_SIZE
        && sameRow(candidateIndex)
        && state.board[candidateIndex]?.owner === owner
      );

      let swapIndex = null;
      if (isFriendlyAdjacent(leftIndex)) {
        swapIndex = leftIndex;
      } else if (isFriendlyAdjacent(rightIndex)) {
        swapIndex = rightIndex;
      }

      if (swapIndex === null) return { ok: false, reason: 'No adjacent friendly unit to swap with' };

      const targetLane = swapIndex % 3;
      const selectedUnit = state.board[boardIndex];
      const adjacentUnit = state.board[swapIndex];
      state.board[boardIndex] = adjacentUnit;
      state.board[swapIndex] = selectedUnit;
      immediateCombatFeedback = resolveCombatWithRawHeroDamage(state, () => resolveImmediateLaneCombat(state, targetLane));
      break;
    }
    case 'swap_two_enemy_units':
    case 'swap_adjacent_enemy_units': {
      const selectedTargets = Array.isArray(targetIndexes) ? targetIndexes : [boardIndex];
      if (targetUnit.owner !== getOpponentOwner(owner)) return { ok: false, reason: 'Target must be enemy' };
      if (selectedTargets.length < 2) {
        return { ok: true, type: 'targeted-effect-pending' };
      }
      const [firstIndex, secondIndex] = selectedTargets;
      if (firstIndex === secondIndex) return { ok: false, reason: 'Select two different enemy targets' };
      const firstUnit = state.board[firstIndex];
      const secondUnit = state.board[secondIndex];
      if (!firstUnit || !secondUnit) return { ok: false, reason: 'Both targets must contain units' };
      if (firstUnit.owner !== getOpponentOwner(owner) || secondUnit.owner !== getOpponentOwner(owner)) {
        return { ok: false, reason: 'Targets must be enemies' };
      }
      if (card.effectId === 'swap_adjacent_enemy_units' && !areSameRowAdjacentIndexes(firstIndex, secondIndex)) {
        return { ok: false, reason: 'Targets must be adjacent enemies' };
      }
      state.board[firstIndex] = secondUnit;
      state.board[secondIndex] = firstUnit;
      break;
    }
    default:
      return { ok: false, reason: 'Effect does not support targeted resolution' };
  }

  const drawResult = card.drawResult ?? null;
  if (card.drawResult) delete card.drawResult;
  const [playedCard] = side.hand.splice(handIndex, 1);
  side.discard.push(playedCard);
  recordProgressAction(state, owner, 'targeted-effect');
  completeActionOpportunity(state, owner);
  return {
    ok: true,
    type: 'targeted-effect',
    card: playedCard,
    feedback: drawResult ? [{ type: 'draw', owner, ...drawResult }] : [],
    ...(immediateCombatFeedback?.combatEvents?.length > 0 ? {
      combatEvents: immediateCombatFeedback.combatEvents,
      combatSnapshot: immediateCombatFeedback.combatSnapshot,
    } : {}),
  };
}


export function resolveTargetedUnitOnPlayEffect(state, owner, sourceBoardIndex, targetIndexes = []) {
  if (!state || state.winner) return { ok: false, reason: 'Battle is over' };
  const sourceUnit = state.board[sourceBoardIndex];
  if (!sourceUnit || sourceUnit.owner !== owner) {
    return { ok: false, reason: 'Source unit must be friendly' };
  }

  if (sourceUnit.effectId !== 'swap_two_enemy_units') {
    return { ok: false, reason: 'Unit on-play effect does not support targeted resolution' };
  }

  const selectedTargets = Array.isArray(targetIndexes) ? targetIndexes : [];
  if (selectedTargets.length < 2) {
    const firstTarget = state.board[selectedTargets[0]];
    if (selectedTargets.length > 0 && firstTarget?.owner !== getOpponentOwner(owner)) {
      return { ok: false, reason: 'Target must be enemy' };
    }
    return { ok: true, type: 'unit-on-play-targeted-effect-pending' };
  }

  const [firstIndex, secondIndex] = selectedTargets;
  if (firstIndex === secondIndex) return { ok: false, reason: 'Select two different enemy targets' };
  const firstUnit = state.board[firstIndex];
  const secondUnit = state.board[secondIndex];
  if (!firstUnit || !secondUnit) return { ok: false, reason: 'Both targets must contain units' };
  if (firstUnit.owner !== getOpponentOwner(owner) || secondUnit.owner !== getOpponentOwner(owner)) {
    return { ok: false, reason: 'Targets must be enemies' };
  }

  state.board[firstIndex] = secondUnit;
  state.board[secondIndex] = firstUnit;
  return { ok: true, type: 'unit-on-play-targeted-effect', sourceUnit };
}


export function resolveQuickStrike(state, owner, boardIndex) {
  if (!state || state.winner) return { ok: false, reason: 'Battle is over' };
  const targetUnit = state.board[boardIndex];
  if (!targetUnit || targetUnit.owner !== owner) {
    return { ok: false, reason: 'Target must be friendly' };
  }
  const lane = boardIndex % 3;
  const immediateCombatFeedback = resolveCombatWithRawHeroDamage(state, () => resolveImmediateLaneCombat(state, lane));
  recordProgressAction(state, owner, 'quick-strike');
  return { ok: true, type: 'quick-strike', lane, ...immediateCombatFeedback };
}


function resolveUnitOnPlayEffect(state, owner, boardIndex, card) {
  if (!state || !card) return;
  const enemyOwner = getOpponentOwner(owner);

  switch (card.effectId) {
    case 'on_play_lane_damage_1': {
      const enemyIndex = owner === 'player' ? boardIndex - 6 : boardIndex + 6;
      const enemyUnit = state.board[enemyIndex];
      if (enemyUnit && enemyUnit.owner === enemyOwner) {
        applyDamageToUnit(state, enemyIndex, 1);
        cleanupDefeatedUnitsWithTriggers(state, [enemyIndex]);
      }
      break;
    }
    case 'enemy_lane_atk_minus_1': {
      const enemyIndex = owner === 'player' ? boardIndex - 6 : boardIndex + 6;
      const enemyUnit = state.board[enemyIndex];
      if (enemyUnit && enemyUnit.owner === enemyOwner) {
        enemyUnit.tempAttackMod = (enemyUnit.tempAttackMod ?? 0) - 1;
      }
      break;
    }
    case 'swap_two_enemy_units':
      // Controller's on-play swap is resolved through the staged targeted cast flow.
      break;
    case 'peek_enemy_slot':
      // MVP safe no-op until reveal UI exists.
      break;
    case 'block_enemy_lane_play_this_turn': {
      ensureLanePlayBlocks(state);
      const lane = boardIndex % 3;
      if (owner === 'player') state.enemyLanePlayBlockedThisTurn[lane] = true;
      if (owner === 'enemy') state.playerLanePlayBlockedThisTurn[lane] = true;
      break;
    }
    case 'block_enemy_effect_cards_until_combat': {
      applyEffectById(state, owner, 'block_enemy_effect_cards_until_combat');
      break;
    }
    default:
      break;
  }
}

export function playOrRedeployUnit(state, owner, handCardId, boardIndex) {
  const validation = canPlayOrRedeploy(state, owner, handCardId, boardIndex);
  if (!validation.ok) return validation;

  const side = owner === 'player' ? state.player : state.enemy;
  const handIndex = side.hand.findIndex((item) => item.id === handCardId);
  const [card] = side.hand.splice(handIndex, 1);

  if (validation.type === 'redeploy') {
    const displacedUnit = state.board[boardIndex];
    returnBoardUnitToHand(side, displacedUnit);
  }

  state.board[boardIndex] = createBoardUnitFromCard(card, owner);
  resolveUnitOnPlayEffect(state, owner, boardIndex, card);

  side.discard.push(card);
  recordProgressAction(state, owner, validation.type);
  completeActionOpportunity(state, owner);
  return { ok: true, type: validation.type, card };
}

export function performSwap(state, owner, fromIndex, toIndex) {
  if (!canSwap(state, fromIndex, toIndex, owner)) {
    return { ok: false, reason: 'Swap is not valid' };
  }
  const temp = state.board[fromIndex];
  state.board[fromIndex] = state.board[toIndex];
  state.board[toIndex] = temp;
  recordProgressAction(state, owner, 'swap');
  completeActionOpportunity(state, owner);
  return { ok: true };
}

function resolveCombatLane(state, col, combatContext = null) {

  const context = combatContext ?? { guardiansUsed: new Set(), events: [] };
  if (!Array.isArray(context.events)) context.events = [];

  const findSniperTargetIndex = (attackerOwner) => {
    const enemyIndexes = getRowForOwner(getOpponentOwner(attackerOwner));
    let bestIndex = null;
    let bestHp = Infinity;
    enemyIndexes.forEach((index) => {
      const unit = state.board[index];
      if (!unit || unit.hp <= 0) return;
      const hp = Number.isFinite(unit.hp) ? unit.hp : 0;
      if (hp < bestHp || (hp === bestHp && (bestIndex === null || index < bestIndex))) {
        bestHp = hp;
        bestIndex = index;
      }
    });
    return bestIndex;
  };

  const findGuardianInterceptIndex = (defenderIndex) => {
    const defender = state.board[defenderIndex];
    if (!defender) return null;
    const defenderOwner = defender.owner;
    const rowStart = defenderOwner === 'player' ? 6 : 0;
    const lane = defenderIndex % 3;
    const candidateIndexes = [];
    if (lane > 0) candidateIndexes.push(rowStart + lane - 1);
    if (lane < 2) candidateIndexes.push(rowStart + lane + 1);

    let chosen = null;
    candidateIndexes.forEach((index) => {
      const guardian = state.board[index];
      if (!guardian || guardian.owner !== defenderOwner) return;
      if (guardian.effectId !== 'intercept_lane_damage') return;
      if (guardian.hp <= 0) return;
      if (context.guardiansUsed.has(index)) return;
      if (chosen === null || index < chosen) {
        chosen = index;
      }
    });

    return chosen;
  };

  const getAdjacentAllyIndexes = (unit, unitIndex) => {
    if (!unit) return [];
    const rowStart = unit.owner === 'player' ? 6 : 0;
    const lane = unitIndex % 3;
    const indexes = [];
    if (lane > 0) indexes.push(rowStart + lane - 1);
    if (lane < 2) indexes.push(rowStart + lane + 1);
    return indexes;
  };

  const createCombatModifier = ({ type, amount = 0, source, label, feedback = 'attacker' }) => {
    const modifier = { type, amount, source, label };
    if (feedback !== 'attacker') modifier.feedback = feedback;
    return modifier;
  };

  const getAttackWithCombatBonuses = (unit, unitIndex) => {
    const combatModifiers = [];
    if (!unit) return { attack: 0, combatModifiers };
    let attack = unit.effectId === 'cannot_attack' ? 0 : getUnitAttack(unit, { excludeCombatId: state.activeCombatId });
    const bruiserPendingAttack = getAvailableBruiserPendingAttackBonus(state, unit);
    if (bruiserPendingAttack > 0) {
      markBruiserPendingAttackBonusUsed(state, unit);
      combatModifiers.push(createCombatModifier({
        type: 'attack-bonus',
        amount: bruiserPendingAttack,
        source: 'gain_atk_when_damaged',
        label: `+${bruiserPendingAttack} ATK`,
      }));
    }
    if (unit.effectId === 'opposing_lane_atk_plus_1') {
      const opposingIndex = unit.owner === 'player' ? unitIndex - 6 : unitIndex + 6;
      if (state.board[opposingIndex]?.owner === getOpponentOwner(unit.owner)) {
        attack += 1;
        combatModifiers.push(createCombatModifier({
          type: 'attack-bonus',
          amount: 1,
          source: 'opposing_lane_atk_plus_1',
          label: '+1 ATK',
        }));
      }
    }
    if (unit.effectId === 'empty_adjacent_bonus_atk') {
      const hasEmptyAdjacent = getAdjacentAllyIndexes(unit, unitIndex).some((idx) => state.board[idx] === null);
      if (hasEmptyAdjacent) {
        attack += 1;
        combatModifiers.push(createCombatModifier({
          type: 'attack-bonus',
          amount: 1,
          source: 'empty_adjacent_bonus_atk',
          label: '+1 ATK',
        }));
      }
    }
    return { attack: Math.max(0, attack), combatModifiers };
  };

  const getAuraBonusAttack = (unit, unitIndex) => {
    const combatModifiers = [];
    if (!unit) return { bonus: 0, combatModifiers };
    const bonus = getAdjacentAllyIndexes(unit, unitIndex).reduce((total, index) => (
      total + (hasSwarmAlphaAura(state.board[index]) ? 1 : 0)
    ), 0);
    if (bonus > 0) {
      combatModifiers.push(createCombatModifier({
        type: 'attack-bonus',
        amount: bonus,
        source: SWARM_ALPHA_AURA_EFFECT_ID,
        label: `+${bonus} ATK`,
      }));
    }
    return { bonus, combatModifiers };
  };

  const getArmorWithAura = (unit, unitIndex) => {
    const combatModifiers = [];
    if (!unit) return { armor: 0, combatModifiers };
    const baseArmor = getUnitArmor(unit);
    const aura = getSystemOverrideAdjacentAllyIndexes(unit, unitIndex).reduce((total, index) => (
      total + (state.board[index]?.effectId === 'lane_armor_aura_1' ? 1 : 0)
    ), 0);
    if (aura > 0) {
      combatModifiers.push(createCombatModifier({
        type: 'armor-bonus',
        amount: aura,
        source: 'lane_armor_aura_1',
        label: `+${aura} ARM`,
        feedback: 'target',
      }));
    }
    return { armor: baseArmor + aura, combatModifiers };
  };

  const getAuraArmorIgnore = (unit, unitIndex) => {
    if (!unit) return 0;
    return getSystemOverrideAdjacentAllyIndexes(unit, unitIndex).some((index) => hasSwarmAlphaAura(state.board[index])) ? 1 : 0;
  };

  const getDefensiveFrictionPenalty = (defender) => {
    if (!defender) return 0;
    let penalty = 0;
    if (defender.effectId === WARDEN_SELF_FRICTION_EFFECT_ID) penalty += 1;
    const lane = defender.owner === 'player' ? (defender.__index - 6) : defender.__index;
    const rowStart = defender.owner === 'player' ? 6 : 0;
    const left = lane > 0 ? state.board[rowStart + lane - 1] : null;
    const right = lane < 2 ? state.board[rowStart + lane + 1] : null;
    if (left?.owner === defender.owner && left.effectId === WARDEN_SPEARWALL_EFFECT_ID) penalty += 1;
    if (right?.owner === defender.owner && right.effectId === WARDEN_SPEARWALL_EFFECT_ID) penalty += 1;
    return Math.min(WARDEN_FRICTION_CAP, penalty);
  };

  const getMitigatedDamageResult = (attacker, defender, defenderIndex, attackCombatModifiers = []) => {
    const frictionPenalty = getDefensiveFrictionPenalty(defender);
    const combatModifiers = [...attackCombatModifiers];
    const attackDamage = Math.max(0, (attacker?.attack ?? getUnitAttack(attacker, { excludeCombatId: state.activeCombatId })) - frictionPenalty);
    if (frictionPenalty > 0) {
      state.wardenDefensiveFrictionApplications = (state.wardenDefensiveFrictionApplications ?? 0) + 1;
      combatModifiers.push(createCombatModifier({
        type: 'attack-reduction',
        amount: -frictionPenalty,
        source: 'warden_defensive_friction',
        label: `${-frictionPenalty} ATK`,
      }));
    }

    const damage = (() => {
      if (defender?.ignoreArmorNext) {
        const boardDefender = Number.isInteger(defenderIndex) ? state.board[defenderIndex] : null;
        if (boardDefender) boardDefender.ignoreArmorNext = false;
        defender.ignoreArmorNext = false;
        combatModifiers.push(createCombatModifier({
          type: 'armor-ignore',
          source: 'ignore_armor_next_attack',
          label: 'IGNORE ARM',
        }));
        return Math.max(0, attackDamage);
      }
      const { armor, combatModifiers: armorCombatModifiers } = getArmorWithAura(defender, defenderIndex);
      combatModifiers.push(...armorCombatModifiers);
      const armorIgnore = getAuraArmorIgnore(attacker, attacker?.__index);
      if (armorIgnore > 0 && armor > 0) {
        combatModifiers.push(createCombatModifier({
          type: 'armor-ignore',
          amount: Math.min(armor, armorIgnore),
          source: SWARM_ALPHA_AURA_EFFECT_ID,
          label: 'IGNORE ARM',
        }));
      }
      return Math.max(0, attackDamage - Math.max(0, armor - armorIgnore));
    })();
    return { damage, combatModifiers };
  };

  const enemyIndex = ENEMY_ROW[col];
  const playerIndex = PLAYER_ROW[col];
  const enemy = state.board[enemyIndex]?.hp > 0 ? { ...state.board[enemyIndex], __index: enemyIndex } : null;
  const player = state.board[playerIndex]?.hp > 0 ? { ...state.board[playerIndex], __index: playerIndex } : null;

  const pendingUnitDamage = new Map();
  const addPendingUnitDamage = (index, amount) => {
    if (!amount || amount <= 0) return;
    pendingUnitDamage.set(index, (pendingUnitDamage.get(index) ?? 0) + amount);
  };
  const getUnitDamagePrevention = (index, amount) => {
    const target = state.board[index];
    if (!target || amount <= 0) return null;
    const accumulatedDamage = pendingUnitDamage.get(index) ?? 0;
    const projectedHp = target.hp - accumulatedDamage - amount;
    const minOneProtection = Boolean(state.cannotDropBelowOneThisTurn?.[target.owner]);
    if (!minOneProtection || projectedHp >= 1) return null;

    return {
      targetIndex: index,
      prevented: true,
      preventedBy: 'LAST_STAND',
      attemptedDamage: amount,
      visibleDamage: Math.max(0, target.hp - accumulatedDamage - 1),
      finalHp: 1,
    };
  };
  const wouldUnitDamageBeLethal = (index, amount) => {
    const target = state.board[index];
    if (!target || amount <= 0) return false;
    const accumulatedDamage = pendingUnitDamage.get(index) ?? 0;
    const projectedHp = target.hp - accumulatedDamage - amount;
    const minOneProtection = Boolean(state.cannotDropBelowOneThisTurn?.[target.owner]);
    return !minOneProtection && projectedHp <= 0;
  };
  const recordCombatEvent = ({
    attackerSide,
    attackerIndex = null,
    targetType,
    targetSide,
    targetIndex = null,
    damage,
    openLane,
    lethal = false,
    prevention = null,
    combatModifiers = [],
    interceptOriginalTargetIndex = null,
  }) => {
    // Read-only feedback payload for BattleScene; combat mutations remain below.
    const event = {
      lane: col,
      attackerSide,
      targetType,
      targetSide,
      damage,
      openLane,
      lethal,
    };
    if (prevention) event.prevention = prevention;
    if (Array.isArray(combatModifiers) && combatModifiers.length > 0) {
      event.combatModifiers = combatModifiers;
    }
    Object.defineProperties(event, {
      attackerIndex: { value: attackerIndex, enumerable: false },
      targetIndex: { value: targetIndex, enumerable: false },
      interceptOriginalTargetIndex: { value: interceptOriginalTargetIndex, enumerable: false },
    });
    context.events.push(event);
    return event;
  };
  const recordUnitAttack = (attackerSide, attackerIndex, targetIndex, damage, combatModifiers = [], options = {}) => {
    const target = state.board[targetIndex];
    if (!target) return;
    const prevention = getUnitDamagePrevention(targetIndex, damage);
    recordCombatEvent({
      attackerSide,
      attackerIndex,
      targetType: 'unit',
      targetSide: target.owner,
      targetIndex,
      damage,
      openLane: false,
      lethal: wouldUnitDamageBeLethal(targetIndex, damage),
      prevention,
      combatModifiers,
      interceptOriginalTargetIndex: options.interceptOriginalTargetIndex ?? null,
    });
  };
  const recordHeroAttack = (attackerSide, attackerIndex, targetSide, damage, openLane, combatModifiers = []) => recordCombatEvent({
      attackerSide,
      attackerIndex,
      targetType: 'hero',
      targetSide,
      damage,
      openLane,
      lethal: false,
      combatModifiers,
    });

  const getCombatAttackProfile = (unit, unitIndex) => {
    const { attack, combatModifiers } = getAttackWithCombatBonuses(unit, unitIndex);
    const { bonus, combatModifiers: auraCombatModifiers } = getAuraBonusAttack(unit, unitIndex);
    return {
      attack: attack + bonus,
      combatModifiers: [...combatModifiers, ...auraCombatModifiers],
    };
  };

  if (player) {
    const { attack: playerAttack, combatModifiers: playerAttackModifiers } = getCombatAttackProfile(player, playerIndex);
    const canHitAnyLane = player.effectId === 'can_hit_any_lane';
    const sniperTargetIndex = canHitAnyLane ? findSniperTargetIndex(player.owner) : null;
    if (sniperTargetIndex !== null) {
      const sniperTarget = state.board[sniperTargetIndex];
      if (sniperTarget) {
        const { damage, combatModifiers } = getMitigatedDamageResult(
          { ...player, attack: playerAttack },
          sniperTarget,
          sniperTargetIndex,
          [
            ...playerAttackModifiers,
            createCombatModifier({ type: 'retarget', source: 'can_hit_any_lane', label: 'LOWEST HP' }),
          ],
        );
        recordUnitAttack('player', playerIndex, sniperTargetIndex, damage, combatModifiers);
        addPendingUnitDamage(sniperTargetIndex, damage);
      }
    } else if (enemy) {
      const { damage, combatModifiers } = getMitigatedDamageResult({ ...player, attack: playerAttack }, enemy, enemyIndex, playerAttackModifiers);
      const interceptIndex = findGuardianInterceptIndex(enemyIndex);
      if (interceptIndex !== null) {
        recordUnitAttack('player', playerIndex, interceptIndex, damage, [
          ...combatModifiers,
          createCombatModifier({ type: 'intercept', source: 'intercept_lane_damage', label: 'INTERCEPT', feedback: 'target' }),
        ], { interceptOriginalTargetIndex: enemyIndex });
        addPendingUnitDamage(interceptIndex, damage);
        context.guardiansUsed.add(interceptIndex);
      } else {
        recordUnitAttack('player', playerIndex, enemyIndex, damage, combatModifiers);
        addPendingUnitDamage(enemyIndex, damage);
      }
    } else {
      const laneBonus = player.effectId === 'lane_empty_bonus_damage' ? RUNNER_OPEN_LANE_HERO_BONUS : 0;
      const damage = playerAttack + laneBonus;
      const combatModifiers = laneBonus > 0
        ? [...playerAttackModifiers, createCombatModifier({ type: 'base-damage-bonus', amount: laneBonus, source: 'lane_empty_bonus_damage', label: `OPEN +${laneBonus}` })]
        : playerAttackModifiers;
      recordHeroAttack('player', playerIndex, 'enemy', damage, true, combatModifiers);
      state.enemyHP -= damage;
    }
    if (player.effectId === 'self_damage_after_attack') addPendingUnitDamage(playerIndex, 1);
  }

  if (enemy) {
    const { attack: enemyAttack, combatModifiers: enemyAttackModifiers } = getCombatAttackProfile(enemy, enemyIndex);
    const canHitAnyLane = enemy.effectId === 'can_hit_any_lane';
    const sniperTargetIndex = canHitAnyLane ? findSniperTargetIndex(enemy.owner) : null;
    if (sniperTargetIndex !== null) {
      const sniperTarget = state.board[sniperTargetIndex];
      if (sniperTarget) {
        const { damage, combatModifiers } = getMitigatedDamageResult(
          { ...enemy, attack: enemyAttack },
          sniperTarget,
          sniperTargetIndex,
          [
            ...enemyAttackModifiers,
            createCombatModifier({ type: 'retarget', source: 'can_hit_any_lane', label: 'LOWEST HP' }),
          ],
        );
        recordUnitAttack('enemy', enemyIndex, sniperTargetIndex, damage, combatModifiers);
        addPendingUnitDamage(sniperTargetIndex, damage);
      }
    } else if (player) {
      const { damage, combatModifiers } = getMitigatedDamageResult({ ...enemy, attack: enemyAttack }, player, playerIndex, enemyAttackModifiers);
      const interceptIndex = findGuardianInterceptIndex(playerIndex);
      if (interceptIndex !== null) {
        recordUnitAttack('enemy', enemyIndex, interceptIndex, damage, [
          ...combatModifiers,
          createCombatModifier({ type: 'intercept', source: 'intercept_lane_damage', label: 'INTERCEPT', feedback: 'target' }),
        ], { interceptOriginalTargetIndex: playerIndex });
        addPendingUnitDamage(interceptIndex, damage);
        context.guardiansUsed.add(interceptIndex);
      } else {
        recordUnitAttack('enemy', enemyIndex, playerIndex, damage, combatModifiers);
        addPendingUnitDamage(playerIndex, damage);
      }
    } else {
      const laneBonus = enemy.effectId === 'lane_empty_bonus_damage' ? RUNNER_OPEN_LANE_HERO_BONUS : 0;
      const damage = enemyAttack + laneBonus;
      const combatModifiers = laneBonus > 0
        ? [...enemyAttackModifiers, createCombatModifier({ type: 'base-damage-bonus', amount: laneBonus, source: 'lane_empty_bonus_damage', label: `OPEN +${laneBonus}` })]
        : enemyAttackModifiers;
      recordHeroAttack('enemy', enemyIndex, 'player', damage, true, combatModifiers);
      state.playerHP -= damage;
    }
    if (enemy.effectId === 'self_damage_after_attack') addPendingUnitDamage(enemyIndex, 1);
  }

  pendingUnitDamage.forEach((amount, index) => {
    applyDamageToUnit(state, index, amount);
  });

  triggerLeechHealsFromAttackEvents(state, context.events);
  triggerQuickFixDrawsFromCombatEvents(state, context.events);

  const laneIndexes = new Set([enemyIndex, playerIndex]);
  const offLaneDamageIndexes = [...pendingUnitDamage.keys()].filter((index) => !laneIndexes.has(index));
  cleanupDefeatedUnitsWithTriggers(state, offLaneDamageIndexes, { combat: true });
  cleanupDefeatedUnitsWithTriggers(state, [enemyIndex, playerIndex], { combat: true });

  return context.events;
}

export function resolveCombat(state) {
  const combatContext = { guardiansUsed: new Set(), events: [] };
  const combatId = beginCombatWindow(state);
  const previousPreserveRawHeroHP = state.preserveRawHeroHPUntilCombatFinalization;
  state.preserveRawHeroHPUntilCombatFinalization = true;

  for (let col = 0; col < 3; col += 1) {
    resolveCombatLane(state, col, combatContext);
  }

  cleanupDefeatedUnitsWithTriggers(state, [...ENEMY_ROW, ...PLAYER_ROW], { combat: true });

  if (state.cannotDropBelowOneThisTurn) {
    state.cannotDropBelowOneThisTurn.player = false;
    state.cannotDropBelowOneThisTurn.enemy = false;
  }
  if (state.effectCardsBlockedUntilCombat) {
    state.effectCardsBlockedUntilCombat.player = false;
    state.effectCardsBlockedUntilCombat.enemy = false;
  }

  if (state.immuneMoveDisableThisTurn) {
    state.immuneMoveDisableThisTurn.player = false;
    state.immuneMoveDisableThisTurn.enemy = false;
  }

  if (state.immovableThisTurn) {
    state.immovableThisTurn.player = false;
    state.immovableThisTurn.enemy = false;
  }

  state.board.forEach((unit, index) => {
    if (unit?.temporaryFloodToken) {
      state.board[index] = null;
      return;
    }
    if (unit?.tempAttackMod) {
      delete unit.tempAttackMod;
    }
    if (unit?.tempArmorMod) {
      delete unit.tempArmorMod;
    }
    if (unit?.quickFixDrawTriggers) {
      delete unit.quickFixDrawTriggers;
    }
    if (unit?.rotcallerTriggeredThisCombat) {
      delete unit.rotcallerTriggeredThisCombat;
    }
  });

  delete state.funeralPyreThisCombat;

  clampHeroHpAndResolveWinner(state);
  endCombatWindow(state, combatId);

  if (previousPreserveRawHeroHP) {
    state.preserveRawHeroHPUntilCombatFinalization = previousPreserveRawHeroHP;
  } else {
    delete state.preserveRawHeroHPUntilCombatFinalization;
  }

  return combatContext.events;
}
