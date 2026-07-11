import { getFactionByKey } from './factions/index.js';
import { getCardIllustrationAsset } from '../rendering/cardIllustrationAssets.js';

export const BATTLE_TRANSITION_ILLUSTRATION_ALLOWLIST = Object.freeze({
  aggro: Object.freeze([
    Object.freeze({ artAssetId: 'aggro_02', cardId: 'aggro_berserker_1' }),
    Object.freeze({ artAssetId: 'aggro_09', cardId: 'aggro_adrenaline_1' }),
  ]),
  'attrition-swarm': Object.freeze([
    Object.freeze({ artAssetId: 'attrition-swarm_03', cardId: 'attrition_swarm_leech_1' }),
    Object.freeze({ artAssetId: 'attrition-swarm_09', cardId: 'attrition_swarm_rise_again_1' }),
  ]),
  control: Object.freeze([
    Object.freeze({ artAssetId: 'control_02', cardId: 'control_disruptor_1' }),
    Object.freeze({ artAssetId: 'control_05', cardId: 'control_drone_1' }),
  ]),
  swarm: Object.freeze([
    Object.freeze({ artAssetId: 'swarm_04', cardId: 'swarm_rusher_1' }),
    Object.freeze({ artAssetId: 'swarm_05', cardId: 'swarm_alpha_1' }),
  ]),
  tank: Object.freeze([
    Object.freeze({ artAssetId: 'tank_01', cardId: 'tank_shieldbearer_1' }),
    Object.freeze({ artAssetId: 'tank_07', cardId: 'tank_stability_1' }),
  ]),
  wardens: Object.freeze([
    Object.freeze({ artAssetId: 'wardens_05', cardId: 'wardens_watch_captain_1' }),
    Object.freeze({ artAssetId: 'wardens_10', cardId: 'wardens_hold_the_line_1' }),
  ]),
  tutorial: Object.freeze([
    Object.freeze({ factionId: 'tutorial', artAssetId: 'ally_01', cardId: 'tutorial_unit_a_1' }),
    Object.freeze({ factionId: 'tutorial', artAssetId: 'ally_03', cardId: 'tutorial_unit_c_1' }),
  ]),
});

const lastSelectionByFaction = new Map();

function normalize(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getFactionId(factionKey) {
  const faction = getFactionByKey(factionKey);
  return normalize(faction?.id) || normalize(factionKey).toLowerCase().replaceAll(' ', '-');
}

function getPoolKey(payload = {}) {
  return payload?.battleContext?.mode === 'tutorial' ? 'tutorial' : getFactionId(payload?.factionKey);
}

export function getBattleTransitionPoolCounts() {
  return Object.fromEntries(Object.entries(BATTLE_TRANSITION_ILLUSTRATION_ALLOWLIST).map(([key, pool]) => [key, pool.length]));
}

export function resolveBattleTransitionIllustration(payload = {}, random = Math.random) {
  const requestedPoolKey = getPoolKey(payload);
  const poolKey = BATTLE_TRANSITION_ILLUSTRATION_ALLOWLIST[requestedPoolKey] ? requestedPoolKey : 'aggro';
  const pool = BATTLE_TRANSITION_ILLUSTRATION_ALLOWLIST[poolKey] ?? [];
  const fullFallbackPool = Object.values(BATTLE_TRANSITION_ILLUSTRATION_ALLOWLIST).flat();
  const candidates = pool.length ? pool : fullFallbackPool;
  const lastKey = lastSelectionByFaction.get(poolKey);
  const repeatSafeCandidates = candidates.length > 1 ? candidates.filter((entry) => `${entry.factionId ?? poolKey}::${entry.artAssetId}` !== lastKey) : candidates;
  const selectionPool = repeatSafeCandidates.length ? repeatSafeCandidates : candidates;
  const selected = selectionPool[Math.floor(random() * selectionPool.length)] ?? fullFallbackPool[0];
  const factionId = normalize(selected?.factionId) || poolKey;
  const card = { id: selected.cardId, factionId, artAssetId: selected.artAssetId };
  const asset = getCardIllustrationAsset(card, { factionId });
  const selectionKey = `${factionId}::${selected.artAssetId}`;
  lastSelectionByFaction.set(poolKey, selectionKey);
  return { ...selected, factionId, poolKey, requestedPoolKey, selectionKey, card, asset };
}
