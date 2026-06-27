import Phaser from 'phaser';
import { translateActive } from '../localization/localeService.js';
import { stopMusic } from '../audio/audioPlayback.js';

export default class BattleMenuScene extends Phaser.Scene {
  constructor() {
    super('BattleMenuScene');
    this.surrenderConfirmation = null;
  }

  create(data) {
    const { width, height } = this.scale;
    const factionKey = typeof data?.factionKey === 'string' && data.factionKey ? data.factionKey : 'Aggro';
    const enemyFactionKey = typeof data?.enemyFactionKey === 'string' && data.enemyFactionKey ? data.enemyFactionKey : null;
    const battleContext = data?.battleContext && typeof data.battleContext === 'object' ? data.battleContext : { mode: 'arena' };
    const returnSceneKey = typeof data?.returnSceneKey === 'string' && data.returnSceneKey
      ? data.returnSceneKey
      : 'BattleScene';

    this.cameras.main.setBackgroundColor('#05080f');

    this.add
      .text(width * 0.5, height * 0.18, translateActive('ui.battleMenu.title', 'MENU'), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '42px',
        color: '#f8fafc',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width * 0.5, height * 0.42, translateActive('ui.battleMenu.comingSoon', 'Menu options coming soon.'), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#cbd5e1',
        align: 'center',
      })
      .setOrigin(0.5);

    const rulesButton = this.add
      .text(width * 0.5, height * 0.56, translateActive('ui.battleMenu.howToPlay', 'HOW TO PLAY'), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#0f172a',
        backgroundColor: '#93c5fd',
        fontStyle: 'bold',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    rulesButton.on('pointerup', () => {
      const returnScene = this.scene.get(returnSceneKey);
      this.scene.stop();
      if (returnScene?.launchBattleRulesPanel) {
        returnScene.launchBattleRulesPanel({ prepareNavigation: false });
        return;
      }
      returnScene?.hideRulesPanelBackgroundHelpers?.();
      this.scene.launch('RulesPanelScene', returnScene?.getBattleRulesPanelLaunchData?.() ?? { returnSceneKey, hideScrollHint: true, battleModalPresentation: returnSceneKey === 'BattleScene' });
    });

    const surrenderButton = this.add
      .text(width * 0.5, height * 0.68, translateActive('ui.battleMenu.surrender', 'SURRENDER'), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#fed7aa',
        backgroundColor: '#7f1d1d',
        fontStyle: 'bold',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    surrenderButton.on('pointerup', () => {
      const returnScene = this.scene.get(returnSceneKey);
      if (!returnScene?.canPlayerMenuSurrender?.()) return;
      this.showSurrenderConfirmation(returnScene, returnSceneKey);
    });

    const backButton = this.add
      .text(width * 0.08, height * 0.94, '←', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '36px',
        color: '#cbd5e1',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });

    backButton.on('pointerup', () => {
      const returnScene = this.scene.get(returnSceneKey);
      this.scene.stop();
      if (returnScene?.resumeFromBattleMenu) {
        returnScene.resumeFromBattleMenu();
        return;
      }
      stopMusic(this);
      this.scene.start('BattleScene', { factionKey, enemyFactionKey, battleContext });
    });
  }

  showSurrenderConfirmation(returnScene, returnSceneKey) {
    if (this.surrenderConfirmation) return;
    const { width, height } = this.scale;
    const centerX = width * 0.5;
    const centerY = height * 0.48;
    const overlay = this.add.rectangle(centerX, height * 0.5, width, height, 0x020617, 0.78)
      .setInteractive()
      .setDepth(50);
    const panel = this.add.rectangle(centerX, centerY, Math.min(width * 0.86, 540), Math.min(height * 0.34, 300), 0x111827, 0.98)
      .setStrokeStyle(2, 0xf97316, 0.78)
      .setDepth(51);
    const title = this.add.text(centerX, centerY - 72, translateActive('ui.battle.surrenderConfirmTitle', 'SURRENDER?'), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '34px',
      color: '#fed7aa',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(52);
    const body = this.add.text(centerX, centerY - 16, translateActive('ui.battle.surrenderConfirmBody', 'This counts as a defeat.'), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      color: '#f8fafc',
      align: 'center',
    }).setOrigin(0.5).setDepth(52);
    const cancel = this.add.text(centerX - 110, centerY + 76, translateActive('ui.common.cancel', 'Cancel'), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#0f172a',
      backgroundColor: '#cbd5e1',
      fontStyle: 'bold',
      padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(52);
    const surrender = this.add.text(centerX + 110, centerY + 76, translateActive('ui.battle.surrenderConfirmButton', 'Surrender'), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#fed7aa',
      backgroundColor: '#7f1d1d',
      fontStyle: 'bold',
      padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(52);

    cancel.on('pointerup', () => this.destroySurrenderConfirmation());
    surrender.on('pointerup', () => {
      this.destroySurrenderConfirmation();
      this.scene.stop();
      if (returnScene?.resumeFromBattleMenu) returnScene.resumeFromBattleMenu();
      else this.scene.resume(returnSceneKey);
      returnScene?.resolvePlayerMenuSurrender?.();
    });

    this.surrenderConfirmation = { items: [overlay, panel, title, body, cancel, surrender] };
  }

  destroySurrenderConfirmation() {
    const confirmation = this.surrenderConfirmation;
    if (!confirmation) return;
    confirmation.items.forEach((item) => {
      item?.removeAllListeners?.();
      item?.destroy?.();
    });
    this.surrenderConfirmation = null;
  }

  resumeFromRulesPanel() {
    this.scene.resume();
  }
}
