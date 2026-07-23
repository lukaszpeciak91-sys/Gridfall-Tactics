import { translateActive } from '../localization/localeService.js';
import { resolvePublicAssetPath } from '../rendering/backgroundArt.js';
import { getTextureSourceSize, setCrispLogoDisplaySize } from '../rendering/logoRendering.js';

export const GRIDFALL_LOGO_TEXT = 'GRIDFALL TACTICS';
export const GRIDFALL_LOGO_PUBLIC_PATH = 'assets/ui/gridfall-logo.png';
export const GRIDFALL_LOGO_ASSET = {
  key: 'ui.logo.gridfall',
  path: resolvePublicAssetPath(GRIDFALL_LOGO_PUBLIC_PATH),
};

export const START_HERO_LOGO_LAYOUT = {
  centerYRatio: 0.39,
  maxWidthRatio: 1.22,
  maxHeightRatio: 0.76,
  maxDisplayHeight: 920,
};

export const STARTUP_LOADING_VISUAL_LAYOUT = {
  logoCenterYRatio: START_HERO_LOGO_LAYOUT.centerYRatio,
  ringDiameter: 34,
  ringBaseStroke: 1,
  ringAccentStroke: 1,
  ringOuterInset: 2,
  ringInnerInset: 5,
  logoToRingCenterGap: 25,
  outerRingDurationMs: 1450,
  innerRingDurationMs: 2100,
};

export const MAIN_MENU_FIRST_BUTTON_Y_RATIO = 0.31;
export const MAIN_MENU_BUTTON_HALF_HEIGHT = 42;
export const MAIN_MENU_LOGO_LAYOUT = {
  centerYRatio: 0.14,
  maxWidthRatio: 0.75,
  maxHeightRatio: 0.23,
  maxDisplayHeight: 220,
  minButtonGap: 18,
};

export function getStartHeroLogoPosition(width, height) {
  return {
    x: width / 2,
    y: height * START_HERO_LOGO_LAYOUT.centerYRatio,
  };
}

export function getMainMenuLogoPosition(width, height) {
  return {
    x: width / 2,
    y: height * MAIN_MENU_LOGO_LAYOUT.centerYRatio,
  };
}

export function calculateStartHeroLogoDisplaySize(scene, width, height) {
  const sourceSize = getTextureSourceSize(scene, GRIDFALL_LOGO_ASSET.key);
  if (!sourceSize.width || !sourceSize.height) {
    return null;
  }

  const maxLogoWidth = width * START_HERO_LOGO_LAYOUT.maxWidthRatio;
  const maxLogoHeight = Math.min(height * START_HERO_LOGO_LAYOUT.maxHeightRatio, START_HERO_LOGO_LAYOUT.maxDisplayHeight);
  const logoScale = Math.min(maxLogoWidth / sourceSize.width, maxLogoHeight / sourceSize.height);

  return {
    width: sourceSize.width * logoScale,
    height: sourceSize.height * logoScale,
  };
}

export function calculateMainMenuLogoDisplaySize(scene, width, height) {
  const sourceSize = getTextureSourceSize(scene, GRIDFALL_LOGO_ASSET.key);
  if (!sourceSize.width || !sourceSize.height) {
    return null;
  }

  const maxLogoWidth = width * MAIN_MENU_LOGO_LAYOUT.maxWidthRatio;
  const logoCenterY = height * MAIN_MENU_LOGO_LAYOUT.centerYRatio;
  const firstButtonSafeTop = height * MAIN_MENU_FIRST_BUTTON_Y_RATIO - MAIN_MENU_BUTTON_HALF_HEIGHT;
  const safeLogoHeight = Math.max(0, (firstButtonSafeTop - logoCenterY - MAIN_MENU_LOGO_LAYOUT.minButtonGap) * 2);
  const maxLogoHeight = Math.min(
    height * MAIN_MENU_LOGO_LAYOUT.maxHeightRatio,
    MAIN_MENU_LOGO_LAYOUT.maxDisplayHeight,
    safeLogoHeight,
  );
  const logoScale = Math.min(maxLogoWidth / sourceSize.width, maxLogoHeight / sourceSize.height);

  return {
    width: sourceSize.width * logoScale,
    height: sourceSize.height * logoScale,
  };
}

export function setStartHeroLogoDisplaySize(scene, logo, width, height) {
  const displaySize = calculateStartHeroLogoDisplaySize(scene, width, height);
  if (!displaySize) {
    return null;
  }

  setCrispLogoDisplaySize(scene, logo, GRIDFALL_LOGO_ASSET.key, displaySize.width, displaySize.height, 'start-hero');
  return displaySize;
}

export function setMainMenuLogoDisplaySize(scene, logo, width, height) {
  const displaySize = calculateMainMenuLogoDisplaySize(scene, width, height);
  if (!displaySize) {
    return null;
  }

  setCrispLogoDisplaySize(scene, logo, GRIDFALL_LOGO_ASSET.key, displaySize.width, displaySize.height, 'main-menu');
  return displaySize;
}

export function createLogoFallbackText(scene, x, y, translationKey, fontSize, wordWrapWidth) {
  return scene.add
    .text(x, y, translateActive(translationKey, GRIDFALL_LOGO_TEXT), {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize,
      fontStyle: 'bold',
      color: '#f8fafc',
      align: 'center',
      wordWrap: { width: wordWrapWidth },
    })
    .setOrigin(0.5);
}
