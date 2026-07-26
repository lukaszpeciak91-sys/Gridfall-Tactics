import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/rendering/logoRendering.js', 'utf8')
  .replace("import Phaser from 'phaser';", 'const Phaser = { Textures: { FilterMode: { LINEAR: 0 } } };')
  .replace("import { getRenderDevicePixelRatio } from './highDpiCanvas.js';", 'const getRenderDevicePixelRatio = () => 1;');
const rendering = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

const SOURCE_KEY = 'ui.logo.gridfall';
const CACHE_KEY = 'ui.logo.gridfall.crisp.main-menu.240x80';

function texture({ image = { width: 240, height: 80 }, frame = { width: 240, height: 80 }, sourceEntry = true } = {}) {
  return {
    source: sourceEntry ? [{ image }] : [],
    getSourceImage: () => image,
    get: () => frame,
    setFilter() {},
  };
}

function harness({ derived = null, includeSource = true } = {}) {
  const entries = new Map();
  if (includeSource) entries.set(SOURCE_KEY, texture({ image: { width: 1200, height: 400 }, frame: { width: 1200, height: 400 } }));
  if (derived) entries.set(CACHE_KEY, derived);
  const calls = { addCanvas: 0, remove: [], setTexture: [], setDisplaySize: [], canvases: 0 };
  const textures = {
    exists: (key) => entries.has(key),
    get: (key) => entries.get(key),
    remove: (key) => { calls.remove.push(key); entries.delete(key); },
    addCanvas: (key, canvas) => {
      calls.addCanvas += 1;
      const added = texture({ image: canvas, frame: { width: canvas.width, height: canvas.height } });
      entries.set(key, added);
      return added;
    },
  };
  const logo = {
    setTexture: (key) => calls.setTexture.push(key),
    setDisplaySize: (width, height) => calls.setDisplaySize.push([width, height]),
  };
  return { calls, entries, logo, scene: { textures } };
}

const originalDocument = globalThis.document;
test.before(() => {
  globalThis.document = {
    createElement: (tag) => {
      assert.equal(tag, 'canvas');
      return {
        width: 0,
        height: 0,
        getContext: () => ({
          clearRect() {},
          drawImage() {},
          imageSmoothingEnabled: false,
          imageSmoothingQuality: 'low',
        }),
      };
    },
  };
});
test.after(() => {
  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
});

test('valid derived logo textures are reused without rebuilding', () => {
  const h = harness({ derived: texture() });
  rendering.setCrispLogoDisplaySize(h.scene, h.logo, SOURCE_KEY, 240, 80, 'main-menu');

  assert.deepEqual(h.calls.remove, []);
  assert.equal(h.calls.addCanvas, 0);
  assert.deepEqual(h.calls.setTexture, [CACHE_KEY]);
  assert.deepEqual(h.calls.setDisplaySize, [[240, 80]]);
});

for (const [name, derived] of [
  ['missing source entry', texture({ sourceEntry: false })],
  ['missing source image', texture({ image: null })],
  ['zero source width', texture({ image: { width: 0, height: 80 } })],
  ['zero source height', texture({ image: { width: 240, height: 0 } })],
  ['invalid frame width', texture({ frame: { width: Number.NaN, height: 80 } })],
  ['invalid frame height', texture({ frame: { width: 240, height: 0 } })],
]) {
  test(`invalid derived texture recovery rejects ${name}`, () => {
    const h = harness({ derived });
    const sourceBefore = h.entries.get(SOURCE_KEY);
    rendering.setCrispLogoDisplaySize(h.scene, h.logo, SOURCE_KEY, 240, 80, 'main-menu');

    assert.deepEqual(h.calls.remove, [CACHE_KEY], 'only the invalid derived key is removed');
    assert.equal(h.entries.get(SOURCE_KEY), sourceBefore, 'the cached binary source is retained');
    assert.equal(h.calls.addCanvas, 1, 'the derived canvas is regenerated once');
    assert.deepEqual(h.calls.setTexture, [CACHE_KEY], 'the existing logo receives the regenerated texture');
    assert.deepEqual(h.calls.setDisplaySize, [[240, 80]], 'display sizing is unchanged');
    assert.equal(h.scene.add, undefined, 'recovery does not create another GameObject');
    assert.equal(rendering.isCrispLogoTextureValid(h.scene.textures, CACHE_KEY), true);
  });
}

test('an absent source preserves the existing logo and display-size fallback without throwing', () => {
  const h = harness({ includeSource: false });
  assert.doesNotThrow(() => rendering.setCrispLogoDisplaySize(h.scene, h.logo, SOURCE_KEY, 240, 80, 'main-menu'));
  assert.deepEqual(h.calls.remove, []);
  assert.equal(h.calls.addCanvas, 0);
  assert.deepEqual(h.calls.setTexture, []);
  assert.deepEqual(h.calls.setDisplaySize, [[240, 80]]);
});

test('menu scenes retain one centralized title creation call and fallback', () => {
  for (const path of ['src/scenes/MainMenuScene.js', 'src/scenes/GameMenuScene.js']) {
    const sceneSource = fs.readFileSync(path, 'utf8');
    const createBody = sceneSource.slice(sceneSource.indexOf('  create('), sceneSource.indexOf('  createTitle('));
    assert.equal((createBody.match(/this\.title = this\.createTitle\(/g) ?? []).length, 1, `${path} should create one title`);
    assert.match(sceneSource, /return createLogoFallbackText\(/);
    assert.match(sceneSource, /setMainMenuLogoDisplaySize\(this, logo, width, height\)/);
  }
});
