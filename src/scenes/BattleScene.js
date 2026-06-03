import Phaser from 'phaser';
import { getFactionByKey, getFactionKeys } from '../data/factions/index.js';
import { createInitialBattleState, drawCards, shuffleDeck, canPass, canPlayOrRedeploy, playEffectCard, playOrRedeployUnit, performSwap, resolveCombat, resolveTargetedEffectCard, resolveTargetedUnitOnPlayEffect, getUnitAttack, getUnitArmor, toggleFirstActor, resolveTurnCapWinner, resolveImmediateResourceExhaustionWinner, resolveImmediateNoProgressWinner, recordPassAction, performOpeningMulligan, STARTING_HAND_SIZE, MAX_OPENING_MULLIGAN_CARDS, getEffectiveBoardAttack, getEffectiveBoardArmor } from '../systems/GameState.js';
import { chooseEnemyAction, isVerySafeConcedableState, recordBattleActionUse, selectOpeningMulliganCardIds } from '../systems/enemyDecision.js';
import { getTargetingStateForEffect } from '../systems/cardTargeting.js';
import { COMBAT_ATTACK_PRESENTATIONS, getCombatAttackPresentation, getCombatEventAttackerIndex, getCombatEventInterceptOriginalTargetIndex, getCombatEventTargetIndex, getLaneLethalTargetIndexes, getLaneSimultaneousUnitClash, shouldAnimateCombatAttacker, shouldUseControlledHeroStrikePresentation } from '../systems/combatAnimation.js';
import { BATTLE_BACKGROUND_FALLBACK_COLOR, BATTLE_BACKGROUND_FALLBACK_COLOR_HEX, createCoverBackground, getBattleBackgroundAsset, hasLoadedImageAsset, preloadBattleBackgroundArt, preloadImageAsset, resolvePublicAssetPath } from '../rendering/backgroundArt.js';
import { preloadAllCardIllustrations } from '../rendering/cardIllustrationAssets.js';
import { calculateHandLayoutMetrics } from '../ui/handLayout.js';
import { calculateHandBackCardCoverCrop, calculateHandBackCardDepth, shouldRenderHandBackCard } from '../ui/handBackCardPresentation.js';
import { findHandCardFlipRevealSlots, startHandCardFlipReveal } from '../ui/handCardFlipReveal.js';
import { createFloatingControl, createMuteToggleControl, requestPortraitOrientationLock, toggleSceneFullscreen } from '../ui/navigationControls.js';
import { createModalBackButton } from '../ui/modalControls.js';
import { preloadSecondaryButtonAsset } from '../ui/imageButton.js';
import { formatDeckSummaryEntry } from '../rendering/cardRenderModes.js';
import { CARD_COLORS, createCardArtwork, createCardPreviewView, getBaseCardSurfaceTheme, getDefaultCardAccentColor, resolveCardSurfaceTheme, createStatBadges } from '../rendering/cardVisualLayout.js';
import { getCardDisplayName, getCardTextShort } from '../localization/cardDisplay.js';
import { getActiveLocale, translateActive } from '../localization/localeService.js';

const HAND_BACK_CARD_ASSET = Object.freeze({
  key: 'ui.card.back',
  path: resolvePublicAssetPath('assets/ui/card_back.webp'),
});

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
const BOARD_CARD_ARTWORK_PLAYER_CROP_POSITION_Y = 0.43;
const BOARD_CARD_ARTWORK_ENEMY_CROP_POSITION_Y = 0.57;
const BOARD_CARD_ART_HEIGHT_EXPANSION_PX = 10;
const HAND_CARD_LONG_PRESS_MS = 425;
const CARD_INSPECT_LONG_PRESS_MS = 350;
const BOARD_INSPECT_LONG_PRESS_MS = 350;
const PASS_HOLD_TO_SURRENDER_MS = 425;
const ENEMY_ACTION_NOTIFICATION_FADE_IN_MS = 110;
const ENEMY_ACTION_NOTIFICATION_HOLD_MS = 800;
const ENEMY_ACTION_NOTIFICATION_FADE_OUT_MS = 140;
const ENEMY_ACTION_APPLY_DELAY_MS = 500;
const ENEMY_EFFECT_ACTION_APPLY_DELAY_MS = 750;
const ENEMY_EFFECT_ACTION_BANNER_HOLD_MS = 1020;
const ENEMY_ACTION_PRE_COMBAT_DELAY_MS = 400;
const PLAYER_EFFECT_CONFIRMATION_FADE_IN_MS = 90;
const PLAYER_EFFECT_CONFIRMATION_HOLD_MS = 840;
const PLAYER_EFFECT_CONFIRMATION_FADE_OUT_MS = 120;
const TURN_START_BANNER_FADE_IN_MS = 110;
const TURN_START_BANNER_HOLD_MS = 820;
const TURN_START_BANNER_FADE_OUT_MS = 140;
const PLAYER_EFFECT_CAST_BEAT_MS = 620;
const PLAYER_EFFECT_CAST_SWEEP_STEP_MS = 70;
const HERO_HIT_SHAKE_DURATION_MS = 100;
const HERO_HIT_SHAKE_OFFSET_PX = 3;
const HERO_HIT_SHAKE_COOLDOWN_MS = 80;
const EFFECT_CAST_SWEEP_STYLE = Object.freeze({
  player: Object.freeze({
    strokeColor: 0x38bdf8,
    strokeAlpha: 0.92,
    fillColor: 0x0e7490,
    fillAlpha: 0.18,
  }),
  enemy: Object.freeze({
    strokeColor: 0xef4444,
    strokeAlpha: 0.94,
    fillColor: 0x7f1d1d,
    fillAlpha: 0.22,
  }),
});
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
const BASE_CARD_SURFACE_THEME = getBaseCardSurfaceTheme();

export default class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
    this.selectedCardId = null;
    this.cardViews = [];
    this.handBackCards = [];
    this.handPanelViews = [];
    this.handCardFlipReveals = [];
    this.boardCells = [];
    this.pendingSwapIndex = null;
    this.playerActionUsed = false;
    this.enemyActionUsed = false;
    this.targetingState = null;
    this.effectCastState = null;
    this.isEffectCastResolving = false;
    this.targetingInstructionText = null;
    this.activeSelectionBanner = null;
    this.activeSelectionBannerOwner = null;
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
    this.pressedHandCardWasSelected = false;
    this.handCardLongPressEvent = null;
    this.longPressTriggeredCardId = null;
    this.boardCellLongPressEvent = null;
    this.pressedBoardCellIndex = null;
    this.boardLongPressTriggeredIndex = null;
    this.boardLongPressSuppressNextScenePointerUpIndex = null;
    this.boardPointerDownSelectedSwapSource = false;
    this.navigationInProgress = false;
    this.pointerInputGuardActive = false;
    this.pointerInputGuardEventId = null;
    this.heroHitShakeBySide = null;
    this.lastRenderedBoardStats = null;
    this.currentBoardRenderStats = null;
    this.turnStartBanner = null;
    this.turnStartBannerFadeOutEvent = null;
    this.deferredTransientBattleBanner = null;
    this.hasShownOpeningTurnStartBanner = false;
    this.playerConcedableHintState = { shownKey: null, stableChecks: 0, lastEligibleKey: null };
    this.passHoldToSurrenderEnabled = false;
    this.passHoldToSurrenderProgress = false;
    this.passHoldToSurrenderEvent = null;
  }

  preload() {
    preloadBattleBackgroundArt(this);
    preloadImageAsset(this, HAND_BACK_CARD_ASSET, {
      onError: (asset) => console.warn(`Hand back card failed to load: ${asset.path}`),
    });
    preloadSecondaryButtonAsset(this);
    preloadAllCardIllustrations(this);
  }

  init() {
    this.cleanupSceneObjects();
    this.resetRuntimeState();
  }

  resetRuntimeState() {
    this.selectedCardId = null;
    this.cardViews = [];
    this.handBackCards = [];
    this.handPanelViews = [];
    this.handCardFlipReveals = [];
    this.boardCells = [];
    this.pendingSwapIndex = null;
    this.playerActionUsed = false;
    this.enemyActionUsed = false;
    this.targetingState = null;
    this.effectCastState = null;
    this.isEffectCastResolving = false;
    this.targetingInstructionText = null;
    this.activeSelectionBanner = null;
    this.activeSelectionBannerOwner = null;
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
    this.pressedHandCardWasSelected = false;
    this.handCardLongPressEvent = null;
    this.longPressTriggeredCardId = null;
    this.boardCellLongPressEvent = null;
    this.pressedBoardCellIndex = null;
    this.boardLongPressTriggeredIndex = null;
    this.boardLongPressSuppressNextScenePointerUpIndex = null;
    this.boardPointerDownSelectedSwapSource = false;
    this.navigationInProgress = false;
    this.pointerInputGuardActive = false;
    this.pointerInputGuardEventId = null;
    this.heroHitShakeBySide = { player: { lastAt: 0 }, enemy: { lastAt: 0 } };
    this.lastRenderedBoardStats = null;
    this.currentBoardRenderStats = null;
    this.turnStartBanner = null;
    this.turnStartBannerFadeOutEvent = null;
    this.deferredTransientBattleBanner = null;
    this.hasShownOpeningTurnStartBanner = false;
    this.playerConcedableHintState = { shownKey: null, stableChecks: 0, lastEligibleKey: null };
    this.passHoldToSurrenderEnabled = false;
    this.passHoldToSurrenderProgress = false;
    this.passHoldToSurrenderEvent = null;
  }

  cleanupSceneObjects({ preserveTimers = false, preserveTweens = false } = {}) {
    this.deferredTransientBattleBanner = null;
    this.destroyEnemyActionBanner();
    this.destroyTurnStartBanner();
    this.destroyPlayerActionBanner();
    this.destroyTargetingInstruction();
    this.destroyActiveSelectionMessage();
    this.destroyBattleResultModal();
    this.destroyUtilityMenuPanel();
    this.destroyDeckInfoPanel();
    this.destroyDeckCounterView();
    this.destroySelectedHandCardZoom();
    this.cancelHandCardLongPress();
    this.cancelBoardCellLongPress();
    this.cancelPassHoldToSurrender();
    this.cleanupHandCardFlipReveals();
    this.clearHandPanelViews();
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
    this.handBackCards = [];
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
    this.input.on('pointerupoutside', this.onScenePointerUpOutside, this);
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
      (pointer, localX, localY, event) => {
        event?.stopPropagation?.();
        this.guardPointerEvent(pointer);
        this.toggleUtilityMenuPanel();
      },
      { fontScale: 0.5 },
    );

    this.bottomControlViews = [menu];
  }

  toggleUtilityMenuPanel() {
    if (this.navigationInProgress) return;

    if (this.utilityMenuPanel) {
      this.guardPointerEvent();
      this.destroyUtilityMenuPanel();
      return;
    }

    this.showUtilityMenuPanel();
  }

  showUtilityMenuPanel() {
    if (this.navigationInProgress) return;

    this.closeInspectPreview({ animate: false });
    this.destroyUtilityMenuPanel();

    const { width, height, margin } = this.layout;
    const { x: triggerX, y: triggerY, touchSize } = this.getActionRowUtilityMenuMetrics();
    const panelLeft = triggerX + touchSize / 2;
    const panelWidth = Math.min(236, width - margin - panelLeft);
    const panelHeight = 228;
    const panelTop = triggerY - touchSize / 2;
    const panelX = panelLeft + panelWidth / 2;
    const panelY = panelTop + panelHeight / 2;
    const rowY = panelTop + 28;
    const buttonWidth = panelWidth - 28;
    const buttonHeight = 36;
    const buttonX = panelX;
    const firstButtonY = rowY + 42;
    const buttonGap = 42;
    const depth = 720;

    const outsideCatcher = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.001)
      .setInteractive()
      .setDepth(depth);
    outsideCatcher.on('pointerup', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
      this.guardPointerEvent(pointer);
      this.destroyUtilityMenuPanel();
    });

    const triggerControl = createFloatingControl(this, triggerX, triggerY, touchSize, '☰', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
      this.guardPointerEvent(pointer);
      this.destroyUtilityMenuPanel();
    }, { fontScale: 0.5 });

    const glow = this.add.rectangle(panelX, panelY + 4, panelWidth + 8, panelHeight + 8, 0x38bdf8, 0.08)
      .setStrokeStyle(1, 0x38bdf8, 0.12)
      .setDepth(depth + 1);
    const panel = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x020617, 0.9)
      .setStrokeStyle(1, 0x7dd3fc, 0.72)
      .setDepth(depth + 2)
      .setInteractive();
    panel.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
    });
    panel.on('pointerup', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
      this.guardPointerEvent(pointer);
    });
    const muteToggle = createMuteToggleControl(this, panelX - 28, rowY, 42, { depth: depth + 3 });
    const fullscreenToggle = createFloatingControl(this, panelX + 28, rowY, 42, '⛶', () => {
      this.toggleFullscreen();
    }, { fontScale: 0.48 });

    [triggerControl, fullscreenToggle, muteToggle].forEach((control) => {
      [control.halo, control.backing, control.text, control.button, control.icon].filter(Boolean).forEach((item) => {
        item.setDepth?.(depth + 3);
      });
    });

    const buttons = [
      this.createUtilityMenuButton(buttonX, firstButtonY, buttonWidth, buttonHeight, translateActive('ui.battle.utilityMenuRules', 'Rules'), () => this.openRulesPanel()),
      this.createUtilityMenuButton(buttonX, firstButtonY + buttonGap, buttonWidth, buttonHeight, translateActive('ui.battle.utilityMenuSettings', 'Settings'), () => this.openSettingsScene()),
      this.createUtilityMenuButton(buttonX, firstButtonY + buttonGap * 2, buttonWidth, buttonHeight, translateActive('ui.battle.utilityMenuReturn', 'Return'), () => this.exitBattleToFactionSelect()),
      this.createUtilityMenuButton(buttonX, firstButtonY + buttonGap * 3, buttonWidth, buttonHeight, translateActive('ui.battle.utilityMenuMainMenu', 'Main Menu'), () => this.exitBattleToMainMenu()),
    ];

    buttons.forEach((button) => {
      [button.background, button.text].forEach((item) => item.setDepth(depth + 3));
    });

    this.utilityMenuPanel = {
      outsideCatcher,
      glow,
      panel,
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
      this.guardPointerEvent(pointer);
      if (this.navigationInProgress) return;
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

    const { outsideCatcher, glow, panel, triggerControl, fullscreenToggle, muteToggle, buttons } = this.utilityMenuPanel;
    const items = [
      outsideCatcher,
      glow,
      panel,
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

  guardPointerEvent(pointer = null) {
    this.pointerInputGuardActive = true;
    this.pointerInputGuardEventId = pointer?.id ?? pointer?.pointerId ?? null;
    this.time?.delayedCall?.(0, () => this.clearPointerInputGuard());
  }

  clearPointerInputGuard() {
    this.pointerInputGuardActive = false;
    this.pointerInputGuardEventId = null;
  }

  isPointerEventGuarded(pointer = null) {
    if (!this.pointerInputGuardActive) return false;
    const pointerId = pointer?.id ?? pointer?.pointerId ?? null;
    return this.pointerInputGuardEventId === null || pointerId === null || pointerId === this.pointerInputGuardEventId;
  }

  closeInspectPreview({ animate = false, clearSelection = false } = {}) {
    this.cancelHandCardLongPress();
    this.cancelBoardCellLongPress();
    this.hoverInspectCardId = null;
    this.boardInspectIndex = null;
    this.previewedMulliganCardId = null;
    this.pressedHandCardId = null;
    this.pressedHandCardWasSelected = false;
    this.longPressTriggeredCardId = null;
    this.pressedBoardCellIndex = null;
    this.boardLongPressTriggeredIndex = null;
    this.boardLongPressSuppressNextScenePointerUpIndex = null;

    if (clearSelection) {
      this.selectedCardId = null;
      this.pendingSwapIndex = null;
      this.targetingState = null;
      this.effectCastState = null;
      this.isEffectCastResolving = false;
      this.destroyActiveSelectionMessage();
    }

    this.destroySelectedHandCardZoom({ animate });
    this.resetCardHighlights({ showPreview: false });
    this.updateActionButtonLabel?.();
  }

  prepareUtilityMenuNavigation({ includeBattleResultModal = false, preserveBattleFlow = false } = {}) {
    if (this.navigationInProgress) return false;
    if (this.effectCastState?.source === 'unit-on-play') {
      this.cancelEffectTargeting();
      return false;
    }

    this.navigationInProgress = true;
    this.guardPointerEvent();
    this.closeInspectPreview({ animate: false, clearSelection: true });
    this.destroyUtilityMenuPanel();
    this.destroyDeckInfoPanel();

    if (includeBattleResultModal) {
      this.destroyBattleResultModal();
    }

    if (!preserveBattleFlow) {
      this.isFlowResolving = false;
      this.openingMulliganPending = false;
    }
    return true;
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
    this.destroyActiveSelectionMessage();
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
    if (!this.prepareUtilityMenuNavigation({ includeBattleResultModal: true })) return;
    this.scene.start('FactionSelectScene');
  }

  openRulesPanel() {
    if (!this.prepareUtilityMenuNavigation()) return;
    this.scene.launch('RulesPanelScene', { returnSceneKey: 'BattleScene' });
    this.scene.pause();
  }

  openBattleMenu() {
    if (!this.prepareUtilityMenuNavigation()) return;
    this.scene.launch('BattleMenuScene', { factionKey: this.factionKey, returnSceneKey: 'BattleScene' });
    this.scene.pause();
  }

  resumeFromRulesPanel() {
    this.navigationInProgress = false;
    this.clearPointerInputGuard();
    this.scene.resume();
    this.recoverFromLifecycle('rules-panel-return');
  }

  resumeFromBattleMenu() {
    this.navigationInProgress = false;
    this.clearPointerInputGuard();
    this.scene.resume();
    this.recoverFromLifecycle('battle-menu-return');
  }

  resumeFromSettings() {
    this.navigationInProgress = false;
    this.clearPointerInputGuard();
    this.scene.resume();
    this.recoverFromLifecycle('settings-return');
  }

  openSettingsScene() {
    if (!this.prepareUtilityMenuNavigation({ preserveBattleFlow: true })) return;
    this.scene.launch('SettingsScene', { returnSceneKey: 'BattleScene' });
    this.scene.pause();
  }

  exitBattleToMainMenu() {
    if (!this.prepareUtilityMenuNavigation({ includeBattleResultModal: true })) return;
    this.scene.start('MainMenuScene');
  }

  retryBattle() {
    const factionKey = this.factionKey;
    const enemyFactionKey = this.enemyFactionKey;
    this.closeInspectPreview({ animate: false, clearSelection: true });
    this.destroyUtilityMenuPanel();
    this.destroyDeckInfoPanel();
    this.destroyBattleResultModal();
    this.isFlowResolving = false;
    this.selectedCardId = null;
    this.pendingSwapIndex = null;
    this.targetingState = null;
    this.effectCastState = null;
    this.isEffectCastResolving = false;
    this.destroyActiveSelectionMessage();
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
      'settings-return',
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
    this.restorePersistentBattleBanner();

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
    this.input.off('pointerupoutside', this.onScenePointerUpOutside, this);
    this.resetRuntimeState();
  }

  onScenePointerUpOutside() {
    // Phaser exposes pointerupoutside on the Scene Input Plugin, not individual Game Objects.
    // Keep interruption cleanup gesture-local: canceled releases must never fall through to tap behavior.
    this.cancelInterruptedPointerGesture();
  }

  cancelInterruptedPointerGesture() {
    this.cancelHandCardPressState();
    this.cancelBoardCellPressState();
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

        background.on('pointerdown', () => {
          this.onBoardCellPointerDown(boardIndex);
        });
        background.on('pointerup', (pointer) => {
          this.onBoardCellPointerUp(boardIndex, pointer);
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
    button.on('pointerdown', () => {
      this.onActionButtonPointerDown();
    });
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
    button.on('pointerout', () => {
      this.onActionButtonPointerCancel();
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
    if (this.effectCastState?.source === 'unit-on-play') {
      this.cancelEffectTargeting();
      return;
    }

    this.destroyDeckInfoPanel();
    this.selectedCardId = null;
    this.targetingState = null;
    this.effectCastState = null;
    this.isEffectCastResolving = false;
    this.pendingSwapIndex = null;
    this.destroyActiveSelectionMessage();
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

  clearHandPanelViews() {
    (this.handPanelViews ?? []).forEach((view) => {
      view?.destroy?.();
    });
    this.handPanelViews = [];
  }

  drawHand() {
    this.clearHandPanelViews();
    const { width, hand, margin } = this.layout;
    const centerY = hand.centerY;
    const cardBaseY = hand.cardCenterY;
    const controlDividerY = hand.y + hand.cardRowHeight;
    const handTrackLeft = hand.handTrackLeft + hand.cardWidth / 2;
    const handCount = this.gameState.player.hand.length;
    const deckCount = this.gameState.player.deck.length;
    const maxHandSize = this.gameState.player.maxHandSize;
    const hasHandBackCardAsset = hasLoadedImageAsset(this, HAND_BACK_CARD_ASSET);

    const background = this.add.rectangle(width * 0.5, centerY, width - margin * 2, hand.h, 0x0f172a, 0.2)
      .setStrokeStyle(1, 0x334155, 0.38);
    const topDivider = this.add.rectangle(width * 0.5, centerY - hand.h / 2, width - margin * 2, 1, 0x38bdf8, 0.16);
    const controlDivider = this.add.rectangle(width * 0.5, controlDividerY, width - margin * 2, 1, 0x38bdf8, 0.12);
    this.handPanelViews = [background, topDivider, controlDivider];

    this.gameState.player.hand.slice(0, hand.cardsVisible).forEach((card, index) => {
      const x = handTrackLeft + index * hand.step;
      const cardId = card.id;
      const baseY = cardBaseY;
      const cardView = this.createHandCardView({
        card,
        cardId,
        x,
        y: baseY,
        width: hand.cardWidth,
        height: hand.cardHeight,
        accentColor: this.getHandCardAccentColor(card),
        depth: 20 + index * 4,
        typographyScale: HAND_CARD_TYPOGRAPHY_SCALE,
        titleTypographyScale: HAND_CARD_TITLE_TYPOGRAPHY_SCALE,
        bodyLineSpacing: HAND_CARD_BODY_LINE_SPACING,
        enableCardIllustration: true,
        showCardNumber: true,
        factionThemeId: this.gameState?.player?.factionKey ?? this.factionKey,
      });

      cardView.background.setInteractive({ useHandCursor: true });
      cardView.background.on('pointerdown', () => {
        this.onCardPointerDown(cardId);
      });
      cardView.background.on('pointerup', (pointer) => {
        this.onCardPointerUp(cardId, pointer);
      });
      cardView.background.on('pointerover', () => {
        this.onHandCardPointerOver(cardId);
      });
      cardView.background.on('pointerout', () => {
        this.onHandCardPointerOut(cardId);
      });

      cardView.slotIndex = index;
      this.cardViews.push(cardView);
    });

    for (let index = handCount; index < hand.cardsVisible; index += 1) {
      if (!shouldRenderHandBackCard({ handCount, maxHandSize, deckCount, index }) || !hasHandBackCardAsset) continue;

      const backCard = this.createHandBackCardView({
        x: handTrackLeft + index * hand.step,
        y: cardBaseY,
        width: hand.cardWidth,
        height: hand.cardHeight,
        depth: calculateHandBackCardDepth({ backCardOrder: index - handCount }),
      });
      backCard.slotIndex = index;
      this.handBackCards.push(backCard);
    }
  }


  createHandBackCardView({ x, y, width, height, depth }) {
    const root = this.add.container(x, y).setDepth(depth);
    const background = this.add.rectangle(0, 0, width, height, 0x1f2937, 1);
    const image = this.add.image(0, 0, HAND_BACK_CARD_ASSET.key);
    const source = image.texture?.getSourceImage?.();
    const crop = calculateHandBackCardCoverCrop({
      sourceWidth: source?.width ?? image.width,
      sourceHeight: source?.height ?? image.height,
      width,
      height,
    });
    image.setDisplaySize(crop.displayWidth, crop.displayHeight);
    image.setOrigin(crop.originX, crop.originY);
    image.setCrop(crop.cropX, crop.cropY, crop.cropWidth, crop.cropHeight);
    const frame = this.add.rectangle(0, 0, width, height, 0x1f2937, 0)
      .setStrokeStyle(3, 0x94a3b8, 0.82);
    root.add([background, image, frame]);
    return root;
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
    enableCardIllustration = false,
    showCardNumber = false,
    statValues = null,
    baseStatValues = null,
    changedStats = [],
    pulseChangedStats = false,
    factionThemeId = '',
    surfaceThemeMode = 'board',
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
      enableCardIllustration,
      showCardNumber,
      statValues,
      baseStatValues,
      changedStats,
      pulseChangedStats,
      surfaceTheme: resolveCardSurfaceTheme({ factionId: factionThemeId, mode: surfaceThemeMode }),
      showNonUnitEffectStatSymbols: true,
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
    this.cancelHandCardPressState();
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
    if (this.openingMulliganPending || this.utilityMenuPanel || this.navigationInProgress || this.selectedCardId || this.targetingState || this.effectCastState || this.isEffectCastResolving || this.pressedHandCardId) return false;

    const unit = this.gameState?.board?.[boardIndex] ?? null;
    if (!unit) return false;

    this.hoverInspectCardId = null;
    this.boardInspectIndex = boardIndex;
    this.showSelectedHandCardZoom();
    return true;
  }

  onBoardCellPointerDown(boardIndex) {
    if (this.openingMulliganPending || this.utilityMenuPanel || this.navigationInProgress || this.pointerInputGuardActive) return;

    this.cancelBoardCellLongPress();
    this.pressedBoardCellIndex = boardIndex;
    this.boardLongPressTriggeredIndex = null;
    this.boardPointerDownSelectedSwapSource = false;
    this.trySelectImplicitSwapSourceOnPointerDown(boardIndex);
    this.startBoardCellLongPress(boardIndex);
  }

  startBoardCellLongPress(boardIndex) {
    this.cancelBoardCellLongPress();
    this.boardCellLongPressEvent = this.time.delayedCall(BOARD_INSPECT_LONG_PRESS_MS, () => {
      this.boardCellLongPressEvent = null;
      if (this.pressedBoardCellIndex !== boardIndex) return;
      if (this.openingMulliganPending || this.utilityMenuPanel || this.navigationInProgress || this.pointerInputGuardActive) return;
      if (this.battleResultModalShown || this.isFlowResolving || this.isEffectCastResolving || this.playerActionUsed) return;

      if (this.showBoardUnitInspect(boardIndex)) {
        this.boardLongPressSuppressNextScenePointerUpIndex = boardIndex;
        this.boardLongPressTriggeredIndex = boardIndex;
      }
    });
  }

  cancelBoardCellLongPress() {
    if (!this.boardCellLongPressEvent) return;
    this.boardCellLongPressEvent.remove(false);
    this.boardCellLongPressEvent = null;
  }

  cancelBoardCellPressState() {
    this.cancelBoardCellLongPress();
    this.pressedBoardCellIndex = null;
    this.boardLongPressTriggeredIndex = null;
    this.boardPointerDownSelectedSwapSource = false;
  }

  onBoardCellPointerUp(boardIndex, pointer) {
    if (pointer?.wasCanceled) {
      this.cancelBoardCellPressState();
      return;
    }

    if (this.openingMulliganPending) return;

    this.cancelBoardCellLongPress();

    if (this.pressedBoardCellIndex !== boardIndex) {
      return;
    }

    this.pressedBoardCellIndex = null;

    if (this.boardLongPressTriggeredIndex === boardIndex) {
      this.boardLongPressTriggeredIndex = null;
      this.boardPointerDownSelectedSwapSource = false;
      return;
    }

    if (this.boardPointerDownSelectedSwapSource && this.pendingSwapIndex === boardIndex) {
      this.boardLongPressTriggeredIndex = null;
      return;
    }

    this.boardLongPressTriggeredIndex = null;
    this.boardPointerDownSelectedSwapSource = false;
    this.onBoardCellTap(boardIndex);
  }

  onBoardCellPointerOut() {
    this.cancelBoardCellPressState();
  }

  trySelectImplicitSwapSourceOnPointerDown(boardIndex) {
    if (this.openingMulliganPending) return false;
    if (this.pendingSwapIndex !== null) return false;
    if (this.selectedCardId || this.targetingState || this.effectCastState) return false;
    if (this.battleResultModalShown || this.isFlowResolving || this.isEffectCastResolving || this.playerActionUsed) return false;

    const unit = this.gameState?.board?.[boardIndex] ?? null;
    if (!unit || unit.owner !== 'player') return false;

    this.pendingSwapIndex = boardIndex;
    this.showSwapPrompt('selectAdjacent');
    this.hoverInspectCardId = null;
    this.clearBoardInspect({ animate: true });
    this.resetCardHighlights({ showPreview: false });
    this.boardPointerDownSelectedSwapSource = true;
    return true;
  }

  onCardPointerDown(cardId) {
    if (this.utilityMenuPanel || this.navigationInProgress || this.pointerInputGuardActive) return;

    this.cancelHandCardLongPress();
    this.longPressTriggeredCardId = null;
    this.pressedBoardCellIndex = null;
    this.boardLongPressTriggeredIndex = null;
    this.pressedHandCardId = cardId;
    this.pressedHandCardWasSelected = this.selectedCardId === cardId;
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
      this.destroyActiveSelectionMessage();
      this.pendingSwapIndex = null;
      this.previewedMulliganCardId = null;
      this.pressedHandCardWasSelected = false;
      this.startHandCardLongPress(cardId);
      return;
    }

    if (this.playerActionUsed || this.isEffectCastResolving) {
      return;
    }

    if (this.targetingState) {
      if (this.selectedCardId === cardId) {
        this.startHandCardLongPress(cardId);
        return;
      }
      this.cancelEffectTargeting();
      if (this.playerActionUsed || this.isFlowResolving || this.isEffectCastResolving) {
        return;
      }
    }

    const card = this.gameState.player.hand.find((item) => item.id === cardId);
    if (!card) {
      this.clearHandCardSelection();
      return;
    }

    this.pendingSwapIndex = null;
    this.clearSwapPrompt();
    this.selectedCardId = cardId;
    const targetingState = this.isUnitCard(card) ? null : this.getTargetingStateForCard(card);
    if (targetingState) {
      this.beginPlayerTargetingSession(targetingState);
    } else {
      this.targetingState = null;
      this.resetCardHighlights({ showPreview: false });
      this.updateActionButtonLabel();
    }
    this.startHandCardLongPress(cardId);
  }

  startHandCardLongPress(cardId) {
    this.cancelHandCardLongPress();
    this.handCardLongPressEvent = this.time.delayedCall(CARD_INSPECT_LONG_PRESS_MS, () => {
      this.handCardLongPressEvent = null;
      if (this.pressedHandCardId !== cardId) return;
      if (this.utilityMenuPanel || this.navigationInProgress || this.pointerInputGuardActive) return;
      if (this.battleResultModalShown || this.isFlowResolving || this.playerActionUsed) return;

      const card = this.gameState?.player?.hand?.find((item) => item.id === cardId);
      if (!card) return;

      this.longPressTriggeredCardId = cardId;

      if (this.openingMulliganPending) {
        this.previewedMulliganCardId = cardId;
        this.hoverInspectCardId = null;
        this.boardInspectIndex = null;
        this.resetCardHighlights({ showPreview: true });
        return;
      }

      // Pointer-down keeps quick taps responsive, but a completed long press is inspect-only.
      // Preserve an active targeting session so dismissing Inspect returns to the same target
      // selection. Non-targeting cards still discard their provisional gameplay selection.
      const preserveTargetingSession = this.selectedCardId === cardId && Boolean(this.targetingState);
      if (!preserveTargetingSession) {
        this.selectedCardId = null;
        this.targetingState = null;
        this.effectCastState = null;
        this.destroyTargetingInstruction();
      }
      this.hoverInspectCardId = cardId;
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

  cancelHandCardPressState() {
    this.cancelHandCardLongPress();
    this.pressedHandCardId = null;
    this.pressedHandCardWasSelected = false;
    this.longPressTriggeredCardId = null;
  }

  onCardPointerUp(cardId, pointer) {
    if (pointer?.wasCanceled) {
      this.cancelHandCardPressState();
      return;
    }

    if (this.utilityMenuPanel || this.navigationInProgress || this.pointerInputGuardActive) {
      this.cancelHandCardLongPress();
      this.pressedHandCardId = null;
      this.pressedHandCardWasSelected = false;
      this.longPressTriggeredCardId = null;
    this.pressedBoardCellIndex = null;
    this.boardLongPressTriggeredIndex = null;
      return;
    }

    if (this.pressedHandCardId !== cardId) {
      return;
    }

    this.cancelHandCardLongPress();

    if (this.battleResultModalShown || this.isFlowResolving) {
      this.pressedHandCardId = null;
      this.pressedHandCardWasSelected = false;
      this.longPressTriggeredCardId = null;
    this.pressedBoardCellIndex = null;
    this.boardLongPressTriggeredIndex = null;
      return;
    }

    if (this.openingMulliganPending) {
      if (this.longPressTriggeredCardId === cardId) {
        this.pressedHandCardId = null;
        this.pressedHandCardWasSelected = false;
        this.longPressTriggeredCardId = null;
    this.pressedBoardCellIndex = null;
    this.boardLongPressTriggeredIndex = null;
        return;
      }

      this.previewedMulliganCardId = null;
      this.toggleOpeningMulliganCard(cardId, { showPreview: false });
      this.pressedHandCardId = null;
      this.pressedHandCardWasSelected = false;
      this.longPressTriggeredCardId = null;
    this.pressedBoardCellIndex = null;
    this.boardLongPressTriggeredIndex = null;
      return;
    }

    if (this.longPressTriggeredCardId === cardId) {
      this.pressedHandCardId = null;
      this.pressedHandCardWasSelected = false;
      this.longPressTriggeredCardId = null;
    this.pressedBoardCellIndex = null;
    this.boardLongPressTriggeredIndex = null;
      return;
    }

    if (this.pressedHandCardWasSelected && this.selectedCardId === cardId) {
      this.clearHandCardSelection();
      this.pressedHandCardId = null;
      this.pressedHandCardWasSelected = false;
      return;
    }

    this.resetCardHighlights({ showPreview: false });
    this.pressedHandCardId = null;
    this.pressedHandCardWasSelected = false;
  }

  onScenePointerUp(pointer, currentlyOver = []) {
    // Phaser routes mobile touchcancel through pointerup with wasCanceled set.
    if (pointer?.wasCanceled) {
      this.cancelInterruptedPointerGesture();
      return;
    }

    if (this.isPointerEventGuarded(pointer) || this.navigationInProgress) return;
    if (this.battleResultModalShown || this.isFlowResolving || this.isEffectCastResolving) return;

    if (this.openingMulliganPending) {
      // Mulligan owns hand exchange and inspect only; board gameplay stays isolated until confirmation.
      this.clearOpeningMulliganPreviewFromOutsideTap(pointer, currentlyOver);
      return;
    }

    const hasActiveBoardTapMode = this.pendingSwapIndex !== null;
    const isIdleBoardTapMode = !this.selectedCardId && !this.targetingState && !this.effectCastState && !hasActiveBoardTapMode;
    if (this.isPointerUpReservedForUi(pointer, currentlyOver)) return;

    const boardCell = this.getBoardCellFromPointerUp(pointer, currentlyOver);

    if (this.boardLongPressSuppressNextScenePointerUpIndex != null) {
      this.boardLongPressSuppressNextScenePointerUpIndex = null;
      return;
    }

    if (this.boardInspectIndex !== null && !boardCell && this.clearBoardInspectFromOutsideTap(pointer, currentlyOver)) {
      return;
    }

    if (boardCell && this.boardPointerDownSelectedSwapSource && this.pendingSwapIndex === boardCell.index) {
      this.pressedHandCardId = null;
      this.pressedHandCardWasSelected = false;
      this.boardPointerDownSelectedSwapSource = false;
      return;
    }
    if (isIdleBoardTapMode && !boardCell) {
      this.clearBoardInspectFromOutsideTap(pointer, currentlyOver);
      return;
    }

    if (this.pressedHandCardId) {
      this.cancelHandCardLongPress();
      this.pressedHandCardId = null;
      this.pressedHandCardWasSelected = false;
      return;
    }

    if (this.targetingState && this.isPointerInsideHandArea(pointer, currentlyOver)) {
      this.cancelEffectTargeting();
      return;
    }

    if (boardCell) {
      if (isIdleBoardTapMode) {
        this.pressedHandCardId = null;
        this.pressedHandCardWasSelected = false;
        this.onBoardCellTap(boardCell.index);
        return;
      }

      if (hasActiveBoardTapMode) {
        this.pressedHandCardId = null;
        this.pressedHandCardWasSelected = false;
        this.onBoardCellTap(boardCell.index);
        return;
      }

      const selectedCard = this.gameState.player.hand.find((card) => card.id === this.selectedCardId);
      if (!selectedCard && !this.effectCastState) {
        this.pressedHandCardId = null;
        this.pressedHandCardWasSelected = false;
        this.clearHandCardSelection();
        return;
      }

      if (this.isBoardCellTapReservedForCardAction(boardCell.index, selectedCard)) {
        this.pressedHandCardId = null;
        this.pressedHandCardWasSelected = false;
        this.onBoardCellTap(boardCell.index);
        return;
      }
      if (this.targetingState) {
        this.pressedHandCardId = null;
        this.pressedHandCardWasSelected = false;
        return;
      }
    }

    if (this.clearSelectedHandInspectFromOutsideTap(pointer, currentlyOver)) {
      this.pressedHandCardId = null;
      this.pressedHandCardWasSelected = false;
      return;
    }

    this.pressedHandCardId = null;
    this.pressedHandCardWasSelected = false;
    if (this.effectCastState?.source === 'unit-on-play') {
      this.cancelEffectTargeting();
      return;
    }
    this.clearHandCardSelection();
  }

  clearSelectedHandInspectFromOutsideTap(pointer, currentlyOver = []) {
    if (!this.selectedHandCardZoom || this.boardInspectIndex !== null) return false;
    if (this.isPointerInsideSelectedHandCardZoom(pointer, currentlyOver)) return false;

    this.hoverInspectCardId = null;
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

  isPointerInsideHandArea(pointer, currentlyOver = []) {
    const overObjects = this.normalizePointerUpObjects(currentlyOver);
    const handObjects = this.cardViews.flatMap((view) => [view.glow, view.background, view.label].filter(Boolean));

    if (handObjects.some((item) => overObjects.includes(item) || this.isPointerInsideGameObject(pointer, item))) {
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
    if (this.boardInspectIndex === null) return false;
    if (this.isPointerUpReservedForUi(pointer, currentlyOver)) return false;
    if (this.getBoardCellFromPointerUp(pointer, currentlyOver)) return false;
    if (this.isPointerInsideSelectedHandCardZoom(pointer, currentlyOver)) return false;

    this.clearBoardInspect({ animate: true });
    return true;
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
    this.pressedHandCardWasSelected = false;
    this.destroyTargetingInstruction();
    this.clearSwapPrompt();
    if (hadState) {
      this.resetCardHighlights();
      this.updateActionButtonLabel();
    }
  }

  onBoardCellTap(boardIndex) {
    // Board gameplay is intentionally unavailable while the opening mulligan owns input.
    if (this.openingMulliganPending || this.utilityMenuPanel || this.navigationInProgress || this.pointerInputGuardActive) {
      return;
    }

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
          this.clearSwapPrompt();
          this.resetCardHighlights({ showPreview: false });
          this.updateActionButtonLabel();
          return;
        }

        const beforeStats = this.captureBoardStats();
        const fromIndex = this.pendingSwapIndex;
        const result = performSwap(this.gameState, 'player', fromIndex, boardIndex);
        this.pendingSwapIndex = null;

        if (!result.ok) {
          this.clearSwapPrompt();
          this.resetCardHighlights({ showPreview: false });
          this.updateActionButtonLabel();
          return;
        }
        this.clearSwapPrompt();
        this.completePlayerAction(beforeStats, [], [{ type: 'swap', fromIndex, toIndex: boardIndex, label: 'SWAP', kind: 'swap' }]);
        return;
      }

      if (!unit || unit.owner !== 'player') return;
      if (!this.targetingState && !this.effectCastState) {
        this.pendingSwapIndex = boardIndex;
        this.showSwapPrompt('selectAdjacent');
        this.hoverInspectCardId = null;
        this.clearBoardInspect({ animate: true });
        this.resetCardHighlights({ showPreview: false });
        return;
      }

      return;
    }

    const selectedCard = this.getActivePlayerEffectCard()
      ?? this.gameState.player.hand.find((card) => card.id === this.selectedCardId);
    if (!selectedCard) return;

    if (this.targetingState) {
      const currentTargets = [...(this.targetingState.targetIndexes ?? [])];
      const alreadySelected = currentTargets.includes(boardIndex);
      if (alreadySelected) {
        const targetIndexes = currentTargets.filter((index) => index !== boardIndex);
        this.targetingState = {
          ...this.targetingState,
          targetIndexes,
        };
        this.resetCardHighlights({ showPreview: false });
        this.updateActionButtonLabel();
        this.showTargetingInstruction();
        return;
      }

      if (!this.isValidTarget(boardIndex, this.targetingState.targetType, this.targetingState.targetIndexes, this.targetingState.targetConstraint)) {
        return;
      }

      const targetIndexes = [...currentTargets];
      if (this.targetingState.requiredTargets > 1) {
        targetIndexes.push(boardIndex);
      } else {
        targetIndexes.splice(0, targetIndexes.length, boardIndex);
      }

      const minTargets = this.targetingState.minTargets ?? this.targetingState.requiredTargets ?? 1;
      const isExactTargetCount = minTargets === (this.targetingState.requiredTargets ?? minTargets);
      const canAutoCast = targetIndexes.length >= minTargets && isExactTargetCount;

      if (!canAutoCast) {
        this.targetingState = {
          ...this.targetingState,
          targetIndexes,
        };
        this.resetCardHighlights({ showPreview: false });
        this.updateActionButtonLabel();
        this.showTargetingInstruction();
        return;
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
        this.resetCardHighlights({ showPreview: false });
        this.updateActionButtonLabel();
        this.showTargetingInstruction();
        return;
      }
      if (!result.ok) return;
      if (result.type === 'targeted-effect' && this.gameState.cancelEnemyOrderThisTurn?.enemy) {
        this.gameState.cancelEnemyOrderThisTurn.enemy = false;
      }
      const movementFeedback = this.buildMovementFeedbackForAction({
        effectId: selectedCard.effectId,
        owner: 'player',
        targetIndexes,
        beforeSnapshot: beforeStats,
        result,
      });
      this.completePlayerAction(
        beforeStats,
        [...(result.feedback ?? []), ...this.buildActionFeedback(beforeStats, result)],
        movementFeedback,
        this.getImmediateCombatFeedback?.(result) ?? null,
      );
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

    // Controller play/redeploy explicitly enters manual unit-on-play targeting. Hacker lane behavior
    // remains automatic because it does not use the swap_two_enemy_units effect.
    if ((result.type === 'play' || result.type === 'redeploy') && result.card?.effectId === 'swap_two_enemy_units') {
      this.startPlayerUnitOnPlayTargeting(result.card, boardIndex, beforeStats);
      return;
    }

    this.completePlayerAction(beforeStats, this.buildActionFeedback(beforeStats, result));
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
    this.clearSwapPrompt();
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
      this.playEffectCastSweep({ side: 'player' }),
      this.delay(PLAYER_EFFECT_CAST_BEAT_MS),
    ]);

    if (!this.effectCastState || this.effectCastState.cardId !== card.id || this.effectCastState.source !== 'unit-on-play') {
      this.isEffectCastResolving = false;
      return;
    }

    this.isEffectCastResolving = false;
    this.beginPlayerTargetingSession(targetingState);
  }

  async startPlayerEffectCast(card) {
    if (!card || this.isUnitCard(card) || this.isEffectCastResolving || this.playerActionUsed) return;

    const targetingState = this.getTargetingStateForCard(card);
    this.effectCastState = { cardId: card.id, targetingState };
    this.selectedCardId = null;
    this.pendingSwapIndex = null;
    this.clearSwapPrompt();
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
      this.playEffectCastSweep({ side: 'player' }),
      this.delay(PLAYER_EFFECT_CAST_BEAT_MS),
    ]);

    if (!this.effectCastState || this.effectCastState.cardId !== card.id) {
      this.isEffectCastResolving = false;
      return;
    }

    if (targetingState) {
      this.isEffectCastResolving = false;
      this.beginPlayerTargetingSession(targetingState);
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
    if (result.type === 'effect' && this.gameState.cancelEnemyOrderThisTurn?.enemy) {
      this.gameState.cancelEnemyOrderThisTurn.enemy = false;
    }
    const movementFeedback = this.buildMovementFeedbackForAction({
      effectId: card.effectId,
      owner: 'player',
      beforeSnapshot: beforeStats,
      result,
    });
    this.completePlayerAction(beforeStats, this.buildActionFeedback(beforeStats, result), movementFeedback);
  }


  beginPlayerTargetingSession(targetingState) {
    if (!targetingState) return;
    this.targetingState = { ...targetingState, targetIndexes: [...(targetingState.targetIndexes ?? [])] };
    this.resetCardHighlights({ showPreview: false });
    this.updateActionButtonLabel();
    this.showTargetingInstruction();
  }


  async playEffectCastSweep({ side = 'player' } = {}) {
    const style = EFFECT_CAST_SWEEP_STYLE[side] ?? EFFECT_CAST_SWEEP_STYLE.player;
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
        background.setStrokeStyle(4, style.strokeColor, style.strokeAlpha);
        background.setFillStyle(style.fillColor, style.fillAlpha);
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
    this.pressedHandCardWasSelected = false;
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

  async confirmOpeningMulligan() {
    this.cancelPassHoldToSurrender();
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
    await this.showOpeningTurnStartBanner();
    this.startTurn();
  }

  resetOpeningMulliganInputState() {
    this.cancelHandCardLongPress();
    this.cancelBoardCellLongPress();
    this.selectedMulliganCardIds = [];
    this.previewedMulliganCardId = null;
    this.selectedCardId = null;
    this.targetingState = null;
    this.effectCastState = null;
    this.isEffectCastResolving = false;
    this.pendingSwapIndex = null;
    this.hoverInspectCardId = null;
    this.boardInspectIndex = null;
    this.pressedHandCardId = null;
    this.pressedHandCardWasSelected = false;
    this.longPressTriggeredCardId = null;
    this.pressedBoardCellIndex = null;
    this.boardLongPressTriggeredIndex = null;
    this.boardLongPressSuppressNextScenePointerUpIndex = null;
    this.boardPointerDownSelectedSwapSource = false;
    this.destroyActiveSelectionMessage();
    this.destroySelectedHandCardZoom({ animate: true });
  }

  isPassActionButtonAvailable() {
    return !this.battleResultModalShown
      && !this.gameState?.winner
      && !this.playerActionUsed
      && !this.openingMulliganPending
      && !this.targetingState
      && !this.isFlowResolving
      && !this.isEffectCastResolving
      && canPass(this.gameState);
  }

  updateActionButtonLabel() {
    if (!this.actionButton) return;
    if (this.openingMulliganPending) {
      const count = this.selectedMulliganCardIds.length;
      this.actionButton.setVisible(true);
      this.actionButton.setText(count > 0 ? translateActive('ui.battle.mulligan', 'MULLIGAN {count}', { count }) : translateActive('ui.battle.keepHand', 'KEEP HAND'));
      this.actionButton.setStyle({ backgroundColor: '#78350f', color: '#fffbeb' });
      this.actionButton.setStroke('#f59e0b', 2);
      this.passHoldToSurrenderEnabled = false;
      this.cancelPassHoldToSurrender();
      return;
    }
    if (this.targetingState) {
      const minTargets = this.targetingState.minTargets ?? this.targetingState.requiredTargets ?? 1;
      const requiredTargets = this.targetingState.requiredTargets ?? minTargets;
      const isExactTargetCount = minTargets === requiredTargets;
      if (isExactTargetCount) {
        this.actionButton.setVisible(false);
        return;
      }
      const selectedCount = this.targetingState.targetIndexes?.length ?? 0;
      this.actionButton.setVisible(true);
      if (selectedCount >= minTargets) {
        this.actionButton.setText(translateActive('ui.common.confirm', 'CONFIRM'));
      } else {
        this.actionButton.setText(translateActive('ui.battle.selectTarget', 'SELECT TARGET'));
      }
      this.actionButton.setStyle({ backgroundColor: '#312e81', color: '#ede9fe' });
      this.actionButton.setStroke('#a78bfa', 2);
      this.passHoldToSurrenderEnabled = false;
      this.cancelPassHoldToSurrender();
      return;
    }
    const passAvailable = this.isPassActionButtonAvailable();
    const playerConcedable = this.canHoldPassToSurrender();
    this.passHoldToSurrenderEnabled = passAvailable && playerConcedable;
    this.actionButton.setVisible(passAvailable);
    this.actionButton.setText(this.passHoldToSurrenderEnabled
      ? translateActive('ui.battle.holdPassToSurrender', 'Hold PASS to surrender')
      : translateActive('ui.common.pass', 'PASS'));
    this.actionButton.setStyle({
      backgroundColor: this.passHoldToSurrenderEnabled ? '#172554' : '#111827',
      color: '#f9fafb',
    });
    this.actionButton.setStroke(this.passHoldToSurrenderEnabled ? '#60a5fa' : '#64748b', 2);
    if (!this.passHoldToSurrenderEnabled) {
      this.cancelPassHoldToSurrender();
    }
  }

  canHoldPassToSurrender() {
    if (!this.gameState || this.gameState.winner) return false;
    if (this.gameState.firstActor !== 'player') return false;
    return isVerySafeConcedableState(this.gameState, 'player');
  }

  onActionButtonPointerDown() {
    if (!this.passHoldToSurrenderEnabled || this.battleResultModalShown || this.gameState?.winner) return;
    this.cancelPassHoldToSurrender();
    this.passHoldToSurrenderProgress = true;
    this.actionButton.setAlpha(0.82);
    this.passHoldToSurrenderEvent = this.time.delayedCall(PASS_HOLD_TO_SURRENDER_MS, () => {
      this.passHoldToSurrenderEvent = null;
      if (!this.passHoldToSurrenderProgress || !this.passHoldToSurrenderEnabled || this.gameState?.winner || this.battleResultModalShown) return;
      this.resolvePlayerHoldToSurrender();
    });
  }

  onActionButtonPointerCancel() {
    this.cancelPassHoldToSurrender();
  }

  cancelPassHoldToSurrender() {
    if (this.passHoldToSurrenderEvent) {
      this.passHoldToSurrenderEvent.remove(false);
      this.passHoldToSurrenderEvent = null;
    }
    this.passHoldToSurrenderProgress = false;
    this.actionButton?.setAlpha?.(1);
  }

  resolvePlayerHoldToSurrender() {
    if (!this.gameState || this.gameState.winner || this.battleResultModalShown || !this.passHoldToSurrenderEnabled) return;
    this.gameState.winner = 'enemy';
    this.gameState.endingReason = 'player_hold_surrender';
    this.cancelPassHoldToSurrender();
    this.completeBattleFlow(0);
  }

  confirmTargetingSelection() {
    this.cancelPassHoldToSurrender();
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
    }
    this.showPlayerEffectConfirmation(selectedCard);
    const movementFeedback = this.buildMovementFeedbackForAction({
      effectId: selectedCard.effectId,
      owner: 'player',
      targetIndexes,
      beforeSnapshot: beforeStats,
      result,
    });
    this.completePlayerAction(
      beforeStats,
      [...(result.feedback ?? []), ...this.buildActionFeedback(beforeStats, result)],
      movementFeedback,
      this.getImmediateCombatFeedback?.(result) ?? null,
    );
  }

  resolvePassTurn() {
    this.cancelPassHoldToSurrender();
    if (this.battleResultModalShown || this.isFlowResolving || this.isEffectCastResolving || this.targetingState) return;

    if (this.gameState.winner || !canPass(this.gameState) || this.playerActionUsed) return;
    recordPassAction(this.gameState, 'player');
    this.pendingSwapIndex = null;
    this.destroyActiveSelectionMessage();
    this.completePlayerAction();
  }


  getOpeningTurnStartBannerConfig() {
    if (this.gameState?.firstActor === 'enemy') {
      return {
        message: translateActive('ui.battle.enemyStarts', 'ENEMY STARTS'),
        textColor: '#fee2e2',
        backgroundColor: '#7f1d1d',
      };
    }

    return {
      message: translateActive('ui.battle.playerStarts', 'YOU START'),
      textColor: '#e0f2fe',
      backgroundColor: '#0c4a6e',
    };
  }

  async showOpeningTurnStartBanner() {
    if (this.hasShownOpeningTurnStartBanner || !this.layout || !this.gameState) return;
    if (!this.prepareTransientBattleBanner('turn-start')) {
      this.deferTransientBattleBanner('turn-start');
      return;
    }
    this.hasShownOpeningTurnStartBanner = true;

    const { height, board } = this.layout;
    const bannerLayout = this.getCentralBattleBannerLayout({ baseWidthRatio: 0.88, horizontalPadding: 16 });
    const fontSize = Math.min(20, Math.max(15, Math.floor(Math.max(board.cellWidth * 0.14, height * 0.018))));
    const { message, textColor, backgroundColor } = this.getOpeningTurnStartBannerConfig();
    const { x, targetY } = bannerLayout;
    this.turnStartBanner = this.add.text(x, bannerLayout.startY, message, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${fontSize}px`,
      color: textColor,
      backgroundColor,
      align: 'center',
      padding: { x: 16, y: 12 },
      wordWrap: { width: bannerLayout.maxTextWidth },
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(221).setAlpha(0).setScale(0.98);

    const banner = this.turnStartBanner;
    this.tweens.add({
      targets: banner,
      alpha: 1,
      y: targetY,
      scaleX: 1,
      scaleY: 1,
      duration: TURN_START_BANNER_FADE_IN_MS,
      ease: 'Quad.easeOut',
    });

    await this.delay(TURN_START_BANNER_FADE_IN_MS + TURN_START_BANNER_HOLD_MS);

    await new Promise((resolve) => {
      if (this.turnStartBanner !== banner || !banner.active) {
        resolve();
        return;
      }
      this.turnStartBannerFadeOutEvent = null;
      this.tweens.add({
        targets: banner,
        alpha: 0,
        y: targetY - 6,
        scaleX: 0.98,
        scaleY: 0.98,
        duration: TURN_START_BANNER_FADE_OUT_MS,
        ease: 'Quad.easeIn',
        onComplete: () => {
          if (this.turnStartBanner === banner) this.destroyTurnStartBanner();
          this.flushDeferredTransientBattleBanner();
          resolve();
        },
      });
    });
  }

  destroyTurnStartBanner() {
    if (this.turnStartBannerFadeOutEvent) {
      this.turnStartBannerFadeOutEvent.remove(false);
      this.turnStartBannerFadeOutEvent = null;
    }
    if (!this.turnStartBanner) return;
    this.tweens?.killTweensOf?.(this.turnStartBanner);
    this.turnStartBanner.destroy();
    this.turnStartBanner = null;
  }


  startTurn() {
    if (!this.gameState || this.gameState.winner) {
      this.updateInitiativeIndicator();
      this.scheduleBattleResultModal();
      return;
    }

    resolveImmediateResourceExhaustionWinner(this.gameState);
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
    this.destroyActiveSelectionMessage();
    this.destroySelectedHandCardZoom({ animate: true });
    this.updateInitiativeIndicator();
    this.updateActionButtonLabel();
    this.evaluateAndShowPlayerConcedableInfoBanner();

    if (this.gameState.firstActor === 'enemy') {
      this.resolveEnemyFirstTurnOpening();
    }
  }

  evaluateAndShowPlayerConcedableInfoBanner() {
    if (!this.gameState || this.gameState.winner || this.gameState.firstActor !== 'player') return;
    const hintState = this.playerConcedableHintState ?? { shownKey: null, stableChecks: 0, lastEligibleKey: null };
    this.playerConcedableHintState = hintState;

    const eligible = isVerySafeConcedableState(this.gameState, 'player');
    if (!eligible) {
      hintState.lastEligibleKey = null;
      hintState.stableChecks = 0;
      hintState.shownKey = null;
      return;
    }

    const key = `php:${this.gameState.playerHP}|ehp:${this.gameState.enemyHP}|h:${this.gameState.player?.hand?.length ?? 0}|d:${this.gameState.player?.deck?.length ?? 0}|t:${this.gameState.turnsCompleted ?? 0}`;
    if (hintState.lastEligibleKey === key) {
      hintState.stableChecks += 1;
    } else {
      hintState.lastEligibleKey = key;
      hintState.stableChecks = 1;
    }
    if (hintState.stableChecks < 2) return;
    if (hintState.shownKey === key) return;

    this.showPlayerConcedableInfoBanner();
    hintState.shownKey = key;
  }

  showPlayerConcedableInfoBanner() {
    this.showPlayerActionBanner(translateActive('ui.battle.playerNoMeaningfulActionsDetected', 'No meaningful actions detected.'));
  }

  async completePlayerAction(beforeStats = null, actionFeedback = [], movementFeedback = [], immediateCombatFeedback = null) {
    if (!this.gameState || this.playerActionUsed || this.isFlowResolving) return;

    this.playerActionUsed = true;
    this.isFlowResolving = true;
    this.destroyActiveSelectionMessage();
    this.flushDeferredTransientBattleBanner();
    this.currentActionFeedback = actionFeedback;
    await this.playMovementFeedback(movementFeedback, beforeStats);
    await this.playPreRefreshActionFeedback(actionFeedback);
    await this.playImmediateCombatFeedback(immediateCombatFeedback);
    this.refreshAfterPlayerAction();
    await this.playPostRefreshMovementFeedback(movementFeedback);
    await this.playImmediateCombatCreationFeedback(immediateCombatFeedback);
    await this.playBuffFeedback(beforeStats, 'player');
    if (this.gameState.winner) {
      this.completeBattleFlow(500);
      return;
    }
    await this.playActionFeedback(actionFeedback);
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

    if (this.gameState?.winner) {
      this.completeBattleFlow(500);
      return;
    }

    await this.delay(enemyActionPacing?.preCombatDelayMs ?? ENEMY_ACTION_PRE_COMBAT_DELAY_MS);
    const preCombatFeedbackSnapshot = this.captureCombatFeedbackSnapshot();
    const combatEvents = resolveCombat(this.gameState);
    this.lastCombatEvents = combatEvents;
    if (combatEvents.length > 0) {
      console.debug('Combat feedback events', combatEvents);
    }
    await this.playCombatAnimations(combatEvents, preCombatFeedbackSnapshot.board);
    await this.playCombatDeathTriggerFeedback(preCombatFeedbackSnapshot);
    this.refreshBoardLabels();
    await this.playCombatCreationFeedback(preCombatFeedbackSnapshot);
    this.refreshHeroHP();

    this.gameState.turnsCompleted += 1;
    resolveImmediateResourceExhaustionWinner(this.gameState);
    resolveImmediateNoProgressWinner(this.gameState);
    if (this.gameState.winner) {
      this.completeBattleFlow(500);
      return;
    }

    await this.delay(500);
    drawCards(this.gameState.player, 1);
    drawCards(this.gameState.enemy, 1);
    resolveImmediateResourceExhaustionWinner(this.gameState);
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
    await this.showOpeningTurnStartBanner();
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
    this.destroyActiveSelectionMessage();
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
    if (action.type === 'play-effect' || action.type === 'play-targeted-effect') {
      await this.playEffectCastSweep({ side: 'enemy' });
    }

    const beforeStats = this.captureBoardStats();
    const result = this.enemyTakeAction(action);
    this.enemyActionUsed = true;
    const movementFeedback = this.buildEnemyMovementFeedback(action, beforeStats, result);
    const actionFeedback = this.buildActionFeedback(beforeStats, result);
    const immediateCombatFeedback = this.getImmediateCombatFeedback(result);
    await this.playMovementFeedback(movementFeedback, beforeStats);
    await this.playPreRefreshActionFeedback(actionFeedback);
    await this.playImmediateCombatFeedback(immediateCombatFeedback);
    this.refreshBoardLabels();
    await this.playPostRefreshMovementFeedback(movementFeedback);
    this.redrawHand();
    this.refreshHeroHP();
    this.updateInitiativeIndicator();
    this.currentActionFeedback = actionFeedback;
    await this.playBuffFeedback(beforeStats, 'enemy');
    await this.playImmediateCombatCreationFeedback(immediateCombatFeedback);
    await this.playActionFeedback(actionFeedback);
    await this.delay(pacing.postActionDelayMs);
    return pacing;
  }

  buildEnemyMovementFeedback(action, beforeStats, result) {
    if (!action || !result?.ok) return [];
    if (action.type === 'swap-units') {
      return [{ type: 'swap', fromIndex: action.fromIndex, toIndex: action.toIndex, label: 'SWAP', kind: 'swap' }];
    }

    return this.buildMovementFeedbackForAction({
      effectId: action.effectId ?? result.card?.effectId,
      owner: 'enemy',
      targetIndexes: action.targetIndexes ?? (Number.isInteger(action.targetIndex) ? [action.targetIndex] : []),
      beforeSnapshot: beforeStats,
      result,
    });
  }

  getEnemyActionPacing(action) {
    if (!action || action.type === 'pass') return ENEMY_ACTION_PACING.pass;
    if (action.type === 'swap-units') return ENEMY_ACTION_PACING.reposition;
    if (action.type === 'play-unit') return ENEMY_ACTION_PACING.unit;
    if (action.type === 'play-effect' || action.type === 'play-targeted-effect') return ENEMY_ACTION_PACING.effect;
    return ENEMY_ACTION_PACING.pass;
  }

  getEnemyActionMessage(action, card) {
    if (action?.type === 'surrender') return translateActive('ui.battle.enemySurrenders', 'ENEMY SURRENDERS');
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

    if (action.type === 'surrender') {
      this.gameState.winner = 'player';
      this.gameState.endingReason = 'ai_safe_surrender';
      return { ok: true, type: 'surrender' };
    }

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
    this.showPlayerActionBanner(this.getPlayerEffectConfirmationMessage(card));
  }

  showPlayerActionBanner(message) {
    if (!message) return;
    if (!this.prepareTransientBattleBanner('player-action')) {
      this.deferTransientBattleBanner('player-action', { message });
      return;
    }

    const { height, board } = this.layout;
    const bannerLayout = this.getCentralBattleBannerLayout({ baseWidthRatio: 0.88, horizontalPadding: 14, startOffset: 5 });
    const fontSize = Math.min(18, Math.max(14, Math.floor(Math.max(board.cellWidth * 0.125, height * 0.016))));
    const { targetY } = bannerLayout;
    this.playerActionBanner = this.add.text(bannerLayout.x, bannerLayout.startY, message, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${fontSize}px`,
      color: '#dcfce7',
      backgroundColor: '#14532d',
      align: 'center',
      padding: { x: 14, y: 11 },
      wordWrap: { width: bannerLayout.maxTextWidth },
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(219).setAlpha(0).setScale(0.98).setStroke('#052e16', 1);

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
            this.flushDeferredTransientBattleBanner();
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
      return translateActive('ui.battle.targeting.selectAdjacentEnemy', 'SELECT ADJACENT ENEMIES');
    }
    if (state.requiredTargets > 1 && selectedCount === 0 && state.targetType === 'enemy-unit') {
      return translateActive('ui.battle.targeting.selectFirstEnemy', 'SELECT FIRST ENEMY');
    }
    if (state.requiredTargets > 1 && selectedCount === 1 && state.targetType === 'enemy-unit') {
      return translateActive('ui.battle.targeting.selectSecondEnemy', 'SELECT SECOND ENEMY');
    }
    if (state.targetType === 'enemy-unit') return translateActive('ui.battle.targeting.selectEnemy', 'SELECT ENEMY');
    if (state.targetType === 'friendly-unit') return translateActive('ui.battle.targeting.selectAlly', 'SELECT ALLY');
    if (state.targetType === 'any-unit') return translateActive('ui.battle.targeting.selectUnit', 'SELECT UNIT');
    return translateActive('ui.battle.targeting.selectUnit', 'SELECT UNIT');
  }

  showTargetingInstruction() {
    const message = this.getTargetingInstructionMessage();
    if (!message) {
      this.destroyTargetingInstruction();
      return;
    }

    this.showActiveSelectionMessage(message, 'targeting');
  }

  showSwapPrompt(step = 'selectSource') {
    const message = step === 'selectAdjacent'
      ? translateActive('ui.battle.swapPromptSelectAdjacent', 'SWAP: select adjacent unit')
      : translateActive('ui.battle.swapPromptSelectUnit', 'SWAP: select unit');
    this.showActiveSelectionMessage(message, 'board-swap');
  }

  clearSwapPrompt() {
    this.destroyActiveSelectionMessage('board-swap');
  }

  getCentralBattleBannerLayout({ baseWidthRatio, horizontalPadding, startOffset = 6 }) {
    const { width, margin, board } = this.layout;
    const targetY = board.centerY;
    return {
      x: width * 0.5,
      targetY,
      startY: targetY + startOffset,
      maxTextWidth: Math.min(
        board.width * baseWidthRatio * 1.2,
        width - margin * 2 - horizontalPadding * 2,
      ),
    };
  }

  getActiveSelectionBannerLayout(owner) {
    const { height, board } = this.layout;
    const bannerLayout = this.getCentralBattleBannerLayout({ baseWidthRatio: 0.88, horizontalPadding: 14, startOffset: 5 });
    return {
      ...bannerLayout,
      maxWidth: bannerLayout.maxTextWidth,
      fontSize: Math.min(18, Math.max(14, Math.floor(Math.max(board.cellWidth * 0.125, height * 0.016)))),
    };
  }

  showActiveSelectionMessage(message, owner = 'selection') {
    if (!message) {
      this.destroyActiveSelectionMessage(owner);
      return;
    }

    this.destroyTransientBattleBanners();
    const layout = this.getActiveSelectionBannerLayout(owner);
    if (this.activeSelectionBanner?.active && this.activeSelectionBannerOwner === owner) {
      this.activeSelectionBanner.setText(message);
      this.activeSelectionBanner.setPosition(layout.x, layout.targetY);
      this.targetingInstructionText = owner === 'targeting' ? this.activeSelectionBanner : null;
      return;
    }

    this.destroyActiveSelectionMessage(null, { flushDeferred: false });
    this.activeSelectionBanner = this.add.text(layout.x, layout.startY, message, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${layout.fontSize}px`,
      color: '#dcfce7',
      backgroundColor: '#14532d',
      align: 'center',
      padding: { x: 14, y: 11 },
      wordWrap: { width: layout.maxWidth },
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(221).setAlpha(0).setScale(0.98).setStroke('#052e16', 1);

    this.activeSelectionBannerOwner = owner;
    this.targetingInstructionText = owner === 'targeting' ? this.activeSelectionBanner : null;
    const banner = this.activeSelectionBanner;
    this.tweens.add({
      targets: banner,
      alpha: 1,
      y: layout.targetY,
      scaleX: 1,
      scaleY: 1,
      duration: PLAYER_EFFECT_CONFIRMATION_FADE_IN_MS,
      ease: 'Quad.easeOut',
    });
  }

  showEnemyActionBanner(message, pacing = ENEMY_ACTION_PACING.unit) {
    if (!this.prepareTransientBattleBanner('enemy-action')) {
      this.deferTransientBattleBanner('enemy-action', { message, pacing });
      return;
    }

    const { height, board } = this.layout;
    const bannerLayout = this.getCentralBattleBannerLayout({ baseWidthRatio: 0.94, horizontalPadding: 16 });
    const fontSize = Math.min(20, Math.max(15, Math.floor(Math.max(board.cellWidth * 0.14, height * 0.018))));
    this.enemyActionBanner = this.add.text(bannerLayout.x, bannerLayout.startY, message, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${fontSize}px`,
      color: '#fee2e2',
      backgroundColor: '#7f1d1d',
      align: 'center',
      padding: { x: 16, y: 12 },
      wordWrap: { width: bannerLayout.maxTextWidth },
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(220).setAlpha(0).setScale(0.98).setStroke('#450a0a', 1);

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
            this.flushDeferredTransientBattleBanner();
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
    this.destroyActiveSelectionMessage('targeting');
  }

  destroyActiveSelectionMessage(owner = null, { flushDeferred = true } = {}) {
    if (owner && this.activeSelectionBannerOwner !== owner) return;
    if (!this.activeSelectionBanner) {
      this.targetingInstructionText = null;
      this.activeSelectionBannerOwner = null;
      if (flushDeferred) this.flushDeferredTransientBattleBanner();
      return;
    }
    this.tweens?.killTweensOf?.(this.activeSelectionBanner);
    this.activeSelectionBanner.destroy();
    this.activeSelectionBanner = null;
    this.activeSelectionBannerOwner = null;
    this.targetingInstructionText = null;
    if (flushDeferred) this.flushDeferredTransientBattleBanner();
  }


  captureBoardStats() {
    const snapshot = this.gameState.board.map((unit) => (unit ? {
      id: unit.id,
      cardId: unit.cardId,
      owner: unit.owner,
      effectId: unit.effectId,
      attack: getUnitAttack(unit),
      armor: getUnitArmor(unit),
      health: Number.isFinite(unit.hp) ? unit.hp : 0,
      ignoreArmorNext: Boolean(unit.ignoreArmorNext),
      controlledAttackThisTurn: Boolean(unit.controlledAttackThisTurn),
    } : null));
    snapshot.playerHP = this.gameState?.playerHP ?? 0;
    snapshot.enemyHP = this.gameState?.enemyHP ?? 0;
    return snapshot;
  }

  // Persistent selection banners outrank transient action/turn banners. Transient banners are
  // deferred and replayed after selection clears so instructions never overlap notifications.
  getPersistentBattleBannerOwner() {
    if (this.targetingState) return 'targeting';
    if (this.pendingSwapIndex !== null && this.pendingSwapIndex !== undefined) return 'board-swap';
    return null;
  }

  restorePersistentBattleBanner() {
    const owner = this.getPersistentBattleBannerOwner();
    if (owner === 'targeting') {
      this.showTargetingInstruction();
      return true;
    }
    if (owner === 'board-swap') {
      this.showSwapPrompt('selectAdjacent');
      return true;
    }
    return false;
  }

  getBattleBannerPriority(owner) {
    return {
      targeting: 5,
      'board-swap': 4,
      'enemy-action': 3,
      'player-action': 2,
      'turn-start': 1,
    }[owner] ?? 0;
  }

  getRenderedTransientBattleBannerOwner() {
    if (this.enemyActionBanner?.active) return 'enemy-action';
    if (this.playerActionBanner?.active) return 'player-action';
    if (this.turnStartBanner?.active) return 'turn-start';
    return null;
  }

  destroyTransientBattleBanners() {
    this.destroyTurnStartBanner();
    this.destroyEnemyActionBanner();
    this.destroyPlayerActionBanner();
  }

  deferTransientBattleBanner(owner, payload = {}) {
    const deferredOwner = this.deferredTransientBattleBanner?.owner;
    if (this.getBattleBannerPriority(deferredOwner) > this.getBattleBannerPriority(owner)) return;
    this.deferredTransientBattleBanner = { owner, payload };
  }

  flushDeferredTransientBattleBanner() {
    const deferred = this.deferredTransientBattleBanner;
    if (!deferred || this.getPersistentBattleBannerOwner()) return false;
    this.deferredTransientBattleBanner = null;
    if (deferred.owner === 'enemy-action') {
      this.showEnemyActionBanner(deferred.payload.message, deferred.payload.pacing);
      return true;
    }
    if (deferred.owner === 'player-action') {
      this.showPlayerActionBanner(deferred.payload.message);
      return true;
    }
    if (deferred.owner === 'turn-start') {
      this.showOpeningTurnStartBanner();
      return true;
    }
    return false;
  }

  prepareTransientBattleBanner(owner) {
    if (this.restorePersistentBattleBanner()) return false;
    const renderedOwner = this.getRenderedTransientBattleBannerOwner();
    if (this.getBattleBannerPriority(renderedOwner) > this.getBattleBannerPriority(owner)) return false;
    this.destroyActiveSelectionMessage(null, { flushDeferred: false });
    this.destroyTransientBattleBanners();
    return true;
  }

  captureBoardSnapshot() {
    return this.gameState.board.map((unit) => (unit ? { ...unit } : null));
  }

  captureCombatFeedbackSnapshot() {
    return {
      board: this.captureBoardSnapshot(),
      playerHP: this.gameState?.playerHP ?? 0,
      enemyHP: this.gameState?.enemyHP ?? 0,
      funeralPyreThisCombat: this.gameState?.funeralPyreThisCombat
        ? JSON.parse(JSON.stringify(this.gameState.funeralPyreThisCombat))
        : null,
    };
  }

  getImmediateCombatFeedback(result = null) {
    if (!Array.isArray(result?.combatEvents) || result.combatEvents.length === 0) return null;
    return {
      combatEvents: result.combatEvents,
      combatSnapshot: result.combatSnapshot ?? null,
    };
  }

  refreshBoardLabelsFromSnapshot(boardSnapshot) {
    if (!Array.isArray(boardSnapshot)) return;
    this.boardCells.forEach((cell) => {
      const unit = boardSnapshot[cell.index];
      cell.label.removeAll(true);
      cell.label.setAlpha(1).setScale(1);
      if (unit) {
        cell.label.add(this.createBoardUnitView(cell, unit));
      }
    });
  }

  async playImmediateCombatFeedback(immediateCombatFeedback = null) {
    const combatEvents = immediateCombatFeedback?.combatEvents;
    const combatSnapshot = immediateCombatFeedback?.combatSnapshot;
    if (!Array.isArray(combatEvents) || combatEvents.length === 0) return;
    if (!Array.isArray(combatSnapshot?.board)) return;

    this.refreshBoardLabelsFromSnapshot(combatSnapshot.board);
    await this.playCombatAnimations(combatEvents, combatSnapshot.board);
    await this.playCombatDeathTriggerFeedback(combatSnapshot);
  }

  async playImmediateCombatCreationFeedback(immediateCombatFeedback = null) {
    const combatEvents = immediateCombatFeedback?.combatEvents;
    const combatSnapshot = immediateCombatFeedback?.combatSnapshot;
    if (!Array.isArray(combatEvents) || combatEvents.length === 0) return;
    await this.playCombatCreationFeedback(combatSnapshot);
    this.refreshHeroHP();
  }

  getCellByIndex(index) {
    return this.boardCells.find((cell) => cell.index === index) ?? null;
  }

  getHeroPanel(side) {
    return side === 'player' ? this.playerHeroPanel : this.enemyHeroPanel;
  }

  getOpponentSide(side) {
    return side === 'player' ? 'enemy' : 'player';
  }

  getBoardCellCenter(index) {
    const cell = this.getCellByIndex(index);
    if (!cell?.background) return null;
    return { x: cell.background.x, y: cell.background.y };
  }

  getBoardUnitVisual(index) {
    return this.getCellByIndex(index)?.label ?? null;
  }

  getAdjacentFriendlySwapPartner(index, owner, boardSnapshot = this.gameState?.board) {
    if (!Array.isArray(boardSnapshot) || !Number.isInteger(index)) return null;
    const sameRow = (candidateIndex) => Math.floor(candidateIndex / 3) === Math.floor(index / 3);
    const candidates = [index - 1, index + 1];
    return candidates.find((candidateIndex) => (
      candidateIndex >= 0
      && candidateIndex < boardSnapshot.length
      && sameRow(candidateIndex)
      && boardSnapshot[candidateIndex]?.owner === owner
    )) ?? null;
  }

  getMovementBlockedLabel(targetIndex, owner = 'player') {
    const protectedOwner = this.gameState?.board?.[targetIndex]?.owner ?? this.getOpponentSide(owner);
    if (this.gameState?.immovableThisTurn?.[protectedOwner]) return 'IMMOVABLE';
    if (this.gameState?.immuneMoveDisableThisTurn?.[protectedOwner]) return 'IMMUNE';
    return 'BLOCKED';
  }

  buildMovementFeedbackForAction({ effectId, owner = 'player', targetIndexes = [], beforeSnapshot = null, result = null, label = null } = {}) {
    if (!result?.ok || !Array.isArray(beforeSnapshot)) return [];

    if (result.type === 'targeted-effect-blocked' || result.type === 'effect-blocked') {
      const indexes = targetIndexes.length > 0
        ? targetIndexes
        : beforeSnapshot
          .map((unit, index) => ({ unit, index }))
          .filter(({ unit }) => unit?.owner === this.getOpponentSide(owner))
          .map(({ index }) => index);
      return indexes
        .filter((index, position, allIndexes) => Number.isInteger(index) && allIndexes.indexOf(index) === position)
        .map((index) => ({ type: 'movement-blocked', index, label: this.getMovementBlockedLabel(index, owner) }));
    }

    if (effectId === 'swap_adjacent_then_resolve') {
      const selectedIndex = targetIndexes[0];
      const partnerIndex = this.getAdjacentFriendlySwapPartner(selectedIndex, owner, beforeSnapshot);
      if (Number.isInteger(selectedIndex) && Number.isInteger(partnerIndex)) {
        return [{ type: 'swap', fromIndex: selectedIndex, toIndex: partnerIndex, label: label ?? 'RUSH', kind: 'rush' }];
      }
    }

    if (effectId === 'swap_any_two_units' || effectId === 'swap_two_enemy_units' || effectId === 'swap_adjacent_enemy_units') {
      const [fromIndex, toIndex] = targetIndexes;
      if (Number.isInteger(fromIndex) && Number.isInteger(toIndex)) {
        return [{
          type: 'swap',
          fromIndex,
          toIndex,
          label: label ?? (effectId === 'swap_adjacent_enemy_units' ? 'PUSH' : 'SWAP'),
          kind: effectId === 'swap_adjacent_enemy_units' ? 'push' : 'swap',
        }];
      }
    }

    return this.inferSwapFeedbackFromSnapshots(beforeSnapshot, label ?? 'SWAP');
  }

  inferSwapFeedbackFromSnapshots(beforeSnapshot, label = 'SWAP') {
    if (!Array.isArray(beforeSnapshot) || !Array.isArray(this.gameState?.board)) return [];
    for (let firstIndex = 0; firstIndex < beforeSnapshot.length - 1; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < beforeSnapshot.length; secondIndex += 1) {
        if (this.isSameBoardUnit(beforeSnapshot[firstIndex], this.gameState.board[secondIndex])
          && this.isSameBoardUnit(beforeSnapshot[secondIndex], this.gameState.board[firstIndex])) {
          return [{ type: 'swap', fromIndex: firstIndex, toIndex: secondIndex, label, kind: 'swap' }];
        }
      }
    }
    return [];
  }

  isSameBoardUnit(beforeUnit, afterUnit) {
    if (!beforeUnit || !afterUnit) return false;
    const beforeId = beforeUnit.cardId ?? beforeUnit.id;
    const afterId = afterUnit.cardId ?? afterUnit.id;
    return Boolean(beforeId && afterId && beforeId === afterId && beforeUnit.owner === afterUnit.owner);
  }

  findCreatedUnitIndexes(beforeSnapshot) {
    if (!Array.isArray(beforeSnapshot) || !this.gameState?.board) return [];
    return this.gameState.board
      .map((unit, index) => ({ unit, index }))
      .filter(({ unit, index }) => unit && !this.isSameBoardUnit(beforeSnapshot[index], unit))
      .map(({ index }) => index);
  }

  findRemovedUnitIndexes(beforeSnapshot) {
    if (!Array.isArray(beforeSnapshot) || !this.gameState?.board) return [];
    return beforeSnapshot
      .map((unit, index) => ({ unit, index }))
      .filter(({ unit, index }) => unit && !this.isSameBoardUnit(unit, this.gameState.board[index]))
      .map(({ index }) => index);
  }

  getHeroHpFromSnapshot(snapshot, side) {
    return side === 'player' ? snapshot?.playerHP : snapshot?.enemyHP;
  }

  getDirectEffectLabel(effectId, baseLabel) {
    switch (effectId) {
      case 'damage_all_enemies_1_ignore_armor':
        return `${baseLabel}\nPULSE`;
      case 'infect_damage_1_opposite_ally_atk_1':
        return `${baseLabel}\nINFECT`;
      case 'ignore_armor_next_attack':
        return `${baseLabel}\nPIERCE`;
      case 'on_play_lane_damage_1':
        return `${baseLabel}\nSPIT`;
      case 'control_enemy_unit_this_turn':
        return 'OVERRIDE';
      default:
        return baseLabel;
    }
  }

  pushDirectDamageDeathFeedback(feedback, beforeSnapshot) {
    const heroDamageBySide = { player: 0, enemy: 0 };
    ['player', 'enemy'].forEach((side) => {
      const beforeHp = this.getHeroHpFromSnapshot(beforeSnapshot, side);
      const afterHp = this.gameState?.[side === 'player' ? 'playerHP' : 'enemyHP'];
      if (Number.isFinite(beforeHp) && Number.isFinite(afterHp) && afterHp < beforeHp) {
        heroDamageBySide[side] = beforeHp - afterHp;
      }
    });

    this.findRemovedUnitIndexes(beforeSnapshot).forEach((index) => {
      const unit = beforeSnapshot[index];
      if (!unit || unit.effectId !== 'death_damage_enemy_hero_1') return;
      const targetSide = this.getOpponentSide(unit.owner);
      if (heroDamageBySide[targetSide] <= 0) return;
      feedback.push({ type: 'slot-text', index, label: 'DEATH', kind: 'death', phase: 'pre', order: 30 });
      feedback.push({ type: 'hero-text', side: targetSide, label: '-1', kind: 'damage', phase: 'pre', order: 31 });
      heroDamageBySide[targetSide] -= 1;
    });
  }

  buildEffectDeltaFeedback(beforeSnapshot, result, effectId) {
    const feedback = [];
    const directDamageEffects = new Set([
      'damage_all_enemies_1_ignore_armor',
      'infect_damage_1_opposite_ally_atk_1',
      'ignore_armor_next_attack',
      'on_play_lane_damage_1',
    ]);
    const debuffEffects = new Set(['enemy_lane_atk_minus_1', 'enemy_up_to_2_atk_minus_1']);
    const healEffects = new Set(['heal_all_1', 'heal_1_atk_1_draw_on_kill_this_turn', 'heal_2', 'heal_3']);

    if (directDamageEffects.has(effectId)) {
      beforeSnapshot.forEach((before, index) => {
        if (!before) return;
        const after = this.gameState.board[index];
        const afterHealth = this.isSameBoardUnit(before, after) && Number.isFinite(after?.hp) ? after.hp : 0;
        const damage = Math.max(0, before.health - afterHealth);
        if (damage <= 0) return;
        feedback.push({
          type: 'slot-text',
          index,
          label: this.getDirectEffectLabel(effectId, `-${damage}`),
          kind: effectId === 'ignore_armor_next_attack' || effectId === 'damage_all_enemies_1_ignore_armor' ? 'pierce' : 'damage',
          phase: 'pre',
          order: effectId === 'damage_all_enemies_1_ignore_armor' ? index : 10,
          staggerMs: effectId === 'damage_all_enemies_1_ignore_armor' ? 85 : 0,
        });
      });
    }

    if (effectId === 'ignore_armor_next_attack') {
      beforeSnapshot.forEach((before, index) => {
        const after = this.gameState.board[index];
        if (!before || !this.isSameBoardUnit(before, after)) return;
        if (!before.ignoreArmorNext && after.ignoreArmorNext) {
          feedback.push({ type: 'slot-text', index, label: 'IGNORE ARM', kind: 'pierce', phase: 'pre', order: 12 });
        }
      });
    }

    if (effectId === 'control_enemy_unit_this_turn') {
      beforeSnapshot.forEach((before, index) => {
        const after = this.gameState.board[index];
        if (!before || !this.isSameBoardUnit(before, after)) return;
        if (!before.controlledAttackThisTurn && after.controlledAttackThisTurn) {
          feedback.push({ type: 'slot-text', index, label: 'OVERRIDE', kind: 'debuff', phase: 'pre', order: 10 });
        }
      });
    }

    if (debuffEffects.has(effectId)) {
      beforeSnapshot.forEach((before, index) => {
        const after = this.gameState.board[index];
        if (!before || !this.isSameBoardUnit(before, after)) return;
        const attackDelta = getUnitAttack(after) - before.attack;
        if (attackDelta < 0) {
          feedback.push({ type: 'slot-text', index, label: `${attackDelta} ATK`, kind: 'debuff', phase: 'pre', order: 10 });
        }
      });
    }

    if (healEffects.has(effectId)) {
      beforeSnapshot.forEach((before, index) => {
        const after = this.gameState.board[index];
        if (!before || !this.isSameBoardUnit(before, after)) return;
        const healthDelta = (Number.isFinite(after.hp) ? after.hp : 0) - before.health;
        if (healthDelta > 0) {
          feedback.push({ type: 'slot-text', index, label: `+${healthDelta} HP`, kind: 'heal', phase: 'pre', order: 10 });
        }
      });
    }

    if (effectId === 'infect_damage_1_opposite_ally_atk_1' || effectId === 'heal_1_atk_1_draw_on_kill_this_turn') {
      beforeSnapshot.forEach((before, index) => {
        const after = this.gameState.board[index];
        if (!before || !this.isSameBoardUnit(before, after)) return;
        const attackDelta = getUnitAttack(after) - before.attack;
        if (attackDelta > 0) {
          feedback.push({ type: 'slot-text', index, label: `+${attackDelta} ATK`, kind: 'buff', phase: 'pre', order: 20 });
        }
      });
    }

    if (directDamageEffects.has(effectId)) this.pushDirectDamageDeathFeedback(feedback, beforeSnapshot);
    return feedback;
  }

  buildActionFeedback(beforeSnapshot, result = null) {
    if (!result?.ok || !Array.isArray(beforeSnapshot)) return [];
    const effectId = result.card?.effectId ?? result.effectId ?? null;
    const feedback = [];

    feedback.push(...this.buildEffectDeltaFeedback(beforeSnapshot, result, effectId));

    if (effectId === 'summon_grunt_empty_slot' || effectId === 'grave_call' || effectId === 'fill_empty_slots_0_1') {
      this.findCreatedUnitIndexes(beforeSnapshot).forEach((index) => {
        feedback.push({ type: 'spawn', index, label: 'SUMMON' });
      });
    }

    if (effectId === 'revive_friendly_1hp') {
      this.findCreatedUnitIndexes(beforeSnapshot).forEach((index) => {
        feedback.push({ type: 'spawn', index, label: 'REVIVE', kind: 'revive' });
      });
    }

    if (effectId === 'destroy_friendly_draw_1') {
      this.findRemovedUnitIndexes(beforeSnapshot).forEach((index) => {
        feedback.push({ type: 'remove', index, label: 'DESTROYED', kind: 'damage' });
      });
    }

    if (effectId === 'return_friendly_draw_1') {
      this.findRemovedUnitIndexes(beforeSnapshot).forEach((index) => {
        feedback.push({ type: 'remove', index, label: 'RETURN', kind: 'return' });
      });
    }

    return feedback;
  }

  getCombatDeathFeedback(preCombatSnapshot) {
    const beforeBoard = preCombatSnapshot?.board;
    if (!Array.isArray(beforeBoard) || !this.gameState?.board) return { beforeRefresh: [], afterRefresh: [] };

    const beforeRefresh = [];
    const afterRefresh = [];
    const sourceLabels = new Set();
    const pyreTriggersByOwner = {
      player: preCombatSnapshot.funeralPyreThisCombat?.player?.triggers ?? 0,
      enemy: preCombatSnapshot.funeralPyreThisCombat?.enemy?.triggers ?? 0,
    };

    const addSourceDeath = (index) => {
      if (!Number.isInteger(index) || sourceLabels.has(index)) return;
      sourceLabels.add(index);
      beforeRefresh.push({ type: 'slot-text', index, label: 'DEATH', kind: 'death' });
    };
    const addUnitDamage = (index, amount = 1) => {
      if (!Number.isInteger(index)) return;
      beforeRefresh.push({ type: 'slot-text', index, label: `-${amount}`, kind: 'damage' });
    };
    const addHeroDamage = (side, amount = 1) => {
      beforeRefresh.push({ type: 'hero-text', side, label: `-${amount}`, kind: 'damage' });
    };

    beforeBoard.forEach((unit, index) => {
      if (!unit || unit.temporaryFloodToken) return;
      const afterUnit = this.gameState.board[index];
      const died = !this.isSameBoardUnit(unit, afterUnit);
      if (!died) return;

      const owner = unit.owner;
      const enemyOwner = this.getOpponentSide(owner);
      const opposingIndex = owner === 'player' ? index - 6 : index + 6;
      const opposingUnit = beforeBoard[opposingIndex];

      const pyreState = preCombatSnapshot.funeralPyreThisCombat?.[owner];
      if (pyreState?.active && pyreTriggersByOwner[owner] < 2) {
        pyreTriggersByOwner[owner] += 1;
        addSourceDeath(index);
        if (opposingUnit?.owner === enemyOwner) addUnitDamage(opposingIndex, 1);
      }

      if (unit.effectId === 'death_damage_enemy_hero_1') {
        addSourceDeath(index);
        addHeroDamage(enemyOwner, 1);
      }

      if (unit.effectId === 'combat_death_damage_enemy_lane_1') {
        addSourceDeath(index);
        if (opposingUnit?.owner === enemyOwner) addUnitDamage(opposingIndex, 1);
      }

      if (unit.effectId === 'combat_death_damage_both_heroes_1') {
        addSourceDeath(index);
        addHeroDamage('player', 1);
        addHeroDamage('enemy', 1);
      }

      if (unit.effectId === 'on_death_summon_grunt' || unit.effectId === 'combat_death_summon_grunt') {
        addSourceDeath(index);
        if (this.gameState.board[index]) {
          afterRefresh.push({ type: 'spawn', index, label: unit.effectId === 'on_death_summon_grunt' ? 'BROOD' : 'SUMMON', kind: 'spawn' });
        }
      }

      const row = owner === 'player' ? [6, 7, 8] : [0, 1, 2];
      if (row.includes(index)) {
        const lane = index % 3;
        [lane > 0 ? row[lane - 1] : null, lane < 2 ? row[lane + 1] : null]
          .filter((candidateIndex) => Number.isInteger(candidateIndex))
          .forEach((candidateIndex) => {
            const beforeRotcaller = beforeBoard[candidateIndex];
            const afterRotcaller = this.gameState.board[candidateIndex];
            if (beforeRotcaller?.owner !== owner || beforeRotcaller.effectId !== 'rotcaller_adjacent_death_atk_1') return;
            if (!this.isSameBoardUnit(beforeRotcaller, afterRotcaller)) return;
            const beforeAttack = (beforeRotcaller.attack ?? 0) + (beforeRotcaller.tempAttackMod ?? 0);
            const afterAttack = (afterRotcaller.attack ?? 0) + (afterRotcaller.tempAttackMod ?? 0);
            if (afterAttack <= beforeAttack) return;
            addSourceDeath(candidateIndex);
            beforeRefresh.push({ type: 'slot-text', index: candidateIndex, label: '+1 ATK', kind: 'buff' });
          });
      }
    });

    return { beforeRefresh, afterRefresh };
  }

  async playCombatDeathTriggerFeedback(preCombatSnapshot) {
    const { beforeRefresh } = this.getCombatDeathFeedback(preCombatSnapshot);
    if (beforeRefresh.length === 0) return;
    await this.playVisualFeedbackEvents(beforeRefresh);
  }

  async playCombatCreationFeedback(preCombatSnapshot) {
    const { afterRefresh } = this.getCombatDeathFeedback(preCombatSnapshot);
    if (afterRefresh.length === 0) return;
    await this.playVisualFeedbackEvents(afterRefresh);
  }

  async playVisualFeedbackEvents(events = []) {
    if (!Array.isArray(events) || events.length === 0) return;
    await Promise.all(events.map((event) => {
      if (event.type === 'spawn') return this.showSpawnFeedback(event.index, event.label, event.kind);
      if (event.type === 'remove') return this.showRemoveFeedback(event.index, event.label, event.kind);
      if (event.type === 'slot-text') {
        return Promise.all([
          this.showSlotPulse(event.index, event.kind),
          this.showFloatingTextAtSlot(event.index, event.label, event.kind),
        ]);
      }
      if (event.type === 'hero-text') {
        const animations = [
          this.showHeroPulse(event.side, event.kind),
          this.showFloatingTextAtHero(event.side, event.label, event.kind),
        ];
        if (event.kind === 'damage' && this.getHeroFeedbackDamageAmount(event) > 0) {
          animations.push(this.shakeHeroPanel(event.side));
        }
        return Promise.all(animations);
      }
      return Promise.resolve();
    }));
  }

  async playBuffFeedback(beforeStats, owner, actionFeedback = this.currentActionFeedback) {
    if (!Array.isArray(beforeStats)) return;

    const preFeedbackIndexes = new Set((Array.isArray(actionFeedback) ? actionFeedback : [])
      .filter((event) => this.isPreRefreshFeedback(event) && Number.isInteger(event.index))
      .map((event) => event.index));
    const feedback = [];
    this.gameState.board.forEach((unit, index) => {
      if (!unit || unit.owner !== owner) return;
      const before = beforeStats[index];
      if (!before || before.owner !== owner || preFeedbackIndexes.has(index)) return;
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

  isPreRefreshFeedback(feedback) {
    return feedback?.phase === 'pre' || feedback?.type === 'slot-text' || feedback?.type === 'hero-text';
  }

  async playPreRefreshActionFeedback(actionFeedback = []) {
    const events = Array.isArray(actionFeedback) ? actionFeedback.filter((feedback) => this.isPreRefreshFeedback(feedback)) : [];
    if (events.length === 0) return;

    const orderedEvents = [...events].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const event of orderedEvents) {
      // Small stagger keeps mass effects readable on phone-sized portrait boards without cinematic delay.
      if ((event.staggerMs ?? 0) > 0) await this.delay(event.staggerMs);
      await this.playVisualFeedbackEvents([event]);
    }
  }

  async playActionFeedback(actionFeedback = []) {
    if (!Array.isArray(actionFeedback) || actionFeedback.length === 0) return;

    const animations = actionFeedback
      .filter((feedback) => !this.isPreRefreshFeedback(feedback))
      .map((feedback) => {
        if (feedback?.type === 'draw') {
          const label = this.getDrawFeedbackLabel(feedback);
          if (!label) return Promise.resolve();
          return this.showHandFloatingText(label, feedback.drawn > 0 ? '#bfdbfe' : '#fecaca');
        }
        if (feedback?.type === 'spawn') return this.showSpawnFeedback(feedback.index, feedback.label, feedback.kind);
        if (feedback?.type === 'remove') return this.showRemoveFeedback(feedback.index, feedback.label, feedback.kind);
        return Promise.resolve();
      });

    await Promise.all(animations);
  }

  getDrawFeedbackLabel(feedback) {
    if (!feedback) return '';
    if ((feedback.drawn ?? 0) > 0) return `DRAW +${feedback.drawn}`;
    switch (feedback.blockedReason) {
      case 'hand-full':
        return 'HAND FULL';
      case 'deck-empty':
        return 'DECK EMPTY';
      default:
        return 'NO DRAW';
    }
  }

  getFeedbackColor(kind) {
    switch (kind) {
      case 'damage':
      case 'death':
        return '#fca5a5';
      case 'spawn':
      case 'revive':
      case 'buff':
      case 'heal':
        return '#bbf7d0';
      case 'debuff':
        return '#fdba74';
      case 'pierce':
        return '#fde68a';
      case 'prevention':
        return '#67e8f9';
      case 'return':
        return '#bfdbfe';
      default:
        return '#fde68a';
    }
  }

  getFeedbackStrokeColor(kind) {
    switch (kind) {
      case 'damage':
      case 'death':
        return 0xfca5a5;
      case 'spawn':
      case 'revive':
      case 'buff':
      case 'heal':
        return 0x22c55e;
      case 'debuff':
        return 0xfb923c;
      case 'pierce':
        return 0xfacc15;
      case 'prevention':
        return 0x06b6d4;
      case 'return':
        return 0x93c5fd;
      default:
        return 0xfde68a;
    }
  }

  showSlotPulse(index, kind = 'default') {
    const cell = this.getCellByIndex(index);
    if (!cell?.background?.active) return Promise.resolve();

    const previousStyle = {
      lineWidth: cell.background.lineWidth ?? (cell.row === 1 ? 2 : 3),
      strokeColor: cell.background.strokeColor ?? (cell.row === 1 ? 0x94a3b8 : 0xcbd5e1),
      strokeAlpha: cell.background.strokeAlpha ?? (cell.row === 1 ? BOARD_GUIDE_SLOT_STROKE_ALPHA : BOARD_SLOT_STROKE_ALPHA),
      fillColor: cell.background.fillColor ?? 0x0f172a,
      fillAlpha: cell.background.fillAlpha ?? BOARD_SLOT_FILL_ALPHA,
    };

    cell.background.setStrokeStyle(4, this.getFeedbackStrokeColor(kind), BOARD_FEEDBACK_STROKE_ALPHA);
    cell.background.setFillStyle(previousStyle.fillColor, Math.max(previousStyle.fillAlpha, 0.38));

    const targets = cell.label?.active ? [cell.label] : [cell.background];
    return this.tweenToPromise({ targets, scaleX: 1.06, scaleY: 1.06, duration: 120, yoyo: true })
      .then(() => {
        if (!cell.background?.active) return;
        cell.background.setFillStyle(previousStyle.fillColor, previousStyle.fillAlpha);
        cell.background.setStrokeStyle(previousStyle.lineWidth, previousStyle.strokeColor, previousStyle.strokeAlpha);
        if (cell.label?.active) cell.label.setScale(1);
      });
  }

  showHeroPulse(side, kind = 'default') {
    const hero = this.getHeroPanel(side);
    if (!hero?.active) return Promise.resolve();

    const previousStyle = {
      lineWidth: hero.lineWidth ?? 2,
      strokeColor: hero.strokeColor ?? (side === 'player' ? 0x60a5fa : 0xf87171),
      strokeAlpha: hero.strokeAlpha ?? HERO_PANEL_STROKE_ALPHA,
      fillColor: hero.fillColor ?? 0x111827,
      fillAlpha: hero.fillAlpha ?? HERO_PANEL_FILL_ALPHA,
    };

    hero.setFillStyle(previousStyle.fillColor, Math.max(previousStyle.fillAlpha, 0.58));
    hero.setStrokeStyle(Math.max(previousStyle.lineWidth, 3), this.getFeedbackStrokeColor(kind), HERO_PANEL_HIT_STROKE_ALPHA);

    return this.tweenToPromise({ targets: hero, scaleX: 1.05, scaleY: 1.05, duration: 120, yoyo: true })
      .then(() => {
        if (!hero?.active) return;
        hero.setFillStyle(previousStyle.fillColor, previousStyle.fillAlpha);
        hero.setStrokeStyle(previousStyle.lineWidth, previousStyle.strokeColor, previousStyle.strokeAlpha);
      });
  }

  showFloatingTextAtSlot(index, text, kind = 'default') {
    const cell = this.getCellByIndex(index);
    if (!cell?.background?.active || !text) return Promise.resolve();
    const floating = this.add.text(cell.background.x, cell.background.y - this.layout.board.cellHeight * 0.34, text, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(13, Math.floor(this.layout.board.cellWidth * 0.12))}px`,
      color: this.getFeedbackColor(kind),
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(250);

    return this.tweenToPromise({ targets: floating, y: floating.y - 26, alpha: 0, duration: 520, ease: 'Cubic.easeOut' })
      .then(() => floating.destroy());
  }

  showFloatingTextAtHero(side, text, kind = 'default') {
    const hero = this.getHeroPanel(side);
    if (!hero?.active || !text) return Promise.resolve();
    const floating = this.add.text(hero.x + hero.width * 0.34, hero.y - hero.height * 0.18, text, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      color: this.getFeedbackColor(kind),
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(250);

    return this.tweenToPromise({ targets: floating, y: floating.y - 30, alpha: 0, duration: 520, ease: 'Cubic.easeOut' })
      .then(() => floating.destroy());
  }

  showSpawnFeedback(index, label = 'SUMMON', kind = 'spawn') {
    return Promise.all([
      this.showSlotPulse(index, kind),
      this.showFloatingTextAtSlot(index, label, kind),
    ]);
  }

  showRemoveFeedback(index, label = 'DESTROYED', kind = 'damage') {
    return Promise.all([
      this.showSlotPulse(index, kind),
      this.showFloatingTextAtSlot(index, label, kind),
    ]);
  }

  createMovementGhost(index, unit) {
    const cell = this.getCellByIndex(index);
    const center = this.getBoardCellCenter(index);
    if (!cell || !center || !unit) return null;

    const ghost = this.add.container(center.x, center.y).setDepth(240);
    ghost.add(this.createBoardUnitView(cell, unit));
    return ghost;
  }

  showSwapFeedback(indexA, indexB, label = 'SWAP') {
    const centerA = this.getBoardCellCenter(indexA);
    const centerB = this.getBoardCellCenter(indexB);
    if (!centerA || !centerB) return Promise.resolve();
    const x = (centerA.x + centerB.x) / 2;
    const y = Math.min(centerA.y, centerB.y) - this.layout.board.cellHeight * 0.34;
    const floating = this.add.text(x, y, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(13, Math.floor(this.layout.board.cellWidth * 0.13))}px`,
      color: '#fde68a',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(252);

    return Promise.all([
      this.showSlotPulse(indexA, 'buff'),
      this.showSlotPulse(indexB, 'buff'),
      this.tweenToPromise({ targets: floating, y: floating.y - 24, alpha: 0, duration: 560, ease: 'Cubic.easeOut' }),
    ]).then(() => floating.destroy());
  }

  animateUnitSwap(fromIndex, toIndex, options = {}) {
    const { beforeSnapshot = null, label = 'SWAP' } = options;
    const fromCenter = this.getBoardCellCenter(fromIndex);
    const toCenter = this.getBoardCellCenter(toIndex);
    const fromUnit = beforeSnapshot?.[fromIndex] ?? this.gameState?.board?.[toIndex];
    const toUnit = beforeSnapshot?.[toIndex] ?? this.gameState?.board?.[fromIndex];
    if (!fromCenter || !toCenter || !fromUnit || !toUnit) return Promise.resolve();

    const fromVisual = this.getBoardUnitVisual(fromIndex);
    const toVisual = this.getBoardUnitVisual(toIndex);
    if (fromVisual) fromVisual.setAlpha(0.18);
    if (toVisual) toVisual.setAlpha(0.18);

    const fromGhost = this.createMovementGhost(fromIndex, fromUnit);
    const toGhost = this.createMovementGhost(toIndex, toUnit);
    if (!fromGhost || !toGhost) {
      fromGhost?.destroy();
      toGhost?.destroy();
      if (fromVisual) fromVisual.setAlpha(1);
      if (toVisual) toVisual.setAlpha(1);
      return Promise.resolve();
    }

    const fromCell = this.getCellByIndex(fromIndex);
    const toCell = this.getCellByIndex(toIndex);
    fromCell?.background?.setStrokeStyle(4, 0xfacc15, BOARD_FEEDBACK_STROKE_ALPHA);
    toCell?.background?.setStrokeStyle(4, 0xfacc15, BOARD_FEEDBACK_STROKE_ALPHA);

    return Promise.all([
      this.tweenToPromise({ targets: fromGhost, x: toCenter.x, y: toCenter.y, duration: 175, ease: 'Quad.easeInOut' }),
      this.tweenToPromise({ targets: toGhost, x: fromCenter.x, y: fromCenter.y, duration: 175, ease: 'Quad.easeInOut' }),
      this.showSwapFeedback(fromIndex, toIndex, label),
    ]).then(() => {
      fromGhost.destroy();
      toGhost.destroy();
      if (fromVisual?.active) fromVisual.setAlpha(1);
      if (toVisual?.active) toVisual.setAlpha(1);
    });
  }

  animateUnitMove(fromIndex, toIndex, options = {}) {
    return this.animateUnitSwap(fromIndex, toIndex, options);
  }

  showMovementBlockedFeedback(index, label = 'BLOCKED') {
    return Promise.all([
      this.showSlotPulse(index, 'damage'),
      this.showFloatingTextAtSlot(index, label, 'damage'),
    ]);
  }

  async playMovementFeedback(events = [], beforeSnapshot = null) {
    if (!Array.isArray(events) || events.length === 0) return;
    await Promise.all(events.map((event) => {
      if (event?.type === 'swap') {
        return this.animateUnitSwap(event.fromIndex, event.toIndex, {
          beforeSnapshot,
          label: event.label,
          kind: event.kind,
        });
      }
      if (event?.type === 'movement-blocked') {
        return this.showMovementBlockedFeedback(event.index, event.label);
      }
      return Promise.resolve();
    }));
  }

  async playPostRefreshMovementFeedback(events = []) {
    const swaps = Array.isArray(events) ? events.filter((event) => event?.type === 'swap') : [];
    if (swaps.length === 0) return;
    await Promise.all(swaps.flatMap((event) => [
      this.showSlotPulse(event.fromIndex, 'buff'),
      this.showSlotPulse(event.toIndex, 'buff'),
    ]));
  }

  showDeathTriggerFeedback(sourceIndex, targetIndexOrHero, label = 'DEATH') {
    const animations = [
      this.showSlotPulse(sourceIndex, 'death'),
      this.showFloatingTextAtSlot(sourceIndex, label, 'death'),
    ];
    if (targetIndexOrHero?.targetType === 'hero') {
      animations.push(this.showHeroPulse(targetIndexOrHero.side, 'damage'));
    } else if (Number.isInteger(targetIndexOrHero)) {
      animations.push(this.showSlotPulse(targetIndexOrHero, 'damage'));
    }
    return Promise.all(animations);
  }

  showHandFloatingText(label, color = '#bfdbfe') {
    const { width, hand } = this.layout;
    const x = hand?.handTrackLeft ? hand.handTrackLeft + Math.min(2, Math.max(0, (this.gameState?.player?.hand?.length ?? 1) - 1)) * hand.step : width * 0.5;
    const y = hand?.y ? hand.y + Math.max(18, hand.cardRowHeight * 0.18) : this.scale.height * 0.78;
    const text = this.add.text(x, y, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(16, Math.floor((hand?.cardWidth ?? 120) * 0.16))}px`,
      color,
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(245);

    const pulseTargets = this.cardViews
      .slice(0, Math.max(1, Math.min(this.cardViews.length, this.gameState?.player?.hand?.length ?? 1)))
      .map((view) => view.root)
      .filter(Boolean);

    const tweens = [
      this.tweenToPromise({ targets: text, y: text.y - 28, alpha: 0, duration: 760, ease: 'Cubic.easeOut' }),
    ];
    if (pulseTargets.length > 0) {
      tweens.push(this.tweenToPromise({ targets: pulseTargets, scaleX: 1.03, scaleY: 1.03, duration: 110, yoyo: true }));
    }

    return Promise.all(tweens).then(() => text.destroy());
  }

  showUnitFloatingText(cell, label, color = '#bbf7d0') {
    if (!cell?.background) return Promise.resolve();
    const floating = this.add.text(cell.background.x, cell.background.y - this.layout.board.cellHeight * 0.34, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(13, Math.floor(this.layout.board.cellWidth * 0.12))}px`,
      color,
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(245);

    const tweens = [this.tweenToPromise({ targets: floating, y: floating.y - 28, alpha: 0, duration: 760, ease: 'Cubic.easeOut' })];
    if (cell.label) tweens.push(this.tweenToPromise({ targets: cell.label, scaleX: 1.12, scaleY: 1.12, duration: 140, yoyo: true }));
    return Promise.all(tweens).then(() => floating.destroy());
  }

  showHeroHeal(side, amount) {
    if (amount <= 0) return Promise.resolve();
    const hero = this.getHeroPanel(side);
    if (!hero) return Promise.resolve();
    const text = this.add.text(hero.x + hero.width * 0.34, hero.y - hero.height * 0.18, `+${amount} HP`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      color: '#bbf7d0',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(245);

    return Promise.all([
      this.tweenToPromise({ targets: hero, scaleX: 1.05, scaleY: 1.05, duration: 120, yoyo: true }),
      this.tweenToPromise({ targets: text, y: text.y - 30, alpha: 0, duration: 760, ease: 'Cubic.easeOut' }),
    ]).then(() => text.destroy());
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
        if (shouldUseControlledHeroStrikePresentation(event)) {
          await this.animateControlledHeroStrike(event, preCombatBoardSnapshot);
        } else if (attackerWasDefeatedInThisLane) {
          await this.playCombatEventFeedback([event]);
        } else if (getCombatAttackPresentation(event, preCombatBoardSnapshot) === COMBAT_ATTACK_PRESENTATIONS.beam) {
          await this.animateBeamAttack(event, preCombatBoardSnapshot);
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

    const targetIndex = getCombatEventInterceptOriginalTargetIndex(event) ?? this.getCombatEventTargetIndex(event);
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

  async animateBeamAttack(event, preCombatBoardSnapshot = null) {
    const attacker = this.getCombatAttackerVisual(event, preCombatBoardSnapshot);
    const target = this.getCombatTargetVisual(event);
    if (!attacker || !target) {
      await this.playCombatEventFeedback([event]);
      return;
    }

    const cue = this.createBeamAttackCue(attacker.cell, target, event);
    if (!cue) {
      await this.playCombatEventFeedback([event]);
      return;
    }

    try {
      await cue.flashAttacker();
      await cue.revealBeam();
      await this.playCombatEventFeedback([event]);
      await this.delay(45);
    } finally {
      cue.destroy();
    }
  }

  createBeamAttackCue(attackerCell, target, event) {
    if (!attackerCell?.background) return null;

    const startX = attackerCell.background.x;
    const startY = attackerCell.background.y;
    const targetPoint = this.getCombatTargetBeamPoint(target, event);
    if (!targetPoint) return null;

    const beam = this.add.graphics().setDepth(238).setAlpha(0);
    beam.lineStyle(3, 0xff1f3d, 0.94);
    beam.beginPath();
    beam.moveTo(startX, startY);
    beam.lineTo(targetPoint.x, targetPoint.y);
    beam.strokePath();
    beam.lineStyle(1, 0xffc4c4, 0.88);
    beam.beginPath();
    beam.moveTo(startX, startY);
    beam.lineTo(targetPoint.x, targetPoint.y);
    beam.strokePath();

    const flashRadius = Math.max(8, Math.min(attackerCell.background.width, attackerCell.background.height) * 0.12);
    const eyeFlash = this.add.graphics().setDepth(242).setAlpha(0);
    eyeFlash.fillStyle(0xff1f3d, 0.88);
    eyeFlash.fillCircle(startX, startY, flashRadius);
    eyeFlash.lineStyle(2, 0xffc4c4, 0.9);
    eyeFlash.strokeCircle(startX, startY, flashRadius + 2);

    const targetFlash = this.add.graphics().setDepth(241).setAlpha(0);
    targetFlash.fillStyle(0xff1f3d, 0.3);
    targetFlash.fillCircle(targetPoint.x, targetPoint.y, flashRadius * 1.35);
    targetFlash.lineStyle(2, 0xff6b6b, 0.95);
    targetFlash.strokeCircle(targetPoint.x, targetPoint.y, flashRadius * 1.75);

    return {
      flashAttacker: () => Promise.all([
        this.tweenToPromise({ targets: eyeFlash, alpha: 1, duration: 35, ease: 'Quad.easeOut' }),
        this.tweenToPromise({ targets: attackerCell.background, scaleX: 1.025, scaleY: 1.025, duration: 35, yoyo: true, ease: 'Quad.easeOut' }),
      ]),
      revealBeam: () => Promise.all([
        this.tweenToPromise({ targets: beam, alpha: 1, duration: 45, ease: 'Quad.easeOut' }),
        this.tweenToPromise({ targets: eyeFlash, alpha: 0.72, duration: 45, ease: 'Quad.easeInOut' }),
        this.tweenToPromise({ targets: targetFlash, alpha: 1, duration: 45, ease: 'Quad.easeOut' }),
      ]),
      destroy: () => {
        beam.destroy();
        eyeFlash.destroy();
        targetFlash.destroy();
      },
    };
  }

  getCombatTargetBeamPoint(target, event) {
    if (target?.type === 'unit' && target.cell?.background) {
      return { x: target.cell.background.x, y: target.cell.background.y };
    }

    if (target?.type === 'hero' && target.hero) {
      const heroEdgeY = event.targetSide === 'enemy'
        ? target.hero.y + target.hero.height * 0.5
        : target.hero.y - target.hero.height * 0.5;
      return { x: target.hero.x, y: heroEdgeY };
    }

    return null;
  }

  async animateHeroStrike(event, preCombatBoardSnapshot = null) {
    if (event.controlledAttackFeedback) {
      await this.animateControlledHeroStrike(event, preCombatBoardSnapshot);
      return;
    }

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

  async animateControlledHeroStrike(event, preCombatBoardSnapshot = null) {
    const attacker = this.getCombatAttackerVisual(event, preCombatBoardSnapshot);
    const target = this.getCombatTargetVisual(event);
    if (!attacker || target?.type !== 'hero') {
      await this.playCombatEventFeedback([event]);
      return;
    }

    const attackerCell = attacker.cell;
    const hero = target.hero;
    const visualState = this.captureUnitVisualState(attackerCell);
    const strikePoint = this.getControlledHeroStrikePoint(attackerCell, hero, event);
    const cue = this.createControlledAttackCue(attackerCell, hero, event);
    if (!visualState || !strikePoint || !cue) {
      cue?.destroy?.();
      await this.playCombatEventFeedback([event]);
      return;
    }

    const startY = visualState.y;
    const direction = Math.sign(strikePoint.y - startY) || (event.attackerSide === 'player' ? 1 : -1);
    const maxTravel = Math.min(this.layout.board.cellHeight * 0.62, 115);
    const travel = Math.min(Math.abs(strikePoint.y - startY), maxTravel);
    const strikeY = startY + direction * travel;
    const targets = this.getUnitLungeTargets(attackerCell);

    try {
      this.prepareUnitLungeTargets(targets);
      await cue.reveal();
      await this.tweenToPromise({ targets, y: strikeY, duration: 165, ease: 'Quad.easeOut' });
      await this.playCombatEventFeedback([event]);
      await this.delay(70);
      await this.tweenToPromise({ targets, y: startY, duration: 135, ease: 'Quad.easeIn' });
    } finally {
      this.restoreUnitVisualState(visualState);
      cue.destroy();
    }
  }

  getControlledHeroStrikePoint(attackerCell, hero, event) {
    if (!attackerCell?.background || !hero) return null;

    const heroEdgeY = event.targetSide === 'enemy'
      ? hero.y + hero.height * 0.5
      : hero.y - hero.height * 0.5;
    return { x: hero.x, y: heroEdgeY };
  }

  createControlledAttackCue(attackerCell, hero, event) {
    if (!attackerCell?.background || !hero) return null;

    const startX = attackerCell.background.x;
    const startY = attackerCell.background.y;

    const label = this.add.text(
      startX,
      startY - this.layout.board.cellHeight * 0.4,
      event.controlledAttackFeedback.label ?? 'CONTROLLED\nOVERRIDE',
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${Math.max(12, Math.floor(this.layout.board.cellWidth * 0.11))}px`,
        color: '#fee2e2',
        fontStyle: 'bold',
        align: 'center',
        backgroundColor: '#7f1d1d',
        padding: { x: 5, y: 3 },
      },
    ).setOrigin(0.5).setDepth(245).setAlpha(0).setScale(0.88);

    return {
      reveal: () => this.tweenToPromise({
        targets: label,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 110,
        ease: 'Back.easeOut',
      }),
      destroy: () => {
        label.destroy();
      },
    };
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
    const feedback = events.map(async (event) => {
      await this.playGuardianInterceptCue(event);

      const animations = [];

      if (event.targetType === 'hero') {
        this.showHeroDamage(event.targetSide, event.damage);
        animations.push(this.flashHeroHit(event.targetSide));
      } else {
        const targetIndex = this.getCombatEventTargetIndex(event);
        if (Number.isInteger(targetIndex)) {
          const target = this.getCellByIndex(targetIndex);
          if (target) {
            this.showUnitCombatText(target, event);
            animations.push(this.flashCellHit(target, event));
            if (event.prevention?.prevented) animations.push(this.showLastStandPreventionFeedback(targetIndex, event.prevention));
            if (event.lethal) animations.push(this.playLethalFade(target));
          }
        }
      }

      if (event.quickFixDrawFeedback) {
        const attackerIndex = getCombatEventAttackerIndex(event);
        const attackerCell = Number.isInteger(attackerIndex) ? this.getCellByIndex(attackerIndex) : null;
        const label = this.getDrawFeedbackLabel({
          drawn: event.quickFixDrawFeedback.amount,
          blockedReason: event.quickFixDrawFeedback.blockedReason,
        });
        if (attackerCell) {
          animations.push(this.showUnitFloatingText(attackerCell, label, event.quickFixDrawFeedback.amount > 0 ? '#bfdbfe' : '#fecaca'));
        } else {
          animations.push(this.showHandFloatingText(label, event.quickFixDrawFeedback.amount > 0 ? '#bfdbfe' : '#fecaca'));
        }
      }

      if (event.healFeedback?.targetType === 'hero') {
        animations.push(this.showHeroHeal(event.healFeedback.side, event.healFeedback.amount));
      }

      const modifierFeedback = this.playCombatModifierFeedback(event);
      if (modifierFeedback) animations.push(modifierFeedback);

      if (event.selfDamageFeedback?.targetType === 'unit') {
        const cell = this.getCellByIndex(event.selfDamageFeedback.index);
        if (cell) {
          animations.push(Promise.all([
            this.flashCellHit(cell, { damage: event.selfDamageFeedback.amount, lethal: event.lethal }),
            this.showUnitFloatingText(cell, event.selfDamageFeedback.label ?? `-${event.selfDamageFeedback.amount}`, '#fdba74'),
          ]));
        }
      }

      return animations.length > 0 ? Promise.all(animations) : Promise.resolve();
    });

    await Promise.all(feedback);
  }

  getCombatModifierFeedbackItems(event) {
    if (!Array.isArray(event?.combatModifiers)) return [];
    const attackerIndex = getCombatEventAttackerIndex(event);
    const targetIndex = getCombatEventTargetIndex(event);
    return event.combatModifiers
      .map((modifier) => {
        const index = modifier?.feedback === 'target' ? targetIndex : attackerIndex;
        if (!Number.isInteger(index) || !modifier?.label) return null;
        return { index, label: modifier.label, kind: modifier.type };
      })
      .filter(Boolean);
  }

  getCombatModifierFeedbackColor(kind) {
    if (kind === 'armor-bonus' || kind === 'intercept') return '#bfdbfe';
    if (kind === 'armor-ignore' || kind === 'retarget') return '#fde68a';
    if (kind === 'attack-reduction') return '#fb923c';
    return '#facc15';
  }

  hasGuardianInterceptFeedback(event) {
    return Array.isArray(event?.combatModifiers)
      && event.combatModifiers.some((modifier) => modifier?.type === 'intercept');
  }

  async playGuardianInterceptCue(event) {
    if (!this.hasGuardianInterceptFeedback(event)) return;

    const originalTargetIndex = getCombatEventInterceptOriginalTargetIndex(event);
    const guardianIndex = getCombatEventTargetIndex(event);
    if (!Number.isInteger(originalTargetIndex) || !Number.isInteger(guardianIndex)) return;
    if (originalTargetIndex === guardianIndex) return;

    await this.showGuardianInterceptThreatPulse(originalTargetIndex);
    await this.showGuardianInterceptReactionPulse(guardianIndex);
  }

  showGuardianInterceptThreatPulse(index) {
    const cell = this.getCellByIndex(index);
    if (!cell?.background?.active) return Promise.resolve();

    const previousStyle = {
      lineWidth: cell.background.lineWidth ?? (cell.row === 1 ? 2 : 3),
      strokeColor: cell.background.strokeColor ?? (cell.row === 1 ? 0x94a3b8 : 0xcbd5e1),
      strokeAlpha: cell.background.strokeAlpha ?? (cell.row === 1 ? BOARD_GUIDE_SLOT_STROKE_ALPHA : BOARD_SLOT_STROKE_ALPHA),
      fillColor: cell.background.fillColor ?? 0x0f172a,
      fillAlpha: cell.background.fillAlpha ?? BOARD_SLOT_FILL_ALPHA,
    };

    cell.background.setStrokeStyle(4, 0xf87171, BOARD_FEEDBACK_STROKE_ALPHA);
    cell.background.setFillStyle(0x7f1d1d, Math.max(previousStyle.fillAlpha, 0.42));

    const targets = cell.label?.active ? [cell.label] : [cell.background];
    return this.tweenToPromise({ targets, scaleX: 1.045, scaleY: 1.045, duration: 85, yoyo: true, ease: 'Quad.easeOut' })
      .then(() => this.delay(25))
      .then(() => {
        if (!cell.background?.active) return;
        cell.background.setFillStyle(previousStyle.fillColor, previousStyle.fillAlpha);
        cell.background.setStrokeStyle(previousStyle.lineWidth, previousStyle.strokeColor, previousStyle.strokeAlpha);
        if (cell.label?.active) cell.label.setScale(1);
      });
  }

  showGuardianInterceptReactionPulse(index) {
    const cell = this.getCellByIndex(index);
    if (!cell?.background?.active) return Promise.resolve();

    const previousStyle = {
      lineWidth: cell.background.lineWidth ?? (cell.row === 1 ? 2 : 3),
      strokeColor: cell.background.strokeColor ?? (cell.row === 1 ? 0x94a3b8 : 0xcbd5e1),
      strokeAlpha: cell.background.strokeAlpha ?? (cell.row === 1 ? BOARD_GUIDE_SLOT_STROKE_ALPHA : BOARD_SLOT_STROKE_ALPHA),
      fillColor: cell.background.fillColor ?? 0x0f172a,
      fillAlpha: cell.background.fillAlpha ?? BOARD_SLOT_FILL_ALPHA,
    };

    cell.background.setStrokeStyle(4, 0x93c5fd, BOARD_FEEDBACK_STROKE_ALPHA);
    cell.background.setFillStyle(0x1e3a8a, Math.max(previousStyle.fillAlpha, 0.46));

    const targets = [cell.background, ...(cell.label?.active ? [cell.label] : [])];
    return this.tweenToPromise({ targets, scaleX: 1.085, scaleY: 1.085, duration: 105, yoyo: true, ease: 'Back.easeOut' })
      .then(() => {
        if (!cell.background?.active) return;
        cell.background.setFillStyle(previousStyle.fillColor, previousStyle.fillAlpha);
        cell.background.setStrokeStyle(previousStyle.lineWidth, previousStyle.strokeColor, previousStyle.strokeAlpha);
        cell.background.setScale(1);
        if (cell.label?.active) cell.label.setScale(1);
      });
  }

  playCombatModifierFeedback(event) {
    const items = this.getCombatModifierFeedbackItems(event);
    if (items.length === 0) return null;

    const grouped = new Map();
    items.forEach((item) => {
      const group = grouped.get(item.index) ?? { labels: [], kind: item.kind };
      group.labels.push(item.label);
      grouped.set(item.index, group);
    });

    const animations = [...grouped.entries()].map(([index, group]) => {
      const cell = this.getCellByIndex(index);
      if (!cell) return null;
      return this.showUnitFloatingText(
        cell,
        group.labels.join('\n'),
        this.getCombatModifierFeedbackColor(group.kind),
      );
    }).filter(Boolean);

    return animations.length > 0 ? Promise.all(animations) : null;
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
    if (!isBlocked) this.shakeHeroPanel(side);
    this.tweens.add({ targets: damageText, y: damageText.y - 30, alpha: 0, duration: 720, onComplete: () => damageText.destroy() });
  }

  getHeroFeedbackDamageAmount(event) {
    if (Number.isFinite(event?.amount)) return Math.max(0, event.amount);
    if (typeof event?.label !== 'string') return 0;
    const amount = Number.parseInt(event.label.replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(amount) ? Math.max(0, amount) : 0;
  }

  shakeHeroPanel(side) {
    const hero = this.getHeroPanel(side);
    if (!hero?.active) return Promise.resolve();

    const now = this.time?.now ?? Date.now();
    const state = this.heroHitShakeBySide?.[side] ?? { lastAt: 0 };
    if (now - state.lastAt < HERO_HIT_SHAKE_COOLDOWN_MS) return Promise.resolve();
    state.lastAt = now;
    if (!this.heroHitShakeBySide) this.heroHitShakeBySide = {};
    this.heroHitShakeBySide[side] = state;

    const baseY = Number.isFinite(hero.getData('baseY')) ? hero.getData('baseY') : hero.y;
    hero.setData('baseY', baseY);
    if (hero.getData('shakeTween')) {
      hero.getData('shakeTween').remove();
      hero.y = baseY;
    }

    const direction = side === 'enemy' ? -1 : 1;
    return this.tweenToPromise({
      targets: hero,
      y: baseY + direction * HERO_HIT_SHAKE_OFFSET_PX,
      duration: HERO_HIT_SHAKE_DURATION_MS,
      ease: 'Quad.easeOut',
      yoyo: true,
      onStart: (tween) => {
        hero.setData('shakeTween', tween);
      },
      onComplete: () => {
        if (!hero?.active) return;
        hero.y = baseY;
        hero.setData('shakeTween', null);
      },
      onStop: () => {
        if (!hero?.active) return;
        hero.y = baseY;
        hero.setData('shakeTween', null);
      },
    });
  }

  getUnitCombatTextLabel(event) {
    const isBlocked = event.damage <= 0;
    if (isBlocked) return translateActive('ui.battle.block', 'BLOCK');

    if (event.prevention?.prevented) {
      const visibleDamage = Number.isFinite(event.prevention.visibleDamage)
        ? Math.max(0, event.prevention.visibleDamage)
        : Math.max(0, event.damage - Math.max(0, event.prevention.finalHp ?? 1));
      return visibleDamage > 0 ? `-${visibleDamage}` : 'HIT';
    }

    return `-${event.damage}`;
  }

  showUnitCombatText(target, event) {
    const isBlocked = event.damage <= 0;
    const isPrevented = Boolean(event.prevention?.prevented);
    const damageText = this.add.text(target.background.x, target.background.y - this.layout.board.cellHeight * 0.14, this.getUnitCombatTextLabel(event), {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(15, Math.floor(this.layout.board.cellWidth * (isBlocked ? 0.13 : 0.15)))}px`,
      color: isBlocked ? '#bfdbfe' : (isPrevented ? '#67e8f9' : (event.lethal ? '#fecaca' : '#fde68a')),
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(240);
    this.tweens.add({ targets: damageText, y: damageText.y - 24, alpha: 0, duration: 650, ease: 'Cubic.easeOut', onComplete: () => damageText.destroy() });
  }

  showLastStandPreventionFeedback(index, prevention = {}) {
    const finalHp = Number.isFinite(prevention.finalHp) ? prevention.finalHp : 1;
    return Promise.all([
      this.showSlotPulse(index, 'prevention'),
      this.showFloatingTextAtSlot(index, `LAST STAND\n${finalHp} HP`, 'prevention'),
    ]);
  }

  async flashCellHit(cell, event) {
    if (!cell?.background || !cell?.label) return;

    const strokeColor = event.damage <= 0 ? 0x93c5fd : (event.prevention?.prevented ? 0x06b6d4 : (event.lethal ? 0xfca5a5 : 0xfde68a));
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


  cleanupHandCardFlipReveals() {
    this.handCardFlipReveals.forEach((reveal) => reveal.cleanup());
    this.handCardFlipReveals = [];
  }

  startHandCardFlipReveals(backCards) {
    backCards.forEach((backCard) => {
      const cardView = this.cardViews.find((view) => view.slotIndex === backCard.slotIndex);
      let reveal = null;
      reveal = startHandCardFlipReveal({
        tweens: this.tweens,
        backCard,
        cardView,
        onComplete: () => {
          this.handCardFlipReveals = this.handCardFlipReveals.filter((activeReveal) => activeReveal !== reveal);
        },
      });
      if (reveal) this.handCardFlipReveals.push(reveal);
    });
  }

  redrawHand() {
    this.cleanupHandCardFlipReveals();
    const revealSlots = new Set(findHandCardFlipRevealSlots({
      backCards: this.handBackCards,
      handCards: this.gameState.player.hand,
      cardsVisible: this.layout.hand.cardsVisible,
    }));
    const revealBackCards = this.handBackCards.filter((backCard) => revealSlots.has(backCard.slotIndex));
    this.handBackCards.forEach((backCard) => {
      if (!revealSlots.has(backCard.slotIndex)) backCard.destroy();
    });
    this.handBackCards = [];
    this.cardViews.forEach((view) => {
      view.root?.destroy();
    });
    this.cardViews = [];
    this.drawHand();
    this.startHandCardFlipReveals(revealBackCards);
  }

  getBoardUnitStats(unit, boardIndex = null) {
    if (!unit) return { attack: null, armor: null, health: null };

    const effectiveBoardIndex = Number.isInteger(boardIndex)
      ? boardIndex
      : this.gameState?.board?.indexOf(unit);

    return {
      attack: Number.isInteger(effectiveBoardIndex) && effectiveBoardIndex >= 0
        ? getEffectiveBoardAttack(this.gameState, effectiveBoardIndex)
        : getUnitAttack(unit),
      armor: Number.isInteger(effectiveBoardIndex) && effectiveBoardIndex >= 0
        ? getEffectiveBoardArmor(this.gameState, effectiveBoardIndex)
        : getUnitArmor(unit),
      health: Number.isFinite(unit.hp) ? unit.hp : 0,
    };
  }

  getBoardUnitBaseStats(unit) {
    if (!unit) return { attack: null, armor: null, health: null };

    return {
      attack: Number.isFinite(unit.attack) ? unit.attack : 0,
      armor: Number.isFinite(unit.armor) ? unit.armor : 0,
      health: Number.isFinite(unit.hp) ? unit.hp : 0,
    };
  }

  createBoardRenderStatSnapshot() {
    return this.gameState.board.map((unit, index) => (unit ? {
      id: unit.id,
      cardId: unit.cardId,
      owner: unit.owner,
      attack: getEffectiveBoardAttack(this.gameState, index),
      armor: getEffectiveBoardArmor(this.gameState, index),
      health: Number.isFinite(unit.hp) ? unit.hp : 0,
    } : null));
  }

  getChangedBoardUnitStatKeys(index, unit, currentStats) {
    const previous = this.lastRenderedBoardStats?.[index];
    if (!previous || !this.isSameBoardUnit(previous, unit)) return [];

    return ['attack', 'armor'].filter((key) => previous[key] !== currentStats[key]);
  }

  createBoardUnitView(cell, unit) {
    const unitWidth = Math.max(1, cell.background.width - 8);
    const unitHeight = Math.max(1, cell.background.height - 8);
    const horizontalPad = Math.max(3, Math.round(unitWidth * 0.04));
    const artHorizontalInset = Math.max(2, Math.min(4, Math.round(unitWidth * 0.018)));
    const verticalPad = Math.max(2, Math.round(unitHeight * 0.028));
    const statEdgeInset = Math.max(1, Math.round(unitHeight * 0.009));
    const statGap = Math.max(2, Math.round(unitHeight * 0.01));
    const statHeight = Math.max(18, Math.min(26, Math.round(unitHeight * 0.145)));
    const artHeight = Math.max(1, unitHeight - verticalPad * 2 - statHeight - statGap - statEdgeInset * 2);
    const artWidth = Math.max(1, unitWidth - horizontalPad * 2);
    const isEnemyUnit = unit.owner === 'enemy';
    const topInnerY = -unitHeight / 2 + verticalPad;
    const bottomInnerY = unitHeight / 2 - verticalPad;
    const statsRect = isEnemyUnit
      ? {
        x: -unitWidth / 2 + horizontalPad,
        y: bottomInnerY - statEdgeInset - statHeight,
        width: artWidth,
        height: statHeight,
      }
      : {
        x: -unitWidth / 2 + horizontalPad,
        y: topInnerY + statEdgeInset,
        width: artWidth,
        height: statHeight,
      };
    const artRect = isEnemyUnit
      ? {
        x: -unitWidth / 2 + artHorizontalInset,
        y: topInnerY,
        width: Math.max(1, unitWidth - artHorizontalInset * 2),
        height: Math.max(1, Math.min(artHeight, statsRect.y - statGap - topInnerY)),
      }
      : {
        x: -unitWidth / 2 + artHorizontalInset,
        y: statsRect.y + statsRect.height + statGap,
        width: Math.max(1, unitWidth - artHorizontalInset * 2),
        height: Math.max(1, Math.min(artHeight, bottomInnerY - (statsRect.y + statsRect.height + statGap))),
      };
    const topArtY = artRect.y + artRect.height / 2;
    const bottomArtY = artRect.y + artRect.height / 2;
    const topStatY = statsRect.y + statsRect.height / 2;
    const bottomStatY = statsRect.y + statsRect.height / 2;
    const finalArtY = isEnemyUnit ? topArtY : bottomArtY;
    const finalStatY = isEnemyUnit ? bottomStatY : topStatY;
    const ownerAccent = unit.owner === 'enemy' ? 0xf87171 : 0x60a5fa;
    const boardFactionThemeId = unit.owner === 'enemy'
      ? (this.gameState?.enemy?.factionKey ?? this.enemyFactionKey)
      : (this.gameState?.player?.factionKey ?? this.factionKey);
    const boardSurfaceTheme = resolveCardSurfaceTheme({ factionId: boardFactionThemeId, mode: 'board' });

    const cardBack = this.add.rectangle(0, 0, unitWidth, unitHeight, boardSurfaceTheme.frameFill, 0.74)
      .setStrokeStyle(2, ownerAccent, 0.62);
    const boardInnerPanelColor = BASE_CARD_SURFACE_THEME.innerPanelFill;
    const inner = this.add.rectangle(0, 0, unitWidth - horizontalPad, unitHeight - verticalPad, boardInnerPanelColor, 0.32)
      .setStrokeStyle(1, boardSurfaceTheme.innerPanelEdgeStroke, 0.18);
    const unitStats = this.currentBoardRenderStats?.[cell.index] ?? this.getBoardUnitStats(unit);
    const changedStats = this.getChangedBoardUnitStatKeys(cell.index, unit, unitStats);
    const stats = createStatBadges(this, 0, finalStatY, artWidth, statHeight, unitStats, 0, {
      baseStats: this.getBoardUnitBaseStats(unit),
      changedStats,
      pulseChangedStats: changedStats.length > 0,
    });
    const art = createCardArtwork(this, {
      ...artRect,
      centerX: 0,
      centerY: finalArtY,
    }, unit, {
      enableCardIllustration: true,
      lockDisplayToZone: true,
      artPositionY: isEnemyUnit
        ? BOARD_CARD_ARTWORK_ENEMY_CROP_POSITION_Y
        : BOARD_CARD_ARTWORK_PLAYER_CROP_POSITION_Y,
    });
    const artBackdrop = this.add.rectangle(0, finalArtY, artRect.width, artRect.height, BASE_CARD_SURFACE_THEME.artBackdropFill, 0.22);
    const artStroke = this.add.rectangle(0, finalArtY, artRect.width, artRect.height)
      .setFillStyle(0x000000, 0)
      .setStrokeStyle(1, boardSurfaceTheme.dividerLine, 0.2);
    // Board-only readability polish: prioritize separation/clarity over global brightness.
    const artLocalContrast = this.add.rectangle(0, finalArtY, artRect.width, artRect.height, 0x000000, 0.05);
    const artShade = this.add.rectangle(0, finalArtY - artRect.height * 0.17, artRect.width, artRect.height * 0.52, CARD_COLORS.artTop, 0.34);
    const artBottomDim = this.add.rectangle(0, finalArtY + artRect.height * 0.29, artRect.width, artRect.height * 0.42, BASE_CARD_SURFACE_THEME.artBackdropFill, 0.24);

    return [cardBack, inner, artBackdrop, art, artStroke, artLocalContrast, artShade, artBottomDim, stats];
  }

  refreshBoardLabels() {
    if (this.boardInspectIndex !== null && !this.gameState.board[this.boardInspectIndex]) {
      this.clearBoardInspect({ animate: true });
    }

    const currentRenderStats = this.createBoardRenderStatSnapshot();
    this.currentBoardRenderStats = currentRenderStats;

    this.boardCells.forEach((cell) => {
      const unit = this.gameState.board[cell.index];
      cell.label.removeAll(true);
      cell.label.setAlpha(1).setScale(1);
      if (unit) {
        cell.label.add(this.createBoardUnitView(cell, unit));
      }
      const lane = cell.index % 3;
      const isEnemyRow = cell.row === 0;
      const isPlayerRow = cell.row === 2;
      const laneBlocked = (
        !unit
        && (
          (isEnemyRow && this.gameState.enemyLanePlayBlockedThisTurn?.[lane])
          || (isPlayerRow && this.gameState.playerLanePlayBlockedThisTurn?.[lane])
        )
      );
      cell.blockedMarker.setText(laneBlocked ? '✕' : '');
    });

    this.lastRenderedBoardStats = currentRenderStats;
    this.currentBoardRenderStats = null;
    this.turnStartBanner = null;
    this.turnStartBannerFadeOutEvent = null;
    this.hasShownOpeningTurnStartBanner = false;
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
          enableCardIllustration: true,
          showCardNumber: true,
          factionThemeId: this.gameState?.player?.factionKey ?? this.factionKey,
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
          enableCardIllustration: true,
          showCardNumber: false,
          statValues: this.getBoardUnitStats(unit),
          baseStatValues: this.getBoardUnitBaseStats(unit),
          factionThemeId: unit.owner === 'enemy'
            ? (this.gameState?.enemy?.factionKey ?? this.enemyFactionKey)
            : (this.gameState?.player?.factionKey ?? this.factionKey),
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
      enableCardIllustration: inspectRequest.enableCardIllustration,
      showCardNumber: inspectRequest.showCardNumber,
      statValues: inspectRequest.statValues ?? null,
      baseStatValues: inspectRequest.baseStatValues ?? null,
      factionThemeId: inspectRequest.factionThemeId ?? '',
      surfaceThemeMode: 'inspect',
    });
    const inspectSurfaceTheme = resolveCardSurfaceTheme({ factionId: inspectRequest.factionThemeId ?? '', mode: 'inspect' });

    this.applyInspectDimming(inspectRequest.cardId);

    previewView.root.setAlpha(0).setScale(0.92);
    previewView.glow.setFillStyle(0xfacc15, 0.14);
    previewView.glow.setStrokeStyle(5, 0xfacc15, 0.72);
    previewView.background.setFillStyle(inspectSurfaceTheme.frameSelectedFill, 0.95);
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
      const frameFillColor = card.surfaceTheme?.frameFill ?? CARD_COLORS.frame;
      const frameSelectedFillColor = card.surfaceTheme?.frameSelectedFill ?? CARD_COLORS.frameSelected;

      this.tweens.killTweensOf(allTargets);
      card.background.setStrokeStyle(isActiveHandCard ? 5 : 3, isActiveHandCard ? 0xfacc15 : accentColor, isActiveHandCard ? 1 : viewCard ? 0.76 : 0.7);
      card.background.setFillStyle(isActiveHandCard ? frameSelectedFillColor : frameFillColor, isActiveHandCard ? 0.95 : viewCard ? 0.74 : 0.48);
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
      const swapSourceIndex = this.pendingSwapIndex;
      const swapSourceUnit = swapSourceIndex !== null ? this.gameState.board[swapSourceIndex] : null;
      const isSwapSource = swapSourceIndex === cell.index;
      const isSwapTarget = Boolean(
        swapSourceUnit
        && !this.targetingState
        && !isSwapSource
        && this.gameState.board[cell.index]?.owner === 'player'
        && Math.floor(swapSourceIndex / 3) === Math.floor(cell.index / 3)
        && Math.abs((swapSourceIndex % 3) - (cell.index % 3)) === 1,
      );
      let strokeColor = cell.row === 1 ? 0x94a3b8 : 0xcbd5e1;
      let strokeAlpha = cell.row === 1 ? BOARD_GUIDE_SLOT_STROKE_ALPHA : BOARD_SLOT_STROKE_ALPHA;

      if (isSwapSource) {
        strokeColor = 0xfacc15;
        strokeAlpha = BOARD_TARGET_STROKE_ALPHA;
      } else if (isSwapTarget) {
        strokeColor = 0x22c55e;
        strokeAlpha = BOARD_TARGET_STROKE_ALPHA;
      } else if (isSelectedTarget) {
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
