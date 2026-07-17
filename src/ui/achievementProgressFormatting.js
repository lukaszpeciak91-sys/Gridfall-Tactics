const ACTIVE_BATTLE_TIME_STAT_PATH = Object.freeze(['activeBattleTimeMs']);
const MILLIS_PER_MINUTE = 60000;

export const ACHIEVEMENT_PROGRESS_BADGE_WIDTH = 88;
export const ACHIEVEMENT_PROGRESS_BADGE_FONT_SIZE = 12;

function hasStatPath(definition, expectedPath) {
  const statPath = definition?.statPath;
  return Array.isArray(statPath)
    && statPath.length === expectedPath.length
    && statPath.every((segment, index) => segment === expectedPath[index]);
}

export function isActiveBattleTimeAchievement(definition) {
  return hasStatPath(definition, ACTIVE_BATTLE_TIME_STAT_PATH);
}

function getSafeProgressNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

export function formatAchievementProgressText(definition, progress = {}, minuteSuffix = 'min') {
  const current = getSafeProgressNumber(progress.current);
  const target = getSafeProgressNumber(progress.target);

  if (!isActiveBattleTimeAchievement(definition)) {
    return `${current} / ${target}`;
  }

  const currentMinutes = Math.floor(current / MILLIS_PER_MINUTE);
  const targetMinutes = Math.floor(target / MILLIS_PER_MINUTE);
  return `${currentMinutes} / ${targetMinutes} ${minuteSuffix}`;
}

export function doesProgressTextFitBadge(progressText, badgeWidth = ACHIEVEMENT_PROGRESS_BADGE_WIDTH, fontSize = ACHIEVEMENT_PROGRESS_BADGE_FONT_SIZE) {
  const estimatedBoldArialWidth = progressText.length * fontSize * 0.58;
  return estimatedBoldArialWidth <= badgeWidth - 8;
}
