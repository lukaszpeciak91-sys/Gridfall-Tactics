import Phaser from 'phaser';
import { getFactionByKey, getFactionKeys } from '../data/factions/index.js';
import { tutorialEnemyFaction, tutorialPlayerFaction } from '../data/tutorial/tutorialDecks.js';
import { preloadAllCardIllustrations, preloadCardIllustrationsForFaction } from '../rendering/cardIllustrationAssets.js';
import { createCardPreviewView, getCardLayoutZones } from '../rendering/cardVisualLayout.js';
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
    preloadCardIllustrationsForFaction(this, tutorialPlayerFaction);
    preloadCardIllustrationsForFaction(this, tutorialEnemyFaction);
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
    const compareCardsByIdThenName = (a, b) => {
      const aId = String(a.card?.id ?? '');
      const bId = String(b.card?.id ?? '');
      if (aId !== bId) return aId.localeCompare(bId);
      return String(a.card?.name ?? '').localeCompare(String(b.card?.name ?? ''));
    };

    const normalEntries = [];
    getFactionKeys().forEach((factionKey) => {
      const faction = getFactionByKey(factionKey);
      (faction?.deck ?? []).forEach((card) => {
        normalEntries.push({ card, factionKey });
      });
    });

    const tutorialEntries = [
      { faction: tutorialPlayerFaction, groupLabel: 'Tutorial / Player' },
      { faction: tutorialEnemyFaction, groupLabel: 'Tutorial / Enemy' },
    ].flatMap(({ faction, groupLabel }) => (faction?.deck ?? []).map((card) => ({
      card,
      faction,
      groupLabel,
    })));

    return [
      ...normalEntries.sort(compareCardsByIdThenName),
      ...tutorialEntries.sort(compareCardsByIdThenName),
    ];
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
    const faction = selected.faction ?? getFactionByKey(selected.factionKey);
    const deck = faction?.deck ?? [];
    const deckIndex = deck.findIndex((deckCard) => deckCard?.id === card?.id);
    const deckPositionLabel = deckIndex >= 0
      ? `${deckIndex + 1}/${deck.length}`
      : `?/${deck.length || '?'}`;
    const factionLabel = selected.groupLabel
      ?? getFactionPresentationName(faction?.id, getActiveLocale(), faction?.name ?? selected.factionKey);
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

  drawRenderedCardPane(card) {
    const pane = this.previewPaneSource;
    const target = this.getCollectionInspectTargetDimensions();
    const maxWidth = pane.width - 16;
    const maxHeight = pane.height - 28;
    const fitScale = Math.min(maxWidth / Math.max(1, target.width), maxHeight / Math.max(1, target.height));

    const workspaceBackdrop = this.add.rectangle(pane.x, pane.y, pane.width, pane.height, 0x0b1220, 0.94)
      .setStrokeStyle(1, 0x1e293b, 0.9);

    const preview = createCardPreviewView(this, {
      card,
      x: pane.x,
      y: pane.y,
      width: target.width,
      height: target.height,
      enableCardIllustration: true,
      temporaryArtCropY01: this.currentY01,
      temporaryArtCropYOffset: 0,
      clipArtToViewport: false,
    });
    const crop = preview?.art?.cropDebugMetrics ?? null;

    preview.root.setScale(fitScale);
    const artViewportMaskShape = this.createWorldArtViewportMask(preview, target);

    const previewWidth = target.width * fitScale;
    const previewHeight = target.height * fitScale;

    const label = this.add.text(
      pane.x - pane.width / 2 + 8,
      pane.y - pane.height / 2 + 6,
      `Final rendered card preview • ${AUTHORING_TARGET} • target ${target.width.toFixed(1)}x${target.height.toFixed(1)} • display ${previewWidth.toFixed(1)}x${previewHeight.toFixed(1)} • cropY ${Number.isFinite(crop?.cropY) ? crop.cropY.toFixed(1) : "n/a"}`,
      {
        fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#bfdbfe',
      },
    ).setOrigin(0, 0);

    return [workspaceBackdrop, preview.root, artViewportMaskShape, label].filter(Boolean);
  }

  createWorldArtViewportMask(preview, target) {
    if (!preview?.art || typeof this.add?.graphics !== 'function') return null;

    const scaleX = preview.root?.scaleX ?? 1;
    const scaleY = preview.root?.scaleY ?? 1;
    const zones = getCardLayoutZones(target.width, target.height);
    const maskShape = this.add.graphics();
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(
      preview.root.x + zones.art.x * scaleX,
      preview.root.y + zones.art.y * scaleY,
      zones.art.width * scaleX,
      zones.art.height * scaleY,
    );
    maskShape.setVisible(false);

    const artViewportMask = maskShape.createGeometryMask();
    preview.art.setMask(artViewportMask);
    preview.art.artMaskShape = maskShape;
    preview.art.artMask = artViewportMask;

    return maskShape;
  }

  renderPreviews() {
    this.clearPreviews();
    if (!this.cardEntries.length) return;

    const { card } = this.cardEntries[this.selectedIndex];
    this.previewNodes = this.drawRenderedCardPane(card);
  }
}
