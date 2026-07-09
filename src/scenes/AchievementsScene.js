import Phaser from 'phaser';
import {
  MENU_BACKGROUND_FALLBACK_COLOR,
  MENU_BACKGROUND_FALLBACK_COLOR_HEX,
  createCoverBackground,
  createMenuArenaLightSweep,
  getMenuBackgroundAsset,
  preloadMenuBackgroundArt,
} from '../rendering/backgroundArt.js';
import { createBuildMarker } from '../ui/buildMarker.js';
import { createMenuScreenHeader } from '../ui/screenHeader.js';
import { createBottomNavigationControls, requestPortraitOrientationLock, toggleSceneFullscreen } from '../ui/navigationControls.js';
import { getActiveLocale, translateActive } from '../localization/localeService.js';
import { getFactionByKey, getFactionKeys } from '../data/factions/index.js';
import { getFactionPresentationName } from '../data/presentation/factionPresentation.js';
import { FACTION_CARD_DETAILS } from '../ui/factionCards.js';
import { getAchievementDefinitions, loadAchievementState, normalizeAchievementState, ACHIEVEMENT_CATEGORY_GROUPS, ACHIEVEMENT_CATEGORY_LABELS } from '../systems/achievements.js';
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
    createCoverBackground(this, {
      asset: getMenuBackgroundAsset(),
      fallbackColor: MENU_BACKGROUND_FALLBACK_COLOR,
      width,
      height,
    });
    createMenuArenaLightSweep(this, {
      width,
      height,
      opacity: 0.07,
      y: height * 0.28,
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

    return { definitions, achievementState, playerStats };
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
    const label = this.add.text(x + 16, y + height / 2, `${expanded ? '−' : '+'} ${name}`, { fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#dbeafe', fontStyle: 'bold' }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
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

  drawAchievementCard(content, definition, { x, y, width }) {
    const cardHeight = 108;
    const unlocked = this.isAchievementUnlocked(definition.id);
    const progress = this.getAchievementProgress(definition);
    const locale = getActiveLocale();
    const title = definition.display?.title?.[locale] ?? definition.title ?? definition.id;
    const description = definition.display?.description?.[locale] ?? definition.description ?? '';
    const accent = unlocked ? 0xfacc15 : 0x64748b;
    const fillAlpha = unlocked ? 0.9 : 0.66;
    const textLeft = x + 18;
    const textRightPadding = 18;
    const progressBadgeWidth = 70;
    const progressBadgeHeight = 22;
    const unlockedBadgeWidth = locale === 'pl' ? 108 : 92;
    const unlockedBadgeHeight = 22;
    const progressBadgeX = x + width - textRightPadding - progressBadgeWidth;
    const progressBadgeY = y + cardHeight - 31;
    const textWrapWidth = Math.max(140, width - 36);

    const bg = this.add.graphics();
    bg.fillStyle(0x0f172a, fillAlpha); bg.fillRoundedRect(x, y, width, cardHeight, 14);
    bg.fillStyle(unlocked ? 0x78350f : 0x111827, unlocked ? 0.2 : 0.16); bg.fillRoundedRect(x + 2, y + 2, width - 4, cardHeight - 4, 12);
    bg.lineStyle(unlocked ? 1.6 : 1.1, accent, unlocked ? 0.76 : 0.38); bg.strokeRoundedRect(x, y, width, cardHeight, 14);
    if (unlocked) {
      bg.fillStyle(0xfacc15, 0.88); bg.fillRoundedRect(x + 8, y + 6, width - 16, 3, 2);
    }
    if (unlocked) {
      bg.fillStyle(0x451a03, 0.82); bg.fillRoundedRect(textLeft, progressBadgeY, unlockedBadgeWidth, unlockedBadgeHeight, 8);
      bg.lineStyle(1, 0xfacc15, 0.58); bg.strokeRoundedRect(textLeft, progressBadgeY, unlockedBadgeWidth, unlockedBadgeHeight, 8);
    }
    bg.fillStyle(unlocked ? 0x451a03 : 0x020817, unlocked ? 0.9 : 0.58); bg.fillRoundedRect(progressBadgeX, progressBadgeY, progressBadgeWidth, progressBadgeHeight, 8);
    bg.lineStyle(1, accent, unlocked ? 0.68 : 0.34); bg.strokeRoundedRect(progressBadgeX, progressBadgeY, progressBadgeWidth, progressBadgeHeight, 8);
    content.add(bg); this.trackAchievementContentElement(bg);

    const titleText = this.add.text(textLeft, y + 18, title, { fontFamily: 'Arial, sans-serif', fontSize: '17px', color: unlocked ? '#fff7ed' : '#d1d5db', fontStyle: 'bold', wordWrap: { width: textWrapWidth } });
    const descriptionText = this.add.text(textLeft, y + 43, description, { fontFamily: 'Arial, sans-serif', fontSize: '13px', color: unlocked ? '#fde68a' : '#9ca3af', wordWrap: { width: textWrapWidth } });
    const progressText = this.add.text(progressBadgeX + progressBadgeWidth / 2, progressBadgeY + progressBadgeHeight / 2, `${progress.current} / ${progress.target}`, { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: unlocked ? '#fef3c7' : '#cbd5e1', fontStyle: 'bold', align: 'center' }).setOrigin(0.5, 0.5);
    content.add([titleText, descriptionText, progressText]);
    this.trackAchievementContentElement(titleText); this.trackAchievementContentElement(descriptionText); this.trackAchievementContentElement(progressText);

    if (unlocked) {
      const unlockedLabel = translateActive('ui.achievements.unlocked', locale === 'pl' ? 'ODBLOKOWANE' : 'UNLOCKED');
      const label = this.add.text(textLeft + unlockedBadgeWidth / 2, progressBadgeY + unlockedBadgeHeight / 2, unlockedLabel, { fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#fef3c7', fontStyle: 'bold', align: 'center' }).setOrigin(0.5, 0.5);
      content.add(label); this.trackAchievementContentElement(label);
    }

    return y + cardHeight;
  }

  getAchievementProgress(definition) {
    try {
      const progress = definition.getProgress?.(this.achievementData?.playerStats ?? {}) ?? {};
      return { current: Number.isFinite(progress.current) ? progress.current : 0, target: Number.isFinite(progress.target) ? progress.target : definition.target ?? 0 };
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
