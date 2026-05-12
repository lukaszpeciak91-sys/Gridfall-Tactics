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

function createCrispLogoTexture(scene, sourceKey, targetPixelWidth, targetPixelHeight, cacheKey) {
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

  if (scene.textures.exists(cacheKey) || createCrispLogoTexture(scene, sourceKey, targetPixelWidth, targetPixelHeight, cacheKey)) {
    logo.setTexture(cacheKey);
  }

  logo.setDisplaySize(displayWidth, displayHeight);
}
