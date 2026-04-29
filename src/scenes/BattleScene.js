import Phaser from 'phaser';
import { getFactionByKey } from '../data/factions';
import { createInitialBattleState, drawCards } from '../systems/GameState';

export default class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
  }

  create(data) {
    const { width, height } = this.scale;
    const factionKey = data?.faction ?? 'Aggro';
    const factionData = getFactionByKey(factionKey) ?? { name: 'Unknown', deck: [] };

    this.gameState = createInitialBattleState(factionData);
    drawCards(this.gameState, 3);

    this.add
      .text(width / 2, height * 0.08, 'Battle Scene', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '38px',
        color: '#f9fafb',
      })
      .setOrigin(0.5);

    this.drawPlaceholderGrid(width / 2, height * 0.5, 90);
    this.renderDebugInfo(width * 0.08, height * 0.72);
  }

  renderDebugInfo(x, y) {
    const handCardNames = this.gameState.player.hand.map((card) => card.name).join(', ') || '(none)';

    const debugText = [
      `Faction: ${this.gameState.player.factionName}`,
      `Deck Remaining: ${this.gameState.player.deck.length}`,
      `Hand Size: ${this.gameState.player.hand.length}`,
      `Hand Cards: ${handCardNames}`,
    ].join('\n');

    this.add.text(x, y, debugText, {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: '#e5e7eb',
      lineSpacing: 10,
    });
  }

  drawPlaceholderGrid(centerX, centerY, cellSize) {
    const size = cellSize * 3;
    const startX = centerX - size / 2;
    const startY = centerY - size / 2;
    const graphics = this.add.graphics({ lineStyle: { width: 4, color: 0x9ca3af } });

    for (let i = 0; i <= 3; i += 1) {
      graphics.lineBetween(startX + i * cellSize, startY, startX + i * cellSize, startY + size);
      graphics.lineBetween(startX, startY + i * cellSize, startX + size, startY + i * cellSize);
    }
  }
}
