import Phaser from 'phaser';
import StartScene from './scenes/StartScene.js';
import MainMenuScene from './scenes/MainMenuScene.js';
import FactionSelectScene from './scenes/FactionSelectScene.js';
import CollectionScene from './scenes/CollectionScene.js';
import SettingsScene from './scenes/SettingsScene.js';
import TutorialScene from './scenes/TutorialScene.js';
import BattleScene from './scenes/BattleScene.js';
import BattleMenuScene from './scenes/BattleMenuScene.js';
import RulesPanelScene from './scenes/RulesPanelScene.js';
import { installSessionLifecycle } from './systems/sessionLifecycle.js';
import { installFullscreenPortraitFit } from './systems/fullscreenPortraitFit.js';
import { installHighDpiCanvas } from './rendering/highDpiCanvas.js';
import { getRestorableUiRouteScene } from './systems/uiRouteState.js';

// Scene boot order preserves SettingsScene, TutorialScene, BattleScene registration sequence.
const SCENE_BOOT_ORDER = [
  ['StartScene', StartScene],
  ['MainMenuScene', MainMenuScene],
  ['FactionSelectScene', FactionSelectScene],
  ['CollectionScene', CollectionScene],
  ['SettingsScene', SettingsScene],
  ['TutorialScene', TutorialScene],
  ['BattleScene', BattleScene],
  ['BattleMenuScene', BattleMenuScene],
  ['RulesPanelScene', RulesPanelScene],
];
const SCENE_CLASSES = Object.fromEntries(SCENE_BOOT_ORDER);

const DEFAULT_INITIAL_SCENE = 'StartScene';
const initialSceneKey = getRestorableUiRouteScene() ?? DEFAULT_INITIAL_SCENE;
const initialSceneClass = SCENE_CLASSES[initialSceneKey] ?? StartScene;
const sceneList = [
  initialSceneClass,
  ...SCENE_BOOT_ORDER
    .filter(([sceneKey]) => sceneKey !== initialSceneKey)
    .map(([, sceneClass]) => sceneClass),
];

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
  scene: sceneList,
};

const game = new Phaser.Game(config);
installHighDpiCanvas(game);
installSessionLifecycle(game);
installFullscreenPortraitFit(game);
