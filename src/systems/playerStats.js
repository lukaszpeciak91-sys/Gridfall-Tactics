import { getFactionKeys } from '../data/factions/index.js';

export const PLAYER_STATS_STORAGE_KEY = 'gridfall:tactics:player-stats:v1';
export const PLAYER_STATS_VERSION = 1;

const GLOBAL_BATTLE_STATS = Object.freeze([
  'battlesPlayed',
  'battlesWon',
  'battlesLost',
  'battlesDrawn',
]);

const ARENA_BATTLE_STATS = Object.freeze([
  'arenaBattlesPlayed',
  'arenaBattlesWon',
  'arenaBattlesLost',
  'arenaBattlesDrawn',
]);

const CAMPAIGN_STATS = Object.freeze([
  'campaignsStarted',
  'campaignsCompleted',
  'campaignsWon',
  'campaignsLost',
  'campaignBattlesPlayed',
  'campaignBattlesWon',
  'campaignBattlesLost',
  'campaignBattlesDrawn',
]);

const CARD_STATS = Object.freeze([
  'unitsPlayed',
  'effectsPlayed',
]);

const FACTION_STATS = Object.freeze([
  'battlesPlayed',
  'battlesWon',
  'battlesLost',
  'battlesDrawn',
  'arenaBattlesPlayed',
  'arenaBattlesWon',
  'arenaBattlesLost',
  'arenaBattlesDrawn',
  'campaignBattlesPlayed',
  'campaignBattlesWon',
  'campaignBattlesLost',
  'campaignBattlesDrawn',
  'campaignsWon',
  'unitsPlayed',
  'effectsPlayed',
]);

const BATTLE_RESULTS = new Set(['won', 'lost', 'drawn']);
const BATTLE_MODES = new Set(['arena', 'campaign']);
const CARD_PLAYED_STATS = new Set(CARD_STATS);

function getLocalStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    console.warn('Player stats localStorage is unavailable; stats will not be persisted.', error);
    return null;
  }
}

function getSafeCounter(value) {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function createCounterFields(keys, source = {}) {
  return Object.fromEntries(keys.map((key) => [key, getSafeCounter(source?.[key])]));
}

function isKnownFactionKey(factionKey) {
  return getFactionKeys().includes(factionKey);
}

function createDefaultFactionStats(source = {}) {
  return createCounterFields(FACTION_STATS, source);
}

function normalizeFactionStatsByFaction(source = {}) {
  return Object.fromEntries(
    getFactionKeys().map((factionKey) => [
      factionKey,
      createDefaultFactionStats(source?.[factionKey]),
    ]),
  );
}

function normalizeEnemyDefeatedTotals(source = {}) {
  return Object.fromEntries(
    getFactionKeys().map((enemyFactionKey) => [
      enemyFactionKey,
      getSafeCounter(source?.[enemyFactionKey]),
    ]),
  );
}

function normalizeEnemyDefeatedByPlayerFactionPair(source = {}) {
  return Object.fromEntries(
    getFactionKeys().map((playerFactionKey) => [
      playerFactionKey,
      normalizeEnemyDefeatedTotals(source?.[playerFactionKey]),
    ]),
  );
}

function normalizeEnemyStats(source = {}) {
  return {
    defeatedTotals: normalizeEnemyDefeatedTotals(source?.defeatedTotals),
    defeatedByPlayerFactionPair: normalizeEnemyDefeatedByPlayerFactionPair(source?.defeatedByPlayerFactionPair),
  };
}

function normalizeTutorialCompleted(value) {
  return value === true;
}

function incrementCounter(value, amount = 1) {
  return getSafeCounter(value) + getSafeCounter(amount);
}

function getBattleStatKeys(mode, result) {
  if (!BATTLE_RESULTS.has(result)) {
    throw new RangeError(`Invalid battle stat result: ${result}`);
  }

  const globalResultKey = {
    won: 'battlesWon',
    lost: 'battlesLost',
    drawn: 'battlesDrawn',
  }[result];

  const modeResultKey = mode === 'arena'
    ? {
      won: 'arenaBattlesWon',
      lost: 'arenaBattlesLost',
      drawn: 'arenaBattlesDrawn',
    }[result]
    : {
      won: 'campaignBattlesWon',
      lost: 'campaignBattlesLost',
      drawn: 'campaignBattlesDrawn',
    }[result];

  return {
    globalPlayedKey: 'battlesPlayed',
    globalResultKey,
    modePlayedKey: mode === 'arena' ? 'arenaBattlesPlayed' : 'campaignBattlesPlayed',
    modeResultKey,
  };
}

export function createDefaultPlayerStats() {
  return {
    version: PLAYER_STATS_VERSION,
    ...createCounterFields(GLOBAL_BATTLE_STATS),
    ...createCounterFields(ARENA_BATTLE_STATS),
    ...createCounterFields(CAMPAIGN_STATS),
    tutorialCompleted: false,
    ...createCounterFields(CARD_STATS),
    factions: normalizeFactionStatsByFaction(),
    enemies: normalizeEnemyStats(),
  };
}

export function normalizePlayerStats(stats = {}) {
  return {
    ...createDefaultPlayerStats(),
    version: PLAYER_STATS_VERSION,
    ...createCounterFields(GLOBAL_BATTLE_STATS, stats),
    ...createCounterFields(ARENA_BATTLE_STATS, stats),
    ...createCounterFields(CAMPAIGN_STATS, stats),
    tutorialCompleted: normalizeTutorialCompleted(stats?.tutorialCompleted),
    ...createCounterFields(CARD_STATS, stats),
    factions: normalizeFactionStatsByFaction(stats?.factions),
    enemies: normalizeEnemyStats(stats?.enemies),
  };
}

export function clonePlayerStats(stats = {}) {
  return normalizePlayerStats(stats);
}

export function loadPlayerStats() {
  const storage = getLocalStorage();
  if (!storage) {
    return createDefaultPlayerStats();
  }

  try {
    const rawStats = storage.getItem(PLAYER_STATS_STORAGE_KEY);
    if (!rawStats) return createDefaultPlayerStats();
    const parsedStats = JSON.parse(rawStats);
    return normalizePlayerStats(parsedStats);
  } catch (error) {
    console.warn('Player stats localStorage read failed; defaults will be used.', error);
    return createDefaultPlayerStats();
  }
}

export function savePlayerStats(stats) {
  const normalizedStats = normalizePlayerStats(stats);
  const storage = getLocalStorage();
  if (!storage) {
    return normalizedStats;
  }

  try {
    storage.setItem(PLAYER_STATS_STORAGE_KEY, JSON.stringify(normalizedStats));
  } catch (error) {
    console.warn('Player stats localStorage write failed; stats were not persisted.', error);
  }

  return normalizedStats;
}

export function incrementFactionStat(stats, factionKey, statKey, amount = 1) {
  if (!isKnownFactionKey(factionKey)) {
    throw new RangeError(`Invalid player stats faction: ${factionKey}`);
  }
  if (!FACTION_STATS.includes(statKey)) {
    throw new RangeError(`Invalid player faction stat: ${statKey}`);
  }

  const nextStats = clonePlayerStats(stats);
  nextStats.factions[factionKey] = {
    ...nextStats.factions[factionKey],
    [statKey]: incrementCounter(nextStats.factions[factionKey]?.[statKey], amount),
  };
  return nextStats;
}

export function incrementEnemyDefeatedStat(stats, playerFactionKey, enemyFactionKey, amount = 1) {
  if (!isKnownFactionKey(playerFactionKey)) {
    throw new RangeError(`Invalid player stats player faction: ${playerFactionKey}`);
  }
  if (!isKnownFactionKey(enemyFactionKey)) {
    throw new RangeError(`Invalid player stats enemy faction: ${enemyFactionKey}`);
  }

  const nextStats = clonePlayerStats(stats);
  const incrementAmount = getSafeCounter(amount);
  nextStats.enemies.defeatedTotals[enemyFactionKey] = incrementCounter(nextStats.enemies.defeatedTotals[enemyFactionKey], incrementAmount);
  nextStats.enemies.defeatedByPlayerFactionPair[playerFactionKey][enemyFactionKey] = incrementCounter(
    nextStats.enemies.defeatedByPlayerFactionPair[playerFactionKey][enemyFactionKey],
    incrementAmount,
  );
  return nextStats;
}

export function incrementCampaignStarted(stats, amount = 1) {
  const nextStats = clonePlayerStats(stats);
  nextStats.campaignsStarted = incrementCounter(nextStats.campaignsStarted, amount);
  return nextStats;
}

export function incrementCardPlayedStat(stats, { statKey, playerFactionKey = null } = {}) {
  if (!CARD_PLAYED_STATS.has(statKey)) {
    throw new RangeError(`Invalid card played stat: ${statKey}`);
  }

  let nextStats = clonePlayerStats(stats);
  nextStats[statKey] = incrementCounter(nextStats[statKey]);
  if (playerFactionKey !== null) {
    nextStats = incrementFactionStat(nextStats, playerFactionKey, statKey);
  }
  return nextStats;
}

export function incrementCampaignCompletedStat(stats, { result, playerFactionKey = null } = {}) {
  if (result !== 'won' && result !== 'lost') {
    throw new RangeError(`Invalid campaign lifecycle result: ${result}`);
  }

  let nextStats = clonePlayerStats(stats);
  nextStats.campaignsCompleted = incrementCounter(nextStats.campaignsCompleted);
  if (result === 'won') {
    nextStats.campaignsWon = incrementCounter(nextStats.campaignsWon);
    if (playerFactionKey !== null) {
      nextStats = incrementFactionStat(nextStats, playerFactionKey, 'campaignsWon');
    }
  } else {
    nextStats.campaignsLost = incrementCounter(nextStats.campaignsLost);
  }
  return nextStats;
}

export function incrementBattleStat(stats, { mode, result, playerFactionKey = null, enemyFactionKey = null } = {}) {
  if (!BATTLE_MODES.has(mode)) {
    throw new RangeError(`Invalid battle stat mode: ${mode}`);
  }

  const { globalPlayedKey, globalResultKey, modePlayedKey, modeResultKey } = getBattleStatKeys(mode, result);
  let nextStats = clonePlayerStats(stats);
  nextStats[globalPlayedKey] = incrementCounter(nextStats[globalPlayedKey]);
  nextStats[globalResultKey] = incrementCounter(nextStats[globalResultKey]);
  nextStats[modePlayedKey] = incrementCounter(nextStats[modePlayedKey]);
  nextStats[modeResultKey] = incrementCounter(nextStats[modeResultKey]);

  if (playerFactionKey !== null) {
    nextStats = incrementFactionStat(nextStats, playerFactionKey, 'battlesPlayed');
    nextStats = incrementFactionStat(nextStats, playerFactionKey, {
      won: 'battlesWon',
      lost: 'battlesLost',
      drawn: 'battlesDrawn',
    }[result]);

    if (mode === 'arena') {
      nextStats = incrementFactionStat(nextStats, playerFactionKey, 'arenaBattlesPlayed');
      nextStats = incrementFactionStat(nextStats, playerFactionKey, {
        won: 'arenaBattlesWon',
        lost: 'arenaBattlesLost',
        drawn: 'arenaBattlesDrawn',
      }[result]);
    }

    if (mode === 'campaign') {
      nextStats = incrementFactionStat(nextStats, playerFactionKey, 'campaignBattlesPlayed');
      nextStats = incrementFactionStat(nextStats, playerFactionKey, {
        won: 'campaignBattlesWon',
        lost: 'campaignBattlesLost',
        drawn: 'campaignBattlesDrawn',
      }[result]);
    }

    if (result === 'won' && enemyFactionKey !== null) {
      nextStats = incrementEnemyDefeatedStat(nextStats, playerFactionKey, enemyFactionKey);
    }
  }

  return nextStats;
}
