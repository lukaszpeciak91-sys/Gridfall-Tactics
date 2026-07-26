import Phaser from 'phaser';
import { preloadImageAsset } from '../rendering/backgroundArt.js';
import {
  GRIDFALL_LOGO_ASSET,
  STARTUP_LOADING_VISUAL_LAYOUT,
  getStartHeroLogoPosition,
  setStartHeroLogoDisplaySize,
  createLogoFallbackText,
} from '../ui/menuLogoLayout.js';
import {
  SCENE_TRANSITION_VISUALLY_READY_EVENT,
  clearSceneTransitionState,
  getSceneTransitionState,
  markSceneTransitionReady,
  setSceneTransitionState,
  reconcileSceneTransitionOverlayOrdering,
} from './sceneTransitionOverlay.js';

const BACKGROUND_TOP_COLOR = 0x111827;
const BACKGROUND_BOTTOM_COLOR = 0x0b1220;
const BACKGROUND_RADIAL_COLOR = 0x2563eb;
const BACKGROUND_RADIAL_ALPHA = 0.14;
const BACKGROUND_RADIAL_LAYER_COUNT = 32;
const BACKGROUND_RADIAL_WIDTH_RATIO = 1.36;
const BACKGROUND_RADIAL_HEIGHT_RATIO = 0.68;
const DELAYED_SHOW_MS = 120;
const FADE_IN_MS = 0;
const FADE_OUT_MS = 220;
const READY_STABLE_FRAME_MS = 32;
const RESUME_STABILIZE_MS = 96;
const FAILSAFE_ACTIVE_MS = 8000;
const HARD_EMERGENCY_ACTIVE_MS = 60000;
const ROOT_DEPTH = 10000;
const BLOCKER_DEPTH = ROOT_DEPTH + 10;
const LOGO_GLOW_COLOR = 0x93c5fd;
const LOGO_GLOW_LAYER_COUNT = 28;
const LOGO_GLOW_TOTAL_ALPHA = 0.16;
export const SCENE_TRANSITION_LOGO_GLOW_WIDTH_RATIO = 1.28;
const LOGO_GLOW_HEIGHT_RATIO = 0.88;

export function calculateLoadingCompositionLayout({
  height,
  logoHeight,
  spinnerDiameter = STARTUP_LOADING_VISUAL_LAYOUT.ringDiameter,
  logoToSpinnerGap = STARTUP_LOADING_VISUAL_LAYOUT.logoToRingCenterGap,
} = {}) {
  const compositionCenterY = height * STARTUP_LOADING_VISUAL_LAYOUT.logoCenterYRatio;
  const spinnerRadius = spinnerDiameter / 2;
  const logoY = compositionCenterY - (logoToSpinnerGap + spinnerRadius) / 2;
  const spinnerY = logoY + logoHeight / 2 + logoToSpinnerGap;

  return { compositionCenterY, logoY, spinnerY };
}

export default class SceneTransitionOverlayScene extends Phaser.Scene {
  constructor() {
    super('SceneTransitionOverlayScene');
    this.resetRuntimeState();
  }

  resetRuntimeState() {
    this.transitionId = null;
    this.destinationSceneKey = null;
    this.sourceSceneKey = null;
    this.root = null;
    this.backdrop = null;
    this.logo = null;
    this.logoGlow = null;
    this.ring = null;
    this.outerRing = null;
    this.innerRing = null;
    this.inputBlocker = null;
    this.visibleSince = 0;
    this.hasShown = false;
    this.readyRecorded = false;
    this.cleaningUp = false;
    this.completed = false;
    this.activeElapsedMs = 0;
    this.lastActiveTick = 0;
    this.showTimer = null;
    this.failsafeTimer = null;
    this.resumeTimer = null;
    this.readyListener = null;
    this.lifecycleListener = null;
    this.phaserPauseListener = null;
    this.phaserResumeListener = null;
    this.resizeHandler = null;
    this.ringTween = null;
    this.innerRingTween = null;
    this.clearRegistryOnCleanup = true;
    this.cleanupReason = null;
    this.waitingFrameOrderListener = null;
    this.failsafeWarningEmitted = false;
    this.hardEmergencyTimeoutEmitted = false;
  }

  init(data = {}) {
    this.resetRuntimeState();
    this.transitionId = typeof data.transitionId === 'string' ? data.transitionId : null;
    this.destinationSceneKey = typeof data.destinationSceneKey === 'string' ? data.destinationSceneKey : null;
    this.sourceSceneKey = typeof data.sourceSceneKey === 'string' ? data.sourceSceneKey : null;
  }

  preload() {
    preloadImageAsset(this, GRIDFALL_LOGO_ASSET, {
      onError: (asset) => console.warn(`Scene transition logo failed to load: ${asset.path}`),
    });
  }

  create() {
    if (!this.transitionId || !this.destinationSceneKey) {
      this.cleanupAndStop({ clearRegistry: false });
      return;
    }

    this.lastActiveTick = this.time.now;
    reconcileSceneTransitionOverlayOrdering(this.scene, { transitionId: this.transitionId, destinationSceneKey: this.destinationSceneKey });
    this.createHiddenPresentation();
    this.installListeners();
    this.scheduleDelayedShow();
    this.scheduleFailsafeTick();
    this.reconcileReadiness('create');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  createHiddenPresentation() {
    const { width, height } = this.getCurrentSize();
    this.root = this.add.container(0, 0).setDepth(ROOT_DEPTH).setAlpha(0).setVisible(false);
    this.backdrop = this.add.graphics();
    this.drawBackdrop(width, height);
    this.root.add(this.backdrop);

    const logoPosition = getStartHeroLogoPosition(width, height);
    if (this.textures.exists(GRIDFALL_LOGO_ASSET.key)) {
      this.logo = this.add.image(logoPosition.x, logoPosition.y, GRIDFALL_LOGO_ASSET.key).setOrigin(0.5);
      setStartHeroLogoDisplaySize(this, this.logo, width, height);
    } else {
      this.logo = createLogoFallbackText(this, logoPosition.x, logoPosition.y, 'ui.start.title', '48px', width * 0.9);
    }
    const layout = this.getLoadingCompositionLayout(height);
    this.logo.setPosition(logoPosition.x, layout.logoY);
    this.logoGlow = this.createLogoGlow(logoPosition.x, layout.logoY);
    this.root.add([this.logoGlow, this.logo].filter(Boolean));

    this.ring = this.createLoadingRing(width / 2, layout.spinnerY);
    this.root.add(this.ring);

  }

  drawBackdrop(width, height) {
    if (!this.backdrop) return;

    this.backdrop.clear();
    this.backdrop.fillGradientStyle(
      BACKGROUND_TOP_COLOR,
      BACKGROUND_TOP_COLOR,
      BACKGROUND_BOTTOM_COLOR,
      BACKGROUND_BOTTOM_COLOR,
      1,
    );
    this.backdrop.fillRect(0, 0, width, height);

    const centerX = width * 0.5;
    const centerY = height * STARTUP_LOADING_VISUAL_LAYOUT.logoCenterYRatio;
    const maxWidth = Math.max(width * BACKGROUND_RADIAL_WIDTH_RATIO, height * 0.62);
    const maxHeight = height * BACKGROUND_RADIAL_HEIGHT_RATIO;
    const totalWeight = Array.from({ length: BACKGROUND_RADIAL_LAYER_COUNT }, (_, index) => (
      (1 - (index + 1) / BACKGROUND_RADIAL_LAYER_COUNT) ** 1.8
    )).reduce((sum, weight) => sum + weight, 0);
    for (let layer = BACKGROUND_RADIAL_LAYER_COUNT; layer >= 1; layer -= 1) {
      const layerRatio = layer / BACKGROUND_RADIAL_LAYER_COUNT;
      const alpha = BACKGROUND_RADIAL_ALPHA * ((1 - layerRatio) ** 1.8) / totalWeight;
      this.backdrop.fillStyle(BACKGROUND_RADIAL_COLOR, alpha);
      this.backdrop.fillEllipse(
        centerX,
        centerY,
        maxWidth * (0.2 + layerRatio * 0.8),
        maxHeight * (0.16 + layerRatio * 0.84),
      );
    }
  }

  getLoadingCompositionLayout(height) {
    return calculateLoadingCompositionLayout({
      height,
      logoHeight: this.logo?.displayHeight ?? 0,
    });
  }

  createLogoGlow(x, y) {
    if (!this.logo?.displayWidth || !this.logo?.displayHeight) {
      return null;
    }

    const glow = this.add.graphics().setPosition(x, y);
    glow.setBlendMode?.('ADD');
    this.drawLogoGlow(glow);
    return glow;
  }

  drawLogoGlow(glow = this.logoGlow) {
    if (!glow || !this.logo?.displayWidth || !this.logo?.displayHeight) {
      return;
    }

    glow.clear();
    const maxWidth = this.logo.displayWidth * SCENE_TRANSITION_LOGO_GLOW_WIDTH_RATIO;
    const maxHeight = this.logo.displayHeight * LOGO_GLOW_HEIGHT_RATIO;
    const totalWeight = Array.from({ length: LOGO_GLOW_LAYER_COUNT }, (_, index) => (
      (1 - (index + 1) / LOGO_GLOW_LAYER_COUNT) ** 1.55
    )).reduce((sum, weight) => sum + weight, 0);
    for (let layer = LOGO_GLOW_LAYER_COUNT; layer >= 1; layer -= 1) {
      const layerRatio = layer / LOGO_GLOW_LAYER_COUNT;
      const alpha = LOGO_GLOW_TOTAL_ALPHA * ((1 - layerRatio) ** 1.55) / totalWeight;
      glow.fillStyle(LOGO_GLOW_COLOR, alpha);
      glow.fillEllipse(0, 0, maxWidth * (0.28 + layerRatio * 0.72), maxHeight * (0.24 + layerRatio * 0.76));
    }
  }

  createLoadingRing(x, y) {
    const ring = this.add.container(x, y);
    const radius = STARTUP_LOADING_VISUAL_LAYOUT.ringDiameter / 2;

    const baseRing = this.add.graphics();
    baseRing.lineStyle(STARTUP_LOADING_VISUAL_LAYOUT.ringBaseStroke, 0x7dd3fc, 0.16);
    baseRing.beginPath();
    baseRing.arc(0, 0, radius, 0, Math.PI * 2, false);
    baseRing.strokePath();

    this.outerRing = this.add.graphics();
    this.outerRing.lineStyle(STARTUP_LOADING_VISUAL_LAYOUT.ringAccentStroke, 0xf5c65e, 0.86);
    this.outerRing.beginPath();
    this.outerRing.arc(0, 0, radius + STARTUP_LOADING_VISUAL_LAYOUT.ringOuterInset, -Math.PI * 0.5, 0, false);
    this.outerRing.strokePath();
    this.outerRing.lineStyle(STARTUP_LOADING_VISUAL_LAYOUT.ringAccentStroke, 0xf5c65e, 0.2);
    this.outerRing.beginPath();
    this.outerRing.arc(0, 0, radius + STARTUP_LOADING_VISUAL_LAYOUT.ringOuterInset, 0, Math.PI * 0.5, false);
    this.outerRing.strokePath();

    this.innerRing = this.add.graphics();
    const innerRadius = radius - STARTUP_LOADING_VISUAL_LAYOUT.ringInnerInset;
    this.innerRing.lineStyle(STARTUP_LOADING_VISUAL_LAYOUT.ringAccentStroke, 0x7dd3fc, 0.72);
    this.innerRing.beginPath();
    this.innerRing.arc(0, 0, innerRadius, Math.PI * 0.5, Math.PI, false);
    this.innerRing.strokePath();
    this.innerRing.lineStyle(STARTUP_LOADING_VISUAL_LAYOUT.ringAccentStroke, 0x7dd3fc, 0.16);
    this.innerRing.beginPath();
    this.innerRing.arc(0, 0, innerRadius, Math.PI, Math.PI * 1.5, false);
    this.innerRing.strokePath();

    ring.add([baseRing, this.outerRing, this.innerRing]);
    return ring;
  }

  installListeners() {
    const destination = this.scene.get(this.destinationSceneKey);
    this.readyListener = (event = {}) => this.handleReadyEvent(event);
    destination?.events?.on?.(SCENE_TRANSITION_VISUALLY_READY_EVENT, this.readyListener);

    this.resizeHandler = () => this.handleResizeOrFullscreen();
    this.scale.on('resize', this.resizeHandler, this);
    this.scale.on('enterfullscreen', this.resizeHandler, this);
    this.scale.on('leavefullscreen', this.resizeHandler, this);

    this.lifecycleListener = (event = {}) => this.handleLifecycleSignal(event);
    this.phaserPauseListener = () => this.handleLifecycleSignal({ reason: 'phaser-pause' });
    this.phaserResumeListener = () => this.handleLifecycleSignal({ reason: 'phaser-resume' });
    this.game?.events?.on?.('session-lifecycle:signal', this.lifecycleListener);
    this.game?.events?.on?.(Phaser.Core.Events.PAUSE, this.phaserPauseListener);
    this.game?.events?.on?.(Phaser.Core.Events.RESUME, this.phaserResumeListener);
  }

  scheduleDelayedShow() {
    this.showTimer = this.time.delayedCall(DELAYED_SHOW_MS, () => {
      this.showTimer = null;
      if (this.cleaningUp || this.completed || !this.isCurrentTransitionState()) {
        return;
      }
      if (this.reconcileReadiness('delayed-show')) {
        return;
      }
      this.showOverlay();
    });
  }

  showOverlay() {
    if (this.hasShown || this.cleaningUp || !this.root) return;
    this.hasShown = true;
    this.visibleSince = this.time.now;
    reconcileSceneTransitionOverlayOrdering(this.scene, { transitionId: this.transitionId, destinationSceneKey: this.destinationSceneKey });
    this.root.setVisible(true);
    this.ensureOverlayTopWhileWaiting('showOverlay visible start');
    this.installWaitingFrameOrderGuard();
    this.createInputBlocker();
    this.startRingTween();
    this.tweens.add({ targets: this.root, alpha: 1, duration: FADE_IN_MS, ease: 'Sine.easeOut' });
  }

  createInputBlocker() {
    if (this.inputBlocker) return;
    const { width, height } = this.getCurrentSize();
    this.inputBlocker = this.add.zone(width / 2, height / 2, width, height).setDepth(BLOCKER_DEPTH).setInteractive();
  }

  destroyInputBlocker() {
    this.inputBlocker?.disableInteractive?.();
    this.inputBlocker?.destroy?.();
    this.inputBlocker = null;
  }

  startRingTween() {
    if (this.ringTween || !this.outerRing || !this.innerRing) return;
    this.ringTween = this.tweens.add({ targets: this.outerRing, rotation: Math.PI * 2, duration: STARTUP_LOADING_VISUAL_LAYOUT.outerRingDurationMs, repeat: -1, ease: 'Linear' });
    this.innerRingTween = this.tweens.add({ targets: this.innerRing, rotation: -Math.PI * 2, duration: STARTUP_LOADING_VISUAL_LAYOUT.innerRingDurationMs, repeat: -1, ease: 'Linear' });
  }

  handleReadyEvent(event = {}) {
    if (this.cleaningUp || event?.transitionId !== this.transitionId || event?.destinationSceneKey !== this.destinationSceneKey) return;
    this.cleanupReason = 'destination ready event';
    markSceneTransitionReady(this.game, { destinationSceneKey: this.destinationSceneKey, transitionId: this.transitionId, payload: event });
    this.readyRecorded = true;
    this.finishWhenStable('ready-event');
  }

  reconcileReadiness(reason) {
    if (this.cleaningUp) return false;
    const state = getSceneTransitionState(this.game, this.transitionId);
    if (state?.ready === true && state.destinationSceneKey === this.destinationSceneKey) {
      this.cleanupReason = `registry reconciliation:${reason}`;
      this.readyRecorded = true;
      this.finishWhenStable(reason);
      return true;
    }
    return false;
  }

  finishWhenStable(reason = 'ready') {
    if (this.completed || this.cleaningUp) return;
    this.completed = true;
    this.showTimer?.remove?.(false);
    this.showTimer = null;
    this.time.delayedCall(READY_STABLE_FRAME_MS, () => {
      if (this.cleaningUp) return;
      if (!this.hasShown) {
        this.cleanupAndStop({ reason: this.cleanupReason ?? reason });
        return;
      }
      this.fadeOutAndStop();
    });
  }

  fadeOutAndStop() {
    if (this.cleaningUp) return;
    this.removeWaitingFrameOrderGuard();
    this.destroyInputBlocker();
    this.tweens.add({
      targets: this.root,
      alpha: 0,
      duration: FADE_OUT_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => this.cleanupAndStop({ reason: this.cleanupReason ?? 'fade-out-complete' }),
    });
  }

  scheduleFailsafeTick() {
    this.failsafeTimer = this.time.addEvent({ delay: 250, loop: true, callback: () => this.updateFailsafeActiveTime() });
  }

  updateFailsafeActiveTime() {
    const now = this.time.now;
    const hidden = typeof document !== 'undefined' && document.hidden === true;
    if (!hidden) this.activeElapsedMs += Math.max(0, now - this.lastActiveTick);
    this.lastActiveTick = now;
    if (this.cleaningUp) return;

    if (this.activeElapsedMs >= FAILSAFE_ACTIVE_MS) {
      this.handleFailsafeThresholdReached();
    }

    if (this.activeElapsedMs >= HARD_EMERGENCY_ACTIVE_MS) {
      this.handleHardEmergencyTimeout();
    }
  }

  handleFailsafeThresholdReached() {
    const destinationActive = this.scene.isActive(this.destinationSceneKey);
    const destinationVisible = this.scene.isVisible(this.destinationSceneKey);
    const overlayActive = this.scene.isActive(this.scene.key);
    const overlayPending = !this.completed && !this.readyRecorded;
    const registryState = getSceneTransitionState(this.game, this.transitionId);
    const registryReady = registryState?.ready === true && registryState?.transitionId === this.transitionId && registryState?.destinationSceneKey === this.destinationSceneKey;

    if (registryReady && this.reconcileReadiness('failsafe-threshold')) return;

    const details = {
      destinationActive,
      destinationVisible,
      destinationRenderable: this.isDestinationRenderable(),
      overlayActive,
      overlayPending,
      cleanupStarted: this.cleaningUp,
      registryReady: false,
      registryState: registryState ? { transitionId: registryState.transitionId, destinationSceneKey: registryState.destinationSceneKey, ready: registryState.ready, failed: registryState.failed } : null,
      elapsedMs: this.activeElapsedMs,
    };

    if (!this.failsafeWarningEmitted && overlayActive && overlayPending && !this.cleaningUp) {
      this.failsafeWarningEmitted = true;
      console.warn('Scene transition failsafe threshold reached without readiness; overlay remains waiting.', {
        transitionId: this.transitionId,
        destinationSceneKey: this.destinationSceneKey,
        ...details,
      });
    }

    if (!this.hasShown) this.showOverlay();
    this.ensureOverlayTopWhileWaiting('failsafe threshold waiting');
  }

  handleHardEmergencyTimeout() {
    if (this.hardEmergencyTimeoutEmitted || this.cleaningUp || this.completed) return;
    this.hardEmergencyTimeoutEmitted = true;
    const registryState = getSceneTransitionState(this.game, this.transitionId);
    const details = {
      elapsedMs: this.activeElapsedMs,
      sceneState: {
        overlayActive: this.scene.isActive(this.scene.key),
        overlayVisible: this.scene.isVisible(this.scene.key),
        destinationActive: this.scene.isActive(this.destinationSceneKey),
        destinationVisible: this.scene.isVisible(this.destinationSceneKey),
      },
      registryState: registryState ? { transitionId: registryState.transitionId, destinationSceneKey: registryState.destinationSceneKey, ready: registryState.ready, failed: registryState.failed } : null,
    };
    console.error('hard emergency transition timeout', { transitionId: this.transitionId, destinationSceneKey: this.destinationSceneKey, ...details });
    setSceneTransitionState(this.game, this.transitionId, { failed: true, hardEmergencyAt: Date.now(), hardEmergencyElapsedMs: this.activeElapsedMs });
    if (!this.hasShown) this.showOverlay();
    this.ensureOverlayTopWhileWaiting('hard emergency timeout waiting');
  }

  handleLifecycleSignal() {
    if (this.cleaningUp) return;
    this.lastActiveTick = this.time.now;
    this.reflow();
    this.ensureOverlayTopWhileWaiting('lifecycle signal');
    this.resumeTimer?.remove?.(false);
    this.resumeTimer = this.time.delayedCall(RESUME_STABILIZE_MS, () => {
      this.resumeTimer = null;
      this.reflow();
      this.reconcileReadiness('lifecycle-resume');
    });
  }

  handleResizeOrFullscreen() {
    if (this.cleaningUp) return;
    this.reflow();
    this.ensureOverlayTopWhileWaiting('resize/fullscreen');
    this.reconcileReadiness('resize-fullscreen');
  }

  isCurrentTransitionState() {
    const state = getSceneTransitionState(this.game, this.transitionId);
    return state?.transitionId === this.transitionId && state?.destinationSceneKey === this.destinationSceneKey;
  }

  isDestinationRenderable() {
    if (!this.destinationSceneKey) return false;
    return this.scene.isActive(this.destinationSceneKey) || this.scene.isVisible(this.destinationSceneKey);
  }

  getCurrentSize() {
    const gameSize = this.scale?.gameSize;
    return { width: gameSize?.width ?? this.scale.width, height: gameSize?.height ?? this.scale.height };
  }

  reflow() {
    const { width, height } = this.getCurrentSize();
    this.drawBackdrop(width, height);
    this.inputBlocker?.setPosition(width / 2, height / 2)?.setSize(width, height);
    const logoPosition = getStartHeroLogoPosition(width, height);
    if (this.logo?.type === 'Image') {
      setStartHeroLogoDisplaySize(this, this.logo, width, height);
    }
    const layout = this.getLoadingCompositionLayout(height);
    this.logo?.setPosition(logoPosition.x, layout.logoY);
    this.logoGlow?.setPosition(logoPosition.x, layout.logoY);
    this.drawLogoGlow();
    this.ring?.setPosition(width / 2, layout.spinnerY);
  }

  installWaitingFrameOrderGuard() {
    if (this.waitingFrameOrderListener || !this.game?.events) return;
    const preRenderEvent = Phaser.Core?.Events?.PRE_RENDER ?? 'prerender';
    this.waitingFrameOrderListener = () => this.ensureOverlayTopWhileWaiting('waiting frame pre-render');
    this.game.events.on(preRenderEvent, this.waitingFrameOrderListener);
    this.ensureOverlayTopWhileWaiting('waiting frame guard installed');
  }

  removeWaitingFrameOrderGuard() {
    if (!this.waitingFrameOrderListener || !this.game?.events) {
      this.waitingFrameOrderListener = null;
      return;
    }
    const preRenderEvent = Phaser.Core?.Events?.PRE_RENDER ?? 'prerender';
    this.game.events.off(preRenderEvent, this.waitingFrameOrderListener);
    this.waitingFrameOrderListener = null;
  }

  ensureOverlayTopWhileWaiting(reason) {
    if (this.cleaningUp || this.completed || !this.hasShown || !this.root?.visible || !this.isCurrentTransitionState()) return false;
    return reconcileSceneTransitionOverlayOrdering(this.scene, { transitionId: this.transitionId, destinationSceneKey: this.destinationSceneKey, reason });
  }

  cleanupAndStop({ clearRegistry = true, reason = null } = {}) {
    if (this.cleaningUp) return;
    this.cleanupReason = reason ?? this.cleanupReason ?? (clearRegistry ? 'shutdown' : 'invalid-startup');
    this.cleaningUp = true;
    this.clearRegistryOnCleanup = clearRegistry;
    this.cleanup();
    this.scene.stop();
  }


  cleanup() {
    const state = getSceneTransitionState(this.game, this.transitionId);
    if (state?.readyListener && state?.destinationScene) {
      state.destinationScene.events?.off?.(SCENE_TRANSITION_VISUALLY_READY_EVENT, state.readyListener);
    }
    const destination = this.destinationSceneKey ? this.scene.get(this.destinationSceneKey) : null;
    if (this.readyListener) destination?.events?.off?.(SCENE_TRANSITION_VISUALLY_READY_EVENT, this.readyListener);
    this.readyListener = null;
    this.removeWaitingFrameOrderGuard();
    this.showTimer?.remove?.(false); this.showTimer = null;
    this.failsafeTimer?.remove?.(false); this.failsafeTimer = null;
    this.resumeTimer?.remove?.(false); this.resumeTimer = null;
    this.scale?.off?.('resize', this.resizeHandler, this);
    this.scale?.off?.('enterfullscreen', this.resizeHandler, this);
    this.scale?.off?.('leavefullscreen', this.resizeHandler, this);
    this.game?.events?.off?.('session-lifecycle:signal', this.lifecycleListener);
    this.game?.events?.off?.(Phaser.Core.Events.PAUSE, this.phaserPauseListener);
    this.game?.events?.off?.(Phaser.Core.Events.RESUME, this.phaserResumeListener);
    this.ringTween?.remove?.(); this.ringTween = null;
    this.innerRingTween?.remove?.(); this.innerRingTween = null;
    this.tweens?.killTweensOf?.([this.root, this.ring, this.outerRing, this.innerRing].filter(Boolean));
    this.destroyInputBlocker();
    this.root?.destroy?.(true); this.root = null;
    if (this.clearRegistryOnCleanup) clearSceneTransitionState(this.game, this.transitionId);
  }
}
