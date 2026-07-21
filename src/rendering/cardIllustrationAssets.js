import { getFactionByKey, getFactionKeys } from '../data/factions/index.js';
import { GENERATED_UNIT_ART_ASSETS } from '../data/generatedUnitArt.js';
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

function findFactionAndCardForCardId(cardId) {
  const normalizedCardId = normalizeIdentifier(cardId);
  if (!normalizedCardId) return { factionId: '', card: null };

  for (const factionKey of getFactionKeys()) {
    const faction = getFactionByKey(factionKey);
    const card = faction?.deck?.find((deckCard) => deckCard?.id === normalizedCardId);
    if (card) {
      return { factionId: getFactionIdFromFactionKey(factionKey), card };
    }
  }

  return { factionId: '', card: null };
}

function findFactionIdForCardId(cardId) {
  return findFactionAndCardForCardId(cardId).factionId;
}

function findCanonicalCardForCardId(cardId) {
  return findFactionAndCardForCardId(cardId).card;
}

export function getCardIllustrationFactionId(card, explicitFactionId = null) {
  return normalizeIdentifier(explicitFactionId)
    || normalizeIdentifier(card?.factionId)
    || normalizeIdentifier(card?.faction)
    || findFactionIdForCardId(card?.id);
}

export function getCardIllustrationAssetId(card) {
  const explicitArtAssetId = normalizeIdentifier(card?.artAssetId);
  if (explicitArtAssetId) return explicitArtAssetId;

  const canonicalCard = findCanonicalCardForCardId(card?.id);
  return normalizeIdentifier(canonicalCard?.artAssetId) || normalizeIdentifier(card?.id);
}

export function getCardIllustrationTextureKey(factionId, artAssetIdOrCardId) {
  const normalizedFactionId = normalizeIdentifier(factionId);
  const normalizedArtAssetId = normalizeIdentifier(artAssetIdOrCardId);
  if (!normalizedFactionId || !normalizedArtAssetId) return null;
  return `card.${normalizedFactionId}.${normalizedArtAssetId}`;
}

export function getCardIllustrationPublicPath(factionId, artAssetIdOrCardId) {
  const normalizedFactionId = normalizeIdentifier(factionId);
  const normalizedArtAssetId = normalizeIdentifier(artAssetIdOrCardId);
  if (!normalizedFactionId || !normalizedArtAssetId) return null;
  return `${CARD_ILLUSTRATION_PUBLIC_ROOT}/${normalizedFactionId}/${normalizedArtAssetId}.webp`;
}

export function getCardIllustrationRuntimePath(factionId, artAssetIdOrCardId) {
  const normalizedFactionId = normalizeIdentifier(factionId);
  const normalizedArtAssetId = normalizeIdentifier(artAssetIdOrCardId);
  if (!normalizedFactionId || !normalizedArtAssetId) return null;
  return resolvePublicAssetPath(`${CARD_ILLUSTRATION_RUNTIME_ROOT}/${normalizedFactionId}/${normalizedArtAssetId}.webp`);
}

export function getCardIllustrationAsset(card, { factionId = null } = {}) {
  const cardId = normalizeIdentifier(card?.id);
  const artAssetId = getCardIllustrationAssetId(card);
  const resolvedFactionId = getCardIllustrationFactionId(card, factionId);
  const key = getCardIllustrationTextureKey(resolvedFactionId, artAssetId);
  const path = getCardIllustrationRuntimePath(resolvedFactionId, artAssetId);
  const publicPath = getCardIllustrationPublicPath(resolvedFactionId, artAssetId);

  return key && path ? { key, path, publicPath, factionId: resolvedFactionId, cardId, artAssetId } : null;
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
    onError: (failedAsset) => {
      queuedTextureKeys.delete(asset.key);
      warnMissingCardIllustration({ ...asset, ...failedAsset });
    },
  });
  return true;
}

export function preloadCardIllustration(scene, card, options = {}) {
  const asset = getCardIllustrationAsset(card, options);
  return preloadCardIllustrationAsset(scene, asset);
}

export function getCardIllustrationAssetsForFaction(factionKeyOrData, { includeGeneratedUnitArt = false } = {}) {
  const faction = typeof factionKeyOrData === 'string' ? getFactionByKey(factionKeyOrData) : factionKeyOrData;
  const fallbackFactionId = getCardIllustrationFactionId({ factionId: faction?.id }, faction?.id);
  const assetsByKey = new Map();

  (faction?.deck ?? []).forEach((card) => {
    const asset = getCardIllustrationAsset(card, { factionId: getCardIllustrationFactionId(card) || fallbackFactionId });
    if (asset?.key) assetsByKey.set(asset.key, asset);
  });

  if (includeGeneratedUnitArt) {
    GENERATED_UNIT_ART_ASSETS
      .filter((generatedUnitArt) => getCardIllustrationFactionId(generatedUnitArt) === fallbackFactionId)
      .forEach((generatedUnitArt) => {
        const asset = getCardIllustrationAsset(generatedUnitArt, { factionId: fallbackFactionId });
        if (asset?.key) assetsByKey.set(asset.key, asset);
      });
  }

  return [...assetsByKey.values()];
}

export function preloadCardIllustrationsForFaction(scene, factionKeyOrData) {
  return getCardIllustrationAssetsForFaction(factionKeyOrData)
    .map((asset) => preloadCardIllustrationAsset(scene, asset))
    .filter(Boolean).length;
}

export function preloadGeneratedUnitIllustrations(scene) {
  return GENERATED_UNIT_ART_ASSETS
    .map((generatedUnitArt) => preloadCardIllustration(scene, generatedUnitArt))
    .filter(Boolean).length;
}

export function preloadAllCardIllustrations(scene) {
  const deckIllustrationCount = getFactionKeys()
    .reduce((count, factionKey) => count + preloadCardIllustrationsForFaction(scene, factionKey), 0);
  return deckIllustrationCount + preloadGeneratedUnitIllustrations(scene);
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
