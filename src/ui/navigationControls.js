export function getBottomNavigationMetrics(scene, { centerY = null, touchSize = null, margin = null } = {}) {
  const width = scene.scale.gameSize?.width ?? scene.scale.width;
  const height = scene.scale.gameSize?.height ?? scene.scale.height;
  const resolvedMargin = margin ?? Math.max(8, Math.round(width * 0.025));
  const resolvedTouchSize = touchSize ?? Math.max(48, Math.min(58, height * 0.066));
  const resolvedCenterY = centerY ?? (height - resolvedMargin - resolvedTouchSize / 2);

  return {
    width,
    height,
    margin: resolvedMargin,
    touchSize: resolvedTouchSize,
    centerY: resolvedCenterY,
    controlGap: Math.max(8, Math.floor(resolvedTouchSize * 0.18)),
  };
}

export function createFloatingControl(scene, x, y, size, label, onPointerUp, { fontScale = 0.5 } = {}) {
  const halo = scene.add.circle(x, y, size * 0.55, 0x38bdf8, 0.08)
    .setStrokeStyle(1, 0x7dd3fc, 0.18)
    .setDepth(198);
  const backing = scene.add.rectangle(x, y, size, size, 0x020617, 0.62)
    .setStrokeStyle(1, 0x94a3b8, 0.58)
    .setDepth(199);
  const text = scene.add.text(x, y, label, {
    fontFamily: 'Arial, sans-serif',
    fontSize: `${Math.max(16, Math.floor(size * fontScale))}px`,
    color: '#f5f1e6',
    fontStyle: 'bold',
    align: 'center',
  }).setOrigin(0.5).setDepth(200)
    .setShadow(0, 1, 'rgba(3, 17, 40, 0.62)', 1, true, true);

  if (onPointerUp) {
    backing.setInteractive({ useHandCursor: true });
    text.setInteractive({ useHandCursor: true });
    backing.on('pointerover', () => {
      backing.setFillStyle(0x0f172a, 0.72);
      backing.setStrokeStyle(1, 0x7dd3fc, 0.82);
      halo.setAlpha(0.18);
    });
    backing.on('pointerout', () => {
      backing.setFillStyle(0x020617, 0.62);
      backing.setStrokeStyle(1, 0x94a3b8, 0.58);
      halo.setAlpha(1);
    });
    backing.on('pointerup', onPointerUp);
    text.on('pointerup', onPointerUp);
  }

  return { halo, backing, text };
}

export function createBottomNavigationControls(scene, {
  onBack,
  onRules,
  onMenu,
  onFullscreen,
  centerY = null,
  touchSize = null,
  margin = null,
} = {}) {
  const metrics = getBottomNavigationMetrics(scene, { centerY, touchSize, margin });
  const fullscreenX = metrics.width - metrics.margin - metrics.touchSize / 2;
  const backX = metrics.margin + metrics.touchSize / 2;

  const middleAction = onRules ?? onMenu;

  const controls = {
    back: createFloatingControl(scene, backX, metrics.centerY, metrics.touchSize, '←', onBack),
    rules: createFloatingControl(scene, metrics.width * 0.5, metrics.centerY, metrics.touchSize, '?', middleAction, { fontScale: 0.52 }),
    menu: null,
    fullscreen: createFloatingControl(scene, fullscreenX, metrics.centerY, metrics.touchSize, '⛶', onFullscreen),
    metrics,
  };

  controls.menu = controls.rules;
  return controls;
}

export function requestPortraitOrientationLock() {
  const orientation = globalThis.screen?.orientation;

  if (orientation?.lock) {
    try {
      return Promise.resolve(orientation.lock('portrait')).catch((error) => {
        console.debug('Portrait orientation lock unavailable or rejected.', error);
        return false;
      });
    } catch (error) {
      console.debug('Portrait orientation lock unavailable or rejected.', error);
      return Promise.resolve(false);
    }
  }

  const legacyLock = globalThis.screen?.lockOrientation
    ?? globalThis.screen?.mozLockOrientation
    ?? globalThis.screen?.msLockOrientation;

  if (legacyLock) {
    try {
      return Promise.resolve(Boolean(legacyLock.call(globalThis.screen, 'portrait')));
    } catch (error) {
      console.debug('Legacy portrait orientation lock unavailable or rejected.', error);
      return Promise.resolve(false);
    }
  }

  return Promise.resolve(false);
}

export function toggleSceneFullscreen(scene) {
  if (!scene.scale.fullscreen.available) {
    return;
  }

  if (scene.scale.isFullscreen) {
    scene.scale.stopFullscreen();
    return;
  }

  scene.scale.startFullscreen();
}
