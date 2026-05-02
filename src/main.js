import Phaser from 'phaser';
import StartScene from './scenes/StartScene.js';
import FactionSelectScene from './scenes/FactionSelectScene.js';
import BattleScene from './scenes/BattleScene.js';
import BattleMenuScene from './scenes/BattleMenuScene.js';

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
  scene: [StartScene, FactionSelectScene, BattleScene, BattleMenuScene],
};

new Phaser.Game(config);
