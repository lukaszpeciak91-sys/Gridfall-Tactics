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
const SAVED_SELECTIONS_STORAGE_KEY = 'gridfall:battle-transition-art-preview-debug:saved-selections';
const FILTER_ALL = 'ALL';
const FILTER_SAVED = 'SAVED';

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
    this.savedSelections = new Map();
    this.activeFilter = FILTER_ALL;
    this.filteredEntries = [];
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
    this.loadSavedSelections();
    this.syncFilterEntries();
    this.onBackRequested = () => this.returnToModeSelect();
    this.onResize = () => this.rebuildForResize();

    this.createControls();
    this.renderPreview();
    this.updateLabels();

    this.input.keyboard?.on('keydown-LEFT', this.onPreviousKey, this);
    this.input.keyboard?.on('keydown-RIGHT', this.onNextKey, this);
    this.input.keyboard?.on('keydown-SPACE', this.onNextKey, this);
    this.input.keyboard?.on('keydown-S', this.onSaveKey, this);
    this.input.keyboard?.on('keydown-F', this.onFilterKey, this);
    this.input.keyboard?.on('keydown-E', this.onExportKey, this);
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
    this.saveButton = this.createButton(width - 56, bottomY - 48, 96, 36, 'SAVE', () => this.toggleSavedSelection(), { fontSize: '14px', fillColor: 0x166534, hoverColor: 0x15803d });
    this.controls.push(this.saveButton);
    this.filterButton = this.createButton(56, bottomY - 48, 96, 36, 'ALL', () => this.toggleFilter(), { fontSize: '14px', fillColor: 0x4c1d95, hoverColor: 0x6d28d9 });
    this.controls.push(this.filterButton);
    this.exportButton = this.createButton(width - 56, bottomY - 92, 96, 34, 'Export', () => this.exportSavedSelectionsToClipboard(), { fontSize: '13px', fillColor: 0x0f766e, hoverColor: 0x0d9488 });
    this.controls.push(this.exportButton);

    this.infoPanel = this.add.rectangle(width * 0.5, topY + 53, Math.min(width - 20, 660), 58, PANEL_COLOR, 0.58)
      .setStrokeStyle(1, 0x334155, 0.66)
      .setDepth(90);
    this.titleLabel = this.add.text(width * 0.5, topY + 38, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#f8fafc', align: 'center', wordWrap: { width: width - 132 },
    }).setOrigin(0.5).setDepth(91);
    this.metaLabel = this.add.text(width * 0.5, topY + 61, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#bfdbfe', align: 'center', wordWrap: { width: width - 32 },
    }).setOrigin(0.5).setDepth(91);
    this.savedLabel = this.add.text(width * 0.5, topY + 84, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#fef08a', align: 'center', backgroundColor: 'rgba(2,6,23,0.48)', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(91);
    this.exportStatusLabel = this.add.text(width - 112, bottomY - 118, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#99f6e4', align: 'center', wordWrap: { width: 208 },
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

  onSaveKey() {
    this.toggleSavedSelection();
  }

  onFilterKey() {
    this.toggleFilter();
  }

  onExportKey() {
    this.exportSavedSelectionsToClipboard();
  }

  shiftEntry(delta) {
    if (!this.filteredEntries.length) return;
    const total = this.filteredEntries.length;
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
    const entry = this.getCurrentEntry();
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
    const entry = this.getCurrentEntry();
    const total = this.filteredEntries.length;
    if (!entry) {
      this.titleLabel?.setText(this.activeFilter === FILTER_SAVED ? 'No saved illustrations yet' : 'No illustrations found');
      this.metaLabel?.setText(this.activeFilter === FILTER_SAVED ? 'Switch filter to ALL to review and save transition art candidates.' : '');
      this.savedLabel?.setText(this.createSavedCountsText());
      this.saveButton?.text?.setText('SAVE');
      this.filterButton?.text?.setText(this.activeFilter);
      this.adjustmentLabel?.setText('');
      return;
    }

    const isSaved = this.isEntrySaved(entry);
    this.titleLabel?.setText(`${this.selectedIndex + 1}/${total} • ${isSaved ? '★ SAVED' : '☆ unsaved'} • ${entry.displayFaction} • ${entry.label}`);
    this.metaLabel?.setText(`${entry.sourceType} • filter: ${this.activeFilter} • faction: ${entry.factionId} • art: ${entry.artAssetId} • pool ${this.summary['faction-card']} faction / ${this.summary['tutorial-card']} tutorial / ${this.summary['generated-unit']} generated`);
    this.savedLabel?.setText(this.createSavedCountsText(entry));
    this.saveButton?.text?.setText(isSaved ? 'UNSAVE' : 'SAVE');
    this.filterButton?.text?.setText(this.activeFilter);
    this.adjustmentLabel?.setText(`Focal Y ${this.focalY01.toFixed(3)} • Zoom ${this.zoomMultiplier.toFixed(2)}x • motion ${MOTION_ZOOM_TO.toFixed(2)}x / ${DRIFT_X}px, ${DRIFT_Y}px • veil ${VEIL_ALPHA.toFixed(2)} • fog ${FOG_ALPHA.toFixed(2)}`);
  }


  getCurrentEntry() {
    return this.filteredEntries[this.selectedIndex] ?? null;
  }

  syncFilterEntries() {
    this.filteredEntries = this.activeFilter === FILTER_SAVED
      ? this.illustrationEntries.filter((entry) => this.isEntrySaved(entry))
      : [...this.illustrationEntries];
    if (!this.filteredEntries.length) {
      this.selectedIndex = 0;
      return;
    }
    this.selectedIndex = clamp(this.selectedIndex, 0, this.filteredEntries.length - 1);
  }

  getEntryStorageKey(entry) {
    return entry ? `${entry.factionId}::${entry.artAssetId}` : '';
  }

  isEntrySaved(entry) {
    return this.savedSelections.has(this.getEntryStorageKey(entry));
  }

  createSavedRecord(entry) {
    return {
      factionId: entry.factionId,
      artAssetId: entry.artAssetId,
      cardId: entry.card?.id ?? null,
      label: entry.label,
      source: entry.sourceType,
    };
  }

  toggleSavedSelection() {
    const entry = this.getCurrentEntry();
    if (!entry) return;
    const key = this.getEntryStorageKey(entry);
    const removingFromSavedFilter = this.activeFilter === FILTER_SAVED && this.savedSelections.has(key);
    const nextSavedIndex = removingFromSavedFilter && this.selectedIndex >= this.filteredEntries.length - 1 ? 0 : this.selectedIndex;
    if (this.savedSelections.has(key)) {
      this.savedSelections.delete(key);
    } else {
      this.savedSelections.set(key, this.createSavedRecord(entry));
    }
    this.persistSavedSelections();
    this.syncFilterEntries();
    if (removingFromSavedFilter && this.filteredEntries.length) this.selectedIndex = nextSavedIndex;
    this.renderPreview();
    this.updateLabels();
  }

  toggleFilter() {
    this.activeFilter = this.activeFilter === FILTER_SAVED ? FILTER_ALL : FILTER_SAVED;
    this.selectedIndex = 0;
    this.syncFilterEntries();
    this.renderPreview();
    this.updateLabels();
  }

  createSavedCountsText(entry = null) {
    const factionId = entry?.factionId ?? this.getCurrentEntry()?.factionId ?? 'current faction';
    const factionCount = Array.from(this.savedSelections.values()).filter((record) => record.factionId === factionId).length;
    return `Saved ${factionId}: ${factionCount} • Total saved: ${this.savedSelections.size}`;
  }

  loadSavedSelections() {
    this.savedSelections = new Map();
    try {
      const raw = typeof window === 'undefined' ? null : window.localStorage?.getItem(SAVED_SELECTIONS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      (parsed?.saved ?? []).forEach((record) => {
        if (record?.factionId && record?.artAssetId) {
          this.savedSelections.set(`${record.factionId}::${record.artAssetId}`, {
            factionId: record.factionId,
            artAssetId: record.artAssetId,
            cardId: record.cardId ?? null,
            label: record.label ?? record.name ?? record.artAssetId,
            source: record.source ?? 'unknown',
          });
        }
      });
    } catch (error) {
      console.warn('Unable to load battle transition art debug selections', error);
    }
  }

  buildSavedSelectionsExport() {
    return {
      version: 1,
      tool: 'battle-transition-art-selection',
      saved: Array.from(this.savedSelections.values()).sort((a, b) => (
        a.factionId.localeCompare(b.factionId) || a.artAssetId.localeCompare(b.artAssetId)
      )),
    };
  }

  persistSavedSelections() {
    try {
      if (typeof window !== 'undefined') window.localStorage?.setItem(SAVED_SELECTIONS_STORAGE_KEY, JSON.stringify(this.buildSavedSelectionsExport()));
    } catch (error) {
      console.warn('Unable to persist battle transition art debug selections', error);
    }
  }

  async exportSavedSelectionsToClipboard() {
    const json = JSON.stringify(this.buildSavedSelectionsExport(), null, 2);
    try {
      await (typeof navigator === 'undefined' ? null : navigator.clipboard)?.writeText(json);
      this.exportStatusLabel?.setText(`Copied ${this.savedSelections.size} saved selections`);
    } catch (error) {
      this.exportStatusLabel?.setText('Clipboard unavailable; JSON logged to console');
      console.log(json);
    }
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
    this.savedLabel?.destroy();
    this.exportStatusLabel?.destroy();
    this.infoPanel = null;
    this.titleLabel = null;
    this.metaLabel = null;
    this.adjustmentLabel = null;
    this.savedLabel = null;
    this.exportStatusLabel = null;
    this.saveButton = null;
    this.filterButton = null;
    this.exportButton = null;
  }

  returnToModeSelect() {
    this.cleanupScene();
    this.scene.start('ArtDebugModeSelectScene');
  }

  cleanupScene() {
    this.input.keyboard?.off('keydown-LEFT', this.onPreviousKey, this);
    this.input.keyboard?.off('keydown-RIGHT', this.onNextKey, this);
    this.input.keyboard?.off('keydown-SPACE', this.onNextKey, this);
    this.input.keyboard?.off('keydown-S', this.onSaveKey, this);
    this.input.keyboard?.off('keydown-F', this.onFilterKey, this);
    this.input.keyboard?.off('keydown-E', this.onExportKey, this);
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
  savedSelectionsStorageKey: SAVED_SELECTIONS_STORAGE_KEY,
});
