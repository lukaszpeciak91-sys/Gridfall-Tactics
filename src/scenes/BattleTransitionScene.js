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
const FADE_OUT_MS = 560;
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
    this.resizeHandler = null;
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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.launchBattleSceneBelow();
  }

  renderPresentation() {
    const { width, height } = this.scale;
    this.root = this.add.container(0, 0).setDepth(1000);
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
    this.readyHandler = () => this.finishTransition();
    battleScene?.events?.once?.(BATTLE_SCENE_VISUALLY_READY_EVENT, this.readyHandler);
    battleScene?.load?.once?.(Phaser.Loader.Events.LOAD_ERROR, () => this.finishTransition({ failed: true }));
    this.scene.launch(BATTLE_SCENE_KEY, this.payload);
    this.scene.bringToTop();
    this.failsafeTimer = this.time.delayedCall(FAILSAFE_REVEAL_MS, () => this.finishTransition({ failed: true }));
  }

  finishTransition() {
    if (this.finishing) return;
    this.finishing = true;
    stopMusic(this, { fadeMs: MENU_MUSIC_FADE_OUT_MS });
    const delay = Math.max(0, FRAME_SAFE_MIN_MS - (this.time.now - this.startedAt));
    this.time.delayedCall(delay, () => {
      this.inputBlocker?.disableInteractive?.();
      this.tweens.add({ targets: this.root, alpha: 0, duration: FADE_OUT_MS, ease: 'Sine.easeInOut', onComplete: () => this.scene.stop() });
    });
  }

  rebuildPresentation() {
    this.root?.destroy?.(true);
    this.inputBlocker?.destroy?.();
    this.renderPresentation();
    this.installInputBlocker();
  }

  cleanup() {
    const battleScene = this.scene.get(BATTLE_SCENE_KEY);
    if (this.readyHandler) battleScene?.events?.off?.(BATTLE_SCENE_VISUALLY_READY_EVENT, this.readyHandler);
    this.scale?.off?.('resize', this.resizeHandler);
    this.failsafeTimer?.remove?.(false);
    this.inputBlocker?.destroy?.();
    this.root?.destroy?.(true);
    this.tweens?.killAll?.();
    this.resetRuntimeState();
  }
}
