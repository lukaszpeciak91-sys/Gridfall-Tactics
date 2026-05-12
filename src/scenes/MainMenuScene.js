import Phaser from 'phaser';
import {
  MENU_BACKGROUND_FALLBACK_COLOR,
  MENU_BACKGROUND_FALLBACK_COLOR_HEX,
  createCoverBackground,
  createMenuArenaLightSweep,
  getMenuBackgroundAsset,
  preloadImageAsset,
  preloadMenuBackgroundArt,
  resolvePublicAssetPath,
} from '../rendering/backgroundArt.js';
import { createBottomNavigationControls, requestPortraitOrientationLock, toggleSceneFullscreen } from '../ui/navigationControls.js';
import { translateActive } from '../localization/localeService.js';
import { getTextureSourceSize, setCrispLogoDisplaySize } from '../rendering/logoRendering.js';

const MAIN_MENU_TITLE_TEXT = 'GRIDFALL TACTICS';
const MAIN_MENU_LOGO_PUBLIC_PATH = 'assets/ui/gridfall-logo.png';
const MAIN_MENU_LOGO_ASSET = {
  key: 'ui.logo.gridfall',
  path: resolvePublicAssetPath(MAIN_MENU_LOGO_PUBLIC_PATH),
};
const MAIN_MENU_TITLE_DEPTH = 5;
const MAIN_MENU_FIRST_BUTTON_Y_RATIO = 0.31;
const MAIN_MENU_BUTTON_HALF_HEIGHT = 27;
const MAIN_MENU_LOGO_LAYOUT = {
  centerYRatio: 0.14,
  maxWidthRatio: 0.75,
  maxHeightRatio: 0.23,
  maxDisplayHeight: 220,
  minButtonGap: 18,
};

const BUTTON_STYLE = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '26px',
  fontStyle: 'bold',
  color: '#111827',
  backgroundColor: '#93c5fd',
  align: 'center',
  padding: { x: 20, y: 12 },
};

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenuScene');
    this.statusText = null;
    this.title = null;
  }

  init() {
    this.cleanupScene();
  }

  preload() {
    preloadMenuBackgroundArt(this);
    preloadImageAsset(this, MAIN_MENU_LOGO_ASSET, {
      onError: (asset) => console.warn(`Main menu logo failed to load: ${asset.path}`),
    });
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor(MENU_BACKGROUND_FALLBACK_COLOR_HEX);
    createCoverBackground(this, {
      asset: getMenuBackgroundAsset(),
      fallbackColor: MENU_BACKGROUND_FALLBACK_COLOR,
      width,
      height,
    });
    createMenuArenaLightSweep(this, { width, height });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
    this.scale.on('enterfullscreen', this.onFullscreenChanged, this);
    this.scale.on('leavefullscreen', this.onFullscreenChanged, this);

    this.title = this.createTitle(width, height);

    const buttonWidth = Math.min(width - 64, 292);
    const buttonGap = 76;
    const startY = height * MAIN_MENU_FIRST_BUTTON_Y_RATIO;

    this.createMenuButton(width / 2, startY, buttonWidth, translateActive('ui.mainMenu.arena', 'ARENA'), () => {
      this.scene.start('FactionSelectScene');
    });

    this.createMenuButton(width / 2, startY + buttonGap, buttonWidth, translateActive('ui.mainMenu.tutorial', 'TUTORIAL'), () => {
      this.statusText.setText(translateActive('ui.mainMenu.tutorialComingSoon', 'Tutorial coming soon'));
      this.tweens.add({ targets: this.statusText, alpha: 1, duration: 120 });
    });

    this.createMenuButton(width / 2, startY + buttonGap * 2, buttonWidth, translateActive('ui.mainMenu.collection', 'COLLECTION'), () => {
      this.scene.start('CollectionScene');
    });

    this.createMenuButton(width / 2, startY + buttonGap * 3, buttonWidth, translateActive('ui.mainMenu.settings', 'SETTINGS'), () => {
      this.scene.start('SettingsScene');
    });

    this.statusText = this.add
      .text(width / 2, Math.min(height - 112, startY + buttonGap * 3 + 70), '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        color: '#fde68a',
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.scale.on('resize', this.layoutMainMenuScene, this);
    this.drawNavigationControls();
  }

  createTitle(width, height) {
    if (this.textures.exists(MAIN_MENU_LOGO_ASSET.key)) {
      const logo = this.add
        .image(width / 2, height * MAIN_MENU_LOGO_LAYOUT.centerYRatio, MAIN_MENU_LOGO_ASSET.key)
        .setOrigin(0.5)
        .setDepth(MAIN_MENU_TITLE_DEPTH);

      logo.disableInteractive();
      this.scaleLogoToFit(logo, width, height);
      return logo;
    }

    return this.add
      .text(width / 2, height * MAIN_MENU_LOGO_LAYOUT.centerYRatio, translateActive('ui.mainMenu.title', MAIN_MENU_TITLE_TEXT), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#f8fafc',
        align: 'center',
        wordWrap: { width: width * 0.86 },
      })
      .setOrigin(0.5)
      .setDepth(MAIN_MENU_TITLE_DEPTH)
      .disableInteractive();
  }

  layoutMainMenuScene(gameSize) {
    const width = gameSize?.width ?? this.scale.width;
    const height = gameSize?.height ?? this.scale.height;

    if (this.title) {
      this.title.setPosition(width / 2, height * MAIN_MENU_LOGO_LAYOUT.centerYRatio);
      if (this.title.type === 'Image') {
        this.scaleLogoToFit(this.title, width, height);
      } else if (this.title.setWordWrapWidth) {
        this.title.setWordWrapWidth(width * 0.86);
      }
    }
  }

  scaleLogoToFit(logo, width, height) {
    const maxLogoWidth = width * MAIN_MENU_LOGO_LAYOUT.maxWidthRatio;
    const logoCenterY = height * MAIN_MENU_LOGO_LAYOUT.centerYRatio;
    const firstButtonSafeTop = height * MAIN_MENU_FIRST_BUTTON_Y_RATIO - MAIN_MENU_BUTTON_HALF_HEIGHT;
    const safeLogoHeight = Math.max(0, (firstButtonSafeTop - logoCenterY - MAIN_MENU_LOGO_LAYOUT.minButtonGap) * 2);
    const maxLogoHeight = Math.min(
      height * MAIN_MENU_LOGO_LAYOUT.maxHeightRatio,
      MAIN_MENU_LOGO_LAYOUT.maxDisplayHeight,
      safeLogoHeight,
    );
    const sourceSize = getTextureSourceSize(this, MAIN_MENU_LOGO_ASSET.key);
    if (!sourceSize.width || !sourceSize.height) {
      return;
    }

    const logoScale = Math.min(maxLogoWidth / sourceSize.width, maxLogoHeight / sourceSize.height);
    const displayWidth = sourceSize.width * logoScale;
    const displayHeight = sourceSize.height * logoScale;
    setCrispLogoDisplaySize(this, logo, MAIN_MENU_LOGO_ASSET.key, displayWidth, displayHeight, 'main-menu');
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
    this.scale?.off('enterfullscreen', this.onFullscreenChanged, this);
    this.scale?.off('leavefullscreen', this.onFullscreenChanged, this);
    this.scale?.off('resize', this.layoutMainMenuScene, this);
  }

  createMenuButton(x, y, width, label, onPointerUp) {
    const shadow = this.add.rectangle(x + 2, y + 3, width, 54, 0x020617, 0.32).setOrigin(0.5);
    const backing = this.add
      .rectangle(x, y, width, 54, 0x93c5fd, 1)
      .setStrokeStyle(1, 0xbfdbfe, 0.7)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, BUTTON_STYLE).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const setHover = (isHovering) => {
      backing.setFillStyle(isHovering ? 0xbfdbfe : 0x93c5fd, 1);
      text.setBackgroundColor(isHovering ? '#bfdbfe' : '#93c5fd');
      shadow.setAlpha(isHovering ? 0.48 : 1);
    };

    [backing, text].forEach((target) => {
      target.on('pointerover', () => setHover(true));
      target.on('pointerout', () => setHover(false));
      target.on('pointerup', onPointerUp);
    });
  }
}
