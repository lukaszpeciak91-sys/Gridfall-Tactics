import { preloadImageAsset, preloadMenuBackgroundArt } from '../rendering/backgroundArt.js';
import { preloadSecondaryButtonAsset } from './imageButton.js';
import { GRIDFALL_LOGO_ASSET } from './menuLogoLayout.js';

export function preloadMainMenuFirstFrameVisualAssets(scene) {
  preloadMenuBackgroundArt(scene);
  preloadImageAsset(scene, GRIDFALL_LOGO_ASSET, {
    onError: (asset) => console.warn(`Main menu logo failed to load: ${asset.path}`),
  });
  preloadSecondaryButtonAsset(scene);
}
