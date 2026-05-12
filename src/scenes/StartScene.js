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
import { translateActive } from '../localization/localeService.js';
import { getTextureSourceSize, setCrispLogoDisplaySize } from '../rendering/logoRendering.js';

const START_TRANSITION_MS = 320;
const START_TITLE_TEXT = 'GRIDFALL TACTICS';
const START_LOGO_PUBLIC_PATH = 'assets/ui/gridfall-logo.png';
const START_LOGO_ASSET = {
  key: 'ui.logo.gridfall',
  path: resolvePublicAssetPath(START_LOGO_PUBLIC_PATH),
};
const START_TITLE_DEPTH = 5;
const START_BUTTON_DEPTH = 10;
const START_BUTTON_Y_RATIO = 0.61;
const START_BUTTON_SAFE_TOP_OFFSET = 38;
const START_LOGO_LAYOUT = {
  topRatio: 0.148,
  maxWidthRatio: 0.89,
  maxHeightRatio: 0.38,
  maxDisplayHeight: 360,
  minButtonGap: 28,
};

export default class StartScene extends Phaser.Scene {
  constructor() {
    super('StartScene');
    this.isTransitioning = false;
    this.title = null;
    this.startButton = null;
  }

  preload() {
    preloadMenuBackgroundArt(this);
    preloadImageAsset(this, START_LOGO_ASSET, {
      onError: (asset) => console.warn(`Start logo failed to load: ${asset.path}`),
    });
  }

  create() {
    const { width, height } = this.scale;
    this.isTransitioning = false;

    this.cameras.main.setBackgroundColor(MENU_BACKGROUND_FALLBACK_COLOR_HEX);
    createCoverBackground(this, {
      asset: getMenuBackgroundAsset(),
      fallbackColor: MENU_BACKGROUND_FALLBACK_COLOR,
      width,
      height,
    });
    createMenuArenaLightSweep(this, { width, height });

    this.title = this.createTitle(width, height);

    this.startButton = this.add
      .text(width / 2, height * START_BUTTON_Y_RATIO, translateActive('ui.start.start', 'START'), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '36px',
        fontStyle: 'bold',
        color: '#111827',
        backgroundColor: '#93c5fd',
        padding: { x: 28, y: 14 },
      })
      .setOrigin(0.5)
      .setDepth(START_BUTTON_DEPTH)
      .setInteractive({ useHandCursor: true });

    this.startButton.on('pointerover', () => {
      if (!this.isTransitioning) {
        this.startButton.setBackgroundColor('#bfdbfe');
      }
    });

    this.startButton.on('pointerout', () => {
      if (!this.isTransitioning) {
        this.startButton.setBackgroundColor('#93c5fd');
      }
    });

    this.startButton.on('pointerup', () => {
      this.playStartTransition(this.title, this.startButton);
    });

    this.scale.on('resize', this.layoutStartScene, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layoutStartScene, this);
    });
  }

  createTitle(width, height) {
    if (this.textures.exists(START_LOGO_ASSET.key)) {
      const logo = this.add
        .image(width / 2, height * START_LOGO_LAYOUT.topRatio, START_LOGO_ASSET.key)
        .setOrigin(0.5, 0)
        .setDepth(START_TITLE_DEPTH);

      logo.disableInteractive();
      this.scaleLogoToFit(logo, width, height);
      return logo;
    }

    return this.add
      .text(width / 2, height * START_LOGO_LAYOUT.topRatio, translateActive('ui.start.title', START_TITLE_TEXT), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#f9fafb',
        align: 'center',
        wordWrap: { width: width * 0.9 },
      })
      .setOrigin(0.5, 0)
      .setDepth(START_TITLE_DEPTH)
      .disableInteractive();
  }

  layoutStartScene(gameSize) {
    if (this.isTransitioning) {
      return;
    }

    const width = gameSize?.width ?? this.scale.width;
    const height = gameSize?.height ?? this.scale.height;

    if (this.title) {
      this.title.setPosition(width / 2, height * START_LOGO_LAYOUT.topRatio);
      if (this.title.type === 'Image') {
        this.scaleLogoToFit(this.title, width, height);
      } else if (this.title.setWordWrapWidth) {
        this.title.setWordWrapWidth(width * 0.9);
      }
    }

    if (this.startButton) {
      this.startButton.setPosition(width / 2, height * START_BUTTON_Y_RATIO);
    }
  }

  scaleLogoToFit(logo, width, height) {
    const maxLogoWidth = width * START_LOGO_LAYOUT.maxWidthRatio;
    const logoTop = height * START_LOGO_LAYOUT.topRatio;
    const buttonSafeTop = height * START_BUTTON_Y_RATIO - START_BUTTON_SAFE_TOP_OFFSET;
    const safeLogoHeight = Math.max(0, buttonSafeTop - logoTop - START_LOGO_LAYOUT.minButtonGap);
    const maxLogoHeight = Math.min(
      height * START_LOGO_LAYOUT.maxHeightRatio,
      START_LOGO_LAYOUT.maxDisplayHeight,
      safeLogoHeight,
    );
    const sourceSize = getTextureSourceSize(this, START_LOGO_ASSET.key);
    if (!sourceSize.width || !sourceSize.height) {
      return;
    }

    const logoScale = Math.min(maxLogoWidth / sourceSize.width, maxLogoHeight / sourceSize.height);
    const displayWidth = sourceSize.width * logoScale;
    const displayHeight = sourceSize.height * logoScale;
    setCrispLogoDisplaySize(this, logo, START_LOGO_ASSET.key, displayWidth, displayHeight, 'start');
  }

  playStartTransition(title, startButton) {
    if (this.isTransitioning) {
      return;
    }

    this.isTransitioning = true;
    startButton.disableInteractive();

    this.tweens.add({
      targets: title,
      y: title.y - this.scale.height * 0.035,
      alpha: 0,
      duration: START_TRANSITION_MS,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: startButton,
      y: startButton.y + this.scale.height * 0.035,
      alpha: 0,
      duration: START_TRANSITION_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.scene.start('MainMenuScene');
      },
    });
  }
}
