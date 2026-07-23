import { evaluateAchievements, getAchievementDefinitions, loadAchievementState, saveAchievementState } from './achievements.js';
import { calculateAchievementProgression } from './achievementProgression.js';
import { setAchievementPresentationBatch } from './achievementPresentationQueue.js';
import { loadPlayerStats } from './playerStats.js';

export function evaluateAndPersistAchievementUnlocks(options = {}) {
  const {
    loadStats = loadPlayerStats,
    loadState = loadAchievementState,
    evaluate = evaluateAchievements,
    getDefinitions = getAchievementDefinitions,
    saveState = saveAchievementState,
    enqueuePresentation = setAchievementPresentationBatch,
    logger = console,
    ...evaluationOptions
  } = options;

  try {
    const playerStats = loadStats();
    const achievementState = loadState();
    const definitions = getDefinitions();
    const previousProgression = calculateAchievementProgression(definitions, achievementState);
    const result = evaluate(playerStats, achievementState, evaluationOptions);
    const newlyUnlocked = Array.isArray(result?.newlyUnlocked) ? result.newlyUnlocked : [];
    const achievementIds = newlyUnlocked.map((entry) => entry.id).filter((id) => typeof id === 'string' && id.length > 0);
    const newProgression = calculateAchievementProgression(definitions, result?.achievementState);
    const presentation = {
      achievementIds,
      progression: {
        previousPoints: previousProgression.earnedPoints,
        newPoints: newProgression.earnedPoints,
        previousLevel: previousProgression.level,
        newLevel: newProgression.level,
        levelIncreased: newlyUnlocked.length > 0 && newProgression.level > previousProgression.level,
      },
    };

    if (newlyUnlocked.length > 0) {
      let achievementState = result.achievementState;
      try {
        achievementState = saveState(result.achievementState) ?? result.achievementState;
      } catch (error) {
        logger?.warn?.('Achievement state persistence failed; gameplay will continue.', error);
      }

      try {
        enqueuePresentation(achievementIds);
      } catch (error) {
        logger?.warn?.('Achievement presentation batch update failed; gameplay will continue.', error);
      }

      return {
        ...result,
        achievementState,
        presentation,
      };
    }

    try {
      enqueuePresentation([]);
    } catch (error) {
      logger?.warn?.('Achievement presentation batch clear failed; gameplay will continue.', error);
    }

    return {
      ...result,
      presentation,
    };
  } catch (error) {
    logger?.warn?.('Achievement evaluation failed; gameplay will continue.', error);
    return {
      achievementState: undefined,
      newlyUnlocked: [],
      progress: {},
      presentation: {
        achievementIds: [],
        progression: {
          previousPoints: 0,
          newPoints: 0,
          previousLevel: 1,
          newLevel: 1,
          levelIncreased: false,
        },
      },
      error,
    };
  }
}
