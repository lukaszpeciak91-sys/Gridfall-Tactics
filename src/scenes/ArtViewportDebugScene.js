import Phaser from 'phaser';
import { getFactionByKey, getFactionKeys } from '../data/factions/index.js';
import { preloadAllCardIllustrations } from '../rendering/cardIllustrationAssets.js';
import { createCardArtwork, getCardLayoutZones } from '../rendering/cardVisualLayout.js';

const Y_STEP = 0.025;
const FALLBACK_X01 = 0.5;
const FALLBACK_SCALE = 1;
const SAFE_FOCAL_INSET_X_RATIO = 0.11;
const SAFE_FOCAL_INSET_Y_RATIO = 0.14;

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

    const controlsHeight = 220;
    const previewTop = 56;
    const previewBottom = height - controlsHeight;
    const previewAreaHeight = Math.max(220, previewBottom - previewTop);
    const previewBoundsWidth = width - 24;
    const previewBoundsHeight = previewAreaHeight - 8;
    // Use runtime card geometry (zones.art) and only magnify that exact window.
    const referenceCardWidth = 1000;
    const referenceCardHeight = 1500;
    const referenceZones = getCardLayoutZones(referenceCardWidth, referenceCardHeight);
    const artRatio = referenceZones.art.width / referenceZones.art.height;
    const maxViewportWidth = Math.min(previewBoundsWidth, previewBoundsHeight * artRatio);
    const maxViewportHeight = maxViewportWidth / artRatio;
    const artScale = maxViewportWidth / referenceZones.art.width;
    this.previewRuntimeCard = {
      x: width * 0.5,
      y: previewTop + (previewAreaHeight * 0.5),
      width: referenceCardWidth * artScale,
      height: referenceCardHeight * artScale,
    };

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
    const fallbackY = Number.isFinite(card?.artPositionY01) ? card.artPositionY01 : 0.5;
    this.defaultY01 = clamp01(fallbackY);

    const existingRecord = this.pendingRecordsByCardId.get(String(card.id));
    const existingY = existingRecord?.runtime?.artPositionY01;
    this.currentY01 = Number.isFinite(existingY) ? clamp01(existingY) : this.defaultY01;

    this.cardLabel.setText(`${this.selectedIndex + 1}/${this.cardEntries.length} • ${card.id} • ${card.name}`);
    this.updateValueLabels();
  }

  updateValueLabels() {
    this.valueLabel?.setText(`Y: ${this.currentY01.toFixed(3)}`);
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
    const safeInsetX = Math.round(worldArtZone.width * SAFE_FOCAL_INSET_X_RATIO);
    const safeInsetY = Math.round(worldArtZone.height * SAFE_FOCAL_INSET_Y_RATIO);
    const safeWidth = Math.max(12, worldArtZone.width - safeInsetX * 2);
    const safeHeight = Math.max(12, worldArtZone.height - safeInsetY * 2);
    const safeCenterX = worldArtZone.x + safeInsetX + safeWidth / 2;
    const safeCenterY = worldArtZone.y + safeInsetY + safeHeight / 2;

    const backdrop = this.add.rectangle(worldArtZone.centerX, worldArtZone.centerY, worldArtZone.width, worldArtZone.height, 0x0b1220, 0.95)
      .setStrokeStyle(1, 0x1e293b, 0.9);
    const art = createCardArtwork(this, worldArtZone, card, {
      enableCardIllustration: true,
      artPositionY: this.currentY01,
    });
    const safeFocalGuide = this.add.rectangle(safeCenterX, safeCenterY, safeWidth, safeHeight)
      .setStrokeStyle(1, 0x34d399, 0.6)
      .setFillStyle(0x34d399, 0.02);
    const border = this.add.rectangle(worldArtZone.centerX, worldArtZone.centerY, worldArtZone.width, worldArtZone.height)
      .setStrokeStyle(2, 0x93c5fd, 1)
      .setFillStyle(0x000000, 0);

    return [
      backdrop,
      art,
      safeFocalGuide,
      border,
    ];
  }

  renderPreviews() {
    this.clearPreviews();
    if (!this.cardEntries.length) return;

    const { card } = this.cardEntries[this.selectedIndex];
    this.previewNodes = [
      ...this.drawArtWindow(this.previewRuntimeCard, card),
    ];
  }
}
