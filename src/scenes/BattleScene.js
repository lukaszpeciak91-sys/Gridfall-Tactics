import Phaser from 'phaser';
import { getFactionByKey } from '../data/factions/index.js';
import { createInitialBattleState, drawCards } from '../systems/GameState.js';

const FRAME_KEY = 'frame_default';

export default class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
    this.selectedCardId = null;
    this.cardViews = [];
  }

  preload() {
    // this.load.image(FRAME_KEY, 'assets/ui/frame_default.png');
  }

  create(data) {
    const { width, height } = this.scale;
    const factionKey = data?.factionKey ?? 'Aggro';
    const factionData = getFactionByKey(factionKey) ?? { name: 'Unknown', deck: [] };

    this.gameState = createInitialBattleState(factionData);
    drawCards(this.gameState, 3);

    this.cameras.main.setBackgroundColor('#0b1220');

    this.statusText = this.add
      .text(width * 0.5, height * 0.96, 'Ready: Select a card', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#e5e7eb',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.08, 'Battle Scene', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#e5e7eb',
      })
      .setOrigin(0.5);

    this.drawTopBar(width, height, factionKey);
    this.drawBoard(width, height);
    this.drawActionZone(width, height);
    this.drawHand(width, height);
    this.drawFrame(width, height, factionData);
  }

  drawTopBar(width, height, factionKey) {
    const topY = 0;
    const barHeight = height * 0.1;

    this.add.rectangle(width * 0.5, topY + barHeight * 0.5, width * 0.96, barHeight, 0x111827, 1);
    this.add
      .text(width * 0.08, topY + barHeight * 0.5, 'Enemy HP: 30', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#fca5a5',
      })
      .setOrigin(0, 0.5);

    this.add
      .text(width * 0.92, topY + barHeight * 0.5, `Faction: ${factionKey}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#bfdbfe',
      })
      .setOrigin(1, 0.5);
  }

  drawBoard(width, height) {
    const zoneTop = height * 0.1;
    const zoneHeight = height * 0.45;
    const centerY = zoneTop + zoneHeight / 2;
    const boardSize = Math.min(width * 0.84, zoneHeight * 0.9);
    const cellSize = boardSize / 3;
    const startX = width / 2 - boardSize / 2;
    const startY = centerY - boardSize / 2;

    this.add.rectangle(width / 2, centerY, boardSize + 20, boardSize + 20, 0x1f2937, 1);
    const graphics = this.add.graphics({ lineStyle: { width: 4, color: 0x9ca3af } });

    for (let i = 0; i <= 3; i += 1) {
      graphics.lineBetween(startX + i * cellSize, startY, startX + i * cellSize, startY + boardSize);
      graphics.lineBetween(startX, startY + i * cellSize, startX + boardSize, startY + i * cellSize);
    }

    ['Enemy Row', 'Neutral Row', 'Player Row'].forEach((label, index) => {
      this.add
        .text(startX + 8, startY + cellSize * index + 8, label, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          color: '#d1d5db',
        })
        .setOrigin(0, 0);
    });
  }

  drawActionZone(width, height) {
    const zoneY = height * 0.6;
    const zoneHeight = height * 0.1;

    this.add.rectangle(width * 0.5, zoneY + zoneHeight * 0.5, width * 0.96, zoneHeight, 0x0f172a, 0.9);

    const button = this.add
      .text(width * 0.5, zoneY + zoneHeight * 0.5, 'EXECUTE TURN', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '28px',
        color: '#f9fafb',
        backgroundColor: '#2563eb',
        padding: { x: 28, y: 14 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on('pointerup', () => {
      this.statusText.setText('Turn executed placeholder');
    });
  }

  drawHand(width, height) {
    const zoneY = height * 0.7;
    const zoneHeight = height * 0.25;
    const cardWidth = Math.min(96, width * 0.2);
    const cardHeight = Math.min(140, zoneHeight * 0.72);
    const gap = Math.max(8, width * 0.02);
    const cards = 5;
    const totalWidth = cards * cardWidth + (cards - 1) * gap;
    const startX = width / 2 - totalWidth / 2;
    const centerY = zoneY + zoneHeight * 0.5;

    this.add.rectangle(width * 0.5, centerY, width * 0.96, zoneHeight, 0x111827, 0.95);

    for (let index = 0; index < cards; index += 1) {
      const x = startX + index * (cardWidth + gap) + cardWidth / 2;
      const cardId = index + 1;
      const background = this.add.rectangle(x, centerY, cardWidth, cardHeight, 0x334155, 1).setStrokeStyle(3, 0x64748b);
      const label = this.add
        .text(x, centerY, `Card ${cardId}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          color: '#f8fafc',
        })
        .setOrigin(0.5);

      const hitArea = this.add
        .rectangle(x, centerY, cardWidth, cardHeight, 0x000000, 0)
        .setInteractive({ useHandCursor: true });

      hitArea.on('pointerup', () => this.onCardTap(cardId));

      this.cardViews.push({ cardId, background, label });

      if (index >= 3) {
        background.setAlpha(0.65);
        label.setAlpha(0.65);
      }
    }
  }

  onCardTap(cardId) {
    if (this.selectedCardId === cardId) {
      this.statusText.setText('Card played placeholder');
      return;
    }

    this.selectedCardId = cardId;
    this.cardViews.forEach((card) => {
      const isSelected = card.cardId === cardId;
      card.background.setStrokeStyle(4, isSelected ? 0xfacc15 : 0x64748b);
      card.background.setFillStyle(isSelected ? 0x475569 : 0x334155, isSelected ? 1 : card.cardId > 3 ? 0.65 : 1);
    });

    this.statusText.setText(`Selected Card ${cardId}`);
  }

  drawFrame(width, height, factionData) {
    const frameKey = factionData?.frameImage ?? FRAME_KEY;
    const hasFrame = this.textures.exists(frameKey);

    if (hasFrame) {
      this.add.image(width / 2, height / 2, frameKey).setDisplaySize(width, height);
      return;
    }

    this.add.rectangle(width / 2, height / 2, width * 0.985, height * 0.985).setStrokeStyle(6, 0x475569, 1);
  }
}
