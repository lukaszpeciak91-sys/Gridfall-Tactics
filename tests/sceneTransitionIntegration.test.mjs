import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

const mainMenu = read('src/scenes/MainMenuScene.js');
const collection = read('src/scenes/CollectionScene.js');
const battle = read('src/scenes/BattleScene.js');
const factionSelect = read('src/scenes/FactionSelectScene.js');
const campaignEnemySelect = read('src/scenes/CampaignEnemySelectScene.js');
const gameMenu = read('src/scenes/GameMenuScene.js');
const battleTransition = read('src/scenes/BattleTransitionScene.js');

test('Main Menu to Collection uses overlay helper and Collection emits after initial layout', () => {
  assert.match(mainMenu, /startSceneWithTransitionOverlay\(this, 'CollectionScene'\)/);
  assert.match(collection, /import \{ emitSceneTransitionVisuallyReady \} from '\.\/sceneTransitionOverlay\.js';/);
  assert.match(collection, /this\.drawCollectionList\(\{ width, height \}\);\s*this\.createBackButton\(width, height\);\s*this\.emitTransitionReadyOnce/);
  assert.match(collection, /data\?\.sceneTransitionOverlay/);
});

test('post-battle Arena uses overlay helper and FactionSelect emits after cards and controls', () => {
  assert.match(battle, /startSceneWithTransitionOverlay\(this, 'FactionSelectScene'\)/);
  assert.match(factionSelect, /this\.drawNavigationControls\(\);\s*this\.drawFactionCards[\s\S]*this\.emitTransitionReadyOnce/);
  assert.match(factionSelect, /data\?\.sceneTransitionOverlay/);
});

test('post-battle Campaign uses overlay helper and CampaignEnemySelect emits only after valid setup', () => {
  assert.match(battle, /startSceneWithTransitionOverlay\(this, 'CampaignEnemySelectScene', \{ campaign \}\)/);
  assert.match(battle, /startSceneWithTransitionOverlay\(this, 'CampaignEnemySelectScene', \{ campaign: updatedCampaign \}\)/);
  assert.match(campaignEnemySelect, /if \(!isValidCampaignState\(this\.campaign\) \|\| this\.campaign\.status !== 'active'\) \{\s*this\.scene\.start\('GameMenuScene'\);\s*return;\s*\}/);
  assert.match(campaignEnemySelect, /const enemyCount = this\.drawEnemyCards[\s\S]*this\.emitTransitionReadyOnce\(\{ enemyCount \}\)/);
});

test('invalid campaign redirect does not emit stale readiness', () => {
  const invalidIndex = campaignEnemySelect.indexOf("this.scene.start('GameMenuScene')");
  const readyIndex = campaignEnemySelect.indexOf('this.emitTransitionReadyOnce({ enemyCount })');
  assert.ok(invalidIndex >= 0 && readyIndex > invalidIndex);
});

test('post-battle Tutorial uses overlay helper and GameMenu emits after controls and input restore', () => {
  assert.match(battle, /startSceneWithTransitionOverlay\(this, 'GameMenuScene'\)/);
  assert.match(gameMenu, /this\.restoreGameMenuInteractivity\(\);\s*this\.updateContinueAvailability\(\);[\s\S]*this\.drawNavigationControls\(\);\s*this\.emitTransitionReadyOnce/);
  assert.match(gameMenu, /data\?\.sceneTransitionOverlay/);
});

test('direct scene entry without transition id still works with no ready emit required', () => {
  for (const source of [collection, factionSelect, campaignEnemySelect, gameMenu]) {
    assert.match(source, /if \(this\.sceneTransitionReadyEmitted \|\| !this\.sceneTransitionOverlay\?\.transitionId\) return false;/);
  }
});

test('no other production navigation path uses the helper', () => {
  const allowed = new Set(['src/scenes/MainMenuScene.js', 'src/scenes/BattleScene.js', 'src/scenes/sceneTransitionOverlay.js']);
  const files = fs.readdirSync('src/scenes').filter((file) => file.endsWith('.js')).map((file) => `src/scenes/${file}`);
  for (const file of files) {
    if (allowed.has(file)) continue;
    assert.doesNotMatch(read(file), /startSceneWithTransitionOverlay/, file);
  }
});

test('BattleTransitionScene remains independent and Settings/Rules remain untouched', () => {
  assert.doesNotMatch(battleTransition, /SceneTransitionOverlayScene|SCENE_TRANSITION_VISUALLY_READY_EVENT|sceneTransitionOverlay/);
  assert.doesNotMatch(read('src/scenes/SettingsScene.js'), /startSceneWithTransitionOverlay|emitSceneTransitionVisuallyReady|sceneTransitionOverlay/);
  assert.doesNotMatch(read('src/scenes/RulesPanelScene.js'), /startSceneWithTransitionOverlay|emitSceneTransitionVisuallyReady|sceneTransitionOverlay/);
});
