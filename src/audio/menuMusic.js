import { AUDIO_KEYS } from './audioAssets.js';
import { playMusic } from './audioPlayback.js';

export const MENU_MUSIC_SCENE_KEYS = Object.freeze([
  'MainMenuScene',
  'GameMenuScene',
  'FactionSelectScene',
  'CampaignEnemySelectScene',
  'CollectionScene',
  'TutorialScene',
]);

export function isMenuMusicSceneKey(sceneKey) {
  return MENU_MUSIC_SCENE_KEYS.includes(sceneKey);
}

export function playMenuMusic(scene, options = {}) {
  return playMusic(scene, AUDIO_KEYS.MENU_MUSIC, options);
}

export function playMenuMusicForReturnScene(scene, returnSceneKey, options = {}) {
  if (!isMenuMusicSceneKey(returnSceneKey)) return null;
  return playMenuMusic(scene, options);
}
