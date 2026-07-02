import { canOpeningMulligan, drawCards, performOpeningMulligan, STARTING_HAND_SIZE } from './GameState.js';

export function isTutorialBattleContext(battleContext) {
  return battleContext?.mode === 'tutorial';
}

export function moveConfiguredOpeningCardsToHand(side, cardIds = []) {
  if (!side || !Array.isArray(side.deck) || !Array.isArray(side.hand)) return;
  cardIds.forEach((cardId) => {
    const deckIndex = side.deck.findIndex((card) => card.id === cardId);
    if (deckIndex < 0) return;
    const [card] = side.deck.splice(deckIndex, 1);
    side.hand.push(card);
  });
}

export function applyTutorialOpeningSetup(gameState, openingConfig) {
  if (!gameState || !openingConfig) return;
  const handSize = openingConfig.startingHandSize ?? STARTING_HAND_SIZE;
  moveConfiguredOpeningCardsToHand(gameState.player, openingConfig.playerStartingHandCardIds);
  moveConfiguredOpeningCardsToHand(gameState.enemy, openingConfig.enemyStartingHandCardIds);
  drawCards(gameState.player, Math.max(0, handSize - gameState.player.hand.length));
  drawCards(gameState.enemy, Math.max(0, handSize - gameState.enemy.hand.length));
}

export function performTutorialOpeningMulligan(state, selectedIds = [], openingConfig) {
  if (!canOpeningMulligan(state, 'player')) {
    return { ok: false, reason: 'Opening mulligan is not available' };
  }

  const requiredCardId = openingConfig?.requiredPlayerMulliganCardId;
  const replacementCardId = openingConfig?.deterministicMulliganReplacementCardId;
  if (!requiredCardId || !replacementCardId || !selectedIds.includes(requiredCardId)) {
    return performOpeningMulligan(state, 'player', selectedIds);
  }

  const side = state.player;
  const baitIndex = side.hand.findIndex((card) => card.id === requiredCardId);
  const replacementIndex = side.deck.findIndex((card) => card.id === replacementCardId);
  if (baitIndex < 0 || replacementIndex < 0) {
    return performOpeningMulligan(state, 'player', selectedIds);
  }

  const [baitCard] = side.hand.splice(baitIndex, 1);
  const [replacementCard] = side.deck.splice(replacementIndex, 1);
  side.hand.push(replacementCard);
  side.deck.push(baitCard);
  state.mulligan ??= {};
  state.mulligan.playerUsed = true;
  state.mulligan.playerReplaced = 1;
  return { ok: true, type: 'opening-mulligan', replaced: 1, cardIds: [requiredCardId] };
}
