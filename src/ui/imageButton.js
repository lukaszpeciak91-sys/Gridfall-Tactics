import { preloadImageAsset, resolvePublicAssetPath } from '../rendering/backgroundArt.js';

const SECONDARY_BUTTON_PUBLIC_PATH = 'assets/ui/button-secondary.png';

export const SECONDARY_BUTTON_ASSET = {
  key: 'ui.button.secondary',
  path: resolvePublicAssetPath(SECONDARY_BUTTON_PUBLIC_PATH),
};

export const SECONDARY_BUTTON_RUNTIME_URL = SECONDARY_BUTTON_PUBLIC_PATH;

const DEFAULT_TEXT_STYLE = {
  fontFamily: '"Montserrat", "Inter", "Segoe UI", Arial, sans-serif',
  fontStyle: '600',
  color: '#f4f1e6',
  align: 'center',
  letterSpacing: 1.15,
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
  shadowAlpha = 0.32,
  textOffsetY = 1,
  hoverScale = 1.02,
  downScale = 0.98,
} = {}) {
  const normalizedLabel = String(label ?? '').toLocaleUpperCase();
  const hasButtonTexture = scene.textures.exists(SECONDARY_BUTTON_ASSET.key);
  const shadow = scene.add.rectangle(x, y + Math.max(2, height * 0.055), width * 0.94, height * 0.78, 0x020617, shadowAlpha)
    .setOrigin(0.5)
    .setDepth(depth - 1);

  const glow = scene.add.rectangle(x, y, width * 0.94, height * 0.72, 0x38bdf8, 0.08)
    .setOrigin(0.5)
    .setDepth(depth - 1)
    .setAlpha(0);

  const backing = hasButtonTexture
    ? scene.add.image(x, y, SECONDARY_BUTTON_ASSET.key).setDisplaySize(width, height)
    : scene.add.rectangle(x, y, width, height, fallbackFill, 0.95).setStrokeStyle(1, fallbackStroke, fallbackStrokeAlpha);

  backing.setOrigin(0.5).setDepth(depth);

  const text = scene.add.text(x, y + textOffsetY, normalizedLabel, {
    ...DEFAULT_TEXT_STYLE,
    fontSize,
    ...textStyle,
  })
    .setOrigin(0.5)
    .setDepth(depth + 1)
    .setShadow(0, 2, 'rgba(2, 12, 32, 0.72)', 3, true, true);

  const hitZone = scene.add.zone(x, y, width, height)
    .setOrigin(0.5)
    .setDepth(depth + 2)
    .setInteractive({ useHandCursor: true });

  const scalableTargets = [shadow, glow, backing, text];
  const setVisualState = ({ scale = 1, alpha = 1, textAlpha = 1, glowAlpha = 0 } = {}) => {
    scalableTargets.forEach((target) => target.setScale(scale));
    backing.setAlpha(alpha);
    text.setAlpha(textAlpha);
    glow.setAlpha(glowAlpha);
  };

  hitZone.on('pointerover', () => setVisualState({ scale: hoverScale, alpha: hasButtonTexture ? 1 : 0.98, glowAlpha: 0.16 }));
  hitZone.on('pointerout', () => setVisualState({ scale: 1, alpha: 1, textAlpha: 1, glowAlpha: 0 }));
  hitZone.on('pointerdown', () => setVisualState({ scale: downScale, alpha: 0.82, textAlpha: 0.86, glowAlpha: 0.08 }));
  hitZone.on('pointerup', () => {
    setVisualState({ scale: hoverScale, alpha: hasButtonTexture ? 1 : 0.98, glowAlpha: 0.16 });
    if (typeof onPointerUp === 'function') {
      onPointerUp();
    }
  });

  return {
    shadow,
    glow,
    backing,
    text,
    hitZone,
    items: [shadow, glow, backing, text, hitZone],
    usesImage: hasButtonTexture,
  };
}

export function destroyImageButton(button) {
  button?.items?.forEach((item) => item?.destroy?.());
}
