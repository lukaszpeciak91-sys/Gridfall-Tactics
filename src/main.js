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

const existingGame = globalThis.__GRIDFALL_TACTICS_GAME__;
if (existingGame) {
  existingGame.destroy(true);
}

const game = new Phaser.Game(config);
globalThis.__GRIDFALL_TACTICS_GAME__ = game;

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy(true);
    if (globalThis.__GRIDFALL_TACTICS_GAME__ === game) {
      delete globalThis.__GRIDFALL_TACTICS_GAME__;
    }
  });
}
