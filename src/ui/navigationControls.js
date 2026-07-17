import { AUDIO_KEYS } from '../audio/audioAssets.js';
import { playSfx } from '../audio/audioPlayback.js';
import { SETTINGS_CHANGED_EVENT, loadSettings, toggleMuted } from '../systems/settingsState.js';

const PREMIUM_GOLD_ACCENT = 0xfacc15;
const BOTTOM_CONTROL_CORNER_RADIUS_RATIO = 0.16;
export const NAVIGATION_GOLD_SWEEP = Object.freeze({
  color: PREMIUM_GOLD_ACCENT,
  highlightColor: 0xfde68a,
  strokeRatio: 0.035,
  primaryAlpha: 0.46,
  trailAlpha: 0.18,
  primaryLengthRatio: 0.16,
  trailLengthRatio: 0.08,
  trailGapRatio: 0.025,
  duration: 1600,
  pauseDuration: 4400,
  fadeOutStart: 0.78,
  depth: 199.35,
});
export const NAVIGATION_RING_MOTION = Object.freeze({
  color: 0x38bdf8,
  highlightColor: 0x7dd3fc,
  radiusRatio: 0.55,
  muteRadiusRatio: 0.58,
  strokeRatio: 0.042,
  primaryAlpha: 0.54,
  trailAlpha: 0.2,
  primaryArc: Math.PI * 0.34,
  trailArc: Math.PI * 0.2,
  trailGap: Math.PI * 0.08,
  duration: 5200,
  depth: 198.35,
});
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


function prefersReducedNavigationMotion() {
  return Boolean(globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

export function getNavigationRingPhaseOffset(x, y, size) {
  const seed = Math.round(x * 3 + y * 5 + size * 7);
  return ((seed % 360) / 360) * Math.PI * 2;
}

export function drawNavigationRingSegment(arc, radius, size) {
  const strokeWidth = Math.max(1.4, size * NAVIGATION_RING_MOTION.strokeRatio);
  const primaryStart = -Math.PI * 0.5;
  const primaryEnd = primaryStart + NAVIGATION_RING_MOTION.primaryArc;
  const trailEnd = primaryStart - NAVIGATION_RING_MOTION.trailGap;
  const trailStart = trailEnd - NAVIGATION_RING_MOTION.trailArc;

  arc.clear();
  arc.lineStyle(strokeWidth, NAVIGATION_RING_MOTION.color, NAVIGATION_RING_MOTION.trailAlpha);
  arc.beginPath();
  arc.arc(0, 0, radius, trailStart, trailEnd, false);
  arc.strokePath();
  arc.lineStyle(strokeWidth, NAVIGATION_RING_MOTION.highlightColor, NAVIGATION_RING_MOTION.primaryAlpha);
  arc.beginPath();
  arc.arc(0, 0, radius, primaryStart, primaryEnd, false);
  arc.strokePath();
}

export function createNavigationRingMotion(scene, x, y, size, { radiusRatio = NAVIGATION_RING_MOTION.radiusRatio, depth = NAVIGATION_RING_MOTION.depth } = {}) {
  const radius = size * radiusRatio;
  const arc = scene.add.graphics().setPosition(x, y).setDepth(depth);
  drawNavigationRingSegment(arc, radius, size);
  arc.rotation = getNavigationRingPhaseOffset(x, y, size);

  const tween = prefersReducedNavigationMotion() ? null : (scene.tweens?.add?.({
    targets: arc,
    rotation: arc.rotation + Math.PI * 2,
    duration: NAVIGATION_RING_MOTION.duration,
    ease: 'Linear',
    repeat: -1,
  }) ?? null);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    scene.events?.off?.('shutdown', cleanup);
    tween?.remove?.();
    arc.destroy?.();
  };
  scene.events?.once?.('shutdown', cleanup);
  arc.once?.('destroy', () => {
    tween?.remove?.();
  });

  return { arc, tween, radius, duration: NAVIGATION_RING_MOTION.duration, phaseOffset: arc.rotation, cleanup };
}


export function getNavigationGoldSweepPhaseOffset(x, y, size) {
  const seed = Math.round(x * 11 + y * 7 + size * 13);
  return seed % (NAVIGATION_GOLD_SWEEP.duration + NAVIGATION_GOLD_SWEEP.pauseDuration);
}

export function getNavigationGoldSweepGeometry(size, cornerRadius = getBottomControlCornerRadius(size)) {
  const half = size / 2;
  const radius = Math.min(cornerRadius, half);
  const straight = Math.max(0, size - radius * 2);
  const perimeter = straight * 4 + Math.PI * 2 * radius;
  return { size, cornerRadius: radius, half, straight, perimeter, sweepPoint: { x: 0, y: 0 } };
}

function pointOnGoldSweepPerimeter(distance, geometry, out = { x: 0, y: 0 }) {
  const { half, cornerRadius: r, straight, perimeter } = geometry;
  let d = ((distance % perimeter) + perimeter) % perimeter;
  const right = half;
  const left = -half;
  const top = -half;
  const bottom = half;
  const arc = Math.PI * 0.5 * r;

  if (d <= straight) { out.x = -half + r + d; out.y = top; return out; }
  d -= straight;
  if (d <= arc) {
    const angle = -Math.PI * 0.5 + d / r;
    out.x = right - r + Math.cos(angle) * r; out.y = top + r + Math.sin(angle) * r; return out;
  }
  d -= arc;
  if (d <= straight) { out.x = right; out.y = -half + r + d; return out; }
  d -= straight;
  if (d <= arc) {
    const angle = d / r;
    out.x = right - r + Math.cos(angle) * r; out.y = bottom - r + Math.sin(angle) * r; return out;
  }
  d -= arc;
  if (d <= straight) { out.x = half - r - d; out.y = bottom; return out; }
  d -= straight;
  if (d <= arc) {
    const angle = Math.PI * 0.5 + d / r;
    out.x = left + r + Math.cos(angle) * r; out.y = bottom - r + Math.sin(angle) * r; return out;
  }
  d -= arc;
  if (d <= straight) { out.x = left; out.y = half - r - d; return out; }
  d -= straight;
  const angle = Math.PI + d / r;
  out.x = left + r + Math.cos(angle) * r; out.y = top + r + Math.sin(angle) * r; return out;
}

function strokeGoldSweepSegment(graphics, geometry, startDistance, length, color, alpha, strokeWidth) {
  const steps = Math.max(5, Math.ceil(length / Math.max(4, geometry.size * 0.09)));
  const point = geometry.sweepPoint;
  pointOnGoldSweepPerimeter(startDistance, geometry, point);
  graphics.lineStyle(strokeWidth, color, alpha);
  graphics.beginPath();
  graphics.moveTo(point.x, point.y);
  for (let i = 1; i <= steps; i += 1) {
    pointOnGoldSweepPerimeter(startDistance + (length * i) / steps, geometry, point);
    graphics.lineTo(point.x, point.y);
  }
  graphics.strokePath();
}

export function drawNavigationGoldSweep(sweep, geometry, progress) {
  const clamped = Math.max(0, Math.min(1, progress));
  const strokeWidth = Math.max(1.2, geometry.size * NAVIGATION_GOLD_SWEEP.strokeRatio);
  const primaryLength = geometry.perimeter * NAVIGATION_GOLD_SWEEP.primaryLengthRatio;
  const trailLength = geometry.perimeter * NAVIGATION_GOLD_SWEEP.trailLengthRatio;
  const trailGap = geometry.perimeter * NAVIGATION_GOLD_SWEEP.trailGapRatio;
  const fadeMultiplier = clamped < NAVIGATION_GOLD_SWEEP.fadeOutStart
    ? 1
    : Math.max(0, 1 - ((clamped - NAVIGATION_GOLD_SWEEP.fadeOutStart) / (1 - NAVIGATION_GOLD_SWEEP.fadeOutStart)));
  const head = geometry.perimeter * clamped;

  sweep.clear();
  if (fadeMultiplier <= 0) return;
  strokeGoldSweepSegment(sweep, geometry, head - primaryLength - trailGap - trailLength, trailLength, NAVIGATION_GOLD_SWEEP.color, NAVIGATION_GOLD_SWEEP.trailAlpha * fadeMultiplier, strokeWidth);
  strokeGoldSweepSegment(sweep, geometry, head - primaryLength, primaryLength, NAVIGATION_GOLD_SWEEP.highlightColor, NAVIGATION_GOLD_SWEEP.primaryAlpha * fadeMultiplier, strokeWidth);
}

export function createNavigationGoldSweep(scene, x, y, size, { depth = NAVIGATION_GOLD_SWEEP.depth } = {}) {
  const geometry = getNavigationGoldSweepGeometry(size);
  const sweep = scene.add.graphics().setPosition(x, y).setDepth(depth);
  sweep.alpha = 0;
  drawNavigationGoldSweep(sweep, geometry, 0);

  const state = { progress: 0 };
  const delay = getNavigationGoldSweepPhaseOffset(x, y, size);
  const tween = prefersReducedNavigationMotion() ? null : (scene.tweens?.add?.({
    targets: state,
    progress: 1,
    duration: NAVIGATION_GOLD_SWEEP.duration,
    hold: NAVIGATION_GOLD_SWEEP.pauseDuration,
    delay,
    ease: 'Sine.easeInOut',
    repeat: -1,
    onStart: () => { sweep.alpha = 1; },
    onRepeat: () => { state.progress = 0; sweep.alpha = 1; },
    onUpdate: () => {
      const fadeMultiplier = state.progress < NAVIGATION_GOLD_SWEEP.fadeOutStart
        ? 1
        : Math.max(0, 1 - ((state.progress - NAVIGATION_GOLD_SWEEP.fadeOutStart) / (1 - NAVIGATION_GOLD_SWEEP.fadeOutStart)));
      sweep.alpha = fadeMultiplier;
      drawNavigationGoldSweep(sweep, geometry, state.progress);
    },
  }) ?? null);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    scene.events?.off?.('shutdown', cleanup);
    tween?.remove?.();
    sweep.destroy?.();
  };
  scene.events?.once?.('shutdown', cleanup);
  sweep.once?.('destroy', () => {
    tween?.remove?.();
  });

  return { sweep, tween, geometry, duration: NAVIGATION_GOLD_SWEEP.duration, pauseDuration: NAVIGATION_GOLD_SWEEP.pauseDuration, phaseOffset: delay, cleanup };
}

export function createFloatingControl(scene, x, y, size, label, onPointerUp, { fontScale = 0.5 } = {}) {
  const iconType = resolveNavigationIconType(label);
  if (!iconType) {
    throw new Error(`Unsupported floating navigation icon: ${label}`);
  }

  const halo = scene.add.circle(x, y, size * NAVIGATION_RING_MOTION.radiusRatio, 0x38bdf8, 0.08)
    .setStrokeStyle(1, 0x7dd3fc, 0.18)
    .setDepth(198);
  const ringMotion = createNavigationRingMotion(scene, x, y, size);
  const goldSweep = createNavigationGoldSweep(scene, x, y, size);
  const backing = scene.add.rectangle(x, y, size, size, 0x020617, 0.62)
    .setRounded(getBottomControlCornerRadius(size))
    .setStrokeStyle(1, PREMIUM_GOLD_ACCENT, 0.58)
    .setDepth(199);
  const icon = scene.add.graphics().setPosition(x, y).setDepth(200);
  drawNavigationIcon(icon, size, iconType);

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

  const destroy = () => {
    ringMotion.cleanup();
    goldSweep.cleanup();
    halo.destroy?.();
    backing.destroy?.();
    icon.destroy?.();
  };

  return { halo, ringArc: ringMotion.arc, ringTween: ringMotion.tween, ringMotion, goldSweep: goldSweep.sweep, goldSweepTween: goldSweep.tween, goldSweepMotion: goldSweep, backing, icon, text: icon, iconType, destroy };
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
  const halo = scene.add.circle(0, 0, size * NAVIGATION_RING_MOTION.muteRadiusRatio, 0x38bdf8, 0.08).setStrokeStyle(1, 0x7dd3fc, 0.18);
  const ringMotion = createNavigationRingMotion(scene, 0, 0, size, { radiusRatio: NAVIGATION_RING_MOTION.muteRadiusRatio });
  const goldSweep = createNavigationGoldSweep(scene, 0, 0, size);
  const backing = scene.add.rectangle(0, 0, size, size, 0x020617, 0.66)
    .setRounded(getBottomControlCornerRadius(size))
    .setStrokeStyle(1, PREMIUM_GOLD_ACCENT, 0.58);
  const icon = scene.add.graphics();
  let hovering = false;

  button.add([halo, ringMotion.arc, backing, goldSweep.sweep, icon]);
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
    ringMotion.cleanup();
    goldSweep.cleanup();
    button.destroy();
  };
  return { halo, ringArc: ringMotion.arc, ringTween: ringMotion.tween, ringMotion, goldSweep: goldSweep.sweep, goldSweepTween: goldSweep.tween, goldSweepMotion: goldSweep, backing, icon, button, text: icon, destroy };
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
