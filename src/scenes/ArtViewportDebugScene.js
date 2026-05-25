import Phaser from 'phaser';
import { getFactionByKey, getFactionKeys } from '../data/factions/index.js';
import { preloadAllCardIllustrations } from '../rendering/cardIllustrationAssets.js';
import { createCardArtwork, getCardLayoutZones } from '../rendering/cardVisualLayout.js';
import { HAND_CARD_ASPECT_RATIO } from '../ui/handLayout.js';

const STEP_OPTIONS = [0.01, 0.025, 0.05];
const DEFAULT_STEP_INDEX = 1;
const FALLBACK_X01 = 0.5;
const FALLBACK_SCALE = 1;

function clamp01(value) {
  return Phaser.Math.Clamp(value, 0, 1);
}

export default class ArtViewportDebugScene extends Phaser.Scene {
  constructor() {
    super('ArtViewportDebugScene');
    this.cardEntries = [];
    this.selectedIndex = 0;
    this.stepIndex = DEFAULT_STEP_INDEX;
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
    const sidePad = 16;

    this.add.text(width * 0.5, 24, 'Art Viewport Debug (PR 3)', {
      fontFamily: 'Arial, sans-serif', fontSize: '24px', color: '#f8fafc', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.add.text(width * 0.5, 56, 'Fixed viewport, movable artwork underneath (Y-only runtime override)', {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#93c5fd', align: 'center',
      wordWrap: { width: width - 32 },
    }).setOrigin(0.5, 0);

    const selectorY = 106;
    this.createButton(sidePad + 68, selectorY, 120, 52, 'Prev', () => this.shiftCard(-1));
    this.createButton(width - sidePad - 68, selectorY, 120, 52, 'Next', () => this.shiftCard(1));

    this.cardLabel = this.add.text(width * 0.5, selectorY, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#e2e8f0', align: 'center',
      wordWrap: { width: width - 280 },
    }).setOrigin(0.5);

    const previewTop = 140;
    const dockHeight = 310;
    const previewBottom = height - dockHeight;
    const previewAreaHeight = Math.max(220, previewBottom - previewTop);

    const handWidth = Phaser.Math.Clamp(width * 0.42, 128, 210);
    const handHeight = handWidth / HAND_CARD_ASPECT_RATIO;

    const inspectHeight = Math.min(previewAreaHeight * 0.82, handHeight * 1.9);
    const inspectWidth = inspectHeight * HAND_CARD_ASPECT_RATIO;

    this.handAnchor = { x: width * 0.26, y: previewTop + previewAreaHeight * 0.5, width: handWidth, height: handHeight };
    this.inspectAnchor = { x: width * 0.74, y: previewTop + previewAreaHeight * 0.5, width: inspectWidth, height: inspectHeight };

    this.add.text(this.handAnchor.x, previewTop + 2, 'Hand Art Window', { fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#cbd5e1' }).setOrigin(0.5, 0);
    this.add.text(this.inspectAnchor.x, previewTop + 2, 'Inspect Art Window', { fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#cbd5e1' }).setOrigin(0.5, 0);

    const dockY = height - dockHeight;
    this.add.rectangle(width * 0.5, dockY + dockHeight * 0.5, width, dockHeight, 0x111827, 0.95)
      .setStrokeStyle(1, 0x334155, 0.95);

    const row1Y = dockY + 42;
    this.createButton(width * 0.5 - 95, row1Y, 128, 58, 'Y -', () => this.adjustY(-1));
    this.createButton(width * 0.5 + 95, row1Y, 128, 58, 'Y +', () => this.adjustY(1));

    const row2Y = dockY + 104;
    this.stepLabel = this.add.text(width * 0.5 - 110, row2Y, '', { fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#f8fafc' }).setOrigin(0.5);
    this.createButton(width * 0.5 + 98, row2Y, 146, 48, 'Step Toggle', () => this.cycleStep(), { fontSize: '17px' });

    const row3Y = dockY + 160;
    this.valueLabel = this.add.text(width * 0.5 - 98, row3Y, '', { fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#bfdbfe' }).setOrigin(0.5);
    this.createButton(width * 0.5 + 100, row3Y, 120, 48, 'Reset', () => this.resetY());

    const copyRowY = dockY + 214;
    this.createButton(width * 0.5 - 95, copyRowY, 156, 48, 'Copy current', () => { void this.copyCurrentRecord(); }, { fontSize: '18px' });
    this.createButton(width * 0.5 + 95, copyRowY, 156, 48, 'Copy all', () => { void this.copyAllRecords(); }, { fontSize: '18px' });

    this.recordsCountLabel = this.add.text(width * 0.5, dockY + 252, 'Records: 0', {
      fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#f8fafc',
    }).setOrigin(0.5);

    this.statusLabel = this.add.text(width * 0.5, dockY + 278, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#bbf7d0', align: 'center', wordWrap: { width: width - 24 },
    }).setOrigin(0.5);

    this.disabledLabel = this.add.text(width * 0.5, dockY + 296, 'X: disabled (future)   Scale: disabled (future)', {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#94a3b8',
    }).setOrigin(0.5);

    this.createButton(width - sidePad - 72, 32, 132, 46, 'Back', this.onBackRequested, { fontSize: '19px' });
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

  cycleStep() { this.stepIndex = (this.stepIndex + 1) % STEP_OPTIONS.length; this.updateValueLabels(); }

  adjustY(direction) {
    const step = STEP_OPTIONS[this.stepIndex];
    this.currentY01 = clamp01(this.currentY01 + step * direction);
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

  createExportPayload(records) {
    return { version: 1, tool: 'art-viewport-debug', records };
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

  updateRecordsCountLabel() {
    this.recordsCountLabel?.setText(`Records: ${this.pendingRecordsByCardId.size}`);
  }

  copyCurrentRecord() {
    if (!this.cardEntries.length) return Promise.resolve();
    const cardId = String(this.cardEntries[this.selectedIndex]?.card?.id ?? '');
    if (!cardId) {
      this.setStatus('Cannot copy: selected card has no id.', true);
      return Promise.resolve();
    }

    const record = this.buildRecordForCard(cardId);
    this.pendingRecordsByCardId.set(cardId, record);
    this.updateRecordsCountLabel();

    const payload = this.createExportPayload([record]);
    const text = JSON.stringify(payload, null, 2);
    return this.copyWithFallback(text, 'Copied current record');
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
    const fallbackY = Number.isFinite(card?.artPositionY01) ? card.artPositionY01 : 0.5;
    this.defaultY01 = clamp01(fallbackY);

    const existingRecord = this.pendingRecordsByCardId.get(String(card.id));
    const existingY = existingRecord?.runtime?.artPositionY01;
    this.currentY01 = Number.isFinite(existingY) ? clamp01(existingY) : this.defaultY01;

    this.cardLabel.setText(`${this.selectedIndex + 1}/${this.cardEntries.length} • ${card.id} • ${card.name}`);
    this.updateValueLabels();
  }

  updateValueLabels() {
    const step = STEP_OPTIONS[this.stepIndex];
    this.stepLabel?.setText(`Step: ${step.toFixed(3)}`);
    this.valueLabel?.setText(`artPositionY01: ${this.currentY01.toFixed(3)}`);
  }

  clearPreviews() {
    this.previewNodes.forEach((node) => node?.destroy());
    this.previewNodes = [];
  }

  drawArtWindow(anchor, card) {
    const zones = getCardLayoutZones(anchor.width, anchor.height);
    const artZone = zones.art;
    const worldArtZone = {
      x: anchor.x + artZone.x,
      y: anchor.y + artZone.y,
      width: artZone.width,
      height: artZone.height,
      centerX: anchor.x + artZone.centerX,
      centerY: anchor.y + artZone.centerY,
    };

    const backdrop = this.add.rectangle(worldArtZone.centerX, worldArtZone.centerY, worldArtZone.width, worldArtZone.height, 0x0b1220, 0.95)
      .setStrokeStyle(1, 0x1e293b, 0.9);
    const art = createCardArtwork(this, worldArtZone, card, {
      enableCardIllustration: true,
      artPositionY: this.currentY01,
    });
    const border = this.add.rectangle(worldArtZone.centerX, worldArtZone.centerY, worldArtZone.width, worldArtZone.height)
      .setStrokeStyle(2, 0x93c5fd, 1)
      .setFillStyle(0x000000, 0);

    return [backdrop, art, border];
  }

  renderPreviews() {
    this.clearPreviews();
    if (!this.cardEntries.length) return;

    const { card } = this.cardEntries[this.selectedIndex];
    this.previewNodes = [
      ...this.drawArtWindow(this.handAnchor, card),
      ...this.drawArtWindow(this.inspectAnchor, card),
    ];
  }
}
