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
  if (unit.hp > 0 && unit.effectId === 'gain_atk_when_damaged') {
    unit.attack += 1;
  }
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
    case 'heal_2': {
      const hpKey = owner === 'player' ? 'playerHP' : 'enemyHP';
      const maxHpKey = owner === 'player' ? 'playerMaxHP' : 'enemyMaxHP';
      state[hpKey] = Math.min(state[maxHpKey], state[hpKey] + 2);
      break;
    }
    case 'heal_3': {
      const hpKey = owner === 'player' ? 'playerHP' : 'enemyHP';
      const maxHpKey = owner === 'player' ? 'playerMaxHP' : 'enemyMaxHP';
      state[hpKey] = Math.min(state[maxHpKey], state[hpKey] + 3);
      break;
    }
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
          state.board[index].attack += 1;
        }
      });
      break;
    }
    case 'buff_all_armor_1': {
      const friendlyIndexes = getRowForOwner(owner);
      friendlyIndexes.forEach((index) => {
        const unit = state.board[index];
        if (!unit) return;
        unit.armor = (unit.armor ?? 0) + 1;
      });
      break;
    }
    case 'enemy_all_atk_minus_1': {
      const enemyIndexes = getRowForOwner(getOpponentOwner(owner));
      enemyIndexes.forEach((index) => {
        const enemyUnit = state.board[index];
        if (!enemyUnit) return;
        enemyUnit.attack = Math.max(0, (enemyUnit.attack ?? 0) - 1);
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
    case 'fill_empty_slots_1hp': {
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
  applyEffectById(state, owner, card.effectId ?? null);
  return { ok: true, type: 'effect', card };
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
      targetUnit.attack = Math.max(0, (targetUnit.attack ?? 0) - 1);
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

  if (card.effectId === 'on_play_lane_damage_1') {
    const enemyIndex = owner === 'player' ? boardIndex - 6 : boardIndex + 6;
    if (state.board[enemyIndex] && state.board[enemyIndex].owner !== owner) {
      applyDamageToUnit(state, enemyIndex, 1);
      cleanupDefeatedUnitsWithTriggers(state, [enemyIndex]);
    }
  }

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

function resolveCombatLane(state, col) {
  const getMitigatedDamage = (attacker, defender) => {
    const attackDamage = attacker?.attack ?? 0;
    if (defender?.ignoreArmorNext) {
      defender.ignoreArmorNext = false;
      return Math.max(0, attackDamage);
    }
    const armor = defender?.armor ?? 0;
    return Math.max(0, attackDamage - armor);
  };

  const enemyIndex = ENEMY_ROW[col];
  const playerIndex = PLAYER_ROW[col];
  const enemy = state.board[enemyIndex];
  const player = state.board[playerIndex];

  if (player) {
    const playerAttack = player.effectId === 'cannot_attack' ? 0 : (player.attack ?? 0);
    if (enemy) {
      applyDamageToUnit(state, enemyIndex, getMitigatedDamage({ ...player, attack: playerAttack }, enemy));
    } else {
      state.enemyHP -= playerAttack;
    }
    if (player.effectId === 'self_damage_after_attack') {
      applyDamageToUnit(state, playerIndex, 1);
    }
  }

  if (enemy) {
    const enemyAttack = enemy.effectId === 'cannot_attack' ? 0 : (enemy.attack ?? 0);
    const controlledToHero = Boolean(enemy.controlledAttackThisTurn);
    if (controlledToHero) {
      state.enemyHP -= enemyAttack;
    } else if (player) {
      applyDamageToUnit(state, playerIndex, getMitigatedDamage({ ...enemy, attack: enemyAttack }, player));
    } else {
      state.playerHP -= enemyAttack;
    }
    if (enemy.effectId === 'self_damage_after_attack') {
      applyDamageToUnit(state, enemyIndex, 1);
    }
  }

  cleanupDefeatedUnitsWithTriggers(state, [enemyIndex, playerIndex]);
}

export function resolveCombat(state) {
  for (let col = 0; col < 3; col += 1) {
    resolveCombatLane(state, col);
  }

  cleanupDefeatedUnitsWithTriggers(state, [...ENEMY_ROW, ...PLAYER_ROW]);

  state.board.forEach((unit) => {
    if (unit?.controlledAttackThisTurn) {
      delete unit.controlledAttackThisTurn;
    }
  });

  state.playerHP = Math.max(0, state.playerHP);
  state.enemyHP = Math.max(0, state.enemyHP);
  if (state.playerHP === 0 || state.enemyHP === 0) {
    state.winner = state.playerHP === 0 && state.enemyHP === 0 ? 'draw' : (state.playerHP === 0 ? 'enemy' : 'player');
  }

  return state;
}
