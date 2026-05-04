const BOARD_SIZE = 9;
const ENEMY_ROW = [0, 1, 2];
const PLAYER_ROW = [6, 7, 8];
const HERO_START_HP = 12;

function getRowForOwner(owner) {
  return owner === 'player' ? PLAYER_ROW : ENEMY_ROW;
}

function getOpponentOwner(owner) {
  return owner === 'player' ? 'enemy' : 'player';
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

function applyEffectById(state, owner, effectId) {
  switch (effectId) {
    case 'damage_all_enemies_1': {
      const enemyIndexes = getRowForOwner(getOpponentOwner(owner));
      enemyIndexes.forEach((index) => {
        if (state.board[index]) {
          state.board[index].hp -= 1;
        }
      });
      removeDefeatedUnits(state, enemyIndexes);
      break;
    }
    case 'heal_2':
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
    case 'buff_all_atk_1': {
      const friendlyIndexes = getRowForOwner(owner);
      friendlyIndexes.forEach((index) => {
        if (state.board[index]) {
          state.board[index].tempAttackMod = (state.board[index].tempAttackMod ?? 0) + 1;
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
      const enemyIndexes = getRowForOwner(getOpponentOwner(owner));
      enemyIndexes.forEach((index) => {
        const enemyUnit = state.board[index];
        if (!enemyUnit) return;
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
      friendlyIndexes.forEach((index) => {
        if (state.board[index]) return;
        state.board[index] = createBoardUnitFromCard({
          id: `${owner}_flood_token_${Date.now()}_${index}`,
          name: 'Token',
          type: 'unit',
          attack: 0,
          hp: 1,
          armor: 0,
          effectId: null,
        }, owner);
      });
      break;
    }
    // Quick Strike and Control Override are targeted and handled via resolveTargetedEffectCard.
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

export function createInitialBattleState(playerFactionData, enemyFactionData = playerFactionData) {
  const playerDeck = Array.isArray(playerFactionData?.deck) ? [...playerFactionData.deck] : [];
  const enemyDeck = Array.isArray(enemyFactionData?.deck) ? [...enemyFactionData.deck] : [];

  return {
    board: Array(BOARD_SIZE).fill(null),
    playerHP: HERO_START_HP,
    enemyHP: HERO_START_HP,
    playerMaxHP: HERO_START_HP,
    enemyMaxHP: HERO_START_HP,
    winner: null,
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
  };
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
      break;
    }
    case 'control_enemy_unit_this_turn': {
      if (targetUnit.owner !== getOpponentOwner(owner)) return { ok: false, reason: 'Target must be enemy' };
      targetUnit.controlledAttackThisTurn = true;
      break;
    }
    case 'ignore_armor_next_attack': {
      if (targetUnit.owner !== getOpponentOwner(owner)) return { ok: false, reason: 'Target must be enemy' };
      targetUnit.ignoreArmorNext = true;
      break;
    }
    case 'heal_2':
    case 'heal_3': {
      if (targetUnit.owner !== owner) return { ok: false, reason: 'Target must be friendly' };
      const amount = card.effectId === 'heal_3' ? 3 : 2;
      const hpCap = Number.isFinite(targetUnit.maxHp) ? targetUnit.maxHp : targetUnit.hp;
      targetUnit.hp = Math.min(hpCap, targetUnit.hp + amount);
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
  return { ok: true, type: validation.type, card };
}

export function performSwap(state, owner, fromIndex, toIndex) {
  if (!canSwap(state, fromIndex, toIndex, owner)) {
    return { ok: false, reason: 'Swap is not valid' };
  }
  const temp = state.board[fromIndex];
  state.board[fromIndex] = state.board[toIndex];
  state.board[toIndex] = temp;
  return { ok: true };
}

function resolveCombatLane(state, col, combatContext = null) {

  const context = combatContext ?? { guardiansUsed: new Set() };

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
    if (left?.effectId === 'adjacent_allies_atk_plus_1') bonus += 1;
    if (right?.effectId === 'adjacent_allies_atk_plus_1') bonus += 1;
    return bonus;
  };

  const getArmorWithAura = (unit) => {
    if (!unit) return 0;
    const baseArmor = unit.armor ?? 0;
    const lane = unit.owner === 'player' ? (unit.__index - 6) : unit.__index;
    const allyIndex = (unit.owner === 'player' ? 6 : 0) + lane;
    const allyInLane = state.board[allyIndex];
    const aura = allyInLane?.effectId === 'lane_armor_aura_1' ? 1 : 0;
    return baseArmor + aura;
  };

  const getMitigatedDamage = (attacker, defender) => {
    const attackDamage = getUnitAttack(attacker);
    if (defender?.ignoreArmorNext) {
      defender.ignoreArmorNext = false;
      return Math.max(0, attackDamage);
    }
    const armor = getArmorWithAura(defender);
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

  if (player) {
    const playerAttack = getAttackWithCombatBonuses(player, playerIndex) + getAuraBonusAttack(player);
    const canHitAnyLane = player.effectId === 'can_hit_any_lane';
    const sniperTargetIndex = canHitAnyLane ? findSniperTargetIndex(player.owner) : null;
    if (sniperTargetIndex !== null) {
      const sniperTarget = state.board[sniperTargetIndex];
      if (sniperTarget) {
        addPendingUnitDamage(sniperTargetIndex, getMitigatedDamage({ ...player, attack: playerAttack }, sniperTarget));
      }
    } else if (enemy) {
      const damage = getMitigatedDamage({ ...player, attack: playerAttack }, enemy);
      const interceptIndex = findGuardianInterceptIndex(enemyIndex);
      if (interceptIndex !== null) {
        addPendingUnitDamage(interceptIndex, damage);
        context.guardiansUsed.add(interceptIndex);
      } else {
        addPendingUnitDamage(enemyIndex, damage);
      }
    } else {
      const laneBonus = player.effectId === 'lane_empty_bonus_damage' ? 1 : 0;
      state.enemyHP -= playerAttack + laneBonus;
    }
    if (player.effectId === 'self_damage_after_attack') addPendingUnitDamage(playerIndex, 1);
  }

  if (enemy) {
    const enemyAttack = getAttackWithCombatBonuses(enemy, enemyIndex) + getAuraBonusAttack(enemy);
    const controlledToHero = Boolean(enemy.controlledAttackThisTurn);
    const canHitAnyLane = enemy.effectId === 'can_hit_any_lane';
    const sniperTargetIndex = !controlledToHero && canHitAnyLane ? findSniperTargetIndex(enemy.owner) : null;
    if (controlledToHero) {
      state.enemyHP -= enemyAttack;
    } else if (sniperTargetIndex !== null) {
      const sniperTarget = state.board[sniperTargetIndex];
      if (sniperTarget) {
        addPendingUnitDamage(sniperTargetIndex, getMitigatedDamage({ ...enemy, attack: enemyAttack }, sniperTarget));
      }
    } else if (player) {
      const damage = getMitigatedDamage({ ...enemy, attack: enemyAttack }, player);
      const interceptIndex = findGuardianInterceptIndex(playerIndex);
      if (interceptIndex !== null) {
        addPendingUnitDamage(interceptIndex, damage);
        context.guardiansUsed.add(interceptIndex);
      } else {
        addPendingUnitDamage(playerIndex, damage);
      }
    } else {
      const laneBonus = enemy.effectId === 'lane_empty_bonus_damage' ? 1 : 0;
      state.playerHP -= enemyAttack + laneBonus;
    }
    if (enemy.effectId === 'self_damage_after_attack') addPendingUnitDamage(enemyIndex, 1);
  }

  pendingUnitDamage.forEach((amount, index) => {
    applyDamageToUnit(state, index, amount);
  });

  cleanupDefeatedUnitsWithTriggers(state, [enemyIndex, playerIndex]);
}

export function resolveCombat(state) {
  const combatContext = { guardiansUsed: new Set() };
  for (let col = 0; col < 3; col += 1) {
    resolveCombatLane(state, col, combatContext);
  }

  cleanupDefeatedUnitsWithTriggers(state, [...ENEMY_ROW, ...PLAYER_ROW]);

  if (state.cannotDropBelowOneThisTurn) {
    state.cannotDropBelowOneThisTurn.player = false;
    state.cannotDropBelowOneThisTurn.enemy = false;
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
  });

  state.playerHP = Math.max(0, state.playerHP);
  state.enemyHP = Math.max(0, state.enemyHP);
  if (state.playerHP === 0 || state.enemyHP === 0) {
    state.winner = state.playerHP === 0 && state.enemyHP === 0 ? 'draw' : (state.playerHP === 0 ? 'enemy' : 'player');
  }

  return state;
}
