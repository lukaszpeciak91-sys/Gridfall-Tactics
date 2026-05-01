import Phaser from 'phaser';
import { getFactionByKey } from '../data/factions/index.js';
import { createInitialBattleState, drawCards } from '../systems/GameState.js';

const FRAME_KEY = 'frame_default';

export default class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
    this.selectedCardId = null;
    this.cardViews = [];
    this.boardCells = [];
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
    this.boardCells = [];

    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const x = startX + col * cellSize + cellSize / 2;
        const y = startY + row * cellSize + cellSize / 2;
        const boardIndex = row * 3 + col;
        const background = this.add
          .rectangle(x, y, cellSize - 6, cellSize - 6, 0x1f2937, 1)
          .setStrokeStyle(2, 0x9ca3af)
          .setInteractive({ useHandCursor: true });
        const label = this.add
          .text(x, y, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
            color: '#f8fafc',
            align: 'center',
            wordWrap: { width: cellSize - 14 },
          })
          .setOrigin(0.5);

        background.on('pointerup', () => this.onBoardCellTap(boardIndex));
        this.boardCells.push({ index: boardIndex, row, background, label });
      }
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
    const cards = this.gameState.player.maxHandSize;
    const totalWidth = cards * cardWidth + (cards - 1) * gap;
    const startX = width / 2 - totalWidth / 2;
    const centerY = zoneY + zoneHeight * 0.5;

    this.add.rectangle(width * 0.5, centerY, width * 0.96, zoneHeight, 0x111827, 0.95);

    for (let index = 0; index < cards; index += 1) {
      const x = startX + index * (cardWidth + gap) + cardWidth / 2;
      const card = this.gameState.player.hand[index] ?? null;
      const cardId = card?.id ?? `slot-${index}`;
      const cardName = card?.name ?? '';
      const background = this.add.rectangle(x, centerY, cardWidth, cardHeight, 0x334155, 1).setStrokeStyle(3, 0x64748b);
      const label = this.add
        .text(x, centerY, cardName || 'Empty', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '16px',
          color: '#f8fafc',
          align: 'center',
          wordWrap: { width: cardWidth - 12 },
        })
        .setOrigin(0.5);

      const hitArea = this.add
        .rectangle(x, centerY, cardWidth, cardHeight, 0x000000, 0)
        .setInteractive({ useHandCursor: true });

      hitArea.on('pointerup', () => this.onCardTap(cardId));

      this.cardViews.push({ cardId, background, label, hitArea });

      if (!card) {
        background.setAlpha(0.65);
        label.setAlpha(0.65);
      }
    }
  }

  onCardTap(cardId) {
    const card = this.gameState.player.hand.find((item) => item.id === cardId);
    if (!card) {
      return;
    }

    if (this.selectedCardId === cardId) {
      this.selectedCardId = null;
      this.resetCardHighlights();
      this.statusText.setText('Ready: Select a card');
      return;
    }

    this.selectedCardId = cardId;
    this.resetCardHighlights();

    this.statusText.setText(`Selected: ${card.name}`);
  }

  onBoardCellTap(boardIndex) {
    if (!this.selectedCardId) {
      return;
    }

    const selectedCard = this.gameState.player.hand.find((card) => card.id === this.selectedCardId);
    if (!selectedCard) {
      this.selectedCardId = null;
      this.resetCardHighlights();
      return;
    }

    if (!this.isUnitCard(selectedCard)) {
      this.playCard(this.selectedCardId, `Played: ${selectedCard.name}`);
      return;
    }

    const targetCell = this.boardCells.find((cell) => cell.index === boardIndex);
    if (!targetCell || targetCell.row !== 2) {
      this.statusText.setText('Units can only be placed in Player Row');
      return;
    }

    if (this.gameState.board[boardIndex]) {
      this.statusText.setText('That board cell is occupied');
      return;
    }

    this.gameState.board[boardIndex] = {
      cardId: selectedCard.id,
      name: selectedCard.name,
      owner: 'player',
      kind: 'unit',
    };
    targetCell.label.setText(selectedCard.name);
    this.playCard(this.selectedCardId, `Placed: ${selectedCard.name}`);
  }

  playCard(cardId, statusText) {
    const handIndex = this.gameState.player.hand.findIndex((card) => card.id === cardId);
    if (handIndex === -1) {
      return;
    }

    const [playedCard] = this.gameState.player.hand.splice(handIndex, 1);
    this.gameState.player.discard.push(playedCard);
    drawCards(this.gameState, 1);

    this.selectedCardId = null;
    this.cardViews.forEach((view) => {
      view.background.destroy();
      view.label.destroy();
      view.hitArea.destroy();
    });
    this.cardViews = [];
    this.drawHand(this.scale.width, this.scale.height);
    this.statusText.setText(statusText ?? `Played: ${playedCard.name}`);
  }

  resetCardHighlights() {
    this.cardViews.forEach((card) => {
      const isSelected = card.cardId === this.selectedCardId;
      card.background.setStrokeStyle(4, isSelected ? 0xfacc15 : 0x64748b);
      const viewCard = this.gameState.player.hand.find((item) => item.id === card.cardId);
      card.background.setFillStyle(isSelected ? 0x475569 : 0x334155, isSelected ? 1 : viewCard ? 1 : 0.65);
    });
  }

  isUnitCard(card) {
    const nonUnitNames = new Set([
      'Swarm Attack',
      'Spawn',
      'Recycle',
      'Flood',
      'Mindlash',
      'Freeze',
      'Disrupt',
      'Scheme',
      'Dominate',
      'Fortify',
      'Stability',
      'Reinforce',
      'Last Stand',
      'Repair Kit',
    ]);

    return !nonUnitNames.has(card?.name);
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
