import Phaser from 'phaser';
import { getFactionByKey, getFactionKeys } from '../data/factions/index.js';
import { createInitialBattleState, drawCards, canPass, playEffectCard, playOrRedeployUnit, performSwap, resolveCombat, resolveTargetedEffectCard, getUnitAttack, getUnitArmor, toggleFirstActor } from '../systems/GameState.js';
import { chooseEnemyAction } from '../systems/enemyDecision.js';

export default class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
    this.selectedCardId = null;
    this.cardViews = [];
    this.boardCells = [];
    this.pendingSwapIndex = null;
    this.playerActionUsed = false;
    this.enemyActionUsed = false;
    this.targetingState = null;
  }

  preload() {
    // no-op
  }

  init() {
    this.resetRuntimeState();
  }

  resetRuntimeState() {
    this.selectedCardId = null;
    this.cardViews = [];
    this.boardCells = [];
    this.pendingSwapIndex = null;
    this.playerActionUsed = false;
    this.enemyActionUsed = false;
    this.targetingState = null;
    this.gameState = null;
    this.factionKey = null;
    this.layout = null;
    this.battleFrame = null;
    this.enemyHpText = null;
    this.playerHpText = null;
    this.enemyHeroPanel = null;
    this.playerHeroPanel = null;
    this.enemyInitiativeIcon = null;
    this.playerInitiativeIcon = null;
  }

  create(data) {
    const { width, height } = this.scale;
    const playerFactionKey = typeof data?.factionKey === 'string' && data.factionKey ? data.factionKey : 'Aggro';
    this.factionKey = playerFactionKey;
    const enemyFactionKey = this.selectEnemyFactionKey(playerFactionKey);
    this.enemyFactionKey = enemyFactionKey;

    const playerFactionData = getFactionByKey(playerFactionKey) ?? { name: `Unknown (${playerFactionKey})`, deck: [] };
    const enemyFactionData = getFactionByKey(enemyFactionKey) ?? { name: `Unknown (${enemyFactionKey})`, deck: [] };

    this.gameState = createInitialBattleState(playerFactionData, enemyFactionData);
    this.gameState.player.factionKey = playerFactionKey;
    this.gameState.enemy.factionKey = enemyFactionKey;
    const STARTING_HAND_SIZE = 4;
    drawCards(this.gameState.player, STARTING_HAND_SIZE);
    drawCards(this.gameState.enemy, STARTING_HAND_SIZE);

    this.cameras.main.setBackgroundColor('#05080f');
    this.layout = this.getLayoutMetrics(width, height);

    this.drawBattleFrame();
    this.drawBoard();
    this.drawHeroPanels();
    this.refreshHeroHP();
    this.drawActionZone();
    this.drawHand();
    this.drawBottomUtilityBar();
    this.startTurn();

    this.scale.on('enterfullscreen', this.onFullscreenChanged, this);
    this.scale.on('leavefullscreen', this.onFullscreenChanged, this);
    this.scale.on('resize', this.onViewportChanged, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

  }

  selectEnemyFactionKey(playerFactionKey) {
    const factionKeys = getFactionKeys();
    if (factionKeys.length === 0) {
      return playerFactionKey;
    }

    const enemyOptions = factionKeys.length > 1
      ? factionKeys.filter((key) => key !== playerFactionKey)
      : factionKeys;

    if (enemyOptions.length === 0) {
      return playerFactionKey;
    }

    const randomIndex = Phaser.Math.Between(0, enemyOptions.length - 1);
    return enemyOptions[randomIndex];
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

    const boardWidth = Math.min(contentWidth * 0.985, contentWidth);
    const slotWidth = boardWidth / 3;
    const slotHeight = slotWidth * 1.34;
    const boardScale = Math.min(1, boardHeight / (slotHeight * 3));
    const cellWidth = slotWidth * boardScale;
    const cellHeight = slotHeight * boardScale;

    const handCardWidth = Math.min(contentWidth * 0.27, handHeight * 0.9);
    const handCardHeight = handCardWidth * 1.34;
    const deckAreaWidth = contentWidth * 0.2;
    const handTrackWidth = contentWidth - deckAreaWidth - margin * 0.8;
    const cardsVisible = Math.min(5, this.gameState.player.maxHandSize);
    const fittedStep = cardsVisible > 1 ? (handTrackWidth - handCardWidth) / (cardsVisible - 1) : 0;
    const overlapStep = handCardWidth * 1.08;
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
    };
  }

  drawBattleFrame() {
    const { width, height } = this.layout;
    this.battleFrame = this.add.rectangle(width * 0.5, height * 0.5, width, height, 0x05080f, 1);
  }


  drawBottomUtilityBar() {
    const { width, height, margin } = this.layout;
    const barHeight = height * 0.05;
    const centerY = height - barHeight / 2;
    const iconStyle = {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(20, Math.floor(barHeight * 0.72))}px`,
      color: '#cbd5e1',
      fontStyle: 'bold',
    };

    const leftIcon = this.add.text(margin, centerY, '←', iconStyle).setOrigin(0, 0.5);
    const centerIcon = this.add.text(width * 0.5, centerY, '≡', iconStyle).setOrigin(0.5);
    const rightIcon = this.add.text(width - margin, centerY, '⛶', iconStyle).setOrigin(1, 0.5);

    [leftIcon, centerIcon, rightIcon].forEach((icon) => {
      icon.setInteractive({ useHandCursor: true });
      icon.setDepth(200);
    });

    leftIcon.on('pointerup', () => {
      this.scene.stop('BattleScene');
      this.scene.start('FactionSelectScene');
    });
    centerIcon.on('pointerup', () => this.scene.start('BattleMenuScene', { factionKey: this.factionKey }));
    rightIcon.on('pointerup', () => this.toggleFullscreen());
  }


  toggleFullscreen() {
    if (!this.scale.fullscreen.available) {
      return;
    }

    if (this.scale.isFullscreen) {
      this.scale.stopFullscreen();
      return;
    }

    this.scale.startFullscreen();
  }

  onFullscreenChanged() {
    this.onViewportChanged();
  }

  onViewportChanged() {
    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;

    this.layout = this.getLayoutMetrics(width, height);

    if (this.battleFrame) {
      this.battleFrame.setPosition(width * 0.5, height * 0.5);
      this.battleFrame.setSize(width, height);
    }
  }

  shutdown() {
    this.scale.off('enterfullscreen', this.onFullscreenChanged, this);
    this.scale.off('leavefullscreen', this.onFullscreenChanged, this);
    this.scale.off('resize', this.onViewportChanged, this);
  }

  drawHeroPanels() {
    const { width, topHero, playerHero, contentWidth } = this.layout;
    const panelWidth = contentWidth * 0.72;

    const enemyPanel = this.add.rectangle(width * 0.5, topHero.centerY, panelWidth, topHero.h, 0x111827, 0.45).setStrokeStyle(2, 0xf87171, 0.6);
    const playerPanel = this.add.rectangle(width * 0.5, playerHero.centerY, panelWidth, playerHero.h, 0x111827, 0.45).setStrokeStyle(2, 0x60a5fa, 0.6);
    this.enemyHeroPanel = enemyPanel;
    this.playerHeroPanel = playerPanel;

    const iconStyle = {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(16, Math.floor(topHero.h * 0.38))}px`,
      color: '#facc15',
      fontStyle: 'bold',
    };
    this.enemyInitiativeIcon = this.add.text(enemyPanel.x + panelWidth * 0.44, enemyPanel.y, '▶', iconStyle).setOrigin(0.5).setVisible(false);
    this.playerInitiativeIcon = this.add.text(playerPanel.x - panelWidth * 0.44, playerPanel.y, '▶', iconStyle).setOrigin(0.5).setVisible(false);
    this.enemyInitiativeIcon.setDepth(120);
    this.playerInitiativeIcon.setDepth(120);

    this.add.text(enemyPanel.x, enemyPanel.y - topHero.h * 0.14, 'ENEMY HERO', {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(16, Math.floor(topHero.h * 0.32))}px`,
      color: '#f87171',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.add.text(enemyPanel.x, enemyPanel.y + topHero.h * 0.2, '--', {
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

    this.add.text(playerPanel.x, playerPanel.y + playerHero.h * 0.2, '--', {
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
        const blockedMarker = this.add.text(x + board.cellWidth * 0.34, y - board.cellHeight * 0.35, '', {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${Math.max(12, Math.floor(board.cellWidth * 0.18))}px`,
          color: '#ef4444',
          fontStyle: 'bold',
        }).setOrigin(0.5);

        background.on('pointerup', () => this.onBoardCellTap(boardIndex));
        this.boardCells.push({ index: boardIndex, row, background, label, blockedMarker });
      }
    }
  }

  drawActionZone() {
    const { width, action } = this.layout;

    const button = this.add
      .text(width * 0.5, action.centerY, 'PASS', {
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
      this.resolvePassTurn();
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
      const cardLabel = this.getHandCardLabel(card);
      const background = this.add.rectangle(x, centerY + hand.h * 0.06, hand.cardWidth, hand.cardHeight, 0x111827, 0.55).setStrokeStyle(3, 0x94a3b8, 0.7);
      const label = this.add.text(x, centerY + hand.h * 0.1, cardLabel, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${Math.max(12, Math.floor(hand.cardWidth * 0.108))}px`,
        color: '#f8fafc',
        align: 'center',
        wordWrap: { width: hand.cardWidth - 16 },
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

  getHandCardLabel(card) {
    if (!card) {
      return 'Empty';
    }

    const description = typeof card.textShort === 'string' ? card.textShort.trim() : '';
    const hasUnitStats = card.type === 'unit';
    const atk = Number.isFinite(card.attack) ? card.attack : 0;
    const hp = Number.isFinite(card.hp) ? card.hp : 0;
    const armor = Number.isFinite(card.armor) ? card.armor : 0;

    const statLine = hasUnitStats ? `${atk}/${hp} ARM ${armor}` : '';
    const lines = [card.name];
    if (statLine) lines.push(statLine);
    if (description) lines.push(description);
    return lines.join('\n');
  }


  onCardTap(cardId) {
    if (this.playerActionUsed) {
      return;
    }

    const card = this.gameState.player.hand.find((item) => item.id === cardId);
    if (!card) return;

    this.pendingSwapIndex = null;
    this.targetingState = null;

    if (this.selectedCardId === cardId) {
      this.selectedCardId = null;
      this.resetCardHighlights();
      return;
    }

    this.selectedCardId = cardId;
    this.targetingState = this.isUnitCard(card) ? null : this.getTargetingStateForCard(card);
    this.resetCardHighlights();
  }

  onBoardCellTap(boardIndex) {
    if (this.playerActionUsed) {
      return;
    }

    if (!this.selectedCardId) {
      if (this.targetingState) {
        this.targetingState = null;
      }
      const unit = this.gameState.board[boardIndex];

      if (!unit || unit.owner !== 'player') {
        if (this.pendingSwapIndex !== null) {
          this.pendingSwapIndex = null;
        }
        return;
      }

      if (this.pendingSwapIndex === null) {
        this.pendingSwapIndex = boardIndex;
        return;
      }

      const result = performSwap(this.gameState, 'player', this.pendingSwapIndex, boardIndex);
      this.pendingSwapIndex = null;

      if (!result.ok) {
        return;
      }

      this.completePlayerAction();
      return;
    }

    const selectedCard = this.gameState.player.hand.find((card) => card.id === this.selectedCardId);
    if (!selectedCard) return;

    if (this.targetingState) {
      if (!this.isValidTarget(boardIndex, this.targetingState.targetType)) {
        return;
      }

      const targetIndexes = [...(this.targetingState.targetIndexes ?? [])];
      if (this.targetingState.requiredTargets > 1) {
        if (!targetIndexes.includes(boardIndex)) {
          targetIndexes.push(boardIndex);
        }
      } else {
        targetIndexes.splice(0, targetIndexes.length, boardIndex);
      }

      const result = resolveTargetedEffectCard(this.gameState, 'player', this.selectedCardId, boardIndex, targetIndexes);
      if (result.ok && result.type === 'targeted-effect-pending') {
        this.targetingState = {
          ...this.targetingState,
          targetIndexes,
        };
        this.resetCardHighlights();
        return;
      }
      if (!result.ok) return;
      if (result.type === 'targeted-effect' && this.gameState.cancelEnemyOrderThisTurn?.enemy) {
        this.gameState.cancelEnemyOrderThisTurn.enemy = false;
        this.refreshAfterPlayerAction();
        return;
      }
      this.completePlayerAction();
      return;
    }

    if (!this.isUnitCard(selectedCard)) {
      if (this.gameState.cancelEnemyOrderThisTurn?.enemy) {
        this.gameState.cancelEnemyOrderThisTurn.enemy = false;
        this.refreshAfterPlayerAction();
        return;
      }
      const result = playEffectCard(this.gameState, 'player', this.selectedCardId);
      if (!result.ok) return;
      this.completePlayerAction();
      return;
    }

    const result = playOrRedeployUnit(this.gameState, 'player', this.selectedCardId, boardIndex);
    if (!result.ok) {
      this.pendingSwapIndex = null;
      return;
    }

    this.completePlayerAction();
  }

  resolvePassTurn() {
    if (this.gameState.winner || !canPass(this.gameState) || this.playerActionUsed) return;
    this.completePlayerAction();
  }

    this.enemyTakeAction();
    const combatEvents = resolveCombat(this.gameState);
    this.lastCombatEvents = combatEvents;
    if (combatEvents.length > 0) {
      console.debug('Combat feedback events', combatEvents);
    }
    drawCards(this.gameState.player, 1);
    drawCards(this.gameState.enemy, 1);

    this.playerActionUsed = false;
    this.enemyActionUsed = false;
    this.selectedCardId = null;
    this.pendingSwapIndex = null;
    this.targetingState = null;
    this.updateInitiativeIndicator();

    if (this.gameState.firstActor === 'enemy') {
      this.enemyTakeAction();
      this.enemyActionUsed = true;
      this.refreshBoardLabels();
      this.redrawHand();
      this.refreshHeroHP();
      this.resetCardHighlights();
      this.updateInitiativeIndicator();
    }
  }

  completePlayerAction() {
    if (this.playerActionUsed || this.gameState.winner) return;

    this.playerActionUsed = true;
    this.refreshAfterPlayerAction();
    this.finishTurnAfterBothActions();
  }

  finishTurnAfterBothActions() {
    if (!this.gameState || this.gameState.winner) {
      this.updateInitiativeIndicator();
      return;
    }

    if (!this.enemyActionUsed) {
      this.enemyTakeAction();
      this.enemyActionUsed = true;
      this.refreshBoardLabels();
      this.redrawHand();
      this.refreshHeroHP();
    }

    resolveCombat(this.gameState);
    drawCards(this.gameState.player, 1);
    drawCards(this.gameState.enemy, 1);

    this.refreshBoardLabels();
    this.redrawHand();
    this.refreshHeroHP();
    this.resetCardHighlights();

    if (this.gameState.winner) {
      this.updateInitiativeIndicator();
      return;
    }

    toggleFirstActor(this.gameState);
    this.startTurn();
  }

  updateInitiativeIndicator() {
    const active = this.gameState && !this.gameState.winner ? this.gameState.firstActor : null;
    const playerActive = active === 'player';
    const enemyActive = active === 'enemy';

    if (this.playerHeroPanel) {
      this.playerHeroPanel.setStrokeStyle(playerActive ? 4 : 2, playerActive ? 0xfacc15 : 0x60a5fa, playerActive ? 0.95 : 0.6);
      this.playerHeroPanel.setFillStyle(0x111827, playerActive ? 0.62 : 0.45);
    }
    if (this.enemyHeroPanel) {
      this.enemyHeroPanel.setStrokeStyle(enemyActive ? 4 : 2, enemyActive ? 0xfacc15 : 0xf87171, enemyActive ? 0.95 : 0.6);
      this.enemyHeroPanel.setFillStyle(0x111827, enemyActive ? 0.62 : 0.45);
    }
    if (this.playerInitiativeIcon) this.playerInitiativeIcon.setVisible(playerActive);
    if (this.enemyInitiativeIcon) this.enemyInitiativeIcon.setVisible(enemyActive);
  }

  refreshAfterPlayerAction() {
    this.selectedCardId = null;
    this.pendingSwapIndex = null;
    this.targetingState = null;
    this.refreshBoardLabels();
    this.redrawHand();
    this.refreshHeroHP();
    this.resetCardHighlights();
  }

  enemyTakeAction() {
    const action = chooseEnemyAction(this.gameState);
    const cancelEnemyOrder = Boolean(this.gameState.cancelEnemyOrderThisTurn?.player);
    const isEnemyNonUnitAction = action.type === 'play-effect' || action.type === 'play-targeted-effect';

    if (cancelEnemyOrder && isEnemyNonUnitAction) {
      this.gameState.cancelEnemyOrderThisTurn.player = false;
      return;
    }

    if (action.type === 'play-unit') {
      playOrRedeployUnit(this.gameState, 'enemy', action.cardId, action.slotIndex);
      return;
    }

    if (action.type === 'play-effect') {
      playEffectCard(this.gameState, 'enemy', action.cardId);
      this.gameState.cancelEnemyOrderThisTurn.player = false;
      return;
    }

    if (action.type === 'play-targeted-effect') {
      resolveTargetedEffectCard(this.gameState, 'enemy', action.cardId, action.targetIndex, [action.targetIndex]);
      this.gameState.cancelEnemyOrderThisTurn.player = false;
      return;
    }

  }



  redrawHand() {
    this.cardViews.forEach((view) => {
      view.background.destroy();
      view.label.destroy();
      view.hitArea.destroy();
    });
    this.cardViews = [];
    this.drawHand();
  }

  getBoardUnitLabel(unit) {
    if (!unit) return '';

    const name = unit.name ?? 'Unit';
    const atk = getUnitAttack(unit);
    const hp = Number.isFinite(unit.hp) ? unit.hp : 0;
    const armor = getUnitArmor(unit);

    const statParts = [`ATK ${atk}`];
    if (armor > 0) {
      statParts.push(`ARM ${armor}`);
    }
    statParts.push(`HP ${hp}`);

    return `${name}
${statParts.join(' | ')}`;
  }

  refreshBoardLabels() {
    this.boardCells.forEach((cell) => {
      const unit = this.gameState.board[cell.index];
      cell.label.setText(this.getBoardUnitLabel(unit));
      if (cell.row === 2) {
        const lane = cell.index % 3;
        cell.blockedMarker.setText(this.gameState.playerLanePlayBlockedThisTurn?.[lane] ? '✕' : '');
      } else {
        cell.blockedMarker.setText('');
      }
    });
  }

  refreshHeroHP() {
    if (!this.enemyHpText || !this.playerHpText) {
      const { width, topHero, playerHero } = this.layout;
      this.enemyHpText = this.add.text(width * 0.5, topHero.centerY + topHero.h * 0.2, '', { fontFamily: 'Arial, sans-serif', fontSize: `${Math.max(18, Math.floor(topHero.h * 0.38))}px`, color: '#f8fafc', fontStyle: 'bold' }).setOrigin(0.5);
      this.playerHpText = this.add.text(width * 0.5, playerHero.centerY + playerHero.h * 0.2, '', { fontFamily: 'Arial, sans-serif', fontSize: `${Math.max(16, Math.floor(playerHero.h * 0.36))}px`, color: '#f8fafc', fontStyle: 'bold' }).setOrigin(0.5);
    }
    this.enemyHpText.setText(`${this.gameState.enemyHP} / 12`);
    this.playerHpText.setText(`${this.gameState.playerHP} / 12`);
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

    this.boardCells.forEach((cell) => {
      const isValidFriendlyTarget = this.isValidTarget(cell.index, 'friendly-unit');
      const isValidEnemyTarget = this.isValidTarget(cell.index, 'enemy-unit');
      let strokeColor = cell.row === 1 ? 0x94a3b8 : 0xcbd5e1;
      let strokeAlpha = cell.row === 1 ? 0.3 : 0.55;

      if (this.targetingState?.targetType === 'friendly-unit' && isValidFriendlyTarget) {
        strokeColor = 0x22c55e;
        strokeAlpha = 1;
      } else if (this.targetingState?.targetType === 'enemy-unit' && isValidEnemyTarget) {
        strokeColor = 0xef4444;
        strokeAlpha = 1;
      } else if (this.targetingState?.targetType === 'any-unit' && (isValidFriendlyTarget || isValidEnemyTarget)) {
        strokeColor = 0xa855f7;
        strokeAlpha = 1;
      }
      cell.background.setStrokeStyle(cell.row === 1 ? 2 : 3, strokeColor, strokeAlpha);
    });
  }

  isUnitCard(card) {
    return card?.type === 'unit';
  }

  getTargetingStateForCard(card) {
    if (!card || this.isUnitCard(card)) return null;
    if (card.effectId === 'return_friendly_draw_1' || card.effectId === 'destroy_friendly_draw_2' || card.effectId === 'quick_strike' || card.effectId === 'heal_2' || card.effectId === 'heal_3') {
      return { cardId: card.id, targetType: 'friendly-unit', requiredTargets: 1, targetIndexes: [] };
    }
    if (card.effectId === 'enemy_lane_atk_minus_1' || card.effectId === 'ignore_armor_next_attack' || card.effectId === 'control_enemy_unit_this_turn') {
      return { cardId: card.id, targetType: 'enemy-unit', requiredTargets: 1, targetIndexes: [] };
    }
    if (card.effectId === 'swap_two_enemy_units') {
      return { cardId: card.id, targetType: 'enemy-unit', requiredTargets: 2, targetIndexes: [] };
    }
    if (card.effectId === 'swap_any_two_units') {
      return { cardId: card.id, targetType: 'any-unit', requiredTargets: 2, targetIndexes: [] };
    }
    if (card.effectId === 'swap_adjacent_then_resolve') {
      return { cardId: card.id, targetType: 'friendly-unit', requiredTargets: 1, targetIndexes: [] };
    }
    return null;
  }

  isValidTarget(boardIndex, targetType) {
    const unit = this.gameState.board[boardIndex];
    if (!unit) return false;
    if (targetType === 'friendly-unit') return unit.owner === 'player';
    if (targetType === 'enemy-unit') return unit.owner === 'enemy';
    if (targetType === 'any-unit') return true;
    return false;
  }

}
