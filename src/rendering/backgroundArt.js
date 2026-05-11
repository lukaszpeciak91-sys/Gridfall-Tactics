export const BATTLE_BACKGROUND_FALLBACK_COLOR = 0x05080f;
export const BATTLE_BACKGROUND_FALLBACK_COLOR_HEX = '#05080f';
export const MENU_BACKGROUND_FALLBACK_COLOR = 0x111827;
export const MENU_BACKGROUND_FALLBACK_COLOR_HEX = '#111827';

export const BACKGROUND_ART_TARGET = {
  aspectRatio: '9:16 portrait',
  masterResolution: { width: 1440, height: 2560 },
  largerSourceResolution: { width: 2160, height: 3840 },
};

const MENU_BACKGROUND_PUBLIC_PATH = 'assets/backgrounds/menu-background.webp';

export function resolvePublicAssetPath(path) {
  const base = import.meta.env?.BASE_URL || './';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${path}`;
}

export const MENU_BACKGROUND_ASSET = {
  key: 'background.menu.start',
  path: resolvePublicAssetPath(MENU_BACKGROUND_PUBLIC_PATH),
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

export function getMenuBackgroundAsset() {
  return MENU_BACKGROUND_ASSET;
}

export function preloadBattleBackgroundArt(scene) {
  const assets = [
    BATTLE_BACKGROUND_ASSETS.default,
    ...Object.values(BATTLE_BACKGROUND_ASSETS.factions),
  ].filter((asset) => asset?.path && asset?.key);

  assets.forEach((asset) => preloadImageAsset(scene, asset));
}

export function preloadMenuBackgroundArt(scene) {
  preloadImageAsset(scene, MENU_BACKGROUND_ASSET, {
    onError: (asset) => console.warn(`Menu background failed to load: ${asset.path}`),
  });
}

export function preloadImageAsset(scene, asset, { onError = null } = {}) {
  if (!asset?.path || !asset?.key || scene.textures.exists(asset.key)) {
    return;
  }

  if (onError) {
    const removeLoadListeners = () => {
      scene.load.off('filecomplete', removeOnComplete);
      scene.load.off('loaderror', warnOnLoadError);
    };
    const removeOnComplete = (key) => {
      if (key === asset.key) {
        removeLoadListeners();
      }
    };
    const warnOnLoadError = (file) => {
      if (file?.key === asset.key) {
        removeLoadListeners();
        onError(asset);
      }
    };
    scene.load.on('filecomplete', removeOnComplete);
    scene.load.on('loaderror', warnOnLoadError);
  }

  scene.load.image(asset.key, asset.path);
}

export function hasLoadedBattleBackground(scene, asset) {
  return hasLoadedImageAsset(scene, asset);
}

export function hasLoadedMenuBackground(scene) {
  return hasLoadedImageAsset(scene, MENU_BACKGROUND_ASSET);
}

export function hasLoadedImageAsset(scene, asset) {
  return Boolean(asset?.key && scene.textures.exists(asset.key));
}

export function createCoverBackground(scene, {
  asset,
  fallbackColor,
  fallbackAlpha = 1,
  depth = -1000,
  width = scene.scale.width,
  height = scene.scale.height,
} = {}) {
  const centerX = width * 0.5;
  const centerY = height * 0.5;

  if (hasLoadedImageAsset(scene, asset)) {
    const background = scene.add.image(centerX, centerY, asset.key)
      .setOrigin(0.5)
      .setDepth(depth);
    const coverScale = Math.max(width / background.width, height / background.height);
    background.setScale(coverScale);
    return background;
  }

  return scene.add.rectangle(centerX, centerY, width, height, fallbackColor, fallbackAlpha)
    .setDepth(depth);
}
