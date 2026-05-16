const FRIENDLY_SINGLE_TARGET_EFFECTS = new Set([
  'return_friendly_draw_1',
  'destroy_friendly_draw_1',
  'quick_strike',
  'heal_2',
  'heal_1_atk_1_draw_on_kill_this_turn',
  'heal_3',
  'temp_armor_1',
  'swap_adjacent_then_resolve',
]);

const ENEMY_SINGLE_TARGET_EFFECTS = new Set([
  'enemy_lane_atk_minus_1',
  'ignore_armor_next_attack',
  'control_enemy_unit_this_turn',
  'infect_damage_1_opposite_ally_atk_1',
]);

export function getTargetingStateForEffect(effectId, cardId) {
  if (FRIENDLY_SINGLE_TARGET_EFFECTS.has(effectId)) {
    return { cardId, targetType: 'friendly-unit', requiredTargets: 1, targetIndexes: [] };
  }
  if (ENEMY_SINGLE_TARGET_EFFECTS.has(effectId)) {
    return { cardId, targetType: 'enemy-unit', requiredTargets: 1, targetIndexes: [] };
  }
  if (effectId === 'swap_two_enemy_units') {
    return { cardId, targetType: 'enemy-unit', requiredTargets: 2, targetIndexes: [] };
  }
  if (effectId === 'swap_adjacent_enemy_units') {
    return { cardId, targetType: 'enemy-unit', requiredTargets: 2, targetIndexes: [], targetConstraint: 'adjacent-pair' };
  }
  if (effectId === 'swap_any_two_units') {
    return { cardId, targetType: 'any-unit', requiredTargets: 2, targetIndexes: [] };
  }
  return null;
}
