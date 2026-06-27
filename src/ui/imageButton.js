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
  onPointerDown,
  onPointerUpTrace,
  onPointerReleaseCanceledTrace,
  robustMobileRelease = false,
  releaseTolerance = 18,
  depth = 1,
  fontSize = '20px',
  textStyle = {},
  fallbackFill = 0x334155,
  fallbackStroke = 0x94a3b8,
  fallbackStrokeAlpha = 0.75,
  shadowAlpha = 0.26,
  textOffsetY = 0,
  hoverScale = 1.03,
  downScale = 0.98,
  preserveImageAspect = true,
  minTouchHeight = DEFAULT_MIN_TOUCH_HEIGHT,
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
  const setVisualState = ({ scale = 1, alpha = 1, textAlpha = 1, tint = null, glowAlpha = 0, textGlow = false } = {}) => {
    scalableTargets.forEach((target) => setTargetScaleFromBase(target, scale));
    backing.setAlpha(alpha);
    if (tint && backing.setTint) {
      backing.setTint(tint);
    } else if (backing.clearTint) {
      backing.clearTint();
    }
    centerGlow.setAlpha(glowAlpha);
    text.setAlpha(textAlpha);
    text.setShadow(0, 1, textGlow ? 'rgba(245, 241, 230, 0.24)' : 'rgba(3, 17, 40, 0.62)', textGlow ? 2 : 1, true, true);
  };

  const resetVisualState = () => setVisualState({ scale: 1, alpha: 1, textAlpha: 1 });
  const pressedVisualState = () => setVisualState({ scale: downScale, alpha: 0.9, textAlpha: 0.94 });
  const releasedVisualState = () => setVisualState({ scale: hoverScale, alpha: hasButtonTexture ? 1 : 0.96, tint: hasButtonTexture ? 0xfffbef : null, glowAlpha: 0.08, textGlow: true });
  const activateButton = () => {
    onPointerUpTrace?.();
    releasedVisualState();
    if (typeof onPointerUp === 'function') {
      playSfx(scene, AUDIO_KEYS.UI_CLICK);
      onPointerUp();
    }
  };
  const getPointerId = (pointer) => pointer?.id ?? pointer?.pointerId ?? null;
  const pointerWithinHitZone = (pointer, bounds, tolerance) => {
    if (!pointer || !bounds) return false;
    const x = pointer.x ?? pointer.worldX;
    const y = pointer.y ?? pointer.worldY;
    return Number.isFinite(x)
      && Number.isFinite(y)
      && x >= bounds.left - tolerance
      && x <= bounds.right + tolerance
      && y >= bounds.top - tolerance
      && y <= bounds.bottom + tolerance;
  };
  let robustReleaseState = null;
  const cleanupRobustRelease = () => {
    if (!robustReleaseState) return;
    const { onGlobalPointerUp, onGlobalPointerUpOutside } = robustReleaseState;
    scene.input?.off?.('pointerup', onGlobalPointerUp);
    scene.input?.off?.('pointerupoutside', onGlobalPointerUpOutside);
    robustReleaseState = null;
  };
  const completeRobustRelease = (pointer, { forceInside = false } = {}) => {
    if (!robustReleaseState) return;
    const { pointerId, bounds } = robustReleaseState;
    const releasePointerId = getPointerId(pointer);
    if (pointerId !== null && releasePointerId !== null && pointerId !== releasePointerId) return;
    cleanupRobustRelease();
    if (forceInside || pointerWithinHitZone(pointer, bounds, releaseTolerance)) {
      activateButton();
      return;
    }
    onPointerReleaseCanceledTrace?.();
    resetVisualState();
  };

  hitZone.on('pointerover', () => setVisualState({ scale: hoverScale, alpha: 1, tint: hasButtonTexture ? 0xfffbef : null, glowAlpha: 0.08, textGlow: true }));
  hitZone.on('pointerout', () => {
    if (!robustReleaseState) resetVisualState();
  });
  hitZone.on('pointerdown', (pointer) => {
    pressedVisualState();
    onPointerDown?.();
    if (!robustMobileRelease) return;
    cleanupRobustRelease();
    const onGlobalPointerUp = (releasePointer) => completeRobustRelease(releasePointer);
    const onGlobalPointerUpOutside = (releasePointer) => completeRobustRelease(releasePointer);
    robustReleaseState = {
      pointerId: getPointerId(pointer),
      bounds: hitZone.getBounds?.(),
      onGlobalPointerUp,
      onGlobalPointerUpOutside,
    };
    scene.input?.on?.('pointerup', onGlobalPointerUp);
    scene.input?.on?.('pointerupoutside', onGlobalPointerUpOutside);
  });
  hitZone.on('pointerup', (pointer) => {
    if (robustMobileRelease) {
      completeRobustRelease(pointer, { forceInside: true });
      return;
    }
    activateButton();
  });
  hitZone.once('destroy', cleanupRobustRelease);

  return {
    shadow,
    backing,
    text,
    hitZone,
    centerGlow,
    items: [shadow, backing, centerGlow, text, hitZone].filter(Boolean),
    usesImage: hasButtonTexture,
  };
}

export function resetImageButtonState(button, { interactive = true } = {}) {
  if (!button) {
    return;
  }

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
  button?.items?.forEach((item) => item?.destroy?.());
}
