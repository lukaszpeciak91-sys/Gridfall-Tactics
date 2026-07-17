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

test('playability gate excludes tutorial, mulligan, results, blocked overlays, hidden documents, paused scenes, and winners', () => {
  const playableBody = extractMethodBody('isActiveBattleTimerPlayable', 'startActiveBattleTimer');
  assert.match(playableBody, /isTutorialBattle\?\.\(\)/);
  assert.match(playableBody, /this\.gameState\.winner/);
  assert.match(playableBody, /this\.openingMulliganPending \|\| this\.openingMulliganRevealPending/);
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

test('finalization commits active duration exactly once before achievement evaluation and excludes tutorial battles', () => {
  const finalizerBody = extractMethodBody('finalizeActiveBattleTimeOnce', 'trackTutorialCompletionOnce');
  const scheduleBody = extractMethodBody('scheduleBattleResultModal', 'disableResultPendingOverlayInteractions');
  assert.match(finalizerBody, /if \(this\.activeBattleTimeCommitted \|\| !this\.gameState\?\.winner\) return false;/);
  assert.match(finalizerBody, /this\.activeBattleTimeCommitted = true;/);
  assert.match(finalizerBody, /const durationMs = this\.stopCampaignBattleTimer\(\);/);
  assert.match(finalizerBody, /if \(this\.isTutorialBattle\?\.\(\) \|\| durationMs <= 0\) return false;/);
  assert.match(finalizerBody, /addActiveBattleTime\(loadPlayerStats\(\), durationMs\)/);
  assert.ok(scheduleBody.indexOf('const activeBattleTimeTracked = this.finalizeActiveBattleTimeOnce();') < scheduleBody.indexOf('const tutorialStatsTracked = this.trackTutorialCompletionOnce();'));
  assert.ok(scheduleBody.indexOf('const battleStatsTracked = this.trackCompletedBattleStatsOnce();') < scheduleBody.indexOf('evaluateAndPersistAchievementUnlocks();'));
  assert.doesNotMatch(extractMethodBody('showBattleResultModal', 'createResultModalButton'), /finalizeActiveBattleTimeOnce|addActiveBattleTime/);
  assert.match(source, /resetRuntimeState\(\) \{[\s\S]*this\.activeBattleTimeCommitted = false;[\s\S]*\n  \}/);
});
