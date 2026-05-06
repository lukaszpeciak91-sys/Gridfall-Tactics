const BOARD_SIZE = 9;
const ENEMY_ROW = [0, 1, 2];
const PLAYER_ROW = [6, 7, 8];
const HERO_START_HP = 12;
const SWARM_ALPHA_AURA_EFFECT_ID = 'adjacent_allies_atk_plus_1_ignore_armor_1';

function hasSwarmAlphaAura(unit) {
  return unit?.effectId === SWARM_ALPHA_AURA_EFFECT_ID;
}
export const MAX_TURNS = 50;
export const NO_PROGRESS_STALL_ROUNDS = 3;
export const STARTING_HAND_SIZE = 4;
export const MAX_OPENING_MULLIGAN_CARDS = 2;


function createNoProgressSnapshot(state) {
  return {
    playerHP: state?.playerHP ?? null,
    enemyHP: state?.enemyHP ?? null,
    board: Array.isArray(state?.board)
      ? state.board.map((unit) => {
        if (!unit) return null;
        return {
          owner: unit.owner ?? null,
          id: unit.cardId ?? unit.id ?? null,
          hp: unit.hp ?? null,
          maxHp: unit.maxHp ?? null,
          attack: unit.attack ?? null,
          armor: unit.armor ?? null,
          tempAttackMod: unit.tempAttackMod ?? null,
          tempArmorMod: unit.tempArmorMod ?? null,
          effectId: unit.effectId ?? null,
          controlledAttackThisTurn: Boolean(unit.controlledAttackThisTurn),
          ignoreArmorNext: Boolean(unit.ignoreArmorNext),
        };
      })
      : [],
  };
}

function createNoProgressRoundState(state) {
  return {
    consecutiveRounds: 0,
    currentRoundActions: { player: null, enemy: null },
    roundStartSnapshot: createNoProgressSnapshot(state),
  };
}

function ensureNoProgressStallState(state) {
  if (!state) return null;
  state.noProgressStall ??= createNoProgressRoundState(state);
  state.noProgressStall.currentRoundActions ??= { player: null, enemy: null };
  state.noProgressStall.roundStartSnapshot ??= createNoProgressSnapshot(state);
  state.noProgressStall.consecutiveRounds ??= 0;
  return state.noProgressStall;
}

function areNoProgressSnapshotsEqual(first, second) {
  return JSON.stringify(first) === JSON.stringify(second);
}

function resolveHeroHpTiebreakWinner(state, endingReason, resolvedByKey) {
  if (state.playerHP > state.enemyHP) state.winner = 'player';
  else if (state.enemyHP > state.playerHP) state.winner = 'enemy';
  else state.winner = 'draw';

  state.endingReason = endingReason;
  state[resolvedByKey] = state.winner === 'draw' ? 'equal-hero-hp' : 'remaining-hero-hp';
  return state.winner;
}

export function recordPassAction(state, owner) {
  if (!state || state.winner || (owner !== 'player' && owner !== 'enemy')) return;
  const stallState = ensureNoProgressStallState(state);
  stallState.currentRoundActions[owner] = 'pass';
}

function recordProgressAction(state, owner, actionType = 'progress') {
  if (!state || state.winner || (owner !== 'player' && owner !== 'enemy')) return;
  const stallState = ensureNoProgressStallState(state);
  stallState.currentRoundActions[owner] = actionType;
  stallState.consecutiveRounds = 0;
}

export function resolveNoProgressStallWinner(state, maxNoProgressRounds = NO_PROGRESS_STALL_ROUNDS) {
  if (!state || state.winner) return state?.winner ?? null;
  const stallState = ensureNoProgressStallState(state);
  const actions = stallState.currentRoundActions;
  const bothPassedOnly = actions.player === 'pass' && actions.enemy === 'pass';
  const noBoardOrHpProgress = areNoProgressSnapshotsEqual(
    stallState.roundStartSnapshot,
    createNoProgressSnapshot(state),
  );

  if (bothPassedOnly && noBoardOrHpProgress) {
    stallState.consecutiveRounds += 1;
  } else {
    stallState.consecutiveRounds = 0;
  }

  stallState.currentRoundActions = { player: null, enemy: null };
  stallState.roundStartSnapshot = createNoProgressSnapshot(state);

  if (stallState.consecutiveRounds >= maxNoProgressRounds) {
    return resolveHeroHpTiebreakWinner(state, 'no-progress-stall', 'noProgressStallResolvedBy');
  }

  return null;
}

function getRowForOwner(owner) {
  return owner === 'player' ? PLAYER_ROW : ENEMY_ROW;
}

function getOpponentOwner(owner) {
  return owner === 'player' ? 'enemy' : 'player';
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

function removeDefeatedUnits(state, boardIndexes) {
  cleanupDefeatedUnitsWithTriggers(state, boardIndexes);
}

function cleanupAllDefeatedUnitsWithTriggers(state) {
  cleanupDefeatedUnitsWithTriggers(state, [...ENEMY_ROW, ...PLAYER_ROW]);
}

export function resolveTurnCapWinner(state, turnsCompleted, maxTurns = MAX_TURNS) {
  if (!state || state.winner || turnsCompleted < maxTurns) return state?.winner ?? null;
  return resolveHeroHpTiebreakWinner(state, 'turn-cap', 'turnCapResolvedBy');
}

function clampHeroHpAndResolveWinner(state) {
  state.playerHP = Math.max(0, state.playerHP);
  state.enemyHP = Math.max(0, state.enemyHP);

  if (state.playerHP === 0 || state.enemyHP === 0) {
    state.winner = state.playerHP === 0 && state.enemyHP === 0
      ? 'draw'
      : (state.playerHP === 0 ? 'enemy' : 'player');
  }
}

function finalizeImmediateLaneCombat(state) {
  cleanupAllDefeatedUnitsWithTriggers(state);
  clampHeroHpAndResolveWinner(state);
}

function triggerUnitDeathEffects(state, index, unit) {
  if (!unit) return;
  const owner = unit.owner;
  const enemyOwner = getOpponentOwner(owner);

  if (unit.effectId === 'death_damage_enemy_hero_1') {
    const hpKey = enemyOwner === 'player' ? 'playerHP' : 'enemyHP';
    state[hpKey] = Math.max(0, state[hpKey] - 1);
  }

  if (unit.effectId === 'on_death_summon_grunt' && state.board[index] === null) {
    state.board[index] = createBoardUnitFromCard({
      id: `${owner}_death_grunt_${Date.now()}_${index}`,
      name: 'Grunt',
      type: 'unit',
      attack: 1,
      hp: 1,
      armor: 0,
      effectId: null,
    }, owner);
  }
}

function cleanupDefeatedUnitsWithTriggers(state, boardIndexes) {
  boardIndexes.forEach((index) => {
    const unit = state.board[index];
    if (!unit || unit.hp > 0) return;
    state.board[index] = null;
    triggerUnitDeathEffects(state, index, unit);
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
    unit.tempAttackMod = (unit.tempAttackMod ?? 0) + 1;
  }
}

export function getUnitAttack(unit) {
  if (!unit) return 0;
  const baseAttack = unit.attack ?? 0;
  const tempAttack = unit.tempAttackMod ?? 0;
  return Math.max(0, baseAttack + tempAttack);
}

export function getUnitArmor(unit) {
  if (!unit) return 0;
  const baseArmor = unit.armor ?? 0;
  const tempArmor = unit.tempArmorMod ?? 0;
  return Math.max(0, baseArmor + tempArmor);
}

function isMoveEffectId(effectId) {
  return effectId === 'swap_any_two_units' || effectId === 'swap_two_enemy_units' || effectId === 'swap_adjacent_then_resolve';
}

function isDisableEffectId(effectId) {
  if (!effectId) return false;
  if (effectId === 'control_enemy_unit_this_turn' || effectId === 'cannot_attack') return true;
  return effectId.includes('disable');
}

function hasMoveDisableImmunity(state, protectedOwner, actingOwner, effectId) {
  if (!state?.immuneMoveDisableThisTurn?.[protectedOwner]) return false;
  return getOpponentOwner(actingOwner) === protectedOwner
    && (isMoveEffectId(effectId) || isDisableEffectId(effectId));
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

function applyEffectById(state, owner, effectId) {
  switch (effectId) {
    case 'damage_up_to_2_enemies_1': {
      const enemyIndexes = getLeftmostOccupiedRowIndexes(state, getRowForOwner(getOpponentOwner(owner)), 2);
      enemyIndexes.forEach((index) => {
        state.board[index].hp -= 1;
      });
      removeDefeatedUnits(state, enemyIndexes);
      break;
    }
    case 'heal_2':
    case 'heal_1_atk_1_draw_on_kill_this_turn':
    case 'heal_3':
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
      state.board[emptySlot] = createBoardUnitFromCard({
        id: `${owner}_summoned_grunt_${Date.now()}_${emptySlot}`,
        name: 'Grunt',
        type: 'unit',
        attack: 1,
        hp: 1,
        armor: 0,
        effectId: null,
      }, owner);
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
          attack: 0,
          hp: 1,
          armor: 0,
          effectId: null,
        }, owner);
        summoned += 1;
      });
      break;
    }
    // Quick Strike, Quick Fix, and Control Override are targeted and handled via resolveTargetedEffectCard.
    case 'quick_strike':
    case 'control_enemy_unit_this_turn':
      break;
    case 'cannot_drop_below_1_this_turn': {
      if (!state.cannotDropBelowOneThisTurn) {
        state.cannotDropBelowOneThisTurn = { player: false, enemy: false };
      }
      state.cannotDropBelowOneThisTurn[owner] = true;
      break;
    }
    case 'cancel_enemy_order': {
      if (!state.cancelEnemyOrderThisTurn) {
        state.cancelEnemyOrderThisTurn = { player: false, enemy: false };
      }
      state.cancelEnemyOrderThisTurn[owner] = true;
      break;
    }
    case 'immune_move_disable_this_turn': {
      if (!state.immuneMoveDisableThisTurn) {
        state.immuneMoveDisableThisTurn = { player: false, enemy: false };
      }
      state.immuneMoveDisableThisTurn[owner] = true;
      break;
    }
    case 'revive_friendly_1hp': {
      const friendlyIndexes = getRowForOwner(owner);
      const emptySlot = friendlyIndexes.find((index) => state.board[index] === null);
      if (emptySlot === undefined) break;
      const discard = owner === 'player' ? state.player.discard : state.enemy.discard;
      const reviveIndex = discard.findIndex((card) => card?.type === 'unit');
      if (reviveIndex < 0) break;
      const [reviveCard] = discard.splice(reviveIndex, 1);
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
    noProgressStallResolvedBy: null,
    turnsCompleted: 0,
    firstActor,
    player: {
      factionName: playerFactionData?.name ?? 'Unknown',
      deck: playerDeck,
      hand: [],
      discard: [],
      maxHandSize: 5,
    },
    enemy: {
      factionName: enemyFactionData?.name ?? 'Unknown',
      deck: enemyDeck,
      hand: [],
      discard: [],
      maxHandSize: 5,
    },
    cannotDropBelowOneThisTurn: {
      player: false,
      enemy: false,
    },
    cancelEnemyOrderThisTurn: {
      player: false,
      enemy: false,
    },
    immuneMoveDisableThisTurn: {
      player: false,
      enemy: false,
    },
    noProgressStall: createNoProgressRoundState({
      playerHP: HERO_START_HP,
      enemyHP: HERO_START_HP,
      board: Array(BOARD_SIZE).fill(null),
    }),
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

export function drawCards(sideState, count) {
  if (!sideState || count <= 0) {
    return sideState;
  }

  const drawLimit = Math.max(0, sideState.maxHandSize - sideState.hand.length);
  const cardsToDraw = Math.min(count, drawLimit, sideState.deck.length);

  for (let i = 0; i < cardsToDraw; i += 1) {
    const card = sideState.deck.shift();
    sideState.hand.push(card);
  }

  return sideState;
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
      drawCards(side, 1);
      state.quickFixTempoDraws = (state.quickFixTempoDraws ?? 0) + 1;
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
    return { ok: false, reason: 'Lane is blocked for unit placement this turn' };
  }
  if (!occupyingUnit) return { ok: true, type: 'play' };
  if (occupyingUnit.owner !== owner) return { ok: false, reason: 'Slot is occupied by opponent' };

  if (side.hand.length >= side.maxHandSize) {
    return { ok: false, reason: 'Redeploy blocked: hand is full' };
  }

  return { ok: true, type: 'redeploy' };
}

export function playEffectCard(state, owner, handCardId) {
  if (!state || state.winner) return { ok: false, reason: 'Battle is over' };
  const side = owner === 'player' ? state.player : state.enemy;
  const handIndex = side.hand.findIndex((item) => item.id === handCardId);
  if (handIndex < 0) return { ok: false, reason: 'Card not in hand' };

  const [card] = side.hand.splice(handIndex, 1);
  if (card.type === 'unit') {
    side.hand.splice(handIndex, 0, card);
    return { ok: false, reason: 'Unit cards must be placed on board' };
  }

  side.discard.push(card);
  const protectedOwner = getOpponentOwner(owner);
  const blockedByImmunity = hasMoveDisableImmunity(state, protectedOwner, owner, card.effectId ?? null);
  if (!blockedByImmunity) {
    applyEffectById(state, owner, card.effectId ?? null);
  }
  recordProgressAction(state, owner, blockedByImmunity ? 'effect-blocked' : 'effect');
  return { ok: true, type: blockedByImmunity ? 'effect-blocked' : 'effect', card };
}

export function resolveTargetedEffectCard(state, owner, handCardId, boardIndex, targetIndexes = [boardIndex]) {
  if (!state || state.winner) return { ok: false, reason: 'Battle is over' };
  const side = owner === 'player' ? state.player : state.enemy;
  const handIndex = side.hand.findIndex((item) => item.id === handCardId);
  if (handIndex < 0) return { ok: false, reason: 'Card not in hand' };

  const card = side.hand[handIndex];
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
    return { ok: true, type: 'targeted-effect-blocked', card: playedCard };
  }

  switch (card.effectId) {
    case 'return_friendly_draw_1': {
      if (targetUnit.owner !== owner) return { ok: false, reason: 'Target must be friendly' };
      if (side.hand.length >= side.maxHandSize) return { ok: false, reason: 'Hand is full' };
      side.hand.push(createCardFromBoardUnit(targetUnit));
      state.board[boardIndex] = null;
      drawCards(side, 1);
      break;
    }
    case 'destroy_friendly_draw_2': {
      if (targetUnit.owner !== owner) return { ok: false, reason: 'Target must be friendly' };
      state.board[boardIndex] = null;
      drawCards(side, 2);
      break;
    }
    case 'enemy_lane_atk_minus_1': {
      if (targetUnit.owner !== getOpponentOwner(owner)) return { ok: false, reason: 'Target must be enemy' };
      targetUnit.tempAttackMod = (targetUnit.tempAttackMod ?? 0) - 1;
      break;
    }
    case 'quick_strike': {
      if (targetUnit.owner !== owner) return { ok: false, reason: 'Target must be friendly' };
      const lane = boardIndex % 3;
      resolveCombatLane(state, lane);
      finalizeImmediateLaneCombat(state);
      break;
    }
    case 'control_enemy_unit_this_turn': {
      if (targetUnit.owner !== getOpponentOwner(owner)) return { ok: false, reason: 'Target must be enemy' };
      targetUnit.controlledAttackThisTurn = true;
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
      resolveCombatLane(state, targetLane);
      finalizeImmediateLaneCombat(state);
      break;
    }
    case 'swap_two_enemy_units': {
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
      state.board[firstIndex] = secondUnit;
      state.board[secondIndex] = firstUnit;
      break;
    }
    default:
      return { ok: false, reason: 'Effect does not support targeted resolution' };
  }

  const [playedCard] = side.hand.splice(handIndex, 1);
  side.discard.push(playedCard);
  recordProgressAction(state, owner, 'targeted-effect');
  return { ok: true, type: 'targeted-effect', card: playedCard };
}


export function resolveQuickStrike(state, owner, boardIndex) {
  if (!state || state.winner) return { ok: false, reason: 'Battle is over' };
  const targetUnit = state.board[boardIndex];
  if (!targetUnit || targetUnit.owner !== owner) {
    return { ok: false, reason: 'Target must be friendly' };
  }
  const lane = boardIndex % 3;
  resolveCombatLane(state, lane);
  finalizeImmediateLaneCombat(state);
  recordProgressAction(state, owner, 'quick-strike');
  return { ok: true, type: 'quick-strike', lane };
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
    case 'swap_two_enemy_units': {
      const enemyIndexes = getRowForOwner(enemyOwner).filter((index) => state.board[index]?.owner === enemyOwner);
      if (enemyIndexes.length >= 2) {
        const [firstIndex, secondIndex] = enemyIndexes;
        const firstUnit = state.board[firstIndex];
        state.board[firstIndex] = state.board[secondIndex];
        state.board[secondIndex] = firstUnit;
      }
      break;
    }
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
    case 'cancel_enemy_order': {
      applyEffectById(state, owner, 'cancel_enemy_order');
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
    side.hand.push(createCardFromBoardUnit(displacedUnit));
  }

  state.board[boardIndex] = createBoardUnitFromCard(card, owner);
  resolveUnitOnPlayEffect(state, owner, boardIndex, card);

  side.discard.push(card);
  recordProgressAction(state, owner, validation.type);
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
      if (!unit) return;
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

  const getAttackWithCombatBonuses = (unit, unitIndex) => {
    if (!unit) return 0;
    let attack = unit.effectId === 'cannot_attack' ? 0 : (unit.attack ?? 0);
    if (unit.effectId === 'empty_adjacent_bonus_atk') {
      const rowStart = unit.owner === 'player' ? 6 : 0;
      const lane = unitIndex % 3;
      const adjacentIndexes = [];
      if (lane > 0) adjacentIndexes.push(rowStart + lane - 1);
      if (lane < 2) adjacentIndexes.push(rowStart + lane + 1);
      const hasEmptyAdjacent = adjacentIndexes.some((idx) => state.board[idx] === null);
      if (hasEmptyAdjacent) attack += 1;
    }
    return Math.max(0, attack);
  };

  const getAuraBonusAttack = (unit) => {
    if (!unit) return 0;
    const lane = unit.owner === 'player' ? (unit.__index - 6) : unit.__index;
    const rowStart = unit.owner === 'player' ? 6 : 0;
    let bonus = 0;
    const left = lane > 0 ? state.board[rowStart + lane - 1] : null;
    const right = lane < 2 ? state.board[rowStart + lane + 1] : null;
    if (hasSwarmAlphaAura(left)) bonus += 1;
    if (hasSwarmAlphaAura(right)) bonus += 1;
    return bonus;
  };

  const getArmorWithAura = (unit) => {
    if (!unit) return 0;
    const baseArmor = getUnitArmor(unit);
    const lane = unit.owner === 'player' ? (unit.__index - 6) : unit.__index;
    const rowStart = unit.owner === 'player' ? 6 : 0;
    let aura = 0;
    const left = lane > 0 ? state.board[rowStart + lane - 1] : null;
    const right = lane < 2 ? state.board[rowStart + lane + 1] : null;
    if (left?.effectId === 'lane_armor_aura_1') aura += 1;
    if (right?.effectId === 'lane_armor_aura_1') aura += 1;
    return baseArmor + aura;
  };

  const getAuraArmorIgnore = (unit) => {
    if (!unit) return 0;
    const lane = unit.owner === 'player' ? (unit.__index - 6) : unit.__index;
    const rowStart = unit.owner === 'player' ? 6 : 0;
    const left = lane > 0 ? state.board[rowStart + lane - 1] : null;
    const right = lane < 2 ? state.board[rowStart + lane + 1] : null;
    return hasSwarmAlphaAura(left) || hasSwarmAlphaAura(right) ? 1 : 0;
  };

  const getMitigatedDamage = (attacker, defender) => {
    const attackDamage = getUnitAttack(attacker);
    if (defender?.ignoreArmorNext) {
      defender.ignoreArmorNext = false;
      return Math.max(0, attackDamage);
    }
    const armor = Math.max(0, getArmorWithAura(defender) - getAuraArmorIgnore(attacker));
    return Math.max(0, attackDamage - armor);
  };

  const enemyIndex = ENEMY_ROW[col];
  const playerIndex = PLAYER_ROW[col];
  const enemy = state.board[enemyIndex] ? { ...state.board[enemyIndex], __index: enemyIndex } : null;
  const player = state.board[playerIndex] ? { ...state.board[playerIndex], __index: playerIndex } : null;

  const pendingUnitDamage = new Map();
  const addPendingUnitDamage = (index, amount) => {
    if (!amount || amount <= 0) return;
    pendingUnitDamage.set(index, (pendingUnitDamage.get(index) ?? 0) + amount);
  };
  const wouldUnitDamageBeLethal = (index, amount) => {
    const target = state.board[index];
    if (!target || amount <= 0) return false;
    const accumulatedDamage = pendingUnitDamage.get(index) ?? 0;
    const projectedHp = target.hp - accumulatedDamage - amount;
    const minOneProtection = Boolean(state.cannotDropBelowOneThisTurn?.[target.owner]);
    return !minOneProtection && projectedHp <= 0;
  };
  const recordCombatEvent = ({ attackerSide, attackerIndex = null, targetType, targetSide, targetIndex = null, damage, openLane, lethal = false }) => {
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
    Object.defineProperties(event, {
      attackerIndex: { value: attackerIndex, enumerable: false },
      targetIndex: { value: targetIndex, enumerable: false },
    });
    context.events.push(event);
  };
  const recordUnitAttack = (attackerSide, attackerIndex, targetIndex, damage) => {
    const target = state.board[targetIndex];
    if (!target) return;
    recordCombatEvent({
      attackerSide,
      attackerIndex,
      targetType: 'unit',
      targetSide: target.owner,
      targetIndex,
      damage,
      openLane: false,
      lethal: wouldUnitDamageBeLethal(targetIndex, damage),
    });
  };
  const recordHeroAttack = (attackerSide, targetSide, damage, openLane) => {
    recordCombatEvent({
      attackerSide,
      targetType: 'hero',
      targetSide,
      damage,
      openLane,
      lethal: false,
    });
  };

  if (player) {
    const playerAttack = getAttackWithCombatBonuses(player, playerIndex) + getAuraBonusAttack(player);
    const canHitAnyLane = player.effectId === 'can_hit_any_lane';
    const sniperTargetIndex = canHitAnyLane ? findSniperTargetIndex(player.owner) : null;
    if (sniperTargetIndex !== null) {
      const sniperTarget = state.board[sniperTargetIndex];
      if (sniperTarget) {
        const damage = getMitigatedDamage({ ...player, attack: playerAttack }, sniperTarget);
        recordUnitAttack('player', playerIndex, sniperTargetIndex, damage);
        addPendingUnitDamage(sniperTargetIndex, damage);
      }
    } else if (enemy) {
      const damage = getMitigatedDamage({ ...player, attack: playerAttack }, enemy);
      const interceptIndex = findGuardianInterceptIndex(enemyIndex);
      if (interceptIndex !== null) {
        recordUnitAttack('player', playerIndex, interceptIndex, damage);
        addPendingUnitDamage(interceptIndex, damage);
        context.guardiansUsed.add(interceptIndex);
      } else {
        recordUnitAttack('player', playerIndex, enemyIndex, damage);
        addPendingUnitDamage(enemyIndex, damage);
      }
    } else {
      const laneBonus = player.effectId === 'lane_empty_bonus_damage' ? 1 : 0;
      const damage = playerAttack + laneBonus;
      recordHeroAttack('player', 'enemy', damage, true);
      state.enemyHP -= damage;
    }
    if (player.effectId === 'self_damage_after_attack') addPendingUnitDamage(playerIndex, 1);
  }

  if (enemy) {
    const enemyAttack = getAttackWithCombatBonuses(enemy, enemyIndex) + getAuraBonusAttack(enemy);
    const controlledToHero = Boolean(enemy.controlledAttackThisTurn);
    const canHitAnyLane = enemy.effectId === 'can_hit_any_lane';
    const sniperTargetIndex = !controlledToHero && canHitAnyLane ? findSniperTargetIndex(enemy.owner) : null;
    if (controlledToHero) {
      recordHeroAttack('enemy', 'enemy', enemyAttack, false);
      state.enemyHP -= enemyAttack;
    } else if (sniperTargetIndex !== null) {
      const sniperTarget = state.board[sniperTargetIndex];
      if (sniperTarget) {
        const damage = getMitigatedDamage({ ...enemy, attack: enemyAttack }, sniperTarget);
        recordUnitAttack('enemy', enemyIndex, sniperTargetIndex, damage);
        addPendingUnitDamage(sniperTargetIndex, damage);
      }
    } else if (player) {
      const damage = getMitigatedDamage({ ...enemy, attack: enemyAttack }, player);
      const interceptIndex = findGuardianInterceptIndex(playerIndex);
      if (interceptIndex !== null) {
        recordUnitAttack('enemy', enemyIndex, interceptIndex, damage);
        addPendingUnitDamage(interceptIndex, damage);
        context.guardiansUsed.add(interceptIndex);
      } else {
        recordUnitAttack('enemy', enemyIndex, playerIndex, damage);
        addPendingUnitDamage(playerIndex, damage);
      }
    } else {
      const laneBonus = enemy.effectId === 'lane_empty_bonus_damage' ? 1 : 0;
      const damage = enemyAttack + laneBonus;
      recordHeroAttack('enemy', 'player', damage, true);
      state.playerHP -= damage;
    }
    if (enemy.effectId === 'self_damage_after_attack') addPendingUnitDamage(enemyIndex, 1);
  }

  pendingUnitDamage.forEach((amount, index) => {
    applyDamageToUnit(state, index, amount);
  });

  triggerQuickFixDrawsFromCombatEvents(state, context.events);

  cleanupDefeatedUnitsWithTriggers(state, [enemyIndex, playerIndex]);

  return context.events;
}

export function resolveCombat(state) {
  const combatContext = { guardiansUsed: new Set(), events: [] };
  for (let col = 0; col < 3; col += 1) {
    resolveCombatLane(state, col, combatContext);
  }

  cleanupDefeatedUnitsWithTriggers(state, [...ENEMY_ROW, ...PLAYER_ROW]);

  if (state.cannotDropBelowOneThisTurn) {
    state.cannotDropBelowOneThisTurn.player = false;
    state.cannotDropBelowOneThisTurn.enemy = false;
  }
  if (state.enemyLanePlayBlockedThisTurn) {
    state.enemyLanePlayBlockedThisTurn = [false, false, false];
  }
  if (state.playerLanePlayBlockedThisTurn) {
    state.playerLanePlayBlockedThisTurn = [false, false, false];
  }
  if (state.cancelEnemyOrderThisTurn) {
    state.cancelEnemyOrderThisTurn.player = false;
    state.cancelEnemyOrderThisTurn.enemy = false;
  }

  if (state.immuneMoveDisableThisTurn) {
    state.immuneMoveDisableThisTurn.player = false;
    state.immuneMoveDisableThisTurn.enemy = false;
  }

  state.board.forEach((unit) => {
    if (unit?.controlledAttackThisTurn) {
      delete unit.controlledAttackThisTurn;
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
  });

  clampHeroHpAndResolveWinner(state);

  return combatContext.events;
}
