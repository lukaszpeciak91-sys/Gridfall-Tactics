import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  createBottomNavigationControls,
  createFloatingControl,
  createMuteToggleControl,
  getNavigationGoldSweepGeometry,
  getNavigationGoldSweepPhaseOffset,
  getNavigationIconGeometry,
  getNavigationRingPhaseOffset,
  NAVIGATION_GOLD_SWEEP,
  NAVIGATION_ICON_TYPES,
  NAVIGATION_RING_MOTION,
} from '../src/ui/navigationControls.js';

const read = (path) => fs.readFileSync(path, 'utf8');
const helperSource = () => read('src/ui/navigationControls.js');


function makeGraphics() {
  return {
    type: 'Graphics',
    interactive: false,
    commands: [],
    destroyed: false,
    rotation: 0,
    clear() { this.commands.push(['clear']); return this; },
    lineStyle(...args) { this.commands.push(['lineStyle', ...args]); return this; },
    beginPath() { this.commands.push(['beginPath']); return this; },
    arc(...args) { this.commands.push(['arc', ...args]); return this; },
    moveTo(...args) { this.commands.push(['moveTo', ...args]); return this; },
    lineTo(...args) { this.commands.push(['lineTo', ...args]); return this; },
    quadraticCurveTo(...args) { this.commands.push(['quadraticCurveTo', ...args]); return this; },
    fillStyle(...args) { this.commands.push(['fillStyle', ...args]); return this; },
    fillCircle(...args) { this.commands.push(['fillCircle', ...args]); return this; },
    fillPath() { this.commands.push(['fillPath']); return this; },
    closePath() { this.commands.push(['closePath']); return this; },
    strokePath() { this.commands.push(['strokePath']); return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setDepth(depth) { this.depth = depth; return this; },
    once(event, handler) { this.onceHandlers = this.onceHandlers ?? {}; this.onceHandlers[event] = handler; return this; },
    destroy() { this.destroyed = true; this.onceHandlers?.destroy?.(); },
  };
}

function makeChainObject(type, props = {}) {
  return {
    type,
    interactive: false,
    listeners: {},
    destroyed: false,
    ...props,
    setStrokeStyle(...args) { this.strokeStyle = args; return this; },
    setRounded(radius) { this.rounded = radius; return this; },
    setDepth(depth) { this.depth = depth; return this; },
    setInteractive(config) { this.interactive = true; this.interactiveConfig = config; return this; },
    setFillStyle(...args) { this.fillStyle = args; return this; },
    setAlpha(alpha) { this.alpha = alpha; return this; },
    on(event, handler) { this.listeners[event] = handler; return this; },
    destroy() { this.destroyed = true; },
  };
}

function makeScene() {
  const tweens = [];
  const graphics = [];
  const circles = [];
  const rectangles = [];
  const containers = [];
  const shutdownHandlers = [];
  const gameEventListeners = new Map();
  const scene = {
    scale: { width: 390, height: 844, gameSize: { width: 390, height: 844 } },
    add: {
      graphics() { const g = makeGraphics(); graphics.push(g); return g; },
      circle(x, y, radius, color, alpha) { const c = makeChainObject('Circle', { x, y, radius, color, alpha }); circles.push(c); return c; },
      rectangle(x, y, width, height, color, alpha) { const r = makeChainObject('Rectangle', { x, y, width, height, color, alpha }); rectangles.push(r); return r; },
      container(x, y) {
        const c = makeChainObject('Container', { x, y, children: [] });
        c.add = (children) => { c.children.push(...children); return c; };
        c.setSize = (width, height) => { c.width = width; c.height = height; return c; };
        containers.push(c);
        return c;
      },
    },
    tweens: {
      add(config) { const tween = { config, removed: false, remove() { this.removed = true; } }; tweens.push(tween); return tween; },
    },
    events: {
      once(event, handler) { if (event === 'shutdown') shutdownHandlers.push(handler); },
    },
    game: {
      events: {
        on(event, handler) {
          const listeners = gameEventListeners.get(event) ?? new Set();
          listeners.add(handler);
          gameEventListeners.set(event, listeners);
        },
        off(event, handler) {
          gameEventListeners.get(event)?.delete(handler);
        },
      },
    },
    __created: { tweens, graphics, circles, rectangles, containers, shutdownHandlers, gameEventListeners },
  };
  return scene;
}

function assertCenteredBounds(bounds, tolerance) {
  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;
  assert.ok(Math.abs(centerX) <= tolerance, `expected centered x bounds, got ${centerX}`);
  assert.ok(Math.abs(centerY) <= tolerance, `expected centered y bounds, got ${centerY}`);
}

test('bottom navigation back, help, and fullscreen controls use vector graphics instead of Text glyph icons', () => {
  const source = helperSource();
  const floatingControlSource = source.slice(source.indexOf('export function createFloatingControl'), source.indexOf('export function drawSpeakerIcon'));
  const bottomControlsSource = source.slice(source.indexOf('export function createBottomNavigationControls'), source.indexOf('export function requestPortraitOrientationLock'));

  assert.doesNotMatch(floatingControlSource, /scene\.add\.text/);
  assert.doesNotMatch(bottomControlsSource, /'←'|'\?'|'⛶'/);
  assert.match(floatingControlSource, /const icon = scene\.add\.graphics\(\)\.setPosition\(x, y\)\.setDepth\(200\)/);
  assert.match(floatingControlSource, /drawNavigationIcon\(icon, size, iconType\)/);
  assert.match(bottomControlsSource, /NAVIGATION_ICON_TYPES\.BACK/);
  assert.match(bottomControlsSource, /NAVIGATION_ICON_TYPES\.HELP/);
  assert.match(bottomControlsSource, /NAVIGATION_ICON_TYPES\.FULLSCREEN/);
});

test('navigation vector icon geometry is centered and scales from control size', () => {
  for (const iconType of Object.values(NAVIGATION_ICON_TYPES)) {
    const small = getNavigationIconGeometry(44, iconType);
    const large = getNavigationIconGeometry(58, iconType);

    assert.ok(small.strokeWidth >= 3);
    assert.equal(large.unit / small.unit, 58 / 44);
    assert.equal(large.strokeWidth / small.strokeWidth, 58 / 44);
    assertCenteredBounds(small.bounds, small.unit * 1.25);
    assertCenteredBounds(large.bounds, large.unit * 1.25);
  }
});

test('bottom navigation positions, touch size, callbacks, fullscreen, and mute behavior stay on the shared paths', () => {
  const source = helperSource();
  const bottomControlsSource = source.slice(source.indexOf('export function createBottomNavigationControls'), source.indexOf('export function requestPortraitOrientationLock'));
  const muteSource = source.slice(source.indexOf('export function createMuteToggleControl'), source.indexOf('export function createBottomNavigationControls'));
  const fullscreenSource = source.slice(source.indexOf('export function toggleSceneFullscreen'));

  assert.match(source, /const resolvedTouchSize = touchSize \?\? Math\.max\(48, Math\.min\(58, height \* 0\.066\)\)/);
  assert.match(bottomControlsSource, /const fullscreenX = metrics\.width - metrics\.margin - metrics\.touchSize \/ 2/);
  assert.match(bottomControlsSource, /const backX = metrics\.margin \+ metrics\.touchSize \/ 2/);
  assert.match(bottomControlsSource, /back: onBack \? createFloatingControl\(scene, backX, metrics\.centerY, metrics\.touchSize, NAVIGATION_ICON_TYPES\.BACK, onBack\)/);
  assert.match(bottomControlsSource, /rules: middleAction \? createFloatingControl\(scene, metrics\.width \* 0\.5, metrics\.centerY, metrics\.touchSize, NAVIGATION_ICON_TYPES\.HELP, middleAction\)/);
  assert.match(bottomControlsSource, /fullscreen: onFullscreen \? createFloatingControl\(scene, fullscreenX, metrics\.centerY, metrics\.touchSize, NAVIGATION_ICON_TYPES\.FULLSCREEN, onFullscreen\)/);
  assert.match(fullscreenSource, /if \(!scene\.scale\.fullscreen\.available\) \{[\s\S]*return;[\s\S]*\}/);
  assert.match(fullscreenSource, /scene\.scale\.stopFullscreen\(\)/);
  assert.match(fullscreenSource, /scene\.scale\.startFullscreen\(\)/);
  assert.match(muteSource, /toggleMuted\(scene\)/);
  assert.match(muteSource, /onToggle\?\.\(settings\)/);
});

test('no binary assets are introduced for navigation icons and shared consumers remain wired to helpers', () => {
  const helper = helperSource();
  const battle = read('src/scenes/BattleScene.js');
  const consumers = [
    'src/scenes/MainMenuScene.js',
    'src/scenes/GameMenuScene.js',
    'src/scenes/FactionSelectScene.js',
    'src/scenes/CampaignEnemySelectScene.js',
    'src/scenes/AchievementsScene.js',
    'src/scenes/SettingsScene.js',
    'src/scenes/TutorialScene.js',
    'src/scenes/StartScene.js',
  ];

  for (const path of consumers) {
    assert.match(read(path), /createBottomNavigationControls\(this, \{/);
  }

  assert.match(battle, /createFloatingControl\(this, panelX \+ 28, rowY, 42, NAVIGATION_ICON_TYPES\.FULLSCREEN/);
  assert.doesNotMatch(helper, /\.png|\.webp|\.svg|fontFamily: 'Arial, sans-serif'/);
  assert.doesNotMatch(helper, /scene\.add\.text\(x, y, label/);
});


test('bottom navigation ring motion creates one centered non-interactive Graphics arc per enabled control', () => {
  const scene = makeScene();
  const controls = createBottomNavigationControls(scene, {
    onBack() {},
    onRules() {},
    onFullscreen() {},
  });

  for (const control of [controls.back, controls.rules, controls.fullscreen]) {
    assert.equal(control.ringArc.type, 'Graphics');
    assert.equal(control.ringArc.interactive, false);
    assert.equal(control.ringArc.x, control.backing.x);
    assert.equal(control.ringArc.y, control.backing.y);
    assert.equal(control.ringMotion.radius, control.backing.width * NAVIGATION_RING_MOTION.radiusRatio);
  }
  assert.equal(scene.__created.tweens.length, 6);
  const ringTweens = scene.__created.tweens.filter((tween) => tween.config.duration === NAVIGATION_RING_MOTION.duration);
  assert.equal(new Set(ringTweens.map((tween) => tween.config.targets)).size, 3);
});

test('bottom navigation ring motion is slow, deterministic, and keeps hitboxes and callbacks on backing objects', () => {
  const scene = makeScene();
  const callback = () => {};
  const control = createFloatingControl(scene, 32, 810, 52, NAVIGATION_ICON_TYPES.HELP, callback);
  const phase = getNavigationRingPhaseOffset(32, 810, 52);

  assert.equal(control.ringTween.config.duration, NAVIGATION_RING_MOTION.duration);
  assert.ok(control.ringTween.config.duration >= 4000 && control.ringTween.config.duration <= 6000);
  assert.equal(control.ringTween.config.ease, 'Linear');
  assert.equal(control.ringTween.config.repeat, -1);
  assert.equal(control.ringArc.rotation, phase);
  assert.equal(getNavigationRingPhaseOffset(32, 810, 52), phase);
  assert.notEqual(getNavigationRingPhaseOffset(195, 810, 52), phase);
  assert.equal(control.backing.interactive, true);
  assert.equal(control.ringArc.interactive, false);
  assert.equal(control.backing.width, 52);
  assert.equal(control.backing.height, 52);
  assert.equal(control.backing.listeners.pointerup instanceof Function, true);
});

test('bottom navigation ring cleanup removes tween on control destroy and scene shutdown without duplication', () => {
  const scene = makeScene();
  const control = createFloatingControl(scene, 32, 810, 52, NAVIGATION_ICON_TYPES.BACK, () => {});

  assert.equal(scene.__created.tweens.length, 2);
  assert.equal(scene.__created.shutdownHandlers.length, 2);
  control.destroy();
  assert.equal(control.ringTween.removed, true);
  assert.equal(control.goldSweepTween.removed, true);
  assert.equal(control.ringArc.destroyed, true);
  assert.equal(control.goldSweep.destroyed, true);
  scene.__created.shutdownHandlers[0]();
  scene.__created.shutdownHandlers[1]();
  assert.equal(scene.__created.tweens.length, 2);

  createFloatingControl(scene, 32, 810, 52, NAVIGATION_ICON_TYPES.BACK, () => {});
  assert.equal(scene.__created.tweens.length, 4);
});

test('mute control shares the animated ring without changing mute hitbox or callback wiring', () => {
  const scene = makeScene();
  const controls = createBottomNavigationControls(scene, { onMute() {} });

  assert.equal(controls.mute.ringArc.type, 'Graphics');
  assert.equal(controls.mute.ringArc.interactive, false);
  assert.equal(controls.mute.ringMotion.radius, controls.metrics.touchSize * NAVIGATION_RING_MOTION.muteRadiusRatio);
  assert.equal(controls.mute.button.interactive, true);
  assert.equal(controls.mute.button.width, controls.metrics.touchSize);
  assert.equal(controls.mute.button.height, controls.metrics.touchSize);
  assert.equal(controls.mute.button.listeners.pointerup instanceof Function, true);
  assert.equal(scene.__created.tweens.length, 2);
});


test('floating and mute controls default to blue ring motion and gold sweep motion', () => {
  const floatingScene = makeScene();
  const floating = createFloatingControl(floatingScene, 32, 810, 52, NAVIGATION_ICON_TYPES.FULLSCREEN, () => {});

  assert.equal(floating.ringArc.type, 'Graphics');
  assert.equal(floating.ringTween.config.duration, NAVIGATION_RING_MOTION.duration);
  assert.equal(floating.ringMotion.arc, floating.ringArc);
  assert.equal(floating.goldSweep.type, 'Graphics');
  assert.equal(floating.goldSweepTween.config.duration, NAVIGATION_GOLD_SWEEP.duration);

  const muteScene = makeScene();
  const mute = createMuteToggleControl(muteScene, 32, 810, 52, { onToggle() {} });

  assert.equal(mute.ringArc.type, 'Graphics');
  assert.equal(mute.ringTween.config.duration, NAVIGATION_RING_MOTION.duration);
  assert.equal(mute.ringMotion.arc, mute.ringArc);
  assert.equal(mute.goldSweep.type, 'Graphics');
  assert.equal(mute.goldSweepTween.config.duration, NAVIGATION_GOLD_SWEEP.duration);
});

test('ambient ring motion opt-out preserves safe null handles without creating ring Graphics or tween', () => {
  const floatingScene = makeScene();
  const floating = createFloatingControl(floatingScene, 223, 406, 42, NAVIGATION_ICON_TYPES.FULLSCREEN, () => {}, { ambientRingMotion: false });

  assert.equal(floating.ringArc, null);
  assert.equal(floating.ringTween, null);
  assert.equal(floating.ringMotion, null);
  assert.equal(floatingScene.__created.tweens.filter((tween) => tween.config.duration === NAVIGATION_RING_MOTION.duration).length, 0);
  assert.equal(floatingScene.__created.graphics.length, 2, 'icon and gold sweep are still created when only ring is disabled');
  assert.equal(floating.backing.interactive, true);
  assert.equal(floating.icon.type, 'Graphics');
  floating.destroy();

  const muteScene = makeScene();
  const mute = createMuteToggleControl(muteScene, 167, 406, 42, { ambientRingMotion: false, onToggle() {} });

  assert.equal(mute.ringArc, null);
  assert.equal(mute.ringTween, null);
  assert.equal(mute.ringMotion, null);
  assert.equal(muteScene.__created.tweens.filter((tween) => tween.config.duration === NAVIGATION_RING_MOTION.duration).length, 0);
  assert.equal(muteScene.__created.graphics.length, 2, 'icon and gold sweep are still created when only ring is disabled');
  assert.equal(mute.button.interactive, true);
  assert.ok(mute.button.children.includes(mute.backing));
  mute.destroy();
});

test('Battle Menu utility icons opt out of ambient edge motion without losing interaction or state refresh', () => {
  const battleSource = read('src/scenes/BattleScene.js');
  const menuSource = battleSource.slice(
    battleSource.indexOf('const muteToggle = createMuteToggleControl'),
    battleSource.indexOf('[triggerControl, fullscreenToggle, muteToggle]'),
  );
  const destroySource = battleSource.slice(
    battleSource.indexOf('  destroyUtilityMenuPanel()'),
    battleSource.indexOf('  guardPointerEvent(', battleSource.indexOf('  destroyUtilityMenuPanel()')),
  );
  assert.match(menuSource, /createMuteToggleControl\(this, panelX - 28, rowY, 42, \{ depth: depth \+ 3, ambientFrameSweep: false, ambientRingMotion: false \}\)/);
  assert.match(menuSource, /createFloatingControl\(this, panelX \+ 28, rowY, 42, NAVIGATION_ICON_TYPES\.FULLSCREEN[\s\S]*\{ fontScale: 0\.48, ambientFrameSweep: false, ambientRingMotion: false \}\)/);
  assert.match(destroySource, /fullscreenToggle\?\.destroy\?\.\(\)/);
  assert.doesNotMatch(destroySource, /fullscreenToggle\?\.ringArc|fullscreenToggle\?\.ringTween|fullscreenToggle\?\.halo,[\s\S]*fullscreenToggle\?\.backing,[\s\S]*fullscreenToggle\?\.text/);

  let fullscreenCalls = 0;
  let muteUpdates = 0;
  const fullscreenScene = makeScene();
  const fullscreen = createFloatingControl(fullscreenScene, 223, 406, 42, NAVIGATION_ICON_TYPES.FULLSCREEN, () => { fullscreenCalls += 1; }, { fontScale: 0.48, ambientFrameSweep: false, ambientRingMotion: false });
  assert.equal(fullscreen.ringArc, null);
  assert.equal(fullscreen.ringTween, null);
  assert.equal(fullscreen.ringMotion, null);
  assert.equal(fullscreen.goldSweep, null);
  assert.equal(fullscreen.goldSweepTween, null);
  assert.equal(fullscreen.goldSweepMotion, null);
  assert.equal(fullscreen.backing.interactive, true);
  fullscreen.backing.listeners.pointerup();
  assert.equal(fullscreenCalls, 1);
  assert.equal(fullscreenScene.__created.tweens.filter((tween) => tween.config.duration === NAVIGATION_RING_MOTION.duration).length, 0);
  assert.equal(fullscreenScene.__created.tweens.filter((tween) => tween.config.duration === NAVIGATION_GOLD_SWEEP.duration).length, 0);
  fullscreen.destroy();

  const muteScene = makeScene();
  const mute = createMuteToggleControl(muteScene, 167, 406, 42, { depth: 723, ambientFrameSweep: false, ambientRingMotion: false, onToggle() { muteUpdates += 1; } });
  assert.equal(mute.ringArc, null);
  assert.equal(mute.ringTween, null);
  assert.equal(mute.ringMotion, null);
  assert.equal(mute.goldSweep, null);
  assert.equal(mute.goldSweepTween, null);
  assert.equal(mute.goldSweepMotion, null);
  assert.equal(mute.button.interactive, true);
  assert.ok(mute.button.children.includes(mute.backing));
  mute.button.listeners.pointerover();
  assert.deepEqual(mute.backing.fillStyle.slice(0, 2), [0x0f172a, 0.72]);
  mute.button.listeners.pointerup();
  assert.equal(muteUpdates, 1);
  assert.ok(mute.icon.commands.length > 0);
  assert.equal(muteScene.__created.tweens.filter((tween) => tween.config.duration === NAVIGATION_RING_MOTION.duration).length, 0);
  assert.equal(muteScene.__created.tweens.filter((tween) => tween.config.duration === NAVIGATION_GOLD_SWEEP.duration).length, 0);
  assert.equal([...muteScene.__created.gameEventListeners.values()].reduce((count, listeners) => count + listeners.size, 0), 1);
  mute.destroy();
  assert.equal([...muteScene.__created.gameEventListeners.values()].reduce((count, listeners) => count + listeners.size, 0), 0);
});

test('bottom navigation gold sweep creates one non-interactive Graphics object per shared control', () => {
  const scene = makeScene();
  const controls = createBottomNavigationControls(scene, {
    onBack() {},
    onRules() {},
    onFullscreen() {},
  });

  for (const control of [controls.back, controls.rules, controls.fullscreen]) {
    assert.equal(control.goldSweep.type, 'Graphics');
    assert.equal(control.goldSweep.interactive, false);
    assert.equal(control.goldSweep.x, control.backing.x);
    assert.equal(control.goldSweep.y, control.backing.y);
    assert.equal(control.goldSweepMotion.geometry.size, control.backing.width);
    assert.equal(control.goldSweepMotion.geometry.cornerRadius, control.backing.rounded);
  }

  const goldTweens = scene.__created.tweens.filter((tween) => tween.config.duration === NAVIGATION_GOLD_SWEEP.duration);
  assert.equal(goldTweens.length, 3);
  assert.equal(new Set(goldTweens.map((tween) => tween.config.targets)).size, 3);
});

test('gold sweep preserves permanent gold frame and derives restrained rounded-rectangle geometry', () => {
  const scene = makeScene();
  const control = createFloatingControl(scene, 32, 810, 52, NAVIGATION_ICON_TYPES.HELP, () => {});
  const geometry = getNavigationGoldSweepGeometry(52, control.backing.rounded);

  assert.deepEqual(control.backing.strokeStyle, [1, 0xfacc15, 0.58]);
  assert.equal(control.backing.rounded, Math.max(6, Math.round(52 * 0.16)));
  assert.equal(control.goldSweepMotion.geometry.perimeter, geometry.perimeter);
  assert.ok(NAVIGATION_GOLD_SWEEP.primaryLengthRatio < 0.2);
  assert.ok(NAVIGATION_GOLD_SWEEP.trailLengthRatio < NAVIGATION_GOLD_SWEEP.primaryLengthRatio);
  assert.ok(control.goldSweep.commands.some((command) => command[0] === 'lineTo'));
});

test('gold sweep cycle is intermittent, deterministic, and independent from blue ring motion', () => {
  const scene = makeScene();
  const control = createFloatingControl(scene, 32, 810, 52, NAVIGATION_ICON_TYPES.FULLSCREEN, () => {});
  const otherPhase = getNavigationGoldSweepPhaseOffset(195, 810, 52);

  assert.equal(control.goldSweepTween.config.duration, NAVIGATION_GOLD_SWEEP.duration);
  assert.ok(control.goldSweepTween.config.duration >= 1200 && control.goldSweepTween.config.duration <= 2000);
  assert.equal(control.goldSweepTween.config.hold, NAVIGATION_GOLD_SWEEP.pauseDuration);
  assert.ok(control.goldSweepTween.config.hold >= 3000 && control.goldSweepTween.config.hold <= 6000);
  assert.equal(control.goldSweepTween.config.repeat, -1);
  assert.equal(control.goldSweepTween.config.delay, getNavigationGoldSweepPhaseOffset(32, 810, 52));
  assert.notEqual(control.goldSweepTween.config.delay, otherPhase);
  assert.notEqual(control.goldSweepTween.config.duration + control.goldSweepTween.config.hold, NAVIGATION_RING_MOTION.duration);
  assert.doesNotMatch(helperSource(), /Math\.random|Phaser\.Math\.Between|setTimeout\(/);
});

test('gold sweep cleanup removes tween and rebuilding navigation does not duplicate cycles', () => {
  const scene = makeScene();
  const controls = createBottomNavigationControls(scene, {
    onBack() {},
    onRules() {},
    onFullscreen() {},
  });
  const goldTweens = scene.__created.tweens.filter((tween) => tween.config.duration === NAVIGATION_GOLD_SWEEP.duration);

  assert.equal(goldTweens.length, 3);
  controls.back.destroy();
  controls.rules.destroy();
  controls.fullscreen.destroy();
  assert.equal(goldTweens.every((tween) => tween.removed), true);

  createBottomNavigationControls(scene, {
    onBack() {},
    onRules() {},
    onFullscreen() {},
  });
  assert.equal(scene.__created.tweens.filter((tween) => tween.config.duration === NAVIGATION_GOLD_SWEEP.duration).length, 6);
  assert.equal(scene.__created.tweens.filter((tween) => tween.config.duration === NAVIGATION_GOLD_SWEEP.duration && !tween.removed).length, 3);
});
