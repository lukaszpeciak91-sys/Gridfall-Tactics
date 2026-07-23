import test from 'node:test';
import assert from 'node:assert/strict';
import { createLevelUpPopup, getLevelUpPopupViewModel, LEVEL_UP_POPUP_TIMING } from '../src/ui/levelUpPopup.js';
import { AUDIO_ASSETS, AUDIO_KEYS } from '../src/audio/audioAssets.js';

function chainObject(extra = {}) {
  return {
    destroyed: false,
    alpha: 1,
    scaleX: 1,
    scaleY: 1,
    setDepth(depth) { this.depth = depth; return this; }, setPosition(x, y) { this.x = x; this.y = y; return this; }, setBlendMode(mode) { this.blendMode = mode; return this; },
    fillStyle() { return this; }, fillEllipse() { return this; }, fillRoundedRect() { return this; }, lineStyle() { return this; }, strokeRoundedRect() { return this; },
    setOrigin() { return this; }, setAlpha(value) { this.alpha = value; return this; }, setShadow(...args) { this.shadow = args; return this; },
    removeAllListeners() { this.listenersRemoved = true; return this; }, destroy() { this.destroyed = true; return this; },
    ...extra,
  };
}

function createMockScene({ audioCached = true } = {}) {
  const created = [];
  const tweens = [];
  const timers = [];
  const playedSfx = [];
  return {
    scale: { gameSize: { width: 390, height: 844 } },
    scene: { isActive: () => true },
    cache: { audio: { exists: (key) => audioCached && key === AUDIO_KEYS.LEVEL_UP } },
    sound: { play: (key, options) => playedSfx.push({ key, options }), context: { state: 'running' } },
    add: {
      graphics() { const item = chainObject({ type: 'graphics' }); created.push(item); return item; },
      text(x, y, text, style) { const item = chainObject({ type: 'text', x, y, text, style, height: 20, displayHeight: 20 }); created.push(item); return item; },
    },
    tweens: {
      add(config) { const tween = { config, removed: false, remove() { this.removed = true; } }; tweens.push(tween); return tween; },
      killTweensOf(target) { target.killed = true; },
    },
    time: {
      delayedCall(delay, callback) { const timer = { delay, callback, removed: false, remove() { this.removed = true; } }; timers.push(timer); return timer; },
    },
    created,
    createdTweens: tweens,
    createdTimers: timers,
    playedSfx,
  };
}

test('level-up view model uses localized milestone label and compact hierarchy values', () => {
  assert.deepEqual(getLevelUpPopupViewModel({ previousLevel: 6, newLevel: 7, locale: 'en' }), {
    previousLevel: 6,
    newLevel: 7,
    label: 'LEVEL UP',
    finalLevelText: '7',
    transitionText: '6 → 7',
  });
  assert.equal(getLevelUpPopupViewModel({ previousLevel: 3, newLevel: 4, locale: 'pl' }).label, 'AWANS');
  assert.equal(getLevelUpPopupViewModel({ previousLevel: 3, newLevel: 4, locale: 'pl' }).transitionText, '3 → 4');
});

test('level-up popup creates premium centered panel with no side badge modules', () => {
  const scene = createMockScene();
  const popup = createLevelUpPopup(scene, { previousLevel: 3, newLevel: 7, locale: 'pl', baseDepth: 1212 });
  const texts = scene.created.filter((item) => item.type === 'text');
  assert.deepEqual(texts.map((item) => item.text), ['AWANS', '7', '3 → 7']);
  assert.ok(scene.created.some((item) => item.levelUpRole === 'premium-frame'));
  assert.ok(scene.created.some((item) => item.levelUpRole === 'dark-glass'));
  assert.ok(scene.created.some((item) => item.levelUpRole === 'horizontal-streak'));
  assert.ok(scene.created.some((item) => item.levelUpRole === 'center-point'));
  assert.ok(scene.created.some((item) => item.levelUpRole === 'gold-shimmer'));
  assert.ok(scene.created.every((item) => !/badge|module|side/i.test(item.levelUpRole ?? '')));
  assert.ok(scene.created.every((item) => typeof item.setInteractive !== 'function'));
  assert.equal(scene.created[0].depth, 1212);
  assert.equal(popup.layout.entranceOffset, 0);
});

test('level-up popup materializes by point/streak/frame sequence instead of achievement slide-in', () => {
  const scene = createMockScene();
  const popup = createLevelUpPopup(scene, { previousLevel: 3, newLevel: 4, locale: 'en', timing: { ...LEVEL_UP_POPUP_TIMING, visibleMs: 1 } });
  popup.play();
  assert.equal(scene.playedSfx.length, 1);
  assert.equal(scene.playedSfx[0].key, AUDIO_KEYS.LEVEL_UP);
  assert.notEqual(scene.playedSfx[0].key, AUDIO_KEYS.ACHIEVEMENT_UNLOCK);
  assert.ok(scene.createdTweens.length >= 9);
  assert.ok(scene.createdTweens.every((tween) => tween.config.y === undefined), 'level-up must not use slide/fly y tween');
  const findDelay = (role) => scene.createdTweens.find((tween) => {
    const targets = Array.isArray(tween.config.targets) ? tween.config.targets : [tween.config.targets];
    return targets.some((target) => target?.levelUpRole === role);
  })?.config.delay ?? 0;
  assert.equal(findDelay('center-point'), 0);
  assert.ok(findDelay('horizontal-streak') > findDelay('center-point'));
  assert.ok(findDelay('premium-frame') > findDelay('horizontal-streak'));
  assert.ok(findDelay('dark-glass') > findDelay('premium-frame'));
  assert.ok(findDelay('label') > findDelay('dark-glass'));
  assert.ok(findDelay('final-level') > findDelay('label'));
  assert.ok(findDelay('transition') > findDelay('label'));
});

test('level-up popup exit completes once and destroy cancels pending timers/tweens', () => {
  const scene = createMockScene();
  const popup = createLevelUpPopup(scene, { previousLevel: 5, newLevel: 7, locale: 'en', timing: { ...LEVEL_UP_POPUP_TIMING, visibleMs: 1 } });
  let exitStarts = 0;
  let completes = 0;
  popup.play({ onExitStart: () => { exitStarts += 1; }, onComplete: () => { completes += 1; } });
  scene.createdTimers[0].callback();
  const exitTween = scene.createdTweens.at(-1);
  exitTween.config.onComplete();
  exitTween.config.onComplete();
  assert.equal(exitStarts, 1);
  assert.equal(completes, 1);
  assert.equal(popup.isComplete(), true);
  assert.ok(scene.created.every((item) => item.destroyed));

  const scene2 = createMockScene();
  const popup2 = createLevelUpPopup(scene2, { previousLevel: 1, newLevel: 2, locale: 'en' });
  popup2.play();
  popup2.destroy();
  assert.ok(scene2.createdTimers.every((timer) => timer.removed));
  assert.ok(scene2.createdTweens.every((tween) => tween.removed));
});

test('level_up audio key/path is registered and missing audio does not block rendering', () => {
  assert.equal(AUDIO_KEYS.LEVEL_UP, 'level_up');
  assert.equal(AUDIO_ASSETS[AUDIO_KEYS.LEVEL_UP].path, './assets/audio/sfx/level_up.mp3');
  const scene = createMockScene({ audioCached: false });
  const popup = createLevelUpPopup(scene, { previousLevel: 2, newLevel: 3, locale: 'en' });
  popup.play();
  assert.equal(scene.playedSfx.length, 0);
  assert.ok(scene.created.some((item) => item.levelUpRole === 'premium-frame'));
  assert.equal(popup.isDestroyed(), false);
});
