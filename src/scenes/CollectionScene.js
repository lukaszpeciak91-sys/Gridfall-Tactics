import Phaser from 'phaser';
import { getFactionByKey, getFactionKeys } from '../data/factions/index.js';
import { getFactionPresentationName } from '../data/presentation/factionPresentation.js';
import {
  MENU_BACKGROUND_FALLBACK_COLOR,
  MENU_BACKGROUND_FALLBACK_COLOR_HEX,
  createCoverBackground,
  getMenuBackgroundAsset,
  preloadMenuBackgroundArt,
} from '../rendering/backgroundArt.js';
import { preloadAllCardIllustrations } from '../rendering/cardIllustrationAssets.js';
import { getActiveLocale, translateActive } from '../localization/localeService.js';
import { createModalBackButton } from '../ui/modalControls.js';
import { preloadSecondaryButtonAsset } from '../ui/imageButton.js';
import { CARD_COLORS, createCardPreviewView, getDefaultCardAccentColor } from '../rendering/cardVisualLayout.js';
import { HAND_CARD_ASPECT_RATIO } from '../ui/handLayout.js';
import {
  HAND_CARD_BODY_LINE_SPACING,
  HAND_CARD_LONG_PRESS_MS,
  HAND_CARD_STAT_BADGE_SCALE,
  HAND_CARD_TITLE_TYPOGRAPHY_SCALE,
  HAND_CARD_TYPOGRAPHY_SCALE,
  INSPECT_CARD_BODY_LINE_SPACING,
  INSPECT_CARD_DEPTH,
  INSPECT_CARD_MAX_HEIGHT_RATIO,
  INSPECT_CARD_MAX_WIDTH_RATIO,
  INSPECT_CARD_OVERLAY_ALPHA,
  INSPECT_CARD_OVERLAY_DEPTH,
  INSPECT_CARD_STAT_BADGE_SCALE,
  INSPECT_CARD_TARGET_SCALE,
  INSPECT_CARD_TWEEN_IN_MS,
  INSPECT_CARD_TWEEN_OUT_MS,
  INSPECT_CARD_TYPOGRAPHY_SCALE,
  INSPECT_CARD_VERTICAL_COMPACT_RATIO,
} from '../rendering/cardViewConfig.js';

const CARD_SCROLL_DRAG_THRESHOLD = 8;
const COLLECTION_GRID_GAP_X = 10;
const COLLECTION_CARD_GAP_Y = 12;
const COLLECTION_SECTION_GAP_Y = 26;
const COLLECTION_CARDS_PER_COLUMN = 5;
const CARD_ART_CROP_DEBUG_STEP = 0.005;
const CARD_ART_CROP_DEBUG_MIN = -0.25;
const CARD_ART_CROP_DEBUG_MAX = 0.25;
const CARD_ART_CROP_DEBUG_ICON_SIZE = 26;
const CARD_ART_CROP_DEBUG_AVAILABLE = true; // TEMP DEV TOOL — REMOVE AFTER ART PASS

export default class CollectionScene extends Phaser.Scene {
  constructor() {
    super('CollectionScene');
    this.uiElements = [];
    this.scrollMask = null;
    this.scrollState = null;
    this.inspectPreview = null;
    this.pressedCard = null;
    this.cardTapHandled = false;
    this.cardLongPressEvent = null;
    this.longPressTriggeredCard = null;
    this.cardArtCropDebug = null;
  }

  preload() {
    preloadMenuBackgroundArt(this);
    preloadSecondaryButtonAsset(this);
    preloadAllCardIllustrations(this);
  }

  init() {
    this.cleanupScene();
  }

  create() {
    this.cleanupScene();

    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor(MENU_BACKGROUND_FALLBACK_COLOR_HEX);
    createCoverBackground(this, {
      asset: getMenuBackgroundAsset(),
      fallbackColor: MENU_BACKGROUND_FALLBACK_COLOR,
      width,
      height,
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);

    const title = this.add
      .text(width / 2, 42, translateActive('ui.collection.title', 'COLLECTION'), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '32px',
        color: '#f8fafc',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.uiElements.push(title);

    const subtitle = this.add
      .text(width / 2, 72, translateActive('ui.collection.subtitle', 'Tap a card for details'), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);
    this.uiElements.push(subtitle);

    this.drawCollectionList({ width, height });
    this.createCollectionCropDebugToggle({ width });
    this.createBackButton(width, height);
  }

  drawCollectionList({ width, height }) {
    const viewportTop = 98;
    const viewportBottom = height - 88;
    const viewportHeight = viewportBottom - viewportTop;
    const content = this.add.container(0, viewportTop);
    this.uiElements.push(content);

    const maskShape = this.add.graphics();
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(0, viewportTop, width, viewportHeight);
    maskShape.setVisible(false);
    this.uiElements.push(maskShape);

    this.scrollMask = maskShape.createGeometryMask();
    content.setMask(this.scrollMask);

    const sideMargin = 14;
    const columnGap = COLLECTION_GRID_GAP_X;
    const cardWidth = (width - sideMargin * 2 - columnGap) / 2;
    const cardHeight = Math.round(cardWidth * HAND_CARD_ASPECT_RATIO);
    let cursorY = 0;

    getFactionKeys().forEach((factionKey) => {
      const faction = getFactionByKey(factionKey);
      cursorY = this.drawFactionSection(content, factionKey, faction, {
        x: sideMargin,
        y: cursorY,
        cardWidth,
        cardHeight,
        columnGap,
      });
      cursorY += COLLECTION_SECTION_GAP_Y;
    });

    this.scrollState = {
      content,
      maxY: viewportTop,
      minY: viewportTop - Math.max(0, cursorY - viewportHeight),
      viewportTop,
      viewportBottom,
      pointerId: null,
      pointerStartY: 0,
      contentStartY: viewportTop,
      lastDragDistance: 0,
    };

    this.input.on('wheel', this.onScrollWheel, this);
    this.input.on('pointerdown', this.onScrollPointerDown, this);
    this.input.on('pointermove', this.onScrollPointerMove, this);
    this.input.on('pointerup', this.onScrollPointerUp, this);
    this.input.on('pointerup', this.onCollectionPointerUp, this);
    this.input.on('pointerupoutside', this.onCollectionPointerUp, this);
    this.input.keyboard?.on('keydown-ESC', this.onBackRequested, this);
    this.input.keyboard?.on('keydown-BACKSPACE', this.onBackRequested, this);
  }

  drawFactionSection(content, factionKey, faction, { x, y, cardWidth, cardHeight, columnGap }) {
    const header = this.add
      .text(this.scale.width / 2, y, getFactionPresentationName(faction?.id, getActiveLocale(), faction?.name ?? factionKey), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '21px',
        color: '#93c5fd',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5, 0);
    content.add(header);
    this.uiElements.push(header);

    const deck = faction?.deck ?? [];
    const rowsPerColumn = Math.max(COLLECTION_CARDS_PER_COLUMN, Math.ceil(deck.length / 2));
    const gridTop = y + 34;

    deck.forEach((card, index) => {
      const column = Math.floor(index / rowsPerColumn);
      const row = index % rowsPerColumn;
      this.drawCardPreview(content, card, {
        x: x + column * (cardWidth + columnGap),
        y: gridTop + row * (cardHeight + COLLECTION_CARD_GAP_Y),
        width: cardWidth,
        height: cardHeight,
      });
    });

    return gridTop + rowsPerColumn * cardHeight + Math.max(0, rowsPerColumn - 1) * COLLECTION_CARD_GAP_Y;
  }

  drawCardPreview(content, card, { x, y, width, height }) {
    const preview = createCardPreviewView(this, {
      card,
      x: x + width / 2,
      y: y + height / 2,
      width,
      height,
      accentColor: getDefaultCardAccentColor(card),
      locale: getActiveLocale(),
      statBadgeScale: HAND_CARD_STAT_BADGE_SCALE,
      typographyScale: HAND_CARD_TYPOGRAPHY_SCALE,
      titleTypographyScale: HAND_CARD_TITLE_TYPOGRAPHY_SCALE,
      bodyLineSpacing: HAND_CARD_BODY_LINE_SPACING,
      enableCardIllustration: true,
      showCardNumber: true,
    });
    content.add(preview.root);
    this.uiElements.push(preview.root);

    preview.background.setInteractive({ useHandCursor: true });
    preview.background.on('pointerdown', (pointer) => {
      const bounds = preview.root.getBounds();
      this.onCardPointerDown(card, {
        pointer,
        sourceX: bounds.centerX,
        sourceY: bounds.centerY,
        sourceWidth: width,
        sourceHeight: height,
      });
    });
    preview.background.on('pointerup', (pointer) => {
      this.onCardPointerUp(card, pointer);
    });
  }

  onCardPointerDown(card, source) {
    const state = this.scrollState;
    if (!state || !card || source.pointer.y < state.viewportTop || source.pointer.y > state.viewportBottom) {
      return;
    }

    this.pressedCard = { card, ...source };
    this.startCardLongPress(this.pressedCard);
  }

  onCardPointerUp(card, pointer) {
    const state = this.scrollState;
    if (!state || !this.pressedCard || this.pressedCard.card !== card || pointer.y < state.viewportTop || pointer.y > state.viewportBottom) {
      this.cancelCardLongPress();
      this.pressedCard = null;
      this.longPressTriggeredCard = null;
      return;
    }

    const wasLongPressInspect = this.longPressTriggeredCard === card;
    this.cancelCardLongPress();
    this.pressedCard = null;

    if (this.wasScrollDragging()) {
      this.longPressTriggeredCard = null;
      return;
    }

    if (wasLongPressInspect) {
      this.cardTapHandled = true;
      this.longPressTriggeredCard = null;
    }
  }

  startCardLongPress(pressedCard) {
    this.cancelCardLongPress();
    this.longPressTriggeredCard = null;
    this.cardLongPressEvent = this.time.delayedCall(HAND_CARD_LONG_PRESS_MS, () => {
      this.cardLongPressEvent = null;
      if (this.pressedCard !== pressedCard || this.wasScrollDragging()) return;

      this.longPressTriggeredCard = pressedCard.card;
      this.cardTapHandled = true;
      this.showInspectPreview(pressedCard);
    });
  }

  cancelCardLongPress() {
    if (!this.cardLongPressEvent) return;
    this.cardLongPressEvent.remove(false);
    this.cardLongPressEvent = null;
  }

  getInspectCardTransform({ sourceWidth, sourceHeight }) {
    const { width, height } = this.scale;
    const margin = 14;
    const viewportTop = this.scrollState?.viewportTop ?? margin;
    const viewportBottom = this.scrollState?.viewportBottom ?? height - margin;
    const maxInspectWidth = Math.min(width * INSPECT_CARD_MAX_WIDTH_RATIO, width - margin * 2);
    const maxInspectHeight = Math.min(height * INSPECT_CARD_MAX_HEIGHT_RATIO, viewportBottom - viewportTop - margin * 2);
    const targetScale = Math.min(
      INSPECT_CARD_TARGET_SCALE,
      maxInspectWidth / sourceWidth,
      maxInspectHeight / (sourceHeight * INSPECT_CARD_VERTICAL_COMPACT_RATIO),
    );
    const inspectWidth = sourceWidth * targetScale;
    const inspectHeight = sourceHeight * targetScale * INSPECT_CARD_VERTICAL_COMPACT_RATIO;
    const minX = margin + inspectWidth / 2;
    const maxX = width - margin - inspectWidth / 2;
    const minY = viewportTop + margin + inspectHeight / 2;
    const maxY = Math.max(minY, viewportBottom - margin - inspectHeight / 2);

    return {
      x: Phaser.Math.Clamp(width * 0.5, minX, maxX),
      y: Phaser.Math.Clamp((viewportTop + viewportBottom) * 0.5, minY, maxY),
      width: inspectWidth,
      height: inspectHeight,
    };
  }

  showInspectPreview({ card, sourceX, sourceY, sourceWidth, sourceHeight }) {
    if (!card) return;

    this.cancelCardLongPress();
    this.destroyInspectPreview();

    const { width, height } = this.scale;
    const transform = this.getInspectCardTransform({ sourceWidth, sourceHeight });
    const accentColor = getDefaultCardAccentColor(card);
    const overlay = this.add.rectangle(width * 0.5, height * 0.5, width, height, 0x000000, 0)
      .setDepth(INSPECT_CARD_OVERLAY_DEPTH);

    const previewView = createCardPreviewView(this, {
      card,
      x: sourceX,
      y: sourceY,
      width: transform.width,
      height: transform.height,
      accentColor,
      depth: INSPECT_CARD_DEPTH,
      locale: getActiveLocale(),
      statBadgeScale: INSPECT_CARD_STAT_BADGE_SCALE,
      typographyScale: INSPECT_CARD_TYPOGRAPHY_SCALE,
      bodyLineSpacing: INSPECT_CARD_BODY_LINE_SPACING,
      enableCardIllustration: true,
      showCardNumber: true,
      temporaryArtCropYOffset: this.getCardArtCropYOffset(card),
    });

    previewView.root.setAlpha(0).setScale(0.92);
    previewView.glow.setFillStyle(0xfacc15, 0.14);
    previewView.glow.setStrokeStyle(5, 0xfacc15, 0.72);
    previewView.background.setFillStyle(CARD_COLORS.frameSelected, 0.95);
    previewView.background.setStrokeStyle(5, accentColor, 1);
    previewView.selectionOutline?.setStrokeStyle(5, 0xfacc15, 0.92);

    this.tweens.add({
      targets: overlay,
      alpha: INSPECT_CARD_OVERLAY_ALPHA,
      duration: INSPECT_CARD_TWEEN_IN_MS,
      ease: 'Quad.easeOut',
    });
    this.tweens.add({
      targets: previewView.root,
      x: transform.x,
      y: transform.y,
      scale: 1,
      alpha: 1,
      duration: INSPECT_CARD_TWEEN_IN_MS,
      ease: 'Quad.easeOut',
    });

    this.inspectPreview = {
      ...previewView,
      overlay,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      card,
      previewItems: [previewView.root, overlay],
    };
    this.refreshCardArtCropDebugUi({ inspectTransform: transform });
  }

  destroyInspectPreview({ animate = false } = {}) {
    if (!this.inspectPreview) return;

    const inspect = this.inspectPreview;
    const items = [inspect.root, inspect.overlay, inspect.glow, inspect.background, inspect.label].filter(Boolean);
    this.tweens?.killTweensOf?.(items);
    this.inspectPreview = null;

    const destroyItems = () => {
      inspect.overlay?.removeAllListeners?.();
      inspect.overlay?.destroy?.();
      inspect.root?.destroy?.();
    };

    if (!animate || !inspect.root?.active) {
      destroyItems();
      return;
    }

    this.tweens.add({
      targets: inspect.root,
      x: inspect.sourceX,
      y: inspect.sourceY,
      scale: 0.96,
      alpha: 0,
      duration: INSPECT_CARD_TWEEN_OUT_MS,
      ease: 'Quad.easeIn',
      onComplete: destroyItems,
    });

    if (inspect.overlay?.active) {
      this.tweens.add({
        targets: inspect.overlay,
        alpha: 0,
        duration: INSPECT_CARD_TWEEN_OUT_MS,
        ease: 'Quad.easeIn',
      });
    }
  }

  createBackButton(width, height) {
    const backButton = createModalBackButton(this, {
      x: width / 2,
      y: height - 48,
      width: Math.min(220, Math.max(160, Math.round(width * 0.48))),
      height: 54,
      onPointerUp: () => {
        if (this.inspectPreview) {
          this.destroyInspectPreview({ animate: true });
          return;
        }
        this.scene.start('MainMenuScene');
      },
    });
    this.uiElements.push(...backButton.items);
  }

  createCollectionCropDebugToggle({ width }) {
    if (!CARD_ART_CROP_DEBUG_AVAILABLE) return;
    const iconSize = CARD_ART_CROP_DEBUG_ICON_SIZE;
    const iconX = width - 18 - iconSize / 2;
    const icon = this.add.rectangle(iconX, 18 + iconSize / 2, iconSize, iconSize, 0x0f172a, 0.86)
      .setStrokeStyle(1, 0x64748b, 0.9)
      .setDepth(2200)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    const glyph = this.add.text(icon.x, icon.y, '✂', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#dbeafe',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2201).setScrollFactor(0);

    const updateVisualState = () => {
      const debug = this.ensureCardArtCropDebugState();
      icon.setStrokeStyle(1, debug.enabled ? 0x38bdf8 : 0x64748b, 0.95);
      glyph.setColor(debug.enabled ? '#38bdf8' : '#dbeafe');
    };
    updateVisualState();

    icon.on('pointerup', () => {
      this.cardTapHandled = true;
      const debug = this.ensureCardArtCropDebugState();
      debug.enabled = !debug.enabled;
      debug.panelVisible = debug.enabled;
      if (!debug.enabled) {
        debug.panelVisible = false;
      }
      updateVisualState();
      this.refreshCardArtCropDebugUi();
    });
    this.uiElements.push(icon, glyph);
  }

  ensureCardArtCropDebugState() {
    if (!this.cardArtCropDebug) {
      this.cardArtCropDebug = {
        enabled: false,
        panelVisible: false,
        draftByCardId: new Map(),
        sessionOverrides: new Map(),
        panelItems: [],
        toggleItems: [],
        guideItems: [],
      };
    }
    return this.cardArtCropDebug;
  }

  getCardArtCropYOffset(card) {
    if (!card?.id || !this.cardArtCropDebug) return 0;
    return this.cardArtCropDebug.draftByCardId.get(String(card.id)) ?? 0;
  }

  nudgeCardArtCrop(card, delta) {
    this.setCardArtCrop(card, this.getCardArtCropYOffset(card) + delta);
  }

  setCardArtCrop(card, value) {
    if (!card?.id || !this.inspectPreview) return;
    const debug = this.ensureCardArtCropDebugState();
    debug.draftByCardId.set(String(card.id), Phaser.Math.Clamp(value, CARD_ART_CROP_DEBUG_MIN, CARD_ART_CROP_DEBUG_MAX));
    this.showInspectPreview({ card, sourceX: this.inspectPreview.sourceX, sourceY: this.inspectPreview.sourceY, sourceWidth: this.inspectPreview.sourceWidth, sourceHeight: this.inspectPreview.sourceHeight });
  }

  buildCardArtCropDebugJson() {
    const result = {};
    this.cardArtCropDebug?.sessionOverrides?.forEach((value, cardId) => {
      result[cardId] = { yOffset: Number(value.yOffset.toFixed(3)) };
    });
    return JSON.stringify({ artCropOverrides: result }, null, 2);
  }

  refreshCardArtCropDebugUi({ inspectTransform = null } = {}) {
    const debug = this.ensureCardArtCropDebugState();
    debug.panelItems.forEach((item) => item?.destroy?.());
    debug.toggleItems.forEach((item) => item?.destroy?.());
    debug.guideItems.forEach((item) => item?.destroy?.());
    debug.panelItems = [];
    debug.toggleItems = [];
    debug.guideItems = [];
    if (!debug.enabled || !this.inspectPreview?.card?.id) return;
    const card = this.inspectPreview.card;
    const bounds = inspectTransform ?? this.getInspectCardTransform({ sourceWidth: this.inspectPreview.sourceWidth, sourceHeight: this.inspectPreview.sourceHeight });
    const yOffset = this.getCardArtCropYOffset(card);
    this.createCardArtCropDebugGuides(bounds, yOffset);
    const toggleBtn = this.add.text(bounds.x - (bounds.width * 0.5) + 20, bounds.y - (bounds.height * 0.5) + 18, debug.panelVisible ? '✂ ON' : '✂', { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#dbeafe', backgroundColor: '#0f172a', padding: { left: 6, right: 6, top: 4, bottom: 3 } })
      .setOrigin(0.5).setDepth(INSPECT_CARD_DEPTH + 60).setScrollFactor(0).setInteractive({ useHandCursor: true });
    this.captureDebugControlInput(toggleBtn, () => {
      this.cardTapHandled = true;
      debug.panelVisible = !debug.panelVisible;
      this.refreshCardArtCropDebugUi();
    });
    debug.toggleItems.push(toggleBtn);
    if (!debug.panelVisible) return;
    const cardId = String(card.id);
    const { width } = this.scale;
    const panelWidth = Math.min(440, width - 16);
    const panel = this.add.rectangle(width * 0.5, 62, panelWidth, 98, 0x020617, 0.92)
      .setStrokeStyle(1, 0x38bdf8, 0.75)
      .setDepth(2600)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: false });
    panel.on('pointerdown', (pointer, localX, localY, event) => {
      this.cardTapHandled = true;
      event?.stopPropagation?.();
    });
    panel.on('pointerup', (pointer, localX, localY, event) => {
      this.cardTapHandled = true;
      event?.stopPropagation?.();
    });
    const controlsTopY = panel.y - 22;
    const controlsBottomY = panel.y + 22;
    const controlsLeft = panel.x - panelWidth * 0.5 + 38;
    const upBtn = this.createDebugTextButton(controlsLeft, controlsTopY - 16, '▲', () => this.nudgeCardArtCrop(card, CARD_ART_CROP_DEBUG_STEP), {
      fontSize: '22px', minWidth: 58, minHeight: 48, paddingX: 16, paddingY: 10,
    });
    const downBtn = this.createDebugTextButton(controlsLeft, controlsTopY + 20, '▼', () => this.nudgeCardArtCrop(card, -CARD_ART_CROP_DEBUG_STEP), {
      fontSize: '22px', minWidth: 58, minHeight: 48, paddingX: 16, paddingY: 10,
    });
    const valueLabel = this.add.text(controlsLeft + 62, controlsTopY + 2, `yOffset: ${yOffset.toFixed(3)}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#e2e8f0',
    }).setOrigin(0, 0.5).setDepth(2601).setScrollFactor(0);
    const countLabel = this.add.text(panel.x + panelWidth * 0.5 - 12, controlsTopY, `buffer: ${debug.sessionOverrides.size}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      color: '#93c5fd',
    }).setOrigin(1, 0.5).setDepth(2601).setScrollFactor(0);
    const addButton = this.createDebugTextButton(panel.x - 116, controlsBottomY, 'ADD / UPDATE', () => { debug.sessionOverrides.set(cardId, { yOffset: this.getCardArtCropYOffset(card) }); this.refreshCardArtCropDebugUi(); }, { minWidth: 126, minHeight: 34 });
    const copyButton = this.createDebugTextButton(panel.x, controlsBottomY, 'COPY ALL', async () => { await navigator.clipboard?.writeText?.(this.buildCardArtCropDebugJson()); }, { minWidth: 96, minHeight: 34 });
    const clearButton = this.createDebugTextButton(panel.x + 104, controlsBottomY, 'CLEAR', () => { debug.sessionOverrides.clear(); this.refreshCardArtCropDebugUi(); }, { minWidth: 84, minHeight: 34 });
    const cardIdLabel = this.add.text(panel.x + panelWidth * 0.5 - 12, controlsBottomY + 28, cardId, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      color: '#64748b',
    }).setOrigin(1, 0.5).setDepth(2601).setScrollFactor(0);
    debug.panelItems.push(panel, valueLabel, upBtn, downBtn, addButton, copyButton, clearButton, countLabel, cardIdLabel);
  }

  createCardArtCropDebugGuides(bounds, yOffset) {
    const debug = this.ensureCardArtCropDebugState();
    const art = this.inspectPreview?.art;
    if (!art?.getBounds) return;
    const artBounds = art.getBounds();
    const centerLine = this.add.rectangle(artBounds.centerX, artBounds.centerY, artBounds.width, 2, 0x22d3ee, 0.95).setDepth(INSPECT_CARD_DEPTH + 8).setScrollFactor(0);
    const topSafe = this.add.rectangle(artBounds.centerX, artBounds.y + artBounds.height * 0.2, artBounds.width, 1, 0xf8fafc, 0.45).setDepth(INSPECT_CARD_DEPTH + 8).setScrollFactor(0);
    const bottomSafe = this.add.rectangle(artBounds.centerX, artBounds.bottom - artBounds.height * 0.2, artBounds.width, 1, 0xf8fafc, 0.45).setDepth(INSPECT_CARD_DEPTH + 8).setScrollFactor(0);
    const label = this.add.text(bounds.x, artBounds.y + 10, `crop yOffset ${yOffset.toFixed(3)}`, { fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#67e8f9', backgroundColor: '#020617', padding: { left: 5, right: 5, top: 2, bottom: 2 } }).setOrigin(0.5, 0).setDepth(INSPECT_CARD_DEPTH + 9).setScrollFactor(0);
    debug.guideItems.push(centerLine, topSafe, bottomSafe, label);
  }

  createDebugTextButton(x, y, label, onPress, options = {}) {
    const {
      fontSize = '12px',
      minWidth = 0,
      minHeight = 0,
      paddingX = 7,
      paddingY = 4,
    } = options;
    const button = this.add.text(x, y, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize,
      color: '#dbeafe',
      backgroundColor: '#0f172a',
      padding: { left: paddingX, right: paddingX, top: paddingY, bottom: paddingY },
      align: 'center',
    })
      .setOrigin(0.5)
      .setDepth(2601)
      .setScrollFactor(0);
    let hitWidth = button.width;
    let hitHeight = button.height;
    if (minWidth > 0 || minHeight > 0) {
      hitWidth = Math.max(button.width, minWidth);
      hitHeight = Math.max(button.height, minHeight);
    }
    const background = this.add.rectangle(x, y, hitWidth + 6, hitHeight + 6, 0x0f172a, 0.96)
      .setStrokeStyle(1, 0x38bdf8, 0.55)
      .setDepth(2600.5)
      .setScrollFactor(0)
      .setInteractive(new Phaser.Geom.Rectangle(-(hitWidth + 6) / 2, -(hitHeight + 6) / 2, hitWidth + 6, hitHeight + 6), Phaser.Geom.Rectangle.Contains);
    this.captureDebugControlInput(background, onPress);
    return this.add.container(0, 0, [background, button]);
  }

  captureDebugControlInput(gameObject, onPress = null) {
    gameObject.on('pointerdown', (pointer, localX, localY, event) => {
      this.cardTapHandled = true;
      event?.stopPropagation?.();
      onPress?.();
    });
    gameObject.on('pointerup', (pointer, localX, localY, event) => {
      this.cardTapHandled = true;
      event?.stopPropagation?.();
    });
  }

  wasScrollDragging() {
    return Math.abs(this.scrollState?.lastDragDistance ?? 0) > CARD_SCROLL_DRAG_THRESHOLD;
  }

  onScrollWheel(pointer, gameObjects, deltaX, deltaY) {
    const state = this.scrollState;
    if (!state || this.inspectPreview || pointer.y < state.viewportTop || pointer.y > state.viewportBottom) {
      return;
    }

    this.setCollectionScrollY(state.content.y - deltaY * 0.45);
  }

  onScrollPointerDown(pointer) {
    const state = this.scrollState;
    if (!state || this.inspectPreview || pointer.y < state.viewportTop || pointer.y > state.viewportBottom) {
      return;
    }

    state.pointerId = pointer.id;
    state.pointerStartY = pointer.y;
    state.contentStartY = state.content.y;
    state.lastDragDistance = 0;
  }

  onScrollPointerMove(pointer) {
    const state = this.scrollState;
    if (!state || state.pointerId !== pointer.id) {
      return;
    }

    state.lastDragDistance = pointer.y - state.pointerStartY;
    if (Math.abs(state.lastDragDistance) > CARD_SCROLL_DRAG_THRESHOLD) {
      this.cancelCardLongPress();
      this.destroyInspectPreview({ animate: true });
    }
    this.setCollectionScrollY(state.contentStartY + state.lastDragDistance);
  }

  onScrollPointerUp(pointer) {
    const state = this.scrollState;
    if (!state || state.pointerId !== pointer.id) {
      return;
    }

    state.pointerId = null;
    globalThis.setTimeout(() => {
      if (this.scrollState) {
        this.scrollState.lastDragDistance = 0;
      }
    }, 0);
  }

  onCollectionPointerUp() {
    if (this.cardTapHandled) {
      this.cardTapHandled = false;
      this.cancelCardLongPress();
      this.longPressTriggeredCard = null;
      this.pressedCard = null;
      return;
    }

    this.cancelCardLongPress();

    if (this.inspectPreview) {
      this.destroyInspectPreview({ animate: true });
    }
    this.refreshCardArtCropDebugUi();

    this.longPressTriggeredCard = null;
    this.pressedCard = null;
  }

  onBackRequested() {
    if (this.inspectPreview) {
      this.destroyInspectPreview({ animate: true });
      return;
    }

    this.scene.start('MainMenuScene');
  }

  setCollectionScrollY(nextY) {
    const state = this.scrollState;
    if (!state) {
      return;
    }

    state.content.y = Phaser.Math.Clamp(nextY, state.minY, state.maxY);
  }

  cleanupScene() {
    this.input?.off('wheel', this.onScrollWheel, this);
    this.input?.off('pointerdown', this.onScrollPointerDown, this);
    this.input?.off('pointermove', this.onScrollPointerMove, this);
    this.input?.off('pointerup', this.onScrollPointerUp, this);
    this.input?.off('pointerup', this.onCollectionPointerUp, this);
    this.input?.off('pointerupoutside', this.onCollectionPointerUp, this);
    this.input?.keyboard?.off('keydown-ESC', this.onBackRequested, this);
    this.input?.keyboard?.off('keydown-BACKSPACE', this.onBackRequested, this);

    this.cancelCardLongPress();
    this.destroyInspectPreview();
    this.cardArtCropDebug?.panelItems?.forEach((item) => item?.destroy?.());
    this.cardArtCropDebug?.toggleItems?.forEach((item) => item?.destroy?.());
    this.cardArtCropDebug?.guideItems?.forEach((item) => item?.destroy?.());
    if (this.cardArtCropDebug) {
      this.cardArtCropDebug.panelItems = [];
      this.cardArtCropDebug.toggleItems = [];
      this.cardArtCropDebug.guideItems = [];
    }
    this.scrollMask?.destroy?.();
    this.scrollMask = null;
    this.scrollState = null;

    this.uiElements.forEach((element) => {
      if (element && element.active) {
        element.removeAllListeners?.();
        element.destroy();
      }
    });
    this.uiElements = [];
  }
}
