import { evaluateAchievements, loadAchievementState, saveAchievementState } from './achievements.js';
import { loadPlayerStats } from './playerStats.js';

export function evaluateAndPersistAchievementUnlocks(options = {}) {
  const {
    loadStats = loadPlayerStats,
    loadState = loadAchievementState,
    evaluate = evaluateAchievements,
    saveState = saveAchievementState,
    logger = console,
    ...evaluationOptions
  } = options;

  try {
    const playerStats = loadStats();
    const achievementState = loadState();
    const result = evaluate(playerStats, achievementState, evaluationOptions);
    const newlyUnlocked = Array.isArray(result?.newlyUnlocked) ? result.newlyUnlocked : [];

    if (newlyUnlocked.length > 0) {
      try {
        const savedAchievementState = saveState(result.achievementState);
        return {
          ...result,
          achievementState: savedAchievementState ?? result.achievementState,
        };
      } catch (error) {
        logger?.warn?.('Achievement state persistence failed; gameplay will continue.', error);
      }
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
