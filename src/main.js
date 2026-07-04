import Phaser from 'phaser';
import StartScene from './scenes/StartScene.js';
import MainMenuScene from './scenes/MainMenuScene.js';
import GameMenuScene from './scenes/GameMenuScene.js';
import FactionSelectScene from './scenes/FactionSelectScene.js';
import CampaignEnemySelectScene from './scenes/CampaignEnemySelectScene.js';
import CollectionScene from './scenes/CollectionScene.js';
import AchievementsScene from './scenes/AchievementsScene.js';
import SettingsScene from './scenes/SettingsScene.js';
import TutorialScene from './scenes/TutorialScene.js';
import BattleScene from './scenes/BattleScene.js';
import BattleMenuScene from './scenes/BattleMenuScene.js';
import RulesPanelScene from './scenes/RulesPanelScene.js';
import ArtDebugModeSelectScene from './scenes/ArtDebugModeSelectScene.js';
import ArtViewportDebugScene from './scenes/ArtViewportDebugScene.js';
import BoardUnitArtViewportDebugScene from './scenes/BoardUnitArtViewportDebugScene.js';
import { installSessionLifecycle } from './systems/sessionLifecycle.js';
import { installFullscreenPortraitFit } from './systems/fullscreenPortraitFit.js';
import { installHighDpiCanvas } from './rendering/highDpiCanvas.js';
import { exposeBuildInfoGlobal, logBuildInfo } from './buildInfo.js';

exposeBuildInfoGlobal();
logBuildInfo();

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
  render: {
    antialias: true,
    antialiasGL: true,
    pixelArt: false,
  },
  scene: [StartScene, MainMenuScene, GameMenuScene, FactionSelectScene, CampaignEnemySelectScene, CollectionScene, AchievementsScene, SettingsScene, TutorialScene, BattleScene, BattleMenuScene, RulesPanelScene, ArtDebugModeSelectScene, ArtViewportDebugScene, BoardUnitArtViewportDebugScene],
};

const game = new Phaser.Game(config);
installHighDpiCanvas(game);
installSessionLifecycle(game);
installFullscreenPortraitFit(game);
