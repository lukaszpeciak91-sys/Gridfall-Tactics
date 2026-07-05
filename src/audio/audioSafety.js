function isSoundObject(sound) {
  if (!sound || sound.destroyed || sound.isDestroyed || sound.pendingRemove) return false;
  if (sound.manager == null && sound.soundManager == null) return false;
  return true;
}

export function isLiveSound(sound) {
  if (!isSoundObject(sound)) return false;
  if ('source' in sound && sound.source == null) return false;
  if ('audio' in sound && sound.audio == null) return false;
  return true;
}

export function safeSetVolume(sound, volume) {
  if (!isLiveSound(sound)) return false;
  try {
    if (typeof sound.setVolume === 'function') {
      sound.setVolume(volume);
    } else if ('volume' in sound) {
      sound.volume = volume;
    } else {
      return false;
    }
    return true;
  } catch (_error) {
    return false;
  }
}

export function safePlay(sound, config) {
  if (!isSoundObject(sound) || typeof sound.play !== 'function') return false;
  try {
    return sound.play(config) !== false;
  } catch (_error) {
    return false;
  }
}

export function safeStop(sound) {
  if (!sound || sound.destroyed || sound.isDestroyed) return false;
  if (typeof sound.stop !== 'function') return false;
  try {
    sound.stop();
    return true;
  } catch (_error) {
    return false;
  }
}

export function safeDestroy(sound) {
  if (!sound || sound.destroyed || sound.isDestroyed) return false;
  if (typeof sound.destroy !== 'function') return false;
  try {
    sound.destroy();
    return true;
  } catch (_error) {
    return false;
  }
}

export function safeApplySoundManagerSettings(soundManager, { muted, volume } = {}) {
  if (!soundManager) return false;
  try {
    if (muted != null) soundManager.mute = Boolean(muted);
    if (volume != null) soundManager.volume = volume;
    return true;
  } catch (_error) {
    return false;
  }
}
