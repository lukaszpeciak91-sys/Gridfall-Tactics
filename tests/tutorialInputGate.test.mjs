import test from 'node:test';
import assert from 'node:assert/strict';

import { TUTORIAL_STEPS } from '../src/data/tutorial/tutorialSteps.js';
import { createTutorialControllerState, handleTutorialEvent } from '../src/systems/tutorialController.js';
import { checkTutorialInputGate } from '../src/systems/tutorialInputGate.js';

function stateAt(stepId) {
  const state = createTutorialControllerState();
  state.currentStepIndex = TUTORIAL_STEPS.findIndex((step) => step.id === stepId);
  assert.notEqual(state.currentStepIndex, -1);
  return state;
}

function allowed(stepId, proposal) {
  return checkTutorialInputGate(stateAt(stepId), proposal).allowed;
}

test('tutorial gate allows normal behavior when controller state is null', () => {
  assert.equal(checkTutorialInputGate(null, { type: 'play_card_to_slot', cardId: 'any', slotIndex: 2 }).allowed, true);
});

test('mulligan selection gates only the tutorial bait card and advances through controller events', () => {
  const state = stateAt('mulligan_select');
  assert.equal(checkTutorialInputGate(state, { type: 'select_mulligan_card', cardId: 'wrong' }).allowed, false);
  assert.equal(handleTutorialEvent(state, 'mulligan_card_selected', { cardId: 'wrong' }).matched, false);
  assert.equal(checkTutorialInputGate(state, { type: 'select_mulligan_card', cardId: 'tutorial_mulligan_bait_1' }).allowed, true);
  assert.equal(handleTutorialEvent(state, 'mulligan_card_selected', { cardId: 'tutorial_mulligan_bait_1' }).matched, true);
});

test('mulligan confirm, unit play, swap, redeploy, effect, and pass are metadata gated', () => {
  assert.equal(allowed('mulligan_confirm', { type: 'confirm_mulligan', target: 'player_base_button' }), true);
  assert.equal(allowed('mulligan_confirm', { type: 'pass', target: 'player_base_button' }), false);

  assert.equal(allowed('play_unit_a', { type: 'play_card_to_slot', cardId: 'wrong', slotIndex: 0 }), false);
  assert.equal(allowed('play_unit_a', { type: 'play_card_to_slot', cardId: 'tutorial_unit_a_1', slotIndex: 1 }), false);
  assert.equal(allowed('play_unit_a', { type: 'play_card_to_slot', cardId: 'tutorial_unit_a_1', slotIndex: 0 }), true);

  assert.equal(allowed('adjacent_swap', { type: 'swap_adjacent_units', fromIndex: 1, toIndex: 0 }), false);
  assert.equal(allowed('adjacent_swap', { type: 'swap_adjacent_units', fromIndex: 0, toIndex: 1 }), true);

  assert.equal(allowed('redeploy', { type: 'redeploy_unit', cardId: 'tutorial_unit_b_1', slotIndex: 0 }), false);
  assert.equal(allowed('redeploy', { type: 'redeploy_unit', cardId: 'tutorial_unit_c_1', slotIndex: 1 }), false);
  assert.equal(allowed('redeploy', { type: 'redeploy_unit', cardId: 'tutorial_unit_c_1', slotIndex: 0 }), true);

  assert.equal(allowed('effect_card', { type: 'play_effect', cardId: 'wrong' }), false);
  assert.equal(allowed('effect_card', { type: 'play_effect', cardId: 'tutorial_all_attack_1' }), true);

  assert.equal(allowed('play_unit_a', { type: 'pass', target: 'player_base_button' }), false);
  assert.equal(allowed('final_pass', { type: 'pass', target: 'player_base_button' }), true);
});

test('wait and tap_continue steps block gameplay until their expected event', () => {
  for (const stepId of ['enemy_action', 'combat_after_actions']) {
    assert.equal(allowed(stepId, { type: 'play_card_to_slot', cardId: 'tutorial_unit_a_1', slotIndex: 0 }), false);
    assert.equal(allowed(stepId, { type: 'pass', target: 'player_base_button' }), false);
  }
  assert.equal(allowed('enemy_action', { type: 'wait_enemy_action' }), true);
  assert.equal(allowed('combat_after_actions', { type: 'wait_combat' }), true);
  assert.equal(allowed('bases_goal', { type: 'play_card_to_slot', cardId: 'tutorial_unit_a_1', slotIndex: 0 }), false);
});
