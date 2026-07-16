import { BATTLE_BACKGROUND_ASSETS, resolvePublicAssetPath } from '../rendering/backgroundArt.js';

export const DEFAULT_ARENA_BATTLEGROUND_ID = 'default';
export const NUMBERED_ARENA_BATTLEGROUND_ID_PATTERN = /^b\d{2,}$/;

export function isNumberedArenaBattlegroundId(battlegroundId) {
  return typeof battlegroundId === 'string' && NUMBERED_ARENA_BATTLEGROUND_ID_PATTERN.test(battlegroundId);
}

export function createNumberedArenaBattleground(battlegroundId) {
  if (!isNumberedArenaBattlegroundId(battlegroundId)) {
    throw new TypeError(`Arena battleground id must use the bNN convention: ${String(battlegroundId)}`);
  }

  return Object.freeze({
    id: battlegroundId,
    key: `background.arena.${battlegroundId}`,
    path: resolvePublicAssetPath(`assets/backgrounds/arena/${battlegroundId}.webp`),
  });
}

export const NUMBERED_ARENA_BATTLEGROUNDS = Object.freeze([
  createNumberedArenaBattleground('b01'),
  createNumberedArenaBattleground('b02'),
  createNumberedArenaBattleground('b03'),
  createNumberedArenaBattleground('b04'),
  createNumberedArenaBattleground('b05'),
  createNumberedArenaBattleground('b06'),
  createNumberedArenaBattleground('b07'),
  createNumberedArenaBattleground('b08'),
  createNumberedArenaBattleground('b09'),
]);

export const ARENA_BATTLEGROUNDS = Object.freeze([
  Object.freeze({
    id: DEFAULT_ARENA_BATTLEGROUND_ID,
    key: BATTLE_BACKGROUND_ASSETS.default.key,
    path: BATTLE_BACKGROUND_ASSETS.default.path,
  }),
  ...NUMBERED_ARENA_BATTLEGROUNDS,
]);

export function getArenaBattlegrounds() {
  return ARENA_BATTLEGROUNDS;
}

export function getEnabledArenaBattlegroundIds({ pool = ARENA_BATTLEGROUNDS } = {}) {
  if (!Array.isArray(pool)) return [];
  const seen = new Set();
  return pool
    .filter((battleground) => battleground?.enabled !== false && battleground?.id && battleground?.key && battleground?.path)
    .map((battleground) => battleground.id)
    .filter((battlegroundId) => {
      if (!battlegroundId || seen.has(battlegroundId)) return false;
      seen.add(battlegroundId);
      return true;
    });
}

export function getArenaBattlegroundById(battlegroundId) {
  return ARENA_BATTLEGROUNDS.find((battleground) => battleground.id === battlegroundId) ?? null;
}

export function resolveArenaBattlegroundId(battlegroundId) {
  return getArenaBattlegroundById(battlegroundId)?.id ?? DEFAULT_ARENA_BATTLEGROUND_ID;
}

export function getArenaBattlegroundAsset(battlegroundId) {
  return getArenaBattlegroundById(resolveArenaBattlegroundId(battlegroundId)) ?? BATTLE_BACKGROUND_ASSETS.default;
}

export function selectArenaBattlegroundId({ pool = ARENA_BATTLEGROUNDS, randomFn = Math.random } = {}) {
  const candidates = Array.isArray(pool)
    ? pool.filter((battleground) => battleground?.enabled !== false && battleground?.id && battleground?.key && battleground?.path)
    : [];

  if (candidates.length === 0) {
    return DEFAULT_ARENA_BATTLEGROUND_ID;
  }

  const rng = typeof randomFn === 'function' ? randomFn : Math.random;
  const roll = Number(rng());
  const normalizedRoll = Number.isFinite(roll) ? Math.min(Math.max(roll, 0), 0.999999999999) : 0;
  const index = Math.floor(normalizedRoll * candidates.length);
  return candidates[index]?.id ?? DEFAULT_ARENA_BATTLEGROUND_ID;
}
