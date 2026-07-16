import { AUDIO_KEYS } from '../audio/audioAssets.js';
import { playSfx } from '../audio/audioPlayback.js';
import { SETTINGS_CHANGED_EVENT, loadSettings, toggleMuted } from '../systems/settingsState.js';

const PREMIUM_GOLD_ACCENT = 0xfacc15;
const BOTTOM_CONTROL_CORNER_RADIUS_RATIO = 0.16;
export const NAVIGATION_ICON_TYPES = Object.freeze({
  BACK: 'back',
  HELP: 'help',
  FULLSCREEN: 'fullscreen',
});
export const NAVIGATION_ICON_COLOR = 0xf8fafc;


function getBottomControlCornerRadius(size) {
  return Math.max(6, Math.round(size * BOTTOM_CONTROL_CORNER_RADIUS_RATIO));
}

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

function resolveNavigationIconType(label) {
  if (label === '←' || label === NAVIGATION_ICON_TYPES.BACK) return NAVIGATION_ICON_TYPES.BACK;
  if (label === '?' || label === NAVIGATION_ICON_TYPES.HELP) return NAVIGATION_ICON_TYPES.HELP;
  if (label === '⛶' || label === NAVIGATION_ICON_TYPES.FULLSCREEN) return NAVIGATION_ICON_TYPES.FULLSCREEN;
  return null;
}

export function getNavigationIconGeometry(size, iconType) {
  const unit = size / 44;
  const strokeWidth = Math.max(3, size * 0.076);

  if (iconType === NAVIGATION_ICON_TYPES.BACK) {
    return {
      unit,
      strokeWidth,
      shaft: { x1: 11 * unit, y1: 0, x2: -9 * unit, y2: 0 },
      head: [
        { x1: -8 * unit, y1: 0, x2: 3 * unit, y2: -11 * unit },
        { x1: -8 * unit, y1: 0, x2: 3 * unit, y2: 11 * unit },
      ],
      bounds: { left: -9 * unit, right: 11 * unit, top: -11 * unit, bottom: 11 * unit },
    };
  }

  if (iconType === NAVIGATION_ICON_TYPES.HELP) {
    return {
      unit,
      strokeWidth,
      hook: {
        start: { x: -7.8 * unit, y: -8.7 * unit },
        upper: { cx: -3.8 * unit, cy: -14.2 * unit, x: 3.6 * unit, y: -12 * unit },
        shoulder: { cx: 10.1 * unit, cy: -10 * unit, x: 8.4 * unit, y: -4.1 * unit },
        turn: { cx: 7.5 * unit, cy: -0.8 * unit, x: 3.3 * unit, y: 1.8 * unit },
      },
      stem: { x1: 3.3 * unit, y1: 1.8 * unit, x2: 0.2 * unit, y2: 4.3 * unit },
      dot: { x: 0, y: 13 * unit, radius: Math.max(2.25 * unit, strokeWidth * 0.54) },
      bounds: { left: -8 * unit, right: 9.4 * unit, top: -13.4 * unit, bottom: 15.5 * unit },
    };
  }

  if (iconType === NAVIGATION_ICON_TYPES.FULLSCREEN) {
    const inset = 12 * unit;
    const corner = 8 * unit;
    return {
      unit,
      strokeWidth,
      corners: [
        [[-inset, -inset + corner], [-inset, -inset], [-inset + corner, -inset]],
        [[inset - corner, -inset], [inset, -inset], [inset, -inset + corner]],
        [[inset, inset - corner], [inset, inset], [inset - corner, inset]],
        [[-inset + corner, inset], [-inset, inset], [-inset, inset - corner]],
      ],
      bounds: { left: -inset, right: inset, top: -inset, bottom: inset },
    };
  }

  return null;
}

export function drawNavigationIcon(icon, size, iconType, color = NAVIGATION_ICON_COLOR) {
  const geometry = getNavigationIconGeometry(size, iconType);
  if (!geometry) return false;

  icon.clear();
  icon.lineStyle(geometry.strokeWidth, color, 1);
  if (icon.lineCap) icon.lineCap = 'round';
  if (icon.lineJoin) icon.lineJoin = 'round';

  if (iconType === NAVIGATION_ICON_TYPES.BACK) {
    icon.beginPath();
    icon.moveTo(geometry.shaft.x1, geometry.shaft.y1);
    icon.lineTo(geometry.shaft.x2, geometry.shaft.y2);
    geometry.head.forEach((segment) => {
      icon.moveTo(segment.x1, segment.y1);
      icon.lineTo(segment.x2, segment.y2);
    });
    icon.strokePath();
    return true;
  }

  if (iconType === NAVIGATION_ICON_TYPES.HELP) {
    icon.beginPath();
    icon.moveTo(geometry.hook.start.x, geometry.hook.start.y);
    icon.quadraticCurveTo(geometry.hook.upper.cx, geometry.hook.upper.cy, geometry.hook.upper.x, geometry.hook.upper.y);
    icon.quadraticCurveTo(geometry.hook.shoulder.cx, geometry.hook.shoulder.cy, geometry.hook.shoulder.x, geometry.hook.shoulder.y);
    icon.quadraticCurveTo(geometry.hook.turn.cx, geometry.hook.turn.cy, geometry.hook.turn.x, geometry.hook.turn.y);
    icon.lineTo(geometry.stem.x2, geometry.stem.y2);
    icon.strokePath();
    icon.fillStyle(color, 1);
    icon.fillCircle(geometry.dot.x, geometry.dot.y, geometry.dot.radius);
    return true;
  }

  if (iconType === NAVIGATION_ICON_TYPES.FULLSCREEN) {
    geometry.corners.forEach((corner) => {
      icon.beginPath();
      icon.moveTo(corner[0][0], corner[0][1]);
      icon.lineTo(corner[1][0], corner[1][1]);
      icon.lineTo(corner[2][0], corner[2][1]);
      icon.strokePath();
    });
    return true;
  }

  return false;
}

export function createFloatingControl(scene, x, y, size, label, onPointerUp, { fontScale = 0.5 } = {}) {
  const halo = scene.add.circle(x, y, size * 0.55, 0x38bdf8, 0.08)
    .setStrokeStyle(1, 0x7dd3fc, 0.18)
    .setDepth(198);
  const backing = scene.add.rectangle(x, y, size, size, 0x020617, 0.62)
    .setRounded(getBottomControlCornerRadius(size))
    .setStrokeStyle(1, PREMIUM_GOLD_ACCENT, 0.58)
    .setDepth(199);
  const iconType = resolveNavigationIconType(label);
  const icon = scene.add.graphics().setPosition(x, y).setDepth(200);
  drawNavigationIcon(icon, size, iconType);

  if (!iconType) {
    icon.destroy?.();
    throw new Error(`Unsupported floating navigation icon: ${label}`);
  }

  if (onPointerUp) {
    backing.setInteractive({ useHandCursor: true });
    backing.on('pointerover', () => {
      backing.setFillStyle(0x0f172a, 0.72);
      backing.setStrokeStyle(1, PREMIUM_GOLD_ACCENT, 0.82);
      halo.setAlpha(0.18);
    });
    backing.on('pointerout', () => {
      backing.setFillStyle(0x020617, 0.62);
      backing.setStrokeStyle(1, PREMIUM_GOLD_ACCENT, 0.58);
      halo.setAlpha(1);
    });
    const handlePointerUp = (...args) => {
      playSfx(scene, AUDIO_KEYS.UI_CLICK);
      onPointerUp(...args);
    };
    backing.on('pointerup', handlePointerUp);
  }

  return { halo, backing, icon, text: icon, iconType };
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
  const backing = scene.add.rectangle(0, 0, size, size, 0x020617, 0.66)
    .setRounded(getBottomControlCornerRadius(size))
    .setStrokeStyle(1, PREMIUM_GOLD_ACCENT, 0.58);
  const icon = scene.add.graphics();
  let hovering = false;

  button.add([halo, backing, icon]);
  button.setSize(size, size);
  button.setInteractive({ useHandCursor: true });

  const refreshButton = (settings = loadSettings()) => {
    const isMuted = settings.muted;
    backing.setFillStyle(isMuted ? 0x0f2742 : (hovering ? 0x0f172a : 0x020617), isMuted ? 0.82 : (hovering ? 0.72 : 0.66));
    backing.setStrokeStyle(1, PREMIUM_GOLD_ACCENT, isMuted ? 0.95 : (hovering ? 0.82 : 0.58));
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
    playSfx(scene, AUDIO_KEYS.UI_CLICK);
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
    back: onBack ? createFloatingControl(scene, backX, metrics.centerY, metrics.touchSize, NAVIGATION_ICON_TYPES.BACK, onBack) : null,
    mute: onMute ? createMuteToggleControl(scene, backX, metrics.centerY, metrics.touchSize, { onToggle: onMute }) : null,
    rules: middleAction ? createFloatingControl(scene, metrics.width * 0.5, metrics.centerY, metrics.touchSize, NAVIGATION_ICON_TYPES.HELP, middleAction) : null,
    menu: null,
    fullscreen: onFullscreen ? createFloatingControl(scene, fullscreenX, metrics.centerY, metrics.touchSize, NAVIGATION_ICON_TYPES.FULLSCREEN, onFullscreen) : null,
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
