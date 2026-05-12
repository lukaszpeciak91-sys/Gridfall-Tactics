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
  calculateMainMenuLogoDisplaySize,
  createLogoFallbackText,
  getMainMenuLogoPosition,
  getStartHeroLogoPosition,
  setStartHeroLogoDisplaySize,
} from '../ui/menuLogoLayout.js';

const START_TRANSITION_MS = 360;
const START_TITLE_DEPTH = 5;
const START_LOGO_GLOW_DEPTH = START_TITLE_DEPTH - 1;
const START_HOVER_SCALE = 1.035;
const START_IDLE_SCALE = 1.008;
const START_IDLE_FLOAT_PX = 4;

export default class StartScene extends Phaser.Scene {
  constructor() {
    super('StartScene');
    this.isTransitioning = false;
    this.title = null;
    this.titleGlow = null;
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
    this.startLogoIdleMotion();

    this.scale.on('resize', this.layoutStartScene, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layoutStartScene, this);
    });
  }

  createTitle(width, height) {
    const position = getStartHeroLogoPosition(width, height);

    if (this.textures.exists(GRIDFALL_LOGO_ASSET.key)) {
      this.titleGlow = this.add
        .image(position.x, position.y, GRIDFALL_LOGO_ASSET.key)
        .setOrigin(0.5)
        .setDepth(START_LOGO_GLOW_DEPTH)
        .setAlpha(0.16)
        .setTint(0x93c5fd)
        .setBlendMode(Phaser.BlendModes.ADD);

      const logo = this.add.image(position.x, position.y, GRIDFALL_LOGO_ASSET.key).setOrigin(0.5).setDepth(START_TITLE_DEPTH);
      this.scaleLogoToFit(logo, width, height);
      this.scaleLogoGlowToMatch();
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
    title.on('pointerdown', () => this.setLogoHoverState(true, 1.018));
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
    const multiplier = isHovering ? scaleMultiplier : START_IDLE_SCALE;
    const glowAlpha = isHovering ? 0.28 : 0.16;
    const logoAlpha = isHovering ? 1 : 0.96;

    this.tweens.add({
      targets: this.title,
      scaleX: this.titleBaseScale.x * multiplier,
      scaleY: this.titleBaseScale.y * multiplier,
      alpha: logoAlpha,
      duration: 120,
      ease: 'Sine.easeOut',
    });

    if (this.titleGlow) {
      this.tweens.add({
        targets: this.titleGlow,
        scaleX: this.titleBaseScale.x * multiplier * 1.04,
        scaleY: this.titleBaseScale.y * multiplier * 1.04,
        alpha: glowAlpha,
        duration: 120,
        ease: 'Sine.easeOut',
      });
    }
  }

  startLogoIdleMotion() {
    if (!this.title) {
      return;
    }

    this.title.setAlpha(0.96);
    this.tweens.add({
      targets: this.title,
      y: this.titleBaseY + START_IDLE_FLOAT_PX,
      scaleX: this.titleBaseScale.x * START_IDLE_SCALE,
      scaleY: this.titleBaseScale.y * START_IDLE_SCALE,
      alpha: 1,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    if (this.titleGlow) {
      this.tweens.add({
        targets: this.titleGlow,
        y: this.titleBaseY + START_IDLE_FLOAT_PX,
        scaleX: this.titleBaseScale.x * 1.05,
        scaleY: this.titleBaseScale.y * 1.05,
        alpha: 0.24,
        duration: 2600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
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
        this.scaleLogoGlowToMatch();
      } else if (this.title.setWordWrapWidth) {
        this.title.setWordWrapWidth(width * 0.9);
      }
      this.captureLogoBaseTransform();
    }
  }

  scaleLogoToFit(logo, width, height) {
    setStartHeroLogoDisplaySize(this, logo, width, height);
  }

  scaleLogoGlowToMatch() {
    if (!this.title || !this.titleGlow) {
      return;
    }

    this.titleGlow.setTexture(this.title.texture.key);
    this.titleGlow.setPosition(this.title.x, this.title.y);
    this.titleGlow.setScale(this.title.scaleX * 1.04, this.title.scaleY * 1.04);
  }

  playStartTransition() {
    if (this.isTransitioning || !this.title) {
      return;
    }

    this.isTransitioning = true;
    this.title.disableInteractive();
    this.tweens.killTweensOf(this.title);
    if (this.titleGlow) {
      this.tweens.killTweensOf(this.titleGlow);
    }

    const { width, height } = this.scale;
    const targetPosition = getMainMenuLogoPosition(width, height);
    const targetDisplaySize = this.title.type === 'Image' ? calculateMainMenuLogoDisplaySize(this, width, height) : null;
    const targetTitleScaleX = targetDisplaySize ? targetDisplaySize.width / this.title.width : this.titleBaseScale.x * 0.72;
    const targetTitleScaleY = targetDisplaySize ? targetDisplaySize.height / this.title.height : this.titleBaseScale.y * 0.72;

    this.tweens.add({
      targets: this.title,
      x: targetPosition.x,
      y: targetPosition.y,
      scaleX: targetTitleScaleX,
      scaleY: targetTitleScaleY,
      alpha: 1,
      duration: START_TRANSITION_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.scene.start('MainMenuScene', { revealFromStart: true });
      },
    });

    if (this.titleGlow) {
      this.tweens.add({
        targets: this.titleGlow,
        x: targetPosition.x,
        y: targetPosition.y,
        scaleX: targetTitleScaleX * 1.04,
        scaleY: targetTitleScaleY * 1.04,
        alpha: 0.12,
        duration: START_TRANSITION_MS,
        ease: 'Sine.easeInOut',
      });
    }
  }
}
