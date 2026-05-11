import enTranslations from './translations/en.json' with { type: 'json' };
import plTranslations from './translations/pl.json' with { type: 'json' };

export const DEFAULT_LOCALE = 'en';
export const SETTINGS_STORAGE_KEY = 'gridfall:tactics:settings:v1';

const SUPPORTED_LOCALES = Object.freeze(['en', 'pl']);
const TRANSLATIONS = Object.freeze({
  en: enTranslations,
  pl: plTranslations,
});
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

function lookupTranslation(dictionary, key) {
  if (!dictionary || typeof key !== 'string' || key.length === 0) {
    return undefined;
  }

  return key.split('.').reduce((value, segment) => {
    if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, segment)) {
      return value[segment];
    }
    return undefined;
  }, dictionary);
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

export function formatTranslation(template, replacements = {}) {
  if (typeof template !== 'string') {
    return template;
  }

  return template.replace(/\{([^{}]+)\}/g, (match, token) => {
    const value = replacements[token];
    return value === undefined || value === null ? match : String(value);
  });
}

export function translate(key, locale = DEFAULT_LOCALE, fallbackValue, replacements = {}) {
  const normalizedLocale = normalizeLocale(locale);
  const localizedValue = lookupTranslation(TRANSLATIONS[normalizedLocale], key);
  if (typeof localizedValue === 'string') {
    return formatTranslation(localizedValue, replacements);
  }

  const englishValue = lookupTranslation(TRANSLATIONS[DEFAULT_LOCALE], key);
  if (typeof englishValue === 'string') {
    return formatTranslation(englishValue, replacements);
  }

  return formatTranslation(fallbackValue ?? key, replacements);
}

export function translateActive(key, fallbackValue, replacements = {}) {
  return translate(key, getActiveLocale(), fallbackValue, replacements);
}

export function translateList(key, locale = DEFAULT_LOCALE, fallbackValue = []) {
  const normalizedLocale = normalizeLocale(locale);
  const localizedValue = lookupTranslation(TRANSLATIONS[normalizedLocale], key);
  if (Array.isArray(localizedValue)) {
    return localizedValue;
  }

  const englishValue = lookupTranslation(TRANSLATIONS[DEFAULT_LOCALE], key);
  if (Array.isArray(englishValue)) {
    return englishValue;
  }

  return fallbackValue;
}

export function translateActiveList(key, fallbackValue = []) {
  return translateList(key, getActiveLocale(), fallbackValue);
}

