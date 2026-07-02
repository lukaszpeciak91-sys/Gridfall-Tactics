import { getCurrentTutorialStep } from './tutorialController.js';

export const TUTORIAL_GATE_ACTIONS = Object.freeze({
  TAP_CONTINUE: 'tap_continue',
  CLICK_DECK: 'click_deck',
  CLOSE_DECK: 'close_deck',
  CLICK_BATTLE_MENU: 'click_battle_menu',
  CLOSE_BATTLE_MENU: 'close_battle_menu',
  SELECT_MULLIGAN_CARD: 'select_mulligan_card',
  CONFIRM_MULLIGAN: 'confirm_mulligan',
  PLAY_CARD_TO_SLOT: 'play_card_to_slot',
  SWAP_ADJACENT_UNITS: 'swap_adjacent_units',
  REDEPLOY_UNIT: 'redeploy_unit',
  PLAY_EFFECT: 'play_effect',
  PASS: 'pass',
  WAIT_ENEMY_ACTION: 'wait_enemy_action',
  WAIT_COMBAT: 'wait_combat',
});

const GAMEPLAY_ACTIONS = new Set([
  TUTORIAL_GATE_ACTIONS.SELECT_MULLIGAN_CARD,
  TUTORIAL_GATE_ACTIONS.CONFIRM_MULLIGAN,
  TUTORIAL_GATE_ACTIONS.PLAY_CARD_TO_SLOT,
  TUTORIAL_GATE_ACTIONS.SWAP_ADJACENT_UNITS,
  TUTORIAL_GATE_ACTIONS.REDEPLOY_UNIT,
  TUTORIAL_GATE_ACTIONS.PLAY_EFFECT,
  TUTORIAL_GATE_ACTIONS.PASS,
]);

function valuesMatch(expected, proposal, key) {
  return !Object.hasOwn(expected, key) || expected[key] === proposal[key];
}

export function checkTutorialInputGate(tutorialControllerState, proposal = {}) {
  const step = getCurrentTutorialStep(tutorialControllerState);
  if (!step) return { allowed: true, reason: 'no_tutorial_step', step: null };

  const expected = step.expected ?? {};
  const expectedType = expected.type;
  const actionType = proposal.type;

  if (!expectedType || !actionType) return { allowed: true, reason: 'ungated_action', step };

  if (expectedType === TUTORIAL_GATE_ACTIONS.WAIT_ENEMY_ACTION || expectedType === TUTORIAL_GATE_ACTIONS.WAIT_COMBAT) {
    const allowed = actionType === expectedType;
    return { allowed, reason: allowed ? 'allowed_wait_event' : `waiting_for_${expectedType}`, step };
  }

  if (expectedType === TUTORIAL_GATE_ACTIONS.TAP_CONTINUE && GAMEPLAY_ACTIONS.has(actionType)) {
    return { allowed: false, reason: 'tap_continue_required', step };
  }

  if (GAMEPLAY_ACTIONS.has(actionType) || actionType.startsWith('click_') || actionType.startsWith('close_')) {
    if (actionType !== expectedType) return { allowed: false, reason: `expected_${expectedType}`, step };
  }

  const allowed = ['cardId', 'slotIndex', 'fromIndex', 'toIndex', 'target'].every((key) => valuesMatch(expected, proposal, key));
  return { allowed, reason: allowed ? 'allowed' : `expected_${expectedType}_metadata`, step };
}
