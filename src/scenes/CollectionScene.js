import Phaser from 'phaser';
import { getFactionByKey, getFactionKeys } from '../data/factions/index.js';
import {
  MENU_BACKGROUND_FALLBACK_COLOR,
  MENU_BACKGROUND_FALLBACK_COLOR_HEX,
  createCoverBackground,
  getMenuBackgroundAsset,
  preloadMenuBackgroundArt,
} from '../rendering/backgroundArt.js';

const CARD_SCROLL_DRAG_THRESHOLD = 8;
const DETAIL_FIELDS = ['targeting', 'effectId'];

function isUnitCard(card) {
  return card?.type === 'unit' || (Number.isFinite(card?.attack) && Number.isFinite(card?.hp));
}

function getStatsLabel(card) {
  return isUnitCard(card) ? `ATK ${card.attack ?? '-'} / HP ${card.hp ?? '-'}` : null;
}

export default class CollectionScene extends Phaser.Scene {
  constructor() {
    super('CollectionScene');
    this.uiElements = [];
    this.scrollMask = null;
    this.scrollState = null;
    this.detailPanel = null;
  }

  preload() {
    preloadMenuBackgroundArt(this);
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
      .text(width / 2, 42, 'COLLECTION', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '32px',
        color: '#f8fafc',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.uiElements.push(title);

    const subtitle = this.add
      .text(width / 2, 72, 'Tap a card for details', {
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
    const cardWidth = width - sideMargin * 2;
    let cursorY = 0;

    getFactionKeys().forEach((factionKey) => {
      const faction = getFactionByKey(factionKey);
      cursorY = this.drawFactionSection(content, factionKey, faction, {
        x: sideMargin,
        y: cursorY,
        cardWidth,
      });
      cursorY += 18;
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
  }

  drawFactionSection(content, factionKey, faction, { x, y, cardWidth }) {
    const header = this.add
      .text(x, y, faction?.name ?? factionKey, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '21px',
        color: '#93c5fd',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0);
    content.add(header);
    this.uiElements.push(header);

    let cursorY = y + 32;
    (faction?.deck ?? []).forEach((card) => {
      this.drawCardRow(content, card, {
        x,
        y: cursorY,
        width: cardWidth,
        height: 72,
      });
      cursorY += 80;
    });

    return cursorY;
  }

  drawCardRow(content, card, { x, y, width, height }) {
    const row = this.add.graphics();
    row.fillStyle(0x0f172a, 0.92);
    row.fillRoundedRect(x, y, width, height, 12);
    row.lineStyle(1, 0x334155, 0.95);
    row.strokeRoundedRect(x + 1, y + 1, width - 2, height - 2, 11);
    content.add(row);
    this.uiElements.push(row);

    const name = this.add
      .text(x + 12, y + 10, card.name, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        color: '#f8fafc',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0);
    content.add(name);
    this.uiElements.push(name);

    const statsLabel = getStatsLabel(card);
    const typeStats = this.add
      .text(x + 12, y + 34, statsLabel ? `${card.type} • ${statsLabel}` : card.type, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#cbd5e1',
      })
      .setOrigin(0, 0);
    content.add(typeStats);
    this.uiElements.push(typeStats);

    const textShort = this.add
      .text(x + 122, y + 12, card.textShort ?? '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#e5e7eb',
        wordWrap: { width: width - 136 },
      })
      .setOrigin(0, 0);
    content.add(textShort);
    this.uiElements.push(textShort);

    const zone = this.add.zone(x + width / 2, y + height / 2, width, height).setInteractive({ useHandCursor: true });
    zone.on('pointerup', (pointer) => {
      const state = this.scrollState;
      if (!state || pointer.y < state.viewportTop || pointer.y > state.viewportBottom) {
        return;
      }
      this.openDetailPanel(card);
    });
    content.add(zone);
    this.uiElements.push(zone);
  }

  openDetailPanel(card) {
    if (this.detailPanel || this.wasScrollDragging()) {
      return;
    }

    this.destroyDetailPanel();

    const { width, height } = this.scale;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.72)
      .setDepth(100)
      .setInteractive();
    const panelWidth = Math.min(width - 34, 350);
    const panelHeight = Math.min(height - 158, 430);
    const panel = this.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x0f172a, 0.98)
      .setStrokeStyle(1, 0x93c5fd, 0.9)
      .setDepth(101)
      .setInteractive();

    const title = this.add
      .text(width / 2, height / 2 - panelHeight / 2 + 30, card.name, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#f8fafc',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: panelWidth - 32 },
      })
      .setOrigin(0.5)
      .setDepth(102);

    const lines = [
      `Type: ${card.type}`,
      ...(isUnitCard(card) ? [`ATK/HP: ${card.attack ?? '-'} / ${card.hp ?? '-'}`] : []),
      ...DETAIL_FIELDS.map((field) => `${field}: ${card[field] ?? 'none'}`),
      '',
      card.textShort ?? '',
    ];

    const body = this.add
      .text(width / 2 - panelWidth / 2 + 22, height / 2 - panelHeight / 2 + 76, lines.join('\n'), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        color: '#e5e7eb',
        lineSpacing: 8,
        wordWrap: { width: panelWidth - 44 },
      })
      .setOrigin(0, 0)
      .setDepth(102);

    const backButton = this.add
      .text(width / 2, height / 2 + panelHeight / 2 - 36, 'BACK', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#111827',
        backgroundColor: '#93c5fd',
        fontStyle: 'bold',
        padding: { x: 22, y: 9 },
      })
      .setOrigin(0.5)
      .setDepth(102)
      .setInteractive({ useHandCursor: true });

    backButton.on('pointerover', () => backButton.setBackgroundColor('#bfdbfe'));
    backButton.on('pointerout', () => backButton.setBackgroundColor('#93c5fd'));
    backButton.on('pointerup', () => this.destroyDetailPanel());

    this.detailPanel = [overlay, panel, title, body, backButton];
  }

  destroyDetailPanel() {
    this.detailPanel?.forEach((element) => element?.destroy?.());
    this.detailPanel = null;
  }

  createBackButton(width, height) {
    const backButton = this.add
      .text(width / 2, height - 48, 'BACK', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#f8fafc',
        backgroundColor: '#334155',
        fontStyle: 'bold',
        padding: { x: 24, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    backButton.on('pointerover', () => backButton.setBackgroundColor('#475569'));
    backButton.on('pointerout', () => backButton.setBackgroundColor('#334155'));
    backButton.on('pointerup', () => {
      if (this.detailPanel) {
        this.destroyDetailPanel();
        return;
      }
      this.scene.start('MainMenuScene');
    });
    this.uiElements.push(backButton);
  }

  wasScrollDragging() {
    return Math.abs(this.scrollState?.lastDragDistance ?? 0) > CARD_SCROLL_DRAG_THRESHOLD;
  }

  onScrollWheel(pointer, gameObjects, deltaX, deltaY) {
    const state = this.scrollState;
    if (!state || this.detailPanel || pointer.y < state.viewportTop || pointer.y > state.viewportBottom) {
      return;
    }

    this.setCollectionScrollY(state.content.y - deltaY * 0.45);
  }

  onScrollPointerDown(pointer) {
    const state = this.scrollState;
    if (!state || this.detailPanel || pointer.y < state.viewportTop || pointer.y > state.viewportBottom) {
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
