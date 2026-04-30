import Phaser from 'phaser';

document.body.insertAdjacentHTML(
  'beforeend',
  '<div style="position:fixed;top:40px;left:0;background:blue;color:white;z-index:9999;padding:10px;">JS OK</div>'
);

const config = {
  type: Phaser.AUTO,
  width: 300,
  height: 200,
  parent: document.body,
  scene: {
    create() {
      this.add.text(50, 80, 'PHASER OK', {
        color: '#00ff00',
        fontSize: '20px'
      });
    }
  }
};

new Phaser.Game(config);
