import { getFactionByKey, getFactionKeys } from '../data/factions/index.js';
import { getFactionPresentationName } from '../data/presentation/factionPresentation.js';
import { normalizePlayerStats } from './playerStats.js';

export const ACHIEVEMENTS_STORAGE_KEY = 'gridfall:tactics:achievements:v1';
export const ACHIEVEMENTS_VERSION = 1;

function getLocalStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    console.warn('Achievements localStorage is unavailable; achievement unlocks will not be persisted.', error);
    return null;
  }
}

function getTimestamp(options = {}) {
  if (options.unlockedAt !== undefined) return options.unlockedAt;
  if (typeof options.now === 'function') return options.now();
  if (options.now !== undefined) return options.now;
  return new Date().toISOString();
}

function isObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isValidUnlockedAt(value) {
  return typeof value === 'string' || (Number.isFinite(value) && value >= 0);
}

function getSafeCounter(value) {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function getNestedCounter(source, path) {
  return getSafeCounter(path.reduce((value, key) => value?.[key], source));
}

function createThresholdDefinition({ id, category, title, description, statPath, target, ...metadata }) {
  return {
    id,
    category,
    title,
    description,
    target,
    ...metadata,
    getCurrent: (stats) => getNestedCounter(stats, statPath),
    check(stats) {
      return this.getCurrent(stats) >= this.target;
    },
    getProgress(stats) {
      const current = this.getCurrent(stats);
      return {
        current,
        target: this.target,
        completed: current >= this.target,
      };
    },
  };
}


export const FACTION_ACHIEVEMENT_TEMPLATES = Object.freeze([
  {
    key: 'win_first_battle',
    idSuffix: 'win_first_battle',
    sortOrder: 10,
    statKey: 'battlesWon',
    target: 1,
    title: ({ factionNameEn }) => `${factionNameEn} Victor`,
    description: ({ factionNameEn }) => `Win your first battle with ${factionNameEn}.`,
    display: ({ factionNameEn, factionNamePl }) => ({
      title: { en: `${factionNameEn} Victor`, pl: `Zwycięzca: ${factionNamePl}` },
      description: { en: `Win your first battle with ${factionNameEn}.`, pl: `Wygraj pierwszą bitwę frakcją ${factionNamePl}.` },
    }),
  },
  {
    key: 'win_10_battles',
    idSuffix: 'win_10_battles',
    sortOrder: 20,
    statKey: 'battlesWon',
    target: 10,
    title: ({ factionNameEn }) => `${factionNameEn} Champion`,
    description: ({ factionNameEn }) => `Win 10 battles with ${factionNameEn}.`,
    display: ({ factionNameEn, factionNamePl }) => ({
      title: { en: `${factionNameEn} Champion`, pl: `Czempion: ${factionNamePl}` },
      description: { en: `Win 10 battles with ${factionNameEn}.`, pl: `Wygraj 10 bitew frakcją ${factionNamePl}.` },
    }),
  },
  {
    key: 'win_campaign',
    idSuffix: 'win_campaign',
    sortOrder: 30,
    statKey: 'campaignsWon',
    target: 1,
    title: ({ factionNameEn }) => `${factionNameEn} Campaign`,
    description: ({ factionNameEn }) => `Win a campaign with ${factionNameEn}.`,
    display: ({ factionNameEn, factionNamePl }) => ({
      title: { en: `${factionNameEn} Campaign`, pl: `Kampania: ${factionNamePl}` },
      description: { en: `Win a campaign with ${factionNameEn}.`, pl: `Wygraj kampanię frakcją ${factionNamePl}.` },
    }),
  },
  {
    key: 'play_10_units',
    idSuffix: 'play_10_units',
    sortOrder: 40,
    statKey: 'unitsPlayed',
    target: 10,
    title: ({ factionNameEn }) => `${factionNameEn} Muster`,
    description: ({ factionNameEn }) => `Play 10 units with ${factionNameEn}.`,
    display: ({ factionNameEn, factionNamePl }) => ({
      title: { en: `${factionNameEn} Muster`, pl: `Mobilizacja: ${factionNamePl}` },
      description: { en: `Play 10 units with ${factionNameEn}.`, pl: `Zagraj 10 jednostek frakcją ${factionNamePl}.` },
    }),
  },
  {
    key: 'play_10_effects',
    idSuffix: 'play_10_effects',
    sortOrder: 50,
    statKey: 'effectsPlayed',
    target: 10,
    title: ({ factionNameEn }) => `${factionNameEn} Tactics`,
    description: ({ factionNameEn }) => `Play 10 effects with ${factionNameEn}.`,
    display: ({ factionNameEn, factionNamePl }) => ({
      title: { en: `${factionNameEn} Tactics`, pl: `Taktyka: ${factionNamePl}` },
      description: { en: `Play 10 effects with ${factionNameEn}.`, pl: `Zagraj 10 efektów frakcją ${factionNamePl}.` },
    }),
  },
]);

function getFactionDisplayContext(factionKey) {
  const factionId = getFactionByKey(factionKey)?.id ?? factionKey;
  return {
    factionKey,
    factionId,
    factionNameEn: getFactionPresentationName(factionId, 'en', factionKey),
    factionNamePl: getFactionPresentationName(factionId, 'pl', factionKey),
  };
}

function createFactionAchievementDefinition(factionKey, template, factionSortOrder) {
  const displayContext = getFactionDisplayContext(factionKey);
  return createThresholdDefinition({
    id: `faction.${template.idSuffix}.${factionKey}`,
    category: 'faction',
    section: 'factions',
    group: 'faction',
    factionKey,
    factionId: displayContext.factionId,
    templateKey: template.key,
    sortOrder: factionSortOrder * 100 + template.sortOrder,
    factionSortOrder,
    title: template.title(displayContext),
    description: template.description(displayContext),
    display: template.display(displayContext),
    statPath: ['factions', factionKey, template.statKey],
    target: template.target,
  });
}

export function createDefaultAchievementState() {
  return {
    version: ACHIEVEMENTS_VERSION,
    unlocked: {},
  };
}

export function normalizeAchievementState(state = {}) {
  const unlocked = {};
  if (isObject(state?.unlocked)) {
    for (const [achievementId, entry] of Object.entries(state.unlocked)) {
      if (!achievementId) continue;
      if (isObject(entry) && isValidUnlockedAt(entry.unlockedAt)) {
        unlocked[achievementId] = { unlockedAt: entry.unlockedAt };
      } else if (isValidUnlockedAt(entry)) {
        unlocked[achievementId] = { unlockedAt: entry };
      } else if (entry === true) {
        unlocked[achievementId] = { unlockedAt: 0 };
      }
    }
  }

  return {
    version: ACHIEVEMENTS_VERSION,
    unlocked,
  };
}

export function loadAchievementState() {
  const storage = getLocalStorage();
  if (!storage) {
    return createDefaultAchievementState();
  }

  try {
    const rawState = storage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    if (!rawState) return createDefaultAchievementState();
    return normalizeAchievementState(JSON.parse(rawState));
  } catch (error) {
    console.warn('Achievements localStorage read failed; defaults will be used.', error);
    return createDefaultAchievementState();
  }
}

export function saveAchievementState(state) {
  const normalizedState = normalizeAchievementState(state);
  const storage = getLocalStorage();
  if (!storage) {
    return normalizedState;
  }

  try {
    storage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(normalizedState));
  } catch (error) {
    console.warn('Achievements localStorage write failed; unlocks were not persisted.', error);
  }

  return normalizedState;
}

export function getAchievementDefinitions() {
  const definitions = [
    createThresholdDefinition({
      id: 'general.complete_first_battle',
      category: 'general',
      title: 'First Deployment',
      description: 'Complete your first battle.',
      statPath: ['battlesPlayed'],
      target: 1,
    }),
    createThresholdDefinition({
      id: 'general.win_first_battle',
      category: 'general',
      title: 'First Victory',
      description: 'Win your first battle.',
      statPath: ['battlesWon'],
      target: 1,
    }),
    createThresholdDefinition({
      id: 'general.win_10_battles',
      category: 'general',
      title: 'Battle Proven',
      description: 'Win 10 battles.',
      statPath: ['battlesWon'],
      target: 10,
    }),
    createThresholdDefinition({
      id: 'general.lose_first_battle',
      category: 'general',
      title: 'Lessons Learned',
      description: 'Lose your first battle.',
      statPath: ['battlesLost'],
      target: 1,
    }),
    createThresholdDefinition({ id: 'arena.play_first_battle', category: 'arena', title: 'Enter the Arena', description: 'Play your first Arena battle.', statPath: ['arenaBattlesPlayed'], target: 1 }),
    createThresholdDefinition({ id: 'arena.win_first_battle', category: 'arena', title: 'Arena Victor', description: 'Win your first Arena battle.', statPath: ['arenaBattlesWon'], target: 1 }),
    createThresholdDefinition({ id: 'arena.lose_first_battle', category: 'arena', title: 'Arena Setback', description: 'Lose your first Arena battle.', statPath: ['arenaBattlesLost'], target: 1 }),
    createThresholdDefinition({ id: 'campaign.start_first_campaign', category: 'campaign', title: 'Campaign Begins', description: 'Start your first campaign.', statPath: ['campaignsStarted'], target: 1 }),
    createThresholdDefinition({ id: 'campaign.win_first_campaign', category: 'campaign', title: 'Campaign Conqueror', description: 'Win your first campaign.', statPath: ['campaignsWon'], target: 1 }),
    createThresholdDefinition({ id: 'campaign.lose_first_campaign', category: 'campaign', title: 'Campaign Casualty', description: 'Lose your first campaign.', statPath: ['campaignsLost'], target: 1 }),
    createThresholdDefinition({ id: 'cards.play_first_unit', category: 'cards', title: 'Unit Deployed', description: 'Play your first unit card.', statPath: ['unitsPlayed'], target: 1 }),
    createThresholdDefinition({ id: 'cards.play_first_effect', category: 'cards', title: 'Tactical Effect', description: 'Play your first effect card.', statPath: ['effectsPlayed'], target: 1 }),
  ];

  getFactionKeys().forEach((factionKey, factionIndex) => {
    for (const template of FACTION_ACHIEVEMENT_TEMPLATES) {
      definitions.push(createFactionAchievementDefinition(factionKey, template, factionIndex));
    }
  });

  return definitions;
}

export function evaluateAchievements(playerStats = {}, achievementState = {}, options = {}) {
  const stats = normalizePlayerStats(isObject(playerStats) ? playerStats : {});
  const normalizedState = normalizeAchievementState(achievementState);
  const unlocked = Object.fromEntries(
    Object.entries(normalizedState.unlocked).map(([id, entry]) => [id, { ...entry }]),
  );
  const newlyUnlocked = [];
  const progress = {};

  for (const definition of getAchievementDefinitions()) {
    const isUnlocked = Object.prototype.hasOwnProperty.call(unlocked, definition.id);
    const definitionProgress = definition.getProgress(stats);
    progress[definition.id] = {
      ...definitionProgress,
      completed: isUnlocked || definitionProgress.completed,
      unlocked: isUnlocked,
    };

    if (!isUnlocked && definition.check(stats)) {
      const unlockedAt = getTimestamp(options);
      unlocked[definition.id] = { unlockedAt };
      newlyUnlocked.push({
        id: definition.id,
        definition,
        unlockedAt,
      });
      progress[definition.id] = {
        ...definitionProgress,
        completed: true,
        unlocked: true,
      };
    }
  }

  return {
    achievementState: {
      version: ACHIEVEMENTS_VERSION,
      unlocked,
    },
    newlyUnlocked,
    progress,
  };
}
