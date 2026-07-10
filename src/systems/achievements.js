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

function createLocalizedDisplay(title, description) {
  return Object.freeze({
    title: Object.freeze({ ...title }),
    description: Object.freeze({ ...description }),
  });
}

export const ACHIEVEMENT_CATEGORY_LABELS = Object.freeze({
  general: Object.freeze({ en: 'General', pl: 'Ogólne' }),
  arena: Object.freeze({ en: 'Arena', pl: 'Arena' }),
  factions: Object.freeze({ en: 'Factions', pl: 'Frakcje' }),
});

export const ACHIEVEMENT_CATEGORY_GROUPS = Object.freeze({
  general: 'general',
  campaign: 'general',
  cards: 'general',
  arena: 'arena',
  faction: 'factions',
});

export function normalizeAchievementDifficulty(difficulty) {
  return Number.isInteger(difficulty) && difficulty >= 1 && difficulty <= 3 ? difficulty : 1;
}

function createThresholdDefinition({ id, category, title, description, display, statPath, target, getCurrent, difficulty = 1, ...metadata }) {
  const localizedDisplay = display ?? createLocalizedDisplay({ en: title, pl: title }, { en: description, pl: description });
  return {
    id,
    category,
    difficulty: normalizeAchievementDifficulty(difficulty),
    title: localizedDisplay.title.en,
    description: localizedDisplay.description.en,
    display: localizedDisplay,
    target,
    ...metadata,
    getCurrent: getCurrent ?? ((stats) => getNestedCounter(stats, statPath)),
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

function localized(titleEn, descriptionEn, titlePl, descriptionPl) {
  return createLocalizedDisplay(
    { en: titleEn, pl: titlePl },
    { en: descriptionEn, pl: descriptionPl },
  );
}


const FACTION_ACHIEVEMENT_CUSTOM_COPY = Object.freeze({
  aggro: Object.freeze({
    win_first_battle: localized('First Crack', 'Win your first battle with Porcelain Court.', 'Pierwsza rysa', 'Wygraj pierwszą bitwę frakcją Porcelanowy Dwór.'),
    win_10_battles: localized('Porcelain Prince', 'Win 7 battles with Porcelain Court.', 'Porcelanowy Książę', 'Wygraj 7 bitew frakcją Porcelanowy Dwór.'),
    win_campaign: localized('Crown of Cracks', 'Win a campaign with Porcelain Court.', 'Korona z pęknięć', 'Wygraj kampanię frakcją Porcelanowy Dwór.'),
    play_10_units: localized('Dinner Service', 'Play 20 units with Porcelain Court.', 'Serwis obiadowy', 'Zagraj 20 jednostek frakcją Porcelanowy Dwór.'),
    play_10_effects: localized('Courtly Tricks', 'Play 10 effects with Porcelain Court.', 'Dworskie sztuczki', 'Zagraj 10 efektów frakcją Porcelanowy Dwór.'),
  }),
  tank: Object.freeze({
    win_first_battle: localized('First Salute', 'Win your first battle with Golden Sun.', 'Pierwszy salut', 'Wygraj pierwszą bitwę frakcją Imperium Złotego Słońca.'),
    win_10_battles: localized('Golden Child', 'Win 7 battles with Golden Sun.', 'Złote dziecko', 'Wygraj 7 bitew frakcją Imperium Złotego Słońca.'),
    win_campaign: localized('Pillar of the Empire', 'Win a campaign with Golden Sun.', 'Opoka Imperium', 'Wygraj kampanię frakcją Imperium Złotego Słońca.'),
    play_10_units: localized('Fanatic Draft', 'Play 20 units with Golden Sun.', 'Fanatyczny pobór', 'Zagraj 20 jednostek frakcją Imperium Złotego Słońca.'),
    play_10_effects: localized('Order from Above', 'Play 10 effects with Golden Sun.', 'Rozkaz z góry', 'Zagraj 10 efektów frakcją Imperium Złotego Słońca.'),
  }),
  control: Object.freeze({
    win_first_battle: localized('Signal Received', 'Win your first battle with Glasköpfe.', 'Sygnał odebrany', 'Wygraj pierwszą bitwę frakcją Orden der Glasköpfe.'),
    win_10_battles: localized('Glasführer', 'Win 7 battles with Glasköpfe.', 'Glasführer', 'Wygraj 7 bitew frakcją Orden der Glasköpfe.'),
    win_campaign: localized('Experiment Successful', 'Win a campaign with Glasköpfe.', 'Eksperyment udany', 'Wygraj kampanię frakcją Orden der Glasköpfe.'),
    play_10_units: localized('Research Staff', 'Play 20 units with Glasköpfe.', 'Personel badawczy', 'Zagraj 20 jednostek frakcją Orden der Glasköpfe.'),
    play_10_effects: localized('Dirty Procedure', 'Play 10 effects with Glasköpfe.', 'Brudna procedura', 'Zagraj 10 efektów frakcją Orden der Glasköpfe.'),
  }),
  swarm: Object.freeze({
    win_first_battle: localized('First Spore', 'Win your first battle with Spore Choir.', 'Pierwszy zarodnik', 'Wygraj pierwszą bitwę frakcją Chór Zarodników.'),
    win_10_battles: localized('Mushroom Hunt', 'Win 7 battles with Spore Choir.', 'Grzybobranie', 'Wygraj 7 bitew frakcją Chór Zarodników.'),
    win_campaign: localized('The Choir Grows', 'Win a campaign with Spore Choir.', 'Chór rośnie', 'Wygraj kampanię frakcją Chór Zarodników.'),
    play_10_units: localized('Fresh Bloom', 'Play 20 units with Spore Choir.', 'Nowy wysyp', 'Zagraj 20 jednostek frakcją Chór Zarodników.'),
    play_10_effects: localized('Spores on Air', 'Play 10 effects with Spore Choir.', 'Zarodniki w eterze', 'Zagraj 10 efektów frakcją Chór Zarodników.'),
  }),
  wardens: Object.freeze({
    win_first_battle: localized('First Footprint', 'Win your first battle with Mammoth Clans.', 'Pierwszy ślad', 'Wygraj pierwszą bitwę frakcją Klany Mamutów.'),
    win_10_battles: localized('Old Mammoth Hand', 'Win 7 battles with Mammoth Clans.', 'Stary Mamuciarz', 'Wygraj 7 bitew frakcją Klany Mamutów.'),
    win_campaign: localized('Through the Frost', 'Win a campaign with Mammoth Clans.', 'Przejście przez mróz', 'Wygraj kampanię frakcją Klany Mamutów.'),
    play_10_units: localized('Caravan Moves', 'Play 20 units with Mammoth Clans.', 'Karawana rusza', 'Zagraj 20 jednostek frakcją Klany Mamutów.'),
    play_10_effects: localized('Snow Ritual', 'Play 10 effects with Mammoth Clans.', 'Rytuał na śniegu', 'Zagraj 10 efektów frakcją Klany Mamutów.'),
  }),
  'attrition-swarm': Object.freeze({
    win_first_battle: localized('Still Dancing', 'Win your first battle with Gravehearts.', 'Jeszcze tańczy', 'Wygraj pierwszą bitwę frakcją Gravehearts.'),
    win_10_battles: localized('King of the Floor', 'Win 7 battles with Gravehearts.', 'Król parkietu', 'Wygraj 7 bitew frakcją Gravehearts.'),
    win_campaign: localized('Last Ball', 'Win a campaign with Gravehearts.', 'Ostatni bal', 'Wygraj kampanię frakcją Gravehearts.'),
    play_10_units: localized('Guests from Beyond', 'Play 20 units with Gravehearts.', 'Goście z zaświatów', 'Zagraj 20 jednostek frakcją Gravehearts.'),
    play_10_effects: localized('Toast After the End', 'Play 10 effects with Gravehearts.', 'Toast po końcu świata', 'Zagraj 10 efektów frakcją Gravehearts.'),
  }),
});

function createFallbackFactionDisplay(templateKey, factionNameEn, factionNamePl) {
  const fallback = {
    win_first_battle: ['First Win', `Win your first battle with ${factionNameEn}.`, 'Pierwsze zwycięstwo', `Wygraj pierwszą bitwę frakcją ${factionNamePl}.`],
    win_10_battles: ['Veteran', `Win 7 battles with ${factionNameEn}.`, 'Weteran', `Wygraj 7 bitew frakcją ${factionNamePl}.`],
    win_campaign: ['Campaign Winner', `Win a campaign with ${factionNameEn}.`, 'Zwycięska kampania', `Wygraj kampanię frakcją ${factionNamePl}.`],
    play_10_units: ['Mustered', `Play 20 units with ${factionNameEn}.`, 'Mobilizacja', `Zagraj 20 jednostek frakcją ${factionNamePl}.`],
    play_10_effects: ['Trickster', `Play 10 effects with ${factionNameEn}.`, 'Sztuczki', `Zagraj 10 efektów frakcją ${factionNamePl}.`],
  }[templateKey];
  return localized(...fallback);
}

export const FACTION_ACHIEVEMENT_TEMPLATES = Object.freeze([
  { key: 'win_first_battle', idSuffix: 'win_first_battle', sortOrder: 10, statKey: 'battlesWon', target: 1, difficulty: 1 },
  { key: 'win_10_battles', idSuffix: 'win_10_battles', sortOrder: 20, statKey: 'battlesWon', target: 7, difficulty: 2 },
  { key: 'win_campaign', idSuffix: 'win_campaign', sortOrder: 30, statKey: 'campaignsWon', target: 1, difficulty: 3 },
  { key: 'play_10_units', idSuffix: 'play_10_units', sortOrder: 40, statKey: 'unitsPlayed', target: 20, difficulty: 1 },
  { key: 'play_10_effects', idSuffix: 'play_10_effects', sortOrder: 50, statKey: 'effectsPlayed', target: 10, difficulty: 1 },
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

export function createFactionAchievementDefinition(factionKey, template, factionSortOrder = 0) {
  const displayContext = getFactionDisplayContext(factionKey);
  const display = FACTION_ACHIEVEMENT_CUSTOM_COPY[displayContext.factionId]?.[template.key]
    ?? createFallbackFactionDisplay(template.key, displayContext.factionNameEn, displayContext.factionNamePl);
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
    display,
    statPath: ['factions', factionKey, template.statKey],
    target: template.target,
    difficulty: template.difficulty,
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

function getEveryFactionCampaignWinCount(stats) {
  const factionKeys = getFactionKeys();
  if (factionKeys.length === 0) return 0;
  return factionKeys.filter((factionKey) => getNestedCounter(stats, ['factions', factionKey, 'campaignsWon']) >= 1).length;
}

function getEveryFactionArenaWinCount(stats) {
  const factionKeys = getFactionKeys();
  if (factionKeys.length === 0) return 0;
  return factionKeys.filter((factionKey) => getNestedCounter(stats, ['factions', factionKey, 'arenaBattlesWon']) >= 1).length;
}

export function getAchievementDefinitions() {
  const factionCount = getFactionKeys().length;
  const definitions = [
    createThresholdDefinition({
      id: 'general.complete_tutorial',
      category: 'general',
      display: localized('Still Alive!', 'Complete the tutorial.', 'A jednak przeżył!', 'Ukończ samouczek.'),
      getCurrent: (stats) => (stats?.tutorialCompleted === true ? 1 : 0),
      difficulty: 1, target: 1,
    }),
    createThresholdDefinition({
      id: 'general.complete_first_battle',
      category: 'general',
      display: localized('On Air Debut', 'Play 3 battles.', 'Debiut na antenie', 'Rozegraj 3 bitwy.'),
      statPath: ['battlesPlayed'],
      difficulty: 1, target: 3,
    }),
    createThresholdDefinition({
      id: 'general.win_first_battle',
      category: 'general',
      display: localized('The Crowd Liked That', 'Win your first battle.', 'Publiczności się podobało', 'Wygraj pierwszą bitwę.'),
      statPath: ['battlesWon'],
      difficulty: 1, target: 1,
    }),
    createThresholdDefinition({
      id: 'general.lose_first_battle',
      category: 'general',
      display: localized('At Least You Tried', 'Lose your first battle.', 'Przynajmniej próbował', 'Przegraj pierwszą bitwę.'),
      statPath: ['battlesLost'],
      difficulty: 1, target: 1,
    }),
    createThresholdDefinition({ id: 'general.win_5_battles', category: 'general', display: localized('Old Hand', 'Win 5 battles.', 'Stary wyga', 'Wygraj 5 bitew.'), statPath: ['battlesWon'], difficulty: 2, target: 5 }),
    createThresholdDefinition({ id: 'general.win_10_battles', category: 'general', display: localized('Crowd Favorite', 'Win 12 battles.', 'Ulubieniec publiczności', 'Wygraj 12 bitew.'), statPath: ['battlesWon'], difficulty: 2, target: 12 }),
    createThresholdDefinition({ id: 'campaign.win_first_campaign', category: 'campaign', display: localized('Trophy Claimer', 'Win a campaign.', 'Zdobywca Pucharu', 'Wygraj kampanię.'), statPath: ['campaignsWon'], difficulty: 3, target: 1 }),
    createThresholdDefinition({ id: 'campaign.win_campaign_every_faction', category: 'campaign', display: localized('Dominator', 'Win a campaign with every faction.', 'Dominator', 'Wygraj kampanię każdą frakcją.'), getCurrent: getEveryFactionCampaignWinCount, difficulty: 3, target: factionCount }),
    createThresholdDefinition({ id: 'campaign.lose_first_campaign', category: 'campaign', display: localized('Next, Please!', 'Lose a campaign.', 'Następny, proszę!', 'Przegraj kampanię.'), statPath: ['campaignsLost'], difficulty: 1, target: 1 }),
    createThresholdDefinition({ id: 'cards.play_first_unit', category: 'cards', display: localized('First Unit', 'Play your first unit.', 'Pierwsza jednostka', 'Zagraj pierwszą jednostkę.'), statPath: ['unitsPlayed'], difficulty: 1, target: 1 }),
    createThresholdDefinition({ id: 'cards.play_10_units', category: 'cards', display: localized('Cannon Fodder', 'Play 10 units.', 'Mięso armatnie', 'Zagraj 10 jednostek.'), statPath: ['unitsPlayed'], difficulty: 1, target: 10 }),
    createThresholdDefinition({ id: 'cards.play_25_units', category: 'cards', display: localized('Full Cast', 'Play 30 units.', 'Pełna obsada', 'Zagraj 30 jednostek.'), statPath: ['unitsPlayed'], difficulty: 2, target: 30 }),
    createThresholdDefinition({ id: 'cards.play_first_effect', category: 'cards', display: localized('First Effect', 'Play your first effect.', 'Pierwszy efekt', 'Zagraj pierwszy efekt.'), statPath: ['effectsPlayed'], difficulty: 1, target: 1 }),
    createThresholdDefinition({ id: 'cards.play_10_effects', category: 'cards', display: localized('Dirty Tricks', 'Play 10 effects.', 'Brudne sztuczki', 'Zagraj 10 efektów.'), statPath: ['effectsPlayed'], difficulty: 1, target: 10 }),
    createThresholdDefinition({ id: 'cards.play_25_effects', category: 'cards', display: localized('Anything for Ratings!', 'Play 30 effects.', 'Wszystko dla oglądalności!', 'Zagraj 30 efektów.'), statPath: ['effectsPlayed'], difficulty: 2, target: 30 }),
    createThresholdDefinition({ id: 'arena.win_first_battle', category: 'arena', display: localized('Beginner’s Luck', 'Win your first Arena battle.', 'Szczęście debiutanta', 'Wygraj pierwszą walkę w Arenie.'), statPath: ['arenaBattlesWon'], difficulty: 1, target: 1 }),
    createThresholdDefinition({ id: 'arena.play_first_battle', category: 'arena', display: localized('Arena Debut', 'Play your first Arena battle.', 'Debiut w Arenie', 'Rozegraj pierwszą walkę w Arenie.'), statPath: ['arenaBattlesPlayed'], difficulty: 1, target: 1 }),
    createThresholdDefinition({ id: 'arena.play_5_battles', category: 'arena', display: localized('One More Spin', 'Play 5 Arena battles.', 'Jeszcze jeden obrót', 'Rozegraj 5 walk w Arenie.'), statPath: ['arenaBattlesPlayed'], difficulty: 1, target: 5 }),
    createThresholdDefinition({ id: 'arena.win_3_battles', category: 'arena', display: localized('Hot Streak', 'Win 3 Arena battles.', 'Dobra passa', 'Wygraj 3 walki w Arenie.'), statPath: ['arenaBattlesWon'], difficulty: 2, target: 3 }),
    createThresholdDefinition({ id: 'arena.win_9_battles', category: 'arena', display: localized('Regular Customer', 'Win 9 Arena battles.', 'Stały klient', 'Wygraj 9 walk w Arenie.'), statPath: ['arenaBattlesWon'], difficulty: 3, target: 9 }),
    createThresholdDefinition({ id: 'arena.win_every_faction', category: 'arena', display: localized('All In', 'Win an Arena battle with every faction.', 'All in', 'Wygraj walkę w Arenie każdą frakcją.'), getCurrent: getEveryFactionArenaWinCount, difficulty: 3, target: factionCount }),
    createThresholdDefinition({ id: 'arena.lose_first_battle', category: 'arena', display: localized('Arena Setback', 'Lose your first Arena battle.', 'Porażka w Arenie', 'Przegraj pierwszą walkę w Arenie.'), statPath: ['arenaBattlesLost'], difficulty: 1, target: 1 }),
    createThresholdDefinition({ id: 'campaign.start_first_campaign', category: 'campaign', display: localized('Campaign Begins', 'Start your first campaign.', 'Początek kampanii', 'Rozpocznij pierwszą kampanię.'), statPath: ['campaignsStarted'], difficulty: 1, target: 1 }),
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
