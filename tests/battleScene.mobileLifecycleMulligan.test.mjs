import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

function extractMethodBody(name, nextName) {
  const start = source.indexOf(`\n  ${name}(`);
  const end = source.indexOf(`\n  ${nextName}(`, start + 1);
  if (start < 0 || end < 0) throw new Error(`Failed to extract ${name}`);
  return source.slice(start, end);
}

test('BattleScene registers Phaser resume and wake lifecycle recovery hooks', () => {
  assert.match(source, /this\.events\.on\(Phaser\.Scenes\.Events\.RESUME, this\.onSceneResume, this\);/);
  assert.match(source, /this\.events\.on\(Phaser\.Scenes\.Events\.WAKE, this\.onSceneWake, this\);/);
  assert.match(source, /onSceneResume\(\) \{\s*this\.recoverFromLifecycle\('scene-resume'\);\s*\}/);
  assert.match(source, /onSceneWake\(\) \{\s*this\.recoverFromLifecycle\('scene-wake'\);\s*\}/);
  assert.match(source, /this\.events\.off\(Phaser\.Scenes\.Events\.RESUME, this\.onSceneResume, this\);/);
  assert.match(source, /this\.events\.off\(Phaser\.Scenes\.Events\.WAKE, this\.onSceneWake, this\);/);
});

test('lifecycle recovery normalizes transient banners before refreshing BattleScene UI', () => {
  const recover = extractMethodBody('recoverFromLifecycle', 'shouldRebuildBattleView');
  assert.match(recover, /this\.normalizeLifecycleUiState\(reason\);[\s\S]*this\.refreshHeroHP\(\);[\s\S]*this\.updatePlayerBaseActionState\(\);/);

  const normalize = extractMethodBody('normalizeLifecycleUiState', 'shouldRebuildBattleView');
  assert.match(normalize, /this\.deferredTransientBattleBanner = null;/);
  assert.match(normalize, /this\.destroyTransientBattleBanners\(\);/);
  assert.match(normalize, /this\.turnStartBanner\?\.active[\s\S]*this\.destroyEnemyActionBanner\(\);[\s\S]*this\.destroyPlayerActionBanner\(\);[\s\S]*this\.destroyInvalidActionBanner\(\);/);
});

test('lifecycle recovery refreshes missing or hidden base label state', () => {
  const normalize = extractMethodBody('normalizeLifecycleUiState', 'shouldRebuildBattleView');
  const shouldRebuild = extractMethodBody('shouldRebuildBattleView', 'getLifecycleDiagnostics');

  assert.match(normalize, /this\.refreshHeroHP\(\);/);
  assert.match(normalize, /this\.updatePlayerBaseActionState\(\);/);
  assert.match(shouldRebuild, /!this\.enemyHpText\?\.active/);
  assert.match(shouldRebuild, /!this\.playerHpText\?\.active/);
  assert.match(shouldRebuild, /!this\.playerBaseActionLabelText\?\.active/);
});

test('fullscreen rebuild resets terminal text boot state before recreating base labels', () => {
  const rebuild = extractMethodBody('rebuildBattleView', 'shutdown');

  assert.match(rebuild, /this\.cleanupSceneObjects\(\{ preserveTimers: true \}\);\s*this\.terminalTextBootComplete = false;/);
  assert.match(rebuild, /this\.terminalTextBootComplete = false;[\s\S]*this\.drawHeroPanels\(\);/);
  assert.match(rebuild, /this\.drawHeroPanels\(\);[\s\S]*this\.refreshHeroHP\(\);[\s\S]*this\.updatePlayerBaseActionState\(\);/);
});

test('mulligan lifecycle recovery restores mulligan UI without changing gameplay state', () => {
  const normalize = extractMethodBody('normalizeLifecycleUiState', 'shouldRebuildBattleView');

  assert.match(normalize, /if \(this\.openingMulliganPending\) \{/);
  assert.match(normalize, /this\.targetingState = null;/);
  assert.match(normalize, /this\.effectCastState = null;/);
  assert.match(normalize, /this\.pendingSwapIndex = null;/);
  assert.match(normalize, /this\.selectedMulliganCardIds = this\.selectedMulliganCardIds\.filter\(\(cardId\) => liveHandIds\.has\(cardId\)\);/);
  assert.match(normalize, /this\.redrawHand\(\);/);
  assert.doesNotMatch(normalize, /createInitialBattleState|performOpeningMulligan\(|applyCampaignBattleResult|saveCampaign|clearCampaign|scene\.restart/);
});
