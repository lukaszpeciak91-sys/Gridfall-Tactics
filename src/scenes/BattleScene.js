import Phaser from 'phaser';
import { getFactionByKey, getFactionKeys } from '../data/factions/index.js';
import { createInitialBattleState, drawCards, shuffleDeck, canPass, canPlayOrRedeploy, playEffectCard, playOrRedeployUnit, performSwap, resolveCombat, resolveTargetedEffectCard, resolveTargetedUnitOnPlayEffect, getUnitAttack, getUnitArmor, toggleFirstActor, resolveTurnCapWinner, resolveImmediateNoProgressWinner, recordPassAction, performOpeningMulligan, STARTING_HAND_SIZE, MAX_OPENING_MULLIGAN_CARDS } from '../systems/GameState.js';
import { chooseEnemyAction, recordBattleActionUse, selectOpeningMulliganCardIds } from '../systems/enemyDecision.js';
import { getTargetingStateForEffect } from '../systems/cardTargeting.js';
import { getCombatEventAttackerIndex, getCombatEventTargetIndex, getLaneLethalTargetIndexes, getLaneSimultaneousUnitClash, shouldAnimateCombatAttacker } from '../systems/combatAnimation.js';
import { BATTLE_BACKGROUND_FALLBACK_COLOR, BATTLE_BACKGROUND_FALLBACK_COLOR_HEX, createCoverBackground, getBattleBackgroundAsset, preloadBattleBackgroundArt } from '../rendering/backgroundArt.js';
import { calculateHandLayoutMetrics } from '../ui/handLayout.js';
import { createFloatingControl, createMuteToggleControl, requestPortraitOrientationLock, toggleSceneFullscreen } from '../ui/navigationControls.js';
import { createModalBackButton } from '../ui/modalControls.js';
import { preloadSecondaryButtonAsset } from '../ui/imageButton.js';
import { formatDeckSummaryEntry } from '../rendering/cardRenderModes.js';
import { CARD_COLORS, createCardPreviewView, createStatBadges, getDefaultCardAccentColor } from '../rendering/cardVisualLayout.js';
import { getCardDisplayName, getCardTextShort } from '../localization/cardDisplay.js';
import { getActiveLocale, translateActive } from '../localization/localeService.js';

const INSPECT_CARD_TARGET_SCALE = 2.06;
const INSPECT_CARD_VERTICAL_COMPACT_RATIO = 0.96;
const INSPECT_CARD_MAX_HEIGHT_RATIO = 0.58;
const INSPECT_CARD_MAX_WIDTH_RATIO = 0.78;
const INSPECT_CARD_PLAYER_ROW_GAP_RATIO = 0.2;
const INSPECT_CARD_PLAYER_ROW_BOTTOM_LIMIT_RATIO = 2.78;
const INSPECT_CARD_ACTION_BOTTOM_LIMIT_RATIO = 0.28;
const INSPECT_CARD_OVERLAY_ALPHA = 0.2;
const BATTLE_FRAME_OVERLAY_COLOR = 0x05080f;
const BATTLE_FRAME_OVERLAY_ALPHA = 0.26;
const BOARD_SLOT_FILL_ALPHA = 0.22;
const BOARD_SLOT_STROKE_ALPHA = 0.36;
const BOARD_GUIDE_SLOT_FILL_ALPHA = 0.08;
const BOARD_GUIDE_SLOT_STROKE_ALPHA = 0.18;
const BOARD_TARGET_STROKE_ALPHA = 0.9;
const BOARD_LANE_HIGHLIGHT_STROKE_ALPHA = 0.72;
const BOARD_GUIDE_LANE_HIGHLIGHT_STROKE_ALPHA = 0.52;
const BOARD_FEEDBACK_STROKE_ALPHA = 0.88;
const HERO_PANEL_FILL_ALPHA = 0.38;
const HERO_PANEL_ACTIVE_FILL_ALPHA = 0.54;
const HERO_PANEL_STROKE_ALPHA = 0.5;
const HERO_PANEL_ACTIVE_STROKE_ALPHA = 0.82;
const HERO_PANEL_HIT_FILL_ALPHA = 0.52;
const HERO_PANEL_HIT_STROKE_ALPHA = 0.86;
const BATTLEFIELD_CENTER_LIGHT_TEXTURE_KEY = 'effect.battlefield-center-light.readability-grade';
const BATTLEFIELD_CENTER_LIGHT_TEXTURE_SIZE = 512;
const BATTLEFIELD_CENTER_LIGHT_DEPTH = -875;
const BATTLEFIELD_CENTER_LIGHT_ALPHA = 0.14;
const INSPECT_CARD_OVERLAY_DEPTH = 840;
const INSPECT_CARD_DEPTH = 850;
const INSPECT_CARD_TWEEN_IN_MS = 150;
const INSPECT_CARD_TWEEN_OUT_MS = 95;
const HAND_CARD_STAT_BADGE_SCALE = 1.1;
const HAND_CARD_TYPOGRAPHY_SCALE = 1.12;
const HAND_CARD_TITLE_TYPOGRAPHY_SCALE = 1.2;
const HAND_CARD_BODY_LINE_SPACING = 3;
const HAND_CARD_SELECTED_DEPTH = 760;
const HAND_CARD_SELECTED_LIFT_PX = 14;
const HAND_CARD_DIM_ALPHA = 0.62;
const HAND_CARD_SELECTED_ALPHA = 1;
const INSPECT_CARD_STAT_BADGE_SCALE = 1.28;
const INSPECT_CARD_TYPOGRAPHY_SCALE = 1.1;
const INSPECT_CARD_BODY_LINE_SPACING = 5;
const HAND_CARD_INSPECT_DIM_ALPHA = 0.55;
const HAND_CARD_LONG_PRESS_MS = 425;
const ENEMY_ACTION_NOTIFICATION_FADE_IN_MS = 110;
const ENEMY_ACTION_NOTIFICATION_HOLD_MS = 650;
const ENEMY_ACTION_NOTIFICATION_FADE_OUT_MS = 140;
const ENEMY_ACTION_APPLY_DELAY_MS = 500;
const ENEMY_EFFECT_ACTION_APPLY_DELAY_MS = 750;
const ENEMY_EFFECT_ACTION_BANNER_HOLD_MS = 1020;
const ENEMY_ACTION_PRE_COMBAT_DELAY_MS = 400;
const PLAYER_EFFECT_CONFIRMATION_FADE_IN_MS = 90;
const PLAYER_EFFECT_CONFIRMATION_HOLD_MS = 520;
const PLAYER_EFFECT_CONFIRMATION_FADE_OUT_MS = 120;
const PLAYER_EFFECT_CAST_BEAT_MS = 620;
const PLAYER_EFFECT_CAST_SWEEP_STEP_MS = 70;
const ENEMY_ACTION_PACING = Object.freeze({
  pass: {
    applyDelayMs: Math.round(ENEMY_ACTION_APPLY_DELAY_MS * 0.65),
    bannerHoldMs: Math.round(ENEMY_ACTION_NOTIFICATION_HOLD_MS * 0.7),
    postActionDelayMs: 120,
    preCombatDelayMs: Math.round(ENEMY_ACTION_PRE_COMBAT_DELAY_MS * 0.75),
  },
  unit: {
    applyDelayMs: ENEMY_ACTION_APPLY_DELAY_MS,
    bannerHoldMs: ENEMY_ACTION_NOTIFICATION_HOLD_MS,
    postActionDelayMs: 180,
    preCombatDelayMs: ENEMY_ACTION_PRE_COMBAT_DELAY_MS,
  },
  effect: {
    applyDelayMs: ENEMY_EFFECT_ACTION_APPLY_DELAY_MS,
    bannerHoldMs: ENEMY_EFFECT_ACTION_BANNER_HOLD_MS,
    postActionDelayMs: 220,
    preCombatDelayMs: ENEMY_ACTION_PRE_COMBAT_DELAY_MS,
  },
  reposition: {
    applyDelayMs: Math.round(ENEMY_ACTION_APPLY_DELAY_MS * 0.85),
    bannerHoldMs: ENEMY_ACTION_NOTIFICATION_HOLD_MS,
    postActionDelayMs: 160,
    preCombatDelayMs: ENEMY_ACTION_PRE_COMBAT_DELAY_MS,
  },
});
const ENEMY_EFFECT_SUMMARY_MAX_CHARS = 34;
const ENEMY_EFFECT_SUMMARY_OVERRIDES = Object.freeze({
  aggro_buff_all_atk_2: 'All allies +2 ATK',
  swap_adjacent_then_resolve: 'Swap ally, fight line',
  ignore_armor_next_attack: 'Damage and pierce armor',
  quick_strike: 'Resolve line combat now',
  heal_1_atk_1_draw_on_kill_this_turn: 'Heal, +1 ATK, draw on kill',
  swap_any_two_units: 'Swap two units',
  swap_adjacent_enemy_units: 'Swap adjacent enemies',
  enemy_all_atk_minus_1: 'Leftmost enemies -1 ATK',
  enemy_up_to_2_atk_minus_1: 'Chosen enemies -1 ATK',
  damage_all_enemies_1_ignore_armor: 'Damage all enemies',
  control_enemy_unit_this_turn: 'Enemy hits own hero',
  damage_up_to_2_enemies_1: 'Damage leftmost enemies',
  control_enemy_unit_this_turn: 'Enemy attacks own hero, takes 1',
  return_friendly_draw_1: 'Return ally, draw 1',
  buff_all_armor_1: 'All allies +1 ARM',
  immune_move_disable_this_turn: 'Block move effects',
  heal_all_1: 'Heal all allies 1',
  cannot_drop_below_1_this_turn: 'Allies survive at 1 HP',
  temp_armor_1: 'Target ally +1 ARM',
  summon_grunt_empty_slot: 'Summon a Grunt',
  buff_all_atk_1: 'All allies +1 ATK',
  revive_friendly_1hp: 'Revive a unit at 1 HP',
  fill_empty_slots_0_1: 'Fill slots with Tokens',
  destroy_friendly_draw_1: 'Destroy ally, draw 1',
});

export default class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
    this.selectedCardId = null;
    this.cardViews = [];
    this.boardCells = [];
    this.pendingSwapIndex = null;
    this.playerActionUsed = false;
    this.enemyActionUsed = false;
    this.targetingState = null;
    this.effectCastState = null;
    this.isEffectCastResolving = false;
    this.targetingInstructionText = null;
    this.openingMulliganPending = false;
    this.selectedMulliganCardIds = [];
    this.previewedMulliganCardId = null;
    this.actionButton = null;
    this.deckCounterView = null;
    this.deckInfoPanel = null;
    this.bottomControlViews = [];
    this.utilityMenuPanel = null;
    this.isFlowResolving = false;
    this.enemyActionBanner = null;
    this.enemyActionBannerFadeOutEvent = null;
    this.playerActionBanner = null;
    this.playerActionBannerFadeOutEvent = null;
    this.battleResultModal = null;
    this.battleResultModalShown = false;
    this.battleResultModalPending = false;
    this.backgroundArtAsset = null;
    this.backgroundLayer = null;
    this.battlefieldCenterLight = null;
    this.selectedHandCardZoom = null;
    this.hoverInspectCardId = null;
    this.boardInspectIndex = null;
    this.pressedHandCardId = null;
    this.handCardLongPressEvent = null;
    this.longPressTriggeredCardId = null;
  }

  preload() {
    preloadBattleBackgroundArt(this);
    preloadSecondaryButtonAsset(this);
  }

  init() {
    this.cleanupSceneObjects();
    this.resetRuntimeState();
  }

  resetRuntimeState() {
    this.selectedCardId = null;
    this.cardViews = [];
    this.boardCells = [];
    this.pendingSwapIndex = null;
    this.playerActionUsed = false;
    this.enemyActionUsed = false;
    this.targetingState = null;
    this.effectCastState = null;
    this.isEffectCastResolving = false;
    this.targetingInstructionText = null;
    this.openingMulliganPending = false;
    this.selectedMulliganCardIds = [];
    this.previewedMulliganCardId = null;
    this.actionButton = null;
    this.deckCounterView = null;
    this.deckInfoPanel = null;
    this.bottomControlViews = [];
    this.utilityMenuPanel = null;
    this.isFlowResolving = false;
    this.enemyActionBanner = null;
    this.enemyActionBannerFadeOutEvent = null;
    this.playerActionBanner = null;
    this.playerActionBannerFadeOutEvent = null;
    this.battleResultModal = null;
    this.battleResultModalShown = false;
    this.battleResultModalPending = false;
    this.gameState = null;
    this.factionKey = null;
    this.layout = null;
    this.battleFrame = null;
    this.enemyHpText = null;
    this.playerHpText = null;
    this.enemyHeroPanel = null;
    this.playerHeroPanel = null;
    this.enemyInitiativeIcon = null;
    this.playerInitiativeIcon = null;
    this.enemyActionSlotBadge = null;
    this.playerActionSlotBadge = null;
    this.lastCombatEvents = [];
    this.enemyFactionKey = null;
    this.backgroundArtAsset = null;
    this.backgroundLayer = null;
    this.battlefieldCenterLight = null;
    this.selectedHandCardZoom = null;
    this.hoverInspectCardId = null;
    this.boardInspectIndex = null;
    this.pressedHandCardId = null;
    this.handCardLongPressEvent = null;
    this.longPressTriggeredCardId = null;
  }

  cleanupSceneObjects({ preserveTimers = false, preserveTweens = false } = {}) {
    this.destroyEnemyActionBanner();
    this.destroyPlayerActionBanner();
    this.destroyTargetingInstruction();
    this.destroyBattleResultModal();
    this.destroyUtilityMenuPanel();
    this.destroyDeckInfoPanel();
    this.destroyDeckCounterView();
    this.destroySelectedHandCardZoom();
    this.cancelHandCardLongPress();
    if (!preserveTweens) {
      this.tweens?.killAll?.();
    }
    if (!preserveTimers) {
      this.time?.removeAllEvents?.();
    }

    if (this.children) {
      this.children.each((child) => {
        child?.removeAllListeners?.();
      });
      this.children.removeAll(true);
    }
  }

  create(data) {
    this.cleanupSceneObjects();

    const { width, height } = this.scale;
    const playerFactionKey = typeof data?.factionKey === 'string' && data.factionKey ? data.factionKey : 'Aggro';
    this.factionKey = playerFactionKey;
    const requestedEnemyFactionKey = typeof data?.enemyFactionKey === 'string' && data.enemyFactionKey ? data.enemyFactionKey : null;
    const enemyFactionKey = requestedEnemyFactionKey ?? this.selectEnemyFactionKey(playerFactionKey);
    this.enemyFactionKey = enemyFactionKey;

    const playerFactionData = getFactionByKey(playerFactionKey) ?? { name: `Unknown (${playerFactionKey})`, deck: [] };
    const enemyFactionData = getFactionByKey(enemyFactionKey) ?? { name: `Unknown (${enemyFactionKey})`, deck: [] };

    this.gameState = createInitialBattleState(playerFactionData, enemyFactionData);
    this.gameState.player.factionKey = playerFactionKey;
    this.gameState.enemy.factionKey = enemyFactionKey;
    shuffleDeck(this.gameState.player.deck);
    shuffleDeck(this.gameState.enemy.deck);
    drawCards(this.gameState.player, STARTING_HAND_SIZE);
    drawCards(this.gameState.enemy, STARTING_HAND_SIZE);
    this.applyEnemyOpeningMulligan();
    this.openingMulliganPending = true;

    this.cameras.main.setBackgroundColor(BATTLE_BACKGROUND_FALLBACK_COLOR_HEX);
    this.layout = this.getLayoutMetrics(width, height);
    this.backgroundArtAsset = getBattleBackgroundAsset({ playerFactionKey, enemyFactionKey });

    this.drawBattleBackground();
    this.drawBattleFrame();
    this.drawBattlefieldCenterLight();
    this.drawBoard();
    this.drawHeroPanels();
    this.refreshHeroHP();
    this.drawActionZone();
    this.drawDeckCounter();
    this.drawHand();
    this.drawActionRowUtilityMenuTrigger();
    this.updateActionButtonLabel();

    this.scale.on('enterfullscreen', this.onFullscreenChanged, this);
    this.scale.on('leavefullscreen', this.onFullscreenChanged, this);
    this.scale.on('resize', this.onViewportChanged, this);
    this.input.on('pointerup', this.onScenePointerUp, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

  }

  selectEnemyFactionKey(playerFactionKey) {
    const factionKeys = getFactionKeys();
    if (factionKeys.length === 0) {
      return playerFactionKey;
    }

    const enemyOptions = factionKeys.length > 1
      ? factionKeys.filter((key) => key !== playerFactionKey)
      : factionKeys;

    if (enemyOptions.length === 0) {
      return playerFactionKey;
    }

    const randomIndex = Phaser.Math.Between(0, enemyOptions.length - 1);
    return enemyOptions[randomIndex];
  }

  getLayoutMetrics(width, height) {
    const margin = Math.max(8, Math.round(width * 0.025));
    const contentWidth = width - margin * 2;

    const sectionRatios = {
      topHero: 0.06,
      board: 0.54,
      playerHero: 0.06,
      action: 0.05,
      hand: 0.265,
    };
    const gapRatio = 0.008;
    const topBottomPadRatio = 0.008;
    const sectionCount = Object.keys(sectionRatios).length;
    const totalGapHeight = height * gapRatio * (sectionCount - 1);
    const totalPadHeight = height * topBottomPadRatio * 2;
    const usableHeight = Math.max(0, height - totalGapHeight - totalPadHeight);
    const totalSectionRatio = Object.values(sectionRatios).reduce((sum, ratio) => sum + ratio, 0);

    const topHeroHeight = usableHeight * (sectionRatios.topHero / totalSectionRatio);
    const boardHeight = usableHeight * (sectionRatios.board / totalSectionRatio);
    const playerHeroHeight = usableHeight * (sectionRatios.playerHero / totalSectionRatio);
    const actionHeight = usableHeight * (sectionRatios.action / totalSectionRatio);
    const handHeight = usableHeight * (sectionRatios.hand / totalSectionRatio);

    const gapHeight = height * gapRatio;
    const topBottomPad = height * topBottomPadRatio;

    let cursorY = topBottomPad;
    const topHeroY = cursorY;
    cursorY += topHeroHeight + gapHeight;
    const boardY = cursorY;
    cursorY += boardHeight + gapHeight;
    const playerHeroY = cursorY;
    cursorY += playerHeroHeight + gapHeight;
    const actionY = cursorY;
    cursorY += actionHeight + gapHeight;
    const handY = cursorY;

    const boardWidth = Math.min(contentWidth * 0.985, contentWidth);
    const slotWidth = boardWidth / 3;
    const slotHeight = slotWidth * 1.34;
    const boardScale = Math.min(1, boardHeight / (slotHeight * 3));
    const cellWidth = slotWidth * boardScale;
    const cellHeight = slotHeight * boardScale;

    const handLayout = calculateHandLayoutMetrics({
      contentWidth,
      margin,
      handY,
      handHeight,
      viewportHeight: height,
      maxHandSize: this.gameState.player.maxHandSize,
    });

    return {
      width,
      height,
      margin,
      contentWidth,
      topHero: { y: topHeroY, h: topHeroHeight, centerY: topHeroY + topHeroHeight / 2 },
      board: { y: boardY, h: boardHeight, centerY: boardY + boardHeight / 2, cellWidth, cellHeight, width: cellWidth * 3, height: cellHeight * 3 },
      playerHero: { y: playerHeroY, h: playerHeroHeight, centerY: playerHeroY + playerHeroHeight / 2 },
      action: { y: actionY, h: actionHeight, centerY: actionY + actionHeight / 2 },
      hand: handLayout,
    };
  }

  drawBattleBackground() {
    const { width, height } = this.layout;

    this.backgroundLayer = createCoverBackground(this, {
      asset: this.backgroundArtAsset,
      fallbackColor: BATTLE_BACKGROUND_FALLBACK_COLOR,
      depth: -1000,
      width,
      height,
    });
  }

  drawBattleFrame() {
    const { width, height } = this.layout;
    this.battleFrame = this.add.rectangle(width * 0.5, height * 0.5, width, height, BATTLE_FRAME_OVERLAY_COLOR, BATTLE_FRAME_OVERLAY_ALPHA);
    this.battleFrame.setDepth(-900);
  }

  drawBattlefieldCenterLight() {
    const { width, height, board } = this.layout;
    this.ensureBattlefieldCenterLightTexture();

    const light = this.add.image(width * 0.5, board.centerY, BATTLEFIELD_CENTER_LIGHT_TEXTURE_KEY)
      .setOrigin(0.5)
      .setDepth(BATTLEFIELD_CENTER_LIGHT_DEPTH)
      .setAlpha(BATTLEFIELD_CENTER_LIGHT_ALPHA);

    const displayWidth = Math.min(width * 1.18, Math.max(board.width * 1.38, width * 0.74));
    const displayHeight = Math.min(height * 0.72, Math.max(board.height * 1.24, height * 0.44));
    light.setDisplaySize(displayWidth, displayHeight);

    if (light.setBlendMode) {
      light.setBlendMode(Phaser.BlendModes.ADD);
    }

    this.battlefieldCenterLight = light;
  }

  ensureBattlefieldCenterLightTexture() {
    if (this.textures.exists(BATTLEFIELD_CENTER_LIGHT_TEXTURE_KEY)) {
      return;
    }

    const texture = this.textures.createCanvas(
      BATTLEFIELD_CENTER_LIGHT_TEXTURE_KEY,
      BATTLEFIELD_CENTER_LIGHT_TEXTURE_SIZE,
      BATTLEFIELD_CENTER_LIGHT_TEXTURE_SIZE,
    );
    const canvas = texture.getSourceImage();
    const context = canvas.getContext('2d');
    const size = BATTLEFIELD_CENTER_LIGHT_TEXTURE_SIZE;
    const center = size * 0.5;

    context.clearRect(0, 0, size, size);

    const centerLane = context.createRadialGradient(center, center, size * 0.06, center, center, size * 0.52);
    centerLane.addColorStop(0, 'rgba(230,238,255,1)');
    centerLane.addColorStop(0.28, 'rgba(190,212,255,0.72)');
    centerLane.addColorStop(0.58, 'rgba(120,154,220,0.26)');
    centerLane.addColorStop(1, 'rgba(120,154,220,0)');

    context.fillStyle = centerLane;
    context.fillRect(0, 0, size, size);

    context.globalCompositeOperation = 'destination-in';
    const verticalFeather = context.createLinearGradient(0, 0, 0, size);
    verticalFeather.addColorStop(0, 'rgba(255,255,255,0)');
    verticalFeather.addColorStop(0.18, 'rgba(255,255,255,0.2)');
    verticalFeather.addColorStop(0.44, 'rgba(255,255,255,0.95)');
    verticalFeather.addColorStop(0.56, 'rgba(255,255,255,0.95)');
    verticalFeather.addColorStop(0.82, 'rgba(255,255,255,0.2)');
    verticalFeather.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = verticalFeather;
    context.fillRect(0, 0, size, size);
    context.globalCompositeOperation = 'source-over';

    texture.refresh();
  }

  getActionRowUtilityMenuMetrics() {
    const { width, action, margin } = this.layout;
    const actionButtonWidth = width * 0.46;
    const actionButtonLeft = width * 0.5 - actionButtonWidth / 2;
    const touchSize = Math.min(Math.max(34, action.h * 0.8), 46);
    const gap = Math.max(12, margin);

    return {
      x: Phaser.Math.Clamp(
        actionButtonLeft - gap - touchSize / 2,
        margin + touchSize / 2,
        width - margin - touchSize / 2,
      ),
      y: action.centerY,
      touchSize,
    };
  }

  drawActionRowUtilityMenuTrigger() {
    const { x, y, touchSize } = this.getActionRowUtilityMenuMetrics();
    const menu = createFloatingControl(
      this,
      x,
      y,
      touchSize,
      '☰',
      () => this.toggleUtilityMenuPanel(),
      { fontScale: 0.5 },
    );

    this.bottomControlViews = [menu];
  }

  toggleUtilityMenuPanel() {
    if (this.utilityMenuPanel) {
      this.destroyUtilityMenuPanel();
      return;
    }

    this.showUtilityMenuPanel();
  }

  showUtilityMenuPanel() {
    this.destroyUtilityMenuPanel();

    const { width, height, margin } = this.layout;
    const { x: triggerX, y: triggerY, touchSize } = this.getActionRowUtilityMenuMetrics();
    const panelWidth = Math.min(236, width - margin * 2);
    const panelHeight = 278;
    const panelX = margin + panelWidth / 2;
    const gapAboveTrigger = Math.max(10, Math.round(touchSize * 0.22));
    const panelY = Math.max(margin + panelHeight / 2, triggerY - touchSize / 2 - gapAboveTrigger - panelHeight / 2);
    const panelTop = panelY - panelHeight / 2;
    const rowY = panelTop + 48;
    const buttonWidth = panelWidth - 28;
    const buttonHeight = 36;
    const buttonX = panelX;
    const firstButtonY = rowY + 52;
    const buttonGap = 42;
    const depth = 720;

    const outsideCatcher = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.001)
      .setInteractive()
      .setDepth(depth);
    outsideCatcher.on('pointerup', () => this.destroyUtilityMenuPanel());

    const triggerControl = createFloatingControl(this, triggerX, triggerY, touchSize, '☰', () => {
      this.destroyUtilityMenuPanel();
    }, { fontScale: 0.5 });

    const glow = this.add.rectangle(panelX, panelY + 4, panelWidth + 8, panelHeight + 8, 0x38bdf8, 0.08)
      .setStrokeStyle(1, 0x38bdf8, 0.12)
      .setDepth(depth + 1);
    const panel = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x020617, 0.9)
      .setStrokeStyle(1, 0x7dd3fc, 0.72)
      .setDepth(depth + 2);
    const title = this.add.text(panelX, panelTop + 18, translateActive('ui.battle.utilityMenuTitle', 'TACTICAL MENU'), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#93c5fd',
      fontStyle: 'bold',
      letterSpacing: 1.4,
    }).setOrigin(0.5).setDepth(depth + 3);

    const fullscreenToggle = createFloatingControl(this, panelX - 28, rowY, 42, '⛶', () => {
      this.toggleFullscreen();
    }, { fontScale: 0.48 });
    const muteToggle = createMuteToggleControl(this, panelX + 28, rowY, 42, { depth: depth + 3 });

    [triggerControl, fullscreenToggle, muteToggle].forEach((control) => {
      [control.halo, control.backing, control.text, control.button, control.icon].filter(Boolean).forEach((item) => {
        item.setDepth?.(depth + 3);
      });
    });

    const buttons = [
      this.createUtilityMenuButton(buttonX, firstButtonY, buttonWidth, buttonHeight, translateActive('ui.common.rules', 'Rules'), () => this.openRulesPanel()),
      this.createUtilityMenuButton(buttonX, firstButtonY + buttonGap, buttonWidth, buttonHeight, translateActive('ui.common.settings', 'Settings'), () => this.openSettingsScene()),
      this.createUtilityMenuButton(buttonX, firstButtonY + buttonGap * 2, buttonWidth, buttonHeight, translateActive('ui.battle.returnToFactionSelect', 'Return / Back'), () => this.exitBattleToFactionSelect()),
      this.createUtilityMenuButton(buttonX, firstButtonY + buttonGap * 3, buttonWidth, buttonHeight, translateActive('ui.battle.exitToMainMenu', 'Exit Battle / Main Menu'), () => this.exitBattleToMainMenu()),
    ];

    buttons.forEach((button) => {
      [button.background, button.text].forEach((item) => item.setDepth(depth + 3));
    });

    this.utilityMenuPanel = {
      outsideCatcher,
      glow,
      panel,
      title,
      triggerControl,
      fullscreenToggle,
      muteToggle,
      buttons,
    };
  }

  createUtilityMenuButton(x, y, width, height, label, onClick) {
    const background = this.add.rectangle(x, y, width, height, 0x0f172a, 0.92)
      .setStrokeStyle(1, 0x38bdf8, 0.42)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '15px',
      color: '#f8fafc',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const setHover = (isHovering) => {
      background.setFillStyle(isHovering ? 0x14304a : 0x0f172a, isHovering ? 0.98 : 0.92);
      background.setStrokeStyle(1, isHovering ? 0x7dd3fc : 0x38bdf8, isHovering ? 0.88 : 0.42);
    };
    const handlePointerUp = (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
      onClick();
    };

    [background, text].forEach((target) => {
      target.on('pointerover', () => setHover(true));
      target.on('pointerout', () => setHover(false));
      target.on('pointerup', handlePointerUp);
    });

    return { background, text };
  }

  destroyUtilityMenuPanel() {
    if (!this.utilityMenuPanel) return;

    const { outsideCatcher, glow, panel, title, triggerControl, fullscreenToggle, muteToggle, buttons } = this.utilityMenuPanel;
    const items = [
      outsideCatcher,
      glow,
      panel,
      title,
      triggerControl?.halo,
      triggerControl?.backing,
      triggerControl?.text,
      fullscreenToggle?.halo,
      fullscreenToggle?.backing,
      fullscreenToggle?.text,
      ...buttons.flatMap((button) => [button.background, button.text]),
    ];

    muteToggle?.destroy?.();
    items.forEach((item) => {
      item?.removeAllListeners?.();
      item?.destroy?.();
    });
    this.utilityMenuPanel = null;
  }

  getBattleResultText() {
    if (!this.gameState?.winner) return '';
    if (this.gameState.winner === 'player') return translateActive('ui.battle.youWin', 'YOU WIN');
    if (this.gameState.winner === 'enemy') return translateActive('ui.battle.youLose', 'YOU LOSE');
    return translateActive('ui.battle.draw', 'DRAW');
  }

  scheduleBattleResultModal(delayMs = 500) {
    if (!this.gameState?.winner || this.battleResultModalShown || this.battleResultModalPending) return;
    this.battleResultModalPending = true;
    this.isFlowResolving = true;
    this.updateActionSlotBadge();
    this.time.delayedCall(delayMs, () => this.showBattleResultModal());
  }

  completeBattleFlow(delayMs = 500) {
    if (!this.gameState?.winner || this.battleResultModalShown) return false;
    this.updateInitiativeIndicator();
    this.scheduleBattleResultModal(delayMs);
    return true;
  }

  showBattleResultModal() {
    this.battleResultModalPending = false;
    if (!this.gameState?.winner || this.battleResultModalShown) return;

    this.battleResultModalShown = true;
    this.isFlowResolving = false;
    this.updateActionSlotBadge();
    this.selectedCardId = null;
    this.pendingSwapIndex = null;
    this.targetingState = null;
    this.resetCardHighlights();

    const { width, height } = this.scale.gameSize;
    const modalWidth = Math.min(width * 0.78, 460);
    const modalHeight = Math.min(height * 0.34, 260);
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const resultText = this.getBattleResultText();
    const resultColor = this.gameState.winner === 'player'
      ? '#bbf7d0'
      : (this.gameState.winner === 'enemy' ? '#fecaca' : '#fde68a');

    const overlay = this.add.rectangle(centerX, centerY, width, height, 0x000000, 0.58)
      .setInteractive()
      .setDepth(900);
    const panel = this.add.rectangle(centerX, centerY, modalWidth, modalHeight, 0x0f172a, 0.96)
      .setStrokeStyle(4, 0xe2e8f0, 0.85)
      .setDepth(901);
    const title = this.add.text(centerX, centerY - modalHeight * 0.24, resultText, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(34, Math.floor(modalHeight * 0.2))}px`,
      color: resultColor,
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(902);
    const subtitle = this.add.text(centerX, centerY - modalHeight * 0.02, translateActive('ui.battle.battleComplete', 'Battle Complete'), {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(16, Math.floor(modalHeight * 0.07))}px`,
      color: '#cbd5e1',
      align: 'center',
    }).setOrigin(0.5).setDepth(902);

    const buttonY = centerY + modalHeight * 0.26;
    const buttonWidth = Math.min(170, modalWidth * 0.34);
    const buttonHeight = Math.max(54, modalHeight * 0.22);
    const gap = Math.max(24, modalWidth * 0.08);
    const exitButton = this.createResultModalButton(
      centerX - buttonWidth / 2 - gap / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      `←\n${translateActive('ui.common.exit', 'EXIT')}`,
      () => this.exitBattleToFactionSelect(),
    );
    const retryButton = this.createResultModalButton(
      centerX + buttonWidth / 2 + gap / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      `↻\n${translateActive('ui.common.retry', 'RETRY')}`,
      () => this.retryBattle(),
    );

    this.battleResultModal = {
      overlay,
      panel,
      title,
      subtitle,
      buttons: [exitButton, retryButton],
    };
  }

  createResultModalButton(x, y, width, height, label, onClick) {
    const background = this.add.rectangle(x, y, width, height, 0x1e293b, 1)
      .setStrokeStyle(3, 0x94a3b8, 0.95)
      .setInteractive({ useHandCursor: true })
      .setDepth(902);
    const text = this.add.text(x, y, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(16, Math.floor(height * 0.28))}px`,
      color: '#f8fafc',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: -2,
    }).setOrigin(0.5).setDepth(903);

    const setHover = (isHovering) => {
      background.setFillStyle(isHovering ? 0x334155 : 0x1e293b, 1);
      background.setStrokeStyle(3, isHovering ? 0xfacc15 : 0x94a3b8, isHovering ? 1 : 0.95);
      text.setScale(isHovering ? 1.04 : 1);
    };

    background.on('pointerover', () => setHover(true));
    background.on('pointerout', () => setHover(false));
    background.on('pointerdown', () => {
      background.setFillStyle(0x475569, 1);
      text.setScale(0.96);
    });
    background.on('pointerup', () => {
      setHover(false);
      onClick();
    });

    return { background, text };
  }

  destroyBattleResultModal() {
    if (!this.battleResultModal) {
      this.battleResultModalShown = false;
      this.battleResultModalPending = false;
      this.updateActionSlotBadge();
      return;
    }
    const items = [
      this.battleResultModal.overlay,
      this.battleResultModal.panel,
      this.battleResultModal.title,
      this.battleResultModal.subtitle,
      ...this.battleResultModal.buttons.flatMap((button) => [button.background, button.text]),
    ];
    items.forEach((item) => {
      item?.removeAllListeners?.();
      item?.destroy?.();
    });
    this.battleResultModal = null;
    this.battleResultModalShown = false;
    this.battleResultModalPending = false;
    this.updateActionSlotBadge();
  }

  exitBattleToFactionSelect() {
    this.destroyUtilityMenuPanel();
    this.destroyBattleResultModal();
    this.isFlowResolving = false;
    this.selectedCardId = null;
    this.pendingSwapIndex = null;
    this.targetingState = null;
    this.effectCastState = null;
    this.isEffectCastResolving = false;
    this.destroyTargetingInstruction();
    this.openingMulliganPending = false;
    this.scene.start('FactionSelectScene');
  }

  openRulesPanel() {
    this.destroyUtilityMenuPanel();
    this.scene.launch('RulesPanelScene', { returnSceneKey: 'BattleScene' });
    this.scene.pause();
  }

  openBattleMenu() {
    this.destroyUtilityMenuPanel();
    this.scene.launch('BattleMenuScene', { factionKey: this.factionKey, returnSceneKey: 'BattleScene' });
    this.scene.pause();
  }

  resumeFromRulesPanel() {
    this.scene.resume();
    this.recoverFromLifecycle('rules-panel-return');
  }

  resumeFromBattleMenu() {
    this.scene.resume();
    this.recoverFromLifecycle('battle-menu-return');
  }

  openSettingsScene() {
    this.destroyUtilityMenuPanel();
    this.scene.start('SettingsScene');
  }

  exitBattleToMainMenu() {
    this.destroyUtilityMenuPanel();
    this.destroyBattleResultModal();
    this.isFlowResolving = false;
    this.selectedCardId = null;
    this.pendingSwapIndex = null;
    this.targetingState = null;
    this.effectCastState = null;
    this.isEffectCastResolving = false;
    this.destroyTargetingInstruction();
    this.openingMulliganPending = false;
    this.scene.start('MainMenuScene');
  }

  retryBattle() {
    const factionKey = this.factionKey;
    const enemyFactionKey = this.enemyFactionKey;
    this.destroyUtilityMenuPanel();
    this.destroyBattleResultModal();
    this.isFlowResolving = false;
    this.selectedCardId = null;
    this.pendingSwapIndex = null;
    this.targetingState = null;
    this.effectCastState = null;
    this.isEffectCastResolving = false;
    this.destroyTargetingInstruction();
    this.openingMulliganPending = false;
    this.scene.restart({ factionKey, enemyFactionKey });
  }

  toggleFullscreen() {
    toggleSceneFullscreen(this);
  }

  onFullscreenChanged() {
    if (this.scale.isFullscreen) {
      requestPortraitOrientationLock();
    }

    this.recoverFromLifecycle(this.scale.isFullscreen ? 'enterfullscreen' : 'leavefullscreen');
  }

  onViewportChanged() {
    if (!this.gameState) return;
    this.rebuildBattleView('viewport-change');
  }

  recoverFromLifecycle(reason = 'unknown', diagnostics = null) {
    const recoveryDiagnostics = this.getLifecycleDiagnostics(reason, diagnostics);
    console.debug('BattleScene lifecycle recovery diagnostics', recoveryDiagnostics);

    if (!this.gameState) {
      console.warn('BattleScene lifecycle recovery skipped: missing GameState', recoveryDiagnostics);
      return;
    }

    if (!this.scene.isActive() && !this.scene.isPaused()) {
      console.warn('BattleScene lifecycle recovery skipped: scene is not active or paused', recoveryDiagnostics);
      return;
    }

    this.cameras.main.setBackgroundColor(BATTLE_BACKGROUND_FALLBACK_COLOR_HEX);

    if (this.shouldRebuildBattleView(reason, recoveryDiagnostics)) {
      this.rebuildBattleView(reason);
    } else {
      this.refreshBoardLabels();
      this.refreshHeroHP();
      this.updateActionButtonLabel();
      this.updateInitiativeIndicator();
      this.resetCardHighlights();
    }

    this.game.renderer?.resetTextures?.();
    this.game.renderer?.snapshotArea?.(0, 0, 1, 1, () => {});
    this.game.canvas?.focus?.();
  }

  shouldRebuildBattleView(reason, diagnostics) {
    const structuralRecoveryReasons = new Set([
      'enterfullscreen',
      'leavefullscreen',
      'fullscreenchange',
      'webkitfullscreenchange',
      'webglcontextrestored',
      'viewport-change',
      'battle-menu-return',
      'rules-panel-return',
    ]);

    return structuralRecoveryReasons.has(reason)
      || diagnostics.rendererContextLost
      || this.children.length === 0
      || !this.battleFrame?.active
      || this.boardCells.length !== 9
      || !this.actionButton?.active
      || this.cardViews.length === 0;
  }

  getLifecycleDiagnostics(reason, externalDiagnostics = null) {
    const renderer = this.game?.renderer ?? null;
    const gl = renderer?.gl ?? null;
    const sceneKeys = ['StartScene', 'FactionSelectScene', 'BattleScene', 'BattleMenuScene'];

    return {
      reason,
      externalDiagnostics,
      activeScene: this.scene.key,
      battleSceneActive: this.scene.isActive(),
      battleScenePaused: this.scene.isPaused(),
      battleSceneSleeping: this.scene.isSleeping(),
      gameStateExists: Boolean(this.gameState),
      rendererExists: Boolean(renderer),
      rendererContextLost: Boolean(gl?.isContextLost?.()),
      canvasExists: Boolean(this.game?.canvas),
      canvasConnected: Boolean(this.game?.canvas?.isConnected),
      sceneStates: Object.fromEntries(sceneKeys.map((key) => [key, {
        active: this.scene.isActive(key),
        paused: this.scene.isPaused(key),
        sleeping: this.scene.isSleeping(key),
        visible: this.scene.isVisible(key),
      }])),
    };
  }

  rebuildBattleView(reason = 'unknown') {
    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;

    const resultModalWasShown = this.battleResultModalShown;
    this.cleanupSceneObjects({ preserveTimers: true });
    this.layout = this.getLayoutMetrics(width, height);
    this.cameras.main.setBackgroundColor(BATTLE_BACKGROUND_FALLBACK_COLOR_HEX);
    this.backgroundArtAsset = getBattleBackgroundAsset({ playerFactionKey: this.factionKey, enemyFactionKey: this.enemyFactionKey });

    this.drawBattleBackground();
    this.drawBattleFrame();
    this.drawBattlefieldCenterLight();
    this.drawBoard();
    this.drawHeroPanels();
    this.enemyHpText = null;
    this.playerHpText = null;
    this.refreshBoardLabels();
    this.refreshHeroHP();
    this.drawActionZone();
    this.drawDeckCounter();
    this.drawHand();
    this.drawActionRowUtilityMenuTrigger();
    this.updateActionButtonLabel();
    this.updateInitiativeIndicator();
    this.resetCardHighlights();

    if (this.gameState?.winner && resultModalWasShown) {
      this.battleResultModalShown = false;
      this.showBattleResultModal();
    }

    console.debug('BattleScene view rebuilt from runtime GameState', {
      reason,
      playerHP: this.gameState.playerHP,
      enemyHP: this.gameState.enemyHP,
      playerHandSize: this.gameState.player?.hand?.length ?? 0,
      enemyHandSize: this.gameState.enemy?.hand?.length ?? 0,
      turnsCompleted: this.gameState.turnsCompleted,
      firstActor: this.gameState.firstActor,
    });
  }

  shutdown() {
    this.cleanupSceneObjects();
    this.scale.off('enterfullscreen', this.onFullscreenChanged, this);
    this.scale.off('leavefullscreen', this.onFullscreenChanged, this);
    this.scale.off('resize', this.onViewportChanged, this);
    this.input.off('pointerup', this.onScenePointerUp, this);
    this.resetRuntimeState();
  }

  drawHeroPanels() {
    const { width, topHero, playerHero, contentWidth } = this.layout;
    const panelWidth = contentWidth * 0.72;

    const enemyPanel = this.add.rectangle(width * 0.5, topHero.centerY, panelWidth, topHero.h, 0x111827, HERO_PANEL_FILL_ALPHA).setStrokeStyle(2, 0xf87171, HERO_PANEL_STROKE_ALPHA);
    const playerPanel = this.add.rectangle(width * 0.5, playerHero.centerY, panelWidth, playerHero.h, 0x111827, HERO_PANEL_FILL_ALPHA).setStrokeStyle(2, 0x60a5fa, HERO_PANEL_STROKE_ALPHA);
    this.enemyHeroPanel = enemyPanel;
    this.playerHeroPanel = playerPanel;

    const iconStyle = {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(16, Math.floor(topHero.h * 0.38))}px`,
      color: '#facc15',
      fontStyle: 'bold',
    };
    this.enemyInitiativeIcon = this.add.text(enemyPanel.x + panelWidth * 0.44, enemyPanel.y, '▶', iconStyle).setOrigin(0.5).setVisible(false);
    this.playerInitiativeIcon = this.add.text(playerPanel.x - panelWidth * 0.44, playerPanel.y, '▶', iconStyle).setOrigin(0.5).setVisible(false);
    this.enemyInitiativeIcon.setDepth(120);
    this.playerInitiativeIcon.setDepth(120);

    this.enemyActionSlotBadge = this.createActionSlotBadge({
      panel: enemyPanel,
      panelWidth,
      panelHeight: topHero.h,
      align: 'left',
    });
    this.playerActionSlotBadge = this.createActionSlotBadge({
      panel: playerPanel,
      panelWidth,
      panelHeight: playerHero.h,
      align: 'right',
    });

    this.add.text(enemyPanel.x, enemyPanel.y - topHero.h * 0.14, translateActive('ui.battle.enemyHero', 'ENEMY HERO'), {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(16, Math.floor(topHero.h * 0.32))}px`,
      color: '#f87171',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.add.text(enemyPanel.x, enemyPanel.y + topHero.h * 0.2, '--', {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(18, Math.floor(topHero.h * 0.38))}px`,
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.add.text(playerPanel.x, playerPanel.y - playerHero.h * 0.14, translateActive('ui.battle.playerHero', 'PLAYER HERO'), {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(14, Math.floor(playerHero.h * 0.3))}px`,
      color: '#60a5fa',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.add.text(playerPanel.x, playerPanel.y + playerHero.h * 0.2, '--', {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(16, Math.floor(playerHero.h * 0.36))}px`,
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.updateActionSlotBadge();
  }

  createActionSlotBadge({ panel, panelWidth, panelHeight, align }) {
    const badgeWidth = Math.max(58, Math.min(82, panelWidth * 0.2));
    const badgeHeight = Math.max(20, Math.min(28, panelHeight * 0.48));
    const insetX = Math.max(8, panelWidth * 0.045);
    const x = align === 'left'
      ? panel.x - panelWidth / 2 + insetX + badgeWidth / 2
      : panel.x + panelWidth / 2 - insetX - badgeWidth / 2;
    const y = panel.y;

    const backing = this.add.rectangle(x, y, badgeWidth, badgeHeight, 0x1e293b, 0.92)
      .setStrokeStyle(2, 0xfacc15, 0.78)
      .setDepth(121)
      .setVisible(false);
    const text = this.add.text(x, y, translateActive('ui.battle.actOne', 'ACT 1/2'), {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(10, Math.floor(badgeHeight * 0.48))}px`,
      color: '#fde68a',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(122).setVisible(false);

    return { backing, text };
  }

  getActionSlotBadgeState() {
    if (!this.gameState
      || this.gameState.winner
      || this.battleResultModalShown
      || this.battleResultModalPending
      || this.openingMulliganPending) {
      return null;
    }

    const firstActor = this.gameState.firstActor;
    const firstActorUsed = firstActor === 'player' ? this.playerActionUsed : this.enemyActionUsed;
    const secondActor = firstActor === 'player' ? 'enemy' : 'player';
    const secondActorUsed = secondActor === 'player' ? this.playerActionUsed : this.enemyActionUsed;

    if (this.isFlowResolving) {
      if (!firstActorUsed && firstActor === 'enemy') {
        return { side: firstActor, label: translateActive('ui.battle.actOne', 'ACT 1/2') };
      }

      if (firstActorUsed && !secondActorUsed && secondActor === 'enemy') {
        return { side: secondActor, label: translateActive('ui.battle.actTwo', 'ACT 2/2') };
      }

      return null;
    }

    if (!firstActorUsed) {
      return { side: firstActor, label: translateActive('ui.battle.actOne', 'ACT 1/2') };
    }

    if (!secondActorUsed) {
      return { side: secondActor, label: translateActive('ui.battle.actTwo', 'ACT 2/2') };
    }

    return null;
  }

  updateActionSlotBadge() {
    const badgeState = this.getActionSlotBadgeState();

    [
      ['player', this.playerActionSlotBadge],
      ['enemy', this.enemyActionSlotBadge],
    ].forEach(([side, badge]) => {
      if (!badge) return;
      const isVisible = badgeState?.side === side;
      badge.backing.setVisible(isVisible);
      badge.text.setVisible(isVisible);
      if (isVisible) badge.text.setText(badgeState.label);
    });
  }

  drawBoard() {
    const { width, board } = this.layout;
    const startX = width / 2 - board.width / 2;
    const startY = board.centerY - board.height / 2;

    this.boardCells = [];

    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const x = startX + col * board.cellWidth + board.cellWidth / 2;
        const y = startY + row * board.cellHeight + board.cellHeight / 2;
        const boardIndex = row * 3 + col;
        const isMiddleRow = row === 1;

        const background = this.add
          .rectangle(x, y, board.cellWidth - 10, board.cellHeight - 10, 0x111827, isMiddleRow ? BOARD_GUIDE_SLOT_FILL_ALPHA : BOARD_SLOT_FILL_ALPHA)
          .setStrokeStyle(isMiddleRow ? 2 : 3, isMiddleRow ? 0x94a3b8 : 0xcbd5e1, isMiddleRow ? BOARD_GUIDE_SLOT_STROKE_ALPHA : BOARD_SLOT_STROKE_ALPHA)
          .setInteractive({ useHandCursor: true });

        if (isMiddleRow && typeof background.setLineDash === 'function') {
          background.setLineDash([6, 7]);
        }

        const label = this.add.container(x, y);
        const blockedMarker = this.add.text(x + board.cellWidth * 0.34, y - board.cellHeight * 0.35, '', {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${Math.max(12, Math.floor(board.cellWidth * 0.18))}px`,
          color: '#ef4444',
          fontStyle: 'bold',
        }).setOrigin(0.5);

        background.on('pointerup', () => {
          this.onBoardCellTap(boardIndex);
        });
        background.on('pointerout', () => {
          this.onBoardCellPointerOut(boardIndex);
        });
        this.boardCells.push({ index: boardIndex, row, background, label, blockedMarker });
      }
    }
  }

  drawActionZone() {
    const { width, action } = this.layout;

    const button = this.add
      .text(width * 0.5, action.centerY, translateActive('ui.common.pass', 'PASS'), {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${Math.max(18, Math.floor(action.h * 0.52))}px`,
        color: '#f9fafb',
        backgroundColor: '#111827',
        align: 'center',
        fixedWidth: Math.floor(width * 0.46),
        padding: { x: 0, y: Math.max(8, Math.floor(action.h * 0.18)) },
      })
      .setOrigin(0.5)
      .setStroke('#64748b', 2)
      .setInteractive({ useHandCursor: true });

    this.actionButton = button;
    button.on('pointerup', () => {
      if (this.openingMulliganPending) {
        this.confirmOpeningMulligan();
        return;
      }
      if (this.targetingState) {
        this.confirmTargetingSelection();
        return;
      }
      this.resolvePassTurn();
    });
  }

  drawDeckCounter() {
    this.destroyDeckCounterView();
    if (!this.gameState?.player || !this.layout) return;

    const { width, action, margin } = this.layout;
    const deckCount = this.gameState.player.deck.length;
    const buttonRight = width * 0.5 + width * 0.46 / 2;
    const counterWidth = Math.min(Math.max(76, width * 0.19), 104);
    const counterHeight = Math.min(Math.max(34, action.h * 0.8), 46);
    const x = Phaser.Math.Clamp(
      buttonRight + Math.max(12, margin) + counterWidth / 2,
      margin + counterWidth / 2,
      width - margin - counterWidth / 2,
    );
    const y = action.centerY;

    const backing = this.add.rectangle(x, y, counterWidth, counterHeight, 0x082f49, 0.82)
      .setStrokeStyle(2, 0x38bdf8, 0.9)
      .setDepth(150)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, translateActive('ui.battle.deckCounter', 'DECK {count}', { count: deckCount }), {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(13, Math.floor(counterHeight * 0.34))}px`,
      color: '#e0f2fe',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(151).setInteractive({ useHandCursor: true });

    const openPanel = () => this.openDeckInfoPanel();
    backing.on('pointerover', () => {
      backing.setFillStyle(0x0c4a6e, 0.9);
      backing.setStrokeStyle(2, 0x7dd3fc, 1);
    });
    backing.on('pointerout', () => {
      backing.setFillStyle(0x082f49, 0.82);
      backing.setStrokeStyle(2, 0x38bdf8, 0.9);
    });
    backing.on('pointerup', openPanel);
    text.on('pointerup', openPanel);

    this.deckCounterView = { backing, text };
  }

  refreshDeckCounter() {
    if (!this.deckCounterView?.text || !this.gameState?.player) return;
    this.deckCounterView.text.setText(translateActive('ui.battle.deckCounter', 'DECK {count}', { count: this.gameState.player.deck.length }));
    if (this.deckInfoPanel?.contentText) {
      this.deckInfoPanel.contentText.setText(this.getDeckInfoPanelText());
    }
  }

  destroyDeckCounterView() {
    if (!this.deckCounterView) return;
    [this.deckCounterView.backing, this.deckCounterView.text].forEach((item) => {
      item?.removeAllListeners?.();
      item?.destroy?.();
    });
    this.deckCounterView = null;
  }

  openDeckInfoPanel() {
    if (!this.gameState?.player || this.battleResultModalShown || this.isFlowResolving) return;

    this.destroyDeckInfoPanel();
    this.selectedCardId = null;
    this.targetingState = null;
    this.effectCastState = null;
    this.isEffectCastResolving = false;
    this.pendingSwapIndex = null;
    this.destroyTargetingInstruction();
    this.updateActionButtonLabel();
    this.resetCardHighlights({ showPreview: false });

    const { width, height } = this.scale.gameSize;
    const panelWidth = Math.min(width * 0.84, 470);
    const panelHeight = Math.min(height * 0.64, 530);
    const centerX = width * 0.5;
    const centerY = height * 0.49;
    const panelTop = centerY - panelHeight / 2;
    const panelLeft = centerX - panelWidth / 2;
    const padding = Math.max(16, Math.floor(panelWidth * 0.045));
    const headerHeight = Math.max(78, Math.floor(panelHeight * 0.155));
    const footerHeight = 68;
    const contentX = panelLeft + padding;
    const contentY = panelTop + headerHeight;
    const contentWidth = panelWidth - padding * 2;
    const contentHeight = panelHeight - headerHeight - footerHeight;

    const overlay = this.add.rectangle(centerX, height * 0.5, width, height, 0x000000, 0.58)
      .setInteractive()
      .setDepth(760);
    const panel = this.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x0f172a, 0.97)
      .setStrokeStyle(3, 0x38bdf8, 0.9)
      .setInteractive()
      .setDepth(761);
    const title = this.add.text(centerX, panelTop + 28, translateActive('ui.battle.deckInfo.title', 'Deck Info'), {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(21, Math.floor(panelHeight * 0.052))}px`,
      color: '#e0f2fe',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(762);
    const subtitle = this.add.text(centerX, panelTop + 54, translateActive('ui.battle.deckInfo.subtitle', 'Player cards • read-only'), {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(12, Math.floor(panelHeight * 0.031))}px`,
      color: '#94a3b8',
      align: 'center',
    }).setOrigin(0.5).setDepth(762);

    const contentText = this.add.text(
      contentX,
      contentY,
      this.getDeckInfoPanelText(),
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${Math.max(13, Math.floor(panelHeight * 0.029))}px`,
        color: '#f8fafc',
        lineSpacing: Math.max(4, Math.floor(panelHeight * 0.006)),
        wordWrap: { width: contentWidth },
      },
    ).setOrigin(0, 0);
    const contentContainer = this.add.container(0, 0, [contentText]).setDepth(762);

    const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(contentX, contentY, contentWidth, contentHeight);
    const scrollMask = maskShape.createGeometryMask();
    contentContainer.setMask(scrollMask);

    const scrollArea = this.add.zone(contentX, contentY, contentWidth, contentHeight)
      .setOrigin(0, 0)
      .setDepth(763)
      .setInteractive();

    const contentBottom = contentY + contentText.height;
    const maxScrollY = Math.max(0, contentBottom - contentY - contentHeight + 8);
    const scrollHint = this.add.text(panelLeft + padding, panelTop + panelHeight - 58, maxScrollY > 0 ? translateActive('ui.common.swipeScroll', 'Swipe or mouse wheel to scroll') : translateActive('ui.common.noScroll', 'No scrolling needed'), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#94a3b8',
    }).setDepth(762);

    const backButton = createModalBackButton(this, {
      x: centerX,
      y: panelTop + panelHeight - 30,
      depth: 763,
      onPointerUp: () => this.destroyDeckInfoPanel(),
    });

    overlay.on('pointerup', () => this.destroyDeckInfoPanel());

    this.deckInfoPanel = {
      overlay,
      panel,
      title,
      subtitle,
      contentContainer,
      contentText,
      maskShape,
      scrollMask,
      scrollArea,
      scrollHint,
      backButton,
      scrollY: 0,
      maxScrollY,
      dragStartY: null,
      dragStartScrollY: 0,
      wheelHandler: null,
      pointerMoveHandler: null,
      pointerUpHandler: null,
      keyUpHandler: null,
      keyDownHandler: null,
    };

    this.bindDeckInfoScrollHandlers(contentHeight);
  }

  bindDeckInfoScrollHandlers(contentHeight) {
    if (!this.deckInfoPanel || this.deckInfoPanel.maxScrollY <= 0) return;

    const panelState = this.deckInfoPanel;
    panelState.wheelHandler = (_pointer, _gameObjects, _deltaX, deltaY) => {
      if (this.deckInfoPanel !== panelState) return;
      this.setDeckInfoScrollY(panelState.scrollY + deltaY * 0.45);
    };
    panelState.pointerMoveHandler = (pointer) => {
      if (this.deckInfoPanel !== panelState || panelState.dragStartY === null || !pointer.isDown) return;
      this.setDeckInfoScrollY(panelState.dragStartScrollY + panelState.dragStartY - pointer.y);
    };
    panelState.pointerUpHandler = () => {
      if (this.deckInfoPanel === panelState) {
        panelState.dragStartY = null;
      }
    };

    panelState.keyUpHandler = () => this.setDeckInfoScrollY(panelState.scrollY - contentHeight * 0.18);
    panelState.keyDownHandler = () => this.setDeckInfoScrollY(panelState.scrollY + contentHeight * 0.18);

    this.input.on('wheel', panelState.wheelHandler);
    this.input.on('pointermove', panelState.pointerMoveHandler);
    this.input.on('pointerup', panelState.pointerUpHandler);
    panelState.scrollArea.on('pointerdown', (pointer) => {
      panelState.dragStartY = pointer.y;
      panelState.dragStartScrollY = panelState.scrollY;
    });
    this.input.keyboard?.on('keydown-UP', panelState.keyUpHandler);
    this.input.keyboard?.on('keydown-DOWN', panelState.keyDownHandler);
  }

  setDeckInfoScrollY(value) {
    if (!this.deckInfoPanel) return;
    this.deckInfoPanel.scrollY = Phaser.Math.Clamp(value, 0, this.deckInfoPanel.maxScrollY);
    if (this.deckInfoPanel.contentContainer) {
      this.deckInfoPanel.contentContainer.y = -this.deckInfoPanel.scrollY;
    }
  }

  destroyDeckInfoPanel() {
    if (!this.deckInfoPanel) return;
    const panelState = this.deckInfoPanel;
    if (panelState.wheelHandler) this.input.off('wheel', panelState.wheelHandler);
    if (panelState.pointerMoveHandler) this.input.off('pointermove', panelState.pointerMoveHandler);
    if (panelState.pointerUpHandler) this.input.off('pointerup', panelState.pointerUpHandler);
    if (panelState.keyUpHandler) this.input.keyboard?.off('keydown-UP', panelState.keyUpHandler);
    if (panelState.keyDownHandler) this.input.keyboard?.off('keydown-DOWN', panelState.keyDownHandler);
    [
      panelState.overlay,
      panelState.panel,
      panelState.title,
      panelState.subtitle,
      panelState.contentContainer,
      panelState.contentText,
      panelState.maskShape,
      panelState.scrollArea,
      panelState.scrollHint,
      panelState.backButton?.backing,
      panelState.backButton?.text,
    ].forEach((item) => {
      item?.removeAllListeners?.();
      item?.destroy?.();
    });
    this.deckInfoPanel = null;
  }

  getDeckInfoPanelText() {
    const player = this.gameState?.player ?? { deck: [], hand: [], discard: [] };
    const onBoard = (this.gameState?.board ?? []).filter((card) => card?.owner === 'player');
    const groups = [
      [translateActive('ui.battle.deckInfo.inDeck', 'In Deck'), player.deck],
      [translateActive('ui.battle.deckInfo.inHand', 'In Hand'), player.hand],
      [translateActive('ui.battle.deckInfo.playedDiscarded', 'Played / Discarded'), player.discard],
      [translateActive('ui.battle.deckInfo.onBoard', 'On Board'), onBoard],
    ];

    return groups.map(([heading, cards]) => this.formatDeckInfoGroup(heading, cards)).join('\n\n');
  }

  formatDeckInfoGroup(heading, cards) {
    const entries = this.summarizeCardEntries(cards);
    const total = Array.isArray(cards) ? cards.length : 0;
    if (entries.length === 0) return `${heading} (${total})\n• ${translateActive('ui.common.none', 'None')}`;
    return [
      `${heading} (${total})`,
      ...entries.map((entry) => `• ${entry.name} — ${entry.typeLabel} ×${entry.count}`),
    ].join('\n');
  }

  summarizeCardEntries(cards) {
    const summary = new Map();
    (Array.isArray(cards) ? cards : []).forEach((card) => {
      if (!card) return;
      const entry = formatDeckSummaryEntry(card, getActiveLocale());
      const key = `${entry.name}|${entry.typeLabel}`;
      const existing = summary.get(key) ?? { ...entry, count: 0 };
      existing.count += entry.count;
      summary.set(key, existing);
    });
    return [...summary.values()].sort((a, b) => a.name.localeCompare(b.name) || a.typeLabel.localeCompare(b.typeLabel));
  }

  drawHand() {
    const { width, hand, margin } = this.layout;
    const centerY = hand.centerY;
    const cardBaseY = hand.cardCenterY;
    const controlDividerY = hand.y + hand.cardRowHeight;
    const handTrackLeft = hand.handTrackLeft + hand.cardWidth / 2;

    this.add.rectangle(width * 0.5, centerY, width - margin * 2, hand.h, 0x0f172a, 0.2)
      .setStrokeStyle(1, 0x334155, 0.38);
    this.add.rectangle(width * 0.5, centerY - hand.h / 2, width - margin * 2, 1, 0x38bdf8, 0.16);
    this.add.rectangle(width * 0.5, controlDividerY, width - margin * 2, 1, 0x38bdf8, 0.12);

    for (let index = 0; index < hand.cardsVisible; index += 1) {
      const x = handTrackLeft + index * hand.step;
      const card = this.gameState.player.hand[index] ?? null;
      const cardId = card?.id ?? `slot-${index}`;
      const baseY = cardBaseY;
      const accentColor = this.getHandCardAccentColor(card);
      const baseDepth = 20 + index * 4;
      const cardView = this.createHandCardView({
        card,
        cardId,
        x,
        y: baseY,
        width: hand.cardWidth,
        height: hand.cardHeight,
        accentColor,
        depth: baseDepth,
        typographyScale: HAND_CARD_TYPOGRAPHY_SCALE,
        titleTypographyScale: HAND_CARD_TITLE_TYPOGRAPHY_SCALE,
        bodyLineSpacing: HAND_CARD_BODY_LINE_SPACING,
      });

      if (card) {
        cardView.background.setInteractive({ useHandCursor: true });
        cardView.background.on('pointerdown', () => {
          this.onCardPointerDown(cardId);
        });
        cardView.background.on('pointerup', () => {
          this.onCardPointerUp(cardId);
        });
        cardView.background.on('pointerover', () => {
          this.onHandCardPointerOver(cardId);
        });
        cardView.background.on('pointerout', () => {
          this.onHandCardPointerOut(cardId);
        });
      }

      this.cardViews.push(cardView);

      if (!card) {
        cardView.root.setAlpha(0.45);
      }
    }
  }

  createHandCardView({
    card,
    cardId,
    x,
    y,
    width,
    height,
    accentColor,
    depth,
    statBadgeScale = HAND_CARD_STAT_BADGE_SCALE,
    typographyScale = 1,
    titleTypographyScale = typographyScale,
    bodyLineSpacing = 2,
  }) {
    return createCardPreviewView(this, {
      card,
      cardId,
      x,
      y,
      width,
      height,
      accentColor,
      depth,
      locale: getActiveLocale(),
      statBadgeScale,
      typographyScale,
      titleTypographyScale,
      bodyLineSpacing,
    });
  }

  getHandCardAccentColor(card) {
    return getDefaultCardAccentColor(card);
  }

  onHandCardPointerOver(cardId) {
    // Hand-card inspect is intentionally long-press driven so quick taps only select for play.
    if (!cardId) return;
  }

  onHandCardPointerOut(cardId) {
    if (this.hoverInspectCardId !== cardId) return;
    this.hoverInspectCardId = null;
    if (!this.selectedCardId && !this.previewedMulliganCardId) {
      this.destroySelectedHandCardZoom({ animate: true });
    }
  }

  clearBoardInspect({ animate = true } = {}) {
    if (this.boardInspectIndex === null) return;

    this.boardInspectIndex = null;
    if (!this.selectedCardId && !this.previewedMulliganCardId && !this.hoverInspectCardId) {
      this.destroySelectedHandCardZoom({ animate });
    }
  }

  showBoardUnitInspect(boardIndex) {
    if (this.selectedCardId || this.targetingState || this.effectCastState || this.isEffectCastResolving || this.pressedHandCardId) return false;

    const unit = this.gameState?.board?.[boardIndex] ?? null;
    if (!unit) return false;

    this.hoverInspectCardId = null;
    this.boardInspectIndex = boardIndex;
    this.showSelectedHandCardZoom();
    return true;
  }

  onBoardCellPointerOut() {
    // Board inspect is tap-driven and stays open until an outside tap or state change clears it.
  }

  onCardPointerDown(cardId) {
    this.cancelHandCardLongPress();
    this.longPressTriggeredCardId = null;
    this.pressedHandCardId = cardId;
    this.hoverInspectCardId = null;
    this.boardInspectIndex = null;

    if (this.battleResultModalShown) {
      return;
    }

    if (this.isFlowResolving) {
      return;
    }

    if (this.openingMulliganPending) {
      this.selectedCardId = null;
      this.targetingState = null;
      this.effectCastState = null;
      this.isEffectCastResolving = false;
      this.destroyTargetingInstruction();
      this.pendingSwapIndex = null;
      this.previewedMulliganCardId = null;
      this.toggleOpeningMulliganCard(cardId, { showPreview: false });
      return;
    }

    if (this.playerActionUsed || this.isEffectCastResolving || this.targetingState) {
      return;
    }

    const card = this.gameState.player.hand.find((item) => item.id === cardId);
    if (!card) {
      this.clearHandCardSelection();
      return;
    }

    this.pendingSwapIndex = null;
    this.selectedCardId = cardId;
    this.targetingState = this.isUnitCard(card) ? null : this.getTargetingStateForCard(card);
    this.resetCardHighlights({ showPreview: false });
    this.updateActionButtonLabel();
    this.startHandCardLongPress(cardId);
  }

  startHandCardLongPress(cardId) {
    this.cancelHandCardLongPress();
    this.handCardLongPressEvent = this.time.delayedCall(HAND_CARD_LONG_PRESS_MS, () => {
      this.handCardLongPressEvent = null;
      if (this.pressedHandCardId !== cardId) return;
      if (this.battleResultModalShown || this.isFlowResolving || this.openingMulliganPending || this.playerActionUsed) return;

      const card = this.gameState?.player?.hand?.find((item) => item.id === cardId);
      if (!card) return;

      this.longPressTriggeredCardId = cardId;
      this.selectedCardId = cardId;
      this.targetingState = this.isUnitCard(card) ? null : this.getTargetingStateForCard(card);
      this.hoverInspectCardId = null;
      this.boardInspectIndex = null;
      this.resetCardHighlights({ showPreview: true });
      this.updateActionButtonLabel();
    });
  }

  cancelHandCardLongPress() {
    if (!this.handCardLongPressEvent) return;
    this.handCardLongPressEvent.remove(false);
    this.handCardLongPressEvent = null;
  }

  onCardPointerUp(cardId) {
    if (this.pressedHandCardId !== cardId) {
      return;
    }

    this.cancelHandCardLongPress();

    if (this.battleResultModalShown || this.isFlowResolving) {
      this.pressedHandCardId = null;
      this.longPressTriggeredCardId = null;
      return;
    }

    if (this.openingMulliganPending) {
      this.previewedMulliganCardId = this.selectedMulliganCardIds.includes(cardId) ? cardId : null;
      this.resetCardHighlights({ showPreview: true });
      this.pressedHandCardId = null;
      this.longPressTriggeredCardId = null;
      return;
    }

    if (this.longPressTriggeredCardId === cardId) {
      this.pressedHandCardId = null;
      this.longPressTriggeredCardId = null;
      return;
    }

    this.resetCardHighlights({ showPreview: false });
    this.pressedHandCardId = null;
  }

  onScenePointerUp(pointer, currentlyOver = []) {
    if (this.battleResultModalShown || this.isFlowResolving || this.isEffectCastResolving) return;

    if (this.openingMulliganPending) {
      this.clearOpeningMulliganPreviewFromOutsideTap(pointer, currentlyOver);
      return;
    }

    if (!this.selectedCardId && !this.targetingState && !this.effectCastState) {
      this.clearBoardInspectFromOutsideTap(pointer, currentlyOver);
      return;
    }
    if (this.isPointerUpReservedForUi(pointer, currentlyOver)) return;

    if (this.pressedHandCardId) {
      this.cancelHandCardLongPress();
      this.pressedHandCardId = null;
      return;
    }

    const boardCell = this.getBoardCellFromPointerUp(pointer, currentlyOver);
    if (boardCell) {
      const selectedCard = this.gameState.player.hand.find((card) => card.id === this.selectedCardId);
      if (!selectedCard && !this.effectCastState) {
        this.pressedHandCardId = null;
        this.clearHandCardSelection();
        return;
      }

      if (this.isBoardCellTapReservedForCardAction(boardCell.index, selectedCard)) {
        this.pressedHandCardId = null;
        this.onBoardCellTap(boardCell.index);
        return;
      }
      if (this.targetingState) {
        this.pressedHandCardId = null;
        return;
      }
    }

    if (this.clearSelectedHandInspectFromOutsideTap(pointer, currentlyOver)) {
      this.pressedHandCardId = null;
      return;
    }

    this.pressedHandCardId = null;
    this.clearHandCardSelection();
  }

  clearSelectedHandInspectFromOutsideTap(pointer, currentlyOver = []) {
    if (!this.selectedHandCardZoom || this.boardInspectIndex !== null) return false;
    if (this.isPointerInsideSelectedHandCardZoom(pointer, currentlyOver)) return false;

    this.resetCardHighlights({ showPreview: false });
    return true;
  }

  clearOpeningMulliganPreviewFromOutsideTap(pointer, currentlyOver = []) {
    if (!this.previewedMulliganCardId && !this.selectedHandCardZoom) return;
    if (this.isPointerInsideMulliganHandOrPreview(pointer, currentlyOver)) return;

    this.previewedMulliganCardId = null;
    this.hoverInspectCardId = null;
    this.boardInspectIndex = null;
    this.pressedHandCardId = null;
    this.resetCardHighlights({ showPreview: false });
  }

  isPointerInsideMulliganHandOrPreview(pointer, currentlyOver = []) {
    const overObjects = this.normalizePointerUpObjects(currentlyOver);
    const handObjects = this.cardViews.flatMap((view) => [view.glow, view.background, view.label].filter(Boolean));
    const previewObjects = this.selectedHandCardZoom
      ? [this.selectedHandCardZoom.glow, this.selectedHandCardZoom.background, this.selectedHandCardZoom.label].filter(Boolean)
      : [];

    if ([...handObjects, ...previewObjects].some((item) => overObjects.includes(item) || this.isPointerInsideGameObject(pointer, item))) {
      return true;
    }

    if (!pointer || !this.layout?.hand) return false;

    const { width, margin, hand } = this.layout;
    const handLeft = margin;
    const handRight = width - margin;
    const handTop = hand.y;
    const handBottom = hand.y + hand.h;

    return pointer.x >= handLeft && pointer.x <= handRight && pointer.y >= handTop && pointer.y <= handBottom;
  }

  normalizePointerUpObjects(currentlyOver = []) {
    return Array.isArray(currentlyOver) ? currentlyOver : [];
  }

  isPointerInsideGameObject(pointer, gameObject) {
    if (!pointer || !gameObject?.getBounds) return false;
    return gameObject.getBounds().contains(pointer.x, pointer.y);
  }

  clearBoardInspectFromOutsideTap(pointer, currentlyOver = []) {
    if (this.boardInspectIndex === null) return;
    if (this.isPointerUpReservedForUi(pointer, currentlyOver)) return;
    if (this.getBoardCellFromPointerUp(pointer, currentlyOver)) return;
    if (this.isPointerInsideSelectedHandCardZoom(pointer, currentlyOver)) return;

    this.clearBoardInspect({ animate: true });
  }

  isPointerInsideSelectedHandCardZoom(pointer, currentlyOver = []) {
    if (!this.selectedHandCardZoom) return false;

    const overObjects = this.normalizePointerUpObjects(currentlyOver);
    return [this.selectedHandCardZoom.background, this.selectedHandCardZoom.label, this.selectedHandCardZoom.glow]
      .filter(Boolean)
      .some((item) => overObjects.includes(item) || this.isPointerInsideGameObject(pointer, item));
  }

  isPointerUpReservedForUi(pointer, currentlyOver = []) {
    const overObjects = this.normalizePointerUpObjects(currentlyOver);
    const isOverHandCard = this.cardViews.some((view) => overObjects.includes(view.background));
    if (isOverHandCard) return true;

    if (this.actionButton && (overObjects.includes(this.actionButton) || this.isPointerInsideGameObject(pointer, this.actionButton))) {
      return true;
    }

    if (this.deckCounterView && [this.deckCounterView.backing, this.deckCounterView.text]
      .some((item) => overObjects.includes(item) || this.isPointerInsideGameObject(pointer, item))) {
      return true;
    }

    if (this.deckInfoPanel) return true;

    if (this.utilityMenuPanel) return true;

    return this.bottomControlViews.some((control) => [control.backing, control.text]
      .some((item) => overObjects.includes(item) || this.isPointerInsideGameObject(pointer, item)));
  }

  getBoardCellFromPointerUp(pointer, currentlyOver = []) {
    const overObjects = this.normalizePointerUpObjects(currentlyOver);
    return this.boardCells.find((cell) => overObjects.includes(cell.background)
      || this.isPointerInsideGameObject(pointer, cell.background)) ?? null;
  }

  isBoardCellTapReservedForCardAction(boardIndex, selectedCard) {
    if (this.targetingState) {
      return this.isValidTarget(boardIndex, this.targetingState.targetType, this.targetingState.targetIndexes, this.targetingState.targetConstraint);
    }

    if (!this.isUnitCard(selectedCard)) {
      return true;
    }

    return canPlayOrRedeploy(this.gameState, 'player', selectedCard.id, boardIndex).ok;
  }

  clearHandCardSelection() {
    const hadState = Boolean(this.selectedCardId || this.targetingState || this.effectCastState || this.hoverInspectCardId || this.boardInspectIndex !== null);
    this.selectedCardId = null;
    this.targetingState = null;
    this.effectCastState = null;
    this.hoverInspectCardId = null;
    this.boardInspectIndex = null;
    if (hadState) {
      this.resetCardHighlights();
      this.updateActionButtonLabel();
    }
  }

  onBoardCellTap(boardIndex) {
    if (this.battleResultModalShown) {
      return;
    }

    if (this.isFlowResolving || this.isEffectCastResolving) {
      return;
    }

    if (this.playerActionUsed) {
      return;
    }

    if (!this.selectedCardId && !this.targetingState && !this.effectCastState) {
      const unit = this.gameState.board[boardIndex];

      if (this.pendingSwapIndex !== null) {
        this.hoverInspectCardId = null;
        this.clearBoardInspect({ animate: true });

        if (!unit || unit.owner !== 'player') {
          this.pendingSwapIndex = null;
          return;
        }

        const result = performSwap(this.gameState, 'player', this.pendingSwapIndex, boardIndex);
        this.pendingSwapIndex = null;

        if (!result.ok) {
          return;
        }

        this.completePlayerAction();
        return;
      }

      this.showBoardUnitInspect(boardIndex);
      return;
    }

    const selectedCard = this.getActivePlayerEffectCard()
      ?? this.gameState.player.hand.find((card) => card.id === this.selectedCardId);
    if (!selectedCard) return;

    if (this.targetingState) {
      if (!this.isValidTarget(boardIndex, this.targetingState.targetType, this.targetingState.targetIndexes, this.targetingState.targetConstraint)) {
        return;
      }

      const targetIndexes = [...(this.targetingState.targetIndexes ?? [])];
      if (this.targetingState.requiredTargets > 1) {
        if (!targetIndexes.includes(boardIndex)) {
          targetIndexes.push(boardIndex);
        }
      } else {
        targetIndexes.splice(0, targetIndexes.length, boardIndex);
      }

      const beforeStats = this.effectCastState?.source === 'unit-on-play'
        ? this.effectCastState.beforeStats
        : this.captureBoardStats();
      const effectCardId = this.effectCastState?.cardId ?? this.selectedCardId;
      const result = this.effectCastState?.source === 'unit-on-play'
        ? resolveTargetedUnitOnPlayEffect(this.gameState, 'player', this.effectCastState.boardIndex, targetIndexes)
        : resolveTargetedEffectCard(this.gameState, 'player', effectCardId, boardIndex, targetIndexes);
      if (result.ok && (result.type === 'targeted-effect-pending' || result.type === 'unit-on-play-targeted-effect-pending')) {
        this.targetingState = {
          ...this.targetingState,
          targetIndexes,
        };
        this.resetCardHighlights();
        this.updateActionButtonLabel();
        this.showTargetingInstruction();
        return;
      }
      if (!result.ok) return;
      if (result.type === 'targeted-effect' && this.gameState.cancelEnemyOrderThisTurn?.enemy) {
        this.gameState.cancelEnemyOrderThisTurn.enemy = false;
        this.refreshAfterPlayerAction();
        return;
      }
      this.completePlayerAction(beforeStats);
      return;
    }

    if (!this.isUnitCard(selectedCard)) {
      this.startPlayerEffectCast(selectedCard);
      return;
    }

    const beforeStats = this.captureBoardStats();
    const result = playOrRedeployUnit(this.gameState, 'player', this.selectedCardId, boardIndex);
    if (!result.ok) {
      this.pendingSwapIndex = null;
      this.clearHandCardSelection();
      return;
    }

    if (result.type === 'play' && result.card?.effectId === 'swap_two_enemy_units') {
      this.startPlayerUnitOnPlayTargeting(result.card, boardIndex, beforeStats);
      return;
    }

    this.completePlayerAction(beforeStats);
  }


  getActivePlayerEffectCard() {
    if (this.effectCastState?.source === 'unit-on-play') {
      return this.effectCastState.card ?? null;
    }
    const cardId = this.effectCastState?.cardId;
    if (!cardId) return null;
    return this.gameState?.player?.hand?.find((card) => card.id === cardId) ?? null;
  }

  async startPlayerUnitOnPlayTargeting(card, boardIndex, beforeStats) {
    const targetingState = getTargetingStateForEffect(card?.effectId, card?.id);
    if (!targetingState) {
      this.completePlayerAction(beforeStats);
      return;
    }

    this.effectCastState = { source: 'unit-on-play', cardId: card.id, card, boardIndex, targetingState, beforeStats };
    this.selectedCardId = null;
    this.pendingSwapIndex = null;
    this.targetingState = null;
    this.hoverInspectCardId = null;
    this.boardInspectIndex = null;
    this.pressedHandCardId = null;
    this.destroySelectedHandCardZoom({ animate: true });
    this.destroyTargetingInstruction();
    this.updateActionButtonLabel();
    this.resetCardHighlights({ showPreview: false });

    this.isEffectCastResolving = true;
    this.showPlayerEffectConfirmation(card, { allowUnit: true });

    await Promise.all([
      this.playPlayerEffectCastFeedback(),
      this.delay(PLAYER_EFFECT_CAST_BEAT_MS),
    ]);

    if (!this.effectCastState || this.effectCastState.cardId !== card.id || this.effectCastState.source !== 'unit-on-play') {
      this.isEffectCastResolving = false;
      return;
    }

    this.targetingState = { ...targetingState, targetIndexes: [...(targetingState.targetIndexes ?? [])] };
    this.isEffectCastResolving = false;
    this.updateActionButtonLabel();
    this.resetCardHighlights({ showPreview: false });
    this.showTargetingInstruction();
  }

  async startPlayerEffectCast(card) {
    if (!card || this.isUnitCard(card) || this.isEffectCastResolving || this.playerActionUsed) return;

    const targetingState = this.getTargetingStateForCard(card);
    this.effectCastState = { cardId: card.id, targetingState };
    this.selectedCardId = null;
    this.pendingSwapIndex = null;
    this.targetingState = null;
    this.hoverInspectCardId = null;
    this.boardInspectIndex = null;
    this.pressedHandCardId = null;
    this.destroySelectedHandCardZoom({ animate: true });
    this.destroyTargetingInstruction();
    this.updateActionButtonLabel();
    this.resetCardHighlights({ showPreview: false });

    this.isEffectCastResolving = true;
    this.showPlayerEffectConfirmation(card);

    await Promise.all([
      this.playPlayerEffectCastFeedback(),
      this.delay(PLAYER_EFFECT_CAST_BEAT_MS),
    ]);

    if (!this.effectCastState || this.effectCastState.cardId !== card.id) {
      this.isEffectCastResolving = false;
      return;
    }

    if (targetingState) {
      this.targetingState = { ...targetingState, targetIndexes: [...(targetingState.targetIndexes ?? [])] };
      this.isEffectCastResolving = false;
      this.updateActionButtonLabel();
      this.resetCardHighlights({ showPreview: false });
      this.showTargetingInstruction();
      return;
    }

    if (this.gameState.cancelEnemyOrderThisTurn?.enemy) {
      this.gameState.cancelEnemyOrderThisTurn.enemy = false;
      this.isEffectCastResolving = false;
      this.refreshAfterPlayerAction();
      return;
    }

    const beforeStats = this.captureBoardStats();
    const result = playEffectCard(this.gameState, 'player', card.id);
    this.isEffectCastResolving = false;
    if (!result.ok) {
      this.effectCastState = null;
      this.resetCardHighlights({ showPreview: false });
      this.updateActionButtonLabel();
      return;
    }
    this.completePlayerAction(beforeStats);
  }


  async playPlayerEffectCastFeedback() {
    const middleCells = this.boardCells
      .filter((cell) => cell.row === 1 && cell.background?.active)
      .sort((a, b) => Math.abs(a.index - 4) - Math.abs(b.index - 4) || a.index - b.index);

    if (middleCells.length === 0) return;

    const animations = middleCells.map((cell, order) => new Promise((resolve) => {
      const background = cell.background;
      const previousStyle = {
        lineWidth: background.lineWidth ?? 2,
        strokeColor: background.strokeColor ?? 0x94a3b8,
        strokeAlpha: background.strokeAlpha ?? BOARD_GUIDE_SLOT_STROKE_ALPHA,
        fillColor: background.fillColor ?? 0x111827,
        fillAlpha: background.fillAlpha ?? BOARD_GUIDE_SLOT_FILL_ALPHA,
        scaleX: background.scaleX,
        scaleY: background.scaleY,
      };

      this.time.delayedCall(order * PLAYER_EFFECT_CAST_SWEEP_STEP_MS, () => {
        if (!background.active) {
          resolve();
          return;
        }
        background.setStrokeStyle(4, 0x38bdf8, 0.92);
        background.setFillStyle(0x0e7490, 0.18);
        this.tweens.add({
          targets: background,
          scaleX: previousStyle.scaleX * 1.045,
          scaleY: previousStyle.scaleY * 1.045,
          duration: 120,
          yoyo: true,
          repeat: 1,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            if (background.active) {
              background.setScale(previousStyle.scaleX, previousStyle.scaleY);
              background.setFillStyle(previousStyle.fillColor, previousStyle.fillAlpha);
              background.setStrokeStyle(previousStyle.lineWidth, previousStyle.strokeColor, previousStyle.strokeAlpha);
            }
            resolve();
          },
        });
      });
    }));

    await Promise.all(animations);
  }


  cancelEffectTargeting() {
    if (!this.targetingState && !this.effectCastState) return;
    const canceledUnitOnPlay = this.effectCastState?.source === 'unit-on-play';
    const beforeStats = this.effectCastState?.beforeStats;
    this.targetingState = null;
    this.effectCastState = null;
    this.pendingSwapIndex = null;
    this.hoverInspectCardId = null;
    this.boardInspectIndex = null;
    this.pressedHandCardId = null;
    this.destroyTargetingInstruction();
    this.destroySelectedHandCardZoom({ animate: true });
    this.updateActionButtonLabel();
    this.resetCardHighlights({ showPreview: false });
    if (canceledUnitOnPlay && !this.playerActionUsed && !this.isFlowResolving) {
      this.completePlayerAction(beforeStats);
    }
  }


  applyEnemyOpeningMulligan() {
    if (!this.gameState?.enemy) return;
    const selectedIds = selectOpeningMulliganCardIds(this.gameState.enemy);
    performOpeningMulligan(this.gameState, 'enemy', selectedIds);
  }

  toggleOpeningMulliganCard(cardId, { showPreview = true } = {}) {
    const card = this.gameState.player.hand.find((item) => item.id === cardId);
    if (!card) return;

    if (this.selectedMulliganCardIds.includes(cardId)) {
      this.selectedMulliganCardIds = this.selectedMulliganCardIds.filter((id) => id !== cardId);
    } else if (this.selectedMulliganCardIds.length < MAX_OPENING_MULLIGAN_CARDS) {
      this.selectedMulliganCardIds.push(cardId);
    }

    this.updateActionButtonLabel();
    this.resetCardHighlights({ showPreview });
  }

  confirmOpeningMulligan() {
    if (this.isFlowResolving) return;

    const selectedIds = [...this.selectedMulliganCardIds];
    const result = performOpeningMulligan(this.gameState, 'player', selectedIds);
    if (!result.ok) return;

    this.resetOpeningMulliganInputState();
    this.openingMulliganPending = false;
    this.redrawHand();
    this.updateActionButtonLabel();
    this.refreshDeckCounter();
    this.resetCardHighlights();
    this.startTurn();
  }

  resetOpeningMulliganInputState() {
    this.selectedMulliganCardIds = [];
    this.previewedMulliganCardId = null;
    this.selectedCardId = null;
    this.targetingState = null;
    this.effectCastState = null;
    this.isEffectCastResolving = false;
    this.pendingSwapIndex = null;
    this.hoverInspectCardId = null;
    this.boardInspectIndex = null;
    this.destroyTargetingInstruction();
    this.destroySelectedHandCardZoom({ animate: true });
  }

  updateActionButtonLabel() {
    if (!this.actionButton) return;
    if (this.openingMulliganPending) {
      const count = this.selectedMulliganCardIds.length;
      this.actionButton.setText(count > 0 ? translateActive('ui.battle.mulligan', 'MULLIGAN {count}', { count }) : translateActive('ui.battle.keepHand', 'KEEP HAND'));
      this.actionButton.setStyle({ backgroundColor: '#111827', color: '#f9fafb' });
      this.actionButton.setStroke('#64748b', 2);
      return;
    }
    if (this.targetingState) {
      const selectedCount = this.targetingState.targetIndexes?.length ?? 0;
      const minTargets = this.targetingState.minTargets ?? this.targetingState.requiredTargets ?? 1;
      if (selectedCount >= minTargets) {
        this.actionButton.setText(translateActive('ui.common.confirm', 'CONFIRM'));
      } else {
        this.actionButton.setText(translateActive('ui.common.cancel', 'CANCEL'));
      }
      this.actionButton.setStyle({ backgroundColor: '#164e63', color: '#ecfeff' });
      this.actionButton.setStroke('#22d3ee', 2);
      return;
    }
    this.actionButton.setText(translateActive('ui.common.pass', 'PASS'));
    this.actionButton.setStyle({ backgroundColor: '#111827', color: '#f9fafb' });
    this.actionButton.setStroke('#64748b', 2);
  }

  confirmTargetingSelection() {
    if (this.battleResultModalShown || this.isFlowResolving || this.playerActionUsed) return;
    const selectedCard = this.getActivePlayerEffectCard()
      ?? this.gameState.player.hand.find((card) => card.id === this.selectedCardId);
    if (!selectedCard || !this.targetingState) {
      this.clearHandCardSelection();
      return;
    }

    const targetIndexes = [...(this.targetingState.targetIndexes ?? [])];
    const minTargets = this.targetingState.minTargets ?? this.targetingState.requiredTargets ?? 1;
    if (targetIndexes.length < minTargets) {
      this.cancelEffectTargeting();
      return;
    }

    const beforeStats = this.effectCastState?.source === 'unit-on-play'
      ? this.effectCastState.beforeStats
      : this.captureBoardStats();
    const effectCardId = this.effectCastState?.cardId ?? this.selectedCardId;
    const result = this.effectCastState?.source === 'unit-on-play'
      ? resolveTargetedUnitOnPlayEffect(this.gameState, 'player', this.effectCastState.boardIndex, targetIndexes)
      : resolveTargetedEffectCard(this.gameState, 'player', effectCardId, targetIndexes[0], targetIndexes);
    if (!result.ok || result.type === 'targeted-effect-pending' || result.type === 'unit-on-play-targeted-effect-pending') return;
    if (result.type === 'targeted-effect' && this.gameState.cancelEnemyOrderThisTurn?.enemy) {
      this.gameState.cancelEnemyOrderThisTurn.enemy = false;
      this.refreshAfterPlayerAction();
      return;
    }
    this.showPlayerEffectConfirmation(selectedCard);
    this.completePlayerAction(beforeStats);
  }

  resolvePassTurn() {
    if (this.battleResultModalShown || this.isFlowResolving || this.isEffectCastResolving || this.targetingState) return;
    if (this.gameState.winner || !canPass(this.gameState) || this.playerActionUsed) return;
    recordPassAction(this.gameState, 'player');
    this.completePlayerAction();
  }

  startTurn() {
    if (!this.gameState || this.gameState.winner) {
      this.updateInitiativeIndicator();
      this.scheduleBattleResultModal();
      return;
    }

    resolveImmediateNoProgressWinner(this.gameState);
    if (this.gameState.winner) {
      this.updateInitiativeIndicator();
      this.scheduleBattleResultModal();
      return;
    }

    this.playerActionUsed = false;
    this.enemyActionUsed = false;
    this.selectedCardId = null;
    this.pendingSwapIndex = null;
    this.targetingState = null;
    this.effectCastState = null;
    this.isEffectCastResolving = false;
    this.hoverInspectCardId = null;
    this.boardInspectIndex = null;
    this.destroyTargetingInstruction();
    this.destroySelectedHandCardZoom({ animate: true });
    this.updateInitiativeIndicator();
    this.updateActionButtonLabel();

    if (this.gameState.firstActor === 'enemy') {
      this.resolveEnemyFirstTurnOpening();
    }
  }

  async completePlayerAction(beforeStats = null) {
    if (!this.gameState || this.playerActionUsed || this.isFlowResolving) return;

    this.playerActionUsed = true;
    this.isFlowResolving = true;
    this.refreshAfterPlayerAction();
    await this.playBuffFeedback(beforeStats, 'player');
    if (this.gameState.winner) {
      this.completeBattleFlow(500);
      return;
    }
    this.isFlowResolving = false;
    this.finishTurnAfterBothActions();
  }

  async resolveEnemyFirstTurnOpening() {
    if (this.isFlowResolving || this.enemyActionUsed || !this.gameState || this.gameState.winner) return;

    this.isFlowResolving = true;
    await this.delay(650);
    await this.revealAndApplyEnemyAction();
    if (this.gameState.winner) {
      this.completeBattleFlow(500);
      return;
    }
    this.isFlowResolving = false;
    this.updateActionSlotBadge();
    this.resetCardHighlights();
  }

  async finishTurnAfterBothActions() {
    if (!this.gameState || this.gameState.winner) {
      this.updateInitiativeIndicator();
      this.scheduleBattleResultModal();
      return;
    }

    this.isFlowResolving = true;

    let enemyActionPacing = null;
    if (!this.enemyActionUsed) {
      await this.delay(650);
      enemyActionPacing = await this.revealAndApplyEnemyAction();
      if (this.gameState.winner) {
        this.completeBattleFlow(500);
        return;
      }
    }

    await this.delay(enemyActionPacing?.preCombatDelayMs ?? ENEMY_ACTION_PRE_COMBAT_DELAY_MS);
    const preCombatBoardSnapshot = this.captureBoardSnapshot();
    const combatEvents = resolveCombat(this.gameState);
    this.lastCombatEvents = combatEvents;
    if (combatEvents.length > 0) {
      console.debug('Combat feedback events', combatEvents);
    }
    await this.playCombatAnimations(combatEvents, preCombatBoardSnapshot);
    this.refreshBoardLabels();
    this.refreshHeroHP();

    this.gameState.turnsCompleted += 1;
    resolveImmediateNoProgressWinner(this.gameState);
    if (this.gameState.winner) {
      this.completeBattleFlow(500);
      return;
    }

    await this.delay(500);
    drawCards(this.gameState.player, 1);
    drawCards(this.gameState.enemy, 1);
    resolveImmediateNoProgressWinner(this.gameState);
    resolveTurnCapWinner(this.gameState, this.gameState.turnsCompleted);

    this.refreshBoardLabels();
    this.redrawHand();
    this.refreshHeroHP();
    this.refreshDeckCounter();
    this.resetCardHighlights();

    if (this.gameState.winner) {
      this.completeBattleFlow(500);
      return;
    }

    toggleFirstActor(this.gameState);
    this.isFlowResolving = false;
    this.startTurn();
  }

  updateInitiativeIndicator() {
    const active = this.gameState && !this.gameState.winner ? this.gameState.firstActor : null;
    const playerActive = active === 'player';
    const enemyActive = active === 'enemy';

    if (this.playerHeroPanel) {
      this.playerHeroPanel.setStrokeStyle(playerActive ? 4 : 2, playerActive ? 0xfacc15 : 0x60a5fa, playerActive ? HERO_PANEL_ACTIVE_STROKE_ALPHA : HERO_PANEL_STROKE_ALPHA);
      this.playerHeroPanel.setFillStyle(0x111827, playerActive ? HERO_PANEL_ACTIVE_FILL_ALPHA : HERO_PANEL_FILL_ALPHA);
    }
    if (this.enemyHeroPanel) {
      this.enemyHeroPanel.setStrokeStyle(enemyActive ? 4 : 2, enemyActive ? 0xfacc15 : 0xf87171, enemyActive ? HERO_PANEL_ACTIVE_STROKE_ALPHA : HERO_PANEL_STROKE_ALPHA);
      this.enemyHeroPanel.setFillStyle(0x111827, enemyActive ? HERO_PANEL_ACTIVE_FILL_ALPHA : HERO_PANEL_FILL_ALPHA);
    }
    if (this.playerInitiativeIcon) this.playerInitiativeIcon.setVisible(playerActive);
    if (this.enemyInitiativeIcon) this.enemyInitiativeIcon.setVisible(enemyActive);
    this.updateActionSlotBadge();
  }

  refreshAfterPlayerAction() {
    this.selectedCardId = null;
    this.pendingSwapIndex = null;
    this.targetingState = null;
    this.effectCastState = null;
    this.isEffectCastResolving = false;
    this.hoverInspectCardId = null;
    this.boardInspectIndex = null;
    this.destroyTargetingInstruction();
    this.destroySelectedHandCardZoom({ animate: true });
    this.refreshBoardLabels();
    this.redrawHand();
    this.refreshHeroHP();
    this.refreshDeckCounter();
    this.resetCardHighlights();
    this.updateActionSlotBadge();
    this.updateActionButtonLabel();
  }

  async revealAndApplyEnemyAction() {
    const action = chooseEnemyAction(this.gameState);
    const card = action.cardId ? this.gameState.enemy.hand.find((item) => item.id === action.cardId) : null;
    const pacing = this.getEnemyActionPacing(action);
    this.showEnemyActionBanner(this.getEnemyActionMessage(action, card), pacing);
    await this.delay(pacing.applyDelayMs);

    const beforeStats = this.captureBoardStats();
    this.enemyTakeAction(action);
    this.enemyActionUsed = true;
    this.refreshBoardLabels();
    this.redrawHand();
    this.refreshHeroHP();
    this.updateInitiativeIndicator();
    await this.playBuffFeedback(beforeStats, 'enemy');
    await this.delay(pacing.postActionDelayMs);
    return pacing;
  }

  getEnemyActionPacing(action) {
    if (!action || action.type === 'pass') return ENEMY_ACTION_PACING.pass;
    if (action.type === 'swap-units') return ENEMY_ACTION_PACING.reposition;
    if (action.type === 'play-unit') return ENEMY_ACTION_PACING.unit;
    if (action.type === 'play-effect' || action.type === 'play-targeted-effect') return ENEMY_ACTION_PACING.effect;
    return ENEMY_ACTION_PACING.pass;
  }

  getEnemyActionMessage(action, card) {
    if (!action || action.type === 'pass') return translateActive('ui.battle.enemyPass', 'ENEMY PASS');
    const cardName = getCardDisplayName(card, getActiveLocale()) ?? translateActive('ui.common.unknownCard', 'Unknown Card');
    if (action.type === 'play-unit') return `${translateActive('ui.battle.enemyPlays', 'ENEMY PLAYS')}\n${cardName}`;
    if (action.type === 'play-effect' || action.type === 'play-targeted-effect') {
      return `${translateActive('ui.battle.enemyPlays', 'ENEMY PLAYS')}\n${cardName}\n${this.getEnemyEffectSummary(card)}`;
    }
    if (action.type === 'swap-units') return translateActive('ui.battle.enemyRepositions', 'ENEMY REPOSITIONS');
    return translateActive('ui.battle.enemyAction', 'ENEMY ACTION');
  }

  getEnemyEffectSummary(card) {
    if (!card) return translateActive('ui.battle.effect', 'Effect');
    const override = ENEMY_EFFECT_SUMMARY_OVERRIDES[card.effectId];
    if (override) return translateActive(`ui.battle.effectSummaries.${card.effectId}`, override);

    const localizedTextShort = getCardTextShort(card, getActiveLocale());
    const textShort = typeof localizedTextShort === 'string' ? localizedTextShort.trim() : '';
    const cleaned = textShort
      .replace(/^On play:\s*/i, '')
      .replace(/^Pick ally:\s*/i, '')
      .replace(/\s+this turn\.?$/i, '')
      .replace(/\s+until combat ends\.?$/i, '')
      .replace(/\.$/, '');

    if (cleaned && cleaned.length <= ENEMY_EFFECT_SUMMARY_MAX_CHARS) return cleaned;
    if (!cleaned) return translateActive('ui.battle.effect', 'Effect');
    return `${cleaned.slice(0, ENEMY_EFFECT_SUMMARY_MAX_CHARS - 1).trimEnd()}…`;
  }

  enemyTakeAction(action = chooseEnemyAction(this.gameState)) {
    const cancelEnemyOrder = Boolean(this.gameState.cancelEnemyOrderThisTurn?.player);
    const isEnemyNonUnitAction = action.type === 'play-effect' || action.type === 'play-targeted-effect';

    if (cancelEnemyOrder && isEnemyNonUnitAction) {
      this.gameState.cancelEnemyOrderThisTurn.player = false;
      return { ok: true, type: 'cancelled' };
    }

    if (action.type === 'play-unit') {
      let result = playOrRedeployUnit(this.gameState, 'enemy', action.cardId, action.slotIndex);
      if (result.ok && Array.isArray(action.targetIndexes) && action.effectId === 'swap_two_enemy_units') {
        result = resolveTargetedUnitOnPlayEffect(this.gameState, 'enemy', action.slotIndex, action.targetIndexes);
      }
      if (result.ok) recordBattleActionUse(this.gameState, 'enemy', action);
      return result;
    }

    if (action.type === 'swap-units') {
      const result = performSwap(this.gameState, 'enemy', action.fromIndex, action.toIndex);
      if (result.ok) recordBattleActionUse(this.gameState, 'enemy', action);
      return result;
    }

    if (action.type === 'play-effect') {
      const result = playEffectCard(this.gameState, 'enemy', action.cardId);
      this.gameState.cancelEnemyOrderThisTurn.player = false;
      return result;
    }

    if (action.type === 'play-targeted-effect') {
      const result = resolveTargetedEffectCard(
        this.gameState,
        'enemy',
        action.cardId,
        action.targetIndex,
        action.targetIndexes ?? [action.targetIndex],
      );
      this.gameState.cancelEnemyOrderThisTurn.player = false;
      return result;
    }

    recordPassAction(this.gameState, 'enemy');
    return { ok: true, type: 'pass' };
  }

  delay(ms) {
    return new Promise((resolve) => {
      this.time.delayedCall(ms, resolve);
    });
  }


  getPlayerEffectConfirmationMessage(card) {
    const cardName = getCardDisplayName(card, getActiveLocale()) ?? translateActive('ui.common.unknownCard', 'Unknown Card');
    return `${translateActive('ui.battle.playerPlayed', 'YOU PLAYED')}\n${cardName}\n${this.getEnemyEffectSummary(card)}`;
  }

  showPlayerEffectConfirmation(card, options = {}) {
    if (!card || (this.isUnitCard(card) && !options.allowUnit)) return;
    this.destroyPlayerActionBanner();

    const { width, height, board } = this.layout;
    const maxWidth = board.width * 0.88;
    const fontSize = Math.min(18, Math.max(14, Math.floor(Math.max(board.cellWidth * 0.125, height * 0.016))));
    const targetY = board.centerY + board.cellHeight * 0.55;
    const startY = targetY + 5;
    this.playerActionBanner = this.add.text(width * 0.5, startY, this.getPlayerEffectConfirmationMessage(card), {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${fontSize}px`,
      color: '#dcfce7',
      backgroundColor: '#14532d',
      align: 'center',
      padding: { x: 14, y: 8 },
      wordWrap: { width: maxWidth },
    }).setOrigin(0.5).setDepth(219).setAlpha(0).setScale(0.98);

    const banner = this.playerActionBanner;
    this.tweens.add({
      targets: banner,
      alpha: 1,
      y: targetY,
      scaleX: 1,
      scaleY: 1,
      duration: PLAYER_EFFECT_CONFIRMATION_FADE_IN_MS,
      ease: 'Quad.easeOut',
    });

    this.playerActionBannerFadeOutEvent = this.time.delayedCall(
      PLAYER_EFFECT_CONFIRMATION_FADE_IN_MS + PLAYER_EFFECT_CONFIRMATION_HOLD_MS,
      () => {
        if (this.playerActionBanner !== banner) return;
        this.playerActionBannerFadeOutEvent = null;
        this.tweens.add({
          targets: banner,
          alpha: 0,
          y: targetY - 5,
          scaleX: 0.98,
          scaleY: 0.98,
          duration: PLAYER_EFFECT_CONFIRMATION_FADE_OUT_MS,
          ease: 'Quad.easeIn',
          onComplete: () => {
            if (this.playerActionBanner === banner) this.destroyPlayerActionBanner();
          },
        });
      },
    );
  }

  getTargetingInstructionMessage() {
    const state = this.targetingState;
    if (!state) return '';

    const selectedCount = state.targetIndexes?.length ?? 0;
    if (state.targetConstraint === 'adjacent-pair' && selectedCount > 0) {
      return translateActive('ui.battle.targeting.selectAdjacentEnemy', 'Select adjacent enemy');
    }
    if (state.requiredTargets > 1 && selectedCount === 0 && state.targetType === 'enemy-unit') {
      return translateActive('ui.battle.targeting.selectFirstEnemy', 'Select first enemy');
    }
    if (state.requiredTargets > 1 && selectedCount === 1 && state.targetType === 'enemy-unit') {
      return translateActive('ui.battle.targeting.selectSecondEnemy', 'Select second enemy');
    }
    if (state.targetType === 'enemy-unit') return translateActive('ui.battle.targeting.selectEnemy', 'Select enemy');
    if (state.targetType === 'friendly-unit') return translateActive('ui.battle.targeting.selectAlly', 'Select ally');
    if (state.targetType === 'any-unit') return translateActive('ui.battle.targeting.selectUnit', 'Select unit');
    return translateActive('ui.battle.targeting.selectUnit', 'Select unit');
  }

  showTargetingInstruction() {
    const message = this.getTargetingInstructionMessage();
    if (!message) {
      this.destroyTargetingInstruction();
      return;
    }

    if (this.targetingInstructionText?.active) {
      this.targetingInstructionText.setText(message);
      return;
    }

    const { width, height, board } = this.layout;
    const fontSize = Math.min(18, Math.max(13, Math.floor(Math.max(board.cellWidth * 0.12, height * 0.015))));
    this.targetingInstructionText = this.add.text(
      width * 0.5,
      board.centerY - board.cellHeight * 0.64,
      message,
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${fontSize}px`,
        color: '#e0f2fe',
        backgroundColor: '#0f172a',
        fontStyle: 'bold',
        align: 'center',
        padding: { x: 12, y: 7 },
      },
    ).setOrigin(0.5).setDepth(222).setAlpha(0.94);
  }

  showEnemyActionBanner(message, pacing = ENEMY_ACTION_PACING.unit) {
    this.destroyPlayerActionBanner();
    this.destroyEnemyActionBanner();

    const { width, height, board } = this.layout;
    const maxWidth = board.width * 0.94;
    const fontSize = Math.min(20, Math.max(15, Math.floor(Math.max(board.cellWidth * 0.14, height * 0.018))));
    const startY = board.centerY + 6;
    this.enemyActionBanner = this.add.text(width * 0.5, startY, message, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${fontSize}px`,
      color: '#fee2e2',
      backgroundColor: '#7f1d1d',
      align: 'center',
      padding: { x: 16, y: 9 },
      wordWrap: { width: maxWidth },
    }).setOrigin(0.5).setDepth(220).setAlpha(0).setScale(0.98);

    const banner = this.enemyActionBanner;
    this.tweens.add({
      targets: banner,
      alpha: 1,
      y: board.centerY,
      scaleX: 1,
      scaleY: 1,
      duration: ENEMY_ACTION_NOTIFICATION_FADE_IN_MS,
      ease: 'Quad.easeOut',
    });

    this.enemyActionBannerFadeOutEvent = this.time.delayedCall(
      ENEMY_ACTION_NOTIFICATION_FADE_IN_MS + pacing.bannerHoldMs,
      () => {
        if (this.enemyActionBanner !== banner) return;
        this.enemyActionBannerFadeOutEvent = null;
        this.tweens.add({
          targets: banner,
          alpha: 0,
          y: board.centerY - 6,
          scaleX: 0.98,
          scaleY: 0.98,
          duration: ENEMY_ACTION_NOTIFICATION_FADE_OUT_MS,
          ease: 'Quad.easeIn',
          onComplete: () => {
            if (this.enemyActionBanner === banner) this.destroyEnemyActionBanner();
          },
        });
      },
    );
  }

  destroyEnemyActionBanner() {
    if (this.enemyActionBannerFadeOutEvent) {
      this.enemyActionBannerFadeOutEvent.remove(false);
      this.enemyActionBannerFadeOutEvent = null;
    }
    if (!this.enemyActionBanner) return;
    this.tweens?.killTweensOf?.(this.enemyActionBanner);
    this.enemyActionBanner.destroy();
    this.enemyActionBanner = null;
  }


  destroyPlayerActionBanner() {
    if (this.playerActionBannerFadeOutEvent) {
      this.playerActionBannerFadeOutEvent.remove(false);
      this.playerActionBannerFadeOutEvent = null;
    }
    if (!this.playerActionBanner) return;
    this.tweens?.killTweensOf?.(this.playerActionBanner);
    this.playerActionBanner.destroy();
    this.playerActionBanner = null;
  }

  destroyTargetingInstruction() {
    if (!this.targetingInstructionText) return;
    this.tweens?.killTweensOf?.(this.targetingInstructionText);
    this.targetingInstructionText.destroy();
    this.targetingInstructionText = null;
  }


  captureBoardStats() {
    return this.gameState.board.map((unit) => (unit ? {
      owner: unit.owner,
      attack: getUnitAttack(unit),
      armor: getUnitArmor(unit),
    } : null));
  }

  captureBoardSnapshot() {
    return this.gameState.board.map((unit) => (unit ? { ...unit } : null));
  }

  getCellByIndex(index) {
    return this.boardCells.find((cell) => cell.index === index) ?? null;
  }

  getHeroPanel(side) {
    return side === 'player' ? this.playerHeroPanel : this.enemyHeroPanel;
  }

  async playBuffFeedback(beforeStats, owner) {
    if (!Array.isArray(beforeStats)) return;

    const feedback = [];
    this.gameState.board.forEach((unit, index) => {
      if (!unit || unit.owner !== owner) return;
      const before = beforeStats[index];
      if (!before || before.owner !== owner) return;
      const attackDelta = getUnitAttack(unit) - before.attack;
      const armorDelta = getUnitArmor(unit) - before.armor;
      const parts = [];
      if (attackDelta > 0) parts.push(`+${attackDelta} ATK`);
      if (armorDelta > 0) parts.push(`+${armorDelta} ARM`);
      if (parts.length === 0) return;
      feedback.push({ index, label: parts.join('\n') });
    });

    if (feedback.length === 0) return;
    this.refreshBoardLabels();

    const animations = feedback.map(({ index, label }) => {
      const cell = this.getCellByIndex(index);
      if (!cell) return Promise.resolve();
      cell.background.setStrokeStyle(4, 0x22c55e, BOARD_FEEDBACK_STROKE_ALPHA);
      const floating = this.add.text(cell.background.x, cell.background.y - this.layout.board.cellHeight * 0.34, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${Math.max(13, Math.floor(this.layout.board.cellWidth * 0.12))}px`,
        color: '#bbf7d0',
        fontStyle: 'bold',
        align: 'center',
      }).setOrigin(0.5).setDepth(230);

      return Promise.all([
        this.tweenToPromise({ targets: cell.label, scaleX: 1.12, scaleY: 1.12, duration: 160, yoyo: true, repeat: 1 }),
        this.tweenToPromise({ targets: floating, y: floating.y - 28, alpha: 0, duration: 760, ease: 'Cubic.easeOut' }),
      ]).then(() => floating.destroy());
    });

    await Promise.all(animations);
    this.resetCardHighlights();
  }

  tweenToPromise(config) {
    return new Promise((resolve) => {
      const targets = Array.isArray(config?.targets) ? config.targets.filter(Boolean) : [config?.targets].filter(Boolean);
      if (targets.length === 0) {
        resolve();
        return;
      }

      let resolved = false;
      const finish = (...args) => {
        if (resolved) return;
        resolved = true;
        resolve(...args);
      };

      this.tweens.add({
        ...config,
        targets,
        onComplete: (...args) => {
          if (typeof config.onComplete === 'function') config.onComplete(...args);
          finish();
        },
        onStop: (...args) => {
          if (typeof config.onStop === 'function') config.onStop(...args);
          finish();
        },
      });
    });
  }

  captureUnitVisualState(cell) {
    const label = cell?.label;
    if (!label) return null;

    return {
      label,
      x: label.x,
      y: label.y,
      scaleX: label.scaleX,
      scaleY: label.scaleY,
    };
  }

  restoreUnitVisualState(state) {
    if (!state?.label?.active) return;
    state.label.setPosition(state.x, state.y);
    state.label.setScale(state.scaleX, state.scaleY);
  }

  getUnitLungeTargets(cell) {
    return cell?.label ? [cell.label] : [];
  }

  prepareUnitLungeTargets(targets) {
    this.tweens?.killTweensOf?.(targets);
  }

  async playCombatAnimations(combatEvents, preCombatBoardSnapshot = null) {
    if (!Array.isArray(combatEvents) || combatEvents.length === 0) return;

    const eventsByLane = new Map();
    combatEvents.forEach((event) => {
      if (!eventsByLane.has(event.lane)) eventsByLane.set(event.lane, []);
      eventsByLane.get(event.lane).push(event);
    });

    for (const lane of [0, 1, 2]) {
      const laneEvents = eventsByLane.get(lane) ?? [];
      if (laneEvents.length === 0) continue;
      await this.playLaneCombatAnimation(lane, laneEvents, preCombatBoardSnapshot);
      await this.delay(320);
    }
  }

  async playLaneCombatAnimation(lane, laneEvents, preCombatBoardSnapshot = null) {
    const laneHighlight = this.highlightActiveLane(lane);
    const simultaneousClash = getLaneSimultaneousUnitClash(lane, laneEvents, preCombatBoardSnapshot);
    const clashEvents = new Set(simultaneousClash?.events ?? []);
    const lethalTargetIndexes = getLaneLethalTargetIndexes(laneEvents);

    try {
      if (simultaneousClash) {
        await this.animateSimultaneousUnitClash(simultaneousClash);
      }

      for (const event of laneEvents) {
        if (clashEvents.has(event)) continue;

        const attackerIndex = getCombatEventAttackerIndex(event);
        const attackerWasDefeatedInThisLane = Number.isInteger(attackerIndex) && lethalTargetIndexes.has(attackerIndex);
        if (attackerWasDefeatedInThisLane) {
          await this.playCombatEventFeedback([event]);
        } else if (event.targetType === 'hero') {
          await this.animateHeroStrike(event, preCombatBoardSnapshot);
        } else {
          await this.animateUnitAttackOnlyIfEventExists(event, preCombatBoardSnapshot);
        }
      }
    } finally {
      await laneHighlight?.clear?.();
    }
  }

  getCombatAttackerVisual(event, preCombatBoardSnapshot = null) {
    if (!event || !Number.isInteger(event.lane)) return null;
    if (!shouldAnimateCombatAttacker(event, preCombatBoardSnapshot)) return null;

    const attackerIndex = getCombatEventAttackerIndex(event);
    const cell = this.getCellByIndex(attackerIndex);
    if (!cell?.label || !cell?.background) return null;
    return { type: 'unit', index: attackerIndex, cell };
  }

  getCombatTargetVisual(event) {
    if (!event) return null;

    if (event.targetType === 'hero') {
      const hero = this.getHeroPanel(event.targetSide);
      if (!hero) return null;
      return { type: 'hero', side: event.targetSide, hero };
    }

    const targetIndex = this.getCombatEventTargetIndex(event);
    if (!Number.isInteger(targetIndex)) return null;

    const cell = this.getCellByIndex(targetIndex);
    if (!cell?.label || !cell?.background) return null;
    return { type: 'unit', index: targetIndex, cell };
  }

  getUnitLungeConfig(attackerCell, targetCell, meetAtMiddle = false) {
    const visualState = this.captureUnitVisualState(attackerCell);
    if (!visualState || !targetCell?.background) return null;

    const startY = visualState.y;
    const direction = targetCell.background.y > startY ? 1 : -1;
    const separation = Math.abs(targetCell.background.y - startY);
    const lungeDistance = Math.max(
      this.layout.board.cellHeight * 0.26,
      Math.min(separation * 0.5, this.layout.board.cellHeight * 0.56),
    );
    const midpointY = (attackerCell.background.y + targetCell.background.y) / 2;
    const strikeY = meetAtMiddle ? midpointY : startY + direction * lungeDistance;

    return {
      cell: attackerCell,
      startY,
      visualState,
      strikeY,
      targets: this.getUnitLungeTargets(attackerCell),
    };
  }

  async animateSimultaneousUnitClash(clash) {
    const lungeConfigs = (clash?.attackers ?? [])
      .map((attacker) => {
        const attackerCell = this.getCellByIndex(attacker.index);
        const targetIndex = getCombatEventTargetIndex(attacker.event);
        const targetCell = this.getCellByIndex(targetIndex);
        if (!attackerCell?.label || !attackerCell?.background || !targetCell?.background) return null;
        const lungeConfig = this.getUnitLungeConfig(attackerCell, targetCell, true);
        if (!lungeConfig) return null;
        return {
          ...lungeConfig,
          attackerIndex: attacker.index,
        };
      })
      .filter(Boolean);

    if (lungeConfigs.length === 0) {
      await this.playCombatEventFeedback(clash?.events ?? []);
      return;
    }

    try {
      lungeConfigs.forEach((config) => this.prepareUnitLungeTargets(config.targets));
      await Promise.all(lungeConfigs.map((config) => this.tweenToPromise({
        targets: config.targets,
        y: config.strikeY,
        duration: 145,
        ease: 'Quad.easeOut',
      })));

      await this.playCombatEventFeedback(clash.events);

      await Promise.all(lungeConfigs
        .filter((config) => !clash.lethalTargetIndexes?.has(config.attackerIndex))
        .map((config) => this.tweenToPromise({
          targets: config.targets,
          y: config.startY,
          duration: 135,
          ease: 'Quad.easeIn',
        })));
    } finally {
      lungeConfigs.forEach((config) => {
        this.restoreUnitVisualState(config.visualState);
      });
    }
  }

  async animateUnitAttackOnlyIfEventExists(event, preCombatBoardSnapshot = null) {
    const attacker = this.getCombatAttackerVisual(event, preCombatBoardSnapshot);
    const target = this.getCombatTargetVisual(event);
    if (!attacker || target?.type !== 'unit') {
      await this.playCombatEventFeedback([event]);
      return;
    }

    const attackerCell = attacker.cell;
    const targetCell = target.cell;
    const lungeConfig = this.getUnitLungeConfig(attackerCell, targetCell);
    if (!lungeConfig) {
      await this.playCombatEventFeedback([event]);
      return;
    }

    try {
      this.prepareUnitLungeTargets(lungeConfig.targets);
      await this.tweenToPromise({ targets: lungeConfig.targets, y: lungeConfig.strikeY, duration: 145, ease: 'Quad.easeOut' });
      await this.playCombatEventFeedback([event]);
      await this.tweenToPromise({ targets: lungeConfig.targets, y: lungeConfig.startY, duration: 135, ease: 'Quad.easeIn' });
    } finally {
      this.restoreUnitVisualState(lungeConfig.visualState);
    }
  }

  async animateHeroStrike(event, preCombatBoardSnapshot = null) {
    if (event.openLane) {
      await this.animateOpenLaneHeroStrike(event, preCombatBoardSnapshot);
      return;
    }

    const attacker = this.getCombatAttackerVisual(event, preCombatBoardSnapshot);
    if (!attacker) {
      await this.playCombatEventFeedback([event]);
      return;
    }

    const attackerCell = attacker.cell;
    const visualState = this.captureUnitVisualState(attackerCell);
    if (!visualState) {
      await this.playCombatEventFeedback([event]);
      return;
    }

    const startY = visualState.y;
    const direction = event.attackerSide === 'player' ? -1 : 1;
    const strikeY = startY + direction * Math.min(this.layout.board.cellHeight * 0.48, 90);
    const targets = this.getUnitLungeTargets(attackerCell);

    try {
      this.prepareUnitLungeTargets(targets);
      await this.tweenToPromise({ targets, y: strikeY, duration: 160, ease: 'Quad.easeOut' });
      await this.playCombatEventFeedback([event]);
      await this.tweenToPromise({ targets, y: startY, duration: 140, ease: 'Quad.easeIn' });
    } finally {
      this.restoreUnitVisualState(visualState);
    }
  }

  async animateOpenLaneHeroStrike(event, preCombatBoardSnapshot = null) {
    const attacker = this.getCombatAttackerVisual(event, preCombatBoardSnapshot);
    const target = this.getCombatTargetVisual(event);
    if (!attacker || target?.type !== 'hero') {
      await this.playCombatEventFeedback([event]);
      return;
    }

    const attackerCell = attacker.cell;
    const hero = target.hero;
    const visualState = this.captureUnitVisualState(attackerCell);
    if (!visualState) {
      await this.playCombatEventFeedback([event]);
      return;
    }

    const startY = visualState.y;
    const direction = event.attackerSide === 'player' ? -1 : 1;
    const heroEdgeY = event.targetSide === 'enemy'
      ? hero.y + hero.height * 0.5
      : hero.y - hero.height * 0.5;
    const heroMargin = Math.max(8, this.layout.board.cellHeight * 0.08);
    const panelConnectionY = heroEdgeY - direction * heroMargin;
    const fallbackDistance = Math.min(this.layout.board.cellHeight * 0.92, 150);
    const desiredY = Number.isFinite(panelConnectionY)
      ? panelConnectionY
      : startY + direction * fallbackDistance;
    const maxTravel = Math.max(this.layout.board.cellHeight * 0.62, fallbackDistance);
    const travel = Math.min(Math.abs(desiredY - startY), maxTravel);
    const strikeY = startY + direction * travel;
    const targets = this.getUnitLungeTargets(attackerCell);

    try {
      this.prepareUnitLungeTargets(targets);
      await this.tweenToPromise({ targets, y: strikeY, duration: 165, ease: 'Quad.easeOut' });
      await this.playCombatEventFeedback([event]);
      await this.tweenToPromise({ targets, y: startY, duration: 145, ease: 'Quad.easeIn' });
    } finally {
      this.restoreUnitVisualState(visualState);
    }
  }

  highlightActiveLane(lane) {
    const laneCells = this.boardCells.filter((cell) => cell.index % 3 === lane);
    if (laneCells.length === 0) return null;

    const previousStyles = laneCells.map((cell) => ({
      cell,
      lineWidth: cell.background.lineWidth ?? (cell.row === 1 ? 2 : 3),
      strokeColor: cell.background.strokeColor ?? (cell.row === 1 ? 0x94a3b8 : 0xcbd5e1),
      strokeAlpha: cell.background.strokeAlpha ?? (cell.row === 1 ? BOARD_GUIDE_SLOT_STROKE_ALPHA : BOARD_SLOT_STROKE_ALPHA),
    }));

    laneCells.forEach((cell) => {
      cell.background.setStrokeStyle(cell.row === 1 ? 3 : 4, 0xfacc15, cell.row === 1 ? BOARD_GUIDE_LANE_HIGHLIGHT_STROKE_ALPHA : BOARD_LANE_HIGHLIGHT_STROKE_ALPHA);
    });

    return {
      clear: async () => {
        await this.delay(90);
        previousStyles.forEach(({ cell, lineWidth, strokeColor, strokeAlpha }) => {
          if (!cell?.background?.active) return;
          cell.background.setStrokeStyle(lineWidth, strokeColor, strokeAlpha);
        });
      },
    };
  }

  async playCombatEventFeedback(events) {
    const feedback = events.map((event) => {
      if (event.targetType === 'hero') {
        this.showHeroDamage(event.targetSide, event.damage);
        return this.flashHeroHit(event.targetSide);
      }

      const targetIndex = this.getCombatEventTargetIndex(event);
      if (!Number.isInteger(targetIndex)) return Promise.resolve();

      const target = this.getCellByIndex(targetIndex);
      if (!target) return Promise.resolve();

      this.showUnitCombatText(target, event);
      const animations = [this.flashCellHit(target, event)];
      if (event.lethal) animations.push(this.playLethalFade(target));
      return Promise.all(animations);
    });

    await Promise.all(feedback);
  }

  getCombatEventTargetIndex(event) {
    return getCombatEventTargetIndex(event);
  }

  showHeroDamage(side, damage) {
    const hero = this.getHeroPanel(side);
    if (!hero) return;
    const isBlocked = damage <= 0;
    const damageText = this.add.text(hero.x + hero.width * 0.34, hero.y, isBlocked ? translateActive('ui.battle.block', 'BLOCK') : `-${damage}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: isBlocked ? '18px' : '22px',
      color: isBlocked ? '#bfdbfe' : '#fca5a5',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(240);
    this.tweens.add({ targets: hero, scaleX: 1.04, scaleY: 1.04, duration: 90, yoyo: true });
    this.tweens.add({ targets: damageText, y: damageText.y - 30, alpha: 0, duration: 720, onComplete: () => damageText.destroy() });
  }

  showUnitCombatText(target, event) {
    const isBlocked = event.damage <= 0;
    const damageText = this.add.text(target.background.x, target.background.y - this.layout.board.cellHeight * 0.14, isBlocked ? translateActive('ui.battle.block', 'BLOCK') : `-${event.damage}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(15, Math.floor(this.layout.board.cellWidth * (isBlocked ? 0.13 : 0.15)))}px`,
      color: isBlocked ? '#bfdbfe' : (event.lethal ? '#fecaca' : '#fde68a'),
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(240);
    this.tweens.add({ targets: damageText, y: damageText.y - 24, alpha: 0, duration: 650, ease: 'Cubic.easeOut', onComplete: () => damageText.destroy() });
  }

  async flashCellHit(cell, event) {
    if (!cell?.background || !cell?.label) return;

    const strokeColor = event.damage <= 0 ? 0x93c5fd : (event.lethal ? 0xfca5a5 : 0xfde68a);
    const previousStyle = {
      lineWidth: cell.background.lineWidth ?? (cell.row === 1 ? 2 : 3),
      strokeColor: cell.background.strokeColor ?? (cell.row === 1 ? 0x94a3b8 : 0xcbd5e1),
      strokeAlpha: cell.background.strokeAlpha ?? (cell.row === 1 ? BOARD_GUIDE_SLOT_STROKE_ALPHA : BOARD_SLOT_STROKE_ALPHA),
      labelScaleX: cell.label.scaleX,
      labelScaleY: cell.label.scaleY,
    };

    cell.background.setStrokeStyle(4, strokeColor, BOARD_FEEDBACK_STROKE_ALPHA);
    await this.tweenToPromise({ targets: cell.label, scaleX: 1.1, scaleY: 1.1, duration: 55, yoyo: true });
    cell.background.setStrokeStyle(previousStyle.lineWidth, previousStyle.strokeColor, previousStyle.strokeAlpha);
    cell.label.setScale(previousStyle.labelScaleX, previousStyle.labelScaleY);
  }

  async flashHeroHit(side) {
    const hero = this.getHeroPanel(side);
    if (!hero) return;

    const previousStyle = {
      lineWidth: hero.lineWidth ?? 2,
      strokeColor: hero.strokeColor ?? (side === 'player' ? 0x60a5fa : 0xf87171),
      strokeAlpha: hero.strokeAlpha ?? HERO_PANEL_STROKE_ALPHA,
      fillColor: hero.fillColor ?? 0x111827,
      fillAlpha: hero.fillAlpha ?? HERO_PANEL_FILL_ALPHA,
    };

    hero.setFillStyle(0x7f1d1d, Math.max(previousStyle.fillAlpha, HERO_PANEL_HIT_FILL_ALPHA));
    hero.setStrokeStyle(Math.max(previousStyle.lineWidth, 3), 0xfca5a5, HERO_PANEL_HIT_STROKE_ALPHA);
    await this.delay(100);
    hero.setFillStyle(previousStyle.fillColor, previousStyle.fillAlpha);
    hero.setStrokeStyle(previousStyle.lineWidth, previousStyle.strokeColor, previousStyle.strokeAlpha);
  }

  async playLethalFade(cell) {
    if (!cell?.label) return;

    await this.delay(70);
    await this.tweenToPromise({
      targets: cell.label,
      alpha: 0.18,
      scaleX: 0.92,
      scaleY: 0.92,
      duration: 180,
      ease: 'Quad.easeIn',
    });
  }


  redrawHand() {
    this.cardViews.forEach((view) => {
      view.root?.destroy();
    });
    this.cardViews = [];
    this.drawHand();
  }

  getBoardUnitStats(unit) {
    if (!unit) return { attack: null, armor: null, health: null };

    return {
      attack: getUnitAttack(unit),
      armor: getUnitArmor(unit),
      health: Number.isFinite(unit.hp) ? unit.hp : 0,
    };
  }

  createBoardUnitNameText(x, y, width, height, name) {
    const text = String(name || translateActive('ui.common.unit', 'Unit'));
    const horizontalPadding = Math.max(6, Math.round(width * 0.06));
    const maxWidth = Math.max(1, width - horizontalPadding * 2);
    const maxHeight = Math.max(1, height - 4);
    const minFontSize = Math.max(8, Math.floor(height * 0.32));
    let fontSize = Math.max(10, Math.min(14, Math.floor(width * 0.105), Math.floor(height * 0.46)));
    const nameText = this.add.text(x, y, text, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${fontSize}px`,
      color: CARD_COLORS.ivoryText,
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: -2,
      wordWrap: { width: maxWidth, useAdvancedWrap: true },
      maxLines: 2,
    }).setOrigin(0.5);

    const fits = () => nameText.width <= maxWidth + 1 && nameText.height <= maxHeight + 1;
    while (!fits() && fontSize > minFontSize) {
      fontSize -= 1;
      nameText.setFontSize(fontSize);
    }

    if (!fits()) {
      const chars = [...text];
      for (let length = chars.length - 1; length > 1; length -= 1) {
        nameText.setText(`${chars.slice(0, length).join('').trimEnd()}…`);
        if (fits()) break;
      }
    }

    return nameText;
  }

  createBoardUnitView(cell, unit) {
    const { board } = this.layout;
    const unitWidth = Math.max(1, cell.background.width - 8);
    const unitHeight = Math.max(1, cell.background.height - 8);
    const pad = Math.max(5, Math.round(unitWidth * 0.06));
    const gap = Math.max(3, Math.round(unitHeight * 0.025));
    const statHeight = Math.max(22, Math.min(32, Math.round(unitHeight * 0.18)));
    const nameHeight = Math.max(18, Math.min(30, Math.round(unitHeight * 0.19)));
    const artWidth = Math.max(1, unitWidth - pad * 2);
    const artHeight = Math.max(1, unitHeight - pad * 2 - statHeight - nameHeight - gap * 2);
    const statY = -unitHeight / 2 + pad + statHeight / 2;
    const artY = statY + statHeight / 2 + gap + artHeight / 2;
    const nameY = artY + artHeight / 2 + gap + nameHeight / 2;
    const ownerAccent = unit.owner === 'enemy' ? 0xf87171 : 0x60a5fa;
    const displayName = getCardDisplayName(unit, getActiveLocale()) ?? translateActive('ui.common.unit', 'Unit');

    const cardBack = this.add.rectangle(0, 0, unitWidth, unitHeight, CARD_COLORS.frame, 0.72)
      .setStrokeStyle(2, ownerAccent, 0.62);
    const inner = this.add.rectangle(0, 0, unitWidth - pad, unitHeight - pad, CARD_COLORS.innerPanel, 0.32)
      .setStrokeStyle(1, 0xffffff, 0.045);
    const stats = createStatBadges(this, 0, statY, artWidth, statHeight, this.getBoardUnitStats(unit));
    const artBack = this.add.rectangle(0, artY, artWidth, artHeight, CARD_COLORS.artBottom, 0.96)
      .setStrokeStyle(1, 0x38bdf8, 0.12);
    const artShade = this.add.rectangle(0, artY - artHeight * 0.18, artWidth, artHeight * 0.48, CARD_COLORS.artTop, 0.46);
    const artGround = this.add.rectangle(0, artY + artHeight * 0.3, artWidth * 0.86, Math.max(1, board.cellHeight * 0.006), 0x67e8f9, 0.12);
    const namePanel = this.add.rectangle(0, nameY, artWidth, nameHeight, CARD_COLORS.namePanel, 0.9)
      .setStrokeStyle(1, ownerAccent, 0.34);
    const nameText = this.createBoardUnitNameText(0, nameY, artWidth, nameHeight, displayName);

    return [cardBack, inner, artBack, artShade, artGround, namePanel, nameText, stats];
  }

  refreshBoardLabels() {
    if (this.boardInspectIndex !== null && !this.gameState.board[this.boardInspectIndex]) {
      this.clearBoardInspect({ animate: true });
    }

    this.boardCells.forEach((cell) => {
      const unit = this.gameState.board[cell.index];
      cell.label.removeAll(true);
      cell.label.setAlpha(1).setScale(1);
      if (unit) {
        cell.label.add(this.createBoardUnitView(cell, unit));
      }
      if (cell.row === 2) {
        const lane = cell.index % 3;
        cell.blockedMarker.setText(this.gameState.playerLanePlayBlockedThisTurn?.[lane] ? '✕' : '');
      } else {
        cell.blockedMarker.setText('');
      }
    });
  }

  refreshHeroHP() {
    if (!this.enemyHpText || !this.playerHpText) {
      const { width, topHero, playerHero } = this.layout;
      this.enemyHpText = this.add.text(width * 0.5, topHero.centerY + topHero.h * 0.2, '', { fontFamily: 'Arial, sans-serif', fontSize: `${Math.max(18, Math.floor(topHero.h * 0.38))}px`, color: '#f8fafc', fontStyle: 'bold' }).setOrigin(0.5);
      this.playerHpText = this.add.text(width * 0.5, playerHero.centerY + playerHero.h * 0.2, '', { fontFamily: 'Arial, sans-serif', fontSize: `${Math.max(16, Math.floor(playerHero.h * 0.36))}px`, color: '#f8fafc', fontStyle: 'bold' }).setOrigin(0.5);
    }
    this.enemyHpText.setText(`${this.gameState.enemyHP} / 12`);
    this.playerHpText.setText(`${this.gameState.playerHP} / 12`);
  }


  destroySelectedHandCardZoom({ animate = false } = {}) {
    if (!this.selectedHandCardZoom) return;

    const inspect = this.selectedHandCardZoom;
    const items = [inspect.root, inspect.overlay, inspect.glow, inspect.background, inspect.label].filter(Boolean);
    this.tweens?.killTweensOf?.(items);
    this.selectedHandCardZoom = null;

    const destroyItems = () => {
      inspect.overlay?.removeAllListeners?.();
      inspect.overlay?.destroy?.();
      inspect.root?.destroy?.();
    };

    if (!animate || !inspect.root?.active) {
      this.restoreInspectDimming();
      destroyItems();
      return;
    }

    this.tweens.add({
      targets: inspect.root,
      x: inspect.sourceX,
      y: inspect.sourceY,
      scale: 0.96,
      alpha: 0,
      duration: INSPECT_CARD_TWEEN_OUT_MS,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.restoreInspectDimming();
        destroyItems();
      },
    });

    if (inspect.overlay?.active) {
      this.tweens.add({
        targets: inspect.overlay,
        alpha: 0,
        duration: INSPECT_CARD_TWEEN_OUT_MS,
        ease: 'Quad.easeIn',
      });
    }
  }

  getInspectCardTransform() {
    const { width, height, hand, margin, board, topHero, playerHero, action } = this.layout;
    const maxInspectWidth = Math.min(width * INSPECT_CARD_MAX_WIDTH_RATIO, width - margin * 2);
    const maxInspectHeight = Math.min(height * INSPECT_CARD_MAX_HEIGHT_RATIO, height - margin * 2);
    const targetScale = Math.min(
      INSPECT_CARD_TARGET_SCALE,
      maxInspectWidth / hand.cardWidth,
      maxInspectHeight / (hand.cardHeight * INSPECT_CARD_VERTICAL_COMPACT_RATIO),
    );
    const inspectWidth = hand.cardWidth * targetScale;
    const inspectHeight = hand.cardHeight * targetScale * INSPECT_CARD_VERTICAL_COMPACT_RATIO;
    const minX = margin + inspectWidth / 2;
    const maxX = width - margin - inspectWidth / 2;
    const minY = topHero.y + topHero.h + margin + inspectHeight / 2;

    const boardTopY = board.centerY - board.height / 2;
    const enemyRowBottomY = boardTopY + board.cellHeight;
    const playerRowTopY = boardTopY + board.cellHeight * 2;
    const playerRowGap = Math.max(10, Math.min(28, board.cellHeight * INSPECT_CARD_PLAYER_ROW_GAP_RATIO));
    const sharedLaneCenterY = (enemyRowBottomY + playerRowTopY) * 0.5;
    const targetY = sharedLaneCenterY + playerRowGap * 0.15;
    const boardBottomLimitY = boardTopY + board.cellHeight * INSPECT_CARD_PLAYER_ROW_BOTTOM_LIMIT_RATIO;
    const actionBottomLimitY = playerHero.y + playerHero.h + action.h * INSPECT_CARD_ACTION_BOTTOM_LIMIT_RATIO;
    const tacticalBottomLimitY = Math.min(boardBottomLimitY, actionBottomLimitY, height - margin);
    const maxY = Math.max(minY, tacticalBottomLimitY - inspectHeight / 2);

    return {
      x: Phaser.Math.Clamp(width * 0.5, minX, maxX),
      y: Phaser.Math.Clamp(targetY, minY, maxY),
      width: inspectWidth,
      height: inspectHeight,
    };
  }

  getCurrentInspectCardRequest() {
    const isMulliganPreview = this.openingMulliganPending;
    const handCardId = isMulliganPreview
      ? this.previewedMulliganCardId
      : (this.selectedCardId ?? this.hoverInspectCardId);

    if (handCardId) {
      const cardView = this.cardViews.find((view) => view.cardId === handCardId);
      const card = this.gameState.player.hand.find((item) => item.id === handCardId);
      if (cardView && card) {
        return {
          card,
          cardId: handCardId,
          sourceX: cardView.baseX,
          sourceY: cardView.baseY,
        };
      }
    }

    if (this.boardInspectIndex !== null) {
      const unit = this.gameState.board[this.boardInspectIndex];
      const cell = this.getCellByIndex(this.boardInspectIndex);
      if (unit && cell) {
        return {
          card: unit,
          cardId: unit.cardId ?? unit.id ?? `board-${this.boardInspectIndex}-unit`,
          sourceX: cell.background.x,
          sourceY: cell.background.y,
        };
      }
    }

    return null;
  }

  showSelectedHandCardZoom() {
    const inspectRequest = this.getCurrentInspectCardRequest();
    if (!inspectRequest) {
      this.destroySelectedHandCardZoom({ animate: true });
      return;
    }

    this.destroySelectedHandCardZoom();

    const { width, height } = this.layout;
    const transform = this.getInspectCardTransform();
    const accentColor = this.getHandCardAccentColor(inspectRequest.card);
    const overlay = this.add.rectangle(width * 0.5, height * 0.5, width, height, 0x000000, 0)
      .setDepth(INSPECT_CARD_OVERLAY_DEPTH);

    const previewView = this.createHandCardView({
      card: inspectRequest.card,
      cardId: inspectRequest.cardId,
      x: inspectRequest.sourceX,
      y: inspectRequest.sourceY,
      width: transform.width,
      height: transform.height,
      accentColor,
      depth: INSPECT_CARD_DEPTH,
      statBadgeScale: INSPECT_CARD_STAT_BADGE_SCALE,
      typographyScale: INSPECT_CARD_TYPOGRAPHY_SCALE,
      bodyLineSpacing: INSPECT_CARD_BODY_LINE_SPACING,
    });

    this.applyInspectDimming(inspectRequest.cardId);

    previewView.root.setAlpha(0).setScale(0.92);
    previewView.glow.setFillStyle(0xfacc15, 0.14);
    previewView.glow.setStrokeStyle(5, 0xfacc15, 0.72);
    previewView.background.setFillStyle(CARD_COLORS.frameSelected, 0.95);
    previewView.background.setStrokeStyle(5, accentColor, 1);
    previewView.selectionOutline?.setStrokeStyle(5, 0xfacc15, 0.92);

    this.tweens.add({
      targets: overlay,
      alpha: INSPECT_CARD_OVERLAY_ALPHA,
      duration: INSPECT_CARD_TWEEN_IN_MS,
      ease: 'Quad.easeOut',
    });
    this.tweens.add({
      targets: previewView.root,
      x: transform.x,
      y: transform.y,
      scale: 1,
      alpha: 1,
      duration: INSPECT_CARD_TWEEN_IN_MS,
      ease: 'Quad.easeOut',
    });

    this.selectedHandCardZoom = {
      ...previewView,
      overlay,
      sourceX: inspectRequest.sourceX,
      sourceY: inspectRequest.sourceY,
      previewItems: [previewView.root, overlay],
    };
  }

  applyInspectDimming(inspectCardId) {
    this.cardViews.forEach((card) => {
      const viewCard = this.gameState?.player?.hand?.find((item) => item.id === card.cardId);
      if (!viewCard) return;

      const isInspectedCard = card.cardId === inspectCardId;
      card.root.setAlpha(isInspectedCard ? 0.82 : HAND_CARD_INSPECT_DIM_ALPHA);
      card.root.setPosition(card.baseX, isInspectedCard ? card.baseY - HAND_CARD_SELECTED_LIFT_PX : card.baseY);
      card.root.setDepth(isInspectedCard ? HAND_CARD_SELECTED_DEPTH : card.baseDepth);
      card.selectionOutline?.setStrokeStyle(isInspectedCard ? 5 : 0, 0xfacc15, isInspectedCard ? 0.72 : 0);
    });
  }

  restoreInspectDimming() {
    this.resetCardHighlights({ showPreview: false });
  }

  resetCardHighlights({ showPreview = true } = {}) {
    this.cardViews.forEach((card) => {
      const isMulliganSelected = this.openingMulliganPending && this.selectedMulliganCardIds.includes(card.cardId);
      const isGameplaySelected = !this.openingMulliganPending && card.cardId === this.selectedCardId;
      const isHighlighted = isGameplaySelected || isMulliganSelected;
      const viewCard = this.gameState.player.hand.find((item) => item.id === card.cardId);
      const hasActiveHandCard = this.openingMulliganPending
        ? Boolean(this.previewedMulliganCardId || this.selectedMulliganCardIds.length > 0)
        : Boolean(this.selectedCardId || this.hoverInspectCardId);
      const isFocusedHandCard = Boolean(viewCard) && !this.openingMulliganPending && card.cardId === this.hoverInspectCardId;
      const isActiveHandCard = isHighlighted || isFocusedHandCard;
      const isDimmedByActiveCard = Boolean(viewCard) && hasActiveHandCard && !isActiveHandCard;
      const allTargets = [card.root, card.glow, card.background, card.label, card.selectionOutline].filter(Boolean);

      const accentColor = this.getHandCardAccentColor(viewCard);

      this.tweens.killTweensOf(allTargets);
      card.background.setStrokeStyle(isActiveHandCard ? 5 : 3, isActiveHandCard ? 0xfacc15 : accentColor, isActiveHandCard ? 1 : viewCard ? 0.76 : 0.7);
      card.background.setFillStyle(isActiveHandCard ? CARD_COLORS.frameSelected : CARD_COLORS.frame, isActiveHandCard ? 0.95 : viewCard ? 0.74 : 0.48);
      card.glow.setStrokeStyle(isActiveHandCard ? 5 : 0, 0xfacc15, isActiveHandCard ? 0.65 : 0);
      card.glow.setFillStyle(0xfacc15, isActiveHandCard ? 0.12 : 0);
      card.selectionOutline?.setStrokeStyle(isActiveHandCard ? 5 : 0, 0xfacc15, isActiveHandCard ? 0.92 : 0);
      card.label.setFontSize(card.baseFontSize);
      card.label.setColor(viewCard ? CARD_COLORS.ivoryText : CARD_COLORS.mutedText);

      card.root.setAlpha(viewCard ? (isDimmedByActiveCard ? HAND_CARD_DIM_ALPHA : HAND_CARD_SELECTED_ALPHA) : 0.45);
      card.root.setPosition(card.baseX, isActiveHandCard ? card.baseY - HAND_CARD_SELECTED_LIFT_PX : card.baseY).setScale(1).setDepth(isActiveHandCard ? HAND_CARD_SELECTED_DEPTH : card.baseDepth);
    });

    if (showPreview) {
      this.showSelectedHandCardZoom();
    } else {
      this.destroySelectedHandCardZoom({ animate: true });
    }

    this.boardCells.forEach((cell) => {
      const selectedTargetIndexes = this.targetingState?.targetIndexes ?? [];
      const targetConstraint = this.targetingState?.targetConstraint ?? null;
      const isValidFriendlyTarget = this.isValidTarget(cell.index, 'friendly-unit', selectedTargetIndexes, targetConstraint);
      const isValidEnemyTarget = this.isValidTarget(cell.index, 'enemy-unit', selectedTargetIndexes, targetConstraint);
      const isValidAnyTarget = this.isValidTarget(cell.index, 'any-unit', selectedTargetIndexes, targetConstraint);
      const isSelectedTarget = selectedTargetIndexes.includes(cell.index);
      let strokeColor = cell.row === 1 ? 0x94a3b8 : 0xcbd5e1;
      let strokeAlpha = cell.row === 1 ? BOARD_GUIDE_SLOT_STROKE_ALPHA : BOARD_SLOT_STROKE_ALPHA;

      if (isSelectedTarget) {
        strokeColor = 0xfacc15;
        strokeAlpha = BOARD_TARGET_STROKE_ALPHA;
      } else if (this.targetingState?.targetType === 'friendly-unit' && isValidFriendlyTarget) {
        strokeColor = 0x22c55e;
        strokeAlpha = BOARD_TARGET_STROKE_ALPHA;
      } else if (this.targetingState?.targetType === 'enemy-unit' && isValidEnemyTarget) {
        strokeColor = 0xef4444;
        strokeAlpha = BOARD_TARGET_STROKE_ALPHA;
      } else if (this.targetingState?.targetType === 'any-unit' && isValidAnyTarget) {
        strokeColor = 0xa855f7;
        strokeAlpha = BOARD_TARGET_STROKE_ALPHA;
      }
      cell.background.setStrokeStyle(cell.row === 1 ? 2 : 3, strokeColor, strokeAlpha);
    });
  }

  isUnitCard(card) {
    return card?.type === 'unit';
  }

  getTargetingStateForCard(card) {
    if (!card || this.isUnitCard(card)) return null;
    return getTargetingStateForEffect(card.effectId, card.id);
  }

  isValidTarget(boardIndex, targetType, selectedTargetIndexes = [], targetConstraint = null) {
    const unit = this.gameState.board[boardIndex];
    if (!unit) return false;
    if (selectedTargetIndexes.includes(boardIndex)) return false;
    if (targetConstraint === 'adjacent-pair' && selectedTargetIndexes.length > 0) {
      const firstSelectedIndex = selectedTargetIndexes[0];
      const firstSelectedUnit = this.gameState.board[firstSelectedIndex];
      if (!firstSelectedUnit) return false;
      if (Math.floor(firstSelectedIndex / 3) !== Math.floor(boardIndex / 3)) return false;
      if (Math.abs((firstSelectedIndex % 3) - (boardIndex % 3)) !== 1) return false;
    }
    if (targetType === 'friendly-unit') return unit.owner === 'player';
    if (targetType === 'enemy-unit') return unit.owner === 'enemy';
    if (targetType === 'any-unit') {
      const firstSelectedIndex = selectedTargetIndexes[0];
      const firstSelectedUnit = this.gameState.board[firstSelectedIndex];
      return !firstSelectedUnit || firstSelectedUnit.owner === unit.owner;
    }
    return false;
  }

}
