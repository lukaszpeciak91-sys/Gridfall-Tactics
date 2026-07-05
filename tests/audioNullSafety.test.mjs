import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { isLiveSound, safeApplySoundManagerSettings, safeDestroy, safePlay, safeSetVolume, safeStop } from '../src/audio/audioSafety.js';

const read = (path) => readFileSync(path, 'utf8');

test('audio safety helpers no-op for null, destroyed, and unloaded sound backends', () => {
  assert.equal(isLiveSound(null), false);
  assert.equal(safeSetVolume(null, 0.5), false);
  assert.equal(safePlay(null), false);
  assert.equal(safeStop(null), false);
  assert.equal(safeDestroy(null), false);

  const destroyedSound = { destroyed: true, manager: {}, setVolume() { throw new Error('must not set volume'); } };
  assert.equal(isLiveSound(destroyedSound), false);
  assert.equal(safeSetVolume(destroyedSound, 0.5), false);

  const unloadedSound = { manager: {}, source: null, setVolume() { throw new TypeError('Cannot set properties of null'); } };
  assert.equal(isLiveSound(unloadedSound), false);
  assert.equal(safeSetVolume(unloadedSound, 0.5), false);
});

test('audio safety helpers preserve valid playback and volume paths', () => {
  let volume = 0;
  let played = false;
  let stopped = false;
  let destroyed = false;
  const sound = {
    manager: {},
    source: {},
    setVolume(nextVolume) { volume = nextVolume; },
    play() { played = true; return true; },
    stop() { stopped = true; },
    destroy() { destroyed = true; },
  };

  assert.equal(isLiveSound(sound), true);
  assert.equal(safeSetVolume(sound, 0.25), true);
  assert.equal(volume, 0.25);
  assert.equal(safePlay(sound), true);
  assert.equal(played, true);
  assert.equal(safeStop(sound), true);
  assert.equal(stopped, true);
  assert.equal(safeDestroy(sound), true);
  assert.equal(destroyed, true);
});

test('applying global audio settings tolerates a broken sound manager', () => {
  const brokenManager = {};
  Object.defineProperty(brokenManager, 'volume', {
    set() { throw new TypeError('Cannot set properties of null'); },
  });

  assert.doesNotThrow(() => safeApplySoundManagerSettings(brokenManager, { muted: false, volume: 1 }));
  assert.equal(safeApplySoundManagerSettings(brokenManager, { muted: false, volume: 1 }), false);
});

test('base-hit remains registered as an optional SFX that is guarded by cache checks', () => {
  const assets = read('src/audio/audioAssets.js');
  const playback = read('src/audio/audioPlayback.js');

  assert.match(assets, /BASE_HIT: 'base\.hit'/);
  assert.match(assets, /sfxPath\('base-hit\.mp3'\)/);
  assert.match(playback, /if \(!hasCachedAudioAsset\(scene, asset\.key\)\) return false;/);
  assert.match(playback, /if \(!hasCachedAudioAsset\(scene, asset\.key\)\) return null;/);
});
