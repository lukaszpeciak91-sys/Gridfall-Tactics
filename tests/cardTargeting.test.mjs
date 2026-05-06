import assert from 'node:assert/strict';
import test from 'node:test';
import { getTargetingStateForEffect } from '../src/systems/cardTargeting.js';

test('Quick Fix uses the same friendly-unit targeting state in UI as its gameplay resolver', () => {
  assert.deepEqual(getTargetingStateForEffect('heal_1_atk_1_draw_on_kill_this_turn', 'aggro_quick_fix_1'), {
    cardId: 'aggro_quick_fix_1',
    targetType: 'friendly-unit',
    requiredTargets: 1,
    targetIndexes: [],
  });
});

test('two-target swap effects expose the required target counts for UI selection', () => {
  assert.deepEqual(getTargetingStateForEffect('swap_any_two_units', 'control_swap_1'), {
    cardId: 'control_swap_1',
    targetType: 'any-unit',
    requiredTargets: 2,
    targetIndexes: [],
  });
  assert.deepEqual(getTargetingStateForEffect('swap_two_enemy_units', 'control_controller_1'), {
    cardId: 'control_controller_1',
    targetType: 'enemy-unit',
    requiredTargets: 2,
    targetIndexes: [],
  });
});


test('Pulse Wave remains a deterministic non-manual effect in UI targeting metadata', () => {
  assert.equal(getTargetingStateForEffect('damage_up_to_2_enemies_1', 'control_pulse_wave_1'), null);
});
