const FRIENDLY_SINGLE_TARGET_EFFECTS = new Set([
  'return_friendly_draw_1',
  'destroy_friendly_draw_1',
  'destroy_friendly_damage_enemy_base_1',
  'quick_strike',
  'heal_1',
  'heal_2',
  'heal_1_atk_1_draw_on_kill_this_turn',
  'heal_3',
  'temp_armor_1',
  'ally_atk_plus_1_opposing_enemy_atk_minus_1_until_combat',
  'lane_tempo_mod_until_combat',
]);

const ENEMY_SINGLE_TARGET_EFFECTS = new Set([
  'enemy_lane_atk_minus_1',
  'enemy_atk_to_0_until_combat',
  'ignore_armor_next_attack',
  'control_enemy_unit_this_turn',
  'infect_damage_1_opposite_ally_atk_1',
]);

export function getTargetingStateForEffect(effectId, cardId, targeting = null) {
  // Parametric lane tempo may be friendly- or enemy-targeted. The caller can
  // pass the concrete targeting mode on custom-faction cards; keep the legacy
  // one-argument behavior friendly for production Mercy.
  if (effectId === 'lane_tempo_mod_until_combat' && targeting === 'enemy_unit') {
    return { cardId, targetType: 'enemy-unit', requiredTargets: 1, targetIndexes: [] };
  }
  if (effectId === 'swap_adjacent_then_resolve') {
    return { cardId, targetType: 'friendly-unit', requiredTargets: 2, targetIndexes: [], targetConstraint: 'adjacent-pair' };
  }
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
  if (effectId === 'enemy_atk_to_0_ally_atk_plus_1_until_combat') {
    return { cardId, targetType: 'enemy-and-friendly-unit', requiredTargets: 2, targetIndexes: [] };
  }
  if (effectId === 'enemy_up_to_2_atk_minus_1') {
    return { cardId, targetType: 'enemy-unit', requiredTargets: 2, targetLimit: 2, targetConstraint: 'positive-attack', targetIndexes: [] };
  }
  if (effectId === 'swap_any_two_friendly_units' || effectId === 'swap_any_two_friendly_units_buff_both_atk_1') {
    return { cardId, targetType: 'friendly-unit', requiredTargets: 2, targetIndexes: [] };
  }
  if (effectId === 'swap_any_two_units') {
    return { cardId, targetType: 'any-unit', requiredTargets: 2, targetIndexes: [] };
  }
  return null;
}
