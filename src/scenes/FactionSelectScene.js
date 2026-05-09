import Phaser from 'phaser';
import { getFactionByKey, getFactionKeys } from '../data/factions/index.js';
import { createBuildMarker } from '../ui/buildMarker.js';
import { createBottomNavigationControls, requestPortraitOrientationLock, toggleSceneFullscreen } from '../ui/navigationControls.js';
import { MENU_BACKGROUND_FALLBACK_COLOR, MENU_BACKGROUND_FALLBACK_COLOR_HEX, createCoverBackground, getMenuBackgroundAsset, preloadMenuBackgroundArt } from '../rendering/backgroundArt.js';

const FACTION_CARD_DETAILS = {
  Aggro: {
    description: 'Fast pressure.',
    tags: ['Rush', 'Burst'],
    accentColor: 0xf97316,
    fallbackTopColor: 0x7c2d12,
    fallbackBottomColor: 0x0f172a,
  },
  Tank: {
    description: 'Armor and sustain.',
    tags: ['Armor', 'Sustain'],
    accentColor: 0x38bdf8,
    fallbackTopColor: 0x164e63,
    fallbackBottomColor: 0x0f172a,
  },
  Control: {
    description: 'Disrupt and reposition.',
    tags: ['Disrupt', 'Move'],
    accentColor: 0xa78bfa,
    fallbackTopColor: 0x4c1d95,
    fallbackBottomColor: 0x0f172a,
  },
  Swarm: {
    description: 'Board swarm tactics.',
    tags: ['Tokens', 'Buffs'],
    accentColor: 0x84cc16,
    fallbackTopColor: 0x365314,
    fallbackBottomColor: 0x0f172a,
  },
};

const CARD_SCROLL_DRAG_THRESHOLD = 8;

function getFactionAssetSlug(factionKey) {
  const faction = getFactionByKey(factionKey);
  return (faction?.id ?? factionKey).toLowerCase();
}

function getFactionPreviewPath(factionKey) {
  return `/assets/factions/${getFactionAssetSlug(factionKey)}/preview.webp`;
}

function getFactionPreviewTextureKey(factionKey) {
  return `faction-preview-${getFactionAssetSlug(factionKey)}`;
}

function preloadFactionPreviewArt(scene) {
  getFactionKeys().forEach((factionKey) => {
    scene.load.image(getFactionPreviewTextureKey(factionKey), getFactionPreviewPath(factionKey));
  });
}

export default class FactionSelectScene extends Phaser.Scene {
  constructor() {
    super('FactionSelectScene');
    this.uiElements = [];
    this.interactiveElements = [];
    this.scrollMask = null;
    this.scrollState = null;
    this.isStartingBattle = false;
  }

  preload() {
    preloadMenuBackgroundArt(this);
    preloadFactionPreviewArt(this);
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

    this.cameras.main.setBackgroundColor(MENU_BACKGROUND_FALLBACK_COLOR_HEX);
    createCoverBackground(this, {
      asset: getMenuBackgroundAsset(),
      fallbackColor: MENU_BACKGROUND_FALLBACK_COLOR,
      width,
      height,
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
    this.scale.on('enterfullscreen', this.onFullscreenChanged, this);
    this.scale.on('leavefullscreen', this.onFullscreenChanged, this);

    const title = this.add
      .text(width / 2, 48, 'Choose Your Faction', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '30px',
        color: '#f8fafc',
        fontStyle: 'bold',
        letterSpacing: 0.8,
      })
      .setOrigin(0.5);
    this.uiElements.push(title);

    const subtitle = this.add
      .text(width / 2, 78, 'Tap a faction to begin battle', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);
    this.uiElements.push(subtitle);

    const buildMarker = createBuildMarker(this, { width, height });
    this.uiElements.push(buildMarker);

    this.drawNavigationControls();
    this.drawFactionCards(factionKeys, { width, height });
  }


  drawFactionCards(factionKeys, { width, height }) {
    const cardWidth = Math.min(width - 24, 382);
    const cardHeight = 164;
    const gap = 12;
    const viewportTop = 106;
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
      lastDragDistance: 0,
    };

    this.input.on('wheel', this.onScrollWheel, this);
    this.input.on('pointerdown', this.onScrollPointerDown, this);
    this.input.on('pointermove', this.onScrollPointerMove, this);
    this.input.on('pointerup', this.onScrollPointerUp, this);
  }

  drawFactionCard(content, factionKey, { y, cardWidth, cardHeight }) {
    const faction = getFactionByKey(factionKey);
    const details = FACTION_CARD_DETAILS[factionKey] ?? FACTION_CARD_DETAILS.Aggro;
    const x = -cardWidth / 2;
    const artMargin = 10;
    const artWidth = cardWidth - artMargin * 2;
    const artHeight = Math.round(cardHeight * 0.58);
    const artY = y + artMargin;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x020617, 0.38);
    shadow.fillRoundedRect(x + 2, y + 4, cardWidth, cardHeight, 18);
    content.add(shadow);
    this.uiElements.push(shadow);

    const card = this.add.graphics();
    card.fillStyle(0x0f172a, 0.95);
    card.fillRoundedRect(x, y, cardWidth, cardHeight, 18);
    card.lineStyle(1, details.accentColor, 0.62);
    card.strokeRoundedRect(x + 1, y + 1, cardWidth - 2, cardHeight - 2, 17);
    content.add(card);
    this.uiElements.push(card);

    this.drawFactionPreview(content, factionKey, details, {
      x: x + artMargin,
      y: artY,
      width: artWidth,
      height: artHeight,
    });

    const titleScrim = this.add.graphics();
    titleScrim.fillGradientStyle(0x020617, 0x020617, 0x020617, 0x020617, 0, 0, 0.74, 0.74);
    titleScrim.fillRect(x + artMargin, artY + artHeight - 42, artWidth, 42);
    content.add(titleScrim);
    this.uiElements.push(titleScrim);

    const name = this.add
      .text(x + artMargin + 12, artY + artHeight - 31, faction?.name ?? factionKey, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#f8fafc',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0);
    content.add(name);
    this.uiElements.push(name);

    const infoTop = artY + artHeight + 9;
    const description = this.add
      .text(x + 16, infoTop, details.description, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#e5e7eb',
      })
      .setOrigin(0, 0);
    content.add(description);
    this.uiElements.push(description);

    this.drawFactionTags(content, details.tags, {
      x: x + 16,
      y: y + cardHeight - 32,
      accentColor: details.accentColor,
    });

    const pressOverlay = this.add.graphics();
    pressOverlay.fillStyle(0xffffff, 0.08);
    pressOverlay.fillRoundedRect(x, y, cardWidth, cardHeight, 18);
    pressOverlay.setVisible(false);
    content.add(pressOverlay);
    this.uiElements.push(pressOverlay);

    const button = this.add
      .zone(0, y + cardHeight / 2, cardWidth, cardHeight)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    button.on('pointerdown', () => pressOverlay.setVisible(true));
    button.on('pointerout', () => pressOverlay.setVisible(false));
    button.on('pointerup', () => pressOverlay.setVisible(false));
    button.on('pointerup', () => this.startBattle(factionKey));
    content.add(button);
    this.uiElements.push(button);
    this.interactiveElements.push(button);
  }

  drawFactionPreview(content, factionKey, details, { x, y, width, height }) {
    const textureKey = getFactionPreviewTextureKey(factionKey);
    if (this.textures.exists(textureKey)) {
      const texture = this.textures.get(textureKey);
      const source = texture.getSourceImage();
      const sourceWidth = source?.width ?? width;
      const sourceHeight = source?.height ?? height;
      const targetRatio = width / height;
      const sourceRatio = sourceWidth / sourceHeight;
      const cropWidth = sourceRatio > targetRatio ? sourceHeight * targetRatio : sourceWidth;
      const cropHeight = sourceRatio > targetRatio ? sourceHeight : sourceWidth / targetRatio;
      const image = this.add.image(x + width / 2, y + height / 2, textureKey)
        .setCrop((sourceWidth - cropWidth) / 2, (sourceHeight - cropHeight) / 2, cropWidth, cropHeight)
        .setDisplaySize(width, height);
      content.add(image);
      this.uiElements.push(image);

      const frame = this.add.graphics();
      frame.lineStyle(1, details.accentColor, 0.48);
      frame.strokeRoundedRect(x + 0.5, y + 0.5, width - 1, height - 1, 14);
      content.add(frame);
      this.uiElements.push(frame);
    } else {
      const fallback = this.add.graphics();
      fallback.fillGradientStyle(
        details.fallbackTopColor,
        details.fallbackTopColor,
        details.fallbackBottomColor,
        details.fallbackBottomColor,
        1,
      );
      fallback.fillRoundedRect(x, y, width, height, 16);
      fallback.lineStyle(1, details.accentColor, 0.52);
      fallback.strokeRoundedRect(x + 1, y + 1, width - 2, height - 2, 15);
      content.add(fallback);
      this.uiElements.push(fallback);
    }
  }

  drawFactionTags(content, tags, { x, y, accentColor }) {
    let currentX = x;
    tags.forEach((tag) => {
      const text = this.add
        .text(currentX + 10, y + 4, tag, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '11px',
          color: '#f8fafc',
        })
        .setOrigin(0, 0);
      const pillWidth = Math.ceil(text.width + 20);
      const pill = this.add.graphics();
      pill.fillStyle(accentColor, 0.24);
      pill.fillRoundedRect(currentX, y, pillWidth, 24, 12);
      pill.lineStyle(1, accentColor, 0.56);
      pill.strokeRoundedRect(currentX + 0.5, y + 0.5, pillWidth - 1, 23, 11);
      content.add(pill);
      content.add(text);
      this.uiElements.push(pill, text);
      currentX += pillWidth + 8;
    });
  }

  wasScrollDragging() {
    return Math.abs(this.scrollState?.lastDragDistance ?? 0) > CARD_SCROLL_DRAG_THRESHOLD;
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
    state.lastDragDistance = 0;
  }

  onScrollPointerMove(pointer) {
    const state = this.scrollState;
    if (!state || state.pointerId !== pointer.id) {
      return;
    }

    state.lastDragDistance = pointer.y - state.pointerStartY;
    this.setFactionScrollY(state.contentStartY + state.lastDragDistance);
  }

  onScrollPointerUp(pointer) {
    const state = this.scrollState;
    if (!state || state.pointerId !== pointer.id) {
      return;
    }

    state.pointerId = null;
    globalThis.setTimeout(() => {
      if (this.scrollState) {
        this.scrollState.lastDragDistance = 0;
      }
    }, 0);
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
      onBack: () => this.returnToStart(),
      onRules: () => this.openRulesPanel(),
      onFullscreen: () => this.toggleFullscreen(),
    });

    [controls.back, controls.rules, controls.fullscreen].forEach((control) => {
      this.uiElements.push(control.halo, control.backing, control.text);
      this.interactiveElements.push(control.backing, control.text);
    });
  }

  returnToStart() {
    this.scene.start('StartScene');
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
      this.scene.restart();
    }
  }

  startBattle(factionKey) {
    if (this.wasScrollDragging()) {
      return;
    }

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

