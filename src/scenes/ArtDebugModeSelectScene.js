import Phaser from 'phaser';

const DEBUG_BACKGROUND_COLOR = '#0b1220';
const DEBUG_PANEL_COLOR = 0x0f172a;
const DEBUG_BUTTON_COLOR = 0x1d4ed8;
const DEBUG_BUTTON_HOVER_COLOR = 0x2563eb;
const DEBUG_BUTTON_STROKE = 0x93c5fd;

export default class ArtDebugModeSelectScene extends Phaser.Scene {
  constructor() {
    super('ArtDebugModeSelectScene');
    this.onBackRequested = null;
  }

  create() {
    const { width, height } = this.scale;
    this.onBackRequested = () => this.returnToMainMenu();

    this.cameras.main.setBackgroundColor(DEBUG_BACKGROUND_COLOR);

    this.add.rectangle(width / 2, height / 2, Math.min(width - 32, 342), Math.min(height - 96, 420), DEBUG_PANEL_COLOR, 0.86)
      .setStrokeStyle(1, 0x334155, 0.9);

    this.add.text(width / 2, height * 0.22, 'Art Debug', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '30px',
      color: '#f8fafc',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.22 + 34, 'Choose an isolated debug workflow.', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#bfdbfe',
      align: 'center',
    }).setOrigin(0.5);

    const buttonWidth = Math.min(width - 72, 282);
    const buttonHeight = 52;
    const startY = height * 0.42;
    const buttonGap = 70;

    this.createButton(width / 2, startY, buttonWidth, buttonHeight, 'Hand / Inspect Debug', () => {
      this.scene.start('ArtViewportDebugScene');
    });

    this.createButton(width / 2, startY + buttonGap, buttonWidth, buttonHeight, 'Board Unit Debug', () => {
      this.scene.start('BoardUnitArtViewportDebugScene');
    });

    this.createButton(width / 2, startY + buttonGap * 2, buttonWidth, buttonHeight, 'Back', () => this.returnToMainMenu(), {
      fillColor: 0x334155,
      hoverColor: 0x475569,
    });

    this.input.keyboard?.on('keydown-ESC', this.onBackRequested);
    this.input.keyboard?.on('keydown-BACKSPACE', this.onBackRequested);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', this.onBackRequested);
      this.input.keyboard?.off('keydown-BACKSPACE', this.onBackRequested);
      this.onBackRequested = null;
    });
  }

  createButton(x, y, width, height, label, onPress, { fillColor = DEBUG_BUTTON_COLOR, hoverColor = DEBUG_BUTTON_HOVER_COLOR } = {}) {
    const button = this.add.rectangle(x, y, width, height, fillColor, 0.94)
      .setStrokeStyle(2, DEBUG_BUTTON_STROKE, 0.95)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#eff6ff',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);

    button.on('pointerover', () => button.setFillStyle(hoverColor, 1));
    button.on('pointerout', () => button.setFillStyle(fillColor, 0.94));
    button.on('pointerup', onPress);

    return { button, text };
  }

  returnToMainMenu() {
    this.scene.start('MainMenuScene');
  }
}
