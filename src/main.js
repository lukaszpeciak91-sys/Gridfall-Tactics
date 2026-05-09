import Phaser from 'phaser';
import StartScene from './scenes/StartScene.js';
import FactionSelectScene from './scenes/FactionSelectScene.js';
import BattleScene from './scenes/BattleScene.js';
import BattleMenuScene from './scenes/BattleMenuScene.js';
import RulesPanelScene from './scenes/RulesPanelScene.js';
import { installSessionLifecycle } from './systems/sessionLifecycle.js';
import { installFullscreenPortraitFit } from './systems/fullscreenPortraitFit.js';

const config = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 390,
  height: 844,
  backgroundColor: '#111827',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    fullscreenTarget: 'app',
  },
  scene: [StartScene, FactionSelectScene, BattleScene, BattleMenuScene, RulesPanelScene],
};

const game = new Phaser.Game(config);
installSessionLifecycle(game);
installFullscreenPortraitFit(game);
