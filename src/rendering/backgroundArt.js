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
const DEFAULT_BATTLE_BACKGROUND_PUBLIC_PATH = 'assets/backgrounds/default/battlefield.webp';
const ARENA_LIGHT_SWEEP_TEXTURE_KEY = 'effect.arena-light-sweep.soft-gradient';
const ARENA_LIGHT_SWEEP_TEXTURE_SIZE = 512;

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
    path: resolvePublicAssetPath(DEFAULT_BATTLE_BACKGROUND_PUBLIC_PATH),
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

  assets.forEach((asset) => preloadImageAsset(scene, asset, {
    onError: (failedAsset) => console.warn(`Battle background failed to load: ${failedAsset.path}`),
  }));
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

export function createMenuArenaLightSweep(scene, {
  width = scene.scale.width,
  height = scene.scale.height,
  depth = -900,
  opacity = 0.1,
  duration = 12000,
  angle = -12,
  intensity = 1,
  y = height * 0.28,
} = {}) {
  ensureArenaLightSweepTexture(scene);

  const sweep = scene.add.image(-width * 0.5, y, ARENA_LIGHT_SWEEP_TEXTURE_KEY)
    .setOrigin(0.5)
    .setDepth(depth)
    .setAlpha(opacity * intensity)
    .setAngle(angle);

  const displayWidth = Math.max(width * 1.85, height * 0.9);
  const displayHeight = Math.max(height * 0.42, width * 0.48);
  sweep.setDisplaySize(displayWidth, displayHeight);

  if (sweep.setBlendMode) {
    sweep.setBlendMode(globalThis.Phaser?.BlendModes?.ADD ?? 'ADD');
  }

  const startX = -displayWidth * 0.45;
  const endX = width + displayWidth * 0.45;
  sweep.setX(startX);

  scene.tweens.add({
    targets: sweep,
    x: endX,
    duration,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  });

  return sweep;
}

function ensureArenaLightSweepTexture(scene) {
  if (scene.textures.exists(ARENA_LIGHT_SWEEP_TEXTURE_KEY)) {
    return;
  }

  const texture = scene.textures.createCanvas(
    ARENA_LIGHT_SWEEP_TEXTURE_KEY,
    ARENA_LIGHT_SWEEP_TEXTURE_SIZE,
    ARENA_LIGHT_SWEEP_TEXTURE_SIZE,
  );
  const canvas = texture.getSourceImage();
  const context = canvas.getContext('2d');
  const size = ARENA_LIGHT_SWEEP_TEXTURE_SIZE;

  context.clearRect(0, 0, size, size);

  const horizontalGlow = context.createLinearGradient(0, 0, size, 0);
  horizontalGlow.addColorStop(0, 'rgba(255,255,255,0)');
  horizontalGlow.addColorStop(0.36, 'rgba(197,219,255,0.08)');
  horizontalGlow.addColorStop(0.5, 'rgba(255,255,255,0.24)');
  horizontalGlow.addColorStop(0.64, 'rgba(180,210,255,0.08)');
  horizontalGlow.addColorStop(1, 'rgba(255,255,255,0)');

  context.fillStyle = horizontalGlow;
  context.fillRect(0, 0, size, size);

  context.globalCompositeOperation = 'destination-in';
  const verticalFeather = context.createLinearGradient(0, 0, 0, size);
  verticalFeather.addColorStop(0, 'rgba(255,255,255,0)');
  verticalFeather.addColorStop(0.18, 'rgba(255,255,255,0.18)');
  verticalFeather.addColorStop(0.5, 'rgba(255,255,255,1)');
  verticalFeather.addColorStop(0.82, 'rgba(255,255,255,0.18)');
  verticalFeather.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = verticalFeather;
  context.fillRect(0, 0, size, size);
  context.globalCompositeOperation = 'source-over';

  texture.refresh();
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
