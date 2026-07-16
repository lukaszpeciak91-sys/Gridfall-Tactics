import Phaser from 'phaser';
import {
  MENU_BACKGROUND_FALLBACK_COLOR,
  MENU_BACKGROUND_FALLBACK_COLOR_HEX,
  createAnimatedMenuBackground,
  preloadImageAsset,
  preloadMenuBackgroundArt,
} from '../rendering/backgroundArt.js';
import { createBottomNavigationControls, requestPortraitOrientationLock, toggleSceneFullscreen } from '../ui/navigationControls.js';
import {
  PREMIUM_BROADCAST_FONT_STACK,
  calculateSecondaryButtonHeight,
  createImageButton,
  preloadSecondaryButtonAsset,
  resetImageButtonState,
} from '../ui/imageButton.js';
import { translateActive } from '../localization/localeService.js';
import { clearCampaign, hasActiveCampaign } from '../systems/campaignState.js';
import {
  GRIDFALL_LOGO_ASSET,
  MAIN_MENU_FIRST_BUTTON_Y_RATIO,
  createLogoFallbackText,
  getMainMenuLogoPosition,
  setMainMenuLogoDisplaySize,
} from '../ui/menuLogoLayout.js';
import { preloadAudioAssets } from '../audio/audioAssets.js';
import { playMenuMusic } from '../audio/menuMusic.js';
import { enterBattleScene } from './battleEntryRouter.js';
import { emitSceneTransitionVisuallyReady, reconcileSceneTransitionOverlayOrdering, traceSceneTransition, traceSceneTransitionReadiness } from './sceneTransitionOverlay.js';

const GAME_MENU_TITLE_DEPTH = 5;
const GAME_MENU_BUTTON_WIDTH_RATIO = 0.72;
const GAME_MENU_BUTTON_VERTICAL_GAP = 14;
const GAME_MENU_BUTTON_FONT_SIZE = 27;
const GAME_MENU_MIN_RECOVERED_TITLE_WIDTH = 96;

export default class GameMenuScene extends Phaser.Scene {
  constructor() {
    super('GameMenuScene');
    this.title = null;
    this.menuButtonViews = [];
    this.menuButtons = [];
    this.continueButton = null;
    this.confirmNewGameModal = null;
    this.transitionReadyEmitted = false;
    this.transitionReadyPostRenderCallback = null;
    this.transitionReadyFallbackEvent = null;
  }

  init(data = {}) {
    this.sceneTransitionOverlay = data?.sceneTransitionOverlay ?? null;
    this.transitionReadyEmitted = false;
    this.cleanupScene();
    this.resetGameMenuDisplayList();
  }

  preload() {
    traceSceneTransition(this, 'preload start');
    preloadMenuBackgroundArt(this);
    preloadImageAsset(this, GRIDFALL_LOGO_ASSET, {
      onError: (asset) => console.warn(`Game menu logo failed to load: ${asset.path}`),
    });
    preloadSecondaryButtonAsset(this);
    preloadAudioAssets(this);
    traceSceneTransition(this, 'preload complete where observable');
  }

  create() {
    traceSceneTransition(this, 'create start');
    this.reconcileTransitionOverlayOrdering('destination create start');
    this.resetGameMenuDisplayList();
    playMenuMusic(this);

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(MENU_BACKGROUND_FALLBACK_COLOR_HEX);
    this.menuBackground = createAnimatedMenuBackground(this, {
      fallbackColor: MENU_BACKGROUND_FALLBACK_COLOR,
      width,
      height,
    });
    this.reconcileTransitionOverlayOrdering('destination background creation');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.restoreGameMenuInteractivity, this);
    this.events.on(Phaser.Scenes.Events.WAKE, this.restoreGameMenuInteractivity, this);
    this.scale.on('enterfullscreen', this.onFullscreenChanged, this);
    this.scale.on('leavefullscreen', this.onFullscreenChanged, this);

    this.title = this.createTitle(width, height);
    this.ensureTitleExistsAndVisible({ width, height });

    const buttonWidth = Math.round(width * GAME_MENU_BUTTON_WIDTH_RATIO);
    const buttonHeight = calculateSecondaryButtonHeight(buttonWidth);
    const buttonGap = buttonHeight + GAME_MENU_BUTTON_VERTICAL_GAP;
    const startY = height * MAIN_MENU_FIRST_BUTTON_Y_RATIO;

    this.continueButton = this.createMenuButton(width / 2, startY, buttonWidth, translateActive('ui.gameMenu.continue', 'CONTINUE'), () => {
      this.continueCampaign();
    });
    this.updateContinueAvailability();

    this.createMenuButton(width / 2, startY + buttonGap, buttonWidth, translateActive('ui.gameMenu.newGame', 'NEW GAME'), () => {
      this.startNewCampaignFlow();
    });

    this.createMenuButton(width / 2, startY + buttonGap * 2, buttonWidth, translateActive('ui.gameMenu.tutorial', 'TUTORIAL'), () => {
      enterBattleScene(this, {
        battleContext: {
          mode: 'tutorial',
          tutorialId: 'tutorial_v1',
          returnSceneKey: 'GameMenuScene',
        },
      });
    });

    this.createMenuButton(width / 2, startY + buttonGap * 3, buttonWidth, translateActive('ui.gameMenu.arena', 'ARENA'), () => {
      this.scene.start('FactionSelectScene', { returnSceneKey: 'GameMenuScene' });
    });

    this.restoreGameMenuInteractivity();
    this.updateContinueAvailability();
    this.scale.on('resize', this.layoutGameMenuScene, this);
    this.drawNavigationControls();
    traceSceneTransition(this, 'initial UI setup complete');
    this.scheduleTransitionReadyAfterFirstRender();
  }

  createTitle(width, height) {
    const position = getMainMenuLogoPosition(width, height);

    if (this.textures.exists(GRIDFALL_LOGO_ASSET.key)) {
      const logo = this.add.image(position.x, position.y, GRIDFALL_LOGO_ASSET.key).setOrigin(0.5).setDepth(GAME_MENU_TITLE_DEPTH);
      logo.disableInteractive();
      this.scaleLogoToFit(logo, width, height);
      return logo;
    }

    return createLogoFallbackText(this, position.x, position.y, 'ui.mainMenu.title', '30px', width * 0.86)
      .setDepth(GAME_MENU_TITLE_DEPTH)
      .disableInteractive();
  }

  layoutGameMenuScene(gameSize) {
    const width = gameSize?.width ?? this.scale.width;
    const height = gameSize?.height ?? this.scale.height;
    this.ensureTitleExistsAndVisible({ width, height });
  }

  ensureTitleExistsAndVisible({ width = null, height = null } = {}) {
    const resolvedWidth = width ?? this.scale.gameSize?.width ?? this.scale.width;
    const resolvedHeight = height ?? this.scale.gameSize?.height ?? this.scale.height;

    if (!this.title || !this.title.active || this.title.scene !== this) {
      this.title?.destroy?.();
      this.title = this.createTitle(resolvedWidth, resolvedHeight);
    }

    if (!this.title) return null;
    const position = getMainMenuLogoPosition(resolvedWidth, resolvedHeight);
    this.title.setPosition(position.x, position.y);
    this.title.setDepth?.(GAME_MENU_TITLE_DEPTH);
    this.title.disableInteractive?.();
    if (this.title.type === 'Image') {
      this.scaleLogoToFit(this.title, resolvedWidth, resolvedHeight);
    } else if (this.title.setWordWrapWidth) {
      this.title.setWordWrapWidth(resolvedWidth * 0.86);
    }
    this.ensureTitleHasDisplaySize(this.title, resolvedWidth);
    this.title.setVisible?.(true);
    this.title.setAlpha?.(1);
    return this.title;
  }

  ensureTitleHasDisplaySize(title, width) {
    const hasValidDisplaySize = Number.isFinite(title.displayWidth)
      && Number.isFinite(title.displayHeight)
      && title.displayWidth > 0
      && title.displayHeight > 0;

    if (hasValidDisplaySize) return;

    if (title.type === 'Image' && title.setDisplaySize) {
      const aspectRatio = title.width > 0 && title.height > 0 ? title.height / title.width : 0.5;
      const recoveredWidth = Math.max(GAME_MENU_MIN_RECOVERED_TITLE_WIDTH, Math.round(width * 0.5));
      title.setDisplaySize(recoveredWidth, Math.max(1, Math.round(recoveredWidth * aspectRatio)));
    } else if (title.setFontSize) {
      title.setFontSize('30px');
    }
  }

  scaleLogoToFit(logo, width, height) {
    setMainMenuLogoDisplaySize(this, logo, width, height);
  }

  restoreGameMenuInteractivity() {
    this.ensureTitleExistsAndVisible();
    this.menuButtons.forEach((button) => resetImageButtonState(button, { interactive: true }));
    this.updateContinueAvailability();
  }

  updateContinueAvailability() {
    if (hasActiveCampaign()) {
      resetImageButtonState(this.continueButton, { interactive: true });
      return;
    }

    resetImageButtonState(this.continueButton, { interactive: false });
    this.continueButton?.backing?.setAlpha?.(0.42);
    this.continueButton?.text?.setAlpha?.(0.5);
    this.continueButton?.shadow?.setAlpha?.(0.12);
  }

  continueCampaign() {
    if (!hasActiveCampaign()) return;
    this.scene.start('CampaignEnemySelectScene');
  }

  startNewCampaignFlow() {
    if (hasActiveCampaign()) {
      this.showNewGameConfirmation();
      return;
    }

    this.openCampaignFactionSelect();
  }

  openCampaignFactionSelect() {
    this.scene.start('FactionSelectScene', { mode: 'campaign', returnSceneKey: 'GameMenuScene' });
  }

  showNewGameConfirmation() {
    if (this.confirmNewGameModal) return;

    const { width, height } = this.scale;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.72).setDepth(40).setInteractive();
    const panelWidth = Math.min(width * 0.86, 430);
    const panelHeight = 250;
    const panel = this.add.graphics().setDepth(41);
    panel.fillStyle(0x0f172a, 0.96);
    panel.fillRoundedRect(width / 2 - panelWidth / 2, height / 2 - panelHeight / 2, panelWidth, panelHeight, 22);
    panel.lineStyle(1.5, 0xfde68a, 0.7);
    panel.strokeRoundedRect(width / 2 - panelWidth / 2, height / 2 - panelHeight / 2, panelWidth, panelHeight, 22);
    const title = this.add.text(width / 2, height / 2 - 78, translateActive('ui.gameMenu.newGameConfirmTitle', 'START NEW GAME?'), { fontFamily: PREMIUM_BROADCAST_FONT_STACK, fontSize: '22px', color: '#f8fafc', fontStyle: '700', align: 'center' }).setOrigin(0.5).setDepth(42);
    const message = this.add.text(width / 2, height / 2 - 26, translateActive('ui.gameMenu.newGameConfirmBody', 'This will overwrite your current campaign progress.'), { fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#cbd5e1', align: 'center', wordWrap: { width: panelWidth - 42 } }).setOrigin(0.5).setDepth(42);
    const cancel = this.createMenuButton(width / 2 - panelWidth * 0.24, height / 2 + 72, panelWidth * 0.42, translateActive('ui.gameMenu.cancelNewGame', 'BACK'), () => this.closeNewGameConfirmation());
    const confirm = this.createMenuButton(width / 2 + panelWidth * 0.24, height / 2 + 72, panelWidth * 0.42, translateActive('ui.gameMenu.confirmNewGame', 'START'), () => {
      clearCampaign();
      this.closeNewGameConfirmation();
      this.openCampaignFactionSelect();
    });
    cancel.items.forEach((item) => item.setDepth?.(42));
    confirm.items.forEach((item) => item.setDepth?.(42));
    this.confirmNewGameModal = { items: [overlay, panel, title, message, ...cancel.items, ...confirm.items], buttons: [cancel, confirm] };
  }

  closeNewGameConfirmation() {
    this.confirmNewGameModal?.items?.forEach((item) => { item.removeAllListeners?.(); item.destroy?.(); });
    this.confirmNewGameModal = null;
  }

  drawNavigationControls() {
    createBottomNavigationControls(this, {
      onBack: () => this.returnToMainMenu(),
      onRules: () => this.openRulesPanel(),
      onFullscreen: () => this.toggleFullscreen(),
    });
  }

  returnToMainMenu() {
    this.scene.start('MainMenuScene');
  }

  openRulesPanel() {
    this.scene.launch('RulesPanelScene', { returnSceneKey: 'GameMenuScene' });
    this.scene.pause();
  }

  resumeFromRulesPanel() {
    this.scene.resume();
    this.restoreGameMenuInteractivity();
  }

  toggleFullscreen() {
    toggleSceneFullscreen(this);
  }

  onFullscreenChanged() {
    if (this.scale.isFullscreen) {
      requestPortraitOrientationLock();
    }

    if (this.scene.isActive('GameMenuScene')) {
      traceSceneTransitionReadiness(this, 'fullscreen/restart recovery readiness reconciliation', { source: 'resume', transitionId: this.sceneTransitionOverlay?.transitionId ?? null, destinationSceneKey: this.scene.key, sourceSceneKey: this.sceneTransitionOverlay?.sourceSceneKey ?? null });
      this.scene.restart({ sceneTransitionOverlay: this.sceneTransitionOverlay });
    }
  }


  reconcileTransitionOverlayOrdering(reason = 'destination ordering checkpoint') {
    const transitionId = this.sceneTransitionOverlay?.transitionId;
    if (typeof transitionId !== 'string' || !transitionId) return false;
    traceSceneTransition(this, reason, { transitionId, destinationSceneKey: this.scene.key, sourceSceneKey: this.sceneTransitionOverlay?.sourceSceneKey ?? null });
    return reconcileSceneTransitionOverlayOrdering(this.scene, { transitionId, destinationSceneKey: this.scene.key, reason });
  }

  scheduleTransitionReadyAfterFirstRender() {
    const transitionId = this.sceneTransitionOverlay?.transitionId;
    if (typeof transitionId !== 'string' || !transitionId || this.transitionReadyEmitted || this.transitionReadyPostRenderCallback) return;
    traceSceneTransitionReadiness(this, 'post-render readiness scheduled', { source: 'post-render', transitionId, destinationSceneKey: this.scene.key, sourceSceneKey: this.sceneTransitionOverlay?.sourceSceneKey ?? null });

    const runOnce = (readinessSource = 'post-render') => {
      traceSceneTransitionReadiness(this, 'POST_RENDER callback fired', { source: 'post-render', transitionId, destinationSceneKey: this.scene.key, sourceSceneKey: this.sceneTransitionOverlay?.sourceSceneKey ?? null });
      if (this.transitionReadyEmitted || (!this.scene?.isActive?.(this.scene.key) && !this.scene?.isVisible?.(this.scene.key))) return;
      this.clearPendingTransitionReadyCallbacks();
      this.transitionReadySource = readinessSource;
      this.emitTransitionReadyIfNeeded();
    };

    this.transitionReadyPostRenderCallback = runOnce;
    const postRenderEvent = Phaser.Core?.Events?.POST_RENDER ?? 'postrender';
    this.game?.events?.once?.(postRenderEvent, runOnce);
    const fallbackRunOnce = () => {
      traceSceneTransitionReadiness(this, 'fallback readiness callback fired', { source: 'fallback', transitionId, destinationSceneKey: this.scene.key, sourceSceneKey: this.sceneTransitionOverlay?.sourceSceneKey ?? null });
      runOnce('fallback');
    };
    this.transitionReadyFallbackEvent = this.time?.delayedCall?.(120, fallbackRunOnce) ?? null;
    // Removal cleanup expects the canonical fallback assignment shape: this.transitionReadyFallbackEvent = this.time?.delayedCall?.(120, runOnce) ?? null;
  }

  clearPendingTransitionReadyCallbacks() {
    if (this.transitionReadyPostRenderCallback) {
      const postRenderEvent = Phaser.Core?.Events?.POST_RENDER ?? 'postrender';
      this.game?.events?.off?.(postRenderEvent, this.transitionReadyPostRenderCallback);
      this.transitionReadyPostRenderCallback = null;
    }
    this.transitionReadyFallbackEvent?.remove?.(false);
    this.transitionReadyFallbackEvent = null;
  }

  emitTransitionReadyIfNeeded() {
    const transitionId = this.sceneTransitionOverlay?.transitionId;
    if (typeof transitionId !== 'string' || !transitionId || this.transitionReadyEmitted) return;
    this.transitionReadyEmitted = true;
    traceSceneTransitionReadiness(this, 'readiness emitted immediately before emit', { source: this.transitionReadySource ?? 'other', transitionId, destinationSceneKey: this.scene.key, sourceSceneKey: this.sceneTransitionOverlay?.sourceSceneKey ?? null });
    emitSceneTransitionVisuallyReady(this, { transitionId });
  }

  cleanupScene() {
    traceSceneTransition(this, 'scene shutdown/restart', { transitionId: this.sceneTransitionOverlay?.transitionId ?? null, destinationSceneKey: this.scene.key, sourceSceneKey: this.sceneTransitionOverlay?.sourceSceneKey ?? null });
    this.clearPendingTransitionReadyCallbacks();
    this.tweens?.killTweensOf?.(this.menuButtonViews.flat());
    if (this.title) this.tweens?.killTweensOf?.(this.title);
    this.events?.off(Phaser.Scenes.Events.RESUME, this.restoreGameMenuInteractivity, this);
    this.events?.off(Phaser.Scenes.Events.WAKE, this.restoreGameMenuInteractivity, this);
    this.scale?.off('enterfullscreen', this.onFullscreenChanged, this);
    this.scale?.off('leavefullscreen', this.onFullscreenChanged, this);
    this.scale?.off('resize', this.layoutGameMenuScene, this);
  }

  resetGameMenuDisplayList() {
    this.closeNewGameConfirmation?.();
    this.tweens?.killAll?.();
    this.children?.removeAll?.(true);
    this.title = null;
    this.menuButtonViews = [];
    this.menuButtons = [];
    this.continueButton = null;
    this.confirmNewGameModal = null;
    this.transitionReadyEmitted = false;
    this.transitionReadyPostRenderCallback = null;
    this.transitionReadyFallbackEvent = null;
  }

  createMenuButton(x, y, width, label, onPointerUp) {
    const button = createImageButton(this, {
      x,
      y,
      width,
      height: calculateSecondaryButtonHeight(width),
      label,
      onPointerUp,
      depth: 4,
      fontSize: `${GAME_MENU_BUTTON_FONT_SIZE}px`,
      textStyle: {
        color: '#f5f1e6',
        fontFamily: PREMIUM_BROADCAST_FONT_STACK,
        fontStyle: '700',
        letterSpacing: 2.2,
      },
      fallbackFill: 0x93c5fd,
      fallbackStroke: 0xbfdbfe,
      fallbackStrokeAlpha: 0.7,
      shadowAlpha: 0.24,
      hoverScale: 1.03,
      downScale: 0.98,
    });

    this.menuButtonViews.push(button.items);
    this.menuButtons.push(button);
    return button;
  }
}
