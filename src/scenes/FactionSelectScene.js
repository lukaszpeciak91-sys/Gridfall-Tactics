import Phaser from 'phaser';
import { getFactionKeys } from '../data/factions/index.js';

export default class FactionSelectScene extends Phaser.Scene {
  constructor() {
    super('FactionSelectScene');
    this.uiElements = [];
    this.isStartingBattle = false;
  }

  init() {
    this.isStartingBattle = false;
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
      button.on('pointerup', () => this.startBattle(factionKey));

      this.uiElements.push(button);
    });
  }

  startBattle(factionKey) {
    if (this.isStartingBattle) {
      return;
    }

    const factionKeys = getFactionKeys();
    if (!factionKeys.includes(factionKey)) {
      return;
    }

    this.isStartingBattle = true;
    this.uiElements.forEach((element) => element?.disableInteractive?.());

    const transitionDiagnostics = this.getBattleTransitionDiagnostics(factionKey);
    if (transitionDiagnostics.blockedReason) {
      console.warn('Faction select battle transition blocked', transitionDiagnostics);
      this.resetStartBattleGuard();
      return;
    }

    this.stopStaleBattleScenes(transitionDiagnostics);

    try {
      this.scene.start('BattleScene', { factionKey });
    } catch (error) {
      console.error('Faction select battle transition threw before BattleScene start', {
        error,
        diagnostics: this.getBattleTransitionDiagnostics(factionKey),
      });
      this.resetStartBattleGuard();
      return;
    }

    globalThis.setTimeout(() => {
      if (!this.scene.isActive('BattleScene')) {
        console.warn('Faction select battle transition did not activate BattleScene', this.getBattleTransitionDiagnostics(factionKey));
        this.resetStartBattleGuard();
      }
    }, 0);
  }

  getBattleTransitionDiagnostics(factionKey) {
    const sceneKeys = ['FactionSelectScene', 'BattleScene', 'BattleMenuScene'];
    const sceneStates = Object.fromEntries(sceneKeys.map((key) => [key, {
      active: this.scene.isActive(key),
      sleeping: this.scene.isSleeping(key),
      paused: this.scene.isPaused(key),
      visible: this.scene.isVisible(key),
    }]));
    const battleScene = this.scene.get('BattleScene');

    return {
      factionKey,
      factionExists: Boolean(getFactionKeys().includes(factionKey)),
      battleSceneExists: Boolean(battleScene),
      sceneStates,
      inputEnabled: Boolean(this.input?.enabled),
      staleInteractiveObjects: this.getStaleInteractiveObjects(),
      blockedReason: battleScene ? null : 'missing BattleScene',
    };
  }

  getStaleInteractiveObjects() {
    const currentSceneObjects = new Set();
    this.children?.each((child) => currentSceneObjects.add(child));

    return (this.input?.manager?.pointers ?? [])
      .flatMap((pointer) => pointer._temp ?? [])
      .filter((gameObject) => !currentSceneObjects.has(gameObject))
      .map((gameObject) => ({
        type: gameObject?.type ?? 'unknown',
        name: gameObject?.name ?? '',
        active: gameObject?.active,
        visible: gameObject?.visible,
        depth: gameObject?.depth,
        sceneKey: gameObject?.scene?.scene?.key,
      }));
  }

  stopStaleBattleScenes(transitionDiagnostics) {
    ['BattleScene', 'BattleMenuScene'].forEach((sceneKey) => {
      const state = transitionDiagnostics.sceneStates[sceneKey];
      if (state?.active || state?.sleeping || state?.paused) {
        console.warn(`Stopping stale ${sceneKey} before faction-select battle start`, transitionDiagnostics);
        this.scene.stop(sceneKey);
      }
    });
  }

  resetStartBattleGuard() {
    this.isStartingBattle = false;
    this.uiElements.forEach((element) => {
      if (element?.active) {
        element.setInteractive?.({ useHandCursor: true });
      }
    });
  }

  cleanupScene() {
    this.uiElements.forEach((element) => {
      if (element && element.active) {
        element.removeAllListeners?.();
        element.destroy();
      }
    });
    this.uiElements = [];
  }
}

