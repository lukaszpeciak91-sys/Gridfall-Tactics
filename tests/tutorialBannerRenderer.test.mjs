import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const battleSource = () => fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
const gameMenuSource = () => fs.readFileSync('src/scenes/GameMenuScene.js', 'utf8');

test('tutorial BattleScene creates and shows a tutorial banner only in tutorial mode', () => {
  const source = battleSource();

  assert.match(source, /updateTutorialBanner\(\) \{[\s\S]*!this\.isTutorialBattle\(\)[\s\S]*this\.destroyTutorialBanner\(\)/);
  assert.match(source, /const step = this\.getCurrentTutorialStep\(\);[\s\S]*const message = this\.getTutorialStepText\(step\);/);
  assert.match(source, /this\.tutorialBanner = this\.add\.text\(layout\.x, layout\.targetY, message/);
  assert.match(source, /getTutorialBannerLayout\(\) \{[\s\S]*playerHero[\s\S]*hand[\s\S]*const targetY = Math\.max\(playerHero\.centerY/);
  assert.match(source, /overlayX: width \* 0\.5,[\s\S]*overlayY: height \* 0\.5,[\s\S]*overlayWidth: width,[\s\S]*overlayHeight: height/);
  assert.match(source, /this\.startOpeningMulliganReveal\(\);\s*this\.updateTutorialBanner\(\);/);
  const updateSource = source.slice(source.indexOf('  updateTutorialBanner() {'), source.indexOf('  onTutorialBannerPointerUp('));
  assert.match(updateSource, /!this\.isTutorialBattle\(\)/);
  assert.doesNotMatch(updateSource, /mode === 'arena'/);
  assert.doesNotMatch(updateSource, /mode === 'campaign'/);
});

test('tutorial banner uses localized tutorial step text', () => {
  const source = battleSource();

  assert.match(source, /getTutorialStepText\(step = this\.getCurrentTutorialStep\(\)\) \{[\s\S]*const locale = getActiveLocale\(\);[\s\S]*step\.text\[locale\] \?\? step\.text\.en/);
});

test('tap_continue tutorial banner advances and updates text without global battle click consumption', () => {
  const source = battleSource();

  assert.match(source, /onTutorialBannerPointerUp\(pointer, localX, localY, event\) \{[\s\S]*!this\.isCurrentTutorialStepTapContinue\(\)[\s\S]*event\?\.stopPropagation\?\.\(\);[\s\S]*this\.handleTutorialEvent\('tap_continue'\)/);
  assert.match(source, /this\.tutorialBannerOverlay = this\.add\.rectangle\(layout\.overlayX, layout\.overlayY, layout\.overlayWidth, layout\.overlayHeight[\s\S]*\.setInteractive\(\{ useHandCursor: true \}\)[\s\S]*\.on\('pointerdown'[\s\S]*\.on\('pointerup'/);
  assert.match(source, /this\.tutorialBannerOverlay\.setPosition\(layout\.overlayX, layout\.overlayY\)\.setSize\(layout\.overlayWidth, layout\.overlayHeight\);/);
  assert.match(source, /this\.tutorialBannerOverlay\.input\.enabled = canTapContinue;/);
  assert.match(source, /if \(result\.matched\) this\.updateTutorialBanner\(\);/);
});

test('required-action tutorial steps show text but unrelated tap_continue does not advance', () => {
  const source = battleSource();

  assert.match(source, /const canTapContinue = step\.expected\?\.type === 'tap_continue';/);
  assert.match(source, /this\.tutorialBannerOverlay\.setVisible\(canTapContinue\);/);
  assert.match(source, /onTutorialBannerPointerDown\(pointer, localX, localY, event\) \{[\s\S]*!this\.isCurrentTutorialStepTapContinue\(\)[\s\S]*event\?\.stopPropagation\?\.\(\);/);
  assert.match(source, /handleTutorialControllerEvent\(this\.tutorialControllerState, eventName, payload\)/);
  assert.doesNotMatch(source, /advanceTutorialControllerStep\(this\.tutorialControllerState, \{ eventName: 'tap_continue'/);
});

test('tutorial banner cleans up on result, reset, rebuild, and shutdown paths', () => {
  const source = battleSource();

  assert.match(source, /destroyTutorialBanner\(\) \{[\s\S]*this\.tutorialBannerOverlay[\s\S]*destroy\?\.\(\)[\s\S]*this\.tutorialBanner[\s\S]*destroy\?\.\(\)/);
  assert.match(source, /cleanupSceneObjects\([\s\S]*this\.destroyTutorialBanner\(\);/);
  assert.match(source, /showBattleResultModal\(\)[\s\S]*this\.destroyTutorialBanner\(\);/);
  assert.match(source, /rebuildBattleView\([\s\S]*this\.updateTutorialBanner\(\);/);
  assert.match(source, /shutdown\(\) \{\s*this\.cleanupSceneObjects\(\);/);
});

test('GameMenuScene Tutorial launches playable tutorial BattleScene', () => {
  const source = gameMenuSource();

  assert.match(source, /this\.scene\.start\('BattleScene', \{[\s\S]*battleContext:[\s\S]*mode:\s*'tutorial'[\s\S]*tutorialId:\s*'tutorial_v1'[\s\S]*returnSceneKey:\s*'GameMenuScene'/);
  assert.doesNotMatch(source, /this\.scene\.start\('TutorialScene'/);
});
