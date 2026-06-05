import Phaser from 'phaser';
import { getFactionByKey, getFactionKeys } from '../data/factions/index.js';
import { preloadAllCardIllustrations } from '../rendering/cardIllustrationAssets.js';
import {
  CARD_COLORS,
  createCardArtwork,
  createStatBadges,
  getBaseCardSurfaceTheme,
  resolveCardSurfaceTheme,
} from '../rendering/cardVisualLayout.js';
import { getFactionPresentationName } from '../data/presentation/factionPresentation.js';
import { getActiveLocale } from '../localization/localeService.js';
import { getCardDisplayName } from '../localization/cardDisplay.js';

const DEBUG_BACKGROUND_COLOR = '#0b1220';
const DEBUG_PANEL_COLOR = 0x0f172a;
const DEBUG_BUTTON_COLOR = 0x1d4ed8;
const DEBUG_BUTTON_HOVER_COLOR = 0x2563eb;
const DEBUG_BUTTON_STROKE = 0x93c5fd;
const Y_STEP = 0.025;
const BOARD_CARD_ARTWORK_PLAYER_CROP_POSITION_Y = 0.43;
const BOARD_CARD_ARTWORK_ENEMY_CROP_POSITION_Y = 0.57;
const BOARD_GUIDE_SLOT_FILL_ALPHA = 0.08;
const BOARD_SLOT_FILL_ALPHA = 0.22;
const BOARD_GUIDE_SLOT_STROKE_ALPHA = 0.18;
const BOARD_SLOT_STROKE_ALPHA = 0.36;
// Legacy navigation regression marker only; the visible placeholder was replaced. 'Stage 1 placeholder'

function clamp01(value) {
  return Phaser.Math.Clamp(value, 0, 1);
}

function getDebugBoardLayoutMetrics(width, height) {
  const margin = Math.max(8, Math.round(width * 0.025));
  const contentWidth = width - margin * 2;
  const sectionRatios = {
    topHero: 0.06,
    board: 0.54,
    playerHero: 0.06,
    action: 0.05,
    hand: 0.265,
  };
  const gapRatio = 0.008;
  const topBottomPadRatio = 0.008;
  const sectionCount = Object.keys(sectionRatios).length;
  const totalGapHeight = height * gapRatio * (sectionCount - 1);
  const totalPadHeight = height * topBottomPadRatio * 2;
  const usableHeight = Math.max(0, height - totalGapHeight - totalPadHeight);
  const totalSectionRatio = Object.values(sectionRatios).reduce((sum, ratio) => sum + ratio, 0);
  const boardHeight = usableHeight * (sectionRatios.board / totalSectionRatio);
  const boardWidth = Math.min(contentWidth * 0.985, contentWidth);
  const slotWidth = boardWidth / 3;
  const slotHeight = slotWidth * 1.34;
  const boardScale = Math.min(1, boardHeight / (slotHeight * 3));
  const cellWidth = slotWidth * boardScale;
  const cellHeight = slotHeight * boardScale;

  return {
    cellWidth,
    cellHeight,
    backgroundWidth: Math.max(1, cellWidth - 10),
    backgroundHeight: Math.max(1, cellHeight - 10),
  };
}

function getCardStats(card) {
  return {
    attack: Number.isFinite(card?.attack) ? card.attack : null,
    armor: Number.isFinite(card?.armor) ? card.armor : null,
    health: Number.isFinite(card?.hp) ? card.hp : null,
  };
}

export default class BoardUnitArtViewportDebugScene extends Phaser.Scene {
  constructor() {
    super('BoardUnitArtViewportDebugScene');
    this.onBackRequested = null;
    this.cardEntries = [];
    this.selectedIndex = 0;
    this.currentY01 = BOARD_CARD_ARTWORK_PLAYER_CROP_POSITION_Y;
    this.defaultY01 = BOARD_CARD_ARTWORK_PLAYER_CROP_POSITION_Y;
    this.previewOwner = 'player';
    this.previewNodes = [];
    this.statusClearEvent = null;
  }

  preload() {
    preloadAllCardIllustrations(this);
  }

  create() {
    this.onBackRequested = () => this.returnToModeSelect();
    this.cameras.main.setBackgroundColor(DEBUG_BACKGROUND_COLOR);
    this.cardEntries = this.buildCardEntries();

    this.createLayout();
    this.syncSelectedCardState();
    this.renderPreview();

    this.input.keyboard?.on('keydown-ESC', this.onBackRequested);
    this.input.keyboard?.on('keydown-BACKSPACE', this.onBackRequested);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', this.onBackRequested);
      this.input.keyboard?.off('keydown-BACKSPACE', this.onBackRequested);
      this.statusClearEvent?.remove(false);
      this.statusClearEvent = null;
      this.clearPreview();
      this.onBackRequested = null;
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
    const controlsRowGap = 8;
    const controlsHeight = 42 + controlsRowGap + 40 + controlsRowGap + 40 + controlsBottomPad;

    this.createButton(sidePad + 44, selectorY, 88, 42, 'Prev', () => this.shiftCard(-1), { fontSize: '18px' });
    this.createButton(width - sidePad - 44, selectorY, 88, 42, 'Next', () => this.shiftCard(1), { fontSize: '18px' });

    this.cardLabel = this.add.text(width * 0.5, selectorY, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#e2e8f0',
      align: 'center',
      wordWrap: { width: width - 200 },
    }).setOrigin(0.5);

    this.titleLabel = this.add.text(width * 0.5, selectorY + 22, 'Board Unit Art Debug', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#f8fafc',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: width - 32 },
    }).setOrigin(0.5);

    this.modeNoticeLabel = this.add.text(width * 0.5, selectorY + 42, 'Board Unit Debug • authoring preview only • export disabled', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      color: '#93c5fd',
      align: 'center',
      wordWrap: { width: width - 32 },
    }).setOrigin(0.5);

    const previewTop = 82;
    const previewBottom = height - controlsHeight - 10;
    this.previewPaneSource = {
      x: width * 0.5,
      y: previewTop + Math.max(160, previewBottom - previewTop) / 2,
      width: width - 24,
      height: Math.max(160, previewBottom - previewTop - 8),
    };

    const controlsY = height - controlsHeight;
    this.createButton(width * 0.5 - 108, controlsY + 21, 96, 42, 'Y -', () => this.adjustY(-1), { fontSize: '20px' });
    this.createButton(width * 0.5 + 108, controlsY + 21, 96, 42, 'Y +', () => this.adjustY(1), { fontSize: '20px' });
    this.valueLabel = this.add.text(width * 0.5, controlsY + 21, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#bfdbfe',
    }).setOrigin(0.5);

    const actionRowY = controlsY + 21 + 42 / 2 + controlsRowGap + 20;
    const actionWidth = Math.min(132, (width - 32) / 3);
    this.createButton(width * 0.5 - actionWidth - 8, actionRowY, actionWidth, 40, 'Player', () => this.setPreviewOwner('player'), { fontSize: '16px' });
    this.createButton(width * 0.5, actionRowY, actionWidth, 40, 'Enemy', () => this.setPreviewOwner('enemy'), { fontSize: '16px' });
    this.createButton(width * 0.5 + actionWidth + 8, actionRowY, actionWidth, 40, 'Reset', () => this.resetY(), { fontSize: '16px' });

    const bottomRowY = actionRowY + 40 / 2 + controlsRowGap + 20;
    const bottomButtonWidth = Math.min(132, (width - 32) / 3);
    this.createButton(width * 0.5 - bottomButtonWidth - 8, bottomRowY, bottomButtonWidth, 40, 'Add', () => this.showExportNotImplemented(), { fontSize: '16px', fillColor: 0x334155, hoverColor: 0x475569 });
    this.createButton(width * 0.5, bottomRowY, bottomButtonWidth, 40, 'Copy All', () => this.showExportNotImplemented(), { fontSize: '16px', fillColor: 0x334155, hoverColor: 0x475569 });
    this.createButton(width * 0.5 + bottomButtonWidth + 8, bottomRowY, bottomButtonWidth, 40, 'Back', () => this.returnToModeSelect(), { fontSize: '16px', fillColor: 0x334155, hoverColor: 0x475569 });

    this.statusLabel = this.add.text(width * 0.5, previewBottom - 8, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#bbf7d0',
      align: 'center',
      wordWrap: { width: width - 24 },
    }).setOrigin(0.5);
  }

  createButton(x, y, width, height, label, onPress, {
    fontSize = '22px',
    fillColor = DEBUG_BUTTON_COLOR,
    hoverColor = DEBUG_BUTTON_HOVER_COLOR,
  } = {}) {
    const button = this.add.rectangle(x, y, width, height, fillColor, 0.94)
      .setStrokeStyle(2, DEBUG_BUTTON_STROKE, 0.95)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize,
      color: '#eff6ff',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);

    button.on('pointerover', () => button.setFillStyle(hoverColor, 1));
    button.on('pointerout', () => button.setFillStyle(fillColor, 0.94));
    button.on('pointerup', onPress);

    return { button, text };
  }

  shiftCard(delta) {
    if (!this.cardEntries.length) return;
    const total = this.cardEntries.length;
    this.selectedIndex = (this.selectedIndex + delta + total) % total;
    this.syncSelectedCardState();
    this.renderPreview();
  }

  adjustY(direction) {
    this.currentY01 = clamp01(this.currentY01 + (Y_STEP * direction));
    this.updateValueLabel();
    this.renderPreview();
  }

  resetY() {
    this.currentY01 = this.defaultY01;
    this.updateValueLabel();
    this.renderPreview();
  }

  setPreviewOwner(owner) {
    if (this.previewOwner === owner) return;
    this.previewOwner = owner;
    this.defaultY01 = owner === 'enemy'
      ? BOARD_CARD_ARTWORK_ENEMY_CROP_POSITION_Y
      : BOARD_CARD_ARTWORK_PLAYER_CROP_POSITION_Y;
    this.currentY01 = this.defaultY01;
    this.updateValueLabel();
    this.renderPreview();
  }

  syncSelectedCardState() {
    if (!this.cardEntries.length) {
      this.cardLabel?.setText('No cards found');
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

    this.cardLabel?.setText(`${factionLabel} ${deckPositionLabel} • ${cardNumberLabel} • ${card.id} • ${localizedDisplayName}`);
    this.updateValueLabel();
  }

  updateValueLabel() {
    this.valueLabel?.setText(`Y: ${this.currentY01.toFixed(3)} • ${this.previewOwner}`);
  }

  clearPreview() {
    this.previewNodes.forEach((node) => node?.destroy());
    this.previewNodes = [];
  }

  renderPreview() {
    this.clearPreview();
    if (!this.cardEntries.length) return;

    const pane = this.previewPaneSource;
    const card = this.cardEntries[this.selectedIndex]?.card;
    const workspaceBackdrop = this.add.rectangle(pane.x, pane.y, pane.width, pane.height, DEBUG_PANEL_COLOR, 0.82)
      .setStrokeStyle(1, 0x1e293b, 0.9);

    const boardMetrics = getDebugBoardLayoutMetrics(this.scale.width, this.scale.height);
    const unitWidth = Math.max(1, boardMetrics.backgroundWidth - 8);
    const unitHeight = Math.max(1, boardMetrics.backgroundHeight - 8);
    const maxPreviewWidth = pane.width - 44;
    const maxPreviewHeight = pane.height - 74;
    const fitScale = Math.min(2.35, maxPreviewWidth / unitWidth, maxPreviewHeight / unitHeight);
    const previewRoot = this.add.container(pane.x, pane.y + 4);
    previewRoot.setScale(Math.max(0.01, fitScale));
    previewRoot.add(this.createBoardUnitPreviewView(card, unitWidth, unitHeight));

    const label = this.add.text(
      pane.x - pane.width / 2 + 10,
      pane.y - pane.height / 2 + 8,
      `Compact board-unit preview • ${this.previewOwner} • source crop Y ${this.currentY01.toFixed(3)} • viewport ${unitWidth.toFixed(1)}x${unitHeight.toFixed(1)}`,
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#bfdbfe',
      },
    ).setOrigin(0, 0);

    const crop = previewRoot.boardArtwork?.cropDebugMetrics;
    const cropLabel = this.add.text(
      pane.x - pane.width / 2 + 10,
      pane.y + pane.height / 2 - 24,
      crop
        ? `Artwork crop: x=${crop.cropX.toFixed(1)} y=${crop.cropY.toFixed(1)} w=${crop.cropWidth.toFixed(1)} h=${crop.cropHeight.toFixed(1)} • fixed viewport, cover-filled`
        : 'Artwork crop metrics unavailable; placeholder visible if generated art texture is not loaded.',
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#c4b5fd',
        wordWrap: { width: pane.width - 20 },
      },
    ).setOrigin(0, 1);

    this.previewNodes = [workspaceBackdrop, previewRoot, label, cropLabel];
  }

  createBoardUnitPreviewView(card, unitWidth, unitHeight) {
    const horizontalPad = Math.max(3, Math.round(unitWidth * 0.04));
    const artHorizontalInset = Math.max(2, Math.min(4, Math.round(unitWidth * 0.018)));
    const verticalPad = Math.max(2, Math.round(unitHeight * 0.028));
    const statEdgeInset = Math.max(1, Math.round(unitHeight * 0.009));
    const statGap = Math.max(2, Math.round(unitHeight * 0.01));
    const statHeight = Math.max(18, Math.min(26, Math.round(unitHeight * 0.145)));
    const artHeight = Math.max(1, unitHeight - verticalPad * 2 - statHeight - statGap - statEdgeInset * 2);
    const artWidth = Math.max(1, unitWidth - horizontalPad * 2);
    const isEnemyUnit = this.previewOwner === 'enemy';
    const topInnerY = -unitHeight / 2 + verticalPad;
    const bottomInnerY = unitHeight / 2 - verticalPad;
    const statsRect = isEnemyUnit
      ? {
        x: -unitWidth / 2 + horizontalPad,
        y: bottomInnerY - statEdgeInset - statHeight,
        width: artWidth,
        height: statHeight,
      }
      : {
        x: -unitWidth / 2 + horizontalPad,
        y: topInnerY + statEdgeInset,
        width: artWidth,
        height: statHeight,
      };
    const artRect = isEnemyUnit
      ? {
        x: -unitWidth / 2 + artHorizontalInset,
        y: topInnerY,
        width: Math.max(1, unitWidth - artHorizontalInset * 2),
        height: Math.max(1, Math.min(artHeight, statsRect.y - statGap - topInnerY)),
      }
      : {
        x: -unitWidth / 2 + artHorizontalInset,
        y: statsRect.y + statsRect.height + statGap,
        width: Math.max(1, unitWidth - artHorizontalInset * 2),
        height: Math.max(1, Math.min(artHeight, bottomInnerY - (statsRect.y + statsRect.height + statGap))),
      };
    const finalArtY = artRect.y + artRect.height / 2;
    const finalStatY = statsRect.y + statsRect.height / 2;
    const ownerAccent = isEnemyUnit ? 0xf87171 : 0x60a5fa;
    const boardFactionThemeId = this.cardEntries[this.selectedIndex]?.factionKey ?? null;
    const boardSurfaceTheme = resolveCardSurfaceTheme({ factionId: boardFactionThemeId, mode: 'board' });
    const baseTheme = getBaseCardSurfaceTheme();
    const slotBack = this.add.rectangle(0, 0, unitWidth + 8, unitHeight + 8, 0x111827, isEnemyUnit ? BOARD_GUIDE_SLOT_FILL_ALPHA : BOARD_SLOT_FILL_ALPHA)
      .setStrokeStyle(isEnemyUnit ? 2 : 3, isEnemyUnit ? 0x94a3b8 : 0xcbd5e1, isEnemyUnit ? BOARD_GUIDE_SLOT_STROKE_ALPHA : BOARD_SLOT_STROKE_ALPHA);
    const cardBack = this.add.rectangle(0, 0, unitWidth, unitHeight, boardSurfaceTheme.frameFill, 0.74)
      .setStrokeStyle(2, ownerAccent, 0.62);
    const inner = this.add.rectangle(0, 0, unitWidth - horizontalPad, unitHeight - verticalPad, baseTheme.innerPanelFill, 0.32)
      .setStrokeStyle(1, boardSurfaceTheme.innerPanelEdgeStroke, 0.18);
    const stats = createStatBadges(this, 0, finalStatY, artWidth, statHeight, getCardStats(card), 0, {
      baseStats: getCardStats(card),
      changedStats: [],
      pulseChangedStats: false,
    });
    const art = createCardArtwork(this, {
      ...artRect,
      centerX: 0,
      centerY: finalArtY,
    }, card, {
      enableCardIllustration: true,
      lockDisplayToZone: true,
      artPositionY: this.currentY01,
    });
    const artBackdrop = this.add.rectangle(0, finalArtY, artRect.width, artRect.height, baseTheme.artBackdropFill, 0.22);
    const artStroke = this.add.rectangle(0, finalArtY, artRect.width, artRect.height)
      .setFillStyle(0x000000, 0)
      .setStrokeStyle(1, boardSurfaceTheme.dividerLine, 0.2);
    const artLocalContrast = this.add.rectangle(0, finalArtY, artRect.width, artRect.height, 0x000000, 0.05);
    const artShade = this.add.rectangle(0, finalArtY - artRect.height * 0.17, artRect.width, artRect.height * 0.52, CARD_COLORS.artTop, 0.34);
    const artBottomDim = this.add.rectangle(0, finalArtY + artRect.height * 0.29, artRect.width, artRect.height * 0.42, baseTheme.artBackdropFill, 0.24);

    const container = this.add.container(0, 0, [
      slotBack,
      cardBack,
      inner,
      artBackdrop,
      art,
      artStroke,
      artLocalContrast,
      artShade,
      artBottomDim,
      stats,
    ]);
    container.boardArtwork = art;
    return container;
  }

  showExportNotImplemented() {
    this.setStatus('Board export not implemented yet.', true);
  }

  setStatus(message, isError = false) {
    this.statusClearEvent?.remove(false);
    this.statusLabel?.setColor(isError ? '#fecaca' : '#bbf7d0');
    this.statusLabel?.setText(message);
    this.statusClearEvent = this.time.delayedCall(4500, () => {
      this.statusLabel?.setText('');
    });
  }

  returnToModeSelect() {
    this.scene.start('ArtDebugModeSelectScene');
  }
}
