const CARD_ART_POSITION_OVERRIDES = Object.freeze({
  aggro_adrenaline_1: Object.freeze({ artPositionY: 0.3 }),
  aggro_berserker_1: Object.freeze({ artPositionY: 0.6 }),
  aggro_flanker_1: Object.freeze({ artPositionY: 0.675 }),
  aggro_full_attack_1: Object.freeze({ artPositionY: 0.375 }),
  aggro_pierce_strike_1: Object.freeze({ artPositionY: 0.3 }),
  aggro_quick_fix_1: Object.freeze({ artPositionY: 0.4 }),
  aggro_runner_1: Object.freeze({ artPositionY: 0.45 }),
  aggro_rush_1: Object.freeze({ artPositionY: 0.375 }),
  aggro_scout_1: Object.freeze({ artPositionY: 0.625 }),
  control_controller_1: Object.freeze({ artPositionY: 0.175 }),
  control_disruptor_1: Object.freeze({ artPositionY: 0.375 }),
  control_hacker_1: Object.freeze({ artPositionY: 0.25 }),
  control_jam_signal_1: Object.freeze({ artPositionY: 0.225 }),
  control_swap_1: Object.freeze({ artPositionY: 0.625 }),
  swarm_alpha_1: Object.freeze({ artPositionY: 0.1 }),
  swarm_brood_1: Object.freeze({ artPositionY: 0.35 }),
  swarm_grunt_1: Object.freeze({ artPositionY: 0.4 }),
  swarm_recycle_1: Object.freeze({ artPositionY: 0.3 }),
  swarm_regrow_1: Object.freeze({ artPositionY: 0.5 }),
  swarm_rusher_1: Object.freeze({ artPositionY: 0.375 }),
  swarm_spawn_1: Object.freeze({ artPositionY: 0.275 }),
  swarm_spitter_1: Object.freeze({ artPositionY: 0.475 }),
  swarm_swarm_attack_1: Object.freeze({ artPositionY: 0.45 }),
  tank_bruiser_1: Object.freeze({ artPositionY: 0.225 }),
  tank_fortify_1: Object.freeze({ artPositionY: 0.075 }),
  tank_heavy_1: Object.freeze({ artPositionY: 0.175 }),
  tank_last_stand_1: Object.freeze({ artPositionY: 0.25 }),
  tank_reinforce_1: Object.freeze({ artPositionY: 0 }),
  tank_shieldbearer_1: Object.freeze({ artPositionY: 0.1 }),
  tank_stability_1: Object.freeze({ artPositionY: 0.1 }),
  tank_wall_1: Object.freeze({ artPositionY: 0.375 }),
  wardens_brace_1: Object.freeze({ artPositionY: 0.25 }),
  wardens_halberdier_1: Object.freeze({ artPositionY: 0.175 }),
  wardens_hold_the_line_1: Object.freeze({ artPositionY: 0.2 }),
  wardens_shield_push_1: Object.freeze({ artPositionY: 0.3 }),
});

export function getCardArtPositionOverride(cardOrCardId) {
  const cardId = typeof cardOrCardId === 'string'
    ? cardOrCardId
    : cardOrCardId?.id;
  if (!cardId) return null;

  const override = CARD_ART_POSITION_OVERRIDES[String(cardId)];
  if (!override) return null;

  const artPositionY = Number(override.artPositionY);
  if (Number.isFinite(artPositionY)) {
    return { artPositionY: Math.min(1, Math.max(0, artPositionY)) };
  }

  const cropY01 = Number(override.cropY01);
  if (Number.isFinite(cropY01)) {
    return { artPositionY: Math.min(1, Math.max(0, cropY01)) };
  }

  const yOffset = Number(override.yOffset);
  if (Number.isFinite(yOffset)) {
    return { artPositionY: Math.min(1, Math.max(0, 0.5 - yOffset)) };
  }

  return null;
}

export function getCardArtPositionY(cardOrCardId) {
  return getCardArtPositionOverride(cardOrCardId)?.artPositionY ?? null;
}

export { CARD_ART_POSITION_OVERRIDES };
