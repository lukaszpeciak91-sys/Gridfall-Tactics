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

const MENU_BACKGROUND_MOTION_EPOCH_KEY = 'gridfall.menuBackgroundAmbientMotionEpoch';
const MENU_LIGHT_SWEEP_MOTION_EPOCH_KEY = 'gridfall.menuLightSweepMotionEpoch';

const MENU_BACKGROUND_AMBIENT_DRIFT = {
  scaleMultiplier: 1.08,
  x: 14,
  y: -36,
  duration: 12000,
  ease: 'Sine.easeInOut',
};

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

export function preloadBattleBackgroundArt(scene, additionalAssets = []) {
  const assets = [
    BATTLE_BACKGROUND_ASSETS.default,
    ...Object.values(BATTLE_BACKGROUND_ASSETS.factions),
    ...additionalAssets,
  ].filter((asset, index, allAssets) => asset?.path && asset?.key
    && allAssets.findIndex((candidate) => candidate?.key === asset.key) === index);

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
  const applySweepPhase = () => {
    const { easedProgress } = calculateSharedYoyoPhase({
      scene,
      duration,
      ease: 'Sine.easeInOut',
      epochKey: MENU_LIGHT_SWEEP_MOTION_EPOCH_KEY,
    });
    sweep.setX(interpolate(startX, endX, easedProgress));
  };
  applySweepPhase();

  const onSweepUpdate = () => {
    if (sweep?.active) {
      applySweepPhase();
    }
  };
  scene.events.on(globalThis.Phaser?.Scenes?.Events?.UPDATE ?? 'update', onSweepUpdate);
  sweep.once?.('destroy', () => {
    scene.events.off(globalThis.Phaser?.Scenes?.Events?.UPDATE ?? 'update', onSweepUpdate);
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


export function createAnimatedMenuBackground(scene, {
  width = scene.scale.width,
  height = scene.scale.height,
  depth = -1000,
  fallbackColor = MENU_BACKGROUND_FALLBACK_COLOR,
  fallbackAlpha = 1,
  lightSweep = true,
  lightSweepOptions = {},
  ambientDrift = {},
} = {}) {
  const background = createCoverBackground(scene, {
    asset: MENU_BACKGROUND_ASSET,
    fallbackColor,
    fallbackAlpha,
    depth,
    width,
    height,
  });

  const state = {
    background,
    lightSweep: null,
    removeAmbientUpdate: null,
  };

  const imageBackground = isImageBackground(background);
  const driftOptions = { ...MENU_BACKGROUND_AMBIENT_DRIFT, ...ambientDrift };

  const applyAmbientDrift = (nextWidth = scene.scale.width, nextHeight = scene.scale.height) => {
    if (!imageBackground || !background?.active) {
      return;
    }

    const baseScale = calculateDriftSafeCoverScale(background, nextWidth, nextHeight, driftOptions);
    const transform = calculateMenuAmbientTransform({
      scene,
      width: nextWidth,
      height: nextHeight,
      baseScale,
      driftOptions,
    });
    background
      .setPosition(transform.x, transform.y)
      .setScale(transform.scale);
  };

  const startAmbientDrift = (nextWidth = scene.scale.width, nextHeight = scene.scale.height) => {
    if (!imageBackground || !background?.active) {
      return;
    }

    scene.tweens.killTweensOf(background);
    applyAmbientDrift(nextWidth, nextHeight);

    if (state.removeAmbientUpdate) {
      return;
    }

    const onAmbientUpdate = () => applyAmbientDrift();
    scene.events.on(globalThis.Phaser?.Scenes?.Events?.UPDATE ?? 'update', onAmbientUpdate);
    state.removeAmbientUpdate = () => {
      scene.events.off(globalThis.Phaser?.Scenes?.Events?.UPDATE ?? 'update', onAmbientUpdate);
    };
  };

  const createSweep = (nextWidth = scene.scale.width, nextHeight = scene.scale.height) => {
    if (!lightSweep) {
      return;
    }
    if (state.lightSweep) {
      scene.tweens.killTweensOf(state.lightSweep);
      state.lightSweep.destroy();
      state.lightSweep = null;
    }
    state.lightSweep = createMenuArenaLightSweep(scene, {
      width: nextWidth,
      height: nextHeight,
      ...lightSweepOptions,
    });
  };

  const resize = (nextWidth = scene.scale.width, nextHeight = scene.scale.height) => {
    if (imageBackground) {
      startAmbientDrift(nextWidth, nextHeight);
    } else if (background?.active) {
      background
        .setPosition(nextWidth * 0.5, nextHeight * 0.5)
        .setSize(nextWidth, nextHeight);
    }
    createSweep(nextWidth, nextHeight);
  };

  const cleanup = () => {
    if (state.removeAmbientUpdate) {
      state.removeAmbientUpdate();
      state.removeAmbientUpdate = null;
    }
    if (background) {
      scene.tweens.killTweensOf(background);
    }
    if (state.lightSweep) {
      scene.tweens.killTweensOf(state.lightSweep);
      state.lightSweep.destroy();
      state.lightSweep = null;
    }
  };

  const onScaleResize = (gameSize) => {
    resize(gameSize?.width ?? scene.scale.width, gameSize?.height ?? scene.scale.height);
  };

  const cleanupWithListeners = () => {
    scene.scale?.off?.('resize', onScaleResize);
    cleanup();
  };

  createSweep(width, height);
  startAmbientDrift(width, height);

  scene.scale?.on?.('resize', onScaleResize);
  scene.events.once(globalThis.Phaser?.Scenes?.Events?.SHUTDOWN ?? 'shutdown', cleanupWithListeners);

  return {
    background,
    get lightSweep() {
      return state.lightSweep;
    },
    resize,
    cleanup: cleanupWithListeners,
    isImage: imageBackground,
    ambient: imageBackground ? { ...driftOptions } : null,
  };
}

export function calculateMenuAmbientTransform({
  scene,
  width,
  height,
  baseScale,
  driftOptions = MENU_BACKGROUND_AMBIENT_DRIFT,
} = {}) {
  const { easedProgress, reversed } = calculateSharedYoyoPhase({
    scene,
    duration: driftOptions.duration,
    ease: driftOptions.ease,
    epochKey: MENU_BACKGROUND_MOTION_EPOCH_KEY,
  });
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const targetScale = baseScale * driftOptions.scaleMultiplier;

  return {
    x: interpolate(centerX, centerX + driftOptions.x, easedProgress),
    y: interpolate(centerY, centerY + driftOptions.y, easedProgress),
    scale: interpolate(baseScale, targetScale, easedProgress),
    progress: easedProgress,
    reversed,
  };
}

export function calculateSharedYoyoPhase({
  scene,
  duration = MENU_BACKGROUND_AMBIENT_DRIFT.duration,
  ease = MENU_BACKGROUND_AMBIENT_DRIFT.ease,
  epochKey = MENU_BACKGROUND_MOTION_EPOCH_KEY,
  now = getSceneClockTime(scene),
} = {}) {
  const safeDuration = Math.max(1, Number(duration) || MENU_BACKGROUND_AMBIENT_DRIFT.duration);
  const epoch = getOrCreateMotionEpoch(scene, epochKey, now);
  const elapsed = Math.max(0, now - epoch);
  const cycleDuration = safeDuration * 2;
  const cycleTime = elapsed % cycleDuration;
  const reversed = cycleTime >= safeDuration;
  const linearProgress = reversed
    ? 1 - ((cycleTime - safeDuration) / safeDuration)
    : cycleTime / safeDuration;

  return {
    elapsed,
    cycleTime,
    linearProgress,
    easedProgress: easeProgress(linearProgress, ease),
    reversed,
  };
}

function getOrCreateMotionEpoch(scene, key, now = getSceneClockTime(scene)) {
  const registry = scene?.game?.registry ?? scene?.registry;
  const existingEpoch = registry?.get?.(key) ?? scene?.game?.[key];
  if (Number.isFinite(existingEpoch)) {
    return existingEpoch;
  }

  if (registry?.set) {
    registry.set(key, now);
  } else if (scene?.game) {
    scene.game[key] = now;
  }
  return now;
}

function getSceneClockTime(scene) {
  return scene?.game?.loop?.time
    ?? scene?.time?.now
    ?? globalThis.performance?.now?.()
    ?? Date.now();
}

function easeProgress(progress, ease) {
  const clamped = PhaserMathClamp(progress, 0, 1);
  if (ease === 'Sine.easeInOut') {
    return -(Math.cos(Math.PI * clamped) - 1) / 2;
  }
  const easeFunction = globalThis.Phaser?.Tweens?.Builders?.GetEaseFunction?.(ease);
  return typeof easeFunction === 'function' ? easeFunction(clamped) : clamped;
}

function interpolate(start, end, progress) {
  return start + ((end - start) * progress);
}

function PhaserMathClamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function calculateDriftSafeCoverScale(background, width, height, driftOptions) {
  const horizontalPadding = Math.abs(driftOptions?.x ?? 0) * 2;
  const verticalPadding = Math.abs(driftOptions?.y ?? 0) * 2;
  return Math.max(
    (width + horizontalPadding) / background.width,
    (height + verticalPadding) / background.height,
  );
}

function isImageBackground(background) {
  return Boolean(background?.texture?.key && background?.setScale && background?.type !== 'Rectangle');
}
