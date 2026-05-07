export const BATTLE_BACKGROUND_FALLBACK_COLOR = 0x05080f;
export const BATTLE_BACKGROUND_FALLBACK_COLOR_HEX = '#05080f';

export const BACKGROUND_ART_TARGET = {
  aspectRatio: '9:16 portrait',
  masterResolution: { width: 1440, height: 2560 },
  largerSourceResolution: { width: 2160, height: 3840 },
};

export const BATTLE_BACKGROUND_ASSETS = {
  default: {
    key: 'background.default.battlefield',
    path: null,
  },
  factions: {},
};

export function getBattleBackgroundAsset({ playerFactionKey = null } = {}) {
  const factionAsset = playerFactionKey ? BATTLE_BACKGROUND_ASSETS.factions[playerFactionKey] : null;
  return factionAsset ?? BATTLE_BACKGROUND_ASSETS.default;
}

export function preloadBattleBackgroundArt(scene) {
  const assets = [
    BATTLE_BACKGROUND_ASSETS.default,
    ...Object.values(BATTLE_BACKGROUND_ASSETS.factions),
  ].filter((asset) => asset?.path && asset?.key);

  assets.forEach((asset) => {
    if (!scene.textures.exists(asset.key)) {
      scene.load.image(asset.key, asset.path);
    }
  });
}

export function hasLoadedBattleBackground(scene, asset) {
  return Boolean(asset?.key && scene.textures.exists(asset.key));
}
