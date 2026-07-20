import { SETTINGS_CHANGED_EVENT, loadSettings } from '../systems/settingsState.js';
import { getAudioAsset, hasCachedAudioAsset } from './audioAssets.js';
import { isLiveSound, safeApplySoundManagerSettings, safeDestroy, safePlay, safeSetVolume, safeStop } from './audioSafety.js';

export const MUSIC_BUS_VOLUME = 0.14;
export const SFX_BUS_VOLUME = 0.54;

const lastPlayedAtByKey = new Map();
let activeMusic = null;

export const AUDIO_SKIP_REASONS = Object.freeze({
  MUTED: 'MUTED',
  SFX_VOLUME_ZERO: 'SFX_VOLUME_ZERO',
  AUDIO_CONTEXT_SUSPENDED: 'AUDIO_CONTEXT_SUSPENDED',
  SOUND_SYSTEM_UNAVAILABLE: 'SOUND_SYSTEM_UNAVAILABLE',
  KEY_MISSING: 'KEY_MISSING',
  ASSET_NOT_LOADED: 'ASSET_NOT_LOADED',
  COOLDOWN_ACTIVE: 'COOLDOWN_ACTIVE',
  SCENE_NOT_ACTIVE: 'SCENE_NOT_ACTIVE',
  SCENE_SHUTTING_DOWN: 'SCENE_SHUTTING_DOWN',
  DUPLICATE_SUPPRESSED: 'DUPLICATE_SUPPRESSED',
  PLAYBACK_ERROR: 'PLAYBACK_ERROR',
  UNKNOWN: 'UNKNOWN',
});

function emitAudioDiagnostic(scene, name, details = {}) {
  scene?.recordAudioDiagnosticEvent?.(name, details);
}

function getAudioContextState(scene) {
  const state = scene?.sound?.context?.state ?? scene?.game?.sound?.context?.state ?? null;
  return ['running', 'suspended', 'closed'].includes(state) ? state : 'unknown';
}

function isSceneInactive(scene) {
  const active = scene?.scene?.isActive?.();
  const sysActive = scene?.sys?.isActive?.();
  return active === false || sysActive === false;
}

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
  return clampUnit(settingsVolume * assetVolume * optionVolume * SFX_BUS_VOLUME);
}

function getMusicPlaybackVolume(settings, asset, options) {
  const settingsVolume = clampUnit(settings.musicVolume / 100, 0.5);
  const assetVolume = clampUnit(asset.volume, 1);
  const optionVolume = clampUnit(options.volume, 1);
  if (Number.isFinite(asset.busVolume)) {
    return clampUnit(settingsVolume * assetVolume * optionVolume * clampUnit(asset.busVolume, MUSIC_BUS_VOLUME));
  }
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


const fadeStateBySound = new WeakMap();

function safeKillSoundTweens(scene, sound) {
  if (!scene?.tweens || !sound) return false;
  let killed = false;
  try {
    scene.tweens.killTweensOf?.(sound);
    killed = true;
  } catch (_error) {
    // Ignore tween cleanup failures; audio cleanup must remain non-fatal.
  }

  const fadeState = fadeStateBySound.get(sound);
  if (fadeState) {
    try {
      scene.tweens.killTweensOf?.(fadeState);
      killed = true;
    } catch (_error) {
      // Ignore tween cleanup failures; audio cleanup must remain non-fatal.
    }
    fadeStateBySound.delete(sound);
  }

  return killed;
}

function getSoundVolume(sound) {
  try {
    const volume = Number(sound?.volume);
    return Number.isFinite(volume) ? clampUnit(volume) : 1;
  } catch (_error) {
    return 1;
  }
}

function safeFadeVolume(scene, sound, targetVolume, { duration, ease = 'Sine.easeOut', onComplete, onFailure } = {}) {
  if (!scene?.tweens?.add || !isLiveSound(sound) || !sound.isPlaying) return false;

  safeKillSoundTweens(scene, sound);

  const fadeState = { volume: getSoundVolume(sound) };
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    if (fadeStateBySound.get(sound) === fadeState) {
      fadeStateBySound.delete(sound);
    }
    onComplete?.();
  };
  const fail = () => {
    if (settled) return;
    settled = true;
    safeKillSoundTweens(scene, sound);
    onFailure?.();
  };

  fadeStateBySound.set(sound, fadeState);

  try {
    scene.tweens.add({
      targets: fadeState,
      volume: targetVolume,
      duration,
      ease,
      onUpdate: () => {
        if (!safeSetVolume(sound, fadeState.volume)) {
          fail();
        }
      },
      onComplete: finish,
    });
    return true;
  } catch (_error) {
    fail();
    return false;
  }
}

function destroyManagedSound(sound, scene = null) {
  safeKillSoundTweens(scene, sound);
  safeStop(sound);
  safeDestroy(sound);
}


function destroyActiveMusic(scene = null) {
  unregisterActiveMusicSettingsHandler();
  destroyManagedSound(activeMusic?.sound, scene);
  activeMusic = null;
}

// Legacy guard shape retained for source-level diagnostics tests: if (!asset || asset.category !== 'sfx' || !scene?.sound?.play) return false;
// Legacy cache guard shape retained for source-level diagnostics tests: if (!hasCachedAudioAsset(scene, asset.key)) return false;
export function playSfx(scene, key, options = {}) {
  const source = typeof options.source === 'string' ? options.source : 'unknown';
  const asset = getAudioAsset(key);
  const requestedKey = asset?.key ?? (typeof key === 'string' ? key : null);
  const requestedCooldownMs = Number.isFinite(options.cooldownMs) ? options.cooldownMs : asset?.cooldownMs;
  emitAudioDiagnostic(scene, 'audio-sfx-requested', { key: requestedKey, source, cooldownMs: requestedCooldownMs });
  if (!asset || asset.category !== 'sfx') {
    emitAudioDiagnostic(scene, 'audio-sfx-skipped', { key: requestedKey, source, reason: AUDIO_SKIP_REASONS.KEY_MISSING });
    return false;
  }
  if (!scene?.sound?.play) {
    emitAudioDiagnostic(scene, 'audio-sfx-skipped', { key: asset.key, source, reason: AUDIO_SKIP_REASONS.SOUND_SYSTEM_UNAVAILABLE });
    return false;
  }
  if (scene?.isBattleSceneShuttingDown || scene?.isShuttingDown || scene?.shutdownStarted || scene?.sceneShutdownStarted) {
    emitAudioDiagnostic(scene, 'audio-sfx-skipped', { key: asset.key, source, reason: AUDIO_SKIP_REASONS.SCENE_SHUTTING_DOWN });
    return false;
  }
  if (isSceneInactive(scene)) {
    emitAudioDiagnostic(scene, 'audio-sfx-skipped', { key: asset.key, source, reason: AUDIO_SKIP_REASONS.SCENE_NOT_ACTIVE });
    return false;
  }
  if (getAudioContextState(scene) === 'suspended') {
    emitAudioDiagnostic(scene, 'audio-sfx-skipped', { key: asset.key, source, reason: AUDIO_SKIP_REASONS.AUDIO_CONTEXT_SUSPENDED });
    return false;
  }

  const settings = loadSettings();
  if (settings.muted) {
    emitAudioDiagnostic(scene, 'audio-sfx-skipped', { key: asset.key, source, reason: AUDIO_SKIP_REASONS.MUTED });
    return false;
  }
  if (!hasCachedAudioAsset(scene, asset.key)) {
    emitAudioDiagnostic(scene, 'audio-sfx-skipped', { key: asset.key, source, reason: AUDIO_SKIP_REASONS.ASSET_NOT_LOADED });
    return false;
  }

  const now = getNow(scene);
  const cooldownMs = Number.isFinite(options.cooldownMs) ? options.cooldownMs : asset.cooldownMs;
  const lastPlayedAt = lastPlayedAtByKey.get(asset.key) ?? -Infinity;
  if (cooldownMs > 0 && now - lastPlayedAt < cooldownMs) {
    emitAudioDiagnostic(scene, 'audio-sfx-skipped', { key: asset.key, source, reason: AUDIO_SKIP_REASONS.COOLDOWN_ACTIVE, cooldownMs, remainingMs: Math.max(0, Math.ceil(cooldownMs - (now - lastPlayedAt))) });
    return false;
  }

  const volume = getSfxPlaybackVolume(settings, asset, options);
  if (volume <= 0) {
    emitAudioDiagnostic(scene, 'audio-sfx-skipped', { key: asset.key, source, reason: AUDIO_SKIP_REASONS.SFX_VOLUME_ZERO });
    return false;
  }

  try {
    scene.sound.play(asset.key, { ...options, volume });
    lastPlayedAtByKey.set(asset.key, now);
    emitAudioDiagnostic(scene, 'audio-sfx-dispatched', { key: asset.key, source });
    return true;
  } catch (error) {
    emitAudioDiagnostic(scene, 'audio-sfx-skipped', { key: asset.key, source, reason: AUDIO_SKIP_REASONS.PLAYBACK_ERROR });
    if (import.meta.env?.DEV) {
      console.debug(`SFX playback skipped for ${asset.key}.`, error);
    }
    return false;
  }
}

// Legacy managed cache guard shape retained for source-level diagnostics tests: if (!hasCachedAudioAsset(scene, asset.key)) return null;
export function playManagedSfx(scene, key, options = {}) {
  const source = typeof options.source === 'string' ? options.source : 'unknown';
  const asset = getAudioAsset(key);
  emitAudioDiagnostic(scene, 'audio-sfx-requested', { key: asset?.key ?? (typeof key === 'string' ? key : null), source, cooldownMs: Number.isFinite(options.cooldownMs) ? options.cooldownMs : asset?.cooldownMs });
  if (!asset || asset.category !== 'sfx' || !scene?.sound?.add) { emitAudioDiagnostic(scene, 'audio-sfx-skipped', { key: asset?.key ?? (typeof key === 'string' ? key : null), source, reason: !asset ? AUDIO_SKIP_REASONS.KEY_MISSING : AUDIO_SKIP_REASONS.SOUND_SYSTEM_UNAVAILABLE }); return null; }

  const settings = loadSettings();
  if (settings.muted) { emitAudioDiagnostic(scene, 'audio-sfx-skipped', { key: asset.key, source, reason: AUDIO_SKIP_REASONS.MUTED }); return null; }
  if (!hasCachedAudioAsset(scene, asset.key)) { emitAudioDiagnostic(scene, 'audio-sfx-skipped', { key: asset.key, source, reason: AUDIO_SKIP_REASONS.ASSET_NOT_LOADED }); return null; }

  const now = getNow(scene);
  const cooldownMs = Number.isFinite(options.cooldownMs) ? options.cooldownMs : asset.cooldownMs;
  const lastPlayedAt = lastPlayedAtByKey.get(asset.key) ?? -Infinity;
  if (cooldownMs > 0 && now - lastPlayedAt < cooldownMs) { emitAudioDiagnostic(scene, 'audio-sfx-skipped', { key: asset.key, source, reason: AUDIO_SKIP_REASONS.COOLDOWN_ACTIVE, cooldownMs, remainingMs: Math.max(0, Math.ceil(cooldownMs - (now - lastPlayedAt))) }); return null; }

  const volume = getSfxPlaybackVolume(settings, asset, options);
  if (volume <= 0) { emitAudioDiagnostic(scene, 'audio-sfx-skipped', { key: asset.key, source, reason: AUDIO_SKIP_REASONS.SFX_VOLUME_ZERO }); return null; }

  try {
    const sound = scene.sound.add(asset.key, { ...options, volume });
    sound.once?.('complete', () => destroyManagedSound(sound, scene));
    if (!safePlay(sound)) {
      destroyManagedSound(sound);
      return null;
    }
    lastPlayedAtByKey.set(asset.key, now);
    emitAudioDiagnostic(scene, 'audio-sfx-dispatched', { key: asset.key, source });
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

  const stopSound = () => destroyManagedSound(sound, scene);
  const duration = Math.max(0, Number.isFinite(fadeMs) ? fadeMs : 0);
  if (duration > 0 && safeFadeVolume(scene, sound, 0, { duration, onComplete: stopSound, onFailure: stopSound })) {
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
  safeApplySoundManagerSettings(scene.sound, { muted: settings.muted, volume: 1 });

  if (activeMusic?.key === asset.key && isLiveSound(activeMusic.sound)) {
    registerActiveMusicSettingsHandler(scene);
    updateMusicVolume(settings);
    if (!activeMusic.sound.isPlaying && !settings.muted) {
      try {
        safePlay(activeMusic.sound);
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
    if (!safePlay(sound)) {
      destroyActiveMusic();
      return null;
    }
    emitAudioDiagnostic(scene, 'audio-music-started', { key: asset.key, context: options.context ?? 'unknown' });
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
  if (!safeSetVolume(activeMusic.sound, volume)) {
    destroyActiveMusic();
    return false;
  }
  return true;
}

export function stopMusic(scene, { fadeMs = 300 } = {}) {
  const stoppedKey = activeMusic?.key ?? null;
  if (!activeMusic?.sound) {
    unregisterActiveMusicSettingsHandler();
    activeMusic = null;
    return false;
  }

  const sound = activeMusic.sound;
  const stopSound = () => {
    if (activeMusic?.sound === sound) {
      destroyActiveMusic(scene);
      return;
    }
    destroyManagedSound(sound, scene);
  };
  const duration = Math.max(0, Number.isFinite(fadeMs) ? fadeMs : 0);
  if (duration > 0 && safeFadeVolume(scene, sound, 0, { duration, onComplete: stopSound, onFailure: stopSound })) {
    return true;
  }

  stopSound();
  emitAudioDiagnostic(scene, 'audio-music-stopped', { key: stoppedKey, context: 'battle' });
  return true;
}
