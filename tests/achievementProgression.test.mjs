import assert from 'node:assert/strict';
import test from 'node:test';

import { getAchievementDefinitions } from '../src/systems/achievements.js';
import {
  ACHIEVEMENT_LEVEL_THRESHOLDS,
  ACHIEVEMENT_MAX_LEVEL,
  ACHIEVEMENT_POINT_VALUES_BY_DIFFICULTY,
  calculateAchievementProgression,
  calculateEarnedAchievementPoints,
  calculateTotalAvailableAchievementPoints,
  getAchievementDefinitionPointValue,
  getAchievementPointValue,
} from '../src/systems/achievementProgression.js';

function definition(id, difficulty = 1) {
  return { id, difficulty };
}

function definitionsForPoints(points) {
  const definitions = [];
  let remaining = points;
  let index = 0;

  for (const [difficulty, value] of [[4, 200], [3, 100], [2, 50], [1, 25]]) {
    while (remaining >= value) {
      definitions.push(definition(`points.${index}`, difficulty));
      remaining -= value;
      index += 1;
    }
  }

  assert.equal(remaining, 0);
  return definitions;
}

function progressionAt(points) {
  const definitions = definitionsForPoints(points);
  return calculateAchievementProgression(definitions, definitions.map(({ id }) => id));
}

test('achievement point values match approved difficulty mapping', () => {
  assert.deepEqual(ACHIEVEMENT_POINT_VALUES_BY_DIFFICULTY, { 1: 25, 2: 50, 3: 100, 4: 200 });
  assert.equal(getAchievementPointValue(1), 25);
  assert.equal(getAchievementPointValue(2), 50);
  assert.equal(getAchievementPointValue(3), 100);
  assert.equal(getAchievementPointValue(4), 200);
  assert.equal(getAchievementPointValue(0), 0);
  assert.equal(getAchievementPointValue(5), 0);
  assert.equal(getAchievementPointValue('1'), 0);
  assert.equal(getAchievementPointValue(undefined), 0);
});

test('achievement definition point values safely handle missing or malformed definitions', () => {
  assert.equal(getAchievementDefinitionPointValue(definition('one', 1)), 25);
  assert.equal(getAchievementDefinitionPointValue({ id: 'bad', difficulty: 99 }), 0);
  assert.equal(getAchievementDefinitionPointValue(null), 0);
  assert.equal(getAchievementDefinitionPointValue(undefined), 0);
});

test('earned points derive from known unlocked achievements once', () => {
  const definitions = [definition('known', 2), definition('locked', 4)];
  const state = { version: 1, unlocked: { known: { unlockedAt: 1 }, stale: { unlockedAt: 1 } } };

  assert.equal(calculateEarnedAchievementPoints(definitions, state), 50);
  assert.equal(calculateEarnedAchievementPoints(definitions, ['known', 'known', 'stale']), 50);
  assert.equal(calculateEarnedAchievementPoints(definitions, new Set(['known', 'known', 'stale'])), 50);
  assert.equal(calculateEarnedAchievementPoints(definitions, { known: true, locked: false, stale: true }), 50);
});

test('dynamic faction achievements contribute from the runtime definition list', () => {
  const definitions = getAchievementDefinitions();
  const factionDefinition = definitions.find((entry) => entry.id.startsWith('faction.win_campaign.'));

  assert.ok(factionDefinition);
  assert.equal(factionDefinition.difficulty, 3);
  assert.equal(calculateEarnedAchievementPoints(definitions, { unlocked: { [factionDefinition.id]: true } }), 100);
});

test('available points use current catalogue invariant', () => {
  const definitions = getAchievementDefinitions();

  assert.equal(definitions.length, 69);
  assert.equal(calculateTotalAvailableAchievementPoints(definitions), 3825);
});

test('point calculations do not mutate definitions or achievement state inputs', () => {
  const definitions = [definition('a', 1), definition('b', 2)];
  const state = { version: 1, unlocked: { a: { unlockedAt: 1 } } };
  const beforeDefinitions = structuredClone(definitions);
  const beforeState = structuredClone(state);

  calculateTotalAvailableAchievementPoints(definitions);
  calculateEarnedAchievementPoints(definitions, state);
  calculateAchievementProgression(definitions, state);

  assert.deepEqual(definitions, beforeDefinitions);
  assert.deepEqual(state, beforeState);
});

test('empty, missing, and malformed inputs are safe', () => {
  assert.equal(calculateTotalAvailableAchievementPoints(), 0);
  assert.equal(calculateTotalAvailableAchievementPoints([null, {}, { id: '', difficulty: 1 }]), 0);
  assert.equal(calculateEarnedAchievementPoints(undefined, undefined), 0);
  assert.equal(calculateEarnedAchievementPoints([null, definition('a', 1)], undefined), 0);
  assert.deepEqual(calculateAchievementProgression(undefined, undefined), {
    earnedPoints: 0,
    availablePoints: 0,
    level: 1,
    maxLevel: 15,
    currentLevelThreshold: 0,
    nextLevelThreshold: 25,
    pointsIntoLevel: 0,
    pointsForLevel: 25,
    pointsToNextLevel: 25,
    progressRatio: 0,
    isMaxLevel: false,
  });
});

test('duplicate definition IDs use first definition and do not double-award points', () => {
  const definitions = [definition('dupe', 1), definition('dupe', 4)];

  assert.equal(calculateTotalAvailableAchievementPoints(definitions), 25);
  assert.equal(calculateEarnedAchievementPoints(definitions, ['dupe']), 25);
});

test('level boundaries follow fixed threshold table', () => {
  assert.deepEqual(ACHIEVEMENT_LEVEL_THRESHOLDS, [0, 25, 75, 150, 250, 375, 525, 700, 900, 1125, 1375, 1650, 1950, 2400, 2875]);
  assert.equal(ACHIEVEMENT_MAX_LEVEL, 15);
  assert.equal(progressionAt(0).level, 1);
  assert.equal(progressionAt(25).level, 2);
  assert.equal(progressionAt(75).level, 3);

  for (let index = 0; index < ACHIEVEMENT_LEVEL_THRESHOLDS.length; index += 1) {
    const threshold = ACHIEVEMENT_LEVEL_THRESHOLDS[index];
    assert.equal(progressionAt(threshold).level, index + 1);
  }

  assert.equal(progressionAt(2875).level, 15);
  assert.equal(progressionAt(3825).level, 15);
});

test('progress values are stable at zero, inside levels, exact thresholds, and max level', () => {
  assert.deepEqual(progressionAt(0), {
    earnedPoints: 0,
    availablePoints: 0,
    level: 1,
    maxLevel: 15,
    currentLevelThreshold: 0,
    nextLevelThreshold: 25,
    pointsIntoLevel: 0,
    pointsForLevel: 25,
    pointsToNextLevel: 25,
    progressRatio: 0,
    isMaxLevel: false,
  });

  assert.deepEqual(progressionAt(50), {
    earnedPoints: 50,
    availablePoints: 50,
    level: 2,
    maxLevel: 15,
    currentLevelThreshold: 25,
    nextLevelThreshold: 75,
    pointsIntoLevel: 25,
    pointsForLevel: 50,
    pointsToNextLevel: 25,
    progressRatio: 0.5,
    isMaxLevel: false,
  });

  assert.deepEqual(progressionAt(75), {
    earnedPoints: 75,
    availablePoints: 75,
    level: 3,
    maxLevel: 15,
    currentLevelThreshold: 75,
    nextLevelThreshold: 150,
    pointsIntoLevel: 0,
    pointsForLevel: 75,
    pointsToNextLevel: 75,
    progressRatio: 0,
    isMaxLevel: false,
  });

  assert.deepEqual(progressionAt(3025), {
    earnedPoints: 3025,
    availablePoints: 3025,
    level: 15,
    maxLevel: 15,
    currentLevelThreshold: 2875,
    nextLevelThreshold: null,
    pointsIntoLevel: 0,
    pointsForLevel: 0,
    pointsToNextLevel: 0,
    progressRatio: 1,
    isMaxLevel: true,
  });
});
