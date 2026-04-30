import Phaser from 'phaser';

export default class StartScene extends Phaser.Scene {
  constructor() {
    super('StartScene');
  }

  create() {
    console.log('StartScene create');
    const { width, height } = this.scale;


    this.add
      .text(width / 2, height * 0.08, 'StartScene loaded', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#facc15',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.35, 'Gridfall Tactics', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '40px',
        color: '#f9fafb',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const startButton = this.add
      .text(width / 2, height * 0.6, 'START', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        color: '#111827',
        backgroundColor: '#34d399',
        padding: { x: 28, y: 14 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startButton.on('pointerup', () => {
      this.scene.start('FactionSelectScene');
    });
  }
}
