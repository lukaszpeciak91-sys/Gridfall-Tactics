import { SETTINGS_CHANGED_EVENT, loadSettings, toggleMuted } from '../systems/settingsState.js';

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

export function drawSpeakerIcon(icon, size, isMuted) {
  const iconColor = isMuted ? 0xbfdbfe : 0xf8fafc;
  const slashColor = 0xf87171;
  const unit = size / 44;

  icon.clear();
  icon.fillStyle(iconColor, 1);
  icon.lineStyle(2.4 * unit, iconColor, 1);
  icon.beginPath();
  icon.moveTo(-13 * unit, -6 * unit);
  icon.lineTo(-7 * unit, -6 * unit);
  icon.lineTo(1 * unit, -13 * unit);
  icon.lineTo(1 * unit, 13 * unit);
  icon.lineTo(-7 * unit, 6 * unit);
  icon.lineTo(-13 * unit, 6 * unit);
  icon.closePath();
  icon.fillPath();

  if (isMuted) {
    icon.lineStyle(2.8 * unit, slashColor, 1);
    icon.beginPath();
    icon.moveTo(8 * unit, -10 * unit);
    icon.lineTo(17 * unit, 10 * unit);
    icon.strokePath();
    icon.beginPath();
    icon.moveTo(17 * unit, -10 * unit);
    icon.lineTo(8 * unit, 10 * unit);
    icon.strokePath();
    return;
  }

  icon.beginPath();
  icon.arc(6 * unit, 0, 7 * unit, -0.82, 0.82);
  icon.strokePath();
  icon.beginPath();
  icon.arc(6 * unit, 0, 12 * unit, -0.62, 0.62);
  icon.strokePath();
}

export function createMuteToggleControl(scene, x, y, size, { onToggle = null, depth = 198 } = {}) {
  const button = scene.add.container(x, y).setDepth(depth);
  const halo = scene.add.circle(0, 0, size * 0.58, 0x38bdf8, 0.08).setStrokeStyle(1, 0x7dd3fc, 0.18);
  const backing = scene.add.rectangle(0, 0, size, size, 0x020617, 0.66).setStrokeStyle(1, 0x94a3b8, 0.58);
  const icon = scene.add.graphics();
  let hovering = false;

  button.add([halo, backing, icon]);
  button.setSize(size, size);
  button.setInteractive({ useHandCursor: true });

  const refreshButton = (settings = loadSettings()) => {
    const isMuted = settings.muted;
    backing.setFillStyle(isMuted ? 0x0f2742 : (hovering ? 0x0f172a : 0x020617), isMuted ? 0.82 : (hovering ? 0.72 : 0.66));
    backing.setStrokeStyle(1, isMuted || hovering ? 0x7dd3fc : 0x94a3b8, isMuted ? 0.95 : (hovering ? 0.82 : 0.58));
    halo.setFillStyle(isMuted ? 0x60a5fa : 0x38bdf8, isMuted ? 0.2 : (hovering ? 0.18 : 0.08));
    halo.setStrokeStyle(1, 0x7dd3fc, isMuted ? 0.38 : (hovering ? 0.3 : 0.18));
    drawSpeakerIcon(icon, size, isMuted);
  };

  const handleSettingsChanged = (settings) => refreshButton(settings);
  scene.game?.events?.on?.(SETTINGS_CHANGED_EVENT, handleSettingsChanged);
  scene.events?.once?.('shutdown', () => {
    scene.game?.events?.off?.(SETTINGS_CHANGED_EVENT, handleSettingsChanged);
  });

  button.on('pointerover', () => {
    hovering = true;
    refreshButton();
  });
  button.on('pointerout', () => {
    hovering = false;
    refreshButton();
  });
  button.on('pointerup', () => {
    const settings = toggleMuted(scene);
    refreshButton(settings);
    onToggle?.(settings);
  });

  refreshButton();
  const destroy = () => {
    scene.game?.events?.off?.(SETTINGS_CHANGED_EVENT, handleSettingsChanged);
    button.destroy();
  };
  return { halo, backing, icon, button, text: icon, destroy };
}

export function createBottomNavigationControls(scene, {
  onBack,
  onMute,
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
    back: onBack ? createFloatingControl(scene, backX, metrics.centerY, metrics.touchSize, '←', onBack) : null,
    mute: onMute ? createMuteToggleControl(scene, backX, metrics.centerY, metrics.touchSize, { onToggle: onMute }) : null,
    rules: middleAction ? createFloatingControl(scene, metrics.width * 0.5, metrics.centerY, metrics.touchSize, '?', middleAction, { fontScale: 0.52 }) : null,
    menu: null,
    fullscreen: onFullscreen ? createFloatingControl(scene, fullscreenX, metrics.centerY, metrics.touchSize, '⛶', onFullscreen) : null,
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
