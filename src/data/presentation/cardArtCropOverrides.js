const CARD_ART_CROP_OVERRIDES = Object.freeze({
  aggro_flanker_1: Object.freeze({
    yOffset: -0.08,
  }),
});

export function getCardArtCropOverride(cardOrCardId) {
  const cardId = typeof cardOrCardId === 'string'
    ? cardOrCardId
    : cardOrCardId?.id;
  if (!cardId) return null;

  const override = CARD_ART_CROP_OVERRIDES[String(cardId)];
  if (!override) return null;

  const cropY01 = Number(override.cropY01);
  if (Number.isFinite(cropY01)) {
    return { cropY01 };
  }

  const yOffset = Number(override.yOffset);
  if (Number.isFinite(yOffset)) {
    return { yOffset };
  }

  return null;
}

export function getCardArtCropYOffset(cardOrCardId) {
  return getCardArtCropOverride(cardOrCardId)?.yOffset ?? 0;
}

export function getCardArtCropY01(cardOrCardId) {
  return getCardArtCropOverride(cardOrCardId)?.cropY01 ?? null;
}

export { CARD_ART_CROP_OVERRIDES };
