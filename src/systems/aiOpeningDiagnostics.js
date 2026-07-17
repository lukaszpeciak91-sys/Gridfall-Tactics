import { createInitialBattleState, drawCards, performOpeningMulligan, shuffleDeck, STARTING_HAND_SIZE, getUnitAttack } from './GameState.js';
import { buildActionCandidates, chooseBattleAction, scoreAction, selectOpeningMulliganCardIds, isAdjacencyDependentUnitCard } from './enemyDecision.js';

export const BOARD_SLOT_VISUAL_MAP = Object.freeze([
  { index: 0, row: 0, col: 0, rowMeaning: 'enemy', lane: 0, laneMeaning: 'left/top edge' },
  { index: 1, row: 0, col: 1, rowMeaning: 'enemy', lane: 1, laneMeaning: 'middle' },
  { index: 2, row: 0, col: 2, rowMeaning: 'enemy', lane: 2, laneMeaning: 'right/bottom edge' },
  { index: 3, row: 1, col: 0, rowMeaning: 'guide', lane: 0, laneMeaning: 'left/top guide' },
  { index: 4, row: 1, col: 1, rowMeaning: 'guide', lane: 1, laneMeaning: 'middle guide' },
  { index: 5, row: 1, col: 2, rowMeaning: 'guide', lane: 2, laneMeaning: 'right/bottom guide' },
  { index: 6, row: 2, col: 0, rowMeaning: 'player', lane: 0, laneMeaning: 'left/top edge' },
  { index: 7, row: 2, col: 1, rowMeaning: 'player', lane: 1, laneMeaning: 'middle' },
  { index: 8, row: 2, col: 2, rowMeaning: 'player', lane: 2, laneMeaning: 'right/bottom edge' },
]);

export function getOwnerRows(owner) {
  return owner === 'enemy' ? { friendly: [0, 1, 2], opposing: [6, 7, 8] } : { friendly: [6, 7, 8], opposing: [0, 1, 2] };
}

export function describeVisualSlot(index) {
  return BOARD_SLOT_VISUAL_MAP[index] ?? { index, row: null, col: null, rowMeaning: 'unknown', lane: null, laneMeaning: 'unknown' };
}

export function createSeededRandom(seed = 1) {
  let state = (Number(seed) || 1) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function cardsSummary(cards = []) {
  return cards.map((card) => ({ id: card?.id ?? null, name: card?.name ?? null, type: card?.type ?? null, effectId: card?.effectId ?? null }));
}

export function getAdjacentSlotDiagnostics(state, owner, slotIndex, card = null) {
  const { friendly, opposing } = getOwnerRows(owner);
  const lane = friendly.indexOf(slotIndex);
  const adjacent = [friendly[lane - 1], friendly[lane + 1]].filter(Number.isInteger);
  const occupiedAdjacentFriendlySlots = adjacent.filter((index) => state.board?.[index]?.owner === owner);
  const emptyAdjacentFriendlySlots = adjacent.filter((index) => !state.board?.[index]);
  const opposingIndex = lane >= 0 ? opposing[lane] : null;
  const opposingEnemy = Number.isInteger(opposingIndex) ? state.board?.[opposingIndex] ?? null : null;
  return {
    adjacentSlots: adjacent,
    occupiedAdjacentFriendlySlots,
    emptyAdjacentFriendlySlots,
    possibleAdjacentPositions: adjacent.length,
    opposingIndex,
    opposingEnemyPresent: Boolean(opposingEnemy),
    predictedImmediateCombatResult: opposingEnemy
      ? `opposed by ${opposingEnemy.name ?? opposingEnemy.cardId ?? opposingEnemy.id} for ${getUnitAttack(opposingEnemy)} ATK`
      : 'open lane',
    hasAdjacencyDependentMechanics: cardHasAdjacencyDependentMechanics(card),
  };
}

export function cardHasAdjacencyDependentMechanics(card) {
  return isAdjacencyDependentUnitCard(card);
}

function scoreCandidate(state, owner, action, generationOrder) {
  const score = scoreAction(state, owner, action);
  const side = owner === 'enemy' ? state.enemy : state.player;
  const card = side.hand.find((item) => item?.id === action.cardId) ?? null;
  const slotIndex = action.slotIndex ?? action.targetIndex ?? null;
  return {
    generationOrder,
    action: { ...action },
    cardId: action.cardId ?? null,
    cardName: card?.name ?? null,
    actionType: action.type,
    targetSlotIndex: slotIndex,
    visualSlotMeaning: Number.isInteger(slotIndex) ? describeVisualSlot(slotIndex) : null,
    score,
    scoreComponents: action.aiEvaluation ?? {},
    adjacencyFormationValue: action.aiEvaluation?.adjacencyFormationValue ?? 0,
    occupiedAdjacencyValue: action.aiEvaluation?.occupiedAdjacencyValue ?? 0,
    futureAdjacencyCapacityValue: action.aiEvaluation?.futureAdjacencyCapacityValue ?? 0,
    positionalScore: action.aiEvaluation?.adjacencyFormationValue ?? 0,
    cardSpecificScore: action.effectId ?? card?.effectId ?? null,
    adjacencyValue: action.type === 'play-unit' ? getAdjacentSlotDiagnostics(state, owner, action.slotIndex, card) : null,
    immediateCombatValue: action.type === 'play-unit' ? getAdjacentSlotDiagnostics(state, owner, action.slotIndex, card).predictedImmediateCombatResult : null,
    openLaneValue: action.type === 'play-unit' ? !getAdjacentSlotDiagnostics(state, owner, action.slotIndex, card).opposingEnemyPresent : null,
    futureBoardValue: null,
    penalties: [],
    bonuses: [],
  };
}

export function traceFirstAiDecisionAfterMulligan({ playerFaction, enemyFaction, seed = 1, aiOwner = 'enemy', firstActor = 'enemy' } = {}) {
  const randomFn = createSeededRandom(seed);
  const state = createInitialBattleState(playerFaction, enemyFaction, { firstActor, randomFn });
  shuffleDeck(state.player.deck, randomFn);
  shuffleDeck(state.enemy.deck, randomFn);
  drawCards(state.player, STARTING_HAND_SIZE);
  drawCards(state.enemy, STARTING_HAND_SIZE);
  const initialHand = cardsSummary(state[aiOwner].hand);
  const mulliganedCards = selectOpeningMulliganCardIds(state[aiOwner]);
  performOpeningMulligan(state, aiOwner, mulliganedCards, randomFn);
  const finalHand = cardsSummary(state[aiOwner].hand);
  const actions = buildActionCandidates(state, aiOwner, state[aiOwner].hand);
  const candidates = actions.map((action, index) => scoreCandidate(state, aiOwner, action, index)).filter((entry) => Number.isFinite(entry.score));
  const bestScore = candidates.reduce((max, entry) => Math.max(max, entry.score), Number.NEGATIVE_INFINITY);
  const tiedBest = candidates.filter((entry) => entry.score === bestScore);
  const selected = chooseBattleAction(state, aiOwner, { aiSafeSurrenderEnabled: false, randomFn });
  const selectedIndex = candidates.findIndex((entry) => JSON.stringify(entry.action) === JSON.stringify(selected));
  return {
    faction: state[aiOwner].factionName,
    opponent: state[aiOwner === 'enemy' ? 'player' : 'enemy'].factionName,
    seed,
    seat: aiOwner,
    whoActsFirst: state.firstActor,
    initialHand,
    mulliganedCards,
    finalHand,
    boardState: state.board.map((unit, index) => ({ index, unit })),
    candidateGenerationOrder: actions.map((action, index) => ({ index, action })),
    candidates: candidates.map((entry) => ({ ...entry, tiedWithAnotherCandidate: tiedBest.length > 1 && entry.score === bestScore })),
    exactTieCandidateCount: tiedBest.length,
    exactTieCandidateGenerationOrders: tiedBest.map((entry) => entry.generationOrder),
    tieBreakingRuleUsed: tiedBest.length > 1 ? 'seeded exact-score tie-break' : 'single highest score',
    tieBreakDetails: selected.aiEvaluation?.tieBreak ?? null,
    selectedAction: selected,
    selectedCandidateGenerationOrder: selectedIndex,
    exactReason: selected.aiEvaluation?.utilityChosenReason ?? (tiedBest.length > 1 ? 'first best action' : 'highest scored legal action'),
  };
}
