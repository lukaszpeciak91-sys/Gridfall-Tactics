import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');
const gameMenu = read('src/scenes/GameMenuScene.js');
const factionSelect = read('src/scenes/FactionSelectScene.js');
const overlay = read('src/scenes/SceneTransitionOverlayScene.js');
const battle = read('src/scenes/BattleScene.js');
const mainMenu = read('src/scenes/MainMenuScene.js');

test('Arena and Campaign faction selection share the existing transition helper with exact destination data', () => {
  assert.match(gameMenu, /import \{[^}]*startSceneWithTransitionOverlay[^}]*\} from '\.\/sceneTransitionOverlay\.js';/);
  assert.match(gameMenu, /translateActive\('ui\.gameMenu\.arena', 'ARENA'\), \(\) => \{\s*this\.startFactionSelect\(\{ returnSceneKey: 'GameMenuScene' \}\);/);
  assert.match(gameMenu, /openCampaignFactionSelect\(\) \{\s*this\.startFactionSelect\(\{ mode: 'campaign', returnSceneKey: 'GameMenuScene' \}\);\s*\}/);
  assert.match(gameMenu, /startFactionSelect\(data\) \{[\s\S]*startSceneWithTransitionOverlay\(this, 'FactionSelectScene', data\)/);
  assert.equal((gameMenu.match(/startSceneWithTransitionOverlay\(this, 'FactionSelectScene', data\)/g) ?? []).length, 1);
});

test('one shared guard makes the first Arena, Campaign, or cross-tap navigation win', () => {
  assert.match(gameMenu, /startFactionSelect\(data\) \{\s*if \(this\.factionSelectNavigationInProgress\) return false;\s*this\.factionSelectNavigationInProgress = true;/);
  assert.match(gameMenu, /this\.factionSelectNavigationInProgress = true;[\s\S]*startSceneWithTransitionOverlay\(this, 'FactionSelectScene', data\)/);
  assert.equal((gameMenu.match(/startSceneWithTransitionOverlay\(this, 'FactionSelectScene', data\)/g) ?? []).length, 1);
  assert.match(gameMenu, /init\(data = \{\}\) \{[\s\S]*this\.factionSelectNavigationInProgress = false;/);
  assert.match(gameMenu, /cleanupScene\(\) \{\s*this\.factionSelectNavigationInProgress = false;/);
  assert.doesNotMatch(gameMenu, /this\.input\.enabled\s*=/);
});

test('Campaign replacement clears and closes before beginning the guarded transition, while cancel only closes', () => {
  assert.match(gameMenu, /confirmNewGame[\s\S]*\(\) => \{\s*clearCampaign\(\);\s*this\.closeNewGameConfirmation\(\);\s*this\.openCampaignFactionSelect\(\);\s*\}/);
  assert.match(gameMenu, /cancelNewGame[\s\S]*\(\) => this\.closeNewGameConfirmation\(\)/);
  const closeMethod = gameMenu.slice(gameMenu.indexOf('  closeNewGameConfirmation()'), gameMenu.indexOf('  drawNavigationControls()'));
  assert.doesNotMatch(closeMethod, /startFactionSelect|startSceneWithTransitionOverlay/);
});

test('FactionSelect retains single first-render readiness, ID validation, safe direct entry, and fullscreen metadata', () => {
  assert.match(factionSelect, /this\.sceneTransitionOverlay = data\?\.sceneTransitionOverlay \?\? null/);
  assert.match(factionSelect, /this\.scheduleTransitionReadyAfterFirstRender\(\);/);
  assert.match(factionSelect, /if \(typeof transitionId !== 'string' \|\| !transitionId \|\| this\.transitionReadyEmitted\) return;/);
  assert.equal((factionSelect.match(/emitSceneTransitionVisuallyReady\(this, \{ transitionId \}\)/g) ?? []).length, 1);
  assert.match(factionSelect, /sceneTransitionOverlay: this\.sceneTransitionOverlay/);
  assert.match(factionSelect, /cleanupScene\(\) \{[\s\S]*this\.clearPendingTransitionReadyCallbacks\(\)/);
});

test('overlay retains matching-ID readiness and conditional 120 ms display behavior', () => {
  assert.match(overlay, /event\?\.transitionId !== this\.transitionId \|\| event\?\.destinationSceneKey !== this\.destinationSceneKey/);
  assert.match(overlay, /const DELAYED_SHOW_MS = 120/);
  assert.match(overlay, /if \(this\.reconcileReadiness\('delayed-show'\)\) \{\s*return;\s*\}\s*this\.showOverlay\(\)/);
  assert.match(overlay, /if \(!this\.hasShown\) \{\s*this\.cleanupAndStop/);
  assert.match(overlay, /const READY_STABLE_FRAME_MS = 32/);
  assert.match(overlay, /const FADE_OUT_MS = 220/);
});

test('unapproved navigation and MainMenu readiness remain unchanged', () => {
  assert.match(factionSelect, /returnToMainMenu\(\) \{\s*this\.scene\.start\(this\.returnSceneKey\);/);
  assert.match(factionSelect, /this\.scene\.start\('CampaignEnemySelectScene', \{ campaign: savedCampaign \}\)/);
  assert.match(battle, /if \(!options\.preview\) clearCampaign\(\);\s*this\.clearAchievementPopupPresentationBatch\(\);\s*this\.scene\.start\(options\.preview \? \(this\.battleContext\?\.returnSceneKey \?\? 'DebugMenuScene'\) : 'MainMenuScene'\)/);
  assert.doesNotMatch(mainMenu, /emitSceneTransitionVisuallyReady|scheduleTransitionReadyAfterFirstRender|sceneTransitionOverlay\s*=/);
});
