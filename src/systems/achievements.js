import { getEnabledArenaBattlegroundIds } from '../data/arenaBattlegrounds.js';
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
  general: Object.freeze({ en: 'General', pl: 'Ogólne', uk: 'Загальні' }),
  arena: Object.freeze({ en: 'Arena', pl: 'Arena', uk: 'Арена' }),
  factions: Object.freeze({ en: 'Factions', pl: 'Frakcje', uk: 'Фракції' }),
});

export const ACHIEVEMENT_CATEGORY_GROUPS = Object.freeze({
  general: 'general',
  campaign: 'general',
  cards: 'general',
  arena: 'arena',
  faction: 'factions',
});

export function normalizeAchievementDifficulty(difficulty) {
  return Number.isInteger(difficulty) && difficulty >= 1 && difficulty <= 4 ? difficulty : 1;
}

function createThresholdDefinition({ id, category, title, description, display, statPath, target, getCurrent, check: customCheck, getProgress: customGetProgress, difficulty = 1, ...metadata }) {
  const localizedDisplay = display ?? createLocalizedDisplay({ en: title }, { en: description });
  return {
    id,
    category,
    difficulty: normalizeAchievementDifficulty(difficulty),
    title: localizedDisplay.title.en,
    description: localizedDisplay.description.en,
    display: localizedDisplay,
    statPath,
    target,
    ...metadata,
    getCurrent: getCurrent ?? ((stats) => getNestedCounter(stats, statPath)),
    check: customCheck ?? function check(stats) {
      return this.getCurrent(stats) >= this.target;
    },
    getProgress: customGetProgress ?? function getProgress(stats) {
      const current = this.getCurrent(stats);
      return {
        current,
        target: this.target,
        completed: current >= this.target,
      };
    },
  };
}

const UK_ACHIEVEMENT_TITLES = Object.freeze({
  'First Crack': 'Перша тріщина', 'Porcelain Prince': 'Порцеляновий принц', 'Crown of Cracks': 'Корона з тріщин', 'Dinner Service': 'Столовий сервіз', 'Courtly Tricks': 'Придворні хитрощі',
  'First Salute': 'Перший салют', 'Golden Child': 'Золота дитина', 'Pillar of the Empire': 'Опора імперії', 'Fanatic Draft': 'Фанатичний призов', 'Order from Above': 'Наказ згори',
  'Signal Received': 'Сигнал прийнято', 'Glasführer': 'Ґласфюрер', 'Experiment Successful': 'Експеримент вдалий', 'Research Staff': 'Дослідний персонал', 'Dirty Procedure': 'Брудна процедура',
  'First Spore': 'Перша спора', 'Mushroom Hunt': 'Грибне полювання', 'The Choir Grows': 'Хор росте', 'Fresh Bloom': 'Свіжий розквіт', 'Spores on Air': 'Спори в ефірі',
  'First Footprint': 'Перший слід', 'Old Mammoth Hand': 'Старий мамонтяр', 'Through the Frost': 'Крізь мороз', 'Caravan Moves': 'Караван рушає', 'Snow Ritual': 'Сніговий обряд',
  'Still Dancing': 'Іще танцює', 'King of the Floor': 'Король танцмайданчика', 'Last Ball': 'Останній бал', 'Guests from Beyond': 'Гості з потойбіччя', 'Toast After the End': 'Тост після кінця',
  'Inspection Passed': 'Перевірку пройдено', 'Quota Met': 'Норму виконано', 'Directive Fulfilled': 'Директиву виконано', 'Production Cycle': 'Виробничий цикл', 'By Procedure': 'За процедурою',
  'Still Alive!': 'А ви ще живі!', 'On Air Debut': 'Дебют в ефірі', 'The Crowd Liked That': 'Публіці сподобалося', 'At Least You Tried': 'Принаймні ви спробували', 'Old Hand': 'Старий боєць', 'Crowd Favorite': 'Улюбленець публіки', 'Regular Feature': 'Постійний номер', 'Still Broadcasting': 'Ми ще в ефірі', 'Prime-Time Star': 'Зірка прайм-тайму',
  'Quarter Hour On Air': 'Чверть години в ефірі', 'Half-Hour Show': 'Пів години шоу', 'Broadcast Hour': 'Година ефіру', 'Trophy Claimer': 'Володар кубка', 'Dominator': 'Домінатор', 'Next, Please!': 'Наступний, будь ласка!',
  'First Unit': 'Перший боєць', 'Cannon Fodder': 'Гарматне м’ясо', 'Full Cast': 'Повний склад', 'Mass Casting': 'Масовка', 'First Effect': 'Перший ефект', 'Dirty Tricks': 'Брудні трюки', 'Anything for Ratings!': 'Усе заради рейтингів!', 'Special Effects': 'Спецефекти',
  'Beginner’s Luck': 'Новачкам щастить', 'Arena Debut': 'Дебют на арені', 'One More Spin': 'Ще один оберт', 'Hot Streak': 'Смуга удачі', 'Regular Customer': 'Постійний клієнт', 'The House Knows You': 'Казино вас знає', 'All In': 'Ва-банк', 'Every Familiar Battleground': 'Кожна знайома арена', 'Back to Familiar Ground': 'Назад на знайому арену', 'Arena Setback': 'Невдача на арені', 'Campaign Begins': 'Кампанія починається'
});

function ukrainianAchievementDescription(description) {
  const factionNames = { 'Porcelain Court': 'Порцеляновим двором', 'Golden Sun': 'Імперією Золотого Сонця', 'Glasköpfe': 'Орденом дер Гласкьопфе', 'Spore Choir': 'Хором спор', 'Mammoth Clans': 'Кланами мамонтів', 'Gravehearts': 'Ґрейвгартс', 'Project H.E.R.D.': 'Проєктом С.Т.А.Д.О.' };
  for (const [source, name] of Object.entries(factionNames)) {
    if (description === `Win your first battle with ${source}.`) return `Виграйте перший бій за ${name}.`;
    if (description === `Win 7 battles with ${source}.`) return `Виграйте 7 боїв за ${name}.`;
    if (description === `Win a campaign with ${source}.` || description === `Win a Campaign with ${source}.`) return `Виграйте кампанію за ${name}.`;
    if (description.includes(source) && description.startsWith('Play 20')) return `Зіграйте 20 бійців за ${name}.`;
    if (description.includes(source) && description.startsWith('Play 10')) return `Зіграйте 10 ефектів за ${name}.`;
  }
  return description
    .replace('Complete the tutorial.', 'Пройдіть навчання.')
    .replace(/^Play (\d+) battles\.$/, 'Зіграйте $1 боїв.')
    .replace(/^Win (\d+|your first) battles?\.$/, (_, count) => `Виграйте ${count === 'your first' ? 'перший' : count} ${count === 'your first' ? 'бій' : 'боїв'}.`)
    .replace(/^Lose your first battle\.$/, 'Програйте перший бій.')
    .replace(/^Spend (\d+) minutes in active battles\.$/, 'Проведіть $1 хв у активних боях.')
    .replace(/^Play (\d+|your first) units?\.$/, (_, count) => `Зіграйте ${count === 'your first' ? 'першого бійця' : `${count} бійців`}.`)
    .replace(/^Play (\d+|your first) effects?\.$/, (_, count) => `Зіграйте ${count === 'your first' ? 'перший ефект' : `${count} ефектів`}.`)
    .replace('Win a campaign.', 'Виграйте кампанію.').replace('Lose a campaign.', 'Програйте кампанію.').replace('Start your first campaign.', 'Почніть першу кампанію.')
    .replace('Win a campaign with every faction.', 'Виграйте кампанію кожною фракцією.')
    .replace(/^Win your first Arena battle\.$/, 'Виграйте перший бій на арені.').replace(/^Play your first Arena battle\.$/, 'Зіграйте перший бій на арені.')
    .replace(/^Play (\d+) Arena battles\.$/, 'Зіграйте $1 боїв на арені.').replace(/^Win (\d+) Arena battles\.$/, 'Виграйте $1 боїв на арені.')
    .replace('Win an Arena battle with every faction.', 'Виграйте на арені кожною фракцією.').replace('Visit every Arena battleground.', 'Відвідайте всі поля арени.').replace('Revisit an Arena battleground.', 'Поверніться на відвідане поле арени.').replace('Lose your first Arena battle.', 'Програйте перший бій на арені.');
}

function localized(entries) {
  const completeEntries = entries.uk ? entries : { ...entries, uk: { title: UK_ACHIEVEMENT_TITLES[entries.en.title] ?? 'Досягнення', description: ukrainianAchievementDescription(entries.en.description) } };
  const title = {};
  const description = {};
  for (const [locale, copy] of Object.entries(completeEntries)) {
    title[locale] = copy.title;
    description[locale] = copy.description;
  }
  return createLocalizedDisplay(title, description);
}


const FACTION_ACHIEVEMENT_CUSTOM_COPY = Object.freeze({
  aggro: Object.freeze({
    win_first_battle: localized({ en: { title: 'First Crack', description: 'Win your first battle with Porcelain Court.' }, pl: { title: 'Pierwsza rysa', description: 'Wygraj pierwszą bitwę frakcją Porcelanowy Dwór.' } }),
    win_10_battles: localized({ en: { title: 'Porcelain Prince', description: 'Win 7 battles with Porcelain Court.' }, pl: { title: 'Porcelanowy Książę', description: 'Wygraj 7 bitew frakcją Porcelanowy Dwór.' } }),
    win_campaign: localized({ en: { title: 'Crown of Cracks', description: 'Win a campaign with Porcelain Court.' }, pl: { title: 'Korona z pęknięć', description: 'Wygraj kampanię frakcją Porcelanowy Dwór.' } }),
    play_10_units: localized({ en: { title: 'Dinner Service', description: 'Play 20 units with Porcelain Court.' }, pl: { title: 'Serwis obiadowy', description: 'Zagraj 20 jednostek frakcją Porcelanowy Dwór.' } }),
    play_10_effects: localized({ en: { title: 'Courtly Tricks', description: 'Play 10 effects with Porcelain Court.' }, pl: { title: 'Dworskie sztuczki', description: 'Zagraj 10 efektów frakcją Porcelanowy Dwór.' } }),
  }),
  tank: Object.freeze({
    win_first_battle: localized({ en: { title: 'First Salute', description: 'Win your first battle with Golden Sun.' }, pl: { title: 'Pierwszy salut', description: 'Wygraj pierwszą bitwę frakcją Imperium Złotego Słońca.' } }),
    win_10_battles: localized({ en: { title: 'Golden Child', description: 'Win 7 battles with Golden Sun.' }, pl: { title: 'Złote dziecko', description: 'Wygraj 7 bitew frakcją Imperium Złotego Słońca.' } }),
    win_campaign: localized({ en: { title: 'Pillar of the Empire', description: 'Win a campaign with Golden Sun.' }, pl: { title: 'Opoka Imperium', description: 'Wygraj kampanię frakcją Imperium Złotego Słońca.' } }),
    play_10_units: localized({ en: { title: 'Fanatic Draft', description: 'Play 20 units with Golden Sun.' }, pl: { title: 'Fanatyczny pobór', description: 'Zagraj 20 jednostek frakcją Imperium Złotego Słońca.' } }),
    play_10_effects: localized({ en: { title: 'Order from Above', description: 'Play 10 effects with Golden Sun.' }, pl: { title: 'Rozkaz z góry', description: 'Zagraj 10 efektów frakcją Imperium Złotego Słońca.' } }),
  }),
  control: Object.freeze({
    win_first_battle: localized({ en: { title: 'Signal Received', description: 'Win your first battle with Glasköpfe.' }, pl: { title: 'Sygnał odebrany', description: 'Wygraj pierwszą bitwę frakcją Orden der Glasköpfe.' } }),
    win_10_battles: localized({ en: { title: 'Glasführer', description: 'Win 7 battles with Glasköpfe.' }, pl: { title: 'Glasführer', description: 'Wygraj 7 bitew frakcją Orden der Glasköpfe.' } }),
    win_campaign: localized({ en: { title: 'Experiment Successful', description: 'Win a campaign with Glasköpfe.' }, pl: { title: 'Eksperyment udany', description: 'Wygraj kampanię frakcją Orden der Glasköpfe.' } }),
    play_10_units: localized({ en: { title: 'Research Staff', description: 'Play 20 units with Glasköpfe.' }, pl: { title: 'Personel badawczy', description: 'Zagraj 20 jednostek frakcją Orden der Glasköpfe.' } }),
    play_10_effects: localized({ en: { title: 'Dirty Procedure', description: 'Play 10 effects with Glasköpfe.' }, pl: { title: 'Brudna procedura', description: 'Zagraj 10 efektów frakcją Orden der Glasköpfe.' } }),
  }),
  swarm: Object.freeze({
    win_first_battle: localized({ en: { title: 'First Spore', description: 'Win your first battle with Spore Choir.' }, pl: { title: 'Pierwszy zarodnik', description: 'Wygraj pierwszą bitwę frakcją Chór Zarodników.' } }),
    win_10_battles: localized({ en: { title: 'Mushroom Hunt', description: 'Win 7 battles with Spore Choir.' }, pl: { title: 'Grzybobranie', description: 'Wygraj 7 bitew frakcją Chór Zarodników.' } }),
    win_campaign: localized({ en: { title: 'The Choir Grows', description: 'Win a campaign with Spore Choir.' }, pl: { title: 'Chór rośnie', description: 'Wygraj kampanię frakcją Chór Zarodników.' } }),
    play_10_units: localized({ en: { title: 'Fresh Bloom', description: 'Play 20 units with Spore Choir.' }, pl: { title: 'Nowy wysyp', description: 'Zagraj 20 jednostek frakcją Chór Zarodników.' } }),
    play_10_effects: localized({ en: { title: 'Spores on Air', description: 'Play 10 effects with Spore Choir.' }, pl: { title: 'Zarodniki w eterze', description: 'Zagraj 10 efektów frakcją Chór Zarodników.' } }),
  }),
  wardens: Object.freeze({
    win_first_battle: localized({ en: { title: 'First Footprint', description: 'Win your first battle with Mammoth Clans.' }, pl: { title: 'Pierwszy ślad', description: 'Wygraj pierwszą bitwę frakcją Klany Mamutów.' } }),
    win_10_battles: localized({ en: { title: 'Old Mammoth Hand', description: 'Win 7 battles with Mammoth Clans.' }, pl: { title: 'Stary Mamuciarz', description: 'Wygraj 7 bitew frakcją Klany Mamutów.' } }),
    win_campaign: localized({ en: { title: 'Through the Frost', description: 'Win a campaign with Mammoth Clans.' }, pl: { title: 'Przejście przez mróz', description: 'Wygraj kampanię frakcją Klany Mamutów.' } }),
    play_10_units: localized({ en: { title: 'Caravan Moves', description: 'Play 20 units with Mammoth Clans.' }, pl: { title: 'Karawana rusza', description: 'Zagraj 20 jednostek frakcją Klany Mamutów.' } }),
    play_10_effects: localized({ en: { title: 'Snow Ritual', description: 'Play 10 effects with Mammoth Clans.' }, pl: { title: 'Rytuał na śniegu', description: 'Zagraj 10 efektów frakcją Klany Mamutów.' } }),
  }),
  'attrition-swarm': Object.freeze({
    win_first_battle: localized({ en: { title: 'Still Dancing', description: 'Win your first battle with Gravehearts.' }, pl: { title: 'Jeszcze tańczy', description: 'Wygraj pierwszą bitwę frakcją Gravehearts.' } }),
    win_10_battles: localized({ en: { title: 'King of the Floor', description: 'Win 7 battles with Gravehearts.' }, pl: { title: 'Król parkietu', description: 'Wygraj 7 bitew frakcją Gravehearts.' } }),
    win_campaign: localized({ en: { title: 'Last Ball', description: 'Win a campaign with Gravehearts.' }, pl: { title: 'Ostatni bal', description: 'Wygraj kampanię frakcją Gravehearts.' } }),
    play_10_units: localized({ en: { title: 'Guests from Beyond', description: 'Play 20 units with Gravehearts.' }, pl: { title: 'Goście z zaświatów', description: 'Zagraj 20 jednostek frakcją Gravehearts.' } }),
    play_10_effects: localized({ en: { title: 'Toast After the End', description: 'Play 10 effects with Gravehearts.' }, pl: { title: 'Toast po końcu świata', description: 'Zagraj 10 efektów frakcją Gravehearts.' } }),
  }),
  overclock: Object.freeze({
    win_first_battle: localized({ en: { title: 'Inspection Passed', description: 'Win your first battle with Project H.E.R.D.' }, pl: { title: 'Pozytywny Wynik Kontroli', description: 'Wygraj pierwszą bitwę Programem P.A.S.Z.A.' } }),
    win_10_battles: localized({ en: { title: 'Quota Met', description: 'Win 7 battles with Project H.E.R.D.' }, pl: { title: 'Norma Spełniona', description: 'Wygraj 7 bitew Programem P.A.S.Z.A.' } }),
    win_campaign: localized({ en: { title: 'Directive Fulfilled', description: 'Win a Campaign with Project H.E.R.D.' }, pl: { title: 'Dyrektywa Wykonana', description: 'Wygraj kampanię Programem P.A.S.Z.A.' } }),
    play_10_units: localized({ en: { title: 'Production Cycle', description: 'Play 20 Project H.E.R.D. units.' }, pl: { title: 'Cykl Produkcyjny', description: 'Zagraj 20 jednostek Programu P.A.S.Z.A.' } }),
    play_10_effects: localized({ en: { title: 'By Procedure', description: 'Play 10 Project H.E.R.D. effects.' }, pl: { title: 'Zgodnie z Procedurą', description: 'Zagraj 10 efektów Programu P.A.S.Z.A.' } }),
  }),
});

function createFallbackFactionDisplay(templateKey, factionNames) {
  const fallback = {
    win_first_battle: { en: { title: 'First Win', description: `Win your first battle with ${factionNames.en}.` }, pl: { title: 'Pierwsze zwycięstwo', description: `Wygraj pierwszą bitwę frakcją ${factionNames.pl}.` } },
    win_10_battles: { en: { title: 'Veteran', description: `Win 7 battles with ${factionNames.en}.` }, pl: { title: 'Weteran', description: `Wygraj 7 bitew frakcją ${factionNames.pl}.` } },
    win_campaign: { en: { title: 'Campaign Winner', description: `Win a campaign with ${factionNames.en}.` }, pl: { title: 'Zwycięska kampania', description: `Wygraj kampanię frakcją ${factionNames.pl}.` } },
    play_10_units: { en: { title: 'Mustered', description: `Play 20 units with ${factionNames.en}.` }, pl: { title: 'Mobilizacja', description: `Zagraj 20 jednostek frakcją ${factionNames.pl}.` } },
    play_10_effects: { en: { title: 'Trickster', description: `Play 10 effects with ${factionNames.en}.` }, pl: { title: 'Sztuczki', description: `Zagraj 10 efektów frakcją ${factionNames.pl}.` } },
  }[templateKey];
  return localized(fallback);
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
    factionNames: Object.freeze({
      en: getFactionPresentationName(factionId, 'en', factionKey),
      pl: getFactionPresentationName(factionId, 'pl', factionKey),
      uk: getFactionPresentationName(factionId, 'uk', factionKey),
    }),
  };
}

export function createFactionAchievementDefinition(factionKey, template, factionSortOrder = 0) {
  const displayContext = getFactionDisplayContext(factionKey);
  const display = FACTION_ACHIEVEMENT_CUSTOM_COPY[displayContext.factionId]?.[template.key]
    ?? createFallbackFactionDisplay(template.key, displayContext.factionNames);
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

function getVisitedArenaBattlegroundIds(stats) {
  const visits = isObject(stats?.arenaBattlegroundVisits) ? stats.arenaBattlegroundVisits : {};
  return Object.entries(visits)
    .filter(([, count]) => getSafeCounter(count) > 0)
    .map(([battlegroundId]) => battlegroundId);
}

function getEnabledArenaBattlegroundVisitProgress(stats, options = {}) {
  const enabledIds = getEnabledArenaBattlegroundIds(options);
  if (enabledIds.length === 0) return { current: 0, target: 0, completed: false };
  const visited = new Set(getVisitedArenaBattlegroundIds(stats));
  const current = enabledIds.filter((battlegroundId) => visited.has(battlegroundId)).length;
  return { current, target: enabledIds.length, completed: current >= enabledIds.length };
}

export function getAchievementDefinitions() {
  const factionCount = getFactionKeys().length;
  const definitions = [
    createThresholdDefinition({
      id: 'general.complete_tutorial',
      category: 'general',
      display: localized({ en: { title: 'Still Alive!', description: 'Complete the tutorial.' }, pl: { title: 'A jednak przeżył!', description: 'Ukończ samouczek.' } }),
      getCurrent: (stats) => (stats?.tutorialCompleted === true ? 1 : 0),
      difficulty: 1, target: 1,
    }),
    createThresholdDefinition({
      id: 'general.complete_first_battle',
      category: 'general',
      display: localized({ en: { title: 'On Air Debut', description: 'Play 3 battles.' }, pl: { title: 'Debiut na antenie', description: 'Rozegraj 3 bitwy.' } }),
      statPath: ['battlesPlayed'],
      difficulty: 1, target: 3,
    }),
    createThresholdDefinition({
      id: 'general.win_first_battle',
      category: 'general',
      display: localized({ en: { title: 'The Crowd Liked That', description: 'Win your first battle.' }, pl: { title: 'Publiczności się podobało', description: 'Wygraj pierwszą bitwę.' } }),
      statPath: ['battlesWon'],
      difficulty: 1, target: 1,
    }),
    createThresholdDefinition({
      id: 'general.lose_first_battle',
      category: 'general',
      display: localized({ en: { title: 'At Least You Tried', description: 'Lose your first battle.' }, pl: { title: 'Przynajmniej próbował', description: 'Przegraj pierwszą bitwę.' } }),
      statPath: ['battlesLost'],
      difficulty: 1, target: 1,
    }),
    createThresholdDefinition({ id: 'general.win_5_battles', category: 'general', display: localized({ en: { title: 'Old Hand', description: 'Win 5 battles.' }, pl: { title: 'Stary wyga', description: 'Wygraj 5 bitew.' } }), statPath: ['battlesWon'], difficulty: 2, target: 5 }),
    createThresholdDefinition({ id: 'general.win_10_battles', category: 'general', display: localized({ en: { title: 'Crowd Favorite', description: 'Win 12 battles.' }, pl: { title: 'Ulubieniec publiczności', description: 'Wygraj 12 bitew.' } }), statPath: ['battlesWon'], difficulty: 2, target: 12 }),
    createThresholdDefinition({ id: 'general.play_25_battles', category: 'general', display: localized({ en: { title: 'Regular Feature', description: 'Play 25 battles.' }, pl: { title: 'Stały punkt programu', description: 'Rozegraj 25 bitew.' } }), statPath: ['battlesPlayed'], difficulty: 2, target: 25 }),
    createThresholdDefinition({ id: 'general.play_100_battles', category: 'general', display: localized({ en: { title: 'Still Broadcasting', description: 'Play 100 battles.' }, pl: { title: 'Jeszcze nadajemy', description: 'Rozegraj 100 bitew.' } }), statPath: ['battlesPlayed'], difficulty: 4, target: 100 }),
    createThresholdDefinition({ id: 'general.win_50_battles', category: 'general', display: localized({ en: { title: 'Prime-Time Star', description: 'Win 50 battles.' }, pl: { title: 'Gwiazda ramówki', description: 'Wygraj 50 bitew.' } }), statPath: ['battlesWon'], difficulty: 4, target: 50 }),
    createThresholdDefinition({ id: 'general.active_battle_time_15_minutes', category: 'general', display: localized({ en: { title: 'Quarter Hour On Air', description: 'Spend 15 minutes in active battles.' }, pl: { title: 'Kwadrans na antenie', description: 'Spędź 15 minut w aktywnych bitwach.' } }), statPath: ['activeBattleTimeMs'], difficulty: 1, target: 900000 }),
    createThresholdDefinition({ id: 'general.active_battle_time_30_minutes', category: 'general', display: localized({ en: { title: 'Half-Hour Show', description: 'Spend 30 minutes in active battles.' }, pl: { title: 'Pół godziny programu', description: 'Spędź 30 minut w aktywnych bitwach.' } }), statPath: ['activeBattleTimeMs'], difficulty: 2, target: 1800000 }),
    createThresholdDefinition({ id: 'general.active_battle_time_60_minutes', category: 'general', display: localized({ en: { title: 'Broadcast Hour', description: 'Spend 60 minutes in active battles.' }, pl: { title: 'Godzina antenowa', description: 'Spędź 60 minut w aktywnych bitwach.' } }), statPath: ['activeBattleTimeMs'], difficulty: 3, target: 3600000 }),
    createThresholdDefinition({ id: 'campaign.win_first_campaign', category: 'campaign', display: localized({ en: { title: 'Trophy Claimer', description: 'Win a campaign.' }, pl: { title: 'Zdobywca Pucharu', description: 'Wygraj kampanię.' } }), statPath: ['campaignsWon'], difficulty: 3, target: 1 }),
    createThresholdDefinition({ id: 'campaign.win_campaign_every_faction', category: 'campaign', display: localized({ en: { title: 'Dominator', description: 'Win a campaign with every faction.' }, pl: { title: 'Dominator', description: 'Wygraj kampanię każdą frakcją.' } }), getCurrent: getEveryFactionCampaignWinCount, difficulty: 4, target: factionCount }),
    createThresholdDefinition({ id: 'campaign.lose_first_campaign', category: 'campaign', display: localized({ en: { title: 'Next, Please!', description: 'Lose a campaign.' }, pl: { title: 'Następny, proszę!', description: 'Przegraj kampanię.' } }), statPath: ['campaignsLost'], difficulty: 1, target: 1 }),
    createThresholdDefinition({ id: 'cards.play_first_unit', category: 'cards', display: localized({ en: { title: 'First Unit', description: 'Play your first unit.' }, pl: { title: 'Pierwsza jednostka', description: 'Zagraj pierwszą jednostkę.' } }), statPath: ['unitsPlayed'], difficulty: 1, target: 1 }),
    createThresholdDefinition({ id: 'cards.play_10_units', category: 'cards', display: localized({ en: { title: 'Cannon Fodder', description: 'Play 10 units.' }, pl: { title: 'Mięso armatnie', description: 'Zagraj 10 jednostek.' } }), statPath: ['unitsPlayed'], difficulty: 1, target: 10 }),
    createThresholdDefinition({ id: 'cards.play_25_units', category: 'cards', display: localized({ en: { title: 'Full Cast', description: 'Play 30 units.' }, pl: { title: 'Pełna obsada', description: 'Zagraj 30 jednostek.' } }), statPath: ['unitsPlayed'], difficulty: 2, target: 30 }),
    createThresholdDefinition({ id: 'cards.play_100_units', category: 'cards', display: localized({ en: { title: 'Mass Casting', description: 'Play 100 units.' }, pl: { title: 'Masowa obsada', description: 'Zagraj 100 jednostek.' } }), statPath: ['unitsPlayed'], difficulty: 3, target: 100 }),
    createThresholdDefinition({ id: 'cards.play_first_effect', category: 'cards', display: localized({ en: { title: 'First Effect', description: 'Play your first effect.' }, pl: { title: 'Pierwszy efekt', description: 'Zagraj pierwszy efekt.' } }), statPath: ['effectsPlayed'], difficulty: 1, target: 1 }),
    createThresholdDefinition({ id: 'cards.play_10_effects', category: 'cards', display: localized({ en: { title: 'Dirty Tricks', description: 'Play 10 effects.' }, pl: { title: 'Brudne sztuczki', description: 'Zagraj 10 efektów.' } }), statPath: ['effectsPlayed'], difficulty: 1, target: 10 }),
    createThresholdDefinition({ id: 'cards.play_25_effects', category: 'cards', display: localized({ en: { title: 'Anything for Ratings!', description: 'Play 30 effects.' }, pl: { title: 'Wszystko dla oglądalności!', description: 'Zagraj 30 efektów.' } }), statPath: ['effectsPlayed'], difficulty: 2, target: 30 }),
    createThresholdDefinition({ id: 'cards.play_100_effects', category: 'cards', display: localized({ en: { title: 'Special Effects', description: 'Play 100 effects.' }, pl: { title: 'Efekty specjalne', description: 'Zagraj 100 efektów.' } }), statPath: ['effectsPlayed'], difficulty: 3, target: 100 }),
    createThresholdDefinition({ id: 'arena.win_first_battle', category: 'arena', display: localized({ en: { title: 'Beginner’s Luck', description: 'Win your first Arena battle.' }, pl: { title: 'Szczęście debiutanta', description: 'Wygraj pierwszą bitwę na Arenie.' } }), statPath: ['arenaBattlesWon'], difficulty: 1, target: 1 }),
    createThresholdDefinition({ id: 'arena.play_first_battle', category: 'arena', display: localized({ en: { title: 'Arena Debut', description: 'Play your first Arena battle.' }, pl: { title: 'Debiut na Arenie', description: 'Rozegraj pierwszą bitwę na Arenie.' } }), statPath: ['arenaBattlesPlayed'], difficulty: 1, target: 1 }),
    createThresholdDefinition({ id: 'arena.play_5_battles', category: 'arena', display: localized({ en: { title: 'One More Spin', description: 'Play 5 Arena battles.' }, pl: { title: 'Jeszcze jeden obrót', description: 'Rozegraj 5 bitew na Arenie.' } }), statPath: ['arenaBattlesPlayed'], difficulty: 1, target: 5 }),
    createThresholdDefinition({ id: 'arena.win_3_battles', category: 'arena', display: localized({ en: { title: 'Hot Streak', description: 'Win 3 Arena battles.' }, pl: { title: 'Dobra passa', description: 'Wygraj 3 bitwy na Arenie.' } }), statPath: ['arenaBattlesWon'], difficulty: 2, target: 3 }),
    createThresholdDefinition({ id: 'arena.win_9_battles', category: 'arena', display: localized({ en: { title: 'Regular Customer', description: 'Win 9 Arena battles.' }, pl: { title: 'Stały klient', description: 'Wygraj 9 bitew na Arenie.' } }), statPath: ['arenaBattlesWon'], difficulty: 3, target: 9 }),
    createThresholdDefinition({ id: 'arena.win_25_battles', category: 'arena', display: localized({ en: { title: 'The House Knows You', description: 'Win 25 Arena battles.' }, pl: { title: 'Kasyno cię zna', description: 'Wygraj 25 bitew na Arenie.' } }), statPath: ['arenaBattlesWon'], difficulty: 4, target: 25 }),
    createThresholdDefinition({ id: 'arena.win_every_faction', category: 'arena', display: localized({ en: { title: 'All In', description: 'Win an Arena battle with every faction.' }, pl: { title: 'All in', description: 'Wygraj na Arenie każdą frakcją.' } }), getCurrent: getEveryFactionArenaWinCount, difficulty: 3, target: factionCount }),
    createThresholdDefinition({ id: 'arena.visit_all_battlegrounds', category: 'arena', display: localized({ en: { title: 'Every Familiar Battleground', description: 'Visit every Arena battleground.' }, pl: { title: 'Każdy skrawek Areny', description: 'Odwiedź wszystkie pola bitwy na Arenie.' } }), getCurrent: (stats) => getEnabledArenaBattlegroundVisitProgress(stats).current, getProgress: (stats, options) => getEnabledArenaBattlegroundVisitProgress(stats, options), check: (stats, options) => getEnabledArenaBattlegroundVisitProgress(stats, options).completed, difficulty: 3, target: 1 }),
    createThresholdDefinition({ id: 'arena.revisit_battleground', category: 'arena', display: localized({ en: { title: 'Back to Familiar Ground', description: 'Revisit an Arena battleground.' }, pl: { title: 'Lubię wracać tam, gdzie byłem już', description: 'Rozpocznij bitwę na wcześniej odwiedzonym polu Areny.' } }), statPath: ['arenaBattlegroundRevisitCount'], difficulty: 1, target: 1 }),
    createThresholdDefinition({ id: 'arena.lose_first_battle', category: 'arena', display: localized({ en: { title: 'Arena Setback', description: 'Lose your first Arena battle.' }, pl: { title: 'Porażka na Arenie', description: 'Przegraj pierwszą bitwę na Arenie.' } }), statPath: ['arenaBattlesLost'], difficulty: 1, target: 1 }),
    createThresholdDefinition({ id: 'campaign.start_first_campaign', category: 'campaign', display: localized({ en: { title: 'Campaign Begins', description: 'Start your first campaign.' }, pl: { title: 'Początek kampanii', description: 'Rozpocznij pierwszą kampanię.' } }), statPath: ['campaignsStarted'], difficulty: 1, target: 1 }),
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
    const definitionProgress = definition.getProgress(stats, options);
    progress[definition.id] = {
      ...definitionProgress,
      completed: isUnlocked || definitionProgress.completed,
      unlocked: isUnlocked,
    };

    if (!isUnlocked && definition.check(stats, options)) {
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
