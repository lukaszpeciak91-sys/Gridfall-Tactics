import { AUDIO_KEYS } from '../audio/audioAssets.js';
import { playSfx } from '../audio/audioPlayback.js';
import { preloadImageAsset, resolvePublicAssetPath } from '../rendering/backgroundArt.js';

const SECONDARY_BUTTON_PUBLIC_PATH = 'assets/ui/button-secondary.png';

export const SECONDARY_BUTTON_ASSET = {
  key: 'ui.button.secondary',
  path: resolvePublicAssetPath(SECONDARY_BUTTON_PUBLIC_PATH),
};

export const SECONDARY_BUTTON_RUNTIME_URL = SECONDARY_BUTTON_PUBLIC_PATH;

export const PREMIUM_BROADCAST_FONT_STACK = 'Segoe UI, Arial, sans-serif';

const DEFAULT_TEXT_STYLE = {
  fontFamily: PREMIUM_BROADCAST_FONT_STACK,
  fontStyle: '700',
  color: '#f5f1e6',
  align: 'center',
  letterSpacing: 2.1,
};

const SECONDARY_BUTTON_FRAME = 'floating-plaque';
const SECONDARY_BUTTON_VISIBLE_FRAME = Object.freeze({
  x: 164,
  y: 318,
  width: 1213,
  height: 360,
});
const SECONDARY_BUTTON_ASPECT_RATIO = SECONDARY_BUTTON_VISIBLE_FRAME.width / SECONDARY_BUTTON_VISIBLE_FRAME.height;
const SECONDARY_BUTTON_DISPLAY_HEIGHT_SCALE = 1.09;
const DEFAULT_MIN_TOUCH_HEIGHT = 54;
const AMBIENT_FRAME_SWEEP_COLOR = 0x38d5ff;
const AMBIENT_FRAME_SWEEP_ALPHA = 0.42;
const AMBIENT_FRAME_SWEEP_SEGMENT_RATIO = 0.15;
const AMBIENT_FRAME_SWEEP_VISIBLE_MS = 1900;
const AMBIENT_FRAME_SWEEP_CYCLE_MS = 6400;
const AMBIENT_FRAME_SWEEP_PHASE_STEP_MS = 730;
const AMBIENT_FRAME_SWEEP_POINT_COUNT = 96;

let ambientFrameSweepSequence = 0;

function isLiveGameObject(target) {
  return Boolean(target && target.scene && target.active !== false);
}

function storeBaseScale(target) {
  target?.setData?.('baseScaleX', target.scaleX ?? 1);
  target?.setData?.('baseScaleY', target.scaleY ?? 1);
  return target;
}

function getBaseScale(target) {
  const baseScaleX = target?.getData?.('baseScaleX');
  const baseScaleY = target?.getData?.('baseScaleY');

  return {
    x: Number.isFinite(baseScaleX) ? baseScaleX : (target?.scaleX ?? 1),
    y: Number.isFinite(baseScaleY) ? baseScaleY : (target?.scaleY ?? 1),
  };
}

function setTargetScaleFromBase(target, stateScale = 1) {
  if (!target?.setScale) {
    return;
  }

  const baseScale = getBaseScale(target);
  target.setScale(baseScale.x * stateScale, baseScale.y * stateScale);
}

function normalizeAmbientFrameSweepGeometry({ width, visualHeight }) {
  const shortestSide = Math.max(1, Math.min(width, visualHeight));
  const inset = Math.max(3, Math.round(shortestSide * 0.075));
  const strokeWidth = Math.max(1.25, Math.min(2.5, shortestSide * 0.035));
  const pathWidth = Math.max(1, width - inset * 2);
  const pathHeight = Math.max(1, visualHeight - inset * 2);
  const radius = Math.max(4, Math.min(pathHeight * 0.42, pathWidth * 0.18, shortestSide * 0.24));
  const straightWidth = Math.max(0, pathWidth - radius * 2);
  const straightHeight = Math.max(0, pathHeight - radius * 2);
  const perimeter = Math.max(1, 2 * (straightWidth + straightHeight) + 2 * Math.PI * radius);
  const segmentLength = perimeter * AMBIENT_FRAME_SWEEP_SEGMENT_RATIO;

  return {
    inset,
    radius,
    strokeWidth,
    width: pathWidth,
    height: pathHeight,
    perimeter,
    segmentLength,
    pointCount: AMBIENT_FRAME_SWEEP_POINT_COUNT,
  };
}

function sampleRoundedRectPoint(target, x, y, geometry, distance) {
  const left = x - geometry.width / 2;
  const right = x + geometry.width / 2;
  const top = y - geometry.height / 2;
  const bottom = y + geometry.height / 2;
  const radius = geometry.radius;
  let remaining = ((distance % geometry.perimeter) + geometry.perimeter) % geometry.perimeter;
  const topLength = geometry.width - radius * 2;
  const sideLength = geometry.height - radius * 2;
  const arcLength = Math.PI * radius * 0.5;

  if (remaining <= topLength) {
    target.x = left + radius + remaining;
    target.y = top;
    return target;
  }
  remaining -= topLength;

  if (remaining <= arcLength) {
    const angle = -Math.PI / 2 + (remaining / arcLength) * (Math.PI / 2);
    target.x = right - radius + Math.cos(angle) * radius;
    target.y = top + radius + Math.sin(angle) * radius;
    return target;
  }
  remaining -= arcLength;

  if (remaining <= sideLength) {
    target.x = right;
    target.y = top + radius + remaining;
    return target;
  }
  remaining -= sideLength;

  if (remaining <= arcLength) {
    const angle = (remaining / arcLength) * (Math.PI / 2);
    target.x = right - radius + Math.cos(angle) * radius;
    target.y = bottom - radius + Math.sin(angle) * radius;
    return target;
  }
  remaining -= arcLength;

  if (remaining <= topLength) {
    target.x = right - radius - remaining;
    target.y = bottom;
    return target;
  }
  remaining -= topLength;

  if (remaining <= arcLength) {
    const angle = Math.PI / 2 + (remaining / arcLength) * (Math.PI / 2);
    target.x = left + radius + Math.cos(angle) * radius;
    target.y = bottom - radius + Math.sin(angle) * radius;
    return target;
  }
  remaining -= arcLength;

  if (remaining <= sideLength) {
    target.x = left;
    target.y = bottom - radius - remaining;
    return target;
  }

  const angle = Math.PI + (remaining / arcLength) * (Math.PI / 2);
  target.x = left + radius + Math.cos(angle) * radius;
  target.y = top + radius + Math.sin(angle) * radius;
  return target;
}

function createAmbientFrameSweep(scene, { x, y, width, visualHeight, depth }) {
  const geometry = normalizeAmbientFrameSweepGeometry({ width, visualHeight });
  const pathPoints = Array.from({ length: geometry.pointCount + 1 }, () => ({ x: 0, y: 0 }));
  const graphics = scene.add.graphics()
    .setDepth(depth + 0.75)
    .setVisible(false);
  graphics.setData?.('imageButtonAmbientFrameSweep', true);
  graphics.setData?.('imageButtonAmbientFrameSweepGeometry', geometry);
  graphics.setData?.('imageButtonAmbientFrameSweepPathPoints', pathPoints);
  graphics.disableInteractive?.();

  const state = { offset: 0 };
  let sweepTween = null;
  let sweepTimer = null;
  let destroyed = false;
  const phaseOffsetMs = (ambientFrameSweepSequence % 7) * AMBIENT_FRAME_SWEEP_PHASE_STEP_MS;
  ambientFrameSweepSequence += 1;

  const redrawSweep = () => {
    if (destroyed || !isLiveGameObject(graphics)) return;
    graphics.clear();
    graphics.lineStyle(geometry.strokeWidth, AMBIENT_FRAME_SWEEP_COLOR, AMBIENT_FRAME_SWEEP_ALPHA);
    graphics.beginPath();
    for (let index = 0; index < pathPoints.length; index += 1) {
      const point = pathPoints[index];
      sampleRoundedRectPoint(point, x, y, geometry, (index / geometry.pointCount) * geometry.segmentLength + state.offset);
      if (index === 0) {
        graphics.moveTo(point.x, point.y);
      } else {
        graphics.lineTo(point.x, point.y);
      }
    }
    graphics.strokePath();
  };

  const stopSweep = () => {
    sweepTween?.stop?.();
    sweepTween?.remove?.();
    sweepTween = null;
    sweepTimer?.remove?.(false);
    sweepTimer = null;
    graphics.clear();
    graphics.setVisible(false);
  };

  const playSweep = () => {
    if (destroyed || !isLiveGameObject(graphics)) return;
    state.offset = 0;
    graphics.setVisible(true);
    redrawSweep();
    sweepTween = scene.tweens?.add?.({
      targets: state,
      offset: geometry.perimeter,
      duration: AMBIENT_FRAME_SWEEP_VISIBLE_MS,
      ease: 'Sine.easeInOut',
      onUpdate: redrawSweep,
      onComplete: () => {
        graphics.clear();
        graphics.setVisible(false);
      },
    }) ?? null;
  };

  const schedule = () => {
    if (destroyed) return;
    sweepTimer = scene.time?.delayedCall?.(AMBIENT_FRAME_SWEEP_CYCLE_MS, () => {
      playSweep();
      schedule();
    }) ?? null;
  };

  sweepTimer = scene.time?.delayedCall?.(phaseOffsetMs, () => {
    playSweep();
    schedule();
  }) ?? null;

  const cleanup = () => {
    destroyed = true;
    stopSweep();
  };

  graphics.setData?.('imageButtonAmbientFrameSweepCleanup', cleanup);
  graphics.setData?.('imageButtonAmbientFrameSweepTiming', {
    visibleMs: AMBIENT_FRAME_SWEEP_VISIBLE_MS,
    cycleMs: AMBIENT_FRAME_SWEEP_CYCLE_MS,
    phaseOffsetMs,
    phaseStepMs: AMBIENT_FRAME_SWEEP_PHASE_STEP_MS,
    segmentRatio: AMBIENT_FRAME_SWEEP_SEGMENT_RATIO,
  });

  return {
    graphics,
    cleanup,
    geometry,
    timing: {
      visibleMs: AMBIENT_FRAME_SWEEP_VISIBLE_MS,
      cycleMs: AMBIENT_FRAME_SWEEP_CYCLE_MS,
      phaseOffsetMs,
      phaseStepMs: AMBIENT_FRAME_SWEEP_PHASE_STEP_MS,
      segmentRatio: AMBIENT_FRAME_SWEEP_SEGMENT_RATIO,
    },
  };
}

export function calculateSecondaryButtonHeight(width) {
  return Math.round((width / SECONDARY_BUTTON_ASPECT_RATIO) * SECONDARY_BUTTON_DISPLAY_HEIGHT_SCALE);
}

function getSecondaryButtonFrame(scene) {
  if (!scene.textures.exists(SECONDARY_BUTTON_ASSET.key)) {
    return null;
  }

  const texture = scene.textures.get(SECONDARY_BUTTON_ASSET.key);
  if (!texture.has(SECONDARY_BUTTON_FRAME)) {
    texture.add(
      SECONDARY_BUTTON_FRAME,
      0,
      SECONDARY_BUTTON_VISIBLE_FRAME.x,
      SECONDARY_BUTTON_VISIBLE_FRAME.y,
      SECONDARY_BUTTON_VISIBLE_FRAME.width,
      SECONDARY_BUTTON_VISIBLE_FRAME.height,
    );
  }

  return SECONDARY_BUTTON_FRAME;
}

export function preloadSecondaryButtonAsset(scene) {
  preloadImageAsset(scene, SECONDARY_BUTTON_ASSET, {
    onError: (asset) => console.warn(`Secondary button background failed to load: ${asset.path}`),
  });
}

export function createImageButton(scene, {
  x,
  y,
  width,
  height,
  label,
  onPointerUp,
  depth = 1,
  fontSize = '20px',
  textStyle = {},
  fallbackFill = 0x334155,
  fallbackStroke = 0x94a3b8,
  fallbackStrokeAlpha = 0.75,
  shadowAlpha = 0.26,
  textOffsetY = 0,
  hoverScale = 1.03,
  downScale = 0.975,
  preserveImageAspect = true,
  minTouchHeight = DEFAULT_MIN_TOUCH_HEIGHT,
  ambientFrameSweep = false,
} = {}) {
  const normalizedLabel = String(label ?? '').toLocaleUpperCase();
  const buttonFrame = getSecondaryButtonFrame(scene);
  const hasButtonTexture = Boolean(buttonFrame);
  const visualHeight = hasButtonTexture && preserveImageAspect
    ? Math.round((width / SECONDARY_BUTTON_ASPECT_RATIO) * SECONDARY_BUTTON_DISPLAY_HEIGHT_SCALE)
    : height;
  const hitHeight = Math.max(visualHeight, minTouchHeight);
  const shadow = storeBaseScale(scene.add.rectangle(x, y + Math.max(3, visualHeight * 0.09), width * 0.72, visualHeight * 0.22, 0x020617, shadowAlpha)
    .setOrigin(0.5)
    .setDepth(depth - 1));

  const backing = hasButtonTexture
    ? scene.add.image(x, y, SECONDARY_BUTTON_ASSET.key, buttonFrame).setDisplaySize(width, visualHeight)
    : scene.add.rectangle(x, y, width, visualHeight, fallbackFill, 0.94).setStrokeStyle(1, fallbackStroke, fallbackStrokeAlpha);

  backing.setOrigin(0.5).setDepth(depth);
  storeBaseScale(backing);

  const centerGlow = storeBaseScale(scene.add.ellipse(x, y, width * 0.58, visualHeight * 0.34, 0xf5f1e6, 0)
    .setOrigin(0.5)
    .setDepth(depth + 0.5));
  centerGlow.setBlendMode?.('ADD');

  const ambientSweep = ambientFrameSweep
    ? createAmbientFrameSweep(scene, { x, y, width, visualHeight, depth })
    : null;

  const text = scene.add.text(x, y + textOffsetY, normalizedLabel, {
    ...DEFAULT_TEXT_STYLE,
    fontSize,
    ...textStyle,
  })
    .setOrigin(0.5)
    .setDepth(depth + 1)
    .setShadow(0, 1, 'rgba(3, 17, 40, 0.58)', 1, true, true);
  storeBaseScale(text);

  const hitZone = scene.add.zone(x, y, width, hitHeight)
    .setOrigin(0.5)
    .setDepth(depth + 2)
    .setInteractive({ useHandCursor: true });

  const scalableTargets = [shadow, backing, centerGlow, text].filter(Boolean);
  const feedbackTargets = scalableTargets.filter(Boolean);
  const feedbackState = {
    hovering: false,
    pressed: false,
    activePointerId: null,
    scenePointerUpOutsideHandler: null,
    destroyed: false,
  };

  const killFeedbackTweens = () => {
    scene.tweens?.killTweensOf?.(feedbackTargets.filter(isLiveGameObject));
  };

  const removeScenePointerUpOutsideHandler = () => {
    if (!feedbackState.scenePointerUpOutsideHandler) return;
    scene.input?.off?.('pointerupoutside', feedbackState.scenePointerUpOutsideHandler);
    feedbackState.scenePointerUpOutsideHandler = null;
  };

  const setVisualState = ({ scale = 1, alpha = 1, textAlpha = 1, tint = null, glowAlpha = 0, textGlow = false } = {}) => {
    if (!isLiveGameObject(hitZone) || !isLiveGameObject(backing) || !isLiveGameObject(text)) return false;
    scalableTargets.filter(isLiveGameObject).forEach((target) => setTargetScaleFromBase(target, scale));
    backing.setAlpha(alpha);
    if (tint && backing.setTint) {
      backing.setTint(tint);
    } else if (backing.clearTint) {
      backing.clearTint();
    }
    if (isLiveGameObject(centerGlow)) centerGlow.setAlpha(glowAlpha);
    text.setAlpha(textAlpha);
    text.setShadow(0, 1, textGlow ? 'rgba(245, 241, 230, 0.24)' : 'rgba(3, 17, 40, 0.62)', textGlow ? 2 : 1, true, true);
    return true;
  };

  const getVisualStateForMode = (mode) => {
    if (mode === 'pressed') {
      return { scale: downScale, alpha: 0.9, textAlpha: 0.96, tint: hasButtonTexture ? 0xe8dfc9 : null, glowAlpha: 0.035, textGlow: false };
    }
    if (mode === 'hover') {
      return { scale: hoverScale, alpha: hasButtonTexture ? 1 : 0.96, textAlpha: 1, tint: hasButtonTexture ? 0xfffbef : null, glowAlpha: 0.08, textGlow: true };
    }
    return { scale: 1, alpha: 1, textAlpha: 1, tint: null, glowAlpha: 0, textGlow: false };
  };

  const tweenVisualState = (mode, { duration = 100, ease = 'Cubic.easeOut', immediate = false } = {}) => {
    if (feedbackState.destroyed) return false;
    const state = getVisualStateForMode(mode);
    if (!isLiveGameObject(hitZone) || !isLiveGameObject(backing) || !isLiveGameObject(text)) return false;

    killFeedbackTweens();

    if (state.tint && backing.setTint) {
      backing.setTint(state.tint);
    } else if (backing.clearTint) {
      backing.clearTint();
    }
    text.setShadow(0, 1, state.textGlow ? 'rgba(245, 241, 230, 0.24)' : 'rgba(3, 17, 40, 0.62)', state.textGlow ? 2 : 1, true, true);

    const liveTargets = feedbackTargets.filter(isLiveGameObject);
    const targetValues = new Map(liveTargets.map((target) => {
      const baseScale = getBaseScale(target);
      return [target, {
        scaleX: baseScale.x * state.scale,
        scaleY: baseScale.y * state.scale,
      }];
    }));

    if (immediate || typeof scene.tweens?.add !== 'function') {
      liveTargets.forEach((target) => {
        const values = targetValues.get(target);
        target.setScale?.(values.scaleX, values.scaleY);
      });
      backing.setAlpha(state.alpha);
      text.setAlpha(state.textAlpha);
      centerGlow?.setAlpha?.(state.glowAlpha);
      return true;
    }

    liveTargets.forEach((target) => {
      const values = targetValues.get(target);
      scene.tweens.add({
        targets: target,
        scaleX: values.scaleX,
        scaleY: values.scaleY,
        duration,
        ease,
      });
    });

    scene.tweens.add({
      targets: backing,
      alpha: state.alpha,
      duration,
      ease,
    });
    scene.tweens.add({
      targets: text,
      alpha: state.textAlpha,
      duration,
      ease,
    });
    if (centerGlow) {
      scene.tweens.add({
        targets: centerGlow,
        alpha: state.glowAlpha,
        duration,
        ease,
      });
    }
    return true;
  };

  const finishPress = ({ triggerAction = false, pointer = null } = {}) => {
    const wasPressed = feedbackState.pressed;
    feedbackState.pressed = false;
    feedbackState.activePointerId = null;
    removeScenePointerUpOutsideHandler();
    const nextMode = feedbackState.hovering ? 'hover' : 'base';
    if (!tweenVisualState(nextMode, { duration: 105, ease: 'Cubic.easeOut' })) return;
    if (triggerAction && wasPressed && typeof onPointerUp === 'function') {
      playSfx(scene, AUDIO_KEYS.UI_CLICK);
      onPointerUp(pointer);
    }
  };

  const cancelPress = () => {
    feedbackState.pressed = false;
    feedbackState.activePointerId = null;
    removeScenePointerUpOutsideHandler();
    tweenVisualState(feedbackState.hovering ? 'hover' : 'base', { duration: 105, ease: 'Cubic.easeOut' });
  };

  const handleScenePointerUpOutside = (pointer) => {
    if (!feedbackState.pressed) return;
    if (feedbackState.activePointerId != null && pointer?.id !== feedbackState.activePointerId) return;
    feedbackState.hovering = false;
    cancelPress();
  };

  const resetFeedback = () => {
    feedbackState.destroyed = true;
    feedbackState.pressed = false;
    feedbackState.hovering = false;
    feedbackState.activePointerId = null;
    removeScenePointerUpOutsideHandler();
    killFeedbackTweens();
  };

  const cleanupFeedback = () => {
    resetFeedback();
    ambientSweep?.cleanup?.();
  };

  hitZone.setData?.('imageButtonFeedbackCleanup', cleanupFeedback);
  hitZone.setData?.('imageButtonFeedbackReset', ({ interactive = true } = {}) => {
    resetFeedback();
    feedbackState.destroyed = false;
    setVisualState({ scale: 1, alpha: 1, textAlpha: 1 });
    if (interactive) {
      hitZone?.setInteractive?.({ useHandCursor: true });
    } else {
      hitZone?.disableInteractive?.();
    }
  });
  scene.events?.once?.('shutdown', cleanupFeedback);

  hitZone.on('pointerover', () => {
    feedbackState.hovering = true;
    if (!feedbackState.pressed) tweenVisualState('hover', { duration: 95, ease: 'Cubic.easeOut' });
  });
  hitZone.on('pointerout', () => {
    feedbackState.hovering = false;
    if (feedbackState.pressed) {
      cancelPress();
      return;
    }
    tweenVisualState('base', { duration: 95, ease: 'Cubic.easeOut' });
  });
  hitZone.on('pointerdown', (pointer) => {
    feedbackState.pressed = true;
    feedbackState.activePointerId = pointer?.id ?? null;
    removeScenePointerUpOutsideHandler();
    feedbackState.scenePointerUpOutsideHandler = handleScenePointerUpOutside;
    scene.input?.on?.('pointerupoutside', feedbackState.scenePointerUpOutsideHandler);
    tweenVisualState('pressed', { duration: 65, ease: 'Quad.easeOut' });
  });
  hitZone.on('pointerup', (pointer) => {
    if (feedbackState.activePointerId != null && pointer?.id !== feedbackState.activePointerId) return;
    finishPress({ triggerAction: true, pointer });
  });
  hitZone.on('pointercancel', cancelPress);
  hitZone.on('destroy', cleanupFeedback);

  // Keep an immediate-state setter available for reset paths and tests.
  hitZone.setData?.('imageButtonSetVisualState', setVisualState);

  if (!setVisualState({ scale: 1, alpha: 1, textAlpha: 1 })) {
    return null;
  }

  const triggerPointerUp = () => {
    if (!setVisualState({ scale: hoverScale, alpha: hasButtonTexture ? 1 : 0.96, tint: hasButtonTexture ? 0xfffbef : null, glowAlpha: 0.08, textGlow: true })) return;
    if (typeof onPointerUp === 'function') {
      playSfx(scene, AUDIO_KEYS.UI_CLICK);
      onPointerUp();
    }
  };
  hitZone.setData?.('legacyImageButtonPointerUp', triggerPointerUp);

  return {
    shadow,
    backing,
    ambientFrameSweep: ambientSweep?.graphics ?? null,
    text,
    hitZone,
    centerGlow,
    items: [shadow, backing, centerGlow, ambientSweep?.graphics, text, hitZone].filter(Boolean),
    usesImage: hasButtonTexture,
    geometry: {
      width,
      visualHeight,
      hitHeight,
    },
    ambientFrameSweepGeometry: ambientSweep?.geometry ?? null,
    ambientFrameSweepTiming: ambientSweep?.timing ?? null,
  };
}

export function resetImageButtonState(button, { interactive = true } = {}) {
  if (!button) {
    return;
  }

  button.hitZone?.getData?.('imageButtonFeedbackReset')?.({ interactive });

  [button.shadow, button.backing, button.text].forEach((item) => {
    item?.setAlpha?.(1);
    setTargetScaleFromBase(item, 1);
    item?.setVisible?.(true);
  });
  button.backing?.clearTint?.();
  button.centerGlow?.setAlpha?.(0);
  button.text?.setShadow?.(0, 1, 'rgba(3, 17, 40, 0.62)', 1, true, true);
  button.hitZone?.setAlpha?.(1);
  button.hitZone?.setScale?.(1);
  button.hitZone?.setVisible?.(true);

  if (interactive) {
    button.hitZone?.setInteractive?.({ useHandCursor: true });
  } else {
    button.hitZone?.disableInteractive?.();
  }
}

export function destroyImageButton(button) {
  button?.hitZone?.getData?.('imageButtonFeedbackCleanup')?.();
  button?.items?.forEach((item) => {
    item?.removeAllListeners?.();
    item?.disableInteractive?.();
    item?.destroy?.();
  });
}
