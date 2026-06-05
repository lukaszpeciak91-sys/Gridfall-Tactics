import Phaser from 'phaser';

const DEBUG_BACKGROUND_COLOR = '#0b1220';
const DEBUG_PANEL_COLOR = 0x0f172a;
const DEBUG_BUTTON_COLOR = 0x334155;
const DEBUG_BUTTON_HOVER_COLOR = 0x475569;
const DEBUG_BUTTON_STROKE = 0x93c5fd;

export default class BoardUnitArtViewportDebugScene extends Phaser.Scene {
  constructor() {
    super('BoardUnitArtViewportDebugScene');
    this.onBackRequested = null;
  }

  create() {
    const { width, height } = this.scale;
    this.onBackRequested = () => this.returnToModeSelect();

    this.cameras.main.setBackgroundColor(DEBUG_BACKGROUND_COLOR);

    this.add.rectangle(width / 2, height / 2, Math.min(width - 32, 342), Math.min(height - 96, 360), DEBUG_PANEL_COLOR, 0.86)
      .setStrokeStyle(1, 0x334155, 0.9);

    this.add.text(width / 2, height * 0.28, 'Board Unit Art Debug', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '27px',
      color: '#f8fafc',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: width - 48 },
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.28 + 42, 'Stage 1 placeholder', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '17px',
      color: '#bfdbfe',
      align: 'center',
    }).setOrigin(0.5);

    this.createButton(width / 2, height * 0.62, Math.min(width - 72, 240), 52, 'Back', () => this.returnToModeSelect());

    this.input.keyboard?.on('keydown-ESC', this.onBackRequested);
    this.input.keyboard?.on('keydown-BACKSPACE', this.onBackRequested);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', this.onBackRequested);
      this.input.keyboard?.off('keydown-BACKSPACE', this.onBackRequested);
      this.onBackRequested = null;
    });
  }

  createButton(x, y, width, height, label, onPress) {
    const button = this.add.rectangle(x, y, width, height, DEBUG_BUTTON_COLOR, 0.94)
      .setStrokeStyle(2, DEBUG_BUTTON_STROKE, 0.95)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#eff6ff',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);

    button.on('pointerover', () => button.setFillStyle(DEBUG_BUTTON_HOVER_COLOR, 1));
    button.on('pointerout', () => button.setFillStyle(DEBUG_BUTTON_COLOR, 0.94));
    button.on('pointerup', onPress);

    return { button, text };
  }

  returnToModeSelect() {
    this.scene.start('ArtDebugModeSelectScene');
  }
}
