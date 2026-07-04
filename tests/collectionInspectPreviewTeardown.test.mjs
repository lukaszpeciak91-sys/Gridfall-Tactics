import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/scenes/CollectionScene.js', import.meta.url), 'utf8');
const cardVisualSource = readFileSync(new URL('../src/rendering/cardVisualLayout.js', import.meta.url), 'utf8');

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
  scene.delayedCalls = [];
  scene.time = {
    delayedCall: (delay, callback) => {
      scene.delayedCalls.push({ delay, callback });
      return { remove() {} };
    },
  };
  return scene;
}

function createMockItem(name, options = {}) {
  return {
    name,
    scene: Object.hasOwn(options, 'scene') ? options.scene : {},
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
    nameText: createMockItem('nameText'),
    bodyText: createMockItem('bodyText'),
    art: createMockItem('art'),
    items: [],
    previewItems: [root, overlay, previewOnly],
    sourceX: 12,
    sourceY: 34,
    deactivateCalls: 0,
    deactivate() {
      this.deactivateCalls += 1;
      this.isActive = false;
    },
  };
  inspect.items = [root, inspect.background, inspect.label, inspect.nameText, inspect.bodyText, inspect.art];
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
  assert.ok(inspect.overlay.disabledCount > 0, 'overlay is disabled immediately');
  assert.ok(inspect.overlay.removedEvents.includes('*'));
  for (const item of [...new Set([...inspect.items, ...inspect.previewItems])]) {
    assert.ok(item.disabledCount > 0, `${item.name} should be disabled before tween completion`);
    assert.ok(item.removedEvents.includes('*'), `${item.name} listeners should be removed before tween completion`);
  }
  assert.equal(scene.tweenAdds.length, 2, 'close animation should remain scheduled');
  assert.equal(scene.delayedCalls.length, 1, 'fallback cleanup should guard interrupted close tweens');
  assert.equal(inspect.destroyCalls, 0, 'final destroy should wait for root tween completion');
});

test('Collection inspect final destroy uses shared preview destroy when available', () => {
  const scene = createHarness();
  const inspect = createInspectPreview();
  scene.inspectPreview = inspect;

  scene.destroyInspectPreview({ animate: true });
  scene.tweenAdds[0].onComplete();
  scene.delayedCalls[0].callback();

  assert.equal(inspect.destroyCalls, 1);
  assert.equal(inspect.root.destroyCount, 1);
  assert.equal(inspect.overlay.destroyCount, 1);
});

test('Collection inspect interrupted tween fallback destroys the disabled overlay', () => {
  const scene = createHarness();
  const inspect = createInspectPreview();
  scene.inspectPreview = inspect;

  scene.destroyInspectPreview({ animate: true });
  scene.delayedCalls[0].callback();

  assert.equal(inspect.destroyCalls, 1);
  assert.equal(inspect.overlay.destroyCount, 1);
  assert.equal(inspect.overlay.disabledCount > 0, true);
  assert.equal(inspect.overlay.removedEvents.includes('*'), true);
});

test('Collection inspect final destroy falls back to root destroy without shared destroy', () => {
  const scene = createHarness();
  const inspect = createInspectPreview({ includeDestroy: false });
  scene.inspectPreview = inspect;

  scene.destroyInspectPreview();

  assert.equal(inspect.root.destroyCount, 1);
  assert.equal(inspect.overlay.destroyCount, 1);
});

test('Collection inspect cleanup skips disableInteractive for scene-less stale objects without throwing', () => {
  const scene = createHarness();
  const root = createMockItem('staleRoot', { scene: undefined });
  const overlay = createMockItem('staleOverlay', { scene: undefined });
  const previewOnly = createMockItem('stalePreviewOnly', { scene: undefined });
  root.disableInteractive = () => { throw new Error('stale root disable should be skipped'); };
  overlay.disableInteractive = () => { throw new Error('stale overlay disable should be skipped'); };
  previewOnly.disableInteractive = () => { throw new Error('stale preview item disable should be skipped'); };
  scene.inspectPreview = {
    root,
    overlay,
    items: [root],
    previewItems: [root, overlay, previewOnly],
    sourceX: 12,
    sourceY: 34,
    deactivate() {
      throw new Error('stale shared deactivate should not abort cleanup');
    },
    destroy() {
      throw new Error('stale shared destroy should fall back safely');
    },
  };

  assert.doesNotThrow(() => scene.destroyInspectPreview());
  assert.equal(scene.inspectPreview, null);
  assert.ok(overlay.removedEvents.includes('*'));
  assert.equal(root.destroyCount, 1, 'root fallback destroy should still be attempted after stale shared destroy');
});

test('Collection inspect close is safe when called repeatedly or without an active preview', () => {
  const scene = createHarness();
  scene.inspectPreview = createInspectPreview();

  assert.doesNotThrow(() => scene.destroyInspectPreview({ animate: true }));
  assert.doesNotThrow(() => scene.destroyInspectPreview({ animate: true }));
  assert.doesNotThrow(() => scene.destroyInspectPreview());
});

test('shared card preview deactivate guards disableInteractive behind an active scene', () => {
  const start = cardVisualSource.indexOf('function deactivateCardPreviewView(view)');
  const end = cardVisualSource.indexOf('\nexport function drawStatSymbol', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const deactivateSource = cardVisualSource.slice(start, end);

  assert.match(deactivateSource, /if \(item\?\.scene\) \{\s*item\?\.disableInteractive\?\.\(\);\s*\}/);
  assert.match(deactivateSource, /item\?\.removeAllListeners\?\.\(\);/);
});
