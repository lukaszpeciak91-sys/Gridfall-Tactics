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
  const stats = { ...createDefaultPlayerStats(), battlesPlayed: 3, battlesWon: 1, arenaBattlesPlayed: 1, arenaBattlesWon: 1 };
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


test('first successful Arena battle no longer queues the general battle-play milestone', () => {
  const stats = { ...createDefaultPlayerStats(), battlesPlayed: 1, battlesWon: 1, arenaBattlesPlayed: 1, arenaBattlesWon: 1 };
  const harness = createHarness({ stats });

  const result = harness.run();
  const unlockedIds = result.newlyUnlocked.map((entry) => entry.id);

  assert.equal(unlockedIds.includes('general.complete_first_battle'), false);
  assert.ok(unlockedIds.includes('general.win_first_battle'));
  assert.ok(unlockedIds.includes('arena.play_first_battle'));
  assert.ok(unlockedIds.includes('arena.win_first_battle'));
  assert.deepEqual(harness.queued, unlockedIds);
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

test('runtime helper returns progression metadata for no-unlock evaluations without saving level state', () => {
  const definition = { id: 'easy', difficulty: 1 };
  const harness = createHarness({ state: { version: 1, unlocked: { easy: { unlockedAt: 'old' } } } });
  const result = harness.run({
    getDefinitions: () => [definition],
    evaluate: (_stats, achievementState) => ({ achievementState, newlyUnlocked: [], progress: {} }),
  });

  assert.deepEqual(result.presentation, {
    achievementIds: [],
    progression: {
      previousPoints: 25,
      newPoints: 25,
      previousLevel: 2,
      newLevel: 2,
      levelIncreased: false,
    },
  });
  assert.equal(harness.saves.length, 0);
});

test('runtime helper reports unlocks without level gain separately from level increases', () => {
  const definitions = [
    { id: 'easy-a', difficulty: 1 },
    { id: 'easy-b', difficulty: 1 },
  ];
  const state = { version: 1, unlocked: { 'easy-a': { unlockedAt: 'old' } } };
  const harness = createHarness({ state });
  const result = harness.run({
    getDefinitions: () => definitions,
    evaluate: (_stats, achievementState) => ({
      achievementState: { version: 1, unlocked: { ...achievementState.unlocked, 'easy-b': { unlockedAt: 'now' } } },
      newlyUnlocked: [{ id: 'easy-b', definition: definitions[1], unlockedAt: 'now' }],
      progress: {},
    }),
  });

  assert.deepEqual(result.presentation.achievementIds, ['easy-b']);
  assert.equal(result.presentation.progression.previousPoints, 25);
  assert.equal(result.presentation.progression.newPoints, 50);
  assert.equal(result.presentation.progression.previousLevel, 2);
  assert.equal(result.presentation.progression.newLevel, 2);
  assert.equal(result.presentation.progression.levelIncreased, false);
  assert.equal(harness.saves.length, 1);
});

test('runtime helper calculates one-level gain from persisted pre-state and post-evaluation state', () => {
  const definitions = [
    { id: 'easy-a', difficulty: 1 },
    { id: 'easy-b', difficulty: 1 },
  ];
  const harness = createHarness();
  const result = harness.run({
    getDefinitions: () => definitions,
    evaluate: () => ({
      achievementState: { version: 1, unlocked: { 'easy-a': { unlockedAt: 'now' } } },
      newlyUnlocked: [{ id: 'easy-a', definition: definitions[0], unlockedAt: 'now' }],
      progress: {},
    }),
  });

  assert.equal(result.presentation.progression.previousPoints, 0);
  assert.equal(result.presentation.progression.newPoints, 25);
  assert.equal(result.presentation.progression.previousLevel, 1);
  assert.equal(result.presentation.progression.newLevel, 2);
  assert.equal(result.presentation.progression.levelIncreased, true);
});

test('runtime helper uses full current batch for multi-level progression delta', () => {
  const definitions = [
    { id: 'hard-a', difficulty: 4 },
    { id: 'hard-b', difficulty: 4 },
  ];
  const harness = createHarness();
  const result = harness.run({
    getDefinitions: () => definitions,
    evaluate: () => ({
      achievementState: { version: 1, unlocked: { 'hard-a': { unlockedAt: 'now' }, 'hard-b': { unlockedAt: 'now' } } },
      newlyUnlocked: definitions.map((definition) => ({ id: definition.id, definition, unlockedAt: 'now' })),
      progress: {},
    }),
  });

  assert.deepEqual(result.presentation.achievementIds, ['hard-a', 'hard-b']);
  assert.equal(result.presentation.progression.previousPoints, 0);
  assert.equal(result.presentation.progression.newPoints, 400);
  assert.equal(result.presentation.progression.previousLevel, 1);
  assert.equal(result.presentation.progression.newLevel, 6);
  assert.equal(result.presentation.progression.levelIncreased, true);
});
