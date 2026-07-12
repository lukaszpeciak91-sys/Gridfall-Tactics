import Phaser from 'phaser';
import { resolveBattleTransitionIllustration } from '../data/battleTransitionIllustrations.js';
import { preloadCardIllustrationAsset, getLoadedCardIllustrationTextureKey } from '../rendering/cardIllustrationAssets.js';
import { stopMusic } from '../audio/audioPlayback.js';
import { calculateCardArtworkCoverPosition } from '../rendering/cardVisualLayout.js';
import { BATTLE_SCENE_KEY, BATTLE_SCENE_VISUALLY_READY_EVENT, normalizeBattlePayload } from './battleEntryRouter.js';

const BACKGROUND_COLOR = '#020617';
const MOTION_ZOOM_TO = 1.08;
const MOTION_DURATION_MS = 11000;
const DRIFT_X = 16;
const DRIFT_Y = -30;
const VEIL_ALPHA = 0.34;
const FOG_ALPHA = 0.12;
const EXIT_COLLAPSE_MS = 210;
const EXIT_HOLD_MS = 60;
const EXIT_ACQUIRE_MS = 260;
const EXIT_BAND_HEIGHT_RATIO = 0.11;
const EXIT_BAND_MIN_HEIGHT = 36;
const EXIT_BAND_MAX_HEIGHT = 96;
const EXIT_SCANLINE_ALPHA = 0.18;
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
    this.exitMask = null;
    this.signalBand = null;
    this.scanline = null;
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
    this.lifecycleHandler = (event = {}) => this.handleLifecycleSignal(event);
    this.phaserPauseHandler = () => this.handleLifecycleSignal({ reason: 'phaser-pause' });
    this.phaserResumeHandler = () => this.handleLifecycleSignal({ reason: 'phaser-resume' });
    this.game?.events?.on?.('session-lifecycle:signal', this.lifecycleHandler);
    this.game?.events?.on?.(Phaser.Core.Events.PAUSE, this.phaserPauseHandler);
    this.game?.events?.on?.(Phaser.Core.Events.RESUME, this.phaserResumeHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.launchBattleSceneBelow();
  }

  renderPresentation() {
    const { width, height } = this.scale;
    this.root = this.add.container(0, 0).setDepth(1000);
    this.root.setSize(width, height);
    const textureKey = getLoadedCardIllustrationTextureKey(this, this.selection?.card, { factionId: this.selection?.factionId });
    if (textureKey && this.textures.exists(textureKey)) {
      this.root.add(this.createIllustration(textureKey));
    } else {
      this.root.add(this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 1));
    }
    this.root.add(this.createFogLayer(width, height));
    this.root.add(this.add.rectangle(width / 2, height / 2, width, height, 0x020617, VEIL_ALPHA));
  }

  createIllustration(textureKey) {
    const { width, height } = this.scale;
    const image = this.add.image(width / 2, height / 2, textureKey);
    const source = image.texture?.getSourceImage?.();
    const sourceWidth = source?.width ?? image.width;
    const sourceHeight = source?.height ?? image.height;
    const crop = calculateCardArtworkCoverPosition({ width, height }, sourceWidth, sourceHeight, { artPositionY: 0.5 });
    const startScale = crop.scale;
    const endScale = crop.scale * MOTION_ZOOM_TO;
    image.setOrigin((crop.cropX + crop.cropWidth / 2) / Math.max(1, sourceWidth), (crop.cropY + crop.cropHeight / 2) / Math.max(1, sourceHeight));
    image.setDisplaySize(sourceWidth * startScale, sourceHeight * startScale);
    image.setPosition(width / 2 - DRIFT_X / 2, height / 2 - DRIFT_Y / 2);
    this.tweens.add({ targets: image, displayWidth: sourceWidth * endScale, displayHeight: sourceHeight * endScale, x: width / 2 + DRIFT_X / 2, y: height / 2 + DRIFT_Y / 2, duration: MOTION_DURATION_MS, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
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
    this.tweens.add({ targets: fog, x: 28, duration: MOTION_DURATION_MS * 1.8, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
    return fog;
  }

  installInputBlocker() {
    const { width, height } = this.scale;
    this.inputBlocker = this.add.zone(width / 2, height / 2, width, height).setInteractive().setDepth(2000);
  }

  launchBattleSceneBelow() {
    const battleScene = this.scene.get(BATTLE_SCENE_KEY);
    this.readyHandler = () => {
      if (this.isCancelled) return;
      this.finishTransition();
    };
    this.loadErrorHandler = () => {
      if (this.isCancelled) return;
      this.finishTransition({ failed: true });
    };
    battleScene?.events?.once?.(BATTLE_SCENE_VISUALLY_READY_EVENT, this.readyHandler);
    battleScene?.load?.once?.(Phaser.Loader.Events.LOAD_ERROR, this.loadErrorHandler);
    this.scene.launch(BATTLE_SCENE_KEY, this.payload);
    this.scene.bringToTop();
    this.failsafeTimer = this.time.delayedCall(FAILSAFE_REVEAL_MS, () => this.finishTransition({ failed: true }));
  }

  finishTransition() {
    if (this.isCancelled || this.finishing) return;
    this.finishing = true;
    stopMusic(this, { fadeMs: MENU_MUSIC_FADE_OUT_MS });
    const delay = Math.max(0, FRAME_SAFE_MIN_MS - (this.time.now - this.startedAt));
    this.time.delayedCall(delay, () => this.playBroadcastExit());
  }

  getTransmissionBandHeight() {
    const { height } = this.scale;
    return Phaser.Math.Clamp(height * EXIT_BAND_HEIGHT_RATIO, EXIT_BAND_MIN_HEIGHT, Math.min(EXIT_BAND_MAX_HEIGHT, height));
  }

  createExitMask(height) {
    const { width } = this.scale;
    this.exitMask?.destroy?.();
    this.exitMask = this.make.graphics({ x: 0, y: 0, add: false });
    this.exitMask.fillStyle(0xffffff, 1).fillRect(0, (height - height) / 2, width, height);
    this.root?.setMask?.(this.exitMask.createGeometryMask());
  }

  updateExitMask(maskHeight) {
    if (!this.exitMask || !this.root) return;
    const { width, height } = this.scale;
    const y = (height - maskHeight) / 2;
    this.exitMask.clear().fillStyle(0xffffff, 1).fillRect(0, y, width, maskHeight);
  }

  createSignalBand(maskHeight) {
    const { width, height } = this.scale;
    this.signalBand?.destroy?.(true);
    const y = height / 2;
    this.signalBand = this.add.container(0, 0).setDepth(1500).setAlpha(0);
    const bandCore = this.add.rectangle(width / 2, y, width, Math.max(2, maskHeight * 0.16), 0xdbeafe, 0.16);
    const upperEdge = this.add.rectangle(width / 2, y - maskHeight / 2, width, 1, 0xe2e8f0, 0.18);
    const lowerEdge = this.add.rectangle(width / 2, y + maskHeight / 2, width, 1, 0xe2e8f0, 0.16);
    this.scanline = this.add.rectangle(width / 2, y, width, 1, 0xf8fafc, EXIT_SCANLINE_ALPHA).setAlpha(0.4);
    this.signalBand.add([bandCore, upperEdge, lowerEdge, this.scanline]);
    this.tweens.add({ targets: this.scanline, alpha: 0.08, duration: 46, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
  }

  playBroadcastExit() {
    if (this.isCancelled || !this.root) return;
    this.inputBlocker?.disableInteractive?.();
    const { height } = this.scale;
    const bandHeight = this.getTransmissionBandHeight();
    const maskState = { height };
    this.createExitMask(height);
    this.createSignalBand(bandHeight);
    this.tweens.add({
      targets: maskState,
      height: bandHeight,
      duration: EXIT_COLLAPSE_MS,
      ease: 'Cubic.easeInOut',
      onUpdate: () => this.updateExitMask(maskState.height),
      onComplete: () => {
        this.updateExitMask(bandHeight);
        this.tweens.add({ targets: this.signalBand, alpha: 1, duration: EXIT_HOLD_MS / 2, ease: 'Sine.easeOut', yoyo: true, hold: EXIT_HOLD_MS / 2, onComplete: () => this.playArenaAcquisition(maskState, bandHeight) });
      },
    });
  }

  playArenaAcquisition(maskState, bandHeight) {
    maskState.height = bandHeight;
    this.tweens.add({
      targets: maskState,
      height: this.scale.height,
      duration: EXIT_ACQUIRE_MS,
      ease: 'Cubic.easeOut',
      onUpdate: () => this.updateExitMask(maskState.height),
    });
    this.tweens.add({
      targets: [this.root, this.signalBand].filter(Boolean),
      alpha: 0,
      duration: EXIT_ACQUIRE_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => this.scene.stop(),
    });
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
    }
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
    this.root?.clearMask?.(true);
    this.exitMask?.destroy?.();
    this.exitMask = null;
    this.signalBand?.destroy?.(true);
    this.signalBand = null;
    this.scanline = null;
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
    this.root?.clearMask?.(true);
    this.exitMask?.destroy?.();
    this.exitMask = null;
    this.signalBand?.destroy?.(true);
    this.signalBand = null;
    this.scanline = null;
    this.root?.destroy?.(true);
    this.inputBlocker?.destroy?.();
    this.renderPresentation();
    this.installInputBlocker();
  }

  cleanup() {
    this.detachBattleReadyListeners();
    this.scale?.off?.('resize', this.resizeHandler);
    if (this.lifecycleHandler) {
      this.game?.events?.off?.('session-lifecycle:signal', this.lifecycleHandler);
      this.game?.events?.off?.(Phaser.Core.Events.PAUSE, this.phaserPauseHandler);
      this.game?.events?.off?.(Phaser.Core.Events.RESUME, this.phaserResumeHandler);
    }
    this.failsafeTimer?.remove?.(false);
    this.inputBlocker?.destroy?.();
    this.root?.clearMask?.(true);
    this.exitMask?.destroy?.();
    this.signalBand?.destroy?.(true);
    this.root?.destroy?.(true);
    this.tweens?.killAll?.();
    this.resetRuntimeState();
  }
}
