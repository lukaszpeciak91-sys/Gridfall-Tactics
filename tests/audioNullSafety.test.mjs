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


const { AUDIO_KEYS } = await import('../src/audio/audioAssets.js');
const { playMusic, stopManagedSfx, stopMusic } = await import('../src/audio/audioPlayback.js');

function createTweenScene(sound, { cacheHit = true } = {}) {
  const addedTweens = [];
  const killedTargets = [];
  return {
    cache: {
      audio: {
        exists: () => cacheHit,
        has: () => cacheHit,
      },
    },
    sound: {
      mute: false,
      volume: 1,
      add: () => sound,
      play: () => true,
    },
    tweens: {
      add(config) {
        addedTweens.push(config);
        return config;
      },
      killTweensOf(target) {
        killedTargets.push(target);
      },
    },
    game: {
      events: {
        on() {},
        off() {},
      },
    },
    addedTweens,
    killedTargets,
  };
}

function createMockSound(overrides = {}) {
  return {
    manager: {},
    source: {},
    isPlaying: true,
    volume: 1,
    played: false,
    stopped: false,
    destroyedCalled: false,
    play() {
      this.played = true;
      return true;
    },
    stop() {
      this.stopped = true;
    },
    destroy() {
      this.destroyedCalled = true;
    },
    once() {},
    setVolume(nextVolume) {
      this.volume = nextVolume;
    },
    ...overrides,
  };
}

test('stopMusic fade uses a plain tween state and stale volume failures clean up safely', () => {
  let stopped = false;
  let destroyed = false;
  const sound = createMockSound({
    stop() { stopped = true; },
    destroy() { destroyed = true; },
    setVolume() { throw new TypeError("Cannot set properties of null (setting 'volume')"); },
  });
  const scene = createTweenScene(sound);

  assert.equal(playMusic(scene, AUDIO_KEYS.BATTLE_AMBIENCE), sound);
  assert.equal(stopMusic(scene, { fadeMs: 120 }), true);
  assert.equal(scene.addedTweens.length, 1);

  const tween = scene.addedTweens[0];
  assert.notEqual(tween.targets, sound);
  assert.equal(typeof tween.targets, 'object');
  assert.doesNotThrow(() => tween.onUpdate());
  assert.equal(stopped, true);
  assert.equal(destroyed, true);
  assert.equal(stopMusic(scene, { fadeMs: 0 }), false);
  assert.ok(scene.killedTargets.includes(sound));
  assert.ok(scene.killedTargets.includes(tween.targets));
});

test('stopManagedSfx fade uses a plain tween state and stale volume failures clean up safely', () => {
  let stopped = false;
  let destroyed = false;
  const sound = createMockSound({
    stop() { stopped = true; },
    destroy() { destroyed = true; },
    setVolume() { throw new TypeError("Cannot set properties of null (setting 'volume')"); },
  });
  const scene = createTweenScene(sound);

  assert.equal(stopManagedSfx(scene, sound, { fadeMs: 80 }), true);
  assert.equal(scene.addedTweens.length, 1);

  const tween = scene.addedTweens[0];
  assert.notEqual(tween.targets, sound);
  assert.doesNotThrow(() => tween.onUpdate());
  assert.equal(stopped, true);
  assert.equal(destroyed, true);
  assert.ok(scene.killedTargets.includes(sound));
  assert.ok(scene.killedTargets.includes(tween.targets));
});

test('valid managed SFX fade updates volume through safe volume writes and completes cleanup', () => {
  const volumes = [];
  let stopped = false;
  let destroyed = false;
  const sound = createMockSound({
    volume: 0.75,
    setVolume(nextVolume) {
      volumes.push(nextVolume);
      this.volume = nextVolume;
    },
    stop() { stopped = true; },
    destroy() { destroyed = true; },
  });
  const scene = createTweenScene(sound);

  assert.equal(stopManagedSfx(scene, sound, { fadeMs: 80 }), true);
  const tween = scene.addedTweens[0];
  assert.notEqual(tween.targets, sound);

  tween.targets.volume = 0.25;
  assert.doesNotThrow(() => tween.onUpdate());
  assert.deepEqual(volumes, [0.25]);
  assert.equal(stopped, false);
  assert.equal(destroyed, false);

  assert.doesNotThrow(() => tween.onComplete());
  assert.equal(stopped, true);
  assert.equal(destroyed, true);
});
