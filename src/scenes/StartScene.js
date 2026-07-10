import Phaser from 'phaser';
import {
  MENU_BACKGROUND_FALLBACK_COLOR,
  MENU_BACKGROUND_FALLBACK_COLOR_HEX,
  createAnimatedMenuBackground,
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
import { preloadSecondaryButtonAsset } from '../ui/imageButton.js';
import { createBottomNavigationControls, requestPortraitOrientationLock, toggleSceneFullscreen } from '../ui/navigationControls.js';
import { preloadAudioAssets } from '../audio/audioAssets.js';
import { applyAudioSettings, loadSettings } from '../systems/settingsState.js';

const START_TRANSITION_MS = 720;
const START_TITLE_DEPTH = 5;
const START_HIT_AREA_DEPTH = START_TITLE_DEPTH + 1;
const START_HOVER_SCALE = 1.04;
const START_PRESS_SCALE = 0.965;
const START_HIT_MIN_WIDTH = 320;
const START_HIT_MIN_HEIGHT = 120;
const START_HIT_HEIGHT_MULTIPLIER = 1.45;
const START_IDLE_PULSE_ALPHA = 0.96;
const START_IDLE_PULSE_MS = 1800;
const START_FEEDBACK_MS = 120;
const START_MENU_REVEAL_LAG_MS = 90;
const STARTUP_PRESENTATION_COMPLETE_KEY = 'gridfall.startupPresentationComplete';
const STARTUP_SPLASH_ID = 'startup-splash';
const STARTUP_SPLASH_HANDOFF_CLASS = 'is-handoff';
const STARTUP_SPLASH_HIDDEN_CLASS = 'is-hidden';
const STARTUP_SPLASH_REMOVE_MS = 180;
const STARTUP_SIGNAL_SLIT_MS = 130;
const STARTUP_PANEL_OPEN_MS = 620;
const STARTUP_PANEL_DEPTH = START_TITLE_DEPTH - 1;
const STARTUP_SIGNAL_DEPTH = START_TITLE_DEPTH + 0.25;
const STARTUP_PANEL_COLOR = 0x111827;

export default class StartScene extends Phaser.Scene {
  constructor() {
    super('StartScene');
    this.isTransitioning = false;
    this.title = null;
    this.titleBaseScale = { x: 1, y: 1 };
    this.titleBaseY = 0;
    this.titleHovering = false;
    this.logoHitArea = null;
    this.logoIdleTween = null;
  }

  preload() {
    preloadMenuBackgroundArt(this);
    preloadImageAsset(this, GRIDFALL_LOGO_ASSET, {
      onError: (asset) => console.warn(`Start logo failed to load: ${asset.path}`),
    });
    preloadSecondaryButtonAsset(this);
    preloadAudioAssets(this);
  }

  create() {
    const { width, height } = this.scale;
    this.isTransitioning = false;
    this.titleHovering = false;
    applyAudioSettings(this, loadSettings());

    this.cameras.main.setBackgroundColor(MENU_BACKGROUND_FALLBACK_COLOR_HEX);
    this.menuBackground = createAnimatedMenuBackground(this, {
      fallbackColor: MENU_BACKGROUND_FALLBACK_COLOR,
      width,
      height,
    });

    this.title = this.createTitle(width, height);
    this.logoHitArea = this.add.zone(0, 0, START_HIT_MIN_WIDTH, START_HIT_MIN_HEIGHT).setOrigin(0.5).setDepth(START_HIT_AREA_DEPTH);
    this.configureLogoActivation();
    this.positionLogoHitArea();
    this.startLogoIdlePulse();
    this.drawNavigationControls();
    this.input.on('pointerup', this.onStartScenePointerUp, this);

    this.setupStartupPresentationReveal(width, height);

    this.scale.on('resize', this.layoutStartScene, this);
    this.scale.on('enterfullscreen', this.onFullscreenChanged, this);
    this.scale.on('leavefullscreen', this.onFullscreenChanged, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layoutStartScene, this);
      this.scale.off('enterfullscreen', this.onFullscreenChanged, this);
      this.scale.off('leavefullscreen', this.onFullscreenChanged, this);
      this.input.off('pointerup', this.onStartScenePointerUp, this);
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

  configureLogoActivation() {
    this.captureLogoBaseTransform();
    this.logoHitArea.setInteractive({ useHandCursor: true });
    this.logoHitArea.on('pointerover', () => this.setLogoHoverState(true));
    this.logoHitArea.on('pointerout', () => this.setLogoHoverState(false));
    this.logoHitArea.on('pointerdown', () => this.setLogoPressState());
    this.logoHitArea.on('pointerup', () => this.playStartTransition());
  }

  captureLogoBaseTransform() {
    if (!this.title) {
      return;
    }

    this.titleBaseScale = { x: this.title.scaleX, y: this.title.scaleY };
    this.titleBaseY = this.title.y;
  }

  positionLogoHitArea() {
    if (!this.title || !this.logoHitArea) {
      return;
    }

    const hitWidth = Math.max(this.title.displayWidth, START_HIT_MIN_WIDTH);
    const hitHeight = Math.max(this.title.displayHeight * START_HIT_HEIGHT_MULTIPLIER, START_HIT_MIN_HEIGHT);
    this.logoHitArea.setPosition(this.title.x, this.title.y);
    this.logoHitArea.setSize(hitWidth, hitHeight);
    this.logoHitArea.input.hitArea.setTo(0, 0, hitWidth, hitHeight);
  }

  startLogoIdlePulse() {
    if (!this.title || this.isTransitioning) {
      return;
    }

    this.logoIdleTween?.stop();
    this.logoIdleTween = this.tweens.add({
      targets: this.title,
      alpha: START_IDLE_PULSE_ALPHA,
      duration: START_IDLE_PULSE_MS,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  stopLogoIdlePulse() {
    this.logoIdleTween?.stop();
    this.logoIdleTween = null;
  }

  setLogoHoverState(isHovering) {
    if (this.isTransitioning || !this.title) {
      return;
    }

    this.titleHovering = isHovering;
    this.applyLogoFeedback(isHovering ? START_HOVER_SCALE : 1, isHovering ? 1 : START_IDLE_PULSE_ALPHA, isHovering ? 0xf8fbff : 0xffffff);

    if (!isHovering) {
      this.startLogoIdlePulse();
    }
  }

  setLogoPressState() {
    if (this.isTransitioning || !this.title) {
      return;
    }

    this.titleHovering = true;
    this.applyLogoFeedback(START_PRESS_SCALE, 0.96, 0xe8eef8);
  }

  applyLogoFeedback(scaleMultiplier, alpha, tint) {
    this.stopLogoIdlePulse();
    this.tweens.killTweensOf(this.title);

    if (this.title.setTint) {
      this.title.setTint(tint);
    }

    this.tweens.add({
      targets: this.title,
      scaleX: this.titleBaseScale.x * scaleMultiplier,
      scaleY: this.titleBaseScale.y * scaleMultiplier,
      alpha,
      duration: START_FEEDBACK_MS,
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
      this.positionLogoHitArea();
    }

    this.navigationControls?.forEach((control) => {
      if (control.destroy) {
        control.destroy();
        return;
      }

      control.button?.destroy?.();
      control.halo?.destroy?.();
      control.backing?.destroy?.();
      control.text?.destroy?.();
    });
    this.drawNavigationControls();
  }

  scaleLogoToFit(logo, width, height) {
    setStartHeroLogoDisplaySize(this, logo, width, height);
  }

  setupStartupPresentationReveal(width, height) {
    if (this.game.registry.get(STARTUP_PRESENTATION_COMPLETE_KEY)) {
      this.removeStartupSplash({ immediate: true });
      return;
    }

    this.game.registry.set(STARTUP_PRESENTATION_COMPLETE_KEY, true);

    try {
      const revealObjects = this.createStartupRevealObjects(width, height);
      this.waitForFirstRenderFrame(() => {
        this.beginStartupPresentationHandoff(revealObjects);
      });
    } catch (error) {
      console.warn('Startup presentation reveal failed; continuing to StartScene.', error);
      this.removeStartupSplash({ immediate: true });
    }
  }

  createStartupRevealObjects(width, height) {
    const centerY = height * 0.5;
    const panelOverlap = 2;
    const topPanel = this.add.rectangle(width * 0.5, centerY * 0.5, width, centerY + panelOverlap, STARTUP_PANEL_COLOR, 1)
      .setDepth(STARTUP_PANEL_DEPTH);
    const bottomPanel = this.add.rectangle(width * 0.5, centerY + (centerY * 0.5), width, centerY + panelOverlap, STARTUP_PANEL_COLOR, 1)
      .setDepth(STARTUP_PANEL_DEPTH);
    const signalSlit = this.add.rectangle(width * 0.5, centerY, Math.max(110, width * 0.58), 2, 0xf5f1e6, 0)
      .setDepth(STARTUP_SIGNAL_DEPTH);

    if (signalSlit.setBlendMode) {
      signalSlit.setBlendMode(Phaser.BlendModes.ADD);
    }

    return { topPanel, bottomPanel, signalSlit, width, height };
  }

  waitForFirstRenderFrame(callback) {
    let called = false;
    const runOnce = () => {
      if (called) {
        return;
      }
      called = true;
      callback();
    };

    const postRenderEvent = Phaser.Core?.Events?.POST_RENDER ?? 'postrender';
    this.game.events.once(postRenderEvent, runOnce);
    this.time.delayedCall(80, runOnce);
  }

  beginStartupPresentationHandoff({ topPanel, bottomPanel, signalSlit, height }) {
    const splash = this.getStartupSplashElement();

    if (splash) {
      splash.classList.add(STARTUP_SPLASH_HANDOFF_CLASS);
    }

    this.time.delayedCall(STARTUP_SPLASH_REMOVE_MS, () => {
      this.removeStartupSplash();
    });

    this.tweens.add({
      targets: signalSlit,
      alpha: { from: 0, to: 0.95 },
      scaleX: { from: 0.2, to: 1 },
      duration: Math.round(STARTUP_SIGNAL_SLIT_MS * 0.55),
      ease: 'Sine.easeOut',
      yoyo: true,
      hold: Math.round(STARTUP_SIGNAL_SLIT_MS * 0.15),
      onComplete: () => {
        signalSlit?.destroy();
      },
    });

    this.tweens.add({
      targets: topPanel,
      y: -height * 0.25,
      duration: STARTUP_PANEL_OPEN_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        topPanel?.destroy();
      },
    });

    this.tweens.add({
      targets: bottomPanel,
      y: height * 1.25,
      duration: STARTUP_PANEL_OPEN_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        bottomPanel?.destroy();
      },
    });
  }

  getStartupSplashElement() {
    return globalThis.document?.getElementById?.(STARTUP_SPLASH_ID) ?? null;
  }

  removeStartupSplash({ immediate = false } = {}) {
    const splash = this.getStartupSplashElement();
    if (!splash) {
      return;
    }

    splash.classList.add(STARTUP_SPLASH_HANDOFF_CLASS);

    if (immediate) {
      splash.remove();
      return;
    }

    splash.classList.add(STARTUP_SPLASH_HIDDEN_CLASS);
    globalThis.setTimeout?.(() => splash.remove(), STARTUP_SPLASH_REMOVE_MS);
  }


  drawNavigationControls() {
    const controls = createBottomNavigationControls(this, {
      onMute: () => {},
      onFullscreen: () => this.toggleFullscreen(),
    });
    this.navigationControls = [controls.mute, controls.fullscreen].filter(Boolean);
  }

  toggleFullscreen() {
    toggleSceneFullscreen(this);
  }

  onFullscreenChanged() {
    if (this.scale.isFullscreen) {
      requestPortraitOrientationLock();
    }

    if (this.scene.isActive('StartScene')) {
      this.scene.restart();
    }
  }

  revealMainMenuAfterSharedLogo() {
    const mainMenu = this.scene.get('MainMenuScene');

    if (mainMenu?.completeStartLogoTransition) {
      mainMenu.completeStartLogoTransition();
    }

    this.time.delayedCall(START_MENU_REVEAL_LAG_MS, () => {
      this.scene.stop('StartScene');
    });
  }


  onStartScenePointerUp(pointer, currentlyOver = []) {
    if (this.isTransitioning || !this.title) {
      return;
    }

    const logoTapped = currentlyOver.some((gameObject) => gameObject === this.logoHitArea);

    if (!logoTapped) {
      this.playStartTransition();
    }
  }
  playStartTransition() {
    if (this.isTransitioning || !this.title) {
      return;
    }

    this.isTransitioning = true;
    this.logoHitArea?.disableInteractive();
    this.stopLogoIdlePulse();
    this.tweens.killTweensOf(this.title);

    if (this.title.clearTint) {
      this.title.clearTint();
    }

    this.scene.launch('MainMenuScene', { revealFromStart: true, awaitSharedLogo: true });
    this.scene.bringToTop('StartScene');

    const mainMenuPosition = getMainMenuLogoPosition(this.scale.width, this.scale.height);
    const mainMenuLogoSize = calculateMainMenuLogoDisplaySize(this, this.scale.width, this.scale.height);
    const targetScaleMultiplier = mainMenuLogoSize && this.title.displayWidth
      ? mainMenuLogoSize.width / this.title.displayWidth
      : 0.58;

    this.title.setAlpha(1);
    this.title.setPosition(this.scale.width / 2, this.titleBaseY);
    this.title.setScale(this.titleBaseScale.x, this.titleBaseScale.y);

    this.tweens.add({
      targets: this.title,
      x: mainMenuPosition.x,
      y: mainMenuPosition.y,
      scaleX: this.titleBaseScale.x * targetScaleMultiplier,
      scaleY: this.titleBaseScale.y * targetScaleMultiplier,
      duration: START_TRANSITION_MS,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: this.title,
      alpha: 0.18,
      delay: Math.round(START_TRANSITION_MS * 0.72),
      duration: Math.round(START_TRANSITION_MS * 0.28),
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.revealMainMenuAfterSharedLogo();
      },
    });
  }
}
