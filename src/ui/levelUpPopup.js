import { AUDIO_KEYS } from '../audio/audioAssets.js';
import { playSfx } from '../audio/audioPlayback.js';
import { translate } from '../localization/localeService.js';
import { calculateAchievementUnlockPopupLayout } from './achievementUnlockPopup.js';

export const LEVEL_UP_POPUP_TIMING = Object.freeze({
  initialDelayMs: 0,
  entryMs: 850,
  visibleMs: 2400,
  exitMs: 600,
});

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
  const label = translate('ui.achievements.progression.levelUp', locale, 'LEVEL UP');
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

  const centralFlash = addItem(scene.add.graphics().setDepth(resolvedBaseDepth + 5).setPosition(cx, cy), 'central-flash');
  centralFlash.setBlendMode?.('ADD');
  centralFlash.fillStyle(0xfffbeb, 0.96).fillEllipse(0, 0, 22, 22);
  centralFlash.fillStyle(0xf6c453, 0.32).fillEllipse(0, 0, layout.width * 0.42, layout.height * 0.72);
  centralFlash.fillStyle(0x60a5fa, 0.18).fillEllipse(0, 0, layout.width * 0.68, layout.height * 0.94);

  // Draw the plaque around its own origin so its reveal is one calm materialization,
  // rather than a collection of rails arriving from unrelated directions.
  const frame = addItem(scene.add.graphics().setDepth(resolvedBaseDepth + 2).setPosition(cx, cy), 'premium-frame');
  frame.fillStyle(0x071225, 0.96).fillRoundedRect(-layout.width * 0.5, -layout.height * 0.5, layout.width, layout.height, layout.radius);
  frame.lineStyle(3, 0x0f2a4d, 0.96).strokeRoundedRect(-layout.width * 0.5 + 1, -layout.height * 0.5 + 1, layout.width - 2, layout.height - 2, layout.radius);
  frame.lineStyle(1.6, 0xf6c453, 0.72).strokeRoundedRect(-layout.width * 0.5 + 5, -layout.height * 0.5 + 5, layout.width - 10, layout.height - 10, layout.radius - 4);
  frame.lineStyle(1, 0x93c5fd, 0.2).strokeRoundedRect(-layout.width * 0.5 + 11, -layout.height * 0.5 + 11, layout.width - 22, layout.height - 22, layout.radius - 8);

  const glass = addItem(scene.add.graphics().setDepth(resolvedBaseDepth + 1).setPosition(cx, cy), 'dark-glass');
  glass.fillStyle(0x020817, 0.88).fillRoundedRect(-layout.width * 0.5 + 10, -layout.height * 0.5 + 10, layout.width - 20, layout.height - 20, layout.radius - 8);
  glass.fillStyle(0x172554, 0.3).fillRoundedRect(-layout.width * 0.5 + 14, -layout.height * 0.5 + 15, layout.width - 28, layout.height * 0.34, layout.radius - 10);
  glass.fillStyle(0xffffff, 0.07).fillRoundedRect(-layout.width * 0.5 + 24, -layout.height * 0.5 + 18, layout.width - 48, 12, 6);
  glass.fillStyle(0xf59e0b, 0.09).fillEllipse(0, 8, layout.width * 0.46, layout.height * 0.56);

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

  const closingFlash = addItem(scene.add.graphics().setDepth(resolvedBaseDepth + 9).setPosition(cx, cy), 'closing-flash');
  closingFlash.setBlendMode?.('ADD');
  closingFlash.fillStyle(0xfffbeb, 0.94).fillEllipse(0, 0, layout.width * 0.64, 18);
  closingFlash.fillStyle(0xf6c453, 0.3).fillEllipse(0, 0, layout.width * 0.84, 36);

  items.forEach((item) => item?.setAlpha?.(0));
  frame.scaleX = frame.scaleY = 0.94;
  glass.scaleX = glass.scaleY = 0.94;
  centralFlash.scaleX = centralFlash.scaleY = 0.3;
  shimmer.scaleX = 0.4;
  closingFlash.scaleX = 0.35;

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
    addTween({ targets: centralFlash, alpha: 1, scaleX: 1, scaleY: 1, duration: 110, ease: 'Sine.easeOut' });
    addTween({ targets: centralFlash, alpha: 0, scaleX: 1.2, scaleY: 1.2, duration: 180, delay: 110, ease: 'Sine.easeIn' });
    addTween({ targets: [frame, glass, aura], alpha: 1, scaleX: 1, scaleY: 1, duration: 270, delay: 120, ease: 'Cubic.easeOut' });
    addTween({ targets: labelText, alpha: 1, duration: 170, delay: 350, ease: 'Sine.easeOut' });
    addTween({ targets: finalText, alpha: 1, scaleX: 1.035, scaleY: 1.035, duration: 210, delay: 440, ease: 'Back.easeOut' });
    addTween({ targets: finalText, scaleX: 1, scaleY: 1, duration: 160, delay: 600, ease: 'Sine.easeInOut' });
    addTween({ targets: transitionText, alpha: 1, duration: 170, delay: 560, ease: 'Sine.easeOut' });
    addTween({ targets: shimmer, alpha: 0.72, x: cx + layout.width * 0.42, duration: 230, delay: 610, ease: 'Sine.easeInOut' });

    const visibleTimer = scene.time.delayedCall(timing.entryMs + timing.visibleMs, () => {
      if (destroyed) return;
      exitStart();
      addTween({
        targets: [labelText, finalText, transitionText, aura, shimmer], alpha: 0, duration: timing.exitMs * 0.58, ease: 'Sine.easeInOut',
      });
      addTween({
        targets: [frame, glass], alpha: 0, scaleY: 0.08, duration: timing.exitMs * 0.82, ease: 'Sine.easeInOut',
      });
      addTween({
        targets: closingFlash, alpha: 0.92, scaleX: 1, scaleY: 0.4, duration: timing.exitMs * 0.5, ease: 'Sine.easeOut',
      });
      addTween({
        targets: closingFlash, alpha: 0, scaleX: 1.3, scaleY: 0.12, duration: timing.exitMs * 0.5, delay: timing.exitMs * 0.5, ease: 'Sine.easeIn', onComplete: finish,
      });
    });
    timers.push(visibleTimer);
  };

  return { items, view, layout, play, destroy, isComplete: () => complete, isDestroyed: () => destroyed };
}
