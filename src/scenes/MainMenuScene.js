import Phaser from 'phaser';
import {
  MENU_BACKGROUND_FALLBACK_COLOR,
  MENU_BACKGROUND_FALLBACK_COLOR_HEX,
  createCoverBackground,
  createMenuArenaLightSweep,
  getMenuBackgroundAsset,
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


export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenuScene');
    this.statusText = null;
    this.title = null;
    this.menuButtonViews = [];
    this.menuButtons = [];
    this.sharedLogoRevealFallbackEvent = null;
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
  }

  create(data = {}) {
    this.resetMainMenuDisplayList();

    const { width, height } = this.scale;
    const revealFromStart = Boolean(data.revealFromStart);
    const awaitSharedLogo = Boolean(data.awaitSharedLogo);
    this.menuButtonViews = [];
    this.menuButtons = [];

    this.cameras.main.setBackgroundColor(MENU_BACKGROUND_FALLBACK_COLOR_HEX);
    createCoverBackground(this, {
      asset: getMenuBackgroundAsset(),
      fallbackColor: MENU_BACKGROUND_FALLBACK_COLOR,
      width,
      height,
    });
    createMenuArenaLightSweep(this, { width, height });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.restoreMainMenuInteractivity, this);
    this.events.on(Phaser.Scenes.Events.WAKE, this.restoreMainMenuInteractivity, this);
    this.scale.on('enterfullscreen', this.onFullscreenChanged, this);
    this.scale.on('leavefullscreen', this.onFullscreenChanged, this);

    this.title = this.createTitle(width, height);

    const buttonWidth = Math.round(width * MAIN_MENU_BUTTON_WIDTH_RATIO);
    const buttonHeight = calculateSecondaryButtonHeight(buttonWidth);
    const buttonGap = buttonHeight + MAIN_MENU_BUTTON_VERTICAL_GAP;
    const startY = height * MAIN_MENU_FIRST_BUTTON_Y_RATIO;

    this.createMenuButton(width / 2, startY, buttonWidth, translateActive('ui.mainMenu.arena', 'ARENA'), () => {
      this.scene.start('FactionSelectScene');
    });

    this.createMenuButton(width / 2, startY + buttonGap, buttonWidth, translateActive('ui.mainMenu.tutorial', 'TUTORIAL'), () => {
      this.scene.start('TutorialScene');
    });

    this.createMenuButton(width / 2, startY + buttonGap * 2, buttonWidth, translateActive('ui.mainMenu.collection', 'COLLECTION'), () => {
      this.scene.start('CollectionScene');
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

    this.scale.on('resize', this.layoutMainMenuScene, this);
    this.drawNavigationControls();
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

    if (this.title) {
      const position = getMainMenuLogoPosition(width, height);
      this.title.setPosition(position.x, position.y);
      if (this.title.type === 'Image') {
        this.scaleLogoToFit(this.title, width, height);
      } else if (this.title.setWordWrapWidth) {
        this.title.setWordWrapWidth(width * 0.86);
      }
    }
  }

  scaleLogoToFit(logo, width, height) {
    setMainMenuLogoDisplaySize(this, logo, width, height);
  }

  prepareSharedLogoReveal() {
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

    if (this.title) {
      this.title.setAlpha(1);
    }

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
      onBack: () => this.returnToStartScene(),
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
    this.menuButtonViews = [];
    this.menuButtons = [];
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
    });

    button.items.forEach((item) => {
      item.setData?.('mainMenuBaseX', item.x);
      item.setData?.('mainMenuBaseY', item.y);
    });

    this.menuButtonViews.push(button.items);
    this.menuButtons.push(button);
  }
}
