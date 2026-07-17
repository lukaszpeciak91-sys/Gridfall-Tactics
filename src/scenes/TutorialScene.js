import Phaser from 'phaser';
import {
  MENU_BACKGROUND_FALLBACK_COLOR,
  MENU_BACKGROUND_FALLBACK_COLOR_HEX,
  createAnimatedMenuBackground,
  preloadMenuBackgroundArt,
} from '../rendering/backgroundArt.js';
import { createBuildMarker } from '../ui/buildMarker.js';
import { createMenuScreenHeader } from '../ui/screenHeader.js';
import { createBottomNavigationControls, requestPortraitOrientationLock, toggleSceneFullscreen } from '../ui/navigationControls.js';
import { translateActive, translateActiveList } from '../localization/localeService.js';
import { preloadAudioAssets } from '../audio/audioAssets.js';
import { playMenuMusic } from '../audio/menuMusic.js';

const TUTORIAL_STEPS = Object.freeze([
  'Pick a faction for Arena.',
  'Play units into lines to pressure the enemy base.',
  'Use effect cards and swaps to control combat timing.',
  'End your turn after spending your action.',
  'Reduce the enemy base to 0 HP to win.',
]);

export default class TutorialScene extends Phaser.Scene {
  constructor() {
    super('TutorialScene');
    this.uiElements = [];
    this.returnSceneKey = 'MainMenuScene';
  }

  init(data = {}) {
    this.cleanupScene();
    this.returnSceneKey = data?.returnSceneKey === 'GameMenuScene' ? 'GameMenuScene' : 'MainMenuScene';
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
    this.menuBackground = createAnimatedMenuBackground(this, {
      fallbackColor: MENU_BACKGROUND_FALLBACK_COLOR,
      width,
      height,
      lightSweepOptions: {
        opacity: 0.07,
        y: height * 0.28,
      },
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
    this.scale.on('enterfullscreen', this.onFullscreenChanged, this);
    this.scale.on('leavefullscreen', this.onFullscreenChanged, this);

    const header = createMenuScreenHeader(this, {
      title: translateActive('ui.tutorial.title', 'TUTORIAL'),
      width,
      height,
    });
    this.uiElements.push(...header.items);
    this.drawTutorialCard(width, height);
    this.drawNavigationControls();
    this.uiElements.push(createBuildMarker(this, { width, height }));
  }

  drawTutorialCard(width, height) {
    const cardWidth = Math.min(width - 32, 360);
    const cardHeight = Math.min(height * 0.56, 470);
    const cardX = width / 2;
    const cardY = height * 0.47;
    const panel = this.add.rectangle(cardX, cardY, cardWidth, cardHeight, 0x0f172a, 0.9)
      .setStrokeStyle(1, 0x7dd3fc, 0.58)
      .setOrigin(0.5);
    this.uiElements.push(panel);

    const lines = translateActiveList('ui.tutorial.steps', TUTORIAL_STEPS);
    const body = this.add.text(cardX - cardWidth / 2 + 24, cardY - cardHeight / 2 + 28, lines.map((line, index) => `${index + 1}. ${line}`).join('\n\n'), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '17px',
      color: '#e5e7eb',
      lineSpacing: 8,
      wordWrap: { width: cardWidth - 48 },
    }).setOrigin(0, 0);
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
    this.scene.start(this.returnSceneKey);
  }

  openRulesPanel() {
    this.scene.launch('RulesPanelScene', { returnSceneKey: 'TutorialScene' });
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

    if (this.scene.isActive('TutorialScene')) {
      this.scene.restart({ returnSceneKey: this.returnSceneKey });
    }
  }

  cleanupScene() {
    this.scale?.off('enterfullscreen', this.onFullscreenChanged, this);
    this.scale?.off('leavefullscreen', this.onFullscreenChanged, this);

    this.uiElements.forEach((element) => {
      if (element && element.active) {
        element.removeAllListeners?.();
        element.destroy();
      }
    });
    this.uiElements = [];
  }
}
