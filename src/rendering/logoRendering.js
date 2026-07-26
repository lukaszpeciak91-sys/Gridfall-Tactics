import Phaser from 'phaser';
import { getRenderDevicePixelRatio } from './highDpiCanvas.js';

const LOGO_TEXTURE_PREFIX = 'ui.logo.gridfall.crisp';

function createCanvas(width, height) {
  if (typeof document !== 'undefined' && document.createElement) {
    return document.createElement('canvas');
  }

  return null;
}

function getSourceDimensions(sourceImage) {
  return {
    width: sourceImage?.naturalWidth || sourceImage?.videoWidth || sourceImage?.width || 0,
    height: sourceImage?.naturalHeight || sourceImage?.videoHeight || sourceImage?.height || 0,
  };
}

function isPositiveFiniteDimension(value) {
  return Number.isFinite(value) && value > 0;
}

export function isCrispLogoTextureValid(textureManager, textureKey) {
  if (!textureManager?.exists?.(textureKey)) {
    return false;
  }

  const texture = textureManager.get?.(textureKey);
  const sourceEntry = texture?.source?.[0];
  const sourceImage = sourceEntry?.image ?? texture?.getSourceImage?.();
  const sourceDimensions = getSourceDimensions(sourceImage);
  const frame = texture?.get?.();

  // Phaser exposes no renderer-independent public API for checking a texture's
  // GPU allocation, so validate the portable source and frame render inputs.
  return Boolean(
    texture
      && sourceEntry
      && sourceImage
      && isPositiveFiniteDimension(sourceDimensions.width)
      && isPositiveFiniteDimension(sourceDimensions.height)
      && isPositiveFiniteDimension(frame?.width)
      && isPositiveFiniteDimension(frame?.height),
  );
}

function createCrispLogoTexture(scene, sourceKey, targetPixelWidth, targetPixelHeight, cacheKey) {
  if (!scene.textures.exists(sourceKey)) {
    return null;
  }

  const sourceTexture = scene.textures.get(sourceKey);
  const sourceImage = sourceTexture?.getSourceImage?.();
  const sourceDimensions = getSourceDimensions(sourceImage);

  if (!sourceImage || !sourceDimensions.width || !sourceDimensions.height) {
    return null;
  }

  const canvas = createCanvas(targetPixelWidth, targetPixelHeight);
  if (!canvas) {
    return null;
  }

  canvas.width = targetPixelWidth;
  canvas.height = targetPixelHeight;

  const context = canvas.getContext('2d');
  context.clearRect(0, 0, targetPixelWidth, targetPixelHeight);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(sourceImage, 0, 0, targetPixelWidth, targetPixelHeight);

  const texture = scene.textures.addCanvas(cacheKey, canvas);
  texture?.setFilter?.(Phaser.Textures.FilterMode.LINEAR);
  return texture;
}

export function getTextureSourceSize(scene, sourceKey) {
  const sourceTexture = scene?.textures?.get(sourceKey);
  return getSourceDimensions(sourceTexture?.getSourceImage?.());
}

export function setCrispLogoDisplaySize(scene, logo, sourceKey, displayWidth, displayHeight, variantKey = sourceKey) {
  if (!logo || !displayWidth || !displayHeight) {
    return;
  }

  const dpr = getRenderDevicePixelRatio(scene);
  const targetPixelWidth = Math.max(1, Math.round(displayWidth * dpr));
  const targetPixelHeight = Math.max(1, Math.round(displayHeight * dpr));
  const cacheKey = `${LOGO_TEXTURE_PREFIX}.${variantKey}.${targetPixelWidth}x${targetPixelHeight}`;

  if (scene.textures.exists(cacheKey) && !isCrispLogoTextureValid(scene.textures, cacheKey)) {
    scene.textures.remove(cacheKey);
  }

  if (isCrispLogoTextureValid(scene.textures, cacheKey) || createCrispLogoTexture(scene, sourceKey, targetPixelWidth, targetPixelHeight, cacheKey)) {
    logo.setTexture(cacheKey);
  }

  logo.setDisplaySize(displayWidth, displayHeight);
}
