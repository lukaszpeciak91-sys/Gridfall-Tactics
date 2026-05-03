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
  boardIndexes.forEach((index) => {
    if (state.board[index] && state.board[index].hp <= 0) {
      state.board[index] = null;
    }
  });
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
    case 'buff_all_atk_1': {
      const friendlyIndexes = getRowForOwner(owner);
      friendlyIndexes.forEach((index) => {
        if (state.board[index]) {
          state.board[index].attack += 1;
        }
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
    default:
      break;
  }
}

export function createInitialBattleState(factionData) {
  const deck = Array.isArray(factionData?.deck) ? [...factionData.deck] : [];

  return {
    board: Array(BOARD_SIZE).fill(null),
    playerHP: HERO_START_HP,
    enemyHP: HERO_START_HP,
    playerMaxHP: HERO_START_HP,
    enemyMaxHP: HERO_START_HP,
    winner: null,
    player: {
      factionName: factionData?.name ?? 'Unknown',
      deck,
      hand: [],
      discard: [],
      maxHandSize: 5,
    },
    enemy: {
      deck: [...deck],
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

export function resolveCombat(state) {
  for (let col = 0; col < 3; col += 1) {
    const enemyIndex = ENEMY_ROW[col];
    const playerIndex = PLAYER_ROW[col];
    const enemy = state.board[enemyIndex];
    const player = state.board[playerIndex];

    if (player) {
      if (enemy) enemy.hp -= player.attack;
      else state.enemyHP -= player.attack;
    }

    if (enemy) {
      if (player) player.hp -= enemy.attack;
      else state.playerHP -= enemy.attack;
    }
  }

  [...ENEMY_ROW, ...PLAYER_ROW].forEach((index) => {
    if (state.board[index] && state.board[index].hp <= 0) {
      state.board[index] = null;
    }
  });

  state.playerHP = Math.max(0, state.playerHP);
  state.enemyHP = Math.max(0, state.enemyHP);
  if (state.playerHP === 0 || state.enemyHP === 0) {
    state.winner = state.playerHP === 0 && state.enemyHP === 0 ? 'draw' : (state.playerHP === 0 ? 'enemy' : 'player');
  }

  return state;
}
