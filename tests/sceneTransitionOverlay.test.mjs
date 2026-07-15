import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const helper = fs.readFileSync('src/scenes/sceneTransitionOverlay.js', 'utf8');
const overlay = fs.readFileSync('src/scenes/SceneTransitionOverlayScene.js', 'utf8');
const main = fs.readFileSync('src/main.js', 'utf8');
const battleTransition = fs.readFileSync('src/scenes/BattleTransitionScene.js', 'utf8');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

test('scene transition overlay scene is registered and exposes shared helper API', () => {
  assert.match(main, /import SceneTransitionOverlayScene from '\.\/scenes\/SceneTransitionOverlayScene\.js';/);
  assert.match(main, /TutorialScene, SceneTransitionOverlayScene, BattleTransitionScene, BattleScene/);
  assert.match(overlay, /super\('SceneTransitionOverlayScene'\)/);
  assert.match(helper, /export const SCENE_TRANSITION_VISUALLY_READY_EVENT = 'scene-transition:visually-ready';/);
  assert.match(helper, /export function startSceneWithTransitionOverlay/);
  assert.match(helper, /export function emitSceneTransitionVisuallyReady/);
  assert.match(helper, /export function bringSceneTransitionOverlayToTop/);
});

test('ready event subscription happens before destination start and overlay scene does not own navigation', () => {
  const subscribeIndex = helper.indexOf("destinationScene?.events?.on?.(SCENE_TRANSITION_VISUALLY_READY_EVENT, onDestinationReady)");
  const launchIndex = helper.indexOf('sourceScene.scene.launch(SCENE_TRANSITION_OVERLAY_SCENE_KEY');
  const helperStartIndex = helper.indexOf('sourceScene.scene.start(targetSceneKey');
  assert.ok(subscribeIndex >= 0 && launchIndex > subscribeIndex);
  assert.ok(helperStartIndex > launchIndex);
  assert.match(helper, /export function beginSceneTransitionOverlay/);
  assert.doesNotMatch(overlay, /scene\.start\(/);
});


test('shared helper brings active overlay above destination after destination start', () => {
  const startIndex = helper.indexOf('sourceScene.scene.start(targetSceneKey');
  const bringIndex = helper.indexOf('bringSceneTransitionOverlayToTop(sourceScene.scene)', startIndex);
  assert.ok(startIndex >= 0 && bringIndex > startIndex);
  assert.match(helper, /if \(!scenePlugin\?\.isActive\?\.\(SCENE_TRANSITION_OVERLAY_SCENE_KEY\)\) return false;/);
  assert.match(helper, /scenePlugin\.bringToTop\?\.\(SCENE_TRANSITION_OVERLAY_SCENE_KEY\)/);
  assert.match(read('src/scenes/MainMenuScene.js'), /this\.scene\.start\('CollectionScene',[\s\S]*bringSceneTransitionOverlayToTop\(this\.scene\)/);
  assert.match(read('src/scenes/BattleScene.js'), /this\.scene\.start\(destinationSceneKey,[\s\S]*bringSceneTransitionOverlayToTop\(this\.scene\)/);
});

test('fast readiness before delayed threshold stops silently without logo flash', () => {
  assert.match(overlay, /const DELAYED_SHOW_MS = 300;/);
  assert.match(overlay, /this\.reconcileReadiness\('delayed-show'\)/);
  assert.match(overlay, /if \(!this\.hasShown\) \{[\s\S]*this\.cleanupAndStop\(\);/);
});

test('slow readiness shows only logo and loading ring and fades out', () => {
  assert.match(overlay, /const FADE_OUT_MS = 220;/);
  assert.match(overlay, /GRIDFALL_LOGO_ASSET/);
  assert.match(overlay, /createLoadingRing/);
  assert.doesNotMatch(overlay, /PREPARING BROADCAST|progress|percentage|tips|flavor/i);
});

test('unique transition ids validate and stale ready events are ignored', () => {
  assert.match(helper, /return `scene-transition-\$\{transitionSequence\}`;/);
  assert.match(overlay, /event\?\.transitionId !== this\.transitionId \|\| event\?\.destinationSceneKey !== this\.destinationSceneKey/);
  assert.match(helper, /event\?\.transitionId !== transitionId \|\| event\?\.destinationSceneKey !== targetSceneKey/);
});

test('ready state can be reconciled after simulated resume instead of relying on one-shot events', () => {
  assert.match(helper, /SCENE_TRANSITION_REGISTRY_KEY/);
  assert.match(helper, /markSceneTransitionReady/);
  assert.match(overlay, /getSceneTransitionState\(this\.game, this\.transitionId\)/);
  assert.match(overlay, /this\.reconcileReadiness\('lifecycle-resume'\)/);
});

test('repeated resume events do not duplicate cleanup or navigation', () => {
  assert.match(overlay, /if \(this\.completed \|\| this\.cleaningUp\) return;/);
  assert.match(overlay, /if \(this\.cleaningUp\) return;/);
  assert.match(overlay, /this\.resumeTimer\?\.remove\?\.\(false\)/);
  assert.doesNotMatch(overlay, /scene\.start\(/);
});

test('resize and fullscreen reflow uses current game dimensions without restarting ring', () => {
  assert.match(overlay, /this\.scale\.on\('resize', this\.resizeHandler, this\)/);
  assert.match(overlay, /this\.scale\.on\('enterfullscreen', this\.resizeHandler, this\)/);
  assert.match(overlay, /this\.scale\.on\('leavefullscreen', this\.resizeHandler, this\)/);
  assert.match(overlay, /const gameSize = this\.scale\?\.gameSize;/);
  assert.match(overlay, /if \(this\.ringTween \|\| !this\.ring\) return;/);
});

test('failsafe cleanup is bounded and does not restart navigation or return to source', () => {
  assert.match(overlay, /const FAILSAFE_ACTIVE_MS = 8000;/);
  assert.match(overlay, /document\.hidden === true/);
  assert.match(overlay, /Scene transition overlay failsafe cleanup/);
  assert.doesNotMatch(overlay, /returnToSource|sourceSceneKey[\s\S]{0,120}scene\.start/);
});

test('overlay is integrated only in approved production navigation paths', () => {
  assert.match(read('src/scenes/MainMenuScene.js'), /beginSceneTransitionOverlay\(this, 'CollectionScene'\)/);
  assert.match(read('src/scenes/BattleScene.js'), /startPostBattleDestinationWithOverlay/);
  for (const path of ['src/scenes/AchievementsScene.js', 'src/scenes/SettingsScene.js', 'src/scenes/RulesPanelScene.js', 'src/scenes/StartScene.js']) {
    assert.doesNotMatch(read(path), /startSceneWithTransitionOverlay|beginSceneTransitionOverlay|SCENE_TRANSITION_VISUALLY_READY_EVENT|emitSceneTransitionVisuallyReady|SceneTransitionOverlayScene/, path);
  }
});


test('Collection readiness waits for back control and post-render instead of drawCollectionList', () => {
  const collection = read('src/scenes/CollectionScene.js');
  const drawStart = collection.indexOf('  drawCollectionList({ width, height }) {');
  const drawEnd = collection.indexOf('  rebuildCollectionContent({ width }) {', drawStart);
  assert.ok(drawStart >= 0 && drawEnd > drawStart);
  assert.doesNotMatch(collection.slice(drawStart, drawEnd), /emitTransitionReadyIfNeeded|scheduleTransitionReadyAfterFirstRender/);
  assert.match(collection, /this\.drawCollectionList\(\{ width, height \}\);\s*this\.createBackButton\(width, height\);\s*this\.scheduleTransitionReadyAfterFirstRender\(\);/);
  assert.match(collection, /const postRenderEvent = Phaser\.Core\?\.Events\?\.POST_RENDER \?\? 'postrender';/);
  assert.match(collection, /this\.game\?\.events\?\.once\?\.\(postRenderEvent, runOnce\)/);
});

test('Collection post-render readiness is one-shot and cleans late callbacks on shutdown', () => {
  const collection = read('src/scenes/CollectionScene.js');
  assert.match(collection, /this\.transitionReadyEmitted = false;/);
  assert.match(collection, /if \(typeof transitionId !== 'string' \|\| !transitionId \|\| this\.transitionReadyEmitted \|\| this\.transitionReadyPostRenderCallback\) return;/);
  assert.match(collection, /if \(this\.transitionReadyEmitted \|\| !this\.scene\?\.isActive\?\.\(this\.scene\.key\)\) return;/);
  assert.match(collection, /this\.transitionReadyFallbackEvent = this\.time\?\.delayedCall\?\.\(120, runOnce\) \?\? null;/);
  assert.match(collection, /this\.clearPendingTransitionReadyCallbacks\(\);[\s\S]*this\.emitTransitionReadyIfNeeded\(\);/);
  assert.match(collection, /this\.game\?\.events\?\.off\?\.\(postRenderEvent, this\.transitionReadyPostRenderCallback\)/);
  assert.match(collection, /this\.transitionReadyFallbackEvent\?\.remove\?\.\(false\)/);
  assert.match(collection, /if \(typeof transitionId !== 'string' \|\| !transitionId \|\| this\.transitionReadyEmitted\) return;/);
});

test('overlay visible lifecycle remains delayed, full-root faded, and blocker cleaned before fade', () => {
  assert.match(overlay, /const DELAYED_SHOW_MS = 300;/);
  assert.match(overlay, /this\.root\.setVisible\(true\);[\s\S]*this\.createInputBlocker\(\);[\s\S]*this\.startRingTween\(\);/);
  assert.match(overlay, /targets: this\.root,[\s\S]*duration: FADE_OUT_MS/);
  assert.match(overlay, /fadeOutAndStop\(\) \{[\s\S]*this\.destroyInputBlocker\(\);[\s\S]*this\.tweens\.add/);
});

test('post-battle overlay routes keep the same destinations while reordering overlay', () => {
  const battle = read('src/scenes/BattleScene.js');
  assert.match(battle, /startPostBattleDestinationWithOverlay\(destinationSceneKey, data = \{\}\) \{/);
  assert.match(battle, /this\.scene\.start\(destinationSceneKey,[\s\S]*bringSceneTransitionOverlayToTop\(this\.scene\);/);
  assert.match(battle, /this\.startPostBattleDestinationWithOverlay\('FactionSelectScene'\)/);
  assert.match(battle, /this\.startPostBattleDestinationWithOverlay\('CampaignEnemySelectScene'\)/);
  assert.match(battle, /this\.startPostBattleDestinationWithOverlay\('GameMenuScene'\)/);
});

test('BattleTransitionScene remains independent', () => {
  assert.doesNotMatch(battleTransition, /SceneTransitionOverlayScene|SCENE_TRANSITION_VISUALLY_READY_EVENT|sceneTransitionOverlay/);
  assert.match(battleTransition, /BATTLE_SCENE_VISUALLY_READY_EVENT/);
  assert.match(battleTransition, /returnToSourceWhenVisible/);
});
