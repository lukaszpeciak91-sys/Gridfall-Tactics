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
  assert.match(rebuild, /this\.restorePersistentBattleBanner\(\);\s*this\.restoreTutorialPresentationState\(reason\);\s*this\.scheduleTutorialUiRecovery\(reason\);/);
});

test('deferred tutorial UI recovery retries across fullscreen layout settling windows', () => {
  const schedule = extractMethodBody('scheduleTutorialUiRecovery', 'shouldRebuildBattleView');

  assert.match(schedule, /const delays = \[0, 50, 100\];/);
  assert.match(schedule, /this\.shouldBlockTutorialUiRecovery\(\)/);
  assert.match(schedule, /this\.shouldTemporarilySuppressTutorialUiRecovery\(\)[\s\S]*this\.scheduleTutorialUiRecovery\(`\$\{reason\}:retry`\)/);
  assert.match(schedule, /this\.restoreTutorialPresentationState\?\.\(`\$\{reason\}:deferred:\$\{delay\}`, \{ forceFocusRedraw: true \}\);/);
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
