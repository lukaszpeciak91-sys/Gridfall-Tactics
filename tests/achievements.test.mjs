import assert from 'node:assert/strict';
import test from 'node:test';
import { getFactionKeys } from '../src/data/factions/index.js';
import { createDefaultPlayerStats, incrementBattleStat } from '../src/systems/playerStats.js';
import {
  ACHIEVEMENTS_STORAGE_KEY,
  ACHIEVEMENTS_VERSION,
  createDefaultAchievementState,
  evaluateAchievements,
  getAchievementDefinitions,
  loadAchievementState,
  normalizeAchievementState,
  saveAchievementState,
} from '../src/systems/achievements.js';

function createMemoryStorage(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    clear() { values.clear(); },
  };
}

function withWindowStorage(storage, callback) {
  const originalWindow = globalThis.window;
  globalThis.window = { localStorage: storage };
  try { return callback(); } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
}

test('createDefaultAchievementState creates a versioned empty unlock map', () => {
  assert.deepEqual(createDefaultAchievementState(), {
    version: ACHIEVEMENTS_VERSION,
    unlocked: {},
  });
});

test('normalizeAchievementState preserves valid unlock entries and normalizes legacy shapes', () => {
  const normalized = normalizeAchievementState({
    version: 99,
    unlocked: {
      a: { unlockedAt: '2026-01-01T00:00:00.000Z', extra: true },
      b: 42,
      c: true,
      d: { unlockedAt: {} },
    },
  });

  assert.equal(normalized.version, ACHIEVEMENTS_VERSION);
  assert.deepEqual(normalized.unlocked.a, { unlockedAt: '2026-01-01T00:00:00.000Z' });
  assert.deepEqual(normalized.unlocked.b, { unlockedAt: 42 });
  assert.deepEqual(normalized.unlocked.c, { unlockedAt: 0 });
  assert.equal(normalized.unlocked.d, undefined);
});

test('loadAchievementState returns defaults when localStorage is missing', () => {
  const originalWindow = globalThis.window;
  delete globalThis.window;
  try {
    assert.deepEqual(loadAchievementState(), createDefaultAchievementState());
  } finally {
    if (originalWindow !== undefined) globalThis.window = originalWindow;
  }
});

test('loadAchievementState recovers from malformed JSON and missing stored state', () => {
  withWindowStorage(createMemoryStorage({ [ACHIEVEMENTS_STORAGE_KEY]: '{bad json' }), () => {
    assert.deepEqual(loadAchievementState(), createDefaultAchievementState());
  });

  withWindowStorage(createMemoryStorage(), () => {
    assert.deepEqual(loadAchievementState(), createDefaultAchievementState());
  });
});

test('saveAchievementState and loadAchievementState round-trip normalized achievement state', () => {
  const storage = createMemoryStorage();
  withWindowStorage(storage, () => {
    const saved = saveAchievementState({ unlocked: { 'general.win_first_battle': { unlockedAt: 123 } } });
    assert.deepEqual(loadAchievementState(), saved);
    assert.deepEqual(loadAchievementState().unlocked['general.win_first_battle'], { unlockedAt: 123 });
  });
});

test('evaluateAchievements unlocks first-time achievements', () => {
  const stats = { ...createDefaultPlayerStats(), battlesPlayed: 1, battlesWon: 1 };
  const result = evaluateAchievements(stats, createDefaultAchievementState(), { now: 777 });

  assert(result.newlyUnlocked.some((entry) => entry.id === 'general.complete_first_battle'));
  assert(result.newlyUnlocked.some((entry) => entry.id === 'general.win_first_battle'));
  assert.deepEqual(result.achievementState.unlocked['general.win_first_battle'], { unlockedAt: 777 });
});

test('evaluateAchievements does not re-unlock already unlocked achievements', () => {
  const stats = { ...createDefaultPlayerStats(), battlesPlayed: 1, battlesWon: 1 };
  const first = evaluateAchievements(stats, createDefaultAchievementState(), { now: 1 });
  const second = evaluateAchievements(stats, first.achievementState, { now: 2 });

  assert.equal(second.newlyUnlocked.length, 0);
  assert.deepEqual(second.achievementState.unlocked['general.win_first_battle'], { unlockedAt: 1 });
});

test('evaluateAchievements does not mutate input state', () => {
  const stats = { ...createDefaultPlayerStats(), battlesPlayed: 1 };
  const state = createDefaultAchievementState();
  const statsBefore = structuredClone(stats);
  const stateBefore = structuredClone(state);

  evaluateAchievements(stats, state, { now: 1 });

  assert.deepEqual(stats, statsBefore);
  assert.deepEqual(state, stateBefore);
});

test('evaluateAchievements returns progress for locked threshold achievements', () => {
  const result = evaluateAchievements({ battlesWon: 3 }, createDefaultAchievementState(), { now: 1 });

  assert.deepEqual(result.progress['general.win_10_battles'], {
    current: 3,
    target: 10,
    completed: false,
    unlocked: false,
  });
});

test('evaluateAchievements handles partial and malformed Player Stats safely', () => {
  const result = evaluateAchievements({ battlesPlayed: 'many', factions: null }, null, { now: 1 });

  assert.equal(result.newlyUnlocked.length, 0);
  assert.equal(result.progress['general.complete_first_battle'].current, 0);
  assert.equal(result.achievementState.version, ACHIEVEMENTS_VERSION);
});

test('faction achievement generation works for all runtime factions', () => {
  const definitions = getAchievementDefinitions();
  const factionDefinitions = definitions.filter((definition) => definition.category === 'faction');
  assert.deepEqual(
    factionDefinitions.map((definition) => definition.id),
    getFactionKeys().map((factionKey) => `faction.win_first_battle.${factionKey}`),
  );

  for (const factionKey of getFactionKeys()) {
    const stats = incrementBattleStat(createDefaultPlayerStats(), { mode: 'arena', result: 'won', playerFactionKey: factionKey });
    const result = evaluateAchievements(stats, createDefaultAchievementState(), { now: 1 });
    assert(result.newlyUnlocked.some((entry) => entry.id === `faction.win_first_battle.${factionKey}`));
  }
});
