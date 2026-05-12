import { preloadImageAsset, resolvePublicAssetPath } from '../rendering/backgroundArt.js';

const SECONDARY_BUTTON_PUBLIC_PATH = 'assets/ui/button-secondary.png';

export const SECONDARY_BUTTON_ASSET = {
  key: 'ui.button.secondary',
  path: resolvePublicAssetPath(SECONDARY_BUTTON_PUBLIC_PATH),
};

export const SECONDARY_BUTTON_RUNTIME_URL = SECONDARY_BUTTON_PUBLIC_PATH;

const DEFAULT_TEXT_STYLE = {
  fontFamily: '"Rajdhani", "Exo 2", "Montserrat", "Segoe UI", sans-serif',
  fontStyle: '600',
  color: '#fff8e7',
  align: 'center',
  letterSpacing: 1.45,
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
  const shadow = scene.add.rectangle(x, y + Math.max(3, height * 0.07), width * 0.92, height * 0.86, 0x020617, shadowAlpha + 0.1)
    .setOrigin(0.5)
    .setDepth(depth - 1);

  const core = scene.add.rectangle(x, y + Math.max(1, height * 0.015), width * 0.88, height * 0.62, 0x07111f, 0.5)
    .setOrigin(0.5)
    .setDepth(depth - 0.5);

  const glow = scene.add.rectangle(x, y, width * 0.9, height * 0.66, 0x7dd3fc, 0.045)
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
    .setShadow(0, 1, 'rgba(2, 12, 32, 0.62)', 2, true, true);

  const hitZone = scene.add.zone(x, y, width, height)
    .setOrigin(0.5)
    .setDepth(depth + 2)
    .setInteractive({ useHandCursor: true });

  const scalableTargets = [shadow, core, glow, backing, text];
  const setVisualState = ({ scale = 1, alpha = 1, textAlpha = 1, glowAlpha = 0 } = {}) => {
    scalableTargets.forEach((target) => target.setScale(scale));
    backing.setAlpha(alpha);
    text.setAlpha(textAlpha);
    glow.setAlpha(glowAlpha);
  };

  hitZone.on('pointerover', () => setVisualState({ scale: hoverScale, alpha: hasButtonTexture ? 1 : 0.98, glowAlpha: 0.1 }));
  hitZone.on('pointerout', () => setVisualState({ scale: 1, alpha: 1, textAlpha: 1, glowAlpha: 0 }));
  hitZone.on('pointerdown', () => setVisualState({ scale: downScale, alpha: 0.88, textAlpha: 0.9, glowAlpha: 0.035 }));
  hitZone.on('pointerup', () => {
    setVisualState({ scale: hoverScale, alpha: hasButtonTexture ? 1 : 0.98, glowAlpha: 0.1 });
    if (typeof onPointerUp === 'function') {
      onPointerUp();
    }
  });

  return {
    shadow,
    core,
    glow,
    backing,
    text,
    hitZone,
    items: [shadow, core, glow, backing, text, hitZone],
    usesImage: hasButtonTexture,
  };
}

export function destroyImageButton(button) {
  button?.items?.forEach((item) => item?.destroy?.());
}
