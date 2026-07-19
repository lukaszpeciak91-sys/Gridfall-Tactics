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
import { createBuildMarker } from '../ui/buildMarker.js';
import { preloadAudioAssets } from '../audio/audioAssets.js';
import { playMenuMusic } from '../audio/menuMusic.js';
import { beginSceneTransitionOverlay, reconcileSceneTransitionOverlayOrdering } from './sceneTransitionOverlay.js';
import { applyAudioSettings, loadSettings } from '../systems/settingsState.js';
import { SHOW_DEBUG_MENU_TRIGGER } from '../config/debugFlags.js';
import {
  GRIDFALL_LOGO_ASSET,
  MAIN_MENU_FIRST_BUTTON_Y_RATIO,
  createLogoFallbackText,
  getMainMenuLogoPosition,
  setMainMenuLogoDisplaySize,
} from '../ui/menuLogoLayout.js';

const MAIN_MENU_TITLE_DEPTH = 5;
const MAIN_MENU_REVEAL_DELAY_MS = 80;
const MAIN_MENU_REVEAL_MS = 320;
const MAIN_MENU_SHARED_REVEAL_FALLBACK_MS = 1400;

const MAIN_MENU_BUTTON_WIDTH_RATIO = 0.72;
const MAIN_MENU_BUTTON_VERTICAL_GAP = 14;
const MAIN_MENU_BUTTON_FONT_SIZE = 27;
const MAIN_MENU_MIN_RECOVERED_TITLE_WIDTH = 96;

const MAIN_MENU_DEBUG_ICON_SIZE = 38;
const MAIN_MENU_DEBUG_ICON_MARGIN = 12;


export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenuScene');
    this.statusText = null;
    this.title = null;
    this.isAwaitingSharedLogo = false;
    this.menuButtonViews = [];
    this.menuButtons = [];
    this.sharedLogoRevealFallbackEvent = null;
    this.buildMarker = null;
    this.debugEntryIcon = null;
    this.debugEntryLabel = null;
  }

  init() {
    this.cleanupScene();
    this.resetMainMenuDisplayList();
  }

  preload() {
    preloadMenuBackgroundArt(this);
    preloadImageAsset(this, GRIDFALL_LOGO_ASSET, {
      onError: (asset) => console.warn(`Main menu logo failed to load: ${asset.path}`),
    });
    preloadSecondaryButtonAsset(this);
    preloadAudioAssets(this);
  }

  create(data = {}) {
    this.resetMainMenuDisplayList();

    const { width, height } = this.scale;
    const revealFromStart = Boolean(data.revealFromStart);
    const awaitSharedLogo = Boolean(data.awaitSharedLogo);
    this.isAwaitingSharedLogo = awaitSharedLogo;
    this.menuButtonViews = [];
    this.menuButtons = [];
    applyAudioSettings(this, loadSettings());
    playMenuMusic(this);

    this.cameras.main.setBackgroundColor(MENU_BACKGROUND_FALLBACK_COLOR_HEX);
    this.menuBackground = createAnimatedMenuBackground(this, {
      fallbackColor: MENU_BACKGROUND_FALLBACK_COLOR,
      width,
      height,
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.restoreMainMenuInteractivity, this);
    this.events.on(Phaser.Scenes.Events.WAKE, this.restoreMainMenuInteractivity, this);
    this.scale.on('enterfullscreen', this.onFullscreenChanged, this);
    this.scale.on('leavefullscreen', this.onFullscreenChanged, this);

    this.title = this.createTitle(width, height);
    this.ensureTitleExistsAndVisible({ forceVisible: !awaitSharedLogo, width, height });

    const buttonWidth = Math.round(width * MAIN_MENU_BUTTON_WIDTH_RATIO);
    const buttonHeight = calculateSecondaryButtonHeight(buttonWidth);
    const buttonGap = buttonHeight + MAIN_MENU_BUTTON_VERTICAL_GAP;
    const startY = height * MAIN_MENU_FIRST_BUTTON_Y_RATIO;

    this.createMenuButton(width / 2, startY, buttonWidth, translateActive('ui.mainMenu.game', 'GAME'), () => {
      this.scene.start('GameMenuScene');
    });

    this.createMenuButton(width / 2, startY + buttonGap, buttonWidth, translateActive('ui.mainMenu.collection', 'COLLECTION'), () => {
      const transition = beginSceneTransitionOverlay(this, 'CollectionScene');
      this.scene.start('CollectionScene', {
        sceneTransitionOverlay: transition ? { transitionId: transition.transitionId, sourceSceneKey: this.scene.key } : null,
      });
      reconcileSceneTransitionOverlayOrdering(this.scene, { transitionId: transition?.transitionId, destinationSceneKey: 'CollectionScene' });
    });

    this.createMenuButton(width / 2, startY + buttonGap * 2, buttonWidth, translateActive('ui.mainMenu.achievements', 'ACHIEVEMENTS'), () => {
      this.scene.start('AchievementsScene');
    });

    this.createMenuButton(width / 2, startY + buttonGap * 3, buttonWidth, translateActive('ui.mainMenu.settings', 'SETTINGS'), () => {
      this.scene.start('SettingsScene');
    });

    this.statusText = this.add
      .text(width / 2, Math.min(height - 112, startY + buttonGap * 3 + 70), '', {
        fontFamily: PREMIUM_BROADCAST_FONT_STACK,
        fontSize: '15px',
        color: '#fde68a',
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    if (awaitSharedLogo) {
      this.prepareSharedLogoReveal();
    } else if (revealFromStart) {
      this.revealMenuButtons();
    } else {
      this.restoreMainMenuInteractivity();
    }

    this.drawBuildMarker(width, height);
    this.drawDebugEntry(width, height);
    this.scale.on('resize', this.layoutMainMenuScene, this);
    this.drawNavigationControls();
  }



  drawDebugEntry(width = this.scale.width) {
    if (!SHOW_DEBUG_MENU_TRIGGER) {
      this.debugEntryIcon = null;
      this.debugEntryLabel = null;
      return;
    }

    const size = MAIN_MENU_DEBUG_ICON_SIZE;
    const x = MAIN_MENU_DEBUG_ICON_MARGIN + size * 0.5;
    const y = MAIN_MENU_DEBUG_ICON_MARGIN + size * 0.5;

    this.debugEntryIcon?.destroy?.();
    this.debugEntryLabel?.destroy?.();

    const icon = this.add.circle(x, y, size * 0.5, 0x0f172a, 0.8)
      .setStrokeStyle(2, 0x60a5fa, 0.72)
      .setDepth(21)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(x, y, '⚙', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#dbeafe',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(22);

    icon.on('pointerup', () => {
      this.scene.start('DebugMenuScene');
    });

    icon.on('pointerover', () => {
      icon.setFillStyle(0x1e293b, 0.94);
      icon.setStrokeStyle(2, 0x93c5fd, 0.88);
      label.setColor('#eff6ff');
    });

    icon.on('pointerout', () => {
      icon.setFillStyle(0x0f172a, 0.8);
      icon.setStrokeStyle(2, 0x60a5fa, 0.72);
      label.setColor('#dbeafe');
    });

    this.debugEntryIcon = icon;
    this.debugEntryLabel = label;
  }


  layoutDebugEntry() {
    if (!this.debugEntryIcon?.active || !this.debugEntryLabel?.active) return;
    const size = MAIN_MENU_DEBUG_ICON_SIZE;
    const x = MAIN_MENU_DEBUG_ICON_MARGIN + size * 0.5;
    const y = MAIN_MENU_DEBUG_ICON_MARGIN + size * 0.5;
    this.debugEntryIcon.setPosition(x, y);
    this.debugEntryLabel.setPosition(x, y);
  }

  drawBuildMarker(width = this.scale.width, height = this.scale.height) {
    this.buildMarker?.destroy?.();
    this.buildMarker = createBuildMarker(this, {
      width,
      height,
      inset: 10,
      corner: 'top-right',
      alpha: 0.42,
      depth: 20,
      fontSize: '10px',
    });
  }

  layoutBuildMarker(width = this.scale.width) {
    if (!this.buildMarker?.active) return;
    this.buildMarker.setPosition(width - 10, 10);
    this.buildMarker.setOrigin(1, 0);
  }

  createTitle(width, height) {
    const position = getMainMenuLogoPosition(width, height);

    if (this.textures.exists(GRIDFALL_LOGO_ASSET.key)) {
      const logo = this.add.image(position.x, position.y, GRIDFALL_LOGO_ASSET.key).setOrigin(0.5).setDepth(MAIN_MENU_TITLE_DEPTH);

      logo.disableInteractive();
      this.scaleLogoToFit(logo, width, height);
      return logo;
    }

    return createLogoFallbackText(this, position.x, position.y, 'ui.mainMenu.title', '30px', width * 0.86)
      .setDepth(MAIN_MENU_TITLE_DEPTH)
      .disableInteractive();
  }

  layoutMainMenuScene(gameSize) {
    const width = gameSize?.width ?? this.scale.width;
    const height = gameSize?.height ?? this.scale.height;

    this.layoutBuildMarker(width, height);
    this.layoutDebugEntry();
    this.ensureTitleExistsAndVisible({
      forceVisible: !this.isAwaitingSharedLogo,
      width,
      height,
    });
  }

  ensureTitleExistsAndVisible({ forceVisible = !this.isAwaitingSharedLogo, width = null, height = null } = {}) {
    const resolvedWidth = width ?? this.scale.gameSize?.width ?? this.scale.width;
    const resolvedHeight = height ?? this.scale.gameSize?.height ?? this.scale.height;

    if (!this.isTitleUsable()) {
      this.title?.destroy?.();
      this.title = this.createTitle(resolvedWidth, resolvedHeight);
    }

    if (!this.title) {
      return null;
    }

    this.applyTitleLayout(this.title, resolvedWidth, resolvedHeight);
    this.title.setDepth?.(MAIN_MENU_TITLE_DEPTH);
    this.title.disableInteractive?.();
    this.ensureTitleHasDisplaySize(this.title, resolvedWidth);

    if (forceVisible) {
      this.isAwaitingSharedLogo = false;
      this.title.setVisible?.(true);
      this.title.setAlpha?.(1);
    } else if (this.isAwaitingSharedLogo) {
      this.title.setAlpha?.(0);
    }

    return this.title;
  }

  isTitleUsable() {
    return Boolean(this.title && this.title.active && this.title.scene === this);
  }

  applyTitleLayout(title, width, height) {
    const position = getMainMenuLogoPosition(width, height);
    title.setPosition(position.x, position.y);

    if (title.type === 'Image') {
      this.scaleLogoToFit(title, width, height);
    } else if (title.setWordWrapWidth) {
      title.setWordWrapWidth(width * 0.86);
    }
  }

  ensureTitleHasDisplaySize(title, width) {
    const hasValidDisplaySize = Number.isFinite(title.displayWidth)
      && Number.isFinite(title.displayHeight)
      && title.displayWidth > 0
      && title.displayHeight > 0;

    if (hasValidDisplaySize) {
      return;
    }

    if (title.type === 'Image' && title.setDisplaySize) {
      const aspectRatio = title.width > 0 && title.height > 0 ? title.height / title.width : 0.5;
      const recoveredWidth = Math.max(MAIN_MENU_MIN_RECOVERED_TITLE_WIDTH, Math.round(width * 0.5));
      title.setDisplaySize(recoveredWidth, Math.max(1, Math.round(recoveredWidth * aspectRatio)));
    } else if (title.setFontSize) {
      title.setFontSize('30px');
    }
  }

  scaleLogoToFit(logo, width, height) {
    setMainMenuLogoDisplaySize(this, logo, width, height);
  }

  prepareSharedLogoReveal() {
    this.isAwaitingSharedLogo = true;
    this.title?.setAlpha(0);
    this.setMenuButtonsInteractive(false);
    this.menuButtonViews.flat().forEach((item) => {
      this.restoreMenuButtonItemPosition(item);
      item.setAlpha(0);
      item.y += 16;
    });

    this.sharedLogoRevealFallbackEvent?.remove?.();
    this.sharedLogoRevealFallbackEvent = this.time.delayedCall(MAIN_MENU_SHARED_REVEAL_FALLBACK_MS, () => {
      if (this.scene.isActive('MainMenuScene')) {
        this.restoreMainMenuInteractivity();
      }
    });
  }

  completeStartLogoTransition() {
    this.sharedLogoRevealFallbackEvent?.remove?.();
    this.sharedLogoRevealFallbackEvent = null;
    this.isAwaitingSharedLogo = false;

    this.ensureTitleExistsAndVisible({ forceVisible: true });

    this.setMenuButtonsInteractive(true);
    this.revealMenuButtons({ alreadyPrepared: true });
  }

  revealMenuButtons({ alreadyPrepared = false } = {}) {
    const targets = this.menuButtonViews.flat();
    this.tweens.killTweensOf(targets);

    if (!alreadyPrepared) {
      targets.forEach((item) => {
        this.restoreMenuButtonItemPosition(item);
        item.setAlpha(0);
        item.y += 16;
      });
    }

    this.tweens.add({
      targets,
      alpha: 1,
      y: '-=16',
      delay: MAIN_MENU_REVEAL_DELAY_MS,
      duration: MAIN_MENU_REVEAL_MS,
      ease: 'Sine.easeOut',
      onComplete: () => this.restoreMainMenuInteractivity(),
    });
  }

  restoreMainMenuInteractivity() {
    this.sharedLogoRevealFallbackEvent?.remove?.();
    this.sharedLogoRevealFallbackEvent = null;

    this.ensureTitleExistsAndVisible({ forceVisible: true });
    this.title?.setAlpha?.(1);
    this.title?.setVisible?.(true);

    this.menuButtons.forEach((button) => {
      button.items?.forEach((item) => this.restoreMenuButtonItemPosition(item));
      resetImageButtonState(button, { interactive: true });
    });
  }

  restoreMenuButtonItemPosition(item) {
    const baseX = item?.getData?.('mainMenuBaseX');
    const baseY = item?.getData?.('mainMenuBaseY');

    if (Number.isFinite(baseX) && Number.isFinite(baseY)) {
      item.setPosition(baseX, baseY);
    }
  }

  setMenuButtonsInteractive(isInteractive) {
    this.menuButtons.forEach((button) => {
      if (isInteractive) {
        button.hitZone?.setInteractive({ useHandCursor: true });
      } else {
        button.hitZone?.disableInteractive();
      }
    });
  }

  drawNavigationControls() {
    createBottomNavigationControls(this, {
      onMute: () => {},
      onRules: () => this.openRulesPanel(),
      onFullscreen: () => this.toggleFullscreen(),
    });
  }

  returnToStartScene() {
    this.scene.start('StartScene');
  }

  openRulesPanel() {
    this.scene.launch('RulesPanelScene', { returnSceneKey: 'MainMenuScene' });
    this.scene.pause();
  }

  resumeFromRulesPanel() {
    this.scene.resume();
    this.restoreMainMenuInteractivity();
  }

  toggleFullscreen() {
    toggleSceneFullscreen(this);
  }

  onFullscreenChanged() {
    if (this.scale.isFullscreen) {
      requestPortraitOrientationLock();
    }

    if (this.scene.isActive('MainMenuScene')) {
      this.scene.restart();
    }
  }

  cleanupScene() {
    this.sharedLogoRevealFallbackEvent?.remove?.();
    this.sharedLogoRevealFallbackEvent = null;
    this.tweens?.killTweensOf?.(this.menuButtonViews.flat());
    if (this.title) {
      this.tweens?.killTweensOf?.(this.title);
    }

    this.events?.off(Phaser.Scenes.Events.RESUME, this.restoreMainMenuInteractivity, this);
    this.events?.off(Phaser.Scenes.Events.WAKE, this.restoreMainMenuInteractivity, this);
    this.scale?.off('enterfullscreen', this.onFullscreenChanged, this);
    this.scale?.off('leavefullscreen', this.onFullscreenChanged, this);
    this.scale?.off('resize', this.layoutMainMenuScene, this);
  }

  resetMainMenuDisplayList() {
    this.sharedLogoRevealFallbackEvent?.remove?.();
    this.sharedLogoRevealFallbackEvent = null;
    this.tweens?.killAll?.();
    this.children?.removeAll?.(true);
    this.statusText = null;
    this.title = null;
    this.isAwaitingSharedLogo = false;
    this.menuButtonViews = [];
    this.menuButtons = [];
    this.buildMarker = null;
    this.debugEntryIcon = null;
    this.debugEntryLabel = null;
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
      fontSize: `${MAIN_MENU_BUTTON_FONT_SIZE}px`,
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
      ambientFrameSweep: true,
    });

    button.items.forEach((item) => {
      item.setData?.('mainMenuBaseX', item.x);
      item.setData?.('mainMenuBaseY', item.y);
    });

    this.menuButtonViews.push(button.items);
    this.menuButtons.push(button);
  }
}
