import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { getFactionKeys } from '../src/data/factions/index.js';
import { createDefaultPlayerStats, incrementBattleStat, incrementCampaignCompletedStat, incrementCardPlayedStat } from '../src/systems/playerStats.js';
import {
  ACHIEVEMENTS_STORAGE_KEY,
  ACHIEVEMENTS_VERSION,
  ACHIEVEMENT_CATEGORY_GROUPS,
  ACHIEVEMENT_CATEGORY_LABELS,
  FACTION_ACHIEVEMENT_TEMPLATES,
  createFactionAchievementDefinition,
  createDefaultAchievementState,
  evaluateAchievements,
  getAchievementDefinitions,
  loadAchievementState,
  normalizeAchievementState,
  saveAchievementState,
  normalizeAchievementDifficulty,
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



test('achievement definitions expose Polish and English localized display data', () => {
  const definitions = getAchievementDefinitions();
  const byId = Object.fromEntries(definitions.map((definition) => [definition.id, definition]));

  assert.deepEqual(byId['general.win_first_battle'].display.title, {
    en: 'The Crowd Liked That',
    pl: 'Publiczności się podobało',
  });
  assert.deepEqual(byId['general.win_first_battle'].display.description, {
    en: 'Win your first battle.',
    pl: 'Wygraj pierwszą bitwę.',
  });
  assert.equal(byId['arena.win_first_battle'].display.title.en, 'Beginner’s Luck');
  assert.equal(byId['arena.win_first_battle'].display.title.pl, 'Szczęście debiutanta');

  for (const definition of definitions) {
    assert.equal(typeof definition.display.title.en, 'string', `${definition.id} should expose an English title`);
    assert.equal(typeof definition.display.title.pl, 'string', `${definition.id} should expose a Polish title`);
    assert.equal(typeof definition.display.description.en, 'string', `${definition.id} should expose an English description`);
    assert.equal(typeof definition.display.description.pl, 'string', `${definition.id} should expose a Polish description`);
  }
});


test('achievement definitions expose difficulty metadata and normalize missing or invalid difficulty to one star', () => {
  const definitions = getAchievementDefinitions();
  const byId = Object.fromEntries(definitions.map((definition) => [definition.id, definition]));

  assert.equal(byId['general.complete_tutorial'].difficulty, 1);
  assert.equal(byId['general.win_5_battles'].difficulty, 2);
  assert.equal(byId['campaign.win_first_campaign'].difficulty, 3);
  assert.equal(byId['arena.win_9_battles'].difficulty, 3);
  assert.equal(byId['arena.win_every_faction'].difficulty, 3);

  for (const definition of definitions) {
    assert.ok([1, 2, 3].includes(definition.difficulty), `${definition.id} should expose a 1-3 difficulty`);
  }

  assert.equal(normalizeAchievementDifficulty(undefined), 1);
  assert.equal(normalizeAchievementDifficulty(0), 1);
  assert.equal(normalizeAchievementDifficulty(4), 1);
  assert.equal(normalizeAchievementDifficulty(2.5), 1);
  assert.equal(normalizeAchievementDifficulty(2), 2);
});

test('achievement category label and UI grouping data exists for localized panel sections', () => {
  assert.deepEqual(ACHIEVEMENT_CATEGORY_LABELS.general, { en: 'General', pl: 'Ogólne' });
  assert.deepEqual(ACHIEVEMENT_CATEGORY_LABELS.arena, { en: 'Arena', pl: 'Arena' });
  assert.deepEqual(ACHIEVEMENT_CATEGORY_LABELS.factions, { en: 'Factions', pl: 'Frakcje' });
  assert.equal(ACHIEVEMENT_CATEGORY_GROUPS.general, 'general');
  assert.equal(ACHIEVEMENT_CATEGORY_GROUPS.campaign, 'general');
  assert.equal(ACHIEVEMENT_CATEGORY_GROUPS.cards, 'general');
  assert.equal(ACHIEVEMENT_CATEGORY_GROUPS.arena, 'arena');
  assert.equal(ACHIEVEMENT_CATEGORY_GROUPS.faction, 'factions');
});

test('existing achievement IDs remain available for compatibility', () => {
  const ids = new Set(getAchievementDefinitions().map((definition) => definition.id));
  for (const id of [
    'general.complete_first_battle',
    'general.win_first_battle',
    'general.win_10_battles',
    'general.lose_first_battle',
    'arena.play_first_battle',
    'arena.win_first_battle',
    'arena.lose_first_battle',
    'campaign.start_first_campaign',
    'campaign.win_first_campaign',
    'campaign.lose_first_campaign',
    'cards.play_first_unit',
    'cards.play_first_effect',
  ]) {
    assert(ids.has(id), `${id} should remain defined`);
  }
});



test('achievement balance thresholds and localized descriptions match current targets', () => {
  const definitions = getAchievementDefinitions();
  const byId = Object.fromEntries(definitions.map((definition) => [definition.id, definition]));

  assert.equal(byId['general.complete_first_battle'].target, 3);
  assert.deepEqual(byId['general.complete_first_battle'].display.description, { en: 'Play 3 battles.', pl: 'Rozegraj 3 bitwy.' });
  assert.equal(byId['general.win_10_battles'].target, 12);
  assert.deepEqual(byId['general.win_10_battles'].display.description, { en: 'Win 12 battles.', pl: 'Wygraj 12 bitew.' });
  assert.equal(byId['cards.play_25_units'].target, 30);
  assert.deepEqual(byId['cards.play_25_units'].display.description, { en: 'Play 30 units.', pl: 'Zagraj 30 jednostek.' });
  assert.equal(byId['cards.play_25_effects'].target, 30);
  assert.deepEqual(byId['cards.play_25_effects'].display.description, { en: 'Play 30 effects.', pl: 'Zagraj 30 efektów.' });

  for (const factionKey of getFactionKeys()) {
    const firstWin = byId[`faction.win_first_battle.${factionKey}`];
    const winMilestone = byId[`faction.win_10_battles.${factionKey}`];
    const campaignWin = byId[`faction.win_campaign.${factionKey}`];
    const unitMilestone = byId[`faction.play_10_units.${factionKey}`];
    const effectMilestone = byId[`faction.play_10_effects.${factionKey}`];
    assert.equal(firstWin.target, 1);
    assert.equal(winMilestone.target, 7);
    assert.match(winMilestone.display.description.en, /^Win 7 battles with .+\.$/);
    assert.match(winMilestone.display.description.pl, /^Wygraj 7 bitew frakcją .+\.$/);
    assert.equal(campaignWin.target, 1);
    assert.equal(unitMilestone.target, 20);
    assert.match(unitMilestone.display.description.en, /^Play 20 units with .+\.$/);
    assert.match(unitMilestone.display.description.pl, /^Zagraj 20 jednostek frakcją .+\.$/);
    assert.equal(effectMilestone.target, 10);
  }
});

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
  const stats = { ...createDefaultPlayerStats(), battlesPlayed: 3, battlesWon: 1 };
  const result = evaluateAchievements(stats, createDefaultAchievementState(), { now: 777 });

  assert(result.newlyUnlocked.some((entry) => entry.id === 'general.complete_first_battle'));
  assert(result.newlyUnlocked.some((entry) => entry.id === 'general.win_first_battle'));
  assert.deepEqual(result.achievementState.unlocked['general.win_first_battle'], { unlockedAt: 777 });
});

test('evaluateAchievements does not re-unlock already unlocked achievements', () => {
  const stats = { ...createDefaultPlayerStats(), battlesPlayed: 3, battlesWon: 1 };
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
    target: 12,
    completed: false,
    unlocked: false,
  });
});


test('evaluateAchievements respects updated thresholds before and at completion', () => {
  let result = evaluateAchievements({ battlesPlayed: 2, battlesWon: 11, unitsPlayed: 29, effectsPlayed: 29 }, createDefaultAchievementState(), { now: 1 });
  assert.equal(result.newlyUnlocked.some((entry) => entry.id === 'general.complete_first_battle'), false);
  assert.equal(result.newlyUnlocked.some((entry) => entry.id === 'general.win_10_battles'), false);
  assert.equal(result.newlyUnlocked.some((entry) => entry.id === 'cards.play_25_units'), false);
  assert.equal(result.newlyUnlocked.some((entry) => entry.id === 'cards.play_25_effects'), false);

  result = evaluateAchievements({ battlesPlayed: 3, battlesWon: 12, unitsPlayed: 30, effectsPlayed: 30 }, createDefaultAchievementState(), { now: 2 });
  assert(result.newlyUnlocked.some((entry) => entry.id === 'general.complete_first_battle'));
  assert(result.newlyUnlocked.some((entry) => entry.id === 'general.win_10_battles'));
  assert(result.newlyUnlocked.some((entry) => entry.id === 'cards.play_25_units'));
  assert(result.newlyUnlocked.some((entry) => entry.id === 'cards.play_25_effects'));
});

test('previously unlocked achievements remain unlocked when updated thresholds are not met', () => {
  const state = { unlocked: { 'general.complete_first_battle': { unlockedAt: 123 } } };
  const result = evaluateAchievements({ battlesPlayed: 1 }, state, { now: 456 });

  assert.deepEqual(result.achievementState.unlocked['general.complete_first_battle'], { unlockedAt: 123 });
  assert.equal(result.progress['general.complete_first_battle'].completed, true);
  assert.equal(result.progress['general.complete_first_battle'].unlocked, true);
  assert.equal(result.newlyUnlocked.some((entry) => entry.id === 'general.complete_first_battle'), false);
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
    target: 7,
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
    target: 20,
    completed: false,
    unlocked: false,
  });
  assert.deepEqual(result.progress[`faction.play_10_effects.${factionKey}`], {
    current: 10,
    target: 10,
    completed: true,
    unlocked: true,
  });
  assert.equal(result.newlyUnlocked.some((entry) => entry.id === `faction.play_10_units.${factionKey}`), false);
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


test('known faction achievements use custom localized copy', () => {
  const definitions = getAchievementDefinitions();
  const porcelain = definitions.find((definition) => definition.id === 'faction.win_first_battle.Aggro');
  const goldenSun = definitions.find((definition) => definition.id === 'faction.play_10_effects.Tank');

  assert.equal(porcelain.display.title.en, 'First Crack');
  assert.equal(porcelain.display.title.pl, 'Pierwsza rysa');
  assert.equal(goldenSun.display.title.en, 'Order from Above');
  assert.equal(goldenSun.display.title.pl, 'Rozkaz z góry');
});

test('unknown faction achievement generation falls back to safe localized templates', () => {
  const definition = createFactionAchievementDefinition('New Faction', FACTION_ACHIEVEMENT_TEMPLATES[0], 99);

  assert.equal(definition.id, 'faction.win_first_battle.New Faction');
  assert.equal(definition.display.title.en, 'First Win');
  assert.equal(definition.display.description.en, 'Win your first battle with New Faction.');
  assert.equal(definition.display.title.pl, 'Pierwsze zwycięstwo');
  assert.equal(definition.display.description.pl, 'Wygraj pierwszą bitwę frakcją New Faction.');
});

test('achievement system module does not import UI or runtime scenes', () => {
  const source = readFileSync(new URL('../src/systems/achievements.js', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /scenes\//);
  assert.doesNotMatch(source, /BattleScene/);
  assert.doesNotMatch(source, /Phaser/);
});
