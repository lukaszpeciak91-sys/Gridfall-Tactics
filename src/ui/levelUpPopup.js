import { AUDIO_KEYS } from '../audio/audioAssets.js';
import { playSfx } from '../audio/audioPlayback.js';
import { translate } from '../localization/localeService.js';
import { calculateAchievementUnlockPopupLayout } from './achievementUnlockPopup.js';

export const LEVEL_UP_POPUP_TIMING = Object.freeze({
  initialDelayMs: 0,
  entryMs: 480,
  visibleMs: 1300,
  exitMs: 320,
});

const LEVEL_UP_LABEL_FALLBACK = Object.freeze({ en: 'LEVEL UP', pl: 'AWANS' });
const LEVEL_UP_SFX_SOURCE = 'level-up-popup';

function normalizeLevel(value, fallback = 1) {
  return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : fallback;
}

function invokeOnce(callback) {
  let invoked = false;
  return (...args) => {
    if (invoked) return;
    invoked = true;
    callback?.(...args);
  };
}

export function getLevelUpPopupViewModel({ previousLevel = 1, newLevel = 1, locale = 'en' } = {}) {
  const safePreviousLevel = normalizeLevel(previousLevel, 1);
  const safeNewLevel = normalizeLevel(newLevel, safePreviousLevel);
  const label = translate('ui.achievements.progression.levelUp', locale, LEVEL_UP_LABEL_FALLBACK[locale] ?? LEVEL_UP_LABEL_FALLBACK.en);
  return {
    previousLevel: safePreviousLevel,
    newLevel: safeNewLevel,
    label,
    finalLevelText: `${safeNewLevel}`,
    transitionText: `${safePreviousLevel} → ${safeNewLevel}`,
  };
}

export function calculateLevelUpPopupLayout(scene, modal, sourceLayout = null) {
  const base = sourceLayout ?? calculateAchievementUnlockPopupLayout(scene, modal);
  const width = Math.max(276, Math.min(base.width * 0.92, 390));
  const height = Math.max(118, Math.min(base.height + 38, 142));
  const gameHeight = scene?.scale?.gameSize?.height ?? 720;
  const bottomSafeGap = Number.isFinite(base.bottomSafeGap) ? base.bottomSafeGap : 18;
  const y = Math.min(base.y, gameHeight - bottomSafeGap - height * 0.5);
  return {
    ...base,
    x: base.x,
    y,
    width,
    height,
    radius: Math.max(16, Math.min(22, height * 0.16)),
    entranceOffset: 0,
  };
}

export function createLevelUpPopup(scene, options = {}) {
  const timing = { ...LEVEL_UP_POPUP_TIMING, ...(options.timing ?? {}) };
  const resolvedBaseDepth = Number.isFinite(options.baseDepth) ? options.baseDepth : 926;
  const layout = calculateLevelUpPopupLayout(scene, options.modal, options.layout);
  const view = getLevelUpPopupViewModel(options);
  const items = [];
  const tweens = [];
  const timers = [];
  let destroyed = false;
  let complete = false;

  const x = layout.x - layout.width * 0.5;
  const y = layout.y - layout.height * 0.5;
  const cx = layout.x;
  const cy = layout.y;
  const addItem = (item, role) => {
    if (role) item.levelUpRole = role;
    items.push(item);
    return item;
  };

  const aura = addItem(scene.add.graphics().setDepth(resolvedBaseDepth).setPosition(cx, cy), 'broadcast-aura');
  aura.setBlendMode?.('ADD');
  for (let i = 10; i >= 1; i -= 1) {
    const p = i / 10;
    aura.fillStyle(i % 2 === 0 ? 0x7c3aed : 0x38bdf8, 0.012 + (1 - p) * 0.035);
    aura.fillEllipse(0, 0, layout.width * (0.44 + p * 0.54), layout.height * (0.36 + p * 0.55));
  }

  const centerPoint = addItem(scene.add.graphics().setDepth(resolvedBaseDepth + 5).setPosition(cx, cy), 'center-point');
  centerPoint.setBlendMode?.('ADD');
  centerPoint.fillStyle(0xfef3c7, 0.98).fillEllipse(0, 0, 10, 10);
  centerPoint.fillStyle(0xf59e0b, 0.42).fillEllipse(0, 0, 24, 24);

  const streak = addItem(scene.add.graphics().setDepth(resolvedBaseDepth + 4).setPosition(cx, cy), 'horizontal-streak');
  streak.setBlendMode?.('ADD');
  streak.fillStyle(0xfef3c7, 0.9).fillRoundedRect(-layout.width * 0.34, -2, layout.width * 0.68, 4, 2);
  streak.fillStyle(0x60a5fa, 0.22).fillRoundedRect(-layout.width * 0.43, -8, layout.width * 0.86, 16, 8);

  const frame = addItem(scene.add.graphics().setDepth(resolvedBaseDepth + 2), 'premium-frame');
  frame.fillStyle(0x071225, 0.96).fillRoundedRect(x, y, layout.width, layout.height, layout.radius);
  frame.lineStyle(3, 0x0f2a4d, 0.96).strokeRoundedRect(x + 1, y + 1, layout.width - 2, layout.height - 2, layout.radius);
  frame.lineStyle(1.6, 0xf6c453, 0.68).strokeRoundedRect(x + 5, y + 5, layout.width - 10, layout.height - 10, layout.radius - 4);
  frame.lineStyle(1, 0x93c5fd, 0.22).strokeRoundedRect(x + 11, y + 11, layout.width - 22, layout.height - 22, layout.radius - 8);
  frame.fillStyle(0xf6c453, 0.78).fillRoundedRect(cx - layout.width * 0.21, y + 5, layout.width * 0.42, 3, 1.5);
  frame.fillStyle(0x60a5fa, 0.16).fillRoundedRect(cx - layout.width * 0.36, cy - 1, layout.width * 0.72, 2, 1);

  const glass = addItem(scene.add.graphics().setDepth(resolvedBaseDepth + 1), 'dark-glass');
  glass.fillStyle(0x020817, 0.88).fillRoundedRect(x + 10, y + 10, layout.width - 20, layout.height - 20, layout.radius - 8);
  glass.fillStyle(0x172554, 0.28).fillRoundedRect(x + 14, y + 15, layout.width - 28, layout.height * 0.34, layout.radius - 10);
  glass.fillStyle(0xffffff, 0.08).fillRoundedRect(x + 24, y + 18, layout.width - 48, 12, 6);
  glass.fillStyle(0xf59e0b, 0.08).fillEllipse(cx, cy + 8, layout.width * 0.46, layout.height * 0.56);

  const labelText = addItem(scene.add.text(cx, y + 28, view.label, {
    fontFamily: 'Arial, sans-serif', fontSize: layout.width < 320 ? '15px' : '17px', color: '#c7d2fe', fontStyle: 'bold', align: 'center', fixedWidth: layout.width - 40,
  }).setOrigin(0.5).setDepth(resolvedBaseDepth + 6), 'label');
  const finalText = addItem(scene.add.text(cx, cy + 6, view.finalLevelText, {
    fontFamily: 'Arial Black, Arial, sans-serif', fontSize: layout.width < 320 ? '54px' : '62px', color: '#fff7cc', stroke: '#8a4f0f', strokeThickness: 3, fontStyle: 'bold', align: 'center', fixedWidth: layout.width - 48,
  }).setOrigin(0.5).setDepth(resolvedBaseDepth + 7), 'final-level');
  finalText.setShadow?.(0, 0, '#f6c453', 10, true, true);
  const transitionText = addItem(scene.add.text(cx, y + layout.height - 24, view.transitionText, {
    fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#fde68a', fontStyle: 'bold', align: 'center', fixedWidth: layout.width - 46,
  }).setOrigin(0.5).setDepth(resolvedBaseDepth + 6), 'transition');

  const shimmer = addItem(scene.add.graphics().setDepth(resolvedBaseDepth + 8).setPosition(cx - layout.width * 0.42, cy), 'gold-shimmer');
  shimmer.setBlendMode?.('ADD');
  shimmer.fillStyle(0xfef3c7, 0.34).fillRoundedRect(-8, -layout.height * 0.34, 16, layout.height * 0.68, 8);

  items.forEach((item) => item?.setAlpha?.(0));
  frame.scaleX = 0.05;
  glass.scaleY = 0.18;
  centerPoint.scaleX = centerPoint.scaleY = 0.35;
  streak.scaleX = 0.1;
  shimmer.scaleX = 0.4;

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
    if (destroyed) return;
    playSfx(scene, AUDIO_KEYS.LEVEL_UP, { source: LEVEL_UP_SFX_SOURCE, cooldownMs: 0 });
    const finish = invokeOnce(() => { complete = true; destroy(); onComplete?.(); });
    const exitStart = invokeOnce(() => onExitStart?.());
    const addTween = (config) => { const tween = scene.tweens.add(config); tweens.push(tween); return tween; };
    addTween({ targets: centerPoint, alpha: 1, scaleX: 1, scaleY: 1, duration: 90, ease: 'Sine.easeOut' });
    addTween({ targets: streak, alpha: 1, scaleX: 1, duration: 170, delay: 70, ease: 'Sine.easeOut' });
    addTween({ targets: frame, alpha: 1, scaleX: 1, duration: 210, delay: 160, ease: 'Cubic.easeOut' });
    addTween({ targets: [glass, aura], alpha: 1, scaleY: 1, duration: 220, delay: 240, ease: 'Sine.easeOut' });
    addTween({ targets: labelText, alpha: 1, duration: 150, delay: 330, ease: 'Sine.easeOut' });
    addTween({ targets: finalText, alpha: 1, scaleX: 1.035, scaleY: 1.035, duration: 170, delay: 430, ease: 'Back.easeOut' });
    addTween({ targets: finalText, scaleX: 1, scaleY: 1, duration: 160, delay: 600, ease: 'Sine.easeInOut' });
    addTween({ targets: transitionText, alpha: 1, duration: 140, delay: 520, ease: 'Sine.easeOut' });
    addTween({ targets: shimmer, alpha: 1, x: cx + layout.width * 0.42, duration: 360, delay: 610, ease: 'Sine.easeInOut' });

    const visibleTimer = scene.time.delayedCall(timing.entryMs + timing.visibleMs, () => {
      if (destroyed) return;
      exitStart();
      addTween({
        targets: [labelText, finalText, transitionText, glass, aura, shimmer], alpha: 0, duration: timing.exitMs * 0.72, ease: 'Sine.easeInOut',
      });
      addTween({
        targets: frame, alpha: 0, scaleX: 0.08, duration: timing.exitMs, ease: 'Sine.easeInOut',
      });
      addTween({
        targets: [streak, centerPoint], alpha: 0, scaleX: 0.18, scaleY: 0.45, duration: timing.exitMs, ease: 'Sine.easeInOut', onComplete: finish,
      });
    });
    timers.push(visibleTimer);
  };

  return { items, view, layout, play, destroy, isComplete: () => complete, isDestroyed: () => destroyed };
}
