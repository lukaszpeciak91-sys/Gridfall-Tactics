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

export const MIN_UTILITY_TAP_TARGET_SIZE = 48;

const UTILITY_SURFACE_THEME = Object.freeze({
  baseFill: 0x07111f,
  hoverFill: 0x0b1b2d,
  activeFill: 0x0f2742,
  mutedFill: 0x102a45,
  goldStroke: 0xd6b56d,
  hoverGoldStroke: 0xf2d38a,
  glow: 0x38bdf8,
  shadow: 0x020617,
});

function drawGlassUtilityTile(surface, {
  size,
  hovering = false,
  pressed = false,
  active = false,
} = {}) {
  const cornerRadius = Math.round(Phaser.Math.Clamp(size * 0.28, 14, 16));
  const fillColor = active
    ? UTILITY_SURFACE_THEME.mutedFill
    : (hovering ? UTILITY_SURFACE_THEME.hoverFill : UTILITY_SURFACE_THEME.baseFill);
  const fillAlpha = active ? 0.84 : (hovering ? 0.8 : 0.72);
  const strokeColor = hovering || active ? UTILITY_SURFACE_THEME.hoverGoldStroke : UTILITY_SURFACE_THEME.goldStroke;
  const strokeAlpha = active ? 0.78 : (hovering ? 0.72 : 0.58);
  const glowAlpha = active ? 0.13 : (hovering ? 0.11 : 0.07);
  const half = size * 0.5;
  const inset = pressed ? 1.2 : 0;
  const tileX = -half + inset;
  const tileY = -half + inset;
  const tileSize = size - inset * 2;

  surface.clear();

  // A single rounded glass tile: soft contact shadow, faint cyan broadcast glow,
  // translucent navy fill, and one thin gold edge. No inner icon circles/rings.
  surface.fillStyle(UTILITY_SURFACE_THEME.shadow, pressed ? 0.26 : 0.34);
  surface.fillRoundedRect(-half + 1.5, -half + 3.5, size, size, cornerRadius);

  surface.lineStyle(5, UTILITY_SURFACE_THEME.glow, glowAlpha * 0.18);
  surface.strokeRoundedRect(tileX - 2, tileY - 2, tileSize + 4, tileSize + 4, cornerRadius + 2);
  surface.lineStyle(2, UTILITY_SURFACE_THEME.glow, glowAlpha);
  surface.strokeRoundedRect(tileX - 0.75, tileY - 0.75, tileSize + 1.5, tileSize + 1.5, cornerRadius + 1);

  surface.fillStyle(fillColor, pressed ? Math.max(0.64, fillAlpha - 0.08) : fillAlpha);
  surface.fillRoundedRect(tileX, tileY, tileSize, tileSize, cornerRadius);

  surface.lineStyle(1.35, strokeColor, pressed ? Math.max(0.48, strokeAlpha - 0.1) : strokeAlpha);
  surface.strokeRoundedRect(tileX + 0.75, tileY + 0.75, tileSize - 1.5, tileSize - 1.5, Math.max(1, cornerRadius - 1));
}

function createUtilityButtonSurface(scene, size) {
  const backing = scene.add.graphics();
  drawGlassUtilityTile(backing, { size });
  return { backing, size };
}

function setUtilitySurfaceState(surface, {
  hovering = false,
  pressed = false,
  active = false,
} = {}) {
  drawGlassUtilityTile(surface.backing, {
    size: surface.size,
    hovering,
    pressed,
    active,
  });
}

function getUtilityTapTargetSize(size, minTapTargetSize = MIN_UTILITY_TAP_TARGET_SIZE) {
  return Math.max(size, minTapTargetSize);
}

function createUtilityHitArea(size, minTapTargetSize = MIN_UTILITY_TAP_TARGET_SIZE) {
  const tapTargetSize = getUtilityTapTargetSize(size, minTapTargetSize);
  return new Phaser.Geom.Rectangle(-tapTargetSize / 2, -tapTargetSize / 2, tapTargetSize, tapTargetSize);
}


const UTILITY_DEBUG_OVERLAY_DEPTH = 10000;
const UTILITY_DEBUG_TEXT_STYLE = Object.freeze({
  fontFamily: 'Courier New, monospace',
  fontSize: '10px',
  color: '#ffffff',
  backgroundColor: 'rgba(127, 29, 29, 0.78)',
  padding: { x: 3, y: 2 },
  lineSpacing: 1,
});

function getUtilityControlDebugName(control) {
  return control?.debug?.name ?? control?.button?.name ?? 'Utility';
}

function describeInteractiveObject(object) {
  if (!object) return 'unknown';
  const name = object.name ? `${object.name} ` : '';
  return `${name}${object.type ?? object.constructor?.name ?? 'GameObject'}`.trim();
}

function describeCurrentlyOver(pointer) {
  const currentlyOver = Array.isArray(pointer?.currentlyOver) ? pointer.currentlyOver : [];
  if (!currentlyOver.length) return 'none';
  return currentlyOver.map(describeInteractiveObject).join(', ');
}

function getPointerLocalPosition(object, pointer) {
  if (!object?.getWorldTransformMatrix || !pointer) {
    return { x: pointer?.x ?? 0, y: pointer?.y ?? 0 };
  }

  const matrix = object.getWorldTransformMatrix();
  const local = new Phaser.Math.Vector2();
  matrix.applyInverse(pointer.x, pointer.y, local);
  return local;
}

function isPointerInsideInteractiveHitArea(object, pointer) {
  const hitArea = object?.input?.hitArea;
  const hitAreaCallback = object?.input?.hitAreaCallback;
  if (!hitArea || !hitAreaCallback || !pointer) return false;

  const local = getPointerLocalPosition(object, pointer);
  return Boolean(hitAreaCallback(hitArea, local.x, local.y, object));
}

function getRectWorldBounds(object, rect) {
  if (!object || !rect) return null;

  if (!object.getWorldTransformMatrix) {
    return new Phaser.Geom.Rectangle(
      (object.x ?? 0) + rect.x,
      (object.y ?? 0) + rect.y,
      rect.width,
      rect.height,
    );
  }

  const matrix = object.getWorldTransformMatrix();
  const points = [
    new Phaser.Math.Vector2(rect.x, rect.y),
    new Phaser.Math.Vector2(rect.x + rect.width, rect.y),
    new Phaser.Math.Vector2(rect.x + rect.width, rect.y + rect.height),
    new Phaser.Math.Vector2(rect.x, rect.y + rect.height),
  ].map((point) => matrix.transformPoint(point.x, point.y, point));

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return new Phaser.Geom.Rectangle(minX, minY, maxX - minX, maxY - minY);
}

function getUtilityVisualBounds(control) {
  const button = control?.button;
  const visualSize = control?.debug?.visualSize ?? control?.debug?.size;
  if (!button || !Number.isFinite(visualSize)) return null;

  return getRectWorldBounds(button, new Phaser.Geom.Rectangle(
    -visualSize / 2,
    -visualSize / 2,
    visualSize,
    visualSize,
  ));
}

function getUtilityHitBounds(control) {
  const button = control?.button;
  const hitArea = button?.input?.hitArea;
  if (!button || !hitArea) return null;
  return getRectWorldBounds(button, hitArea);
}

function getRectCenter(rect) {
  return {
    x: Math.round(rect.x + rect.width / 2),
    y: Math.round(rect.y + rect.height / 2),
  };
}

function formatRectSize(rect) {
  return `${Math.round(rect.width)}×${Math.round(rect.height)}`;
}

function setUtilityControlDebugMetadata(control, { name, visualSize, hitSize } = {}) {
  if (!control?.button) return control;

  control.debug = {
    ...(control.debug ?? {}),
    name,
    visualSize,
    hitSize,
  };
  control.button.setName?.(`utility:${name}`);
  control.backing?.setName?.(`utility:${name}:visual`);
  control.text?.setName?.(`utility:${name}:icon`);
  return control;
}

function attachUtilityDebugLogging(scene, control) {
  const button = control?.button;
  if (!button || button.getData?.('utilityDebugLoggingAttached')) return;

  button.setData?.('utilityDebugLoggingAttached', true);
  const logPointerEvent = (phase, pointer) => {
    const name = getUtilityControlDebugName(control);
    const hitBounds = getUtilityHitBounds(control);
    const insideHitbox = isPointerInsideInteractiveHitArea(button, pointer);
    const hitCenter = hitBounds ? getRectCenter(hitBounds) : null;
    console.info('[UtilityHitboxDebug]', {
      scene: scene.scene?.key ?? scene.constructor?.name,
      control: name,
      phase,
      pointer: {
        x: Math.round(pointer?.x ?? 0),
        y: Math.round(pointer?.y ?? 0),
        id: pointer?.id,
      },
      insideExpectedHitbox: insideHitbox,
      expectedHitbox: hitBounds ? {
        x: Math.round(hitBounds.x),
        y: Math.round(hitBounds.y),
        width: Math.round(hitBounds.width),
        height: Math.round(hitBounds.height),
        center: hitCenter,
      } : null,
      handledBy: describeInteractiveObject(button),
      currentlyOver: describeCurrentlyOver(pointer),
    });
  };

  button.on('pointerdown', (pointer) => logPointerEvent('pointerdown', pointer));
  button.on('pointerup', (pointer) => logPointerEvent('pointerup', pointer));
}

function drawUtilityDebugOverlay(scene, controls, overlay) {
  const graphics = overlay?.graphics;
  if (!graphics) return;

  graphics.clear();
  overlay.labels?.forEach((label) => label.destroy());
  overlay.labels = [];

  const debugControls = Object.entries(controls)
    .filter(([key, control]) => !['metrics', 'menu'].includes(key) && control?.button?.active);

  debugControls.forEach(([key, control], index) => {
    const name = control.debug?.name ?? key;
    const visualBounds = getUtilityVisualBounds(control);
    const hitBounds = getUtilityHitBounds(control);
    if (!visualBounds && !hitBounds) return;

    if (hitBounds) {
      graphics.lineStyle(3, 0xff1f1f, 1);
      graphics.strokeRect(hitBounds.x, hitBounds.y, hitBounds.width, hitBounds.height);
    }

    if (visualBounds) {
      graphics.lineStyle(2, 0x00ffea, 1);
      graphics.strokeRect(visualBounds.x, visualBounds.y, visualBounds.width, visualBounds.height);
    }

    const visualCenter = visualBounds ? getRectCenter(visualBounds) : null;
    const hitCenter = hitBounds ? getRectCenter(hitBounds) : null;
    const labelText = [
      name,
      `visual: ${visualBounds ? `${formatRectSize(visualBounds)} @ (${visualCenter.x}, ${visualCenter.y})` : 'n/a'}`,
      `hit: ${hitBounds ? `${formatRectSize(hitBounds)} @ (${hitCenter.x}, ${hitCenter.y})` : 'n/a'}`,
      `depth: ${control.button.depth ?? 'n/a'}`,
    ].join('\n');

    const labelX = Math.max(4, Math.min(scene.scale.width - 118, (hitCenter?.x ?? visualCenter?.x ?? 0) - 58));
    const labelY = Math.max(4, Math.min(scene.scale.height - 52, (hitBounds?.y ?? visualBounds?.y ?? 0) - 58 - (index % 2) * 4));
    const label = scene.add.text(labelX, labelY, labelText, UTILITY_DEBUG_TEXT_STYLE)
      .setDepth(UTILITY_DEBUG_OVERLAY_DEPTH + 1)
      .setScrollFactor(0);
    overlay.labels.push(label);
  });
}

function attachNearbyUtilityTapLogging(scene, controls, overlay) {
  if (overlay.nearbyLoggingAttached) return;
  overlay.nearbyLoggingAttached = true;

  const logNearbyTap = (phase, pointer) => {
    const activeBounds = Object.entries(controls)
      .filter(([key, control]) => !['metrics', 'menu'].includes(key) && control?.button?.active)
      .map(([key, control]) => ({ name: control.debug?.name ?? key, bounds: getUtilityHitBounds(control) }))
      .filter(({ bounds }) => bounds);

    const nearAnyUtility = activeBounds.some(({ bounds }) => Phaser.Geom.Rectangle.Contains(
      Phaser.Geom.Rectangle.Inflate(Phaser.Geom.Rectangle.Clone(bounds), 28, 28),
      pointer.x,
      pointer.y,
    ));

    if (!nearAnyUtility) return;

    console.info('[UtilityHitboxDebug:nearbyTap]', {
      scene: scene.scene?.key ?? scene.constructor?.name,
      phase,
      pointer: { x: Math.round(pointer.x), y: Math.round(pointer.y), id: pointer.id },
      currentlyOver: describeCurrentlyOver(pointer),
      utilityHitboxes: activeBounds.map(({ name, bounds }) => ({
        name,
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
      })),
    });
  };

  const handlePointerDown = (pointer) => logNearbyTap('pointerdown', pointer);
  const handlePointerUp = (pointer) => logNearbyTap('pointerup', pointer);
  scene.input.on('pointerdown', handlePointerDown);
  scene.input.on('pointerup', handlePointerUp);
  scene.events?.once?.(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.input.off('pointerdown', handlePointerDown);
    scene.input.off('pointerup', handlePointerUp);
  });
}

export function createUtilityHitboxDebugOverlay(scene, controls) {
  if (!scene || !controls) return null;

  const graphics = scene.add.graphics()
    .setDepth(UTILITY_DEBUG_OVERLAY_DEPTH)
    .setScrollFactor(0);
  const overlay = { graphics, labels: [], nearbyLoggingAttached: false };

  Object.entries(controls)
    .filter(([key, control]) => !['metrics', 'menu'].includes(key) && control?.button)
    .forEach(([, control]) => attachUtilityDebugLogging(scene, control));

  drawUtilityDebugOverlay(scene, controls, overlay);
  attachNearbyUtilityTapLogging(scene, controls, overlay);

  scene.events?.once?.(Phaser.Scenes.Events.SHUTDOWN, () => {
    overlay.labels?.forEach((label) => label.destroy());
    graphics.destroy();
  });

  return overlay;
}

export function createFloatingControl(scene, x, y, size, label, onPointerUp, { fontScale = 0.5, minTapTargetSize = MIN_UTILITY_TAP_TARGET_SIZE } = {}) {
  const button = scene.add.container(x, y).setDepth(198);
  const surface = createUtilityButtonSurface(scene, size);
  const text = scene.add.text(0, 0, label, {
    fontFamily: 'Segoe UI, Arial, sans-serif',
    fontSize: `${Math.max(16, Math.floor(size * fontScale))}px`,
    color: '#f8fafc',
    fontStyle: 'bold',
    align: 'center',
  }).setOrigin(0.5).setDepth(2)
    .setShadow(0, 1, 'rgba(3, 17, 40, 0.72)', 2, true, true);

  const tapTargetSize = getUtilityTapTargetSize(size, minTapTargetSize);

  button.add([surface.backing, text]);
  button.setSize(tapTargetSize, tapTargetSize);

  const setState = (state = {}) => {
    const visualScale = state.pressed ? 0.985 : 1;
    setUtilitySurfaceState(surface, state);
    surface.backing.setScale(visualScale);
    text.setScale(visualScale);
    text.setAlpha(state.pressed ? 0.9 : 1);
    text.setColor(state.hovering ? '#ffffff' : '#f8fafc');
    text.setShadow(0, 1, state.hovering ? 'rgba(245, 241, 230, 0.16)' : 'rgba(3, 17, 40, 0.72)', state.hovering ? 3 : 2, true, true);
  };

  if (onPointerUp) {
    button.setInteractive(createUtilityHitArea(size, minTapTargetSize), Phaser.Geom.Rectangle.Contains);
    if (button.input) button.input.cursor = 'pointer';
    button.on('pointerover', () => setState({ hovering: true }));
    button.on('pointerout', () => setState());
    button.on('pointerdown', () => setState({ hovering: true, pressed: true }));
    button.on('pointerup', (...args) => {
      setState({ hovering: true });
      onPointerUp(...args);
    });
  }

  return {
    debug: {
      name: String(label ?? 'Utility'),
      visualSize: size,
      hitSize: tapTargetSize,
    },
    halo: null,
    shadow: null,
    backing: surface.backing,
    innerEdge: null,
    topHighlight: null,
    centerGlow: null,
    button,
    text,
    items: [button],
  };
}

export function drawSpeakerIcon(icon, size, isMuted) {
  const iconColor = 0xf8fafc;
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

export function createMuteToggleControl(scene, x, y, size, { onToggle = null, depth = 198, minTapTargetSize = MIN_UTILITY_TAP_TARGET_SIZE } = {}) {
  const button = scene.add.container(x, y).setDepth(depth);
  const surface = createUtilityButtonSurface(scene, size);
  const icon = scene.add.graphics().setDepth(2);
  let hovering = false;
  let pressed = false;

  const tapTargetSize = getUtilityTapTargetSize(size, minTapTargetSize);

  button.add([surface.backing, icon]);
  button.setSize(tapTargetSize, tapTargetSize);
  button.setInteractive(createUtilityHitArea(size, minTapTargetSize), Phaser.Geom.Rectangle.Contains);
  if (button.input) button.input.cursor = 'pointer';

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
    debug: {
      name: 'Mute',
      visualSize: size,
      hitSize: tapTargetSize,
    },
    halo: null,
    shadow: null,
    backing: surface.backing,
    innerEdge: null,
    topHighlight: null,
    centerGlow: null,
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
  debugOverlay = false,
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

  setUtilityControlDebugMetadata(controls.back, { name: 'Back', visualSize: metrics.touchSize, hitSize: getUtilityTapTargetSize(metrics.touchSize) });
  setUtilityControlDebugMetadata(controls.mute, { name: 'Mute', visualSize: metrics.touchSize, hitSize: getUtilityTapTargetSize(metrics.touchSize) });
  setUtilityControlDebugMetadata(controls.rules, { name: onRules ? 'Rules' : 'Menu', visualSize: metrics.touchSize, hitSize: getUtilityTapTargetSize(metrics.touchSize) });
  setUtilityControlDebugMetadata(controls.fullscreen, { name: 'Fullscreen', visualSize: metrics.touchSize, hitSize: getUtilityTapTargetSize(metrics.touchSize) });

  controls.menu = controls.rules;

  if (debugOverlay) {
    controls.debugOverlay = createUtilityHitboxDebugOverlay(scene, controls);
  }

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
