import Phaser from 'phaser';

export default class StartScene extends Phaser.Scene {
  constructor() {
    super('StartScene');
  }

  create() {
    console.log('START SCENE CREATE');
    this.cameras.main.setBackgroundColor('#111827');
    this.add.text(100, 100, 'START OK', { color: '#ffffff' });
  }
}
