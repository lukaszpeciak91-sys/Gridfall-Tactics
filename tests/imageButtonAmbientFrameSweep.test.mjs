import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const imageButtonSource = fs.readFileSync('src/ui/imageButton.js', 'utf8');
const mainMenuSource = fs.readFileSync('src/scenes/MainMenuScene.js', 'utf8');
const gameMenuSource = fs.readFileSync('src/scenes/GameMenuScene.js', 'utf8');
const factionSource = fs.readFileSync('src/scenes/FactionSelectScene.js', 'utf8');
const battleSource = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
const modalControlsSource = fs.readFileSync('src/ui/modalControls.js', 'utf8');
const collectionSource = fs.readFileSync('src/scenes/CollectionScene.js', 'utf8');
const rulesSource = fs.readFileSync('src/scenes/RulesPanelScene.js', 'utf8');
const settingsSource = fs.readFileSync('src/scenes/SettingsScene.js', 'utf8');

const bodyBetween = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));

test('ambient frame sweep is explicit opt-in and defaults off', () => {
  assert.match(imageButtonSource, /ambientFrameSweep = false/);
  assert.match(imageButtonSource, /const ambientSweep = ambientFrameSweep\s*\?\s*createAmbientFrameSweep/);
  assert.doesNotMatch(imageButtonSource, /scene\.key|label\.includes/);
});

test('non-opted-in image buttons create no ambient sweep object or animation ownership', () => {
  assert.match(imageButtonSource, /ambientFrameSweep = false/);
  assert.match(imageButtonSource, /ambientFrameSweep: ambientSweep\?\.graphics \?\? null/);
  assert.match(imageButtonSource, /ambientFrameSweepGeometry: ambientSweep\?\.geometry \?\? null/);
  assert.match(imageButtonSource, /ambientFrameSweepTiming: ambientSweep\?\.timing \?\? null/);
});

test('opted-in image buttons create one non-interactive decorative cyan sweep graphics object', () => {
  assert.match(imageButtonSource, /const AMBIENT_FRAME_SWEEP_COLOR = 0x38d5ff/);
  assert.match(imageButtonSource, /const graphics = scene\.add\.graphics\(\)[\s\S]*\.setDepth\(depth \+ 0\.75\)[\s\S]*\.setVisible\(false\)/);
  assert.match(imageButtonSource, /graphics\.setData\?\.\('imageButtonAmbientFrameSweep', true\)/);
  assert.match(imageButtonSource, /graphics\.disableInteractive\?\.\(\)/);
  assert.match(imageButtonSource, /items: \[shadow, backing, centerGlow, ambientSweep\?\.graphics, text, hitZone\]/);
});

test('ambient sweep geometry derives from resolved dimensions and scales proportionally', () => {
  assert.match(imageButtonSource, /normalizeAmbientFrameSweepGeometry\(\{ width, visualHeight \}\)/);
  assert.match(imageButtonSource, /const inset = Math\.max\(3, Math\.round\(shortestSide \* 0\.075\)\)/);
  assert.match(imageButtonSource, /const radius = Math\.max\(4, Math\.min\(pathHeight \* 0\.42, pathWidth \* 0\.18, shortestSide \* 0\.24\)\)/);
  assert.match(imageButtonSource, /const perimeter = Math\.max\(1, 2 \* \(straightWidth \+ straightHeight\) \+ 2 \* Math\.PI \* radius\)/);
  assert.match(imageButtonSource, /const segmentLength = perimeter \* AMBIENT_FRAME_SWEEP_SEGMENT_RATIO/);
  assert.match(imageButtonSource, /hasButtonTexture && preserveImageAspect[\s\S]*\? Math\.round\(\(width \/ SECONDARY_BUTTON_ASPECT_RATIO\) \* SECONDARY_BUTTON_DISPLAY_HEIGHT_SCALE\)[\s\S]*: height/);
});

test('ambient sweep supports preserveImageAspect true and false without fixed paths', () => {
  assert.match(imageButtonSource, /preserveImageAspect = true/);
  assert.match(factionSource, /preserveImageAspect: false,[\s\S]*ambientFrameSweep: true/);
  assert.doesNotMatch(imageButtonSource, /fixedPixelPath|const path = \[[\s\S]*\{ x: \d+, y: \d+ \}/);
});

test('sweep timing is intermittent deterministic and within intended ranges', () => {
  assert.match(imageButtonSource, /const AMBIENT_FRAME_SWEEP_SEGMENT_RATIO = 0\.15/);
  assert.match(imageButtonSource, /const AMBIENT_FRAME_SWEEP_VISIBLE_MS = 1900/);
  assert.match(imageButtonSource, /const AMBIENT_FRAME_SWEEP_CYCLE_MS = 6400/);
  assert.match(imageButtonSource, /const AMBIENT_FRAME_SWEEP_PHASE_STEP_MS = 2700/);
  assert.match(imageButtonSource, /const AMBIENT_FRAME_SWEEP_FADE_START_RATIO = 0\.82/);
  assert.match(imageButtonSource, /const phaseOffsetMs = \(ambientFrameSweepSequence \* AMBIENT_FRAME_SWEEP_PHASE_STEP_MS\) % AMBIENT_FRAME_SWEEP_CYCLE_MS/);
  assert.match(imageButtonSource, /schedule\(phaseOffsetMs\)/);
  assert.match(imageButtonSource, /const schedule = \(delayMs = AMBIENT_FRAME_SWEEP_CYCLE_MS\)/);
  assert.match(imageButtonSource, /pauseMs: AMBIENT_FRAME_SWEEP_CYCLE_MS - AMBIENT_FRAME_SWEEP_VISIBLE_MS/);
  assert.doesNotMatch(imageButtonSource, /Math\.random|Date\.now|performance\.now|repeat:\s*-1|yoyo:\s*true/);
});


test('ambient sweep is one forward traversal with fade-out and no end flourish', () => {
  const ambientImplementation = bodyBetween(imageButtonSource, 'function createAmbientFrameSweep', 'export function calculateSecondaryButtonHeight');

  assert.match(ambientImplementation, /state\.offset = 0;[\s\S]*state\.alpha = AMBIENT_FRAME_SWEEP_ALPHA/);
  assert.match(ambientImplementation, /offset: geometry\.perimeter,[\s\S]*duration: AMBIENT_FRAME_SWEEP_VISIBLE_MS/);
  assert.match(ambientImplementation, /fadeProgress = Math\.max\(0, \(state\.offset \/ geometry\.perimeter - AMBIENT_FRAME_SWEEP_FADE_START_RATIO\)/);
  assert.match(ambientImplementation, /state\.alpha = AMBIENT_FRAME_SWEEP_ALPHA \* \(1 - Math\.min\(1, fadeProgress\)\)/);
  assert.match(ambientImplementation, /if \(distance > geometry\.perimeter\) break;/);
  assert.match(ambientImplementation, /if \(state\.offset >= geometry\.perimeter \|\| state\.alpha <= 0\) return;/);
  assert.match(ambientImplementation, /onComplete: \(\) => \{\s*sweepTween = null;\s*graphics\.clear\(\);\s*graphics\.setVisible\(false\);\s*\}/);
  assert.doesNotMatch(ambientImplementation, /yoyo|reverse|turnaround|spiral|overshoot|returnPhase|secondaryReturn|offset:\s*0\s*,\s*duration/);
});

test('ambient sweep cycles are independent and phase-distributed without a shared queue', () => {
  const ambientImplementation = bodyBetween(imageButtonSource, 'function createAmbientFrameSweep', 'export function calculateSecondaryButtonHeight');

  assert.match(ambientImplementation, /const phaseOffsetMs = \(ambientFrameSweepSequence \* AMBIENT_FRAME_SWEEP_PHASE_STEP_MS\) % AMBIENT_FRAME_SWEEP_CYCLE_MS/);
  assert.match(ambientImplementation, /ambientFrameSweepSequence \+= 1/);
  assert.match(ambientImplementation, /schedule\(phaseOffsetMs\)/);
  assert.match(ambientImplementation, /const schedule = \(delayMs = AMBIENT_FRAME_SWEEP_CYCLE_MS\)/);
  assert.doesNotMatch(ambientImplementation, /shared|queue|coordinator|await|Promise|Math\.random|Date\.now|performance\.now/);
});

test('existing hover pressed feedback hit zones and callbacks remain on their current paths', () => {
  assert.match(imageButtonSource, /const hitZone = scene\.add\.zone\(x, y, width, hitHeight\)/);
  assert.match(imageButtonSource, /tweenVisualState\('pressed', \{ duration: 65, ease: 'Quad\.easeOut' \}\)/);
  assert.match(imageButtonSource, /return \{ scale: downScale, alpha: 0\.9, textAlpha: 0\.96/);
  assert.match(imageButtonSource, /return \{ scale: hoverScale, alpha: hasButtonTexture \? 1 : 0\.96/);
  assert.match(imageButtonSource, /playSfx\(scene, AUDIO_KEYS\.UI_CLICK\);\s*onPointerUp\(pointer\);/);
});

test('destroy and shutdown cleanup own all sweep timers tweens and objects', () => {
  assert.match(imageButtonSource, /ambientSweep\?\.cleanup\?\.\(\)/);
  assert.match(imageButtonSource, /sweepTween\?\.stop\?\.\(\)/);
  assert.match(imageButtonSource, /sweepTween\?\.remove\?\.\(\)/);
  assert.match(imageButtonSource, /sweepTimer\?\.remove\?\.\(false\)/);
  assert.match(imageButtonSource, /graphics\.setData\?\.\('imageButtonAmbientFrameSweepCleanup', cleanup\)/);
  assert.match(imageButtonSource, /scene\.events\?\.once\?\.\('shutdown', cleanupFeedback\)/);
  assert.match(imageButtonSource, /export function destroyImageButton\(button\)[\s\S]*button\?\.items\?\.forEach/);
});

test('approved Phase 1 call sites opt in explicitly', () => {
  assert.match(mainMenuSource, /createMenuButton\([\s\S]*createImageButton\(this, \{[\s\S]*ambientFrameSweep: true/);
  assert.match(gameMenuSource, /continueButton = this\.createMenuButton\([\s\S]*\}, \{ ambientFrameSweep: true \}\)/);
  assert.match(gameMenuSource, /ui\.gameMenu\.arena[\s\S]*\}, \{ ambientFrameSweep: true \}\)/);
  assert.match(gameMenuSource, /createMenuButton\(x, y, width, label, onPointerUp, \{ ambientFrameSweep = false \} = \{\}\)/);
  assert.match(gameMenuSource, /ambientFrameSweep,\s*\}\);/);
  assert.match(factionSource, /label: translateActive\('ui\.factionSelect\.campaignAccordion\.select', 'SELECT'\)[\s\S]*ambientFrameSweep: true/);
});

test('excluded shared-image consumers do not opt in', () => {
  const newGameModal = bodyBetween(gameMenuSource, 'showNewGameConfirmation()', 'closeNewGameConfirmation()');
  const surrenderButton = bodyBetween(battleSource, 'createSurrenderConfirmationButton', 'confirmPlayerMenuSurrender');
  const resultButton = bodyBetween(battleSource, 'createResultModalButton', 'destroyBattleResultModal');

  assert.doesNotMatch(newGameModal, /ambientFrameSweep: true/);
  assert.doesNotMatch(surrenderButton, /ambientFrameSweep: true/);
  assert.doesNotMatch(resultButton, /ambientFrameSweep: true/);
  assert.doesNotMatch(modalControlsSource, /ambientFrameSweep: true/);
  assert.doesNotMatch(collectionSource, /ambientFrameSweep: true/);
  assert.doesNotMatch(rulesSource, /ambientFrameSweep: true/);
  assert.doesNotMatch(settingsSource, /ambientFrameSweep: true|createImageButton|createModalBackButton/);
});

test('no binary assets are introduced for the ambient sweep', () => {
  const ambientImplementation = bodyBetween(imageButtonSource, 'function createAmbientFrameSweep', 'export function calculateSecondaryButtonHeight');
  assert.doesNotMatch(ambientImplementation, /load\.image|assets\/ui|\.png['\"]/);
  assert.match(ambientImplementation, /scene\.add\.graphics\(\)/);
});

import { createImageButton, destroyImageButton, resetImageButtonState } from '../src/ui/imageButton.js';

function makeImageButtonGameObject(type, scene, props = {}) {
  return {
    type,
    scene,
    active: true,
    visible: true,
    alpha: 1,
    scaleX: 1,
    scaleY: 1,
    listeners: {},
    data: new Map(),
    interactive: false,
    ...props,
    setOrigin() { return this; },
    setDepth(depth) { this.depth = depth; return this; },
    setVisible(visible) { this.visible = visible; return this; },
    setAlpha(alpha) { this.alpha = alpha; return this; },
    setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; },
    setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; },
    setStrokeStyle(...args) { this.strokeStyle = args; return this; },
    setBlendMode(mode) { this.blendMode = mode; return this; },
    setShadow(...args) { this.shadow = args; return this; },
    setInteractive(config) { this.interactive = true; this.interactiveConfig = config; return this; },
    disableInteractive() { this.interactive = false; return this; },
    on(event, handler) { this.listeners[event] = handler; return this; },
    once(event, handler) { this.onceListeners = this.onceListeners ?? {}; this.onceListeners[event] = handler; return this; },
    removeAllListeners() { this.listeners = {}; this.onceListeners = {}; return this; },
    setData(key, value) { this.data.set(key, value); return this; },
    getData(key) { return this.data.get(key); },
    clearTint() { this.tint = null; return this; },
    setTint(tint) { this.tint = tint; return this; },
    clear() { this.cleared = (this.cleared ?? 0) + 1; return this; },
    lineStyle(...args) { this.lineStyleArgs = args; return this; },
    beginPath() { return this; },
    moveTo() { return this; },
    lineTo() { return this; },
    strokePath() { this.strokeCount = (this.strokeCount ?? 0) + 1; return this; },
    destroy() {
      if (!this.active) return;
      this.active = false;
      this.destroyed = true;
      const destroyHandler = this.listeners.destroy ?? this.onceListeners?.destroy;
      this.listeners = {};
      this.onceListeners = {};
      destroyHandler?.();
      this.scene = null;
    },
  };
}

function makeImageButtonScene() {
  const created = {
    graphics: [],
    rectangles: [],
    ellipses: [],
    texts: [],
    zones: [],
    tweens: [],
    timers: [],
    shutdownHandlers: [],
    inputListeners: {},
  };
  const scene = {
    textures: { exists: () => false },
    add: {
      graphics() {
        const object = makeImageButtonGameObject('Graphics', scene);
        created.graphics.push(object);
        return object;
      },
      rectangle(x, y, width, height, fill, alpha) {
        const object = makeImageButtonGameObject('Rectangle', scene, { x, y, width, height, fill, alpha });
        created.rectangles.push(object);
        return object;
      },
      ellipse(x, y, width, height, fill, alpha) {
        const object = makeImageButtonGameObject('Ellipse', scene, { x, y, width, height, fill, alpha });
        created.ellipses.push(object);
        return object;
      },
      text(x, y, text, style) {
        const object = makeImageButtonGameObject('Text', scene, { x, y, text, style });
        created.texts.push(object);
        return object;
      },
      zone(x, y, width, height) {
        const object = makeImageButtonGameObject('Zone', scene, { x, y, width, height });
        created.zones.push(object);
        return object;
      },
    },
    time: {
      delayedCall(delay, callback) {
        const timer = {
          delay,
          callback,
          removed: false,
          remove() { this.removed = true; },
          fire() { if (!this.removed) callback(); },
        };
        created.timers.push(timer);
        return timer;
      },
    },
    tweens: {
      add(config) {
        const tween = {
          config,
          removed: false,
          stopped: false,
          stop() { this.stopped = true; },
          remove() { this.removed = true; },
        };
        created.tweens.push(tween);
        return tween;
      },
      killTweensOf(targets) { created.killTweensOf = targets; },
    },
    input: {
      on(event, handler) { created.inputListeners[event] = handler; },
      off(event) { delete created.inputListeners[event]; },
    },
    events: {
      once(event, handler) { if (event === 'shutdown') created.shutdownHandlers.push(handler); },
      off() {},
    },
    __created: created,
  };
  return scene;
}

function createRuntimeImageButton(scene = makeImageButtonScene(), options = {}) {
  const button = createImageButton(scene, {
    x: 120,
    y: 80,
    width: 220,
    height: 66,
    label: 'PLAY',
    onPointerUp: () => { scene.__created.clicked = (scene.__created.clicked ?? 0) + 1; },
    ambientFrameSweep: true,
    ...options,
  });
  return { scene, button };
}

function activeTimers(scene) {
  return scene.__created.timers.filter((timer) => !timer.removed);
}

function activeTweens(scene) {
  return scene.__created.tweens.filter((tween) => !tween.removed);
}

test('runtime opted-in ambient sweep owns exactly one scheduler and non-opted-in buttons own none', () => {
  const { scene, button } = createRuntimeImageButton();
  assert.equal(button.ambientFrameSweep?.type, 'Graphics');
  assert.equal(scene.__created.graphics.length, 1);
  assert.equal(activeTimers(scene).length, 1);
  assert.equal(activeTweens(scene).length, 0);
  assert.ok(button.hitZone.getData('imageButtonAmbientFrameSweepLifecycle'));

  const plainScene = makeImageButtonScene();
  const plain = createImageButton(plainScene, { x: 0, y: 0, width: 180, height: 54, label: 'PLAIN', ambientFrameSweep: false });
  assert.equal(plain.ambientFrameSweep, null);
  assert.equal(plainScene.__created.graphics.length, 0);
  assert.equal(activeTimers(plainScene).length, 0);
});

test('resetImageButtonState restores exactly one live ambient scheduler without duplicating graphics, timers, tweens, hitbox, or callback', () => {
  const { scene, button } = createRuntimeImageButton();
  const initialHitZone = button.hitZone;
  const initialPointerUp = button.hitZone.listeners.pointerup;

  resetImageButtonState(button, { interactive: true });
  resetImageButtonState(button, { interactive: true });
  resetImageButtonState(button, { interactive: false });
  resetImageButtonState(button, { interactive: true });

  assert.equal(scene.__created.graphics.length, 1);
  assert.equal(activeTimers(scene).length, 1);
  assert.equal(activeTweens(scene).length, 0);
  assert.equal(button.hitZone, initialHitZone);
  assert.equal(button.hitZone.listeners.pointerup, initialPointerUp);
  assert.equal(button.hitZone.interactive, true);
});

test('ambient sweep lifecycle can restart a temporary stop without duplicating an already running scheduler', () => {
  const { scene, button } = createRuntimeImageButton();
  const lifecycle = button.hitZone.getData('imageButtonAmbientFrameSweepLifecycle');

  assert.equal(lifecycle.ensureRunning(), true);
  assert.equal(activeTimers(scene).length, 1);

  lifecycle.stop();
  assert.equal(activeTimers(scene).length, 0);

  resetImageButtonState(button, { interactive: true });
  assert.equal(scene.__created.graphics.length, 1);
  assert.equal(activeTimers(scene).length, 1);

  lifecycle.ensureRunning();
  lifecycle.ensureRunning();
  assert.equal(activeTimers(scene).length, 1);

  lifecycle.restart();
  assert.equal(activeTimers(scene).length, 1);
  assert.equal(activeTweens(scene).length, 1);
});

test('permanent ambient cleanup prevents future restart and destroyImageButton removes sweep ownership', () => {
  const { scene, button } = createRuntimeImageButton();
  const lifecycle = button.hitZone.getData('imageButtonAmbientFrameSweepLifecycle');

  destroyImageButton(button);
  assert.equal(activeTimers(scene).length, 0);
  assert.equal(activeTweens(scene).length, 0);
  assert.equal(button.ambientFrameSweep.destroyed, true);
  assert.equal(lifecycle.ensureRunning(), false);
  assert.equal(lifecycle.restart(), false);
});

test('scene shutdown fully removes ambient sweep ownership and future resets do not revive destroyed buttons', () => {
  const { scene, button } = createRuntimeImageButton();
  const lifecycle = button.hitZone.getData('imageButtonAmbientFrameSweepLifecycle');

  assert.equal(scene.__created.shutdownHandlers.length, 1);
  scene.__created.shutdownHandlers[0]();

  assert.equal(activeTimers(scene).length, 0);
  assert.equal(activeTweens(scene).length, 0);
  assert.equal(button.ambientFrameSweep.destroyed, true);
  resetImageButtonState(button, { interactive: true });
  assert.equal(activeTimers(scene).length, 0);
  assert.equal(lifecycle.ensureRunning(), false);
});

test('fullscreen-style button reconstruction creates a fresh sweep while old sweep remains cleaned up', () => {
  const scene = makeImageButtonScene();
  const first = createRuntimeImageButton(scene).button;
  const firstLifecycle = first.hitZone.getData('imageButtonAmbientFrameSweepLifecycle');

  destroyImageButton(first);
  const second = createRuntimeImageButton(scene).button;

  assert.equal(firstLifecycle.ensureRunning(), false);
  assert.equal(first.ambientFrameSweep.destroyed, true);
  assert.notEqual(second.ambientFrameSweep, first.ambientFrameSweep);
  assert.equal(scene.__created.graphics.length, 2);
  assert.equal(activeTimers(scene).length, 1);
  assert.equal(second.hitZone.interactive, true);
});

test('rules-return style reset restores ambient sweep activity on a surviving interactive button', () => {
  const { scene, button } = createRuntimeImageButton();
  const lifecycle = button.hitZone.getData('imageButtonAmbientFrameSweepLifecycle');

  lifecycle.stop();
  assert.equal(activeTimers(scene).length, 0);
  resetImageButtonState(button, { interactive: true });

  assert.equal(button.hitZone.interactive, true);
  assert.equal(activeTimers(scene).length, 1);
  assert.equal(scene.__created.graphics.length, 1);
});
