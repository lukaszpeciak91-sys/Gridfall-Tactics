import Phaser from 'phaser';
import { createBuildMarker } from '../ui/buildMarker.js';
import { createMenuScreenHeader } from '../ui/screenHeader.js';
import { createBottomNavigationControls, requestPortraitOrientationLock, toggleSceneFullscreen } from '../ui/navigationControls.js';
import { translateActive } from '../localization/localeService.js';
import { applyAudioSettings, loadSettings } from '../systems/settingsState.js';
import { AUDIO_KEYS, preloadAudioAssets } from '../audio/audioAssets.js';
import { playSfx } from '../audio/audioPlayback.js';
import { playMenuMusic } from '../audio/menuMusic.js';
import { isValidCampaignState, loadCampaign, saveCampaign, selectCampaignEnemy } from '../systems/campaignState.js';
import { getCampaignEnemyViewModels } from '../systems/campaignEnemySelection.js';
import { MENU_BACKGROUND_FALLBACK_COLOR, MENU_BACKGROUND_FALLBACK_COLOR_HEX, createAnimatedMenuBackground, preloadMenuBackgroundArt } from '../rendering/backgroundArt.js';
import { drawFactionCardVisual, preloadFactionPreviewArt } from '../ui/factionCards.js';
import { createTapVsDragInteraction } from '../ui/tapVsDragInteraction.js';
import { enterBattleScene } from './battleEntryRouter.js';

const CARD_HEIGHT = 196;
const CARD_GAP = 34;
const VIEWPORT_TOP_MIN = 118;
const HEADER_GAP = 22;
const ATTEMPT_INDICATOR_RIGHT_MARGIN = 14;
const ATTEMPT_INDICATOR_BOTTOM_MARGIN = 19;
const ACTIVE_ATTEMPT_INDICATOR_BOTTOM_MARGIN = 55;
const ATTEMPT_INDICATOR_WIDTH = 58;
const ATTEMPT_INDICATOR_HEIGHT = 28;
const ATTEMPT_INDICATOR_PADDING_X = 12;
const ATTEMPT_INDICATOR_PADDING_Y = 7;
// TEMP MOBILE TEST HOOK:
// Remove before public/release build. Intentionally visible in main/mobile builds for campaign completion screen QA.
const TEMP_MOBILE_END_SCENE_PREVIEW_ENABLED = true;


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
  }

  preload() {
    preloadMenuBackgroundArt(this);
    preloadFactionPreviewArt(this);
    preloadAudioAssets(this);
  }

  init(data = {}) {
    this.cleanupScene();
    this.campaign = isValidCampaignState(data?.campaign) ? data.campaign : loadCampaign();
  }

  create() {
    this.cleanupScene();
    if (!isValidCampaignState(this.campaign) || this.campaign.status !== 'active') {
      this.scene.start('GameMenuScene');
      return;
    }

    const { width, height } = this.scale;
    applyAudioSettings(this, loadSettings());
    playMenuMusic(this);
    this.cameras.main.setBackgroundColor(MENU_BACKGROUND_FALLBACK_COLOR_HEX);
    this.menuBackground = createAnimatedMenuBackground(this, { fallbackColor: MENU_BACKGROUND_FALLBACK_COLOR, width, height, lightSweepOptions: { opacity: 0.075, y: height * 0.24 } });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
    this.scale.on('enterfullscreen', this.onFullscreenChanged, this);
    this.scale.on('leavefullscreen', this.onFullscreenChanged, this);

    const header = createMenuScreenHeader(this, { title: translateActive('ui.campaignEnemySelect.title', 'SELECT ENEMY'), width, height });
    this.uiElements.push(...header.items);
    this.uiElements.push(createBuildMarker(this, { width, height }));
    this.drawNavigationControls();
    this.drawEnemyCards({ width, height, headerBottomY: header.bottomY });
    // TEMP MOBILE TEST HOOK:
    // Remove before public/release build. Do not hide behind the Vite DEV flag while phone/main testing needs direct access.
    if (TEMP_MOBILE_END_SCENE_PREVIEW_ENABLED) this.drawEndScenePreviewControl({ width, height });
  }

  drawEnemyCards({ width, height, headerBottomY }) {
    const enemies = getCampaignEnemyViewModels(this.campaign);
    const cardWidth = Math.min(width - 24, 382);
    const viewportTop = Math.max(VIEWPORT_TOP_MIN, Math.ceil(headerBottomY + HEADER_GAP));
    const viewportBottom = Math.max(viewportTop + CARD_HEIGHT, height - (TEMP_MOBILE_END_SCENE_PREVIEW_ENABLED ? 168 : 88));
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
    const indicatorPanelWidth = ATTEMPT_INDICATOR_WIDTH + ATTEMPT_INDICATOR_PADDING_X * 2;
    const indicatorPanelHeight = ATTEMPT_INDICATOR_HEIGHT + ATTEMPT_INDICATOR_PADDING_Y * 2;
    const indicatorX = cardWidth / 2 - ATTEMPT_INDICATOR_RIGHT_MARGIN - indicatorPanelWidth / 2;
    const indicatorBottomMargin = enemy.defeated ? ATTEMPT_INDICATOR_BOTTOM_MARGIN : ACTIVE_ATTEMPT_INDICATOR_BOTTOM_MARGIN;
    const indicatorY = y + CARD_HEIGHT - indicatorBottomMargin - indicatorPanelHeight / 2;
    const indicator = this.add.text(indicatorX, indicatorY, enemy.indicator, { fontFamily: 'Arial, sans-serif', fontSize: enemy.defeated ? '25px' : '21px', color: enemy.defeated ? '#86efac' : '#fde68a', stroke: '#020617', strokeThickness: 3, align: 'center', fixedWidth: ATTEMPT_INDICATOR_WIDTH }).setOrigin(0.5);
    const indicatorBadge = this.add.graphics();
    indicatorBadge.fillStyle(0x020617, enemy.defeated ? 0.58 : 0.66);
    indicatorBadge.fillRoundedRect(
      indicatorX - indicatorPanelWidth / 2,
      indicatorY - indicatorPanelHeight / 2,
      indicatorPanelWidth,
      indicatorPanelHeight,
      12,
    );
    indicatorBadge.lineStyle(1, enemy.defeated ? 0x86efac : 0xfde68a, enemy.defeated ? 0.38 : 0.48);
    indicatorBadge.strokeRoundedRect(
      indicatorX - indicatorPanelWidth / 2 + 0.5,
      indicatorY - indicatorPanelHeight / 2 + 0.5,
      indicatorPanelWidth - 1,
      indicatorPanelHeight - 1,
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

  drawEndScenePreviewControl({ width, height }) {
    const cardWidth = Math.min(width - 44, 286);
    const cardHeight = 58;
    const x = width / 2;
    const y = height - 126;
    const panel = this.add.graphics().setDepth(22);
    panel.fillStyle(0x0f172a, 0.88);
    panel.fillRoundedRect(x - cardWidth / 2, y - cardHeight / 2, cardWidth, cardHeight, 14);
    panel.lineStyle(1, 0xf59e0b, 0.72);
    panel.strokeRoundedRect(x - cardWidth / 2 + 0.5, y - cardHeight / 2 + 0.5, cardWidth - 1, cardHeight - 1, 13);
    const label = this.add.text(x, y - 6, 'END SCENES', { fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#fde68a', fontStyle: '700', align: 'center', letterSpacing: 1.4 }).setOrigin(0.5).setDepth(23);
    const tag = this.add.text(x, y + 15, 'DEV PREVIEW ONLY', { fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#fbbf24', align: 'center' }).setOrigin(0.5).setDepth(23).setAlpha(0.9);
    const button = this.add.zone(x, y, cardWidth, cardHeight).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(24);
    button.on('pointerup', () => this.openEndScenePreviewChoice());
    this.uiElements.push(panel, label, tag, button);
    this.interactiveElements.push(button);
  }

  openEndScenePreviewChoice() {
    const { width, height } = this.scale;
    const choiceItems = [];
    const closeChoice = () => {
      choiceItems.forEach((item) => {
        item?.removeAllListeners?.();
        item?.destroy?.();
      });
    };
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.58).setInteractive().setDepth(70);
    const panelWidth = Math.min(width - 36, 340);
    const panelHeight = 214;
    const panelX = width / 2;
    const panelY = height / 2;
    const panel = this.add.graphics().setDepth(71);
    panel.fillStyle(0x0f172a, 0.96);
    panel.fillRoundedRect(panelX - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 18);
    panel.lineStyle(2, 0xf59e0b, 0.7);
    panel.strokeRoundedRect(panelX - panelWidth / 2 + 1, panelY - panelHeight / 2 + 1, panelWidth - 2, panelHeight - 2, 17);
    const title = this.add.text(panelX, panelY - 72, 'END SCENES', { fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#fde68a', fontStyle: '700', align: 'center' }).setOrigin(0.5).setDepth(72);
    const makeChoice = (x, y, text, status, color) => {
      const rect = this.add.rectangle(x, y, 126, 54, color, 0.28).setStrokeStyle(1, color, 0.82).setInteractive({ useHandCursor: true }).setDepth(72);
      const label = this.add.text(x, y, text, { fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#f8fafc', fontStyle: '700', align: 'center' }).setOrigin(0.5).setDepth(73);
      rect.on('pointerup', () => this.startCampaignCompletionPreview(status));
      choiceItems.push(rect, label);
      this.uiElements.push(rect, label);
      this.interactiveElements.push(rect);
    };
    makeChoice(panelX - 72, panelY + 4, 'VICTORY', 'won', 0x22c55e);
    makeChoice(panelX + 72, panelY + 4, 'DEFEAT', 'lost', 0xef4444);
    const cancel = this.add.rectangle(panelX, panelY + 72, 150, 42, 0x334155, 0.34).setStrokeStyle(1, 0x94a3b8, 0.72).setInteractive({ useHandCursor: true }).setDepth(72);
    const cancelLabel = this.add.text(panelX, panelY + 72, 'CANCEL', { fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#e2e8f0', fontStyle: '700', align: 'center' }).setOrigin(0.5).setDepth(73);
    cancel.on('pointerup', closeChoice);
    overlay.on('pointerup', closeChoice);
    choiceItems.push(overlay, panel, title, cancel, cancelLabel);
    this.uiElements.push(overlay, panel, title, cancel, cancelLabel);
    this.interactiveElements.push(cancel);
  }

  startCampaignCompletionPreview(status) {
    // Menu music intentionally continues through BattleTransitionScene until visual handoff.
    enterBattleScene(this, {
      factionKey: this.campaign.playerFactionKey,
      enemyFactionKey: Object.keys(this.campaign.enemies)[0],
      battleContext: {
        mode: 'campaignCompletionPreview',
        previewStatus: status,
      },
    });
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
  onFullscreenChanged() { if (this.scale.isFullscreen) requestPortraitOrientationLock(); if (this.scene.isActive('CampaignEnemySelectScene')) this.scene.restart({ campaign: this.campaign }); }
  cleanupScene() {
    this.scale?.off('enterfullscreen', this.onFullscreenChanged, this); this.scale?.off('leavefullscreen', this.onFullscreenChanged, this);
    this.input?.off('wheel', this.onScrollWheel, this); this.input?.off('pointerdown', this.onScrollPointerDown, this); this.input?.off('pointermove', this.onScrollPointerMove, this); this.input?.off('pointerup', this.onScrollPointerUp, this);
    this.tapVsDrag?.cancel?.(); this.scrollMask?.destroy?.(); this.scrollMask = null; this.scrollState = null;
    this.uiElements.forEach((element) => { if (element?.active) { element.removeAllListeners?.(); element.destroy(); } });
    this.uiElements = []; this.interactiveElements = []; this.statusText = null;
  }
}
