import Phaser from 'phaser';
import {
  MENU_BACKGROUND_FALLBACK_COLOR,
  MENU_BACKGROUND_FALLBACK_COLOR_HEX,
  createCoverBackground,
  createMenuArenaLightSweep,
  getMenuBackgroundAsset,
  preloadMenuBackgroundArt,
} from '../rendering/backgroundArt.js';

const START_TRANSITION_MS = 320;

export default class StartScene extends Phaser.Scene {
  constructor() {
    super('StartScene');
    this.isTransitioning = false;
  }

  preload() {
    preloadMenuBackgroundArt(this);
  }

  create() {
    const { width, height } = this.scale;
    this.isTransitioning = false;

    this.cameras.main.setBackgroundColor(MENU_BACKGROUND_FALLBACK_COLOR_HEX);
    createCoverBackground(this, {
      asset: getMenuBackgroundAsset(),
      fallbackColor: MENU_BACKGROUND_FALLBACK_COLOR,
      width,
      height,
    });
    createMenuArenaLightSweep(this, { width, height });

    const title = this.add
      .text(width / 2, height * 0.15, 'GRIDFALL TACTICS', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#f9fafb',
        align: 'center',
        wordWrap: { width: width * 0.9 },
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    const startButton = this.add
      .text(width / 2, height * 0.61, 'START', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '36px',
        fontStyle: 'bold',
        color: '#111827',
        backgroundColor: '#93c5fd',
        padding: { x: 28, y: 14 },
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });

    startButton.on('pointerover', () => {
      if (!this.isTransitioning) {
        startButton.setBackgroundColor('#bfdbfe');
      }
    });

    startButton.on('pointerout', () => {
      if (!this.isTransitioning) {
        startButton.setBackgroundColor('#93c5fd');
      }
    });

    startButton.on('pointerup', () => {
      this.playStartTransition(title, startButton);
    });
  }

  playStartTransition(title, startButton) {
    if (this.isTransitioning) {
      return;
    }

    this.isTransitioning = true;
    startButton.disableInteractive();

    this.tweens.add({
      targets: title,
      y: title.y - this.scale.height * 0.035,
      alpha: 0,
      duration: START_TRANSITION_MS,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: startButton,
      y: startButton.y + this.scale.height * 0.035,
      alpha: 0,
      duration: START_TRANSITION_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.scene.start('MainMenuScene');
      },
    });
  }
}
