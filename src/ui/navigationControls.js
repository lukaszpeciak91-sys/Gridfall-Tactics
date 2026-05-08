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
    color: '#f8fafc',
    fontStyle: 'bold',
    align: 'center',
  }).setOrigin(0.5).setDepth(200);

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
  onMenu,
  onFullscreen,
  deckLabel = null,
  centerY = null,
  touchSize = null,
  margin = null,
} = {}) {
  const metrics = getBottomNavigationMetrics(scene, { centerY, touchSize, margin });
  const fullscreenX = metrics.width - metrics.margin - metrics.touchSize / 2;
  const deckX = fullscreenX - metrics.touchSize - metrics.controlGap;
  const backX = metrics.margin + metrics.touchSize / 2;

  const controls = {
    back: createFloatingControl(scene, backX, metrics.centerY, metrics.touchSize, '←', onBack),
    menu: createFloatingControl(scene, metrics.width * 0.5, metrics.centerY, metrics.touchSize, '≡', onMenu, { fontScale: 0.46 }),
    fullscreen: createFloatingControl(scene, fullscreenX, metrics.centerY, metrics.touchSize, '⛶', onFullscreen),
    deck: null,
    metrics,
  };

  if (deckLabel !== null && deckLabel !== undefined) {
    controls.deck = createFloatingControl(scene, deckX, metrics.centerY, metrics.touchSize, deckLabel, null, { fontScale: 0.36 });
  }

  return controls;
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
