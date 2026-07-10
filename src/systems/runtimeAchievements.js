import { evaluateAchievements, loadAchievementState, saveAchievementState } from './achievements.js';
import { enqueueAchievementPresentation } from './achievementPresentationQueue.js';
import { loadPlayerStats } from './playerStats.js';

export function evaluateAndPersistAchievementUnlocks(options = {}) {
  const {
    loadStats = loadPlayerStats,
    loadState = loadAchievementState,
    evaluate = evaluateAchievements,
    saveState = saveAchievementState,
    enqueuePresentation = enqueueAchievementPresentation,
    logger = console,
    ...evaluationOptions
  } = options;

  try {
    const playerStats = loadStats();
    const achievementState = loadState();
    const result = evaluate(playerStats, achievementState, evaluationOptions);
    const newlyUnlocked = Array.isArray(result?.newlyUnlocked) ? result.newlyUnlocked : [];

    if (newlyUnlocked.length > 0) {
      let achievementState = result.achievementState;
      try {
        achievementState = saveState(result.achievementState) ?? result.achievementState;
      } catch (error) {
        logger?.warn?.('Achievement state persistence failed; gameplay will continue.', error);
      }

      try {
        enqueuePresentation(newlyUnlocked.map((entry) => entry.id));
      } catch (error) {
        logger?.warn?.('Achievement presentation queue update failed; gameplay will continue.', error);
      }

      return {
        ...result,
        achievementState,
      };
    }

    return result;
  } catch (error) {
    logger?.warn?.('Achievement evaluation failed; gameplay will continue.', error);
    return {
      achievementState: undefined,
      newlyUnlocked: [],
      progress: {},
      error,
    };
  }
}
