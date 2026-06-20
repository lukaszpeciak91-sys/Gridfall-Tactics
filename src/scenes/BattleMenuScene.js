import Phaser from 'phaser';
import { translateActive } from '../localization/localeService.js';

export default class BattleMenuScene extends Phaser.Scene {
  constructor() {
    super('BattleMenuScene');
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
      this.scene.launch('RulesPanelScene', { returnSceneKey: 'BattleMenuScene', hideScrollHint: true });
      this.scene.pause();
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
      this.scene.start('BattleScene', { factionKey, enemyFactionKey, battleContext });
    });
  }

  resumeFromRulesPanel() {
    this.scene.resume();
  }
}
