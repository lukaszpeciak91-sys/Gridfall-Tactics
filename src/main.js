import Phaser from 'phaser';
import StartScene from './scenes/StartScene.js';
import FactionSelectScene from './scenes/FactionSelectScene.js';
import BattleScene from './scenes/BattleScene.js';

const appRoot = document.getElementById('app');

if (appRoot) {
  appRoot.textContent = 'Gridfall booting...';
  appRoot.style.color = '#f9fafb';
  appRoot.style.fontFamily = 'Arial, sans-serif';
  appRoot.style.fontSize = '24px';
}

console.log('Gridfall boot: main.js executing');

const config = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 390,
  height: 844,
  backgroundColor: '#111827',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [StartScene, FactionSelectScene, BattleScene],
};

try {
  window.__gridfallGame = new Phaser.Game(config);
  console.log('Gridfall boot: Phaser.Game created');
} catch (error) {
  console.error('Gridfall boot failed before Phaser render', error);
}
