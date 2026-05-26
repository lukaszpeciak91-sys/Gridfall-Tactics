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
const CANONICAL_CARD_WIDTH = 1000;
const CANONICAL_CARD_HEIGHT = 1500;

// Runtime contract:
// - Art viewport geometry is immutable runtime layout data sourced from getCardLayoutZones(...).zones.art.
// - Debug editing only changes source-image framing (artPositionY01).
// - Debug tools must never independently fit/reshape the viewport aspect ratio.
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

  preload() { preloadAllCardIllustrations(this); }

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
      (faction?.deck ?? []).forEach((card) => entries.push({ card, factionKey }));
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
    const previewBoundsHeight = previewAreaHeight - 8;
    const referenceZones = getCardLayoutZones(CANONICAL_CARD_WIDTH, CANONICAL_CARD_HEIGHT);
    this.referenceArtZone = referenceZones.art;

    const gutter = 12;
    const paneWidth = (width - 24 - gutter) / 2;
    const paneY = previewTop + previewBoundsHeight / 2;
    this.previewPaneSource = { x: 12 + (paneWidth / 2), y: paneY, width: paneWidth, height: previewBoundsHeight };
    this.previewPaneRuntime = { x: width - 12 - (paneWidth / 2), y: paneY, width: paneWidth, height: previewBoundsHeight };

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

  shiftCard(delta) { if (!this.cardEntries.length) return; this.selectedIndex = (this.selectedIndex + delta + this.cardEntries.length) % this.cardEntries.length; this.syncSelectedCardState(); this.renderPreviews(); }
  adjustY(direction) { this.currentY01 = Phaser.Math.Clamp(this.currentY01 + (Y_STEP * direction), 0, 1); this.updateValueLabels(); this.renderPreviews(); }
  resetY() { this.currentY01 = this.defaultY01; this.updateValueLabels(); this.renderPreviews(); }

  buildRecordForCard(cardId) { return { cardId, shared: true, runtime: { artPositionY01: Number(this.currentY01.toFixed(3)) }, future: { artPositionX01: FALLBACK_X01, artScale: FALLBACK_SCALE } }; }
  createRuntimeOverrides(records) { return records.reduce((o, r) => { const cardId = String(r?.cardId ?? ''); const y = r?.runtime?.artPositionY01; if (cardId && Number.isFinite(y)) o[cardId] = { artPositionY: Number(y.toFixed(3)) }; return o; }, {}); }
  createExportPayload(records) { return { version: 1, tool: 'art-viewport-debug', records, runtimeOverrides: this.createRuntimeOverrides(records) }; }

  copyWithFallback(text, successMessage) {
    const canUseClipboard = typeof navigator !== 'undefined' && navigator?.clipboard?.writeText;
    if (canUseClipboard) return navigator.clipboard.writeText(text).then(() => this.setStatus(successMessage)).catch((error) => this.showFallbackExport(text, `Clipboard failed: ${error?.message ?? 'unknown error'}`));
    this.showFallbackExport(text, 'Clipboard API unavailable. Copy text from fallback.');
    return Promise.resolve();
  }
  showFallbackExport(text, message) { this.setStatus(message, true); this.fallbackExportText?.destroy(); this.fallbackExportText = this.add.text(this.scale.width * 0.5, this.scale.height - 336, text, { fontFamily: 'monospace', fontSize: '12px', color: '#fde68a', align: 'left', backgroundColor: '#1f2937', padding: { x: 8, y: 6 }, wordWrap: { width: this.scale.width - 24 } }).setOrigin(0.5, 0).setDepth(1000); }
  setStatus(message, isError = false) { this.statusClearEvent?.remove(false); this.statusLabel?.setColor(isError ? '#fecaca' : '#bbf7d0'); this.statusLabel?.setText(message); this.statusClearEvent = this.time.delayedCall(4500, () => this.statusLabel?.setText('')); }

  addCurrentRecord() { if (!this.cardEntries.length) return Promise.resolve(); const cardId = String(this.cardEntries[this.selectedIndex]?.card?.id ?? ''); if (!cardId) { this.setStatus('Cannot add: selected card has no id.', true); return Promise.resolve(); } this.pendingRecordsByCardId.set(cardId, this.buildRecordForCard(cardId)); this.setStatus(`Added record (${this.pendingRecordsByCardId.size})`); return Promise.resolve(); }
  copyAllRecords() { const records = Array.from(this.pendingRecordsByCardId.values()).sort((a, b) => String(a.cardId).localeCompare(String(b.cardId))); return this.copyWithFallback(JSON.stringify(this.createExportPayload(records), null, 2), 'Copied all records'); }

  syncSelectedCardState() {
    if (!this.cardEntries.length) { this.cardLabel.setText('No cards found'); return; }
    const selected = this.cardEntries[this.selectedIndex];
    const card = selected.card;
    const faction = getFactionByKey(selected.factionKey);
    const deck = faction?.deck ?? [];
    const deckIndex = deck.findIndex((deckCard) => deckCard?.id === card?.id);
    const factionLabel = getFactionPresentationName(faction?.id, getActiveLocale(), faction?.name ?? selected.factionKey);
    const localizedDisplayName = getCardDisplayName(card, getActiveLocale()) ?? card?.name ?? 'Unknown';
    const cardNumberLabel = Number.isInteger(card?.cardNumber) ? `#${card.cardNumber}` : '#?';
    const fallbackY = Number.isFinite(card?.artPositionY01) ? card.artPositionY01 : 0.5;
    this.defaultY01 = Phaser.Math.Clamp(fallbackY, 0, 1);
    const existingY = this.pendingRecordsByCardId.get(String(card.id))?.runtime?.artPositionY01;
    this.currentY01 = Number.isFinite(existingY) ? Phaser.Math.Clamp(existingY, 0, 1) : this.defaultY01;
    this.cardLabel.setText(`${factionLabel} ${deckIndex + 1}/${deck.length} • ${cardNumberLabel} • ${card.id} • ${localizedDisplayName}`);
    this.updateValueLabels();
  }

  updateValueLabels() { this.valueLabel?.setText(`Y: ${this.currentY01.toFixed(3)}`); }
  clearPreviews() { this.previewNodes.forEach((node) => node?.destroy()); this.previewNodes = []; }

  drawSourceSelectionPane(card) {
    const pane = this.previewPaneSource;
    const textureKey = getLoadedCardIllustrationTextureKey(this, card);
    const source = textureKey ? this.textures?.get(textureKey)?.getSourceImage?.() : null;
    const sourceWidth = Math.max(1, source?.width ?? 512);
    const sourceHeight = Math.max(1, source?.height ?? 768);
    const fitScale = Math.min((pane.width - 24) / sourceWidth, (pane.height - 40) / sourceHeight);
    const displayWidth = Math.max(1, sourceWidth * fitScale);
    const displayHeight = Math.max(1, sourceHeight * fitScale);
    const crop = calculateCardArtworkCoverPosition(this.referenceArtZone, sourceWidth, sourceHeight, { artPositionY: this.currentY01 });

    const backdrop = this.add.rectangle(pane.x, pane.y, pane.width, pane.height, 0x0b1220, 0.94).setStrokeStyle(1, 0x1e293b, 0.9);
    const art = createCardArtwork(this, { x: pane.x - (displayWidth / 2), y: pane.y - (displayHeight / 2), width: displayWidth, height: displayHeight, centerX: pane.x, centerY: pane.y }, card, { enableCardIllustration: true });

    const rectX = pane.x - (displayWidth / 2) + (crop.cropX * fitScale);
    const rectY = pane.y - (displayHeight / 2) + (crop.cropY * fitScale);
    const selector = this.add.rectangle(rectX + (crop.cropWidth * fitScale / 2), rectY + (crop.cropHeight * fitScale / 2), crop.cropWidth * fitScale, crop.cropHeight * fitScale).setStrokeStyle(2, 0x93c5fd, 1).setFillStyle(0x000000, 0);
    const label = this.add.text(pane.x - pane.width / 2 + 8, pane.y - pane.height / 2 + 6, 'Pane A: source + runtime zones.art crop rectangle', { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#bfdbfe' }).setOrigin(0, 0);
    return [backdrop, art, selector, label];
  }

  drawRuntimePreviewPane(card) {
    const pane = this.previewPaneRuntime;
    const zoneScale = Math.min((pane.width - 24) / this.referenceArtZone.width, (pane.height - 40) / this.referenceArtZone.height);
    const viewportWidth = this.referenceArtZone.width * zoneScale;
    const viewportHeight = this.referenceArtZone.height * zoneScale;
    const backdrop = this.add.rectangle(pane.x, pane.y, pane.width, pane.height, 0x0b1220, 0.94).setStrokeStyle(1, 0x1e293b, 0.9);
    const frame = this.add.rectangle(pane.x, pane.y, viewportWidth, viewportHeight).setStrokeStyle(2, 0x22c55e, 1).setFillStyle(0x000000, 0);

    const art = createCardArtwork(this, {
      x: pane.x - (viewportWidth / 2),
      y: pane.y - (viewportHeight / 2),
      width: viewportWidth,
      height: viewportHeight,
      centerX: pane.x,
      centerY: pane.y,
    }, card, {
      enableCardIllustration: true,
      artPositionY: this.currentY01,
    });
    const label = this.add.text(pane.x - pane.width / 2 + 8, pane.y - pane.height / 2 + 6, 'Pane B: runtime crop semantics (createCardArtwork)', { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#86efac' }).setOrigin(0, 0);
    return [backdrop, art, frame, label];
  }

  renderPreviews() {
    this.clearPreviews();
    if (!this.cardEntries.length) return;
    const { card } = this.cardEntries[this.selectedIndex];
    this.previewNodes = [...this.drawSourceSelectionPane(card), ...this.drawRuntimePreviewPane(card)];
  }
}
