import { translateActive } from './localization/localeService.js';

export const STARTUP_READY_PROMPT_KEY = 'ui.startup.tapAnywhere';
export const STARTUP_READY_PROMPT_FALLBACK = 'TAP ANYWHERE';

export function getStartupReadyPrompt() {
  const prompt = translateActive(STARTUP_READY_PROMPT_KEY, STARTUP_READY_PROMPT_FALLBACK);
  return typeof prompt === 'string' && prompt.trim().length > 0
    ? prompt
    : STARTUP_READY_PROMPT_FALLBACK;
}

export function applyStartupReadyPrompt(documentRef = globalThis.document) {
  const splash = documentRef?.getElementById?.('startup-splash');
  if (!splash) {
    return;
  }

  const prompt = getStartupReadyPrompt();
  splash.dataset.readyPrompt = prompt;

  const readyPromptTarget = splash.querySelector?.('.startup-splash__copy');
  if (readyPromptTarget) {
    readyPromptTarget.dataset.readyPrompt = prompt;
  }
}

applyStartupReadyPrompt();
