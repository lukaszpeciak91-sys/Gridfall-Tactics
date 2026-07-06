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
  assert.match(rebuild, /this\.updateTutorialBanner\(\);\s*this\.scheduleTutorialUiRecovery\(reason\);/);
});

test('deferred tutorial UI recovery refreshes current banner and focus on live objects', () => {
  const schedule = extractMethodBody('scheduleTutorialUiRecovery', 'shouldRebuildBattleView');

  assert.match(schedule, /this\.time\?\.delayedCall\?\.\(50, \(\) => \{/);
  assert.match(schedule, /if \(this\.shouldSuppressTutorialUiRecovery\(\)\) return;/);
  assert.match(schedule, /this\.updateTutorialBanner\?\.\(\);\s*this\.updateTutorialFocus\?\.\(\);/);
});

test('tutorial UI recovery keeps suppression rules for results and resolving flows', () => {
  const guard = extractMethodBody('shouldSuppressTutorialUiRecovery', 'cancelTutorialUiRecovery');

  assert.match(guard, /!this\.isTutorialBattle\?\.\(\)/);
  assert.match(guard, /this\.battleResultModalPending/);
  assert.match(guard, /this\.battleResultModalShown/);
  assert.match(guard, /this\.isFlowResolving/);
  assert.match(guard, /this\.isEffectCastResolving/);
  assert.match(guard, /this\.gameState\?\.winner/);
});

test('tutorial UI recovery is debounced and cleaned up with scene objects', () => {
  const schedule = extractMethodBody('scheduleTutorialUiRecovery', 'shouldRebuildBattleView');
  const cancel = extractMethodBody('cancelTutorialUiRecovery', 'scheduleTutorialUiRecovery');
  const cleanup = extractMethodBody('cleanupSceneObjects', 'create');

  assert.match(schedule, /this\.cancelTutorialUiRecovery\(\);/);
  assert.match(schedule, /this\.pendingTutorialUiRecoveryEvent = this\.time\?\.delayedCall/);
  assert.match(cancel, /this\.pendingTutorialUiRecoveryEvent\?\.remove\?\.\(false\);\s*this\.pendingTutorialUiRecoveryEvent = null;/);
  assert.match(cleanup, /this\.cancelTutorialUiRecovery\(\);\s*this\.destroyTutorialBanner\(\);\s*this\.destroyTutorialFocus\(\);/);
});

test('non-tutorial battles cannot create tutorial banner or focus through lifecycle recovery', () => {
  const guard = extractMethodBody('shouldSuppressTutorialUiRecovery', 'cancelTutorialUiRecovery');
  const schedule = extractMethodBody('scheduleTutorialUiRecovery', 'shouldRebuildBattleView');

  assert.match(guard, /!this\.isTutorialBattle\?\.\(\)/);
  assert.match(schedule, /if \(this\.shouldSuppressTutorialUiRecovery\(\)\) return null;/);
});
