import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import en from '../src/localization/translations/en.json' with { type: 'json' };
import pl from '../src/localization/translations/pl.json' with { type: 'json' };
import { calculateAchievementProgression } from '../src/systems/achievementProgression.js';

const sceneSource = () => readFileSync(new URL('../src/scenes/AchievementsScene.js', import.meta.url), 'utf8');

const definitions = [
  { id: 'easy-one', difficulty: 1 },
  { id: 'easy-two', difficulty: 1 },
  { id: 'medium-one', difficulty: 2 },
  { id: 'hard-one', difficulty: 3 },
  { id: 'legend-one', difficulty: 4 },
  { id: 'legend-two', difficulty: 4 },
  { id: 'legend-three', difficulty: 4 },
  { id: 'legend-four', difficulty: 4 },
  { id: 'legend-five', difficulty: 4 },
  { id: 'legend-six', difficulty: 4 },
  { id: 'legend-seven', difficulty: 4 },
  { id: 'legend-eight', difficulty: 4 },
  { id: 'legend-nine', difficulty: 4 },
  { id: 'legend-ten', difficulty: 4 },
  { id: 'legend-eleven', difficulty: 4 },
  { id: 'legend-twelve', difficulty: 4 },
  { id: 'legend-thirteen', difficulty: 4 },
  { id: 'legend-fourteen', difficulty: 4 },
  { id: 'legend-fifteen', difficulty: 4 },
  { id: 'legend-sixteen', difficulty: 4 },
];

function unlocked(ids) {
  return { unlocked: Object.fromEntries(ids.map((id) => [id, { unlockedAt: '2026-07-16T00:00:00.000Z' }])) };
}

function enCopy(progression) {
  if (progression.isMaxLevel) {
    return {
      levelText: `${en.ui.achievements.progression.maxLevel} ${progression.maxLevel}`,
      earnedPointsText: `${progression.earnedPoints} ${en.ui.achievements.progression.pointsAbbreviation}`,
      bottomText: en.ui.achievements.progression.allLevelsComplete,
    };
  }

  return {
    levelText: `${en.ui.achievements.progression.level} ${progression.level}`,
    earnedPointsText: `${progression.earnedPoints} ${en.ui.achievements.progression.pointsAbbreviation}`,
    bottomText: `${progression.pointsIntoLevel} / ${progression.pointsForLevel} ${en.ui.achievements.progression.toLevel} ${progression.level + 1}`,
  };
}

test('AchievementsScene derives progression through the pure progression module without duplicating progression constants', () => {
  const scene = sceneSource();
  assert.match(scene, /import \{ calculateAchievementProgression \} from '..\/systems\/achievementProgression\.js';/);
  assert.match(scene, /const progression = calculateAchievementProgression\(definitions, achievementState\);/);
  assert.match(scene, /return \{ definitions, achievementState, playerStats, progression \};/);
  assert.doesNotMatch(scene, /ACHIEVEMENT_POINT_VALUES_BY_DIFFICULTY|ACHIEVEMENT_LEVEL_THRESHOLDS|ACHIEVEMENT_MAX_LEVEL/);
  assert.doesNotMatch(scene, /saveAchievementState|evaluateAchievements|newlyUnlocked|savePlayerStats|localStorage\.setItem|gridfall:tactics:achievements:progression/);
});

test('progression banner is first in the scroll content and shifts existing sections naturally', () => {
  const scene = sceneSource();
  assert.match(scene, /let y = 8;\n\s*y = this\.drawProgressionBanner\(this\.scrollState\.content, this\.achievementData\?\.progression, \{ x: margin, y, width: width - margin \* 2 \}\) \+ 16;\n\s*for \(const section of this\.getAchievementSections\(\)\)/);
  assert.match(scene, /const height = 80;/);
  assert.match(scene, /const barWidth = Math\.max\(0, width - paddingX \* 2\);/);
  assert.match(scene, /this\.scrollState\.minY = this\.scrollState\.viewportTop - Math\.max\(0, y \+ 24 - this\.scrollState\.viewportHeight\);/);
  assert.match(scene, /\['general', 'arena', 'factions'\]\.map/);
});

test('normal progression copy uses current level, cumulative points, current-level progress, and next level', () => {
  const progression = calculateAchievementProgression(definitions, unlocked(['easy-one', 'easy-two', 'medium-one']));
  assert.equal(progression.earnedPoints, 100);
  assert.equal(progression.level, 3);
  assert.equal(progression.pointsIntoLevel, 25);
  assert.equal(progression.pointsForLevel, 75);
  assert.equal(progression.progressRatio, 1 / 3);
  assert.deepEqual(enCopy(progression), {
    levelText: 'LEVEL 3',
    earnedPointsText: '100 PTS',
    bottomText: '25 / 75 TO LEVEL 4',
  });
});

test('zero progression state starts at level 1 with an empty progress bar toward level 2', () => {
  const progression = calculateAchievementProgression(definitions, unlocked([]));
  assert.equal(progression.level, 1);
  assert.equal(progression.earnedPoints, 0);
  assert.equal(progression.pointsIntoLevel, 0);
  assert.equal(progression.pointsForLevel, 25);
  assert.equal(progression.progressRatio, 0);
  assert.deepEqual(enCopy(progression), {
    levelText: 'LEVEL 1',
    earnedPointsText: '0 PTS',
    bottomText: '0 / 25 TO LEVEL 2',
  });
});

test('exact threshold enters the new level with zero progress into that level', () => {
  const progression = calculateAchievementProgression(definitions, unlocked(['easy-one']));
  assert.equal(progression.earnedPoints, 25);
  assert.equal(progression.level, 2);
  assert.equal(progression.pointsIntoLevel, 0);
  assert.equal(progression.pointsForLevel, 50);
  assert.equal(progression.progressRatio, 0);
  assert.equal(enCopy(progression).bottomText, '0 / 50 TO LEVEL 3');
});

test('maximum progression state shows max copy, uncapped earned points, and no next-level text', () => {
  const progression = calculateAchievementProgression(definitions, unlocked(definitions.map(({ id }) => id)));
  const copy = enCopy(progression);
  assert.equal(progression.earnedPoints, 3400);
  assert.equal(progression.isMaxLevel, true);
  assert.equal(progression.progressRatio, 1);
  assert.deepEqual(copy, {
    levelText: 'MAX LEVEL 15',
    earnedPointsText: '3400 PTS',
    bottomText: 'ALL LEVELS COMPLETE',
  });
  assert.doesNotMatch(`${copy.levelText} ${copy.earnedPointsText} ${copy.bottomText}`, /LEVEL 16|0 \/ 0|null|undefined/);
});

test('progression banner clamps progress fill safely between empty and full widths', () => {
  const scene = sceneSource();
  assert.match(scene, /Phaser\.Math\.Clamp\(Number\.isFinite\(progression\.progressRatio\) \? progression\.progressRatio : 0, 0, 1\)/);
  assert.match(scene, /const fillWidth = Math\.max\(0, Math\.min\(barWidth, barWidth \* progressRatio\)\);/);
  assert.match(scene, /if \(fillWidth > 0\)/);
  const clamped = (progressRatio, barWidth) => Math.max(0, Math.min(barWidth, barWidth * Math.min(1, Math.max(0, Number.isFinite(progressRatio) ? progressRatio : 0))));
  assert.equal(clamped(0, 120), 0);
  assert.equal(clamped(-1, 120), 0);
  assert.equal(clamped(2, 120), 120);
});

test('progression localization includes exact EN and PL banner labels', () => {
  assert.equal(en.ui.achievements.progression.level, 'LEVEL');
  assert.equal(en.ui.achievements.progression.maxLevel, 'MAX LEVEL');
  assert.equal(en.ui.achievements.progression.pointsAbbreviation, 'PTS');
  assert.equal(en.ui.achievements.progression.toLevel, 'TO LEVEL');
  assert.equal(en.ui.achievements.progression.allLevelsComplete, 'ALL LEVELS COMPLETE');
  assert.equal(pl.ui.achievements.progression.level, 'POZIOM');
  assert.equal(pl.ui.achievements.progression.maxLevel, 'MAKS. POZIOM');
  assert.equal(pl.ui.achievements.progression.pointsAbbreviation, 'PKT');
  assert.equal(pl.ui.achievements.progression.toLevel, 'DO POZIOMU');
  assert.equal(pl.ui.achievements.progression.allLevelsComplete, 'WSZYSTKIE POZIOMY UKOŃCZONE');
});

