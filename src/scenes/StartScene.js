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
import { preloadMenuAudioAssets } from '../audio/audioAssets.js';
import { playMenuMusic } from '../audio/menuMusic.js';
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
const STARTUP_SPLASH_READY_CLASS = 'is-ready';
const STARTUP_SPLASH_LOADING_COMPLETE_CLASS = 'is-loading-complete';
const STARTUP_SPLASH_HANDOFF_CLASS = 'is-handoff';
const STARTUP_SPLASH_TAPPED_CLASS = 'is-tapped';
const STARTUP_SPLASH_HIDDEN_CLASS = 'is-hidden';
const STARTUP_SPLASH_REMOVE_MS = 180;
const STARTUP_READY_TEXT_DELAY_MS = 520;
const STARTUP_VEIL_FADE_MS = 780;
const STARTUP_SIGNAL_SWEEP_MS = 250;
const STARTUP_VEIL_DEPTH = START_TITLE_DEPTH - 1;
const STARTUP_SIGNAL_DEPTH = START_TITLE_DEPTH - 0.5;
const STARTUP_VEIL_COLOR = 0x111827;
const STARTUP_SIGNAL_COLOR = 0x7dd3fc;
const STARTUP_SIGNAL_PEAK_ALPHA = 0.16;

export default class StartScene extends Phaser.Scene {
  constructor() {
    super('StartScene');
    this.isTransitioning = false;
    this.title = null;
    this.titleBaseScale = { x: 1, y: 1 };
    this.titleBaseX = 0;
    this.titleBaseY = 0;
    this.titleHovering = false;
    this.logoHitArea = null;
    this.logoIdleTween = null;
    this.startupIntroPending = false;
    this.startupTapAccepted = false;
    this.startupSplashTapHandler = null;
    this.startupRevealObjects = null;
  }

  preload() {
    preloadMenuBackgroundArt(this);
    preloadImageAsset(this, GRIDFALL_LOGO_ASSET, {
      onError: (asset) => console.warn(`Start logo failed to load: ${asset.path}`),
    });
    preloadSecondaryButtonAsset(this);
    preloadMenuAudioAssets(this);
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
      this.detachStartupSplashTapHandler();
      this.cleanupStartupRevealObjects();
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
    this.titleBaseX = this.title.x;
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
    if (this.startupIntroPending || this.isTransitioning || !this.title) {
      return;
    }

    this.titleHovering = isHovering;
    this.applyLogoFeedback(isHovering ? START_HOVER_SCALE : 1, isHovering ? 1 : START_IDLE_PULSE_ALPHA, isHovering ? 0xf8fbff : 0xffffff);

    if (!isHovering) {
      this.startLogoIdlePulse();
    }
  }

  setLogoPressState() {
    if (this.startupIntroPending || this.isTransitioning || !this.title) {
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

    this.startupIntroPending = true;
    this.stopLogoIdlePulse();
    this.title?.setAlpha?.(1);
    this.logoHitArea?.disableInteractive();

    try {
      const revealObjects = this.createStartupRevealObjects(width, height);
      this.waitForFirstRenderFrame(() => {
        this.markStartupReadyForTap(revealObjects);
      });
    } catch (error) {
      console.warn('Startup presentation setup failed; continuing to StartScene.', error);
      this.failStartupPresentationOpen();
    }
  }

  createStartupRevealObjects(width, height) {
    const centerY = height * 0.5;
    const veil = this.add.rectangle(width * 0.5, height * 0.5, width, height, STARTUP_VEIL_COLOR, 1)
      .setDepth(STARTUP_VEIL_DEPTH);
    const signalSweep = this.add.rectangle(width * 0.5, centerY, Math.max(120, width * 0.68), 3, STARTUP_SIGNAL_COLOR, 0)
      .setDepth(STARTUP_SIGNAL_DEPTH);

    this.startupRevealObjects = { veil, signalSweep, width, height };
    return this.startupRevealObjects;
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

  markStartupReadyForTap(revealObjects) {
    const splash = this.getStartupSplashElement();
    if (!splash) {
      this.failStartupPresentationOpen();
      return;
    }

    splash.classList.add(STARTUP_SPLASH_LOADING_COMPLETE_CLASS);

    this.time.delayedCall(STARTUP_READY_TEXT_DELAY_MS, () => {
      if (!this.startupIntroPending || this.startupTapAccepted) {
        return;
      }

      splash.classList.add(STARTUP_SPLASH_READY_CLASS);
      this.startupSplashTapHandler = (event) => {
        event?.preventDefault?.();
        this.acceptStartupTap(revealObjects);
      };
      splash.addEventListener('pointerup', this.startupSplashTapHandler, { once: false });
    });
  }

  acceptStartupTap(revealObjects) {
    if (!this.startupIntroPending || this.startupTapAccepted || this.isTransitioning) {
      return;
    }

    this.startupTapAccepted = true;
    this.startupIntroPending = false;
    this.game.registry.set(STARTUP_PRESENTATION_COMPLETE_KEY, true);
    this.detachStartupSplashTapHandler();
    this.logoHitArea?.disableInteractive();
    this.unlockAudioAndStartMenuMusic();
    this.beginStartupPresentationHandoff(revealObjects);
  }

  unlockAudioAndStartMenuMusic() {
    try {
      const context = this.sound?.context;
      if (context?.state === 'suspended') {
        context.resume?.();
      }
      playMenuMusic(this);
    } catch (error) {
      console.warn('Menu music unlock failed; continuing startup intro.', error);
    }
  }

  beginStartupPresentationHandoff(revealObjects) {
    const splash = this.getStartupSplashElement();

    if (splash) {
      splash.classList.add(STARTUP_SPLASH_TAPPED_CLASS, STARTUP_SPLASH_HANDOFF_CLASS);
    }

    this.alignTitleToStartupSplashLogo();
    this.waitForFirstRenderFrame(() => {
      this.removeStartupSplash();
      this.runStartupBroadcastReveal(revealObjects);
    });
  }

  alignTitleToStartupSplashLogo() {
    const splashLogo = globalThis.document?.querySelector?.('.startup-splash__logo');
    const canvas = this.game?.canvas;

    if (!splashLogo || !canvas || !this.title) {
      this.captureLogoBaseTransform();
      return false;
    }

    const logoRect = splashLogo.getBoundingClientRect?.();
    const canvasRect = canvas.getBoundingClientRect?.();

    if (!logoRect?.width || !logoRect?.height || !canvasRect?.width || !canvasRect?.height) {
      this.captureLogoBaseTransform();
      return false;
    }

    const scaleX = this.scale.width / canvasRect.width;
    const scaleY = this.scale.height / canvasRect.height;
    const centerX = (logoRect.left + logoRect.width * 0.5 - canvasRect.left) * scaleX;
    const centerY = (logoRect.top + logoRect.height * 0.5 - canvasRect.top) * scaleY;
    const displayWidth = logoRect.width * scaleX;
    const displayHeight = logoRect.height * scaleY;

    this.title.setPosition(centerX, centerY);
    if (this.title.type === 'Image' && this.title.setDisplaySize) {
      this.title.setDisplaySize(displayWidth, displayHeight);
    }
    this.title.setAlpha(1);
    this.captureLogoBaseTransform();
    this.positionLogoHitArea();
    return true;
  }

  runStartupBroadcastReveal(revealObjects) {
    if (!revealObjects?.veil || !revealObjects?.signalSweep) {
      this.failStartupPresentationOpen();
      return;
    }

    const { veil, signalSweep, height } = revealObjects;
    this.tweens.add({
      targets: signalSweep,
      alpha: { from: 0, to: STARTUP_SIGNAL_PEAK_ALPHA },
      scaleX: { from: 0.72, to: 1.05 },
      y: { from: height * 0.505, to: height * 0.49 },
      duration: STARTUP_SIGNAL_SWEEP_MS,
      ease: 'Sine.easeOut',
      yoyo: true,
      onComplete: () => {
        signalSweep?.destroy();
      },
    });

    this.tweens.add({
      targets: veil,
      alpha: 0,
      duration: STARTUP_VEIL_FADE_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        veil?.destroy();
        this.startupRevealObjects = null;
        this.playStartTransition();
      },
    });
  }

  getStartupSplashElement() {
    return globalThis.document?.getElementById?.(STARTUP_SPLASH_ID) ?? null;
  }

  detachStartupSplashTapHandler() {
    const splash = this.getStartupSplashElement();
    if (splash && this.startupSplashTapHandler) {
      splash.removeEventListener('pointerup', this.startupSplashTapHandler);
    }
    this.startupSplashTapHandler = null;
  }

  failStartupPresentationOpen() {
    this.startupIntroPending = false;
    this.startupTapAccepted = false;
    this.detachStartupSplashTapHandler();
    this.cleanupStartupRevealObjects();
    this.removeStartupSplash({ immediate: true });
    this.logoHitArea?.setInteractive?.({ useHandCursor: true });
  }

  cleanupStartupRevealObjects() {
    if (!this.startupRevealObjects) {
      return;
    }

    Object.values(this.startupRevealObjects).forEach((object) => {
      if (object?.destroy) {
        this.tweens?.killTweensOf?.(object);
        object.destroy();
      }
    });
    this.startupRevealObjects = null;
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
    if (this.startupIntroPending || this.isTransitioning || !this.title) {
      return;
    }

    const logoTapped = currentlyOver.some((gameObject) => gameObject === this.logoHitArea);

    if (!logoTapped) {
      this.playStartTransition();
    }
  }
  playStartTransition() {
    if (this.startupIntroPending || this.isTransitioning || !this.title) {
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
    this.title.setPosition(this.titleBaseX, this.titleBaseY);
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
