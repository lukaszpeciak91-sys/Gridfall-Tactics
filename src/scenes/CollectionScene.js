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
import { formatCardDetailLines } from '../rendering/cardRenderModes.js';
import { preloadAllCardIllustrations } from '../rendering/cardIllustrationAssets.js';
import { getActiveLocale, translateActive } from '../localization/localeService.js';
import { createModalBackButton } from '../ui/modalControls.js';
import { preloadSecondaryButtonAsset } from '../ui/imageButton.js';
import { CARD_COLORS, createCardPreviewView, getDefaultCardAccentColor } from '../rendering/cardVisualLayout.js';

const CARD_SCROLL_DRAG_THRESHOLD = 8;
const COLLECTION_GRID_GAP_X = 10;
const COLLECTION_CARD_GAP_Y = 12;
const COLLECTION_SECTION_GAP_Y = 26;
const COLLECTION_CARDS_PER_COLUMN = 5;
const COLLECTION_CARD_ASPECT_RATIO = 1.42;
const COLLECTION_CARD_LONG_PRESS_MS = 425;
const COLLECTION_INSPECT_CARD_TARGET_SCALE = 2.06;
const COLLECTION_INSPECT_CARD_VERTICAL_COMPACT_RATIO = 0.96;
const COLLECTION_INSPECT_CARD_MAX_HEIGHT_RATIO = 0.58;
const COLLECTION_INSPECT_CARD_MAX_WIDTH_RATIO = 0.78;
const COLLECTION_INSPECT_CARD_OVERLAY_ALPHA = 0.2;
const COLLECTION_INSPECT_CARD_OVERLAY_DEPTH = 840;
const COLLECTION_INSPECT_CARD_DEPTH = 850;
const COLLECTION_INSPECT_CARD_TWEEN_IN_MS = 150;
const COLLECTION_INSPECT_CARD_TWEEN_OUT_MS = 95;
const COLLECTION_INSPECT_CARD_STAT_BADGE_SCALE = 1.28;
const COLLECTION_INSPECT_CARD_TYPOGRAPHY_SCALE = 1.1;
const COLLECTION_INSPECT_CARD_BODY_LINE_SPACING = 5;

export default class CollectionScene extends Phaser.Scene {
  constructor() {
    super('CollectionScene');
    this.uiElements = [];
    this.scrollMask = null;
    this.scrollState = null;
    this.detailPanel = null;
    this.inspectPreview = null;
    this.pressedCard = null;
    this.cardLongPressEvent = null;
    this.longPressTriggeredCard = null;
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
    const cardHeight = Math.round(cardWidth * COLLECTION_CARD_ASPECT_RATIO);
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
      statBadgeScale: 0.95,
      typographyScale: 0.95,
      titleTypographyScale: 1,
      bodyLineSpacing: 1,
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
    preview.background.on('pointerout', (_pointer) => {
      this.cancelCardLongPress();
    });
  }

  onCardPointerDown(card, source) {
    const state = this.scrollState;
    if (!state || this.detailPanel || this.inspectPreview || !card || source.pointer.y < state.viewportTop || source.pointer.y > state.viewportBottom) {
      return;
    }

    this.cancelCardLongPress();
    this.longPressTriggeredCard = null;
    this.pressedCard = { card, ...source };
    this.cardLongPressEvent = this.time.delayedCall(COLLECTION_CARD_LONG_PRESS_MS, () => {
      this.cardLongPressEvent = null;
      if (this.pressedCard?.card !== card || this.wasScrollDragging()) return;

      const currentState = this.scrollState;
      if (!currentState || this.detailPanel || !this.pressedCard) return;
      if (source.pointer.y < currentState.viewportTop || source.pointer.y > currentState.viewportBottom) return;

      this.longPressTriggeredCard = card;
      this.showInspectPreview(this.pressedCard);
    });
  }

  onCardPointerUp(card, pointer) {
    this.cancelCardLongPress();

    if (this.longPressTriggeredCard === card || this.inspectPreview) {
      this.destroyInspectPreview({ animate: true });
      this.pressedCard = null;
      this.longPressTriggeredCard = null;
      return;
    }

    const state = this.scrollState;
    if (!state || !this.pressedCard || this.pressedCard.card !== card || pointer.y < state.viewportTop || pointer.y > state.viewportBottom) {
      this.pressedCard = null;
      this.longPressTriggeredCard = null;
      return;
    }

    this.pressedCard = null;
    this.longPressTriggeredCard = null;
    this.openDetailPanel(card);
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
    const maxInspectWidth = Math.min(width * COLLECTION_INSPECT_CARD_MAX_WIDTH_RATIO, width - margin * 2);
    const maxInspectHeight = Math.min(height * COLLECTION_INSPECT_CARD_MAX_HEIGHT_RATIO, viewportBottom - viewportTop - margin * 2);
    const targetScale = Math.min(
      COLLECTION_INSPECT_CARD_TARGET_SCALE,
      maxInspectWidth / sourceWidth,
      maxInspectHeight / (sourceHeight * COLLECTION_INSPECT_CARD_VERTICAL_COMPACT_RATIO),
    );
    const inspectWidth = sourceWidth * targetScale;
    const inspectHeight = sourceHeight * targetScale * COLLECTION_INSPECT_CARD_VERTICAL_COMPACT_RATIO;
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

    this.destroyInspectPreview();
    this.destroyDetailPanel();

    const { width, height } = this.scale;
    const transform = this.getInspectCardTransform({ sourceWidth, sourceHeight });
    const accentColor = getDefaultCardAccentColor(card);
    const overlay = this.add.rectangle(width * 0.5, height * 0.5, width, height, 0x000000, 0)
      .setDepth(COLLECTION_INSPECT_CARD_OVERLAY_DEPTH)
      .setInteractive();
    overlay.on('pointerup', () => this.destroyInspectPreview({ animate: true }));
    overlay.on('pointerdown', () => this.destroyInspectPreview({ animate: true }));

    const previewView = createCardPreviewView(this, {
      card,
      x: sourceX,
      y: sourceY,
      width: transform.width,
      height: transform.height,
      accentColor,
      depth: COLLECTION_INSPECT_CARD_DEPTH,
      locale: getActiveLocale(),
      statBadgeScale: COLLECTION_INSPECT_CARD_STAT_BADGE_SCALE,
      typographyScale: COLLECTION_INSPECT_CARD_TYPOGRAPHY_SCALE,
      bodyLineSpacing: COLLECTION_INSPECT_CARD_BODY_LINE_SPACING,
      enableCardIllustration: true,
      showCardNumber: true,
    });

    previewView.root.setAlpha(0).setScale(0.92);
    previewView.glow.setFillStyle(0xfacc15, 0.14);
    previewView.glow.setStrokeStyle(5, 0xfacc15, 0.72);
    previewView.background.setFillStyle(CARD_COLORS.frameSelected, 0.95);
    previewView.background.setStrokeStyle(5, accentColor, 1);
    previewView.selectionOutline?.setStrokeStyle(5, 0xfacc15, 0.92);

    this.tweens.add({
      targets: overlay,
      alpha: COLLECTION_INSPECT_CARD_OVERLAY_ALPHA,
      duration: COLLECTION_INSPECT_CARD_TWEEN_IN_MS,
      ease: 'Quad.easeOut',
    });
    this.tweens.add({
      targets: previewView.root,
      x: transform.x,
      y: transform.y,
      scale: 1,
      alpha: 1,
      duration: COLLECTION_INSPECT_CARD_TWEEN_IN_MS,
      ease: 'Quad.easeOut',
    });

    this.inspectPreview = {
      ...previewView,
      overlay,
      sourceX,
      sourceY,
      previewItems: [previewView.root, overlay],
    };
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
      duration: COLLECTION_INSPECT_CARD_TWEEN_OUT_MS,
      ease: 'Quad.easeIn',
      onComplete: destroyItems,
    });

    if (inspect.overlay?.active) {
      this.tweens.add({
        targets: inspect.overlay,
        alpha: 0,
        duration: COLLECTION_INSPECT_CARD_TWEEN_OUT_MS,
        ease: 'Quad.easeIn',
      });
    }
  }

  openDetailPanel(card) {
    if (this.detailPanel || this.wasScrollDragging()) {
      return;
    }

    this.destroyInspectPreview();
    this.destroyDetailPanel();

    const { width, height } = this.scale;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.72)
      .setDepth(100)
      .setInteractive();
    const panelWidth = Math.min(width - 34, 350);
    const panelHeight = Math.min(height - 158, 430);
    const panel = this.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x0f172a, 0.98)
      .setStrokeStyle(2, 0x93c5fd, 0.92)
      .setDepth(101)
      .setInteractive();

    const detailLines = formatCardDetailLines(card, getActiveLocale());

    const title = this.add
      .text(width / 2, height / 2 - panelHeight / 2 + 30, detailLines[0], {
        fontFamily: 'Arial, sans-serif',
        fontSize: '25px',
        color: '#f8fafc',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: panelWidth - 32 },
      })
      .setOrigin(0.5)
      .setDepth(102);

    const lines = detailLines.slice(1);

    const body = this.add
      .text(width / 2 - panelWidth / 2 + 22, height / 2 - panelHeight / 2 + 76, lines.join('\n'), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        color: '#e5e7eb',
        lineSpacing: 10,
        wordWrap: { width: panelWidth - 44 },
      })
      .setOrigin(0, 0)
      .setDepth(102);

    const backButton = createModalBackButton(this, {
      x: width / 2,
      y: height / 2 + panelHeight / 2 - 36,
      depth: 102,
      width: Math.min(210, Math.max(160, Math.round(width * 0.48))),
      height: 52,
      onPointerUp: () => this.destroyDetailPanel(),
    });

    this.detailPanel = [overlay, panel, title, body, ...backButton.items];
  }

  destroyDetailPanel() {
    this.detailPanel?.forEach((element) => element?.destroy?.());
    this.detailPanel = null;
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
        if (this.detailPanel) {
          this.destroyDetailPanel();
          return;
        }
        this.scene.start('MainMenuScene');
      },
    });
    this.uiElements.push(...backButton.items);
  }

  wasScrollDragging() {
    return Math.abs(this.scrollState?.lastDragDistance ?? 0) > CARD_SCROLL_DRAG_THRESHOLD;
  }

  onScrollWheel(pointer, gameObjects, deltaX, deltaY) {
    const state = this.scrollState;
    if (!state || this.detailPanel || this.inspectPreview || pointer.y < state.viewportTop || pointer.y > state.viewportBottom) {
      return;
    }

    this.setCollectionScrollY(state.content.y - deltaY * 0.45);
  }

  onScrollPointerDown(pointer) {
    const state = this.scrollState;
    if (!state || this.detailPanel || this.inspectPreview || pointer.y < state.viewportTop || pointer.y > state.viewportBottom) {
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
    if (this.inspectPreview) {
      this.destroyInspectPreview({ animate: true });
      this.cancelCardLongPress();
      this.pressedCard = null;
      this.longPressTriggeredCard = null;
      return;
    }

    this.cancelCardLongPress();
    globalThis.setTimeout(() => {
      this.pressedCard = null;
      this.longPressTriggeredCard = null;
    }, 0);
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

    this.cancelCardLongPress();
    this.destroyInspectPreview();
    this.destroyDetailPanel();
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
