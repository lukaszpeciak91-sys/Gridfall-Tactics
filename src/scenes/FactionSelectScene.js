import Phaser from 'phaser';
import { getFactionKeys } from '../data/factions/index.js';
import { createBuildMarker } from '../ui/buildMarker.js';
import { createMenuScreenHeader } from '../ui/screenHeader.js';
import { createBottomNavigationControls, requestPortraitOrientationLock, toggleSceneFullscreen } from '../ui/navigationControls.js';
import { translateActive, translateActiveList } from '../localization/localeService.js';
import { applyAudioSettings, loadSettings } from '../systems/settingsState.js';
import {
  MENU_BACKGROUND_FALLBACK_COLOR,
  MENU_BACKGROUND_FALLBACK_COLOR_HEX,
  createAnimatedMenuBackground,
  preloadMenuBackgroundArt,
} from '../rendering/backgroundArt.js';
import { AUDIO_KEYS, preloadAudioAssets } from '../audio/audioAssets.js';
import { playSfx, stopMusic } from '../audio/audioPlayback.js';
import { playMenuMusic } from '../audio/menuMusic.js';
import { createNewCampaign, saveCampaign } from '../systems/campaignState.js';
import { incrementCampaignStarted, loadPlayerStats, savePlayerStats } from '../systems/playerStats.js';
import { evaluateAndPersistAchievementUnlocks } from '../systems/runtimeAchievements.js';
import { drawFactionCardVisual, preloadFactionPreviewArt } from '../ui/factionCards.js';
import { createImageButton, preloadSecondaryButtonAsset, PREMIUM_BROADCAST_FONT_STACK } from '../ui/imageButton.js';
import { createTapVsDragInteraction } from '../ui/tapVsDragInteraction.js';
import { enterBattleScene } from './battleEntryRouter.js';

const MIN_FACTION_LIST_TOP = 106;
const HEADER_TO_FACTION_LIST_GAP = 24;
const ARENA_HELPER_TO_HEADER_GAP = 14;
const ARENA_HELPER_FONT_SIZE = 15;
const ARENA_HELPER_MIN_FONT_SIZE = 13;
const FACTION_CARD_GAP = 14;
const CAMPAIGN_ACCORDION_PANEL_HEIGHT = 218;
const CAMPAIGN_ACCORDION_TWEEN_MS = 180;
const CAMPAIGN_ACCORDION_AUTO_SCROLL_PADDING = 12;
const CAMPAIGN_ACCORDION_DESCRIPTION_FONT_SIZE = 16;
const CAMPAIGN_ACCORDION_DESCRIPTION_FIRST_LINE_FONT_SIZE = 17;
const CAMPAIGN_ACCORDION_DESCRIPTION_MIN_FONT_SIZE = 12;
const CAMPAIGN_ACCORDION_DESCRIPTION_FIRST_LINE_MIN_FONT_SIZE = 13;
const CAMPAIGN_ACCORDION_DESCRIPTION_LINE_SPACING = 2;
const CAMPAIGN_ACCORDION_DESCRIPTION_SECTION_GAP = 3;
const CAMPAIGN_ACCORDION_TEXT_TOP_PADDING = 28;
const CAMPAIGN_ACCORDION_TEXT_SIDE_PADDING = 23;
const CAMPAIGN_ACCORDION_TEXT_TO_BUTTON_GAP = 10;
const CAMPAIGN_ACCORDION_SELECT_BUTTON_WIDTH = 198;
const CAMPAIGN_ACCORDION_SELECT_BUTTON_HEIGHT = 47;
const CAMPAIGN_ACCORDION_SELECT_BUTTON_MIN_TOUCH_HEIGHT = 48;

function measureTextBlockHeight(introText, bodyText, sectionGap = CAMPAIGN_ACCORDION_DESCRIPTION_SECTION_GAP) {
  const introHeight = introText?.height ?? 0;
  const bodyHeight = bodyText?.text ? (bodyText.height ?? 0) : 0;
  return introHeight + (bodyHeight > 0 ? sectionGap + bodyHeight : 0);
}

function fitCampaignAccordionDescription({ introText, bodyText, regionTop, regionHeight }) {
  let introFontSize = CAMPAIGN_ACCORDION_DESCRIPTION_FIRST_LINE_FONT_SIZE;
  let bodyFontSize = CAMPAIGN_ACCORDION_DESCRIPTION_FONT_SIZE;

  while (introFontSize >= CAMPAIGN_ACCORDION_DESCRIPTION_FIRST_LINE_MIN_FONT_SIZE && bodyFontSize >= CAMPAIGN_ACCORDION_DESCRIPTION_MIN_FONT_SIZE) {
    introText.setFontSize(introFontSize);
    bodyText.setFontSize(bodyFontSize);
    introText.setLineSpacing(CAMPAIGN_ACCORDION_DESCRIPTION_LINE_SPACING);
    bodyText.setLineSpacing(CAMPAIGN_ACCORDION_DESCRIPTION_LINE_SPACING);

    const blockHeight = measureTextBlockHeight(introText, bodyText);
    if (blockHeight <= regionHeight) break;

    if (bodyFontSize > CAMPAIGN_ACCORDION_DESCRIPTION_MIN_FONT_SIZE) {
      bodyFontSize -= 1;
    } else if (introFontSize > CAMPAIGN_ACCORDION_DESCRIPTION_FIRST_LINE_MIN_FONT_SIZE) {
      introFontSize -= 1;
    } else {
      break;
    }
  }

  const fittedHeight = measureTextBlockHeight(introText, bodyText);
  const y = regionTop + Math.max(0, Math.floor((regionHeight - fittedHeight) / 2));
  introText.setY(y);
  bodyText.setY(y + (introText.height ?? 0) + CAMPAIGN_ACCORDION_DESCRIPTION_SECTION_GAP);
}

export default class FactionSelectScene extends Phaser.Scene {
  constructor() {
    super('FactionSelectScene');
    this.uiElements = [];
    this.interactiveElements = [];
    this.scrollMask = null;
    this.scrollState = null;
    this.factionCardViews = [];
    this.openFactionKey = null;
    this.isStartingBattle = false;
    this.tapVsDrag = createTapVsDragInteraction();
  }

  preload() {
    preloadMenuBackgroundArt(this);
    preloadFactionPreviewArt(this);
    preloadSecondaryButtonAsset(this);
    preloadAudioAssets(this);
  }

  init(data = {}) {
    this.mode = data?.mode === 'campaign' ? 'campaign' : 'arena';
    this.returnSceneKey = data?.returnSceneKey === 'GameMenuScene' ? 'GameMenuScene' : 'MainMenuScene';
    this.isStartingBattle = false;
    this.cleanupScene();
  }

  create() {
    this.cleanupScene();

    if (this.children) {
      this.children.removeAll(true);
    }

    const { width, height } = this.scale;
    applyAudioSettings(this, loadSettings());
    playMenuMusic(this);
    const factionKeys = getFactionKeys();

    this.cameras.main.setBackgroundColor(MENU_BACKGROUND_FALLBACK_COLOR_HEX);
    this.menuBackground = createAnimatedMenuBackground(this, {
      fallbackColor: MENU_BACKGROUND_FALLBACK_COLOR,
      width,
      height,
      lightSweepOptions: {
        opacity: 0.075,
        y: height * 0.24,
      },
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
    this.scale.on('enterfullscreen', this.onFullscreenChanged, this);
    this.scale.on('leavefullscreen', this.onFullscreenChanged, this);

    const header = createMenuScreenHeader(this, {
      title: translateActive('ui.factionSelect.title', 'SELECT YOUR TEAM'),
      width,
      height,
    });
    this.uiElements.push(...header.items);

    const arenaHelper = this.createArenaHelperText({ width, headerBottomY: header.bottomY });

    const buildMarker = createBuildMarker(this, { width, height });
    this.uiElements.push(buildMarker);

    this.drawNavigationControls();
    this.drawFactionCards(factionKeys, {
      width,
      height,
      headerBottomY: arenaHelper?.bottomY ?? header.bottomY,
    });
  }

  createArenaHelperText({ width, headerBottomY }) {
    if (this.mode === 'campaign') {
      return null;
    }

    const helperText = translateActive('ui.factionSelect.arenaHelper', 'Choose a faction and test your deck against random enemies.');
    let helperFontSize = ARENA_HELPER_FONT_SIZE;
    const helper = this.add.text(width / 2, headerBottomY + ARENA_HELPER_TO_HEADER_GAP, helperText, {
      fontFamily: PREMIUM_BROADCAST_FONT_STACK,
      fontSize: `${ARENA_HELPER_FONT_SIZE}px`,
      color: '#cbd5e1',
      align: 'center',
      stroke: '#020617',
      strokeThickness: 3,
      lineSpacing: 2,
      wordWrap: { width: Math.max(220, width - 42), useAdvancedWrap: true },
    }).setOrigin(0.5, 0).setDepth(5);

    while (helper.height > 42 && helperFontSize > ARENA_HELPER_MIN_FONT_SIZE) {
      helperFontSize -= 1;
      helper.setFontSize(helperFontSize);
    }

    this.uiElements.push(helper);
    return { text: helper, bottomY: helper.y + helper.height };
  }

  drawFactionCards(factionKeys, { width, height, headerBottomY }) {
    const cardWidth = Math.min(width - 24, 382);
    const cardHeight = 196;
    const viewportTop = Math.max(MIN_FACTION_LIST_TOP, Math.ceil(headerBottomY + HEADER_TO_FACTION_LIST_GAP));
    const viewportBottom = Math.max(viewportTop + cardHeight, height - 88);
    const viewportHeight = viewportBottom - viewportTop;
    const content = this.add.container(width / 2, viewportTop);
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
      contentHeight: 0,
      maxY: viewportTop,
      minY: viewportTop,
      viewportTop,
      viewportBottom,
      viewportHeight,
      pointerId: null,
      pointerStartY: 0,
      contentStartY: viewportTop,
    };

    this.factionCardViews = factionKeys.map((factionKey) => this.createFactionCardView(content, factionKey, {
      cardWidth,
      cardHeight,
    }));
    this.layoutFactionCards();

    this.input.on('wheel', this.onScrollWheel, this);
    this.input.on('pointerdown', this.onScrollPointerDown, this);
    this.input.on('pointermove', this.onScrollPointerMove, this);
    this.input.on('pointerup', this.onScrollPointerUp, this);
  }

  createFactionCardView(content, factionKey, { cardWidth, cardHeight }) {
    const root = this.add.container(0, 0);
    content.add(root);
    this.uiElements.push(root);

    const { items, details } = drawFactionCardVisual(this, root, factionKey, { y: 0, cardWidth, cardHeight });

    const panel = this.createCampaignAccordionPanel(root, factionKey, { cardWidth, cardHeight, details });

    const pressOverlay = this.add.graphics();
    pressOverlay.fillStyle(0xffffff, 0.08);
    pressOverlay.fillRoundedRect(-cardWidth / 2, 0, cardWidth, cardHeight, 20);
    pressOverlay.setVisible(false);
    root.add(pressOverlay);

    const button = this.add
      .zone(0, cardHeight / 2, cardWidth, cardHeight)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    button.on('pointerdown', (pointer) => {
      this.tapVsDrag.begin(pointer, this.scrollState?.content?.y ?? 0);
      pressOverlay.setVisible(true);
    });
    button.on('pointerout', () => pressOverlay.setVisible(false));
    button.on('pointerup', (pointer) => {
      pressOverlay.setVisible(false);
      if (this.tapVsDrag.end(pointer, this.scrollState?.content?.y ?? 0)) {
        this.playFactionBannerClick();
        this.handleFactionBannerTap(factionKey);
      }
    });
    root.add(button);

    const view = {
      factionKey,
      root,
      collapsedHeight: cardHeight,
      expandedPanelHeight: this.mode === 'campaign' ? CAMPAIGN_ACCORDION_PANEL_HEIGHT : 0,
      currentHeight: cardHeight,
      panelContainer: panel.container,
      panelItems: panel.items,
      panelProgress: 0,
      isOpen: false,
      bannerTapZone: button,
      tween: null,
      items: [...items, ...panel.items, pressOverlay, button],
    };

    this.interactiveElements.push(button);
    return view;
  }

  createCampaignAccordionPanel(root, factionKey, { cardWidth, cardHeight, details }) {
    const container = this.add.container(0, cardHeight);
    container.setVisible(false);
    container.setAlpha(0);
    root.add(container);

    if (this.mode !== 'campaign') {
      return { container, items: [container] };
    }

    const x = -cardWidth / 2;
    const panelWidth = cardWidth;
    const panelHeight = CAMPAIGN_ACCORDION_PANEL_HEIGHT;
    const accentColor = details?.accentColor ?? 0x38bdf8;
    const tintColor = details?.fallbackTopColor ?? accentColor;
    const panelX = x + 10;
    const panelY = 8;
    const panelW = panelWidth - 20;
    const panelH = panelHeight - 18;
    const panelRadius = 18;
    const selectButtonWidth = Math.min(panelW - 112, CAMPAIGN_ACCORDION_SELECT_BUTTON_WIDTH);
    const selectButtonHeight = CAMPAIGN_ACCORDION_SELECT_BUTTON_HEIGHT;
    const selectButtonY = panelY + panelH - 42;
    const legacySelectButtonTopY = (panelY + panelH - 29) - (38 / 2);
    const textRegionTop = panelY + CAMPAIGN_ACCORDION_TEXT_TOP_PADDING;
    const textRegionBottom = legacySelectButtonTopY - CAMPAIGN_ACCORDION_TEXT_TO_BUTTON_GAP;
    const textRegionHeight = Math.max(1, textRegionBottom - textRegionTop);

    const glow = this.add.graphics();
    glow.fillStyle(accentColor, 0.08);
    glow.fillRoundedRect(panelX - 3, panelY - 2, panelW + 6, panelH + 6, panelRadius + 4);
    glow.lineStyle(2, accentColor, 0.12);
    glow.strokeRoundedRect(panelX - 2, panelY - 1, panelW + 4, panelH + 4, panelRadius + 3);

    const panel = this.add.graphics();
    panel.fillGradientStyle(tintColor, tintColor, 0x020617, 0x020617, 0.18, 0.1, 0.92, 0.96);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, panelRadius);
    panel.fillStyle(0x020617, 0.62);
    panel.fillRoundedRect(panelX + 1, panelY + 1, panelW - 2, panelH - 2, panelRadius - 1);
    panel.lineStyle(1, accentColor, 0.68);
    panel.strokeRoundedRect(panelX + 0.5, panelY + 0.5, panelW - 1, panelH - 1, panelRadius - 1);
    panel.lineStyle(1, 0xf8fafc, 0.08);
    panel.strokeRoundedRect(panelX + 2.5, panelY + 2.5, panelW - 5, panelH - 5, panelRadius - 3);

    const accentRail = this.add.graphics();
    accentRail.fillGradientStyle(accentColor, accentColor, accentColor, accentColor, 0.42, 0.18, 0.02, 0.02);
    accentRail.fillRoundedRect(panelX + 16, panelY + 13, panelW - 32, 2, 1);
    accentRail.fillGradientStyle(accentColor, accentColor, accentColor, accentColor, 0.1, 0.02, 0.32, 0.08);
    accentRail.fillRoundedRect(panelX + 18, panelY + panelH - 18, panelW - 36, 1, 1);

    const textWrapWidth = panelW - (CAMPAIGN_ACCORDION_TEXT_SIDE_PADDING * 2);
    const descriptionLines = translateActiveList(`ui.factionSelect.campaignAccordion.descriptions.${factionKey}`, []);
    const [descriptionIntro = '', ...descriptionBodyLines] = descriptionLines;
    const descriptionIntroText = this.add.text(0, textRegionTop, descriptionIntro, {
      fontFamily: PREMIUM_BROADCAST_FONT_STACK,
      fontSize: `${CAMPAIGN_ACCORDION_DESCRIPTION_FIRST_LINE_FONT_SIZE}px`,
      fontStyle: '700',
      color: '#e2e8f0',
      align: 'center',
      stroke: '#020617',
      strokeThickness: 3,
      lineSpacing: CAMPAIGN_ACCORDION_DESCRIPTION_LINE_SPACING,
      wordWrap: { width: textWrapWidth, useAdvancedWrap: true },
    }).setOrigin(0.5, 0);
    const descriptionBodyText = this.add.text(0, descriptionIntroText.y + descriptionIntroText.height + CAMPAIGN_ACCORDION_DESCRIPTION_SECTION_GAP, descriptionBodyLines.join('\n'), {
      fontFamily: PREMIUM_BROADCAST_FONT_STACK,
      fontSize: `${CAMPAIGN_ACCORDION_DESCRIPTION_FONT_SIZE}px`,
      color: '#e2e8f0',
      align: 'center',
      stroke: '#020617',
      strokeThickness: 3,
      lineSpacing: CAMPAIGN_ACCORDION_DESCRIPTION_LINE_SPACING,
      wordWrap: { width: textWrapWidth, useAdvancedWrap: true },
    }).setOrigin(0.5, 0);

    fitCampaignAccordionDescription({
      introText: descriptionIntroText,
      bodyText: descriptionBodyText,
      regionTop: textRegionTop,
      regionHeight: textRegionHeight,
    });

    const selectButton = createImageButton(this, {
      x: 0,
      y: selectButtonY,
      width: selectButtonWidth,
      height: selectButtonHeight,
      label: translateActive('ui.factionSelect.campaignAccordion.select', 'SELECT'),
      depth: 6,
      fontSize: '18.5px',
      textStyle: {
        color: '#f5f1e6',
        fontFamily: PREMIUM_BROADCAST_FONT_STACK,
        fontStyle: '700',
        letterSpacing: 1.8,
      },
      fallbackFill: 0x93c5fd,
      fallbackStroke: 0xbfdbfe,
      fallbackStrokeAlpha: 0.7,
      shadowAlpha: 0.24,
      hoverScale: 1.025,
      downScale: 0.98,
      preserveImageAspect: false,
      minTouchHeight: CAMPAIGN_ACCORDION_SELECT_BUTTON_MIN_TOUCH_HEIGHT,
    });

    selectButton.hitZone.on('pointerdown', (pointer) => {
      this.tapVsDrag.begin(pointer, this.scrollState?.content?.y ?? 0);
    });
    selectButton.hitZone.on('pointerup', (pointer) => {
      if (this.tapVsDrag.end(pointer, this.scrollState?.content?.y ?? 0)) {
        this.playFactionBannerClick();
        this.selectFaction(factionKey);
      }
    });

    container.add([glow, panel, accentRail, descriptionIntroText, descriptionBodyText, ...selectButton.items]);
    this.interactiveElements.push(selectButton.hitZone);
    return { container, items: [container, glow, panel, accentRail, descriptionIntroText, descriptionBodyText, ...selectButton.items] };
  }

  playFactionBannerClick() {
    playSfx(this, AUDIO_KEYS.UI_CLICK);
  }

  handleFactionBannerTap(factionKey) {
    if (this.mode !== 'campaign') {
      this.selectFaction(factionKey);
      return;
    }

    this.toggleCampaignAccordion(factionKey);
  }

  toggleCampaignAccordion(factionKey) {
    const selectedView = this.factionCardViews.find((view) => view.factionKey === factionKey);
    if (!selectedView) return;

    const shouldOpen = this.openFactionKey !== factionKey;
    this.factionCardViews.forEach((view) => {
      this.animateCampaignAccordion(view, shouldOpen && view === selectedView);
    });
    this.openFactionKey = shouldOpen ? factionKey : null;
  }

  animateCampaignAccordion(view, open) {
    if (view.isOpen === open && ((open && view.panelProgress >= 1) || (!open && view.panelProgress <= 0))) {
      return;
    }

    view.isOpen = open;
    view.tween?.stop?.();
    const progress = { value: view.panelProgress };
    view.panelContainer?.setVisible(true);

    view.tween = this.tweens.add({
      targets: progress,
      value: open ? 1 : 0,
      duration: CAMPAIGN_ACCORDION_TWEEN_MS,
      ease: open ? 'Quad.easeOut' : 'Quad.easeIn',
      onUpdate: () => {
        this.setCampaignAccordionProgress(view, progress.value);
        if (open) this.autoScrollFactionCardIntoView(view);
      },
      onComplete: () => {
        this.setCampaignAccordionProgress(view, open ? 1 : 0);
        view.panelContainer?.setVisible(open);
        view.tween = null;
        if (open) this.autoScrollFactionCardIntoView(view);
      },
    });
  }

  setCampaignAccordionProgress(view, progress) {
    view.panelProgress = Phaser.Math.Clamp(progress, 0, 1);
    view.currentHeight = view.collapsedHeight + view.expandedPanelHeight * view.panelProgress;
    view.panelContainer?.setAlpha(view.panelProgress);
    view.panelContainer?.setVisible(view.panelProgress > 0.01 || view.isOpen);
    this.layoutFactionCards();
  }

  layoutFactionCards() {
    if (!this.scrollState) return;

    let y = 0;
    this.factionCardViews.forEach((view, index) => {
      view.root.setPosition(0, y);
      y += view.currentHeight;
      if (index < this.factionCardViews.length - 1) y += FACTION_CARD_GAP;
    });

    this.scrollState.contentHeight = y;
    this.scrollState.minY = this.scrollState.viewportTop - Math.max(0, y - this.scrollState.viewportHeight);
    this.setFactionScrollY(this.scrollState.content.y);
  }

  autoScrollFactionCardIntoView(view) {
    const state = this.scrollState;
    if (!state) return;

    const cardBottom = state.content.y + view.root.y + view.currentHeight;
    const overflow = cardBottom - state.viewportBottom + CAMPAIGN_ACCORDION_AUTO_SCROLL_PADDING;
    if (overflow > 0) {
      this.setFactionScrollY(state.content.y - overflow);
    }
  }

  selectFaction(factionKey) {
    if (this.mode === 'campaign') {
      this.startCampaign(factionKey);
      return;
    }

    this.startBattle(factionKey);
  }

  startCampaign(factionKey) {
    if (this.isStartingBattle) {
      return;
    }

    if (!getFactionKeys().includes(factionKey)) return;

    this.isStartingBattle = true;
    this.interactiveElements.forEach((element) => element?.disableInteractive?.());

    const campaign = createNewCampaign(factionKey);
    const savedCampaign = saveCampaign(campaign) ?? campaign;
    try {
      savePlayerStats(incrementCampaignStarted(loadPlayerStats()));
      evaluateAndPersistAchievementUnlocks();
    } catch (error) {
      console.warn('Campaign start player stats tracking failed; campaign flow will continue.', error);
    }
    this.scene.start('CampaignEnemySelectScene', { campaign: savedCampaign });
  }

  onScrollWheel(pointer, gameObjects, deltaX, deltaY) {
    const state = this.scrollState;
    if (!state || pointer.y < state.viewportTop || pointer.y > state.viewportBottom) {
      return;
    }

    this.setFactionScrollY(state.content.y - deltaY * 0.45);
  }

  onScrollPointerDown(pointer) {
    const state = this.scrollState;
    if (!state || pointer.y < state.viewportTop || pointer.y > state.viewportBottom) {
      return;
    }

    state.pointerId = pointer.id;
    state.pointerStartY = pointer.y;
    state.contentStartY = state.content.y;
  }

  onScrollPointerMove(pointer) {
    const state = this.scrollState;
    if (!state || state.pointerId !== pointer.id) {
      return;
    }

    const dragDistance = pointer.y - state.pointerStartY;
    this.setFactionScrollY(state.contentStartY + dragDistance);
    this.tapVsDrag.update(pointer, state.content.y);
  }

  onScrollPointerUp(pointer) {
    const state = this.scrollState;
    if (!state || state.pointerId !== pointer.id) {
      return;
    }

    state.pointerId = null;
  }

  setFactionScrollY(nextY) {
    const state = this.scrollState;
    if (!state) {
      return;
    }

    state.content.y = Phaser.Math.Clamp(nextY, state.minY, state.maxY);
  }


  drawNavigationControls() {
    const controls = createBottomNavigationControls(this, {
      onBack: () => this.returnToMainMenu(),
      onRules: () => this.openRulesPanel(),
      onFullscreen: () => this.toggleFullscreen(),
    });

    [controls.back, controls.rules, controls.fullscreen].filter(Boolean).forEach((control) => {
      this.uiElements.push(control.button ?? control.halo, control.backing, control.text);
      this.interactiveElements.push(control.button ?? control.backing, control.text);
    });
  }

  returnToMainMenu() {
    this.scene.start(this.returnSceneKey);
  }

  openRulesPanel() {
    this.scene.launch('RulesPanelScene', { returnSceneKey: 'FactionSelectScene' });
    this.scene.pause();
  }

  openBattleMenu() {
    this.scene.launch('BattleMenuScene', { returnSceneKey: 'FactionSelectScene' });
    this.scene.pause();
  }

  resumeFromRulesPanel() {
    this.scene.resume();
  }

  resumeFromBattleMenu() {
    this.scene.resume();
  }

  toggleFullscreen() {
    toggleSceneFullscreen(this);
  }

  onFullscreenChanged() {
    if (this.scale.isFullscreen) {
      requestPortraitOrientationLock();
    }

    if (this.scene.isActive('FactionSelectScene')) {
      this.scene.restart({ mode: this.mode, returnSceneKey: this.returnSceneKey });
    }
  }

  startBattle(factionKey) {
    if (this.isStartingBattle) {
      return;
    }

    const factionKeys = getFactionKeys();
    if (!factionKeys.includes(factionKey)) {
      return;
    }

    this.isStartingBattle = true;
    this.interactiveElements.forEach((element) => element?.disableInteractive?.());

    const transitionDiagnostics = this.getBattleTransitionDiagnostics(factionKey);
    if (transitionDiagnostics.blockedReason) {
      console.warn('Faction select battle transition blocked', transitionDiagnostics);
      this.resetStartBattleGuard();
      return;
    }

    this.stopStaleBattleScenes(transitionDiagnostics);

    try {
      stopMusic(this);
      enterBattleScene(this, { factionKey });
    } catch (error) {
      console.error('Faction select battle transition threw before BattleScene start', {
        error,
        diagnostics: this.getBattleTransitionDiagnostics(factionKey),
      });
      this.resetStartBattleGuard();
      return;
    }

    globalThis.setTimeout(() => {
      if (!this.scene.isActive('BattleScene')) {
        console.warn('Faction select battle transition did not activate BattleScene', this.getBattleTransitionDiagnostics(factionKey));
        this.resetStartBattleGuard();
      }
    }, 0);
  }

  getBattleTransitionDiagnostics(factionKey) {
    const sceneKeys = ['FactionSelectScene', 'BattleScene', 'BattleMenuScene'];
    const sceneStates = Object.fromEntries(sceneKeys.map((key) => [key, {
      active: this.scene.isActive(key),
      sleeping: this.scene.isSleeping(key),
      paused: this.scene.isPaused(key),
      visible: this.scene.isVisible(key),
    }]));
    const battleScene = this.scene.get('BattleScene');

    return {
      factionKey,
      factionExists: Boolean(getFactionKeys().includes(factionKey)),
      battleSceneExists: Boolean(battleScene),
      sceneStates,
      inputEnabled: Boolean(this.input?.enabled),
      staleInteractiveObjects: this.getStaleInteractiveObjects(),
      blockedReason: battleScene ? null : 'missing BattleScene',
    };
  }

  getStaleInteractiveObjects() {
    const currentSceneObjects = new Set();
    this.children?.each((child) => currentSceneObjects.add(child));

    return (this.input?.manager?.pointers ?? [])
      .flatMap((pointer) => pointer._temp ?? [])
      .filter((gameObject) => !currentSceneObjects.has(gameObject))
      .map((gameObject) => ({
        type: gameObject?.type ?? 'unknown',
        name: gameObject?.name ?? '',
        active: gameObject?.active,
        visible: gameObject?.visible,
        depth: gameObject?.depth,
        sceneKey: gameObject?.scene?.scene?.key,
      }));
  }

  stopStaleBattleScenes(transitionDiagnostics) {
    ['BattleScene', 'BattleMenuScene'].forEach((sceneKey) => {
      const state = transitionDiagnostics.sceneStates[sceneKey];
      if (state?.active || state?.sleeping || state?.paused) {
        console.warn(`Stopping stale ${sceneKey} before faction-select battle start`, transitionDiagnostics);
        this.scene.stop(sceneKey);
      }
    });
  }

  resetStartBattleGuard() {
    this.isStartingBattle = false;
    this.interactiveElements.forEach((element) => {
      if (element?.active) {
        element.setInteractive?.({ useHandCursor: true });
      }
    });
  }

  cleanupScene() {
    this.scale?.off('enterfullscreen', this.onFullscreenChanged, this);
    this.scale?.off('leavefullscreen', this.onFullscreenChanged, this);
    this.input?.off('wheel', this.onScrollWheel, this);
    this.input?.off('pointerdown', this.onScrollPointerDown, this);
    this.input?.off('pointermove', this.onScrollPointerMove, this);
    this.input?.off('pointerup', this.onScrollPointerUp, this);

    this.tapVsDrag?.cancel?.();
    this.factionCardViews.forEach((view) => view.tween?.stop?.());
    this.factionCardViews = [];
    this.openFactionKey = null;

    this.scrollMask?.destroy?.();
    this.scrollMask = null;
    this.scrollState = null;

    this.uiElements.forEach((element) => {
      if (element && element.active) {
        element.removeAllListeners?.();
        element.destroy();
      }
    });
    this.uiElements = [];
    this.interactiveElements = [];
  }
}

