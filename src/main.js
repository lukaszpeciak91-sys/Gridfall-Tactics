import Phaser from 'phaser';
import StartScene from './scenes/StartScene.js';
import FactionSelectScene from './scenes/FactionSelectScene.js';
import BattleScene from './scenes/BattleScene.js';

const appRoot = document.getElementById('app');

if (appRoot) {
  appRoot.innerHTML = 'BOOTING...';
}

window.onerror = function onGlobalError(e) {
  const root = document.getElementById('app');
  if (root) {
    root.innerHTML = `ERROR: ${e}`;
  }
  return false;
};

console.log('BOOT START');

if (appRoot) {
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

window.__gridfallGame = new Phaser.Game(config);

window.setTimeout(() => {
  const root = document.getElementById('app');
  const canvas = root?.querySelector('canvas');

  if (canvas) {
    console.log('Canvas mounted', {
      width: canvas.width,
      height: canvas.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight,
    });
    return;
  }

  console.error('Canvas not found under #app after boot timeout');
  if (root) {
    root.innerHTML = 'Canvas not created. Open DevTools console for boot errors.';
    root.style.padding = '16px';
    root.style.textAlign = 'center';
  }
}, 2000);
