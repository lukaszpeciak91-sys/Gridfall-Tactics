import test from 'node:test';
import assert from 'node:assert/strict';
import { createLevelUpPopup, getLevelUpPopupViewModel, LEVEL_UP_POPUP_TIMING } from '../src/ui/levelUpPopup.js';
import { ACHIEVEMENT_UNLOCK_POPUP_ENTRANCE_OFFSET } from '../src/ui/achievementUnlockPopup.js';

function chainObject(extra = {}) {
  return {
    destroyed: false,
    alpha: 1,
    setDepth(depth) { this.depth = depth; return this; }, setPosition(x, y) { this.x = x; this.y = y; return this; }, setBlendMode() { return this; },
    fillStyle() { return this; }, fillEllipse() { return this; }, fillRoundedRect() { return this; }, lineStyle() { return this; }, strokeRoundedRect() { return this; },
    setOrigin() { return this; }, setAlpha(value) { this.alpha = value; return this; }, removeAllListeners() { this.listenersRemoved = true; return this; }, destroy() { this.destroyed = true; return this; },
    ...extra,
  };
}

function createMockScene() {
  const created = [];
  const tweens = [];
  const timers = [];
  return {
    scale: { gameSize: { width: 390, height: 844 } },
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
  };
}

test('level-up view model uses existing localized level label for transition copy', () => {
  assert.equal(getLevelUpPopupViewModel({ previousLevel: 6, newLevel: 7, locale: 'en' }).transitionText, 'LEVEL 6 → 7');
  assert.equal(getLevelUpPopupViewModel({ previousLevel: 5, newLevel: 7, locale: 'pl' }).transitionText, 'POZIOM 5 → 7');
});

test('level-up popup is compact, non-interactive, depth-aware, and self-cleaning', () => {
  const scene = createMockScene();
  const popup = createLevelUpPopup(scene, { previousLevel: 5, newLevel: 7, locale: 'en', baseDepth: 1212, timing: { ...LEVEL_UP_POPUP_TIMING, visibleMs: 1 } });
  assert.ok(scene.created.some((item) => item.text === 'LEVEL 5 → 7'));
  assert.equal(scene.created[0].depth, 1212);
  assert.equal(scene.created[1].depth, 1213);
  assert.ok(scene.created.slice(2).every((item) => item.depth === 1214));
  assert.ok(scene.created.every((item) => typeof item.setInteractive !== 'function'));
  let completed = false;
  popup.play({ onComplete: () => { completed = true; } });
  assert.equal(scene.createdTweens[0].config.y, `-=${ACHIEVEMENT_UNLOCK_POPUP_ENTRANCE_OFFSET}`);
  scene.createdTimers[0].callback();
  scene.createdTweens[1].config.onComplete();
  assert.equal(completed, true);
  assert.ok(scene.created.every((item) => item.destroyed));
});
