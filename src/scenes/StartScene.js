import Phaser from 'phaser';

export default class StartScene extends Phaser.Scene {
  constructor() {
    super('StartScene');
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#111827');

    this.add
      .text(width / 2, height * 0.15, 'GRIDFALL TACTICS', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#f9fafb',
        align: 'center',
        wordWrap: { width: width * 0.9 },
      })
      .setOrigin(0.5, 0);

    const startButton = this.add
      .text(width / 2, height * 0.38, 'START', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '36px',
        fontStyle: 'bold',
        color: '#111827',
        backgroundColor: '#93c5fd',
        padding: { x: 28, y: 14 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startButton.on('pointerover', () => {
      startButton.setBackgroundColor('#bfdbfe');
    });

    startButton.on('pointerout', () => {
      startButton.setBackgroundColor('#93c5fd');
    });

    startButton.on('pointerup', () => {
      this.scene.start('FactionSelectScene');
    });
  }
}
