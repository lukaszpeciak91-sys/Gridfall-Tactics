import Phaser from 'phaser';
import { preloadImageAsset } from '../rendering/backgroundArt.js';
import { GRIDFALL_LOGO_ASSET, setMainMenuLogoDisplaySize, createLogoFallbackText } from '../ui/menuLogoLayout.js';
import {
  SCENE_TRANSITION_VISUALLY_READY_EVENT,
  clearSceneTransitionState,
  getSceneTransitionState,
  markSceneTransitionReady,
  setSceneTransitionState,
} from './sceneTransitionOverlay.js';

const BACKGROUND_COLOR = 0x020617;
const BACKGROUND_ALPHA = 0.96;
const DELAYED_SHOW_MS = 150;
const MIN_VISIBLE_MS = 260;
const FADE_IN_MS = 140;
const FADE_OUT_MS = 220;
const READY_STABLE_FRAME_MS = 32;
const RESUME_STABILIZE_MS = 96;
const FAILSAFE_ACTIVE_MS = 8000;
const ROOT_DEPTH = 10000;
const BLOCKER_DEPTH = ROOT_DEPTH + 10;

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
    this.ring = null;
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
    this.clearRegistryOnCleanup = true;
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
    this.backdrop = this.add.rectangle(width / 2, height / 2, width, height, BACKGROUND_COLOR, BACKGROUND_ALPHA);
    this.root.add(this.backdrop);

    const logoY = height * 0.39;
    if (this.textures.exists(GRIDFALL_LOGO_ASSET.key)) {
      this.logo = this.add.image(width / 2, logoY, GRIDFALL_LOGO_ASSET.key).setOrigin(0.5);
      setMainMenuLogoDisplaySize(this, this.logo, width, height);
      this.logo.setScale(this.logo.scaleX * 1.28, this.logo.scaleY * 1.28);
    } else {
      this.logo = createLogoFallbackText(this, width / 2, logoY, 'ui.start.title', '42px', width * 0.86);
    }
    this.root.add(this.logo);

    this.ring = this.createLoadingRing(width / 2, Math.min(height * 0.69, logoY + Math.max(118, height * 0.18)), Math.max(22, Math.min(34, width * 0.07)));
    this.root.add(this.ring);

    this.inputBlocker = this.add.zone(width / 2, height / 2, width, height).setDepth(BLOCKER_DEPTH).setInteractive();
    this.inputBlocker.setVisible(false);
  }

  createLoadingRing(x, y, radius) {
    const ring = this.add.graphics({ x, y });
    ring.lineStyle(2, 0x93c5fd, 0.2);
    ring.beginPath();
    ring.arc(0, 0, radius, 0, Math.PI * 2, false);
    ring.strokePath();
    ring.lineStyle(2.4, 0xf8fafc, 0.82);
    ring.beginPath();
    ring.arc(0, 0, radius, -Math.PI * 0.45, Math.PI * 0.38, false);
    ring.strokePath();
    ring.lineStyle(1.5, 0xfacc15, 0.48);
    ring.beginPath();
    ring.arc(0, 0, radius + 5, Math.PI * 0.66, Math.PI * 0.9, false);
    ring.strokePath();
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
      if (this.cleaningUp || this.readyRecorded) {
        this.cleanupAndStop();
        return;
      }
      this.showOverlay();
    });
  }

  showOverlay() {
    if (this.hasShown || this.cleaningUp || !this.root) return;
    this.hasShown = true;
    this.visibleSince = this.time.now;
    this.root.setVisible(true);
    this.inputBlocker?.setVisible(true);
    this.startRingTween();
    this.tweens.add({ targets: this.root, alpha: 1, duration: FADE_IN_MS, ease: 'Sine.easeOut' });
  }

  startRingTween() {
    if (this.ringTween || !this.ring) return;
    this.ringTween = this.tweens.add({ targets: this.ring, rotation: Math.PI * 2, duration: 1250, repeat: -1, ease: 'Linear' });
  }

  handleReadyEvent(event = {}) {
    if (this.cleaningUp || event?.transitionId !== this.transitionId || event?.destinationSceneKey !== this.destinationSceneKey) return;
    markSceneTransitionReady(this.game, { destinationSceneKey: this.destinationSceneKey, transitionId: this.transitionId, payload: event });
    this.readyRecorded = true;
    this.finishWhenStable('ready-event');
  }

  reconcileReadiness(reason) {
    if (this.cleaningUp) return false;
    const state = getSceneTransitionState(this.game, this.transitionId);
    if (state?.ready === true && state.destinationSceneKey === this.destinationSceneKey) {
      this.readyRecorded = true;
      this.finishWhenStable(reason);
      return true;
    }
    return false;
  }

  finishWhenStable() {
    if (this.completed || this.cleaningUp) return;
    this.completed = true;
    this.showTimer?.remove?.(false);
    this.showTimer = null;
    this.time.delayedCall(READY_STABLE_FRAME_MS, () => {
      if (this.cleaningUp) return;
      if (!this.hasShown) {
        this.cleanupAndStop();
        return;
      }
      const visibleFor = this.time.now - this.visibleSince;
      const waitMs = Math.max(0, MIN_VISIBLE_MS - visibleFor);
      this.time.delayedCall(waitMs, () => this.fadeOutAndStop());
    });
  }

  fadeOutAndStop() {
    if (this.cleaningUp) return;
    this.inputBlocker?.disableInteractive?.();
    this.tweens.add({
      targets: this.root,
      alpha: 0,
      duration: FADE_OUT_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => this.cleanupAndStop(),
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
    if (this.activeElapsedMs < FAILSAFE_ACTIVE_MS || this.cleaningUp) return;
    console.warn('Scene transition overlay failsafe cleanup: destination readiness was not observed.', {
      transitionId: this.transitionId,
      destinationSceneKey: this.destinationSceneKey,
      destinationActive: this.scene.isActive(this.destinationSceneKey),
      destinationVisible: this.scene.isVisible(this.destinationSceneKey),
    });
    setSceneTransitionState(this.game, this.transitionId, { failed: true, failsafeAt: Date.now() });
    this.fadeOutAndStop();
  }

  handleLifecycleSignal() {
    if (this.cleaningUp) return;
    this.lastActiveTick = this.time.now;
    this.reflow();
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
    this.reconcileReadiness('resize-fullscreen');
  }

  getCurrentSize() {
    const gameSize = this.scale?.gameSize;
    return { width: gameSize?.width ?? this.scale.width, height: gameSize?.height ?? this.scale.height };
  }

  reflow() {
    const { width, height } = this.getCurrentSize();
    this.backdrop?.setPosition(width / 2, height / 2)?.setSize(width, height);
    this.inputBlocker?.setPosition(width / 2, height / 2)?.setSize(width, height);
    const logoY = height * 0.39;
    this.logo?.setPosition(width / 2, logoY);
    if (this.logo?.type === 'Image') {
      setMainMenuLogoDisplaySize(this, this.logo, width, height);
      this.logo.setScale(this.logo.scaleX * 1.28, this.logo.scaleY * 1.28);
    }
    this.ring?.setPosition(width / 2, Math.min(height * 0.69, logoY + Math.max(118, height * 0.18)));
  }

  cleanupAndStop({ clearRegistry = true } = {}) {
    if (this.cleaningUp) return;
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
    this.tweens?.killTweensOf?.([this.root, this.ring].filter(Boolean));
    this.inputBlocker?.destroy?.(); this.inputBlocker = null;
    this.root?.destroy?.(true); this.root = null;
    if (this.clearRegistryOnCleanup) clearSceneTransitionState(this.game, this.transitionId);
  }
}
