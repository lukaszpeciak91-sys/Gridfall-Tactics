import Phaser from 'phaser';
import { translateActive } from '../localization/localeService.js';

export default class BattleMenuScene extends Phaser.Scene {
  constructor() {
    super('BattleMenuScene');
  }

  create(data) {
    const { width, height } = this.scale;
    const returnSceneKey = typeof data?.returnSceneKey === 'string' && data.returnSceneKey
      ? data.returnSceneKey
      : 'BattleScene';
    const returnScene = this.scene.get(returnSceneKey);
    const isBattleMenu = returnSceneKey === 'BattleScene' && returnScene;

    this.cameras.main.setBackgroundColor('#05080f');

    this.add
      .text(width * 0.5, height * 0.18, translateActive('ui.battleMenu.title', 'MENU'), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '42px',
        color: '#f8fafc',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const buttonWidth = Math.min(width * 0.74, 360);
    const buttonHeight = 58;
    const buttonGap = 26;
    const firstButtonY = height * 0.42;
    const buttonX = width * 0.5;

    const createMenuButton = (y, label, onActivate, { enabled = true, backgroundColor = '#93c5fd' } = {}) => {
      const button = this.add
        .text(buttonX, y, label, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '22px',
          color: enabled ? '#0f172a' : '#64748b',
          backgroundColor: enabled ? backgroundColor : '#1e293b',
          fontStyle: 'bold',
          align: 'center',
          fixedWidth: buttonWidth,
          fixedHeight: buttonHeight,
          padding: { x: 20, y: 14 },
        })
        .setOrigin(0.5);

      if (enabled) {
        button.setInteractive({ useHandCursor: true });
        button.on('pointerup', onActivate);
      } else {
        button.setAlpha(0.58);
      }
      return button;
    };

    createMenuButton(firstButtonY, translateActive('ui.battleMenu.howToPlay', 'HOW TO PLAY'), () => {
      this.scene.stop();
      if (returnScene?.launchBattleRulesPanel) {
        returnScene.launchBattleRulesPanel({ prepareNavigation: false });
        return;
      }
      returnScene?.hideRulesPanelBackgroundHelpers?.();
      this.scene.launch('RulesPanelScene', returnScene?.getBattleRulesPanelLaunchData?.() ?? { returnSceneKey, hideScrollHint: true, battleModalPresentation: returnSceneKey === 'BattleScene' });
    });

    createMenuButton(firstButtonY + buttonGap + buttonHeight, translateActive('ui.battleMenu.settings', 'SETTINGS'), () => {
      this.scene.stop();
      if (isBattleMenu && returnScene?.openSettingsScene) {
        returnScene.navigationInProgress = false;
        returnScene.clearPointerInputGuard?.();
        returnScene.openSettingsScene();
        return;
      }
      this.scene.launch('SettingsScene', { returnSceneKey });
    }, { backgroundColor: '#c4b5fd' });

    const surrenderAvailable = Boolean(returnScene?.canPlayerMenuSurrender?.({ allowMenuNavigation: true }));
    createMenuButton(firstButtonY + (buttonGap + buttonHeight) * 2, translateActive('ui.battleMenu.surrender', 'SURRENDER'), () => {
      returnScene?.requestActiveBattleExit?.({ battleMenuScene: this });
    }, { enabled: surrenderAvailable, backgroundColor: '#fb7185' });
  }

  resumeFromRulesPanel() {
    this.scene.resume();
  }
}
