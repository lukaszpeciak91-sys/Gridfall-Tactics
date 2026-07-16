import Phaser from 'phaser';
import {
  MENU_BACKGROUND_FALLBACK_COLOR,
  MENU_BACKGROUND_FALLBACK_COLOR_HEX,
  createAnimatedMenuBackground,
  preloadMenuBackgroundArt,
} from '../rendering/backgroundArt.js';
import { createBuildMarker } from '../ui/buildMarker.js';
import { createMenuScreenHeader } from '../ui/screenHeader.js';
import { createBottomNavigationControls, requestPortraitOrientationLock, toggleSceneFullscreen } from '../ui/navigationControls.js';
import { getActiveLocale, translateActive } from '../localization/localeService.js';
import { getFactionByKey, getFactionKeys } from '../data/factions/index.js';
import { getFactionPresentationName } from '../data/presentation/factionPresentation.js';
import { FACTION_CARD_DETAILS } from '../ui/factionCards.js';
import { getAchievementDefinitions, loadAchievementState, normalizeAchievementState, ACHIEVEMENT_CATEGORY_GROUPS, ACHIEVEMENT_CATEGORY_LABELS, normalizeAchievementDifficulty } from '../systems/achievements.js';
import { calculateAchievementProgression } from '../systems/achievementProgression.js';
import { loadPlayerStats, normalizePlayerStats } from '../systems/playerStats.js';
import { preloadAudioAssets } from '../audio/audioAssets.js';
import { playMenuMusic } from '../audio/menuMusic.js';

export default class AchievementsScene extends Phaser.Scene {
  constructor() {
    super('AchievementsScene');
    this.uiElements = [];
    this.achievementContentElements = [];
    this.expandedSectionKeys = new Set();
    this.expandedFactionKeys = new Set();
    this.scrollMask = null;
    this.scrollState = null;
    this.headerPress = null;
    this.achievementData = null;
  }

  init() {
    this.cleanupScene();
  }

  preload() {
    preloadMenuBackgroundArt(this);
    preloadAudioAssets(this);
  }

  create() {
    this.cleanupScene();
    playMenuMusic(this);

    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor(MENU_BACKGROUND_FALLBACK_COLOR_HEX);
    this.menuBackground = createAnimatedMenuBackground(this, {
      fallbackColor: MENU_BACKGROUND_FALLBACK_COLOR,
      width,
      height,
      lightSweepOptions: {
        opacity: 0.07,
        y: height * 0.28,
      },
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
    this.scale.on('enterfullscreen', this.onFullscreenChanged, this);
    this.scale.on('leavefullscreen', this.onFullscreenChanged, this);

    const header = createMenuScreenHeader(this, {
      title: translateActive('ui.achievements.title', 'ACHIEVEMENTS'),
      width,
      height,
    });
    this.uiElements.push(...header.items);
    this.expandedSectionKeys = new Set();
    this.expandedFactionKeys = new Set();
    this.achievementData = this.readAchievementPanelData();
    this.drawAchievementsPanel(width, height);
    this.drawNavigationControls();
    this.uiElements.push(createBuildMarker(this, { width, height }));
  }

  readAchievementPanelData() {
    let definitions = [];
    let achievementState;
    let playerStats;

    try {
      definitions = getAchievementDefinitions();
    } catch (error) {
      console.warn('Achievement definitions could not be loaded for the panel.', error);
      definitions = [];
    }

    try {
      achievementState = normalizeAchievementState(loadAchievementState());
    } catch (error) {
      console.warn('Achievement state could not be loaded for the panel.', error);
      achievementState = normalizeAchievementState();
    }

    try {
      playerStats = normalizePlayerStats(loadPlayerStats());
    } catch (error) {
      console.warn('Player stats could not be loaded for the achievements panel.', error);
      playerStats = normalizePlayerStats();
    }

    const progression = calculateAchievementProgression(definitions, achievementState);

    return { definitions, achievementState, playerStats, progression };
  }

  drawAchievementsPanel(width, height) {
    const viewportTop = Math.max(104, height * 0.18);
    const viewportBottom = height - 96;
    const viewportHeight = Math.max(160, viewportBottom - viewportTop);
    const content = this.add.container(0, viewportTop);
    this.uiElements.push(content);

    const maskShape = this.add.graphics();
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(0, viewportTop, width, viewportHeight);
    maskShape.setVisible(false);
    this.uiElements.push(maskShape);

    this.scrollMask = maskShape.createGeometryMask();
    content.setMask(this.scrollMask);
    this.scrollState = {
      content,
      maxY: viewportTop,
      minY: viewportTop,
      viewportTop,
      viewportBottom,
      viewportHeight,
      pointerId: null,
      pointerStartY: 0,
      contentStartY: viewportTop,
      lastDragDistance: 0,
    };

    this.rebuildAchievementContent(width);
    this.input.on('wheel', this.onScrollWheel, this);
    this.input.on('pointerdown', this.onScrollPointerDown, this);
    this.input.on('pointermove', this.onScrollPointerMove, this);
    this.input.on('pointerup', this.onScrollPointerUp, this);
    this.input.on('pointerupoutside', this.onScrollPointerUp, this);
  }

  rebuildAchievementContent(width = this.scale.width) {
    if (!this.scrollState) return;
    this.destroyAchievementContentElements();
    const margin = 16;
    let y = 8;
    y = this.drawProgressionBanner(this.scrollState.content, this.achievementData?.progression, { x: margin, y, width: width - margin * 2 }) + 16;
    for (const section of this.getAchievementSections()) {
      y = this.drawSectionBanner(this.scrollState.content, section, { x: margin, y, width: width - margin * 2 });
      if (this.expandedSectionKeys.has(section.key)) {
        if (section.key === 'factions') {
          y = this.drawFactionAchievementGroups(this.scrollState.content, section, { x: margin + 8, y: y + 10, width: width - margin * 2 - 16 });
        } else {
          y = this.drawAchievementRows(this.scrollState.content, section.achievements, { x: margin + 8, y: y + 10, width: width - margin * 2 - 16 });
        }
      }
      y += 18;
    }
    this.scrollState.minY = this.scrollState.viewportTop - Math.max(0, y + 24 - this.scrollState.viewportHeight);
    this.setScrollY(this.scrollState.content.y);
  }

  getAchievementSections() {
    const groups = { general: [], arena: [], factions: [] };
    for (const definition of this.achievementData?.definitions ?? []) {
      const groupKey = ACHIEVEMENT_CATEGORY_GROUPS[definition.category] ?? 'general';
      (groups[groupKey] ?? groups.general).push(definition);
    }
    return ['general', 'arena', 'factions'].map((key) => ({
      key,
      title: ACHIEVEMENT_CATEGORY_LABELS[key]?.[getActiveLocale()] ?? ACHIEVEMENT_CATEGORY_LABELS[key]?.en ?? key,
      achievements: this.sortAchievements(groups[key] ?? []),
    }));
  }

  sortAchievements(achievements) {
    return achievements
      .map((definition, index) => ({ definition, index, unlocked: this.isAchievementUnlocked(definition.id) }))
      .sort((left, right) => Number(right.unlocked) - Number(left.unlocked) || left.index - right.index)
      .map((entry) => entry.definition);
  }

  isAchievementUnlocked(id) {
    return Object.prototype.hasOwnProperty.call(this.achievementData?.achievementState?.unlocked ?? {}, id);
  }

  getProgressionBannerCopy(progression = {}) {
    const level = progression.level ?? 1;
    const maxLevel = progression.maxLevel ?? level;
    if (progression.isMaxLevel) {
      return {
        levelText: `${translateActive('ui.achievements.progression.maxLevel', 'MAX LEVEL')} ${maxLevel}`,
        earnedPointsText: `${progression.earnedPoints ?? 0} ${translateActive('ui.achievements.progression.pointsAbbreviation', 'PTS')}`,
        bottomText: translateActive('ui.achievements.progression.allLevelsComplete', 'ALL LEVELS COMPLETE'),
      };
    }

    return {
      levelText: `${translateActive('ui.achievements.progression.level', 'LEVEL')} ${level}`,
      earnedPointsText: `${progression.earnedPoints ?? 0} ${translateActive('ui.achievements.progression.pointsAbbreviation', 'PTS')}`,
      bottomText: `${progression.pointsIntoLevel ?? 0} / ${progression.pointsForLevel ?? 0} ${translateActive('ui.achievements.progression.toLevel', 'TO LEVEL')} ${level + 1}`,
    };
  }

  drawProgressionBanner(content, progression = {}, { x, y, width }) {
    const height = 80;
    const radius = 16;
    const accent = 0xfacc15;
    const progressRatio = Phaser.Math.Clamp(Number.isFinite(progression.progressRatio) ? progression.progressRatio : 0, 0, 1);
    const copy = this.getProgressionBannerCopy(progression);
    const paddingX = 16;
    const barX = x + paddingX;
    const barY = y + 43;
    const barWidth = Math.max(0, width - paddingX * 2);
    const barHeight = 9;
    const fillWidth = Math.max(0, Math.min(barWidth, barWidth * progressRatio));

    const bg = this.add.graphics();
    bg.fillStyle(0x020817, 0.86); bg.fillRoundedRect(x, y, width, height, radius);
    bg.fillStyle(accent, 0.09); bg.fillRoundedRect(x + 3, y + 3, width - 6, height - 6, 13);
    bg.fillStyle(0x0f172a, 0.78); bg.fillRoundedRect(x + 7, y + 8, width - 14, height - 15, 10);
    bg.fillStyle(accent, 0.38); bg.fillRoundedRect(x + 12, y + 8, width - 24, 3, 2);
    bg.lineStyle(2.1, accent, 0.64); bg.strokeRoundedRect(x, y, width, height, radius);
    bg.lineStyle(1.1, accent, 0.24); bg.strokeRoundedRect(x + 5, y + 5, width - 10, height - 10, 12);
    bg.fillStyle(0x020817, 0.9); bg.fillRoundedRect(barX, barY, barWidth, barHeight, 5);
    bg.lineStyle(1, 0x475569, 0.58); bg.strokeRoundedRect(barX, barY, barWidth, barHeight, 5);
    if (fillWidth > 0) {
      bg.fillStyle(accent, 0.92); bg.fillRoundedRect(barX, barY, fillWidth, barHeight, 5);
    }
    content.add(bg); this.trackAchievementContentElement(bg);

    const topFontSize = width < 360 ? '15px' : '17px';
    const bottomFontSize = width < 360 ? '12px' : '13px';
    const levelText = this.add.text(x + paddingX, y + 18, copy.levelText, {
      fontFamily: 'Arial, sans-serif',
      fontSize: topFontSize,
      color: '#fff7d6',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    const earnedPointsText = this.add.text(x + width - paddingX, y + 18, copy.earnedPointsText, {
      fontFamily: 'Arial, sans-serif',
      fontSize: topFontSize,
      color: '#fef3c7',
      fontStyle: 'bold',
      align: 'right',
    }).setOrigin(1, 0.5);
    const bottomText = this.add.text(x + width / 2, y + 64, copy.bottomText, {
      fontFamily: 'Arial, sans-serif',
      fontSize: bottomFontSize,
      color: '#cbd5e1',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: Math.max(120, width - paddingX * 2) },
    }).setOrigin(0.5, 0.5);
    content.add([levelText, earnedPointsText, bottomText]);
    this.trackAchievementContentElement(levelText); this.trackAchievementContentElement(earnedPointsText); this.trackAchievementContentElement(bottomText);

    return y + height;
  }

  drawSectionBanner(content, section, { x, y, width }) {
    const height = 56;
    const accent = section.key === 'arena' ? 0xfacc15 : section.key === 'factions' ? 0xa78bfa : 0x38bdf8;
    const expanded = this.expandedSectionKeys.has(section.key);
    const bg = this.add.graphics();
    bg.fillStyle(0x020817, 0.78); bg.fillRoundedRect(x, y, width, height, 14);
    bg.fillStyle(accent, expanded ? 0.13 : 0.07); bg.fillRoundedRect(x, y, width, height, 14);
    bg.lineStyle(2, accent, expanded ? 0.72 : 0.42); bg.strokeRoundedRect(x, y, width, height, 14);
    bg.setInteractive(new Phaser.Geom.Rectangle(x, y, width, height), Phaser.Geom.Rectangle.Contains);
    bg.on('pointerdown', (pointer) => this.onHeaderPointerDown({ type: 'section', key: section.key }, pointer));
    bg.on('pointerup', (pointer) => this.onHeaderPointerUp({ type: 'section', key: section.key }, pointer));
    content.add(bg); this.trackAchievementContentElement(bg);
    const label = this.add.text(x + width / 2, y + height / 2, section.title, { fontFamily: 'Arial, sans-serif', fontSize: '22px', color: '#e5e7eb', fontStyle: 'bold', align: 'center' }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    label.on('pointerdown', (pointer) => this.onHeaderPointerDown({ type: 'section', key: section.key }, pointer));
    label.on('pointerup', (pointer) => this.onHeaderPointerUp({ type: 'section', key: section.key }, pointer));
    content.add(label); this.trackAchievementContentElement(label);
    return y + height;
  }

  drawFactionAchievementGroups(content, section, { x, y, width }) {
    let cursorY = y;
    for (const factionKey of getFactionKeys()) {
      const factionAchievements = this.sortAchievements(section.achievements.filter((definition) => definition.factionKey === factionKey));
      if (!factionAchievements.length) continue;
      cursorY = this.drawFactionBanner(content, factionKey, { x, y: cursorY, width });
      if (this.expandedFactionKeys.has(factionKey)) {
        cursorY = this.drawAchievementRows(content, factionAchievements, { x: x + 8, y: cursorY + 8, width: width - 16 });
      }
      cursorY += 12;
    }
    return cursorY;
  }

  drawFactionBanner(content, factionKey, { x, y, width }) {
    const faction = getFactionByKey(factionKey);
    const accent = FACTION_CARD_DETAILS[factionKey]?.accentColor ?? 0x38bdf8;
    const height = 46;
    const expanded = this.expandedFactionKeys.has(factionKey);
    const bg = this.add.graphics();
    bg.fillStyle(0x020817, 0.7); bg.fillRoundedRect(x, y, width, height, 12);
    bg.fillStyle(accent, expanded ? 0.16 : 0.08); bg.fillRoundedRect(x, y, width, height, 12);
    bg.lineStyle(1.5, accent, expanded ? 0.78 : 0.48); bg.strokeRoundedRect(x, y, width, height, 12);
    bg.setInteractive(new Phaser.Geom.Rectangle(x, y, width, height), Phaser.Geom.Rectangle.Contains);
    bg.on('pointerdown', (pointer) => this.onHeaderPointerDown({ type: 'faction', key: factionKey }, pointer));
    bg.on('pointerup', (pointer) => this.onHeaderPointerUp({ type: 'faction', key: factionKey }, pointer));
    content.add(bg); this.trackAchievementContentElement(bg);
    const name = getFactionPresentationName(faction?.id, getActiveLocale(), faction?.name ?? factionKey);
    const label = this.add.text(x + width / 2, y + height / 2, name, { fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#dbeafe', fontStyle: 'bold', align: 'center', wordWrap: { width: Math.max(120, width - 32) } }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    label.on('pointerdown', (pointer) => this.onHeaderPointerDown({ type: 'faction', key: factionKey }, pointer));
    label.on('pointerup', (pointer) => this.onHeaderPointerUp({ type: 'faction', key: factionKey }, pointer));
    content.add(label); this.trackAchievementContentElement(label);
    return y + height;
  }

  drawAchievementRows(content, achievements, { x, y, width }) {
    let cursorY = y;
    for (const definition of achievements) {
      cursorY = this.drawAchievementCard(content, definition, { x, y: cursorY, width }) + 12;
    }
    return cursorY;
  }

  getAchievementCardLayout(x, y, width) {
    const cardHeight = 102;
    const paddingX = 16;
    const rightPadding = 12;
    const badgeWidth = 82;
    const badgeHeight = 26;
    const starAreaWidth = 76;
    const badgeX = x + width - rightPadding - badgeWidth;
    const titleTop = y + 11;
    const titleHeight = 31;
    const separatorY = y + 45;
    const descriptionTop = y + 52;
    const textLeft = x + paddingX;
    const textRight = badgeX - 14;
    const titleRight = x + width - rightPadding - starAreaWidth;

    return {
      cardHeight,
      radius: 16,
      textLeft,
      titleTop,
      titleHeight,
      titleWidth: Math.max(96, titleRight - textLeft - 10),
      starAreaX: titleRight,
      starAreaY: titleTop + 1,
      starAreaWidth,
      separatorY,
      separatorX: textLeft,
      separatorWidth: Math.max(80, width - paddingX * 2),
      descriptionTop,
      descriptionWidth: Math.max(128, textRight - textLeft),
      badgeX,
      badgeY: y + 68,
      badgeWidth,
      badgeHeight,
    };
  }

  getAchievementTitleFontSize(title, layout) {
    if ((title?.length ?? 0) > 52 || layout.titleWidth < 280) return '18px';
    if ((title?.length ?? 0) > 38 || layout.titleWidth < 360) return '19px';
    return '21px';
  }

  getAchievementCardTheme(definition, unlocked) {
    const groupKey = ACHIEVEMENT_CATEGORY_GROUPS[definition.category] ?? 'general';
    const accent = groupKey === 'arena' ? 0xfacc15 : groupKey === 'factions' ? FACTION_CARD_DETAILS[definition.factionKey]?.accentColor ?? 0xa78bfa : 0x7dd3fc;
    const titleTint = groupKey === 'arena' ? '#fde68a' : groupKey === 'factions' ? '#ede9fe' : '#e0f2fe';
    return {
      accent,
      titleTint,
      frameColor: unlocked ? 0xfacc15 : accent,
      frameAlpha: unlocked ? 0.96 : 0.5,
      innerAlpha: unlocked ? 0.24 : 0.11,
      fillAlpha: unlocked ? 0.92 : 0.74,
      glassAlpha: unlocked ? 0.88 : 0.72,
      titleColor: unlocked ? '#fff7d6' : titleTint,
      descriptionColor: unlocked ? '#e2e8f0' : '#b8c2d0',
      progressTextColor: unlocked ? '#fef3c7' : '#dbeafe',
      difficultyStarColor: unlocked ? '#facc15' : '#94a3b8',
      badgeFill: unlocked ? 0x451a03 : 0x020817,
      badgeAlpha: unlocked ? 0.94 : 0.74,
      topStripAlpha: unlocked ? 0.82 : 0.18,
      glowAlpha: unlocked ? 0.22 : 0.08,
    };
  }


  getAchievementDifficultyStars(definition) {
    const difficulty = normalizeAchievementDifficulty(definition?.difficulty);
    return '★'.repeat(difficulty);
  }

  drawAchievementDifficultyStars(content, definition, layout, theme) {
    const starsText = this.add.text(layout.starAreaX + layout.starAreaWidth, layout.starAreaY, this.getAchievementDifficultyStars(definition), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: theme.difficultyStarColor,
      fontStyle: 'bold',
      align: 'right',
      fixedWidth: layout.starAreaWidth,
    }).setOrigin(1, 0);
    content.add(starsText); this.trackAchievementContentElement(starsText);
    return starsText;
  }

  drawAchievementCard(content, definition, { x, y, width }) {
    const unlocked = this.isAchievementUnlocked(definition.id);
    const progress = this.getAchievementProgress(definition);
    const locale = getActiveLocale();
    const title = definition.display?.title?.[locale] ?? definition.title ?? definition.id;
    const description = definition.display?.description?.[locale] ?? definition.description ?? '';
    const layout = this.getAchievementCardLayout(x, y, width);
    const theme = this.getAchievementCardTheme(definition, unlocked);

    const bg = this.add.graphics();
    bg.fillStyle(0x020817, theme.fillAlpha); bg.fillRoundedRect(x, y, width, layout.cardHeight, layout.radius);
    bg.fillStyle(theme.accent, theme.glowAlpha); bg.fillRoundedRect(x + 2, y + 2, width - 4, layout.cardHeight - 4, 14);
    bg.fillStyle(theme.accent, theme.innerAlpha); bg.fillRoundedRect(x + 4, y + 4, width - 8, layout.cardHeight - 8, 12);
    bg.fillStyle(0x0f172a, theme.glassAlpha); bg.fillRoundedRect(x + 7, y + 9, width - 14, layout.cardHeight - 15, 10);
    bg.fillStyle(unlocked ? 0xfacc15 : theme.accent, theme.topStripAlpha); bg.fillRoundedRect(x + 12, y + 7, width - 24, unlocked ? 5 : 3, 2);
    bg.lineStyle(unlocked ? 2.8 : 2.1, theme.frameColor, theme.frameAlpha); bg.strokeRoundedRect(x, y, width, layout.cardHeight, layout.radius);
    bg.lineStyle(1.1, theme.accent, unlocked ? 0.48 : 0.24); bg.strokeRoundedRect(x + 5, y + 5, width - 10, layout.cardHeight - 10, 12);
    bg.lineStyle(1, theme.accent, unlocked ? 0.34 : 0.22); bg.lineBetween(layout.separatorX, layout.separatorY, layout.separatorX + layout.separatorWidth, layout.separatorY);
    bg.fillStyle(theme.badgeFill, theme.badgeAlpha); bg.fillRoundedRect(layout.badgeX, layout.badgeY, layout.badgeWidth, layout.badgeHeight, 9);
    bg.fillStyle(theme.accent, unlocked ? 0.16 : 0.08); bg.fillRoundedRect(layout.badgeX + 2, layout.badgeY + 2, layout.badgeWidth - 4, layout.badgeHeight - 4, 7);
    bg.lineStyle(1.2, unlocked ? 0xfacc15 : theme.accent, unlocked ? 0.78 : 0.44); bg.strokeRoundedRect(layout.badgeX, layout.badgeY, layout.badgeWidth, layout.badgeHeight, 9);
    content.add(bg); this.trackAchievementContentElement(bg);

    const titleText = this.add.text(layout.textLeft, layout.titleTop, title, {
      fontFamily: 'Arial, sans-serif',
      fontSize: this.getAchievementTitleFontSize(title, layout),
      color: theme.titleColor,
      fontStyle: 'bold',
      lineSpacing: 1,
      wordWrap: { width: layout.titleWidth },
      maxLines: 2,
    });
    this.drawAchievementDifficultyStars(content, definition, layout, theme);

    const descriptionText = this.add.text(layout.textLeft, layout.descriptionTop, description, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: theme.descriptionColor,
      lineSpacing: 2,
      wordWrap: { width: layout.descriptionWidth },
      maxLines: 2,
    });
    const progressText = this.add.text(layout.badgeX + layout.badgeWidth / 2, layout.badgeY + layout.badgeHeight / 2, `${progress.current} / ${progress.target}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: theme.progressTextColor,
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5, 0.5);
    content.add([titleText, descriptionText, progressText]);
    this.trackAchievementContentElement(titleText); this.trackAchievementContentElement(descriptionText); this.trackAchievementContentElement(progressText);

    return y + layout.cardHeight;
  }

  getAchievementProgress(definition) {
    try {
      const progress = definition.getProgress?.(this.achievementData?.playerStats ?? {}) ?? {};
      const current = Number.isFinite(progress.current) ? progress.current : 0;
      const target = Number.isFinite(progress.target) ? progress.target : definition.target ?? 0;
      return { current: target > 0 ? Math.min(current, target) : current, target };
    } catch (error) {
      return { current: 0, target: definition.target ?? 0 };
    }
  }

  trackAchievementContentElement(element) {
    this.achievementContentElements.push(element);
    this.uiElements.push(element);
    return element;
  }

  destroyAchievementContentElements() {
    const elements = this.achievementContentElements;
    if (!elements.length) return;
    const elementSet = new Set(elements);
    elements.forEach((element) => { element?.removeAllListeners?.(); element?.destroy?.(); });
    this.uiElements = this.uiElements.filter((element) => !elementSet.has(element));
    this.achievementContentElements = [];
  }

  drawNavigationControls() {
    const controls = createBottomNavigationControls(this, {
      onBack: () => this.returnToMainMenu(),
      onRules: () => this.openRulesPanel(),
      onFullscreen: () => this.toggleFullscreen(),
    });

    [controls.back, controls.rules, controls.fullscreen].forEach((control) => {
      this.uiElements.push(control.halo, control.backing, control.text);
    });
  }

  onHeaderPointerDown(header, pointer) {
    const state = this.scrollState;
    if (!state || pointer.y < state.viewportTop || pointer.y > state.viewportBottom) return;
    this.headerPress = { ...header, pointerId: pointer.id };
  }

  onHeaderPointerUp(header, pointer) {
    const press = this.headerPress;
    this.headerPress = null;
    const state = this.scrollState;
    if (!state || !press || press.type !== header.type || press.key !== header.key || press.pointerId !== pointer.id) return;
    if (pointer.y < state.viewportTop || pointer.y > state.viewportBottom || this.wasScrollDragging()) return;
    if (header.type === 'section') {
      this.toggleExpanded(this.expandedSectionKeys, header.key);
    } else {
      this.toggleExpanded(this.expandedFactionKeys, header.key);
    }
    this.rebuildAchievementContent(this.scale.width);
  }

  toggleExpanded(set, key) {
    if (set.has(key)) set.delete(key);
    else set.add(key);
  }

  onScrollWheel(pointer, gameObjects, deltaX, deltaY) {
    if (!this.scrollState) return;
    this.setScrollY(this.scrollState.content.y - deltaY * 0.45);
  }

  onScrollPointerDown(pointer) {
    const state = this.scrollState;
    if (!state || pointer.y < state.viewportTop || pointer.y > state.viewportBottom) return;
    state.pointerId = pointer.id;
    state.pointerStartY = pointer.y;
    state.contentStartY = state.content.y;
    state.lastDragDistance = 0;
  }

  onScrollPointerMove(pointer) {
    const state = this.scrollState;
    if (!state || state.pointerId !== pointer.id) return;
    state.lastDragDistance = pointer.y - state.pointerStartY;
    this.setScrollY(state.contentStartY + state.lastDragDistance);
  }

  onScrollPointerUp(pointer) {
    const state = this.scrollState;
    if (!state || state.pointerId !== pointer.id) return;
    state.pointerId = null;
  }

  wasScrollDragging() {
    return Math.abs(this.scrollState?.lastDragDistance ?? 0) > 8;
  }

  setScrollY(y) {
    const state = this.scrollState;
    if (!state) return;
    state.content.y = Phaser.Math.Clamp(y, state.minY, state.maxY);
  }

  returnToMainMenu() {
    this.scene.start('MainMenuScene');
  }

  openRulesPanel() {
    this.scene.launch('RulesPanelScene', { returnSceneKey: 'AchievementsScene' });
    this.scene.pause();
  }

  resumeFromRulesPanel() {
    this.scene.resume();
  }

  toggleFullscreen() {
    toggleSceneFullscreen(this);
  }

  onFullscreenChanged() {
    if (this.scale.isFullscreen) {
      requestPortraitOrientationLock();
    }

    if (this.scene.isActive('AchievementsScene')) {
      this.scene.restart();
    }
  }

  cleanupScene() {
    this.scale?.off('enterfullscreen', this.onFullscreenChanged, this);
    this.scale?.off('leavefullscreen', this.onFullscreenChanged, this);
    this.input?.off('wheel', this.onScrollWheel, this);
    this.input?.off('pointerdown', this.onScrollPointerDown, this);
    this.input?.off('pointermove', this.onScrollPointerMove, this);
    this.input?.off('pointerup', this.onScrollPointerUp, this);
    this.input?.off('pointerupoutside', this.onScrollPointerUp, this);
    this.destroyAchievementContentElements();
    this.scrollMask?.destroy?.();
    this.scrollMask = null;
    this.scrollState = null;
    this.headerPress = null;

    this.uiElements.forEach((element) => {
      if (element && element.active) {
        element.destroy();
      }
    });
    this.uiElements = [];
    this.achievementContentElements = [];
    this.expandedSectionKeys = new Set();
    this.expandedFactionKeys = new Set();
    this.scrollMask = null;
    this.scrollState = null;
    this.headerPress = null;
    this.achievementData = null;
  }
}
