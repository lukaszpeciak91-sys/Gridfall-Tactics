import { getFactionByKey } from './factions/index.js';
import { getCardIllustrationAsset } from '../rendering/cardIllustrationAssets.js';

export const BATTLE_TRANSITION_GENERIC_POOL_KEY = 'generic';
export const BATTLE_TRANSITION_TUTORIAL_POOL_KEY = 'tutorial';

export const BATTLE_TRANSITION_ILLUSTRATION_ALLOWLIST = Object.freeze({
  aggro: Object.freeze([
    Object.freeze({ artAssetId: 'aggro_01', cardId: 'aggro_runner_1' }),
    Object.freeze({ artAssetId: 'aggro_02', cardId: 'aggro_berserker_1' }),
    Object.freeze({ artAssetId: 'aggro_09', cardId: 'aggro_adrenaline_1' }),
  ]),
  'attrition-swarm': Object.freeze([
    Object.freeze({ artAssetId: 'attrition-swarm_02', cardId: 'attrition_swarm_carrier_1' }),
    Object.freeze({ artAssetId: 'attrition-swarm_03', cardId: 'attrition_swarm_leech_1' }),
    Object.freeze({ artAssetId: 'attrition-swarm_09', cardId: 'attrition_swarm_rise_again_1' }),
  ]),
  control: Object.freeze([
    Object.freeze({ artAssetId: 'control_02', cardId: 'control_disruptor_1' }),
    Object.freeze({ artAssetId: 'control_03', cardId: 'control_sniper_1' }),
    Object.freeze({ artAssetId: 'control_05', cardId: 'control_drone_1' }),
  ]),
  overclock: Object.freeze([
    Object.freeze({ artAssetId: 'overclock_01', cardId: 'overclock_hot_runner_1' }),
    Object.freeze({ artAssetId: 'overclock_05', cardId: 'overclock_mob_champion_1' }),
    Object.freeze({ artAssetId: 'overclock_06', cardId: 'overclock_redline_1' }),
  ]),
  swarm: Object.freeze([
    Object.freeze({ artAssetId: 'swarm_02', cardId: 'swarm_spitter_1' }),
    Object.freeze({ artAssetId: 'swarm_04', cardId: 'swarm_rusher_1' }),
    Object.freeze({ artAssetId: 'swarm_05', cardId: 'swarm_alpha_1' }),
  ]),
  tank: Object.freeze([
    Object.freeze({ artAssetId: 'tank_01', cardId: 'tank_shieldbearer_1' }),
    Object.freeze({ artAssetId: 'tank_04', cardId: 'tank_wall_1' }),
    Object.freeze({ artAssetId: 'tank_07', cardId: 'tank_stability_1' }),
  ]),
  wardens: Object.freeze([
    Object.freeze({ artAssetId: 'wardens_02', cardId: 'wardens_spearwall_1' }),
    Object.freeze({ artAssetId: 'wardens_05', cardId: 'wardens_watch_captain_1' }),
    Object.freeze({ artAssetId: 'wardens_10', cardId: 'wardens_hold_the_line_1' }),
  ]),
  [BATTLE_TRANSITION_GENERIC_POOL_KEY]: Object.freeze([]),
  [BATTLE_TRANSITION_TUTORIAL_POOL_KEY]: Object.freeze([
    Object.freeze({ factionId: 'tutorial', artAssetId: 'ally_01', cardId: 'tutorial_unit_a_1' }),
    Object.freeze({ factionId: 'tutorial', artAssetId: 'ally_03', cardId: 'tutorial_unit_c_1' }),
    Object.freeze({ factionId: 'tutorial', artAssetId: 'effect_01', cardId: 'tutorial_all_attack_1' }),
  ]),
});

const lastSelectionByPoolIdentity = new Map();

function normalize(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getFactionId(factionKey) {
  const faction = getFactionByKey(factionKey);
  return normalize(faction?.id) || normalize(factionKey).toLowerCase().replaceAll(' ', '-');
}

function getSelectionKey(entry, fallbackFactionId) {
  const factionId = normalize(entry?.factionId) || fallbackFactionId;
  const artAssetId = normalize(entry?.artAssetId);
  return factionId && artAssetId ? `${factionId}::${artAssetId}` : '';
}

function addPoolEntries(candidates, seenKeys, allowlist, poolKey) {
  const pool = allowlist?.[poolKey];
  if (!Array.isArray(pool) || !pool.length) return;

  for (const entry of pool) {
    const selectionKey = getSelectionKey(entry, poolKey);
    if (!selectionKey || seenKeys.has(selectionKey)) continue;
    seenKeys.add(selectionKey);
    candidates.push({ ...entry, resolvedPoolKey: poolKey, selectionKey });
  }
}

function getBattlePoolIdentity(poolKeys) {
  return poolKeys.filter(Boolean).join('|') || 'fallback';
}

function getProductionFallbackCandidates(allowlist) {
  const candidates = [];
  const seenKeys = new Set();
  for (const poolKey of Object.keys(allowlist ?? {})) {
    if (poolKey === BATTLE_TRANSITION_TUTORIAL_POOL_KEY) continue;
    addPoolEntries(candidates, seenKeys, allowlist, poolKey);
  }
  if (candidates.length) return candidates;

  for (const poolKey of Object.keys(allowlist ?? {})) {
    addPoolEntries(candidates, seenKeys, allowlist, poolKey);
  }
  return candidates;
}

export function getBattleTransitionPoolCounts() {
  return Object.fromEntries(Object.entries(BATTLE_TRANSITION_ILLUSTRATION_ALLOWLIST).map(([key, pool]) => [key, pool.length]));
}

export function resolveBattleTransitionCandidates(payload = {}, allowlist = BATTLE_TRANSITION_ILLUSTRATION_ALLOWLIST) {
  if (payload?.battleContext?.mode === 'tutorial') {
    const candidates = [];
    addPoolEntries(candidates, new Set(), allowlist, BATTLE_TRANSITION_TUTORIAL_POOL_KEY);
    return {
      candidates,
      poolIdentity: BATTLE_TRANSITION_TUTORIAL_POOL_KEY,
      requestedPoolKeys: [BATTLE_TRANSITION_TUTORIAL_POOL_KEY],
      fallbackUsed: false,
    };
  }

  const playerPoolKey = getFactionId(payload?.factionKey);
  const enemyPoolKey = getFactionId(payload?.enemyFactionKey);
  const requestedPoolKeys = [...new Set([playerPoolKey, enemyPoolKey, BATTLE_TRANSITION_GENERIC_POOL_KEY].filter(Boolean))];
  const candidates = [];
  const seenKeys = new Set();
  for (const poolKey of requestedPoolKeys) addPoolEntries(candidates, seenKeys, allowlist, poolKey);

  if (candidates.length) {
    return {
      candidates,
      poolIdentity: getBattlePoolIdentity(requestedPoolKeys),
      requestedPoolKeys,
      fallbackUsed: false,
    };
  }

  const fallbackCandidates = getProductionFallbackCandidates(allowlist);
  return {
    candidates: fallbackCandidates,
    poolIdentity: 'fallback',
    requestedPoolKeys,
    fallbackUsed: true,
  };
}

export function resolveBattleTransitionIllustration(payload = {}, random = Math.random, options = {}) {
  const allowlist = options.allowlist ?? BATTLE_TRANSITION_ILLUSTRATION_ALLOWLIST;
  const previousSelections = options.previousSelections ?? lastSelectionByPoolIdentity;
  const { candidates, poolIdentity, requestedPoolKeys, fallbackUsed } = resolveBattleTransitionCandidates(payload, allowlist);
  const lastKey = previousSelections.get(poolIdentity);
  const repeatSafeCandidates = candidates.length > 1 ? candidates.filter((entry) => entry.selectionKey !== lastKey) : candidates;
  const selectionPool = repeatSafeCandidates.length ? repeatSafeCandidates : candidates;
  const selected = selectionPool[Math.floor(random() * selectionPool.length)] ?? getProductionFallbackCandidates(allowlist)[0];
  const resolvedPoolKey = selected?.resolvedPoolKey ?? requestedPoolKeys[0] ?? 'fallback';
  const factionId = normalize(selected?.factionId) || resolvedPoolKey;
  const card = { id: selected?.cardId, factionId, artAssetId: selected?.artAssetId };
  const asset = getCardIllustrationAsset(card, { factionId });
  const selectionKey = getSelectionKey(selected, factionId);
  if (selectionKey) previousSelections.set(poolIdentity, selectionKey);
  return { ...selected, factionId, poolKey: poolIdentity, requestedPoolKey: requestedPoolKeys[0] ?? '', requestedPoolKeys, selectionKey, card, asset, fallbackUsed };
}
