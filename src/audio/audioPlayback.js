import { loadSettings } from '../systems/settingsState.js';
import { getAudioAsset, hasCachedAudioAsset } from './audioAssets.js';

const lastPlayedAtByKey = new Map();

function getNow(scene) {
  return scene?.time?.now ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
}

function clampUnit(value, fallback = 1) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.max(0, Math.min(1, numericValue));
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

  const settingsVolume = clampUnit(settings.sfxVolume / 100, 0.5);
  const optionVolume = clampUnit(options.volume, 1);
  const volume = settingsVolume * optionVolume;
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

function destroyManagedSound(sound) {
  sound?.stop?.();
  sound?.destroy?.();
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

  const settingsVolume = clampUnit(settings.sfxVolume / 100, 0.5);
  const optionVolume = clampUnit(options.volume, 1);
  const volume = settingsVolume * optionVolume;
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
