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
