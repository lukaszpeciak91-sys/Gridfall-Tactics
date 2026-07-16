export const ACHIEVEMENT_POINT_VALUES_BY_DIFFICULTY = Object.freeze({
  1: 25,
  2: 50,
  3: 100,
  4: 200,
});

export const ACHIEVEMENT_LEVEL_THRESHOLDS = Object.freeze([
  0,
  25,
  75,
  150,
  250,
  375,
  525,
  700,
  900,
  1125,
  1375,
  1650,
  1950,
  2400,
  2875,
]);

export const ACHIEVEMENT_MAX_LEVEL = ACHIEVEMENT_LEVEL_THRESHOLDS.length;

function isObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function getAchievementId(definition) {
  return typeof definition?.id === 'string' && definition.id.length > 0 ? definition.id : null;
}

function getDefinitionPointsById(definitions) {
  const pointsById = new Map();

  if (!Array.isArray(definitions)) return pointsById;

  for (const definition of definitions) {
    const id = getAchievementId(definition);
    if (!id || pointsById.has(id)) continue;
    pointsById.set(id, getAchievementDefinitionPointValue(definition));
  }

  return pointsById;
}

function getUnlockedAchievementIds(achievementStateOrUnlockedIds) {
  if (Array.isArray(achievementStateOrUnlockedIds)) {
    return achievementStateOrUnlockedIds.filter((id) => typeof id === 'string' && id.length > 0);
  }

  if (achievementStateOrUnlockedIds instanceof Set) {
    return [...achievementStateOrUnlockedIds].filter((id) => typeof id === 'string' && id.length > 0);
  }

  if (isObject(achievementStateOrUnlockedIds?.unlocked)) {
    return Object.keys(achievementStateOrUnlockedIds.unlocked).filter((id) => id.length > 0);
  }

  if (isObject(achievementStateOrUnlockedIds)) {
    return Object.entries(achievementStateOrUnlockedIds)
      .filter(([id, value]) => id.length > 0 && Boolean(value))
      .map(([id]) => id);
  }

  return [];
}

export function getAchievementPointValue(difficulty) {
  if (!Number.isInteger(difficulty)) return 0;
  return ACHIEVEMENT_POINT_VALUES_BY_DIFFICULTY[difficulty] ?? 0;
}

export function getAchievementDefinitionPointValue(definition) {
  return getAchievementPointValue(definition?.difficulty);
}

export function calculateTotalAvailableAchievementPoints(definitions) {
  let total = 0;

  for (const points of getDefinitionPointsById(definitions).values()) {
    total += points;
  }

  return total;
}

export function calculateEarnedAchievementPoints(definitions, achievementStateOrUnlockedIds) {
  const pointsById = getDefinitionPointsById(definitions);
  const unlockedIds = new Set(getUnlockedAchievementIds(achievementStateOrUnlockedIds));
  let total = 0;

  for (const id of unlockedIds) {
    total += pointsById.get(id) ?? 0;
  }

  return total;
}

export function calculateAchievementProgression(definitions, achievementStateOrUnlockedIds) {
  const earnedPoints = calculateEarnedAchievementPoints(definitions, achievementStateOrUnlockedIds);
  const availablePoints = calculateTotalAvailableAchievementPoints(definitions);
  const maxLevelThreshold = ACHIEVEMENT_LEVEL_THRESHOLDS[ACHIEVEMENT_LEVEL_THRESHOLDS.length - 1];
  const isMaxLevel = earnedPoints >= maxLevelThreshold;
  let level = 1;

  for (let index = 0; index < ACHIEVEMENT_LEVEL_THRESHOLDS.length; index += 1) {
    if (earnedPoints >= ACHIEVEMENT_LEVEL_THRESHOLDS[index]) {
      level = index + 1;
    } else {
      break;
    }
  }

  const currentLevelThreshold = ACHIEVEMENT_LEVEL_THRESHOLDS[level - 1];
  const nextLevelThreshold = isMaxLevel ? null : ACHIEVEMENT_LEVEL_THRESHOLDS[level];
  const pointsForLevel = isMaxLevel ? 0 : nextLevelThreshold - currentLevelThreshold;
  const pointsIntoLevel = isMaxLevel ? 0 : earnedPoints - currentLevelThreshold;
  const pointsToNextLevel = isMaxLevel ? 0 : nextLevelThreshold - earnedPoints;
  const progressRatio = isMaxLevel ? 1 : pointsForLevel > 0 ? pointsIntoLevel / pointsForLevel : 0;

  return {
    earnedPoints,
    availablePoints,
    level,
    maxLevel: ACHIEVEMENT_MAX_LEVEL,
    currentLevelThreshold,
    nextLevelThreshold,
    pointsIntoLevel,
    pointsForLevel,
    pointsToNextLevel,
    progressRatio,
    isMaxLevel,
  };
}
