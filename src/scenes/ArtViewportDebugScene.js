import Phaser from 'phaser';

export default class ArtViewportDebugScene extends Phaser.Scene {
  constructor() {
    super('ArtViewportDebugScene');
  }

  create() {
    this.onBackRequested = () => this.scene.start('MainMenuScene');
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#0b1220');

    this.add.text(width * 0.5, 54, 'Art Viewport Debug', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '30px',
      color: '#f8fafc',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(width * 0.5, 118, 'Skeleton scene (PR 1)\nDebug-only entry for future viewport tuning tool.\nNo preview/crop/export in this phase.', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#cbd5e1',
      align: 'center',
      lineSpacing: 8,
      wordWrap: { width: Math.max(240, width - 52) },
    }).setOrigin(0.5, 0);

    const backWidth = Math.min(width - 40, 260);
    const backHeight = 64;
    const backY = height - 88;

    const backButton = this.add.rectangle(width * 0.5, backY, backWidth, backHeight, 0x1d4ed8, 0.94)
      .setStrokeStyle(2, 0x93c5fd, 0.95)
      .setInteractive({ useHandCursor: true });

    const backLabel = this.add.text(width * 0.5, backY, 'Back to Main Menu', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '23px',
      color: '#eff6ff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    backButton.on('pointerup', this.onBackRequested);

    this.input.keyboard?.on('keydown-ESC', this.onBackRequested);
    this.input.keyboard?.on('keydown-BACKSPACE', this.onBackRequested);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', this.onBackRequested);
      this.input.keyboard?.off('keydown-BACKSPACE', this.onBackRequested);
      backButton.off('pointerup', this.onBackRequested);
    });

    this.add.text(width * 0.5, backY - 106, 'Future phases will add runtime-accurate Hand/Inspect preview\nand clipboard export for manual Codex patch workflows.', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      color: '#93c5fd',
      align: 'center',
      lineSpacing: 5,
      wordWrap: { width: Math.max(220, width - 64) },
    }).setOrigin(0.5, 0.5);

    this.children.bringToTop(backLabel);
  }
}
