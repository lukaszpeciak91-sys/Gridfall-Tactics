import assert from 'node:assert/strict';
import test from 'node:test';
import { getFactionKeys } from '../src/data/factions/index.js';
import {
  CAMPAIGN_STORAGE_KEY,
  CAMPAIGN_VERSION,
  applyCampaignBattleResult,
  clearCampaign,
  createNewCampaign,
  getAvailableCampaignEnemies,
  hasActiveCampaign,
  isCampaignLost,
  isCampaignWon,
  loadCampaign,
  saveCampaign,
  selectCampaignEnemy,
} from '../src/systems/campaignState.js';

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

function firstEnemyKey(campaign) {
  return Object.keys(campaign.enemies)[0];
}

function resolveCampaignBattle(campaign, enemyFactionKey, winner) {
  return applyCampaignBattleResult(selectCampaignEnemy(campaign, enemyFactionKey), {
    enemyFactionKey,
    winner,
  });
}

function playOutEnemyLosses(campaign, enemyFactionKey, count = 3) {
  let nextCampaign = campaign;
  for (let index = 0; index < count; index += 1) {
    nextCampaign = resolveCampaignBattle(nextCampaign, enemyFactionKey, 'enemy');
  }
  return nextCampaign;
}

test('createNewCampaign creates five enemies, excludes the player, and initializes attempts', () => {
  const factionKeys = getFactionKeys();
  assert.equal(factionKeys.length, 6);

  const campaign = createNewCampaign('Aggro');
  const enemyKeys = Object.keys(campaign.enemies);

  assert.equal(campaign.version, CAMPAIGN_VERSION);
  assert.equal(campaign.status, 'active');
  assert.equal(campaign.playerFactionKey, 'Aggro');
  assert.equal(campaign.currentEnemyFactionKey, null);
  assert.equal(enemyKeys.length, 5);
  assert.equal(enemyKeys.includes('Aggro'), false);

  for (const enemy of Object.values(campaign.enemies)) {
    assert.equal(enemy.attemptsRemaining, 3);
    assert.equal(enemy.defeated, false);
  }
});

test('createNewCampaign rejects an invalid player faction', () => {
  assert.throws(() => createNewCampaign('Missing Faction'), RangeError);
});

test('selectCampaignEnemy sets currentEnemyFactionKey for an available enemy', () => {
  const campaign = createNewCampaign('Aggro');
  const enemyFactionKey = firstEnemyKey(campaign);

  const selected = selectCampaignEnemy(campaign, enemyFactionKey);

  assert.equal(selected.currentEnemyFactionKey, enemyFactionKey);
  assert.equal(campaign.currentEnemyFactionKey, null);
});

test('selectCampaignEnemy rejects defeated enemies and enemies with no attempts', () => {
  const campaign = createNewCampaign('Aggro');
  const enemyFactionKey = firstEnemyKey(campaign);
  const defeatedCampaign = resolveCampaignBattle(campaign, enemyFactionKey, 'player');

  assert.throws(() => selectCampaignEnemy(defeatedCampaign, enemyFactionKey), RangeError);

  const noAttemptsCampaign = playOutEnemyLosses(createNewCampaign('Aggro'), enemyFactionKey);
  assert.throws(() => selectCampaignEnemy(noAttemptsCampaign, enemyFactionKey), RangeError);
});

test('player win marks only selected enemy defeated and does not decrement attempts', () => {
  const campaign = createNewCampaign('Aggro');
  const [enemyFactionKey, untouchedEnemyFactionKey] = Object.keys(campaign.enemies);

  const resolved = resolveCampaignBattle(campaign, enemyFactionKey, 'player');

  assert.equal(resolved.enemies[enemyFactionKey].defeated, true);
  assert.equal(resolved.enemies[enemyFactionKey].attemptsRemaining, 3);
  assert.equal(resolved.enemies[untouchedEnemyFactionKey].defeated, false);
  assert.equal(resolved.enemies[untouchedEnemyFactionKey].attemptsRemaining, 3);
  assert.equal(resolved.lastResult.enemyFactionKey, enemyFactionKey);
  assert.equal(resolved.lastResult.winner, 'player');
  assert.equal(resolved.lastResult.attemptsRemainingAfter, 3);
});

test('enemy win decrements only selected enemy', () => {
  const campaign = createNewCampaign('Aggro');
  const [enemyFactionKey, untouchedEnemyFactionKey] = Object.keys(campaign.enemies);

  const resolved = resolveCampaignBattle(campaign, enemyFactionKey, 'enemy');

  assert.equal(resolved.enemies[enemyFactionKey].attemptsRemaining, 2);
  assert.equal(resolved.enemies[untouchedEnemyFactionKey].attemptsRemaining, 3);
  assert.equal(resolved.status, 'active');
});

test('draw is neutral, clears current enemy, and keeps campaign active', () => {
  const campaign = createNewCampaign('Aggro');
  const enemyFactionKey = firstEnemyKey(campaign);

  const resolved = resolveCampaignBattle(campaign, enemyFactionKey, 'draw');

  assert.equal(resolved.enemies[enemyFactionKey].attemptsRemaining, 3);
  assert.equal(resolved.enemies[enemyFactionKey].defeated, false);
  assert.equal(resolved.status, 'active');
  assert.equal(resolved.currentEnemyFactionKey, null);
  assert.equal(resolved.lastResult.winner, 'draw');
});


test('campaign result rejects non-current enemy without mutating campaign', () => {
  const campaign = createNewCampaign('Aggro');
  const [currentEnemyFactionKey, otherEnemyFactionKey] = Object.keys(campaign.enemies);
  const selected = selectCampaignEnemy(campaign, currentEnemyFactionKey);
  const snapshot = JSON.stringify(selected);

  assert.throws(() => applyCampaignBattleResult(selected, {
    enemyFactionKey: otherEnemyFactionKey,
    winner: 'player',
  }), RangeError);
  assert.equal(JSON.stringify(selected), snapshot);
  assert.equal(selected.enemies[otherEnemyFactionKey].defeated, false);
  assert.equal(selected.enemies[otherEnemyFactionKey].attemptsRemaining, 3);
});

test('third failed attempt marks campaign lost', () => {
  const campaign = createNewCampaign('Aggro');
  const enemyFactionKey = firstEnemyKey(campaign);

  const resolved = playOutEnemyLosses(campaign, enemyFactionKey);

  assert.equal(resolved.enemies[enemyFactionKey].attemptsRemaining, 0);
  assert.equal(resolved.status, 'lost');
  assert.equal(isCampaignLost(resolved), true);
});

test('defeating all enemies marks campaign won', () => {
  let campaign = createNewCampaign('Aggro');

  for (const enemyFactionKey of Object.keys(campaign.enemies)) {
    campaign = resolveCampaignBattle(campaign, enemyFactionKey, 'player');
  }

  assert.equal(campaign.status, 'won');
  assert.equal(isCampaignWon(campaign), true);
  assert.deepEqual(getAvailableCampaignEnemies(campaign), []);
});

test('applyCampaignBattleResult does not mutate input state', () => {
  const campaign = createNewCampaign('Aggro');
  const enemyFactionKey = firstEnemyKey(campaign);
  const originalSnapshot = JSON.stringify(campaign);

  const resolved = resolveCampaignBattle(campaign, enemyFactionKey, 'enemy');

  assert.equal(JSON.stringify(campaign), originalSnapshot);
  assert.notEqual(resolved, campaign);
  assert.notEqual(resolved.enemies, campaign.enemies);
  assert.equal(campaign.enemies[enemyFactionKey].attemptsRemaining, 3);
});

test('save/load round trip works with mocked localStorage', () => {
  const storage = createMemoryStorage();

  withWindowStorage(storage, () => {
    const campaign = selectCampaignEnemy(createNewCampaign('Aggro'), 'Tank');
    const saved = saveCampaign(campaign);
    const loaded = loadCampaign();

    assert.deepEqual(loaded, saved);
    assert.equal(loaded.currentEnemyFactionKey, 'Tank');
  });
});

test('loadCampaign returns null for corrupt JSON, unknown faction keys, and invalid versions', () => {
  withWindowStorage(createMemoryStorage({
    [CAMPAIGN_STORAGE_KEY]: '{not valid json',
  }), () => {
    assert.equal(loadCampaign(), null);
  });

  const unknownFactionCampaign = createNewCampaign('Aggro');
  unknownFactionCampaign.playerFactionKey = 'Missing Faction';
  withWindowStorage(createMemoryStorage({
    [CAMPAIGN_STORAGE_KEY]: JSON.stringify(unknownFactionCampaign),
  }), () => {
    assert.equal(loadCampaign(), null);
  });

  const invalidVersionCampaign = createNewCampaign('Aggro');
  invalidVersionCampaign.version = CAMPAIGN_VERSION + 1;
  withWindowStorage(createMemoryStorage({
    [CAMPAIGN_STORAGE_KEY]: JSON.stringify(invalidVersionCampaign),
  }), () => {
    assert.equal(loadCampaign(), null);
  });
});

test('hasActiveCampaign returns true only for active campaigns', () => {
  withWindowStorage(createMemoryStorage(), () => {
    assert.equal(hasActiveCampaign(), false);

    saveCampaign(createNewCampaign('Aggro'));
    assert.equal(hasActiveCampaign(), true);

    let wonCampaign = createNewCampaign('Aggro');
    for (const enemyFactionKey of Object.keys(wonCampaign.enemies)) {
      wonCampaign = resolveCampaignBattle(wonCampaign, enemyFactionKey, 'player');
    }
    saveCampaign(wonCampaign);
    assert.equal(hasActiveCampaign(), false);
  });
});

test('clearCampaign removes save safely', () => {
  const storage = createMemoryStorage();

  withWindowStorage(storage, () => {
    saveCampaign(createNewCampaign('Aggro'));
    assert.notEqual(storage.getItem(CAMPAIGN_STORAGE_KEY), null);

    clearCampaign();

    assert.equal(storage.getItem(CAMPAIGN_STORAGE_KEY), null);
    assert.equal(loadCampaign(), null);
  });

  assert.doesNotThrow(() => clearCampaign());
});
