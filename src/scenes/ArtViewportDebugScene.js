import Phaser from 'phaser';
import { getFactionByKey, getFactionKeys } from '../data/factions/index.js';
import { getLoadedCardIllustrationTextureKey, preloadAllCardIllustrations } from '../rendering/cardIllustrationAssets.js';
import { calculateCardArtworkCoverPosition, createCardArtwork, getCardLayoutZones } from '../rendering/cardVisualLayout.js';
import { getFactionPresentationName } from '../data/presentation/factionPresentation.js';
import { getActiveLocale } from '../localization/localeService.js';
import { getCardDisplayName } from '../localization/cardDisplay.js';

const Y_STEP = 0.025;
const FALLBACK_X01 = 0.5;
const FALLBACK_SCALE = 1;

// Runtime contract:
// - The blue rectangle is fixed runtime viewport geometry (zones.art-based).
// - Authoring only adjusts which source-image region appears in that fixed viewport.
// - Exported runtime.artPositionY01 must map into runtime artPositionY and flow through
//   createCardArtwork(...) shared crop semantics (cover-scale + crop), with no custom
//   preview stretching or alternate geometry rules in this debug tool.

function clamp01(value) {
  return Phaser.Math.Clamp(value, 0, 1);
}

export default class ArtViewportDebugScene extends Phaser.Scene {
  constructor() {
    super('ArtViewportDebugScene');
    this.cardEntries = [];
    this.selectedIndex = 0;
    this.currentY01 = 0.5;
    this.defaultY01 = 0.5;
    this.previewNodes = [];
    this.pendingRecordsByCardId = new Map();
    this.statusClearEvent = null;
  }

  preload() {
    preloadAllCardIllustrations(this);
  }

  create() {
    this.onBackRequested = () => this.scene.start('MainMenuScene');
    this.cameras.main.setBackgroundColor('#0b1220');
    this.cardEntries = this.buildCardEntries();

    this.createLayout();
    this.syncSelectedCardState();
    this.renderPreviews();

    this.input.keyboard?.on('keydown-ESC', this.onBackRequested);
    this.input.keyboard?.on('keydown-BACKSPACE', this.onBackRequested);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', this.onBackRequested);
      this.input.keyboard?.off('keydown-BACKSPACE', this.onBackRequested);
      this.statusClearEvent?.remove(false);
      this.statusClearEvent = null;
    });
  }

  buildCardEntries() {
    const entries = [];
    getFactionKeys().forEach((factionKey) => {
      const faction = getFactionByKey(factionKey);
      (faction?.deck ?? []).forEach((card) => {
        entries.push({ card, factionKey });
      });
    });

    return entries.sort((a, b) => {
      const aId = String(a.card?.id ?? '');
      const bId = String(b.card?.id ?? '');
      if (aId !== bId) return aId.localeCompare(bId);
      return String(a.card?.name ?? '').localeCompare(String(b.card?.name ?? ''));
    });
  }

  createLayout() {
    const { width, height } = this.scale;
    const sidePad = 12;
    const selectorY = 28;
    this.createButton(sidePad + 44, selectorY, 88, 42, 'Prev', () => this.shiftCard(-1), { fontSize: '18px' });
    this.createButton(width - sidePad - 44, selectorY, 88, 42, 'Next', () => this.shiftCard(1), { fontSize: '18px' });

    this.cardLabel = this.add.text(width * 0.5, selectorY, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#e2e8f0', align: 'center',
      wordWrap: { width: width - 200 },
    }).setOrigin(0.5);
    this.sortNoticeLabel = this.add.text(width * 0.5, selectorY + 22, 'Debug list sorted globally by card.id (not faction deck order).', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      color: '#93c5fd',
      align: 'center',
      wordWrap: { width: width - 32 },
    }).setOrigin(0.5, 0.5);

    const controlsHeight = 220;
    const previewTop = 56;
    const previewBottom = height - controlsHeight;
    const previewAreaHeight = Math.max(220, previewBottom - previewTop);
    const previewBoundsWidth = width - 24;
    const previewBoundsHeight = previewAreaHeight - 8;
    const referenceCardWidth = 1000;
    const referenceCardHeight = 1500;
    const referenceZones = getCardLayoutZones(referenceCardWidth, referenceCardHeight);
    this.referenceArtZone = referenceZones.art;
    const paneCenterX = width * 0.5;
    const paneCenterY = previewTop + previewBoundsHeight / 2;
    this.previewPaneSource = { x: paneCenterX, y: paneCenterY, width: previewBoundsWidth, height: previewBoundsHeight };

    const controlsY = height - controlsHeight + 8;
    this.createButton(width * 0.5 - 108, controlsY + 26, 96, 42, 'Y -', () => this.adjustY(-1), { fontSize: '20px' });
    this.createButton(width * 0.5 + 108, controlsY + 26, 96, 42, 'Y +', () => this.adjustY(1), { fontSize: '20px' });
    this.valueLabel = this.add.text(width * 0.5, controlsY + 26, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '22px', color: '#bfdbfe',
    }).setOrigin(0.5);

    this.createButton(width * 0.5, controlsY + 78, 140, 40, 'Add', () => { this.addCurrentRecord(); }, { fontSize: '18px' });
    this.createButton(width * 0.5, controlsY + 122, 140, 40, 'Copy All', () => { void this.copyAllRecords(); }, { fontSize: '18px' });
    this.createButton(width * 0.5, controlsY + 166, 140, 40, 'Reset', () => this.resetY(), { fontSize: '18px' });

    this.statusLabel = this.add.text(width * 0.5, previewBottom - 8, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#bbf7d0', align: 'center', wordWrap: { width: width - 24 },
    }).setOrigin(0.5);
  }

  createButton(x, y, width, height, label, onPress, { fontSize = '22px' } = {}) {
    const button = this.add.rectangle(x, y, width, height, 0x1d4ed8, 0.94)
      .setStrokeStyle(2, 0x93c5fd, 0.95)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: 'Arial, sans-serif', fontSize, color: '#eff6ff', fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5);
    button.on('pointerup', onPress);
    return { button, text };
  }

  shiftCard(delta) {
    if (!this.cardEntries.length) return;
    const total = this.cardEntries.length;
    this.selectedIndex = (this.selectedIndex + delta + total) % total;
    this.syncSelectedCardState();
    this.renderPreviews();
  }

  adjustY(direction) {
    this.currentY01 = clamp01(this.currentY01 + (Y_STEP * direction));
    this.updateValueLabels();
    this.renderPreviews();
  }

  resetY() {
    this.currentY01 = this.defaultY01;
    this.updateValueLabels();
    this.renderPreviews();
  }

  buildRecordForCard(cardId) {
    return {
      cardId,
      shared: true,
      runtime: { artPositionY01: Number(this.currentY01.toFixed(3)) },
      future: { artPositionX01: FALLBACK_X01, artScale: FALLBACK_SCALE },
    };
  }

  createRuntimeOverrides(records) {
    return records.reduce((overrides, record) => {
      const cardId = String(record?.cardId ?? '');
      const runtimeY01 = record?.runtime?.artPositionY01;
      if (!cardId || !Number.isFinite(runtimeY01)) {
        return overrides;
      }

      overrides[cardId] = { artPositionY: Number(runtimeY01.toFixed(3)) };
      return overrides;
    }, {});
  }

  createExportPayload(records) {
    return {
      version: 1,
      tool: 'art-viewport-debug',
      records,
      runtimeOverrides: this.createRuntimeOverrides(records),
    };
  }

  copyWithFallback(text, successMessage) {
    const canUseClipboard = typeof navigator !== 'undefined' && navigator?.clipboard?.writeText;
    if (canUseClipboard) {
      return navigator.clipboard.writeText(text)
        .then(() => this.setStatus(successMessage))
        .catch((error) => {
          this.showFallbackExport(text, `Clipboard failed: ${error?.message ?? 'unknown error'}`);
        });
    }

    this.showFallbackExport(text, 'Clipboard API unavailable. Copy text from fallback.');
    return Promise.resolve();
  }

  showFallbackExport(text, message) {
    this.setStatus(message, true);
    this.fallbackExportText?.destroy();
    this.fallbackExportText = this.add.text(this.scale.width * 0.5, this.scale.height - 336, text, {
      fontFamily: 'monospace', fontSize: '12px', color: '#fde68a', align: 'left',
      backgroundColor: '#1f2937', padding: { x: 8, y: 6 }, wordWrap: { width: this.scale.width - 24 },
    }).setOrigin(0.5, 0).setDepth(1000);
  }

  setStatus(message, isError = false) {
    this.statusClearEvent?.remove(false);
    this.statusLabel?.setColor(isError ? '#fecaca' : '#bbf7d0');
    this.statusLabel?.setText(message);
    this.statusClearEvent = this.time.delayedCall(4500, () => {
      this.statusLabel?.setText('');
    });
  }

  addCurrentRecord() {
    if (!this.cardEntries.length) return Promise.resolve();
    const cardId = String(this.cardEntries[this.selectedIndex]?.card?.id ?? '');
    if (!cardId) {
      this.setStatus('Cannot add: selected card has no id.', true);
      return Promise.resolve();
    }

    const record = this.buildRecordForCard(cardId);
    this.pendingRecordsByCardId.set(cardId, record);
    this.setStatus(`Added record (${this.pendingRecordsByCardId.size})`);
    return Promise.resolve();
  }

  copyAllRecords() {
    const records = Array.from(this.pendingRecordsByCardId.values())
      .sort((a, b) => String(a.cardId).localeCompare(String(b.cardId)));
    const payload = this.createExportPayload(records);
    const text = JSON.stringify(payload, null, 2);
    return this.copyWithFallback(text, 'Copied all records');
  }

  syncSelectedCardState() {
    if (!this.cardEntries.length) {
      this.cardLabel.setText('No cards found');
      return;
    }

    const selected = this.cardEntries[this.selectedIndex];
    const card = selected.card;
    const faction = getFactionByKey(selected.factionKey);
    const deck = faction?.deck ?? [];
    const deckIndex = deck.findIndex((deckCard) => deckCard?.id === card?.id);
    const deckPositionLabel = deckIndex >= 0
      ? `${deckIndex + 1}/${deck.length}`
      : `?/${deck.length || '?'}`;
    const factionLabel = getFactionPresentationName(faction?.id, getActiveLocale(), faction?.name ?? selected.factionKey);
    const localizedDisplayName = getCardDisplayName(card, getActiveLocale()) ?? card?.name ?? 'Unknown';
    const cardNumberLabel = Number.isInteger(card?.cardNumber) ? `#${card.cardNumber}` : '#?';
    const fallbackY = Number.isFinite(card?.artPositionY01) ? card.artPositionY01 : 0.5;
    this.defaultY01 = clamp01(fallbackY);

    const existingRecord = this.pendingRecordsByCardId.get(String(card.id));
    const existingY = existingRecord?.runtime?.artPositionY01;
    this.currentY01 = Number.isFinite(existingY) ? clamp01(existingY) : this.defaultY01;

    this.cardLabel.setText(`${factionLabel} ${deckPositionLabel} • ${cardNumberLabel} • ${card.id} • ${localizedDisplayName}`);
    this.updateValueLabels();
  }

  updateValueLabels() {
    this.valueLabel?.setText(`Y: ${this.currentY01.toFixed(3)}`);
  }

  clearPreviews() {
    this.previewNodes.forEach((node) => node?.destroy());
    this.previewNodes = [];
  }

  drawSourceSelectionPane(card) {
    const pane = this.previewPaneSource;
    const textureKey = getLoadedCardIllustrationTextureKey(this, card);
    const source = textureKey ? this.textures?.get(textureKey)?.getSourceImage?.() : null;
    const sourceWidth = Math.max(1, source?.width ?? 512);
    const sourceHeight = Math.max(1, source?.height ?? 768);
    const workspaceScale = Math.min(pane.width / sourceWidth, pane.height / sourceHeight);
    const displayWidth = Math.max(1, sourceWidth * workspaceScale);
    const displayHeight = Math.max(1, sourceHeight * workspaceScale);
    const crop = calculateCardArtworkCoverPosition(this.referenceArtZone, sourceWidth, sourceHeight, {
      artPositionY: this.currentY01,
    });
    const cropWorldX = pane.x - displayWidth / 2 + (crop.cropX * workspaceScale);
    const cropWorldY = pane.y - displayHeight / 2 + (crop.cropY * workspaceScale);
    const cropWorldWidth = crop.cropWidth * workspaceScale;
    const cropWorldHeight = crop.cropHeight * workspaceScale;

    const workspaceBackdrop = this.add.rectangle(pane.x, pane.y, pane.width, pane.height, 0x0b1220, 0.94)
      .setStrokeStyle(1, 0x1e293b, 0.9);
    const art = createCardArtwork(this, {
      x: pane.x - displayWidth / 2,
      y: pane.y - displayHeight / 2,
      width: displayWidth,
      height: displayHeight,
      centerX: pane.x,
      centerY: pane.y,
    }, card, { enableCardIllustration: true });
    const sourceCropBorder = this.add.rectangle(
      cropWorldX + cropWorldWidth / 2,
      cropWorldY + cropWorldHeight / 2,
      cropWorldWidth,
      cropWorldHeight,
    )
      .setStrokeStyle(2, 0x93c5fd, 1)
      .setFillStyle(0x000000, 0);
    const label = this.add.text(pane.x - pane.width / 2 + 8, pane.y - pane.height / 2 + 6, 'Source selection', {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#bfdbfe',
    }).setOrigin(0, 0);

    return [workspaceBackdrop, art, sourceCropBorder, label];
  }

  renderPreviews() {
    this.clearPreviews();
    if (!this.cardEntries.length) return;

    const { card } = this.cardEntries[this.selectedIndex];
    this.previewNodes = this.drawSourceSelectionPane(card);
  }
}
