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

const UTILITY_SURFACE_THEME = Object.freeze({
  baseFill: 0x07111f,
  hoverFill: 0x0d1d31,
  activeFill: 0x102a45,
  mutedFill: 0x0f2742,
  edgeStroke: 0x8fd7ff,
  idleStroke: 0x94a3b8,
  innerStroke: 0xf5f1e6,
  glow: 0x38bdf8,
  warmHighlight: 0xf5f1e6,
});

function setUtilityScale(targets, scale) {
  targets.forEach((target) => target?.setScale?.(scale));
}

function createUtilityButtonSurface(scene, x, y, size, { depth = 198, local = false } = {}) {
  const px = local ? 0 : x;
  const py = local ? 0 : y;
  const halo = scene.add.circle(px, py, size * 0.62, UTILITY_SURFACE_THEME.glow, 0.09)
    .setStrokeStyle(1, 0x7dd3fc, 0.2)
    .setDepth(depth);
  halo.setBlendMode?.('ADD');

  const shadow = scene.add.ellipse(px, py + size * 0.29, size * 0.78, size * 0.22, 0x020617, 0.38)
    .setDepth(depth + 0.2);
  const backing = scene.add.rectangle(px, py, size, size, UTILITY_SURFACE_THEME.baseFill, 0.76)
    .setStrokeStyle(1.5, UTILITY_SURFACE_THEME.idleStroke, 0.6)
    .setDepth(depth + 1);
  const innerEdge = scene.add.rectangle(px, py, size - 7, size - 7, 0x020617, 0)
    .setStrokeStyle(1, UTILITY_SURFACE_THEME.innerStroke, 0.12)
    .setDepth(depth + 1.1);
  const topHighlight = scene.add.rectangle(px, py - size * 0.35, size * 0.64, Math.max(1, size * 0.025), UTILITY_SURFACE_THEME.warmHighlight, 0.22)
    .setDepth(depth + 1.2);
  const centerGlow = scene.add.ellipse(px, py - size * 0.05, size * 0.62, size * 0.34, UTILITY_SURFACE_THEME.glow, 0.04)
    .setDepth(depth + 1.3);
  centerGlow.setBlendMode?.('ADD');

  return { halo, shadow, backing, innerEdge, topHighlight, centerGlow };
}

function setUtilitySurfaceState(surface, {
  hovering = false,
  pressed = false,
  active = false,
  scale = 1,
} = {}) {
  const fillColor = active
    ? UTILITY_SURFACE_THEME.mutedFill
    : (hovering ? UTILITY_SURFACE_THEME.hoverFill : UTILITY_SURFACE_THEME.baseFill);
  const fillAlpha = active ? 0.84 : (hovering ? 0.82 : 0.76);
  const strokeColor = active || hovering ? UTILITY_SURFACE_THEME.edgeStroke : UTILITY_SURFACE_THEME.idleStroke;
  const strokeAlpha = active ? 0.9 : (hovering ? 0.78 : 0.6);
  const glowAlpha = active ? 0.18 : (hovering ? 0.14 : 0.09);
  const centerGlowAlpha = active ? 0.1 : (hovering ? 0.08 : 0.04);
  const highlightAlpha = active ? 0.28 : (hovering ? 0.3 : 0.22);
  const resolvedScale = pressed ? 0.985 : scale;

  surface.backing?.setFillStyle?.(fillColor, pressed ? Math.max(0.72, fillAlpha - 0.08) : fillAlpha);
  surface.backing?.setStrokeStyle?.(1.5, strokeColor, pressed ? Math.max(0.64, strokeAlpha - 0.08) : strokeAlpha);
  surface.innerEdge?.setStrokeStyle?.(1, UTILITY_SURFACE_THEME.innerStroke, hovering || active ? 0.2 : 0.12);
  surface.halo?.setFillStyle?.(UTILITY_SURFACE_THEME.glow, glowAlpha);
  surface.halo?.setStrokeStyle?.(1, 0x7dd3fc, active ? 0.34 : (hovering ? 0.28 : 0.2));
  surface.centerGlow?.setAlpha?.(pressed ? Math.max(0.03, centerGlowAlpha - 0.03) : centerGlowAlpha);
  surface.topHighlight?.setAlpha?.(pressed ? Math.max(0.14, highlightAlpha - 0.1) : highlightAlpha);
  setUtilityScale([surface.halo, surface.shadow, surface.backing, surface.innerEdge, surface.topHighlight, surface.centerGlow], resolvedScale);
}

export function createFloatingControl(scene, x, y, size, label, onPointerUp, { fontScale = 0.5 } = {}) {
  const surface = createUtilityButtonSurface(scene, x, y, size);
  const text = scene.add.text(x, y, label, {
    fontFamily: 'Segoe UI, Arial, sans-serif',
    fontSize: `${Math.max(16, Math.floor(size * fontScale))}px`,
    color: '#f8fafc',
    fontStyle: 'bold',
    align: 'center',
  }).setOrigin(0.5).setDepth(200)
    .setShadow(0, 1, 'rgba(3, 17, 40, 0.72)', 2, true, true);

  const setState = (state = {}) => {
    setUtilitySurfaceState(surface, state);
    text.setAlpha(state.pressed ? 0.9 : 1);
    text.setColor(state.hovering ? '#ffffff' : '#f8fafc');
    text.setShadow(0, 1, state.hovering ? 'rgba(245, 241, 230, 0.18)' : 'rgba(3, 17, 40, 0.72)', state.hovering ? 3 : 2, true, true);
    text.setScale(state.pressed ? 0.985 : 1);
  };

  if (onPointerUp) {
    surface.backing.setInteractive({ useHandCursor: true });
    text.setInteractive({ useHandCursor: true });
    [surface.backing, text].forEach((target) => {
      target.on('pointerover', () => setState({ hovering: true }));
      target.on('pointerout', () => setState());
      target.on('pointerdown', () => setState({ hovering: true, pressed: true }));
      target.on('pointerup', (...args) => {
        setState({ hovering: true });
        onPointerUp(...args);
      });
    });
  }

  return {
    halo: surface.halo,
    shadow: surface.shadow,
    backing: surface.backing,
    innerEdge: surface.innerEdge,
    topHighlight: surface.topHighlight,
    centerGlow: surface.centerGlow,
    text,
    items: [surface.halo, surface.shadow, surface.backing, surface.innerEdge, surface.topHighlight, surface.centerGlow, text],
  };
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
  const surface = createUtilityButtonSurface(scene, 0, 0, size, { depth: 0, local: true });
  const icon = scene.add.graphics().setDepth(2);
  let hovering = false;
  let pressed = false;

  button.add([surface.halo, surface.shadow, surface.backing, surface.innerEdge, surface.topHighlight, surface.centerGlow, icon]);
  button.setSize(size, size);
  button.setInteractive({ useHandCursor: true });

  const refreshButton = (settings = loadSettings()) => {
    const isMuted = settings.muted;
    setUtilitySurfaceState(surface, { hovering, pressed, active: isMuted });
    icon.setAlpha(pressed ? 0.9 : 1);
    icon.setScale(pressed ? 0.985 : 1);
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
    pressed = false;
    refreshButton();
  });
  button.on('pointerdown', () => {
    pressed = true;
    refreshButton();
  });
  button.on('pointerup', () => {
    pressed = false;
    const settings = toggleMuted(scene);
    refreshButton(settings);
    onToggle?.(settings);
  });

  refreshButton();
  const destroy = () => {
    scene.game?.events?.off?.(SETTINGS_CHANGED_EVENT, handleSettingsChanged);
    button.destroy();
  };
  return {
    halo: surface.halo,
    shadow: surface.shadow,
    backing: surface.backing,
    innerEdge: surface.innerEdge,
    topHighlight: surface.topHighlight,
    centerGlow: surface.centerGlow,
    icon,
    button,
    text: icon,
    items: [button],
    destroy,
  };
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
