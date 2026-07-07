import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

function extractMethodBody(name, nextName) {
  const start = source.indexOf(`\n  ${name}(`);
  const standardEnd = source.indexOf(`\n  ${nextName}(`, start + 1);
  const asyncEnd = source.indexOf(`\n  async ${nextName}(`, start + 1);
  const end = standardEnd >= 0 && asyncEnd >= 0
    ? Math.min(standardEnd, asyncEnd)
    : Math.max(standardEnd, asyncEnd);
  if (start < 0 || end < 0) throw new Error(`Failed to extract ${name}`);
  return source.slice(start, end);
}

test('scene cleanup immediately stops active outcome stingers before killing tweens', () => {
  const cleanup = extractMethodBody('cleanupSceneObjects', 'create');
  assert.match(cleanup, /this\.stopOutcomeStinger\(\{ fadeMs: 0 \}\);[\s\S]*this\.destroyBattleResultModal\(\);/);
  assert.match(cleanup, /this\.stopOutcomeStinger\(\{ fadeMs: 0 \}\);[\s\S]*if \(!preserveTweens\) \{[\s\S]*this\.tweens\?\.killAll\?\.\(\);/);
});

test('result overlay lifecycle uses explicit overlay state instead of boolean-only rebuild restore', () => {
  const rebuild = extractMethodBody('rebuildBattleView', 'shutdown');
  assert.match(source, /this\.resultOverlayState = null;/);
  assert.match(source, /captureResultOverlayState\(\) \{/);
  assert.match(source, /restoreResultOverlayFromSnapshot\(snapshot\) \{/);
  assert.match(rebuild, /const resultOverlaySnapshot = this\.captureResultOverlayState\(\);/);
  assert.match(rebuild, /this\.restoreResultOverlayFromSnapshot\(resultOverlaySnapshot\);/);
  assert.doesNotMatch(rebuild, /const resultModalWasShown = this\.battleResultModalShown;/);
});

test('arena and campaign intermediate battle result overlays restore as immediate interactive overlays', () => {
  const showBattle = extractMethodBody('showBattleResultModal', 'createResultModalButton');
  const restore = extractMethodBody('restoreResultOverlayFromSnapshot', 'rebuildBattleView');
  assert.match(showBattle, /kind: this\.getBattleResultOverlayKind\(\)/);
  assert.match(showBattle, /phase: 'interactive'/);
  assert.match(showBattle, /const skipReveal = options\.skipReveal === true;/);
  assert.match(restore, /snapshot\.kind === 'arena-battle-result' \|\| snapshot\.kind === 'campaign-battle-result' \|\| snapshot\.kind === 'tutorial-battle-result'/);
  assert.match(restore, /this\.showBattleResultModal\(\{ skipReveal: true \}\);/);
});

test('battle result modal creation resets lifecycle flags if visible creation fails', () => {
  const showBattle = extractMethodBody('showBattleResultModal', 'createResultModalButton');
  assert.match(showBattle, /const modalItems = \[\];/);
  assert.match(showBattle, /try \{/);
  assert.match(showBattle, /this\.playBattleOutcomeSfxOnce\(\);/);
  assert.match(showBattle, /this\.battleResultModalShown = true;/);
  assert.match(showBattle, /catch \(error\) \{/);
  assert.match(showBattle, /console\.error\('Failed to create battle result modal\.', error\);/);
  assert.match(showBattle, /this\.battleResultModalShown = false;/);
  assert.match(showBattle, /this\.battleResultModalPending = false;/);
  assert.match(showBattle, /this\.resultOverlayState = null;/);
  assert.match(showBattle, /this\.isFlowResolving = false;/);
});

test('battle result modal enters terminal overlay state only after modal assignment', () => {
  const showBattle = extractMethodBody('showBattleResultModal', 'createResultModalButton');
  const shownIndex = showBattle.indexOf('this.battleResultModalShown = true;');
  const overlayIndex = showBattle.indexOf('this.resultOverlayState = {');
  const cleanupIndex = showBattle.indexOf('this.resetCardHighlights({ showPreview: false });');
  const modalAssignmentIndex = showBattle.indexOf('this.battleResultModal = {');

  assert.ok(shownIndex >= 0, 'battleResultModalShown should be set in showBattleResultModal');
  assert.ok(cleanupIndex > 0, 'card cleanup should run during modal construction');
  assert.ok(modalAssignmentIndex > cleanupIndex, 'modal object assignment should remain after modal construction');
  assert.ok(shownIndex > modalAssignmentIndex, 'battleResultModalShown should be set only after the modal object exists');
  assert.ok(overlayIndex > shownIndex, 'resultOverlayState should be initialized after the shown flag');
  assert.match(showBattle, /this\.resetCardHighlights\(\{ showPreview: false \}\);/);
});

test('successful battle result modal clears pending and flow flags before enabling buttons', () => {
  const showBattle = extractMethodBody('showBattleResultModal', 'createResultModalButton');
  const buttons = extractMethodBody('createResultModalButton', 'destroyBattleResultModal');
  const modalAssignmentIndex = showBattle.indexOf('this.battleResultModal = {');
  const pendingClearIndex = showBattle.indexOf('this.battleResultModalPending = false;', showBattle.indexOf('this.logResultModalDiagnostic(\'showBattleResultModal:before-modal-assignment\''));
  const flowClearIndex = showBattle.indexOf('this.isFlowResolving = false;', pendingClearIndex);
  const shownIndex = showBattle.indexOf('this.battleResultModalShown = true;', modalAssignmentIndex);

  assert.ok(pendingClearIndex >= 0, 'successful modal construction should clear pending state');
  assert.ok(flowClearIndex > pendingClearIndex, 'successful modal construction should clear flow lock after pending state');
  assert.ok(modalAssignmentIndex > flowClearIndex, 'modal assignment should happen after pending/flow locks clear');
  assert.ok(shownIndex > modalAssignmentIndex, 'shown flag should be set after modal assignment');
  assert.match(buttons, /onPointerUp: \(\) => \{[\s\S]*this\.guardPointerEvent\(\);[\s\S]*this\.stopOutcomeStinger\(\{ fadeMs: 0 \}\);[\s\S]*if \(this\.navigationInProgress\) return;[\s\S]*onClick\(\);/);
  assert.doesNotMatch(buttons, /battleResultModalPending|battleResultModalShown|isFlowResolving/);
});

test('campaign completion phase is persisted and summary restore bypasses reveal gating', () => {
  const campaign = extractMethodBody('showCampaignCompleteModal', 'getCampaignCompletionStatsText');
  assert.match(campaign, /restorePhase/);
  assert.match(campaign, /restoreAsInteractive/);
  assert.match(campaign, /kind: 'campaign-completion'/);
  assert.match(campaign, /phase: 'summary'/);
  assert.match(campaign, /phase: 'interactive'/);
  assert.match(campaign, /if \(restoreAsInteractive\) \{[\s\S]*overlay\.removeAllListeners\('pointerup'\);[\s\S]*summaryItems\.forEach\(\(item\) => item\?\.setVisible\?\.\(true\)\?\.setAlpha\?\.\(1\)\);[\s\S]*\}/);
});

test('campaign completion preview overlays restore without requiring gameState winner', () => {
  const capture = extractMethodBody('captureResultOverlayState', 'restoreResultOverlayFromSnapshot');
  const restore = extractMethodBody('restoreResultOverlayFromSnapshot', 'rebuildBattleView');
  assert.match(source, /preview: options\.preview === true/);
  assert.match(restore, /snapshot\.kind === 'campaign-completion'/);
  assert.match(restore, /preview: snapshot\.preview === true/);
  assert.match(restore, /campaign: snapshot\.campaign/);
  const campaignRestoreBranch = restore.slice(restore.indexOf("if (snapshot.kind === 'campaign-completion')"), restore.indexOf("if ((snapshot.kind === 'arena-battle-result'"));
  assert.doesNotMatch(campaignRestoreBranch, /this\.gameState\?\.winner/);
});

test('pending battle result snapshot survives fullscreen and viewport rebuild cleanup', () => {
  const capture = extractMethodBody('captureResultOverlayState', 'restoreResultOverlayFromSnapshot');
  const restore = extractMethodBody('restoreResultOverlayFromSnapshot', 'rebuildBattleView');
  const rebuild = extractMethodBody('rebuildBattleView', 'shutdown');

  assert.match(capture, /if \(this\.battleResultModalPending && this\.gameState\?\.winner\) \{/);
  assert.match(capture, /kind: this\.getBattleResultOverlayKind\(\),[\s\S]*phase: 'pending'/);
  assert.match(restore, /snapshot\.kind === 'arena-battle-result' \|\| snapshot\.kind === 'campaign-battle-result' \|\| snapshot\.kind === 'tutorial-battle-result'/);
  assert.match(restore, /this\.showBattleResultModal\(\{ skipReveal: true \}\);/);
  assert.match(rebuild, /const resultOverlaySnapshot = this\.captureResultOverlayState\(\);[\s\S]*this\.cleanupSceneObjects\(\{ preserveTimers: true \}\);[\s\S]*this\.restoreResultOverlayFromSnapshot\(resultOverlaySnapshot\);/);
});

test('pending tutorial result can recover when fullscreen rebuild removed the delayed event', () => {
  const capture = extractMethodBody('captureResultOverlayState', 'restoreResultOverlayFromSnapshot');
  const ensure = extractMethodBody('ensureBattleResultModalVisible', 'completeBattleFlow');

  assert.match(capture, /this\.battleResultModalPending && this\.gameState\?\.winner/);
  assert.match(capture, /phase: 'pending'/);
  assert.match(ensure, /if \(this\.battleResultModalPending && this\.isLiveBattleResultModalPendingEvent\(\)\) \{[\s\S]*return false;[\s\S]*\}/);
  assert.match(ensure, /if \(this\.battleResultModalPending \|\| this\.battleResultModalPendingEvent\) \{[\s\S]*this\.battleResultModalPendingEvent\?\.remove\?\.\(false\);[\s\S]*this\.battleResultModalPending = false;[\s\S]*\}/);
  assert.match(ensure, /this\.showBattleResultModal\(\{ skipReveal: true \}\);/);
});

test('result overlay rebuild cleanup cancels stale pending and celebration timers before restore', () => {
  const schedule = extractMethodBody('scheduleBattleResultModal', 'completeBattleFlow');
  const destroy = extractMethodBody('destroyBattleResultModal', 'createBaseBroadcastFrame');
  assert.match(schedule, /this\.battleResultModalPendingEvent = pendingResultModalEvent;/);
  assert.match(destroy, /this\.battleResultModalPendingEvent\?\.remove\?\.\(false\);/);
  assert.match(destroy, /this\.battleResultModal\.celebration\?\.timers\?\.forEach\(\(timer\) => timer\?\.remove\?\.\(false\)\);/);
  assert.match(destroy, /item\?\.removeAllListeners\?\.\(\);/);
});

test('stale battle result pending state is recovered without duplicating live pending timers', () => {
  const liveCheck = extractMethodBody('isLiveBattleResultModalPendingEvent', 'ensureBattleResultModalVisible');
  const ensure = extractMethodBody('ensureBattleResultModalVisible', 'completeBattleFlow');

  assert.match(liveCheck, /if \(!event\) return false;/);
  assert.match(liveCheck, /event\.destroyed \|\| event\.removed \|\| event\.pendingDelete \|\| event\.hasDispatched/);
  assert.match(liveCheck, /event\.active === false/);
  assert.match(liveCheck, /'callback' in event && typeof event\.callback !== 'function'/);

  assert.match(ensure, /if \(!this\.gameState\?\.winner\) return false;/);
  assert.match(ensure, /if \(this\.battleResultModalShown && this\.battleResultModal\) return false;/);
  assert.match(ensure, /if \(this\.battleResultModalPending && this\.isLiveBattleResultModalPendingEvent\(\)\) \{/);
  assert.match(ensure, /return false;/);
  assert.match(ensure, /this\.battleResultModalPendingEvent\?\.remove\?\.\(false\);/);
  assert.match(ensure, /this\.battleResultModalPendingEvent = null;/);
  assert.match(ensure, /this\.battleResultModalPending = false;/);
  assert.match(ensure, /this\.showBattleResultModal\(\{ skipReveal: true \}\);/);
});

test('battle result recovery hooks lifecycle and rebuild paths after normal UI refresh', () => {
  const complete = extractMethodBody('completeBattleFlow', 'showBattleExhaustedBannerThenScheduleResult');
  const lifecycle = extractMethodBody('recoverFromLifecycle', 'normalizeLifecycleUiState');
  const rebuild = extractMethodBody('rebuildBattleView', 'shutdown');

  assert.match(complete, /this\.scheduleBattleResultModal\(delayMs\);[\s\S]*this\.ensureBattleResultModalVisible\('complete-battle-flow'\);/);
  assert.match(lifecycle, /this\.refreshLifecycleBanners\(reason\);[\s\S]*this\.ensureBattleResultModalVisible\(`lifecycle:\$\{reason\}`\);/);
  assert.match(rebuild, /this\.restoreResultOverlayFromSnapshot\(resultOverlaySnapshot\);[\s\S]*this\.ensureBattleResultModalVisible\(`rebuild:\$\{reason\}`\);/);
});

test('result recovery preserves tutorial overlay priority and tutorial result routing', () => {
  const ensure = extractMethodBody('ensureBattleResultModalVisible', 'completeBattleFlow');
  const refresh = extractMethodBody('refreshLifecycleBanners', 'shouldRebuildBattleView');
  const updateBanner = extractMethodBody('updateTutorialBanner', 'destroyTutorialBanner');
  const updateFocus = extractMethodBody('updateTutorialFocus', 'showOpeningTurnStartBanner');
  const buttons = extractMethodBody('getBattleResultModalButtons', 'showBattleResultModal');

  assert.match(ensure, /this\.destroyTutorialBanner\?\.\(\);/);
  assert.match(ensure, /this\.destroyTutorialFocus\?\.\(\);/);
  assert.match(refresh, /this\.restoreTutorialPresentationState\(reason, \{ forceRecreate: true \}\);/);
  assert.match(refresh, /this\.battleResultModalPending[\s\S]*this\.battleResultModalShown[\s\S]*this\.gameState\?\.winner/);
  assert.match(updateBanner, /this\.battleResultModalShown \|\| this\.battleResultModalPending/);
  assert.match(updateFocus, /this\.battleResultModalShown \|\| this\.battleResultModalPending/);
  assert.match(buttons, /if \(this\.isTutorialBattle\(\)\) \{/);
  assert.match(buttons, /translateActive\('ui\.common\.exit', 'EXIT'\)/);
  assert.match(buttons, /\(\) => this\.exitTutorialBattleToGameMenu\(\)/);
});
