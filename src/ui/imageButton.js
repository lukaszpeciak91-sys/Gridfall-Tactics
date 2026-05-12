import { preloadImageAsset, resolvePublicAssetPath } from '../rendering/backgroundArt.js';

const SECONDARY_BUTTON_PUBLIC_PATH = 'assets/ui/button-secondary.png';

export const SECONDARY_BUTTON_ASSET = {
  key: 'ui.button.secondary',
  path: resolvePublicAssetPath(SECONDARY_BUTTON_PUBLIC_PATH),
};

export const SECONDARY_BUTTON_RUNTIME_URL = SECONDARY_BUTTON_PUBLIC_PATH;

export const PREMIUM_BROADCAST_FONT_STACK = '"Rajdhani", "Orbitron", "Exo 2", "Segoe UI", Arial, sans-serif';

const DEFAULT_TEXT_STYLE = {
  fontFamily: PREMIUM_BROADCAST_FONT_STACK,
  fontStyle: '700',
  color: '#f3eedf',
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
  return Math.round(width / SECONDARY_BUTTON_ASPECT_RATIO);
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
  downScale = 0.98,
  preserveImageAspect = true,
  minTouchHeight = DEFAULT_MIN_TOUCH_HEIGHT,
} = {}) {
  const normalizedLabel = String(label ?? '').toLocaleUpperCase();
  const buttonFrame = getSecondaryButtonFrame(scene);
  const hasButtonTexture = Boolean(buttonFrame);
  const visualHeight = hasButtonTexture && preserveImageAspect
    ? Math.round(width / SECONDARY_BUTTON_ASPECT_RATIO)
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

  const text = scene.add.text(x, y + textOffsetY, normalizedLabel, {
    ...DEFAULT_TEXT_STYLE,
    fontSize,
    ...textStyle,
  })
    .setOrigin(0.5)
    .setDepth(depth + 1)
    .setShadow(0, 1, 'rgba(1, 10, 26, 0.52)', 1, true, true);
  storeBaseScale(text);

  const hitZone = scene.add.zone(x, y, width, hitHeight)
    .setOrigin(0.5)
    .setDepth(depth + 2)
    .setInteractive({ useHandCursor: true });

  const scalableTargets = [shadow, backing, text].filter(Boolean);
  const setVisualState = ({ scale = 1, alpha = 1, textAlpha = 1, tint = null, textGlow = false } = {}) => {
    scalableTargets.forEach((target) => setTargetScaleFromBase(target, scale));
    backing.setAlpha(alpha);
    if (tint && backing.setTint) {
      backing.setTint(tint);
    } else if (backing.clearTint) {
      backing.clearTint();
    }
    text.setAlpha(textAlpha);
    text.setShadow(0, 1, textGlow ? 'rgba(243, 238, 223, 0.26)' : 'rgba(1, 10, 26, 0.64)', textGlow ? 3 : 1, true, true);
  };

  hitZone.on('pointerover', () => setVisualState({ scale: hoverScale, alpha: 1, tint: hasButtonTexture ? 0xfffbef : null, textGlow: true }));
  hitZone.on('pointerout', () => setVisualState({ scale: 1, alpha: 1, textAlpha: 1 }));
  hitZone.on('pointerdown', () => setVisualState({ scale: downScale, alpha: 0.9, textAlpha: 0.94 }));
  hitZone.on('pointerup', () => {
    setVisualState({ scale: hoverScale, alpha: hasButtonTexture ? 1 : 0.96, tint: hasButtonTexture ? 0xfffbef : null, textGlow: true });
    if (typeof onPointerUp === 'function') {
      onPointerUp();
    }
  });

  return {
    shadow,
    backing,
    text,
    hitZone,
    items: [shadow, backing, text, hitZone].filter(Boolean),
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
  button.text?.setShadow?.(0, 1, 'rgba(1, 10, 26, 0.64)', 1, true, true);
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
