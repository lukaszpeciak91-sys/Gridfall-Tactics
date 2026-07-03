import { getCurrentTutorialStep } from './tutorialController.js';

export const TUTORIAL_GATE_ACTIONS = Object.freeze({
  TAP_CONTINUE: 'tap_continue',
  CLICK_DECK: 'click_deck',
  CLOSE_DECK: 'close_deck',
  CLICK_BATTLE_MENU: 'click_battle_menu',
  CLOSE_BATTLE_MENU: 'close_battle_menu',
  INSPECT_CARD: 'inspect_card',
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


const UNLOCKABLE_UTILITY_ACTIONS = Object.freeze({
  [TUTORIAL_GATE_ACTIONS.CLICK_DECK]: 'deck_counter_open',
  [TUTORIAL_GATE_ACTIONS.CLOSE_DECK]: 'deck_counter_open',
  [TUTORIAL_GATE_ACTIONS.CLICK_BATTLE_MENU]: 'battle_menu_open',
  [TUTORIAL_GATE_ACTIONS.CLOSE_BATTLE_MENU]: 'battle_menu_open',
});

function isTutorialStepCompleted(tutorialControllerState, stepId) {
  const steps = tutorialControllerState?.steps ?? [];
  const stepIndex = steps.findIndex((step) => step.id === stepId);
  if (stepIndex < 0) return false;
  return tutorialControllerState.completed || tutorialControllerState.currentStepIndex > stepIndex;
}

function isUnlockedUtilityAction(tutorialControllerState, actionType) {
  const unlockStepId = UNLOCKABLE_UTILITY_ACTIONS[actionType];
  return Boolean(unlockStepId && isTutorialStepCompleted(tutorialControllerState, unlockStepId));
}

function valuesMatch(expected, proposal, key) {
  return !Object.hasOwn(expected, key) || expected[key] === proposal[key];
}

function isExpectedAdjacentSwapMetadata(step, proposal) {
  const expected = step?.expected ?? {};
  if (step?.id !== 'adjacent_swap') return null;
  const expectedFrom = expected.fromIndex;
  const expectedTo = expected.toIndex;
  const proposedFrom = proposal.fromIndex;
  const proposedTo = proposal.toIndex;
  const isForward = proposedFrom === expectedFrom && proposedTo === expectedTo;
  const isReverse = proposedFrom === expectedTo && proposedTo === expectedFrom;
  return isForward || isReverse;
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

  const utilityUnlocked = actionType !== expectedType && isUnlockedUtilityAction(tutorialControllerState, actionType);
  if (utilityUnlocked) return { allowed: true, reason: 'allowed_unlocked_utility', step };

  if (expectedType === TUTORIAL_GATE_ACTIONS.TAP_CONTINUE && GAMEPLAY_ACTIONS.has(actionType)) {
    return { allowed: false, reason: 'tap_continue_required', step };
  }

  if (GAMEPLAY_ACTIONS.has(actionType) || actionType.startsWith('click_') || actionType.startsWith('close_')) {
    if (actionType !== expectedType) return { allowed: false, reason: `expected_${expectedType}`, step };
  }

  const adjacentSwapMatches = isExpectedAdjacentSwapMetadata(step, proposal);
  const metadataKeys = adjacentSwapMatches === null ? ['cardId', 'slotIndex', 'fromIndex', 'toIndex', 'target'] : ['cardId', 'slotIndex', 'target'];
  const allowed = metadataKeys.every((key) => valuesMatch(expected, proposal, key))
    && (adjacentSwapMatches ?? true);
  if (!allowed) return { allowed: false, reason: `expected_${expectedType}_metadata`, step };

  if (step.id === 'adjacent_swap' && Array.isArray(proposal.board)) {
    const fromUnit = proposal.board[proposal.fromIndex];
    const toUnit = proposal.board[proposal.toIndex];
    const hasExpectedPlayerUnits = fromUnit?.owner === 'player' && toUnit?.owner === 'player';
    if (!hasExpectedPlayerUnits) return { allowed: false, reason: 'expected_adjacent_player_units', step };
  }

  return { allowed: true, reason: 'allowed', step };
}
