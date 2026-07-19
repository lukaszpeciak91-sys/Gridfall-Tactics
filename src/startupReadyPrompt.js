import { translateActive } from './localization/localeService.js';

export const STARTUP_READY_PROMPT_KEY = 'ui.startup.tapAnywhere';
export const STARTUP_READY_PROMPT_FALLBACK = 'TAP ANYWHERE';
export const STARTUP_LOADING_STATUS_KEY = 'ui.startup.preparingBroadcast';
export const STARTUP_LOADING_STATUS_FALLBACK = 'PREPARING BROADCAST';

function getStartupText(key, fallback) {
  const text = translateActive(key, fallback);
  return typeof text === 'string' && text.trim().length > 0
    ? text
    : fallback;
}

export function getStartupReadyPrompt() {
  return getStartupText(STARTUP_READY_PROMPT_KEY, STARTUP_READY_PROMPT_FALLBACK);
}

export function getStartupLoadingStatus() {
  return getStartupText(STARTUP_LOADING_STATUS_KEY, STARTUP_LOADING_STATUS_FALLBACK);
}

export function applyStartupReadyPrompt(documentRef = globalThis.document) {
  const splash = documentRef?.getElementById?.('startup-splash');
  if (!splash) {
    return;
  }

  const prompt = getStartupReadyPrompt();
  const loadingStatus = getStartupLoadingStatus();
  splash.dataset.readyPrompt = prompt;

  const readyPromptTarget = splash.querySelector?.('.startup-splash__copy');
  if (readyPromptTarget) {
    readyPromptTarget.dataset.readyPrompt = prompt;
    readyPromptTarget.textContent = loadingStatus;
  }
}

applyStartupReadyPrompt();
