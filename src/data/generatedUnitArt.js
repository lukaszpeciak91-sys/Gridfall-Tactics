export const GENERATED_UNIT_ART = Object.freeze({
  swarmGrunt: Object.freeze({
    factionId: 'swarm',
    artAssetId: 'token_grunt_01',
    tokenType: 'grunt',
    isToken: true,
    collectible: false,
  }),
  swarmFloodToken: Object.freeze({
    factionId: 'swarm',
    artAssetId: 'token_flood_01',
    tokenType: 'floodToken',
    isToken: true,
    collectible: false,
  }),
  attritionSwarmGrunt: Object.freeze({
    factionId: 'attrition-swarm',
    artAssetId: 'token_grunt_02',
    tokenType: 'grunt',
    isToken: true,
    collectible: false,
  }),
});

export const GENERATED_UNIT_ART_ASSETS = Object.freeze(Object.values(GENERATED_UNIT_ART));

export function getGeneratedGruntArtForSource(source) {
  const sourceId = source?.id ?? source?.cardId ?? '';
  if (typeof sourceId === 'string' && sourceId.startsWith('attrition_swarm_')) {
    return GENERATED_UNIT_ART.attritionSwarmGrunt;
  }
  return GENERATED_UNIT_ART.swarmGrunt;
}
