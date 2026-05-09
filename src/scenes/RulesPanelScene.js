import Phaser from 'phaser';
import { createModalBackButton } from '../ui/modalControls.js';

// Player-facing summary derived from docs/rules/mvp-battle-rules.md.
const RULE_SECTIONS = Object.freeze([
  {
    heading: 'Goal',
    lines: [
      'Both heroes start at 12 HP.',
      'Protect your hero and reduce the enemy hero to 0 HP.',
    ],
  },
  {
    heading: 'Board / Lanes',
    lines: [
      'The fight has 3 lanes.',
      'Play units into your lane slots. The middle row is only for visuals.',
      'If a unit attacks an open lane, it hits the enemy hero.',
    ],
  },
  {
    heading: 'Turn Flow',
    lines: [
      'At battle start, draw 4 cards and mulligan up to 2 cards once.',
      'One side acts first, then initiative alternates each turn.',
      'Each side gets 1 action or may pass.',
      'After both sides act or pass, combat resolves automatically.',
      'After combat, you draw 1 card, then the enemy draws 1 card.',
    ],
  },
  {
    heading: 'Actions',
    lines: [
      'Cards have no mana, energy, or cost system.',
      'Your action can play a unit, play an effect, use a targeted effect, swap friendly units, redeploy a unit, or pass.',
    ],
  },
  {
    heading: 'Combat',
    lines: [
      'Combat happens lane by lane with no diagonal attacks.',
      'Units fight opposing units in their lane.',
      'Open lane attacks damage the opposing hero instead.',
      'Both sides can deal damage during the same combat step.',
    ],
  },
  {
    heading: 'Winning',
    lines: [
      'A battle can end when a hero is defeated.',
      'If neither side can make meaningful progress, remaining hero HP decides the result.',
      'If the turn limit is reached, remaining hero HP decides the result.',
      'If remaining hero HP is tied, the battle is a draw.',
    ],
  },
]);

export default class RulesPanelScene extends Phaser.Scene {
  constructor() {
    super('RulesPanelScene');
    this.returnSceneKey = null;
    this.scrollContainer = null;
    this.scrollMask = null;
    this.scrollArea = null;
    this.scrollY = 0;
    this.maxScrollY = 0;
    this.dragStartY = null;
    this.dragStartScrollY = 0;
  }

  create(data) {
    const { width, height } = this.scale;
    this.returnSceneKey = typeof data?.returnSceneKey === 'string' && data.returnSceneKey
      ? data.returnSceneKey
      : null;

    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.78)
      .setDepth(0)
      .setInteractive();
    overlay.on('pointerup', () => this.closePanel());

    const panelWidth = Math.min(width - 24, 430);
    const panelHeight = Math.min(height - 42, 720);
    const panelX = width / 2;
    const panelY = height / 2;
    const panelTop = panelY - panelHeight / 2;
    const panelLeft = panelX - panelWidth / 2;
    const padding = Math.max(16, Math.round(panelWidth * 0.045));
    const headerHeight = 58;
    const footerHeight = 58;
    const viewportX = panelLeft + padding;
    const viewportY = panelTop + headerHeight;
    const viewportWidth = panelWidth - padding * 2;
    const viewportHeight = panelHeight - headerHeight - footerHeight;

    this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x0f172a, 0.98)
      .setStrokeStyle(2, 0x7dd3fc, 0.7)
      .setDepth(1)
      .setInteractive();

    this.add.text(panelLeft + padding, panelTop + 18, 'Rules / How To Play', {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(21, Math.floor(panelWidth * 0.055))}px`,
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setDepth(2);


    this.scrollArea = this.add.zone(viewportX, viewportY, viewportWidth, viewportHeight)
      .setOrigin(0, 0)
      .setDepth(3)
      .setInteractive();

    const content = this.createRulesContent(viewportX, viewportY, viewportWidth, panelWidth);
    this.scrollContainer = this.add.container(0, 0, content.items).setDepth(2);

    const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(viewportX, viewportY, viewportWidth, viewportHeight);
    this.scrollMask = maskShape.createGeometryMask();
    this.scrollContainer.setMask(this.scrollMask);

    this.maxScrollY = Math.max(0, content.bottomY - viewportY - viewportHeight + 8);
    this.addScrollHint(panelLeft, panelTop, panelWidth, panelHeight, padding, this.maxScrollY > 0);
    this.bindScrollHandlers(viewportHeight);

    createModalBackButton(this, {
      x: panelX,
      y: panelTop + panelHeight - 28,
      onPointerUp: () => this.closePanel(),
    });

    this.input.keyboard?.once('keydown-ESC', () => this.closePanel());
  }

  createRulesContent(x, startY, width, panelWidth) {
    const items = [];
    let y = startY;
    const bodyFontSize = Math.max(14, Math.floor(panelWidth * 0.038));
    const headingFontSize = Math.max(16, Math.floor(panelWidth * 0.044));
    const bodyWrapWidth = width - 18;

    RULE_SECTIONS.forEach((section, sectionIndex) => {
      if (sectionIndex > 0) y += 12;

      const heading = this.add.text(x, y, section.heading, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${headingFontSize}px`,
        color: '#bae6fd',
        fontStyle: 'bold',
      });
      items.push(heading);
      y += heading.height + 6;

      section.lines.forEach((line) => {
        const bullet = this.add.text(x + 4, y + 1, '•', {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${bodyFontSize}px`,
          color: '#facc15',
        });
        const text = this.add.text(x + 18, y, line, {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${bodyFontSize}px`,
          color: '#e2e8f0',
          lineSpacing: 3,
          wordWrap: { width: bodyWrapWidth - 18 },
        });
        items.push(bullet, text);
        y += Math.max(20, text.height) + 5;
      });
    });

    return { items, bottomY: y };
  }

  addScrollHint(panelLeft, panelTop, panelWidth, panelHeight, padding, isScrollable) {
    const hint = isScrollable ? 'Swipe or mouse wheel to scroll' : 'No scrolling needed';
    this.add.text(panelLeft + padding, panelTop + panelHeight - 48, hint, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#94a3b8',
    }).setDepth(3);
  }

  bindScrollHandlers(viewportHeight) {
    if (this.maxScrollY <= 0) return;

    this.input.on('wheel', (_pointer, _gameObjects, _deltaX, deltaY) => {
      this.setScrollY(this.scrollY + deltaY * 0.45);
    });

    this.scrollArea.on('pointerdown', (pointer) => {
      this.dragStartY = pointer.y;
      this.dragStartScrollY = this.scrollY;
    });

    this.input.on('pointermove', (pointer) => {
      if (this.dragStartY === null || !pointer.isDown) return;
      this.setScrollY(this.dragStartScrollY + this.dragStartY - pointer.y);
    });

    this.input.on('pointerup', () => {
      this.dragStartY = null;
    });

    this.input.keyboard?.on('keydown-UP', () => this.setScrollY(this.scrollY - viewportHeight * 0.18));
    this.input.keyboard?.on('keydown-DOWN', () => this.setScrollY(this.scrollY + viewportHeight * 0.18));
  }

  setScrollY(value) {
    this.scrollY = Phaser.Math.Clamp(value, 0, this.maxScrollY);
    if (this.scrollContainer) {
      this.scrollContainer.y = -this.scrollY;
    }
  }

  closePanel() {
    const returnSceneKey = this.returnSceneKey;
    const returnScene = returnSceneKey ? this.scene.get(returnSceneKey) : null;

    this.scene.stop();

    if (returnScene?.resumeFromRulesPanel) {
      returnScene.resumeFromRulesPanel();
      return;
    }

    if (returnSceneKey && this.scene.isPaused(returnSceneKey)) {
      this.scene.resume(returnSceneKey);
    }
  }
}
