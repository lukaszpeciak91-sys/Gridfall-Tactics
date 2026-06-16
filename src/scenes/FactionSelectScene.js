import Phaser from 'phaser';
import { getFactionKeys } from '../data/factions/index.js';
import { createBuildMarker } from '../ui/buildMarker.js';
import { createMenuScreenHeader } from '../ui/screenHeader.js';
import { createBottomNavigationControls, requestPortraitOrientationLock, toggleSceneFullscreen } from '../ui/navigationControls.js';
import { translateActive } from '../localization/localeService.js';
import { applyAudioSettings, loadSettings } from '../systems/settingsState.js';
import {
  MENU_BACKGROUND_FALLBACK_COLOR,
  MENU_BACKGROUND_FALLBACK_COLOR_HEX,
  createCoverBackground,
  createMenuArenaLightSweep,
  getMenuBackgroundAsset,
  preloadMenuBackgroundArt,
} from '../rendering/backgroundArt.js';
import { createNewCampaign, saveCampaign } from '../systems/campaignState.js';
import { drawFactionCardVisual, preloadFactionPreviewArt } from '../ui/factionCards.js';
import { createTapVsDragInteraction } from '../ui/tapVsDragInteraction.js';

const MIN_FACTION_LIST_TOP = 106;
const HEADER_TO_FACTION_LIST_GAP = 24;
export default class FactionSelectScene extends Phaser.Scene {
  constructor() {
    super('FactionSelectScene');
    this.uiElements = [];
    this.interactiveElements = [];
    this.scrollMask = null;
    this.scrollState = null;
    this.isStartingBattle = false;
    this.tapVsDrag = createTapVsDragInteraction();
  }

  preload() {
    preloadMenuBackgroundArt(this);
    preloadFactionPreviewArt(this);
  }

  init(data = {}) {
    this.mode = data?.mode === 'campaign' ? 'campaign' : 'arena';
    this.returnSceneKey = data?.returnSceneKey === 'GameMenuScene' ? 'GameMenuScene' : 'MainMenuScene';
    this.isStartingBattle = false;
    this.cleanupScene();
  }

  create() {
    this.cleanupScene();

    if (this.children) {
      this.children.removeAll(true);
    }

    const { width, height } = this.scale;
    applyAudioSettings(this, loadSettings());
    const factionKeys = getFactionKeys();

    this.cameras.main.setBackgroundColor(MENU_BACKGROUND_FALLBACK_COLOR_HEX);
    createCoverBackground(this, {
      asset: getMenuBackgroundAsset(),
      fallbackColor: MENU_BACKGROUND_FALLBACK_COLOR,
      width,
      height,
    });
    createMenuArenaLightSweep(this, {
      width,
      height,
      opacity: 0.075,
      y: height * 0.24,
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
    this.scale.on('enterfullscreen', this.onFullscreenChanged, this);
    this.scale.on('leavefullscreen', this.onFullscreenChanged, this);

    const header = createMenuScreenHeader(this, {
      title: translateActive('ui.factionSelect.title', 'SELECT YOUR TEAM'),
      width,
      height,
    });
    this.uiElements.push(...header.items);

    const buildMarker = createBuildMarker(this, { width, height });
    this.uiElements.push(buildMarker);

    this.drawNavigationControls();
    this.drawFactionCards(factionKeys, {
      width,
      height,
      headerBottomY: header.bottomY,
    });
  }


  drawFactionCards(factionKeys, { width, height, headerBottomY }) {
    const cardWidth = Math.min(width - 24, 382);
    const cardHeight = 196;
    const gap = 14;
    const viewportTop = Math.max(MIN_FACTION_LIST_TOP, Math.ceil(headerBottomY + HEADER_TO_FACTION_LIST_GAP));
    const viewportBottom = Math.max(viewportTop + cardHeight, height - 88);
    const viewportHeight = viewportBottom - viewportTop;
    const contentHeight = factionKeys.length * cardHeight + Math.max(0, factionKeys.length - 1) * gap;
    const content = this.add.container(width / 2, viewportTop);
    this.uiElements.push(content);

    const maskShape = this.add.graphics();
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(0, viewportTop, width, viewportHeight);
    maskShape.setVisible(false);
    this.uiElements.push(maskShape);

    this.scrollMask = maskShape.createGeometryMask();
    content.setMask(this.scrollMask);

    factionKeys.forEach((factionKey, index) => {
      const y = index * (cardHeight + gap);
      this.drawFactionCard(content, factionKey, {
        y,
        cardWidth,
        cardHeight,
      });
    });

    this.scrollState = {
      content,
      maxY: viewportTop,
      minY: viewportTop - Math.max(0, contentHeight - viewportHeight),
      viewportTop,
      viewportBottom,
      pointerId: null,
      pointerStartY: 0,
      contentStartY: viewportTop,
    };

    this.input.on('wheel', this.onScrollWheel, this);
    this.input.on('pointerdown', this.onScrollPointerDown, this);
    this.input.on('pointermove', this.onScrollPointerMove, this);
    this.input.on('pointerup', this.onScrollPointerUp, this);
  }

  drawFactionCard(content, factionKey, { y, cardWidth, cardHeight }) {
    const { items } = drawFactionCardVisual(this, content, factionKey, { y, cardWidth, cardHeight });
    this.uiElements.push(...items);

    const pressOverlay = this.add.graphics();
    pressOverlay.fillStyle(0xffffff, 0.08);
    pressOverlay.fillRoundedRect(-cardWidth / 2, y, cardWidth, cardHeight, 20);
    pressOverlay.setVisible(false);
    content.add(pressOverlay);
    this.uiElements.push(pressOverlay);

    const button = this.add
      .zone(0, y + cardHeight / 2, cardWidth, cardHeight)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    button.on('pointerdown', (pointer) => {
      this.tapVsDrag.begin(pointer, this.scrollState?.content?.y ?? 0);
      pressOverlay.setVisible(true);
    });
    button.on('pointerout', () => pressOverlay.setVisible(false));
    button.on('pointerup', (pointer) => {
      pressOverlay.setVisible(false);
      if (this.tapVsDrag.end(pointer, this.scrollState?.content?.y ?? 0)) {
        this.selectFaction(factionKey);
      }
    });
    content.add(button);
    this.uiElements.push(button);
    this.interactiveElements.push(button);
  }

  selectFaction(factionKey) {
    if (this.mode === 'campaign') {
      this.startCampaign(factionKey);
      return;
    }

    this.startBattle(factionKey);
  }

  startCampaign(factionKey) {
    if (!getFactionKeys().includes(factionKey)) return;

    const campaign = createNewCampaign(factionKey);
    const savedCampaign = saveCampaign(campaign) ?? campaign;
    this.scene.start('CampaignEnemySelectScene', { campaign: savedCampaign });
  }

  onScrollWheel(pointer, gameObjects, deltaX, deltaY) {
    const state = this.scrollState;
    if (!state || pointer.y < state.viewportTop || pointer.y > state.viewportBottom) {
      return;
    }

    this.setFactionScrollY(state.content.y - deltaY * 0.45);
  }

  onScrollPointerDown(pointer) {
    const state = this.scrollState;
    if (!state || pointer.y < state.viewportTop || pointer.y > state.viewportBottom) {
      return;
    }

    state.pointerId = pointer.id;
    state.pointerStartY = pointer.y;
    state.contentStartY = state.content.y;
  }

  onScrollPointerMove(pointer) {
    const state = this.scrollState;
    if (!state || state.pointerId !== pointer.id) {
      return;
    }

    const dragDistance = pointer.y - state.pointerStartY;
    this.setFactionScrollY(state.contentStartY + dragDistance);
    this.tapVsDrag.update(pointer, state.content.y);
  }

  onScrollPointerUp(pointer) {
    const state = this.scrollState;
    if (!state || state.pointerId !== pointer.id) {
      return;
    }

    state.pointerId = null;
  }

  setFactionScrollY(nextY) {
    const state = this.scrollState;
    if (!state) {
      return;
    }

    state.content.y = Phaser.Math.Clamp(nextY, state.minY, state.maxY);
  }


  drawNavigationControls() {
    const controls = createBottomNavigationControls(this, {
      onBack: () => this.returnToMainMenu(),
      onRules: () => this.openRulesPanel(),
      onFullscreen: () => this.toggleFullscreen(),
    });

    [controls.back, controls.rules, controls.fullscreen].filter(Boolean).forEach((control) => {
      this.uiElements.push(control.button ?? control.halo, control.backing, control.text);
      this.interactiveElements.push(control.button ?? control.backing, control.text);
    });
  }

  returnToMainMenu() {
    this.scene.start(this.returnSceneKey);
  }

  openRulesPanel() {
    this.scene.launch('RulesPanelScene', { returnSceneKey: 'FactionSelectScene' });
    this.scene.pause();
  }

  openBattleMenu() {
    this.scene.launch('BattleMenuScene', { returnSceneKey: 'FactionSelectScene' });
    this.scene.pause();
  }

  resumeFromRulesPanel() {
    this.scene.resume();
  }

  resumeFromBattleMenu() {
    this.scene.resume();
  }

  toggleFullscreen() {
    toggleSceneFullscreen(this);
  }

  onFullscreenChanged() {
    if (this.scale.isFullscreen) {
      requestPortraitOrientationLock();
    }

    if (this.scene.isActive('FactionSelectScene')) {
      this.scene.restart({ mode: this.mode, returnSceneKey: this.returnSceneKey });
    }
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
    this.interactiveElements.forEach((element) => element?.disableInteractive?.());

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
    this.interactiveElements.forEach((element) => {
      if (element?.active) {
        element.setInteractive?.({ useHandCursor: true });
      }
    });
  }

  cleanupScene() {
    this.scale?.off('enterfullscreen', this.onFullscreenChanged, this);
    this.scale?.off('leavefullscreen', this.onFullscreenChanged, this);
    this.input?.off('wheel', this.onScrollWheel, this);
    this.input?.off('pointerdown', this.onScrollPointerDown, this);
    this.input?.off('pointermove', this.onScrollPointerMove, this);
    this.input?.off('pointerup', this.onScrollPointerUp, this);

    this.tapVsDrag?.cancel?.();
    this.scrollMask?.destroy?.();
    this.scrollMask = null;
    this.scrollState = null;

    this.uiElements.forEach((element) => {
      if (element && element.active) {
        element.removeAllListeners?.();
        element.destroy();
      }
    });
    this.uiElements = [];
    this.interactiveElements = [];
  }
}

