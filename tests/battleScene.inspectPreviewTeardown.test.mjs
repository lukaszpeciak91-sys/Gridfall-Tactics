import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

function extractMethodBlock(name, nextName) {
  const start = source.indexOf(`\n  ${name}(`);
  const end = source.indexOf(`\n  ${nextName}(`, start + 1);
  if (start < 0 || end < 0) throw new Error(`Failed to extract ${name}`);
  return source.slice(start, end);
}

function createHarness() {
  const Harness = new Function(`
    const INSPECT_CARD_TWEEN_OUT_MS = 95;
    return class InspectTeardownHarness {
${extractMethodBlock('disableCardViewInteractions', 'disableCardHoverInteractions')}
${extractMethodBlock('deactivateInspectPreviewView', 'getHandCardAccentColor')}
${extractMethodBlock('destroySelectedHandCardZoom', 'getInspectCardTransform')}
      restoreInspectDimming() { this.restoreInspectDimmingCalls = (this.restoreInspectDimmingCalls ?? 0) + 1; }
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
    disableInteractive() { this.disabledCount += 1; this.input = null; return this; },
    removeAllListeners(event) { this.removedEvents.push(event ?? '*'); return this; },
    destroy() { this.destroyed = true; this.active = false; return this; },
  };
}

function createInspectView() {
  const root = createMockItem('root');
  const overlay = createMockItem('overlay');
  const background = createMockItem('background');
  const label = createMockItem('label');
  const nameText = createMockItem('nameText');
  const bodyText = createMockItem('bodyText');
  const itemOnly = createMockItem('itemOnly');
  const previewOnly = createMockItem('previewOnly');
  const inspect = {
    root,
    overlay,
    background,
    label,
    nameText,
    bodyText,
    glow: createMockItem('glow'),
    selectionOutline: createMockItem('selectionOutline'),
    statBadges: createMockItem('statBadges'),
    art: createMockItem('art'),
    items: [root, background, label, nameText, bodyText, itemOnly],
    previewItems: [root, overlay, previewOnly],
    sourceX: 12,
    sourceY: 34,
    deactivateCalls: 0,
    deactivate() {
      this.deactivateCalls += 1;
      this.isActive = false;
      this.items.forEach((item) => item.disableInteractive());
    },
  };
  return inspect;
}

const pointerEvents = ['pointerover', 'pointerout', 'pointerdown', 'pointerup', 'pointermove', 'pointercancel'];

test('animated inspect close deactivates preview interactions immediately before tween completion', () => {
  const scene = createHarness();
  const inspect = createInspectView();
  scene.selectedHandCardZoom = inspect;

  scene.destroySelectedHandCardZoom({ animate: true });

  assert.equal(scene.selectedHandCardZoom, null);
  assert.equal(inspect.isActive, false);
  assert.equal(inspect.deactivateCalls, 1);
  assert.equal(scene.tweenAdds.length, 2, 'close animation should remain scheduled');

  const tracked = [...new Set([
    ...inspect.items,
    inspect.root,
    inspect.overlay,
    inspect.background,
    inspect.label,
    inspect.nameText,
    inspect.bodyText,
    inspect.glow,
    inspect.selectionOutline,
    inspect.statBadges,
    inspect.art,
    ...inspect.previewItems,
  ])];

  for (const item of tracked) {
    assert.ok(item.disabledCount > 0, `${item.name} should be disabled before tween completion`);
    for (const event of pointerEvents) {
      assert.ok(item.removedEvents.includes(event), `${item.name} should remove ${event} listeners`);
    }
  }
});

test('stale pointer transition after animated inspect close is a no-op and cannot mutate preview text', () => {
  const scene = createHarness();
  const inspect = createInspectView();
  let textMutationCount = 0;
  inspect.nameText.setShadow = () => { textMutationCount += 1; throw new Error('stale text mutation'); };
  inspect.bodyText.setShadow = () => { textMutationCount += 1; throw new Error('stale text mutation'); };
  scene.selectedHandCardZoom = inspect;

  assert.doesNotThrow(() => scene.destroySelectedHandCardZoom({ animate: true }));

  for (const item of [inspect.background, inspect.label, inspect.nameText, inspect.bodyText]) {
    const overHandlersWereRemoved = item.removedEvents.includes('pointerover') && item.removedEvents.includes('pointerout');
    assert.equal(overHandlersWereRemoved, true, `${item.name} pointer transitions should be removed`);
  }
  assert.equal(textMutationCount, 0);
});

test('inspect close is safe when called repeatedly or without an active preview', () => {
  const scene = createHarness();
  scene.selectedHandCardZoom = createInspectView();

  assert.doesNotThrow(() => scene.destroySelectedHandCardZoom({ animate: true }));
  assert.doesNotThrow(() => scene.destroySelectedHandCardZoom({ animate: true }));
  assert.doesNotThrow(() => scene.destroySelectedHandCardZoom());
});
