import Phaser from 'phaser';
import { buildDebugIllustrationEntries, summarizeDebugIllustrationEntries } from './debugIllustrationPool.js';
import { preloadAllCardIllustrations, getLoadedCardIllustrationTextureKey } from '../rendering/cardIllustrationAssets.js';
import { calculateCardArtworkCoverPosition } from '../rendering/cardVisualLayout.js';

const BACKGROUND_COLOR = '#020617';
const BUTTON_COLOR = 0x1d4ed8;
const BUTTON_HOVER_COLOR = 0x2563eb;
const BUTTON_STROKE = 0x93c5fd;
const PANEL_COLOR = 0x020617;
const FOCAL_Y_STEP = 0.025;
const ZOOM_STEP = 0.02;
const DEFAULT_FOCAL_Y = 0.5;
const DEFAULT_ZOOM = 1;
const MOTION_ZOOM_TO = 1.08;
const MOTION_DURATION_MS = 11000;
const DRIFT_X = 16;
const DRIFT_Y = -30;
const VEIL_ALPHA = 0.34;
const FOG_ALPHA = 0.12;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default class BattleTransitionArtPreviewDebugScene extends Phaser.Scene {
  constructor() {
    super('BattleTransitionArtPreviewDebugScene');
    this.illustrationEntries = [];
    this.selectedIndex = 0;
    this.focalY01 = DEFAULT_FOCAL_Y;
    this.zoomMultiplier = DEFAULT_ZOOM;
    this.previewRoot = null;
    this.previewTweens = [];
    this.previewTimers = [];
    this.controls = [];
    this.onBackRequested = null;
    this.onResize = null;
    this.summary = { 'faction-card': 0, 'tutorial-card': 0, 'generated-unit': 0 };
  }

  preload() {
    preloadAllCardIllustrations(this);
  }

  create() {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);
    this.illustrationEntries = buildDebugIllustrationEntries();
    this.summary = summarizeDebugIllustrationEntries(this.illustrationEntries);
    this.onBackRequested = () => this.returnToModeSelect();
    this.onResize = () => this.rebuildForResize();

    this.createControls();
    this.renderPreview();
    this.updateLabels();

    this.input.keyboard?.on('keydown-LEFT', this.onPreviousKey, this);
    this.input.keyboard?.on('keydown-RIGHT', this.onNextKey, this);
    this.input.keyboard?.on('keydown-SPACE', this.onNextKey, this);
    this.input.keyboard?.on('keydown-ESC', this.onBackRequested);
    this.input.keyboard?.on('keydown-BACKSPACE', this.onBackRequested);
    this.scale.on('resize', this.onResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupScene());
  }

  createControls() {
    const { width, height } = this.scale;
    const topY = 30;
    const bottomY = height - 31;
    const smallButtonWidth = Math.min(86, (width - 28) / 4);
    const adjustButtonWidth = Math.min(96, (width - 36) / 5);

    this.controls.push(this.createButton(54, topY, 92, 42, 'Prev', () => this.shiftEntry(-1), { fontSize: '17px' }));
    this.controls.push(this.createButton(width - 54, topY, 92, 42, 'Next', () => this.shiftEntry(1), { fontSize: '17px' }));
    this.controls.push(this.createButton(width * 0.5, bottomY, smallButtonWidth, 40, 'Back', () => this.returnToModeSelect(), { fontSize: '15px', fillColor: 0x334155, hoverColor: 0x475569 }));
    this.controls.push(this.createButton(width * 0.5 - adjustButtonWidth * 2 - 8, bottomY, adjustButtonWidth, 40, 'Focal Y -', () => this.adjustFocalY(-1), { fontSize: '13px' }));
    this.controls.push(this.createButton(width * 0.5 - adjustButtonWidth - 4, bottomY, adjustButtonWidth, 40, 'Focal Y +', () => this.adjustFocalY(1), { fontSize: '13px' }));
    this.controls.push(this.createButton(width * 0.5 + adjustButtonWidth + 4, bottomY, adjustButtonWidth, 40, 'Zoom -', () => this.adjustZoom(-1), { fontSize: '13px' }));
    this.controls.push(this.createButton(width * 0.5 + adjustButtonWidth * 2 + 8, bottomY, adjustButtonWidth, 40, 'Zoom +', () => this.adjustZoom(1), { fontSize: '13px' }));
    this.controls.push(this.createButton(width * 0.5, bottomY - 48, smallButtonWidth, 36, 'Reset', () => this.resetAdjustments(), { fontSize: '14px' }));

    this.infoPanel = this.add.rectangle(width * 0.5, topY + 53, Math.min(width - 20, 660), 58, PANEL_COLOR, 0.58)
      .setStrokeStyle(1, 0x334155, 0.66)
      .setDepth(90);
    this.titleLabel = this.add.text(width * 0.5, topY + 38, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#f8fafc', align: 'center', wordWrap: { width: width - 132 },
    }).setOrigin(0.5).setDepth(91);
    this.metaLabel = this.add.text(width * 0.5, topY + 61, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#bfdbfe', align: 'center', wordWrap: { width: width - 32 },
    }).setOrigin(0.5).setDepth(91);
    this.adjustmentLabel = this.add.text(width * 0.5, height - 84, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#d9f99d', align: 'center', backgroundColor: 'rgba(2,6,23,0.48)', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(91);
  }

  createButton(x, y, width, height, label, onPress, {
    fontSize = '16px', fillColor = BUTTON_COLOR, hoverColor = BUTTON_HOVER_COLOR,
  } = {}) {
    const button = this.add.rectangle(x, y, width, height, fillColor, 0.94)
      .setStrokeStyle(2, BUTTON_STROKE, 0.95)
      .setInteractive({ useHandCursor: true })
      .setDepth(100);
    const text = this.add.text(x, y, label, {
      fontFamily: 'Arial, sans-serif', fontSize, color: '#eff6ff', fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5).setDepth(101);

    button.on('pointerover', () => button.setFillStyle(hoverColor, 1));
    button.on('pointerout', () => button.setFillStyle(fillColor, 0.94));
    button.on('pointerup', onPress);
    return { button, text };
  }

  onPreviousKey() {
    this.shiftEntry(-1);
  }

  onNextKey() {
    this.shiftEntry(1);
  }

  shiftEntry(delta) {
    if (!this.illustrationEntries.length) return;
    const total = this.illustrationEntries.length;
    this.selectedIndex = (this.selectedIndex + delta + total) % total;
    this.renderPreview();
    this.updateLabels();
  }

  adjustFocalY(direction) {
    this.focalY01 = clamp(this.focalY01 + FOCAL_Y_STEP * direction, 0, 1);
    this.renderPreview();
    this.updateLabels();
  }

  adjustZoom(direction) {
    this.zoomMultiplier = clamp(this.zoomMultiplier + ZOOM_STEP * direction, 0.9, 1.35);
    this.renderPreview();
    this.updateLabels();
  }

  resetAdjustments() {
    this.focalY01 = DEFAULT_FOCAL_Y;
    this.zoomMultiplier = DEFAULT_ZOOM;
    this.renderPreview();
    this.updateLabels();
  }

  renderPreview() {
    this.clearPreview();
    const entry = this.illustrationEntries[this.selectedIndex];
    const { width, height } = this.scale;
    this.previewRoot = this.add.container(0, 0).setDepth(1);

    if (!entry) {
      this.previewRoot.add(this.add.rectangle(width / 2, height / 2, width, height, 0x111827, 1));
      return;
    }

    const textureKey = getLoadedCardIllustrationTextureKey(this, entry.card, { factionId: entry.factionId, enableCardIllustration: true });
    if (textureKey && this.textures.exists(textureKey)) {
      this.previewRoot.add(this.createPreviewImage(textureKey));
    } else {
      this.previewRoot.add(this.createMissingArtFallback(entry));
    }

    this.previewRoot.add(this.createFogLayer(width, height));
    this.previewRoot.add(this.add.rectangle(width / 2, height / 2, width, height, 0x020617, VEIL_ALPHA));
  }

  createPreviewImage(textureKey) {
    const { width, height } = this.scale;
    const image = this.add.image(width / 2, height / 2, textureKey);
    const source = image.texture?.getSourceImage?.();
    const sourceWidth = source?.width ?? image.width;
    const sourceHeight = source?.height ?? image.height;
    const crop = calculateCardArtworkCoverPosition({ width, height }, sourceWidth, sourceHeight, { artPositionY: this.focalY01 });
    const startScale = crop.scale * this.zoomMultiplier;
    const endScale = crop.scale * this.zoomMultiplier * MOTION_ZOOM_TO;

    image.setOrigin(
      (crop.cropX + crop.cropWidth / 2) / Math.max(1, sourceWidth),
      (crop.cropY + crop.cropHeight / 2) / Math.max(1, sourceHeight),
    );
    image.setDisplaySize(sourceWidth * startScale, sourceHeight * startScale);
    image.setPosition(width / 2 - DRIFT_X / 2, height / 2 - DRIFT_Y / 2);

    this.previewTweens.push(this.tweens.add({
      targets: image,
      displayWidth: sourceWidth * endScale,
      displayHeight: sourceHeight * endScale,
      x: width / 2 + DRIFT_X / 2,
      y: height / 2 + DRIFT_Y / 2,
      duration: MOTION_DURATION_MS,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    }));

    return image;
  }

  createMissingArtFallback(entry) {
    const { width, height } = this.scale;
    const container = this.add.container(0, 0);
    const back = this.add.rectangle(width / 2, height / 2, width, height, 0x111827, 1);
    const glow = this.add.rectangle(width / 2, height / 2, width * 0.72, height * 0.62, 0x1e293b, 0.72)
      .setStrokeStyle(2, 0x38bdf8, 0.22);
    const text = this.add.text(width / 2, height / 2, `Missing illustration\n${entry.asset?.publicPath ?? entry.dedupeKey}`, {
      fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#fde68a', align: 'center', wordWrap: { width: width - 48 },
    }).setOrigin(0.5);
    container.add([back, glow, text]);
    return container;
  }

  createFogLayer(width, height) {
    const fog = this.add.container(0, 0);
    const fogColor = 0xcbd5e1;
    const bands = [
      this.add.ellipse(width * 0.2, height * 0.32, width * 0.74, height * 0.12, fogColor, FOG_ALPHA * 0.58),
      this.add.ellipse(width * 0.72, height * 0.58, width * 0.86, height * 0.15, fogColor, FOG_ALPHA * 0.48),
      this.add.rectangle(width * 0.5, height * 0.74, width * 1.18, height * 0.18, fogColor, FOG_ALPHA * 0.3),
    ];
    fog.add(bands);
    this.previewTweens.push(this.tweens.add({
      targets: fog,
      x: 28,
      duration: MOTION_DURATION_MS * 1.8,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    }));
    return fog;
  }

  updateLabels() {
    const entry = this.illustrationEntries[this.selectedIndex];
    const total = this.illustrationEntries.length;
    if (!entry) {
      this.titleLabel?.setText('No illustrations found');
      this.metaLabel?.setText('');
      this.adjustmentLabel?.setText('');
      return;
    }

    this.titleLabel?.setText(`${this.selectedIndex + 1}/${total} • ${entry.displayFaction} • ${entry.label}`);
    this.metaLabel?.setText(`${entry.sourceType} • faction: ${entry.factionId} • art: ${entry.artAssetId} • pool ${this.summary['faction-card']} faction / ${this.summary['tutorial-card']} tutorial / ${this.summary['generated-unit']} generated`);
    this.adjustmentLabel?.setText(`Focal Y ${this.focalY01.toFixed(3)} • Zoom ${this.zoomMultiplier.toFixed(2)}x • motion ${MOTION_ZOOM_TO.toFixed(2)}x / ${DRIFT_X}px, ${DRIFT_Y}px • veil ${VEIL_ALPHA.toFixed(2)} • fog ${FOG_ALPHA.toFixed(2)}`);
  }

  rebuildForResize() {
    this.destroyControls();
    this.createControls();
    this.renderPreview();
    this.updateLabels();
  }

  clearPreview() {
    this.previewTimers.forEach((timer) => timer?.remove?.(false));
    this.previewTimers = [];
    this.previewTweens.forEach((tween) => tween?.remove?.());
    this.previewTweens = [];
    this.previewRoot?.destroy(true);
    this.previewRoot = null;
  }

  destroyControls() {
    this.controls.forEach(({ button, text }) => {
      button?.destroy?.();
      text?.destroy?.();
    });
    this.controls = [];
    this.infoPanel?.destroy();
    this.titleLabel?.destroy();
    this.metaLabel?.destroy();
    this.adjustmentLabel?.destroy();
    this.infoPanel = null;
    this.titleLabel = null;
    this.metaLabel = null;
    this.adjustmentLabel = null;
  }

  returnToModeSelect() {
    this.cleanupScene();
    this.scene.start('ArtDebugModeSelectScene');
  }

  cleanupScene() {
    this.input.keyboard?.off('keydown-LEFT', this.onPreviousKey, this);
    this.input.keyboard?.off('keydown-RIGHT', this.onNextKey, this);
    this.input.keyboard?.off('keydown-SPACE', this.onNextKey, this);
    this.input.keyboard?.off('keydown-ESC', this.onBackRequested);
    this.input.keyboard?.off('keydown-BACKSPACE', this.onBackRequested);
    if (this.onResize) this.scale.off('resize', this.onResize);
    this.clearPreview();
    this.destroyControls();
    this.onBackRequested = null;
    this.onResize = null;
  }
}

export const BATTLE_TRANSITION_PREVIEW_DEBUG_DEFAULTS = Object.freeze({
  focalY: DEFAULT_FOCAL_Y,
  zoom: DEFAULT_ZOOM,
  motionZoomTo: MOTION_ZOOM_TO,
  driftX: DRIFT_X,
  driftY: DRIFT_Y,
  durationMs: MOTION_DURATION_MS,
  veilAlpha: VEIL_ALPHA,
  fogAlpha: FOG_ALPHA,
});
