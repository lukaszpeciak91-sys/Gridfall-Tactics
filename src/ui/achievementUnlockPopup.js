import { getActiveLocale, translate } from '../localization/localeService.js';
import { ACHIEVEMENT_CATEGORY_GROUPS, normalizeAchievementDifficulty } from '../systems/achievements.js';
import { getAchievementDefinitionPointValue } from '../systems/achievementProgression.js';

export const ACHIEVEMENT_UNLOCK_POPUP_TIMING = Object.freeze({
  initialDelayMs: 420,
  entryMs: 280,
  visibleMs: 2350,
  exitMs: 280,
  overlapMs: 140,
});


const BADGE_TEXT = Object.freeze({ en: 'UNLOCKED', pl: 'ODBLOKOWANE' });
const POINT_SUFFIX_FALLBACK = Object.freeze({ en: 'PTS', pl: 'PKT' });
export const ACHIEVEMENT_UNLOCK_POPUP_ENTRANCE_OFFSET = 22;

const ACHIEVEMENT_UNLOCK_POPUP_HEIGHT = 94;
const TITLE_MIN_FONT_SIZE = 15;
const TITLE_NARROW_LENGTH_THRESHOLD = 17;
const TITLE_LONG_LENGTH_THRESHOLD = 20;

const FACTION_ACCENTS = Object.freeze({
  aggro: 0xf97316,
  tank: 0xfacc15,
  control: 0x7dd3fc,
  swarm: 0xa3e635,
  balanced: 0xa78bfa,
});

function estimatePopupTitleWidth(title, fontSize) {
  const safeTitle = typeof title === 'string' ? title : '';
  return [...safeTitle].reduce((width, character) => {
    if (character === ' ') return width + fontSize * 0.34;
    if ("ilIł.,!’'".includes(character)) return width + fontSize * 0.34;
    if ('mwMWą'.includes(character)) return width + fontSize * 0.9;
    if (/[A-ZÓŻŹĆĄŚĘŁŃ]/.test(character)) return width + fontSize * 0.68;
    return width + fontSize * 0.56;
  }, 0);
}

export function getAchievementUnlockPopupTitleLayout(title, layout) {
  const titleWidth = Math.max(96, layout.width - 122);
  const baseFontSize = layout.width < 330 ? 17 : 19;
  const estimatedBaseWidth = estimatePopupTitleWidth(title, baseFontSize);
  const isNarrowTitleArea = titleWidth < 180;
  const titleLength = typeof title === 'string' ? [...title].length : 0;
  const usesTwoLines = estimatedBaseWidth > titleWidth;
  const shouldReduceFont = usesTwoLines || (isNarrowTitleArea && titleLength > TITLE_NARROW_LENGTH_THRESHOLD) || titleLength > TITLE_LONG_LENGTH_THRESHOLD;
  const fontSize = shouldReduceFont ? Math.max(TITLE_MIN_FONT_SIZE, baseFontSize - 2) : baseFontSize;

  return {
    fontSize: `${fontSize}px`,
    maxLines: usesTwoLines ? 2 : 1,
    titleWidth,
    separatorY: usesTwoLines ? 50 : 38,
    descriptionY: usesTwoLines ? 56 : 44,
    mode: usesTwoLines ? 'two-line' : 'one-line',
  };
}

function resolveLocaleText(definition, key, locale) {
  return definition?.display?.[key]?.[locale]
    ?? definition?.display?.[key]?.en
    ?? definition?.[key]
    ?? definition?.id
    ?? '';
}

export function getAchievementUnlockPopupViewModel(definition, { index = 1, total = 1, locale = getActiveLocale() } = {}) {
  const safeIndex = Math.max(1, Math.floor(index));
  const safeTotal = Math.max(safeIndex, Math.floor(total));
  const difficulty = normalizeAchievementDifficulty(definition?.difficulty);
  const points = getAchievementDefinitionPointValue(definition);
  const pointSuffix = translate('ui.achievements.progression.pointsAbbreviation', locale, POINT_SUFFIX_FALLBACK[locale] ?? POINT_SUFFIX_FALLBACK.en);
  return {
    id: typeof definition?.id === 'string' ? definition.id : '',
    title: resolveLocaleText(definition, 'title', locale),
    description: resolveLocaleText(definition, 'description', locale),
    badge: BADGE_TEXT[locale] ?? BADGE_TEXT.en,
    stars: '★'.repeat(difficulty),
    queuePosition: `${safeIndex} / ${safeTotal}`,
    pointLabel: Number.isFinite(points) && points > 0 ? `+${points} ${pointSuffix}` : '',
    points,
    difficulty,
  };
}

export function getAchievementUnlockPopupTheme(definition) {
  const groupKey = ACHIEVEMENT_CATEGORY_GROUPS[definition?.category] ?? 'general';
  const accent = groupKey === 'arena'
    ? 0xfacc15
    : groupKey === 'factions'
      ? (FACTION_ACCENTS[definition?.factionKey] ?? 0xa78bfa)
      : 0x7dd3fc;
  return {
    accent,
    frameColor: 0xfacc15,
    titleColor: '#fff7d6',
    descriptionColor: '#dbe4f0',
    starColor: '#facc15',
    badgeColor: '#fef3c7',
    counterColor: '#94a3b8',
  };
}

export function calculateAchievementUnlockPopupLayout(scene, modal = {}) {
  const { width, height } = scene.scale.gameSize;
  const centerX = width * 0.5;
  const buttons = Array.isArray(modal.buttons) ? modal.buttons : [];
  const buttonItems = buttons.flatMap((button) => button.items ?? [])
    .filter((item) => Number.isFinite(item?.y) && Number.isFinite(item?.height));
  const buttonBottom = buttonItems.length
    ? Math.max(...buttonItems.map((item) => item.y + (item.displayHeight ?? item.height) * 0.5))
    : height * 0.6 + 36;
  const safeGap = Math.max(8, height * 0.01);
  const bottomSafeGap = Math.max(24, height * 0.035);
  const maxWidth = Math.min(width * 0.86, 430);
  const popupWidth = Math.max(280, Math.min(maxWidth, width * 0.74));
  const popupHeight = ACHIEVEMENT_UNLOCK_POPUP_HEIGHT;
  const entranceOffset = ACHIEVEMENT_UNLOCK_POPUP_ENTRANCE_OFFSET;
  const buttonSafeTop = buttonBottom + safeGap;
  const minCenterY = buttonSafeTop + popupHeight * 0.5;
  const maxCenterY = height - bottomSafeGap - entranceOffset - popupHeight * 0.5;
  const availableTravel = maxCenterY - minCenterY;
  const preferredCenterY = availableTravel > 0
    ? minCenterY + availableTravel * 0.58
    : maxCenterY;
  const y = availableTravel > 0
    ? Math.max(minCenterY, Math.min(preferredCenterY, maxCenterY))
    : maxCenterY;
  const clampedY = Math.min(Math.max(y, popupHeight * 0.5), height - bottomSafeGap - popupHeight * 0.5);
  return {
    x: centerX,
    y: clampedY,
    width: popupWidth,
    height: popupHeight,
    radius: 14,
    buttonBottom,
    buttonSafeTop,
    bottomSafeGap,
    entranceOffset,
  };
}

export function createAchievementUnlockPopup(scene, definition, options = {}) {
  const timing = { ...ACHIEVEMENT_UNLOCK_POPUP_TIMING, ...(options.timing ?? {}) };
  const resolvedBaseDepth = Number.isFinite(options.baseDepth) ? options.baseDepth : 926;
  const layout = options.layout ?? calculateAchievementUnlockPopupLayout(scene, options.modal);
  const view = getAchievementUnlockPopupViewModel(definition, options);
  const theme = getAchievementUnlockPopupTheme(definition);
  const titleLayout = getAchievementUnlockPopupTitleLayout(view.title, layout);
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
  for (let i = 10; i >= 1; i -= 1) {
    const p = i / 10;
    glow.fillStyle(i % 3 === 0 ? 0xffffff : theme.accent, 0.012 + (1 - p) * 0.035);
    glow.fillEllipse(0, 0, layout.width * (0.92 + p * 0.34), layout.height * (0.82 + p * 0.8));
  }

  const bg = addItem(scene.add.graphics().setDepth(resolvedBaseDepth + 1));
  bg.fillStyle(0x020817, 0.94); bg.fillRoundedRect(x, y, layout.width, layout.height, layout.radius);
  bg.fillStyle(theme.accent, 0.18); bg.fillRoundedRect(x + 3, y + 3, layout.width - 6, layout.height - 6, layout.radius - 2);
  bg.fillStyle(0x0f172a, 0.88); bg.fillRoundedRect(x + 7, y + 8, layout.width - 14, layout.height - 14, layout.radius - 4);
  bg.fillStyle(0xfacc15, 0.84); bg.fillRoundedRect(x + 12, y + 6, layout.width - 24, 5, 2);
  bg.lineStyle(2.4, theme.frameColor, 0.94); bg.strokeRoundedRect(x, y, layout.width, layout.height, layout.radius);
  bg.lineStyle(1, theme.accent, 0.42); bg.strokeRoundedRect(x + 5, y + 5, layout.width - 10, layout.height - 10, layout.radius - 3);
  bg.lineStyle(1, theme.accent, 0.34); bg.lineBetween(x + 14, y + titleLayout.separatorY, x + layout.width - 96, y + titleLayout.separatorY);
  bg.fillStyle(0x451a03, 0.94); bg.fillRoundedRect(x + layout.width - 96, y + layout.height - 27, 82, 22, 8);
  bg.lineStyle(1.1, 0xfacc15, 0.78); bg.strokeRoundedRect(x + layout.width - 96, y + layout.height - 27, 82, 22, 8);

  addItem(scene.add.text(x + 15, y + 12, view.title, {
    fontFamily: 'Arial, sans-serif', fontSize: titleLayout.fontSize, color: theme.titleColor, fontStyle: 'bold', lineSpacing: 0, wordWrap: { width: titleLayout.titleWidth }, maxLines: titleLayout.maxLines,
  }).setDepth(resolvedBaseDepth + 2));
  addItem(scene.add.text(x + layout.width - 15, y + 15, view.stars, {
    fontFamily: 'Arial, sans-serif', fontSize: '15px', color: theme.starColor, fontStyle: 'bold', align: 'right', fixedWidth: 68,
  }).setOrigin(1, 0).setDepth(resolvedBaseDepth + 2));
  if (view.pointLabel) {
    addItem(scene.add.text(x + layout.width - 16, y + layout.height - 56, view.pointLabel, {
      fontFamily: 'Arial, sans-serif', fontSize: layout.width < 330 ? '13px' : '14px', color: theme.badgeColor, fontStyle: 'bold', align: 'right', fixedWidth: 82,
    }).setOrigin(1, 0.5).setDepth(resolvedBaseDepth + 2));
  }
  addItem(scene.add.text(x + 15, y + titleLayout.descriptionY, view.description, {
    fontFamily: 'Arial, sans-serif', fontSize: '13px', color: theme.descriptionColor, wordWrap: { width: layout.width - 126 }, maxLines: 2,
  }).setDepth(resolvedBaseDepth + 2));
  addItem(scene.add.text(x + layout.width - 55, y + layout.height - 16, view.badge, {
    fontFamily: 'Arial, sans-serif', fontSize: view.badge.length > 8 ? '11px' : '12px', color: theme.badgeColor, fontStyle: 'bold', align: 'center', fixedWidth: 78,
  }).setOrigin(0.5).setDepth(resolvedBaseDepth + 2));
  addItem(scene.add.text(x + layout.width - 16, y + layout.height - 43, view.queuePosition, {
    fontFamily: 'Arial, sans-serif', fontSize: '11px', color: theme.counterColor, align: 'right', fixedWidth: 60,
  }).setOrigin(1, 0.5).setDepth(resolvedBaseDepth + 2));

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
        targets: items, alpha: 0, y: `+=${Math.max(4, Math.min(8, layout.height * 0.07))}`, duration: timing.exitMs, ease: 'Sine.easeInOut',
        onComplete: () => { complete = true; destroy(); onComplete?.(); },
      });
      tweens.push(exitTween);
    });
    timers.push(visibleTimer);
  };

  return { items, view, layout, play, destroy, isComplete: () => complete, isDestroyed: () => destroyed };
}
