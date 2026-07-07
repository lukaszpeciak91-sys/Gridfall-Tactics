import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const battleSource = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

function extractMethodBody(methodName, nextMethodName) {
  const start = battleSource.indexOf(`  ${methodName}(`);
  assert.notEqual(start, -1, `${methodName} should exist`);
  const end = battleSource.indexOf(`  ${nextMethodName}(`, start + 1);
  assert.notEqual(end, -1, `${nextMethodName} should exist after ${methodName}`);
  return battleSource.slice(start, end);
}

test('tutorial UI recovery is deferred after fullscreen and viewport rebuild paths', () => {
  const fullscreen = extractMethodBody('onFullscreenChanged', 'onViewportChanged');
  const viewport = extractMethodBody('onViewportChanged', 'recoverFromLifecycle');
  const recover = extractMethodBody('recoverFromLifecycle', 'normalizeLifecycleUiState');
  const rebuild = extractMethodBody('rebuildBattleView', 'shutdown');

  assert.match(fullscreen, /this\.recoverFromLifecycle\(this\.scale\.isFullscreen \? 'enterfullscreen' : 'leavefullscreen'\)/);
  assert.match(viewport, /this\.rebuildBattleView\('viewport-change'\);\s*this\.scheduleTutorialUiRecovery\('viewport-change'\);/);
  assert.match(recover, /this\.refreshLifecycleBanners\(reason\);\s*this\.scheduleTutorialUiRecovery\(reason\);\s*this\.ensureBattleResultModalVisible/);
  assert.match(rebuild, /this\.restorePersistentBattleBanner\(\);\s*this\.restoreTutorialPresentationState\(reason, \{ forceRecreate: true \}\);\s*this\.scheduleTutorialUiRecovery\(reason\);/);
});

test('deferred tutorial UI recovery retries across fullscreen layout settling windows', () => {
  const schedule = extractMethodBody('scheduleTutorialUiRecovery', 'shouldRebuildBattleView');

  assert.match(schedule, /const delays = \[0, 50, 100\];/);
  assert.match(schedule, /this\.shouldBlockTutorialUiRecovery\(\)/);
  assert.match(schedule, /this\.shouldTemporarilySuppressTutorialUiRecovery\(\)[\s\S]*this\.scheduleTutorialUiRecovery\(`\$\{reason\}:retry`\)/);
  assert.match(schedule, /this\.restoreTutorialPresentationState\?\.\(`\$\{reason\}:deferred:\$\{delay\}`, \{ forceFocusRedraw: true, forceRecreate: true \}\);/);
});

test('tutorial UI recovery keeps suppression rules for results and resolving flows', () => {
  const guard = extractMethodBody('shouldBlockTutorialUiRecovery', 'shouldTemporarilySuppressTutorialUiRecovery');

  assert.match(guard, /!this\.isTutorialBattle\?\.\(\)/);
  assert.match(guard, /this\.battleResultModalPending/);
  assert.match(guard, /this\.battleResultModalShown/);
  assert.match(guard, /this\.gameState\?\.winner/);

  const temporaryGuard = extractMethodBody('shouldTemporarilySuppressTutorialUiRecovery', 'shouldSuppressTutorialUiRecovery');
  assert.match(temporaryGuard, /this\.isFlowResolving \|\| this\.isEffectCastResolving/);
});

test('tutorial UI recovery is debounced and cleaned up with scene objects', () => {
  const schedule = extractMethodBody('scheduleTutorialUiRecovery', 'shouldRebuildBattleView');
  const cancel = extractMethodBody('cancelTutorialUiRecovery', 'scheduleTutorialUiRecovery');
  const cleanup = extractMethodBody('cleanupSceneObjects', 'create');

  assert.match(schedule, /this\.cancelTutorialUiRecovery\(\);/);
  assert.match(schedule, /this\.pendingTutorialUiRecoveryEvents = delays\.map/);
  assert.match(cancel, /this\.pendingTutorialUiRecoveryEvent\?\.remove\?\.\(false\);\s*this\.pendingTutorialUiRecoveryEvent = null;/);
  assert.match(cancel, /this\.pendingTutorialUiRecoveryEvents \?\? \[\]\)\.forEach/);
  assert.match(cleanup, /this\.cancelTutorialUiRecovery\(\);\s*this\.destroyTutorialBanner\(\);\s*this\.destroyTutorialFocus\(\);/);
});

test('non-tutorial battles cannot create tutorial banner or focus through lifecycle recovery', () => {
  const guard = extractMethodBody('shouldBlockTutorialUiRecovery', 'shouldTemporarilySuppressTutorialUiRecovery');
  const schedule = extractMethodBody('scheduleTutorialUiRecovery', 'shouldRebuildBattleView');

  assert.match(guard, /!this\.isTutorialBattle\?\.\(\)/);
  assert.match(schedule, /if \(this\.shouldBlockTutorialUiRecovery\(\)\) return null;/);
});

test('tutorial presentation restore reasserts banner overlay and focus presentation state', () => {
  const restore = extractMethodBody('restoreTutorialPresentationState', 'shouldRebuildBattleView');

  assert.match(restore, /this\.shouldBlockTutorialUiRecovery\(\)/);
  assert.match(restore, /this\.shouldTemporarilySuppressTutorialUiRecovery\(\)[\s\S]*this\.scheduleTutorialUiRecovery\(`\$\{reason\}:suppressed`\)/);
  assert.match(restore, /const banner = this\.updateTutorialBanner\?\.\(\);/);
  assert.match(restore, /banner\.setOrigin\?\.\(0\.5\);[\s\S]*banner\.setScrollFactor\?\.\(0\);[\s\S]*banner\.setDepth\?\.\(TUTORIAL_BANNER_DEPTH\);/);
  assert.match(restore, /this\.tutorialBannerOverlay\.setAlpha\?\.\(0\.001\);[\s\S]*this\.tutorialBannerOverlay\.setScrollFactor\?\.\(0\);[\s\S]*this\.tutorialBannerOverlay\.setDepth\?\.\(TUTORIAL_BANNER_OVERLAY_DEPTH\);/);
  assert.match(restore, /layer\.setVisible\?\.\(true\);[\s\S]*layer\.setAlpha\?\.\(1\);[\s\S]*layer\.setDepth\?\.\(TUTORIAL_FOCUS_DEPTH\);[\s\S]*layer\.setScale\?\.\(1\);[\s\S]*layer\.setPosition\?\.\(0, 0\);/);
  assert.match(restore, /this\.clearTutorialFocusGraphics\?\.\(\);[\s\S]*this\.updateTutorialFocus\?\.\(step, \{ forceRedraw: forceFocusRedraw \}\);/);
});

test('tutorial focus update can force redraw even when focus key is unchanged', () => {
  const focusStart = battleSource.indexOf('  updateTutorialFocus(');
  assert.notEqual(focusStart, -1, 'updateTutorialFocus should exist');
  const focusEnd = battleSource.indexOf('  async showOpeningTurnStartBanner(', focusStart + 1);
  assert.notEqual(focusEnd, -1, 'showOpeningTurnStartBanner should exist after updateTutorialFocus');
  const focus = battleSource.slice(focusStart, focusEnd);
  const layer = extractMethodBody('ensureTutorialFocusLayer', 'clearTutorialFocusGraphics');

  assert.match(focus, /updateTutorialFocus\(step = this\.getCurrentTutorialStep\(\), \{ forceRedraw = false \} = \{\}\)/);
  assert.match(focus, /if \(!forceRedraw && this\.currentTutorialFocusKey === boundsKey && this\.tutorialFocusGraphics\?\.length > 0\)/);
  assert.match(layer, /setVisible\?\.\(true\);[\s\S]*setAlpha\?\.\(1\);[\s\S]*setDepth\?\.\(TUTORIAL_FOCUS_DEPTH\);[\s\S]*setScale\?\.\(1\);[\s\S]*setPosition\?\.\(0, 0\);/);
});

test('forced lifecycle recreate destroys banner and focus before recreating from current step', () => {
  const restore = extractMethodBody('restoreTutorialPresentationState', 'shouldRebuildBattleView');

  assert.match(restore, /forceRecreate = false/);
  assert.match(restore, /if \(forceRecreate\) \{[\s\S]*this\.destroyTutorialBanner\?\.\(\);[\s\S]*this\.destroyTutorialFocus\?\.\(\);[\s\S]*forceFocusRedraw = true;/);
  assert.match(restore, /const banner = this\.updateTutorialBanner\?\.\(\);/);
  assert.match(restore, /this\.updateTutorialFocus\?\.\(step, \{ forceRedraw: forceFocusRedraw \}\);/);
  assert.match(restore, /tutorialForcedRecreateCount \+= 1/);
  assert.match(restore, /lastTutorialForcedRecreateReason = reason/);
});

test('forced lifecycle recreate is wired only through lifecycle recovery paths', () => {
  const refresh = extractMethodBody('refreshLifecycleBanners', 'shouldBlockTutorialUiRecovery');
  const schedule = extractMethodBody('scheduleTutorialUiRecovery', 'shouldRebuildBattleView');
  const rebuild = extractMethodBody('rebuildBattleView', 'shutdown');

  assert.match(refresh, /this\.restoreTutorialPresentationState\(reason, \{ forceRecreate: true \}\);/);
  assert.match(schedule, /this\.restoreTutorialPresentationState\?\.\(`\$\{reason\}:deferred:\$\{delay\}`, \{ forceFocusRedraw: true, forceRecreate: true \}\);/);
  assert.match(rebuild, /this\.restorePersistentBattleBanner\(\);\s*this\.restoreTutorialPresentationState\(reason, \{ forceRecreate: true \}\);\s*this\.scheduleTutorialUiRecovery\(reason\);/);
});

test('forced lifecycle recreate keeps result and non-tutorial guards before creating UI', () => {
  const restore = extractMethodBody('restoreTutorialPresentationState', 'shouldRebuildBattleView');
  const guard = extractMethodBody('shouldBlockTutorialUiRecovery', 'shouldTemporarilySuppressTutorialUiRecovery');

  assert.match(restore, /if \(this\.shouldBlockTutorialUiRecovery\(\)\) \{[\s\S]*return null;/);
  assert.match(restore, /if \(this\.shouldTemporarilySuppressTutorialUiRecovery\(\)\) \{[\s\S]*this\.scheduleTutorialUiRecovery\(`\$\{reason\}:suppressed`\);[\s\S]*return null;/);
  assert.match(guard, /!this\.isTutorialBattle\?\.\(\)/);
  assert.match(guard, /this\.battleResultModalPending/);
  assert.match(guard, /this\.battleResultModalShown/);
  assert.match(guard, /this\.gameState\?\.winner/);
});

test('tutorial lifecycle diagnostics include display-list membership for stale presentation checks', () => {
  const diagnostic = extractMethodBody('getDiagnosticGameObjectState', 'getTutorialFocusResolutionDiagnostic');

  assert.match(diagnostic, /displayListExists: Boolean\(object\.scene\?\.children\?\.exists\?\.\(object\)\)/);
  assert.match(diagnostic, /displayListIndex: typeof object\.scene\?\.children\?\.getIndex === 'function'/);
  assert.match(diagnostic, /cameraFilter: object\.cameraFilter \?\? null/);
});


test('document fullscreen and Phaser resume lifecycle paths enter forced recovery', () => {
  const docFullscreen = extractMethodBody('onTutorialDocumentFullscreenChanged', 'onViewportChanged');
  const resume = extractMethodBody('onSceneResume', 'onSceneWake');

  assert.match(docFullscreen, /const reason = event\?\.type \?\? 'fullscreenchange';[\s\S]*this\.recoverFromLifecycle\(reason\);/);
  assert.match(resume, /this\.recoverFromLifecycle\('scene-resume'\);/);
});
