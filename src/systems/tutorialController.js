import { TUTORIAL_STEPS } from '../data/tutorial/tutorialSteps.js';

export const TUTORIAL_EVENT_TO_EXPECTED_TYPE = Object.freeze({
  tap_continue: 'tap_continue',
  deck_opened: 'click_deck',
  deck_closed: 'close_deck',
  battle_menu_opened: 'click_battle_menu',
  battle_menu_closed: 'close_battle_menu',
  mulligan_card_selected: 'select_mulligan_card',
  mulligan_confirmed: 'confirm_mulligan',
  unit_played: 'play_card_to_slot',
  enemy_action_completed: 'wait_enemy_action',
  combat_completed: 'wait_combat',
  adjacent_swap_completed: 'swap_adjacent_units',
  redeploy_completed: 'redeploy_unit',
  effect_played: 'play_effect',
  pass_completed: 'pass',
});

export function createTutorialControllerState({ steps = TUTORIAL_STEPS } = {}) {
  return { steps, currentStepIndex: 0, completed: steps.length === 0, lastEvent: null };
}

export function resetTutorialController(state) {
  if (!state) return createTutorialControllerState();
  state.currentStepIndex = 0;
  state.completed = state.steps.length === 0;
  state.lastEvent = null;
  return state;
}

export function getCurrentTutorialStep(state) {
  if (!state || state.completed) return null;
  return state.steps[state.currentStepIndex] ?? null;
}

export function isTutorialComplete(state) {
  return Boolean(!state || state.completed || state.currentStepIndex >= state.steps.length);
}

export function advanceTutorialStep(state, reason = null) {
  if (!state || state.completed) return getCurrentTutorialStep(state);
  state.lastEvent = reason;
  state.currentStepIndex += 1;
  if (state.currentStepIndex >= state.steps.length) state.completed = true;
  return getCurrentTutorialStep(state);
}

export function isTutorialEventExpected(state, eventName, payload = {}) {
  const step = getCurrentTutorialStep(state);
  const expectedType = TUTORIAL_EVENT_TO_EXPECTED_TYPE[eventName] ?? eventName;
  if (!step || !expectedType || step.expected?.type !== expectedType) return false;
  const expected = step.expected ?? {};
  for (const key of ['cardId', 'slotIndex', 'fromIndex', 'toIndex', 'target']) {
    if (Object.hasOwn(expected, key) && Object.hasOwn(payload, key) && payload[key] !== expected[key]) return false;
  }
  return true;
}

export function handleTutorialEvent(state, eventName, payload = {}) {
  const matched = isTutorialEventExpected(state, eventName, payload);
  if (!matched) return { matched: false, completed: isTutorialComplete(state), currentStep: getCurrentTutorialStep(state) };
  const previousStep = getCurrentTutorialStep(state);
  const currentStep = advanceTutorialStep(state, { eventName, payload, previousStepId: previousStep?.id ?? null });
  return { matched: true, completed: isTutorialComplete(state), previousStep, currentStep };
}
