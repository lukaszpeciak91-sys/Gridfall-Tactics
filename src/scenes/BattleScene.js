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

    this.cameras.main.setBackgroundColor('#05080f');
    this.layout = this.getLayoutMetrics(width, height);

    this.drawBattleFrame();
    this.drawBoard();
    this.drawHeroPanels();
    this.drawActionZone();
    this.drawHand();

    this.statusText = this.add
      .text(this.layout.width * 0.5, this.layout.status.centerY - this.layout.status.h * 0.18, 'Ready: Select a card', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${this.layout.status.fontSize}px`,
        color: '#cbd5e1',
      })
      .setOrigin(0.5)
      .setAlpha(0.8);
  }

  getLayoutMetrics(width, height) {
    const margin = Math.max(8, Math.round(width * 0.025));
    const contentWidth = width - margin * 2;

    const sectionRatios = {
      topHero: 0.06,
      board: 0.54,
      playerHero: 0.06,
      action: 0.05,
      hand: 0.24,
      status: 0.05,
    };
    const gapRatio = 0.008;
    const topBottomPadRatio = 0.008;
    const sectionCount = Object.keys(sectionRatios).length;
    const totalGapHeight = height * gapRatio * (sectionCount - 1);
    const totalPadHeight = height * topBottomPadRatio * 2;
    const usableHeight = Math.max(0, height - totalGapHeight - totalPadHeight);
    const totalSectionRatio = Object.values(sectionRatios).reduce((sum, ratio) => sum + ratio, 0);

    const topHeroHeight = usableHeight * (sectionRatios.topHero / totalSectionRatio);
    const boardHeight = usableHeight * (sectionRatios.board / totalSectionRatio);
    const playerHeroHeight = usableHeight * (sectionRatios.playerHero / totalSectionRatio);
    const actionHeight = usableHeight * (sectionRatios.action / totalSectionRatio);
    const handHeight = usableHeight * (sectionRatios.hand / totalSectionRatio);
    const statusHeight = usableHeight * (sectionRatios.status / totalSectionRatio);

    const gapHeight = height * gapRatio;
    const topBottomPad = height * topBottomPadRatio;

    let cursorY = topBottomPad;
    const topHeroY = cursorY;
    cursorY += topHeroHeight + gapHeight;
    const boardY = cursorY;
    cursorY += boardHeight + gapHeight;
    const playerHeroY = cursorY;
    cursorY += playerHeroHeight + gapHeight;
    const actionY = cursorY;
    cursorY += actionHeight + gapHeight;
    const handY = cursorY;
    cursorY += handHeight + gapHeight;
    const statusY = cursorY;

    const boardWidth = Math.min(contentWidth * 0.985, contentWidth);
    const slotWidth = boardWidth / 3;
    const slotHeight = slotWidth * 1.34;
    const boardScale = Math.min(1, boardHeight / (slotHeight * 3));
    const cellWidth = slotWidth * boardScale;
    const cellHeight = slotHeight * boardScale;

    const handCardWidth = Math.min(contentWidth * 0.31, handHeight * 0.94);
    const handCardHeight = handCardWidth * 1.34;
    const deckAreaWidth = contentWidth * 0.2;
    const handTrackWidth = contentWidth - deckAreaWidth - margin * 0.8;
    const cardsVisible = Math.min(3, this.gameState.player.maxHandSize);
    const fittedStep = cardsVisible > 1 ? (handTrackWidth - handCardWidth) / (cardsVisible - 1) : 0;
    const overlapStep = handCardWidth * 0.82;
    const step = cardsVisible > 1 ? Math.min(fittedStep, overlapStep) : 0;

    return {
      width,
      height,
      margin,
      contentWidth,
      topHero: { y: topHeroY, h: topHeroHeight, centerY: topHeroY + topHeroHeight / 2 },
      board: { y: boardY, h: boardHeight, centerY: boardY + boardHeight / 2, cellWidth, cellHeight, width: cellWidth * 3, height: cellHeight * 3 },
      playerHero: { y: playerHeroY, h: playerHeroHeight, centerY: playerHeroY + playerHeroHeight / 2 },
      action: { y: actionY, h: actionHeight, centerY: actionY + actionHeight / 2 },
      hand: { y: handY, h: handHeight, centerY: handY + handHeight / 2, cardWidth: handCardWidth, cardHeight: handCardHeight, deckAreaWidth, handTrackWidth, cardsVisible, step },
      status: { y: statusY, h: statusHeight, centerY: statusY + statusHeight / 2, fontSize: Math.max(11, Math.floor(statusHeight * 0.78)) },
    };
  }

  drawBattleFrame() {
    const { width, height, status } = this.layout;
    this.add.rectangle(width * 0.5, height * 0.5, width, height, 0x05080f, 1);
    this.add.rectangle(width * 0.5, status.centerY, width, status.h, 0x020617, 0.95).setStrokeStyle(1, 0x334155, 0.8);

    const labelSize = Math.max(11, Math.floor(status.h * 0.34));
    this.add.text(width * 0.16, status.centerY, 'MENU', { fontFamily: 'Arial, sans-serif', fontSize: `${labelSize}px`, color: '#94a3b8', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(width * 0.5, status.centerY, 'FULLSCREEN', { fontFamily: 'Arial, sans-serif', fontSize: `${labelSize}px`, color: '#94a3b8', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(width * 0.84, status.centerY, 'SETTINGS', { fontFamily: 'Arial, sans-serif', fontSize: `${labelSize}px`, color: '#94a3b8', fontStyle: 'bold' }).setOrigin(0.5);
  }

  drawHeroPanels() {
    const { width, topHero, playerHero, contentWidth } = this.layout;
    const panelWidth = contentWidth * 0.72;

    const enemyPanel = this.add.rectangle(width * 0.5, topHero.centerY, panelWidth, topHero.h, 0x111827, 0.45).setStrokeStyle(2, 0xf87171, 0.6);
    const playerPanel = this.add.rectangle(width * 0.5, playerHero.centerY, panelWidth, playerHero.h, 0x111827, 0.45).setStrokeStyle(2, 0x60a5fa, 0.6);

    this.add.text(enemyPanel.x, enemyPanel.y - topHero.h * 0.14, 'ENEMY HERO', {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(16, Math.floor(topHero.h * 0.32))}px`,
      color: '#f87171',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.add.text(enemyPanel.x, enemyPanel.y + topHero.h * 0.2, '12 / 12', {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(18, Math.floor(topHero.h * 0.38))}px`,
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.add.text(playerPanel.x, playerPanel.y - playerHero.h * 0.14, 'PLAYER HERO', {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(14, Math.floor(playerHero.h * 0.3))}px`,
      color: '#60a5fa',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.add.text(playerPanel.x, playerPanel.y + playerHero.h * 0.2, '12 / 12', {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(16, Math.floor(playerHero.h * 0.36))}px`,
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);
  }

  drawBoard() {
    const { width, board } = this.layout;
    const startX = width / 2 - board.width / 2;
    const startY = board.centerY - board.height / 2;

    this.boardCells = [];

    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const x = startX + col * board.cellWidth + board.cellWidth / 2;
        const y = startY + row * board.cellHeight + board.cellHeight / 2;
        const boardIndex = row * 3 + col;
        const isMiddleRow = row === 1;

        const background = this.add
          .rectangle(x, y, board.cellWidth - 10, board.cellHeight - 10, 0x111827, isMiddleRow ? 0.18 : 0.4)
          .setStrokeStyle(isMiddleRow ? 2 : 3, isMiddleRow ? 0x94a3b8 : 0xcbd5e1, isMiddleRow ? 0.3 : 0.55)
          .setInteractive({ useHandCursor: true });

        if (isMiddleRow && typeof background.setLineDash === 'function') {
          background.setLineDash([6, 7]);
        }

        const label = this.add
          .text(x, y, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: `${Math.max(13, Math.floor(board.cellWidth * 0.14))}px`,
            color: '#f8fafc',
            align: 'center',
            wordWrap: { width: board.cellWidth - 16 },
          })
          .setOrigin(0.5);

        background.on('pointerup', () => this.onBoardCellTap(boardIndex));
        this.boardCells.push({ index: boardIndex, row, background, label });
      }
    }
  }

  drawActionZone() {
    const { width, action } = this.layout;

    const button = this.add
      .text(width * 0.5, action.centerY, 'END TURN', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${Math.max(18, Math.floor(action.h * 0.52))}px`,
        color: '#f9fafb',
        backgroundColor: '#111827',
        align: 'center',
        fixedWidth: Math.floor(width * 0.46),
        padding: { x: 0, y: Math.max(8, Math.floor(action.h * 0.18)) },
      })
      .setOrigin(0.5)
      .setStroke('#64748b', 2)
      .setInteractive({ useHandCursor: true });

    button.on('pointerup', () => {
      this.statusText.setText('Turn executed placeholder');
    });
  }

  drawHand() {
    const { width, hand, margin } = this.layout;
    const centerY = hand.centerY;
    const handLeft = margin;
    const deckCenterX = width - margin - hand.deckAreaWidth / 2;
    const handTrackLeft = handLeft + hand.cardWidth / 2;

    this.add.rectangle(width * 0.5, centerY, width - margin * 2, hand.h, 0x0f172a, 0.5).setStrokeStyle(2, 0x334155, 0.8);

    const deckCount = this.gameState.player.deck.length;
    this.add.rectangle(deckCenterX, centerY + hand.h * 0.06, hand.cardWidth * 0.76, hand.cardHeight * 0.92, 0x111827, 0.45).setStrokeStyle(3, 0x94a3b8, 0.6);
    this.add.text(deckCenterX, centerY + hand.h * 0.36, `x${deckCount}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(14, Math.floor(hand.h * 0.12))}px`,
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    for (let index = 0; index < hand.cardsVisible; index += 1) {
      const x = handTrackLeft + index * hand.step;
      const card = this.gameState.player.hand[index] ?? null;
      const cardId = card?.id ?? `slot-${index}`;
      const cardName = card?.name ?? '';
      const background = this.add.rectangle(x, centerY + hand.h * 0.06, hand.cardWidth, hand.cardHeight, 0x111827, 0.55).setStrokeStyle(3, 0x94a3b8, 0.7);
      const label = this.add.text(x, centerY + hand.h * 0.1, cardName || 'Empty', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${Math.max(16, Math.floor(hand.cardWidth * 0.17))}px`,
        color: '#f8fafc',
        align: 'center',
        wordWrap: { width: hand.cardWidth - 14 },
      }).setOrigin(0.5);

      const hitArea = this.add.rectangle(x, centerY + hand.h * 0.06, hand.cardWidth, hand.cardHeight, 0x000000, 0).setInteractive({ useHandCursor: true });
      hitArea.on('pointerup', () => this.onCardTap(cardId));

      const baseDepth = 20 + index * 3;
      background.setDepth(baseDepth);
      label.setDepth(baseDepth + 1);
      hitArea.setDepth(baseDepth + 2);

      this.cardViews.push({ cardId, background, label, hitArea, baseY: centerY + hand.h * 0.06, labelBaseY: centerY + hand.h * 0.1, baseDepth });

      if (!card) {
        background.setAlpha(0.42);
        label.setAlpha(0.45);
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
    this.statusText.setText(`Ready: ${card.name} selected`);
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
      card.background.setStrokeStyle(4, isSelected ? 0xfacc15 : 0x94a3b8, isSelected ? 1 : 0.7);
      const viewCard = this.gameState.player.hand.find((item) => item.id === card.cardId);
      card.background.setFillStyle(isSelected ? 0x334155 : 0x111827, isSelected ? 0.78 : viewCard ? 0.55 : 0.42);

      const raisedOffset = isSelected ? this.layout.hand.h * 0.08 : 0;
      card.background.setY(card.baseY - raisedOffset);
      card.label.setY(card.labelBaseY - raisedOffset);
      card.hitArea.setY(card.baseY - raisedOffset);

      const topDepth = isSelected ? 100 : card.baseDepth;
      card.background.setDepth(topDepth);
      card.label.setDepth(topDepth + 1);
      card.hitArea.setDepth(topDepth + 2);
    });
  }

  isUnitCard(card) {
    const nonUnitNames = new Set(['Swarm Attack', 'Spawn', 'Recycle', 'Flood', 'Mindlash', 'Freeze', 'Disrupt', 'Scheme', 'Dominate', 'Fortify', 'Stability', 'Reinforce', 'Last Stand', 'Repair Kit']);
    return !nonUnitNames.has(card?.name);
  }

}
