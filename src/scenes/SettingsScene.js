import Phaser from 'phaser';
import {
  MENU_BACKGROUND_FALLBACK_COLOR,
  MENU_BACKGROUND_FALLBACK_COLOR_HEX,
  createCoverBackground,
  getMenuBackgroundAsset,
  preloadMenuBackgroundArt,
} from '../rendering/backgroundArt.js';

export default class SettingsScene extends Phaser.Scene {
  constructor() {
    super('SettingsScene');
    this.languageStatus = null;
    this.volumeStatus = null;
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

    this.add
      .text(width / 2, 54, 'SETTINGS', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        color: '#f8fafc',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 98, 'Temporary placeholders', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);

    this.addPanel(width / 2, height * 0.31, Math.min(width - 32, 342), 160, 'LANGUAGE');
    this.createChoiceButton(width / 2 - 76, height * 0.32, 'English', () => this.languageStatus.setText('Language: English'));
    this.createChoiceButton(width / 2 + 76, height * 0.32, 'Polish', () => this.languageStatus.setText('Language: Polish'));
    this.languageStatus = this.add
      .text(width / 2, height * 0.38, 'Language: English', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#fde68a',
      })
      .setOrigin(0.5);

    this.addPanel(width / 2, height * 0.56, Math.min(width - 32, 342), 176, 'MUSIC VOLUME');
    this.volumeStatus = this.add
      .text(width / 2, height * 0.55, 'Volume placeholder: 50', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        color: '#e5e7eb',
      })
      .setOrigin(0.5);
    [0, 50, 100].forEach((value, index) => {
      this.createChoiceButton(width / 2 - 92 + index * 92, height * 0.62, String(value), () => {
        this.volumeStatus.setText(`Volume placeholder: ${value}`);
      });
    });

    this.createBackButton(width, height);
  }

  addPanel(x, y, width, height, title) {
    this.add.rectangle(x + 2, y + 4, width, height, 0x020617, 0.36).setOrigin(0.5);
    this.add.rectangle(x, y, width, height, 0x0f172a, 0.88).setStrokeStyle(1, 0x334155, 0.9).setOrigin(0.5);
    this.add
      .text(x, y - height / 2 + 22, title, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#93c5fd',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
  }

  createChoiceButton(x, y, label, onPointerUp) {
    const button = this.add
      .text(x, y, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#111827',
        backgroundColor: '#93c5fd',
        fontStyle: 'bold',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on('pointerover', () => button.setBackgroundColor('#bfdbfe'));
    button.on('pointerout', () => button.setBackgroundColor('#93c5fd'));
    button.on('pointerup', onPointerUp);
  }

  createBackButton(width, height) {
    const backButton = this.add
      .text(width / 2, height - 54, 'BACK', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#f8fafc',
        backgroundColor: '#334155',
        fontStyle: 'bold',
        padding: { x: 24, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    backButton.on('pointerover', () => backButton.setBackgroundColor('#475569'));
    backButton.on('pointerout', () => backButton.setBackgroundColor('#334155'));
    backButton.on('pointerup', () => this.scene.start('MainMenuScene'));
  }
}
