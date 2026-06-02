import Phaser from 'phaser';
import { createModalBackButton } from '../ui/modalControls.js';
import { preloadSecondaryButtonAsset } from '../ui/imageButton.js';
import { translateActive, translateActiveList } from '../localization/localeService.js';
import { CARD_EFFECT_GAMEPLAY_SYMBOLS, CARD_EFFECT_STAT_SYMBOLS, CARD_EFFECT_STAT_SYMBOL_STYLES } from '../localization/cardTextFormatting.js';
import { GAMEPLAY_SYMBOL_COLORS, NON_UNIT_EFFECT_STAT_SYMBOL, NON_UNIT_EFFECT_STAT_SYMBOL_CSS_COLOR } from '../rendering/cardVisualLayout.js';

// Player-facing summary derived from docs/rules/mvp-battle-rules.md.
const RULE_SECTIONS = Object.freeze([
  {
    heading: 'Icon Glossary',
    lines: [
      'ATK — combat damage dealt by a unit.',
      'HP — a unit’s health.',
      'ARM — armor that reduces incoming combat damage.',
      'ALLY — one of your units.',
      'ALLIES — all your units.',
      'ENEMY — one opposing unit.',
      'ENEMIES — opposing units.',
    ],
  },
  {
    heading: 'Goal',
    lines: [
      'Reduce the enemy Base to 0 HP before yours reaches 0.',
    ],
  },
  {
    heading: 'Your Turn',
    lines: [
      'Players take one action each, alternating.',
      'After both actions, combat resolves automatically.',
      'After combat, both players draw 1 card.',
    ],
  },
  {
    heading: 'Board and Combat',
    lines: [
      'Battles use 3 lanes.',
      'Units fight directly opposite units.',
      'If a lane is open, that attack hits the enemy Base.',
      'The middle row is visual only.',
    ],
  },
  {
    heading: 'Swap',
    lines: [
      'Tap one of your units.',
      'Tap an adjacent allied unit.',
      'The two units swap places.',
    ],
  },
  {
    heading: 'PASS and Surrender',
    lines: [
      'PASS ends your action.',
      'If available, hold PASS to surrender.',
    ],
  },
]);

const GLOSSARY_ICON_ROWS = Object.freeze([
  Object.freeze({ icon: CARD_EFFECT_STAT_SYMBOLS.attack, iconColor: CARD_EFFECT_STAT_SYMBOL_STYLES.attack.color, label: 'ATK', description: 'Damage dealt in combat' }),
  Object.freeze({ icon: CARD_EFFECT_STAT_SYMBOLS.health, iconColor: CARD_EFFECT_STAT_SYMBOL_STYLES.health.color, label: 'HP', description: 'Unit health' }),
  Object.freeze({ icon: CARD_EFFECT_STAT_SYMBOLS.armor, iconColor: CARD_EFFECT_STAT_SYMBOL_STYLES.armor.color, label: 'ARM', description: 'Reduces incoming combat damage' }),
  Object.freeze({ icon: [NON_UNIT_EFFECT_STAT_SYMBOL, NON_UNIT_EFFECT_STAT_SYMBOL, NON_UNIT_EFFECT_STAT_SYMBOL].join(' '), iconColor: NON_UNIT_EFFECT_STAT_SYMBOL_CSS_COLOR, iconFontSizeRatio: 0.32, label: '✶ ✶ ✶', translationKey: 'effectCard', description: 'Effect card — not a unit and has no ATK / ARM / HP.' }),
  Object.freeze({ icon: CARD_EFFECT_GAMEPLAY_SYMBOLS.ally, iconColor: '#fde68a', label: 'ALLY', description: 'One of your units' }),
  Object.freeze({ icon: CARD_EFFECT_GAMEPLAY_SYMBOLS.allies, iconColor: '#fde68a', label: 'ALLIES', description: 'All your units' }),
  Object.freeze({ icon: CARD_EFFECT_GAMEPLAY_SYMBOLS.enemy, iconColor: GAMEPLAY_SYMBOL_COLORS.enemy, label: 'ENEMY', description: 'One opposing unit' }),
  Object.freeze({ icon: CARD_EFFECT_GAMEPLAY_SYMBOLS.enemies, iconColor: GAMEPLAY_SYMBOL_COLORS.enemy, label: 'ENEMIES', description: 'Opposing units' }),
]);

function resolveGlossaryRows() {
  return GLOSSARY_ICON_ROWS.map((row) => ({
    ...row,
    description: translateActive(`ui.rules.glossaryDescriptions.${row.translationKey ?? row.label}`, row.description),
  }));
}

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

  preload() {
    preloadSecondaryButtonAsset(this);
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

    this.add.text(panelLeft + padding, panelTop + 18, translateActive('ui.rules.title', 'Rules / How To Play'), {
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

    translateActiveList('ui.rules.sections', RULE_SECTIONS).forEach((section, sectionIndex) => {
      if (sectionIndex > 0) y += 12;

      const heading = this.add.text(x, y, section.heading, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${headingFontSize}px`,
        color: '#bae6fd',
        fontStyle: 'bold',
      });
      items.push(heading);
      y += heading.height + 6;

      if (sectionIndex === 0) {
        y = this.addGlossaryRows(items, x, y, width, bodyFontSize, panelWidth);
        return;
      }
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

  addGlossaryRows(items, x, y, width, bodyFontSize, panelWidth) {
    const iconBoxSize = Math.max(24, Math.round(panelWidth * 0.072));
    const rowGap = Math.max(8, Math.round(panelWidth * 0.022));
    const labelFontSize = Math.max(bodyFontSize + 1, Math.floor(panelWidth * 0.04));
    const descriptionFontSize = Math.max(13, bodyFontSize - 1);
    const labelX = x + iconBoxSize + 16;
    const descriptionWrapWidth = width - (labelX - x) - 4;

    resolveGlossaryRows().forEach((row) => {
      const rowTop = y;
      const iconCenterY = rowTop + iconBoxSize * 0.5 + 1;
      const iconBackdrop = this.add.circle(x + iconBoxSize * 0.5, iconCenterY, iconBoxSize * 0.5, 0x0b1220, 0.98)
        .setStrokeStyle(1.5, 0x334155, 0.95);
      const icon = this.add.text(x + iconBoxSize * 0.5, iconCenterY, row.icon, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${Math.round(iconBoxSize * (row.iconFontSizeRatio ?? 0.72))}px`,
        color: row.iconColor,
        fontStyle: 'bold',
        stroke: '#020617',
        strokeThickness: Math.max(1, Math.round(iconBoxSize * 0.08)),
      }).setOrigin(0.5);
      const label = this.add.text(labelX, rowTop, row.label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${labelFontSize}px`,
        color: '#f8fafc',
        fontStyle: 'bold',
      });
      const description = this.add.text(labelX, rowTop + label.height + 1, row.description, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${descriptionFontSize}px`,
        color: '#cbd5e1',
        wordWrap: { width: descriptionWrapWidth },
      });
      items.push(iconBackdrop, icon, label, description);
      y += Math.max(iconBoxSize, label.height + description.height + 3) + rowGap;
    });

    return y;
  }

  addScrollHint(panelLeft, panelTop, panelWidth, panelHeight, padding, isScrollable) {
    const hint = isScrollable
      ? translateActive('ui.common.swipeScroll', 'Swipe or mouse wheel to scroll')
      : translateActive('ui.common.noScroll', 'No scrolling needed');
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
