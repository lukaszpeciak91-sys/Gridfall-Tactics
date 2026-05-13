import Phaser from 'phaser';
import { SETTINGS_STORAGE_KEY, normalizeLocale } from '../localization/localeService.js';

export const SETTINGS_CHANGED_EVENT = 'gridfall:settings:changed';
export const DEFAULT_SETTINGS = {
  language: 'en',
  musicVolume: 50,
  sfxVolume: 50,
  muted: false,
};

export function getLocalStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    console.warn('Settings localStorage is unavailable; changes remain in memory only.', error);
    return null;
  }
}

export function clampVolume(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return DEFAULT_SETTINGS.musicVolume;
  }

  return Phaser.Math.Clamp(Math.round(numericValue), 0, 100);
}

export function normalizeSettings(settings = {}) {
  return {
    language: normalizeLocale(settings.language),
    musicVolume: clampVolume(settings.musicVolume),
    sfxVolume: clampVolume(settings.sfxVolume),
    muted: Boolean(settings.muted),
  };
}

export function readStoredSettings() {
  const storage = getLocalStorage();
  if (!storage) {
    return {};
  }

  try {
    const rawSettings = storage.getItem(SETTINGS_STORAGE_KEY);
    return rawSettings ? JSON.parse(rawSettings) : {};
  } catch (error) {
    console.warn('Settings localStorage read failed; defaults will be used.', error);
    return {};
  }
}

export function loadSettings() {
  return normalizeSettings({ ...DEFAULT_SETTINGS, ...readStoredSettings() });
}

export function saveSettings(settings) {
  const normalizedSettings = normalizeSettings({ ...DEFAULT_SETTINGS, ...settings });
  const storage = getLocalStorage();
  if (storage) {
    try {
      storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalizedSettings));
    } catch (error) {
      console.warn('Settings localStorage write failed; changes remain in memory only.', error);
    }
  }

  return normalizedSettings;
}

export function applyAudioSettings(scene, settings = loadSettings()) {
  if (scene?.sound) {
    scene.sound.mute = settings.muted;
    if (Number.isFinite(settings.musicVolume)) {
      scene.sound.volume = settings.musicVolume / 100;
    }
  }
}

export function emitSettingsChanged(scene, settings) {
  scene?.game?.events?.emit?.(SETTINGS_CHANGED_EVENT, settings);
}

export function updateSettings(scene, nextSettings) {
  const settings = saveSettings(nextSettings);
  applyAudioSettings(scene, settings);
  emitSettingsChanged(scene, settings);
  return settings;
}

export function setMuted(scene, muted) {
  const currentSettings = loadSettings();
  return updateSettings(scene, { ...currentSettings, muted: Boolean(muted) });
}

export function toggleMuted(scene) {
  const currentSettings = loadSettings();
  return setMuted(scene, !currentSettings.muted);
}
