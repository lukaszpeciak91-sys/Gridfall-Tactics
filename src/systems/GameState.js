export function createInitialBattleState(factionData) {
  const deck = Array.isArray(factionData?.deck) ? [...factionData.deck] : [];

  return {
    board: Array(9).fill(null),
    player: {
      factionName: factionData?.name ?? 'Unknown',
      deck,
      hand: [],
      discard: [],
      maxHandSize: 5,
    },
    turn: {
      current: 'player',
      actionUsed: false,
    },
  };
}

export function drawCards(state, count) {
  if (!state?.player || count <= 0) {
    return state;
  }

  const drawLimit = Math.max(0, state.player.maxHandSize - state.player.hand.length);
  const cardsToDraw = Math.min(count, drawLimit, state.player.deck.length);

  for (let i = 0; i < cardsToDraw; i += 1) {
    const card = state.player.deck.shift();
    state.player.hand.push(card);
  }

  return state;
}
