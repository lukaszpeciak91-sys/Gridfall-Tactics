import assert from 'node:assert/strict';
import test from 'node:test';
import { getFactionKeys } from '../src/data/factions/index.js';
import {
  PLAYER_STATS_STORAGE_KEY,
  PLAYER_STATS_VERSION,
  clonePlayerStats,
  createDefaultPlayerStats,
  incrementBattleStat,
  incrementCampaignCompletedStat,
  incrementCampaignStarted,
  incrementEnemyDefeatedStat,
  incrementFactionStat,
  loadPlayerStats,
  normalizePlayerStats,
  savePlayerStats,
} from '../src/systems/playerStats.js';

function createMemoryStorage(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    clear() {
      values.clear();
    },
  };
}

function withWindowStorage(storage, callback) {
  const originalWindow = globalThis.window;
  globalThis.window = { localStorage: storage };
  try {
    return callback();
  } finally {
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  }
}

test('createDefaultPlayerStats creates versioned zeroed stats for every faction and enemy pair', () => {
  const stats = createDefaultPlayerStats();
  const factionKeys = getFactionKeys();

  assert.equal(stats.version, PLAYER_STATS_VERSION);
  assert.equal(stats.battlesPlayed, 0);
  assert.equal(stats.battlesWon, 0);
  assert.equal(stats.battlesLost, 0);
  assert.equal(stats.battlesDrawn, 0);
  assert.equal(stats.arenaBattlesPlayed, 0);
  assert.equal(stats.campaignsStarted, 0);
  assert.equal(stats.campaignBattlesDrawn, 0);
  assert.equal(stats.tutorialCompleted, false);
  assert.equal(stats.unitsPlayed, 0);
  assert.equal(stats.effectsPlayed, 0);
  assert.deepEqual(Object.keys(stats.factions), factionKeys);
  assert.deepEqual(Object.keys(stats.enemies.defeatedTotals), factionKeys);
  assert.deepEqual(Object.keys(stats.enemies.defeatedByPlayerFactionPair), factionKeys);

  for (const factionKey of factionKeys) {
    assert.equal(stats.factions[factionKey].battlesPlayed, 0);
    assert.equal(stats.factions[factionKey].arenaBattlesDrawn, 0);
    assert.equal(stats.factions[factionKey].campaignBattlesPlayed, 0);
    assert.equal(stats.factions[factionKey].campaignBattlesWon, 0);
    assert.equal(stats.factions[factionKey].campaignBattlesDrawn, 0);
    assert.equal(stats.factions[factionKey].effectsPlayed, 0);
    assert.equal(stats.enemies.defeatedTotals[factionKey], 0);
    assert.deepEqual(Object.keys(stats.enemies.defeatedByPlayerFactionPair[factionKey]), factionKeys);
  }
});

test('normalizePlayerStats keeps safe counters, fills missing fields, and drops unknown faction entries', () => {
  const normalized = normalizePlayerStats({
    version: 99,
    battlesPlayed: 2.8,
    battlesWon: -4,
    arenaBattlesWon: '7',
    campaignBattlesLost: 3,
    tutorialCompleted: 'yes',
    unitsPlayed: 5,
    factions: {
      Aggro: {
        battlesPlayed: 9,
        unitsPlayed: 2,
      },
      Missing: {
        battlesPlayed: 100,
      },
    },
    enemies: {
      defeatedTotals: {
        Tank: 4,
        Missing: 100,
      },
      defeatedByPlayerFactionPair: {
        Aggro: {
          Tank: 3,
        },
        Missing: {
          Tank: 100,
        },
      },
    },
  });

  assert.equal(normalized.version, PLAYER_STATS_VERSION);
  assert.equal(normalized.battlesPlayed, 2);
  assert.equal(normalized.battlesWon, 0);
  assert.equal(normalized.arenaBattlesWon, 0);
  assert.equal(normalized.campaignBattlesLost, 3);
  assert.equal(normalized.tutorialCompleted, false);
  assert.equal(normalized.unitsPlayed, 5);
  assert.equal(normalized.factions.Aggro.battlesPlayed, 9);
  assert.equal(normalized.factions.Aggro.unitsPlayed, 2);
  assert.equal(normalized.factions.Aggro.effectsPlayed, 0);
  assert.equal(normalized.factions.Missing, undefined);
  assert.equal(normalized.enemies.defeatedTotals.Tank, 4);
  assert.equal(normalized.enemies.defeatedTotals.Missing, undefined);
  assert.equal(normalized.enemies.defeatedByPlayerFactionPair.Aggro.Tank, 3);
  assert.equal(normalized.enemies.defeatedByPlayerFactionPair.Missing, undefined);
});

test('loadPlayerStats returns defaults when localStorage is missing', () => {
  const originalWindow = globalThis.window;
  delete globalThis.window;
  try {
    assert.deepEqual(loadPlayerStats(), createDefaultPlayerStats());
  } finally {
    if (originalWindow !== undefined) globalThis.window = originalWindow;
  }
});

test('loadPlayerStats recovers from malformed JSON and missing stored stats', () => {
  withWindowStorage(createMemoryStorage({
    [PLAYER_STATS_STORAGE_KEY]: '{not valid json',
  }), () => {
    assert.deepEqual(loadPlayerStats(), createDefaultPlayerStats());
  });

  withWindowStorage(createMemoryStorage(), () => {
    assert.deepEqual(loadPlayerStats(), createDefaultPlayerStats());
  });
});

test('savePlayerStats and loadPlayerStats round-trip normalized stats', () => {
  const storage = createMemoryStorage();

  withWindowStorage(storage, () => {
    const saved = savePlayerStats({
      battlesPlayed: 5,
      battlesWon: 3,
      tutorialCompleted: true,
      factions: {
        Aggro: {
          battlesPlayed: 5,
          battlesWon: 3,
        },
      },
    });
    const loaded = loadPlayerStats();

    assert.deepEqual(loaded, saved);
    assert.equal(loaded.battlesPlayed, 5);
    assert.equal(loaded.tutorialCompleted, true);
    assert.equal(loaded.factions.Aggro.battlesWon, 3);
  });
});

test('savePlayerStats returns normalized stats when localStorage is unavailable', () => {
  const originalWindow = globalThis.window;
  delete globalThis.window;
  try {
    const saved = savePlayerStats({ battlesPlayed: 4 });
    assert.equal(saved.battlesPlayed, 4);
    assert.equal(saved.version, PLAYER_STATS_VERSION);
  } finally {
    if (originalWindow !== undefined) globalThis.window = originalWindow;
  }
});

test('clonePlayerStats returns a normalized immutable copy', () => {
  const stats = createDefaultPlayerStats();
  stats.factions.Aggro.battlesPlayed = 1;

  const cloned = clonePlayerStats(stats);
  cloned.factions.Aggro.battlesPlayed = 7;

  assert.equal(stats.factions.Aggro.battlesPlayed, 1);
  assert.equal(cloned.factions.Aggro.battlesPlayed, 7);
  assert.notEqual(cloned, stats);
  assert.notEqual(cloned.factions, stats.factions);
  assert.notEqual(cloned.factions.Aggro, stats.factions.Aggro);
});

test('incrementFactionStat is immutable and increments only the requested faction stat', () => {
  const stats = createDefaultPlayerStats();
  const nextStats = incrementFactionStat(stats, 'Aggro', 'unitsPlayed', 2);

  assert.equal(stats.factions.Aggro.unitsPlayed, 0);
  assert.equal(nextStats.factions.Aggro.unitsPlayed, 2);
  assert.equal(nextStats.factions.Tank.unitsPlayed, 0);
  assert.throws(() => incrementFactionStat(stats, 'Missing', 'unitsPlayed'), RangeError);
  assert.throws(() => incrementFactionStat(stats, 'Aggro', 'missingStat'), RangeError);
});

test('incrementEnemyDefeatedStat increments totals and player-faction pair counters immutably', () => {
  const stats = createDefaultPlayerStats();
  const nextStats = incrementEnemyDefeatedStat(stats, 'Aggro', 'Tank');

  assert.equal(stats.enemies.defeatedTotals.Tank, 0);
  assert.equal(stats.enemies.defeatedByPlayerFactionPair.Aggro.Tank, 0);
  assert.equal(nextStats.enemies.defeatedTotals.Tank, 1);
  assert.equal(nextStats.enemies.defeatedByPlayerFactionPair.Aggro.Tank, 1);
  assert.equal(nextStats.enemies.defeatedByPlayerFactionPair.Control.Tank, 0);
  assert.throws(() => incrementEnemyDefeatedStat(stats, 'Missing', 'Tank'), RangeError);
  assert.throws(() => incrementEnemyDefeatedStat(stats, 'Aggro', 'Missing'), RangeError);
});


test('incrementCampaignStarted increments campaign starts immutably only once per call', () => {
  const stats = createDefaultPlayerStats();
  const nextStats = incrementCampaignStarted(stats);

  assert.equal(stats.campaignsStarted, 0);
  assert.equal(nextStats.campaignsStarted, 1);
  assert.equal(nextStats.campaignsCompleted, 0);
});

test('incrementCampaignCompletedStat increments campaign win lifecycle and player faction win counter', () => {
  const stats = createDefaultPlayerStats();
  const nextStats = incrementCampaignCompletedStat(stats, {
    result: 'won',
    playerFactionKey: 'Aggro',
  });

  assert.equal(nextStats.campaignsCompleted, 1);
  assert.equal(nextStats.campaignsWon, 1);
  assert.equal(nextStats.campaignsLost, 0);
  assert.equal(nextStats.factions.Aggro.campaignsWon, 1);
  assert.equal(nextStats.factions.Tank.campaignsWon, 0);
  assert.equal(nextStats.campaignBattlesWon, 0);
});

test('incrementCampaignCompletedStat increments campaign loss lifecycle without faction win counter', () => {
  const stats = createDefaultPlayerStats();
  const nextStats = incrementCampaignCompletedStat(stats, {
    result: 'lost',
    playerFactionKey: 'Aggro',
  });

  assert.equal(nextStats.campaignsCompleted, 1);
  assert.equal(nextStats.campaignsWon, 0);
  assert.equal(nextStats.campaignsLost, 1);
  assert.equal(nextStats.factions.Aggro.campaignsWon, 0);
  assert.equal(nextStats.campaignBattlesLost, 0);
  assert.throws(() => incrementCampaignCompletedStat(stats, { result: 'drawn' }), RangeError);
});

test('incrementBattleStat increments arena battle counters, faction counters, and defeated enemy stats', () => {
  const stats = createDefaultPlayerStats();
  const nextStats = incrementBattleStat(stats, {
    mode: 'arena',
    result: 'won',
    playerFactionKey: 'Aggro',
    enemyFactionKey: 'Tank',
  });

  assert.equal(stats.battlesPlayed, 0);
  assert.equal(nextStats.battlesPlayed, 1);
  assert.equal(nextStats.battlesWon, 1);
  assert.equal(nextStats.arenaBattlesPlayed, 1);
  assert.equal(nextStats.arenaBattlesWon, 1);
  assert.equal(nextStats.factions.Aggro.battlesPlayed, 1);
  assert.equal(nextStats.factions.Aggro.battlesWon, 1);
  assert.equal(nextStats.factions.Aggro.arenaBattlesPlayed, 1);
  assert.equal(nextStats.factions.Aggro.arenaBattlesWon, 1);
  assert.equal(nextStats.enemies.defeatedTotals.Tank, 1);
  assert.equal(nextStats.enemies.defeatedByPlayerFactionPair.Aggro.Tank, 1);
});


test('incrementBattleStat increments arena loss and draw counters without defeated enemy stats', () => {
  const lossStats = incrementBattleStat(createDefaultPlayerStats(), {
    mode: 'arena',
    result: 'lost',
    playerFactionKey: 'Aggro',
    enemyFactionKey: 'Tank',
  });
  assert.equal(lossStats.battlesPlayed, 1);
  assert.equal(lossStats.battlesLost, 1);
  assert.equal(lossStats.arenaBattlesPlayed, 1);
  assert.equal(lossStats.arenaBattlesLost, 1);
  assert.equal(lossStats.factions.Aggro.arenaBattlesLost, 1);
  assert.equal(lossStats.enemies.defeatedTotals.Tank, 0);

  const drawStats = incrementBattleStat(createDefaultPlayerStats(), {
    mode: 'arena',
    result: 'drawn',
    playerFactionKey: 'Aggro',
    enemyFactionKey: 'Tank',
  });
  assert.equal(drawStats.battlesPlayed, 1);
  assert.equal(drawStats.battlesDrawn, 1);
  assert.equal(drawStats.arenaBattlesPlayed, 1);
  assert.equal(drawStats.arenaBattlesDrawn, 1);
  assert.equal(drawStats.factions.Aggro.arenaBattlesDrawn, 1);
  assert.equal(drawStats.enemies.defeatedTotals.Tank, 0);
});

test('incrementBattleStat increments campaign win/loss battle stats without lifecycle stats', () => {
  const winStats = incrementBattleStat(createDefaultPlayerStats(), {
    mode: 'campaign',
    result: 'won',
    playerFactionKey: 'Aggro',
    enemyFactionKey: 'Tank',
  });
  assert.equal(winStats.campaignBattlesPlayed, 1);
  assert.equal(winStats.campaignBattlesWon, 1);
  assert.equal(winStats.factions.Aggro.campaignBattlesPlayed, 1);
  assert.equal(winStats.factions.Aggro.campaignBattlesWon, 1);
  assert.equal(winStats.campaignsStarted, 0);
  assert.equal(winStats.campaignsCompleted, 0);
  assert.equal(winStats.campaignsWon, 0);
  assert.equal(winStats.campaignsLost, 0);
  assert.equal(winStats.enemies.defeatedTotals.Tank, 1);

  const lossStats = incrementBattleStat(createDefaultPlayerStats(), {
    mode: 'campaign',
    result: 'lost',
    playerFactionKey: 'Aggro',
    enemyFactionKey: 'Tank',
  });
  assert.equal(lossStats.campaignBattlesPlayed, 1);
  assert.equal(lossStats.campaignBattlesLost, 1);
  assert.equal(lossStats.factions.Aggro.campaignBattlesPlayed, 1);
  assert.equal(lossStats.factions.Aggro.campaignBattlesLost, 1);
  assert.equal(lossStats.campaignsCompleted, 0);
  assert.equal(lossStats.enemies.defeatedTotals.Tank, 0);
});


test('incrementBattleStat increments campaign draw counters without defeated enemy or campaign faction win/loss', () => {
  const stats = createDefaultPlayerStats();
  const nextStats = incrementBattleStat(stats, {
    mode: 'campaign',
    result: 'drawn',
    playerFactionKey: 'Aggro',
    enemyFactionKey: 'Tank',
  });

  assert.equal(nextStats.battlesPlayed, 1);
  assert.equal(nextStats.battlesDrawn, 1);
  assert.equal(nextStats.campaignBattlesPlayed, 1);
  assert.equal(nextStats.campaignBattlesDrawn, 1);
  assert.equal(nextStats.factions.Aggro.battlesPlayed, 1);
  assert.equal(nextStats.factions.Aggro.battlesDrawn, 1);
  assert.equal(nextStats.factions.Aggro.campaignBattlesPlayed, 1);
  assert.equal(nextStats.factions.Aggro.campaignBattlesWon, 0);
  assert.equal(nextStats.factions.Aggro.campaignBattlesLost, 0);
  assert.equal(nextStats.factions.Aggro.campaignBattlesDrawn, 1);
  assert.equal(nextStats.enemies.defeatedTotals.Tank, 0);
  assert.throws(() => incrementBattleStat(stats, { mode: 'tutorial', result: 'won' }), RangeError);
  assert.throws(() => incrementBattleStat(stats, { mode: 'arena', result: 'win' }), RangeError);
});
