import Phaser from 'phaser';
import { resolveBattleTransitionIllustration } from '../data/battleTransitionIllustrations.js';
import { preloadCardIllustrationAsset, getLoadedCardIllustrationTextureKey } from '../rendering/cardIllustrationAssets.js';
import { stopMusic } from '../audio/audioPlayback.js';
import { calculateCardArtworkCoverPosition } from '../rendering/cardVisualLayout.js';
import { calculateBattleTransitionArtworkLayout } from '../rendering/battleTransitionArtworkLayout.js';
import { BATTLE_SCENE_KEY, BATTLE_SCENE_VISUALLY_READY_EVENT, normalizeBattlePayload } from './battleEntryRouter.js';

const BACKGROUND_COLOR = '#020617';
const MOTION_DURATION_MS = 11000;
const VEIL_ALPHA = 0.34;
const EXIT_DIM_VEIL_ALPHA = 0.48;
const FOG_ALPHA = 0.08;
const READY_SETTLE_MS = 100;
const EXIT_DIM_MS = 150;
const EXIT_CROSSFADE_MS = 560;
const MENU_MUSIC_FADE_OUT_MS = 560;
const FRAME_SAFE_MIN_MS = 80;
const FAILSAFE_REVEAL_MS = 8000;
export default class BattleTransitionScene extends Phaser.Scene {
  constructor() {
    super('BattleTransitionScene');
    this.resetRuntimeState();
  }

  resetRuntimeState() {
    this.payload = {};
    this.selection = null;
    this.root = null;
    this.inputBlocker = null;
    this.readyHandler = null;
    this.failsafeTimer = null;
    this.startedAt = 0;
    this.finishing = false;
    this.isCancelled = false;
    this.hasReturnedToSource = false;
    this.returnPendingUntilActive = false;
    this.resizeHandler = null;
    this.lifecycleHandler = null;
    this.phaserPauseHandler = null;
    this.phaserResumeHandler = null;
    this.loadErrorHandler = null;
    this.transitionVeil = null;
    this.fogLayer = null;
  }

  init(data = {}) {
    this.resetRuntimeState();
    this.payload = normalizeBattlePayload(data);
    this.selection = resolveBattleTransitionIllustration(this.payload);
  }

  preload() {
    preloadCardIllustrationAsset(this, this.selection?.asset);
  }

  create() {
    this.startedAt = this.time.now;
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);
    this.renderPresentation();
    this.installInputBlocker();
    this.resizeHandler = () => this.rebuildPresentation();
    this.scale.on('resize', this.resizeHandler);
    this.scale.on('enterfullscreen', this.resizeHandler);
    this.scale.on('leavefullscreen', this.resizeHandler);
    this.lifecycleHandler = (event = {}) => this.handleLifecycleSignal(event);
    this.phaserPauseHandler = () => this.handleLifecycleSignal({ reason: 'phaser-pause' });
    this.phaserResumeHandler = () => this.handleLifecycleSignal({ reason: 'phaser-resume' });
    this.game?.events?.on?.('session-lifecycle:signal', this.lifecycleHandler);
    this.game?.events?.on?.(Phaser.Core.Events.PAUSE, this.phaserPauseHandler);
    this.game?.events?.on?.(Phaser.Core.Events.RESUME, this.phaserResumeHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.launchBattleSceneBelow();
  }

  getResolvedViewportDimensions() {
    const camera = this.cameras?.main;
    const scale = this.scale;
    const width = camera?.width || scale?.gameSize?.width || scale?.width || 1;
    const height = camera?.height || scale?.gameSize?.height || scale?.height || 1;
    return { width, height };
  }

  renderPresentation() {
    const { width, height } = this.getResolvedViewportDimensions();
    this.root = this.add.container(0, 0).setDepth(1000);
    this.root.setSize(width, height);
    const textureKey = getLoadedCardIllustrationTextureKey(this, this.selection?.card, { factionId: this.selection?.factionId });
    if (textureKey && this.textures.exists(textureKey)) {
      this.root.add(this.createIllustration(textureKey));
    } else {
      this.root.add(this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 1));
    }
    this.fogLayer = this.createFogLayer(width, height);
    this.root.add(this.fogLayer);
    this.transitionVeil = this.add.rectangle(width / 2, height / 2, width, height, 0x020617, VEIL_ALPHA);
    this.root.add(this.transitionVeil);
  }

  createIllustration(textureKey) {
    const { width, height } = this.getResolvedViewportDimensions();
    const image = this.add.image(width / 2, height / 2, textureKey);
    const source = image.texture?.getSourceImage?.();
    const sourceWidth = source?.width ?? image.width;
    const sourceHeight = source?.height ?? image.height;
    const crop = calculateCardArtworkCoverPosition({ width, height }, sourceWidth, sourceHeight, { artPositionY: 0.5 });
    const layout = calculateBattleTransitionArtworkLayout({
      viewportWidth: width,
      viewportHeight: height,
      sourceWidth,
      sourceHeight,
      coverScale: crop.scale,
      originX: (crop.cropX + crop.cropWidth / 2) / Math.max(1, sourceWidth),
      originY: (crop.cropY + crop.cropHeight / 2) / Math.max(1, sourceHeight),
    });
    image.setOrigin(layout.originX, layout.originY);
    image.setDisplaySize(layout.start.displayWidth, layout.start.displayHeight);
    image.setPosition(layout.start.x, layout.start.y);
    this.tweens.add({ targets: image, displayWidth: layout.end.displayWidth, displayHeight: layout.end.displayHeight, x: layout.end.x, y: layout.end.y, duration: MOTION_DURATION_MS, ease: 'Sine.easeInOut' });
    return image;
  }

  createFogLayer(width, height) {
    const fog = this.add.container(0, 0);
    const fogColor = 0xcbd5e1;
    fog.add([
      this.add.ellipse(width * 0.2, height * 0.32, width * 0.74, height * 0.12, fogColor, FOG_ALPHA * 0.58),
      this.add.ellipse(width * 0.72, height * 0.58, width * 0.86, height * 0.15, fogColor, FOG_ALPHA * 0.48),
      this.add.rectangle(width * 0.5, height * 0.74, width * 1.18, height * 0.18, fogColor, FOG_ALPHA * 0.3),
    ]);
    return fog;
  }

  installInputBlocker() {
    const { width, height } = this.getResolvedViewportDimensions();
    this.inputBlocker = this.add.zone(width / 2, height / 2, width, height).setInteractive().setDepth(2000);
  }

  launchBattleSceneBelow() {
    const battleScene = this.scene.get(BATTLE_SCENE_KEY);
    this.readyHandler = (event = {}) => {
      if (this.isCancelled || event?.battleTransitionLaunchId !== this.payload?.battleTransitionLaunchId) return;
      this.finishTransition();
    };
    this.loadErrorHandler = () => {
      if (this.isCancelled) return;
      this.finishTransition({ failed: true });
    };
    battleScene?.events?.on?.(BATTLE_SCENE_VISUALLY_READY_EVENT, this.readyHandler);
    battleScene?.load?.once?.(Phaser.Loader.Events.LOAD_ERROR, this.loadErrorHandler);
    this.scene.launch(BATTLE_SCENE_KEY, this.payload);
    this.scene.bringToTop();
    this.failsafeTimer = this.time.delayedCall(FAILSAFE_REVEAL_MS, () => this.finishTransition({ failed: true }));
  }

  finishTransition() {
    if (this.isCancelled || this.finishing) return;
    this.finishing = true;
    stopMusic(this, { fadeMs: MENU_MUSIC_FADE_OUT_MS });
    const frameSafeDelay = Math.max(0, FRAME_SAFE_MIN_MS - (this.time.now - this.startedAt));
    const delay = Math.max(READY_SETTLE_MS, frameSafeDelay);
    this.time.delayedCall(delay, () => this.dimIllustrationForCrossfade());
  }

  dimIllustrationForCrossfade() {
    if (this.isCancelled || !this.root) return;
    this.tweens.add({
      targets: this.transitionVeil,
      alpha: EXIT_DIM_VEIL_ALPHA,
      duration: EXIT_DIM_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => this.crossfadeToBattleScene(),
    });
  }

  crossfadeToBattleScene() {
    if (this.isCancelled || !this.root) return;
    this.tweens.add({
      targets: this.root,
      alpha: 0,
      duration: EXIT_CROSSFADE_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => this.completeTransitionToBattleScene(),
    });
  }

  completeTransitionToBattleScene() {
    if (this.isCancelled) return;
    const launchId = this.payload?.battleTransitionLaunchId ?? null;
    this.detachBattleReadyListeners();
    this.inputBlocker?.disableInteractive?.();
    this.inputBlocker?.destroy?.();
    this.inputBlocker = null;
    this.root?.destroy?.(true);
    this.root = null;
    const battleScene = this.scene.get(BATTLE_SCENE_KEY);
    battleScene?.beginOpeningBattlePresentation?.({ battleTransitionLaunchId: launchId });
    this.scene.stop();
  }

  handleLifecycleSignal(event = {}) {
    const isHidden = event?.documentHidden === true || (typeof document !== 'undefined' && document.hidden === true);
    const reason = typeof event?.reason === 'string' ? event.reason : null;
    const shouldCancel = isHidden || reason === 'phaser-pause' || reason === 'pagehide' || reason === 'visibilitychange';
    if (shouldCancel) {
      this.cancelTransition({ deferReturn: isHidden || reason === 'phaser-pause' || reason === 'pagehide' });
      return;
    }
    if (this.isCancelled && (reason === 'phaser-resume' || reason === 'pageshow' || reason === 'focus' || !isHidden)) {
      this.returnPendingUntilActive = false;
      this.returnToSourceWhenVisible();
      return;
    }
    if (!this.isCancelled) this.rebuildPresentation();
  }

  cancelTransition({ deferReturn = false } = {}) {
    if (this.isCancelled) {
      if (!deferReturn) this.returnToSourceWhenVisible();
      return;
    }
    this.isCancelled = true;
    this.returnPendingUntilActive = deferReturn;
    this.finishing = true;
    this.detachBattleReadyListeners();
    this.failsafeTimer?.remove?.(false);
    this.failsafeTimer = null;
    this.inputBlocker?.disableInteractive?.();
    this.inputBlocker?.destroy?.();
    this.inputBlocker = null;
    this.root?.destroy?.(true);
    this.root = null;
    this.tweens?.killAll?.();
    this.time?.removeAllEvents?.();
    this.stopLaunchedBattleScene();
    this.returnToSourceWhenVisible();
  }

  detachBattleReadyListeners() {
    const battleScene = this.scene.get(BATTLE_SCENE_KEY);
    if (this.readyHandler) battleScene?.events?.off?.(BATTLE_SCENE_VISUALLY_READY_EVENT, this.readyHandler);
    if (this.loadErrorHandler) battleScene?.load?.off?.(Phaser.Loader.Events.LOAD_ERROR, this.loadErrorHandler);
    this.readyHandler = null;
    this.loadErrorHandler = null;
  }

  stopLaunchedBattleScene() {
    const manager = this.scene;
    if (manager?.isActive?.(BATTLE_SCENE_KEY) || manager?.isPaused?.(BATTLE_SCENE_KEY) || manager?.isSleeping?.(BATTLE_SCENE_KEY) || manager?.isVisible?.(BATTLE_SCENE_KEY)) {
      manager.stop(BATTLE_SCENE_KEY);
      return;
    }
    const battleScene = manager?.get?.(BATTLE_SCENE_KEY);
    if (battleScene?.load?.isLoading?.()) manager.stop(BATTLE_SCENE_KEY);
  }

  returnToSourceWhenVisible() {
    if (this.hasReturnedToSource) return;
    if (typeof document !== 'undefined' && document.hidden === true) return;
    if (this.returnPendingUntilActive) return;
    this.hasReturnedToSource = true;
    const returnSceneKey = this.payload?.returnSceneKey || 'FactionSelectScene';
    this.scene.stop(BATTLE_SCENE_KEY);
    this.scene.start(returnSceneKey);
  }

  rebuildPresentation() {
    if (this.isCancelled) return;
    this.root?.destroy?.(true);
    this.inputBlocker?.destroy?.();
    this.renderPresentation();
    this.installInputBlocker();
  }

  cleanup() {
    this.detachBattleReadyListeners();
    this.scale?.off?.('resize', this.resizeHandler);
    this.scale?.off?.('enterfullscreen', this.resizeHandler);
    this.scale?.off?.('leavefullscreen', this.resizeHandler);
    if (this.lifecycleHandler) {
      this.game?.events?.off?.('session-lifecycle:signal', this.lifecycleHandler);
      this.game?.events?.off?.(Phaser.Core.Events.PAUSE, this.phaserPauseHandler);
      this.game?.events?.off?.(Phaser.Core.Events.RESUME, this.phaserResumeHandler);
    }
    this.failsafeTimer?.remove?.(false);
    this.inputBlocker?.destroy?.();
    this.root?.destroy?.(true);
    this.tweens?.killAll?.();
    this.resetRuntimeState();
  }
}
