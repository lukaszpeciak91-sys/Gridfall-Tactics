const CARD_ART_POSITION_OVERRIDES = Object.freeze({
  aggro_flanker_1: Object.freeze({
    artPositionY: 0.44,
  }),
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
