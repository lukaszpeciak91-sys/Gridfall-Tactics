import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACHIEVEMENT_UNLOCK_POPUP_ENTRANCE_OFFSET,
  ACHIEVEMENT_UNLOCK_POPUP_TIMING,
  calculateAchievementUnlockPopupLayout,
  createAchievementUnlockPopup,
  getAchievementUnlockPopupViewModel,
} from '../src/ui/achievementUnlockPopup.js';

function chainObject(extra = {}) {
  return {
    destroyed: false,
    alpha: 1,
    setDepth() { return this; }, setPosition(x, y) { this.x = x; this.y = y; return this; }, setBlendMode() { return this; },
    fillStyle() { return this; }, fillEllipse() { return this; }, fillRoundedRect() { return this; }, lineStyle() { return this; }, strokeRoundedRect() { return this; }, lineBetween() { return this; },
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
      text(x, y, text, style) { const item = chainObject({ type: 'text', x, y, text, style, height: 18, displayHeight: 18 }); created.push(item); return item; },
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

const definition = {
  id: 'arena_first_win',
  category: 'arena',
  difficulty: 4,
  display: {
    title: { en: 'First Roar', pl: 'Pierwszy ryk' },
    description: { en: 'Win an Arena battle.', pl: 'Wygraj bitwę Areny.' },
  },
};

test('popup view model localizes title, description, unlock badge, stars, and queue position without progress', () => {
  const view = getAchievementUnlockPopupViewModel(definition, { index: 2, total: 3, locale: 'pl' });
  assert.equal(view.title, 'Pierwszy ryk');
  assert.equal(view.description, 'Wygraj bitwę Areny.');
  assert.equal(view.badge, 'ODBLOKOWANE');
  assert.equal(view.stars, '★★★★');
  assert.equal(view.queuePosition, '2 / 3');
  assert.doesNotMatch(Object.values(view).join(' '), /10 \/ 10/);
});

test('popup renderer creates compact content and explicit cleanup ownership', () => {
  const scene = createMockScene();
  const modal = { stats: { y: 410, height: 24 }, buttons: [{ items: [{ y: 620, height: 72 }] }] };
  const layout = calculateAchievementUnlockPopupLayout(scene, modal);
  assert.ok(layout.y - layout.height * 0.5 >= layout.buttonSafeTop);
  assert.ok(layout.y + layout.height * 0.5 < 844 - layout.bottomSafeGap - ACHIEVEMENT_UNLOCK_POPUP_ENTRANCE_OFFSET);
  assert.ok(layout.y + layout.height * 0.5 <= 844 - layout.bottomSafeGap);
  const popup = createAchievementUnlockPopup(scene, definition, { index: 1, total: 2, locale: 'en', layout, timing: { ...ACHIEVEMENT_UNLOCK_POPUP_TIMING, visibleMs: 1 } });
  assert.equal(typeof popup.destroy, 'function');
  assert.equal(typeof popup.play, 'function');
  assert.ok(layout.width <= 390 * 0.86);
  assert.ok(scene.created.some((item) => item.text === 'First Roar'));
  assert.ok(scene.created.some((item) => item.text === 'Win an Arena battle.'));
  assert.ok(scene.created.some((item) => item.text === 'UNLOCKED'));
  assert.ok(scene.created.some((item) => item.text === '★★★★'));
  assert.ok(scene.created.some((item) => item.text === '1 / 2'));
  popup.destroy();
  assert.ok(scene.created.every((item) => item.destroyed));
});

test('cleanup cancels timers and tweens and destroys all popup objects', () => {
  const scene = createMockScene();
  const popup = createAchievementUnlockPopup(scene, definition, { index: 1, total: 1, locale: 'en' });
  popup.play();
  assert.equal(scene.createdTimers.length, 1);
  assert.equal(scene.createdTweens.length, 1);
  popup.destroy();
  assert.ok(scene.createdTimers.every((timer) => timer.removed));
  assert.ok(scene.createdTweens.every((tween) => tween.removed));
  assert.ok(scene.created.every((item) => item.destroyed));
});


test('popup enters from below by the configured offset and exits with a restrained downward drift', () => {
  const scene = createMockScene();
  const popup = createAchievementUnlockPopup(scene, definition, { index: 1, total: 1, locale: 'en' });
  const originalYs = scene.created.map((item) => item.y).filter(Number.isFinite);
  let exitStarted = false;
  popup.play({ onExitStart: () => { exitStarted = true; } });
  assert.equal(scene.createdTweens[0].config.alpha, 1);
  assert.equal(scene.createdTweens[0].config.y, `-=${ACHIEVEMENT_UNLOCK_POPUP_ENTRANCE_OFFSET}`);
  scene.createdTimers[0].callback();
  assert.equal(exitStarted, true);
  assert.equal(scene.createdTweens[1].config.alpha, 0);
  assert.match(scene.createdTweens[1].config.y, /^\+=/);
  const shiftedYs = scene.created.map((item) => item.y).filter(Number.isFinite);
  assert.ok(shiftedYs.some((y, index) => y > originalYs[index]));
});


test('mobile portrait layout balances final Y above bottom safe margin without bottom clamping', () => {
  const scene = createMockScene();
  const modal = { buttons: [{ items: [{ y: 620, height: 72, displayHeight: 72 }] }] };
  const layout = calculateAchievementUnlockPopupLayout(scene, modal);
  const top = layout.y - layout.height * 0.5;
  const bottom = layout.y + layout.height * 0.5;
  const lowestFinalBottom = scene.scale.gameSize.height - layout.bottomSafeGap;
  assert.ok(top >= layout.buttonSafeTop, 'popup top must clear live result button hitboxes');
  assert.ok(bottom <= lowestFinalBottom, 'popup bottom must preserve the safe margin');
  assert.ok(bottom < lowestFinalBottom - ACHIEVEMENT_UNLOCK_POPUP_ENTRANCE_OFFSET, 'final Y should not be clamped directly against the viewport bottom');
});

test('short portrait layout keeps entrance visible and start position renderable', () => {
  const scene = createMockScene();
  scene.scale.gameSize = { width: 360, height: 640 };
  const modal = { buttons: [{ items: [{ y: 470, height: 56, displayHeight: 56 }] }] };
  const layout = calculateAchievementUnlockPopupLayout(scene, modal);
  const startBottom = layout.y + ACHIEVEMENT_UNLOCK_POPUP_ENTRANCE_OFFSET + layout.height * 0.5;
  assert.equal(layout.entranceOffset, ACHIEVEMENT_UNLOCK_POPUP_ENTRANCE_OFFSET);
  assert.ok(ACHIEVEMENT_UNLOCK_POPUP_ENTRANCE_OFFSET >= 18);
  assert.ok(startBottom <= scene.scale.gameSize.height - layout.bottomSafeGap, 'entrance start must remain fully renderable');
});

test('sequential popups share the same final Y and entrance offset', () => {
  const scene = createMockScene();
  const modal = { buttons: [{ items: [{ y: 620, height: 72 }] }] };
  const layout = calculateAchievementUnlockPopupLayout(scene, modal);
  const first = createAchievementUnlockPopup(scene, definition, { index: 1, total: 2, locale: 'en', layout });
  const second = createAchievementUnlockPopup(scene, definition, { index: 2, total: 2, locale: 'en', layout });
  first.play();
  second.play();
  assert.equal(first.layout.y, second.layout.y);
  assert.equal(scene.createdTweens[0].config.y, `-=${ACHIEVEMENT_UNLOCK_POPUP_ENTRANCE_OFFSET}`);
  assert.equal(scene.createdTweens[1].config.y, `-=${ACHIEVEMENT_UNLOCK_POPUP_ENTRANCE_OFFSET}`);
});
