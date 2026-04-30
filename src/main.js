import Phaser from 'phaser';

document.body.insertAdjacentHTML(
  'beforeend',
  '<div style="position:fixed;top:40px;left:0;background:blue;color:white;z-index:9999;padding:10px;">JS OK</div>'
);

class BootCheckScene extends Phaser.Scene {
  constructor() {
    super('BootCheckScene');
  }

  create() {
    this.add
      .text(40, 110, 'PHASER OK', {
        fontSize: '40px',
        color: '#00ff88',
        fontFamily: 'Arial, sans-serif'
      })
      .setDepth(1);
  }
}

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: '#111111',
  parent: 'app',
  scene: [BootCheckScene]
};

window.__gridfallGame = new Phaser.Game(config);
