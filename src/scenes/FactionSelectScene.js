import Phaser from 'phaser';
import { getFactionKeys } from '../data/factions/index.js';

export default class FactionSelectScene extends Phaser.Scene {
  constructor() {
    super('FactionSelectScene');
  }

  create() {
    const { width, height } = this.scale;
    const factionKeys = getFactionKeys();

    this.add
      .text(width / 2, height * 0.16, 'Select Faction', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '36px',
        color: '#f9fafb',
      })
      .setOrigin(0.5);

    const baseY = height * 0.3;
    const stepY = 90;

    this.debugText = this.add
      .text(width / 2, height * 0.9, 'Waiting for selection…', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#fde68a',
      })
      .setOrigin(0.5);

    factionKeys.forEach((factionKey, index) => {
      const y = baseY + index * stepY;
      const button = this.add
        .text(width / 2, y, factionKey, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '30px',
          color: '#111827',
          backgroundColor: '#93c5fd',
          padding: { x: 22, y: 12 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      button.on('pointerover', () => button.setBackgroundColor('#bfdbfe'));
      button.on('pointerout', () => button.setBackgroundColor('#93c5fd'));
      button.on('pointerup', () => {
        this.debugText.setText(`Selected: ${factionKey}`);
        console.log('[FactionSelectScene] Clicked faction:', factionKey);
        this.scene.start('BattleScene', { factionKey });
      });
    });
  }
}
