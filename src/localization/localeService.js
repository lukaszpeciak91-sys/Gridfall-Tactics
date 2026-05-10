export const DEFAULT_LOCALE = 'en';
export const SETTINGS_STORAGE_KEY = 'gridfall:tactics:settings:v1';

const SUPPORTED_LOCALES = Object.freeze(['en', 'pl']);
let activeLocale = DEFAULT_LOCALE;

function getLocalStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    console.warn('Locale localStorage is unavailable; default locale will be used.', error);
    return null;
  }
}

function readStoredSettings() {
  const storage = getLocalStorage();
  if (!storage) {
    return {};
  }

  try {
    const rawSettings = storage.getItem(SETTINGS_STORAGE_KEY);
    return rawSettings ? JSON.parse(rawSettings) : {};
  } catch (error) {
    console.warn('Locale settings read failed; default locale will be used.', error);
    return {};
  }
}

function writeStoredLocale(locale) {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  try {
    const settings = readStoredSettings();
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...settings, language: locale }));
  } catch (error) {
    console.warn('Locale settings write failed; locale change remains in memory only.', error);
  }
}

export function normalizeLocale(locale) {
  return SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
}

export function getSupportedLocales() {
  return [...SUPPORTED_LOCALES];
}

export function getActiveLocale() {
  const storedLocale = readStoredSettings().language;
  activeLocale = normalizeLocale(storedLocale ?? activeLocale);
  return activeLocale;
}

export function setActiveLocale(locale) {
  activeLocale = normalizeLocale(locale);
  writeStoredLocale(activeLocale);
  return activeLocale;
}
