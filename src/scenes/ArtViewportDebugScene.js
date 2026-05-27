import Phaser from 'phaser';
import { getFactionByKey, getFactionKeys } from '../data/factions/index.js';
import { getLoadedCardIllustrationTextureKey, preloadAllCardIllustrations } from '../rendering/cardIllustrationAssets.js';
import { createCardArtwork, createCardPreviewView } from '../rendering/cardVisualLayout.js';
import { HAND_CARD_ASPECT_RATIO } from '../ui/handLayout.js';
import {
  getCollectionInspectCardTransform,
  getCollectionViewportBounds,
} from '../ui/collectionInspectTransform.js';
import { getFactionPresentationName } from '../data/presentation/factionPresentation.js';
import { getActiveLocale } from '../localization/localeService.js';
import { getCardDisplayName } from '../localization/cardDisplay.js';

const Y_STEP = 0.025;
const FALLBACK_X01 = 0.5;
const FALLBACK_SCALE = 1;
const AUTHORING_TARGET = 'collection_inspect';
const COLLECTION_GRID_GAP_X = 10;
const COLLECTION_SIDE_MARGIN = 14;
const COLLECTION_INSPECT_MARGIN = 14;

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
    const controlsBottomPad = 10;
    const controlsTopGap = 10;
    const controlsRowGap = 8;
    const controlsHeight = 42 + controlsRowGap + 40 + controlsRowGap + 40 + controlsBottomPad;
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

    const previewTop = 86;
    const previewBottom = height - controlsHeight - controlsTopGap;
    const previewAreaHeight = Math.max(160, previewBottom - previewTop);
    const previewBoundsWidth = width - 24;
    const previewBoundsHeight = previewAreaHeight - 8;
    const paneCenterX = width * 0.5;
    const paneCenterY = previewTop + previewBoundsHeight / 2;
    this.previewPaneSource = { x: paneCenterX, y: paneCenterY, width: previewBoundsWidth, height: previewBoundsHeight };

    const controlsY = height - controlsHeight;
    this.createButton(width * 0.5 - 108, controlsY + 21, 96, 42, 'Y -', () => this.adjustY(-1), { fontSize: '20px' });
    this.createButton(width * 0.5 + 108, controlsY + 21, 96, 42, 'Y +', () => this.adjustY(1), { fontSize: '20px' });
    this.valueLabel = this.add.text(width * 0.5, controlsY + 21, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#bfdbfe',
    }).setOrigin(0.5);

    const actionRowY = controlsY + 21 + 42 / 2 + controlsRowGap + 20;
    const actionWidth = Math.min(140, (width - 32) / 3);
    this.createButton(width * 0.5 - actionWidth - 8, actionRowY, actionWidth, 40, 'Add', () => { this.addCurrentRecord(); }, { fontSize: '16px' });
    this.createButton(width * 0.5, actionRowY, actionWidth, 40, 'Copy All', () => { void this.copyAllRecords(); }, { fontSize: '16px' });
    this.createButton(width * 0.5 + actionWidth + 8, actionRowY, actionWidth, 40, 'Reset', () => this.resetY(), { fontSize: '16px' });

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


  getCollectionCardBaseSize() {
    const { width } = this.scale;
    const cardWidth = (width - COLLECTION_SIDE_MARGIN * 2 - COLLECTION_GRID_GAP_X) / 2;
    const cardHeight = Math.round(cardWidth * HAND_CARD_ASPECT_RATIO);
    return { cardWidth, cardHeight };
  }

  getCollectionInspectTargetDimensions() {
    const { width, height } = this.scale;
    const { cardWidth, cardHeight } = this.getCollectionCardBaseSize();
    const { viewportTop, viewportBottom } = getCollectionViewportBounds(height);
    const transform = getCollectionInspectCardTransform({
      screenWidth: width,
      screenHeight: height,
      sourceWidth: cardWidth,
      sourceHeight: cardHeight,
      viewportTop,
      viewportBottom,
      margin: COLLECTION_INSPECT_MARGIN,
    });

    return {
      width: transform.width,
      height: transform.height,
    };
  }

  getRealArtworkViewportMetrics(card) {
    const target = this.getCollectionInspectTargetDimensions();
    const preview = createCardPreviewView(this, {
      card,
      x: -10000,
      y: -10000,
      width: target.width,
      height: target.height,
      enableCardIllustration: true,
      temporaryArtCropY01: this.currentY01,
    });
    const crop = preview?.art?.cropDebugMetrics ?? null;
    const viewportWidth = Number.isFinite(crop?.cropWidth) ? crop.cropWidth : null;
    const viewportHeight = Number.isFinite(crop?.cropHeight) ? crop.cropHeight : null;
    preview?.root?.destroy();
    return {
      mode: AUTHORING_TARGET,
      targetWidth: target.width,
      targetHeight: target.height,
      viewportWidth,
      viewportHeight,
    };
  }

  drawSourceSelectionPane(card) {
    const pane = this.previewPaneSource;
    const textureKey = getLoadedCardIllustrationTextureKey(this, card);
    const source = textureKey ? this.textures?.get(textureKey)?.getSourceImage?.() : null;
    const sourceWidth = Math.max(1, source?.width ?? 512);
    const sourceHeight = Math.max(1, source?.height ?? 768);
    const { viewportWidth, viewportHeight, targetWidth, targetHeight, mode } = this.getRealArtworkViewportMetrics(card);
    const fallbackWidth = sourceWidth * 0.5;
    const fallbackHeight = sourceHeight * 0.5;
    const selectorWidth = Number.isFinite(viewportWidth)
      ? sourceWidth * (viewportWidth / targetWidth)
      : fallbackWidth;
    const selectorHeight = Number.isFinite(viewportHeight)
      ? sourceHeight * (viewportHeight / targetHeight)
      : fallbackHeight;
    const maxCropY = Math.max(0, sourceHeight - selectorHeight);
    const cropY = maxCropY * this.currentY01;
    const cropX = (sourceWidth - selectorWidth) * 0.5;
    const viewportCoverageRatio = 0.62;
    const targetAspect = targetWidth / Math.max(1, targetHeight);
    const maxFrameWidth = pane.width * viewportCoverageRatio;
    const maxFrameHeight = pane.height * viewportCoverageRatio;
    const viewportWorldWidth = Math.min(maxFrameWidth, maxFrameHeight * targetAspect);
    const viewportWorldHeight = viewportWorldWidth / Math.max(0.0001, targetAspect);
    const workspaceScale = Math.max(
      viewportWorldWidth / Math.max(1, sourceWidth),
      viewportWorldHeight / Math.max(1, sourceHeight),
    );
    const displayWidth = Math.max(1, sourceWidth * workspaceScale);
    const displayHeight = Math.max(1, sourceHeight * workspaceScale);
    const viewportWorldX = pane.x - viewportWorldWidth / 2;
    const viewportWorldY = pane.y - viewportWorldHeight / 2;
    const artWorldX = viewportWorldX - (cropX * workspaceScale);
    const artWorldY = viewportWorldY - (cropY * workspaceScale);

    const workspaceBackdrop = this.add.rectangle(pane.x, pane.y, pane.width, pane.height, 0x0b1220, 0.94)
      .setStrokeStyle(1, 0x1e293b, 0.9);
    const art = createCardArtwork(this, {
      x: artWorldX,
      y: artWorldY,
      width: displayWidth,
      height: displayHeight,
      centerX: pane.x,
      centerY: pane.y,
    }, card, { enableCardIllustration: true });
    const paneLeft = pane.x - pane.width / 2;
    const paneTop = pane.y - pane.height / 2;
    const paneRight = paneLeft + pane.width;
    const paneBottom = paneTop + pane.height;
    const viewportRight = viewportWorldX + viewportWorldWidth;
    const viewportBottom = viewportWorldY + viewportWorldHeight;
    const dimAlpha = 0.26;
    const maskTop = this.add.rectangle(pane.x, (paneTop + viewportWorldY) / 2, pane.width, Math.max(0, viewportWorldY - paneTop), 0x020617, dimAlpha).setOrigin(0.5);
    const maskBottom = this.add.rectangle(pane.x, (viewportBottom + paneBottom) / 2, pane.width, Math.max(0, paneBottom - viewportBottom), 0x020617, dimAlpha).setOrigin(0.5);
    const maskLeft = this.add.rectangle((paneLeft + viewportWorldX) / 2, pane.y, Math.max(0, viewportWorldX - paneLeft), viewportWorldHeight, 0x020617, dimAlpha).setOrigin(0.5);
    const maskRight = this.add.rectangle((viewportRight + paneRight) / 2, pane.y, Math.max(0, paneRight - viewportRight), viewportWorldHeight, 0x020617, dimAlpha).setOrigin(0.5);
    const viewportFrame = this.add.rectangle(
      pane.x,
      pane.y,
      viewportWorldWidth,
      viewportWorldHeight,
    )
      .setStrokeStyle(3, 0x93c5fd, 1)
      .setFillStyle(0x000000, 0);
    const viewportAspect = selectorHeight > 0 ? (selectorWidth / selectorHeight) : 0;
    const label = this.add.text(pane.x - pane.width / 2 + 8, pane.y - pane.height / 2 + 6, `Source selection • ${mode} • display frame ${viewportWorldWidth.toFixed(1)}x${viewportWorldHeight.toFixed(1)} • target ${targetWidth.toFixed(1)}x${targetHeight.toFixed(1)} • source viewport ${Number(viewportWidth ?? 0).toFixed(1)}x${Number(viewportHeight ?? 0).toFixed(1)} • source ar ${viewportAspect.toFixed(4)}`, {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#bfdbfe',
    }).setOrigin(0, 0);

    return [workspaceBackdrop, art, maskTop, maskBottom, maskLeft, maskRight, viewportFrame, label];
  }

  renderPreviews() {
    this.clearPreviews();
    if (!this.cardEntries.length) return;

    const { card } = this.cardEntries[this.selectedIndex];
    this.previewNodes = this.drawSourceSelectionPane(card);
  }
}
