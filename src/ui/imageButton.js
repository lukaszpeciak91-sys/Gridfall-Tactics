import Phaser from 'phaser';
import { preloadImageAsset, resolvePublicAssetPath } from '../rendering/backgroundArt.js';

const SECONDARY_BUTTON_PUBLIC_PATH = 'assets/ui/button-secondary.png';

export const SECONDARY_BUTTON_ASSET = {
  key: 'ui.button.secondary',
  path: resolvePublicAssetPath(SECONDARY_BUTTON_PUBLIC_PATH),
};

export const SECONDARY_BUTTON_RUNTIME_URL = SECONDARY_BUTTON_PUBLIC_PATH;

export const PREMIUM_BROADCAST_FONT_STACK = '"Rajdhani", "Exo 2", "Montserrat", "Segoe UI", Arial, sans-serif';

const DEFAULT_TEXT_STYLE = {
  fontFamily: PREMIUM_BROADCAST_FONT_STACK,
  fontStyle: '600',
  color: '#f5f1e6',
  align: 'center',
  letterSpacing: 1.8,
};

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
  textOffsetY = 1,
  hoverScale = 1.02,
  downScale = 0.98,
} = {}) {
  const normalizedLabel = String(label ?? '').toLocaleUpperCase();
  const hasButtonTexture = scene.textures.exists(SECONDARY_BUTTON_ASSET.key);
  const shadow = scene.add.rectangle(x, y + Math.max(2, height * 0.05), width * 0.78, height * 0.5, 0x020617, shadowAlpha)
    .setOrigin(0.5)
    .setDepth(depth - 1);

  const backing = hasButtonTexture
    ? scene.add.image(x, y, SECONDARY_BUTTON_ASSET.key).setDisplaySize(width, height)
    : scene.add.rectangle(x, y, width, height, fallbackFill, 0.94).setStrokeStyle(1, fallbackStroke, fallbackStrokeAlpha);

  backing.setOrigin(0.5).setDepth(depth);

  const hoverOverlay = hasButtonTexture
    ? scene.add.image(x, y, SECONDARY_BUTTON_ASSET.key).setDisplaySize(width, height).setBlendMode(Phaser.BlendModes.ADD)
    : null;
  hoverOverlay?.setOrigin(0.5).setDepth(depth + 0.5).setAlpha(0);

  const text = scene.add.text(x, y + textOffsetY, normalizedLabel, {
    ...DEFAULT_TEXT_STYLE,
    fontSize,
    ...textStyle,
  })
    .setOrigin(0.5)
    .setDepth(depth + 1)
    .setShadow(0, 1, 'rgba(1, 10, 26, 0.52)', 1, true, true);

  const hitZone = scene.add.zone(x, y, width, height)
    .setOrigin(0.5)
    .setDepth(depth + 2)
    .setInteractive({ useHandCursor: true });

  const scalableTargets = [shadow, backing, hoverOverlay, text].filter(Boolean);
  const setVisualState = ({ scale = 1, alpha = 1, textAlpha = 1, overlayAlpha = 0 } = {}) => {
    scalableTargets.forEach((target) => target.setScale(scale));
    backing.setAlpha(alpha);
    text.setAlpha(textAlpha);
    hoverOverlay?.setAlpha(overlayAlpha);
  };

  hitZone.on('pointerover', () => setVisualState({ scale: hoverScale, alpha: 1, overlayAlpha: hasButtonTexture ? 0.08 : 0 }));
  hitZone.on('pointerout', () => setVisualState({ scale: 1, alpha: 1, textAlpha: 1, overlayAlpha: 0 }));
  hitZone.on('pointerdown', () => setVisualState({ scale: downScale, alpha: 0.86, textAlpha: 0.92, overlayAlpha: 0 }));
  hitZone.on('pointerup', () => {
    setVisualState({ scale: hoverScale, alpha: hasButtonTexture ? 1 : 0.96, overlayAlpha: hasButtonTexture ? 0.06 : 0 });
    if (typeof onPointerUp === 'function') {
      onPointerUp();
    }
  });

  return {
    shadow,
    backing,
    hoverOverlay,
    text,
    hitZone,
    items: [shadow, backing, hoverOverlay, text, hitZone].filter(Boolean),
    usesImage: hasButtonTexture,
  };
}

export function resetImageButtonState(button, { interactive = true } = {}) {
  if (!button) {
    return;
  }

  [button.shadow, button.backing, button.hoverOverlay, button.text].forEach((item) => {
    item?.setAlpha?.(item === button.hoverOverlay ? 0 : 1);
    item?.setScale?.(1);
    item?.setVisible?.(true);
  });
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
