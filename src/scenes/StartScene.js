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

const START_TRANSITION_MS = 320;
const START_TITLE_TEXT = 'GRIDFALL TACTICS';
const START_LOGO_PUBLIC_PATH = 'assets/ui/gridfall-logo.webp';
const START_LOGO_ASSET = {
  key: 'ui.logo.gridfall',
  path: resolvePublicAssetPath(START_LOGO_PUBLIC_PATH),
};
const START_TITLE_DEPTH = 5;
const START_BUTTON_DEPTH = 10;
const START_LOGO_LAYOUT = {
  topRatio: 0.15,
  maxWidthRatio: 0.82,
  maxHeightRatio: 0.28,
  maxDisplayHeight: 220,
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
      .text(width / 2, height * 0.61, translateActive('ui.start.start', 'START'), {
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
      this.startButton.setPosition(width / 2, height * 0.61);
    }
  }

  scaleLogoToFit(logo, width, height) {
    const maxLogoWidth = width * START_LOGO_LAYOUT.maxWidthRatio;
    const maxLogoHeight = Math.min(
      height * START_LOGO_LAYOUT.maxHeightRatio,
      START_LOGO_LAYOUT.maxDisplayHeight,
    );
    if (!logo.width || !logo.height) {
      return;
    }

    const logoScale = Math.min(maxLogoWidth / logo.width, maxLogoHeight / logo.height);
    logo.setScale(logoScale);
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
