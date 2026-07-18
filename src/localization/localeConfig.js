export const DEFAULT_LOCALE = 'en';
export const SETTINGS_STORAGE_KEY = 'gridfall:tactics:settings:v1';

const SUPPORTED_LOCALES = Object.freeze(['en', 'pl']);

export function normalizeLocale(locale) {
  return SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
}

export function getSupportedLocales() {
  return [...SUPPORTED_LOCALES];
}
