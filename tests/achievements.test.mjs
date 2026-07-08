import assert from 'node:assert/strict';
import test from 'node:test';
import { getFactionKeys } from '../src/data/factions/index.js';
import { createDefaultPlayerStats, incrementBattleStat, incrementCampaignCompletedStat, incrementCardPlayedStat } from '../src/systems/playerStats.js';
import {
  ACHIEVEMENTS_STORAGE_KEY,
  ACHIEVEMENTS_VERSION,
  FACTION_ACHIEVEMENT_TEMPLATES,
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

test('faction achievement generation creates every template for every runtime faction', () => {
  const factionKeys = getFactionKeys();
  const definitions = getAchievementDefinitions();
  const factionDefinitions = definitions.filter((definition) => definition.category === 'faction');

  assert.equal(factionDefinitions.length, factionKeys.length * FACTION_ACHIEVEMENT_TEMPLATES.length);

  for (const [factionIndex, factionKey] of factionKeys.entries()) {
    const definitionsForFaction = factionDefinitions.filter((definition) => definition.factionKey === factionKey);
    assert.equal(definitionsForFaction.length, FACTION_ACHIEVEMENT_TEMPLATES.length);

    for (const template of FACTION_ACHIEVEMENT_TEMPLATES) {
      const definition = definitionsForFaction.find((item) => item.templateKey === template.key);
      assert(definition, `${factionKey} should include ${template.key}`);
      assert.equal(definition.id, `faction.${template.idSuffix}.${factionKey}`);
      assert.equal(definition.factionKey, factionKey);
      assert.equal(definition.section, 'factions');
      assert.equal(definition.group, 'faction');
      assert.equal(definition.sortOrder, factionIndex * 100 + template.sortOrder);
      assert.equal(definition.factionSortOrder, factionIndex);
      assert.equal(typeof definition.display.title.en, 'string');
      assert.equal(typeof definition.display.title.pl, 'string');
    }
  }
});

test('faction achievement progress reads faction battle win counters', () => {
  const [factionKey] = getFactionKeys();
  const stats = incrementBattleStat(createDefaultPlayerStats(), { mode: 'arena', result: 'won', playerFactionKey: factionKey });
  const result = evaluateAchievements(stats, createDefaultAchievementState(), { now: 1 });

  assert.deepEqual(result.progress[`faction.win_first_battle.${factionKey}`], {
    current: 1,
    target: 1,
    completed: true,
    unlocked: true,
  });
  assert.deepEqual(result.progress[`faction.win_10_battles.${factionKey}`], {
    current: 1,
    target: 10,
    completed: false,
    unlocked: false,
  });
  assert(result.newlyUnlocked.some((entry) => entry.id === `faction.win_first_battle.${factionKey}`));
});

test('faction achievement progress reads faction campaign win counters', () => {
  const [factionKey] = getFactionKeys();
  const stats = incrementCampaignCompletedStat(createDefaultPlayerStats(), { result: 'won', playerFactionKey: factionKey });
  const result = evaluateAchievements(stats, createDefaultAchievementState(), { now: 1 });

  assert.deepEqual(result.progress[`faction.win_campaign.${factionKey}`], {
    current: 1,
    target: 1,
    completed: true,
    unlocked: true,
  });
  assert(result.newlyUnlocked.some((entry) => entry.id === `faction.win_campaign.${factionKey}`));
});

test('faction achievement progress reads faction card play counters', () => {
  const [factionKey] = getFactionKeys();
  let stats = createDefaultPlayerStats();
  for (let index = 0; index < 10; index += 1) {
    stats = incrementCardPlayedStat(stats, { statKey: 'unitsPlayed', playerFactionKey: factionKey });
    stats = incrementCardPlayedStat(stats, { statKey: 'effectsPlayed', playerFactionKey: factionKey });
  }
  const result = evaluateAchievements(stats, createDefaultAchievementState(), { now: 1 });

  assert.deepEqual(result.progress[`faction.play_10_units.${factionKey}`], {
    current: 10,
    target: 10,
    completed: true,
    unlocked: true,
  });
  assert.deepEqual(result.progress[`faction.play_10_effects.${factionKey}`], {
    current: 10,
    target: 10,
    completed: true,
    unlocked: true,
  });
  assert(result.newlyUnlocked.some((entry) => entry.id === `faction.play_10_units.${factionKey}`));
  assert(result.newlyUnlocked.some((entry) => entry.id === `faction.play_10_effects.${factionKey}`));
});

test('evaluateAchievements does not re-unlock already unlocked generated faction achievements', () => {
  const [factionKey] = getFactionKeys();
  const stats = incrementBattleStat(createDefaultPlayerStats(), { mode: 'arena', result: 'won', playerFactionKey: factionKey });
  const first = evaluateAchievements(stats, createDefaultAchievementState(), { now: 1 });
  const second = evaluateAchievements(stats, first.achievementState, { now: 2 });

  assert.equal(second.newlyUnlocked.some((entry) => entry.id === `faction.win_first_battle.${factionKey}`), false);
  assert.deepEqual(second.achievementState.unlocked[`faction.win_first_battle.${factionKey}`], { unlockedAt: 1 });
});
