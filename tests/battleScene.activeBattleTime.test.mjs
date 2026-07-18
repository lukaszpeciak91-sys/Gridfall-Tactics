import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

function extractMethodBody(methodName, nextMethodName) {
  let start = source.indexOf(`  ${methodName}(`);
  if (start < 0) start = source.indexOf(`  async ${methodName}(`);
  const end = source.indexOf(`  ${nextMethodName}(`, start + 1);
  assert.ok(start >= 0 && end > start, `${methodName} body should be present`);
  return source.slice(start, end);
}

test('active battle time does not start during create and starts after mulligan enters normal play', () => {
  const createBody = extractMethodBody('create', 'beginOpeningBattlePresentation');
  assert.doesNotMatch(createBody, /startCampaignBattleTimer\(\)|startActiveBattleTimer\(\)/);
  const mulliganBody = extractMethodBody('confirmOpeningMulligan', 'resetOpeningMulliganInputState');
  assert.ok(mulliganBody.indexOf('this.openingMulliganPending = false;') < mulliganBody.indexOf('this.startCampaignBattleTimer();'));
  assert.ok(mulliganBody.indexOf('this.startCampaignBattleTimer();') < mulliganBody.indexOf('this.startTurn();'));
});

test('active battle timer starts before first turn can enter flow resolution', () => {
  const mulliganBody = extractMethodBody('confirmOpeningMulligan', 'resetOpeningMulliganInputState');
  assert.ok(
    mulliganBody.indexOf('this.startCampaignBattleTimer();') < mulliganBody.indexOf('this.startTurn();'),
    'timer must be running before enemy-first startTurn sets isFlowResolving',
  );
  assert.match(extractMethodBody('startTurn', 'evaluateAndShowPlayerConcedableInfoBanner'), /if \(this\.gameState\.firstActor === 'enemy'\) \{\s*this\.resolveEnemyFirstTurnOpening\(\);\s*\}/);
});

test('segmented active timer is idempotent and excludes closed intervals', () => {
  const startBody = extractMethodBody('startActiveBattleTimer', 'pauseActiveBattleTimer');
  const pauseBody = extractMethodBody('pauseActiveBattleTimer', 'resumeActiveBattleTimer');
  const resumeBody = extractMethodBody('resumeActiveBattleTimer', 'stopActiveBattleTimer');
  assert.match(startBody, /if \(this\.battleStartedAt !== null \|\| !this\.isActiveBattleTimerPlayable\(\)\) return;/);
  assert.match(pauseBody, /if \(!Number\.isFinite\(this\.activeBattleTimerStartedAt\)\) return;/);
  assert.match(pauseBody, /this\.activeBattleDurationMs \+= Math\.max\(0, now - this\.activeBattleTimerStartedAt\);/);
  assert.match(pauseBody, /this\.activeBattleTimerStartedAt = null;/);
  assert.match(resumeBody, /Number\.isFinite\(this\.activeBattleTimerStartedAt\)/);
  assert.match(resumeBody, /if \(!this\.isActiveBattleTimerPlayable\(\)\) return;/);
});

test('playability gate allows tutorial after ready checkpoint while preserving normal mulligan and global blockers', () => {
  const playableBody = extractMethodBody('isActiveBattleTimerPlayable', 'markTutorialActiveBattleTimerReady');
  assert.match(playableBody, /const isTutorial = this\.isTutorialBattle\?\.\(\) === true;/);
  assert.match(playableBody, /if \(isTutorial\) \{\s*if \(!this\.tutorialActiveBattleTimerReady\) return false;\s*\} else if \(this\.openingMulliganPending \|\| this\.openingMulliganRevealPending\) \{/);
  assert.doesNotMatch(playableBody, /if \(this\.isTutorialBattle\?\.\(\)\) return false;/);
  assert.match(playableBody, /this\.gameState\.winner/);
  assert.match(playableBody, /this\.battleResultModalShown \|\| this\.battleResultModalPending \|\| this\.isFlowResolving/);
  assert.match(playableBody, /this\.utilityMenuPanel \|\| this\.surrenderConfirmationModal \|\| this\.navigationInProgress/);
  assert.match(playableBody, /this\.isDocumentHiddenForActiveBattleTime\(\)/);
  assert.match(playableBody, /this\.scene\?\.isPaused\?\.\(\) \|\| this\.scene\?\.isSleeping\?\.\(\)/);
});

test('pause, sleep, lifecycle, fullscreen recovery, and blocking overlays use central timer guards', () => {
  assert.match(extractMethodBody('onScenePause', 'onSceneSleep'), /this\.pauseCampaignBattleTimer\(\);/);
  assert.match(extractMethodBody('onSceneSleep', 'onSceneResume'), /this\.pauseCampaignBattleTimer\(\);/);
  assert.match(extractMethodBody('onSceneResume', 'onSceneWake'), /this\.resumeCampaignBattleTimer\(\);[\s\S]*recoverFromLifecycle\('scene-resume'\)/);
  assert.match(extractMethodBody('onSceneWake', 'onFullscreenChanged'), /this\.resumeCampaignBattleTimer\(\);[\s\S]*recoverFromLifecycle\('scene-wake'\)/);
  assert.match(extractMethodBody('recoverFromLifecycle', 'normalizeLifecycleUiState'), /lifecyclePauseReasons[\s\S]*this\.pauseActiveBattleTimer\(\);/);
  assert.match(extractMethodBody('recoverFromLifecycle', 'normalizeLifecycleUiState'), /this\.startCampaignBattleTimer\(\);[\s\S]*this\.resumeCampaignBattleTimer\(\);/);
  assert.match(extractMethodBody('onFullscreenChanged', 'onTutorialDocumentFullscreenChanged'), /recoverFromLifecycle/);
  assert.match(extractMethodBody('showUtilityMenuPanel', 'openSurrenderConfirmationFromUtilityMenu'), /this\.pauseActiveBattleTimer\(\);/);
  assert.match(extractMethodBody('destroyUtilityMenuPanel', 'guardPointerEvent'), /!this\.navigationInProgress[\s\S]*this\.resumeActiveBattleTimer\(\)/);
  assert.match(extractMethodBody('showSurrenderConfirmation', 'createSurrenderConfirmationButton'), /this\.pauseActiveBattleTimer\(\);/);
});

test('finalization commits active duration exactly once before achievement evaluation including tutorial battles', () => {
  const finalizerBody = extractMethodBody('finalizeActiveBattleTimeOnce', 'trackTutorialCompletionOnce');
  const scheduleBody = extractMethodBody('scheduleBattleResultModal', 'disableResultPendingOverlayInteractions');
  assert.match(finalizerBody, /if \(this\.activeBattleTimeCommitted \|\| !this\.gameState\?\.winner\) return false;/);
  assert.match(finalizerBody, /this\.activeBattleTimeCommitted = true;/);
  assert.match(finalizerBody, /const durationMs = this\.stopCampaignBattleTimer\(\);/);
  assert.match(finalizerBody, /if \(durationMs <= 0\) return false;/);
  assert.doesNotMatch(finalizerBody, /isTutorialBattle/);
  assert.match(finalizerBody, /addActiveBattleTime\(loadPlayerStats\(\), durationMs\)/);
  assert.ok(scheduleBody.indexOf('const activeBattleTimeTracked = this.finalizeActiveBattleTimeOnce();') < scheduleBody.indexOf('const tutorialStatsTracked = this.trackTutorialCompletionOnce();'));
  assert.ok(scheduleBody.indexOf('const battleStatsTracked = this.trackCompletedBattleStatsOnce();') < scheduleBody.indexOf('evaluateAndPersistAchievementUnlocks();'));
  assert.doesNotMatch(extractMethodBody('showBattleResultModal', 'createResultModalButton'), /finalizeActiveBattleTimeOnce|addActiveBattleTime/);
  assert.match(source, /resetRuntimeState\(\) \{[\s\S]*this\.activeBattleTimeCommitted = false;[\s\S]*\n  \}/);
});


test('tutorial active timer starts at completed reveal with tutorial UI ready, not during early create', () => {
  const createBody = extractMethodBody('create', 'beginOpeningBattlePresentation');
  const completeRevealBody = extractMethodBody('completeOpeningMulliganReveal', 'clearHandPanelViews');
  const readyBody = extractMethodBody('markTutorialActiveBattleTimerReady', 'startActiveBattleTimer');

  assert.match(createBody, /this\.tutorialActiveBattleTimerReady = false;/);
  assert.doesNotMatch(createBody, /markTutorialActiveBattleTimerReady\?\.\(\)|markTutorialActiveBattleTimerReady\(\)/);
  assert.ok(
    completeRevealBody.indexOf('this.openingMulliganRevealPending = false;') < completeRevealBody.indexOf('this.updateTutorialBanner?.();'),
    'tutorial banner refresh happens after reveal/setup is complete',
  );
  assert.ok(
    completeRevealBody.indexOf('this.updateTutorialBanner?.();') < completeRevealBody.indexOf('this.markTutorialActiveBattleTimerReady?.();'),
    'timer checkpoint runs after the first ready instruction banner can exist',
  );
  assert.match(readyBody, /!this\.tutorialControllerState \|\| !this\.layout \|\| !this\.tutorialBanner\?\.active/);
  assert.match(readyBody, /this\.tutorialActiveBattleTimerReady = true;[\s\S]*this\.startCampaignBattleTimer\(\);/);
});

test('tutorial active-time source preserves counters isolation and result rebuild safety', () => {
  const statsBody = extractMethodBody('trackCompletedBattleStatsOnce', 'scheduleBattleResultModal');
  const resultRestoreBody = extractMethodBody('restoreResultOverlayFromSnapshot', 'rebuildBattleView');
  const resultModalBody = extractMethodBody('showBattleResultModal', 'createResultModalButton');
  assert.match(statsBody, /this\.isTutorialBattle\(\) \? null : 'arena'/);
  assert.doesNotMatch(resultRestoreBody, /finalizeActiveBattleTimeOnce|addActiveBattleTime/);
  assert.doesNotMatch(resultModalBody, /finalizeActiveBattleTimeOnce|addActiveBattleTime/);
});

function extractMethodFunction(methodName, nextMethodName) {
  const methodSource = extractMethodBody(methodName, nextMethodName);
  const bodyStart = methodSource.indexOf('{');
  const bodyEnd = methodSource.lastIndexOf('}');
  assert.ok(bodyStart > 0 && bodyEnd > bodyStart, `${methodName} function body should parse`);
  return Function(methodSource.slice(bodyStart + 1, bodyEnd));
}

function createActiveTimerHarness({ tutorial = true } = {}) {
  let now = 0;
  const harness = {
    gameState: { winner: null },
    battleStartedAt: null,
    battleEndedAt: null,
    activeBattleDurationMs: 0,
    activeBattleTimerStartedAt: null,
    activeBattleTimeCommitted: false,
    tutorialActiveBattleTimerReady: false,
    openingMulliganPending: true,
    openingMulliganRevealPending: true,
    battleResultModalShown: false,
    battleResultModalPending: false,
    isFlowResolving: false,
    utilityMenuPanel: null,
    surrenderConfirmationModal: null,
    navigationInProgress: false,
    scene: {
      isPaused: () => false,
      isSleeping: () => false,
      isActive: () => true,
    },
    isTutorialBattle: () => tutorial,
    getActiveBattleTimestamp: () => now,
    isDocumentHiddenForActiveBattleTime: () => Boolean(globalThis.document?.hidden),
  };
  harness.isActiveBattleTimerPlayable = extractMethodFunction('isActiveBattleTimerPlayable', 'markTutorialActiveBattleTimerReady').bind(harness);
  harness.startActiveBattleTimer = extractMethodFunction('startActiveBattleTimer', 'pauseActiveBattleTimer').bind(harness);
  harness.pauseActiveBattleTimer = extractMethodFunction('pauseActiveBattleTimer', 'resumeActiveBattleTimer').bind(harness);
  harness.resumeActiveBattleTimer = extractMethodFunction('resumeActiveBattleTimer', 'stopActiveBattleTimer').bind(harness);
  harness.stopActiveBattleTimer = extractMethodFunction('stopActiveBattleTimer', 'startCampaignBattleTimer').bind(harness);
  harness.getActiveBattleDurationMs = extractMethodFunction('getActiveBattleDurationMs', 'formatBattleDuration').bind(harness);
  return { harness, setNow: (value) => { now = value; } };
}

test('deterministic tutorial active timer counts instruction gate time and excludes pause/background/overlay segments', () => {
  const originalDocument = globalThis.document;
  const documentState = { hidden: false };
  globalThis.document = documentState;
  try {
    const { harness, setNow } = createActiveTimerHarness({ tutorial: true });
    setNow(1000);
    harness.startActiveBattleTimer();
    assert.equal(harness.battleStartedAt, null, 'tutorial timer must not start before ready checkpoint');

    harness.tutorialActiveBattleTimerReady = true;
    harness.openingMulliganRevealPending = false;
    harness.startActiveBattleTimer();
    assert.equal(harness.battleStartedAt, 1000);

    setNow(11000);
    assert.equal(harness.getActiveBattleDurationMs(), 10000, 'instructional gate time is active tutorial time');

    harness.pauseActiveBattleTimer();
    setNow(21000);
    assert.equal(harness.getActiveBattleDurationMs(), 10000, 'scene pause/sleep interval stays excluded while segment is closed');
    harness.resumeActiveBattleTimer();
    setNow(26000);
    assert.equal(harness.getActiveBattleDurationMs(), 15000);

    documentState.hidden = true;
    harness.pauseActiveBattleTimer();
    setNow(36000);
    assert.equal(harness.isActiveBattleTimerPlayable(), false);
    assert.equal(harness.getActiveBattleDurationMs(), 15000, 'background hidden interval is excluded');
    documentState.hidden = false;
    harness.resumeActiveBattleTimer();

    setNow(41000);
    harness.utilityMenuPanel = {};
    harness.pauseActiveBattleTimer();
    setNow(51000);
    assert.equal(harness.isActiveBattleTimerPlayable(), false);
    assert.equal(harness.getActiveBattleDurationMs(), 20000, 'external menu/settings overlay interval is excluded');
    harness.utilityMenuPanel = null;
    harness.resumeActiveBattleTimer();

    setNow(56000);
    harness.gameState.winner = 'player';
    const duration = harness.stopActiveBattleTimer();
    assert.equal(duration, 25000, 'result finalization closes the last active segment');
    setNow(66000);
    assert.equal(harness.getActiveBattleDurationMs(), 25000, 'result modal waiting time is excluded after stop');
  } finally {
    globalThis.document = originalDocument;
  }
});

test('deterministic normal battle timer still waits for post-mulligan checkpoint', () => {
  const { harness, setNow } = createActiveTimerHarness({ tutorial: false });
  setNow(500);
  harness.startActiveBattleTimer();
  assert.equal(harness.battleStartedAt, null);
  harness.openingMulliganPending = false;
  harness.openingMulliganRevealPending = false;
  setNow(1500);
  harness.startActiveBattleTimer();
  assert.equal(harness.battleStartedAt, 1500);
});
