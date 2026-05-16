import { getFactionByKey, getFactionKeys } from '../data/factions/index.js';
import { preloadImageAsset, resolvePublicAssetPath } from './backgroundArt.js';

export const CARD_ILLUSTRATION_SOURCE = Object.freeze({
  width: 512,
  height: 768,
  aspectRatio: '2:3 portrait',
  preferredFormat: 'webp',
});

export const CARD_ILLUSTRATION_PUBLIC_ROOT = 'public/assets/cards';
export const CARD_ILLUSTRATION_RUNTIME_ROOT = 'assets/cards';

const queuedTextureKeysByScene = new WeakMap();
const warnedMissingTextureKeys = new Set();

function normalizeIdentifier(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getFactionIdFromFactionKey(factionKey) {
  const faction = getFactionByKey(factionKey);
  return normalizeIdentifier(faction?.id) || normalizeIdentifier(factionKey);
}

function findFactionIdForCardId(cardId) {
  const normalizedCardId = normalizeIdentifier(cardId);
  if (!normalizedCardId) return '';

  for (const factionKey of getFactionKeys()) {
    const faction = getFactionByKey(factionKey);
    if (faction?.deck?.some((card) => card?.id === normalizedCardId)) {
      return getFactionIdFromFactionKey(factionKey);
    }
  }

  return '';
}

export function getCardIllustrationFactionId(card, explicitFactionId = null) {
  return normalizeIdentifier(explicitFactionId)
    || normalizeIdentifier(card?.factionId)
    || normalizeIdentifier(card?.faction)
    || findFactionIdForCardId(card?.id);
}

export function getCardIllustrationTextureKey(factionId, cardId) {
  const normalizedFactionId = normalizeIdentifier(factionId);
  const normalizedCardId = normalizeIdentifier(cardId);
  if (!normalizedFactionId || !normalizedCardId) return null;
  return `card.${normalizedFactionId}.${normalizedCardId}`;
}

export function getCardIllustrationPublicPath(factionId, cardId) {
  const normalizedFactionId = normalizeIdentifier(factionId);
  const normalizedCardId = normalizeIdentifier(cardId);
  if (!normalizedFactionId || !normalizedCardId) return null;
  return `${CARD_ILLUSTRATION_PUBLIC_ROOT}/${normalizedFactionId}/${normalizedCardId}.webp`;
}

export function getCardIllustrationRuntimePath(factionId, cardId) {
  const normalizedFactionId = normalizeIdentifier(factionId);
  const normalizedCardId = normalizeIdentifier(cardId);
  if (!normalizedFactionId || !normalizedCardId) return null;
  return resolvePublicAssetPath(`${CARD_ILLUSTRATION_RUNTIME_ROOT}/${normalizedFactionId}/${normalizedCardId}.webp`);
}

export function getCardIllustrationAsset(card, { factionId = null } = {}) {
  const cardId = normalizeIdentifier(card?.id);
  const resolvedFactionId = getCardIllustrationFactionId(card, factionId);
  const key = getCardIllustrationTextureKey(resolvedFactionId, cardId);
  const path = getCardIllustrationRuntimePath(resolvedFactionId, cardId);
  const publicPath = getCardIllustrationPublicPath(resolvedFactionId, cardId);

  return key && path ? { key, path, publicPath, factionId: resolvedFactionId, cardId } : null;
}

function getSceneQueuedTextureKeys(scene) {
  let queuedTextureKeys = queuedTextureKeysByScene.get(scene);
  if (!queuedTextureKeys) {
    queuedTextureKeys = new Set();
    queuedTextureKeysByScene.set(scene, queuedTextureKeys);
  }
  return queuedTextureKeys;
}

export function warnMissingCardIllustration(asset) {
  if (!asset?.key || warnedMissingTextureKeys.has(asset.key)) return;
  warnedMissingTextureKeys.add(asset.key);
  console.warn(`Card illustration missing: ${asset.publicPath ?? asset.path}`);
}

export function preloadCardIllustrationAsset(scene, asset) {
  if (!scene || !asset?.key || !asset?.path || scene.textures?.exists?.(asset.key)) {
    return false;
  }

  const queuedTextureKeys = getSceneQueuedTextureKeys(scene);
  if (queuedTextureKeys.has(asset.key)) {
    return false;
  }

  queuedTextureKeys.add(asset.key);
  preloadImageAsset(scene, asset, {
    onError: (failedAsset) => warnMissingCardIllustration({ ...asset, ...failedAsset }),
  });
  return true;
}

export function preloadCardIllustration(scene, card, options = {}) {
  const asset = getCardIllustrationAsset(card, options);
  return preloadCardIllustrationAsset(scene, asset);
}

export function preloadCardIllustrationsForFaction(scene, factionKeyOrData) {
  const faction = typeof factionKeyOrData === 'string' ? getFactionByKey(factionKeyOrData) : factionKeyOrData;
  const factionId = getCardIllustrationFactionId({ factionId: faction?.id }, faction?.id);
  return (faction?.deck ?? [])
    .map((card) => preloadCardIllustration(scene, card, { factionId }))
    .filter(Boolean).length;
}

export function preloadAllCardIllustrations(scene) {
  return getFactionKeys().reduce((count, factionKey) => count + preloadCardIllustrationsForFaction(scene, factionKey), 0);
}

export function getLoadedCardIllustrationTextureKey(scene, card, options = {}) {
  const asset = getCardIllustrationAsset(card, options);
  if (!asset?.key) return null;

  if (scene?.textures?.exists?.(asset.key)) {
    return asset.key;
  }

  warnMissingCardIllustration(asset);
  return null;
}
