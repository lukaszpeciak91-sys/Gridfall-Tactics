import Phaser from 'phaser';
import { PREMIUM_BROADCAST_FONT_STACK } from '../ui/imageButton.js';

const TITLE_SAMPLES = ['PORAŻKA', 'WYGRANA', 'REMIS'];
const BUTTON_SAMPLES = [
  'WYJDŹ',
  'PONÓW',
  'PUBLICZNOŚĆ',
  'ZEWRZEĆ SZEREGI',
  'PRZEJĘCIE SYSTEMU',
  'ZAKŁÓCENIE SYGNAŁU',
  'MROŹNA LINIA',
];

const FONT_VARIANTS = Object.freeze([
  Object.freeze({ label: 'A. Current premium stack + current letter spacing', fontFamily: PREMIUM_BROADCAST_FONT_STACK, letterSpacing: 2.2 }),
  Object.freeze({ label: 'B. Current premium stack + no letter spacing', fontFamily: PREMIUM_BROADCAST_FONT_STACK, letterSpacing: 0 }),
  Object.freeze({ label: 'C. Current premium stack + reduced letter spacing', fontFamily: PREMIUM_BROADCAST_FONT_STACK, letterSpacing: 1.1 }),
  Object.freeze({ label: 'D1. Exo 2 + current letter spacing', fontFamily: '"Exo 2", sans-serif', letterSpacing: 2.2 }),
  Object.freeze({ label: 'D2. Exo 2 + reduced letter spacing', fontFamily: '"Exo 2", sans-serif', letterSpacing: 1.1 }),
  Object.freeze({ label: 'E. Segoe UI / Arial fallback + reduced letter spacing', fontFamily: '"Segoe UI", Arial, sans-serif', letterSpacing: 1.1 }),
  Object.freeze({ label: 'F. Arial bold + no letter spacing', fontFamily: 'Arial, sans-serif', letterSpacing: 0 }),
]);

function fontSize(value) {
  return `${value}px`;
}

export default class FontPreviewScene extends Phaser.Scene {
  constructor() {
    super('FontPreviewScene');
    this.scrollContainer = null;
    this.scrollArea = null;
    this.scrollMask = null;
    this.scrollY = 0;
    this.maxScrollY = 0;
    this.dragStartY = null;
    this.dragStartScrollY = 0;
    this.backButton = null;
  }

  create() {
    this.onBackRequested = () => this.scene.start('MainMenuScene');
    this.cameras.main.setBackgroundColor('#08111f');
    this.buildLayout();
    this.input.keyboard?.on('keydown-ESC', this.onBackRequested);
    this.input.keyboard?.on('keydown-BACKSPACE', this.onBackRequested);
    this.scale.on('resize', this.restartForResize, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', this.onBackRequested);
      this.input.keyboard?.off('keydown-BACKSPACE', this.onBackRequested);
      this.input?.off('wheel', this.onWheelScroll, this);
      this.input?.off('pointermove', this.onPointerMoveScroll, this);
      this.input?.off('pointerup', this.clearDragScroll, this);
      this.scale?.off('resize', this.restartForResize, this);
    });
  }

  restartForResize() {
    this.scene.restart();
  }

  buildLayout() {
    const { width, height } = this.scale;
    const safePad = Math.max(12, Math.round(width * 0.035));
    const headerHeight = 72;
    const footerHeight = 58;
    const viewportX = safePad;
    const viewportY = headerHeight;
    const viewportWidth = width - safePad * 2;
    const viewportHeight = height - headerHeight - footerHeight;

    this.add.rectangle(width / 2, height / 2, width, height, 0x08111f, 1).setDepth(0);
    this.add.text(safePad, 14, 'TEMP FONT TEST', {
      fontFamily: 'Arial, sans-serif',
      fontSize: fontSize(Math.max(18, Math.round(width * 0.052))),
      color: '#fde68a',
      fontStyle: 'bold',
    }).setDepth(2);
    this.add.text(safePad, 42, 'Polish premium UI preview — temporary debug screen', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#94a3b8',
    }).setDepth(2);

    const content = this.createPreviewContent(viewportX, viewportY, viewportWidth, width);
    this.scrollContainer = this.add.container(0, 0, content.items).setDepth(1);

    const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(viewportX, viewportY, viewportWidth, viewportHeight);
    this.scrollMask = maskShape.createGeometryMask();
    this.scrollContainer.setMask(this.scrollMask);

    this.scrollArea = this.add.zone(viewportX, viewportY, viewportWidth, viewportHeight)
      .setOrigin(0, 0)
      .setDepth(3)
      .setInteractive();
    this.maxScrollY = Math.max(0, content.bottomY - viewportY - viewportHeight + safePad);
    this.bindScrollHandlers(viewportHeight);

    this.add.text(width / 2, height - 48, this.maxScrollY > 0 ? 'Swipe or mouse wheel to scroll' : 'No scrolling needed', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#93c5fd',
    }).setOrigin(0.5).setDepth(4);
    this.createBackButton(width / 2, height - 24, Math.min(168, width - safePad * 2), 38);
  }

  createPreviewContent(x, startY, width, sceneWidth) {
    const items = [];
    let y = startY + 2;
    const cardGap = 12;
    const cardPad = Math.max(10, Math.round(sceneWidth * 0.03));
    const titleFontSize = Math.max(25, Math.min(34, Math.round(sceneWidth * 0.078)));
    const buttonFontSize = Math.max(17, Math.min(23, Math.round(sceneWidth * 0.052)));
    const labelFontSize = Math.max(12, Math.min(14, Math.round(sceneWidth * 0.034)));
    const sampleWrapWidth = width - cardPad * 2;

    FONT_VARIANTS.forEach((variant) => {
      const rowTop = y;
      const label = this.add.text(x + cardPad, y + cardPad, variant.label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: fontSize(labelFontSize),
        color: '#bae6fd',
        fontStyle: 'bold',
        wordWrap: { width: sampleWrapWidth },
      });
      items.push(label);
      y += cardPad + label.height + 8;

      const titleText = this.add.text(x + cardPad, y, TITLE_SAMPLES.join('   '), {
        fontFamily: variant.fontFamily,
        fontSize: fontSize(titleFontSize),
        fontStyle: '700',
        letterSpacing: variant.letterSpacing,
        color: '#f8fafc',
        stroke: '#020617',
        strokeThickness: 3,
        wordWrap: { width: sampleWrapWidth },
      });
      items.push(titleText);
      y += titleText.height + 8;

      const buttonText = this.add.text(x + cardPad, y, BUTTON_SAMPLES.join('  •  '), {
        fontFamily: variant.fontFamily,
        fontSize: fontSize(buttonFontSize),
        fontStyle: '700',
        letterSpacing: variant.letterSpacing,
        color: '#f5f1e6',
        stroke: '#0f172a',
        strokeThickness: 2,
        lineSpacing: 5,
        wordWrap: { width: sampleWrapWidth },
      });
      items.push(buttonText);
      y += buttonText.height + cardPad;

      const rowHeight = y - rowTop;
      const backing = this.add.rectangle(x, rowTop, width, rowHeight, 0x0f172a, 0.92)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x334155, 0.96);
      items.unshift(backing);
      y += cardGap;
    });

    return { items, bottomY: y };
  }

  createBackButton(x, y, width, height) {
    const backing = this.add.rectangle(x, y, width, height, 0x1d4ed8, 0.94)
      .setStrokeStyle(2, 0x93c5fd, 0.95)
      .setDepth(5)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, 'BACK', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#eff6ff',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(6);
    backing.on('pointerup', this.onBackRequested);
    text.setInteractive({ useHandCursor: true });
    text.on('pointerup', this.onBackRequested);
    this.backButton = { backing, text };
  }

  bindScrollHandlers(viewportHeight) {
    if (this.maxScrollY <= 0) return;
    this.input.on('wheel', this.onWheelScroll, this);
    this.scrollArea.on('pointerdown', (pointer) => {
      this.dragStartY = pointer.y;
      this.dragStartScrollY = this.scrollY;
    });
    this.input.on('pointermove', this.onPointerMoveScroll, this);
    this.input.on('pointerup', this.clearDragScroll, this);
    this.input.keyboard?.on('keydown-UP', () => this.setScrollY(this.scrollY - viewportHeight * 0.18));
    this.input.keyboard?.on('keydown-DOWN', () => this.setScrollY(this.scrollY + viewportHeight * 0.18));
  }

  onWheelScroll(_pointer, _gameObjects, _deltaX, deltaY) {
    this.setScrollY(this.scrollY + deltaY * 0.45);
  }

  onPointerMoveScroll(pointer) {
    if (this.dragStartY === null || !pointer.isDown) return;
    this.setScrollY(this.dragStartScrollY + this.dragStartY - pointer.y);
  }

  clearDragScroll() {
    this.dragStartY = null;
  }

  setScrollY(value) {
    this.scrollY = Phaser.Math.Clamp(value, 0, this.maxScrollY);
    if (this.scrollContainer) {
      this.scrollContainer.y = -this.scrollY;
    }
  }
}
