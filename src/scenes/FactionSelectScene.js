import Phaser from 'phaser';

const FACTIONS = ['Aggro', 'Tank', 'Control', 'Swarm'];

export default class FactionSelectScene extends Phaser.Scene {
  constructor() {
    super('FactionSelectScene');
  }

  create() {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height * 0.16, 'Select Faction', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '36px',
        color: '#f9fafb',
      })
      .setOrigin(0.5);

    const baseY = height * 0.3;
    const stepY = 90;

    FACTIONS.forEach((faction, index) => {
      const button = this.add
        .text(width / 2, baseY + index * stepY, faction, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '30px',
          color: '#111827',
          backgroundColor: '#93c5fd',
          padding: { x: 22, y: 12 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      button.on('pointerup', () => {
        this.scene.start('BattleScene', { faction });
      });
    });
  }
}
