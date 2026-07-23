import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACHIEVEMENT_UNLOCK_POPUP_ENTRANCE_OFFSET,
  ACHIEVEMENT_UNLOCK_POPUP_TIMING,
  calculateAchievementUnlockPopupLayout,
  createAchievementUnlockPopup,
  getAchievementUnlockPopupMetadataLayout,
  getAchievementUnlockPopupTitleLayout,
  getAchievementUnlockPopupViewModel,
} from '../src/ui/achievementUnlockPopup.js';

function chainObject(extra = {}) {
  return {
    destroyed: false,
    alpha: 1,
    setDepth(depth) { this.depth = depth; return this; }, setPosition(x, y) { this.x = x; this.y = y; return this; }, setBlendMode() { return this; },
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
    description: { en: 'Win an Arena battle.', pl: 'Wygraj bitwę na Arenie.' },
  },
};

test('popup view model localizes title, description, unlock badge, stars, and queue position without progress', () => {
  const view = getAchievementUnlockPopupViewModel(definition, { index: 2, total: 3, locale: 'pl' });
  assert.equal(view.title, 'Pierwszy ryk');
  assert.equal(view.description, 'Wygraj bitwę na Arenie.');
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

test('popup renderer preserves default non-interactive depth layers', () => {
  const scene = createMockScene();
  createAchievementUnlockPopup(scene, definition, { index: 1, total: 1, locale: 'en' });
  assert.equal(scene.created[0].depth, 926);
  assert.equal(scene.created[1].depth, 927);
  assert.ok(scene.created.slice(2).every((item) => item.depth === 928));
  assert.ok(scene.created.every((item) => typeof item.setInteractive !== 'function'));
});

test('popup renderer maps custom baseDepth to glow, background, and content layers', () => {
  const scene = createMockScene();
  createAchievementUnlockPopup(scene, definition, { index: 1, total: 1, locale: 'en', baseDepth: 1212 });
  assert.equal(scene.created[0].depth, 1212);
  assert.equal(scene.created[1].depth, 1213);
  assert.ok(scene.created.slice(2).every((item) => item.depth === 1214));
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

test('popup view model formats compact signed point labels from shared progression values without locale suffixes', () => {
  assert.equal(getAchievementUnlockPopupViewModel({ ...definition, difficulty: 1 }, { locale: 'pl' }).pointLabel, '+25');
  assert.notEqual(getAchievementUnlockPopupViewModel({ ...definition, difficulty: 1 }, { locale: 'pl' }).pointLabel, '+25 PKT');
  assert.equal(getAchievementUnlockPopupViewModel({ ...definition, difficulty: 4 }, { locale: 'pl' }).pointLabel, '+200');
  assert.notEqual(getAchievementUnlockPopupViewModel({ ...definition, difficulty: 4 }, { locale: 'pl' }).pointLabel, '+200 PKT');
  assert.equal(getAchievementUnlockPopupViewModel({ ...definition, difficulty: 1 }, { locale: 'en' }).pointLabel, '+25');
  assert.notEqual(getAchievementUnlockPopupViewModel({ ...definition, difficulty: 1 }, { locale: 'en' }).pointLabel, '+25 PTS');
  assert.equal(getAchievementUnlockPopupViewModel({ ...definition, difficulty: 4 }, { locale: 'en' }).pointLabel, '+200');
  assert.notEqual(getAchievementUnlockPopupViewModel({ ...definition, difficulty: 4 }, { locale: 'en' }).pointLabel, '+200 PTS');
  assert.equal(getAchievementUnlockPopupViewModel({ ...definition, difficulty: 2 }, { locale: 'en' }).pointLabel, '+50');
  assert.equal(getAchievementUnlockPopupViewModel({ ...definition, difficulty: 3 }, { locale: 'pl' }).pointLabel, '+100');
});

test('popup renderer keeps points in the middle of the right metadata rail at narrow width', () => {
  const scene = createMockScene();
  scene.scale.gameSize = { width: 360, height: 640 };
  const longDefinition = {
    ...definition,
    difficulty: 4,
    display: {
      title: { en: 'Very Long Broadcast Achievement Title', pl: 'Bardzo długi tytuł osiągnięcia' },
      description: { en: 'Win a match with a long descriptive condition.', pl: 'Wygraj mecz z długim opisowym warunkiem.' },
    },
  };
  const popup = createAchievementUnlockPopup(scene, longDefinition, { index: 3, total: 6, locale: 'pl' });
  const pointText = scene.created.find((item) => item.text === '+200');
  const starsText = scene.created.find((item) => item.text === '★★★★');
  const counterText = scene.created.find((item) => item.text === '3 / 6');
  const badgeText = scene.created.find((item) => item.text === 'ODBLOKOWANE');
  assert.ok(pointText);
  assert.ok(starsText);
  assert.ok(counterText);
  assert.ok(badgeText);
  assert.equal(pointText.style.fontSize, '13px');
  assert.equal(counterText.style.fontSize, '10.5px');
  assert.equal(pointText.style.color, '#ffefb0');
  assert.equal(pointText.style.fontStyle, 'bold');
  assert.ok(pointText.style.strokeThickness > 0, 'point reward should get a restrained reward stroke/glow');
  assert.equal(counterText.style.color, '#7f8da3');
  assert.ok(starsText.y < pointText.y, 'points should render below the top-right stars');
  assert.ok(pointText.y < counterText.y, 'points should render above the batch counter');
  assert.ok(counterText.y < badgeText.y, 'counter should remain above the unlock badge');
  assert.notEqual(starsText.y, pointText.y, 'points must not share the title/header row');
  assert.equal(starsText.x, popup.layout.x + popup.layout.width * 0.5 - 15);
  assert.equal(pointText.x, popup.layout.x + popup.layout.width * 0.5 - 16);
  assert.equal(counterText.x, popup.layout.x + popup.layout.width * 0.5 - 16);
  assert.ok(pointText.x <= popup.layout.x + popup.layout.width * 0.5 - 15, 'point reward stays inside the frame');
  assert.ok(scene.created.every((item) => typeof item.setInteractive !== 'function'));
});


test('right metadata rail layout preserves ordering and original title reservation', () => {
  const layout = { width: 280, height: 94 };
  const titleLayout = getAchievementUnlockPopupTitleLayout('Bardzo długi tytuł osiągnięcia', layout);
  const metadata = getAchievementUnlockPopupMetadataLayout(layout);

  assert.equal(titleLayout.titleWidth, 158);
  assert.equal(metadata.stars.y, 15);
  assert.ok(metadata.stars.y < metadata.points.y, 'stars stay at the top of the rail');
  assert.ok(metadata.points.y < metadata.counter.y, 'points stay above quieter queue counter');
  assert.ok(metadata.counter.y < metadata.badge.y, 'queue counter stays above unlock badge');
  assert.notEqual(metadata.points.y, 12, 'points do not share the title row');
  assert.equal(metadata.points.fixedWidth, 84);
  assert.equal(metadata.counter.fixedWidth, 58);
  assert.ok(Number.parseFloat(metadata.points.fontSize) > Number.parseFloat(metadata.counter.fontSize));
  assert.ok(metadata.points.strokeThickness > 0);
});

test('title layout remains the original stars-only content zone with unchanged divider inputs', () => {
  const layout = { width: 330 };
  const titleLayout = getAchievementUnlockPopupTitleLayout('First Roar', layout);
  assert.equal(titleLayout.titleWidth, 208);
  assert.equal(titleLayout.mode, 'one-line');
  assert.equal(titleLayout.separatorY, 38);
  assert.equal(titleLayout.descriptionY, 44);
  assert.equal('metadataWidth' in titleLayout, false);
});

test('long two-line titles keep original width and description below the title area', () => {
  const layout = { width: 280 };
  const titleLayout = getAchievementUnlockPopupTitleLayout('Bardzo długi tytuł osiągnięcia', layout);
  assert.equal(titleLayout.titleWidth, 158);
  assert.equal(titleLayout.mode, 'two-line');
  assert.equal(titleLayout.maxLines, 2);
  assert.ok(titleLayout.descriptionY > titleLayout.separatorY);
});

test('right rail point rewards fit compact signed values without changing popup dimensions', () => {
  for (const [difficulty, locale, expected] of [
    [1, 'pl', '+25'],
    [3, 'pl', '+100'],
    [4, 'pl', '+200'],
    [4, 'en', '+200'],
  ]) {
    const scene = createMockScene();
    scene.scale.gameSize = { width: 360, height: 640 };
    const popup = createAchievementUnlockPopup(scene, { ...definition, difficulty }, { index: 6, total: 6, locale });
    const pointText = scene.created.find((item) => item.text === expected);
    assert.ok(pointText, `${expected} should render`);
    assert.equal(popup.layout.width, calculateAchievementUnlockPopupLayout(scene).width);
    assert.equal(popup.layout.height, 94);
    assert.equal(pointText.style.fixedWidth, 84);
    assert.ok(pointText.style.fixedWidth >= expected.length * 7, `${expected} should fit within the right rail`);
  }
});
