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
});

test('ready event subscription happens before destination start and overlay does not own navigation', () => {
  const subscribeIndex = helper.indexOf("destinationScene?.events?.on?.(SCENE_TRANSITION_VISUALLY_READY_EVENT, onDestinationReady)");
  const launchIndex = helper.indexOf('sourceScene.scene.launch(SCENE_TRANSITION_OVERLAY_SCENE_KEY');
  const startIndex = helper.indexOf('sourceScene.scene.start(targetSceneKey');
  assert.ok(subscribeIndex >= 0 && launchIndex > subscribeIndex && startIndex > launchIndex);
  assert.doesNotMatch(overlay, /scene\.start\(/);
});

test('fast readiness before delayed threshold stops silently without logo flash', () => {
  assert.match(overlay, /const DELAYED_SHOW_MS = 150;/);
  assert.match(overlay, /this\.reconcileReadiness\('delayed-show'\)/);
  assert.match(overlay, /if \(this\.cleaningUp \|\| this\.completed \|\| this\.readyRecorded \|\| !this\.isTransitionCurrent\(\)\) \{[\s\S]*this\.cleanupAndStop\(\);/);
  assert.match(overlay, /if \(!this\.hasShown\) \{[\s\S]*this\.cleanupAndStop\(\);/);
});

test('delayed show reconciles missed ready registry before presenting blocker or visuals', () => {
  const delayedShowIndex = overlay.indexOf("this.reconcileReadiness('delayed-show')");
  const showOverlayIndex = overlay.indexOf('this.showOverlay();', delayedShowIndex);
  assert.ok(delayedShowIndex >= 0 && showOverlayIndex > delayedShowIndex);
  assert.match(overlay, /reconcileReadiness\(reason\) \{[\s\S]*state\?\.ready === true[\s\S]*this\.finishWhenStable\(reason\);[\s\S]*return true;/);
  assert.match(overlay, /isTransitionCurrent\(\) \{[\s\S]*state\?\.transitionId === this\.transitionId && state\.destinationSceneKey === this\.destinationSceneKey/);
});

test('slow readiness shows only logo and loading ring with minimum visible time and fade out', () => {
  assert.match(overlay, /const MIN_VISIBLE_MS = 260;/);
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
  assert.match(overlay, /this\.reconcileReadiness\('failsafe'\)/);
  assert.match(overlay, /Scene transition overlay failsafe cleanup/);
  assert.doesNotMatch(overlay, /returnToSource|sourceSceneKey[\s\S]{0,120}scene\.start/);
});

test('cleanup paths destroy blocker and presentation root idempotently', () => {
  assert.match(overlay, /destroyInputBlocker\(\) \{[\s\S]*disableInteractive[\s\S]*destroy[\s\S]*this\.inputBlocker = null;/);
  assert.match(overlay, /hidePresentationRoot\(\) \{[\s\S]*setVisible\?\.\(false\)[\s\S]*setAlpha\?\.\(0\)/);
  assert.match(overlay, /cleanupAndStop\([\s\S]*this\.destroyInputBlocker\(\);[\s\S]*this\.hidePresentationRoot\(\);[\s\S]*this\.scene\.stop\(\);/);
  assert.match(overlay, /cleanup\(\) \{[\s\S]*this\.destroyInputBlocker\(\);[\s\S]*this\.hidePresentationRoot\(\);/);
});

test('fast readiness cleanup removes registry state and destination listener', () => {
  assert.match(overlay, /clearSceneTransitionState\(this\.game, this\.transitionId\)/);
  assert.match(overlay, /state\.destinationScene\.events\?\.off\?\.\(SCENE_TRANSITION_VISUALLY_READY_EVENT, state\.readyListener\)/);
  assert.match(overlay, /destination\?\.events\?\.off\?\.\(SCENE_TRANSITION_VISUALLY_READY_EVENT, this\.readyListener\)/);
});

test('BattleTransitionScene remains independent', () => {
  assert.doesNotMatch(battleTransition, /SceneTransitionOverlayScene|SCENE_TRANSITION_VISUALLY_READY_EVENT|sceneTransitionOverlay/);
  assert.match(battleTransition, /BATTLE_SCENE_VISUALLY_READY_EVENT/);
  assert.match(battleTransition, /returnToSourceWhenVisible/);
});
