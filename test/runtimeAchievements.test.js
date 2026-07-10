import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateAndPersistAchievementUnlocks } from '../src/systems/runtimeAchievements.js';
import { createDefaultPlayerStats } from '../src/systems/playerStats.js';
import { createDefaultAchievementState } from '../src/systems/achievements.js';

function createHarness({ stats = createDefaultPlayerStats(), state = createDefaultAchievementState(), now = '2026-07-10T00:00:00.000Z' } = {}) {
  const saves = [];
  const queued = [];
  return {
    saves,
    queued,
    run(overrides = {}) {
      return evaluateAndPersistAchievementUnlocks({
        loadStats: () => stats,
        loadState: () => state,
        saveState: (nextState) => {
          saves.push(nextState);
          state = nextState;
          return nextState;
        },
        now,
        enqueuePresentation: (ids) => queued.push(...ids),
        logger: { warn() {} },
        ...overrides,
      });
    },
    get state() { return state; },
  };
}

test('runtime helper unlocks satisfied achievements, persists state, and returns newlyUnlocked', () => {
  const stats = { ...createDefaultPlayerStats(), battlesPlayed: 1, battlesWon: 1, arenaBattlesPlayed: 1, arenaBattlesWon: 1 };
  const harness = createHarness({ stats });

  const result = harness.run();

  const unlockedIds = result.newlyUnlocked.map((entry) => entry.id);
  assert.ok(unlockedIds.includes('general.complete_first_battle'));
  assert.ok(unlockedIds.includes('general.win_first_battle'));
  assert.ok(unlockedIds.includes('arena.play_first_battle'));
  assert.ok(unlockedIds.includes('arena.win_first_battle'));
  assert.equal(harness.saves.length, 1);
  assert.deepEqual(harness.queued, unlockedIds);
  assert.equal(harness.state.unlocked['general.win_first_battle'].unlockedAt, '2026-07-10T00:00:00.000Z');
});

test('runtime helper is idempotent and preserves existing unlockedAt', () => {
  const stats = { ...createDefaultPlayerStats(), battlesWon: 1 };
  const existing = { version: 1, unlocked: { 'general.win_first_battle': { unlockedAt: 'old-date' } } };
  const harness = createHarness({ stats, state: existing });

  const result = harness.run();

  assert.deepEqual(result.newlyUnlocked, []);
  assert.equal(result.achievementState.unlocked['general.win_first_battle'].unlockedAt, 'old-date');
  assert.equal(harness.saves.length, 0);
});

test('runtime helper normalizes malformed or missing storage safely', () => {
  const harness = createHarness({
    stats: { battlesWon: 1 },
    state: { version: 'bad', unlocked: { invalid: { unlockedAt: {} }, legacy: true } },
  });

  const result = harness.run();

  assert.equal(result.achievementState.version, 1);
  assert.equal(result.achievementState.unlocked.legacy.unlockedAt, 0);
  assert.equal(result.achievementState.unlocked['general.win_first_battle'].unlockedAt, '2026-07-10T00:00:00.000Z');
});

test('runtime helper catches storage and evaluator failures', () => {
  const warnings = [];
  const saveFailure = createHarness({ stats: { ...createDefaultPlayerStats(), battlesWon: 1 } }).run({
    saveState: () => { throw new Error('blocked storage'); },
    logger: { warn: (...args) => warnings.push(args) },
  });
  assert.ok(saveFailure.newlyUnlocked.some((entry) => entry.id === 'general.win_first_battle'));

  const evalFailure = evaluateAndPersistAchievementUnlocks({
    loadStats: () => createDefaultPlayerStats(),
    loadState: () => createDefaultAchievementState(),
    evaluate: () => { throw new Error('bad evaluator'); },
    logger: { warn: (...args) => warnings.push(args) },
  });
  assert.deepEqual(evalFailure.newlyUnlocked, []);
  assert.deepEqual(evalFailure.progress, {});
  assert.equal(warnings.length, 2);
});

test('runtime helper backfills historical stats at the next evaluation', () => {
  const stats = { ...createDefaultPlayerStats(), battlesWon: 5 };
  const harness = createHarness({ stats });

  const result = harness.run();

  const unlockedIds = result.newlyUnlocked.map((entry) => entry.id);
  assert.ok(unlockedIds.includes('general.win_first_battle'));
  assert.ok(unlockedIds.includes('general.win_5_battles'));
});
