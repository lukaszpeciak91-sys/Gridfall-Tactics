import { translate } from '../localization/localeService.js';
import { ACHIEVEMENT_UNLOCK_POPUP_ENTRANCE_OFFSET, ACHIEVEMENT_UNLOCK_POPUP_TIMING, calculateAchievementUnlockPopupLayout } from './achievementUnlockPopup.js';

export const LEVEL_UP_POPUP_TIMING = Object.freeze({
  ...ACHIEVEMENT_UNLOCK_POPUP_TIMING,
  visibleMs: 2650,
});

const LEVEL_LABEL_FALLBACK = Object.freeze({ en: 'LEVEL', pl: 'POZIOM' });

function normalizeLevel(value, fallback = 1) {
  return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : fallback;
}

export function getLevelUpPopupViewModel({ previousLevel = 1, newLevel = 1, locale = 'en' } = {}) {
  const safePreviousLevel = normalizeLevel(previousLevel, 1);
  const safeNewLevel = normalizeLevel(newLevel, safePreviousLevel);
  const label = translate('ui.achievements.progression.level', locale, LEVEL_LABEL_FALLBACK[locale] ?? LEVEL_LABEL_FALLBACK.en);
  return {
    previousLevel: safePreviousLevel,
    newLevel: safeNewLevel,
    label,
    transitionText: `${label} ${safePreviousLevel} → ${safeNewLevel}`,
  };
}

export function createLevelUpPopup(scene, options = {}) {
  const timing = { ...LEVEL_UP_POPUP_TIMING, ...(options.timing ?? {}) };
  const resolvedBaseDepth = Number.isFinite(options.baseDepth) ? options.baseDepth : 926;
  const layout = options.layout ?? calculateAchievementUnlockPopupLayout(scene, options.modal);
  const view = getLevelUpPopupViewModel(options);
  const items = [];
  const tweens = [];
  const timers = [];
  let destroyed = false;
  let complete = false;

  const x = layout.x - layout.width * 0.5;
  const y = layout.y - layout.height * 0.5;
  const addItem = (item) => { items.push(item); return item; };

  const glow = addItem(scene.add.graphics().setDepth(resolvedBaseDepth).setPosition(layout.x, layout.y));
  glow.setBlendMode?.('ADD');
  for (let i = 12; i >= 1; i -= 1) {
    const p = i / 12;
    glow.fillStyle(i % 3 === 0 ? 0xffffff : 0xfacc15, 0.018 + (1 - p) * 0.05);
    glow.fillEllipse(0, 0, layout.width * (0.88 + p * 0.42), layout.height * (0.78 + p * 0.9));
  }

  const bg = addItem(scene.add.graphics().setDepth(resolvedBaseDepth + 1));
  bg.fillStyle(0x020817, 0.95); bg.fillRoundedRect(x, y, layout.width, layout.height, layout.radius);
  bg.fillStyle(0xfacc15, 0.2); bg.fillRoundedRect(x + 3, y + 3, layout.width - 6, layout.height - 6, layout.radius - 2);
  bg.fillStyle(0x111827, 0.9); bg.fillRoundedRect(x + 8, y + 8, layout.width - 16, layout.height - 16, layout.radius - 4);
  bg.fillStyle(0xfacc15, 0.9); bg.fillRoundedRect(x + 14, y + 7, layout.width - 28, 6, 2);
  bg.lineStyle(2.6, 0xfacc15, 0.96); bg.strokeRoundedRect(x, y, layout.width, layout.height, layout.radius);
  bg.lineStyle(1.1, 0xfef3c7, 0.38); bg.strokeRoundedRect(x + 5, y + 5, layout.width - 10, layout.height - 10, layout.radius - 3);

  addItem(scene.add.text(layout.x, y + layout.height * 0.5, view.transitionText, {
    fontFamily: 'Arial, sans-serif',
    fontSize: layout.width < 330 ? '22px' : '25px',
    color: '#fef3c7',
    fontStyle: 'bold',
    align: 'center',
    fixedWidth: layout.width - 32,
  }).setOrigin(0.5).setDepth(resolvedBaseDepth + 2));

  addItem(scene.add.text(layout.x, y + layout.height - 18, '◆', {
    fontFamily: 'Arial, sans-serif',
    fontSize: '13px',
    color: '#facc15',
    align: 'center',
  }).setOrigin(0.5).setDepth(resolvedBaseDepth + 2));

  items.forEach((item) => item?.setAlpha?.(0));
  const killTweens = () => items.forEach((item) => scene.tweens?.killTweensOf?.(item));
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    timers.splice(0).forEach((timer) => timer?.remove?.(false));
    tweens.splice(0).forEach((tween) => tween?.remove?.());
    killTweens();
    items.splice(0).forEach((item) => { item?.removeAllListeners?.(); item?.destroy?.(); });
  };
  const play = ({ onExitStart, onComplete } = {}) => {
    const travel = Number.isFinite(layout.entranceOffset) ? layout.entranceOffset : ACHIEVEMENT_UNLOCK_POPUP_ENTRANCE_OFFSET;
    items.forEach((item) => { if (Number.isFinite(item?.y)) item.y += travel; });
    const entryTween = scene.tweens.add({ targets: items, alpha: 1, y: `-=${travel}`, duration: timing.entryMs, ease: 'Sine.easeOut' });
    tweens.push(entryTween);
    const visibleTimer = scene.time.delayedCall(timing.entryMs + timing.visibleMs, () => {
      if (destroyed) return;
      onExitStart?.();
      const exitTween = scene.tweens.add({
        targets: items,
        alpha: 0,
        y: `+=${Math.max(4, Math.min(8, layout.height * 0.07))}`,
        duration: timing.exitMs,
        ease: 'Sine.easeInOut',
        onComplete: () => { complete = true; destroy(); onComplete?.(); },
      });
      tweens.push(exitTween);
    });
    timers.push(visibleTimer);
  };

  return { items, view, layout, play, destroy, isComplete: () => complete, isDestroyed: () => destroyed };
}
