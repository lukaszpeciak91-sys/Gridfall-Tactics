import Phaser from 'phaser';

export default class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
  }

  create(data) {
    const { width, height } = this.scale;
    const faction = data?.faction ?? 'Unknown';

    this.add
      .text(width / 2, height * 0.1, 'Battle Scene', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '38px',
        color: '#f9fafb',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.17, `Faction: ${faction}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '28px',
        color: '#fde68a',
      })
      .setOrigin(0.5);

    this.drawPlaceholderGrid(width / 2, height * 0.55, 90);
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
