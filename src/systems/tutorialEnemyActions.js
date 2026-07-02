import { getTutorialEnemyActionScript } from '../data/tutorial/tutorialDecks.js';
import { canPlayOrRedeploy } from './GameState.js';

export const TUTORIAL_ENEMY_ACTION_FALLBACK_TYPE = 'pass';

export function createTutorialEnemyPassFallback(reason = 'unknown') {
  return { type: TUTORIAL_ENEMY_ACTION_FALLBACK_TYPE, tutorialFallbackReason: reason };
}

export function selectNextTutorialEnemyAction(gameState, cursor = 0, script = getTutorialEnemyActionScript()) {
  const safeCursor = Number.isInteger(cursor) && cursor >= 0 ? cursor : 0;
  if (!Array.isArray(script) || safeCursor >= script.length) {
    return {
      action: createTutorialEnemyPassFallback('script_exhausted'),
      nextCursor: safeCursor,
      fallbackReason: 'script_exhausted',
    };
  }

  const action = script[safeCursor];
  const nextCursor = safeCursor + 1;
  if (!action || action.type === 'pass') {
    return { action: { type: 'pass' }, nextCursor, fallbackReason: null };
  }

  if (action.type !== 'play-unit') {
    const fallbackReason = `unsupported_action:${action?.type ?? 'missing'}`;
    return { action: createTutorialEnemyPassFallback(fallbackReason), nextCursor, fallbackReason };
  }

  if (!canPlayOrRedeploy(gameState, 'enemy', action.cardId, action.slotIndex).ok) {
    const fallbackReason = `invalid_play_unit:${action.cardId}:${action.slotIndex}`;
    return { action: createTutorialEnemyPassFallback(fallbackReason), nextCursor, fallbackReason };
  }

  return { action: { ...action }, nextCursor, fallbackReason: null };
}
