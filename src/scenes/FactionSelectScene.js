import Phaser from 'phaser';
import { getFactionKeys } from '../data/factions/index.js';

export default class FactionSelectScene extends Phaser.Scene {
  constructor() {
    super('FactionSelectScene');
    this.uiElements = [];
  }

  init() {
    this.cleanupScene();
  }

  create() {
    this.cleanupScene();

    if (this.children) {
      this.children.removeAll(true);
    }

    const { width, height } = this.scale;
    const factionKeys = getFactionKeys();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);

    const title = this.add
      .text(width / 2, height * 0.16, 'Select Faction', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '36px',
        color: '#f9fafb',
      })
      .setOrigin(0.5);
    this.uiElements.push(title);

    const baseY = height * 0.3;
    const stepY = 90;


    factionKeys.forEach((factionKey, index) => {
      const y = baseY + index * stepY;
      const button = this.add
        .text(width / 2, y, factionKey, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '30px',
          color: '#111827',
          backgroundColor: '#93c5fd',
          padding: { x: 22, y: 12 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      button.on('pointerover', () => button.setBackgroundColor('#bfdbfe'));
      button.on('pointerout', () => button.setBackgroundColor('#93c5fd'));
      button.on('pointerup', () => {
        this.scene.stop('FactionSelectScene');
        this.scene.start('BattleScene', { factionKey });
      });

      this.uiElements.push(button);
    });
  }

  cleanupScene() {
    if (this.input) {
      this.input.removeAllListeners();
    }

    this.uiElements.forEach((element) => {
      if (element && element.active) {
        element.removeAllListeners?.();
        element.destroy();
      }
    });
    this.uiElements = [];
  }
}

