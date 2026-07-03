import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/scenes/CollectionScene.js', import.meta.url), 'utf8');

function extractMethodBlock(name, nextName) {
  const start = source.indexOf(`\n  ${name}(`);
  const end = source.indexOf(`\n  ${nextName}(`, start + 1);
  if (start < 0 || end < 0) throw new Error(`Failed to extract ${name}`);
  return source.slice(start, end);
}

function createHarness() {
  const Harness = new Function(`
    const INSPECT_CARD_TWEEN_OUT_MS = 95;
    return class CollectionInspectTeardownHarness {
${extractMethodBlock('destroyInspectPreview', 'createBackButton')}
    };
  `)();
  const scene = new Harness();
  scene.tweenAdds = [];
  scene.tweens = {
    killTweensOf: (items) => { scene.killTweensOfItems = items; },
    add: (config) => {
      scene.tweenAdds.push(config);
      return { stop() {} };
    },
  };
  return scene;
}

function createMockItem(name) {
  return {
    name,
    active: true,
    disabledCount: 0,
    removedEvents: [],
    destroyCount: 0,
    disableInteractive() { this.disabledCount += 1; this.input = null; return this; },
    removeAllListeners(event) { this.removedEvents.push(event ?? '*'); return this; },
    destroy() { this.destroyCount += 1; this.destroyed = true; this.active = false; return this; },
  };
}

function createInspectPreview({ includeDestroy = true } = {}) {
  const root = createMockItem('root');
  const overlay = createMockItem('overlay');
  const previewOnly = createMockItem('previewOnly');
  const inspect = {
    root,
    overlay,
    glow: createMockItem('glow'),
    background: createMockItem('background'),
    label: createMockItem('label'),
    previewItems: [root, overlay, previewOnly],
    sourceX: 12,
    sourceY: 34,
    deactivateCalls: 0,
    deactivate() {
      this.deactivateCalls += 1;
      this.isActive = false;
    },
  };
  if (includeDestroy) {
    inspect.destroyCalls = 0;
    inspect.destroy = () => {
      inspect.destroyCalls += 1;
      inspect.root.destroy();
    };
  }
  return inspect;
}

test('animated Collection inspect close deactivates preview and overlay immediately', () => {
  const scene = createHarness();
  const inspect = createInspectPreview();
  scene.inspectPreview = inspect;

  scene.destroyInspectPreview({ animate: true });

  assert.equal(scene.inspectPreview, null);
  assert.equal(inspect.deactivateCalls, 1);
  assert.equal(inspect.overlay.disabledCount, 2, 'overlay is disabled directly and as a preview item');
  assert.ok(inspect.overlay.removedEvents.includes('*'));
  for (const item of inspect.previewItems) {
    assert.ok(item.disabledCount > 0, `${item.name} should be disabled before tween completion`);
    assert.ok(item.removedEvents.includes('*'), `${item.name} listeners should be removed before tween completion`);
  }
  assert.equal(scene.tweenAdds.length, 2, 'close animation should remain scheduled');
  assert.equal(inspect.destroyCalls, 0, 'final destroy should wait for root tween completion');
});

test('Collection inspect final destroy uses shared preview destroy when available', () => {
  const scene = createHarness();
  const inspect = createInspectPreview();
  scene.inspectPreview = inspect;

  scene.destroyInspectPreview({ animate: true });
  scene.tweenAdds[0].onComplete();

  assert.equal(inspect.destroyCalls, 1);
  assert.equal(inspect.root.destroyCount, 1);
  assert.equal(inspect.overlay.destroyCount, 1);
});

test('Collection inspect final destroy falls back to root destroy without shared destroy', () => {
  const scene = createHarness();
  const inspect = createInspectPreview({ includeDestroy: false });
  scene.inspectPreview = inspect;

  scene.destroyInspectPreview();

  assert.equal(inspect.root.destroyCount, 1);
  assert.equal(inspect.overlay.destroyCount, 1);
});

test('Collection inspect close is safe when called repeatedly or without an active preview', () => {
  const scene = createHarness();
  scene.inspectPreview = createInspectPreview();

  assert.doesNotThrow(() => scene.destroyInspectPreview({ animate: true }));
  assert.doesNotThrow(() => scene.destroyInspectPreview({ animate: true }));
  assert.doesNotThrow(() => scene.destroyInspectPreview());
});
