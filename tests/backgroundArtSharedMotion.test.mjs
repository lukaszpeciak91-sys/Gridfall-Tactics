import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateMenuAmbientTransform,
  calculateSharedYoyoPhase,
} from '../src/rendering/backgroundArt.js';

function createScene(now = 0, registryStore = new Map()) {
  return {
    game: {
      loop: { time: now },
      registry: {
        get: (key) => registryStore.get(key),
        set: (key, value) => registryStore.set(key, value),
      },
    },
  };
}

test('menu ambient phase is derived from a shared game-level epoch', () => {
  const registryStore = new Map();
  const firstScene = createScene(1000, registryStore);

  const initial = calculateSharedYoyoPhase({ scene: firstScene, duration: 12000 });
  assert.equal(initial.elapsed, 0);

  const outgoingScene = createScene(7000, registryStore);
  const incomingScene = createScene(7000, registryStore);

  const outgoing = calculateMenuAmbientTransform({
    scene: outgoingScene,
    width: 1000,
    height: 800,
    baseScale: 2,
    driftOptions: {
      scaleMultiplier: 1.08,
      x: 14,
      y: -36,
      duration: 12000,
      ease: 'Sine.easeInOut',
    },
  });
  const incoming = calculateMenuAmbientTransform({
    scene: incomingScene,
    width: 1000,
    height: 800,
    baseScale: 2,
    driftOptions: {
      scaleMultiplier: 1.08,
      x: 14,
      y: -36,
      duration: 12000,
      ease: 'Sine.easeInOut',
    },
  });

  assert.deepEqual(incoming, outgoing);
  assert.notEqual(outgoing.x, 500);
  assert.notEqual(outgoing.y, 400);
  assert.notEqual(outgoing.scale, 2);
});

test('shared menu ambient phase preserves yoyo direction after the forward half', () => {
  const registryStore = new Map();
  calculateSharedYoyoPhase({ scene: createScene(0, registryStore), duration: 12000 });

  const phase = calculateSharedYoyoPhase({
    scene: createScene(15000, registryStore),
    duration: 12000,
  });

  assert.equal(phase.reversed, true);
  assert.equal(phase.linearProgress, 0.75);
  assert.ok(phase.easedProgress > 0.5);
  assert.ok(phase.easedProgress < 1);
});
