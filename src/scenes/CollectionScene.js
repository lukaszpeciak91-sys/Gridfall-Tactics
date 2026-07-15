import Phaser from 'phaser';
import { getFactionByKey, getFactionKeys } from '../data/factions/index.js';
import { getFactionPresentationName } from '../data/presentation/factionPresentation.js';
import {
  MENU_BACKGROUND_FALLBACK_COLOR,
  MENU_BACKGROUND_FALLBACK_COLOR_HEX,
  createAnimatedMenuBackground,
  preloadMenuBackgroundArt,
} from '../rendering/backgroundArt.js';
import { preloadAllCardIllustrations } from '../rendering/cardIllustrationAssets.js';
import { getActiveLocale, translateActive } from '../localization/localeService.js';
import { createModalBackButton } from '../ui/modalControls.js';
import { createMenuScreenHeader } from '../ui/screenHeader.js';
import { preloadSecondaryButtonAsset } from '../ui/imageButton.js';
import { FACTION_CARD_DETAILS } from '../ui/factionCards.js';
import { preloadAudioAssets } from '../audio/audioAssets.js';
import { playMenuMusic } from '../audio/menuMusic.js';
import { emitSceneTransitionVisuallyReady } from './sceneTransitionOverlay.js';
import { CARD_COLORS, createCardPreviewView, getDefaultCardAccentColor, resolveCardSurfaceTheme } from '../rendering/cardVisualLayout.js';
import { HAND_CARD_ASPECT_RATIO } from '../ui/handLayout.js';
import { getCollectionInspectCardTransform, getCollectionViewportBounds } from '../ui/collectionInspectTransform.js';
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
const COLLECTION_SECTION_TITLE_STRIP_HEIGHT = 54;
const COLLECTION_SECTION_TITLE_STRIP_RADIUS = 10;
const COLLECTION_SECTION_TITLE_STRIP_ALPHA = 0.58;
const COLLECTION_SECTION_TITLE_STRIP_TINT_ALPHA = 0.055;
const COLLECTION_SECTION_TITLE_STRIP_STROKE_ALPHA = 0.48;
const COLLECTION_SECTION_HEADER_TEXT_FONT_SIZE = 22;
const COLLECTION_SECTION_HEADER_TOP_INSET = 6;
const COLLECTION_SECTION_CARD_TOP_GAP = 8;
const COLLECTION_ACCORDION_TOP_OFFSET = 8;

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
    this.expandedFactionKeys = new Set();
    this.collectionContentElements = [];
    this.headerPress = null;
    this.transitionReadyEmitted = false;
    this.transitionReadyPostRenderCallback = null;
    this.transitionReadyFallbackEvent = null;
  }

  preload() {
    preloadMenuBackgroundArt(this);
    preloadSecondaryButtonAsset(this);
    preloadAllCardIllustrations(this);
    preloadAudioAssets(this);
  }

  init(data = {}) {
    this.cleanupScene();
    this.sceneTransitionOverlay = data?.sceneTransitionOverlay ?? null;
    this.transitionReadyEmitted = false;
  }

  create() {
    this.cleanupScene();
    playMenuMusic(this);

    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor(MENU_BACKGROUND_FALLBACK_COLOR_HEX);
    this.menuBackground = createAnimatedMenuBackground(this, {
      fallbackColor: MENU_BACKGROUND_FALLBACK_COLOR,
      width,
      height,
      lightSweep: false,
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);

    const header = createMenuScreenHeader(this, {
      title: translateActive('ui.collection.title', 'COLLECTION'),
      width,
      height,
    });
    this.uiElements.push(...header.items);

    this.expandedFactionKeys = new Set();
    this.drawCollectionList({ width, height });
    this.createBackButton(width, height);
    this.scheduleTransitionReadyAfterFirstRender();
  }

  drawCollectionList({ width, height }) {
    const { viewportTop, viewportBottom } = getCollectionViewportBounds(height);
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

    this.scrollState = {
      content,
      maxY: viewportTop,
      minY: viewportTop,
      viewportTop,
      viewportBottom,
      viewportHeight,
      pointerId: null,
      pointerStartY: 0,
      contentStartY: viewportTop,
      lastDragDistance: 0,
    };

    this.rebuildCollectionContent({ width });

    this.input.on('wheel', this.onScrollWheel, this);
    this.input.on('pointerdown', this.onScrollPointerDown, this);
    this.input.on('pointermove', this.onScrollPointerMove, this);
    this.input.on('pointerup', this.onScrollPointerUp, this);
    this.input.on('pointerup', this.onCollectionPointerUp, this);
    this.input.on('pointerupoutside', this.onCollectionPointerUp, this);
    this.input.keyboard?.on('keydown-ESC', this.onBackRequested, this);
    this.input.keyboard?.on('keydown-BACKSPACE', this.onBackRequested, this);
  }

  rebuildCollectionContent({ width }) {
    const state = this.scrollState;
    if (!state) {
      return;
    }

    this.destroyCollectionContentElements();

    const sideMargin = 14;
    const columnGap = COLLECTION_GRID_GAP_X;
    const cardWidth = (width - sideMargin * 2 - columnGap) / 2;
    const cardHeight = Math.round(cardWidth * HAND_CARD_ASPECT_RATIO);
    let cursorY = COLLECTION_ACCORDION_TOP_OFFSET;

    getFactionKeys().forEach((factionKey) => {
      const faction = getFactionByKey(factionKey);
      cursorY = this.drawFactionSection(state.content, factionKey, faction, {
        x: sideMargin,
        y: cursorY,
        cardWidth,
        cardHeight,
        columnGap,
        expanded: this.expandedFactionKeys.has(factionKey),
      });
      cursorY += COLLECTION_SECTION_GAP_Y;
    });

    state.minY = state.viewportTop - Math.max(0, cursorY - state.viewportHeight);
    this.setCollectionScrollY(state.content.y);
  }

  trackCollectionContentElement(element) {
    this.collectionContentElements.push(element);
    this.uiElements.push(element);
    return element;
  }

  destroyCollectionContentElements() {
    const elements = this.collectionContentElements;
    if (!elements.length) return;

    const elementSet = new Set(elements);
    elements.forEach((element) => {
      element?.removeAllListeners?.();
      element?.destroy?.();
    });
    this.uiElements = this.uiElements.filter((element) => !elementSet.has(element));
    this.collectionContentElements = [];
  }

  drawFactionSection(content, factionKey, faction, { x, y, cardWidth, cardHeight, columnGap, expanded = true }) {
    const stripWidth = this.scale.width - x * 2;
    const stripY = y - 2;
    const factionAccentColor = FACTION_CARD_DETAILS[factionKey]?.accentColor ?? 0x38bdf8;
    const titleStrip = this.add.graphics();
    titleStrip.fillStyle(0x020817, COLLECTION_SECTION_TITLE_STRIP_ALPHA);
    titleStrip.fillRoundedRect(x, stripY, stripWidth, COLLECTION_SECTION_TITLE_STRIP_HEIGHT, COLLECTION_SECTION_TITLE_STRIP_RADIUS);
    titleStrip.fillStyle(factionAccentColor, COLLECTION_SECTION_TITLE_STRIP_TINT_ALPHA);
    titleStrip.fillRoundedRect(x, stripY, stripWidth, COLLECTION_SECTION_TITLE_STRIP_HEIGHT, COLLECTION_SECTION_TITLE_STRIP_RADIUS);
    titleStrip.lineStyle(1, factionAccentColor, COLLECTION_SECTION_TITLE_STRIP_STROKE_ALPHA);
    titleStrip.strokeRoundedRect(x, stripY, stripWidth, COLLECTION_SECTION_TITLE_STRIP_HEIGHT, COLLECTION_SECTION_TITLE_STRIP_RADIUS);
    titleStrip.setInteractive(
      new Phaser.Geom.Rectangle(x, stripY, stripWidth, COLLECTION_SECTION_TITLE_STRIP_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    titleStrip.on('pointerdown', (pointer) => this.onFactionHeaderPointerDown(factionKey, pointer));
    titleStrip.on('pointerup', (pointer) => this.onFactionHeaderPointerUp(factionKey, pointer));
    content.add(titleStrip);
    this.trackCollectionContentElement(titleStrip);

    const header = this.add
      .text(this.scale.width / 2, stripY + COLLECTION_SECTION_TITLE_STRIP_HEIGHT / 2, getFactionPresentationName(faction?.id, getActiveLocale(), faction?.name ?? factionKey), {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${COLLECTION_SECTION_HEADER_TEXT_FONT_SIZE}px`,
        color: '#93c5fd',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5, 0.5);
    header.setInteractive({ useHandCursor: true });
    header.on('pointerdown', (pointer) => this.onFactionHeaderPointerDown(factionKey, pointer));
    header.on('pointerup', (pointer) => this.onFactionHeaderPointerUp(factionKey, pointer));
    content.add(header);
    this.trackCollectionContentElement(header);

    const headerBottom = stripY + COLLECTION_SECTION_TITLE_STRIP_HEIGHT;
    if (!expanded) {
      return headerBottom + COLLECTION_SECTION_HEADER_TOP_INSET;
    }

    const deck = faction?.deck ?? [];
    const rowsPerColumn = Math.max(COLLECTION_CARDS_PER_COLUMN, Math.ceil(deck.length / 2));
    const gridTop = headerBottom + COLLECTION_SECTION_CARD_TOP_GAP;

    deck.forEach((card, index) => {
      const column = Math.floor(index / rowsPerColumn);
      const row = index % rowsPerColumn;
      this.drawCardPreview(content, card, {
        x: x + column * (cardWidth + columnGap),
        y: gridTop + row * (cardHeight + COLLECTION_CARD_GAP_Y),
        width: cardWidth,
        height: cardHeight,
        factionThemeId: faction?.id ?? factionKey,
      });
    });

    return gridTop + rowsPerColumn * cardHeight + Math.max(0, rowsPerColumn - 1) * COLLECTION_CARD_GAP_Y;
  }

  toggleFactionSection(factionKey) {
    if (this.inspectPreview) {
      return;
    }

    if (this.expandedFactionKeys.has(factionKey)) {
      this.expandedFactionKeys.delete(factionKey);
    } else {
      this.expandedFactionKeys.add(factionKey);
    }

    this.rebuildCollectionContent({ width: this.scale.width });
  }

  onFactionHeaderPointerDown(factionKey, pointer) {
    const state = this.scrollState;
    if (!state || this.inspectPreview || pointer.y < state.viewportTop || pointer.y > state.viewportBottom) {
      return;
    }

    this.headerPress = { factionKey, pointerId: pointer.id };
  }

  onFactionHeaderPointerUp(factionKey, pointer) {
    const press = this.headerPress;
    this.headerPress = null;

    const state = this.scrollState;
    if (!state || this.inspectPreview || !press || press.factionKey !== factionKey || press.pointerId !== pointer.id) {
      return;
    }
    if (pointer.y < state.viewportTop || pointer.y > state.viewportBottom || this.wasScrollDragging()) {
      return;
    }

    this.toggleFactionSection(factionKey);
  }

  drawCardPreview(content, card, { x, y, width, height, factionThemeId = '' }) {
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
      surfaceTheme: resolveCardSurfaceTheme({ factionId: factionThemeId, mode: 'hand' }),
      showNonUnitEffectStatSymbols: true,
    });
    content.add(preview.root);
    this.trackCollectionContentElement(preview.root);

    preview.background.setInteractive({ useHandCursor: true });
    preview.background.on('pointerdown', (pointer) => {
      const bounds = preview.root.getBounds();
      this.onCardPointerDown(card, {
        pointer,
        sourceX: bounds.centerX,
        sourceY: bounds.centerY,
        sourceWidth: width,
        sourceHeight: height,
        factionThemeId,
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
    return getCollectionInspectCardTransform({
      screenWidth: width,
      screenHeight: height,
      sourceWidth,
      sourceHeight,
      viewportTop: this.scrollState?.viewportTop,
      viewportBottom: this.scrollState?.viewportBottom,
    });
  }

  showInspectPreview({ card, sourceX, sourceY, sourceWidth, sourceHeight, factionThemeId = '' }) {
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
      surfaceTheme: resolveCardSurfaceTheme({ factionId: factionThemeId, mode: 'inspect' }),
      showNonUnitEffectStatSymbols: true,
    });
    const inspectSurfaceTheme = resolveCardSurfaceTheme({ factionId: factionThemeId, mode: 'inspect' });

    previewView.root.setAlpha(0).setScale(0.92);
    previewView.glow.setFillStyle(0xfacc15, 0.14);
    previewView.glow.setStrokeStyle(5, 0xfacc15, 0.72);
    previewView.background.setFillStyle(inspectSurfaceTheme.frameSelectedFill, 0.95);
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
  }

  destroyInspectPreview({ animate = false } = {}) {
    if (!this.inspectPreview) return;

    const inspect = this.inspectPreview;
    const safeDisableInteractive = (item) => {
      if (!item || !item.scene || item.active === false) return;
      item.disableInteractive?.();
    };
    const safeRemoveListeners = (item) => {
      item?.removeAllListeners?.();
    };
    const safeDestroy = (item) => {
      if (!item || item.active === false || item.destroyed || item._destroyed) return;
      try {
        item.destroy?.();
      } catch (error) {
        // Stale Phaser objects can lose their scene during teardown; cleanup must remain no-throw.
      }
    };
    const safeDeactivateInspect = () => {
      if (typeof inspect.deactivate !== 'function') return;
      try {
        inspect.deactivate();
      } catch (error) {
        // Shared preview deactivate may encounter stale Phaser objects during scene teardown.
      }
    };
    const inspectItems = [
      ...(inspect.items ?? []),
      inspect.root,
      inspect.overlay,
      inspect.glow,
      inspect.background,
      inspect.label,
      inspect.nameText,
      inspect.bodyText,
      inspect.cardNumberOverlay,
      inspect.selectionOutline,
      inspect.statBar,
      inspect.statBadges,
      inspect.art,
      ...(inspect.previewItems ?? []),
    ].filter(Boolean);
    const uniqueInspectItems = [...new Set(inspectItems)];

    safeDeactivateInspect();
    uniqueInspectItems.forEach((item) => {
      safeDisableInteractive(item);
      safeRemoveListeners(item);
    });

    this.tweens?.killTweensOf?.(uniqueInspectItems);
    this.inspectPreview = null;

    let destroyed = false;
    const destroyItems = () => {
      if (destroyed) return;
      destroyed = true;
      uniqueInspectItems.forEach((item) => {
        safeDisableInteractive(item);
        safeRemoveListeners(item);
      });
      safeRemoveListeners(inspect.overlay);
      safeDestroy(inspect.overlay);
      if (typeof inspect.destroy === 'function') {
        try {
          inspect.destroy();
        } catch (error) {
          // Shared preview destroy may re-run deactivate on stale objects; fall back to root cleanup.
          safeDestroy(inspect.root);
        }
      } else {
        safeDestroy(inspect.root);
      }
    };

    if (!animate || !inspect.root?.active) {
      destroyItems();
      return;
    }

    this.time?.delayedCall?.(INSPECT_CARD_TWEEN_OUT_MS + 50, destroyItems);
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

  scheduleTransitionReadyAfterFirstRender() {
    const transitionId = this.sceneTransitionOverlay?.transitionId;
    if (typeof transitionId !== 'string' || !transitionId || this.transitionReadyEmitted || this.transitionReadyPostRenderCallback) return;

    const runOnce = () => {
      if (this.transitionReadyEmitted || !this.scene?.isActive?.(this.scene.key)) return;
      this.clearPendingTransitionReadyCallbacks();
      this.emitTransitionReadyIfNeeded();
    };

    this.transitionReadyPostRenderCallback = runOnce;
    const postRenderEvent = Phaser.Core?.Events?.POST_RENDER ?? 'postrender';
    this.game?.events?.once?.(postRenderEvent, runOnce);
    this.transitionReadyFallbackEvent = this.time?.delayedCall?.(120, runOnce) ?? null;
  }

  clearPendingTransitionReadyCallbacks() {
    if (this.transitionReadyPostRenderCallback) {
      const postRenderEvent = Phaser.Core?.Events?.POST_RENDER ?? 'postrender';
      this.game?.events?.off?.(postRenderEvent, this.transitionReadyPostRenderCallback);
      this.transitionReadyPostRenderCallback = null;
    }
    this.transitionReadyFallbackEvent?.remove?.(false);
    this.transitionReadyFallbackEvent = null;
  }

  emitTransitionReadyIfNeeded() {
    const transitionId = this.sceneTransitionOverlay?.transitionId;
    if (typeof transitionId !== 'string' || !transitionId || this.transitionReadyEmitted) return;
    this.transitionReadyEmitted = true;
    emitSceneTransitionVisuallyReady(this, { transitionId });
  }

  cleanupScene() {
    this.input?.off('wheel', this.onScrollWheel, this);
    this.input?.off('pointerdown', this.onScrollPointerDown, this);
    this.input?.off('pointermove', this.onScrollPointerMove, this);
    this.input?.off('pointerup', this.onScrollPointerUp, this);
    this.input?.off('pointerup', this.onCollectionPointerUp, this);
    this.input?.off('pointerupoutside', this.onCollectionPointerUp, this);
    this.headerPress = null;
    this.input?.keyboard?.off('keydown-ESC', this.onBackRequested, this);
    this.input?.keyboard?.off('keydown-BACKSPACE', this.onBackRequested, this);
    this.clearPendingTransitionReadyCallbacks();

    this.cancelCardLongPress();
    this.destroyInspectPreview();
    this.destroyCollectionContentElements();
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
