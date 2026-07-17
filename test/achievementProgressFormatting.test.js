import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateAchievements } from '../src/systems/achievements.js';
import { createDefaultPlayerStats } from '../src/systems/playerStats.js';
import { doesProgressTextFitBadge, formatAchievementProgressText } from '../src/ui/achievementProgressFormatting.js';
import { translate } from '../src/localization/localeService.js';

const activeBattleTimeDefinition = Object.freeze({ statPath: ['activeBattleTimeMs'] });
const normalDefinition = Object.freeze({ statPath: ['battlesWon'] });

for (const [current, target, expected] of [
  [0, 900000, '0 / 15 min'],
  [59999, 900000, '0 / 15 min'],
  [60000, 900000, '1 / 15 min'],
  [185170, 900000, '3 / 15 min'],
  [899999, 900000, '14 / 15 min'],
  [900000, 900000, '15 / 15 min'],
  [1799999, 1800000, '29 / 30 min'],
  [3600000, 3600000, '60 / 60 min'],
]) {
  test(`active battle time progress formats ${current} ms as ${expected}`, () => {
    assert.equal(formatAchievementProgressText(activeBattleTimeDefinition, { current, target }, 'min'), expected);
  });
}

test('normal non-time achievement progress remains numeric', () => {
  assert.equal(formatAchievementProgressText(normalDefinition, { current: 7, target: 50 }, 'min'), '7 / 50');
});

test('PL and EN use the compact minute progress suffix', () => {
  for (const locale of ['en', 'pl']) {
    assert.equal(translate('ui.achievements.progressUnits.minutes', locale), 'min');
    assert.equal(formatAchievementProgressText(activeBattleTimeDefinition, { current: 185170, target: 900000 }, translate('ui.achievements.progressUnits.minutes', locale)), '3 / 15 min');
  }
});

test('active battle time achievement evaluation progress stays in raw milliseconds', () => {
  const stats = { ...createDefaultPlayerStats(), activeBattleTimeMs: 899999 };
  const result = evaluateAchievements(stats, { version: 1, unlocked: {} }, { now: '2026-07-17T00:00:00.000Z' });
  const progress = result.progress['general.active_battle_time_15_minutes'];

  assert.equal(progress.current, 899999);
  assert.equal(progress.target, 900000);
  assert.equal(progress.completed, false);
});

test('compact minute progress text fits the narrow progress pill', () => {
  for (const text of ['3 / 15 min', '29 / 30 min', '59 / 60 min', '60 / 60 min']) {
    assert.equal(doesProgressTextFitBadge(text), true, `${text} should fit inside the achievement progress pill`);
  }
});
