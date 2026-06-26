import { getFactionKeys } from '../data/factions/index.js';

export const CAMPAIGN_STORAGE_KEY = 'gridfall:tactics:campaign:v1';
export const CAMPAIGN_VERSION = 1;

const INITIAL_ATTEMPTS_REMAINING = 3;
const CAMPAIGN_STATUSES = new Set(['active', 'won', 'lost']);
const RESULT_WINNERS = new Set(['player', 'enemy', 'draw']);

function getLocalStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    console.warn('Campaign localStorage is unavailable; campaign progress will not be persisted.', error);
    return null;
  }
}

function getTimestamp() {
  return new Date().toISOString();
}

function createRunId() {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `campaign-${Date.now().toString(36)}-${randomPart}`;
}

function getSafeBattleDurationMs(value) {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function cloneCampaignState(state) {
  return {
    ...state,
    totalBattleDurationMs: getSafeBattleDurationMs(state.totalBattleDurationMs),
    enemies: Object.fromEntries(
      Object.entries(state.enemies ?? {}).map(([factionKey, enemy]) => [
        factionKey,
        { ...enemy },
      ]),
    ),
    lastResult: state.lastResult ? { ...state.lastResult } : undefined,
  };
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

function isIsoDateString(value) {
  if (!isNonEmptyString(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

function getExpectedEnemyKeys(playerFactionKey) {
  return getFactionKeys().filter((factionKey) => factionKey !== playerFactionKey);
}

function isKnownFactionKey(factionKey) {
  return getFactionKeys().includes(factionKey);
}

function validateEnemyProgress(enemy, expectedFactionKey) {
  return Boolean(
    enemy
      && enemy.factionKey === expectedFactionKey
      && Number.isInteger(enemy.attemptsRemaining)
      && enemy.attemptsRemaining >= 0
      && enemy.attemptsRemaining <= INITIAL_ATTEMPTS_REMAINING
      && typeof enemy.defeated === 'boolean',
  );
}

function validateLastResult(lastResult, enemies) {
  if (lastResult === undefined) return true;
  return Boolean(
    lastResult
      && Object.prototype.hasOwnProperty.call(enemies, lastResult.enemyFactionKey)
      && RESULT_WINNERS.has(lastResult.winner)
      && Number.isInteger(lastResult.attemptsRemainingAfter)
      && lastResult.attemptsRemainingAfter >= 0
      && lastResult.attemptsRemainingAfter <= INITIAL_ATTEMPTS_REMAINING
      && isIsoDateString(lastResult.resolvedAt)
      && (lastResult.battleDurationMs === undefined || getSafeBattleDurationMs(lastResult.battleDurationMs) === lastResult.battleDurationMs),
  );
}

function hasDefeatedAllEnemies(enemies) {
  return Object.values(enemies).every((enemy) => enemy.defeated);
}

function hasFailedEnemy(enemies) {
  return Object.values(enemies).some((enemy) => !enemy.defeated && enemy.attemptsRemaining === 0);
}

function validateCampaignStatusConsistency(status, enemies) {
  if (status === 'active') {
    return !hasDefeatedAllEnemies(enemies) && !hasFailedEnemy(enemies);
  }

  if (status === 'won') {
    return hasDefeatedAllEnemies(enemies);
  }

  if (status === 'lost') {
    return hasFailedEnemy(enemies);
  }

  return false;
}

function normalizeCampaignState(state) {
  return cloneCampaignState(state);
}

function assertValidPlayerFaction(playerFactionKey) {
  if (!isKnownFactionKey(playerFactionKey)) {
    throw new RangeError(`Invalid campaign player faction: ${playerFactionKey}`);
  }
}

function assertValidActiveCampaign(state) {
  if (!isValidCampaignState(state) || state.status !== 'active') {
    throw new RangeError('Campaign state must be a valid active campaign.');
  }
}

function assertValidEnemy(state, enemyFactionKey) {
  if (!Object.prototype.hasOwnProperty.call(state.enemies, enemyFactionKey)) {
    throw new RangeError(`Invalid campaign enemy faction: ${enemyFactionKey}`);
  }
  return state.enemies[enemyFactionKey];
}

export function createNewCampaign(playerFactionKey) {
  assertValidPlayerFaction(playerFactionKey);

  const now = getTimestamp();
  const enemies = Object.fromEntries(
    getExpectedEnemyKeys(playerFactionKey).map((factionKey) => [
      factionKey,
      {
        factionKey,
        attemptsRemaining: INITIAL_ATTEMPTS_REMAINING,
        defeated: false,
      },
    ]),
  );

  return {
    version: CAMPAIGN_VERSION,
    runId: createRunId(),
    createdAt: now,
    updatedAt: now,
    status: 'active',
    playerFactionKey,
    enemies,
    currentEnemyFactionKey: null,
    totalBattleDurationMs: 0,
  };
}

export function isValidCampaignState(value) {
  if (!value || typeof value !== 'object') return false;
  if (value.version !== CAMPAIGN_VERSION) return false;
  if (!isNonEmptyString(value.runId)) return false;
  if (!isIsoDateString(value.createdAt) || !isIsoDateString(value.updatedAt)) return false;
  if (!CAMPAIGN_STATUSES.has(value.status)) return false;
  if (value.totalBattleDurationMs !== undefined && getSafeBattleDurationMs(value.totalBattleDurationMs) !== value.totalBattleDurationMs) return false;
  if (!isKnownFactionKey(value.playerFactionKey)) return false;
  if (!value.enemies || typeof value.enemies !== 'object' || Array.isArray(value.enemies)) return false;

  const expectedEnemyKeys = getExpectedEnemyKeys(value.playerFactionKey);
  const actualEnemyKeys = Object.keys(value.enemies);
  if (actualEnemyKeys.length !== expectedEnemyKeys.length) return false;

  const expectedEnemyKeySet = new Set(expectedEnemyKeys);
  for (const enemyFactionKey of actualEnemyKeys) {
    if (!expectedEnemyKeySet.has(enemyFactionKey)) return false;
    if (!validateEnemyProgress(value.enemies[enemyFactionKey], enemyFactionKey)) return false;
  }

  if (
    value.currentEnemyFactionKey !== null
    && !Object.prototype.hasOwnProperty.call(value.enemies, value.currentEnemyFactionKey)
  ) {
    return false;
  }

  if (!validateLastResult(value.lastResult, value.enemies)) return false;
  if (!validateCampaignStatusConsistency(value.status, value.enemies)) return false;

  return true;
}

export function loadCampaign() {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  try {
    const rawCampaign = storage.getItem(CAMPAIGN_STORAGE_KEY);
    if (!rawCampaign) return null;
    const parsedCampaign = JSON.parse(rawCampaign);
    return isValidCampaignState(parsedCampaign) ? normalizeCampaignState(parsedCampaign) : null;
  } catch (error) {
    console.warn('Campaign localStorage read failed; saved campaign will be ignored.', error);
    return null;
  }
}

export function saveCampaign(state) {
  if (!isValidCampaignState(state)) {
    return null;
  }

  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  const normalizedState = normalizeCampaignState(state);
  try {
    storage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(normalizedState));
    return normalizedState;
  } catch (error) {
    console.warn('Campaign localStorage write failed; campaign progress was not persisted.', error);
    return null;
  }
}

export function clearCampaign() {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(CAMPAIGN_STORAGE_KEY);
  } catch (error) {
    console.warn('Campaign localStorage clear failed; saved campaign may remain.', error);
  }
}

export function hasActiveCampaign() {
  return loadCampaign()?.status === 'active';
}

export function selectCampaignEnemy(state, enemyFactionKey) {
  assertValidActiveCampaign(state);
  const enemy = assertValidEnemy(state, enemyFactionKey);
  if (enemy.defeated) {
    throw new RangeError(`Campaign enemy is already defeated: ${enemyFactionKey}`);
  }
  if (enemy.attemptsRemaining <= 0) {
    throw new RangeError(`Campaign enemy has no attempts remaining: ${enemyFactionKey}`);
  }

  return {
    ...cloneCampaignState(state),
    currentEnemyFactionKey: enemyFactionKey,
    updatedAt: getTimestamp(),
  };
}

export function applyCampaignBattleResult(state, result) {
  assertValidActiveCampaign(state);

  const enemyFactionKey = result?.enemyFactionKey;
  const winner = result?.winner;
  const battleDurationMs = getSafeBattleDurationMs(result?.battleDurationMs);
  if (!RESULT_WINNERS.has(winner)) {
    throw new RangeError(`Invalid campaign battle winner: ${winner}`);
  }

  const nextState = cloneCampaignState(state);
  const enemy = assertValidEnemy(nextState, enemyFactionKey);
  if (nextState.currentEnemyFactionKey !== enemyFactionKey) {
    throw new RangeError(`Campaign battle result does not match current enemy: ${enemyFactionKey}`);
  }

  if (winner === 'player') {
    enemy.defeated = true;
  } else if (winner === 'enemy') {
    enemy.attemptsRemaining = Math.max(0, enemy.attemptsRemaining - 1);
    if (enemy.attemptsRemaining === 0) {
      nextState.status = 'lost';
    }
  }

  if (winner === 'player' && hasDefeatedAllEnemies(nextState.enemies)) {
    nextState.status = 'won';
  }

  const now = getTimestamp();
  nextState.currentEnemyFactionKey = null;
  nextState.totalBattleDurationMs = getSafeBattleDurationMs(nextState.totalBattleDurationMs) + battleDurationMs;
  nextState.lastResult = {
    enemyFactionKey,
    winner,
    attemptsRemainingAfter: enemy.attemptsRemaining,
    battleDurationMs,
    resolvedAt: now,
  };
  nextState.updatedAt = now;

  return nextState;
}

export function getAvailableCampaignEnemies(state) {
  if (!isValidCampaignState(state)) {
    return [];
  }

  return Object.values(state.enemies)
    .filter((enemy) => !enemy.defeated && enemy.attemptsRemaining > 0)
    .map((enemy) => ({ ...enemy }));
}

export function isCampaignWon(state) {
  return isValidCampaignState(state) && state.status === 'won';
}

export function isCampaignLost(state) {
  return isValidCampaignState(state) && state.status === 'lost';
}
