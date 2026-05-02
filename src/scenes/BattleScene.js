import Phaser from 'phaser';
import { getFactionByKey } from '../data/factions/index.js';
import { createInitialBattleState, drawCards } from '../systems/GameState.js';

export default class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
    this.selectedCardId = null;
    this.cardViews = [];
    this.boardCells = [];
  }

  preload() {
    // no-op
  }

  create(data) {
    const { width, height } = this.scale;
    const factionKey = typeof data?.factionKey === 'string' && data.factionKey ? data.factionKey : 'Aggro';
    const factionData = getFactionByKey(factionKey) ?? { name: `Unknown (${factionKey})`, deck: [] };

    this.gameState = createInitialBattleState(factionData);
    drawCards(this.gameState, 3);

    this.cameras.main.setBackgroundColor('#0b1220');
    this.layout = this.getLayoutMetrics(width, height);

    this.drawTopBar(factionKey);
    this.drawBoard();
    this.drawActionZone();

    this.statusText = this.add
      .text(this.layout.status.centerX, this.layout.status.centerY, 'Ready: Select a card', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${this.layout.status.fontSize}px`,
        color: '#e5e7eb',
      })
      .setOrigin(0.5);

    this.drawHand();
  }

  getLayoutMetrics(width, height) {
    const margin = Math.max(6, Math.round(width * 0.015));
    const contentWidth = width - margin * 2;

    const topHeight = height * 0.08;
    const boardHeight = height * 0.54;
    const actionHeight = height * 0.08;
    const handHeight = height * 0.26;
    const statusHeight = height * 0.04;

    const topY = 0;
    const boardY = topY + topHeight;
    const actionY = boardY + boardHeight;
    const handY = actionY + actionHeight;
    const statusY = handY + handHeight;

    const handCardCount = Math.min(5, this.gameState.player.maxHandSize);
    const deckAreaWidth = contentWidth * 0.19;
    const handTrackWidth = contentWidth - deckAreaWidth - margin * 1.2;
    const targetCardWidthByHeight = handHeight * 0.72;
    const targetCardWidthBySlots = handTrackWidth / 3.15;
    const cardWidth = Math.max(64, Math.min(targetCardWidthByHeight, targetCardWidthBySlots));
    const cardHeight = cardWidth * 1.34;
    const step = handCardCount > 1 ? (handTrackWidth - cardWidth) / (handCardCount - 1) : 0;

    const boardWidth = Math.min(contentWidth * 0.9, contentWidth);
    const slotWidth = boardWidth / 3;
    const slotHeight = slotWidth * 1.32;
    const totalGridHeight = slotHeight * 3;
    const boardScale = Math.min(1, (boardHeight * 0.94) / totalGridHeight);
    const cellWidth = slotWidth * boardScale;
    const cellHeight = slotHeight * boardScale;
    const boardDrawWidth = cellWidth * 3;
    const boardDrawHeight = cellHeight * 3;

    return {
      width,
      height,
      margin,
      contentWidth,
      top: { y: topY, h: topHeight, centerY: topY + topHeight / 2 },
      board: { y: boardY, h: boardHeight, centerY: boardY + boardHeight / 2, width: boardDrawWidth, height: boardDrawHeight, cellWidth, cellHeight },
      action: { y: actionY, h: actionHeight, centerY: actionY + actionHeight / 2 },
      hand: { y: handY, h: handHeight, centerY: handY + handHeight / 2, cardWidth, cardHeight, step, deckAreaWidth, handTrackWidth, cardsVisible: handCardCount },
      status: { y: statusY, h: statusHeight, centerY: statusY + statusHeight / 2, fontSize: Math.max(14, Math.floor(statusHeight * 0.45)) },
    };
  }

  drawTopBar(factionKey) {
    const { width, top, margin } = this.layout;

    this.add.rectangle(width * 0.5, top.centerY, width - margin * 2, top.h, 0x111827, 0.95);
    this.add
      .text(width * 0.08, top.centerY, 'Enemy HP: 30', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${Math.max(16, Math.floor(top.h * 0.28))}px`,
        color: '#fca5a5',
      })
      .setOrigin(0, 0.5);

    this.add
      .text(width * 0.92, top.centerY, `Faction: ${factionKey}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${Math.max(14, Math.floor(top.h * 0.24))}px`,
        color: '#bfdbfe',
      })
      .setOrigin(1, 0.5);
  }

  drawBoard() {
    const { width, board } = this.layout;
    const boardWidth = board.width;
    const boardHeight = board.height;
    const cellWidth = board.cellWidth;
    const cellHeight = board.cellHeight;
    const startX = width / 2 - boardWidth / 2;
    const startY = board.centerY - boardHeight / 2;

    this.add.rectangle(width / 2, board.centerY, boardWidth + 6, boardHeight + 6, 0x1f2937, 0.95).setStrokeStyle(1, 0x334155, 0.7);
    this.boardCells = [];

    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const x = startX + col * cellWidth + cellWidth / 2;
        const y = startY + row * cellHeight + cellHeight / 2;
        const boardIndex = row * 3 + col;
        const isMiddleRow = row === 1;
        const background = this.add
          .rectangle(x, y, cellWidth - 6, cellHeight - 6, 0x1f2937, isMiddleRow ? 0.72 : 0.98)
          .setStrokeStyle(isMiddleRow ? 1 : 2, 0x9ca3af, isMiddleRow ? 0.35 : 0.85)
          .setInteractive({ useHandCursor: true });
        if (isMiddleRow && typeof background.setLineDash === 'function') {
          background.setLineDash([8, 6]);
        }
        const label = this.add
          .text(x, y, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: `${Math.max(12, Math.floor(cellWidth * 0.16))}px`,
            color: '#f8fafc',
            align: 'center',
            wordWrap: { width: cellWidth - 14 },
          })
          .setOrigin(0.5);

        background.on('pointerup', () => this.onBoardCellTap(boardIndex));
        this.boardCells.push({ index: boardIndex, row, background, label });
      }
    }

    ['Enemy', 'Neutral', 'Player'].forEach((label, index) => {
      this.add
        .text(startX + 6, startY + cellHeight * index + 6, label, {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${Math.max(11, Math.floor(cellWidth * 0.14))}px`,
          color: index === 1 ? '#9ca3af' : '#d1d5db',
        })
        .setOrigin(0, 0);
    });
  }

  drawActionZone() {
    const { width, action } = this.layout;

    const buttonWidth = Math.floor(width * 0.56);
    const button = this.add
      .text(width * 0.5, action.centerY, 'EXECUTE TURN', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${Math.max(18, Math.floor(action.h * 0.42))}px`,
        color: '#f9fafb',
        backgroundColor: '#1d4ed8',
        align: 'center',
        fixedWidth: buttonWidth,
        padding: { x: 0, y: Math.max(8, Math.floor(action.h * 0.12)) },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on('pointerup', () => {
      this.statusText.setText('Turn executed placeholder');
    });
  }

  drawHand() {
    const { width, hand, margin } = this.layout;
    const cards = hand.cardsVisible;
    const centerY = hand.centerY;
    const handLeft = margin + 2;
    const handTrackLeft = handLeft + hand.cardWidth / 2;
    const deckCenterX = width - margin - hand.deckAreaWidth / 2;

    this.add.rectangle(width * 0.5, centerY, width - margin * 2, hand.h, 0x111827, 0.96).setStrokeStyle(1, 0x334155, 0.55);
    this.add.rectangle(deckCenterX, centerY, hand.deckAreaWidth, hand.h * 0.9, 0x1f2937, 0.95).setStrokeStyle(1, 0x64748b, 0.9);
    this.add.rectangle(deckCenterX, centerY - hand.h * 0.1, hand.cardWidth * 0.68, hand.cardHeight * 0.66, 0x334155, 0.95).setStrokeStyle(2, 0x94a3b8, 0.75);

    const deckCount = this.gameState.player.deck.length;
    this.add
      .text(deckCenterX, centerY + hand.h * 0.24, `DECK x${deckCount}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${Math.max(13, Math.floor(hand.h * 0.15))}px`,
        color: '#cbd5e1',
      })
      .setOrigin(0.5, 0.5);

    for (let index = 0; index < cards; index += 1) {
      const x = handTrackLeft + index * hand.step;
      const card = this.gameState.player.hand[index] ?? null;
      const cardId = card?.id ?? `slot-${index}`;
      const cardName = card?.name ?? '';
      const background = this.add
        .rectangle(x, centerY, hand.cardWidth, hand.cardHeight, 0x334155, 1)
        .setStrokeStyle(3, 0x64748b);
      const label = this.add
        .text(x, centerY, cardName || 'Empty', {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${Math.max(12, Math.floor(hand.cardWidth * 0.17))}px`,
          color: '#f8fafc',
          align: 'center',
          wordWrap: { width: hand.cardWidth - 12 },
        })
        .setOrigin(0.5);

      const hitArea = this.add
        .rectangle(x, centerY, hand.cardWidth, hand.cardHeight, 0x000000, 0)
        .setInteractive({ useHandCursor: true });

      hitArea.on('pointerup', () => this.onCardTap(cardId));

      this.cardViews.push({ cardId, background, label, hitArea });

      if (!card) {
        background.setAlpha(0.65);
        label.setAlpha(0.65);
      }
    }
  }

  onCardTap(cardId) { /* unchanged below */
    const card = this.gameState.player.hand.find((item) => item.id === cardId);
    if (!card) return;
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
    if (!this.selectedCardId) return;
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
    this.gameState.board[boardIndex] = { cardId: selectedCard.id, name: selectedCard.name, owner: 'player', kind: 'unit' };
    targetCell.label.setText(selectedCard.name);
    this.playCard(this.selectedCardId, `Placed: ${selectedCard.name}`);
  }

  playCard(cardId, statusText) {
    const handIndex = this.gameState.player.hand.findIndex((card) => card.id === cardId);
    if (handIndex === -1) return;
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
    this.drawHand();
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
    const nonUnitNames = new Set(['Swarm Attack', 'Spawn', 'Recycle', 'Flood', 'Mindlash', 'Freeze', 'Disrupt', 'Scheme', 'Dominate', 'Fortify', 'Stability', 'Reinforce', 'Last Stand', 'Repair Kit']);
    return !nonUnitNames.has(card?.name);
  }

}
