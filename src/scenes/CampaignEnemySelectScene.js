import Phaser from 'phaser';
import { createBuildMarker } from '../ui/buildMarker.js';
import { createMenuScreenHeader } from '../ui/screenHeader.js';
import { createBottomNavigationControls, requestPortraitOrientationLock, toggleSceneFullscreen } from '../ui/navigationControls.js';
import { translateActive } from '../localization/localeService.js';
import { applyAudioSettings, loadSettings } from '../systems/settingsState.js';
import { AUDIO_KEYS, preloadAudioAssets } from '../audio/audioAssets.js';
import { playSfx } from '../audio/audioPlayback.js';
import { playMenuMusic } from '../audio/menuMusic.js';
import { emitSceneTransitionVisuallyReady, reconcileSceneTransitionOverlayOrdering } from './sceneTransitionOverlay.js';
import { isValidCampaignState, loadCampaign, saveCampaign, selectCampaignEnemy } from '../systems/campaignState.js';
import { getCampaignEnemyViewModels } from '../systems/campaignEnemySelection.js';
import { MENU_BACKGROUND_FALLBACK_COLOR, MENU_BACKGROUND_FALLBACK_COLOR_HEX, createAnimatedMenuBackground, preloadMenuBackgroundArt } from '../rendering/backgroundArt.js';
import { drawFactionCardVisual, preloadFactionPreviewArt } from '../ui/factionCards.js';
import { getCampaignEnemyStatusBadgeLayout } from '../ui/campaignEnemyStatusLayout.js';
import { createTapVsDragInteraction } from '../ui/tapVsDragInteraction.js';
import { enterBattleScene } from './battleEntryRouter.js';

const CARD_HEIGHT = 196;
const CARD_GAP = 34;
const VIEWPORT_TOP_MIN = 118;
const HEADER_GAP = 22;
export default class CampaignEnemySelectScene extends Phaser.Scene {
  constructor() {
    super('CampaignEnemySelectScene');
    this.uiElements = [];
    this.interactiveElements = [];
    this.scrollState = null;
    this.scrollMask = null;
    this.campaign = null;
    this.statusText = null;
    this.tapVsDrag = createTapVsDragInteraction();
    this.transitionReadyEmitted = false;
    this.transitionReadyPostRenderCallback = null;
    this.transitionReadyFallbackEvent = null;
  }

  preload() {
    preloadMenuBackgroundArt(this);
    preloadFactionPreviewArt(this);
    preloadAudioAssets(this);
  }

  init(data = {}) {
    this.cleanupScene();
    this.sceneTransitionOverlay = data?.sceneTransitionOverlay ?? null;
    this.transitionReadyEmitted = false;
    this.campaign = isValidCampaignState(data?.campaign) ? data.campaign : loadCampaign();
  }

  create() {
    this.reconcileTransitionOverlayOrdering('destination create start');
    this.cleanupScene();
    if (!isValidCampaignState(this.campaign) || this.campaign.status !== 'active') {
      this.scene.start('GameMenuScene', { sceneTransitionOverlay: this.sceneTransitionOverlay });
      return;
    }

    const { width, height } = this.scale;
    applyAudioSettings(this, loadSettings());
    playMenuMusic(this);
    this.cameras.main.setBackgroundColor(MENU_BACKGROUND_FALLBACK_COLOR_HEX);
    this.menuBackground = createAnimatedMenuBackground(this, { fallbackColor: MENU_BACKGROUND_FALLBACK_COLOR, width, height, lightSweepOptions: { opacity: 0.075, y: height * 0.24 } });
    this.reconcileTransitionOverlayOrdering('destination background creation');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
    this.scale.on('enterfullscreen', this.onFullscreenChanged, this);
    this.scale.on('leavefullscreen', this.onFullscreenChanged, this);

    const header = createMenuScreenHeader(this, { title: translateActive('ui.campaignEnemySelect.title', 'SELECT ENEMY'), width, height });
    this.uiElements.push(...header.items);
    this.uiElements.push(createBuildMarker(this, { width, height }));
    this.drawNavigationControls();
    this.drawEnemyCards({ width, height, headerBottomY: header.bottomY });
    this.scheduleTransitionReadyAfterFirstRender();
  }

  drawEnemyCards({ width, height, headerBottomY }) {
    const enemies = getCampaignEnemyViewModels(this.campaign);
    const cardWidth = Math.min(width - 24, 382);
    const viewportTop = Math.max(VIEWPORT_TOP_MIN, Math.ceil(headerBottomY + HEADER_GAP));
    const viewportBottom = Math.max(viewportTop + CARD_HEIGHT, height - 88);
    const viewportHeight = viewportBottom - viewportTop;
    const contentHeight = enemies.length * CARD_HEIGHT + Math.max(0, enemies.length - 1) * CARD_GAP;
    const content = this.add.container(width / 2, viewportTop);
    this.uiElements.push(content);

    const maskShape = this.add.graphics();
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(0, viewportTop, width, viewportHeight);
    maskShape.setVisible(false);
    this.uiElements.push(maskShape);
    this.scrollMask = maskShape.createGeometryMask();
    content.setMask(this.scrollMask);

    enemies.forEach((enemy, index) => this.drawEnemyCard(content, enemy, { y: index * (CARD_HEIGHT + CARD_GAP), cardWidth }));

    this.scrollState = { content, maxY: viewportTop, minY: viewportTop - Math.max(0, contentHeight - viewportHeight), viewportTop, viewportBottom, pointerId: null, pointerStartY: 0, contentStartY: viewportTop };
    this.input.on('wheel', this.onScrollWheel, this);
    this.input.on('pointerdown', this.onScrollPointerDown, this);
    this.input.on('pointermove', this.onScrollPointerMove, this);
    this.input.on('pointerup', this.onScrollPointerUp, this);
  }

  drawEnemyCard(content, enemy, { y, cardWidth }) {
    const { items } = drawFactionCardVisual(this, content, enemy.factionKey, { y, cardWidth, cardHeight: CARD_HEIGHT, alpha: enemy.defeated ? 0.62 : 1, completed: enemy.defeated });
    this.uiElements.push(...items);
    const indicatorLayout = getCampaignEnemyStatusBadgeLayout({ y, cardWidth, cardHeight: CARD_HEIGHT });
    const indicator = this.add.text(indicatorLayout.centerX, indicatorLayout.centerY, enemy.indicator, { fontFamily: 'Arial, sans-serif', fontSize: enemy.defeated ? '25px' : '21px', color: enemy.defeated ? '#86efac' : '#fde68a', stroke: '#020617', strokeThickness: 3, align: 'center', fixedWidth: indicatorLayout.indicatorWidth }).setOrigin(0.5);
    const indicatorBadge = this.add.graphics();
    indicatorBadge.fillStyle(0x020617, enemy.defeated ? 0.58 : 0.66);
    indicatorBadge.fillRoundedRect(
      indicatorLayout.x,
      indicatorLayout.y,
      indicatorLayout.panelWidth,
      indicatorLayout.panelHeight,
      12,
    );
    indicatorBadge.lineStyle(1, enemy.defeated ? 0x86efac : 0xfde68a, enemy.defeated ? 0.38 : 0.48);
    indicatorBadge.strokeRoundedRect(
      indicatorLayout.x + 0.5,
      indicatorLayout.y + 0.5,
      indicatorLayout.panelWidth - 1,
      indicatorLayout.panelHeight - 1,
      11,
    );
    content.add(indicatorBadge);
    content.add(indicator);
    this.uiElements.push(indicatorBadge, indicator);

    if (!enemy.selectable) return;
    const button = this.add.zone(0, y + CARD_HEIGHT / 2, cardWidth, CARD_HEIGHT).setOrigin(0.5).setInteractive({ useHandCursor: true });
    button.on('pointerdown', (pointer) => this.tapVsDrag.begin(pointer, this.scrollState?.content?.y ?? 0));
    button.on('pointerup', (pointer) => {
      if (this.tapVsDrag.end(pointer, this.scrollState?.content?.y ?? 0)) {
        this.selectEnemy(enemy.factionKey);
      }
    });
    content.add(button);
    this.uiElements.push(button);
    this.interactiveElements.push(button);
  }

  selectEnemy(enemyFactionKey) {
    try {
      const currentCampaign = loadCampaign() ?? this.campaign;
      if (!isValidCampaignState(currentCampaign) || currentCampaign.status !== 'active') {
        throw new RangeError('Campaign is not active.');
      }
      const selected = selectCampaignEnemy(currentCampaign, enemyFactionKey);
      const updatedCampaign = saveCampaign(selected) ?? selected;
      this.campaign = updatedCampaign;
      playSfx(this, AUDIO_KEYS.UI_CLICK);
      // Menu music intentionally continues through BattleTransitionScene until visual handoff.
      enterBattleScene(this, {
        factionKey: updatedCampaign.playerFactionKey,
        enemyFactionKey,
        battleContext: {
          mode: 'campaign',
          campaignRunId: updatedCampaign.runId,
          campaignEnemyFactionKey: enemyFactionKey,
        },
      });
    } catch (error) {
      console.warn('Campaign enemy selection failed.', error);
      this.showTemporaryMessage(translateActive('ui.campaignEnemySelect.invalidEnemy', 'Enemy unavailable.'));
    }
  }

  showTemporaryMessage(message) {
    this.statusText?.destroy?.();
    this.statusText = this.add.text(this.scale.width / 2, this.scale.height - 126, message, { fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#fde68a', align: 'center', backgroundColor: '#020617cc', padding: { x: 10, y: 6 } }).setOrigin(0.5).setDepth(30);
    this.uiElements.push(this.statusText);
  }

  onScrollWheel(pointer, gameObjects, deltaX, deltaY) { const s = this.scrollState; if (!s || pointer.y < s.viewportTop || pointer.y > s.viewportBottom) return; this.setScrollY(s.content.y - deltaY * 0.45); }
  onScrollPointerDown(pointer) { const s = this.scrollState; if (!s || pointer.y < s.viewportTop || pointer.y > s.viewportBottom) return; s.pointerId = pointer.id; s.pointerStartY = pointer.y; s.contentStartY = s.content.y; }
  onScrollPointerMove(pointer) { const s = this.scrollState; if (!s || s.pointerId !== pointer.id) return; this.setScrollY(s.contentStartY + pointer.y - s.pointerStartY); this.tapVsDrag.update(pointer, s.content.y); }
  onScrollPointerUp(pointer) { const s = this.scrollState; if (s?.pointerId === pointer.id) s.pointerId = null; }
  setScrollY(nextY) { const s = this.scrollState; if (s) s.content.y = Phaser.Math.Clamp(nextY, s.minY, s.maxY); }

  drawNavigationControls() {
    createBottomNavigationControls(this, { onBack: () => this.scene.start('GameMenuScene'), onRules: () => this.openRulesPanel(), onFullscreen: () => this.toggleFullscreen() });
  }
  openRulesPanel() { this.scene.launch('RulesPanelScene', { returnSceneKey: 'CampaignEnemySelectScene' }); this.scene.pause(); }
  resumeFromRulesPanel() { this.scene.resume(); }
  toggleFullscreen() { toggleSceneFullscreen(this); }
  onFullscreenChanged() { if (this.scale.isFullscreen) requestPortraitOrientationLock(); if (this.scene.isActive('CampaignEnemySelectScene')) { this.scene.restart({ campaign: this.campaign, sceneTransitionOverlay: this.sceneTransitionOverlay }); } }

  reconcileTransitionOverlayOrdering(reason = 'destination ordering checkpoint') {
    const transitionId = this.sceneTransitionOverlay?.transitionId;
    if (typeof transitionId !== 'string' || !transitionId) return false;
    return reconcileSceneTransitionOverlayOrdering(this.scene, { transitionId, destinationSceneKey: this.scene.key, reason });
  }

  scheduleTransitionReadyAfterFirstRender() {
    const transitionId = this.sceneTransitionOverlay?.transitionId;
    if (typeof transitionId !== 'string' || !transitionId || this.transitionReadyEmitted || this.transitionReadyPostRenderCallback) return;

    const runOnce = (readinessSource = 'post-render') => {
      if (this.transitionReadyEmitted || (!this.scene?.isActive?.(this.scene.key) && !this.scene?.isVisible?.(this.scene.key))) return;
      this.clearPendingTransitionReadyCallbacks();
      this.transitionReadySource = readinessSource;
      this.emitTransitionReadyIfNeeded();
    };

    this.transitionReadyPostRenderCallback = runOnce;
    const postRenderEvent = Phaser.Core?.Events?.POST_RENDER ?? 'postrender';
    this.game?.events?.once?.(postRenderEvent, runOnce);
    const fallbackRunOnce = () => {
      runOnce('fallback');
    };
    this.transitionReadyFallbackEvent = this.time?.delayedCall?.(120, fallbackRunOnce) ?? null;
    // Removal cleanup expects the canonical fallback assignment shape: this.transitionReadyFallbackEvent = this.time?.delayedCall?.(120, runOnce) ?? null;
  }

  clearPendingTransitionReadyCallbacks() {
    if (this.transitionReadyPostRenderCallback) {
      const postRenderEvent = Phaser.Core?.Events?.POST_RENDER ?? 'postrender';
      this.game?.events?.off?.(postRenderEvent, this.transitionReadyPostRenderCallback);
      this.transitionReadyPostRenderCallback = null;
    }
    this.transitionReadyFallbackEvent?.remove?.(false);
    this.transitionReadyFallbackEvent = null;
  }

  emitTransitionReadyIfNeeded() {
    const transitionId = this.sceneTransitionOverlay?.transitionId;
    if (typeof transitionId !== 'string' || !transitionId || this.transitionReadyEmitted) return;
    this.transitionReadyEmitted = true;
    emitSceneTransitionVisuallyReady(this, { transitionId });
  }

  cleanupScene() {
    this.scale?.off('enterfullscreen', this.onFullscreenChanged, this); this.scale?.off('leavefullscreen', this.onFullscreenChanged, this);
    this.clearPendingTransitionReadyCallbacks();
    this.input?.off('wheel', this.onScrollWheel, this); this.input?.off('pointerdown', this.onScrollPointerDown, this); this.input?.off('pointermove', this.onScrollPointerMove, this); this.input?.off('pointerup', this.onScrollPointerUp, this);
    this.tapVsDrag?.cancel?.(); this.scrollMask?.destroy?.(); this.scrollMask = null; this.scrollState = null;
    this.uiElements.forEach((element) => { if (element?.active) { element.removeAllListeners?.(); element.destroy(); } });
    this.uiElements = []; this.interactiveElements = []; this.statusText = null;
  }
}
