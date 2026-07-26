import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

function loadGameMenuSceneHarness({ activeCampaign = true, transitionResult = { transitionId: 'test-transition' } } = {}) {
  let campaignActive = activeCampaign;
  let clearCount = 0;
  const transitions = [];
  const source = fs.readFileSync('src/scenes/GameMenuScene.js', 'utf8')
    .replace(/^import[\s\S]*?from ['"][^'"]+['"];\n/gm, '')
    .replace('export default class GameMenuScene', 'return class GameMenuScene');
  class Scene { constructor(key) { this.scene = { key }; } }
  const GameMenuScene = new Function(
    'Phaser', 'hasActiveCampaign', 'clearCampaign', 'startSceneWithTransitionOverlay',
    'resetImageButtonState', 'translateActive', 'PREMIUM_BROADCAST_FONT_STACK', source,
  )(
    { Scene, Scenes: { Events: {} }, Core: { Events: {} } },
    () => campaignActive,
    () => { clearCount += 1; campaignActive = false; },
    (scene, destination, data) => {
      transitions.push({ scene, destination, data });
      if (transitionResult instanceof Error) throw transitionResult;
      return transitionResult;
    },
    (button, { interactive }) => { button.interactive = interactive; },
    (_key, fallback) => fallback,
    'Arial',
  );
  const scene = new GameMenuScene();
  scene.scale = { width: 400, height: 700 };
  scene.title = { active: true, scene, setPosition() {}, setDepth() {}, disableInteractive() {}, setVisible() {}, setAlpha() {} };
  const makeItem = () => ({ active: true, scene, setDepth() { return this; }, removeAllListeners() {}, destroy() { this.active = false; this.scene = null; } });
  scene.add = {
    rectangle: () => ({ ...makeItem(), setDepth() { return this; }, setInteractive() { return this; } }),
    graphics: () => ({ ...makeItem(), setDepth() { return this; }, fillStyle() {}, fillRoundedRect() {}, lineStyle() {}, strokeRoundedRect() {} }),
    text: () => ({ ...makeItem(), setOrigin() { return this; }, setDepth() { return this; } }),
  };
  scene.menuButtons = [];
  scene.menuButtonViews = [];
  scene.createMenuButton = function createHarnessButton(_x, _y, _width, label, callback, { trackAsPrimary = true } = {}) {
    const hitZone = makeItem();
    const button = { label, callback, hitZone, items: [hitZone], interactive: true };
    if (trackAsPrimary) {
      this.menuButtons.push(button);
      this.menuButtonViews.push(button.items);
    }
    return button;
  };
  for (const label of ['CONTINUE', 'NEW GAME', 'TUTORIAL', 'ARENA']) scene.createMenuButton(0, 0, 1, label, () => {});
  scene.updateContinueAvailability = () => {};
  scene.ensureTitleExistsAndVisible = () => scene.title;
  return { scene, transitions, clearCount: () => clearCount, campaignActive: () => campaignActive };
}

test('active Campaign confirmation owns modal buttons and first START commits one replacement transition', () => {
  const harness = loadGameMenuSceneHarness();
  const { scene } = harness;
  const persistentButtons = [...scene.menuButtons];
  const persistentViews = [...scene.menuButtonViews];

  scene.startNewCampaignFlow();
  assert.ok(scene.confirmNewGameModal);
  assert.equal(scene.factionSelectNavigationInProgress, false);
  assert.equal(harness.clearCount(), 0);
  assert.deepEqual(scene.menuButtons, persistentButtons);
  assert.deepEqual(scene.menuButtonViews, persistentViews);

  const confirm = scene.confirmNewGameModal.buttons[1];
  confirm.callback();
  confirm.callback(); // A destroyed button cannot dispatch this in Phaser; guard still proves one transition wins.

  assert.equal(scene.confirmNewGameModal, null);
  assert.equal(harness.transitions.length, 1);
  assert.equal(harness.transitions[0].destination, 'FactionSelectScene');
  assert.deepEqual(harness.transitions[0].data, { mode: 'campaign', returnSceneKey: 'GameMenuScene' });
  assert.equal(harness.clearCount(), 1);
  assert.equal(harness.campaignActive(), false);
  assert.deepEqual(scene.menuButtons, persistentButtons);
  assert.deepEqual(scene.menuButtonViews, persistentViews);
  assert.ok(persistentButtons.every((button) => button.interactive === false));
});

test('cancel preserves Campaign and permits immediate Arena and replacement retry', () => {
  const harness = loadGameMenuSceneHarness();
  const { scene } = harness;
  scene.startNewCampaignFlow();
  scene.confirmNewGameModal.buttons[0].callback();
  assert.equal(harness.clearCount(), 0);
  assert.equal(scene.factionSelectNavigationInProgress, false);
  assert.ok(scene.menuButtons.every((button) => button.interactive));

  assert.equal(scene.startFactionSelect({ returnSceneKey: 'GameMenuScene' }), true);
  assert.equal(harness.transitions.length, 1);

  const retry = loadGameMenuSceneHarness();
  retry.scene.startNewCampaignFlow();
  retry.scene.confirmNewGameModal.buttons[0].callback();
  retry.scene.startNewCampaignFlow();
  retry.scene.confirmNewGameModal.buttons[1].callback();
  assert.equal(retry.transitions.length, 1);
  assert.equal(retry.clearCount(), 1);
});

test('failed or throwing transition setup restores controls and never clears Campaign', () => {
  for (const result of [null, new Error('setup failed')]) {
    const harness = loadGameMenuSceneHarness({ transitionResult: result });
    harness.scene.startNewCampaignFlow();
    const start = harness.scene.confirmNewGameModal.buttons[1].callback;
    if (result instanceof Error) assert.throws(start, /setup failed/);
    else assert.equal(start(), undefined);
    assert.equal(harness.clearCount(), 0);
    assert.equal(harness.campaignActive(), true);
    assert.equal(harness.scene.factionSelectNavigationInProgress, false);
    assert.ok(harness.scene.menuButtons.every((button) => button.interactive));
  }
});

test('double NEW GAME creates one modal and Arena/Campaign cross-taps start one destination', () => {
  const harness = loadGameMenuSceneHarness();
  harness.scene.startNewCampaignFlow();
  const firstModal = harness.scene.confirmNewGameModal;
  harness.scene.startNewCampaignFlow();
  assert.equal(harness.scene.confirmNewGameModal, firstModal);

  const arenaFirst = loadGameMenuSceneHarness({ activeCampaign: false });
  assert.equal(arenaFirst.scene.startFactionSelect({ returnSceneKey: 'GameMenuScene' }), true);
  assert.equal(arenaFirst.scene.openCampaignFactionSelect(), false);
  assert.equal(arenaFirst.transitions.length, 1);

  const campaignFirst = loadGameMenuSceneHarness({ activeCampaign: false });
  assert.equal(campaignFirst.scene.openCampaignFactionSelect(), true);
  assert.equal(campaignFirst.scene.startFactionSelect({ returnSceneKey: 'GameMenuScene' }), false);
  assert.equal(campaignFirst.transitions.length, 1);
});
