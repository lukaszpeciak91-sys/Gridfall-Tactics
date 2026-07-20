import {
  BATTLE_EXHAUSTED_REQUIRED_FULL_PASS_ROUNDS,
  canPass,
  getEffectiveBoardArmor,
  getEffectiveBoardAttack,
  isBattleExhaustedEligible,
} from './GameState.js';
import { getActiveLocale } from '../localization/localeService.js';
import { loadSettings } from './settingsState.js';

const REPORT_VERSION = 1;
const REPORT_BOARD_INDEXES = Object.freeze([0, 1, 2, 6, 7, 8]);

const safe = (fn, fallback = null) => {
  try { return fn(); } catch { return fallback; }
};
const finite = (value) => (Number.isFinite(value) ? value : null);
const bool = (value) => Boolean(value);
const count = (value) => (Array.isArray(value) ? value.length : 0);
const compactString = (value) => (typeof value === 'string' && value.length > 0 ? value : null);
const sideCount = (side, key) => count(side?.[key]);
const unique = (items) => [...new Set(items.filter(Boolean))];
const isVisibleObject = (object) => Boolean(object && object.active !== false && object.visible !== false);

function readTextNumber(ref) {
  const raw = typeof ref?.text === 'string' ? ref.text : (typeof ref?.getText === 'function' ? safe(() => ref.getText(), null) : null);
  if (typeof raw !== 'string') return null;
  const match = raw.trim().match(/^-?\d+/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

export function readDisplayedBoardStats(scene, boardIndex) {
  const direct = scene?.displayedBoardStats?.[boardIndex] ?? scene?.boardDisplayedStats?.[boardIndex] ?? null;
  if (direct) return { attack: finite(direct.attack), armor: finite(direct.armor), health: finite(direct.health ?? direct.hp) };
  const refs = scene?.boardStatRefs?.[boardIndex] ?? scene?.boardCells?.find?.((cell) => cell?.index === boardIndex)?.statRefs ?? null;
  if (!refs) return { attack: null, armor: null, health: null };
  return {
    attack: readTextNumber(refs.attack ?? refs.attackText),
    armor: readTextNumber(refs.armor ?? refs.armorText),
    health: readTextNumber(refs.health ?? refs.hp ?? refs.healthText ?? refs.hpText),
  };
}

function readSceneKey(scene) {
  return compactString(scene?.sys?.settings?.key ?? scene?.scene?.key ?? scene?.key);
}

function readSceneManager(scene) {
  return safe(() => scene?.scene?.manager ?? scene?.sys?.game?.scene ?? scene?.game?.scene, null);
}

function sceneStatus(manager, key, methodName, propName) {
  return bool(safe(() => manager?.[methodName]?.(key), false) || safe(() => manager?.getScene?.(key)?.sys?.[propName]?.(), false));
}

function buildScenes(scene) {
  const manager = readSceneManager(scene);
  const allScenes = Array.isArray(manager?.scenes) ? manager.scenes : [];
  const entries = allScenes.map((entry) => readSceneKey(entry)).filter(Boolean).slice(-12);
  const activeSceneKeys = entries.filter((key) => sceneStatus(manager, key, 'isActive', 'isActive'));
  const pausedSceneKeys = entries.filter((key) => sceneStatus(manager, key, 'isPaused', 'isPaused'));
  const sleepingSceneKeys = entries.filter((key) => sceneStatus(manager, key, 'isSleeping', 'isSleeping'));
  const topSceneKey = compactString(safe(() => manager?.getScenes?.(true)?.at?.(-1)?.sys?.settings?.key, null))
    ?? activeSceneKeys.at(-1)
    ?? entries.at(-1)
    ?? null;
  const battleKey = 'BattleScene';
  return {
    topSceneKey,
    activeSceneKeys,
    pausedSceneKeys,
    sleepingSceneKeys,
    battleScene: {
      active: activeSceneKeys.includes(battleKey) || bool(safe(() => scene?.scene?.isActive?.(), scene?.sys?.isActive?.() ?? false)),
      paused: pausedSceneKeys.includes(battleKey) || bool(safe(() => scene?.scene?.isPaused?.(), scene?.sys?.isPaused?.() ?? false)),
      sleeping: sleepingSceneKeys.includes(battleKey),
    },
    overlays: {
      battleMenu: activeSceneKeys.includes('BattleMenuScene') || bool(safe(() => scene?.scene?.isActive?.('BattleMenuScene'), false)),
      settings: activeSceneKeys.includes('SettingsScene') || bool(safe(() => scene?.scene?.isActive?.('SettingsScene'), false)),
      rules: activeSceneKeys.includes('RulesPanelScene') || bool(safe(() => scene?.scene?.isActive?.('RulesPanelScene'), false)),
    },
  };
}

function buildEnvironment(scene, capturedAt) {
  const win = safe(() => globalThis.window, null);
  const doc = safe(() => globalThis.document, null);
  return {
    appVersion: compactString(safe(() => import.meta.env?.VITE_APP_VERSION, null)) ?? compactString(safe(() => globalThis.__APP_VERSION__, null)) ?? null,
    capturedAt,
    userAgent: compactString(safe(() => globalThis.navigator?.userAgent, null)),
    viewportWidth: finite(safe(() => win?.innerWidth, null)),
    viewportHeight: finite(safe(() => win?.innerHeight, null)),
    gameViewportWidth: finite(scene?.scale?.gameSize?.width ?? scene?.game?.scale?.gameSize?.width ?? scene?.game?.config?.width),
    gameViewportHeight: finite(scene?.scale?.gameSize?.height ?? scene?.game?.scale?.gameSize?.height ?? scene?.game?.config?.height),
    devicePixelRatio: finite(safe(() => win?.devicePixelRatio, null)),
    fullscreen: bool(safe(() => doc?.fullscreenElement, null) || scene?.scale?.isFullscreen),
    documentHidden: bool(safe(() => doc?.hidden, false)),
    locale: compactString(safe(() => getActiveLocale(), null)),
    sceneActive: bool(safe(() => scene?.scene?.isActive?.(), scene?.sys?.isActive?.() ?? false)),
    scenePaused: bool(safe(() => scene?.scene?.isPaused?.(), scene?.sys?.isPaused?.() ?? false)),
    sceneShutdown: bool(scene?.isShuttingDown ?? scene?.shutdownStarted ?? scene?.sceneShutdownStarted),
    battleSequence: finite(scene?.battleSequence ?? scene?.sessionBattleSequence ?? scene?.battleSessionSequence ?? scene?.sessionBattleSequenceNumber),
    latestLifecycleReason: compactString(scene?.openingRevealDiagLatestLifecycleReason ?? scene?.latestLifecycleRecoveryReason ?? scene?.lifecycleRecoveryReason),
  };
}

function buildBattle(scene) {
  const state = scene?.gameState ?? null;
  const mode = ['campaign', 'arena', 'tutorial'].includes(scene?.battleContext?.mode) ? scene.battleContext.mode : (scene?.battleContext?.mode ? 'other' : null);
  return {
    mode,
    sessionBattleSequenceNumber: finite(scene?.sessionBattleSequenceNumber),
    battleTransitionLaunchId: compactString(scene?.battleTransitionLaunchId ?? scene?.transitionLaunchId),
    battlegroundId: compactString(scene?.battleContext?.battlegroundId ?? scene?.battlegroundId),
    battleSceneCreatedAt: compactString(scene?.battleSceneCreatedAt ?? scene?.createdAt),
    sceneElapsedMs: finite(safe(() => scene?.getBattleReportElapsedMs?.(), null)) ?? finite(Date.now() - (scene?.battleReportStartedAt ?? scene?.battleSceneCreatedAtMs)),
    battleStartedAt: compactString(scene?.battleStartedAt),
    activeBattleElapsedMs: finite(scene?.activeBattleElapsedMs ?? safe(() => scene?.getActiveBattleElapsedMs?.(), null)),
    deterministicSeed: compactString(scene?.runtimeSeed ?? scene?.battleContext?.seed ?? scene?.gameState?.seed),
    playerFactionKey: compactString(state?.player?.factionKey ?? scene?.factionKey),
    enemyFactionKey: compactString(state?.enemy?.factionKey ?? scene?.enemyFactionKey),
    turnNumber: finite(state?.turn ?? state?.turnNumber),
    firstActor: compactString(state?.firstActor),
    actionableSide: compactString(scene?.currentActionableSide ?? state?.currentActor ?? state?.activeOwner),
    playerActionUsed: bool(scene?.playerActionUsed ?? state?.playerActionUsed),
    enemyActionUsed: bool(scene?.enemyActionUsed ?? state?.enemyActionUsed),
    playerBaseHp: finite(state?.playerHP),
    enemyBaseHp: finite(state?.enemyHP),
    playerHandCount: sideCount(state?.player, 'hand'),
    enemyHandCount: sideCount(state?.enemy, 'hand'),
    playerDeckCount: sideCount(state?.player, 'deck'),
    enemyDeckCount: sideCount(state?.enemy, 'deck'),
    playerDiscardCount: sideCount(state?.player, 'discard'),
    enemyDiscardCount: sideCount(state?.enemy, 'discard'),
    winner: compactString(state?.winner),
    endingReason: compactString(state?.endingReason),
    resultModalPending: bool(scene?.battleResultModalPending ?? scene?.resultModalPending),
    resultModalShown: bool(scene?.battleResultModalShown),
    heroDeathResolvedBy: compactString(state?.heroDeathResolvedBy),
    turnCapResolvedBy: compactString(state?.turnCapResolvedBy),
    noProgressResolvedBy: compactString(state?.noProgressResolvedBy),
    resourceExhaustionResolvedBy: compactString(state?.resourceExhaustionResolvedBy),
    battleExhaustedResolvedBy: compactString(state?.battleExhaustedResolvedBy),
  };
}

function buildPassSurrender(scene) {
  const state = scene?.gameState ?? null;
  return {
    battleExhaustedEligible: bool(isBattleExhaustedEligible(state)),
    pendingPassOwner: compactString(state?.battleExhausted?.pendingPassOwner),
    fullPassRounds: finite(state?.battleExhausted?.fullPassRounds) ?? 0,
    requiredFullPassRounds: BATTLE_EXHAUSTED_REQUIRED_FULL_PASS_ROUNDS,
    playerPassAvailable: bool(canPass(state) && !scene?.playerActionUsed),
    playerBasePassBlocked: bool(scene?.openingMulliganPending || scene?.deckInfoPanel || scene?.utilityMenuPanel || state?.winner),
    holdSurrenderArmed: bool(scene?.passHoldToSurrenderEnabled),
    holdSurrenderActive: bool(scene?.passHoldToSurrenderProgress || scene?.passHoldToSurrenderEvent),
    menuSurrenderConfirmationOpen: bool(scene?.surrenderConfirmationModal),
    safelyConcedableForPlayer: bool(safe(() => scene?.canHoldPassToSurrender?.(), false) || (!state?.winner && !scene?.battleResultModalShown)),
    surrenderEndingSource: compactString(scene?.surrenderEndingSource),
    surrenderEndingReason: state?.endingReason?.includes?.('surrender') ? state.endingReason : null,
  };
}

function buildFlow(scene, battle) {
  const t = scene?.targetingState ?? null;
  const c = scene?.effectCastState ?? null;
  return {
    isFlowResolving: bool(scene?.isFlowResolving ?? scene?.flowResolving ?? scene?.isActionResolving),
    isEffectCastResolving: bool(scene?.isEffectCastResolving),
    effectCast: c ? { source: compactString(c.source), cardId: compactString(c.cardId ?? c.card?.id), effectId: compactString(c.effectId ?? c.card?.effectId) } : null,
    targetingActive: bool(t),
    targeting: t ? { source: compactString(t.source), cardId: compactString(t.cardId), effectId: compactString(t.effectId), selectedTargetIndexes: (t.targetIndexes ?? []).filter(Number.isInteger), selectedTargetCount: count(t.targetIndexes), validTargetCount: count(t.validTargetIndexes ?? t.availableTargetIndexes) } : null,
    selectedCardId: compactString(scene?.selectedCardId),
    pendingSwapIndex: finite(scene?.pendingSwapIndex),
    handInspectActive: bool(scene?.hoverInspectCardId || scene?.inspectCardId || scene?.handInspectOverlay || scene?.zoomedCardView),
    boardInspectIndex: finite(scene?.boardInspectIndex),
    deckPanelOpen: bool(scene?.deckInfoPanel),
    utilityMenuOpen: bool(scene?.utilityMenuPanel),
    settingsOverlayOpen: bool(safe(() => scene?.scene?.isActive?.('SettingsScene'), false)),
    rulesOverlayOpen: bool(safe(() => scene?.scene?.isActive?.('RulesPanelScene'), false)),
    battleMenuOverlayOpen: bool(safe(() => scene?.scene?.isActive?.('BattleMenuScene'), false)),
    activeSelectionBannerPresent: isVisibleObject(scene?.selectionBanner ?? scene?.selectionBannerText),
    turnStartBannerPresent: isVisibleObject(scene?.turnStartBanner ?? scene?.turnStartBannerText),
    invalidActionBannerPresent: isVisibleObject(scene?.invalidActionBanner ?? scene?.invalidActionFeedbackText),
    battleResultPending: battle.resultModalPending,
    battleResultShown: battle.resultModalShown,
    openingMulliganActive: bool(scene?.openingMulliganPending),
  };
}

function buildReveal(scene) {
  const current = safe(() => scene?.collectOpeningRevealDiagnosticSnapshot?.(), null);
  const failure = scene?.openingRevealDiagFailureSnapshot ?? null;
  return {
    openingBattlePresentationStarted: bool(scene?.openingBattlePresentationStarted),
    waitingForTransitionPresentation: bool(scene?.waitingForTransitionPresentation),
    transitionLaunchId: compactString(scene?.transitionLaunchId ?? scene?.battleTransitionLaunchId),
    openingMulliganPending: bool(scene?.openingMulliganPending),
    revealPending: bool(scene?.openingMulliganRevealPending),
    revealGeneration: finite(scene?.openingMulliganRevealGeneration),
    revealVisibleCount: finite(scene?.openingMulliganRevealVisibleCount),
    currentRevealCount: finite(safe(() => scene?.getOpeningMulliganRevealCardCount?.(), null)),
    cardViewCount: count(scene?.cardViews),
    retainedRevealBackCount: finite(current?.retainedBackCount) ?? count(safe(() => scene?.getOpeningMulliganRetainedBackControllers?.(), [])),
    revealControllerCount: finite(current?.revealControllerCount) ?? count(scene?.openingMulliganRevealControllers),
    revealControllerTypes: unique((scene?.openingMulliganRevealControllers ?? []).map((item) => compactString(item?.type ?? item?.constructor?.name))),
    invalidHiddenFrontCount: finite(current?.invalidHiddenFrontCount) ?? finite(scene?.openingRevealInvalidHiddenFrontCount) ?? 0,
    revealSfxPathReached: bool(scene?.openingRevealSfxPathReached ?? safe(() => scene?.hasOpeningRevealDiagEvent?.('reveal-sfx-path-reached'), false)),
    revealSfxDispatchCalled: bool(scene?.openingRevealSfxDispatchCalled ?? safe(() => scene?.hasOpeningRevealDiagEvent?.('reveal-sfx-dispatch'), false)),
    firstRevealSfxRequestTimestamp: finite(scene?.openingRevealDiagFirstSfxRequestedAt),
    diagnosticFailureCaptured: bool(scene?.openingRevealDiagFailureCaptured),
    latestDiagnosticFailureReason: compactString(failure?.reason ?? scene?.openingRevealDiagLatestFailureReason),
  };
}

function buildBoard(scene) {
  const state = scene?.gameState ?? null;
  return REPORT_BOARD_INDEXES.map((index) => {
    const unit = state?.board?.[index] ?? null;
    if (!unit) return { index, occupied: false };
    const liveAttack = finite(safe(() => getEffectiveBoardAttack(state, index), null));
    const liveArmor = finite(safe(() => getEffectiveBoardArmor(state, index), null));
    const displayed = readDisplayedBoardStats(scene, index);
    const presentation = unit.__presentationStats ?? scene?.currentBoardRenderStats?.[index] ?? scene?.lastRenderedBoardStats?.[index] ?? null;
    const slot = {
      index, occupied: true, owner: compactString(unit.owner), cardId: compactString(unit.cardId ?? unit.id), effectId: compactString(unit.effectId),
      generated: bool(unit.generated || unit.isGenerated || unit.token || unit.isToken), baseAttack: finite(unit.attack), baseArmor: finite(unit.armor), currentHp: finite(unit.hp), currentMaxHp: finite(unit.maxHp),
      liveAttack, liveArmor, displayedAttack: displayed.attack, displayedArmor: displayed.armor, displayedHp: displayed.health,
      presentationAttack: finite(presentation?.attack), presentationArmor: finite(presentation?.armor), presentationHp: finite(presentation?.health ?? presentation?.hp),
      offline: bool(unit.offline || unit.reserved || scene?.offlineBoardIndexes?.has?.(index)), tempAttackMod: finite(unit.tempAttackMod) ?? 0, tempArmorMod: finite(unit.tempArmorMod) ?? 0, tempHpMod: finite(unit.tempHpMod) ?? 0,
      attackSetToZero: bool(unit.tempAttackSetToZeroUntilCombat), attackCap: finite(unit.tempAttackMaxUntilCombat), lastStand: bool(unit.cannotDropBelowOneThisTurn || unit.cannotDropBelowOne || unit.lastStand),
      decayAttackAfterCombat: bool(unit.effectId === 'decay_attack_after_combat' || unit.attackDecayAfterCombat), decayHpAfterCombat: bool(unit.effectId === 'decay_hp_after_combat' || unit.hpDecayAfterCombat), temporaryFloodToken: bool(unit.temporaryFloodToken || unit.floodToken),
    };
    if (Number.isFinite(slot.displayedAttack) && Number.isFinite(liveAttack)) slot.displayAttackMismatch = slot.displayedAttack !== liveAttack;
    if (Number.isFinite(slot.displayedArmor) && Number.isFinite(liveArmor)) slot.displayArmorMismatch = slot.displayedArmor !== liveArmor;
    if (Number.isFinite(slot.presentationAttack) && Number.isFinite(liveAttack)) slot.presentationAttackMismatch = slot.presentationAttack !== liveAttack;
    return slot;
  });
}

function readAudioContextState(scene) {
  const state = safe(() => scene?.sound?.context?.state ?? scene?.game?.sound?.context?.state, null);
  return ['running', 'suspended', 'closed'].includes(state) ? state : 'unknown';
}

function buildAudio(scene) {
  const settings = safe(() => loadSettings(), { muted: false, musicVolume: null, sfxVolume: null });
  const sound = scene?.sound ?? scene?.game?.sound ?? null;
  const rawEvents = Array.isArray(scene?.battleReportAudioEvents) ? scene.battleReportAudioEvents : [];
  const recentEvents = rawEvents.slice(Math.max(0, rawEvents.length - 12)).map((event) => ({
    t: finite(event?.t) ?? 0,
    name: compactString(event?.name),
    details: compactEventDetails(event?.details),
  })).filter((event) => event.name);
  const diagState = scene?.battleReportAudioState ?? {};
  return {
    settings: {
      muted: bool(settings.muted),
      musicVolume: finite(settings.musicVolume),
      sfxVolume: finite(settings.sfxVolume),
      masterClamp: finite(sound?.volume),
      loaded: Boolean(settings),
    },
    state: {
      soundSystemAvailable: bool(scene?.sound?.play || scene?.sound?.add || scene?.game?.sound),
      audioContextState: compactString(diagState.audioContextState) ?? readAudioContextState(scene),
      gameSoundMuted: typeof sound?.mute === 'boolean' ? sound.mute : null,
      battleAmbienceActive: bool(scene?.battleReportAudioState?.battleAmbienceActive),
      battleAmbienceStopping: bool(scene?.battleAmbienceStopping),
      menuMusicActive: bool(scene?.menuMusic?.isPlaying ?? scene?.activeMenuMusic?.isPlaying),
      outcomeStingerActive: bool(scene?.activeOutcomeStinger?.sound?.isPlaying ?? diagState.outcomeStingerActive),
      outcomeStingerKey: compactString(scene?.activeOutcomeStinger?.key ?? diagState.outcomeStingerKey),
      lastRequestedSfxKey: compactString(diagState.lastRequestedSfxKey),
      lastSuccessfullyDispatchedSfxKey: compactString(diagState.lastDispatchedSfxKey),
      lastBlockedOrSkippedSfxKey: compactString(diagState.lastSkippedSfxKey),
      lastBlockOrSkipReason: compactString(diagState.lastSkipReason),
      lastAudioEventAtMs: finite(diagState.lastAudioEventAtMs),
    },
    recentEvents,
  };
}

function compactEventDetails(details) {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return {};
  const out = {};
  Object.entries(details).forEach(([key, value]) => {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') out[key] = typeof value === 'string' && value.length > 96 ? value.slice(0, 96) : value;
    else if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
    else if (Array.isArray(value)) {
      const compact = value.slice(0, 8).map((item) => {
        if (item === null || typeof item === 'string' || typeof item === 'boolean') return item;
        if (typeof item === 'number' && Number.isFinite(item)) return item;
        if (item && typeof item === 'object') {
          const child = {};
          Object.entries(item).slice(0, 6).forEach(([childKey, childValue]) => {
            if (childValue === null || typeof childValue === 'string' || typeof childValue === 'boolean') child[childKey] = childValue;
            else if (typeof childValue === 'number' && Number.isFinite(childValue)) child[childKey] = childValue;
          });
          return Object.keys(child).length ? child : null;
        }
        return null;
      }).filter((item) => item !== null && item !== undefined);
      if (compact.length) out[key] = compact;
    }
  });
  return out;
}

function buildEvents(scene) {
  const limit = Number.isFinite(scene?.getBattleReportEventLimit?.()) ? scene.getBattleReportEventLimit() : 32;
  const events = Array.isArray(scene?.battleReportEvents) ? scene.battleReportEvents : [];
  return events.slice(Math.max(0, events.length - limit), events.length).map((event) => ({
    t: finite(event?.t) ?? 0,
    name: compactString(event?.name),
    details: compactEventDetails(event?.details),
  })).filter((event) => event.name);
}


function buildCapture(scene, capturedAt, options = {}, flow = {}) {
  const source = compactString(options?.captureSource) ?? 'unknown';
  const inCombat = bool(scene?.combatInProgress ?? scene?.isCombatResolving ?? scene?.currentCombatAnimation ?? flow.isFlowResolving);
  const duringResult = bool(scene?.battleResultModalPending ?? scene?.battleResultModalShown ?? scene?.gameState?.winner);
  const duringAi = bool(scene?.aiActionInProgress ?? scene?.enemyActionResolving ?? scene?.currentActionableSide === 'enemy' ?? scene?.gameState?.currentActor === 'enemy');
  const duringOpening = bool(scene?.openingMulliganPending || scene?.openingMulliganRevealPending);
  const pausedOverlay = bool(flow.utilityMenuOpen || flow.settingsOverlayOpen || flow.rulesOverlayOpen || flow.battleMenuOverlayOpen || scene?.scene?.isPaused?.());
  return {
    captureSource: source,
    capturedAt,
    sceneElapsedMs: finite(safe(() => scene?.getBattleReportElapsedMs?.(), null)) ?? finite(Date.now() - (scene?.battleReportStartedAt ?? Date.now())),
    phases: {
      openingMulligan: duringOpening,
      playerAction: bool(!duringOpening && !duringAi && !inCombat && !duringResult && (scene?.currentActionableSide === 'player' || scene?.gameState?.currentActor === 'player')),
      aiAction: duringAi,
      combat: inCombat,
      resultFlow: duringResult,
      pausedOverlay,
    },
  };
}

function buildAssets(scene, audio) {
  const recorded = Array.isArray(scene?.battleReportAssetFailures) ? scene.battleReportAssetFailures : [];
  const recentRecorded = recorded.slice(-8).map((item) => ({
    t: finite(item?.t) ?? 0,
    type: compactString(item?.type),
    cardId: compactString(item?.cardId),
    key: compactString(item?.key),
    reason: compactString(item?.reason),
  })).filter((item) => item.type && item.reason);
  const audioFailures = (audio?.recentEvents ?? [])
    .filter((event) => event.name === 'audio-sfx-skipped' && ['KEY_MISSING', 'ASSET_NOT_LOADED'].includes(event.details?.reason))
    .map((event) => ({ t: finite(event.t) ?? 0, type: 'audio', key: compactString(event.details?.key), reason: compactString(event.details?.reason) }))
    .filter((item) => item.key);
  return { recentFailures: [...recentRecorded, ...audioFailures].slice(-8) };
}

function buildSummary({ warnings, battle, scenes }) {
  return {
    warningCount: count(warnings),
    mode: battle.mode,
    battleSequence: battle.sessionBattleSequenceNumber,
    turn: battle.turnNumber,
    playerFaction: battle.playerFactionKey,
    enemyFaction: battle.enemyFactionKey,
    battlegroundId: battle.battlegroundId,
    topSceneKey: scenes.topSceneKey,
    battleSceneStatus: { ...scenes.battleScene },
  };
}

function generateWarnings(scene, { environment, battle, flow, reveal, board, audio }) {
  const warnings = [];
  const transient = flow.isFlowResolving || flow.isEffectCastResolving || reveal.revealPending || flow.openingMulliganActive;
  if (reveal.retainedRevealBackCount > 0) warnings.push('OPENING_REVEAL_BACKS_REMAIN');
  if (reveal.invalidHiddenFrontCount > 0) warnings.push('OPENING_REVEAL_HIDDEN_FRONTS');
  if (reveal.revealPending && reveal.currentRevealCount > 0 && reveal.revealVisibleCount === 0 && !reveal.revealSfxDispatchCalled) warnings.push('OPENING_REVEAL_NO_PROGRESS');
  if (!transient) {
    if (board.some((s) => s.displayAttackMismatch)) warnings.push('DISPLAY_ATTACK_DIFFERS_FROM_LIVE');
    if (board.some((s) => s.displayArmorMismatch)) warnings.push('DISPLAY_ARMOR_DIFFERS_FROM_LIVE');
    if (board.some((s) => s.presentationAttackMismatch)) warnings.push('PRESENTATION_ATTACK_DIFFERS_FROM_LIVE');
  }
  if (flow.targetingActive && flow.targeting?.validTargetCount === 0) warnings.push('TARGETING_WITHOUT_VALID_TARGETS');
  if (flow.isEffectCastResolving && !flow.effectCast) warnings.push('EFFECT_CAST_RESOLVING_WITHOUT_CAST_STATE');
  if (flow.effectCast && !flow.isEffectCastResolving && !flow.targetingActive) warnings.push('CAST_STATE_WITHOUT_EFFECT_RESOLUTION');
  if (battle.resultModalPending && !battle.resultModalShown) warnings.push('RESULT_PENDING_MODAL_MISSING');
  if (battle.winner && !battle.resultModalPending && !battle.resultModalShown) warnings.push('WINNER_WITHOUT_RESULT_FLOW');
  if (environment.scenePaused && !(flow.utilityMenuOpen || flow.settingsOverlayOpen || flow.rulesOverlayOpen || flow.battleMenuOverlayOpen || battle.resultModalShown)) warnings.push('BATTLESCENE_PAUSED_WITHOUT_OVERLAY');
  if (battle.playerBaseHp <= 0 && battle.enemyBaseHp <= 0 && battle.winner && battle.winner !== 'draw') warnings.push('SIMULTANEOUS_LETHAL_NOT_DRAW');
  if (scene?.zeroTargetGlobalDamageActionObserved === true) warnings.push('ZERO_TARGET_GLOBAL_DAMAGE_ACTION_OBSERVED');
  if (reveal.revealSfxPathReached && !reveal.revealSfxDispatchCalled) warnings.push('REVEAL_SFX_REQUESTED_NOT_DISPATCHED');
  if (audio?.state?.audioContextState === 'suspended' && environment.sceneActive) warnings.push('AUDIO_CONTEXT_SUSPENDED_WHILE_ACTIVE');
  if (audio?.recentEvents?.some?.((event) => event.name === 'audio-sfx-skipped' && event.details?.reason === 'COOLDOWN_ACTIVE')) warnings.push('SFX_BLOCKED_BY_COOLDOWN');
  if (audio?.recentEvents?.some?.((event) => event.name === 'audio-sfx-skipped' && event.details?.reason === 'KEY_MISSING')) warnings.push('SFX_KEY_MISSING');
  if (audio?.recentEvents?.some?.((event) => event.name === 'audio-sfx-skipped' && event.details?.reason === 'ASSET_NOT_LOADED')) warnings.push('SFX_ASSET_NOT_LOADED');
  if (!battle.resultModalShown && audio?.state?.outcomeStingerActive) warnings.push('OUTCOME_STINGER_ACTIVE_AFTER_RESULT_EXIT');
  return unique(warnings);
}

export function buildBattleReportSnapshot(scene = null, options = {}) {
  const capturedAt = new Date().toISOString();
  const environment = buildEnvironment(scene, capturedAt);
  const battle = buildBattle(scene);
  const passSurrender = buildPassSurrender(scene);
  const flow = buildFlow(scene, battle);
  const reveal = buildReveal(scene);
  const board = buildBoard(scene);
  const events = buildEvents(scene);
  const audio = buildAudio(scene);
  const scenes = buildScenes(scene);
  const capture = buildCapture(scene, capturedAt, options, flow);
  const assets = buildAssets(scene, audio);
  const battleWithPass = { ...battle, passSurrender };
  const warnings = generateWarnings(scene, { environment, battle, flow, reveal, board, audio });
  const summary = buildSummary({ warnings, battle: battleWithPass, scenes });
  return { version: REPORT_VERSION, capturedAt, environment, battle: battleWithPass, flow, reveal, board, audio, scenes, capture, assets, events, warnings, summary };
}
