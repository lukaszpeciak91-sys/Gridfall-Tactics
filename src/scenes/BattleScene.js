import Phaser from 'phaser';
import { getFactionByKey, getFactionKeys } from '../data/factions/index.js';
import { getTutorialBattleData, tutorialEnemyFaction, tutorialPlayerFaction } from '../data/tutorial/tutorialDecks.js';
import { applyTutorialOpeningSetup, isTutorialBattleContext, performTutorialOpeningMulligan } from '../systems/tutorialOpening.js';
import { selectNextTutorialEnemyAction } from '../systems/tutorialEnemyActions.js';
import { checkTutorialInputGate } from '../systems/tutorialInputGate.js';
import { advanceTutorialStep as advanceTutorialControllerStep, createTutorialControllerState, getCurrentTutorialStep as getCurrentTutorialControllerStep, handleTutorialEvent as handleTutorialControllerEvent, isTutorialComplete } from '../systems/tutorialController.js';
import { createInitialBattleState, drawCards, shuffleDeck, canPass, canPlayOrRedeploy, playEffectCard, playOrRedeployUnit, performSwap, resolveCombat, resolveTargetedEffectCard, resolveTargetedUnitOnPlayEffect, getUnitAttack, getUnitArmor, toggleFirstActor, resolveTurnCapWinner, resolveImmediateResourceExhaustionWinner, resolveImmediateNoProgressWinner, recordPassAction, completeActionOpportunity, performOpeningMulligan, STARTING_HAND_SIZE, MAX_OPENING_MULLIGAN_CARDS, getEffectiveBoardAttack, getEffectiveBoardArmor, canPlayEffectCard, isEffectCardBlockedForOwner, isBattleExhaustedEligible, isBoardUnitOffline, normalizeOfflineReservations } from '../systems/GameState.js';
import { chooseEnemyAction, isVerySafeConcedableState, recordBattleActionUse, selectOpeningMulliganCardIds } from '../systems/enemyDecision.js';
import { getTargetingStateForEffect } from '../systems/cardTargeting.js';
import { COMBAT_ATTACK_PRESENTATIONS, getCombatAttackPresentation, getCombatEventAttackerIndex, getCombatEventInterceptOriginalTargetIndex, getCombatEventTargetIndex, getLaneLethalTargetIndexes, getLaneSimultaneousUnitClash, shouldAnimateCombatAttacker, shouldUseControlledHeroStrikePresentation } from '../systems/combatAnimation.js';
import { BATTLE_BACKGROUND_ASSETS, BATTLE_BACKGROUND_FALLBACK_COLOR, BATTLE_BACKGROUND_FALLBACK_COLOR_HEX, createCoverBackground, getBattleBackgroundAsset, hasLoadedImageAsset, preloadBattleBackgroundArt, preloadImageAsset, resolvePublicAssetPath } from '../rendering/backgroundArt.js';
import { getArenaBattlegroundAsset, getArenaBattlegrounds, resolveArenaBattlegroundId } from '../data/arenaBattlegrounds.js';
import { preloadAllCardIllustrations, preloadCardIllustrationsForFaction } from '../rendering/cardIllustrationAssets.js';
import { calculateBattleLayoutMetrics } from '../ui/battleLayout.js';
import { calculateHandCardFocusBounds, calculateTutorialBannerLayout, getLiveHandCardViewById } from '../ui/tutorialUxLayout.js';
import { calculateHandBackCardCoverCrop, calculateHandBackCardDepth, shouldRenderHandBackCard } from '../ui/handBackCardPresentation.js';
import { ACHIEVEMENT_UNLOCK_POPUP_TIMING, calculateAchievementUnlockPopupLayout, createAchievementUnlockPopup } from '../ui/achievementUnlockPopup.js';
import { HAND_CARD_FLIP_REVEAL_DURATION, findHandCardFlipRevealSlots, shouldSkipHandCardFlipReveal, startHandCardFlipReveal } from '../ui/handCardFlipReveal.js';
import { createFloatingControl, createMuteToggleControl, requestPortraitOrientationLock, toggleSceneFullscreen } from '../ui/navigationControls.js';
import { createModalBackButton } from '../ui/modalControls.js';
import { PREMIUM_BROADCAST_FONT_STACK, createImageButton, preloadSecondaryButtonAsset } from '../ui/imageButton.js';
import { formatDeckSummaryEntry } from '../rendering/cardRenderModes.js';
import { beginSceneTransitionOverlay, reconcileSceneTransitionOverlayOrdering, traceSceneTransition } from './sceneTransitionOverlay.js';
import { CARD_COLORS, createCardArtwork, createCardPreviewView, getBaseCardSurfaceTheme, getDefaultCardAccentColor, resolveCardSurfaceTheme, createStatBadges } from '../rendering/cardVisualLayout.js';
import { getCardDisplayName, getCardTextShort } from '../localization/cardDisplay.js';
import { getActiveLocale, translateActive, translateActiveList } from '../localization/localeService.js';
import { applyCampaignBattleResult, clearCampaign, createNewCampaign, isValidCampaignState, loadCampaign, saveCampaign } from '../systems/campaignState.js';
import { incrementBattleStat, incrementCardPlayedStat, loadPlayerStats, markTutorialCompleted, savePlayerStats } from '../systems/playerStats.js';
import { incrementCampaignCompletedStat } from '../systems/playerStats.js';
import { evaluateAndPersistAchievementUnlocks } from '../systems/runtimeAchievements.js';
import { getAchievementDefinitions } from '../systems/achievements.js';
import { clearPresentedQueue, markAchievementPresented, peekAchievementPresentation } from '../systems/achievementPresentationQueue.js';
import { getCardBoardArtPositionY } from '../data/presentation/cardArtCropOverrides.js';
import { AUDIO_KEYS, preloadAudioAssets } from '../audio/audioAssets.js';
import { playManagedSfx, playMusic, playSfx, stopManagedSfx, stopMusic } from '../audio/audioPlayback.js';
import { BATTLE_SCENE_VISUALLY_READY_EVENT, restartBattleScene } from './battleEntryRouter.js';

const HAND_BACK_CARD_ASSET = Object.freeze({
  key: 'ui.card.back',
  path: resolvePublicAssetPath('assets/ui/card_back.webp'),
});

const CAMPAIGN_TROPHY_ASSET = Object.freeze({
  key: 'ui.campaign.victoryArtefact',
  path: resolvePublicAssetPath('assets/ui/campaign-trophy.webp'),
});


const BATTLE_RESULT_SUBTITLE_FALLBACKS = Object.freeze({
  victory: Object.freeze([
    'The audience is delighted.',
    'What a spectacle!',
    'Total domination!',
    'The crowd is going wild!',
  ]),
  defeat: Object.freeze([
    'The audience demands more.',
    'The crowd expected more.',
    'It wasn’t enough this time.',
    'Not everyone gets to leave the stage in glory.',
  ]),
});

const CAMPAIGN_RESULT_FLAVOR_FALLBACKS = Object.freeze({
  won: Object.freeze([
    'Congratulations. The trophy is yours.\nNow hurry home before everything ends there for good.',
    'A magnificent performance. A well-earned trophy.\nNow run along — you might still catch the apocalypse.',
    'The audience is delighted. The trophy is yours.\nWe won’t keep you any longer — your apocalypse is probably still right on schedule.',
    'A marvelous spectacle! It may not improve your situation…\nbut at least you’re going home with a trophy.',
  ]),
  lost: Object.freeze([
    'That’s all for tonight. Thank you for taking part in the show.',
    'It wasn’t your night, but the audience appreciates the performance all the same.',
    'Thank you for participating, and best of luck with your next catastrophe.',
    'A pity. Some return with a trophy. Others simply return.',
  ]),
});

function pickRandomTextEntry(entries, fallback = '') {
  const pool = Array.isArray(entries) ? entries.filter((entry) => typeof entry === 'string' && entry.length > 0) : [];
  if (pool.length === 0) return fallback;
  return pool[Phaser.Math.Between(0, pool.length - 1)] ?? fallback;
}


const INSPECT_CARD_TARGET_SCALE = 2.06;
const INSPECT_CARD_VERTICAL_COMPACT_RATIO = 0.96;
const INSPECT_CARD_MAX_HEIGHT_RATIO = 0.58;
const INSPECT_CARD_MAX_WIDTH_RATIO = 0.78;
const INSPECT_CARD_PLAYER_ROW_GAP_RATIO = 0.2;
const INSPECT_CARD_PLAYER_ROW_BOTTOM_LIMIT_RATIO = 2.78;
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
const DEATH_OVERLAY_DEPTH = 239;
const DEATH_OVERLAY_SHAKE_MS = 65;
const DEATH_OVERLAY_SHAKE_OFFSET_PX = 2;
const DEATH_OVERLAY_FLASH_MS = 70;
const DEATH_OVERLAY_COLLAPSE_MS = 170;
const DEATH_OVERLAY_FINAL_SCALE = 0.89;
const DEATH_OVERLAY_DRIFT_PX = 6;
const DEATH_OVERLAY_FRACTURE_ALPHA = 0.82;
const DEATH_OVERLAY_SHARD_COUNT = 4;
const DEATH_OVERLAY_SHARD_DRIFT_PX = 10;
const HERO_PANEL_FILL_ALPHA = 0.5;
const HERO_PANEL_ACTIVE_FILL_ALPHA = 0.58;
const HERO_PANEL_STROKE_ALPHA = 0.5;
const HERO_PANEL_ACTIVE_STROKE_ALPHA = 0.82;
const HERO_PANEL_HIT_FILL_ALPHA = 0.52;
const HERO_PANEL_HIT_STROKE_ALPHA = 0.86;
const HERO_PANEL_WIDTH_RATIO = 0.66;
const BASE_SCREEN_FILL = 0x0a1728;
const BASE_SCREEN_CENTER = 0x21344b;
const BASE_SCREEN_EDGE = 0x031022;
const BASE_SCREEN_FRAME_DARK = 0x111827;
const BASE_SCREEN_FRAME_LIGHT = 0x94a3b8;
const BASE_SCREEN_FRAME_MID = 0x475569;
const BASE_SCREEN_CONNECTOR = 0x1f2937;
const BASE_SCREEN_INNER_GLOW = 0x38bdf8;
const BASE_SCREEN_SCANLINE = 0x93c5fd;
const BASE_SCREEN_BAND = 0x38bdf8;
const BASE_BEACON_INACTIVE = 0x334155;
const BASE_BEACON_PLAYER_ACTIVE = 0x22d3ee;
const BASE_BEACON_ENEMY_ACTIVE = 0xef4444;
const BASE_BEACON_ENEMY_DAMAGE_REACTION_INTENSITY = 0.78;
const BASE_BEACON_ENEMY_DAMAGE_REACTION_ACTIVE_BOOST = 0.16;
const BASE_BEACON_BRASS = 0xc8a85a;
const BASE_BEACON_FADE_MS = 240;
const BASE_SCREEN_REFLECTION = 0xe0f2fe;
const BASE_MAX_HP = 12;
const BASE_SCREEN_GLITCH_RED = 0xff3b30;
const BASE_SCREEN_GLITCH_CYAN = 0x22d3ee;
const BASE_TERMINAL_TEXT_COLOR = '#fff7df';
const BASE_TERMINAL_TEXT_STROKE = '#083344';
const BASE_TERMINAL_TEXT_STROKE_WIDTH = 3;
const BASE_TERMINAL_TEXT_PLAYER_GLOW = 'rgba(56, 189, 248, 0.42)';
const BASE_TERMINAL_TEXT_ENEMY_GLOW = 'rgba(239, 68, 68, 0.66)';
const BASE_TERMINAL_TEXT_PLAYER_GLOW_BLUR = 4;
const BASE_TERMINAL_TEXT_ENEMY_GLOW_BLUR = 6;
const BASE_TERMINAL_TEXT_OPTICAL_Y_OFFSET_PX = -2;
const BASE_SCREEN_FILL_BRIGHTNESS_ALPHA_BOOST = 0.06;
const BASE_SCREEN_CENTER_BRIGHTNESS_ALPHA_BOOST = 0.025;
const BASE_FRAME_SHADOW = 0x020617;
const BASE_FRAME_RECESS = 0x0f172a;
const BASE_FRAME_OVERLOAD_MS = 135;
const BASE_TERMINAL_FAILURE_MS = 420;
const BASE_TERMINAL_FAILURE_MODAL_DELAY_MS = 360;
const BASE_FRAME_BOOT_MS = 330;
const BASE_TERMINAL_TEXT_REVEAL_MS = 120;
const BASE_FRAME_GRAPHICS_DEPTH = 112;
const BASE_FRAME_BOOT_SWEEP_DEPTH = 113;
const BASE_TERMINAL_TEXT_DEPTH = 123;
const BASE_CRACK_OVERLAY_DEPTH = 123.5;
const BASE_NON_LETHAL_CRACK_MAX_REACH_RATIO = 0.35;
const BASE_NON_LETHAL_CRACK_SIDE_ZONE_RATIO = 0.38;
const BASE_GLASS_REFLECTION_DEPTH = 124;
const FLOATING_FEEDBACK_DEPTH = 250;
const TUTORIAL_BANNER_OVERLAY_DEPTH = 223;
const TUTORIAL_BANNER_DEPTH = 224;
const TUTORIAL_FOCUS_DEPTH = 226;
const TUTORIAL_FOCUS_COLOR = 0xfacc15;
const TUTORIAL_FOCUS_FILL = 0xf59e0b;
const TUTORIAL_LIFECYCLE_DIAG_PREFIX = '[TUTORIAL_LIFECYCLE_DIAG]';

const CAMPAIGN_COMPLETION_OVERLAY_DEPTH = 1200;
const CAMPAIGN_COMPLETION_CONTENT_DEPTH = CAMPAIGN_COMPLETION_OVERLAY_DEPTH + 1;
const CAMPAIGN_COMPLETION_BUTTON_DEPTH = CAMPAIGN_COMPLETION_OVERLAY_DEPTH + 2;
const CAMPAIGN_COMPLETION_OVERLAY_ALPHA = 0.84;
const CAMPAIGN_COMPLETION_TITLE_MAX_WIDTH_RATIO = 0.9;
const CAMPAIGN_COMPLETION_TITLE_MIN_FONT_SIZE = 28;
const CAMPAIGN_COMPLETION_TITLE_MAX_FONT_SIZE = 64;
const BASE_UTILITY_CONTROL_FILL = 0x020617;
const BASE_UTILITY_CONTROL_FILL_ALPHA = 0.62;
const BASE_UTILITY_CONTROL_HOVER_FILL = 0x0f172a;
const BASE_UTILITY_CONTROL_HOVER_FILL_ALPHA = 0.72;
const BASE_UTILITY_CONTROL_STROKE = 0xfacc15;
const BASE_UTILITY_CONTROL_STROKE_ALPHA = 0.58;
const BASE_UTILITY_CONTROL_HOVER_STROKE_ALPHA = 0.82;
const BASE_UTILITY_CONTROL_HALO = 0x38bdf8;
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
const MULLIGAN_HAND_CARD_SELECTED_DEPTH = 80;
const HAND_CARD_SELECTED_LIFT_PX = 14;
const MULLIGAN_HAND_CARD_SELECTED_LIFT_PX = HAND_CARD_SELECTED_LIFT_PX;
const MULLIGAN_SELECTION_BORDER_WIDTH_PX = 1.5;
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
const OPENING_MULLIGAN_REVEAL_CARD_MS = HAND_CARD_FLIP_REVEAL_DURATION;
const OPENING_MULLIGAN_REVEAL_STAGGER_MS = 120;
const OPENING_MULLIGAN_REVEAL_POST_HOLD_MS = 150;
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
const INVALID_ACTION_BANNER_HOLD_MS = 760;
const TURN_START_BANNER_FADE_IN_MS = 110;
const TURN_START_BANNER_HOLD_MS = 820;
const TURN_START_BANNER_FADE_OUT_MS = 140;
const BATTLE_EXHAUSTED_BANNER_DEPTH = 222;
const PLAYER_EFFECT_CAST_BEAT_MS = 620;
const PLAYER_EFFECT_CAST_SWEEP_STEP_MS = 70;
const OFFLINE_UNIT_ALPHA = 0.38;
const OFFLINE_UNIT_DIM_ALPHA = 0.36;
const OFFLINE_UNIT_FADE_IN_MS = 160;
const OFFLINE_UNIT_FADE_OUT_MS = 190;
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
  swap_adjacent_enemy_units: 'Swap adjacent enemies, -1 ATK',
  enemy_all_armor_minus_1: 'Enemies -1 ARM',
  destroy_friendly_damage_enemy_base_1: 'Destroy ally, damage base',
  draw_1: 'Draw 1',
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
  heal_1: 'Heal ally 1',
  cannot_drop_below_1_this_turn: 'Allies survive at 1 HP',
  temp_armor_1: 'Target ally +1 ARM',
  summon_grunt_empty_slot: 'Summon a Grunt',
  buff_all_atk_1: 'All allies +1 ATK',
  revive_friendly_1hp: 'Revive a unit at 1 HP',
  fill_empty_slots_0_1: 'Fill slots with Tokens',
  destroy_friendly_draw_1: 'Destroy ally, draw 1',
});
const BASE_CARD_SURFACE_THEME = getBaseCardSurfaceTheme();
const RESULT_MODAL_DIAG_PREFIX = '[RESULT_MODAL_DIAG]';

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
    this.tutorialEnemyActionCursor = 0;
    this.tutorialControllerState = null;
    this.pendingTutorialEvent = null;
    this.playerSurrenderArmed = false;
    this.targetingState = null;
    this.effectCastState = null;
    this.isEffectCastResolving = false;
    this.targetingInstructionText = null;
    this.activeSelectionBanner = null;
    this.activeSelectionBannerOwner = null;
    this.openingMulliganPending = false;
    this.openingMulliganRevealPending = false;
    this.openingMulliganRevealVisibleCount = 0;
    this.openingMulliganRevealControllers = [];
    this.openingMulliganRevealGeneration = 0;
    this.selectedMulliganCardIds = [];
    this.previewedMulliganCardId = null;
    this.openingBattlePresentationStarted = false;
    this.waitForBattleTransitionPresentation = false;
    this.battleTransitionLaunchId = null;
    this.deckCounterView = null;
    this.deckInfoPanel = null;
    this.battleModalScrollHintObjects = [];
    this.deckInfoHiddenHelpers = [];
    this.rulesPanelHiddenHelpers = [];
    this.bottomControlViews = [];
    this.utilityMenuPanel = null;
    this.surrenderConfirmationModal = null;
    this.isFlowResolving = false;
    this.enemyActionBanner = null;
    this.enemyActionBannerFadeOutEvent = null;
    this.playerActionBanner = null;
    this.playerActionBannerFadeOutEvent = null;
    this.invalidActionBanner = null;
    this.invalidActionBannerFadeOutEvent = null;
    this.battleResultModal = null;
    this.battleResultModalShown = false;
    this.battleResultModalPending = false;
    this.battleResultModalPendingEvent = null;
    this.resultOverlayState = null;
    this.battleStartedAt = null;
    this.battleEndedAt = null;
    this.activeBattleDurationMs = 0;
    this.activeBattleTimerStartedAt = null;
    this.backgroundArtAsset = null;
    this.backgroundLayer = null;
    this.baseFrameViews = { player: null, enemy: null };
    this.terminalShatterTriggeredSides = new Set();
    this.terminalFailedSides = new Set();
    this.terminalTextBootComplete = false;
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
    this.offlineBoardVisualIndexes = new Set();
    this.turnStartBanner = null;
    this.turnStartBannerFadeOutEvent = null;
    this.tutorialBanner = null;
    this.tutorialBannerOverlay = null;
    this.tutorialFocusLayer = null;
    this.tutorialFocusGraphics = [];
    this.currentTutorialFocusKey = null;
    this.pendingTutorialUiRecoveryEvent = null;
    this.pendingTutorialUiRecoveryEvents = [];
    this.tutorialLifecycleDiagnostics = {
      tutorialRestoreCallCount: 0,
      tutorialRestoreSkipCount: 0,
      tutorialBannerUpdateCallCount: 0,
      tutorialFocusUpdateCallCount: 0,
      tutorialUiRecoveryScheduledCount: 0,
      tutorialUiRecoveryFiredCount: 0,
      tutorialUiRecoverySkippedCount: 0,
      tutorialForcedRecreateCount: 0,
      lastTutorialRestoreReason: null,
      lastTutorialRestoreSkipReason: null,
      lastTutorialBannerSkipReason: null,
      lastTutorialFocusSkipReason: null,
      lastTutorialForcedRecreateReason: null,
      lastLifecycleReason: null,
      lastRebuildReason: null,
      lastViewportChangeAt: null,
      lastFullscreenChangeAt: null,
      lastRecoveryReason: null,
    };
    this.battleMenuButtonFocusBounds = null;
    this.deferredTransientBattleBanner = null;
    this.hasShownOpeningTurnStartBanner = false;
    this.playerConcedableHintState = { shownKey: null, stableChecks: 0, lastEligibleKey: null };
    this.passHoldToSurrenderEnabled = false;
    this.passHoldToSurrenderProgress = false;
    this.passHoldToSurrenderEvent = null;
    this.playerSurrenderArmed = false;
    this.battleHistory = [];
    this.pendingBattleHistoryEntries = [];
    this.playerInitialDeckTypeCounts = null;
    this.baseBreakSfxPlayed = false;
    this.battleExhaustedBanner = null;
    this.battleExhaustedBannerEvent = null;
    this.battleOutcomeSfxPlayed = false;
    this.campaignOutcomeSfxPlayed = false;
    this.activeOutcomeStinger = null;
    this.battleAmbienceStopping = false;
    this.battleStatsTracked = false;
    this.achievementUnlockPopupController = null;
    this.achievementUnlockSfxPlayedIds = new Set();
    this.tutorialCompletionTracked = false;
  }

  preload() {
    preloadBattleBackgroundArt(this, getArenaBattlegrounds());
    preloadImageAsset(this, HAND_BACK_CARD_ASSET, {
      onError: (asset) => console.warn(`Hand back card failed to load: ${asset.path}`),
    });
    preloadImageAsset(this, CAMPAIGN_TROPHY_ASSET, {
      onError: (asset) => console.warn(`Campaign trophy failed to load: ${asset.path}`),
    });
    preloadSecondaryButtonAsset(this);
    preloadAllCardIllustrations(this);
    preloadCardIllustrationsForFaction(this, tutorialPlayerFaction);
    preloadCardIllustrationsForFaction(this, tutorialEnemyFaction);
    preloadAudioAssets(this);
  }

  init() {
    this.cleanupSceneObjects();
    this.resetRuntimeState();
  }

  normalizeBattleContext(context = {}) {
    if (context?.mode === 'campaignCompletionPreview') {
      return {
        mode: 'campaignCompletionPreview',
        previewStatus: context.previewStatus === 'won' ? 'won' : 'lost',
        returnSceneKey: typeof context.returnSceneKey === 'string' ? context.returnSceneKey : 'GameMenuScene',
      };
    }
    if (context?.mode === 'tutorial') {
      return {
        mode: 'tutorial',
        tutorialId: typeof context.tutorialId === 'string' ? context.tutorialId : 'tutorial_v1',
        returnSceneKey: typeof context.returnSceneKey === 'string' ? context.returnSceneKey : 'GameMenuScene',
      };
    }
    const mode = context?.mode === 'campaign' ? 'campaign' : 'arena';
    if (mode !== 'campaign') {
      return {
        mode: 'arena',
        battlegroundId: resolveArenaBattlegroundId(context?.battlegroundId),
      };
    }
    return {
      mode: 'campaign',
      campaignRunId: typeof context.campaignRunId === 'string' ? context.campaignRunId : null,
      campaignEnemyFactionKey: typeof context.campaignEnemyFactionKey === 'string' ? context.campaignEnemyFactionKey : null,
    };
  }

  isCampaignBattle() {
    return this.battleContext?.mode === 'campaign';
  }

  isTutorialBattle() {
    return this.battleContext?.mode === 'tutorial';
  }

  resolveBattleBackgroundAsset() {
    if (this.battleContext?.mode === 'arena') {
      return getArenaBattlegroundAsset(this.battleContext?.battlegroundId);
    }

    if (this.battleContext?.mode === 'campaign') {
      return BATTLE_BACKGROUND_ASSETS.default;
    }

    return getBattleBackgroundAsset({ playerFactionKey: this.factionKey, enemyFactionKey: this.enemyFactionKey });
  }

  initializeTutorialController() {
    this.tutorialControllerState = this.isTutorialBattle() ? createTutorialControllerState() : null;
    this.updateTutorialBanner?.();
    return this.tutorialControllerState;
  }

  getCurrentTutorialStep() {
    return getCurrentTutorialControllerStep(this.tutorialControllerState);
  }

  advanceTutorialStep(reason = null) {
    if (!this.isTutorialBattle() || !this.tutorialControllerState) return null;
    const step = advanceTutorialControllerStep(this.tutorialControllerState, reason);
    this.updateTutorialBanner?.();
    return step;
  }

  checkTutorialInputGate(proposal = {}) {
    if (!this.isTutorialBattle?.() || !this.tutorialControllerState) return { allowed: true, reason: 'not_tutorial' };
    return checkTutorialInputGate(this.tutorialControllerState, proposal);
  }

  isTutorialInputAllowed(proposal = {}) {
    return this.checkTutorialInputGate(proposal).allowed;
  }

  handleTutorialEvent(eventName, payload = {}) {
    if (!this.isTutorialBattle() || !this.tutorialControllerState) {
      return { matched: false, completed: false, currentStep: null };
    }
    const result = handleTutorialControllerEvent(this.tutorialControllerState, eventName, payload);
    if (result.matched) this.updateTutorialBanner();
    return result;
  }

  isTutorialStepComplete() {
    return isTutorialComplete(this.tutorialControllerState);
  }

  isCampaignCompletionPreview() {
    return this.battleContext?.mode === 'campaignCompletionPreview';
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
    this.tutorialControllerState = null;
    this.pendingTutorialEvent = null;
    this.targetingState = null;
    this.effectCastState = null;
    this.isEffectCastResolving = false;
    this.targetingInstructionText = null;
    this.activeSelectionBanner = null;
    this.activeSelectionBannerOwner = null;
    this.openingMulliganPending = false;
    this.openingMulliganRevealPending = false;
    this.openingMulliganRevealVisibleCount = 0;
    this.openingMulliganRevealControllers = [];
    this.openingMulliganRevealGeneration = 0;
    this.selectedMulliganCardIds = [];
    this.previewedMulliganCardId = null;
    this.openingBattlePresentationStarted = false;
    this.waitForBattleTransitionPresentation = false;
    this.battleTransitionLaunchId = null;
    this.deckCounterView = null;
    this.deckInfoPanel = null;
    this.battleModalScrollHintObjects = [];
    this.deckInfoHiddenHelpers = [];
    this.rulesPanelHiddenHelpers = [];
    this.bottomControlViews = [];
    this.utilityMenuPanel = null;
    this.surrenderConfirmationModal = null;
    this.isFlowResolving = false;
    this.enemyActionBanner = null;
    this.enemyActionBannerFadeOutEvent = null;
    this.playerActionBanner = null;
    this.playerActionBannerFadeOutEvent = null;
    this.invalidActionBanner = null;
    this.invalidActionBannerFadeOutEvent = null;
    this.battleResultModal = null;
    this.battleResultModalShown = false;
    this.battleResultModalPending = false;
    this.battleResultModalPendingEvent = null;
    this.resultOverlayState = null;
    this.battleStartedAt = null;
    this.battleEndedAt = null;
    this.activeBattleDurationMs = 0;
    this.activeBattleTimerStartedAt = null;
    this.battleAmbienceStopping = false;
    this.gameState = null;
    this.factionKey = null;
    this.layout = null;
    this.battleFrame = null;
    this.enemyHpText = null;
    this.playerHpText = null;
    this.enemyHeroPanel = null;
    this.playerHeroPanel = null;
    this.enemyHeroTitleText = null;
    this.playerHeroTitleText = null;
    this.playerBaseActionLabelText = null;
    this.enemyInitiativeIcon = null;
    this.playerInitiativeIcon = null;
    this.enemyActionSlotBadge = null;
    this.playerActionSlotBadge = null;
    this.lastCombatEvents = [];
    this.enemyFactionKey = null;
    this.battleContext = { mode: 'arena' };
    this.backgroundArtAsset = null;
    this.backgroundLayer = null;
    this.baseFrameViews = { player: null, enemy: null };
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
    this.tutorialBanner = null;
    this.tutorialBannerOverlay = null;
    this.tutorialFocusLayer = null;
    this.tutorialFocusGraphics = [];
    this.currentTutorialFocusKey = null;
    this.pendingTutorialUiRecoveryEvent = null;
    this.pendingTutorialUiRecoveryEvents = [];
    this.tutorialLifecycleDiagnostics = {
      tutorialRestoreCallCount: 0,
      tutorialRestoreSkipCount: 0,
      tutorialBannerUpdateCallCount: 0,
      tutorialFocusUpdateCallCount: 0,
      tutorialUiRecoveryScheduledCount: 0,
      tutorialUiRecoveryFiredCount: 0,
      tutorialUiRecoverySkippedCount: 0,
      tutorialForcedRecreateCount: 0,
      lastTutorialRestoreReason: null,
      lastTutorialRestoreSkipReason: null,
      lastTutorialBannerSkipReason: null,
      lastTutorialFocusSkipReason: null,
      lastTutorialForcedRecreateReason: null,
      lastLifecycleReason: null,
      lastRebuildReason: null,
      lastViewportChangeAt: null,
      lastFullscreenChangeAt: null,
      lastRecoveryReason: null,
    };
    this.battleMenuButtonFocusBounds = null;
    this.deferredTransientBattleBanner = null;
    this.hasShownOpeningTurnStartBanner = false;
    this.playerConcedableHintState = { shownKey: null, stableChecks: 0, lastEligibleKey: null };
    this.passHoldToSurrenderEnabled = false;
    this.passHoldToSurrenderProgress = false;
    this.passHoldToSurrenderEvent = null;
    this.playerSurrenderArmed = false;
    this.baseBreakSfxPlayed = false;
    this.battleOutcomeSfxPlayed = false;
    this.campaignOutcomeSfxPlayed = false;
    this.activeOutcomeStinger = null;
    this.battleStatsTracked = false;
    this.achievementUnlockPopupController = null;
    this.achievementUnlockSfxPlayedIds = new Set();
    this.battleVisuallyReadyEmitted = false;
  }

  cleanupSceneObjects({ preserveTimers = false, preserveTweens = false } = {}) {
    this.stopOutcomeStinger({ fadeMs: 0 });
    this.deferredTransientBattleBanner = null;
    this.battleExhaustedBannerEvent?.remove?.(false);
    this.battleExhaustedBannerEvent = null;
    this.battleExhaustedBanner?.destroy?.();
    this.battleExhaustedBanner = null;
    this.destroyEnemyActionBanner();
    this.destroyTurnStartBanner();
    this.destroyPlayerActionBanner();
    this.cancelTutorialUiRecovery();
    this.destroyTutorialBanner();
    this.destroyTutorialFocus();
    this.destroyTargetingInstruction();
    this.destroyActiveSelectionMessage();
    this.destroyBattleResultModal();
    this.destroyAchievementUnlockPopupController();
    this.destroyUtilityMenuPanel();
    this.closeSurrenderConfirmation();
    this.destroyDeckInfoPanel();
    this.destroyDeckCounterView();
    this.destroySelectedHandCardZoom();
    this.cancelHandCardLongPress();
    this.cancelBoardCellLongPress();
    this.cancelPassHoldToSurrender();
    this.cleanupHandCardFlipReveals();
    this.cleanupOpeningMulliganRevealControllers();
    this.clearHandPanelViews();
    this.clearHandCardViews();
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
    this.baseFrameViews = { player: null, enemy: null };
  }

  emitBattleVisuallyReady() {
    if (this.battleVisuallyReadyEmitted) return false;
    this.battleVisuallyReadyEmitted = true;
    this.events.emit(BATTLE_SCENE_VISUALLY_READY_EVENT, {
      scene: this,
      factionKey: this.factionKey,
      enemyFactionKey: this.enemyFactionKey,
      battleContext: this.battleContext,
      battleTransitionLaunchId: this.battleTransitionLaunchId,
      openingPresentationDeferred: this.waitForBattleTransitionPresentation,
    });
    return true;
  }

  create(data) {
    this.cleanupSceneObjects();
    // Menu music is faded by BattleTransitionScene after visual readiness.
    this.installResultModalDiagnostics();
    this.installTutorialLifecycleDiagnostics();

    const { width, height } = this.scale;
    this.battleContext = this.normalizeBattleContext(data?.battleContext);
    this.battleTransitionLaunchId = typeof data?.battleTransitionLaunchId === 'string' ? data.battleTransitionLaunchId : null;
    this.waitForBattleTransitionPresentation = data?.waitForBattleTransitionPresentation === true && Boolean(this.battleTransitionLaunchId);
    this.openingBattlePresentationStarted = false;
    const isTutorialBattle = this.battleContext?.mode === 'tutorial';
    this.initializeTutorialController();
    const tutorialBattleData = isTutorialBattle ? getTutorialBattleData() : null;
    const playerFactionKey = isTutorialBattle
      ? tutorialBattleData.playerFaction.id
      : (typeof data?.factionKey === 'string' && data.factionKey ? data.factionKey : 'Aggro');
    this.factionKey = playerFactionKey;
    const requestedEnemyFactionKey = typeof data?.enemyFactionKey === 'string' && data.enemyFactionKey ? data.enemyFactionKey : null;
    const enemyFactionKey = isTutorialBattle
      ? tutorialBattleData.enemyFaction.id
      : (requestedEnemyFactionKey ?? this.selectEnemyFactionKey(playerFactionKey));
    this.enemyFactionKey = enemyFactionKey;

    const playerFactionData = isTutorialBattle
      ? tutorialBattleData.playerFaction
      : (getFactionByKey(playerFactionKey) ?? { name: `Unknown (${playerFactionKey})`, deck: [] });
    const enemyFactionData = isTutorialBattle
      ? tutorialBattleData.enemyFaction
      : (getFactionByKey(enemyFactionKey) ?? { name: `Unknown (${enemyFactionKey})`, deck: [] });

    const tutorialOpeningConfig = tutorialBattleData?.openingConfig ?? null;
    this.gameState = createInitialBattleState(playerFactionData, enemyFactionData, {
      playerHP: tutorialOpeningConfig?.playerStartingHp,
      playerMaxHP: tutorialOpeningConfig?.playerStartingHp,
      enemyHP: tutorialOpeningConfig?.enemyStartingHp,
      enemyMaxHP: tutorialOpeningConfig?.enemyStartingHp,
      firstActor: isTutorialBattle ? 'player' : undefined,
    });
    this.battleStartedAt = null;
    this.battleEndedAt = null;
    this.activeBattleDurationMs = 0;
    this.activeBattleTimerStartedAt = null;
    this.terminalShatterTriggeredSides = new Set();
    this.terminalFailedSides = new Set();
    this.terminalTextBootComplete = false;
    this.gameState.player.factionKey = playerFactionKey;
    this.gameState.enemy.factionKey = enemyFactionKey;
    if (isTutorialBattle) {
      this.tutorialEnemyActionCursor = 0;
      applyTutorialOpeningSetup(this.gameState, tutorialOpeningConfig);
    } else {
      shuffleDeck(this.gameState.player.deck);
      shuffleDeck(this.gameState.enemy.deck);
      drawCards(this.gameState.player, STARTING_HAND_SIZE);
      drawCards(this.gameState.enemy, STARTING_HAND_SIZE);
    }
    this.initializeBattleInfoPanelState();
    this.applyEnemyOpeningMulligan();
    this.openingMulliganPending = true;
    this.openingMulliganRevealPending = true;
    this.openingMulliganRevealVisibleCount = 0;
    this.openingMulliganRevealGeneration += 1;

    this.cameras.main.setBackgroundColor(BATTLE_BACKGROUND_FALLBACK_COLOR_HEX);
    this.layout = this.getLayoutMetrics(width, height);
    this.backgroundArtAsset = this.resolveBattleBackgroundAsset();

    this.drawBattleBackground();
    this.drawBattleFrame();
    this.drawBattlefieldCenterLight();
    this.drawBoard();
    this.drawHeroPanels();
    this.refreshHeroHP();
    this.drawDeckCounter();
    this.drawHand();
    this.drawPlayerBaseUtilityMenuTrigger();
    this.updatePlayerBaseActionState();
    this.applyOpeningMulliganRevealPresentation();

    this.scale.on('enterfullscreen', this.onFullscreenChanged, this);
    this.scale.on('leavefullscreen', this.onFullscreenChanged, this);
    this.scale.on('resize', this.onViewportChanged, this);
    this.boundTutorialFullscreenDocumentHandler = (event) => this.onTutorialDocumentFullscreenChanged(event);
    this.boundTutorialViewportDocumentHandler = (event) => this.onTutorialViewportChanged(event);
    globalThis.document?.addEventListener?.('fullscreenchange', this.boundTutorialFullscreenDocumentHandler);
    globalThis.document?.addEventListener?.('webkitfullscreenchange', this.boundTutorialFullscreenDocumentHandler);
    globalThis.window?.addEventListener?.('resize', this.boundTutorialViewportDocumentHandler);
    this.input.on('pointerup', this.onScenePointerUp, this);
    this.input.on('pointerupoutside', this.onScenePointerUpOutside, this);
    this.events.on(Phaser.Scenes.Events.PAUSE, this.onScenePause, this);
    this.events.on(Phaser.Scenes.Events.SLEEP, this.onSceneSleep, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onSceneResume, this);
    this.events.on(Phaser.Scenes.Events.WAKE, this.onSceneWake, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

    this.startCampaignBattleTimer();
    this.emitBattleVisuallyReady();
    this.time.delayedCall(560, () => this.startBattleAmbience());

    if (this.isCampaignCompletionPreview()) {
      const previewStatus = this.battleContext.previewStatus;
      this.time.delayedCall(0, () => {
        this.campaignCompletionModalOptions = {
          preview: true,
          campaign: this.createCampaignCompletionPreviewState(previewStatus),
        };
        this.showCampaignCompleteModal(previewStatus);
      });
    }

    if (!this.waitForBattleTransitionPresentation) {
      this.beginOpeningBattlePresentation();
    }

  }

  beginOpeningBattlePresentation({ battleTransitionLaunchId = null } = {}) {
    if (this.openingBattlePresentationStarted) return false;
    if (this.waitForBattleTransitionPresentation && battleTransitionLaunchId !== this.battleTransitionLaunchId) return false;
    this.openingBattlePresentationStarted = true;
    this.waitForBattleTransitionPresentation = false;
    this.startOpeningMulliganReveal();
    this.updateTutorialBanner();
    return true;
  }

  isResultModalDiagnosticsEnabled() {
    return Boolean(import.meta.env?.DEV);
  }

  getBattleResultModalDiagnosticItems() {
    if (!this.battleResultModal) return [];
    return [
      this.battleResultModal.overlay,
      this.battleResultModal.titleAura,
      this.battleResultModal.titleGlow,
      this.battleResultModal.title,
      this.battleResultModal.subtitle,
      this.battleResultModal.stats,
      this.battleResultModal.dividerCore,
      this.battleResultModal.dividerGlow,
      ...(this.battleResultModal.celebration?.particles ?? this.battleResultModal.celebration ?? []),
      ...(this.battleResultModal.celebration?.modalItems ?? []),
      ...((this.battleResultModal.buttons ?? []).flatMap((button) => button.items ?? [])),
    ].filter(Boolean);
  }

  getResultModalDiagnosticSnapshot() {
    const scenePlugin = this.scene;
    const pendingEvent = this.battleResultModalPendingEvent;
    const modalItems = this.getBattleResultModalDiagnosticItems();
    return {
      sceneKey: scenePlugin?.key ?? 'BattleScene',
      winner: this.gameState?.winner ?? null,
      endingReason: this.gameState?.endingReason ?? null,
      battleResultModalPending: Boolean(this.battleResultModalPending),
      battleResultModalShown: Boolean(this.battleResultModalShown),
      battleResultModalExists: Boolean(this.battleResultModal),
      modalItemCount: modalItems.length,
      isFlowResolving: Boolean(this.isFlowResolving),
      sceneActive: Boolean(scenePlugin?.isActive?.()),
      scenePaused: Boolean(scenePlugin?.isPaused?.()),
      sceneSleeping: Boolean(scenePlugin?.isSleeping?.()),
      pendingEventExists: Boolean(pendingEvent),
      pendingEventLive: pendingEvent ? this.isLiveBattleResultModalPendingEvent(pendingEvent) : false,
    };
  }

  installResultModalDiagnostics() {
    if (!this.isResultModalDiagnosticsEnabled()) return;
    const target = globalThis.window ?? globalThis;
    if (!target) return;
    target.__gridfallResultSnapshot = () => {
      try {
        const battleScene = this.game?.scene?.getScene?.('BattleScene') ?? this;
        if (!battleScene?.getResultModalDiagnosticSnapshot) {
          return { battleSceneExists: false };
        }
        return {
          battleSceneExists: true,
          ...battleScene.getResultModalDiagnosticSnapshot(),
        };
      } catch (error) {
        return {
          battleSceneExists: false,
          error: error?.message ?? String(error),
        };
      }
    };
  }

  logResultModalDiagnostic(stage, extra = {}) {
    if (!this.isResultModalDiagnosticsEnabled()) return;
    console.debug(RESULT_MODAL_DIAG_PREFIX, stage, {
      ...this.getResultModalDiagnosticSnapshot(),
      ...extra,
    });
  }

  isTutorialLifecycleDiagnosticsEnabled() {
    return Boolean(import.meta.env?.DEV);
  }

  logTutorialLifecycleDiagnostic(stage, extra = {}) {
    if (!this.isTutorialLifecycleDiagnosticsEnabled()) return;
    console.debug(TUTORIAL_LIFECYCLE_DIAG_PREFIX, stage, extra);
  }

  installTutorialLifecycleDiagnostics() {
    const target = globalThis.window ?? globalThis;
    if (!target) return;
    target.__gridfallTutorialSnapshot = () => {
      try {
        const battleScene = this.game?.scene?.getScene?.('BattleScene') ?? this;
        if (!battleScene?.getTutorialLifecycleDiagnosticSnapshot) {
          return { battleSceneExists: false, error: 'BattleScene snapshot helper unavailable' };
        }
        return {
          battleSceneExists: true,
          ...battleScene.getTutorialLifecycleDiagnosticSnapshot(),
        };
      } catch (error) {
        return {
          battleSceneExists: false,
          error: error?.message ?? String(error),
        };
      }
    };
  }

  getTutorialSuppressionReasons() {
    const reasons = [];
    if (!this.scene) reasons.push('missing_scene');
    if (!this.gameState) reasons.push('missing_gameState');
    if (!this.layout) reasons.push('missing_layout');
    if (!this.isTutorialBattle?.()) reasons.push('not_tutorial_battle');
    if (!this.tutorialControllerState) reasons.push('missing_tutorialControllerState');
    if (this.isFlowResolving) reasons.push('isFlowResolving');
    if (this.isEffectCastResolving) reasons.push('isEffectCastResolving');
    if (this.battleResultModalPending) reasons.push('battleResultModalPending');
    if (this.battleResultModalShown) reasons.push('battleResultModalShown');
    if (this.gameState?.winner) reasons.push('gameState.winner');
    return reasons;
  }

  getDiagnosticGameObjectState(object) {
    if (!object) return { exists: false };
    let bounds = null;
    try {
      const rect = object.getBounds?.();
      if (rect) bounds = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    } catch (error) {
      bounds = { error: error?.message ?? String(error) };
    }
    return {
      exists: true,
      active: Boolean(object.active),
      visible: object.visible,
      alpha: object.alpha,
      depth: object.depth,
      x: object.x,
      y: object.y,
      width: object.width,
      height: object.height,
      displayWidth: object.displayWidth,
      displayHeight: object.displayHeight,
      scaleX: object.scaleX,
      scaleY: object.scaleY,
      originX: object.originX,
      originY: object.originY,
      scrollFactorX: object.scrollFactorX,
      scrollFactorY: object.scrollFactorY,
      parentContainerExists: Boolean(object.parentContainer),
      sceneExists: Boolean(object.scene),
      inputEnabled: object.input?.enabled,
      interactive: Boolean(object.input),
      pointerdownListeners: object.listenerCount?.('pointerdown'),
      pointerupListeners: object.listenerCount?.('pointerup'),
      bounds,
      displayListExists: Boolean(object.scene?.children?.exists?.(object)),
      displayListIndex: typeof object.scene?.children?.getIndex === 'function' ? object.scene.children.getIndex(object) : null,
      cameraFilter: object.cameraFilter ?? null,
    };
  }

  getTutorialFocusResolutionDiagnostic(step = this.getCurrentTutorialStep?.()) {
    try {
      const target = this.getTutorialFocusTarget?.(step);
      if (!step) return { focusTargetResolved: false, focusTargetReason: 'missing_step', target: null };
      if (!target) return { focusTargetResolved: false, focusTargetReason: 'missing_target', target: null };
      const mechanicallyPossible = this.isTutorialFocusTargetMechanicallyPossible?.(target, step);
      const bounds = this.resolveTutorialFocusBounds?.(target);
      let targetObject = null;
      if (target.type === 'hand_card' || target.type === 'specific_hand_card' || target.type === 'mulligan_card' || target.type === 'effect_card') {
        const cardId = target.cardId ?? getTutorialBattleData().openingConfig.requiredPlayerMulliganCardId;
        const cardView = getLiveHandCardViewById(this.cardViews ?? [], cardId, (object, padding) => this.getGameObjectFocusBounds(object, padding));
        targetObject = cardView?.container ?? cardView?.background ?? cardView?.root ?? null;
      } else if (target.type === 'board_slot' || target.type === 'occupied_board_slot' || target.type === 'open_lane') {
        targetObject = (this.boardCells ?? []).find((cell) => cell?.index === (target.slotIndex ?? target.index ?? 0))?.background;
      } else if (target.type === 'enemy_base') {
        targetObject = this.enemyHeroPanel;
      } else if (target.type === 'player_base' || target.type === 'player_base_button') {
        targetObject = this.playerBaseActionLabelText ?? this.playerHeroPanel;
      } else if (target.type === 'battle_menu_button') {
        targetObject = this.bottomControlViews?.[0]?.backing;
      } else if (target.type === 'deck_counter') {
        targetObject = this.deckCounterView?.backing;
      }
      return {
        focusTargetResolved: Boolean(bounds),
        focusTargetReason: bounds ? null : (mechanicallyPossible ? 'bounds_not_resolved' : 'target_not_mechanically_possible'),
        focusBounds: bounds,
        target,
        targetType: target.type ?? 'other',
        mechanicallyPossible: Boolean(mechanicallyPossible),
        liveBoardCellsCount: this.boardCells?.length ?? 0,
        cardViewsCount: this.cardViews?.length ?? 0,
        targetDisplayObject: this.getDiagnosticGameObjectState(targetObject),
      };
    } catch (error) {
      return { focusTargetResolved: false, focusTargetReason: 'error', error: error?.message ?? String(error) };
    }
  }

  getTutorialLifecycleDiagnosticSnapshot() {
    const step = this.getCurrentTutorialStep?.();
    const win = globalThis.window;
    const doc = globalThis.document;
    const focusResolution = this.getTutorialFocusResolutionDiagnostic(step);
    return {
      scene: {
        key: this.scene?.key ?? null,
        active: this.scene?.isActive?.(),
        paused: this.scene?.isPaused?.(),
        sleeping: this.scene?.isSleeping?.(),
        visible: this.scene?.isVisible?.(),
        scaleWidth: this.scale?.width,
        scaleHeight: this.scale?.height,
        gameSizeWidth: this.scale?.gameSize?.width,
        gameSizeHeight: this.scale?.gameSize?.height,
        canvasWidth: this.game?.canvas?.width,
        canvasHeight: this.game?.canvas?.height,
        scaleIsFullscreen: this.scale?.isFullscreen,
        documentFullscreenElement: Boolean(doc?.fullscreenElement ?? doc?.webkitFullscreenElement),
        viewportWidth: win?.innerWidth,
        viewportHeight: win?.innerHeight,
        lastLifecycleReason: this.tutorialLifecycleDiagnostics?.lastLifecycleReason ?? null,
        lastRecoveryReason: this.tutorialLifecycleDiagnostics?.lastRecoveryReason ?? null,
        lastRebuildReason: this.tutorialLifecycleDiagnostics?.lastRebuildReason ?? null,
      },
      tutorial: {
        isTutorialBattle: Boolean(this.isTutorialBattle?.()),
        tutorialControllerExists: Boolean(this.tutorialControllerState),
        currentTutorialStepIndex: this.tutorialControllerState?.currentStepIndex ?? this.tutorialControllerState?.stepIndex ?? null,
        currentTutorialStepId: step?.id ?? step?.key ?? step?.name ?? null,
        expected: step?.expected ?? null,
        bannerText: this.getTutorialStepText?.(step) ?? '',
        focusTarget: step?.highlightTarget ?? null,
        isTapContinue: Boolean(step?.expected?.type === 'tap_continue'),
      },
      suppression: {
        isTutorialBannerSuppressed: Boolean(this.isTutorialBannerSuppressed?.()),
        shouldSuppressTutorialUiRecovery: Boolean(this.shouldSuppressTutorialUiRecovery?.()),
        reasons: this.getTutorialSuppressionReasons(),
        isFlowResolving: Boolean(this.isFlowResolving),
        isEffectCastResolving: Boolean(this.isEffectCastResolving),
        battleResultModalPending: Boolean(this.battleResultModalPending),
        battleResultModalShown: Boolean(this.battleResultModalShown),
        winner: this.gameState?.winner ?? null,
        openingMulliganPending: Boolean(this.openingMulliganPending),
        deckInfoPanelExists: Boolean(this.deckInfoPanel),
        deckInfoPanelOpen: Boolean(this.deckInfoPanel),
        utilityMenuPanelExists: Boolean(this.utilityMenuPanel),
        utilityMenuPanelOpen: Boolean(this.utilityMenuPanel),
        boardInspectIndex: this.boardInspectIndex ?? null,
        hoverInspectCardId: this.hoverInspectCardId ?? null,
        selectedHandCardZoomExists: Boolean(this.selectedHandCardZoom),
        targetingStateExists: Boolean(this.targetingState),
        pendingSwapIndex: this.pendingSwapIndex ?? null,
        effectCastStateExists: Boolean(this.effectCastState),
      },
      banner: {
        tutorialBanner: { ...this.getDiagnosticGameObjectState(this.tutorialBanner), text: this.tutorialBanner?.text },
        tutorialBannerOverlay: this.getDiagnosticGameObjectState(this.tutorialBannerOverlay),
      },
      focus: {
        tutorialFocusLayer: {
          ...this.getDiagnosticGameObjectState(this.tutorialFocusLayer),
          childCount: this.tutorialFocusLayer?.length ?? this.tutorialFocusLayer?.list?.length ?? 0,
        },
        currentTutorialFocusKey: this.currentTutorialFocusKey ?? null,
        tutorialFocusGraphicsCount: this.tutorialFocusGraphics?.length ?? 0,
        tutorialFocusGraphics: (this.tutorialFocusGraphics ?? []).slice(0, 6).map((item) => this.getDiagnosticGameObjectState(item)),
      },
      focusResolution,
      counters: { ...(this.tutorialLifecycleDiagnostics ?? {}) },
    };
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
    return calculateBattleLayoutMetrics(width, height, {
      maxHandSize: this.gameState.player.maxHandSize,
    });
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

  getPlayerBaseUtilityControlMetrics(side = 'menu') {
    const { width, margin, playerHero, contentWidth } = this.layout;
    const baseWidth = contentWidth * HERO_PANEL_WIDTH_RATIO;
    const controlWidth = Math.min(Math.max(56, width * 0.16), 82);
    const controlHeight = Math.min(Math.max(34, playerHero.h * 0.82), 46);
    const gap = Math.max(8, Math.min(margin, width * 0.03));
    const baseLeft = width * 0.5 - baseWidth / 2;
    const baseRight = width * 0.5 + baseWidth / 2;
    const x = side === 'deck'
      ? baseRight + gap + controlWidth / 2
      : baseLeft - gap - controlWidth / 2;

    return {
      x,
      y: playerHero.centerY,
      width: controlWidth,
      height: controlHeight,
      gap,
      baseWidth,
    };
  }

  createPlayerBaseUtilityControl(x, y, width, height, label, onPointerUp, { fontScale = 0.44 } = {}) {
    const halo = this.add.rectangle(x, y, width + 8, height + 8, BASE_UTILITY_CONTROL_HALO, 0.08)
      .setRounded(Math.max(7, Math.round(height * 0.18)))
      .setStrokeStyle(1, 0x7dd3fc, 0.18)
      .setDepth(198);
    const backing = this.add.rectangle(x, y, width, height, BASE_UTILITY_CONTROL_FILL, BASE_UTILITY_CONTROL_FILL_ALPHA)
      .setRounded(Math.max(6, Math.round(height * 0.16)))
      .setStrokeStyle(1, BASE_UTILITY_CONTROL_STROKE, BASE_UTILITY_CONTROL_STROKE_ALPHA)
      .setDepth(199);
    const text = this.add.text(x, y, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(12, Math.floor(height * fontScale))}px`,
      color: '#f5f1e6',
      fontStyle: 'bold',
      align: 'center',
      fixedWidth: Math.floor(width * 0.92),
    }).setOrigin(0.5).setDepth(200)
      .setShadow(0, 1, 'rgba(3, 17, 40, 0.62)', 1, true, true);

    if (onPointerUp) {
      backing.setInteractive({ useHandCursor: true });
      text.setInteractive({ useHandCursor: true });
      backing.on('pointerover', () => {
        backing.setFillStyle(BASE_UTILITY_CONTROL_HOVER_FILL, BASE_UTILITY_CONTROL_HOVER_FILL_ALPHA);
        backing.setStrokeStyle(1, BASE_UTILITY_CONTROL_STROKE, BASE_UTILITY_CONTROL_HOVER_STROKE_ALPHA);
        halo.setAlpha(0.18);
      });
      backing.on('pointerout', () => {
        backing.setFillStyle(BASE_UTILITY_CONTROL_FILL, BASE_UTILITY_CONTROL_FILL_ALPHA);
        backing.setStrokeStyle(1, BASE_UTILITY_CONTROL_STROKE, BASE_UTILITY_CONTROL_STROKE_ALPHA);
        halo.setAlpha(1);
      });
      backing.on('pointerup', onPointerUp);
      text.on('pointerup', onPointerUp);
    }

    return { halo, backing, text };
  }

  drawPlayerBaseUtilityMenuTrigger() {
    const { x, y, width, height } = this.getPlayerBaseUtilityControlMetrics('menu');
    const menu = this.createPlayerBaseUtilityControl(
      x,
      y,
      width,
      height,
      '☰',
      (pointer, localX, localY, event) => {
        event?.stopPropagation?.();
        this.guardPointerEvent(pointer);
        if (!this.utilityMenuPanel && !(this.isTutorialInputAllowed?.({ type: 'click_battle_menu', target: 'battle_menu_button' }) ?? true)) return;
        if (this.utilityMenuPanel && !(this.isTutorialInputAllowed?.({ type: 'close_battle_menu', target: 'battle_menu_panel' }) ?? true)) return;
        this.toggleUtilityMenuPanel();
      },
      { fontScale: 0.5 },
    );

    this.bottomControlViews = [menu];
    this.battleMenuButtonFocusBounds = { x, y, width, height };
    this.updateTutorialFocus?.();
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

    this.closeInspectPreview({ animate: false, clearSelection: true });
    this.destroyUtilityMenuPanel();

    const { width, height, margin } = this.layout;
    const { x: triggerX, y: triggerY, width: triggerWidth, height: triggerHeight } = this.getPlayerBaseUtilityControlMetrics('menu');
    const panelLeft = triggerX + triggerWidth / 2;
    const menuScale = 1.1;
    const basePanelContentWidth = 208;
    const basePanelHeight = 186;
    const panelContentWidth = Math.round(basePanelContentWidth * menuScale);
    const panelHorizontalPadding = Math.round(4 * menuScale);
    const panelWidth = Math.min(panelContentWidth + panelHorizontalPadding * 2, width - margin - panelLeft);
    const panelHeight = Math.round(basePanelHeight * menuScale);
    const panelTop = triggerY - triggerHeight / 2 - (panelHeight - basePanelHeight) / 2;
    const panelX = Math.min(width - margin - panelWidth / 2, panelLeft + basePanelContentWidth / 2 + 14);
    const panelY = panelTop + panelHeight / 2;
    const rowY = panelTop + Math.round(28 * menuScale);
    const buttonWidth = Math.max(0, panelWidth - panelHorizontalPadding * 2);
    const buttonHeight = Math.round(36 * menuScale);
    const buttonX = panelX;
    const firstButtonY = rowY + Math.round(50 * menuScale);
    const buttonGap = Math.round(42 * menuScale);
    const depth = 720;

    const outsideCatcher = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.001)
      .setInteractive()
      .setDepth(depth);
    outsideCatcher.on('pointerup', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
      this.guardPointerEvent(pointer);
      if (!(this.isTutorialInputAllowed?.({ type: 'close_battle_menu', target: 'battle_menu_panel' }) ?? true)) return;
      this.destroyUtilityMenuPanel();
    });

    const triggerControl = this.createPlayerBaseUtilityControl(triggerX, triggerY, triggerWidth, triggerHeight, '☰', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
      this.guardPointerEvent(pointer);
      if (!(this.isTutorialInputAllowed?.({ type: 'close_battle_menu', target: 'battle_menu_panel' }) ?? true)) return;
      this.destroyUtilityMenuPanel();
    }, { fontScale: 0.5 });

    const panelRadius = 18;
    const panelLeftEdge = panelX - panelWidth / 2;
    const panelTopEdge = panelY - panelHeight / 2;
    const glow = this.add.graphics().setDepth(depth + 1);
    glow.fillStyle(0x38bdf8, 0.09);
    glow.fillRoundedRect(panelLeftEdge - 4, panelTopEdge - 3, panelWidth + 8, panelHeight + 8, panelRadius + 4);
    glow.lineStyle(2, 0x7dd3fc, 0.1);
    glow.strokeRoundedRect(panelLeftEdge - 3, panelTopEdge - 2, panelWidth + 6, panelHeight + 6, panelRadius + 3);

    const panelFrame = this.add.graphics().setDepth(depth + 2);
    panelFrame.fillGradientStyle(0x1e3a5f, 0x172554, 0x020617, 0x020617, 0.34, 0.26, 0.96, 0.98);
    panelFrame.fillRoundedRect(panelLeftEdge, panelTopEdge, panelWidth, panelHeight, panelRadius);
    panelFrame.fillStyle(0x020617, 0.72);
    panelFrame.fillRoundedRect(panelLeftEdge + 1, panelTopEdge + 1, panelWidth - 2, panelHeight - 2, panelRadius - 1);
    panelFrame.lineStyle(1.25, 0x93c5fd, 0.62);
    panelFrame.strokeRoundedRect(panelLeftEdge + 0.5, panelTopEdge + 0.5, panelWidth - 1, panelHeight - 1, panelRadius - 1);
    panelFrame.lineStyle(1, 0xf8fafc, 0.08);
    panelFrame.strokeRoundedRect(panelLeftEdge + 2.5, panelTopEdge + 2.5, panelWidth - 5, panelHeight - 5, panelRadius - 3);
    panelFrame.fillGradientStyle(0x38bdf8, 0x38bdf8, 0x38bdf8, 0x38bdf8, 0.34, 0.16, 0.02, 0.02);
    panelFrame.fillRoundedRect(panelLeftEdge + 16, panelTopEdge + 12, panelWidth - 32, 2, 1);
    panelFrame.fillGradientStyle(0x38bdf8, 0x38bdf8, 0x38bdf8, 0x38bdf8, 0.08, 0.02, 0.24, 0.06);
    panelFrame.fillRoundedRect(panelLeftEdge + 18, panelTopEdge + panelHeight - 17, panelWidth - 36, 1, 1);
    const panel = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x020617, 0.01)
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
      this.createUtilityMenuButton(buttonX, firstButtonY + buttonGap * 2, buttonWidth, buttonHeight, translateActive('ui.battle.utilityMenuSurrender', 'Surrender'), () => this.openSurrenderConfirmationFromUtilityMenu()),
    ];

    buttons.forEach((button) => {
      [button.background, button.text].forEach((item) => item.setDepth(depth + 3));
    });

    this.utilityMenuPanel = {
      outsideCatcher,
      glow,
      panel,
      panelFrame,
      triggerControl,
      fullscreenToggle,
      muteToggle,
      buttons,
    };
    this.handleTutorialEvent?.('battle_menu_opened');
    this.updatePlayerBaseActionState();
  }


  openSurrenderConfirmationFromUtilityMenu() {
    this.destroyUtilityMenuPanel();
    this.utilityMenuPanel = null;
    this.showSurrenderConfirmation();
  }

  showSurrenderConfirmation() {
    if (this.surrenderConfirmationModal || this.gameState?.winner || this.battleResultModalShown) return;
    this.surrenderConfirmationResolving = false;

    const { width, height } = this.scale.gameSize;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.72)
      .setDepth(760)
      .setInteractive();
    const panelWidth = Math.min(width * 0.86, 430);
    const panelHeight = 250;
    const panel = this.add.graphics().setDepth(761);
    panel.fillStyle(0x0f172a, 0.96);
    panel.fillRoundedRect(width / 2 - panelWidth / 2, height / 2 - panelHeight / 2, panelWidth, panelHeight, 22);
    panel.lineStyle(1.5, 0xfb7185, 0.72);
    panel.strokeRoundedRect(width / 2 - panelWidth / 2, height / 2 - panelHeight / 2, panelWidth, panelHeight, 22);
    const title = this.add.text(width / 2, height / 2 - 78, translateActive('ui.battle.surrenderConfirmTitle', 'SURRENDER?'), {
      fontFamily: PREMIUM_BROADCAST_FONT_STACK,
      fontSize: '22px',
      color: '#f8fafc',
      fontStyle: '700',
      align: 'center',
    }).setOrigin(0.5).setDepth(762);
    const message = this.add.text(width / 2, height / 2 - 26, translateActive('ui.battle.surrenderConfirmBody', 'This counts as a defeat.'), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '15px',
      color: '#cbd5e1',
      align: 'center',
      wordWrap: { width: panelWidth - 42 },
    }).setOrigin(0.5).setDepth(762);
    const cancel = this.createSurrenderConfirmationButton(width / 2 - panelWidth * 0.24, height / 2 + 72, panelWidth * 0.42, translateActive('ui.battle.surrenderCancel', 'Cancel'), () => this.closeSurrenderConfirmation());
    const confirm = this.createSurrenderConfirmationButton(width / 2 + panelWidth * 0.24, height / 2 + 72, panelWidth * 0.42, translateActive('ui.battle.surrenderConfirm', 'Surrender'), () => this.confirmPlayerMenuSurrender());
    cancel.items.forEach((item) => item.setDepth?.(762));
    confirm.items.forEach((item) => item.setDepth?.(762));
    this.surrenderConfirmationModal = { items: [overlay, panel, title, message, ...cancel.items, ...confirm.items], buttons: [cancel, confirm] };
  }

  createSurrenderConfirmationButton(x, y, width, label, onPointerUp) {
    return createImageButton(this, {
      x,
      y,
      width,
      height: 58,
      label,
      onPointerUp,
      depth: 762,
      fontSize: '18px',
      textStyle: {
        color: '#f5f1e6',
        fontFamily: PREMIUM_BROADCAST_FONT_STACK,
        fontStyle: '700',
        letterSpacing: 1.7,
      },
      fallbackFill: 0x1e293b,
      fallbackStroke: 0xfb7185,
      fallbackStrokeAlpha: 0.9,
      shadowAlpha: 0.26,
      hoverScale: 1.03,
      downScale: 0.98,
      minTouchHeight: 58,
    });
  }

  closeSurrenderConfirmation() {
    const modal = this.surrenderConfirmationModal;
    this.surrenderConfirmationModal = null;

    const items = modal?.items ?? [];
    items.forEach((item) => {
      item?.removeAllListeners?.();
      item?.destroy?.();
    });
  }

  confirmPlayerMenuSurrender() {
    if (!this.gameState || this.gameState.winner || this.battleResultModalShown || this.surrenderConfirmationResolving) return;

    this.surrenderConfirmationResolving = true;
    this.schedulePlayerMenuSurrenderResolution();
  }

  schedulePlayerMenuSurrenderResolution() {
    const scheduleFrame = globalThis.window?.requestAnimationFrame
      ?? globalThis.requestAnimationFrame
      ?? ((callback) => globalThis.setTimeout?.(callback, 0));
    const scheduleTask = globalThis.window?.setTimeout
      ?? globalThis.setTimeout;

    scheduleFrame(() => {
      scheduleTask(() => this.resolvePlayerMenuSurrender(), 0);
    });
  }

  resolvePlayerMenuSurrender() {
    if (!this.scene || !this.gameState || this.gameState.winner || this.battleResultModalShown) return;

    this.closeSurrenderConfirmation();
    this.destroyUtilityMenuPanel();
    this.closeInspectPreview({ animate: false, clearSelection: true });
    this.destroyDeckInfoPanel();
    this.destroyTargetingInstruction();
    this.destroyActiveSelectionMessage();
    this.navigationInProgress = false;
    this.gameState.winner = 'enemy';
    this.gameState.endingReason = 'player_menu_surrender';
    this.completeBattleFlow(500);
    this.game?.loop?.wake?.();
  }

  createUtilityMenuButton(x, y, width, height, label, onClick) {
    const radius = 10;
    const left = x - width / 2;
    const top = y - height / 2;
    const background = this.add.graphics()
      .setInteractive(new Phaser.Geom.Rectangle(left, top, width, height), Phaser.Geom.Rectangle.Contains);
    background.input.cursor = 'pointer';
    const drawBackground = (isHovering = false) => {
      background.clear();
      background.fillStyle(0x38bdf8, isHovering ? 0.09 : 0.045);
      background.fillRoundedRect(left - 1, top - 1, width + 2, height + 2, radius + 2);
      background.fillGradientStyle(0x1e3a5f, 0x172554, 0x0f172a, 0x020617, isHovering ? 0.34 : 0.24, isHovering ? 0.26 : 0.16, 0.94, 0.96);
      background.fillRoundedRect(left, top, width, height, radius);
      background.fillStyle(0x020617, isHovering ? 0.28 : 0.38);
      background.fillRoundedRect(left + 1, top + 1, width - 2, height - 2, radius - 1);
      background.lineStyle(1.25, isHovering ? 0x93c5fd : 0x38bdf8, isHovering ? 0.78 : 0.52);
      background.strokeRoundedRect(left + 0.5, top + 0.5, width - 1, height - 1, radius - 1);
      background.lineStyle(1, 0xf8fafc, isHovering ? 0.12 : 0.07);
      background.strokeRoundedRect(left + 2, top + 2, width - 4, height - 4, radius - 3);
    };
    drawBackground();
    const text = this.add.text(x, y, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#f8fafc',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const setHover = (isHovering) => {
      drawBackground(isHovering);
    };
    const handlePointerUp = (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
      this.guardPointerEvent(pointer);
      if (this.navigationInProgress) return;
      this.playBattleSfx?.(AUDIO_KEYS.UI_CLICK);
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
    if (!this.utilityMenuPanel) {
      return;
    }

    const { outsideCatcher, glow, panel, panelFrame, triggerControl, fullscreenToggle, muteToggle, buttons } = this.utilityMenuPanel;
    const items = [
      outsideCatcher,
      glow,
      panel,
      panelFrame,
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
    this.handleTutorialEvent?.('battle_menu_closed');
    this.updatePlayerBaseActionState();
    this.updateTutorialBanner?.();
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
    this.updatePlayerBaseActionState?.();
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

  playBattleSfx(key, options = {}) {
    return playSfx(this, key, options);
  }

  startBattleAmbience() {
    if (this.isCampaignCompletionPreview() || this.gameState?.winner) return null;
    this.battleAmbienceStopping = false;
    return playMusic(this, AUDIO_KEYS.BATTLE_AMBIENCE);
  }

  stopBattleAmbience({ fadeMs = 350 } = {}) {
    this.battleAmbienceStopping = true;
    return stopMusic(this, { fadeMs });
  }

  playOutcomeStinger(key) {
    if (![AUDIO_KEYS.BATTLE_VICTORY, AUDIO_KEYS.BATTLE_DEFEAT].includes(key)) return false;
    this.stopBattleAmbience({ fadeMs: 0 });
    if (this.activeOutcomeStinger?.key === key && this.activeOutcomeStinger.sound?.isPlaying) return true;

    this.stopOutcomeStinger({ fadeMs: 0 });
    const sound = playManagedSfx(this, key, { cooldownMs: 0 });
    if (!sound) return false;

    this.activeOutcomeStinger = { key, sound };
    sound.once?.('complete', () => {
      if (this.activeOutcomeStinger?.sound === sound) {
        this.activeOutcomeStinger = null;
      }
    });
    return true;
  }

  stopOutcomeStinger(options = {}) {
    const activeStinger = this.activeOutcomeStinger;
    this.activeOutcomeStinger = null;
    return stopManagedSfx(this, activeStinger?.sound, options);
  }

  isBaseDestructionResult() {
    if (!this.gameState?.winner) return false;
    return (this.gameState.playerHP ?? 1) <= 0 || (this.gameState.enemyHP ?? 1) <= 0;
  }

  playBaseBreakSfxOnce() {
    if (this.baseBreakSfxPlayed || !this.isBaseDestructionResult()) return false;
    this.baseBreakSfxPlayed = true;
    return this.playBattleSfx?.(AUDIO_KEYS.BASE_BREAK);
  }

  playBattleOutcomeSfxOnce() {
    if (this.battleOutcomeSfxPlayed || !this.gameState?.winner) return false;
    this.battleOutcomeSfxPlayed = true;
    if (this.gameState.winner === 'player') return this.playOutcomeStinger(AUDIO_KEYS.BATTLE_VICTORY);
    if (this.gameState.winner === 'enemy') return this.playOutcomeStinger(AUDIO_KEYS.BATTLE_DEFEAT);
    return false;
  }

  playCampaignOutcomeSfxOnce(status) {
    if (this.campaignOutcomeSfxPlayed) return false;
    this.campaignOutcomeSfxPlayed = true;
    return this.playOutcomeStinger(status === 'won' ? AUDIO_KEYS.BATTLE_VICTORY : AUDIO_KEYS.BATTLE_DEFEAT);
  }

  getBattleResultSubtitle() {
    if (!this.gameState?.winner) return '';
    if (this.gameState.winner === 'player') {
      return pickRandomTextEntry(translateActiveList('ui.battle.resultSubtitles.victory', BATTLE_RESULT_SUBTITLE_FALLBACKS.victory), BATTLE_RESULT_SUBTITLE_FALLBACKS.victory[0]);
    }
    if (this.gameState.winner === 'enemy') {
      return pickRandomTextEntry(translateActiveList('ui.battle.resultSubtitles.defeat', BATTLE_RESULT_SUBTITLE_FALLBACKS.defeat), BATTLE_RESULT_SUBTITLE_FALLBACKS.defeat[0]);
    }
    return translateActive('ui.battle.resultSubtitles.draw', 'Production ordered a rematch.');
  }

  getActiveBattleTimestamp() {
    return Date.now();
  }

  startCampaignBattleTimer() {
    if (this.battleStartedAt !== null || this.gameState?.winner) return;
    const now = this.getActiveBattleTimestamp();
    this.battleStartedAt = now;
    this.activeBattleTimerStartedAt = now;
  }

  pauseCampaignBattleTimer() {
    if (!Number.isFinite(this.activeBattleTimerStartedAt)) return;
    const now = this.getActiveBattleTimestamp();
    this.activeBattleDurationMs += Math.max(0, now - this.activeBattleTimerStartedAt);
    this.activeBattleTimerStartedAt = null;
  }

  resumeCampaignBattleTimer() {
    if (this.gameState?.winner || !Number.isFinite(this.battleStartedAt) || Number.isFinite(this.activeBattleTimerStartedAt)) return;
    this.activeBattleTimerStartedAt = this.getActiveBattleTimestamp();
  }

  stopCampaignBattleTimer() {
    this.pauseCampaignBattleTimer();
    this.battleEndedAt ??= this.getActiveBattleTimestamp();
    return this.getActiveBattleDurationMs();
  }

  getActiveBattleDurationMs() {
    const runningDuration = Number.isFinite(this.activeBattleTimerStartedAt)
      ? Math.max(0, this.getActiveBattleTimestamp() - this.activeBattleTimerStartedAt)
      : 0;
    return Math.max(0, this.activeBattleDurationMs + runningDuration);
  }

  formatBattleDuration(totalSeconds) {
    const safeSeconds = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  getBattleResultStatsText() {
    const turns = Math.max(0, this.gameState?.turnsCompleted ?? 0);
    const elapsedSeconds = this.getActiveBattleDurationMs() / 1000;
    const turnsLabel = translateActive('ui.battle.resultStats.turns', 'Turns');
    const timeLabel = translateActive('ui.battle.resultStats.time', 'Time');
    return `${turnsLabel}: ${turns}\n${timeLabel}: ${this.formatBattleDuration(elapsedSeconds)}`;
  }

  trackCompletedCampaignLifecycleStats(previousCampaign, updatedCampaign) {
    if (previousCampaign?.status !== 'active' || !['won', 'lost'].includes(updatedCampaign?.status)) return false;

    try {
      const nextStats = incrementCampaignCompletedStat(loadPlayerStats(), {
        result: updatedCampaign.status,
        playerFactionKey: updatedCampaign.playerFactionKey,
      });
      savePlayerStats(nextStats);
      evaluateAndPersistAchievementUnlocks();
      return true;
    } catch (error) {
      console.warn('Campaign lifecycle player stats tracking failed; campaign flow will continue.', error);
      return false;
    }
  }

  trackPlayerCardPlayedStat(statKey) {
    if (this.isTutorialBattle()) return false;

    try {
      const nextStats = incrementCardPlayedStat(loadPlayerStats(), {
        statKey,
        playerFactionKey: this.gameState?.player?.factionKey ?? this.factionKey,
      });
      savePlayerStats(nextStats);
      return true;
    } catch (error) {
      console.warn('Card play player stats tracking failed; battle flow will continue.', error);
      return false;
    }
  }


  trackTutorialCompletionOnce() {
    if (this.tutorialCompletionTracked || !this.isTutorialBattle() || this.gameState?.winner !== 'player') return false;

    this.tutorialCompletionTracked = true;
    try {
      const nextStats = markTutorialCompleted(loadPlayerStats());
      savePlayerStats(nextStats);
      return true;
    } catch (error) {
      console.warn('Tutorial completion player stats tracking failed; battle flow will continue.', error);
      return false;
    }
  }

  trackCompletedBattleStatsOnce() {
    if (this.battleStatsTracked || !this.gameState?.winner) return false;

    const mode = this.isCampaignBattle() ? 'campaign' : (this.isTutorialBattle() ? null : 'arena');
    const result = {
      player: 'won',
      enemy: 'lost',
      draw: 'drawn',
    }[this.gameState.winner];

    if (!mode || !result) return false;

    this.battleStatsTracked = true;
    try {
      const nextStats = incrementBattleStat(loadPlayerStats(), {
        mode,
        result,
        playerFactionKey: this.gameState.player?.factionKey ?? this.factionKey,
        enemyFactionKey: this.gameState.enemy?.factionKey ?? this.enemyFactionKey,
      });
      savePlayerStats(nextStats);
      return true;
    } catch (error) {
      console.warn('Battle result player stats tracking failed; battle flow will continue.', error);
      return false;
    }
  }

  scheduleBattleResultModal(delayMs = 500) {
    if (!this.gameState?.winner || this.battleResultModalShown || this.battleResultModalPending) return;
    this.stopCampaignBattleTimer();
    const tutorialStatsTracked = this.trackTutorialCompletionOnce();
    const battleStatsTracked = this.trackCompletedBattleStatsOnce();
    if (tutorialStatsTracked || battleStatsTracked) {
      evaluateAndPersistAchievementUnlocks();
    }
    const hasLethalTerminalFailure = Boolean(this.getLethalTerminalFailureSides().length);
    if (hasLethalTerminalFailure) {
      delayMs = Math.min(Math.max(delayMs, BASE_TERMINAL_FAILURE_MODAL_DELAY_MS), BASE_TERMINAL_FAILURE_MS);
    }
    this.battleResultModalPending = true;
    this.isFlowResolving = true;
    this.disableCardHoverInteractions();
    this.stopBattleAmbience({ fadeMs: 350 });
    this.updateActionSlotBadge();
    this.disableResultPendingOverlayInteractions();
    const pendingResultModalEvent = this.time.delayedCall(delayMs, () => this.showBattleResultModal());
    this.battleResultModalPendingEvent = pendingResultModalEvent;
  }


  disableResultPendingOverlayInteractions() {
    this.destroyUtilityMenuPanel?.();
    this.closeSurrenderConfirmation?.();
    this.destroyDeckInfoPanel?.();
    this.destroyTargetingInstruction?.();
    this.destroyActiveSelectionMessage?.();
    this.cancelPassHoldToSurrender?.();
    this.disarmPlayerSurrender?.();

    const disableItem = (item) => {
      if (!item || item.scene == null) return;
      item.removeAllListeners?.('pointerover');
      item.removeAllListeners?.('pointerout');
      item.removeAllListeners?.('pointerdown');
      item.removeAllListeners?.('pointerup');
      item.disableInteractive?.();
    };

    [this.playerHeroPanel, this.deckCounterView?.backing, this.deckCounterView?.text]
      .forEach(disableItem);
    (this.bottomControlViews ?? []).forEach((control) => {
      [control?.backing, control?.text].forEach(disableItem);
    });
  }

  isLiveBattleResultModalPendingEvent(event = this.battleResultModalPendingEvent) {
    if (!event) return false;
    if (event.destroyed || event.removed || event.pendingDelete || event.hasDispatched) return false;
    if (event.active === false) return false;
    if ('callback' in event && typeof event.callback !== 'function') return false;
    return true;
  }

  ensureBattleResultModalVisible(reason = 'unknown') {
    if (!this.gameState?.winner) return false;
    if (this.battleResultModalShown && this.battleResultModal) return false;

    if (this.battleResultModalPending && this.isLiveBattleResultModalPendingEvent()) {
      this.destroyTutorialBanner?.();
      this.destroyTutorialFocus?.();
      return false;
    }

    if (this.battleResultModalPending || this.battleResultModalPendingEvent) {
      console.warn('Recovering stale battle result modal pending state', {
        reason,
        winner: this.gameState.winner,
      });
      this.battleResultModalPendingEvent?.remove?.(false);
      this.battleResultModalPendingEvent = null;
      this.battleResultModalPending = false;
    }

    this.destroyTutorialBanner?.();
    this.destroyTutorialFocus?.();
    this.showBattleResultModal({ skipReveal: true });
    return Boolean(this.battleResultModalShown && this.battleResultModal);
  }

  completeBattleFlow(delayMs = 500) {
    if (!this.gameState?.winner || this.battleResultModalShown) return false;
    this.playBaseBreakSfxOnce();
    this.updateInitiativeIndicator();
    if (this.gameState.endingReason === 'battle_exhausted') {
      this.showBattleExhaustedBannerThenScheduleResult(delayMs);
      return true;
    }
    this.scheduleBattleResultModal(delayMs);
    this.ensureBattleResultModalVisible('complete-battle-flow');
    return true;
  }

  showBattleExhaustedBannerThenScheduleResult(delayMs = 500) {
    if (this.battleExhaustedBanner || this.battleExhaustedBannerEvent || this.battleResultModalPending || this.battleResultModalShown) return;
    if (!this.prepareTransientBattleBanner('battle-exhausted')) {
      this.scheduleBattleResultModal(delayMs);
      return;
    }

    const { height, board } = this.layout;
    const bannerLayout = this.getCentralBattleBannerLayout({ baseWidthRatio: 0.88, horizontalPadding: 16 });
    const fontSize = Math.min(20, Math.max(15, Math.floor(Math.max(board.cellWidth * 0.14, height * 0.018))));
    const banner = this.add.text(bannerLayout.x, bannerLayout.startY, translateActive('ui.battle.battleExhausted', 'BATTLE EXHAUSTED'), {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${fontSize}px`,
      color: '#fde68a',
      backgroundColor: '#713f12',
      align: 'center',
      padding: { x: 16, y: 12 },
      wordWrap: { width: bannerLayout.maxTextWidth },
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(BATTLE_EXHAUSTED_BANNER_DEPTH).setAlpha(0).setScale(0.98).setStroke('#422006', 1);

    this.battleExhaustedBanner = banner;
    this.tweens.add({
      targets: banner,
      alpha: 1,
      y: bannerLayout.targetY,
      scaleX: 1,
      scaleY: 1,
      duration: TURN_START_BANNER_FADE_IN_MS,
      ease: 'Quad.easeOut',
    });

    this.battleExhaustedBannerEvent = this.time.delayedCall(
      TURN_START_BANNER_FADE_IN_MS + TURN_START_BANNER_HOLD_MS,
      () => {
        this.battleExhaustedBannerEvent = null;
        this.tweens.add({
          targets: banner,
          alpha: 0,
          y: bannerLayout.targetY - 6,
          scaleX: 0.98,
          scaleY: 0.98,
          duration: TURN_START_BANNER_FADE_OUT_MS,
          ease: 'Quad.easeIn',
          onComplete: () => {
            if (this.battleExhaustedBanner === banner) this.battleExhaustedBanner = null;
            banner.destroy();
            this.flushDeferredTransientBattleBanner();
            this.scheduleBattleResultModal(delayMs);
          },
        });
      },
    );
  }

  getBattleResultPresentation() {
    if (this.gameState?.winner === 'player') {
      return {
        key: 'victory',
        titleColor: '#bbf7d0',
        frameColor: 0x4ade80,
        glowColor: 0x22c55e,
        accentColor: 0xfacc15,
        overlayAlpha: 0.68,
        revealDuration: 190,
        titleStartScale: 0.98,
        titleEndScale: 1,
        titlePulseScale: 1.03,
        glowPulseAlpha: 0.24,
        subtitleColor: '#d9f99d',
        subtitleShadowColor: 'rgba(22, 101, 52, 0.72)',
      };
    }
    if (this.gameState?.winner === 'enemy') {
      return {
        key: 'defeat',
        titleColor: '#fecaca',
        frameColor: 0xfb7185,
        glowColor: 0xe11d48,
        accentColor: 0xfb7185,
        overlayAlpha: 0.72,
        revealDuration: 360,
        titleStartScale: 0.98,
        titleEndScale: 1,
        titlePulseScale: 1.03,
        glowPulseAlpha: 0.21,
        subtitleColor: '#fca5a5',
        subtitleShadowColor: 'rgba(127, 29, 29, 0.72)',
      };
    }
    return {
      key: 'draw',
      titleColor: '#fde68a',
      frameColor: 0xfacc15,
      glowColor: 0xeab308,
      accentColor: 0xfde68a,
      overlayAlpha: 0.68,
      revealDuration: 260,
      titleStartScale: 0.98,
      titleEndScale: 1,
      titlePulseScale: 1.03,
      glowPulseAlpha: 0.18,
      subtitleColor: '#fcd34d',
      subtitleShadowColor: 'rgba(120, 53, 15, 0.7)',
    };
  }

  addBattleResultVictoryCelebration(centerX, centerY, overlayWidth, overlayHeight, presentation, options = {}) {
    if (presentation.key !== 'victory') return { particles: [], timers: [] };

    const particles = [];
    const timers = [];
    const particleColors = options.particleColors ?? [0xfacc15, 0x86efac, 0x38bdf8, 0xfef3c7];
    const particleDepth = options.particleDepth ?? 904;
    const burstDepth = options.burstDepth ?? 903;
    const titleAnchored = options.titleAnchored === true;
    const spawnTitleBurst = (burstIndex) => {
      const sideBias = burstIndex % 2 === 0 ? -1 : 1;
      const burstX = centerX + sideBias * overlayWidth * (0.17 + Math.random() * 0.16) + (Math.random() - 0.5) * overlayWidth * 0.08;
      const burstY = centerY + (Math.random() - 0.5) * overlayHeight * 0.46;
      const ringColor = particleColors[burstIndex % particleColors.length];
      const ring = this.add.circle(burstX, burstY, 7 + Math.random() * 5, ringColor, 0.84)
        .setDepth(burstDepth);
      ring.setBlendMode?.(Phaser.BlendModes.ADD);
      particles.push(ring);
      this.tweens.add({
        targets: ring,
        scale: { from: 0.75, to: 3.6 + Math.random() * 0.9 },
        alpha: 0,
        duration: 560 + Math.random() * 160,
        ease: 'Cubic.easeOut',
      });

      const sparkCount = 12;
      for (let i = 0; i < sparkCount; i += 1) {
        const angle = (Math.PI * 2 * i) / sparkCount + Math.random() * 0.18;
        const distance = 22 + Math.random() * 34;
        const color = particleColors[(i + burstIndex) % particleColors.length];
        const spark = this.add.rectangle(burstX, burstY, 3.5 + Math.random() * 2.4, 8 + Math.random() * 6, color, 0.98)
          .setDepth(particleDepth)
          .setRotation(angle);
        spark.setBlendMode?.(Phaser.BlendModes.ADD);
        particles.push(spark);
        this.tweens.add({
          targets: spark,
          x: burstX + Math.cos(angle) * distance,
          y: burstY + Math.sin(angle) * distance * 0.72,
          alpha: 0,
          scale: { from: 1.08, to: 0.18 },
          duration: 480 + Math.random() * 220,
          ease: 'Quad.easeOut',
        });
      }
    };
    const spawnWave = (waveIndex) => {
      if (titleAnchored) {
        spawnTitleBurst(waveIndex);
        return;
      }
      const waveOffsetX = (Math.random() - 0.5) * overlayWidth * 0.08;
      const waveOffsetY = (Math.random() - 0.5) * overlayHeight * 0.08;
      const count = 22;
      for (let i = 0; i < count; i += 1) {
        const side = i % 2 === 0 ? -1 : 1;
        const startX = centerX + waveOffsetX + side * (overlayWidth * (0.2 + Math.random() * 0.24));
        const startY = centerY + waveOffsetY - overlayHeight * (0.35 + Math.random() * 0.2);
        const size = 3 + Math.random() * 5;
        const color = particleColors[(i + waveIndex) % particleColors.length];
        const particle = this.add.rectangle(startX, startY, size, size * (1.35 + Math.random()), color, 0.9)
          .setDepth(particleDepth)
          .setRotation(Math.random() * Math.PI);
        particles.push(particle);
        this.tweens.add({
          targets: particle,
          x: startX + side * (10 + Math.random() * 48),
          y: startY + overlayHeight * (0.42 + Math.random() * 0.36),
          alpha: 0,
          rotation: particle.rotation + side * (1.2 + Math.random() * 2.8),
          duration: 760 + Math.random() * 380,
          ease: 'Sine.easeOut',
        });
      }

      for (let i = 0; i < 6; i += 1) {
        const burst = this.add.circle(
          centerX + waveOffsetX + (Math.random() - 0.5) * overlayWidth * 0.76,
          centerY + waveOffsetY - overlayHeight * (0.15 + Math.random() * 0.22),
          2 + Math.random() * 2.2,
          presentation.accentColor,
          0.7,
        ).setDepth(burstDepth);
        particles.push(burst);
        this.tweens.add({
          targets: burst,
          scale: { from: 0.6, to: 2.4 + Math.random() },
          alpha: 0,
          duration: 520 + Math.random() * 280,
          ease: 'Quad.easeOut',
        });
      }
    };

    if (options.waveDelays) {
      options.waveDelays.forEach((delayMs, waveIndex) => {
        timers.push(this.time.delayedCall(delayMs, () => spawnWave(waveIndex)));
      });
    } else {
      [0, 800, 1600].forEach((delayMs, waveIndex) => {
        timers.push(this.time.delayedCall(delayMs, () => spawnWave(waveIndex)));
      });
    }

    return { particles, timers };
  }


  addBattleResultVictoryCelebrationSafely(centerX, centerY, overlayWidth, overlayHeight, presentation) {
    try {
      return this.addBattleResultVictoryCelebration(centerX, centerY, overlayWidth, overlayHeight, presentation);
    } catch (error) {
      this.logResultModalDiagnostic('showBattleResultModal:victory-celebration-failed', {
        errorMessage: error?.message ?? String(error),
      });
      console.warn('Battle result victory celebration failed; continuing with base result modal.', error);
      return { particles: [], timers: [] };
    }
  }


  getBattleResultOverlayKind() {
    if (this.isCampaignBattle()) return 'campaign-battle-result';
    if (this.isTutorialBattle()) return 'tutorial-battle-result';
    return 'arena-battle-result';
  }

  getBattleResultModalButtons({ centerX, buttonY, buttonWidth, buttonHeight, gap, presentation }) {
    if (this.isCampaignBattle()) {
      return [this.createResultModalButton(
        centerX,
        buttonY,
        buttonWidth,
        buttonHeight,
        translateActive('ui.common.continue', 'CONTINUE'),
        () => this.continueCampaignBattleResult(),
        presentation,
      )];
    }

    if (this.isTutorialBattle()) {
      return [this.createResultModalButton(
        centerX,
        buttonY,
        buttonWidth,
        buttonHeight,
        translateActive('ui.common.exit', 'EXIT'),
        () => this.exitTutorialBattleToGameMenu(),
        presentation,
      )];
    }

    return [
      this.createResultModalButton(
        centerX - buttonWidth / 2 - gap / 2,
        buttonY,
        buttonWidth,
        buttonHeight,
        translateActive('ui.common.exit', 'EXIT'),
        () => this.exitBattleToFactionSelect(),
        presentation,
      ),
      this.createResultModalButton(
        centerX + buttonWidth / 2 + gap / 2,
        buttonY,
        buttonWidth,
        buttonHeight,
        translateActive('ui.common.retry', 'RETRY'),
        () => this.retryBattle(),
        presentation,
      ),
    ];
  }

  showBattleResultModal() {
    const options = arguments[0] ?? {};
    const skipReveal = options.skipReveal === true;
    this.logResultModalDiagnostic('showBattleResultModal:entered', { skipReveal });
    this.disableCardHoverInteractions();
    if (!this.gameState?.winner || this.battleResultModalShown) {
      this.battleResultModalPending = false;
      return;
    }
    const modalItems = [];
    try {
      this.disableResultPendingOverlayInteractions();
      this.updateActionSlotBadge();
      this.selectedCardId = null;
      this.pendingSwapIndex = null;
      this.targetingState = null;
      this.destroyActiveSelectionMessage();
      this.destroyTutorialBanner();
      this.destroyTutorialFocus();
      this.resetCardHighlights({ showPreview: false });

      const { width, height } = this.scale.gameSize;
      const centerX = width * 0.5;
      const centerY = height * 0.38;
      const overlayWidth = Math.min(width * 0.94, 720);
      const overlayHeight = Math.min(Math.max(height * 0.27, 230), 310);
      const resultText = this.getBattleResultText();
      const resultSubtitle = typeof options.resultSubtitle === 'string'
        ? options.resultSubtitle
        : this.getBattleResultSubtitle();
      const resultStatsText = this.getBattleResultStatsText();
      const presentation = this.getBattleResultPresentation();
      this.logResultModalDiagnostic('showBattleResultModal:before-result-sfx', { skipReveal });
      this.playBattleOutcomeSfxOnce();
      this.logResultModalDiagnostic('showBattleResultModal:after-result-sfx', { skipReveal });

      const overlay = this.add.rectangle(centerX, height * 0.5, width, height, 0x000000, presentation.overlayAlpha)
        .setInteractive()
        .setDepth(900);
      modalItems.push(overlay);

      const titleAura = this.add.ellipse(centerX, centerY - overlayHeight * 0.1, overlayWidth * 0.76, overlayHeight * 0.34, presentation.glowColor, 0.08)
        .setDepth(901);
      modalItems.push(titleAura);
      titleAura.setBlendMode?.(Phaser.BlendModes.ADD);
      const titleFontSize = Math.min(Math.max(58, Math.floor(height * 0.092)), 96);
      const titleGlow = this.add.text(centerX, centerY - overlayHeight * 0.1, resultText, {
      fontFamily: PREMIUM_BROADCAST_FONT_STACK,
      fontSize: `${titleFontSize}px`,
      color: presentation.titleColor,
      fontStyle: '700',
      align: 'center',
      letterSpacing: 2.2,
      }).setOrigin(0.5).setDepth(902).setAlpha(0.2);
      modalItems.push(titleGlow);
      titleGlow.setShadow(0, 0, presentation.titleColor, 12, true, true);
      const title = this.add.text(centerX, centerY - overlayHeight * 0.1, resultText, {
      fontFamily: PREMIUM_BROADCAST_FONT_STACK,
      fontSize: `${titleFontSize}px`,
      color: presentation.titleColor,
      fontStyle: '700',
      align: 'center',
      letterSpacing: 2.2,
      }).setOrigin(0.5).setDepth(904);
      modalItems.push(title);
      title.setShadow(0, 3, 'rgba(0, 0, 0, 0.62)', 5, true, true);
      const subtitle = this.add.text(centerX, centerY + overlayHeight * 0.2, resultSubtitle, {
      fontFamily: PREMIUM_BROADCAST_FONT_STACK,
      fontSize: `${Math.max(20, Math.floor(height * 0.029))}px`,
      color: presentation.subtitleColor,
      align: 'center',
      wordWrap: { width: Math.min(width * 0.86, 620), useAdvancedWrap: true },
      }).setOrigin(0.5).setDepth(903);
      modalItems.push(subtitle);
      subtitle.setShadow(0, 2, presentation.subtitleShadowColor, 5, true, true);

      const stats = this.add.text(centerX, centerY + overlayHeight * 0.48, resultStatsText, {
      fontFamily: PREMIUM_BROADCAST_FONT_STACK,
      fontSize: `${Math.max(14, Math.min(20, Math.floor(height * 0.021)))}px`,
      color: '#d1d5db',
      fontStyle: '500',
      align: 'center',
      lineSpacing: Math.max(5, Math.floor(height * 0.007)),
      wordWrap: { width: Math.min(width * 0.82, 520), useAdvancedWrap: true },
      }).setOrigin(0.5).setDepth(903).setAlpha(0.86);
      modalItems.push(stats);
      stats.setShadow(0, 2, 'rgba(0, 0, 0, 0.68)', 4, true, true);

      const dividerWidth = Math.min(overlayWidth * 0.52, 360);
      const dividerY = centerY + overlayHeight * 0.37;
      const dividerCore = this.add.rectangle(centerX, dividerY, dividerWidth, 1, presentation.accentColor, 0.52)
        .setDepth(903);
      modalItems.push(dividerCore);
      const dividerGlow = this.add.rectangle(centerX, dividerY, dividerWidth * 0.84, 3, presentation.glowColor, 0.12)
        .setDepth(902);
      modalItems.push(dividerGlow);
      dividerGlow.setBlendMode?.(Phaser.BlendModes.ADD);

      const buttonWidth = Math.min(198, Math.max(160, width * 0.39));
      const buttonHeight = Math.max(68, Math.min(80, Math.floor(height * 0.088)));
      const buttonY = Math.min(
        height * 0.6,
        this.layout.playerHero.y - buttonHeight * 0.5 - Math.max(6, height * 0.01),
      );
      const gap = Math.max(22, Math.min(42, width * 0.065));
      const modalButtons = this.getBattleResultModalButtons({
        centerX,
        buttonY,
        buttonWidth,
        buttonHeight,
        gap,
        presentation,
      });
      modalButtons.forEach((button) => modalItems.push(...(button.items ?? [])));

      let celebration = { particles: [], timers: [] };
      if (skipReveal) {
        title.setScale(presentation.titleEndScale).setAlpha(1);
        titleGlow.setScale(presentation.titleEndScale).setAlpha(1);
        titleAura.setScale(presentation.titleEndScale).setAlpha(presentation.glowPulseAlpha);
      } else {
        title.setScale(presentation.titleStartScale).setAlpha(0);
        titleGlow.setScale(presentation.titleStartScale).setAlpha(0);
        titleAura.setScale(presentation.titleStartScale).setAlpha(0);
        this.tweens.add({
          targets: [title, titleGlow, titleAura],
          scale: presentation.titleEndScale,
          alpha: { from: 0, to: 1 },
          duration: presentation.revealDuration,
          ease: 'Sine.easeOut',
          onComplete: () => {
            this.tweens.add({
              targets: [title, titleGlow],
              scale: presentation.titlePulseScale,
              duration: 1850,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut',
            });
            this.tweens.add({
              targets: titleAura,
              scale: 1.04,
              alpha: { from: presentation.glowPulseAlpha * 0.35, to: presentation.glowPulseAlpha },
              duration: 1850,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut',
            });
          },
        });
        celebration = this.addBattleResultVictoryCelebrationSafely(centerX, centerY, overlayWidth, overlayHeight, presentation);
      }

      this.logResultModalDiagnostic('showBattleResultModal:before-modal-assignment', {
        skipReveal,
        pendingModalItemCount: modalItems.length,
      });
      this.battleResultModalPending = false;
      this.isFlowResolving = false;
      this.battleResultModal = {
        overlay,
        titleAura,
        titleGlow,
        title,
        subtitle,
        stats,
        dividerCore,
        dividerGlow,
        celebration,
        buttons: modalButtons,
      };
      this.battleResultModalShown = true;
      this.logResultModalDiagnostic('showBattleResultModal:shown', { skipReveal });
      this.resultOverlayState = {
        kind: this.getBattleResultOverlayKind(),
        phase: 'interactive',
        resultSubtitle,
      };
      this.startAchievementUnlockPopupsForResultModal();
    } catch (error) {
      this.logResultModalDiagnostic('showBattleResultModal:catch', {
        errorMessage: error?.message ?? String(error),
        partialModalItemCount: modalItems.length,
      });
      console.error('Failed to create battle result modal.', error);
      console.error('Failed to create battle result modal stack.', error?.stack ?? error);
      modalItems.forEach((item) => {
        item?.removeAllListeners?.();
        item?.destroy?.();
      });
      this.battleResultModal = null;
      this.battleResultModalShown = false;
      this.battleResultModalPending = false;
      this.resultOverlayState = null;
      this.isFlowResolving = false;
      this.updateActionSlotBadge();
    }
  }


  destroyAchievementUnlockPopupController() {
    this.achievementUnlockPopupController?.destroy?.();
    this.achievementUnlockPopupController = null;
  }

  clearAchievementPopupPresentationBatch() {
    try {
      clearPresentedQueue();
    } catch (error) {
      console.warn('Achievement presentation batch clear failed; continuing navigation.', error);
    }
  }

  playAchievementUnlockPopupSfx(achievementId) {
    if (typeof achievementId !== 'string' || achievementId.length === 0) return false;
    if (!this.achievementUnlockSfxPlayedIds) this.achievementUnlockSfxPlayedIds = new Set();
    if (this.achievementUnlockSfxPlayedIds.has(achievementId)) return false;
    this.achievementUnlockSfxPlayedIds.add(achievementId);
    return this.playBattleSfx?.(AUDIO_KEYS.ACHIEVEMENT_UNLOCK, { cooldownMs: 0 });
  }

  startAchievementUnlockPopupsForResultModal() {
    if (!this.battleResultModalShown || !this.battleResultModal) return;
    if (this.resultOverlayState?.kind === 'campaign-completion' && (this.resultOverlayState.phase !== 'interactive' || this.resultOverlayState.preview === true)) return;
    this.destroyAchievementUnlockPopupController();
    try {
      const pendingIds = peekAchievementPresentation();
      if (!pendingIds.length) return;
      const definitionsById = new Map(getAchievementDefinitions().map((definition) => [definition.id, definition]));
      const batch = pendingIds
        .map((achievementId) => ({ achievementId, definition: definitionsById.get(achievementId) }))
        .filter((entry) => {
          if (entry.definition) return true;
          console.warn('Skipping malformed achievement presentation entry; definition not found.', { achievementId: entry.achievementId });
          markAchievementPresented(entry.achievementId);
          return false;
        });
      if (!batch.length) return;
      const layout = calculateAchievementUnlockPopupLayout(this, this.battleResultModal);
      let activeIncomingPopup = null;
      let activeOutgoingPopup = null;
      let initialDelayTimer = null;
      let destroyed = false;
      let cursor = 0;
      const cleanupActive = () => {
        activeIncomingPopup?.destroy?.();
        activeIncomingPopup = null;
        activeOutgoingPopup?.destroy?.();
        activeOutgoingPopup = null;
        initialDelayTimer?.remove?.(false);
        initialDelayTimer = null;
      };
      const controller = {
        destroy: () => {
          if (destroyed) return;
          destroyed = true;
          cleanupActive();
        },
        getActivePopup: () => activeIncomingPopup ?? activeOutgoingPopup,
        getIncomingPopup: () => activeIncomingPopup,
        getOutgoingPopup: () => activeOutgoingPopup,
      };
      const showNext = () => {
        if (destroyed || cursor >= batch.length || !this.battleResultModalShown || !this.battleResultModal) return;
        const entry = batch[cursor];
        const popupIndex = cursor;
        const popup = createAchievementUnlockPopup(this, entry.definition, {
          index: popupIndex + 1,
          total: batch.length,
          layout,
          modal: this.battleResultModal,
          timing: ACHIEVEMENT_UNLOCK_POPUP_TIMING,
        });
        activeIncomingPopup = popup;
        cursor += 1;
        this.playAchievementUnlockPopupSfx(entry.achievementId);
        popup.play({
          onExitStart: () => {
            if (destroyed) return;
            if (activeIncomingPopup === popup) activeIncomingPopup = null;
            activeOutgoingPopup = popup;
            if (cursor < batch.length) showNext();
          },
          onComplete: () => {
            if (destroyed) return;
            markAchievementPresented(entry.achievementId);
            if (activeOutgoingPopup === popup) activeOutgoingPopup = null;
            if (activeIncomingPopup === popup) activeIncomingPopup = null;
          },
        });
      };
      this.achievementUnlockPopupController = controller;
      initialDelayTimer = this.time.delayedCall(ACHIEVEMENT_UNLOCK_POPUP_TIMING.initialDelayMs, showNext);
    } catch (error) {
      console.warn('Achievement unlock popup presentation failed; result modal remains usable.', error);
      this.destroyAchievementUnlockPopupController();
    }
  }

  createResultModalButton(x, y, width, height, label, onClick, presentation = null, options = {}) {
    return createImageButton(this, {
      x,
      y,
      width,
      height,
      label,
      onPointerUp: () => {
        this.guardPointerEvent();
        this.stopOutcomeStinger({ fadeMs: 0 });
        if (this.navigationInProgress) return;
        onClick();
      },
      depth: options.depth ?? 902,
      fontSize: `${Math.max(18, Math.floor(height * 0.34))}px`,
      textStyle: {
        color: '#f5f1e6',
        fontFamily: PREMIUM_BROADCAST_FONT_STACK,
        fontStyle: '700',
        letterSpacing: 1.7,
      },
      fallbackFill: 0x1e293b,
      fallbackStroke: presentation?.frameColor ?? 0x94a3b8,
      fallbackStrokeAlpha: 0.95,
      shadowAlpha: 0.34,
      hoverScale: 1.025,
      downScale: 0.975,
      minTouchHeight: 68,
    });
  }

  destroyBattleResultModal() {
    this.destroyAchievementUnlockPopupController();
    this.stopOutcomeStinger({ fadeMs: 200 });
    this.battleResultModalPendingEvent?.remove?.(false);
    this.battleResultModalPendingEvent = null;
    if (!this.battleResultModal) {
      this.battleResultModalShown = false;
      this.battleResultModalPending = false;
      this.resultOverlayState = null;
      this.isFlowResolving = false;
      this.achievementUnlockSfxPlayedIds = new Set();
      this.updateActionSlotBadge();
      return;
    }
    const items = [
      this.battleResultModal.overlay,
      this.battleResultModal.titleAura,
      this.battleResultModal.titleGlow,
      this.battleResultModal.title,
      this.battleResultModal.subtitle,
      this.battleResultModal.stats,
      this.battleResultModal.dividerCore,
      this.battleResultModal.dividerGlow,
      ...(this.battleResultModal.celebration?.particles ?? this.battleResultModal.celebration ?? []),
      ...(this.battleResultModal.celebration?.modalItems ?? []),
      ...this.battleResultModal.buttons.flatMap((button) => button.items ?? []),
    ];
    this.battleResultModal.celebration?.timers?.forEach((timer) => timer?.remove?.(false));
    items.forEach((item) => {
      item?.removeAllListeners?.();
      item?.destroy?.();
    });
    this.battleResultModal = null;
    this.battleResultModalShown = false;
    this.battleResultModalPending = false;
    this.resultOverlayState = null;
    this.achievementUnlockSfxPlayedIds = new Set();
    this.updateActionSlotBadge();
  }

  createBaseBroadcastFrame(side, panel, panelWidth, panelHeight) {
    const graphics = this.add.graphics();
    const crackGraphics = this.add.graphics();
    const glassGraphics = this.add.graphics();
    const frameView = {
      side,
      panel,
      graphics,
      crackGraphics,
      glassGraphics,
      panelWidth,
      panelHeight,
      overloadEvent: null,
      overloadActive: false,
      booting: true,
      bootSweep: null,
      beaconIntensity: 0,
      beaconFadeTween: null,
      terminalFailureProgress: 0,
      terminalFailureFlash: 0,
      terminalFailureDim: 0,
      terminalFailureTween: null,
    };
    graphics.setDepth(BASE_FRAME_GRAPHICS_DEPTH);
    crackGraphics.setDepth(BASE_CRACK_OVERLAY_DEPTH);
    glassGraphics.setDepth(BASE_GLASS_REFLECTION_DEPTH);
    graphics.setAlpha(0);
    crackGraphics.setAlpha(0);
    glassGraphics.setAlpha(0);
    graphics.setData('side', side);
    crackGraphics.setData('side', side);
    glassGraphics.setData('side', side);
    graphics.setData('baseFrameMetrics', {
      panelWidth,
      panelHeight,
      x: panel.x,
      y: panel.y,
      cleanCenterRatio: 0.86,
    });
    this.baseFrameViews[side] = frameView;
    if (this.terminalShatterTriggeredSides?.has(side) && this.getBaseHpForSide(side) <= 0) {
      frameView.terminalFailureProgress = 1;
      frameView.terminalFailureDim = 1;
    }
    this.renderBaseBroadcastFrame(frameView);
    frameView.beaconIntensity = this.getCurrentActionableSide?.() === side ? 1 : 0;
    this.playBaseBroadcastBoot(frameView);
    return frameView;
  }

  isTerminalTextVisibleForSide(side) {
    return Boolean(this.terminalTextBootComplete) && !this.terminalFailedSides?.has(side);
  }

  setTerminalTextAlpha(alpha) {
    [this.enemyHpText, this.playerHpText, this.playerBaseActionLabelText].forEach((text) => {
      if (text?.active) text.setAlpha(alpha);
    });
  }

  refreshTerminalTextVisibility() {
    if (this.enemyHpText?.active) {
      this.enemyHpText.setVisible(this.isTerminalTextVisibleForSide('enemy'));
    }
    this.updatePlayerBaseActionState();
  }

  maybeRevealTerminalTextAfterBoot() {
    if (this.terminalTextBootComplete) return;
    const views = [this.baseFrameViews?.enemy, this.baseFrameViews?.player].filter(Boolean);
    if (views.length < 2 || views.some((view) => view.booting)) return;
    this.terminalTextBootComplete = true;
    this.setTerminalTextAlpha(0);
    this.refreshTerminalTextVisibility();
    this.tweens.add({
      targets: [this.enemyHpText, this.playerHpText, this.playerBaseActionLabelText].filter((text) => text?.active),
      alpha: 1,
      duration: BASE_TERMINAL_TEXT_REVEAL_MS,
      ease: 'Sine.easeOut',
    });
  }

  hideTerminalTextForFailureSide(side) {
    this.terminalFailedSides ??= new Set();
    this.terminalFailedSides.add(side);
    const hpText = this.getBaseHpTextForSide(side);
    if (hpText?.active) hpText.setVisible(false);
    if (side === 'player' && this.playerBaseActionLabelText?.active) {
      this.playerBaseActionLabelText.setVisible(false);
    }
  }

  drawBaseBroadcastBeaconModule(graphics, x, y, width, height, { intensity, color }) {
    const left = x - width / 2;
    const top = y - height / 2;
    const casingInset = Math.max(1, Math.round(width * 0.045));
    const railWidth = Math.max(2, Math.round(width * 0.1));
    const podInsetX = Math.max(4, Math.round(width * 0.2));
    const podInsetY = Math.max(5, Math.round(height * 0.04));
    const wellLeft = left + podInsetX;
    const wellTop = top + podInsetY;
    const wellWidth = width - podInsetX * 2;
    const wellHeight = height - podInsetY * 2;
    const lightRadius = Math.max(5, Math.min(width * 0.29, height * 0.088));
    const displayIntensity = Phaser.Math.Clamp(intensity, 0, 1.18);
    const lightAlpha = Phaser.Math.Clamp(displayIntensity, 0, 1);
    const reactionBoost = Math.max(0, displayIntensity - 1);
    const offAlpha = 0.58 - lightAlpha * 0.12;
    const onGlassAlpha = Math.min(0.9, 0.08 + lightAlpha * 0.74 + reactionBoost * 0.34);
    const onCoreAlpha = Math.min(0.56, 0.04 + lightAlpha * 0.44 + reactionBoost * 0.24);
    const onRingAlpha = Math.min(0.62, 0.05 + lightAlpha * 0.46 + reactionBoost * 0.28);

    // Full-height side-mounted hardware pod: the same graphite casing, brass
    // restraint, bevel language, and recessed glass treatment as the terminal
    // frame. Kept within the original panel graphics so hitboxes and layout
    // remain unchanged.
    graphics.fillStyle(BASE_FRAME_SHADOW, 0.5);
    graphics.fillRect(left + 1, top + 2, width, height);
    graphics.fillStyle(BASE_SCREEN_FRAME_DARK, 0.96);
    graphics.fillRect(left, top, width, height);
    graphics.fillStyle(BASE_SCREEN_CONNECTOR, 0.42);
    graphics.fillRect(left + casingInset, top + casingInset, width - casingInset * 2, height - casingInset * 2);

    graphics.lineStyle(2, BASE_SCREEN_FRAME_LIGHT, 0.15);
    graphics.beginPath();
    graphics.moveTo(left + 1, top + height - 1);
    graphics.lineTo(left + 1, top + 1);
    graphics.lineTo(left + width - 1, top + 1);
    graphics.strokePath();
    graphics.lineStyle(2, BASE_FRAME_SHADOW, 0.48);
    graphics.beginPath();
    graphics.moveTo(left + width - 1, top + 1);
    graphics.lineTo(left + width - 1, top + height - 1);
    graphics.lineTo(left + 1, top + height - 1);
    graphics.strokePath();

    graphics.lineStyle(1, BASE_BEACON_BRASS, 0.38);
    graphics.strokeRect(left + 1.5, top + 1.5, width - 3, height - 3);
    graphics.lineStyle(1, BASE_BEACON_BRASS, 0.22);
    graphics.beginPath();
    graphics.moveTo(left + railWidth + 1.5, top + 4);
    graphics.lineTo(left + railWidth + 1.5, top + height - 4);
    graphics.moveTo(left + width - railWidth - 1.5, top + 4);
    graphics.lineTo(left + width - railWidth - 1.5, top + height - 4);
    graphics.strokePath();

    graphics.fillStyle(BASE_FRAME_SHADOW, 0.68);
    graphics.fillRect(wellLeft - 1, wellTop - 1, wellWidth + 2, wellHeight + 2);
    graphics.fillStyle(BASE_FRAME_RECESS, 0.95);
    graphics.fillRect(wellLeft, wellTop, wellWidth, wellHeight);
    graphics.fillStyle(BASE_SCREEN_EDGE, 0.42);
    graphics.fillRect(wellLeft + 1, wellTop + 1, wellWidth - 2, Math.max(2, wellHeight * 0.075));
    graphics.lineStyle(1, BASE_SCREEN_FRAME_LIGHT, 0.13);
    graphics.beginPath();
    graphics.moveTo(wellLeft + 1, wellTop + wellHeight - 1);
    graphics.lineTo(wellLeft + 1, wellTop + 1);
    graphics.lineTo(wellLeft + wellWidth - 1, wellTop + 1);
    graphics.strokePath();
    graphics.lineStyle(1, BASE_FRAME_SHADOW, 0.76);
    graphics.strokeRect(wellLeft + 0.5, wellTop + 0.5, wellWidth - 1, wellHeight - 1);

    [-0.3, 0, 0.3].forEach((offset) => {
      const lightY = y + height * offset;
      graphics.fillStyle(BASE_FRAME_SHADOW, 0.82);
      graphics.fillCircle(x, lightY + 1.5, lightRadius * 1.46);
      graphics.lineStyle(Math.max(1.4, lightRadius * 0.22), BASE_BEACON_BRASS, 0.25 + lightAlpha * 0.15);
      graphics.strokeCircle(x, lightY, lightRadius * 1.24);
      graphics.fillStyle(BASE_BEACON_INACTIVE, offAlpha);
      graphics.fillCircle(x, lightY, lightRadius * 1.05);
      graphics.lineStyle(Math.max(1, lightRadius * 0.13), BASE_SCREEN_REFLECTION, 0.12);
      graphics.strokeCircle(x, lightY, lightRadius * 0.92);
      graphics.fillStyle(color, onGlassAlpha);
      graphics.fillCircle(x, lightY, lightRadius * 0.82);
      graphics.lineStyle(Math.max(1, lightRadius * 0.13), color, onRingAlpha);
      graphics.strokeCircle(x, lightY, lightRadius * 0.62);
      graphics.fillStyle(color, onCoreAlpha);
      graphics.fillCircle(x, lightY, lightRadius * 0.42);
      graphics.fillStyle(BASE_SCREEN_REFLECTION, 0.16 + lightAlpha * 0.14);
      graphics.fillCircle(x - lightRadius * 0.26, lightY - lightRadius * 0.3, Math.max(1, lightRadius * 0.18));
    });
  }

  playBaseBroadcastBoot(frameView) {
    if (!frameView?.graphics?.active || !frameView?.panel?.active) return;

    const { panel, panelWidth, panelHeight } = frameView;
    const left = panel.x - panelWidth / 2;
    const top = panel.y - panelHeight / 2;
    const sweep = this.add.graphics().setDepth(BASE_FRAME_BOOT_SWEEP_DEPTH).setAlpha(0);
    sweep.fillStyle(BASE_SCREEN_BAND, 0.16);
    sweep.fillRect(left + panelWidth * 0.06, top, panelWidth * 0.88, Math.max(2, panelHeight * 0.13));
    frameView.bootSweep = sweep;

    this.tweens.add({
      targets: [frameView.graphics, frameView.crackGraphics, frameView.glassGraphics],
      alpha: 1,
      duration: BASE_FRAME_BOOT_MS,
      ease: 'Sine.easeOut',
    });
    this.tweens.add({
      targets: sweep,
      y: panelHeight * 0.86,
      alpha: { from: 0.22, to: 0 },
      duration: BASE_FRAME_BOOT_MS,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        sweep.destroy();
        frameView.bootSweep = null;
        frameView.booting = false;
        this.renderBaseBroadcastFrame(frameView);
        this.maybeRevealTerminalTextAfterBoot();
      },
    });
  }

  renderBaseBroadcastFrame(frameView) {
    if (!frameView?.graphics?.active || !frameView?.panel?.active) return;

    const { graphics, panel, panelWidth, panelHeight, side, overloadActive } = frameView;
    const activeSide = this.getCurrentActionableSide?.() ?? null;
    const isActive = activeSide === side;
    const width = panelWidth;
    const height = panelHeight;
    const left = panel.x - width / 2;
    const top = panel.y - height / 2;
    const outerLip = Math.max(3, Math.round(height * 0.12));
    const recessedGap = Math.max(2, Math.round(height * 0.055));
    const innerLip = Math.max(2, Math.round(height * 0.075));
    const screenInset = outerLip + recessedGap + innerLip;
    const moduleWidth = Math.max(23, Math.min(width * 0.135, height * 0.42));
    const moduleGap = Math.max(4, Math.round(width * 0.018));
    const screenHardwareInset = outerLip;
    // Beacons mount to the outer housing, not the inset scanline glass, so
    // their casing inset is independent of the recessed screen anchor.
    const beaconHardwareInset = Math.max(recessedGap, Math.round(outerLip * 0.35));
    const screenLeft = left + screenHardwareInset + moduleWidth + moduleGap;
    const screenTop = top + screenInset;
    const screenWidth = width - screenHardwareInset * 2 - (moduleWidth + moduleGap) * 2;
    const screenHeight = height - screenInset * 2;
    const centerBandHeight = Math.max(3, screenHeight * 0.34);
    const scanlineStep = Math.max(3, Math.floor(height * 0.12));
    const scanlineAlpha = overloadActive ? 0.16 : 0.04;
    const bandAlpha = overloadActive ? 0.16 : (isActive ? 0.085 : 0.055);
    const centerAlpha = overloadActive ? 0.28 : (isActive ? 0.205 : 0.155) + BASE_SCREEN_CENTER_BRIGHTNESS_ALPHA_BOOST;
    const glowAlpha = overloadActive ? 0.145 : (isActive ? 0.08 : 0.052);
    const connectorWidth = Math.max(5, Math.round(width * 0.035));
    const connectorHeight = Math.max(8, Math.round(height * 0.5));

    graphics.clear();

    // The base is a restrained transmission screen: dark terminal glass,
    // a slightly brighter center, protected edges, and low-contrast signal structure.
    graphics.fillStyle(BASE_FRAME_SHADOW, 0.22);
    graphics.fillRect(left + 2, top + 3, width, height);

    graphics.fillStyle(BASE_SCREEN_CONNECTOR, 0.44);
    graphics.fillRect(left - connectorWidth, panel.y - connectorHeight / 2, connectorWidth, connectorHeight);
    graphics.fillRect(left + width, panel.y - connectorHeight / 2, connectorWidth, connectorHeight);
    graphics.lineStyle(1, BASE_SCREEN_FRAME_LIGHT, 0.16);
    graphics.strokeRect(left - connectorWidth, panel.y - connectorHeight / 2, connectorWidth, connectorHeight);
    graphics.strokeRect(left + width, panel.y - connectorHeight / 2, connectorWidth, connectorHeight);

    // Nested hardware frame: outer matte frame, recessed trough, inner retaining
    // frame, then an inset illuminated screen. All layers remain inside the
    // original panel bounds so layout, hitboxes, and control positions are fixed.
    graphics.fillStyle(BASE_SCREEN_FRAME_DARK, 0.78);
    graphics.fillRect(left, top, width, height);

    // Restrained top-left / bottom-right bevel cues keep the frame structural
    // without introducing new ornaments or indicators.
    graphics.lineStyle(2, BASE_SCREEN_FRAME_LIGHT, 0.18);
    graphics.beginPath();
    graphics.moveTo(left + 1, top + height - 1);
    graphics.lineTo(left + 1, top + 1);
    graphics.lineTo(left + width - 1, top + 1);
    graphics.strokePath();
    graphics.lineStyle(2, BASE_FRAME_SHADOW, 0.42);
    graphics.beginPath();
    graphics.moveTo(left + width - 1, top + 1);
    graphics.lineTo(left + width - 1, top + height - 1);
    graphics.lineTo(left + 1, top + height - 1);
    graphics.strokePath();

    const gapLeft = left + outerLip;
    const gapTop = top + outerLip;
    const gapWidth = width - outerLip * 2;
    const gapHeight = height - outerLip * 2;
    graphics.fillStyle(BASE_FRAME_RECESS, 0.72);
    graphics.fillRect(gapLeft, gapTop, gapWidth, gapHeight);
    graphics.lineStyle(1, BASE_FRAME_SHADOW, 0.5);
    graphics.strokeRect(gapLeft + 0.5, gapTop + 0.5, gapWidth - 1, gapHeight - 1);

    const innerLeft = gapLeft + recessedGap;
    const innerTop = gapTop + recessedGap;
    const innerWidth = gapWidth - recessedGap * 2;
    const innerHeight = gapHeight - recessedGap * 2;
    graphics.fillStyle(BASE_SCREEN_FRAME_MID, 0.34);
    graphics.fillRect(innerLeft, innerTop, innerWidth, innerHeight);
    graphics.lineStyle(1, BASE_SCREEN_FRAME_LIGHT, 0.16);
    graphics.beginPath();
    graphics.moveTo(innerLeft + 1, innerTop + innerHeight - 1);
    graphics.lineTo(innerLeft + 1, innerTop + 1);
    graphics.lineTo(innerLeft + innerWidth - 1, innerTop + 1);
    graphics.strokePath();
    graphics.lineStyle(2, BASE_FRAME_SHADOW, 0.38);
    graphics.beginPath();
    graphics.moveTo(innerLeft + innerWidth - 1, innerTop + 1);
    graphics.lineTo(innerLeft + innerWidth - 1, innerTop + innerHeight - 1);
    graphics.lineTo(innerLeft + 1, innerTop + innerHeight - 1);
    graphics.strokePath();

    graphics.fillStyle(BASE_SCREEN_EDGE, 0.5);
    graphics.fillRect(screenLeft - 1, screenTop - 1, screenWidth + 2, screenHeight + 2);
    const screenFillAlpha = (isActive ? HERO_PANEL_ACTIVE_FILL_ALPHA : HERO_PANEL_FILL_ALPHA) + BASE_SCREEN_FILL_BRIGHTNESS_ALPHA_BOOST;
    graphics.fillStyle(BASE_SCREEN_FILL, screenFillAlpha);
    graphics.fillRect(screenLeft, screenTop, screenWidth, screenHeight);

    graphics.fillStyle(BASE_SCREEN_CENTER, centerAlpha);
    graphics.fillEllipse(panel.x, panel.y, screenWidth * 0.88, centerBandHeight);
    graphics.fillStyle(BASE_SCREEN_CENTER, centerAlpha * 0.55);
    graphics.fillRect(screenLeft + screenWidth * 0.08, panel.y - centerBandHeight / 2, screenWidth * 0.84, centerBandHeight);

    graphics.fillStyle(BASE_SCREEN_INNER_GLOW, glowAlpha);
    graphics.fillRect(screenLeft + screenWidth * 0.08, screenTop + screenHeight * 0.2, screenWidth * 0.84, Math.max(1.2, height * 0.028));
    graphics.fillRect(screenLeft + screenWidth * 0.08, screenTop + screenHeight * 0.78, screenWidth * 0.84, Math.max(1.2, height * 0.028));

    graphics.fillStyle(BASE_SCREEN_EDGE, 0.26);
    graphics.fillRect(screenLeft, screenTop, screenWidth, Math.max(2, screenHeight * 0.14));
    graphics.fillRect(screenLeft, screenTop + screenHeight * 0.86, screenWidth, Math.max(2, screenHeight * 0.14));
    graphics.fillRect(screenLeft, screenTop, Math.max(2, screenWidth * 0.05), screenHeight);
    graphics.fillRect(screenLeft + screenWidth * 0.95, screenTop, Math.max(2, screenWidth * 0.05), screenHeight);

    graphics.lineStyle(1, BASE_SCREEN_SCANLINE, scanlineAlpha);
    for (let y = screenTop + scanlineStep; y < screenTop + screenHeight; y += scanlineStep) {
      graphics.beginPath();
      graphics.moveTo(screenLeft + screenWidth * 0.04, y);
      graphics.lineTo(screenLeft + screenWidth * 0.96, y);
      graphics.strokePath();
    }

    graphics.lineStyle(1, BASE_SCREEN_BAND, bandAlpha);
    graphics.beginPath();
    graphics.moveTo(screenLeft + screenWidth * 0.08, panel.y - screenHeight * 0.22);
    graphics.lineTo(screenLeft + screenWidth * 0.92, panel.y - screenHeight * 0.22);
    graphics.moveTo(screenLeft + screenWidth * 0.08, panel.y + screenHeight * 0.22);
    graphics.lineTo(screenLeft + screenWidth * 0.92, panel.y + screenHeight * 0.22);
    graphics.strokePath();

    // Inner screen shadow separates glass from the retaining frame and makes the
    // display surface read as recessed rather than painted onto the hardware.
    graphics.lineStyle(2, BASE_FRAME_SHADOW, 0.6);
    graphics.strokeRect(screenLeft + 1, screenTop + 1, screenWidth - 2, screenHeight - 2);
    graphics.lineStyle(1, BASE_SCREEN_FRAME_LIGHT, 0.2);
    graphics.beginPath();
    graphics.moveTo(screenLeft + 2, screenTop + screenHeight - 2);
    graphics.lineTo(screenLeft + 2, screenTop + 2);
    graphics.lineTo(screenLeft + screenWidth - 2, screenTop + 2);
    graphics.strokePath();

    const beaconColor = side === 'player' ? BASE_BEACON_PLAYER_ACTIVE : BASE_BEACON_ENEMY_ACTIVE;
    const baseBeaconIntensity = frameView.beaconIntensity ?? (isActive ? 1 : 0);
    const enemyDamageReactionIntensity = side === 'enemy' && overloadActive
      ? Math.max(
        BASE_BEACON_ENEMY_DAMAGE_REACTION_INTENSITY,
        baseBeaconIntensity + BASE_BEACON_ENEMY_DAMAGE_REACTION_ACTIVE_BOOST,
      )
      : null;
    const beaconIntensity = overloadActive
      ? (enemyDamageReactionIntensity ?? 1)
      : baseBeaconIntensity;
    const beaconHeight = Math.max(screenHeight, height * 0.96);
    const beaconY = panel.y;
    const leftBeaconX = left + beaconHardwareInset + moduleWidth / 2;
    const rightBeaconX = left + width - beaconHardwareInset - moduleWidth / 2;
    [leftBeaconX, rightBeaconX].forEach((beaconX) => {
      this.drawBaseBroadcastBeaconModule(graphics, beaconX, beaconY, moduleWidth, beaconHeight, {
        intensity: beaconIntensity,
        color: beaconColor,
      });
    });

    if (overloadActive) {
      const glitchRows = [
        { y: screenTop + screenHeight * 0.3, offset: -screenWidth * 0.015, color: BASE_SCREEN_GLITCH_RED },
        { y: screenTop + screenHeight * 0.48, offset: screenWidth * 0.018, color: BASE_SCREEN_GLITCH_CYAN },
        { y: screenTop + screenHeight * 0.64, offset: -screenWidth * 0.01, color: BASE_SCREEN_SCANLINE },
      ];
      glitchRows.forEach((row, index) => {
        graphics.fillStyle(row.color, index === 2 ? 0.14 : 0.2);
        graphics.fillRect(screenLeft + screenWidth * 0.1 + row.offset, row.y, screenWidth * 0.8, Math.max(1.2, height * 0.045));
      });
    }

    const glassLeft = left + beaconHardwareInset;
    const glassTop = top + outerLip;
    const glassWidth = width - beaconHardwareInset * 2;
    const glassHeight = height - outerLip * 2;
    const beaconOrigins = [
      { id: 'top-left', x: leftBeaconX + moduleWidth * 0.34, y: beaconY - beaconHeight * 0.34, directionX: 1, directionY: 1 },
      { id: 'top-right', x: rightBeaconX - moduleWidth * 0.34, y: beaconY - beaconHeight * 0.34, directionX: -1, directionY: 1 },
      { id: 'bottom-left', x: leftBeaconX + moduleWidth * 0.34, y: beaconY + beaconHeight * 0.34, directionX: 1, directionY: -1 },
      { id: 'bottom-right', x: rightBeaconX - moduleWidth * 0.34, y: beaconY + beaconHeight * 0.34, directionX: -1, directionY: -1 },
    ];
    const screenMetrics = { screenLeft, screenTop, screenWidth, screenHeight, glassLeft, glassTop, glassWidth, glassHeight, beaconOrigins };
    this.renderBaseBroadcastCracks(frameView, screenMetrics);
    this.renderBaseBroadcastGlass(frameView, screenMetrics);
  }

  getBaseHpForSide(side) {
    if (!this.gameState) return 12;
    return side === 'enemy' ? this.gameState.enemyHP : this.gameState.playerHP;
  }

  shouldShowBaseCrackForHp(hp) {
    return Number.isFinite(hp) && hp < BASE_MAX_HP;
  }

  getBaseCrackDamageLevel(hp) {
    if (!Number.isFinite(hp)) return 0;
    return Math.max(0, Math.min(BASE_MAX_HP, BASE_MAX_HP - hp));
  }

  getBaseCrackSegmentsForDamage(damageLevel) {
    const level = Math.max(0, Math.min(BASE_MAX_HP, damageLevel));
    if (level <= 0) return [];

    const primaryPointCount = Math.min(5, 2 + Math.ceil(level / 4));
    const primaryBranches = Math.min(3, Math.max(0, Math.floor((level - 2) / 3)));
    const segments = [{ path: 0, pointCount: primaryPointCount, branches: primaryBranches, lengthScale: 0.42 + level * 0.026 }];

    if (level >= 5) {
      segments.push({ path: 1, pointCount: Math.min(4, 2 + Math.ceil((level - 4) / 4)), branches: 1, lengthScale: 0.32 + level * 0.018 });
    }
    if (level >= 8) {
      segments.push({ path: 2, pointCount: 3, branches: level >= 11 ? 1 : 0, lengthScale: 0.28 + level * 0.012 });
    }

    return segments;
  }

  getBaseCrackProfile(pathIndex, pointIndex) {
    const profiles = [
      {
        travel: [0, 0.12, 0.25, 0.39, 0.51, 0.62],
        drift: [0, 0.025, -0.012, 0.044, 0.018, 0.055],
        wobble: [0, -0.014, 0.018, -0.009, 0.012, -0.016],
      },
      {
        travel: [0, 0.09, 0.19, 0.31, 0.43],
        drift: [0, -0.03, -0.052, -0.028, -0.064],
        wobble: [0, 0.018, -0.011, 0.015, -0.006],
      },
      {
        travel: [0, 0.075, 0.165, 0.26],
        drift: [0, 0.055, 0.032, 0.07],
        wobble: [0, -0.02, 0.014, -0.012],
      },
    ];
    const profile = profiles[pathIndex % profiles.length];
    return {
      travel: profile.travel[Math.min(pointIndex, profile.travel.length - 1)],
      drift: profile.drift[Math.min(pointIndex, profile.drift.length - 1)],
      wobble: profile.wobble[Math.min(pointIndex, profile.wobble.length - 1)],
    };
  }

  getBaseNonLethalCrackBounds(origin, screenMetrics) {
    const { screenLeft, screenWidth, glassLeft, glassTop, glassWidth, glassHeight } = screenMetrics;
    const travelLimit = screenWidth * BASE_NON_LETHAL_CRACK_MAX_REACH_RATIO;
    const sideLimit = screenWidth * BASE_NON_LETHAL_CRACK_SIDE_ZONE_RATIO;
    const leftInset = glassLeft + glassWidth * 0.035;
    const rightInset = glassLeft + glassWidth * 0.965;
    const travelsFromLeft = origin.directionX > 0;
    return {
      left: travelsFromLeft
        ? leftInset
        : Math.max(leftInset, origin.x - travelLimit, screenLeft + screenWidth * (1 - BASE_NON_LETHAL_CRACK_SIDE_ZONE_RATIO)),
      right: travelsFromLeft
        ? Math.min(rightInset, origin.x + travelLimit, screenLeft + sideLimit)
        : rightInset,
      top: glassTop + glassHeight * 0.08,
      bottom: glassTop + glassHeight * 0.92,
    };
  }

  clampBaseCrackPoint(point, bounds, safeZone) {
    const x = Phaser.Math.Clamp(point.x, bounds.left, bounds.right);
    let y = Phaser.Math.Clamp(point.y, bounds.top, bounds.bottom);
    if (x > safeZone.left && x < safeZone.right && y > safeZone.top && y < safeZone.bottom) {
      y = point.y < (safeZone.top + safeZone.bottom) / 2 ? safeZone.top : safeZone.bottom;
    }
    return { x, y };
  }

  buildBaseCrackPath(origin, pathIndex, pointCount, screenMetrics, safeZone, lengthScale = 1) {
    const { glassWidth, glassHeight } = screenMetrics;
    const bounds = this.getBaseNonLethalCrackBounds(origin, screenMetrics);
    const points = [{ x: origin.x, y: origin.y }];
    for (let index = 1; index < pointCount; index += 1) {
      const profile = this.getBaseCrackProfile(pathIndex, index);
      const travel = glassWidth * profile.travel * lengthScale;
      const vertical = glassHeight * (profile.travel * 0.32 + profile.drift) * lengthScale;
      const crossWobble = glassHeight * profile.wobble;
      points.push(this.clampBaseCrackPoint({
        x: origin.x + origin.directionX * (travel + crossWobble * 0.35),
        y: origin.y + origin.directionY * vertical + crossWobble,
      }, bounds, safeZone));
    }
    return points;
  }

  strokeBaseCrackPath(crackGraphics, points, branches, bounds, safeZone) {
    crackGraphics.beginPath();
    crackGraphics.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => crackGraphics.lineTo(point.x, point.y));
    for (let index = 0; index < branches; index += 1) {
      const rootIndex = Math.min(points.length - 2, 1 + index);
      const root = points[rootIndex];
      const prev = points[Math.max(0, rootIndex - 1)];
      const next = points[Math.min(points.length - 1, rootIndex + 1)];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const sideSign = index % 2 === 0 ? 1 : -1;
      const branchLength = 0.22 + index * 0.08;
      const branchPoint = this.clampBaseCrackPoint({
        x: root.x + dx * branchLength - sideSign * dy * 0.22,
        y: root.y + dy * branchLength + sideSign * dx * 0.16,
      }, bounds, safeZone);
      crackGraphics.moveTo(root.x, root.y);
      crackGraphics.lineTo(branchPoint.x, branchPoint.y);
    }
    crackGraphics.strokePath();
  }

  getLethalTerminalFailureSides() {
    const resolution = this.gameState?.heroDeathResolution;
    if (!resolution || !this.gameState?.winner) return [];
    return [
      resolution.rawPlayerHP <= 0 ? 'player' : null,
      resolution.rawEnemyHP <= 0 ? 'enemy' : null,
    ].filter(Boolean);
  }

  maybeTriggerTerminalShatterHook() {
    this.getLethalTerminalFailureSides().forEach((side) => {
      if (this.terminalShatterTriggeredSides?.has(side)) return;
      this.terminalShatterTriggeredSides ??= new Set();
      this.terminalShatterTriggeredSides.add(side);
      this.hideTerminalTextForFailureSide(side);
      this.playTerminalFailureShatter(side);
    });
  }

  getBaseHpTextForSide(side) {
    return side === 'enemy' ? this.enemyHpText : this.playerHpText;
  }

  playTerminalFailureShatter(side) {
    const frameView = this.baseFrameViews?.[side];
    if (!frameView?.crackGraphics?.active) return;

    frameView.terminalFailureTween?.stop?.();
    frameView.terminalFailureProgress = 0;
    frameView.terminalFailureFlash = 1;
    frameView.terminalFailureDim = 0;
    this.triggerBaseBroadcastOverload(side);
    this.renderBaseBroadcastFrame(frameView);

    frameView.terminalFailureTween = this.tweens.add({
      targets: frameView,
      terminalFailureFlash: 0,
      terminalFailureProgress: 1,
      terminalFailureDim: 1,
      duration: BASE_TERMINAL_FAILURE_MS,
      ease: 'Cubic.easeOut',
      onUpdate: () => this.renderBaseBroadcastFrame(frameView),
      onComplete: () => {
        frameView.terminalFailureTween = null;
        frameView.terminalFailureProgress = 1;
        frameView.terminalFailureFlash = 0;
        frameView.terminalFailureDim = 1;
        this.renderBaseBroadcastFrame(frameView);
      },
    });

  }

  getTerminalFailureCrackPaths(screenMetrics, progress) {
    const { screenLeft, screenTop, screenWidth, screenHeight, glassLeft, glassTop, glassWidth, glassHeight, beaconOrigins = [] } = screenMetrics;
    const reveal = Phaser.Math.Clamp(progress, 0, 1);
    const originsById = new Map(beaconOrigins.map((origin) => [origin.id, origin]));
    const safeZone = {
      left: screenLeft + screenWidth * 0.34,
      right: screenLeft + screenWidth * 0.66,
      top: screenTop + screenHeight * 0.3,
      bottom: screenTop + screenHeight * 0.7,
    };
    const bounds = {
      left: glassLeft + glassWidth * 0.025,
      right: glassLeft + glassWidth * 0.975,
      top: glassTop + glassHeight * 0.06,
      bottom: glassTop + glassHeight * 0.94,
    };
    const configs = [
      { origin: 'top-left', tx: 0.7, ty: 0.22, kinks: [[0.18, 0.11], [0.38, -0.04], [0.57, 0.08]], branches: 2 },
      { origin: 'bottom-right', tx: 0.31, ty: 0.78, kinks: [[-0.16, -0.1], [-0.36, 0.03], [-0.55, -0.07]], branches: 2 },
      { origin: 'bottom-left', tx: 0.78, ty: 0.66, kinks: [[0.2, -0.08], [0.43, 0.04], [0.62, -0.06]], branches: 1 },
      { origin: 'top-right', tx: 0.22, ty: 0.35, kinks: [[-0.17, 0.09], [-0.41, -0.03], [-0.6, 0.06]], branches: 1 },
    ];

    return configs.map((config) => {
      const origin = originsById.get(config.origin);
      if (!origin) return null;
      const end = {
        x: screenLeft + screenWidth * config.tx,
        y: screenTop + screenHeight * config.ty,
      };
      const points = [{ x: origin.x, y: origin.y }];
      config.kinks.forEach(([travelRatio, verticalRatio], index) => {
        const pointProgress = Phaser.Math.Clamp(reveal * (config.kinks.length + 1) - index, 0, 1);
        if (pointProgress <= 0) return;
        const finalTravelRatio = Math.abs(config.kinks[config.kinks.length - 1][0]) || 1;
        const targetRatio = Math.abs(travelRatio) / finalTravelRatio;
        const target = {
          x: origin.x + (end.x - origin.x) * targetRatio,
          y: origin.y + (end.y - origin.y) * targetRatio + glassHeight * verticalRatio,
        };
        points.push(this.clampBaseCrackPoint({
          x: Phaser.Math.Linear(origin.x, target.x, pointProgress),
          y: Phaser.Math.Linear(origin.y, target.y, pointProgress),
        }, bounds, safeZone));
      });
      if (reveal >= 0.95) points.push(this.clampBaseCrackPoint(end, bounds, safeZone));
      return { points, branches: Math.floor(config.branches * reveal), bounds };
    }).filter((path) => path && path.points.length > 1);
  }

  renderTerminalFailureShatter(frameView, screenMetrics) {
    const { crackGraphics } = frameView;
    const progress = frameView.terminalFailureTween
      ? (frameView.terminalFailureProgress ?? 0)
      : Math.max(frameView.terminalFailureProgress ?? 0, this.terminalShatterTriggeredSides?.has(frameView.side) ? 1 : 0);
    if (progress <= 0 && (frameView.terminalFailureFlash ?? 0) <= 0 && (frameView.terminalFailureDim ?? 0) <= 0) return;

    const { screenLeft, screenTop, screenWidth, screenHeight } = screenMetrics;
    if ((frameView.terminalFailureFlash ?? 0) > 0) {
      crackGraphics.fillStyle(BASE_SCREEN_REFLECTION, 0.3 * frameView.terminalFailureFlash);
      crackGraphics.fillRect(screenLeft, screenTop, screenWidth, screenHeight);
    }

    const dimAlpha = 0.22 * Math.max(frameView.terminalFailureDim ?? 0, progress);
    if (dimAlpha > 0) {
      crackGraphics.fillStyle(BASE_FRAME_SHADOW, dimAlpha);
      crackGraphics.fillRect(screenLeft, screenTop, screenWidth, screenHeight);
    }

    const paths = this.getTerminalFailureCrackPaths(screenMetrics, progress);
    crackGraphics.lineStyle(2.4, BASE_FRAME_SHADOW, 0.52);
    paths.forEach(({ points, branches, bounds }) => this.strokeBaseCrackPath(crackGraphics, points, branches, bounds, { left: 0, right: 0, top: 0, bottom: 0 }));
    crackGraphics.lineStyle(1.15, BASE_SCREEN_REFLECTION, 0.72);
    paths.forEach(({ points, branches, bounds }) => this.strokeBaseCrackPath(crackGraphics, points, branches, bounds, { left: 0, right: 0, top: 0, bottom: 0 }));
  }

  renderBaseBroadcastCracks(frameView, screenMetrics) {
    const { crackGraphics, side } = frameView ?? {};
    if (!crackGraphics?.active || !screenMetrics) return;

    crackGraphics.clear();

    const hp = this.getBaseHpForSide(side);
    if (!this.shouldShowBaseCrackForHp(hp)) return;

    const damageLevel = this.getBaseCrackDamageLevel(hp);
    const { screenLeft, screenTop, screenWidth, screenHeight, beaconOrigins = [] } = screenMetrics;
    const safeZone = {
      left: screenLeft + screenWidth * 0.26,
      right: screenLeft + screenWidth * 0.74,
      top: screenTop + screenHeight * 0.24,
      bottom: screenTop + screenHeight * 0.76,
    };
    const originOrder = side === 'enemy'
      ? ['bottom-right', 'top-left', 'top-right', 'bottom-left']
      : ['top-left', 'bottom-right', 'bottom-left', 'top-right'];
    const originsById = new Map(beaconOrigins.map((origin) => [origin.id, origin]));
    const damageSegments = this.getBaseCrackSegmentsForDamage(damageLevel);
    const paths = damageSegments.map((segment) => {
      const origin = originsById.get(originOrder[segment.path]);
      if (!origin) return null;
      return {
        points: this.buildBaseCrackPath(origin, segment.path, segment.pointCount, screenMetrics, safeZone, segment.lengthScale),
        branches: segment.branches,
        bounds: this.getBaseNonLethalCrackBounds(origin, screenMetrics),
      };
    }).filter(Boolean);

    crackGraphics.lineStyle(2, BASE_FRAME_SHADOW, 0.42);
    paths.forEach(({ points, branches, bounds }) => this.strokeBaseCrackPath(crackGraphics, points, branches, bounds, safeZone));

    crackGraphics.lineStyle(1, BASE_SCREEN_REFLECTION, 0.62);
    paths.forEach(({ points, branches, bounds }) => this.strokeBaseCrackPath(crackGraphics, points, branches, bounds, safeZone));

    this.renderTerminalFailureShatter(frameView, screenMetrics);
  }

  renderBaseBroadcastGlass(frameView, screenMetrics) {
    const { glassGraphics, side } = frameView ?? {};
    if (!glassGraphics?.active || !screenMetrics) return;

    const { screenLeft, screenTop, screenWidth, screenHeight } = screenMetrics;
    const reflectionX = side === 'enemy' ? screenLeft + screenWidth * 0.64 : screenLeft + screenWidth * 0.1;

    glassGraphics.clear();
    glassGraphics.fillStyle(BASE_SCREEN_REFLECTION, side === 'enemy' ? 0.065 : 0.055);
    glassGraphics.fillTriangle(
      reflectionX, screenTop + screenHeight * 0.1,
      reflectionX + screenWidth * 0.25, screenTop + screenHeight * 0.1,
      reflectionX + screenWidth * 0.06, screenTop + screenHeight * 0.3,
    );
    glassGraphics.lineStyle(1, BASE_SCREEN_REFLECTION, 0.105);
    glassGraphics.beginPath();
    glassGraphics.moveTo(reflectionX + screenWidth * 0.02, screenTop + screenHeight * 0.13);
    glassGraphics.lineTo(reflectionX + screenWidth * 0.22, screenTop + screenHeight * 0.13);
    glassGraphics.strokePath();
  }

  updateBaseBroadcastFrameState() {
    const activeSide = this.getCurrentActionableSide?.() ?? null;
    ['enemy', 'player'].forEach((side) => {
      const frameView = this.baseFrameViews?.[side];
      if (!frameView?.graphics?.active) return;

      const targetIntensity = activeSide === side ? 1 : 0;
      if (Math.abs((frameView.beaconIntensity ?? 0) - targetIntensity) < 0.01) {
        frameView.beaconIntensity = targetIntensity;
        this.renderBaseBroadcastFrame(frameView);
        return;
      }

      frameView.beaconFadeTween?.stop?.();
      frameView.beaconFadeTween = this.tweens.add({
        targets: frameView,
        beaconIntensity: targetIntensity,
        duration: BASE_BEACON_FADE_MS,
        ease: 'Sine.easeOut',
        onUpdate: () => this.renderBaseBroadcastFrame(frameView),
        onComplete: () => {
          frameView.beaconFadeTween = null;
          this.renderBaseBroadcastFrame(frameView);
        },
      });
    });
  }

  triggerBaseBroadcastOverload(side) {
    const frameView = this.baseFrameViews?.[side];
    if (!frameView?.graphics?.active) return;

    frameView.overloadEvent?.remove?.(false);
    frameView.overloadActive = true;
    this.renderBaseBroadcastFrame(frameView);
    frameView.overloadEvent = this.time.delayedCall(BASE_FRAME_OVERLOAD_MS, () => {
      frameView.overloadEvent = null;
      frameView.overloadActive = false;
      this.renderBaseBroadcastFrame(frameView);
    });
  }

  startPostBattleDestinationWithOverlay(destinationSceneKey, data = {}) {
    const transition = beginSceneTransitionOverlay(this, destinationSceneKey);
    traceSceneTransition(this, 'destination start requested', { transitionId: transition?.transitionId ?? null, sourceSceneKey: this.scene.key, destinationSceneKey });
    this.scene.start(destinationSceneKey, {
      ...(data && typeof data === 'object' ? data : {}),
      sceneTransitionOverlay: transition ? { transitionId: transition.transitionId, sourceSceneKey: this.scene.key } : null,
    });
    reconcileSceneTransitionOverlayOrdering(this.scene, { transitionId: transition?.transitionId, destinationSceneKey });
  }

  exitBattleToFactionSelect() {
    if (!this.prepareUtilityMenuNavigation({ includeBattleResultModal: true })) return;

    if (this.isTutorialBattle()) {
      this.exitTutorialBattleToGameMenu();
      return;
    }

    if (this.isCampaignBattle()) {
      this.exitBattleToCampaignEnemySelect();
      return;
    }

    this.clearAchievementPopupPresentationBatch();
    this.startPostBattleDestinationWithOverlay('FactionSelectScene');
  }

  exitTutorialBattleToGameMenu() {
    this.clearAchievementPopupPresentationBatch();
    this.startPostBattleDestinationWithOverlay('GameMenuScene');
  }

  exitBattleToCampaignEnemySelect() {
    const campaign = loadCampaign();
    if (isValidCampaignState(campaign) && campaign.status === 'active') {
      this.clearAchievementPopupPresentationBatch();
      this.startPostBattleDestinationWithOverlay('CampaignEnemySelectScene', { campaign });
      return;
    }

    this.clearAchievementPopupPresentationBatch();
    this.startPostBattleDestinationWithOverlay('CampaignEnemySelectScene');
  }


  continueCampaignBattleResult() {
    if (!this.isCampaignBattle()) return;
    const campaign = loadCampaign();
    if (!isValidCampaignState(campaign) || campaign.status !== 'active') {
      this.showCampaignCompleteModal('lost');
      return;
    }
    if (campaign.runId !== this.battleContext.campaignRunId) {
      console.warn('Campaign battle result ignored because campaign run id changed.', {
        battleRunId: this.battleContext.campaignRunId,
        loadedRunId: campaign.runId,
      });
      this.routeAfterIgnoredCampaignResult(campaign);
      return;
    }

    const result = {
      enemyFactionKey: this.battleContext.campaignEnemyFactionKey ?? this.enemyFactionKey,
      winner: this.gameState?.winner === 'player' ? 'player' : (this.gameState?.winner === 'draw' ? 'draw' : 'enemy'),
      battleDurationMs: this.getActiveBattleDurationMs(),
    };
    let updatedCampaign;
    try {
      updatedCampaign = applyCampaignBattleResult(campaign, result);
    } catch (error) {
      console.warn('Campaign battle result ignored because it no longer matches campaign state.', error);
      this.routeAfterIgnoredCampaignResult(campaign);
      return;
    }
    saveCampaign(updatedCampaign);
    this.trackCompletedCampaignLifecycleStats(campaign, updatedCampaign);

    if (updatedCampaign.status === 'won' || updatedCampaign.status === 'lost') {
      this.showCampaignCompleteModal(updatedCampaign.status);
      return;
    }

    this.clearAchievementPopupPresentationBatch();
    this.startPostBattleDestinationWithOverlay('CampaignEnemySelectScene', { campaign: updatedCampaign });
  }

  routeAfterIgnoredCampaignResult(campaign = loadCampaign()) {
    if (isValidCampaignState(campaign) && campaign.status === 'active') {
      this.clearAchievementPopupPresentationBatch();
      this.startPostBattleDestinationWithOverlay('CampaignEnemySelectScene', { campaign });
      return;
    }

    this.clearAchievementPopupPresentationBatch();
    this.startPostBattleDestinationWithOverlay('GameMenuScene');
  }

  createCampaignCompletionPreviewState(status) {
    const campaign = createNewCampaign(this.factionKey);
    const now = new Date().toISOString();
    const enemies = Object.fromEntries(Object.entries(campaign.enemies).map(([factionKey, enemy], index) => {
      if (status === 'won') return [factionKey, { ...enemy, defeated: true }];
      return [factionKey, { ...enemy, attemptsRemaining: index === 0 ? 0 : enemy.attemptsRemaining }];
    }));
    return {
      ...campaign,
      status,
      enemies,
      updatedAt: now,
      currentEnemyFactionKey: null,
    };
  }

  showCampaignCompleteModal(status) {
    const restoreOptions = arguments[1] ?? null;
    const options = restoreOptions ?? this.campaignCompletionModalOptions ?? {};
    this.campaignCompletionModalOptions = null;
    this.destroyBattleResultModal();
    this.playCampaignOutcomeSfxOnce(status);
    const campaign = options.campaign ?? loadCampaign();
    const restorePhase = options.restorePhase === 'cinematic' ? 'cinematic' : (options.restorePhase ? 'interactive' : 'cinematic');
    const restoreAsInteractive = restorePhase !== 'cinematic';
    const won = status === 'won';
    const safeCampaign = isValidCampaignState(campaign) ? campaign : null;
    const { width, height } = this.scale.gameSize;
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const titleText = won ? translateActive('ui.campaignResult.won', 'CAMPAIGN WON') : translateActive('ui.campaignResult.lost', 'CAMPAIGN LOST');
    const titleMaxWidth = Math.floor(width * CAMPAIGN_COMPLETION_TITLE_MAX_WIDTH_RATIO);
    const titleFontSize = Math.min(
      CAMPAIGN_COMPLETION_TITLE_MAX_FONT_SIZE,
      Math.max(CAMPAIGN_COMPLETION_TITLE_MIN_FONT_SIZE, Math.floor(height * 0.066), Math.floor(titleMaxWidth / 8.9)),
    );
    const accentColor = won ? 0x22c55e : 0xef4444;
    const accentTextColor = won ? '#86efac' : '#fca5a5';
    const softAccentColor = won ? 0xfacc15 : 0xf97316;
    const promptText = translateActive('ui.campaignResult.tapToContinue', 'TAP TO CONTINUE');
    const victorySplashText = translateActive('ui.campaignResult.victorySplash', 'VICTORY');
    const flavorPoolKey = won ? 'ui.campaignResult.wonFlavors' : 'ui.campaignResult.lostFlavors';
    const flavorFallbacks = won ? CAMPAIGN_RESULT_FLAVOR_FALLBACKS.won : CAMPAIGN_RESULT_FLAVOR_FALLBACKS.lost;
    const flavorText = typeof options.flavorText === 'string'
      ? options.flavorText
      : pickRandomTextEntry(translateActiveList(flavorPoolKey, flavorFallbacks), flavorFallbacks[0]);
    const hasTrophyTexture = won && hasLoadedImageAsset(this, CAMPAIGN_TROPHY_ASSET);

    const overlay = this.add.rectangle(centerX, height / 2, width, height, 0x000000, CAMPAIGN_COMPLETION_OVERLAY_ALPHA)
      .setInteractive()
      .setDepth(CAMPAIGN_COMPLETION_OVERLAY_DEPTH);
    overlay.on('pointerdown', (_pointer, _localX, _localY, event) => event?.stopPropagation?.());

    const cinematicItems = [];
    const summaryItems = [];
    const passiveItems = [];
    const largeGlowItems = [];
    const compactGlowItems = [];
    let campaignCelebration = null;
    let transitionStarted = false;
    if (restoreAsInteractive) transitionStarted = true;

    const heroMaxWidth = Math.min(width * 0.82, 520);
    const heroMaxHeight = Math.min(height * 0.48, 520);
    const compactMaxWidth = Math.min(width * 0.36, 190);
    const compactMaxHeight = Math.min(height * 0.18, 150);
    const baseSummaryTitleY = Math.max(height * 0.28, Math.min(height * 0.39, height * 0.32));
    const summaryTextOffsetY = hasTrophyTexture ? Math.min(58, Math.max(34, height * 0.055)) : 0;
    const summaryTitleY = Math.min(height * 0.46, baseSummaryTitleY + summaryTextOffsetY);
    const compactTrophyY = Math.max(height * 0.13, summaryTitleY - Math.max(96, compactMaxHeight * 0.68));
    const heroTrophyY = Math.max(height * 0.24, Math.min(height * 0.38, centerY - titleFontSize * 0.92));
    const isWonTrophyPresentation = won && hasTrophyTexture;

    const createTrophyGlow = (x, y, displayWidth, displayHeight, depth, alphaScale = 1) => {
      const backlightRadius = Math.max(displayWidth, displayHeight) * 0.72;
      const glow = this.add.graphics().setDepth(depth).setPosition(x, y);
      glow.setBlendMode?.('ADD');
      const glowLayerCount = 26;
      for (let i = glowLayerCount; i >= 1; i -= 1) {
        const progress = i / glowLayerCount;
        const coreBias = 1 - progress;
        const layerWidth = backlightRadius * (0.16 + progress * 1.34) * 2;
        const layerHeight = backlightRadius * (0.12 + progress * 0.96) * 2;
        const alpha = (0.004 + Math.pow(coreBias, 2.15) * 0.032) * alphaScale;
        const color = coreBias > 0.72 ? 0xffffff : (i % 5 === 0 ? 0x7dd3fc : 0xfde68a);
        glow.fillStyle(color, alpha);
        glow.fillEllipse(0, 0, layerWidth, layerHeight);
      }
      const bloomCore = this.add.graphics().setDepth(depth + 0.1).setPosition(x, y);
      bloomCore.setBlendMode?.('ADD');
      const coreLayerCount = 16;
      for (let i = coreLayerCount; i >= 1; i -= 1) {
        const progress = i / coreLayerCount;
        const coreBias = 1 - progress;
        bloomCore.fillStyle(coreBias > 0.66 ? 0xffffff : 0xfff7cc, (0.006 + Math.pow(coreBias, 2.4) * 0.026) * alphaScale);
        bloomCore.fillEllipse(
          -backlightRadius * 0.035,
          -backlightRadius * 0.02,
          backlightRadius * (0.12 + progress * 0.58) * 2,
          backlightRadius * (0.1 + progress * 0.44) * 2,
        );
      }
      return [glow, bloomCore];
    };

    const revealSummary = () => {
      this.resultOverlayState = { kind: 'campaign-completion', status, phase: 'summary', preview: options.preview === true, campaign: safeCampaign, flavorText };
      summaryItems.filter((item) => !button.items.includes(item)).forEach((item) => item?.setVisible?.(true)?.setAlpha?.(0));
      this.tweens.add({
        targets: summaryTitle,
        alpha: 1,
        duration: 180,
        ease: 'Sine.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: [flavor, dividerCore, stats].filter(Boolean),
            alpha: 1,
            duration: 180,
            ease: 'Sine.easeOut',
            onComplete: () => {
              button.items.forEach((item) => item?.setVisible?.(true)?.setAlpha?.(1));
              this.resultOverlayState = { kind: 'campaign-completion', status, phase: 'interactive', preview: options.preview === true, campaign: safeCampaign, flavorText };
              this.startAchievementUnlockPopupsForResultModal();
            },
          });
        },
      });
    };

    const showSummary = () => {
      if (transitionStarted) return;
      transitionStarted = true;
      this.resultOverlayState = { kind: 'campaign-completion', status, phase: 'summary', preview: options.preview === true, campaign: safeCampaign, flavorText };
      overlay.removeAllListeners('pointerup');
      campaignCelebration?.timers?.forEach((timer) => timer?.remove?.(false));
      campaignCelebration?.particles?.forEach((particle) => particle?.destroy?.());
      cinematicItems.forEach((item) => item?.destroy?.());
      if (hasTrophyTexture && trophy) {
        this.tweens.killTweensOf([trophy, ...largeGlowItems]);
        this.tweens.add({
          targets: largeGlowItems,
          alpha: 0,
          duration: 180,
          ease: 'Sine.easeOut',
          onComplete: () => largeGlowItems.forEach((item) => item?.destroy?.()),
        });
        this.tweens.add({
          targets: trophy,
          x: centerX,
          y: compactTrophyY,
          displayWidth: trophy.compactDisplayWidth,
          displayHeight: trophy.compactDisplayHeight,
          duration: 420,
          ease: 'Cubic.easeInOut',
          onComplete: () => {
            const newCompactGlowItems = createTrophyGlow(
              centerX,
              compactTrophyY,
              trophy.compactDisplayWidth,
              trophy.compactDisplayHeight,
              CAMPAIGN_COMPLETION_CONTENT_DEPTH + 0.1,
              0.88,
            );
            newCompactGlowItems.forEach((item) => item.setAlpha(0));
            compactGlowItems.push(...newCompactGlowItems);
            passiveItems.push(...newCompactGlowItems);
            this.tweens.add({
              targets: newCompactGlowItems,
              alpha: 1,
              duration: 160,
              ease: 'Sine.easeOut',
              onComplete: () => revealSummary(),
            });
          },
        });
        return;
      }
      passiveItems.forEach((item) => item?.setVisible?.(hasTrophyTexture)?.setAlpha?.(item.summaryAlpha ?? item.alpha ?? 1));
      revealSummary();
    };
    overlay.on('pointerup', (_pointer, _localX, _localY, event) => {
      event?.stopPropagation?.();
      showSummary();
    });

    let trophy = null;
    let heroDisplayHeight = heroMaxHeight;
    if (hasTrophyTexture) {
      const trophySource = this.textures.get(CAMPAIGN_TROPHY_ASSET.key)?.getSourceImage?.();
      const trophyAspect = Math.max(0.1, (trophySource?.width ?? 1) / Math.max(1, trophySource?.height ?? 1));
      const heroDisplayWidth = Math.min(heroMaxWidth, heroMaxHeight * trophyAspect);
      heroDisplayHeight = heroDisplayWidth / trophyAspect;
      const compactDisplayWidth = Math.min(compactMaxWidth, compactMaxHeight * trophyAspect);
      const compactDisplayHeight = compactDisplayWidth / trophyAspect;
      const newLargeGlowItems = createTrophyGlow(
        centerX,
        heroTrophyY,
        heroDisplayWidth,
        heroDisplayHeight,
        CAMPAIGN_COMPLETION_CONTENT_DEPTH + 0.1,
        1,
      );
      largeGlowItems.push(...newLargeGlowItems);
      passiveItems.push(...newLargeGlowItems);
      this.tweens.add({
        targets: newLargeGlowItems,
        x: { from: centerX - Math.max(heroDisplayWidth, heroDisplayHeight) * 0.013, to: centerX + Math.max(heroDisplayWidth, heroDisplayHeight) * 0.013 },
        alpha: { from: 0.82, to: 0.96 },
        duration: 4200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      trophy = this.add.image(centerX, heroTrophyY, CAMPAIGN_TROPHY_ASSET.key)
        .setOrigin(0.5)
        .setDisplaySize(heroDisplayWidth, heroDisplayHeight)
        .setDepth(CAMPAIGN_COMPLETION_CONTENT_DEPTH + 0.6);
      trophy.compactDisplayWidth = compactDisplayWidth;
      trophy.compactDisplayHeight = compactDisplayHeight;
    }

    const trophyHeroHeight = Math.min(heroDisplayHeight ?? heroMaxHeight, heroMaxHeight);
    const victoryTitleFontSize = Math.max(44, Math.min(69, Math.floor(height * 0.074)));
    const finalWonTitleY = Math.min(height * 0.78, heroTrophyY + trophyHeroHeight * 0.52 + victoryTitleFontSize * 1.18);
    const finalLostTitleY = centerY;
    const titleY = hasTrophyTexture ? finalWonTitleY : (won ? Math.max(height * 0.32, titleFontSize * 2.1) : finalLostTitleY);
    const titleAura = isWonTrophyPresentation ? null : this.add.circle(centerX, titleY, Math.min(width, height) * 0.28, accentColor, 0.09)
      .setDepth(CAMPAIGN_COMPLETION_CONTENT_DEPTH + 0.3)
      .setVisible(won);
    const title = this.add.text(centerX, titleY, isWonTrophyPresentation ? victorySplashText : titleText, {
      fontFamily: PREMIUM_BROADCAST_FONT_STACK,
      fontSize: `${isWonTrophyPresentation ? victoryTitleFontSize : titleFontSize}px`,
      color: isWonTrophyPresentation ? '#fef3c7' : accentTextColor,
      fontStyle: '700',
      align: 'center',
      wordWrap: { width: titleMaxWidth, useAdvancedWrap: true },
      fixedWidth: titleMaxWidth,
      letterSpacing: 2.2,
    }).setOrigin(0.5).setDepth(CAMPAIGN_COMPLETION_CONTENT_DEPTH + 1);
    title?.setShadow(0, 3, 'rgba(0, 0, 0, 0.72)', 5, true, true);
    const emblem = hasTrophyTexture || !won ? null : this.add.text(centerX, titleY - titleFontSize * 1.05, '◆', {
      fontFamily: PREMIUM_BROADCAST_FONT_STACK,
      fontSize: `${Math.max(30, Math.floor(titleFontSize * 0.82))}px`,
      color: '#facc15',
      align: 'center',
    }).setOrigin(0.5).setDepth(CAMPAIGN_COMPLETION_CONTENT_DEPTH + 1).setAlpha(0.86);
    const useWonPromptStyle = isWonTrophyPresentation || !won;
    const finalWonPromptY = Math.max(height * 0.12, heroTrophyY - trophyHeroHeight * 0.5 - Math.max(30, height * 0.038));
    const promptY = (isWonTrophyPresentation || !won)
      ? finalWonPromptY
      : Math.min(height * 0.86, titleY + titleFontSize * 1.55);
    const promptFontSize = useWonPromptStyle
      ? Math.max(13, Math.min(18, Math.floor(height * 0.02)))
      : Math.max(18, Math.min(26, Math.floor(height * 0.028)));
    const prompt = this.add.text(centerX, promptY, promptText, {
      fontFamily: PREMIUM_BROADCAST_FONT_STACK,
      fontSize: `${promptFontSize}px`,
      color: useWonPromptStyle ? '#efe7c8' : '#f5f1e6',
      fontStyle: useWonPromptStyle ? '600' : '700',
      align: 'center',
      wordWrap: { width: titleMaxWidth, useAdvancedWrap: true },
      fixedWidth: titleMaxWidth,
      letterSpacing: useWonPromptStyle ? 1.1 : 1.6,
    }).setOrigin(0.5).setDepth(CAMPAIGN_COMPLETION_CONTENT_DEPTH + 1).setAlpha(useWonPromptStyle ? 0.74 : 1);
    prompt.setShadow(0, 2, 'rgba(0, 0, 0, 0.68)', useWonPromptStyle ? 3 : 5, true, true);
    if (isWonTrophyPresentation) {
      campaignCelebration = this.addBattleResultVictoryCelebration(
        centerX,
        titleY,
        Math.min(width * 0.66, 420),
        Math.min(height * 0.2, 156),
        { key: 'victory', accentColor: 0xfacc15 },
        {
          titleAnchored: true,
          particleDepth: CAMPAIGN_COMPLETION_CONTENT_DEPTH + 0.92,
          burstDepth: CAMPAIGN_COMPLETION_CONTENT_DEPTH + 0.86,
          waveDelays: [0, 260, 560, 900, 1260, 1680],
          particleColors: [0xffffff, 0xfef08a, 0xfacc15, 0x7dd3fc, 0x86efac],
        },
      );
    }
    cinematicItems.push(...[titleAura, title, prompt].filter(Boolean));
    if (emblem) cinematicItems.push(emblem);

    const contentWidth = Math.min(width * 0.9, 540);
    const fallbackPanelWidth = Math.min(width * 0.9, 520);
    const fallbackPanelHeight = Math.min(height * 0.62, 470);
    const fallbackPanelY = height * 0.47;
    const fallbackPanel = hasTrophyTexture ? null : this.add.rectangle(centerX, fallbackPanelY, fallbackPanelWidth, fallbackPanelHeight, 0x07111f, 0.94)
      .setStrokeStyle(2, accentColor, 0.72)
      .setDepth(CAMPAIGN_COMPLETION_CONTENT_DEPTH)
      .setVisible(false);
    const summaryBodyOffsetY = won || status === 'lost' ? Math.min(14, Math.max(8, Math.floor(height * 0.012))) : 0;
    const summaryTitle = this.add.text(centerX, summaryTitleY, titleText, {
      fontFamily: PREMIUM_BROADCAST_FONT_STACK,
      fontSize: `${Math.max(24, Math.min(38, Math.floor(height * 0.044)))}px`,
      color: accentTextColor,
      fontStyle: '700',
      align: 'center',
      wordWrap: { width: contentWidth, useAdvancedWrap: true },
      fixedWidth: contentWidth,
    }).setOrigin(0.5).setDepth(CAMPAIGN_COMPLETION_CONTENT_DEPTH + 1).setVisible(false);
    const buttonWidth = Math.min(240, Math.max(176, width * 0.62));
    const buttonHeight = Math.max(68, Math.min(76, Math.floor(height * 0.09)));
    const baseStatsY = baseSummaryTitleY + Math.max(126, height * 0.18);
    const buttonY = Math.min(height - buttonHeight * 0.82, Math.max(baseStatsY + 100, height * 0.78));
    const ctaSafeTopY = buttonY - buttonHeight * 0.5 - Math.max(30, height * 0.036);
    const statsText = this.getCampaignCompletionStatsText(safeCampaign);
    const flavor = this.add.text(centerX, summaryTitleY, flavorText, {
      fontFamily: PREMIUM_BROADCAST_FONT_STACK,
      fontSize: `${Math.max(15, Math.min(20, Math.floor(height * 0.022)))}px`,
      color: '#dbeafe',
      align: 'center',
      wordWrap: { width: contentWidth * 0.9, useAdvancedWrap: true },
    }).setOrigin(0.5).setDepth(CAMPAIGN_COMPLETION_CONTENT_DEPTH + 1).setVisible(false);
    const stats = this.add.text(centerX, summaryTitleY, statsText, {
      fontFamily: PREMIUM_BROADCAST_FONT_STACK,
      fontSize: `${Math.max(17, Math.min(22, Math.floor(height * 0.025)))}px`,
      color: '#f5f1e6',
      fontStyle: '600',
      align: 'center',
      lineSpacing: Math.max(10, Math.floor(height * 0.014)),
      wordWrap: { width: contentWidth * 0.78, useAdvancedWrap: true },
      fixedWidth: contentWidth * 0.78,
    }).setOrigin(0.5).setDepth(CAMPAIGN_COMPLETION_CONTENT_DEPTH + 1).setVisible(false);
    const idealTitleFlavorGap = Math.max(34, height * 0.048);
    const idealFlavorStatsGap = Math.max(38, height * 0.054);
    const dividerStatsGap = Math.max(40, height * 0.056);
    const minTitleFlavorGap = Math.max(20, height * 0.028);
    const minFlavorStatsGap = Math.max(22, height * 0.03);
    const titleBottomY = summaryTitleY + summaryTitle.height * 0.5 + summaryBodyOffsetY;
    const statsSafeY = ctaSafeTopY - stats.height * 0.5;
    const idealStatsY = titleBottomY + idealTitleFlavorGap + flavor.height + idealFlavorStatsGap + dividerStatsGap + stats.height * 0.5;
    let statsY = Math.min(idealStatsY, statsSafeY);
    const availableGap = Math.max(0, statsY - stats.height * 0.5 - dividerStatsGap - titleBottomY - flavor.height);
    const compressedFlavorStatsGap = Math.max(minFlavorStatsGap, Math.min(idealFlavorStatsGap, availableGap - minTitleFlavorGap));
    const titleFlavorGap = Math.max(minTitleFlavorGap, Math.min(idealTitleFlavorGap, availableGap - compressedFlavorStatsGap));
    const flavorY = titleBottomY + titleFlavorGap + flavor.height * 0.5;
    const flavorBottomY = flavorY + flavor.height * 0.5;
    const wonDividerFlavorGap = Math.max(14, height * 0.018);
    const wonDividerStatsGap = Math.max(18, height * 0.024);
    let dividerY = Math.min(
      statsY - stats.height * 0.5 - dividerStatsGap,
      flavorBottomY + compressedFlavorStatsGap,
    );
    if (won) {
      dividerY = flavorBottomY + wonDividerFlavorGap;
      statsY = Math.min(
        statsSafeY,
        Math.max(statsY, dividerY + wonDividerStatsGap + stats.height * 0.5),
      );
    }
    flavor.setY(flavorY);
    stats.setY(statsY);
    const dividerCore = this.add.rectangle(centerX, dividerY, contentWidth * 0.62, 1, softAccentColor, 0.62)
      .setDepth(CAMPAIGN_COMPLETION_CONTENT_DEPTH + 1).setVisible(false);
    const button = this.createResultModalButton(centerX, buttonY, buttonWidth, buttonHeight, translateActive('ui.common.mainMenu', 'MAIN MENU'), () => {
      if (!options.preview) clearCampaign();
      this.clearAchievementPopupPresentationBatch();
      this.scene.start(options.preview ? (this.battleContext?.returnSceneKey ?? 'DebugMenuScene') : 'MainMenuScene');
    }, this.getBattleResultPresentation(), { depth: CAMPAIGN_COMPLETION_BUTTON_DEPTH });
    button.items.forEach((item) => item?.setVisible?.(false));
    summaryItems.push(...[fallbackPanel, summaryTitle, flavor, stats, dividerCore].filter(Boolean), ...button.items);
    if (restoreAsInteractive) {
      overlay.removeAllListeners('pointerup');
      campaignCelebration?.timers?.forEach((timer) => timer?.remove?.(false));
      campaignCelebration?.particles?.forEach((particle) => particle?.destroy?.());
      cinematicItems.forEach((item) => item?.destroy?.());
      summaryItems.forEach((item) => item?.setVisible?.(true)?.setAlpha?.(1));
    }
    if (campaignCelebration) {
      campaignCelebration.modalItems = [...cinematicItems.filter((item) => item !== title && item !== titleAura), ...passiveItems, trophy, fallbackPanel, summaryTitle].filter(Boolean);
    }
    this.battleResultModalShown = true;
    this.resultOverlayState = {
      kind: 'campaign-completion',
      status,
      phase: restoreAsInteractive ? 'interactive' : 'cinematic',
      preview: options.preview === true,
      campaign: safeCampaign,
      flavorText,
    };
    this.battleResultModal = {
      overlay,
      title,
      titleAura,
      titleGlow: null,
      subtitle: flavor,
      stats,
      dividerCore,
      dividerGlow: null,
      celebration: campaignCelebration ?? [...cinematicItems.filter((item) => item !== title && item !== titleAura), ...passiveItems, trophy, fallbackPanel, summaryTitle].filter(Boolean),
      buttons: [button],
    };
    if (restoreAsInteractive) this.startAchievementUnlockPopupsForResultModal();
  }

  getCampaignCompletionStatsText(campaign) {
    const enemies = Object.values(campaign?.enemies ?? {});
    const wonBattles = enemies.filter((enemy) => enemy.defeated).length;
    const lostBattles = enemies.reduce((total, enemy) => total + Math.max(0, 3 - (enemy.attemptsRemaining ?? 3)), 0);
    const rows = [
      `${translateActive('ui.campaignResult.wonBattles', 'Won battles')}: ${wonBattles}`,
      `${translateActive('ui.campaignResult.lostBattles', 'Lost battles')}: ${lostBattles}`,
    ];
    const totalBattleDurationMs = campaign?.totalBattleDurationMs;
    if (Number.isFinite(totalBattleDurationMs) && totalBattleDurationMs >= 0) {
      rows.push(`${translateActive('ui.campaignResult.campaignTime', 'Campaign time')}: ${this.formatCampaignDuration(totalBattleDurationMs)}`);
    }
    return rows.join('\n');
  }

  formatCampaignDuration(durationMs) {
    const totalMinutes = Math.max(0, Math.round(durationMs / 60000));
    if (totalMinutes < 60) {
      return `${totalMinutes}m`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  getBattleRulesPanelLaunchData() {
    return { returnSceneKey: 'BattleScene', hideScrollHint: true, battleModalPresentation: true };
  }

  launchBattleRulesPanel({ prepareNavigation = true } = {}) {
    if (prepareNavigation && !this.prepareUtilityMenuNavigation()) return false;
    this.hideRulesPanelBackgroundHelpers();
    this.scene.launch('RulesPanelScene', this.getBattleRulesPanelLaunchData());
    this.scene.pause();
    return true;
  }

  openRulesPanel() {
    return this.launchBattleRulesPanel();
  }

  openBattleMenu() {
    if (!this.prepareUtilityMenuNavigation()) return;
    this.handleTutorialEvent?.('battle_menu_opened');
    this.scene.launch('BattleMenuScene', { factionKey: this.factionKey, enemyFactionKey: this.enemyFactionKey, battleContext: this.battleContext, returnSceneKey: 'BattleScene' });
    this.scene.pause();
  }

  resumeFromRulesPanel() {
    this.restoreRulesPanelBackgroundHelpers();
    this.navigationInProgress = false;
    this.clearPointerInputGuard();
    this.scene.resume();
    this.recoverFromLifecycle('rules-panel-return');
  }

  resumeFromBattleMenu() {
    this.navigationInProgress = false;
    this.clearPointerInputGuard();
    this.scene.resume();
    this.handleTutorialEvent?.('battle_menu_closed');
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
    this.scene.bringToTop('SettingsScene');
    this.scene.pause();
  }

  exitBattleToMainMenu() {
    if (!this.prepareUtilityMenuNavigation({ includeBattleResultModal: true })) return;
    this.clearAchievementPopupPresentationBatch();
    this.scene.start('MainMenuScene');
  }

  retryBattle() {
    const factionKey = this.factionKey;
    const enemyFactionKey = this.enemyFactionKey;
    const battleContext = this.battleContext;
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
    // Preserve arena retry shape for compatibility: this.scene.restart({ factionKey, enemyFactionKey })
    this.clearAchievementPopupPresentationBatch();
    restartBattleScene(this, { factionKey, enemyFactionKey, battleContext });
  }

  toggleFullscreen() {
    toggleSceneFullscreen(this);
  }

  onScenePause() {
    this.pauseCampaignBattleTimer();
  }

  onSceneSleep() {
    this.pauseCampaignBattleTimer();
  }

  onSceneResume() {
    this.resumeCampaignBattleTimer();
    this.recoverFromLifecycle('scene-resume');
  }

  onSceneWake() {
    this.resumeCampaignBattleTimer();
    this.recoverFromLifecycle('scene-wake');
  }

  onFullscreenChanged() {
    this.tutorialLifecycleDiagnostics.lastFullscreenChangeAt = Date.now();
    if (this.scale.isFullscreen) {
      requestPortraitOrientationLock();
    }

    this.logTutorialLifecycleDiagnostic(this.scale.isFullscreen ? 'enterfullscreen' : 'leavefullscreen', { snapshot: this.getTutorialLifecycleDiagnosticSnapshot?.() });
    this.recoverFromLifecycle(this.scale.isFullscreen ? 'enterfullscreen' : 'leavefullscreen');
  }

  onTutorialDocumentFullscreenChanged(event) {
    this.tutorialLifecycleDiagnostics.lastFullscreenChangeAt = Date.now();
    const reason = event?.type ?? 'fullscreenchange';
    this.logTutorialLifecycleDiagnostic(reason, {
      scaleIsFullscreen: this.scale?.isFullscreen,
      documentFullscreenElement: Boolean(globalThis.document?.fullscreenElement ?? globalThis.document?.webkitFullscreenElement),
    });
    this.recoverFromLifecycle(reason);
  }

  onViewportChanged() {
    if (!this.gameState) return;
    this.tutorialLifecycleDiagnostics.lastViewportChangeAt = Date.now();
    this.logTutorialLifecycleDiagnostic('viewport-change', {
      width: this.scale?.gameSize?.width,
      height: this.scale?.gameSize?.height,
      viewportWidth: globalThis.window?.innerWidth,
      viewportHeight: globalThis.window?.innerHeight,
    });
    this.rebuildBattleView('viewport-change');
    this.scheduleTutorialUiRecovery('viewport-change');
  }

  onTutorialViewportChanged(event) {
    if (!this.gameState) return;
    this.tutorialLifecycleDiagnostics.lastViewportChangeAt = Date.now();
    this.logTutorialLifecycleDiagnostic(event?.type ?? 'resize', {
      viewportWidth: globalThis.window?.innerWidth,
      viewportHeight: globalThis.window?.innerHeight,
    });
  }

  recoverFromLifecycle(reason = 'unknown', diagnostics = null) {
    this.tutorialLifecycleDiagnostics.lastLifecycleReason = reason;
    this.tutorialLifecycleDiagnostics.lastRecoveryReason = reason;
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

    if (this.openingMulliganRevealPending) {
      this.completeOpeningMulliganReveal({ skipAnimation: true, redraw: false });
    }

    this.normalizeLifecycleUiState(reason);

    if (this.shouldRebuildBattleView(reason, recoveryDiagnostics)) {
      this.rebuildBattleView(reason);
    } else {
      this.refreshBoardLabels();
      this.refreshHeroHP();
      this.updatePlayerBaseActionState();
      this.updateInitiativeIndicator();
      this.resetCardHighlights();
    }

    this.refreshLifecycleBanners(reason);
    this.scheduleTutorialUiRecovery(reason);
    this.ensureBattleResultModalVisible(`lifecycle:${reason}`);

    if (!this.gameState?.winner && !this.battleAmbienceStopping) {
      this.startCampaignBattleTimer();
      this.time.delayedCall(560, () => this.startBattleAmbience());
    }

    this.game.renderer?.resetTextures?.();
    this.game.renderer?.snapshotArea?.(0, 0, 1, 1, () => {});
    this.game.canvas?.focus?.();
  }

  normalizeLifecycleUiState(reason = 'unknown') {
    this.clearPointerInputGuard();
    this.cancelInterruptedPointerGesture();
    this.deferredTransientBattleBanner = null;

    if (this.openingMulliganPending) {
      this.targetingState = null;
      this.effectCastState = null;
      this.pendingSwapIndex = null;
      this.destroyActiveSelectionMessage(null, { flushDeferred: false });
      this.destroyTransientBattleBanners();
      const liveHandIds = new Set((this.gameState?.player?.hand ?? []).map((card) => card.id));
      this.selectedMulliganCardIds = this.selectedMulliganCardIds.filter((cardId) => liveHandIds.has(cardId));
      if (this.cardViews.length !== (this.gameState?.player?.hand?.length ?? 0)) {
        this.rebuildBattleView(`${reason}:mulligan-hand-repair`);
        return;
      }
      this.redrawHand();
    } else if (this.turnStartBanner?.active) {
      this.destroyEnemyActionBanner();
      this.destroyPlayerActionBanner();
      this.destroyInvalidActionBanner();
    } else if (!this.restorePersistentBattleBanner()) {
      this.destroyTransientBattleBanners();
    }

    this.refreshHeroHP();
    this.updatePlayerBaseActionState();
    this.updateInitiativeIndicator();
    this.resetCardHighlights({ showPreview: false });
  }

  refreshLifecycleBanners(reason = 'unknown') {
    this.logTutorialLifecycleDiagnostic('refreshLifecycleBanners', { reason });
    this.restoreTutorialPresentationState(reason, { forceRecreate: true });
  }

  shouldBlockTutorialUiRecovery() {
    return Boolean(
      !this.scene
      || !this.gameState
      || !this.layout
      || !this.isTutorialBattle?.()
      || !this.tutorialControllerState
      || this.battleResultModalPending
      || this.battleResultModalShown
      || this.gameState?.winner
    );
  }

  shouldTemporarilySuppressTutorialUiRecovery() {
    return Boolean(this.isFlowResolving || this.isEffectCastResolving);
  }

  shouldSuppressTutorialUiRecovery() {
    return this.shouldBlockTutorialUiRecovery() || this.shouldTemporarilySuppressTutorialUiRecovery();
  }

  cancelTutorialUiRecovery() {
    this.pendingTutorialUiRecoveryEvent?.remove?.(false);
    this.pendingTutorialUiRecoveryEvent = null;
    (this.pendingTutorialUiRecoveryEvents ?? []).forEach((event) => event?.remove?.(false));
    this.pendingTutorialUiRecoveryEvents = [];
  }

  scheduleTutorialUiRecovery(reason = 'unknown') {
    // Existing non-tutorial guard retained: if (this.shouldBlockTutorialUiRecovery()) return null;
    if (this.shouldBlockTutorialUiRecovery()) {
      this.tutorialLifecycleDiagnostics.tutorialUiRecoverySkippedCount += 1;
      this.logTutorialLifecycleDiagnostic('scheduleTutorialUiRecovery skipped', { reason, skipReason: 'blocked', suppression: this.getTutorialSuppressionReasons() });
      return null;
    }
    if (this.scene && !this.scene.isActive?.() && !this.scene.isPaused?.()) {
      this.tutorialLifecycleDiagnostics.tutorialUiRecoverySkippedCount += 1;
      this.logTutorialLifecycleDiagnostic('scheduleTutorialUiRecovery skipped', { reason, skipReason: 'scene_inactive' });
      return null;
    }

    this.cancelTutorialUiRecovery();
    this.tutorialLifecycleDiagnostics.tutorialUiRecoveryScheduledCount += 1;
    this.logTutorialLifecycleDiagnostic('scheduleTutorialUiRecovery scheduled', { reason });

    const delays = [0, 50, 100];
    this.pendingTutorialUiRecoveryEvents = delays.map((delay) => {
      let recoveryEvent = null;
      recoveryEvent = this.time?.delayedCall?.(delay, () => {
        this.pendingTutorialUiRecoveryEvents = (this.pendingTutorialUiRecoveryEvents ?? []).filter((event) => event !== recoveryEvent);
        this.tutorialLifecycleDiagnostics.tutorialUiRecoveryFiredCount += 1;
        this.logTutorialLifecycleDiagnostic('scheduleTutorialUiRecovery fired', { reason, delay });
        if (this.shouldBlockTutorialUiRecovery()) {
          this.tutorialLifecycleDiagnostics.tutorialUiRecoverySkippedCount += 1;
          this.logTutorialLifecycleDiagnostic('scheduleTutorialUiRecovery fired skipped', { reason, delay, skipReason: 'blocked', suppression: this.getTutorialSuppressionReasons() });
          return;
        }
        if (this.scene && !this.scene.isActive?.() && !this.scene.isPaused?.()) {
          this.tutorialLifecycleDiagnostics.tutorialUiRecoverySkippedCount += 1;
          this.logTutorialLifecycleDiagnostic('scheduleTutorialUiRecovery fired skipped', { reason, delay, skipReason: 'scene_inactive' });
          return;
        }
        if (this.shouldTemporarilySuppressTutorialUiRecovery()) {
          this.tutorialLifecycleDiagnostics.tutorialUiRecoverySkippedCount += 1;
          this.logTutorialLifecycleDiagnostic('scheduleTutorialUiRecovery fired skipped', { reason, delay, skipReason: 'temporarily_suppressed', suppression: this.getTutorialSuppressionReasons() });
          this.scheduleTutorialUiRecovery(`${reason}:retry`);
          return;
        }
        this.restoreTutorialPresentationState?.(`${reason}:deferred:${delay}`, { forceFocusRedraw: true, forceRecreate: true });
      });
      return recoveryEvent;
    }).filter(Boolean);
    this.pendingTutorialUiRecoveryEvent = this.pendingTutorialUiRecoveryEvents[0] ?? null;

    return this.pendingTutorialUiRecoveryEvents;
  }

  restoreTutorialPresentationState(reason = 'unknown', { forceFocusRedraw = true, forceRecreate = false } = {}) {
    this.tutorialLifecycleDiagnostics.tutorialRestoreCallCount += 1;
    this.tutorialLifecycleDiagnostics.lastTutorialRestoreReason = reason;
    this.logTutorialLifecycleDiagnostic('restoreTutorialPresentationState called', { reason, forceFocusRedraw, forceRecreate });
    if (this.shouldBlockTutorialUiRecovery()) {
      this.tutorialLifecycleDiagnostics.tutorialRestoreSkipCount += 1;
      this.tutorialLifecycleDiagnostics.lastTutorialRestoreSkipReason = 'blocked';
      this.logTutorialLifecycleDiagnostic('restoreTutorialPresentationState skipped', { reason, skipReason: 'blocked', suppression: this.getTutorialSuppressionReasons() });
      return null;
    }
    if (this.shouldTemporarilySuppressTutorialUiRecovery()) {
      this.tutorialLifecycleDiagnostics.tutorialRestoreSkipCount += 1;
      this.tutorialLifecycleDiagnostics.lastTutorialRestoreSkipReason = 'temporarily_suppressed';
      this.logTutorialLifecycleDiagnostic('restoreTutorialPresentationState skipped', { reason, skipReason: 'temporarily_suppressed', suppression: this.getTutorialSuppressionReasons() });
      this.scheduleTutorialUiRecovery(`${reason}:suppressed`);
      return null;
    }

    const step = this.getCurrentTutorialStep?.();
    if (!step || !this.getTutorialStepText?.(step)) {
      this.tutorialLifecycleDiagnostics.tutorialRestoreSkipCount += 1;
      this.tutorialLifecycleDiagnostics.lastTutorialRestoreSkipReason = 'missing_step_or_text';
      this.logTutorialLifecycleDiagnostic('restoreTutorialPresentationState skipped', { reason, skipReason: 'missing_step_or_text', stepExists: Boolean(step) });
      this.destroyTutorialBanner?.();
      this.destroyTutorialFocus?.();
      return null;
    }

    if (forceRecreate) {
      this.tutorialLifecycleDiagnostics.tutorialForcedRecreateCount += 1;
      this.tutorialLifecycleDiagnostics.lastTutorialForcedRecreateReason = reason;
      this.logTutorialLifecycleDiagnostic('force recreate tutorial presentation', {
        reason,
        oldBannerInDisplayList: Boolean(this.children?.exists?.(this.tutorialBanner)),
        oldFocusLayerInDisplayList: Boolean(this.children?.exists?.(this.tutorialFocusLayer)),
        oldFocusGraphicsCount: this.tutorialFocusGraphics?.length ?? 0,
      });
      this.destroyTutorialBanner?.();
      this.destroyTutorialFocus?.();
      forceFocusRedraw = true;
    }

    const banner = this.updateTutorialBanner?.();
    if (banner?.active) {
      banner.setOrigin?.(0.5);
      banner.setScrollFactor?.(0);
      banner.setDepth?.(TUTORIAL_BANNER_DEPTH);
      this.children?.bringToTop?.(banner);
    }

    if (this.tutorialBannerOverlay?.active) {
      this.tutorialBannerOverlay.setOrigin?.(0.5);
      this.tutorialBannerOverlay.setAlpha?.(0.001);
      this.tutorialBannerOverlay.setScrollFactor?.(0);
      this.tutorialBannerOverlay.setDepth?.(TUTORIAL_BANNER_OVERLAY_DEPTH);
      this.children?.bringToTop?.(this.tutorialBannerOverlay);
    }

    const layer = this.ensureTutorialFocusLayer?.();
    if (layer?.active) {
      layer.setVisible?.(true);
      layer.setAlpha?.(1);
      layer.setDepth?.(TUTORIAL_FOCUS_DEPTH);
      layer.setScale?.(1);
      layer.setPosition?.(0, 0);
      layer.setScrollFactor?.(0);
      this.children?.bringToTop?.(layer);
    }

    if (forceFocusRedraw) {
      this.clearTutorialFocusGraphics?.();
    }
    this.updateTutorialFocus?.(step, { forceRedraw: forceFocusRedraw });
    return banner;
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
      || this.cardViews.length === 0
      || !this.enemyHpText?.active
      || !this.playerHpText?.active
      || !this.playerBaseActionLabelText?.active;
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


  captureResultOverlayState() {
    if (!this.battleResultModalShown && !this.battleResultModalPending) return null;
    if (this.resultOverlayState) {
      return {
        ...this.resultOverlayState,
        campaign: this.resultOverlayState.campaign ? { ...this.resultOverlayState.campaign } : this.resultOverlayState.campaign,
      };
    }
    if (this.battleResultModalPending && this.gameState?.winner) {
      return {
        kind: this.getBattleResultOverlayKind(),
        phase: 'pending',
      };
    }
    if (this.battleResultModalShown) {
      return {
        kind: this.getBattleResultOverlayKind(),
        phase: 'interactive',
      };
    }
    return null;
  }

  restoreResultOverlayFromSnapshot(snapshot) {
    if (!snapshot?.kind) return false;
    if (snapshot.kind === 'campaign-completion') {
      const phase = snapshot.phase === 'cinematic' ? 'cinematic' : 'interactive';
      this.showCampaignCompleteModal(snapshot.status === 'won' ? 'won' : 'lost', {
        preview: snapshot.preview === true,
        campaign: snapshot.campaign,
        restorePhase: phase,
        flavorText: typeof snapshot.flavorText === 'string' ? snapshot.flavorText : undefined,
      });
      return true;
    }
    if ((snapshot.kind === 'arena-battle-result' || snapshot.kind === 'campaign-battle-result' || snapshot.kind === 'tutorial-battle-result') && this.gameState?.winner) {
      this.showBattleResultModal({
        skipReveal: true,
        resultSubtitle: typeof snapshot.resultSubtitle === 'string' ? snapshot.resultSubtitle : undefined,
      });
      return true;
    }
    return false;
  }

  rebuildBattleView(reason = 'unknown') {
    this.tutorialLifecycleDiagnostics.lastRebuildReason = reason;
    this.logTutorialLifecycleDiagnostic('rebuildBattleView start', { reason });
    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;

    const resultOverlaySnapshot = this.captureResultOverlayState();
    this.cleanupSceneObjects({ preserveTimers: true });
    this.terminalTextBootComplete = false;
    this.layout = this.getLayoutMetrics(width, height);
    this.cameras.main.setBackgroundColor(BATTLE_BACKGROUND_FALLBACK_COLOR_HEX);
    this.backgroundArtAsset = this.resolveBattleBackgroundAsset();

    this.drawBattleBackground();
    this.drawBattleFrame();
    this.drawBattlefieldCenterLight();
    this.drawBoard();
    this.drawHeroPanels();
    this.refreshBoardLabels();
    this.refreshHeroHP();
    this.drawDeckCounter();
    this.drawHand();
    this.drawPlayerBaseUtilityMenuTrigger();
    this.updatePlayerBaseActionState();
    this.updateInitiativeIndicator();
    this.resetCardHighlights();
    this.restorePersistentBattleBanner();
    this.restoreTutorialPresentationState(reason, { forceRecreate: true });
    this.scheduleTutorialUiRecovery(reason);

    this.restoreResultOverlayFromSnapshot(resultOverlaySnapshot);
    this.ensureBattleResultModalVisible(`rebuild:${reason}`);

    console.debug('BattleScene view rebuilt from runtime GameState', {
      reason,
      playerHP: this.gameState.playerHP,
      enemyHP: this.gameState.enemyHP,
      playerHandSize: this.gameState.player?.hand?.length ?? 0,
      enemyHandSize: this.gameState.enemy?.hand?.length ?? 0,
      turnsCompleted: this.gameState.turnsCompleted,
      firstActor: this.gameState.firstActor,
    });
    this.logTutorialLifecycleDiagnostic('rebuildBattleView end', { reason });
  }

  shutdown() {
    this.cleanupSceneObjects();
    this.stopBattleAmbience({ fadeMs: 0 });
    this.scale.off('enterfullscreen', this.onFullscreenChanged, this);
    this.scale.off('leavefullscreen', this.onFullscreenChanged, this);
    this.scale.off('resize', this.onViewportChanged, this);
    globalThis.document?.removeEventListener?.('fullscreenchange', this.boundTutorialFullscreenDocumentHandler);
    globalThis.document?.removeEventListener?.('webkitfullscreenchange', this.boundTutorialFullscreenDocumentHandler);
    globalThis.window?.removeEventListener?.('resize', this.boundTutorialViewportDocumentHandler);
    this.boundTutorialFullscreenDocumentHandler = null;
    this.boundTutorialViewportDocumentHandler = null;
    this.input.off('pointerup', this.onScenePointerUp, this);
    this.input.off('pointerupoutside', this.onScenePointerUpOutside, this);
    this.events.off(Phaser.Scenes.Events.PAUSE, this.onScenePause, this);
    this.events.off(Phaser.Scenes.Events.SLEEP, this.onSceneSleep, this);
    this.events.off(Phaser.Scenes.Events.RESUME, this.onSceneResume, this);
    this.events.off(Phaser.Scenes.Events.WAKE, this.onSceneWake, this);
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
    this.cancelPassHoldToSurrender();
    this.disarmPlayerSurrender();
  }

  drawHeroPanels() {
    const { width, topHero, playerHero, contentWidth } = this.layout;
    const panelWidth = contentWidth * HERO_PANEL_WIDTH_RATIO;

    const enemyPanel = this.add.rectangle(width * 0.5, topHero.centerY, panelWidth, topHero.h, BASE_SCREEN_FILL, HERO_PANEL_FILL_ALPHA).setStrokeStyle(2, BASE_SCREEN_FRAME_LIGHT, HERO_PANEL_STROKE_ALPHA);
    const playerPanel = this.add.rectangle(width * 0.5, playerHero.centerY, panelWidth, playerHero.h, BASE_SCREEN_FILL, HERO_PANEL_FILL_ALPHA).setStrokeStyle(2, BASE_SCREEN_FRAME_LIGHT, HERO_PANEL_STROKE_ALPHA);
    this.enemyHeroPanel = enemyPanel;
    this.playerHeroPanel = playerPanel;
    this.createBaseBroadcastFrame('enemy', enemyPanel, panelWidth, topHero.h);
    this.createBaseBroadcastFrame('player', playerPanel, panelWidth, playerHero.h);
    playerPanel
      .setInteractive({ useHandCursor: true })
      .disableInteractive();
    playerPanel.on('pointerdown', (pointer, localX, localY, event) => {
      this.onPlayerBasePointerDown(event);
    });
    playerPanel.on('pointerup', (pointer, localX, localY, event) => {
      this.onPlayerBasePointerUp(event);
    });
    playerPanel.on('pointerout', (pointer, event) => {
      this.onPlayerBasePointerCancel(event);
    });
    playerPanel.on('pointercancel', (pointer, event) => {
      this.onPlayerBasePointerCancel(event);
    });

    this.enemyInitiativeIcon = null;
    this.playerInitiativeIcon = null;

    this.enemyHeroTitleText = null;
    this.playerHeroTitleText = null;
    this.enemyActionSlotBadge = null;
    this.playerActionSlotBadge = null;

    this.enemyHpText = this.add.text(enemyPanel.x, enemyPanel.y, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(24, Math.floor(topHero.h * 0.62))}px`,
      color: BASE_TERMINAL_TEXT_COLOR,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(BASE_TERMINAL_TEXT_DEPTH).setStroke(BASE_TERMINAL_TEXT_STROKE, BASE_TERMINAL_TEXT_STROKE_WIDTH).setShadow(0, 0, BASE_TERMINAL_TEXT_ENEMY_GLOW, BASE_TERMINAL_TEXT_ENEMY_GLOW_BLUR, true, true).setY(enemyPanel.y + BASE_TERMINAL_TEXT_OPTICAL_Y_OFFSET_PX);

    this.playerHpText = this.add.text(playerPanel.x, playerPanel.y, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(23, Math.floor(playerHero.h * 0.6))}px`,
      color: BASE_TERMINAL_TEXT_COLOR,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(BASE_TERMINAL_TEXT_DEPTH).setStroke(BASE_TERMINAL_TEXT_STROKE, BASE_TERMINAL_TEXT_STROKE_WIDTH).setShadow(0, 0, BASE_TERMINAL_TEXT_PLAYER_GLOW, BASE_TERMINAL_TEXT_PLAYER_GLOW_BLUR, true, true).setY(playerPanel.y + BASE_TERMINAL_TEXT_OPTICAL_Y_OFFSET_PX);

    this.playerBaseActionLabelText = this.add.text(playerPanel.x, playerPanel.y, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(22, Math.floor(playerHero.h * 0.58))}px`,
      color: BASE_TERMINAL_TEXT_COLOR,
      fontStyle: 'bold',
      align: 'center',
      fixedWidth: Math.floor(panelWidth * 0.86),
    }).setOrigin(0.5).setDepth(BASE_TERMINAL_TEXT_DEPTH).setStroke(BASE_TERMINAL_TEXT_STROKE, BASE_TERMINAL_TEXT_STROKE_WIDTH).setShadow(0, 0, BASE_TERMINAL_TEXT_PLAYER_GLOW, BASE_TERMINAL_TEXT_PLAYER_GLOW_BLUR, true, true).setY(playerPanel.y + BASE_TERMINAL_TEXT_OPTICAL_Y_OFFSET_PX).setVisible(false).setAlpha(0);

    this.enemyHpText.setAlpha(0).setVisible(false);
    this.playerHpText.setAlpha(0).setVisible(false);
    this.updateActionSlotBadge();
  }

  updateActionSlotBadge() {
    [this.playerActionSlotBadge, this.enemyActionSlotBadge].forEach((badge) => {
      badge?.backing?.setVisible(false);
      badge?.text?.setVisible(false);
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

  drawDeckCounter() {
    this.destroyDeckCounterView();
    if (!this.gameState?.player || !this.layout) return;

    const { x, y, width, height } = this.getPlayerBaseUtilityControlMetrics('deck');
    const deckCount = this.gameState.player.deck.length;
    const deckLabel = translateActive('ui.battle.deckCounter', 'DECK {count}', { count: deckCount });
    const deck = this.createPlayerBaseUtilityControl(
      x,
      y,
      width,
      height,
      deckLabel,
      () => {
        if (!(this.isTutorialInputAllowed?.({ type: 'click_deck', target: 'deck_counter' }) ?? true)) return;
        this.openDeckInfoPanel();
      },
      { fontScale: 0.33 },
    );

    this.deckCounterView = { backing: deck.backing, text: deck.text, halo: deck.halo, focusBounds: { x, y, width, height } };
    this.updateTutorialFocus?.();
  }

  refreshDeckCounter() {
    if (!this.deckCounterView?.text || !this.gameState?.player) return;
    this.deckCounterView.text.setText(translateActive('ui.battle.deckCounter', 'DECK {count}', { count: this.gameState.player.deck.length }));
    if (this.deckInfoPanel) this.refreshDeckInfoPanelContent();
  }

  destroyDeckCounterView() {
    if (!this.deckCounterView) return;
    [this.deckCounterView.halo, this.deckCounterView.backing, this.deckCounterView.text].forEach((item) => {
      item?.removeAllListeners?.();
      item?.destroy?.();
    });
    this.deckCounterView = null;
  }

  initializeBattleInfoPanelState() {
    const cards = [...(this.gameState?.player?.deck ?? []), ...(this.gameState?.player?.hand ?? [])];
    this.playerInitialDeckTypeCounts = {
      ally: cards.filter((card) => card?.type === 'unit').length,
      effect: cards.filter((card) => card?.type !== 'unit').length,
    };
    this.battleHistory = [];
    this.pendingBattleHistoryEntries = [];
  }

  getDeckSummaryCounters() {
    const player = this.gameState?.player ?? {};
    const deck = player.deck ?? [];
    const initial = this.playerInitialDeckTypeCounts ?? {
      ally: [...deck, ...(player.hand ?? []), ...(player.discard ?? [])].filter((card) => card?.type === 'unit').length,
      effect: [...deck, ...(player.hand ?? []), ...(player.discard ?? [])].filter((card) => card?.type !== 'unit').length,
    };
    const allyHidden = deck.filter((card) => card?.type === 'unit').length;
    const effectHidden = deck.filter((card) => card?.type !== 'unit').length;
    return {
      ally: { revealed: Math.max(0, initial.ally - allyHidden), hidden: allyHidden },
      effect: { revealed: Math.max(0, initial.effect - effectHidden), hidden: effectHidden },
      grave: {
        units: (player.fallen ?? []).filter((entry) => entry?.card?.type === 'unit').length,
        effects: (player.discard ?? []).filter((card) => card?.type !== 'unit').length,
      },
    };
  }

  createCardRef(card, side) {
    return {
      name: getCardDisplayName(card, getActiveLocale()) ?? card?.name ?? translateActive('ui.common.unknownCard', 'Unknown Card'),
      side,
    };
  }

  getBoardUnitLabelFromSnapshot(snapshot, index) {
    const unit = snapshot?.board?.[index] ?? this.gameState?.board?.[index];
    return unit ? this.createCardRef(unit, unit.owner) : null;
  }

  queueBattleHistoryAction(side, action) {
    if (!this.gameState || !action || action.type === 'pass') return;
    this.pendingBattleHistoryEntries ??= [];
    this.pendingBattleHistoryEntries.push({
      actingSide: side,
      action,
    });
  }

  buildResolutionFromCombatEvents(combatEvents, snapshot) {
    const lines = [];
    const mutualKeys = new Set();
    (combatEvents ?? []).forEach((event) => {
      const attacker = this.getBoardUnitLabelFromSnapshot(snapshot, event.attackerIndex);
      if (!attacker || !event.damage || event.damage <= 0) return;
      if (event.targetType === 'hero') {
        lines.push({ type: 'base_damage', source: attacker, targetSide: event.targetSide, amount: event.damage });
        return;
      }
      const target = this.getBoardUnitLabelFromSnapshot(snapshot, event.targetIndex);
      if (!target) return;
      if (event.lethal) {
        const reverse = (combatEvents ?? []).find((other) => other !== event && other.lethal && other.attackerIndex === event.targetIndex && other.targetIndex === event.attackerIndex);
        if (reverse) {
          const key = [event.attackerIndex, event.targetIndex].sort().join(':');
          if (!mutualKeys.has(key)) {
            mutualKeys.add(key);
            lines.push({ type: 'mutual_kill', unitA: attacker, unitB: target });
          }
          return;
        }
        lines.push({ type: 'kill', attacker, target });
        return;
      }
      lines.push({ type: 'unit_damage', source: attacker, target, amount: event.damage });
    });
    return lines;
  }

  commitBattleHistoryTurn(combatEvents, snapshot) {
    const actions = [...(this.pendingBattleHistoryEntries ?? [])];
    if (actions.length === 0) return;
    const resolution = this.buildResolutionFromCombatEvents(combatEvents, snapshot);
    const turnEntry = {
      turnNumber: (this.gameState?.turnsCompleted ?? 0) + 1,
      actions,
      resolution,
    };
    this.battleHistory = [...(this.battleHistory ?? []), turnEntry];
    this.pendingBattleHistoryEntries = [];
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
    this.updatePlayerBaseActionState();
    this.resetCardHighlights({ showPreview: false });
    this.updateTutorialFocus?.();

    const { width, height } = this.scale.gameSize;
    const panelWidth = Math.min(width * 0.84, 470);
    const panelHeight = Math.min(height * 0.64, 530);
    const centerX = width * 0.5;
    const centerY = height * 0.49;
    const panelTop = centerY - panelHeight / 2;
    const panelLeft = centerX - panelWidth / 2;
    const padding = Math.max(16, Math.floor(panelWidth * 0.045));
    const headerHeight = Math.max(136, Math.floor(panelHeight * 0.255));
    const footerHeight = 68;
    const contentX = panelLeft + padding;
    const contentY = panelTop + headerHeight;
    const contentWidth = panelWidth - padding * 2;
    const contentHeight = panelHeight - headerHeight - footerHeight;

    this.hideDeckInfoBackgroundHelpers();

    const overlay = this.add.rectangle(centerX, height * 0.5, width, height, 0x000000, 0.64)
      .setInteractive()
      .setDepth(760);
    const panel = this.addDeckInfoGlassPanel(centerX, centerY, panelWidth, panelHeight, 761, {
      showDecorativeRails: false,
    })
      .setInteractive(new Phaser.Geom.Rectangle(panelLeft, panelTop, panelWidth, panelHeight), Phaser.Geom.Rectangle.Contains);
    panel.on('pointerdown', (_pointer, _localX, _localY, event) => event?.stopPropagation?.());
    panel.on('pointerup', (_pointer, _localX, _localY, event) => event?.stopPropagation?.());
    const title = this.add.text(centerX, panelTop + 28, translateActive('ui.battle.deckInfo.title', 'Deck Info'), {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(21, Math.floor(panelHeight * 0.052))}px`,
      color: '#e0f2fe',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(762);
    const summaryView = this.createDeckSummaryHeader(centerX, panelTop + 68, panelWidth, panelHeight);
    const historyLabel = this.add.text(centerX, panelTop + 106, translateActive('ui.battle.deckInfo.historyLabel', 'Battle History'), {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(12, Math.floor(panelHeight * 0.029))}px`,
      color: '#bae6fd',
      alpha: 0.86,
      align: 'center',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(762);
    const historyDivider = this.add.rectangle(centerX, panelTop + 126, contentWidth, 1, 0x7dd3fc, 0.22)
      .setDepth(762);

    const contentContainer = this.add.container(0, 0).setDepth(762);
    const contentHeightActual = this.renderDeckInfoHistoryContent(contentContainer, contentX, contentY, contentWidth, panelHeight);

    const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(contentX, contentY, contentWidth, contentHeight);
    const scrollMask = maskShape.createGeometryMask();
    contentContainer.setMask(scrollMask);

    const scrollArea = this.add.zone(contentX, contentY, contentWidth, contentHeight)
      .setOrigin(0, 0)
      .setDepth(763)
      .setInteractive();

    const contentBottom = contentY + contentHeightActual;
    const maxScrollY = Math.max(0, contentBottom - contentY - contentHeight + 8);
    const scrollHint = this.add.text(panelLeft + padding, panelTop + panelHeight - 58, maxScrollY > 0 ? translateActive('ui.common.swipeScroll', 'Swipe or mouse wheel to scroll') : translateActive('ui.common.noScroll', 'No scrolling needed'), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#94a3b8',
    }).setDepth(762).setVisible(false);

    this.trackBattleModalScrollHint(scrollHint);

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
      historyLabel,
      historyDivider,
      summaryView,
      contentContainer,

      contentX,
      contentY,
      contentWidth,
      contentHeight,
      panelHeight,
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

    this.scrollDeckInfoHistoryToLatest();
    this.bindDeckInfoScrollHandlers(contentHeight);
    this.handleTutorialEvent?.('deck_opened');
    this.updatePlayerBaseActionState();
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

  scrollDeckInfoHistoryToLatest() {
    if (!this.deckInfoPanel) return;
    this.setDeckInfoScrollY(this.deckInfoPanel.maxScrollY ?? 0);
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
    if (!(this.isTutorialInputAllowed?.({ type: 'close_deck', target: 'deck_info_panel' }) ?? true)) return;
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
      panelState.historyLabel,
      panelState.historyDivider,
      panelState.summaryView,
      panelState.contentContainer,
      panelState.maskShape,
      panelState.scrollArea,
      panelState.scrollHint,
      panelState.backButton?.backing,
      panelState.backButton?.text,
    ].forEach((item) => {
      item?.removeAllListeners?.();
      item?.destroy?.();
    });
    this.unregisterBattleModalScrollHint(panelState.scrollHint);
    this.deckInfoPanel = null;
    this.restoreDeckInfoBackgroundHelpers();
    this.handleTutorialEvent?.('deck_closed');
    this.updatePlayerBaseActionState();
    this.updateTutorialBanner?.();
  }

  addDeckInfoGlassPanel(x, y, width, height, depth = 761, { showDecorativeRails = true } = {}) {
    const radius = 20;
    const left = x - width / 2;
    const top = y - height / 2;
    const panel = this.add.graphics().setDepth(depth);

    panel.fillStyle(0x38bdf8, 0.07);
    panel.fillRoundedRect(left - 5, top - 4, width + 10, height + 10, radius + 5);
    panel.lineStyle(2, 0x7dd3fc, 0.11);
    panel.strokeRoundedRect(left - 4, top - 3, width + 8, height + 8, radius + 4);

    panel.fillGradientStyle(0x1e3a5f, 0x172554, 0x020617, 0x020617, 0.27, 0.18, 0.94, 0.97);
    panel.fillRoundedRect(left, top, width, height, radius);
    panel.fillStyle(0x020617, 0.58);
    panel.fillRoundedRect(left + 1, top + 1, width - 2, height - 2, radius - 1);

    panel.lineStyle(1.35, 0x93c5fd, 0.66);
    panel.strokeRoundedRect(left + 0.5, top + 0.5, width - 1, height - 1, radius - 1);
    panel.lineStyle(1, 0xf8fafc, 0.09);
    panel.strokeRoundedRect(left + 3, top + 3, width - 6, height - 6, radius - 4);

    if (showDecorativeRails) {
      panel.fillGradientStyle(0x38bdf8, 0x38bdf8, 0x38bdf8, 0x38bdf8, 0.34, 0.16, 0.02, 0.02);
      panel.fillRoundedRect(left + 18, top + 14, width - 36, 2, 1);
      panel.fillGradientStyle(0x38bdf8, 0x38bdf8, 0x38bdf8, 0x38bdf8, 0.08, 0.02, 0.24, 0.06);
      panel.fillRoundedRect(left + 20, top + height - 19, width - 40, 1, 1);
    }

    return panel;
  }

  trackBattleModalScrollHint(scrollHint) {
    if (!scrollHint) return;
    this.battleModalScrollHintObjects = (this.battleModalScrollHintObjects ?? [])
      .filter((item) => item?.active && item !== scrollHint);
    this.battleModalScrollHintObjects.push(scrollHint);
  }

  unregisterBattleModalScrollHint(scrollHint) {
    this.battleModalScrollHintObjects = (this.battleModalScrollHintObjects ?? [])
      .filter((item) => item?.active && item !== scrollHint);
  }

  getBattleOverlayBackgroundHelpers() {
    this.battleModalScrollHintObjects = (this.battleModalScrollHintObjects ?? [])
      .filter((item) => item?.active);

    return [
      this.activeSelectionBanner,
      this.targetingInstructionText,
      this.enemyActionBanner,
      this.playerActionBanner,
      this.invalidActionBanner,
      this.turnStartBanner,
      this.deckInfoPanel?.scrollHint,
      ...(this.battleModalScrollHintObjects ?? []),
      ...(this.boardCells ?? [])
        .filter((cell) => cell?.row === 1)
        .flatMap((cell) => [cell.background, cell.label, cell.blockedMarker]),
    ]
      .filter((item, index, items) => item?.active && items.indexOf(item) === index);
  }

  hideBattleOverlayBackgroundHelpers(storageKey) {
    this.restoreBattleOverlayBackgroundHelpers(storageKey);
    this[storageKey] = this.getBattleOverlayBackgroundHelpers()
      .map((item) => ({ item, visible: item.visible }));

    this[storageKey].forEach(({ item }) => item.setVisible?.(false));
  }

  restoreBattleOverlayBackgroundHelpers(storageKey) {
    if (!this[storageKey]?.length) {
      this[storageKey] = [];
      return;
    }

    this[storageKey].forEach(({ item, visible }) => {
      if (item?.active) item.setVisible?.(visible);
    });
    this[storageKey] = [];
  }

  hideRulesPanelBackgroundHelpers() {
    this.hideBattleOverlayBackgroundHelpers('rulesPanelHiddenHelpers');
  }

  restoreRulesPanelBackgroundHelpers() {
    this.restoreBattleOverlayBackgroundHelpers('rulesPanelHiddenHelpers');
  }

  hideDeckInfoBackgroundHelpers() {
    this.hideBattleOverlayBackgroundHelpers('deckInfoHiddenHelpers');
  }

  restoreDeckInfoBackgroundHelpers() {
    this.restoreBattleOverlayBackgroundHelpers('deckInfoHiddenHelpers');
  }

  refreshDeckInfoPanelContent() {
    if (!this.deckInfoPanel) return;
    this.updateDeckSummaryHeaderView(this.deckInfoPanel.summaryView);
    this.deckInfoPanel.contentContainer?.removeAll(true);
    const contentHeight = this.deckInfoPanel.contentHeight ?? 0;
    const contentY = this.deckInfoPanel.contentY ?? 0;
    const contentHeightActual = this.renderDeckInfoHistoryContent(
      this.deckInfoPanel.contentContainer,
      this.deckInfoPanel.contentX,
      contentY,
      this.deckInfoPanel.contentWidth,
      this.deckInfoPanel.panelHeight,
    );
    const bottom = contentY + contentHeightActual;
    this.deckInfoPanel.maxScrollY = Math.max(0, bottom - contentY - contentHeight + 8);
    this.setDeckInfoScrollY(this.deckInfoPanel.scrollY ?? 0);
  }

  getDeckSummaryHeaderText() {
    const counts = this.getDeckSummaryCounters();
    return `♟ ${counts.ally.revealed}/${counts.ally.hidden}    ✦ ${counts.effect.revealed}/${counts.effect.hidden}    ☠ ${counts.grave.units}/${counts.grave.effects}`;
  }

  createDeckSummaryHeader(centerX, y, panelWidth, panelHeight) {
    const fontSize = Math.max(15, Math.floor(panelHeight * 0.034));
    const style = {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${fontSize}px`,
      align: 'center',
      fontStyle: 'bold',
    };
    const allyColor = '#f8e7b2';
    const effectColor = '#5eead4';
    const iconColor = '#facc15';
    const graveColor = '#cbd5e1';
    const gap = Math.min(112, Math.max(82, panelWidth * 0.245));
    const makeText = (x, text, color) => this.add.text(x, y, text, { ...style, color }).setOrigin(0.5);
    const view = this.add.container(0, 0, [
      makeText(centerX - gap, '♟', allyColor),
      makeText(centerX - gap + 24, '0/0', allyColor),
      makeText(centerX, '✦', iconColor),
      makeText(centerX + 25, '0/0', effectColor),
      makeText(centerX + gap - 22, '☠', graveColor),
      makeText(centerX + gap + 2, '0', allyColor),
      makeText(centerX + gap + 11, '/', '#f8fafc'),
      makeText(centerX + gap + 22, '0', effectColor),
    ]).setDepth(762);
    view.summaryTexts = {
      ally: view.list[1],
      effect: view.list[3],
      graveUnits: view.list[5],
      graveEffects: view.list[7],
    };
    this.updateDeckSummaryHeaderView(view);
    return view;
  }

  updateDeckSummaryHeaderView(view) {
    if (!view?.summaryTexts) return;
    const counts = this.getDeckSummaryCounters();
    view.summaryTexts.ally.setText(`${counts.ally.revealed}/${counts.ally.hidden}`);
    view.summaryTexts.effect.setText(`${counts.effect.revealed}/${counts.effect.hidden}`);
    view.summaryTexts.graveUnits.setText(`${counts.grave.units}`);
    view.summaryTexts.graveEffects.setText(`${counts.grave.effects}`);
  }

  getDeckInfoPanelText() {
    const entries = this.battleHistory ?? [];
    if (entries.length === 0) return translateActive('ui.battle.deckInfo.noHistory', 'No battle history yet.');
    return entries.map((entry) => this.formatBattleHistoryEntry(entry)).join('\n\n');
  }

  renderDeckInfoHistoryContent(container, x, y, width, panelHeight) {
    if (!container) return 0;
    const fontSize = Math.max(13, Math.floor(panelHeight * 0.029));
    const lineHeight = fontSize + Math.max(6, Math.floor(panelHeight * 0.01));
    const paragraphGap = Math.max(8, Math.floor(panelHeight * 0.016));
    const tokenStyle = {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${fontSize}px`,
    };
    const colors = {
      neutral: '#f8fafc',
      muted: '#cbd5e1',
      player: '#7dd3fc',
      enemy: '#fca5a5',
    };
    const addTokenLine = (tokens, offsetY, { bold = false } = {}) => {
      let cursorX = x;
      let cursorY = y + offsetY;
      let maxBottom = cursorY + lineHeight;
      tokens.filter((token) => token?.text).forEach((token) => {
        const text = this.add.text(cursorX, cursorY, token.text, {
          ...tokenStyle,
          color: colors[token.color] ?? colors.neutral,
          fontStyle: token.bold || bold ? 'bold' : '',
        }).setOrigin(0, 0);
        if (cursorX > x && cursorX + text.width > x + width) {
          cursorX = x;
          cursorY += lineHeight;
          text.setPosition(cursorX, cursorY);
        }
        container.add(text);
        cursorX += text.width;
        maxBottom = Math.max(maxBottom, cursorY + lineHeight);
      });
      return maxBottom - y;
    };

    const entries = this.battleHistory ?? [];
    if (entries.length === 0) {
      return addTokenLine([{ text: translateActive('ui.battle.deckInfo.noHistory', 'No battle history yet.'), color: 'muted' }], 0);
    }

    let offsetY = 0;
    entries.forEach((entry) => {
      offsetY = addTokenLine(this.formatBattleHistoryHeaderTokens(entry), offsetY, { bold: true });
      this.getBattleHistoryActions(entry).forEach((actionEntry) => {
        offsetY = addTokenLine(this.formatBattleHistoryActionTokens(actionEntry), offsetY);
      });
      if (entry.resolution?.length) {
        offsetY = addTokenLine([{ text: translateActive('ui.battle.deckInfo.resolution', 'Resolution:'), color: 'neutral' }], offsetY);
        entry.resolution.forEach((item) => {
          offsetY = addTokenLine([
            { text: '- ', color: 'muted' },
            ...this.formatBattleHistoryResolutionTokens(item),
          ], offsetY);
        });
      }
      offsetY += paragraphGap;
    });
    return Math.max(0, offsetY - paragraphGap);
  }

  getBattleHistorySideLabel(side) {
    return side === 'player'
      ? translateActive('ui.battle.deckInfo.player', 'Player')
      : translateActive('ui.battle.deckInfo.enemy', 'Enemy');
  }

  getBattleHistoryBaseSideLabel(side) {
    return side === 'player'
      ? translateActive('ui.battle.deckInfo.playerBaseSide', this.getBattleHistorySideLabel(side))
      : translateActive('ui.battle.deckInfo.enemyBaseSide', this.getBattleHistorySideLabel(side));
  }

  cardHistoryToken(card) {
    return {
      text: card?.name ?? translateActive('ui.common.unknownCard', 'Unknown Card'),
      color: card?.side === 'enemy' ? 'enemy' : card?.side === 'player' ? 'player' : 'neutral',
      bold: true,
    };
  }

  formatBattleHistoryHeaderTokens(entry) {
    return [
      {
        text: translateActive('ui.battle.deckInfo.turnHeader', 'Turn {turn}', { turn: entry.turnNumber }),
        color: 'neutral',
        bold: true,
      },
    ];
  }

  getBattleHistoryActions(entry) {
    if (Array.isArray(entry?.actions)) return entry.actions;
    if (entry?.action) return [{ actingSide: entry.actingSide, action: entry.action }];
    return [];
  }

  formatBattleHistoryActionTokens(entry) {
    const sideColor = entry.actingSide === 'enemy' ? 'enemy' : 'player';
    const who = { text: this.getBattleHistorySideLabel(entry.actingSide), color: sideColor, bold: true };
    const action = entry.action ?? {};
    if (action.type === 'play_unit') return [who, { text: translateActive('ui.battle.deckInfo.history.playsUnit', ' plays unit '), color: 'neutral' }, this.cardHistoryToken(action.card)];
    if (action.type === 'play_effect') return [who, { text: translateActive('ui.battle.deckInfo.history.playsEffect', ' plays effect '), color: 'neutral' }, this.cardHistoryToken(action.card)];
    if (action.type === 'replace_from_hand') return [who, { text: translateActive('ui.battle.deckInfo.history.replaces', ' replaces '), color: 'neutral' }, this.cardHistoryToken(action.oldCard), { text: translateActive('ui.battle.deckInfo.history.withFromHand', ' with '), color: 'neutral' }, this.cardHistoryToken(action.card), { text: translateActive('ui.battle.deckInfo.history.fromHand', ' from hand'), color: 'neutral' }];
    if (action.type === 'swap_positions') return [who, { text: translateActive('ui.battle.deckInfo.history.swaps', ' swaps '), color: 'neutral' }, this.cardHistoryToken(action.cardA), { text: translateActive('ui.battle.deckInfo.history.and', ' and '), color: 'neutral' }, this.cardHistoryToken(action.cardB)];
    return [who, { text: translateActive('ui.battle.deckInfo.history.acts', ' acts'), color: 'neutral' }];
  }

  formatBattleHistoryResolutionTokens(item) {
    if (item.type === 'kill') return [this.cardHistoryToken(item.attacker), { text: translateActive('ui.battle.deckInfo.history.killed', ' killed '), color: 'neutral' }, this.cardHistoryToken(item.target)];
    if (item.type === 'mutual_kill') return [this.cardHistoryToken(item.unitA), { text: translateActive('ui.battle.deckInfo.history.and', ' and '), color: 'neutral' }, this.cardHistoryToken(item.unitB), { text: translateActive('ui.battle.deckInfo.history.killedEachOther', ' killed each other'), color: 'neutral' }];
    if (item.type === 'unit_damage') return [this.cardHistoryToken(item.source), { text: translateActive('ui.battle.deckInfo.history.dealtDamageTo', ' dealt {amount} damage to ', { amount: item.amount }), color: 'neutral' }, this.cardHistoryToken(item.target)];
    if (item.type === 'base_damage') {
      return [
        this.cardHistoryToken(item.source),
        { text: translateActive('ui.battle.deckInfo.history.dealtDamageToBasePrefix', ' dealt {amount} damage to ', { amount: item.amount }), color: 'neutral' },
        { text: this.getBattleHistoryBaseSideLabel(item.targetSide), color: item.targetSide === 'enemy' ? 'enemy' : 'player', bold: true },
        { text: translateActive('ui.battle.deckInfo.history.baseSuffix', ' base'), color: 'neutral' },
      ];
    }
    return [];
  }

  formatBattleHistoryEntry(entry) {
    const lines = [
      this.formatBattleHistoryHeaderTokens(entry).map((token) => token.text).join(''),
      ...this.getBattleHistoryActions(entry).map((actionEntry) => this.formatBattleHistoryAction(actionEntry)),
    ].filter(Boolean);
    if (entry.resolution?.length) {
      lines.push(translateActive('ui.battle.deckInfo.resolution', 'Resolution:'));
      entry.resolution.forEach((item) => lines.push(`- ${this.formatBattleHistoryResolution(item)}`));
    }
    return lines.join('\n');
  }

  formatBattleHistoryAction(entry) {
    return this.formatBattleHistoryActionTokens(entry).map((token) => token.text).join('');
  }

  formatBattleHistoryResolution(item) {
    return this.formatBattleHistoryResolutionTokens(item).map((token) => token.text).join('');
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

  isOpeningMulliganInputLocked() {
    return Boolean(this.openingMulliganPending && this.openingMulliganRevealPending);
  }

  getOpeningMulliganRevealCardCount() {
    return Math.min(
      STARTING_HAND_SIZE,
      this.layout?.hand?.cardsVisible ?? 0,
      this.gameState?.player?.hand?.length ?? 0,
    );
  }

  cleanupOpeningMulliganRevealControllers({ advanceGeneration = true } = {}) {
    if (advanceGeneration) this.openingMulliganRevealGeneration += 1;
    (this.openingMulliganRevealControllers ?? []).forEach((controller) => {
      controller?.cleanup?.();
    });
    this.openingMulliganRevealControllers = [];
  }

  clearOpeningMulliganRevealBackCards() {
    const retainedControllers = [];
    (this.openingMulliganRevealControllers ?? []).forEach((controller) => {
      if (controller?.type === 'opening-reveal-back') {
        controller.cleanup?.();
        return;
      }
      retainedControllers.push(controller);
    });
    this.openingMulliganRevealControllers = retainedControllers;
  }

  applyOpeningMulliganRevealPresentation() {
    if (!this.openingMulliganRevealPending || !this.layout?.hand || !hasLoadedImageAsset(this, HAND_BACK_CARD_ASSET)) return;

    const revealCount = this.getOpeningMulliganRevealCardCount();
    const visibleCount = Math.min(this.openingMulliganRevealVisibleCount, revealCount);
    this.cardViews.forEach((cardView) => {
      if (!Number.isInteger(cardView.slotIndex) || cardView.slotIndex >= revealCount) return;
      const isRevealed = cardView.slotIndex < visibleCount;
      cardView.root?.setAlpha?.(isRevealed ? 1 : 0);
      cardView.root?.setScale?.(1);
      if (isRevealed) {
        cardView.background?.setInteractive?.({ useHandCursor: true });
      } else {
        cardView.background?.disableInteractive?.();
      }
    });

    const { hand } = this.layout;
    this.cardViews
      .filter((cardView) => Number.isInteger(cardView.slotIndex)
        && cardView.slotIndex >= visibleCount
        && cardView.slotIndex < revealCount)
      .forEach((cardView) => {
        const backCard = this.createHandBackCardView({
          x: cardView.baseX,
          y: cardView.baseY,
          width: hand.cardWidth,
          height: hand.cardHeight,
          depth: (cardView.baseDepth ?? cardView.root?.depth ?? 20) + 1,
        });
        backCard.slotIndex = cardView.slotIndex;
        this.openingMulliganRevealControllers.push({
          type: 'opening-reveal-back',
          backCard,
          cleanup: () => backCard.destroy?.(),
        });
      });
  }

  startOpeningMulliganReveal() {
    if (!this.openingMulliganRevealPending || !this.time || !this.tweens) return;
    const revealCount = this.getOpeningMulliganRevealCardCount();
    if (revealCount <= 0 || shouldSkipHandCardFlipReveal()) {
      this.completeOpeningMulliganReveal({ skipAnimation: true });
      return;
    }

    this.cleanupOpeningMulliganRevealControllers({ advanceGeneration: false });
    this.openingMulliganRevealVisibleCount = Math.min(this.openingMulliganRevealVisibleCount, revealCount);
    this.applyOpeningMulliganRevealPresentation();
    this.updateTutorialFocus?.();
    const generation = this.openingMulliganRevealGeneration;

    for (let index = this.openingMulliganRevealVisibleCount; index < revealCount; index += 1) {
      const delay = index * OPENING_MULLIGAN_REVEAL_STAGGER_MS;
      const timer = this.time.delayedCall(delay, () => {
        if (generation !== this.openingMulliganRevealGeneration || !this.openingMulliganRevealPending) return;
        this.revealOpeningMulliganCardSlot(index, {
          generation,
          isLast: index === revealCount - 1,
        });
      });
      this.openingMulliganRevealControllers.push({
        type: 'opening-reveal-timer',
        timer,
        cleanup: () => timer.remove?.(false),
      });
    }
  }

  revealOpeningMulliganCardSlot(index, { generation, isLast = false } = {}) {
    const cardView = this.cardViews.find((view) => view.slotIndex === index);
    if (!cardView) {
      if (isLast) this.completeOpeningMulliganReveal({ skipAnimation: true });
      return;
    }

    const backController = this.openingMulliganRevealControllers.find((controller) => (
      controller?.type === 'opening-reveal-back' && controller.backCard?.slotIndex === index
    ));
    const backCard = backController?.backCard;
    const playRevealSfx = () => {
      this.playBattleSfx?.(AUDIO_KEYS.CARD_DRAW, { cooldownMs: 0 });
    };
    const finishSlot = () => {
      if (generation !== this.openingMulliganRevealGeneration || !this.openingMulliganRevealPending) return;
      backCard?.destroy?.();
      cardView.root?.setAlpha?.(1);
      cardView.root?.setScale?.(1);
      cardView.background?.disableInteractive?.();
      this.openingMulliganRevealVisibleCount = Math.max(this.openingMulliganRevealVisibleCount, index + 1);
      if (!isLast) return;

      if (!this.time || OPENING_MULLIGAN_REVEAL_POST_HOLD_MS <= 0) {
        this.completeOpeningMulliganReveal({ skipAnimation: true, redraw: false });
        return;
      }

      const holdTimer = this.time.delayedCall(OPENING_MULLIGAN_REVEAL_POST_HOLD_MS, () => {
        if (generation !== this.openingMulliganRevealGeneration || !this.openingMulliganRevealPending) return;
        this.completeOpeningMulliganReveal({ skipAnimation: true, redraw: false });
      });
      this.openingMulliganRevealControllers.push({
        type: 'opening-reveal-post-hold',
        timer: holdTimer,
        cleanup: () => holdTimer.remove?.(false),
      });
    };

    if (!backCard || typeof this.tweens?.add !== 'function') {
      playRevealSfx();
      finishSlot();
      return;
    }

    const halfDuration = Math.max(1, Math.round(OPENING_MULLIGAN_REVEAL_CARD_MS / 2));
    cardView.root?.setAlpha?.(1);
    cardView.root.scaleX = 0;
    cardView.background?.disableInteractive?.();
    const shrinkTween = this.tweens.add({
      targets: backCard,
      scaleX: 0,
      duration: halfDuration,
      ease: 'Quad.easeIn',
      onComplete: () => {
        if (generation !== this.openingMulliganRevealGeneration || !this.openingMulliganRevealPending) return;
        playRevealSfx();
        backCard.destroy?.();
        const expandTween = this.tweens.add({
          targets: cardView.root,
          scaleX: 1,
          duration: halfDuration,
          ease: 'Quad.easeOut',
          onComplete: finishSlot,
        });
        this.openingMulliganRevealControllers.push({
          type: 'opening-reveal-tween',
          tween: expandTween,
          cleanup: () => expandTween.stop?.(),
        });
      },
    });
    this.openingMulliganRevealControllers.push({
      type: 'opening-reveal-tween',
      tween: shrinkTween,
      cleanup: () => shrinkTween.stop?.(),
    });
  }

  completeOpeningMulliganReveal({ skipAnimation = false, redraw = true } = {}) {
    if (!this.openingMulliganRevealPending && !this.openingMulliganRevealControllers?.length) return;
    this.cleanupOpeningMulliganRevealControllers();
    this.openingMulliganRevealVisibleCount = this.getOpeningMulliganRevealCardCount();
    this.openingMulliganRevealPending = false;
    this.previewedMulliganCardId = null;
    this.hoverInspectCardId = null;
    this.boardInspectIndex = null;
    this.cancelHandCardLongPress();
    this.cancelBoardCellLongPress();

    this.cardViews.forEach((cardView) => {
      cardView.root?.setAlpha?.(1);
      cardView.root?.setScale?.(1);
      cardView.background?.setInteractive?.({ useHandCursor: true });
    });

    if (redraw && !skipAnimation) this.redrawHand();
    this.updatePlayerBaseActionState();
    this.resetCardHighlights({ showPreview: false });
    this.updateTutorialFocus?.();
  }

  clearHandPanelViews() {
    (this.handPanelViews ?? []).forEach((view) => {
      view?.destroy?.();
    });
    this.handPanelViews = [];
  }

  clearHandCardViews() {
    (this.cardViews ?? []).forEach((view) => {
      this.disableCardViewInteractions?.(view);
      view?.destroy?.();
      view?.root?.destroy?.();
    });
    this.cardViews = [];
  }

  drawHand() {
    this.clearOpeningMulliganRevealBackCards();
    this.clearHandPanelViews();
    this.clearHandCardViews();
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

      this.addBlockedEffectCardOverlay(cardView, hand.cardWidth, hand.cardHeight);

      cardView.background.setInteractive({ useHandCursor: true });
      cardView.background.on('pointerdown', () => {
        this.onCardPointerDown(cardId);
      });
      cardView.background.on('pointerup', (pointer) => {
        this.onCardPointerUp(cardId, pointer);
      });
      cardView.background.on('pointerover', () => {
        if (!this.isCardViewPointerMutationAllowed(cardView)) return;
        this.onHandCardPointerOver(cardId);
      });
      cardView.background.on('pointerout', () => {
        if (!this.isCardViewPointerMutationAllowed(cardView)) return;
        this.onHandCardPointerOut(cardId);
      });

      cardView.slotIndex = index;
      this.cardViews.push(cardView);
    });

    this.applyOpeningMulliganRevealPresentation();
    this.updateTutorialFocus?.();

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



  addBlockedEffectCardOverlay(cardView, width, height) {
    if (!cardView?.root || !Number.isFinite(width) || !Number.isFinite(height)) return;
    const overlay = this.add.rectangle(0, 0, width * 0.92, height * 0.92, 0x2b0f16, 0)
      .setStrokeStyle(0, 0x000000, 0)
      .setVisible(false);
    const iconRadius = Math.max(8, Math.min(width, height) * 0.13);
    const iconX = width * 0.31;
    const iconY = -height * 0.36;
    const iconBubble = this.add.circle(iconX, iconY, iconRadius, 0x450a0a, 0.86)
      .setStrokeStyle(Math.max(1, Math.floor(iconRadius * 0.16)), 0xfca5a5, 0.86)
      .setVisible(false);
    const icon = this.add.text(iconX, iconY, '⊘', {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(14, Math.floor(iconRadius * 1.42))}px`,
      color: '#fee2e2',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setVisible(false);
    cardView.root.add([overlay, iconBubble, icon]);
    cardView.blockedOverlay = overlay;
    cardView.blockedIconBubble = iconBubble;
    cardView.blockedIcon = icon;
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

  isCardViewPointerMutationAllowed(cardView = null) {
    if (typeof this.scene?.isActive === 'function' && !this.scene.isActive()) return false;
    if (this.battleResultModalPending || this.battleResultModalShown || this.isFlowResolving) return false;
    if (cardView && cardView.isActive === false) return false;
    if (cardView?.root && (cardView.root.active === false || cardView.root.scene == null)) return false;
    if (cardView?.background && (cardView.background.active === false || cardView.background.scene == null)) return false;
    return true;
  }

  safeDisableInteractiveObject(item) {
    if (!item || item.scene == null || typeof item.disableInteractive !== 'function') return;
    item.disableInteractive();
  }

  removeCardPointerListeners(item) {
    item?.removeAllListeners?.('pointerover');
    item?.removeAllListeners?.('pointerout');
    item?.removeAllListeners?.('pointerdown');
    item?.removeAllListeners?.('pointerup');
    item?.removeAllListeners?.('pointermove');
    item?.removeAllListeners?.('pointercancel');
  }

  disableCardViewInteractions(cardView) {
    if (!cardView) return;
    const wasActive = cardView.isActive !== false;
    cardView.isActive = false;
    if (wasActive) cardView.deactivate?.();
    const cardItems = [
      ...(cardView.items ?? []),
      cardView.root,
      cardView.background,
      cardView.glow,
      cardView.label,
      cardView.nameText,
      cardView.bodyText,
      cardView.cardNumberOverlay,
      cardView.selectionOutline,
      cardView.statBar,
      cardView.statBadges,
      cardView.art,
      cardView.blockedOverlay,
      cardView.blockedIconBubble,
      cardView.blockedIcon,
    ].filter(Boolean);
    const safeDisable = this.safeDisableInteractiveObject ?? ((item) => {
      if (!item || item.scene == null || typeof item.disableInteractive !== 'function') return;
      item.disableInteractive();
    });
    const removeListeners = this.removeCardPointerListeners ?? ((item) => {
      item?.removeAllListeners?.('pointerover');
      item?.removeAllListeners?.('pointerout');
      item?.removeAllListeners?.('pointerdown');
      item?.removeAllListeners?.('pointerup');
      item?.removeAllListeners?.('pointermove');
      item?.removeAllListeners?.('pointercancel');
    });
    [...new Set(cardItems)].forEach((item) => {
      safeDisable(item);
      removeListeners(item);
    });
  }

  disableCardHoverInteractions() {
    this.cardViews?.forEach((cardView) => this.disableCardViewInteractions(cardView));
    this.disableCardViewInteractions(this.inspectPreview);
    this.disableCardViewInteractions(this.selectedHandCardZoom);
    this.handBackCards?.forEach((backCard) => {
      this.safeDisableInteractiveObject(backCard);
      this.removeCardPointerListeners(backCard);
    });
  }

  deactivateInspectPreviewView(inspect) {
    if (!inspect) return;
    inspect.deactivate?.();
    inspect.isActive = false;
    this.disableCardViewInteractions(inspect);

    const inspectItems = [
      ...(inspect.items ?? []),
      inspect.root,
      inspect.overlay,
      inspect.glow,
      inspect.background,
      inspect.label,
      inspect.nameText,
      inspect.bodyText,
      inspect.cardNumberOverlay,
      inspect.selectionOutline,
      inspect.statBar,
      inspect.statBadges,
      inspect.art,
      ...(inspect.previewItems ?? []),
    ].filter(Boolean);
    const uniqueInspectItems = [...new Set(inspectItems)];

    const safeDisable = this.safeDisableInteractiveObject ?? ((item) => {
      if (!item || item.scene == null || typeof item.disableInteractive !== 'function') return;
      item.disableInteractive();
    });
    const removeListeners = this.removeCardPointerListeners ?? ((item) => {
      item?.removeAllListeners?.('pointerover');
      item?.removeAllListeners?.('pointerout');
      item?.removeAllListeners?.('pointerdown');
      item?.removeAllListeners?.('pointerup');
      item?.removeAllListeners?.('pointermove');
      item?.removeAllListeners?.('pointercancel');
    });
    uniqueInspectItems.forEach((item) => {
      safeDisable(item);
      removeListeners(item);
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
    const hasActiveHandCardInteraction = this.hasActiveHandCardInteraction?.() ?? Boolean(
      this.selectedCardId
      || this.pressedHandCardId
      || this.pressedHandCardWasSelected
      || this.handCardLongPressEvent
      || this.longPressTriggeredCardId
    );
    if (hasActiveHandCardInteraction || this.targetingState || this.effectCastState) return false;
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
      if ((this.isOpeningMulliganInputLocked?.() ?? false)) {
        this.cancelHandCardPressState();
        return;
      }
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

    if (!this.isUnitCard(card) && !canPlayEffectCard(this.gameState, 'player', card).ok) {
      this.pendingSwapIndex = null;
      this.clearSwapPrompt();
      this.selectedCardId = null;
      this.targetingState = null;
      this.resetCardHighlights({ showPreview: false });
      this.updatePlayerBaseActionState();
      this.showInvalidActionFeedback?.({ reason: 'You cannot play effect cards.', cardId, card, scope: 'global' });
      this.startHandCardLongPress(cardId);
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
      this.updatePlayerBaseActionState();
    }
    this.startHandCardLongPress(cardId);
    this.updateTutorialFocus?.();
  }

  startHandCardLongPress(cardId) {
    this.cancelHandCardLongPress();
    this.handCardLongPressEvent = this.time.delayedCall(CARD_INSPECT_LONG_PRESS_MS, () => {
      this.handCardLongPressEvent = null;
      if (this.pressedHandCardId !== cardId) return;
      if (this.utilityMenuPanel || this.navigationInProgress || this.pointerInputGuardActive) return;
      if ((this.isOpeningMulliganInputLocked?.() ?? false)) return;
      if (this.battleResultModalShown || this.isFlowResolving || this.playerActionUsed) return;

      const card = this.gameState?.player?.hand?.find((item) => item.id === cardId);
      if (!card) return;

      this.longPressTriggeredCardId = cardId;

      if (this.openingMulliganPending) {
        if (!(this.isTutorialInputAllowed?.({ type: 'inspect_card', cardId }) ?? true)) return;
        this.previewedMulliganCardId = cardId;
        this.hoverInspectCardId = null;
        this.boardInspectIndex = null;
        this.resetCardHighlights({ showPreview: true });
        this.handleTutorialEvent?.('card_inspected', { cardId });
        this.updateTutorialFocus?.();
        return;
      }

      // Pointer-down keeps quick taps responsive, but a completed long press is inspect-only.
      // Preserve an active targeting session so dismissing Inspect returns to the same target
      // selection. Non-targeting cards still discard their provisional gameplay selection.
      const isSelectedCard = this.selectedCardId === cardId;
      const preserveTargetingSession = isSelectedCard && Boolean(this.targetingState);
      const preserveSelectedUnit = isSelectedCard && this.isUnitCard(card);
      if (!preserveTargetingSession && !preserveSelectedUnit) {
        this.selectedCardId = null;
        this.targetingState = null;
        this.effectCastState = null;
        this.destroyTargetingInstruction();
      }
      this.hoverInspectCardId = cardId;
      this.boardInspectIndex = null;
      this.resetCardHighlights({ showPreview: true });
      this.updatePlayerBaseActionState();
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
      if ((this.isOpeningMulliganInputLocked?.() ?? false)) {
        this.cancelHandCardPressState();
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
    if (this.playerSurrenderArmed) {
      this.disarmPlayerSurrender();
      return;
    }
    if (this.battleResultModalShown || this.isFlowResolving || this.isEffectCastResolving) return;

    if (this.openingMulliganPending) {
      // Mulligan owns hand exchange and inspect only; board gameplay stays isolated until confirmation.
      this.clearOpeningMulliganPreviewFromOutsideTap(pointer, currentlyOver);
      return;
    }

    const hasActiveBoardTapMode = this.pendingSwapIndex !== null;
    const isIdleBoardTapMode = !this.selectedCardId && !this.targetingState && !this.effectCastState && !hasActiveBoardTapMode;

    if (this.boardLongPressSuppressNextScenePointerUpIndex != null) {
      this.boardLongPressSuppressNextScenePointerUpIndex = null;
      return;
    }

    if (this.clearBoardInspectFromOutsideTap?.(pointer, currentlyOver)) {
      this.cancelBoardCellPressState?.();
      this.pressedHandCardId = null;
      this.pressedHandCardWasSelected = false;
      return;
    }

    if (this.boardInspectIndex !== null && this.isPointerInsideSelectedHandCardZoom?.(pointer, currentlyOver)) {
      return;
    }

    if (this.isPointerUpReservedForUi(pointer, currentlyOver)) return;

    const boardCell = this.getBoardCellFromPointerUp(pointer, currentlyOver);

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
    const hasPreview = Boolean(this.previewedMulliganCardId || this.selectedHandCardZoom);
    if (!hasPreview && this.selectedMulliganCardIds.length === 0) return;
    if (this.isPointerInsideMulliganHandOrPreview(pointer, currentlyOver)) return;
    if (this.isPointerInsidePlayerBaseAction(pointer, currentlyOver)) return;

    this.previewedMulliganCardId = null;
    this.hoverInspectCardId = null;
    this.boardInspectIndex = null;
    this.pressedHandCardId = null;
    if (!hasPreview) this.selectedMulliganCardIds = [];
    this.updatePlayerBaseActionState();
    this.resetCardHighlights({ showPreview: false });
  }

  isPointerInsidePlayerBaseAction(pointer, currentlyOver = []) {
    if (!this.playerHeroPanel) return false;

    const overObjects = this.normalizePointerUpObjects(currentlyOver);
    return overObjects.includes(this.playerHeroPanel) || this.isPointerInsideGameObject(pointer, this.playerHeroPanel);
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

    if (!selectedCard || !this.isUnitCard(selectedCard)) {
      return true;
    }

    return true;
  }

  clearHandCardSelection() {
    const hadState = Boolean(this.selectedCardId || this.targetingState || this.effectCastState || this.hoverInspectCardId || this.boardInspectIndex !== null);
    this.selectedCardId = null;
    this.targetingState = null;
    this.effectCastState = null;
    this.pendingSwapIndex = null;
    this.hoverInspectCardId = null;
    this.boardInspectIndex = null;
    this.pressedHandCardWasSelected = false;
    this.destroyTargetingInstruction();
    this.clearSwapPrompt();
    if (hadState) {
      this.resetCardHighlights();
      this.updatePlayerBaseActionState();
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

      const hasActiveHandCardInteraction = this.hasActiveHandCardInteraction?.() ?? Boolean(
        this.selectedCardId
        || this.pressedHandCardId
        || this.pressedHandCardWasSelected
        || this.handCardLongPressEvent
        || this.longPressTriggeredCardId
      );
      if (hasActiveHandCardInteraction) {
        return;
      }

      if (this.pendingSwapIndex !== null) {
        this.hoverInspectCardId = null;
        this.clearBoardInspect({ animate: true });

        if (!unit || unit.owner !== 'player') {
          this.pendingSwapIndex = null;
          this.showInvalidActionFeedback?.({ reason: 'Swap is not valid', boardIndex, scope: 'slot' });
          this.clearSwapPrompt();
          this.resetCardHighlights({ showPreview: false });
          this.updatePlayerBaseActionState();
          return;
        }

        const fromIndex = this.pendingSwapIndex;
        if (!(this.isTutorialInputAllowed?.({ type: 'swap_adjacent_units', fromIndex, toIndex: boardIndex, board: this.gameState?.board }) ?? true)) {
          this.showInvalidActionFeedback?.({ reason: 'Tutorial step requires a different action.', boardIndex, scope: 'slot' });
          return;
        }
        const beforeStats = this.captureBoardStats();
        const swapA = this.getBoardUnitLabelFromSnapshot?.(beforeStats, fromIndex);
        const swapB = this.getBoardUnitLabelFromSnapshot?.(beforeStats, boardIndex);
        const result = performSwap(this.gameState, 'player', fromIndex, boardIndex);
        this.pendingSwapIndex = null;

        if (!result.ok) {
          this.clearSwapPrompt();
          this.showInvalidActionFeedback?.({ reason: result.reason, boardIndex, scope: 'slot' });
          this.resetCardHighlights({ showPreview: false });
          this.updatePlayerBaseActionState();
          return;
        }
        this.queueBattleHistoryAction?.('player', { type: 'swap_positions', cardA: swapA, cardB: swapB });
        this.clearSwapPrompt();
        this.pendingTutorialEvent = { eventName: 'adjacent_swap_completed', payload: { fromIndex, toIndex: boardIndex } };
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
        this.updatePlayerBaseActionState();
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
        this.updatePlayerBaseActionState();
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
        this.updatePlayerBaseActionState();
        this.showTargetingInstruction();
        return;
      }
      if (!result.ok) {
        this.showInvalidActionFeedback?.({ reason: result.reason, cardId: effectCardId, boardIndex, scope: this.getInvalidActionScope(result.reason) });
        return;
      }
      if (this.effectCastState?.source !== 'unit-on-play' && result.type === 'targeted-effect') {
        this.trackPlayerCardPlayedStat?.('effectsPlayed');
      }
      this.queueBattleHistoryAction?.('player', {
        type: this.effectCastState?.source === 'unit-on-play' ? 'play_unit' : 'play_effect',
        card: this.createCardRef?.(result.card ?? selectedCard, 'player') ?? { name: (result.card ?? selectedCard)?.name ?? 'Card', side: 'player' },
      });
      const movementFeedback = this.buildMovementFeedbackForAction({
        effectId: selectedCard.effectId,
        owner: 'player',
        targetIndexes,
        beforeSnapshot: beforeStats,
        result,
      });
      if (this.effectCastState?.source === 'unit-on-play') {
        this.playBattleSfx?.(AUDIO_KEYS.CARD_DEPLOY);
      } else {
        this.playBattleSfx?.(AUDIO_KEYS.SPELL_GENERIC);
      }
      this.pendingTutorialEvent = {
        eventName: this.effectCastState?.source === 'unit-on-play' ? 'unit_played' : 'effect_played',
        payload: { cardId: (result.card ?? selectedCard)?.id, slotIndex: this.effectCastState?.boardIndex },
      };
      this.completePlayerAction(
        beforeStats,
        [...(result.feedback ?? []), ...this.buildActionFeedback(beforeStats, result)],
        movementFeedback,
        this.getImmediateCombatFeedback?.(result) ?? null,
      );
      return;
    }

    if (!this.isUnitCard(selectedCard)) {
      if (!(this.isTutorialInputAllowed?.({ type: 'play_effect', cardId: selectedCard.id, slotIndex: boardIndex }) ?? true)) {
        this.showInvalidActionFeedback?.({ reason: 'Tutorial step requires a different action.', cardId: selectedCard.id, boardIndex, scope: 'global' });
        return;
      }
      this.startPlayerEffectCast(selectedCard);
      return;
    }

    const existingUnit = this.gameState?.board?.[boardIndex];
    const proposedType = existingUnit?.owner === 'player' ? 'redeploy_unit' : 'play_card_to_slot';
    if (!(this.isTutorialInputAllowed?.({ type: proposedType, cardId: selectedCard.id, slotIndex: boardIndex }) ?? true)) {
      this.showInvalidActionFeedback?.({ reason: 'Tutorial step requires a different action.', cardId: selectedCard.id, boardIndex, scope: 'slot' });
      return;
    }
    const beforeStats = this.captureBoardStats();
    const result = playOrRedeployUnit(this.gameState, 'player', this.selectedCardId, boardIndex);
    if (!result.ok) {
      const invalidCardId = this.selectedCardId;
      this.pendingSwapIndex = null;
      this.clearHandCardSelection();
      this.showInvalidActionFeedback?.({ reason: result.reason, cardId: invalidCardId, boardIndex, scope: this.getInvalidActionScope(result.reason) });
      return;
    }

    if (result.type === 'play') {
      this.trackPlayerCardPlayedStat?.('unitsPlayed');
    }

    // Controller play/redeploy explicitly enters manual unit-on-play targeting. Hacker lane behavior
    // remains automatic because it does not use the swap_two_enemy_units effect.
    if ((result.type === 'play' || result.type === 'redeploy') && result.card?.effectId === 'swap_two_enemy_units') {
      this.startPlayerUnitOnPlayTargeting(result.card, boardIndex, beforeStats);
      return;
    }

    this.playBattleSfx?.(AUDIO_KEYS.CARD_DEPLOY);
    this.queueBattleHistoryAction?.('player', {
      type: result.type === 'redeploy' ? 'replace_from_hand' : 'play_unit',
      card: this.createCardRef?.(result.card, 'player') ?? { name: result.card?.name ?? 'Card', side: 'player' },
      oldCard: this.getBoardUnitLabelFromSnapshot?.(beforeStats, boardIndex),
    });
    this.pendingTutorialEvent = {
      eventName: result.type === 'redeploy' ? 'redeploy_completed' : 'unit_played',
      payload: { cardId: result.card?.id ?? this.selectedCardId, slotIndex: boardIndex },
    };
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
    this.queueBattleHistoryAction?.('player', {
      type: 'play_unit',
      card: this.createCardRef?.(card, 'player') ?? { name: card?.name ?? 'Card', side: 'player' },
      oldCard: this.getBoardUnitLabelFromSnapshot?.(beforeStats, boardIndex),
    });

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
    this.updatePlayerBaseActionState();
    this.resetCardHighlights({ showPreview: false });

    this.isEffectCastResolving = true;
    this.showPlayerEffectConfirmation(card, { allowUnit: true });
    this.playBattleSfx?.(AUDIO_KEYS.CARD_DEPLOY);

    await Promise.all([
      this.playEffectCastSweep({ side: 'player', playSound: false }),
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
    const castState = {
      cardId: card.id,
      targetingState,
      castId: (this.effectCastSerial = (this.effectCastSerial ?? 0) + 1),
      completed: false,
    };
    this.effectCastState = castState;
    this.selectedCardId = null;
    this.pendingSwapIndex = null;
    this.clearSwapPrompt();
    this.targetingState = null;
    this.hoverInspectCardId = null;
    this.boardInspectIndex = null;
    this.pressedHandCardId = null;
    this.destroySelectedHandCardZoom({ animate: true });
    this.destroyTargetingInstruction();
    this.updatePlayerBaseActionState();
    this.resetCardHighlights({ showPreview: false });

    this.isEffectCastResolving = true;
    this.showPlayerEffectConfirmation(card);

    try {
      await Promise.all([
        Promise.resolve(this.playEffectCastSweep({ side: 'player' })),
        this.delay(PLAYER_EFFECT_CAST_BEAT_MS),
      ]);
    } catch (error) {
      console.warn('Player effect cast presentation failed; continuing effect resolution.', {
        cardId: card.id,
        error,
      });
    }

    if (castState.completed || this.effectCastState !== castState || !this.gameState || this.gameState.winner || this.battleResultModalShown || this.playerActionUsed) {
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
    castState.completed = true;
    if (!result.ok) {
      this.effectCastState = null;
      this.resetCardHighlights({ showPreview: false });
      this.updatePlayerBaseActionState();
      this.showInvalidActionFeedback?.({ reason: result.reason, cardId: card.id, card, scope: 'global' });
      return;
    }
    if (result.type === 'effect') {
      this.trackPlayerCardPlayedStat?.('effectsPlayed');
    }
    const movementFeedback = this.buildMovementFeedbackForAction({
      effectId: card.effectId,
      owner: 'player',
      beforeSnapshot: beforeStats,
      result,
    });
    this.queueBattleHistoryAction?.('player', { type: 'play_effect', card: this.createCardRef?.(result.card ?? card, 'player') ?? { name: (result.card ?? card)?.name ?? 'Card', side: 'player' } });
    this.pendingTutorialEvent = { eventName: 'effect_played', payload: { cardId: (result.card ?? card)?.id } };
    this.effectCastState = null;
    this.completePlayerAction(beforeStats, this.buildActionFeedback(beforeStats, result), movementFeedback);
  }


  beginPlayerTargetingSession(targetingState) {
    if (!targetingState) return;
    if ((targetingState.requiredTargets ?? 0) <= 0) {
      const card = this.gameState?.player?.hand?.find((item) => item.id === targetingState.cardId) ?? null;
      this.selectedCardId = null;
      this.targetingState = null;
      this.effectCastState = null;
      this.resetCardHighlights({ showPreview: false });
      this.updatePlayerBaseActionState();
      this.showInvalidActionFeedback?.({ reason: 'No valid targets', cardId: targetingState.cardId, card, scope: 'global' });
      return;
    }
    this.targetingState = { ...targetingState, targetIndexes: [...(targetingState.targetIndexes ?? [])] };
    this.resetCardHighlights({ showPreview: false });
    this.updatePlayerBaseActionState();
    this.showTargetingInstruction();
  }


  async playEffectCastSweep({ side = 'player', playSound = true } = {}) {
    try {
      if (playSound) this.playBattleSfx?.(AUDIO_KEYS.SPELL_GENERIC);
      const style = EFFECT_CAST_SWEEP_STYLE[side] ?? EFFECT_CAST_SWEEP_STYLE.player;
      const middleCells = (this.boardCells ?? [])
        .filter((cell) => cell.row === 1 && cell.background?.active)
        .sort((a, b) => Math.abs(a.index - 4) - Math.abs(b.index - 4) || a.index - b.index);

      if (middleCells.length === 0) return;

      const animations = middleCells.map((cell, order) => new Promise((resolve) => {
        let resolved = false;
        const finish = () => {
          if (resolved) return;
          resolved = true;
          resolve();
        };
        const background = cell.background;
        if (!background?.active) {
          finish();
          return;
        }
        const previousStyle = {
          lineWidth: background.lineWidth ?? 2,
          strokeColor: background.strokeColor ?? 0x94a3b8,
          strokeAlpha: background.strokeAlpha ?? BOARD_GUIDE_SLOT_STROKE_ALPHA,
          fillColor: background.fillColor ?? 0x111827,
          fillAlpha: background.fillAlpha ?? BOARD_GUIDE_SLOT_FILL_ALPHA,
          scaleX: background.scaleX,
          scaleY: background.scaleY,
        };

        const restore = () => {
          if (background.active) {
            background.setScale(previousStyle.scaleX, previousStyle.scaleY);
            background.setFillStyle(previousStyle.fillColor, previousStyle.fillAlpha);
            background.setStrokeStyle(previousStyle.lineWidth, previousStyle.strokeColor, previousStyle.strokeAlpha);
          }
        };

        this.time?.delayedCall?.(order * PLAYER_EFFECT_CAST_SWEEP_STEP_MS, () => {
          try {
            if (!background.active) {
              finish();
              return;
            }
            background.setStrokeStyle(4, style.strokeColor, style.strokeAlpha);
            background.setFillStyle(style.fillColor, style.fillAlpha);
            const tween = this.tweens?.add?.({
              targets: background,
              scaleX: previousStyle.scaleX * 1.045,
              scaleY: previousStyle.scaleY * 1.045,
              duration: 120,
              yoyo: true,
              repeat: 1,
              ease: 'Sine.easeInOut',
              onComplete: () => {
                restore();
                finish();
              },
              onStop: () => {
                restore();
                finish();
              },
            });
            if (!tween) {
              restore();
              finish();
            }
          } catch {
            finish();
          }
        }) ?? finish();
      }));

      await Promise.all(animations);
    } catch (error) {
      console.warn('Effect cast sweep failed; skipping visual sweep.', { side, error });
    }
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
    this.updatePlayerBaseActionState();
    this.resetCardHighlights({ showPreview: false });
    if (canceledUnitOnPlay && !this.playerActionUsed && !this.isFlowResolving) {
      this.completePlayerAction(beforeStats);
    }
  }

  applyEnemyOpeningMulligan() {
    if (isTutorialBattleContext(this.battleContext) && getTutorialBattleData().openingConfig.disableEnemyOpeningMulligan) return;
    if (!this.gameState?.enemy) return;
    const selectedIds = selectOpeningMulliganCardIds(this.gameState.enemy);
    performOpeningMulligan(this.gameState, 'enemy', selectedIds);
  }

  getOpeningMulliganActionLabel() {
    const count = this.selectedMulliganCardIds.length;
    return count > 0
      ? translateActive('ui.battle.mulligan', 'MULLIGAN {count}', { count })
      : translateActive('ui.battle.keepHand', 'KEEP HAND');
  }

  getPlayerBaseMode() {
    if ((this.isOpeningMulliganInputLocked?.() ?? false)) return null;
    if (this.openingMulliganPending) return 'mulligan';
    if (this.isBasePassAvailable()) return 'pass';
    return null;
  }

  getPlayerBaseActionLabel() {
    const playerBaseMode = this.getPlayerBaseMode();
    if (playerBaseMode === 'mulligan') {
      return this.getOpeningMulliganActionLabel();
    }
    if (playerBaseMode === 'pass') {
      if (this.playerSurrenderArmed && this.canPlayerBaseHoldToSurrender()) {
        return translateActive('ui.battle.confirmSurrender', 'SURRENDER');
      }
      return translateActive('ui.common.pass', 'PASS');
    }

    return null;
  }

  isPlayerBaseActionStateActive() {
    return Boolean(this.getPlayerBaseActionLabel());
  }

  getCurrentActionableSide() {
    if (!this.gameState || this.gameState.winner || this.battleResultModalShown) return null;
    if (this.isFlowResolving || this.isEffectCastResolving) return null;
    if (this.openingMulliganPending || this.deckInfoPanel || this.utilityMenuPanel) return null;

    const firstActor = this.gameState.firstActor;
    if (firstActor === 'player' && !this.playerActionUsed) return 'player';
    if (firstActor === 'enemy' && !this.enemyActionUsed) return 'enemy';
    if (this.enemyActionUsed && !this.playerActionUsed) return 'player';
    if (this.playerActionUsed && !this.enemyActionUsed) return 'enemy';
    return null;
  }

  updatePlayerBaseActionState() {
    const playerBaseMode = this.getPlayerBaseMode();
    const actionLabel = this.getPlayerBaseActionLabel();
    const actionStateActive = Boolean(actionLabel);
    const passActionActive = playerBaseMode === 'pass';
    const mulliganActionActive = playerBaseMode === 'mulligan';
    this.passHoldToSurrenderEnabled = passActionActive && this.canHoldPassToSurrender();
    if (!this.passHoldToSurrenderEnabled) {
      this.cancelPassHoldToSurrender();
      this.disarmPlayerSurrender();
    }
    const playerHero = this.layout?.playerHero;
    const centerY = this.playerHeroPanel?.y ?? playerHero?.centerY ?? this.playerHpText?.y ?? 0;
    const passHpOffset = playerHero ? Math.max(6, Math.floor(playerHero.h * 0.13)) : 7;
    const passLabelOffset = 0;
    const passFontSize = playerHero ? Math.max(22, Math.floor(playerHero.h * 0.48)) : 22;
    const passHpFontSize = playerHero ? Math.max(16, Math.floor(playerHero.h * 0.34)) : 16;
    const normalHpFontSize = playerHero ? Math.max(23, Math.floor(playerHero.h * 0.6)) : 23;
    const mulliganFontSize = playerHero ? Math.max(22, Math.floor(playerHero.h * 0.58)) : 22;

    if (this.playerBaseActionLabelText) {
      this.playerBaseActionLabelText
        .setText(actionLabel ?? '')
        .setFontSize(passActionActive ? passFontSize : mulliganFontSize)
        .setY((passActionActive ? centerY + passLabelOffset : centerY) + BASE_TERMINAL_TEXT_OPTICAL_Y_OFFSET_PX)
        .setVisible(actionStateActive)
        .setVisible(actionStateActive && this.isTerminalTextVisibleForSide('player'));
    }

    if (this.playerHeroTitleText) {
      this.playerHeroTitleText.setVisible(!actionStateActive);
    }

    if (this.playerHpText) {
      this.playerHpText
        .setFontSize(passActionActive ? passHpFontSize : normalHpFontSize)
        .setY((passActionActive ? centerY - passHpOffset : centerY) + BASE_TERMINAL_TEXT_OPTICAL_Y_OFFSET_PX)
        .setVisible(!mulliganActionActive && !passActionActive)
        .setVisible(!mulliganActionActive && !passActionActive && this.isTerminalTextVisibleForSide('player'));
    }

    this.updateActionableSideVisualState();

    if (!this.playerHeroPanel) return;
    if (actionStateActive) {
      if (!this.playerHeroPanel.input) {
        this.playerHeroPanel.setInteractive({ useHandCursor: true });
      } else {
        this.playerHeroPanel.input.enabled = true;
      }
      return;
    }

    if (this.playerHeroPanel.input) {
      this.playerHeroPanel.disableInteractive();
    }
  }

  onPlayerBasePointerUp(event) {
    if ((this.isOpeningMulliganInputLocked?.() ?? false)) {
      event?.stopPropagation?.();
      this.cancelPassHoldToSurrender();
      this.disarmPlayerSurrender();
      return;
    }

    if (this.openingMulliganPending) {
      event?.stopPropagation?.();
      this.cancelPassHoldToSurrender();
      this.disarmPlayerSurrender();
      this.confirmOpeningMulligan();
      return;
    }

    const basePassAvailable = this.isBasePassAvailable();
    const releasedArmingHold = this.passHoldToSurrenderProgress;
    if (releasedArmingHold) {
      this.cancelPassHoldToSurrender();
    }
    if (!basePassAvailable) return;
    event?.stopPropagation?.();
    if (this.playerSurrenderArmed) {
      if (!releasedArmingHold) {
        this.resolvePlayerHoldToSurrender();
      }
      return;
    }
    this.playBattleSfx?.(AUDIO_KEYS.UI_CLICK);
    this.resolvePassTurn();
  }

  toggleOpeningMulliganCard(cardId, { showPreview = true } = {}) {
    if ((this.isOpeningMulliganInputLocked?.() ?? false)) return;
    if (!(this.isTutorialInputAllowed?.({ type: 'select_mulligan_card', cardId }) ?? true)) return;
    const card = this.gameState.player.hand.find((item) => item.id === cardId);
    if (!card) return;

    const mulliganSelectionBefore = this.selectedMulliganCardIds.join('|');
    if (this.selectedMulliganCardIds.includes(cardId)) {
      this.selectedMulliganCardIds = this.selectedMulliganCardIds.filter((id) => id !== cardId);
    } else if (this.selectedMulliganCardIds.length < MAX_OPENING_MULLIGAN_CARDS) {
      this.selectedMulliganCardIds.push(cardId);
    }

    if (this.selectedMulliganCardIds.join('|') !== mulliganSelectionBefore) {
      this.playBattleSfx?.(AUDIO_KEYS.UI_CLICK);
      this.handleTutorialEvent?.('mulligan_card_selected', { cardId });
    }

    this.updatePlayerBaseActionState();
    this.resetCardHighlights({ showPreview });
    this.updateTutorialFocus?.();
  }

  async confirmOpeningMulligan() {
    this.cancelPassHoldToSurrender();
    if ((this.isOpeningMulliganInputLocked?.() ?? false)) return;
    if (this.isFlowResolving) return;

    if (!(this.isTutorialInputAllowed?.({ type: 'confirm_mulligan', target: 'player_base_button' }) ?? true)) return;
    const selectedIds = [...this.selectedMulliganCardIds];
    if (this.isTutorialBattle?.() && selectedIds.length === 0) return;
    const result = isTutorialBattleContext(this.battleContext)
      ? performTutorialOpeningMulligan(this.gameState, selectedIds, getTutorialBattleData().openingConfig)
      : performOpeningMulligan(this.gameState, 'player', selectedIds);
    if (!result.ok) return;

    this.playBattleSfx?.(AUDIO_KEYS.UI_CLICK);
    this.handleTutorialEvent?.('mulligan_confirmed', { selectedIds });
    this.resetOpeningMulliganInputState();
    this.openingMulliganPending = false;
    this.openingMulliganRevealPending = false;
    this.openingMulliganRevealVisibleCount = 0;
    this.cleanupOpeningMulliganRevealControllers();
    this.redrawHand();
    this.updatePlayerBaseActionState();
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

  hasBasePassBlocker() {
    return Boolean(
      this.selectedCardId
      || this.targetingState
      || this.boardInspectIndex !== null
      || this.hoverInspectCardId
      || this.selectedHandCardZoom
      || this.pendingSwapIndex !== null
      || this.deckInfoPanel
      || this.utilityMenuPanel
      || this.battleResultModalShown
      || this.isFlowResolving
      || this.isEffectCastResolving
      || this.effectCastState
      || this.openingMulliganPending,
    );
  }

  isBasePassAvailable() {
    return this.getCurrentActionableSide() === 'player'
      && !this.playerActionUsed
      && !this.hasBasePassBlocker()
      && canPass(this.gameState);
  }

  canHoldPassToSurrender() {
    if (!this.gameState || this.gameState.winner) return false;
    if (this.gameState.firstActor !== 'player') return false;
    return isVerySafeConcedableState(this.gameState, 'player');
  }

  canPlayerBaseHoldToSurrender() {
    return this.isBasePassAvailable() && this.canHoldPassToSurrender();
  }

  onPlayerBasePointerDown(event) {
    if (!this.canPlayerBaseHoldToSurrender()) return;
    event?.stopPropagation?.();
    this.passHoldToSurrenderEnabled = true;
    this.cancelPassHoldToSurrender();
    this.passHoldToSurrenderProgress = true;
    this.playerHeroPanel?.setAlpha?.(0.82);
    this.passHoldToSurrenderEvent = this.time.delayedCall(PASS_HOLD_TO_SURRENDER_MS, () => {
      this.passHoldToSurrenderEvent = null;
      this.passHoldToSurrenderEnabled = this.canPlayerBaseHoldToSurrender();
      if (!this.passHoldToSurrenderProgress || !this.passHoldToSurrenderEnabled || this.gameState?.winner || this.battleResultModalShown) return;
      this.armPlayerSurrender();
    });
  }

  onPlayerBasePointerCancel(event) {
    event?.stopPropagation?.();
    this.cancelPassHoldToSurrender();
    this.disarmPlayerSurrender();
  }

  armPlayerSurrender() {
    if (!this.canPlayerBaseHoldToSurrender()) return;
    this.playerSurrenderArmed = true;
    this.updatePlayerBaseActionState();
  }

  disarmPlayerSurrender() {
    if (!this.playerSurrenderArmed) return;
    this.playerSurrenderArmed = false;
    this.updatePlayerBaseActionState();
  }

  cancelPassHoldToSurrender() {
    if (this.passHoldToSurrenderEvent) {
      this.passHoldToSurrenderEvent.remove(false);
      this.passHoldToSurrenderEvent = null;
    }
    this.passHoldToSurrenderProgress = false;
    this.playerHeroPanel?.setAlpha?.(1);
  }

  resolvePlayerHoldToSurrender() {
    if (!this.gameState || this.gameState.winner || this.battleResultModalShown || !this.passHoldToSurrenderEnabled || !this.playerSurrenderArmed) return;
    this.gameState.winner = 'enemy';
    this.gameState.endingReason = 'player_hold_surrender';
    this.cancelPassHoldToSurrender();
    this.playerSurrenderArmed = false;
    this.completeBattleFlow(0);
  }

  resolvePassTurn() {
    this.cancelPassHoldToSurrender();
    this.disarmPlayerSurrender();
    if (this.battleResultModalShown || this.isFlowResolving || this.isEffectCastResolving || this.targetingState) return;

    if (this.gameState.winner || !canPass(this.gameState) || this.playerActionUsed) return;
    if (!(this.isTutorialInputAllowed?.({ type: 'pass', target: 'player_base_button' }) ?? true)) return;
    recordPassAction(this.gameState, 'player');
    this.pendingTutorialEvent = { eventName: 'pass_completed' };
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


  playBattleStartPresentationSfx() {
    if (!this.gameState || this.gameState.battleStartPresentationSfxPlayed) return null;
    this.gameState.battleStartPresentationSfxPlayed = true;
    return this.playBattleSfx?.(AUDIO_KEYS.BATTLE_START, { cooldownMs: 0 });
  }

  getTutorialStepText(step = this.getCurrentTutorialStep()) {
    if (!step?.text) return '';
    const locale = getActiveLocale();
    return step.text[locale] ?? step.text.en ?? Object.values(step.text)[0] ?? '';
  }

  isCurrentTutorialStepTapContinue() {
    return this.getCurrentTutorialStep()?.expected?.type === 'tap_continue';
  }

  getTutorialBannerLayout() {
    return calculateTutorialBannerLayout(this.layout);
  }

  getTutorialBannerStyle(step = this.getCurrentTutorialStep()) {
    if (step?.variant === 'flavor') {
      return {
        color: '#fef3c7',
        backgroundColor: '#1f1608',
        stroke: '#f59e0b',
      };
    }
    return {
      color: '#e0f2fe',
      backgroundColor: '#020617',
      stroke: '#38bdf8',
    };
  }

  isTutorialBannerSuppressed() {
    return Boolean(
      this.isFlowResolving
      || this.isEffectCastResolving
      || this.battleResultModalShown
      || this.battleResultModalPending
      || this.gameState?.winner
    );
  }

  updateTutorialBanner() {
    this.tutorialLifecycleDiagnostics.tutorialBannerUpdateCallCount += 1;
    this.logTutorialLifecycleDiagnostic('updateTutorialBanner called', {});
    if (!this.isTutorialBattle() || !this.layout || this.battleResultModalShown || this.battleResultModalPending) {
      this.tutorialLifecycleDiagnostics.lastTutorialBannerSkipReason = 'not_tutorial_or_missing_layout_or_result_modal';
      this.logTutorialLifecycleDiagnostic('updateTutorialBanner skipped', { skipReason: this.tutorialLifecycleDiagnostics.lastTutorialBannerSkipReason });
      this.destroyTutorialBanner();
      return null;
    }
    if (this.isTutorialBannerSuppressed()) {
      this.tutorialLifecycleDiagnostics.lastTutorialBannerSkipReason = 'suppressed';
      this.logTutorialLifecycleDiagnostic('updateTutorialBanner skipped', { skipReason: 'suppressed', suppression: this.getTutorialSuppressionReasons() });
      this.tutorialBanner?.setVisible?.(false);
      this.tutorialBannerOverlay?.setVisible?.(false);
      if (this.tutorialBannerOverlay?.input) this.tutorialBannerOverlay.input.enabled = false;
      this.updateTutorialFocus(null);
      return this.tutorialBanner;
    }
    const step = this.getCurrentTutorialStep();
    const message = this.getTutorialStepText(step);
    if (!step || !message) {
      this.tutorialLifecycleDiagnostics.lastTutorialBannerSkipReason = 'missing_step_or_message';
      this.logTutorialLifecycleDiagnostic('updateTutorialBanner skipped', { skipReason: 'missing_step_or_message', stepExists: Boolean(step) });
      this.destroyTutorialBanner();
      return null;
    }
    const layout = this.getTutorialBannerLayout();
    const canTapContinue = step.expected?.type === 'tap_continue';
    const bannerStyle = this.getTutorialBannerStyle(step);

    if (!this.tutorialBanner?.active) {
      this.tutorialBanner = this.add.text(layout.x, layout.targetY, message, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${layout.fontSize}px`,
        color: bannerStyle.color,
        backgroundColor: bannerStyle.backgroundColor,
        align: 'center',
        padding: { x: 18, y: 13 },
        wordWrap: { width: layout.maxTextWidth },
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(TUTORIAL_BANNER_DEPTH).setAlpha(0.98).setStroke(bannerStyle.stroke, 2);
      this.tutorialBanner.setScrollFactor?.(0);
    } else {
      this.tutorialBanner
        .setText(message)
        .setPosition(layout.x, layout.targetY)
        .setOrigin(0.5)
        .setVisible(true)
        .setAlpha(0.98)
        .setDepth(TUTORIAL_BANNER_DEPTH)
        .setScale(1);
      this.tutorialBanner.setScrollFactor?.(0);
      this.tutorialBanner.setStyle?.({
        fontSize: `${layout.fontSize}px`,
        color: bannerStyle.color,
        backgroundColor: bannerStyle.backgroundColor,
      });
      this.tutorialBanner.setStroke?.(bannerStyle.stroke, 2);
      this.tutorialBanner.setWordWrapWidth?.(layout.maxTextWidth);
    }

    if (!this.tutorialBannerOverlay?.active) {
      this.tutorialBannerOverlay = this.add.rectangle(layout.overlayX, layout.overlayY, layout.overlayWidth, layout.overlayHeight, 0x000000, 0.001)
        .setOrigin(0.5)
        .setDepth(TUTORIAL_BANNER_OVERLAY_DEPTH)
        .setAlpha(0.001)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', (pointer, localX, localY, event) => this.onTutorialBannerPointerDown(pointer, localX, localY, event))
        .on('pointerup', (pointer, localX, localY, event) => this.onTutorialBannerPointerUp(pointer, localX, localY, event));
      this.tutorialBannerOverlay.setScrollFactor?.(0);
    }
    this.tutorialBannerOverlay.setPosition(layout.overlayX, layout.overlayY).setSize(layout.overlayWidth, layout.overlayHeight);
    this.tutorialBannerOverlay.setOrigin?.(0.5);
    this.tutorialBannerOverlay.setDepth(TUTORIAL_BANNER_OVERLAY_DEPTH);
    this.tutorialBannerOverlay.setAlpha?.(0.001);
    this.tutorialBannerOverlay.setScrollFactor?.(0);
    this.tutorialBannerOverlay.setVisible(canTapContinue);
    if (this.tutorialBannerOverlay.input) this.tutorialBannerOverlay.input.enabled = canTapContinue;
    this.updateTutorialFocus(step);
    return this.tutorialBanner;
  }

  onTutorialBannerPointerDown(pointer, localX, localY, event) {
    if (!this.isTutorialBattle() || !this.isCurrentTutorialStepTapContinue()) return false;
    event?.stopPropagation?.();
    return true;
  }

  onTutorialBannerPointerUp(pointer, localX, localY, event) {
    if (!this.isTutorialBattle() || !this.isCurrentTutorialStepTapContinue()) return false;
    event?.stopPropagation?.();
    this.handleTutorialEvent('tap_continue');
    return true;
  }

  destroyTutorialBanner() {
    if (this.tutorialBannerOverlay) {
      this.tutorialBannerOverlay.removeAllListeners?.();
      this.tutorialBannerOverlay.destroy?.();
      this.tutorialBannerOverlay = null;
    }
    if (this.tutorialBanner) {
      this.tweens?.killTweensOf?.(this.tutorialBanner);
      this.tutorialBanner.destroy?.();
      this.tutorialBanner = null;
    }
  }


  getTutorialFocusTarget(step = this.getCurrentTutorialStep()) {
    const target = step?.highlightTarget;
    if (!target) return null;
    const normalizedTarget = typeof target === 'string' ? { type: target } : target;
    if (typeof normalizedTarget !== 'object') return null;

    const expected = step?.expected ?? {};
    if ((expected.type === 'play_card_to_slot' || expected.type === 'redeploy_unit') && expected.cardId && expected.slotIndex !== undefined) {
      return this.selectedCardId === expected.cardId
        ? { type: expected.type === 'redeploy_unit' ? 'occupied_board_slot' : 'board_slot', slotIndex: expected.slotIndex }
        : { type: 'hand_card', cardId: expected.cardId };
    }

    return normalizedTarget;
  }

  isTutorialStepBannerVisible(step = this.getCurrentTutorialStep()) {
    if (!step || !this.tutorialBanner?.active || this.tutorialBanner.visible === false) return false;
    return this.tutorialBanner.text === this.getTutorialStepText(step);
  }

  isTutorialFocusTimingSuppressed(step = this.getCurrentTutorialStep()) {
    if (!step) return true;
    if (!this.isTutorialStepBannerVisible(step)) return true;
    if (this.isFlowResolving || this.isEffectCastResolving) return true;
    if (step.expected?.type === 'wait_enemy_action' || step.expected?.type === 'wait_combat') return true;
    return false;
  }

  isTutorialFocusTargetMechanicallyPossible(target, step = this.getCurrentTutorialStep()) {
    if (!target || !step) return false;
    const expected = step.expected ?? {};
    const type = target.type;

    if (type === 'mulligan_card') {
      const cardId = target.cardId ?? getTutorialBattleData().openingConfig.requiredPlayerMulliganCardId;
      const inputType = expected.type === 'inspect_card' ? 'inspect_card' : 'select_mulligan_card';
      return Boolean(
        this.openingMulliganPending
        && !(this.isOpeningMulliganInputLocked?.() ?? false)
        && this.gameState?.player?.hand?.some((card) => card.id === cardId)
        && (this.isTutorialInputAllowed?.({ type: inputType, cardId }) ?? true)
      );
    }

    if (type === 'player_base_button' && expected.type === 'confirm_mulligan') {
      return Boolean(
        this.openingMulliganPending
        && !(this.isOpeningMulliganInputLocked?.() ?? false)
        && (this.isTutorialInputAllowed?.({ type: 'confirm_mulligan', target: 'player_base_button' }) ?? true)
      );
    }

    if (type === 'hand_card') {
      return Boolean(
        !this.openingMulliganPending
        && !this.playerActionUsed
        && this.gameState?.player?.hand?.some((card) => card.id === target.cardId)
      );
    }

    if (type === 'effect_card') {
      const card = this.gameState?.player?.hand?.find((item) => item.id === target.cardId);
      return Boolean(
        card
        && !this.openingMulliganPending
        && !this.playerActionUsed
        && canPlayEffectCard(this.gameState, 'player', card).ok
        && (this.isTutorialInputAllowed?.({ type: 'play_effect', cardId: card.id }) ?? true)
      );
    }

    if (expected.type === 'tap_continue' && type === 'board_slot') {
      return true;
    }

    if (type === 'board_slot' || type === 'occupied_board_slot') {
      const card = this.gameState?.player?.hand?.find((item) => item.id === this.selectedCardId);
      if (!card || this.playerActionUsed || this.openingMulliganPending) return false;
      const slotIndex = target.slotIndex ?? target.index;
      const existingUnit = this.gameState?.board?.[slotIndex];
      const proposedType = existingUnit?.owner === 'player' ? 'redeploy_unit' : 'play_card_to_slot';
      return this.isTutorialInputAllowed?.({ type: proposedType, cardId: card.id, slotIndex }) ?? true;
    }

    return true;
  }

  ensureTutorialFocusLayer() {
    if (!this.isTutorialBattle() || !this.add) return null;
    if (!this.tutorialFocusLayer?.active) {
      this.tutorialFocusLayer = this.add.container(0, 0).setDepth(TUTORIAL_FOCUS_DEPTH);
    }
    this.tutorialFocusLayer?.setVisible?.(true);
    this.tutorialFocusLayer?.setAlpha?.(1);
    this.tutorialFocusLayer?.setDepth?.(TUTORIAL_FOCUS_DEPTH);
    this.tutorialFocusLayer?.setScale?.(1);
    this.tutorialFocusLayer?.setPosition?.(0, 0);
    this.tutorialFocusLayer?.setScrollFactor?.(0);
    return this.tutorialFocusLayer;
  }

  clearTutorialFocusGraphics() {
    (this.tutorialFocusGraphics ?? []).forEach((item) => {
      this.tweens?.killTweensOf?.(item);
      item?.destroy?.();
    });
    this.tutorialFocusGraphics = [];
    this.currentTutorialFocusKey = null;
  }

  destroyTutorialFocus() {
    this.clearTutorialFocusGraphics();
    this.tutorialFocusLayer?.destroy?.();
    this.tutorialFocusLayer = null;
  }

  getGameObjectFocusBounds(object, padding = 8) {
    if (!object?.active) return null;
    const width = object.displayWidth ?? object.width;
    const height = object.displayHeight ?? object.height;
    if (!Number.isFinite(object.x) || !Number.isFinite(object.y) || !Number.isFinite(width) || !Number.isFinite(height)) return null;
    return { x: object.x, y: object.y, width: width + padding * 2, height: height + padding * 2 };
  }

  getHandCardFocusBounds(cardId) {
    return calculateHandCardFocusBounds(this.cardViews ?? [], cardId, (object, padding) => this.getGameObjectFocusBounds(object, padding));
  }

  getBoardSlotFocusBounds(slotIndex) {
    const cell = (this.boardCells ?? []).find((candidate) => candidate?.index === slotIndex);
    return this.getGameObjectFocusBounds(cell?.background, 5);
  }

  getMergedFocusBounds(boundsList) {
    const bounds = boundsList.filter(Boolean);
    if (bounds.length === 0) return null;
    const left = Math.min(...bounds.map((bound) => bound.x - bound.width / 2));
    const right = Math.max(...bounds.map((bound) => bound.x + bound.width / 2));
    const top = Math.min(...bounds.map((bound) => bound.y - bound.height / 2));
    const bottom = Math.max(...bounds.map((bound) => bound.y + bound.height / 2));
    return { x: (left + right) / 2, y: (top + bottom) / 2, width: right - left, height: bottom - top };
  }

  resolveTutorialFocusBounds(target) {
    const type = target?.type;
    if (!type || !this.layout) return null;
    if (type === 'multi') {
      const targets = Array.isArray(target.targets) ? target.targets : [];
      return targets.map((item) => this.resolveTutorialFocusBounds(item)).filter(Boolean);
    }
    if (type === 'base_pair') {
      const targets = Array.isArray(target.targets) && target.targets.length > 0
        ? target.targets
        : [{ type: 'enemy_base' }, { type: 'player_base' }];
      return this.getMergedFocusBounds(targets.map((item) => this.resolveTutorialFocusBounds(item)));
    }
    if (type === 'enemy_base') return this.getGameObjectFocusBounds(this.enemyHeroPanel, 10);
    if (type === 'player_base') return this.getGameObjectFocusBounds(this.playerHeroPanel, 10);
    if (type === 'player_base_button') return this.getGameObjectFocusBounds(this.playerBaseActionLabelText, 12) ?? this.getGameObjectFocusBounds(this.playerHeroPanel, 10);
    if (type === 'deck_counter') return this.deckCounterView?.focusBounds ?? this.getGameObjectFocusBounds(this.deckCounterView?.backing, 8);
    if (type === 'battle_menu_button') return this.battleMenuButtonFocusBounds ?? this.getGameObjectFocusBounds(this.bottomControlViews?.[0]?.backing, 8);
    if (type === 'player_hand' || type === 'hand_group') return { x: this.layout.width * 0.5, y: this.layout.hand.centerY, width: this.layout.width - this.layout.margin * 2, height: this.layout.hand.h };
    if (type === 'enemy_hand') return { x: this.layout.width * 0.5, y: this.layout.topHero.centerY + this.layout.topHero.h * 0.72, width: this.layout.contentWidth * 0.7, height: Math.max(34, this.layout.topHero.h * 0.42) };
    if (type === 'battle_history') return this.deckInfoPanel ? { x: this.deckInfoPanel.contentX + this.deckInfoPanel.contentWidth / 2, y: this.deckInfoPanel.contentY + this.deckInfoPanel.contentHeight / 2, width: this.deckInfoPanel.contentWidth, height: this.deckInfoPanel.contentHeight } : null;
    if (type === 'battle_menu_panel') return this.utilityMenuPanel ? this.getGameObjectFocusBounds(this.utilityMenuPanel.panel, 8) : null;
    if (type === 'battle_lanes' || type === 'board_lanes' || type === 'player_hand_and_lanes') {
      const handBounds = type === 'player_hand_and_lanes' ? { x: this.layout.width * 0.5, y: this.layout.hand.centerY, width: this.layout.width - this.layout.margin * 2, height: this.layout.hand.h } : null;
      return this.getMergedFocusBounds([handBounds, ...((this.boardCells ?? []).map((cell) => this.getGameObjectFocusBounds(cell.background, 4)))]);
    }
    if (type === 'player_board_lanes') {
      const slotIndexes = Array.isArray(target.slotIndexes) && target.slotIndexes.length > 0 ? target.slotIndexes : [6, 7, 8];
      return this.getMergedFocusBounds(slotIndexes.map((slotIndex) => this.getBoardSlotFocusBounds(slotIndex)));
    }
    if (type === 'empty_lane') {
      if (!Number.isInteger(target.slotIndex) || target.slotIndex < 6 || target.slotIndex > 8) return null;
      return this.getBoardSlotFocusBounds(target.slotIndex);
    }
    if (type === 'board_slot' || type === 'occupied_board_slot' || type === 'open_lane') return this.getBoardSlotFocusBounds(target.slotIndex ?? target.index ?? 0);
    if (type === 'adjacent_units' || type === 'adjacent_board_slots') return this.getMergedFocusBounds([this.getBoardSlotFocusBounds(target.fromIndex ?? 0), this.getBoardSlotFocusBounds(target.toIndex ?? 1)]);
    if (type === 'hand_card' || type === 'specific_hand_card' || type === 'mulligan_card' || type === 'effect_card') return this.getHandCardFocusBounds(target.cardId ?? (type === 'mulligan_card' ? getTutorialBattleData().openingConfig.requiredPlayerMulliganCardId : null));
    return null;
  }

  drawTutorialFocusBounds(bounds, key) {
    const layer = this.ensureTutorialFocusLayer();
    if (!layer || !bounds) return null;
    this.clearTutorialFocusGraphics();
    this.currentTutorialFocusKey = key;
    const boundsList = Array.isArray(bounds) ? bounds.filter(Boolean) : [bounds];
    const graphics = boundsList.flatMap((item) => {
      const radius = Math.max(10, Math.min(item.width, item.height) * 0.18);
      const glow = this.add.rectangle(item.x, item.y, item.width + 14, item.height + 14, TUTORIAL_FOCUS_FILL, 0.07)
        .setRounded(radius + 6)
        .setStrokeStyle(4, TUTORIAL_FOCUS_COLOR, 0.24);
      const outline = this.add.rectangle(item.x, item.y, item.width, item.height, TUTORIAL_FOCUS_FILL, 0.025)
        .setRounded(radius)
        .setStrokeStyle(2, TUTORIAL_FOCUS_COLOR, 0.82);
      glow.setScrollFactor?.(0);
      outline.setScrollFactor?.(0);
      return [glow, outline];
    });
    layer.add(graphics);
    this.tutorialFocusGraphics = graphics;
    this.tweens?.add?.({ targets: graphics, alpha: { from: 0.38, to: 1 }, scale: { from: 0.985, to: 1.018 }, duration: 760, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return graphics[1] ?? graphics[0] ?? null;
  }

  getTutorialFocusBoundsKey(bounds) {
    const boundsList = Array.isArray(bounds) ? bounds.filter(Boolean) : [bounds];
    return boundsList
      .map((item) => `${Math.round(item.x)},${Math.round(item.y)},${Math.round(item.width)},${Math.round(item.height)}`)
      .join('|');
  }

  updateTutorialFocus(step = this.getCurrentTutorialStep(), { forceRedraw = false } = {}) {
    this.tutorialLifecycleDiagnostics.tutorialFocusUpdateCallCount += 1;
    this.logTutorialLifecycleDiagnostic('updateTutorialFocus called', { forceRedraw, stepId: step?.id ?? step?.key ?? null });
    if (!this.isTutorialBattle() || !this.layout || this.battleResultModalShown || this.battleResultModalPending) {
      this.tutorialLifecycleDiagnostics.lastTutorialFocusSkipReason = 'not_tutorial_or_missing_layout_or_result_modal';
      this.logTutorialLifecycleDiagnostic('updateTutorialFocus skipped', { skipReason: this.tutorialLifecycleDiagnostics.lastTutorialFocusSkipReason });
      this.destroyTutorialFocus();
      return null;
    }
    if (this.isTutorialFocusTimingSuppressed(step)) {
      this.tutorialLifecycleDiagnostics.lastTutorialFocusSkipReason = 'timing_suppressed';
      this.logTutorialLifecycleDiagnostic('updateTutorialFocus skipped', { skipReason: 'timing_suppressed', suppression: this.getTutorialSuppressionReasons() });
      this.clearTutorialFocusGraphics();
      return null;
    }
    const target = this.getTutorialFocusTarget(step);
    if (!target || !this.isTutorialFocusTargetMechanicallyPossible(target, step)) {
      this.tutorialLifecycleDiagnostics.lastTutorialFocusSkipReason = target ? 'target_not_mechanically_possible' : 'missing_target';
      this.logTutorialLifecycleDiagnostic('updateTutorialFocus skipped', { skipReason: this.tutorialLifecycleDiagnostics.lastTutorialFocusSkipReason, target });
      this.clearTutorialFocusGraphics();
      return null;
    }
    const key = JSON.stringify(target);
    const bounds = this.resolveTutorialFocusBounds(target);
    if (!bounds) {
      this.tutorialLifecycleDiagnostics.lastTutorialFocusSkipReason = 'bounds_not_resolved';
      this.logTutorialLifecycleDiagnostic('updateTutorialFocus skipped', { skipReason: 'bounds_not_resolved', target });
      this.clearTutorialFocusGraphics();
      return null;
    }
    const boundsKey = `${key}:${this.getTutorialFocusBoundsKey(bounds)}`;
    if (!forceRedraw && this.currentTutorialFocusKey === boundsKey && this.tutorialFocusGraphics?.length > 0) return this.tutorialFocusGraphics[1] ?? this.tutorialFocusGraphics[0];
    return this.drawTutorialFocusBounds(bounds, boundsKey);
  }

  async showOpeningTurnStartBanner() {
    if (this.hasShownOpeningTurnStartBanner || !this.layout || !this.gameState) return;
    if (!this.prepareTransientBattleBanner('turn-start')) {
      if (!this.shouldSuppressTransientBattleBannerForTutorial()) this.deferTransientBattleBanner('turn-start');
      return;
    }
    this.hasShownOpeningTurnStartBanner = true;
    this.playBattleStartPresentationSfx();

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
    if (!isBattleExhaustedEligible(this.gameState)) resolveImmediateNoProgressWinner(this.gameState);
    if (this.gameState.winner) {
      this.updateInitiativeIndicator();
      this.scheduleBattleResultModal();
      return;
    }

    this.playerActionUsed = false;
    this.enemyActionUsed = false;
    this.playerSurrenderArmed = false;
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
    this.updatePlayerBaseActionState();
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
    const tutorialEvent = this.pendingTutorialEvent;
    this.pendingTutorialEvent = null;
    if (tutorialEvent?.eventName) this.handleTutorialEvent?.(tutorialEvent.eventName, tutorialEvent.payload ?? {});
    this.isFlowResolving = true;
    this.updateTutorialBanner?.();
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
    this.updateTutorialBanner?.();
    await this.delay(650);
    await this.revealAndApplyEnemyAction();
    if (this.gameState.winner) {
      this.completeBattleFlow(500);
      return;
    }
    this.isFlowResolving = false;
    this.updateTutorialBanner?.();
    this.updateInitiativeIndicator();
    this.resetCardHighlights();
  }

  async finishTurnAfterBothActions() {
    if (!this.gameState || this.gameState.winner) {
      this.updateInitiativeIndicator();
      this.scheduleBattleResultModal();
      return;
    }

    this.isFlowResolving = true;
    this.updateTutorialBanner?.();

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
    this.handleTutorialEvent?.('combat_completed', { combatEvents });
    this.commitBattleHistoryTurn(combatEvents, preCombatFeedbackSnapshot);
    this.lastCombatEvents = combatEvents;
    if (combatEvents.length > 0) {
      console.debug('Combat feedback events', combatEvents);
    }
    const deathOverlayCandidates = this.getCombatDeathOverlayCandidates(preCombatFeedbackSnapshot.board);
    await this.withSuppressedLethalFadeIndexes(deathOverlayCandidates.map((candidate) => candidate.index), async () => {
      await this.playCombatAnimations(combatEvents, preCombatFeedbackSnapshot.board);
    });
    await this.playCombatDeathTriggerFeedback(preCombatFeedbackSnapshot);
    const deathOverlays = this.createCombatDeathOverlays(deathOverlayCandidates);
    this.refreshBoardLabels();
    await this.playCombatDeathOverlays(deathOverlays);
    await this.playCombatCreationFeedback(preCombatFeedbackSnapshot);
    this.refreshHeroHP();

    this.gameState.turnsCompleted += 1;
    resolveImmediateResourceExhaustionWinner(this.gameState);
    if (!isBattleExhaustedEligible(this.gameState)) resolveImmediateNoProgressWinner(this.gameState);
    if (this.gameState.winner) {
      this.completeBattleFlow(500);
      return;
    }

    await this.delay(500);
    const playerHandCountBeforeDraw = this.gameState.player?.hand?.length ?? 0;
    drawCards(this.gameState.player, 1);
    drawCards(this.gameState.enemy, 1);
    resolveImmediateResourceExhaustionWinner(this.gameState);
    if (!isBattleExhaustedEligible(this.gameState)) resolveImmediateNoProgressWinner(this.gameState);
    resolveTurnCapWinner(this.gameState, this.gameState.turnsCompleted);
    if ((this.gameState.player?.hand?.length ?? 0) > playerHandCountBeforeDraw) this.playBattleSfx?.(AUDIO_KEYS.CARD_DRAW);

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
    this.updateTutorialBanner?.();
    await this.showOpeningTurnStartBanner();
    this.startTurn();
  }

  updateActionableSideVisualState() {
    const active = this.getCurrentActionableSide();
    const playerActive = active === 'player';
    const enemyActive = active === 'enemy';

    if (this.playerHeroPanel) {
      this.playerHeroPanel.setStrokeStyle(playerActive ? 3 : 2, BASE_SCREEN_FRAME_LIGHT, playerActive ? HERO_PANEL_ACTIVE_STROKE_ALPHA : HERO_PANEL_STROKE_ALPHA);
      this.playerHeroPanel.setFillStyle(BASE_SCREEN_FILL, playerActive ? HERO_PANEL_ACTIVE_FILL_ALPHA : HERO_PANEL_FILL_ALPHA);
    }
    if (this.enemyHeroPanel) {
      this.enemyHeroPanel.setStrokeStyle(enemyActive ? 3 : 2, BASE_SCREEN_FRAME_LIGHT, enemyActive ? HERO_PANEL_ACTIVE_STROKE_ALPHA : HERO_PANEL_STROKE_ALPHA);
      this.enemyHeroPanel.setFillStyle(BASE_SCREEN_FILL, enemyActive ? HERO_PANEL_ACTIVE_FILL_ALPHA : HERO_PANEL_FILL_ALPHA);
    }
    this.updateBaseBroadcastFrameState();
  }

  updateInitiativeIndicator() {
    this.updateActionableSideVisualState();
    this.updateActionSlotBadge();
    this.updatePlayerBaseActionState();
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
    this.updatePlayerBaseActionState();
  }

  async revealAndApplyEnemyAction() {
    const action = this.selectEnemyAction();
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
    this.handleTutorialEvent?.('enemy_action_completed', { actionType: action?.type, cardId: action?.cardId, slotIndex: action?.slotIndex });
    if (result?.ok && action.type !== 'pass' && action.type !== 'surrender') {
      const cardRef = this.createCardRef?.(result.card ?? card, 'enemy') ?? { name: (result.card ?? card)?.name ?? 'Card', side: 'enemy' };
      if (action.type === 'swap-units') {
        this.queueBattleHistoryAction?.('enemy', {
          type: 'swap_positions',
          cardA: this.getBoardUnitLabelFromSnapshot?.(beforeStats, action.fromIndex),
          cardB: this.getBoardUnitLabelFromSnapshot?.(beforeStats, action.toIndex),
        });
      } else if (action.type === 'play-unit') {
        this.playBattleSfx?.(AUDIO_KEYS.CARD_DEPLOY);
        this.queueBattleHistoryAction?.('enemy', {
          type: result.type === 'redeploy' ? 'replace_from_hand' : 'play_unit',
          card: cardRef,
          oldCard: this.getBoardUnitLabelFromSnapshot?.(beforeStats, action.slotIndex),
        });
      } else if (action.type === 'play-effect' || action.type === 'play-targeted-effect') {
        this.queueBattleHistoryAction?.('enemy', { type: 'play_effect', card: cardRef });
      }
    }
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


  getNextTutorialEnemyAction() {
    const result = selectNextTutorialEnemyAction(this.gameState, this.tutorialEnemyActionCursor);
    this.tutorialEnemyActionCursor = result.nextCursor;
    if (result.fallbackReason) console.warn(`Tutorial enemy script fallback PASS: ${result.fallbackReason}`);
    return result.action;
  }

  selectEnemyAction() {
    if (this.isTutorialBattle()) return this.getNextTutorialEnemyAction();
    return chooseEnemyAction(this.gameState);
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
    if (action.type === 'surrender') {
      this.gameState.winner = 'player';
      this.gameState.endingReason = 'ai_safe_surrender';
      return { ok: true, type: 'surrender' };
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
      return playEffectCard(this.gameState, 'enemy', action.cardId);
    }

    if (action.type === 'play-targeted-effect') {
      const result = resolveTargetedEffectCard(
        this.gameState,
        'enemy',
        action.cardId,
        action.targetIndex,
        action.targetIndexes ?? [action.targetIndex],
      );
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

  getInvalidActionReasonKey(reason, card = null) {
    const normalized = String(reason ?? '').toLowerCase();
    if (normalized.includes('cannot play effect cards')) return 'effectCardPlayBlocked';
    if (normalized.includes('hand') && normalized.includes('full')) return 'handFull';
    if (normalized.includes('deck') && normalized.includes('empty')) return 'deckEmpty';
    if (normalized.includes('friendly') || normalized.includes('ally')) return 'noValidAlly';
    if (normalized.includes('enemy')) return 'noValidEnemy';
    if (normalized.includes('no target') || normalized.includes('target') || normalized.includes('legal deterministic')) {
      if (card?.effectId === 'revive_friendly_1hp') return this.getReviveInvalidReasonKey('player');
      if (card?.effectId === 'summon_grunt_empty_slot' || card?.effectId === 'grave_call' || card?.effectId === 'fill_empty_slots_0_1') return 'noEmptySlot';
      if (card?.effectId === 'adjacent_allies_temp_armor_1' || card?.effectId === 'swap_adjacent_then_resolve') return 'noAdjacentAlly';
      return 'noValidTarget';
    }
    if (normalized.includes('empty slot')) return 'noEmptySlot';
    if (normalized.includes('fallen')) return 'noFallenUnit';
    if (normalized.includes('full hp')) return 'fullHp';
    if (normalized.includes('blocked') && normalized.includes('line')) return 'laneBlocked';
    if (normalized.includes('blocked') && normalized.includes('move')) return 'moveBlocked';
    if (normalized.includes('blocked')) return 'effectBlocked';
    if (normalized.includes('immune')) return 'immune';
    if (normalized.includes('adjacent')) return 'noAdjacentAlly';
    if (normalized.includes('occupied')) return 'occupied';
    if (normalized.includes('swap')) return 'invalidSwap';
    return 'effectBlocked';
  }

  getReviveInvalidReasonKey(owner = 'player') {
    const rowIndexes = owner === 'player' ? [6, 7, 8] : [0, 1, 2];
    const hasEmptySlot = rowIndexes.some((index) => this.gameState?.board?.[index] === null);
    if (!hasEmptySlot) return 'noEmptySlot';
    const side = owner === 'player' ? this.gameState?.player : this.gameState?.enemy;
    const hasFallenUnit = (side?.fallen ?? []).some((entry) => entry?.card?.type === 'unit');
    return hasFallenUnit ? 'effectBlocked' : 'noFallenUnit';
  }

  getInvalidActionMessage(reason, card = null) {
    const key = this.getInvalidActionReasonKey(reason, card);
    const fallbackByKey = {
      handFull: 'Hand full',
      noValidTarget: 'No valid target',
      noValidAlly: 'No valid ally',
      noValidEnemy: 'No valid enemy',
      noEmptySlot: 'No empty slot',
      deckEmpty: 'Deck empty',
      fullHp: 'Already full HP',
      moveBlocked: 'Move blocked',
      effectBlocked: 'Effect blocked',
      effectCardPlayBlocked: 'You cannot play effect cards.',
      immune: 'Immune',
      noAdjacentAlly: 'No adjacent ally',
      noFallenUnit: 'No fallen unit',
      laneBlocked: 'Lane blocked',
      occupied: 'Slot occupied',
      invalidSwap: 'Invalid swap',
    };
    return translateActive(`ui.battle.invalidAction.${key}`, fallbackByKey[key] ?? fallbackByKey.effectBlocked);
  }

  getInvalidActionScope(reason) {
    const key = this.getInvalidActionReasonKey(reason);
    return ['laneBlocked', 'occupied', 'invalidSwap', 'moveBlocked'].includes(key) ? 'slot' : 'global';
  }

  showInvalidActionFeedback({ reason, cardId = null, boardIndex = null, scope = 'global', card = null } = {}) {
    this.playBattleSfx?.(AUDIO_KEYS.UI_INVALID);
    const message = this.getInvalidActionMessage(reason, card);
    const reasonKey = this.getInvalidActionReasonKey(reason, card);
    const isSlotSpecific = scope === 'slot' && Number.isInteger(boardIndex);
    if (isSlotSpecific) {
      this.showSlotPulse(boardIndex, 'damage');
      this.showFloatingTextAtSlot(boardIndex, message, 'damage');
    } else {
      this.showInvalidActionBanner(message);
    }
    if (cardId) this.pulseInvalidCard(cardId);
    return { message, reasonKey, scope: isSlotSpecific ? 'slot' : 'global' };
  }

  pulseInvalidCard(cardId) {
    const cardView = this.cardViews.find((view) => view.cardId === cardId);
    if (!cardView?.root?.active) return Promise.resolve();
    const targets = [cardView.root, cardView.background, cardView.glow, cardView.selectionOutline].filter(Boolean);
    this.tweens?.killTweensOf?.(targets);
    cardView.background?.setStrokeStyle?.(5, 0xef4444, 1);
    cardView.glow?.setStrokeStyle?.(5, 0xef4444, 0.76);
    cardView.selectionOutline?.setStrokeStyle?.(5, 0xef4444, 0.92);
    return this.tweenToPromise({
      targets: cardView.root,
      x: cardView.baseX + 6,
      duration: 54,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
    }).then(() => {
      if (!cardView.root?.active) return;
      cardView.root.setPosition(cardView.baseX, cardView.root.y);
      this.resetCardHighlights({ showPreview: false });
    });
  }

  showInvalidActionBanner(message) {
    if (!message) return;
    if (!this.prepareTransientBattleBanner('invalid-action')) {
      if (!this.shouldSuppressTransientBattleBannerForTutorial()) this.deferTransientBattleBanner('invalid-action', { message });
      return;
    }

    const { height, board } = this.layout;
    const bannerLayout = this.getCentralBattleBannerLayout({ baseWidthRatio: 0.88, horizontalPadding: 14, startOffset: 5 });
    const fontSize = Math.min(18, Math.max(14, Math.floor(Math.max(board.cellWidth * 0.125, height * 0.016))));
    const { targetY } = bannerLayout;
    this.invalidActionBanner = this.add.text(bannerLayout.x, bannerLayout.startY, message, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${fontSize}px`,
      color: '#fee2e2',
      backgroundColor: '#7f1d1d',
      align: 'center',
      padding: { x: 14, y: 11 },
      wordWrap: { width: bannerLayout.maxTextWidth },
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(222).setAlpha(0).setScale(0.98).setStroke('#450a0a', 1);

    const banner = this.invalidActionBanner;
    this.tweens.add({
      targets: banner,
      alpha: 1,
      y: targetY,
      scaleX: 1,
      scaleY: 1,
      duration: PLAYER_EFFECT_CONFIRMATION_FADE_IN_MS,
      ease: 'Quad.easeOut',
    });

    this.invalidActionBannerFadeOutEvent = this.time.delayedCall(
      PLAYER_EFFECT_CONFIRMATION_FADE_IN_MS + INVALID_ACTION_BANNER_HOLD_MS,
      () => {
        if (this.invalidActionBanner !== banner) return;
        this.invalidActionBannerFadeOutEvent = null;
        this.tweens.add({
          targets: banner,
          alpha: 0,
          y: targetY - 5,
          scaleX: 0.98,
          scaleY: 0.98,
          duration: PLAYER_EFFECT_CONFIRMATION_FADE_OUT_MS,
          ease: 'Quad.easeIn',
          onComplete: () => {
            if (this.invalidActionBanner === banner) this.destroyInvalidActionBanner();
            this.flushDeferredTransientBattleBanner();
          },
        });
      },
    );
  }

  showPlayerActionBanner(message) {
    if (!message) return;
    if (!this.prepareTransientBattleBanner('player-action')) {
      if (!this.shouldSuppressTransientBattleBannerForTutorial()) this.deferTransientBattleBanner('player-action', { message });
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
      if (state.targetType === 'friendly-unit') return translateActive('ui.battle.targeting.selectAdjacentAlly', 'SELECT ADJACENT ALLY');
      return translateActive('ui.battle.targeting.selectAdjacentEnemy', 'SELECT ADJACENT ENEMIES');
    }
    if (state.targetType === 'enemy-and-friendly-unit' && selectedCount === 0) {
      return translateActive('ui.battle.targeting.selectEnemy', 'SELECT ENEMY');
    }
    if (state.targetType === 'enemy-and-friendly-unit' && selectedCount === 1) {
      return translateActive('ui.battle.targeting.selectAlly', 'SELECT ALLY');
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
      if (!this.shouldSuppressTransientBattleBannerForTutorial()) this.deferTransientBattleBanner('enemy-action', { message, pacing });
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
      'invalid-action': 3,
      'player-action': 2,
      'turn-start': 1,
    }[owner] ?? 0;
  }

  getRenderedTransientBattleBannerOwner() {
    if (this.enemyActionBanner?.active) return 'enemy-action';
    if (this.invalidActionBanner?.active) return 'invalid-action';
    if (this.playerActionBanner?.active) return 'player-action';
    if (this.turnStartBanner?.active) return 'turn-start';
    return null;
  }

  destroyInvalidActionBanner() {
    if (this.invalidActionBannerFadeOutEvent) {
      this.invalidActionBannerFadeOutEvent.remove(false);
      this.invalidActionBannerFadeOutEvent = null;
    }
    if (!this.invalidActionBanner) return;
    this.tweens?.killTweensOf?.(this.invalidActionBanner);
    this.invalidActionBanner.destroy();
    this.invalidActionBanner = null;
  }

  destroyTransientBattleBanners() {
    this.destroyTurnStartBanner();
    this.destroyEnemyActionBanner();
    this.destroyPlayerActionBanner();
    this.destroyInvalidActionBanner();
  }

  shouldSuppressTransientBattleBannerForTutorial() {
    if (!this.isTutorialBattle?.() || this.battleResultModalShown || this.battleResultModalPending || this.gameState?.winner) return false;
    const step = this.getCurrentTutorialStep?.();
    return Boolean(step && this.getTutorialStepText?.(step));
  }

  recoverTutorialBannerAfterSuppressedBattleBanner() {
    if (!this.shouldSuppressTransientBattleBannerForTutorial()) return false;
    this.destroyTransientBattleBanners();
    this.updateTutorialBanner?.();
    this.time?.delayedCall?.(0, () => {
      if (!this.shouldSuppressTransientBattleBannerForTutorial()) return;
      this.updateTutorialBanner?.();
      this.updateTutorialFocus?.();
    });
    return true;
  }

  deferTransientBattleBanner(owner, payload = {}) {
    const deferredOwner = this.deferredTransientBattleBanner?.owner;
    if (this.getBattleBannerPriority(deferredOwner) > this.getBattleBannerPriority(owner)) return;
    this.deferredTransientBattleBanner = { owner, payload };
  }

  flushDeferredTransientBattleBanner() {
    const deferred = this.deferredTransientBattleBanner;
    if (this.recoverTutorialBannerAfterSuppressedBattleBanner?.()) {
      this.deferredTransientBattleBanner = null;
      return false;
    }
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
    if (deferred.owner === 'invalid-action') {
      this.showInvalidActionBanner(deferred.payload.message);
      return true;
    }
    if (deferred.owner === 'turn-start') {
      this.showOpeningTurnStartBanner();
      return true;
    }
    return false;
  }


  prepareTransientBattleBanner(owner) {
    if (this.recoverTutorialBannerAfterSuppressedBattleBanner?.()) return false;
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

  captureOfflineReservationsSnapshot() {
    return (this.gameState?.offlineReservations ?? []).map((entry) => ({
      id: entry?.id ?? null,
      reservedIndex: entry?.reservedIndex,
      consumed: Boolean(entry?.consumed),
      returned: Boolean(entry?.returned),
      reservedUnitId: entry?.reservedUnit?.cardId ?? entry?.reservedUnit?.id ?? null,
      reservedUnitOwner: entry?.reservedUnit?.owner ?? null,
    }));
  }

  captureCombatFeedbackSnapshot() {
    return {
      board: this.captureBoardSnapshot(),
      offlineReservations: this.captureOfflineReservationsSnapshot(),
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

  refreshBoardLabelsFromSnapshot(boardSnapshot, offlineReservations = null) {
    if (!Array.isArray(boardSnapshot)) return;
    this.boardCells.forEach((cell) => {
      const unit = boardSnapshot[cell.index];
      cell.label.removeAll(true);
      cell.label.setAlpha(1).setScale(1);
      if (unit && unit.offlineReservedSlot !== true) {
        cell.label.add(this.createBoardUnitView(cell, unit, {
          offline: this.isBoardIndexOffline(cell.index, boardSnapshot, offlineReservations),
        }));
      }
    });
  }

  async playImmediateCombatFeedback(immediateCombatFeedback = null) {
    const combatEvents = immediateCombatFeedback?.combatEvents;
    const combatSnapshot = immediateCombatFeedback?.combatSnapshot;
    if (!Array.isArray(combatEvents) || combatEvents.length === 0) return;
    if (!Array.isArray(combatSnapshot?.board)) return;

    const deathOverlayCandidates = this.getCombatDeathOverlayCandidates(combatSnapshot.board);
    const previousSuppressedLethalFadeIndexes = this.suppressedLethalFadeIndexes;
    const previousLastCombatEvents = this.lastCombatEvents;
    this.suppressedLethalFadeIndexes = new Set(deathOverlayCandidates.map((candidate) => candidate.index));
    this.lastCombatEvents = combatEvents;
    try {
      this.refreshBoardLabelsFromSnapshot(combatSnapshot.board);
      await this.playCombatAnimations(combatEvents, combatSnapshot.board);
    } finally {
      this.suppressedLethalFadeIndexes = previousSuppressedLethalFadeIndexes;
    }
    await this.playCombatDeathTriggerFeedback(combatSnapshot);
    const deathOverlays = this.createCombatDeathOverlays(deathOverlayCandidates);
    this.refreshBoardLabels();
    await this.playCombatDeathOverlays(deathOverlays);
    this.lastCombatEvents = previousLastCombatEvents;
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

  isSnapshotBoardUnitOffline(boardSnapshot, offlineReservations, boardIndex) {
    if (!Array.isArray(boardSnapshot) || !Number.isInteger(boardIndex)) return false;
    const unit = boardSnapshot[boardIndex];
    if (!unit) return false;
    if (unit.offlineReservedSlot === true) return true;
    const unitId = unit.cardId ?? unit.id ?? null;
    return (offlineReservations ?? []).some((entry) => (
      entry
      && !entry.consumed
      && !entry.returned
      && entry.reservedIndex === boardIndex
      && (!entry.reservedUnitId || entry.reservedUnitId === unitId)
      && (!entry.reservedUnitOwner || entry.reservedUnitOwner === unit.owner)
    ));
  }

  isBoardIndexOffline(index, boardSnapshot = null, offlineReservations = null) {
    if (!Number.isInteger(index)) return false;
    if (Array.isArray(boardSnapshot)) {
      return this.isSnapshotBoardUnitOffline(boardSnapshot, offlineReservations, index);
    }
    return isBoardUnitOffline(this.gameState, index);
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
      const selectedPartnerIndex = targetIndexes[1];
      const partnerIndex = Number.isInteger(selectedPartnerIndex)
        ? selectedPartnerIndex
        : this.getAdjacentFriendlySwapPartner(selectedIndex, owner, beforeSnapshot);
      if (Number.isInteger(selectedIndex) && Number.isInteger(partnerIndex)) {
        return [{ type: 'swap', fromIndex: selectedIndex, toIndex: partnerIndex, label: label ?? 'RUSH', kind: 'rush' }];
      }
    }

    if (effectId === 'swap_any_two_units' || effectId === 'swap_any_two_friendly_units' || effectId === 'swap_two_enemy_units' || effectId === 'swap_adjacent_enemy_units') {
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

  getSnapshotUnitHealth(unit) {
    if (Number.isFinite(unit?.hp)) return unit.hp;
    if (Number.isFinite(unit?.health)) return unit.health;
    return 0;
  }

  hasSameBoardUnitInSnapshot(unit, boardSnapshot) {
    if (!unit || !Array.isArray(boardSnapshot)) return false;
    return boardSnapshot.some((candidate) => this.isSameBoardUnit(unit, candidate));
  }

  getCombatDeathOverlayCandidates(beforeSnapshot) {
    if (!Array.isArray(beforeSnapshot) || !this.gameState?.board) return [];
    return beforeSnapshot
      .map((unit, index) => ({ unit, index }))
      .filter(({ unit }) => {
        if (!unit) return false;
        if (this.getSnapshotUnitHealth(unit) <= 0) return false;
        return !this.hasSameBoardUnitInSnapshot(unit, this.gameState.board);
      });
  }

  withSuppressedLethalFadeIndexes(indexes, callback) {
    const previous = this.suppressedLethalFadeIndexes;
    this.suppressedLethalFadeIndexes = new Set((Array.isArray(indexes) ? indexes : []).filter(Number.isInteger));
    return Promise.resolve()
      .then(callback)
      .finally(() => {
        this.suppressedLethalFadeIndexes = previous;
      });
  }

  shouldSuppressLethalFade(index) {
    return Number.isInteger(index) && this.suppressedLethalFadeIndexes?.has(index);
  }

  createCombatDeathOverlays(candidates = []) {
    if (!Array.isArray(candidates) || candidates.length === 0) return [];
    return candidates
      .map(({ unit, index }) => {
        const cell = this.getCellByIndex(index);
        const center = this.getBoardCellCenter(index);
        if (!cell || !center || !unit) return null;
        const overlay = this.add.container(center.x, center.y)
          .setDepth(DEATH_OVERLAY_DEPTH)
          .setAlpha(1)
          .setScale(1);
        overlay.disableInteractive?.();
        overlay.add(this.createBoardUnitView(cell, unit));
        this.addDeathOverlayFailureCues(overlay, cell);
        return overlay;
      })
      .filter(Boolean);
  }

  addDeathOverlayFailureCues(overlay, cell) {
    const width = Math.max(1, cell?.background?.width ?? this.layout.board.cellWidth);
    const height = Math.max(1, cell?.background?.height ?? this.layout.board.cellHeight);
    const flash = this.add.rectangle(0, 0, width - 8, height - 8, 0x7f1d1d, 0)
      .setStrokeStyle(2, 0xfca5a5, 0);
    const fracture = this.add.graphics()
      .setAlpha(0);
    fracture.lineStyle(Math.max(1, Math.round(width * 0.012)), 0xfee2e2, DEATH_OVERLAY_FRACTURE_ALPHA);
    fracture.beginPath();
    fracture.moveTo(-width * 0.32, -height * 0.36);
    fracture.lineTo(-width * 0.06, -height * 0.08);
    fracture.lineTo(width * 0.04, height * 0.04);
    fracture.lineTo(width * 0.34, height * 0.38);
    fracture.strokePath();
    fracture.lineStyle(Math.max(1, Math.round(width * 0.008)), 0x450a0a, 0.52);
    fracture.beginPath();
    fracture.moveTo(-width * 0.02, -height * 0.04);
    fracture.lineTo(width * 0.14, -height * 0.18);
    fracture.moveTo(width * 0.06, height * 0.08);
    fracture.lineTo(-width * 0.12, height * 0.22);
    fracture.strokePath();

    const shards = this.createDeathOverlayShards(width, height);
    overlay.add([flash, fracture, ...shards]);
    overlay.setData('deathFlash', flash);
    overlay.setData('deathFracture', fracture);
    overlay.setData('deathShards', shards);
  }

  createDeathOverlayShards(width, height) {
    return Array.from({ length: DEATH_OVERLAY_SHARD_COUNT }, (_, shardIndex) => {
      const direction = shardIndex % 2 === 0 ? -1 : 1;
      const x = direction * width * (0.08 + shardIndex * 0.035);
      const y = -height * 0.08 + shardIndex * height * 0.045;
      const size = Math.max(2, Math.round(Math.min(width, height) * (0.025 + shardIndex * 0.002)));
      const shard = this.add.triangle(x, y, 0, -size, size * 0.8, size * 0.6, -size * 0.8, size * 0.6, 0xfecaca, 0)
        .setStrokeStyle(1, 0x7f1d1d, 0);
      shard.setData('deathShardDriftX', direction * (DEATH_OVERLAY_SHARD_DRIFT_PX + shardIndex * 2));
      shard.setData('deathShardDriftY', -DEATH_OVERLAY_SHARD_DRIFT_PX * (0.35 + shardIndex * 0.08));
      return shard;
    });
  }

  playCombatDeathOverlays(overlays = []) {
    if (!Array.isArray(overlays) || overlays.length === 0) return Promise.resolve();
    this.playBattleSfx?.(AUDIO_KEYS.UNIT_DEATH);
    return Promise.all(overlays.map((overlay) => this.playCombatDeathOverlay(overlay)));
  }

  playCombatDeathOverlay(overlay) {
    if (!overlay?.active) return Promise.resolve();
    const baseX = overlay.x;
    const flash = overlay.getData('deathFlash');
    const fracture = overlay.getData('deathFracture');
    const shards = overlay.getData('deathShards') ?? [];
    const flashTween = flash?.active
      ? this.tweenToPromise({ targets: flash, alpha: 0.46, duration: DEATH_OVERLAY_FLASH_MS / 2, yoyo: true, ease: 'Quad.easeOut' })
      : Promise.resolve();
    const fractureTween = fracture?.active
      ? this.tweenToPromise({ targets: fracture, alpha: 1, duration: DEATH_OVERLAY_SHAKE_MS, ease: 'Quad.easeOut' })
      : Promise.resolve();
    const shakeTween = this.tweenToPromise({
      targets: overlay,
      x: baseX + DEATH_OVERLAY_SHAKE_OFFSET_PX,
      duration: Math.round(DEATH_OVERLAY_SHAKE_MS / 3),
      yoyo: true,
      repeat: 1,
      ease: 'Linear',
    }).then(() => {
      if (overlay?.active) overlay.x = baseX;
    });

    return Promise.all([flashTween, fractureTween, shakeTween])
      .then(() => Promise.all([
        this.tweenToPromise({
          targets: overlay,
          alpha: 0,
          scaleX: DEATH_OVERLAY_FINAL_SCALE,
          scaleY: DEATH_OVERLAY_FINAL_SCALE,
          y: overlay.y - DEATH_OVERLAY_DRIFT_PX,
          duration: DEATH_OVERLAY_COLLAPSE_MS,
          ease: 'Quad.easeIn',
        }),
        ...shards.filter((shard) => shard?.active).map((shard) => this.tweenToPromise({
          targets: shard,
          alpha: 0.72,
          x: shard.x + (shard.getData('deathShardDriftX') ?? 0),
          y: shard.y + (shard.getData('deathShardDriftY') ?? 0),
          duration: Math.round(DEATH_OVERLAY_COLLAPSE_MS * 0.45),
          yoyo: true,
          ease: 'Quad.easeOut',
        })),
      ]))
      .finally(() => overlay.destroy());
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
    const debuffEffects = new Set(['enemy_lane_atk_minus_1', 'enemy_up_to_2_atk_minus_1', 'lane_tempo_mod_until_combat']);
    const healEffects = new Set(['heal_all_1', 'heal_1', 'heal_1_atk_1_draw_on_kill_this_turn', 'heal_2', 'heal_3']);

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
      const overrideIndex = result?.combatEvents?.find((event) => Number.isInteger(event?.attackerIndex))?.attackerIndex;
      if (Number.isInteger(overrideIndex)) {
        feedback.push({ type: 'slot-text', index: overrideIndex, label: 'OVERRIDE', kind: 'debuff', phase: 'pre', order: 10 });
      }
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

    if (effectId === 'swap_adjacent_enemy_units') {
      beforeSnapshot.forEach((before) => {
        if (!before) return;
        const afterIndex = this.gameState.board.findIndex((unit) => unit?.cardId === before.cardId && unit?.owner === before.owner);
        const after = this.gameState.board[afterIndex];
        if (!this.isSameBoardUnit(before, after)) return;
        const attackDelta = getUnitAttack(after) - before.attack;
        if (attackDelta < 0) {
          feedback.push({ type: 'slot-text', index: afterIndex, label: `${attackDelta} ATK`, kind: 'debuff', phase: 'pre', order: 10 });
        }
      });
    }

    if (effectId === 'enemy_all_armor_minus_1') {
      beforeSnapshot.forEach((before, index) => {
        const after = this.gameState.board[index];
        if (!before || !this.isSameBoardUnit(before, after)) return;
        const armorDelta = getUnitArmor(after) - before.armor;
        if (armorDelta < 0) {
          feedback.push({ type: 'slot-text', index, label: `${armorDelta} ARM`, kind: 'debuff', phase: 'pre', order: 10 });
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

    if (effectId === 'infect_damage_1_opposite_ally_atk_1' || effectId === 'heal_1_atk_1_draw_on_kill_this_turn' || effectId === 'lane_tempo_mod_until_combat') {
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

    if (effectId === 'destroy_friendly_draw_1' || effectId === 'destroy_friendly_damage_enemy_base_1') {
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
    const hasOrderedDeathTriggerEvents = Array.isArray(this.lastCombatEvents)
      && this.lastCombatEvents.some((event) => this.isDeathTriggerPresentationEvent(event));

    const recordedRotcallerFeedback = Array.isArray(this.gameState?.rotcallerCombatFeedbackEvents)
      ? this.gameState.rotcallerCombatFeedbackEvents
        .filter((event) => event?.source === 'rotcaller_adjacent_death_atk_1' && Number.isInteger(event.index))
        .map((event) => ({
          type: 'slot-text',
          index: event.index,
          label: event.label ?? '+1 ATK',
          kind: event.kind ?? 'buff',
        }))
      : [];
    const recordedRotcallerIndexes = new Set(recordedRotcallerFeedback.map((event) => event.index));
    const beforeRefresh = hasOrderedDeathTriggerEvents ? [] : [...recordedRotcallerFeedback];
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
      if (!hasOrderedDeathTriggerEvents && pyreState?.active && pyreTriggersByOwner[owner] < 2) {
        pyreTriggersByOwner[owner] += 1;
        addSourceDeath(index);
        if (opposingUnit?.owner === enemyOwner) addUnitDamage(opposingIndex, 1);
      }

      if (!hasOrderedDeathTriggerEvents && unit.effectId === 'death_damage_enemy_hero_1') {
        addSourceDeath(index);
        addHeroDamage(enemyOwner, 1);
      }

      if (!hasOrderedDeathTriggerEvents && unit.effectId === 'combat_death_damage_enemy_lane_1') {
        addSourceDeath(index);
        if (opposingUnit?.owner === enemyOwner) addUnitDamage(opposingIndex, 1);
      }

      if (!hasOrderedDeathTriggerEvents && unit.effectId === 'combat_death_damage_both_heroes_1') {
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
      if (!hasOrderedDeathTriggerEvents && row.includes(index)) {
        const lane = index % 3;
        [lane > 0 ? row[lane - 1] : null, lane < 2 ? row[lane + 1] : null]
          .filter((candidateIndex) => Number.isInteger(candidateIndex))
          .forEach((candidateIndex) => {
            if (recordedRotcallerIndexes.has(candidateIndex)) return;
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
          this.triggerBaseBroadcastOverload(event.side);
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
          if ((feedback.drawn ?? 0) > 0) this.playBattleSfx?.(AUDIO_KEYS.CARD_DRAW);
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
    }).setOrigin(0.5).setDepth(FLOATING_FEEDBACK_DEPTH);

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
    }).setOrigin(0.5).setDepth(FLOATING_FEEDBACK_DEPTH);

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
    this.playBattleSfx?.(AUDIO_KEYS.UNIT_DEATH);
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
      depth: label.depth,
    };
  }

  restoreUnitVisualState(state) {
    if (!state?.label?.active) return;
    state.label.setPosition(state.x, state.y);
    state.label.setScale(state.scaleX, state.scaleY);
    state.label.setDepth?.(state.depth);
  }

  getUnitLungeTargets(cell) {
    return cell?.label ? [cell.label] : [];
  }

  prepareUnitLungeTargets(targets) {
    this.tweens?.killTweensOf?.(targets);
    targets?.forEach?.((target) => target?.setDepth?.(246));
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

        if (this.isDeathTriggerPresentationEvent(event)) {
          await this.playDeathTriggerPresentationEvent(event, preCombatBoardSnapshot);
          continue;
        }

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

  isDeathTriggerPresentationEvent(event) {
    return [
      'death-trigger-hero-damage',
      'death-trigger-lane-damage',
      'death-trigger-both-hero-damage',
      'death-trigger-rotcaller-buff',
    ].includes(event?.type);
  }

  async playDeathTriggerSourceAcknowledgement(event, preCombatBoardSnapshot = null) {
    const sourceIndex = event?.sourceDeathIndex;
    if (!Number.isInteger(sourceIndex)) return;
    const cell = this.getCellByIndex(sourceIndex);
    if (!cell) return;
    await Promise.all([
      this.showSlotPulse(sourceIndex, 'death'),
      this.showFloatingTextAtSlot(sourceIndex, 'DEATH', 'death'),
    ]);
  }

  refreshBoardIndexWithPresentationStats(index, stats = {}) {
    const cell = this.getCellByIndex(index);
    const unit = this.gameState?.board?.[index];
    if (!cell?.label || !unit) return;
    const previousRenderStats = this.currentBoardRenderStats;
    const baseStats = this.captureBoardRenderStats?.() ?? [];
    const nextStats = [...baseStats];
    nextStats[index] = {
      ...(nextStats[index] ?? this.getBoardUnitStats(unit, index)),
      ...stats,
    };
    this.currentBoardRenderStats = nextStats;
    try {
      cell.label.removeAll(true);
      cell.label.setAlpha(1).setScale(1);
      cell.label.add(this.createBoardUnitView(cell, unit));
    } finally {
      this.currentBoardRenderStats = previousRenderStats;
    }
  }

  async playDeathTriggerPresentationEvent(event, preCombatBoardSnapshot = null) {
    await this.playDeathTriggerSourceAcknowledgement(event, preCombatBoardSnapshot);

    if (event.type !== 'death-trigger-rotcaller-buff') {
      await this.delay(145);
    }

    if (event.type === 'death-trigger-hero-damage') {
      this.showHeroDamage(event.targetSide, event.damage ?? 1);
      await this.flashHeroHit(event.targetSide);
      return;
    }

    if (event.type === 'death-trigger-both-hero-damage') {
      const heroes = Array.isArray(event.affectedHeroes) ? event.affectedHeroes : ['player', 'enemy'];
      for (const side of heroes) {
        this.showHeroDamage(side, event.damage ?? 1);
        await this.flashHeroHit(side);
      }
      return;
    }

    if (event.type === 'death-trigger-lane-damage') {
      const indexes = Array.isArray(event.affectedIndexes) ? event.affectedIndexes : [];
      for (const index of indexes) {
        const cell = this.getCellByIndex(index);
        if (!cell) continue;
        await Promise.all([
          this.flashCellHit(cell, { damage: event.damage ?? 1, lethal: false }),
          this.showUnitFloatingText(cell, `-${event.damage ?? 1}`, '#fde68a'),
        ]);
      }
      return;
    }

    if (event.type === 'death-trigger-rotcaller-buff') {
      const targetIndex = event.targetIndex;
      if (Number.isInteger(targetIndex)) {
        if (Number.isFinite(event.resultingAttack)) {
          this.refreshBoardIndexWithPresentationStats(targetIndex, { attack: event.resultingAttack });
        }
        await Promise.all([
          this.showSlotPulse(targetIndex, 'buff'),
          this.showFloatingTextAtSlot(targetIndex, `+${event.attackAdded ?? 1} ATK`, 'buff'),
        ]);
        await this.delay(110);
      }
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
    if (Array.isArray(events) && events.some((event) => (event?.damage ?? 0) > 0 || (event?.selfDamageFeedback?.amount ?? 0) > 0)) {
      this.playBattleSfx?.(AUDIO_KEYS.ATTACK_IMPACT);
    }
    if (Array.isArray(events) && events.some((event) => event?.targetType === 'hero' && (event?.damage ?? 0) > 0 && !event?.lethal)) {
      this.playBattleSfx?.(AUDIO_KEYS.BASE_HIT);
    }
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
            if (event.lethal && !this.shouldSuppressLethalFade(targetIndex)) animations.push(this.playLethalFade(target));
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
    if (!isBlocked) this.triggerBaseBroadcastOverload(side);
    const damageText = this.add.text(hero.x + hero.width * 0.34, hero.y, isBlocked ? translateActive('ui.battle.block', 'BLOCK') : `-${damage}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: isBlocked ? '18px' : '22px',
      color: isBlocked ? '#bfdbfe' : '#fca5a5',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(240);
    this.tweens.add({ targets: hero, scaleX: 1.04, scaleY: 1.04, duration: 90, yoyo: true });
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

    this.triggerBaseBroadcastOverload(side);
    hero.setFillStyle(BASE_SCREEN_FILL, Math.max(previousStyle.fillAlpha, HERO_PANEL_HIT_FILL_ALPHA));
    hero.setStrokeStyle(Math.max(previousStyle.lineWidth, 3), 0xfca5a5, HERO_PANEL_HIT_STROKE_ALPHA);
    await this.delay(BASE_FRAME_OVERLOAD_MS);
    hero.setFillStyle(previousStyle.fillColor, previousStyle.fillAlpha);
    hero.setStrokeStyle(previousStyle.lineWidth, previousStyle.strokeColor, previousStyle.strokeAlpha);
  }

  async playLethalFade() {
    // Death presentation is handled by snapshot overlays after the real board refresh.
    // Keep this hook as a no-op so lethal hit feedback does not double-fade the live slot.
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
    this.clearHandCardViews();
    this.drawHand();
    this.startHandCardFlipReveals(revealBackCards);
    if (this.openingMulliganRevealPending) this.startOpeningMulliganReveal();
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
    const options = arguments[2] ?? {};
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
    const boardOverrideY = getCardBoardArtPositionY(unit.cardId ?? unit.id);
    const defaultBoardY = isEnemyUnit
      ? BOARD_CARD_ARTWORK_ENEMY_CROP_POSITION_Y
      : BOARD_CARD_ARTWORK_PLAYER_CROP_POSITION_Y;

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
      artPositionY: Number.isFinite(boardOverrideY)
        ? boardOverrideY
        : defaultBoardY,
    });
    const artBackdrop = this.add.rectangle(0, finalArtY, artRect.width, artRect.height, BASE_CARD_SURFACE_THEME.artBackdropFill, 0.22);
    const artStroke = this.add.rectangle(0, finalArtY, artRect.width, artRect.height)
      .setFillStyle(0x000000, 0)
      .setStrokeStyle(1, boardSurfaceTheme.dividerLine, 0.2);
    // Board-only readability polish: prioritize separation/clarity over global brightness.
    const artLocalContrast = this.add.rectangle(0, finalArtY, artRect.width, artRect.height, 0x000000, 0.03);
    const artShade = this.add.rectangle(0, finalArtY - artRect.height * 0.17, artRect.width, artRect.height * 0.52, CARD_COLORS.artTop, 0.18);
    const artBottomDim = this.add.rectangle(0, finalArtY + artRect.height * 0.29, artRect.width, artRect.height * 0.42, BASE_CARD_SURFACE_THEME.artBackdropFill, 0.14);
    const offlineDim = this.add.rectangle(0, 0, unitWidth, unitHeight, 0x020617, options.offline ? OFFLINE_UNIT_DIM_ALPHA : 0);
    offlineDim.name = 'offlineDim';

    if (options.offline) return [cardBack, inner, artBackdrop, art, artStroke, artLocalContrast, artShade, artBottomDim, offlineDim, stats];
    offlineDim.destroy?.();
    return [cardBack, inner, artBackdrop, art, artStroke, artLocalContrast, artShade, artBottomDim, stats];
  }

  applyOfflineBoardUnitVisual(cell, offline, wasOffline) {
    if (!cell?.label) return;
    const label = cell.label;
    const offlineDim = typeof label.getByName === 'function' ? label.getByName('offlineDim') : null;
    this.tweens?.killTweensOf?.([label, offlineDim].filter(Boolean));

    if (offline) {
      label.setAlpha(wasOffline ? OFFLINE_UNIT_ALPHA : 1);
      if (offlineDim) offlineDim.setAlpha(wasOffline ? OFFLINE_UNIT_DIM_ALPHA : 0);
      this.tweens?.add?.({
        targets: label,
        alpha: OFFLINE_UNIT_ALPHA,
        duration: wasOffline ? 0 : OFFLINE_UNIT_FADE_IN_MS,
        ease: 'Sine.easeOut',
      });
      if (offlineDim) {
        this.tweens?.add?.({
          targets: offlineDim,
          alpha: OFFLINE_UNIT_DIM_ALPHA,
          duration: wasOffline ? 0 : OFFLINE_UNIT_FADE_IN_MS,
          ease: 'Sine.easeOut',
        });
      }
      return;
    }

    label.setAlpha(wasOffline ? OFFLINE_UNIT_ALPHA : 1);
    if (offlineDim) offlineDim.setAlpha(wasOffline ? OFFLINE_UNIT_DIM_ALPHA : 0);
    if (!wasOffline) return;
    this.tweens?.add?.({
      targets: label,
      alpha: 1,
      duration: OFFLINE_UNIT_FADE_OUT_MS,
      ease: 'Sine.easeOut',
    });
    if (offlineDim) {
      this.tweens?.add?.({
        targets: offlineDim,
        alpha: 0,
        duration: OFFLINE_UNIT_FADE_OUT_MS,
        ease: 'Sine.easeOut',
      });
    }
  }

  refreshBoardLabels() {
    normalizeOfflineReservations(this.gameState);
    if (this.boardInspectIndex !== null && !this.gameState.board[this.boardInspectIndex]) {
      this.clearBoardInspect({ animate: true });
    }

    const currentRenderStats = this.createBoardRenderStatSnapshot();
    this.currentBoardRenderStats = currentRenderStats;

    this.boardCells.forEach((cell) => {
      const unit = this.gameState.board[cell.index];
      const offline = this.isBoardIndexOffline(cell.index);
      const wasOffline = this.offlineBoardVisualIndexes?.has(cell.index) ?? false;
      cell.label.removeAll(true);
      cell.label.setAlpha(wasOffline ? OFFLINE_UNIT_ALPHA : 1).setScale(1);
      if (unit && unit.offlineReservedSlot !== true) {
        if (offline || wasOffline) {
          cell.label.add(this.createBoardUnitView(cell, unit, { offline: offline || wasOffline }));
        } else {
          cell.label.add(this.createBoardUnitView(cell, unit));
        }
        this.applyOfflineBoardUnitVisual(cell, offline, wasOffline);
      } else {
        cell.label.setAlpha(1);
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

    this.offlineBoardVisualIndexes = new Set(this.boardCells
      .filter((cell) => this.isBoardIndexOffline(cell.index))
      .map((cell) => cell.index));
    this.lastRenderedBoardStats = currentRenderStats;
    this.currentBoardRenderStats = null;
    this.turnStartBanner = null;
    this.turnStartBannerFadeOutEvent = null;
    this.hasShownOpeningTurnStartBanner = false;
  }

  refreshHeroHP() {
    if (!this.enemyHpText || !this.playerHpText) {
      const { width, topHero, playerHero } = this.layout;
      this.enemyHpText = this.add.text(width * 0.5, topHero.centerY + BASE_TERMINAL_TEXT_OPTICAL_Y_OFFSET_PX, '', { fontFamily: 'Arial, sans-serif', fontSize: `${Math.max(24, Math.floor(topHero.h * 0.62))}px`, color: BASE_TERMINAL_TEXT_COLOR, fontStyle: 'bold' }).setOrigin(0.5).setDepth(BASE_TERMINAL_TEXT_DEPTH).setStroke(BASE_TERMINAL_TEXT_STROKE, BASE_TERMINAL_TEXT_STROKE_WIDTH).setShadow(0, 0, BASE_TERMINAL_TEXT_ENEMY_GLOW, BASE_TERMINAL_TEXT_ENEMY_GLOW_BLUR, true, true).setAlpha(0).setVisible(false);
      this.playerHpText = this.add.text(width * 0.5, playerHero.centerY + BASE_TERMINAL_TEXT_OPTICAL_Y_OFFSET_PX, '', { fontFamily: 'Arial, sans-serif', fontSize: `${Math.max(23, Math.floor(playerHero.h * 0.6))}px`, color: BASE_TERMINAL_TEXT_COLOR, fontStyle: 'bold' }).setOrigin(0.5).setDepth(BASE_TERMINAL_TEXT_DEPTH).setStroke(BASE_TERMINAL_TEXT_STROKE, BASE_TERMINAL_TEXT_STROKE_WIDTH).setShadow(0, 0, BASE_TERMINAL_TEXT_PLAYER_GLOW, BASE_TERMINAL_TEXT_PLAYER_GLOW_BLUR, true, true).setAlpha(0).setVisible(false);
    }
    this.maybeTriggerTerminalShatterHook();
    if (!this.terminalFailedSides?.has('enemy')) {
      this.enemyHpText.setText(`${this.gameState.enemyHP}`);
    }
    if (!this.terminalFailedSides?.has('player')) {
      this.playerHpText.setText(`${this.gameState.playerHP}`);
    }
    this.refreshTerminalTextVisibility();
    this.renderBaseBroadcastFrame(this.baseFrameViews?.enemy);
    this.renderBaseBroadcastFrame(this.baseFrameViews?.player);
    this.updatePlayerBaseActionState();
  }


  destroySelectedHandCardZoom({ animate = false } = {}) {
    if (!this.selectedHandCardZoom) return;

    const inspect = this.selectedHandCardZoom;
    this.deactivateInspectPreviewView(inspect);
    const items = [
      ...(inspect.items ?? []),
      inspect.root,
      inspect.overlay,
      inspect.glow,
      inspect.background,
      inspect.label,
      inspect.nameText,
      inspect.bodyText,
      inspect.cardNumberOverlay,
      inspect.selectionOutline,
      inspect.statBar,
      inspect.statBadges,
      inspect.art,
      ...(inspect.previewItems ?? []),
    ].filter(Boolean);
    this.tweens?.killTweensOf?.(items);
    this.selectedHandCardZoom = null;

    let destroyed = false;
    const destroyItems = () => {
      if (destroyed) return;
      destroyed = true;
      this.deactivateInspectPreviewView(inspect);
      inspect.overlay?.removeAllListeners?.();
      inspect.overlay?.destroy?.();
      if (typeof inspect.destroy === 'function') {
        inspect.destroy();
      } else {
        inspect.root?.destroy?.();
      }
    };

    if (!animate || !inspect.root?.active) {
      this.restoreInspectDimming();
      destroyItems();
      return;
    }

    this.time?.delayedCall?.(INSPECT_CARD_TWEEN_OUT_MS + 50, () => {
      if (destroyed) return;
      this.restoreInspectDimming();
      destroyItems();
    });
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
    const { width, height, hand, margin, board, topHero } = this.layout;
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
    const inspectSafeBottomLimitY = hand.y - margin;
    const tacticalBottomLimitY = Math.min(boardBottomLimitY, inspectSafeBottomLimitY, height - margin);
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
    this.updateTutorialFocus?.();
  }

  resetCardHighlights({ showPreview = true } = {}) {
    this.cardViews.forEach((card) => {
      if (card?.isActive === false || card?.root?.scene == null) return;
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
      const isBlockedEffectCard = Boolean(viewCard) && !this.openingMulliganPending && !this.isUnitCard(viewCard) && isEffectCardBlockedForOwner(this.gameState, 'player');
      const allTargets = [card.root, card.glow, card.background, card.label, card.selectionOutline, card.blockedOverlay, card.blockedIconBubble, card.blockedIcon].filter(Boolean);

      const accentColor = this.getHandCardAccentColor(viewCard);
      const frameFillColor = card.surfaceTheme?.frameFill ?? CARD_COLORS.frame;
      const frameSelectedFillColor = card.surfaceTheme?.frameSelectedFill ?? CARD_COLORS.frameSelected;

      this.tweens.killTweensOf(allTargets);
      const usesSelectionTreatment = isMulliganSelected || isGameplaySelected;
      const activeFrameStrokeWidth = usesSelectionTreatment ? MULLIGAN_SELECTION_BORDER_WIDTH_PX : 5;
      const activeGlowStrokeWidth = usesSelectionTreatment ? 0 : 5;
      const activeGlowStrokeAlpha = usesSelectionTreatment ? 0 : 0.65;
      const activeGlowFillAlpha = usesSelectionTreatment ? 0 : 0.12;
      const activeOutlineAlpha = usesSelectionTreatment ? 0 : 0.92;
      const activeFrameFillAlpha = usesSelectionTreatment ? 0.98 : 0.95;
      const activeFrameStrokeAlpha = usesSelectionTreatment ? 0.9 : 1;
      const selectedLift = isMulliganSelected ? MULLIGAN_HAND_CARD_SELECTED_LIFT_PX : HAND_CARD_SELECTED_LIFT_PX;
      const selectedDepth = isMulliganSelected ? MULLIGAN_HAND_CARD_SELECTED_DEPTH : HAND_CARD_SELECTED_DEPTH;

      card.background.setStrokeStyle(isActiveHandCard ? activeFrameStrokeWidth : 3, isActiveHandCard ? 0xfacc15 : accentColor, isActiveHandCard ? activeFrameStrokeAlpha : viewCard ? 0.76 : 0.7);
      card.background.setFillStyle(isActiveHandCard ? frameSelectedFillColor : frameFillColor, isActiveHandCard ? activeFrameFillAlpha : viewCard ? 0.74 : 0.48);
      card.glow.setStrokeStyle(isActiveHandCard ? activeGlowStrokeWidth : 0, 0xfacc15, isActiveHandCard ? activeGlowStrokeAlpha : 0);
      card.glow.setFillStyle(0xfacc15, isActiveHandCard ? activeGlowFillAlpha : 0);
      card.selectionOutline?.setStrokeStyle(isActiveHandCard ? activeGlowStrokeWidth : 0, 0xfacc15, isActiveHandCard ? activeOutlineAlpha : 0);
      card.label.setFontSize(card.baseFontSize);
      card.label.setColor(viewCard ? CARD_COLORS.ivoryText : CARD_COLORS.mutedText);

      card.blockedOverlay?.setVisible(Boolean(isBlockedEffectCard));
      card.blockedIconBubble?.setVisible(Boolean(isBlockedEffectCard));
      card.blockedIcon?.setVisible(Boolean(isBlockedEffectCard));
      card.blockedOverlay?.setAlpha(isBlockedEffectCard ? 0.3 : 0);
      card.blockedIconBubble?.setAlpha(isBlockedEffectCard ? 0.86 : 0);
      card.blockedIcon?.setAlpha(isBlockedEffectCard ? 0.92 : 0);
      card.root.setAlpha(viewCard ? (isBlockedEffectCard ? 0.68 : (isDimmedByActiveCard ? HAND_CARD_DIM_ALPHA : HAND_CARD_SELECTED_ALPHA)) : 0.45);
      card.root.setPosition(card.baseX, isActiveHandCard ? card.baseY - selectedLift : card.baseY).setScale(1).setDepth(isActiveHandCard ? selectedDepth : card.baseDepth);
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
      } else if (this.targetingState?.targetType === 'enemy-and-friendly-unit'
        && this.isValidTarget(cell.index, 'enemy-and-friendly-unit', selectedTargetIndexes, targetConstraint)) {
        strokeColor = selectedTargetIndexes.length === 0 ? 0xef4444 : 0x22c55e;
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
    if (!canPlayEffectCard(this.gameState, 'player', card).ok) return null;
    const targetingState = getTargetingStateForEffect(card.effectId, card.id, card.targeting);
    if (!targetingState) return null;
    if (card.effectId === 'enemy_up_to_2_atk_minus_1') {
      const targetLimit = targetingState.targetLimit ?? targetingState.requiredTargets ?? 1;
      const validTargetCount = this.gameState.board.filter((_unit, index) => (
        this.isValidTarget(index, targetingState.targetType, [], targetingState.targetConstraint)
      )).length;
      return {
        ...targetingState,
        requiredTargets: Math.min(targetLimit, validTargetCount),
        targetIndexes: [...(targetingState.targetIndexes ?? [])],
      };
    }
    return targetingState;
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
    if (targetConstraint === 'positive-attack' && getUnitAttack(unit) <= 0) return false;
    if (targetType === 'friendly-unit') return unit.owner === 'player';
    if (targetType === 'enemy-unit') return unit.owner === 'enemy';
    if (targetType === 'enemy-and-friendly-unit') {
      if (selectedTargetIndexes.length === 0) return unit.owner === 'enemy';
      if (selectedTargetIndexes.length === 1) return unit.owner === 'player';
      return false;
    }
    if (targetType === 'any-unit') {
      const firstSelectedIndex = selectedTargetIndexes[0];
      const firstSelectedUnit = this.gameState.board[firstSelectedIndex];
      return !firstSelectedUnit || firstSelectedUnit.owner === unit.owner;
    }
    return false;
  }

}
