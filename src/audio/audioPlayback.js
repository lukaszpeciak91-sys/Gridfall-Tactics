import { SETTINGS_CHANGED_EVENT, loadSettings } from '../systems/settingsState.js';
import { getAudioAsset, hasCachedAudioAsset } from './audioAssets.js';

export const MUSIC_BUS_VOLUME = 0.45;

const lastPlayedAtByKey = new Map();
let activeMusic = null;

function getNow(scene) {
  return scene?.time?.now ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
}

function clampUnit(value, fallback = 1) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.max(0, Math.min(1, numericValue));
}

function getSfxPlaybackVolume(settings, asset, options) {
  const settingsVolume = clampUnit(settings.sfxVolume / 100, 0.5);
  const assetVolume = clampUnit(asset.volume, 1);
  const optionVolume = clampUnit(options.volume, 1);
  return clampUnit(settingsVolume * assetVolume * optionVolume);
}

function getMusicPlaybackVolume(settings, asset, options) {
  const settingsVolume = clampUnit(settings.musicVolume / 100, 0.5);
  const assetVolume = clampUnit(asset.volume, 1);
  const optionVolume = clampUnit(options.volume, 1);
  return clampUnit(settingsVolume * assetVolume * optionVolume * MUSIC_BUS_VOLUME);
}

function unregisterActiveMusicSettingsHandler() {
  if (!activeMusic?.gameEvents || !activeMusic?.settingsHandler) return;
  activeMusic.gameEvents.off?.(SETTINGS_CHANGED_EVENT, activeMusic.settingsHandler);
}

function registerActiveMusicSettingsHandler(scene) {
  const gameEvents = scene?.game?.events;
  if (!gameEvents || activeMusic?.gameEvents === gameEvents) return;

  unregisterActiveMusicSettingsHandler();
  const settingsHandler = (settings) => updateMusicVolume(settings);
  gameEvents.on?.(SETTINGS_CHANGED_EVENT, settingsHandler);
  activeMusic.gameEvents = gameEvents;
  activeMusic.settingsHandler = settingsHandler;
}

function destroyManagedSound(sound) {
  sound?.stop?.();
  sound?.destroy?.();
}

function destroyActiveMusic() {
  unregisterActiveMusicSettingsHandler();
  destroyManagedSound(activeMusic?.sound);
  activeMusic = null;
}

export function playSfx(scene, key, options = {}) {
  const asset = getAudioAsset(key);
  if (!asset || asset.category !== 'sfx' || !scene?.sound?.play) return false;

  const settings = loadSettings();
  if (settings.muted) return false;
  if (!hasCachedAudioAsset(scene, asset.key)) return false;

  const now = getNow(scene);
  const cooldownMs = Number.isFinite(options.cooldownMs) ? options.cooldownMs : asset.cooldownMs;
  const lastPlayedAt = lastPlayedAtByKey.get(asset.key) ?? -Infinity;
  if (cooldownMs > 0 && now - lastPlayedAt < cooldownMs) return false;

  const volume = getSfxPlaybackVolume(settings, asset, options);
  if (volume <= 0) return false;

  try {
    scene.sound.play(asset.key, { ...options, volume });
    lastPlayedAtByKey.set(asset.key, now);
    return true;
  } catch (error) {
    if (import.meta.env?.DEV) {
      console.debug(`SFX playback skipped for ${asset.key}.`, error);
    }
    return false;
  }
}

export function playManagedSfx(scene, key, options = {}) {
  const asset = getAudioAsset(key);
  if (!asset || asset.category !== 'sfx' || !scene?.sound?.add) return null;

  const settings = loadSettings();
  if (settings.muted) return null;
  if (!hasCachedAudioAsset(scene, asset.key)) return null;

  const now = getNow(scene);
  const cooldownMs = Number.isFinite(options.cooldownMs) ? options.cooldownMs : asset.cooldownMs;
  const lastPlayedAt = lastPlayedAtByKey.get(asset.key) ?? -Infinity;
  if (cooldownMs > 0 && now - lastPlayedAt < cooldownMs) return null;

  const volume = getSfxPlaybackVolume(settings, asset, options);
  if (volume <= 0) return null;

  try {
    const sound = scene.sound.add(asset.key, { ...options, volume });
    sound.once?.('complete', () => destroyManagedSound(sound));
    if (sound.play?.() === false) {
      destroyManagedSound(sound);
      return null;
    }
    lastPlayedAtByKey.set(asset.key, now);
    return sound;
  } catch (error) {
    if (import.meta.env?.DEV) {
      console.debug(`Managed SFX playback skipped for ${asset.key}.`, error);
    }
    return null;
  }
}

export function stopManagedSfx(scene, sound, { fadeMs = 200 } = {}) {
  if (!sound) return false;

  const stopSound = () => destroyManagedSound(sound);
  const duration = Math.max(0, Number.isFinite(fadeMs) ? fadeMs : 0);
  if (duration > 0 && scene?.tweens?.add && sound.isPlaying) {
    scene.tweens.killTweensOf?.(sound);
    scene.tweens.add({
      targets: sound,
      volume: 0,
      duration,
      ease: 'Sine.easeOut',
      onComplete: stopSound,
    });
    return true;
  }

  stopSound();
  return true;
}

export function playMusic(scene, key, options = {}) {
  const asset = getAudioAsset(key);
  if (!asset || asset.category !== 'music' || !scene?.sound?.add) return null;

  const settings = loadSettings();
  if (!hasCachedAudioAsset(scene, asset.key)) return null;
  if (scene.sound) {
    scene.sound.mute = settings.muted;
    scene.sound.volume = 1;
  }

  if (activeMusic?.key === asset.key && activeMusic.sound && !activeMusic.sound.isDestroyed) {
    registerActiveMusicSettingsHandler(scene);
    updateMusicVolume(settings);
    if (!activeMusic.sound.isPlaying && !settings.muted) {
      try {
        activeMusic.sound.play?.();
      } catch (error) {
        if (import.meta.env?.DEV) {
          console.debug(`Music resume skipped for ${asset.key}.`, error);
        }
      }
    }
    return activeMusic.sound;
  }

  destroyActiveMusic();

  const volume = getMusicPlaybackVolume(settings, asset, options);
  try {
    const sound = scene.sound.add(asset.key, {
      ...options,
      loop: options.loop ?? asset.loop ?? true,
      volume,
    });
    activeMusic = { key: asset.key, sound, asset, options: { ...options } };
    registerActiveMusicSettingsHandler(scene);
    if (sound.play?.() === false) {
      destroyActiveMusic();
      return null;
    }
    return sound;
  } catch (error) {
    destroyActiveMusic();
    if (import.meta.env?.DEV) {
      console.debug(`Music playback skipped for ${asset.key}.`, error);
    }
    return null;
  }
}

export function updateMusicVolume(settings = loadSettings()) {
  if (!activeMusic?.sound || !activeMusic?.asset) return false;

  const volume = getMusicPlaybackVolume(settings, activeMusic.asset, activeMusic.options ?? {});
  if (typeof activeMusic.sound.setVolume === 'function') {
    activeMusic.sound.setVolume(volume);
  } else {
    activeMusic.sound.volume = volume;
  }
  return true;
}

export function stopMusic(scene, { fadeMs = 300 } = {}) {
  if (!activeMusic?.sound) {
    unregisterActiveMusicSettingsHandler();
    activeMusic = null;
    return false;
  }

  const sound = activeMusic.sound;
  const stopSound = () => {
    if (activeMusic?.sound === sound) {
      destroyActiveMusic();
      return;
    }
    destroyManagedSound(sound);
  };
  const duration = Math.max(0, Number.isFinite(fadeMs) ? fadeMs : 0);
  if (duration > 0 && scene?.tweens?.add && sound.isPlaying) {
    scene.tweens.killTweensOf?.(sound);
    scene.tweens.add({
      targets: sound,
      volume: 0,
      duration,
      ease: 'Sine.easeOut',
      onComplete: stopSound,
    });
    return true;
  }

  stopSound();
  return true;
}
