import { DEFAULT_LOCALE, SETTINGS_STORAGE_KEY, normalizeLocale } from './localization/localeConfig.js';

export const STARTUP_READY_PROMPTS = Object.freeze({
  en: 'TAP ANYWHERE',
  pl: 'DOTKNIJ GDZIEKOLWIEK',
});

function getLocalStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    console.warn('Startup prompt localStorage is unavailable; English prompt will be used.', error);
    return null;
  }
}

export function getStartupReadyPrompt() {
  const storage = getLocalStorage();
  if (!storage) {
    return STARTUP_READY_PROMPTS[DEFAULT_LOCALE];
  }

  try {
    const rawSettings = storage.getItem(SETTINGS_STORAGE_KEY);
    const settings = rawSettings ? JSON.parse(rawSettings) : {};
    const locale = normalizeLocale(settings?.language);
    return STARTUP_READY_PROMPTS[locale] ?? STARTUP_READY_PROMPTS[DEFAULT_LOCALE];
  } catch (error) {
    console.warn('Startup prompt settings read failed; English prompt will be used.', error);
    return STARTUP_READY_PROMPTS[DEFAULT_LOCALE];
  }
}

export function applyStartupReadyPrompt(documentRef = globalThis.document) {
  const splash = documentRef?.getElementById?.('startup-splash');
  if (!splash) {
    return;
  }

  splash.dataset.readyPrompt = getStartupReadyPrompt();
}

applyStartupReadyPrompt();
