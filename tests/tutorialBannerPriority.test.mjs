import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const battleSource = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

test('tutorial banner priority suppresses normal transient battle banners in tutorial mode', () => {
  assert.match(battleSource, /const TUTORIAL_BANNER_OVERLAY_DEPTH = 223;/);
  assert.match(battleSource, /const TUTORIAL_BANNER_DEPTH = 224;/);
  assert.match(battleSource, /setDepth\(TUTORIAL_BANNER_DEPTH\)\.setAlpha\(0\.98\)/);
  assert.match(battleSource, /setDepth\(TUTORIAL_BANNER_OVERLAY_DEPTH\)[\s\S]*setInteractive/);
  assert.match(battleSource, /shouldSuppressTransientBattleBannerForTutorial\(\) \{[\s\S]*this\.isTutorialBattle\?\.\(\)[\s\S]*const step = this\.getCurrentTutorialStep\?\.\(\);[\s\S]*return Boolean\(step && this\.getTutorialStepText\?\.\(step\)\);/);
  assert.match(battleSource, /prepareTransientBattleBanner\(owner\) \{\s*if \(this\.recoverTutorialBannerAfterSuppressedBattleBanner\?\.\(\)\) return false;/);
  assert.match(battleSource, /showEnemyActionBanner\(message, pacing = ENEMY_ACTION_PACING\.unit\) \{[\s\S]*if \(!this\.prepareTransientBattleBanner\('enemy-action'\)\) \{\s*if \(!this\.shouldSuppressTransientBattleBannerForTutorial\(\)\) this\.deferTransientBattleBanner\('enemy-action'/);
  assert.match(battleSource, /showPlayerActionBanner\(message\) \{[\s\S]*if \(!this\.prepareTransientBattleBanner\('player-action'\)\) \{\s*if \(!this\.shouldSuppressTransientBattleBannerForTutorial\(\)\) this\.deferTransientBattleBanner\('player-action'/);
  assert.match(battleSource, /showInvalidActionBanner\(message\) \{[\s\S]*if \(!this\.prepareTransientBattleBanner\('invalid-action'\)\) \{\s*if \(!this\.shouldSuppressTransientBattleBannerForTutorial\(\)\) this\.deferTransientBattleBanner\('invalid-action'/);
  assert.match(battleSource, /showOpeningTurnStartBanner\(\) \{[\s\S]*if \(!this\.prepareTransientBattleBanner\('turn-start'\)\) \{\s*if \(!this\.shouldSuppressTransientBattleBannerForTutorial\(\)\) this\.deferTransientBattleBanner\('turn-start'\);/);
});

test('suppressed tutorial battle banner attempts refresh banner and focus without waiting for hand taps', () => {
  assert.match(battleSource, /recoverTutorialBannerAfterSuppressedBattleBanner\(\) \{[\s\S]*this\.destroyTransientBattleBanners\(\);[\s\S]*this\.updateTutorialBanner\?\.\(\);/);
  assert.match(battleSource, /this\.time\?\.delayedCall\?\.\(0, \(\) => \{[\s\S]*this\.updateTutorialBanner\?\.\(\);[\s\S]*this\.updateTutorialFocus\?\.\(\);/);
  assert.match(battleSource, /flushDeferredTransientBattleBanner\(\) \{\s*const deferred = this\.deferredTransientBattleBanner;\s*if \(this\.recoverTutorialBannerAfterSuppressedBattleBanner\?\.\(\)\) \{\s*this\.deferredTransientBattleBanner = null;\s*return false;/);
  assert.match(battleSource, /type === 'effect_card'[\s\S]*canPlayEffectCard\(this\.gameState, 'player', card\)\.ok[\s\S]*play_effect/);
});
