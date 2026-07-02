import Phaser from 'phaser';
import {
  MENU_BACKGROUND_FALLBACK_COLOR,
  MENU_BACKGROUND_FALLBACK_COLOR_HEX,
  createCoverBackground,
  createMenuArenaLightSweep,
  getMenuBackgroundAsset,
  preloadMenuBackgroundArt,
} from '../rendering/backgroundArt.js';
import { createBuildMarker } from '../ui/buildMarker.js';
import { createMenuScreenHeader } from '../ui/screenHeader.js';
import { createBottomNavigationControls, requestPortraitOrientationLock, toggleSceneFullscreen } from '../ui/navigationControls.js';
import { translateActive } from '../localization/localeService.js';
import { preloadAudioAssets } from '../audio/audioAssets.js';
import { playMenuMusic } from '../audio/menuMusic.js';

export default class AchievementsScene extends Phaser.Scene {
  constructor() {
    super('AchievementsScene');
    this.uiElements = [];
  }

  init() {
    this.cleanupScene();
  }

  preload() {
    preloadMenuBackgroundArt(this);
    preloadAudioAssets(this);
  }

  create() {
    this.cleanupScene();
    playMenuMusic(this);

    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor(MENU_BACKGROUND_FALLBACK_COLOR_HEX);
    createCoverBackground(this, {
      asset: getMenuBackgroundAsset(),
      fallbackColor: MENU_BACKGROUND_FALLBACK_COLOR,
      width,
      height,
    });
    createMenuArenaLightSweep(this, {
      width,
      height,
      opacity: 0.07,
      y: height * 0.28,
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
    this.scale.on('enterfullscreen', this.onFullscreenChanged, this);
    this.scale.on('leavefullscreen', this.onFullscreenChanged, this);

    const header = createMenuScreenHeader(this, {
      title: translateActive('ui.achievements.title', 'ACHIEVEMENTS'),
      width,
      height,
    });
    this.uiElements.push(...header.items);
    this.drawPlaceholderPanel(width, height);
    this.drawNavigationControls();
    this.uiElements.push(createBuildMarker(this, { width, height }));
  }

  drawPlaceholderPanel(width, height) {
    const panelWidth = Math.min(width - 32, 360);
    const panelHeight = Math.min(height * 0.28, 220);
    const panelX = width / 2;
    const panelY = height * 0.47;
    const panel = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x0f172a, 0.9)
      .setStrokeStyle(1, 0x7dd3fc, 0.58)
      .setOrigin(0.5);
    this.uiElements.push(panel);

    const body = this.add.text(panelX, panelY, translateActive('ui.achievements.comingSoon', 'Coming soon.'), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#e5e7eb',
      align: 'center',
      wordWrap: { width: panelWidth - 48 },
    }).setOrigin(0.5);
    this.uiElements.push(body);
  }

  drawNavigationControls() {
    const controls = createBottomNavigationControls(this, {
      onBack: () => this.returnToMainMenu(),
      onRules: () => this.openRulesPanel(),
      onFullscreen: () => this.toggleFullscreen(),
    });

    [controls.back, controls.rules, controls.fullscreen].forEach((control) => {
      this.uiElements.push(control.halo, control.backing, control.text);
    });
  }

  returnToMainMenu() {
    this.scene.start('MainMenuScene');
  }

  openRulesPanel() {
    this.scene.launch('RulesPanelScene', { returnSceneKey: 'AchievementsScene' });
    this.scene.pause();
  }

  resumeFromRulesPanel() {
    this.scene.resume();
  }

  toggleFullscreen() {
    toggleSceneFullscreen(this);
  }

  onFullscreenChanged() {
    if (this.scale.isFullscreen) {
      requestPortraitOrientationLock();
    }

    if (this.scene.isActive('AchievementsScene')) {
      this.scene.restart();
    }
  }

  cleanupScene() {
    this.scale?.off('enterfullscreen', this.onFullscreenChanged, this);
    this.scale?.off('leavefullscreen', this.onFullscreenChanged, this);

    this.uiElements.forEach((element) => {
      if (element && element.active) {
        element.destroy();
      }
    });
    this.uiElements = [];
  }
}
