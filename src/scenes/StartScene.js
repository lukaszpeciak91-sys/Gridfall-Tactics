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
import {
  GRIDFALL_LOGO_ASSET,
  createLogoFallbackText,
  getStartHeroLogoPosition,
  setStartHeroLogoDisplaySize,
} from '../ui/menuLogoLayout.js';

const START_TRANSITION_MS = 360;
const START_TITLE_DEPTH = 5;
const START_HOVER_SCALE = 1.035;
const START_PRESS_SCALE = 0.985;

export default class StartScene extends Phaser.Scene {
  constructor() {
    super('StartScene');
    this.isTransitioning = false;
    this.title = null;
    this.titleBaseScale = { x: 1, y: 1 };
    this.titleBaseY = 0;
    this.titleHovering = false;
  }

  preload() {
    preloadMenuBackgroundArt(this);
    preloadImageAsset(this, GRIDFALL_LOGO_ASSET, {
      onError: (asset) => console.warn(`Start logo failed to load: ${asset.path}`),
    });
  }

  create() {
    const { width, height } = this.scale;
    this.isTransitioning = false;
    this.titleHovering = false;

    this.cameras.main.setBackgroundColor(MENU_BACKGROUND_FALLBACK_COLOR_HEX);
    createCoverBackground(this, {
      asset: getMenuBackgroundAsset(),
      fallbackColor: MENU_BACKGROUND_FALLBACK_COLOR,
      width,
      height,
    });
    createMenuArenaLightSweep(this, { width, height });

    this.title = this.createTitle(width, height);
    this.configureLogoActivation(this.title);

    this.scale.on('resize', this.layoutStartScene, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layoutStartScene, this);
    });
  }

  createTitle(width, height) {
    const position = getStartHeroLogoPosition(width, height);

    if (this.textures.exists(GRIDFALL_LOGO_ASSET.key)) {
      const logo = this.add.image(position.x, position.y, GRIDFALL_LOGO_ASSET.key).setOrigin(0.5).setDepth(START_TITLE_DEPTH);
      this.scaleLogoToFit(logo, width, height);
      return logo;
    }

    return createLogoFallbackText(this, position.x, position.y, 'ui.start.title', '48px', width * 0.9)
      .setDepth(START_TITLE_DEPTH)
      .setShadow(0, 0, '#93c5fd', 14, true, true);
  }

  configureLogoActivation(title) {
    this.captureLogoBaseTransform();
    title.setInteractive({ useHandCursor: true });
    title.on('pointerover', () => this.setLogoHoverState(true));
    title.on('pointerout', () => this.setLogoHoverState(false));
    title.on('pointerdown', () => this.setLogoHoverState(true, START_PRESS_SCALE));
    title.on('pointerup', () => this.playStartTransition());
  }

  captureLogoBaseTransform() {
    if (!this.title) {
      return;
    }

    this.titleBaseScale = { x: this.title.scaleX, y: this.title.scaleY };
    this.titleBaseY = this.title.y;
  }

  setLogoHoverState(isHovering, scaleMultiplier = START_HOVER_SCALE) {
    if (this.isTransitioning || !this.title) {
      return;
    }

    this.titleHovering = isHovering;
    const multiplier = isHovering ? scaleMultiplier : 1;

    this.tweens.add({
      targets: this.title,
      scaleX: this.titleBaseScale.x * multiplier,
      scaleY: this.titleBaseScale.y * multiplier,
      alpha: 1,
      duration: 120,
      ease: 'Sine.easeOut',
    });
  }

  layoutStartScene(gameSize) {
    if (this.isTransitioning) {
      return;
    }

    const width = gameSize?.width ?? this.scale.width;
    const height = gameSize?.height ?? this.scale.height;
    const position = getStartHeroLogoPosition(width, height);

    if (this.title) {
      this.title.setPosition(position.x, position.y);
      if (this.title.type === 'Image') {
        this.scaleLogoToFit(this.title, width, height);
      } else if (this.title.setWordWrapWidth) {
        this.title.setWordWrapWidth(width * 0.9);
      }
      this.captureLogoBaseTransform();
    }
  }

  scaleLogoToFit(logo, width, height) {
    setStartHeroLogoDisplaySize(this, logo, width, height);
  }

  playStartTransition() {
    if (this.isTransitioning || !this.title) {
      return;
    }

    this.isTransitioning = true;
    this.title.disableInteractive();
    this.tweens.killTweensOf(this.title);
    this.title.setAlpha(1);
    this.title.setPosition(this.scale.width / 2, this.titleBaseY);
    this.title.setScale(this.titleBaseScale.x, this.titleBaseScale.y);

    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('MainMenuScene', { revealFromStart: true });
    });
    this.cameras.main.fadeOut(START_TRANSITION_MS, 2, 6, 23);
  }
}
