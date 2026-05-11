import Phaser from 'phaser';
import {
  MENU_BACKGROUND_FALLBACK_COLOR,
  MENU_BACKGROUND_FALLBACK_COLOR_HEX,
  createCoverBackground,
  createMenuArenaLightSweep,
  getMenuBackgroundAsset,
  preloadMenuBackgroundArt,
} from '../rendering/backgroundArt.js';
import { createBottomNavigationControls, requestPortraitOrientationLock, toggleSceneFullscreen } from '../ui/navigationControls.js';

const BUTTON_STYLE = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '26px',
  fontStyle: 'bold',
  color: '#111827',
  backgroundColor: '#93c5fd',
  align: 'center',
  padding: { x: 20, y: 12 },
};

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenuScene');
    this.statusText = null;
  }

  init() {
    this.cleanupScene();
  }

  preload() {
    preloadMenuBackgroundArt(this);
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor(MENU_BACKGROUND_FALLBACK_COLOR_HEX);
    createCoverBackground(this, {
      asset: getMenuBackgroundAsset(),
      fallbackColor: MENU_BACKGROUND_FALLBACK_COLOR,
      width,
      height,
    });
    createMenuArenaLightSweep(this, { width, height });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
    this.scale.on('enterfullscreen', this.onFullscreenChanged, this);
    this.scale.on('leavefullscreen', this.onFullscreenChanged, this);

    this.add
      .text(width / 2, height * 0.13, 'GRIDFALL TACTICS', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#f8fafc',
        align: 'center',
        wordWrap: { width: width * 0.86 },
      })
      .setOrigin(0.5);

    const buttonWidth = Math.min(width - 64, 292);
    const buttonGap = 76;
    const startY = height * 0.31;

    this.createMenuButton(width / 2, startY, buttonWidth, 'ARENA', () => {
      this.scene.start('FactionSelectScene');
    });

    this.createMenuButton(width / 2, startY + buttonGap, buttonWidth, 'TUTORIAL', () => {
      this.statusText.setText('Tutorial coming soon');
      this.tweens.add({ targets: this.statusText, alpha: 1, duration: 120 });
    });

    this.createMenuButton(width / 2, startY + buttonGap * 2, buttonWidth, 'COLLECTION', () => {
      this.scene.start('CollectionScene');
    });

    this.createMenuButton(width / 2, startY + buttonGap * 3, buttonWidth, 'SETTINGS', () => {
      this.scene.start('SettingsScene');
    });

    this.statusText = this.add
      .text(width / 2, Math.min(height - 112, startY + buttonGap * 3 + 70), '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        color: '#fde68a',
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.drawNavigationControls();
  }

  drawNavigationControls() {
    createBottomNavigationControls(this, {
      onBack: () => this.returnToStartScene(),
      onRules: () => this.openRulesPanel(),
      onFullscreen: () => this.toggleFullscreen(),
    });
  }

  returnToStartScene() {
    this.scene.start('StartScene');
  }

  openRulesPanel() {
    this.scene.launch('RulesPanelScene', { returnSceneKey: 'MainMenuScene' });
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

    if (this.scene.isActive('MainMenuScene')) {
      this.scene.restart();
    }
  }

  cleanupScene() {
    this.scale?.off('enterfullscreen', this.onFullscreenChanged, this);
    this.scale?.off('leavefullscreen', this.onFullscreenChanged, this);
  }

  createMenuButton(x, y, width, label, onPointerUp) {
    const shadow = this.add.rectangle(x + 2, y + 3, width, 54, 0x020617, 0.32).setOrigin(0.5);
    const backing = this.add
      .rectangle(x, y, width, 54, 0x93c5fd, 1)
      .setStrokeStyle(1, 0xbfdbfe, 0.7)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, BUTTON_STYLE).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const setHover = (isHovering) => {
      backing.setFillStyle(isHovering ? 0xbfdbfe : 0x93c5fd, 1);
      text.setBackgroundColor(isHovering ? '#bfdbfe' : '#93c5fd');
      shadow.setAlpha(isHovering ? 0.48 : 1);
    };

    [backing, text].forEach((target) => {
      target.on('pointerover', () => setHover(true));
      target.on('pointerout', () => setHover(false));
      target.on('pointerup', onPointerUp);
    });
  }
}
