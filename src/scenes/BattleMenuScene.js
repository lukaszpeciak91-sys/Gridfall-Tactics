import Phaser from 'phaser';

export default class BattleMenuScene extends Phaser.Scene {
  constructor() {
    super('BattleMenuScene');
  }

  create(data) {
    const { width, height } = this.scale;
    const factionKey = typeof data?.factionKey === 'string' && data.factionKey ? data.factionKey : 'Aggro';

    this.cameras.main.setBackgroundColor('#05080f');

    this.add
      .text(width * 0.5, height * 0.18, 'MENU', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '42px',
        color: '#f8fafc',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width * 0.5, height * 0.5, 'Menu options coming soon.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#cbd5e1',
        align: 'center',
      })
      .setOrigin(0.5);

    const backButton = this.add
      .text(width * 0.08, height * 0.94, '←', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '36px',
        color: '#cbd5e1',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });

    backButton.on('pointerup', () => {
      this.scene.start('BattleScene', { factionKey });
    });
  }
}
