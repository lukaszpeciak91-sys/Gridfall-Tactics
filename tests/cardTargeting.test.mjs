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

test('two-target effect metadata exposes required target counts without changing unit on-play determinism', () => {
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


test('Jam Signal uses max-target positive-ATK enemy metadata while Pulse Wave remains deterministic', () => {
  assert.deepEqual(getTargetingStateForEffect('enemy_up_to_2_atk_minus_1', 'control_jam_signal_1'), {
    cardId: 'control_jam_signal_1',
    targetType: 'enemy-unit',
    requiredTargets: 2,
    targetLimit: 2,
    targetConstraint: 'positive-attack',
    targetIndexes: [],
  });
  assert.equal(getTargetingStateForEffect('damage_all_enemies_1_ignore_armor', 'control_pulse_wave_1'), null);
});
