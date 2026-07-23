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
  assert.match(helper, /export function reconcileSceneTransitionOverlayOrdering/);
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


test('overlay ordering is retried after queued launch and destination start', () => {
  const startIndex = helper.indexOf('sourceScene.scene.start(targetSceneKey');
  const reconcileIndex = helper.indexOf('reconcileSceneTransitionOverlayOrdering(sourceScene.scene', startIndex);
  assert.ok(startIndex >= 0 && reconcileIndex > startIndex);
  assert.match(helper, /managerEvents\?\.once\?\.\(Phaser\.Core\?\.Events\?\.POST_STEP \?\? 'poststep', deferred\)/);
  assert.match(helper, /managerEvents\?\.once\?\.\(Phaser\.Core\?\.Events\?\.POST_RENDER \?\? 'postrender', deferred\)/);
  assert.match(read('src/scenes/MainMenuScene.js'), /this\.scene\.start\('CollectionScene',[\s\S]*reconcileSceneTransitionOverlayOrdering\(this\.scene/);
  assert.match(read('src/scenes/BattleScene.js'), /this\.scene\.start\(destinationSceneKey,[\s\S]*reconcileSceneTransitionOverlayOrdering\(this\.scene/);
});

test('overlay remains topmost until fade begins', () => {
  assert.match(helper, /overlay\?\.transitionId && overlay\.transitionId !== transitionId/);
  assert.match(helper, /overlay\?\.destinationSceneKey && overlay\.destinationSceneKey !== destinationSceneKey/);
  assert.match(overlay, /reconcileSceneTransitionOverlayOrdering\(this\.scene, \{ transitionId: this\.transitionId, destinationSceneKey: this\.destinationSceneKey \}\);[\s\S]*this\.root\.setVisible\(true\)/);
});

test('fast readiness before delayed threshold stops silently without logo flash', () => {
  assert.match(overlay, /const DELAYED_SHOW_MS = 120;/);
  assert.match(overlay, /if \(this\.reconcileReadiness\('delayed-show'\)\) \{[\s\S]*return;[\s\S]*this\.showOverlay\(\);/);
  assert.match(overlay, /if \(this\.cleaningUp \|\| this\.completed \|\| !this\.isCurrentTransitionState\(\)\) \{[\s\S]*return;/);
});

test('slow readiness shows only logo and loading ring and fades out', () => {
  assert.match(overlay, /const FADE_OUT_MS = 220;/);
  assert.match(overlay, /GRIDFALL_LOGO_ASSET/);
  assert.match(overlay, /createLoadingRing/);
  assert.doesNotMatch(overlay, /PREPARING BROADCAST|progress|percentage|tips|flavor/i);
});


test('shared transition overlay reuses startup loading visual metrics without startup text', () => {
  const menuLogoLayout = read('src/ui/menuLogoLayout.js');
  assert.match(menuLogoLayout, /export const STARTUP_LOADING_VISUAL_LAYOUT = \{/);
  assert.match(menuLogoLayout, /ringDiameter: 34/);
  assert.match(menuLogoLayout, /logoToRingCenterGap: 25/);
  assert.match(menuLogoLayout, /outerRingDurationMs: 1450/);
  assert.match(menuLogoLayout, /innerRingDurationMs: 2100/);
  assert.match(overlay, /getStartHeroLogoPosition\(width, height\)/);
  assert.match(overlay, /setStartHeroLogoDisplaySize\(this, this\.logo, width, height\)/);
  assert.doesNotMatch(overlay, /setMainMenuLogoDisplaySize|scaleX \* 1\.28|height \* 0\.69/);
  assert.match(overlay, /STARTUP_LOADING_VISUAL_LAYOUT\.ringDiameter \/ 2/);
  assert.match(overlay, /targets: this\.outerRing[\s\S]*STARTUP_LOADING_VISUAL_LAYOUT\.outerRingDurationMs/);
  assert.match(overlay, /targets: this\.innerRing[\s\S]*STARTUP_LOADING_VISUAL_LAYOUT\.innerRingDurationMs/);
  assert.doesNotMatch(overlay, /PREPARING BROADCAST|startup-splash__copy|createLoadingText/i);
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
  assert.match(overlay, /if \(this\.ringTween \|\| !this\.outerRing \|\| !this\.innerRing\) return;/);
});

test('failsafe threshold waits instead of completing when registry readiness is false', () => {
  assert.match(overlay, /const FAILSAFE_ACTIVE_MS = 8000;/);
  assert.match(overlay, /document\.hidden === true/);
  assert.match(overlay, /handleFailsafeThresholdReached\(\)/);
  assert.match(overlay, /registryReady && this\.reconcileReadiness\('failsafe-threshold'\)/);
  assert.match(overlay, /console\.warn\('Scene transition failsafe threshold reached without readiness; overlay remains waiting\.'/);
  assert.doesNotMatch(overlay, /failsafe readiness resolution/);
  assert.doesNotMatch(overlay, /returnToSource|sourceSceneKey[\s\S]{0,120}scene\.start/);
});


test('delayed show cannot flash after readiness cleanup starts', () => {
  assert.match(overlay, /this\.showTimer\?\.remove\?\.\(false\);\n    this\.showTimer = null;/);
  assert.match(overlay, /if \(this\.cleaningUp \|\| this\.completed \|\| !this\.isCurrentTransitionState\(\)\) \{\n        return;\n      \}/);
});

test('failsafe keeps overlay visible and preserves waiting guard before readiness', () => {
  const start = overlay.indexOf('  handleFailsafeThresholdReached() {');
  const end = overlay.indexOf('  handleHardEmergencyTimeout() {', start);
  const body = overlay.slice(start, end);
  assert.match(overlay, /isDestinationRenderable\(\) \{[\s\S]*return this\.scene\.isActive\(this\.destinationSceneKey\) \|\| this\.scene\.isVisible\(this\.destinationSceneKey\);/);
  assert.match(body, /if \(!this\.hasShown\) this\.showOverlay\(\);/);
  assert.match(body, /this\.ensureOverlayTopWhileWaiting\('failsafe threshold waiting'\)/);
  assert.doesNotMatch(body, /fadeOutAndStop\(\)/);
  assert.doesNotMatch(body, /cleanupAndStop\(/);
});


test('failsafe cannot mark readiness, fade, clean up, stop, or remove guard before matching readiness', () => {
  const start = overlay.indexOf('  handleFailsafeThresholdReached() {');
  const end = overlay.indexOf('  handleHardEmergencyTimeout() {', start);
  const body = overlay.slice(start, end);
  assert.match(body, /overlayPending = !this\.completed && !this\.readyRecorded/);
  assert.match(body, /overlayActive && overlayPending && !this\.cleaningUp/);
  assert.match(body, /this\.ensureOverlayTopWhileWaiting\('failsafe threshold waiting'\)/);
  assert.doesNotMatch(body, /markSceneTransitionReady|ready:\s*true|finishWhenStable\(|fadeOutAndStop\(|cleanupAndStop\(|scene\.stop\(|removeWaitingFrameOrderGuard\(/);
});

test('later matching readiness remains the only normal completion path and stale readiness is ignored', () => {
  assert.match(overlay, /handleReadyEvent\(event = \{\}\) \{[\s\S]*event\?\.transitionId !== this\.transitionId \|\| event\?\.destinationSceneKey !== this\.destinationSceneKey/);
  assert.match(overlay, /markSceneTransitionReady\(this\.game, \{ destinationSceneKey: this\.destinationSceneKey, transitionId: this\.transitionId, payload: event \}\);/);
  assert.match(overlay, /this\.finishWhenStable\('ready-event'\);/);
  assert.match(overlay, /if \(state\?\.ready === true && state\.destinationSceneKey === this\.destinationSceneKey\) \{/);
  assert.match(overlay, /if \(this\.completed \|\| this\.cleaningUp\) return;/);
});

test('slow Collection and post-battle transitions can exceed old failsafe without normal completion', () => {
  assert.match(read('src/scenes/MainMenuScene.js'), /beginSceneTransitionOverlay\(this, 'CollectionScene'\)/);
  assert.match(read('src/scenes/BattleScene.js'), /this\.startPostBattleDestinationWithOverlay\('FactionSelectScene'\)/);
  assert.match(read('src/scenes/BattleScene.js'), /this\.startPostBattleDestinationWithOverlay\('CampaignEnemySelectScene'\)/);
  assert.match(read('src/scenes/BattleScene.js'), /this\.startPostBattleDestinationWithOverlay\('GameMenuScene'\)/);
  assert.match(overlay, /if \(this\.activeElapsedMs >= FAILSAFE_ACTIVE_MS\) \{[\s\S]*this\.handleFailsafeThresholdReached\(\);[\s\S]*\}/);
  assert.doesNotMatch(overlay, /this\.activeElapsedMs >= FAILSAFE_ACTIVE_MS[\s\S]{0,240}fadeOutAndStop\(\)/);
});

test('hard emergency timeout is separate from readiness and keeps recoverable overlay fallback', () => {
  assert.match(overlay, /const HARD_EMERGENCY_ACTIVE_MS = 60000;/);
  assert.match(overlay, /handleHardEmergencyTimeout\(\)/);
  assert.match(overlay, /console\.error\('hard emergency transition timeout'/);
  assert.match(overlay, /hardEmergencyAt/);
  const start = overlay.indexOf('  handleHardEmergencyTimeout() {');
  const end = overlay.indexOf('  handleLifecycleSignal()', start);
  const body = overlay.slice(start, end);
  assert.doesNotMatch(body, /markSceneTransitionReady|ready:\s*true|finishWhenStable\(|fadeOutAndStop\(|cleanupAndStop\(/);
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
  assert.match(collection, /if \(this\.transitionReadyEmitted \|\| \(!this\.scene\?\.isActive\?\.\(this\.scene\.key\) && !this\.scene\?\.isVisible\?\.\(this\.scene\.key\)\)\) return;/);
  assert.match(collection, /this\.transitionReadyFallbackEvent = this\.time\?\.delayedCall\?\.\(120, runOnce\) \?\? null;/);
  assert.match(collection, /this\.clearPendingTransitionReadyCallbacks\(\);[\s\S]*this\.emitTransitionReadyIfNeeded\(\);/);
  assert.match(collection, /this\.game\?\.events\?\.off\?\.\(postRenderEvent, this\.transitionReadyPostRenderCallback\)/);
  assert.match(collection, /this\.transitionReadyFallbackEvent\?\.remove\?\.\(false\)/);
  assert.match(collection, /if \(typeof transitionId !== 'string' \|\| !transitionId \|\| this\.transitionReadyEmitted\) return;/);
});

test('overlay visible lifecycle remains delayed, full-root faded, and blocker cleaned before fade', () => {
  assert.match(overlay, /const DELAYED_SHOW_MS = 120;/);
  assert.doesNotMatch(overlay, /this\.createInputBlocker\(\);\n    this\.scheduleDelayedShow\(\);/);
  assert.match(overlay, /this\.root\.setVisible\(true\);[\s\S]*this\.createInputBlocker\(\);[\s\S]*this\.startRingTween\(\);/);
  assert.match(overlay, /targets: this\.root,[\s\S]*duration: FADE_OUT_MS/);
  assert.match(overlay, /fadeOutAndStop\(\) \{[\s\S]*this\.destroyInputBlocker\(\);[\s\S]*this\.tweens\.add/);
});

test('post-battle overlay routes keep the same destinations while reordering overlay', () => {
  const battle = read('src/scenes/BattleScene.js');
  assert.match(battle, /startPostBattleDestinationWithOverlay\(destinationSceneKey, data = \{\}\) \{/);
  assert.match(battle, /this\.scene\.start\(destinationSceneKey,[\s\S]*reconcileSceneTransitionOverlayOrdering\(this\.scene/);
  assert.match(battle, /this\.startPostBattleDestinationWithOverlay\('FactionSelectScene'\)/);
  assert.match(battle, /this\.startPostBattleDestinationWithOverlay\('CampaignEnemySelectScene'\)/);
  assert.match(battle, /this\.startPostBattleDestinationWithOverlay\('GameMenuScene'\)/);
});

test('BattleTransitionScene remains independent', () => {
  assert.doesNotMatch(battleTransition, /SceneTransitionOverlayScene|SCENE_TRANSITION_VISUALLY_READY_EVENT|sceneTransitionOverlay/);
  assert.match(battleTransition, /BATTLE_SCENE_VISUALLY_READY_EVENT/);
  assert.match(battleTransition, /returnToSourceWhenVisible/);
});

test('post-battle destination readiness waits for POST_RENDER and is not emitted during UI construction', () => {
  for (const path of ['src/scenes/FactionSelectScene.js', 'src/scenes/CampaignEnemySelectScene.js', 'src/scenes/GameMenuScene.js']) {
    const source = read(path);
    const createStart = source.indexOf('  create() {');
    const readyMethod = source.indexOf('  scheduleTransitionReadyAfterFirstRender()', createStart);
    const createBody = source.slice(createStart, readyMethod);
    assert.match(createBody, /this\.scheduleTransitionReadyAfterFirstRender\(\);/);
    assert.doesNotMatch(createBody, /this\.emitTransitionReadyIfNeeded\(\);/);
    assert.match(source, /const postRenderEvent = Phaser\.Core\?\.Events\?\.POST_RENDER \?\? 'postrender';/);
    assert.match(source, /this\.game\?\.events\?\.once\?\.\(postRenderEvent, runOnce\)/);
    assert.match(source, /this\.transitionReadyFallbackEvent = this\.time\?\.delayedCall\?\.\(120, runOnce\) \?\? null;/);
    assert.match(source, /if \(this\.transitionReadyEmitted \|\| \(!this\.scene\?\.isActive\?\.\(this\.scene\.key\) && !this\.scene\?\.isVisible\?\.\(this\.scene\.key\)\)\) return;/);
    assert.match(source, /if \(typeof transitionId !== 'string' \|\| !transitionId \|\| this\.transitionReadyEmitted\) return;/);
  }
});

test('invalid campaign redirect forwards transition metadata without orphaning original transition', () => {
  const campaign = read('src/scenes/CampaignEnemySelectScene.js');
  assert.match(campaign, /this\.scene\.start\('GameMenuScene', \{ sceneTransitionOverlay: this\.sceneTransitionOverlay \}\);/);
  assert.doesNotMatch(campaign, /createSceneTransitionId|beginSceneTransitionOverlay\(this, 'GameMenuScene'/);
});

test('fullscreen restart preserves active transition metadata for post-battle destinations', () => {
  assert.match(read('src/scenes/FactionSelectScene.js'), /sceneTransitionOverlay: this\.sceneTransitionOverlay/);
  assert.match(read('src/scenes/CampaignEnemySelectScene.js'), /sceneTransitionOverlay: this\.sceneTransitionOverlay/);
  assert.match(read('src/scenes/GameMenuScene.js'), /sceneTransitionOverlay: this\.sceneTransitionOverlay/);
});

test('post-battle destination cleanup removes readiness listener and fallback timer', () => {
  for (const path of ['src/scenes/FactionSelectScene.js', 'src/scenes/CampaignEnemySelectScene.js', 'src/scenes/GameMenuScene.js']) {
    const source = read(path);
    assert.match(source, /this\.game\?\.events\?\.off\?\.\(postRenderEvent, this\.transitionReadyPostRenderCallback\)/);
    assert.match(source, /this\.transitionReadyFallbackEvent\?\.remove\?\.\(false\)/);
    assert.match(source, /this\.clearPendingTransitionReadyCallbacks\(\);/);
  }
  assert.match(overlay, /this\.destroyInputBlocker\(\);/);
  assert.match(overlay, /if \(this\.clearRegistryOnCleanup\) clearSceneTransitionState\(this\.game, this\.transitionId\);/);
});

test('overlay waiting frame guard keeps it topmost while readiness is false', () => {
  assert.match(overlay, /installWaitingFrameOrderGuard\(\) \{[\s\S]*PRE_RENDER[\s\S]*ensureOverlayTopWhileWaiting\('waiting frame pre-render'\)/);
  assert.match(overlay, /ensureOverlayTopWhileWaiting\(reason\) \{[\s\S]*this\.cleaningUp \|\| this\.completed \|\| !this\.hasShown \|\| !this\.root\?\.visible \|\| !this\.isCurrentTransitionState\(\)/);
  assert.match(overlay, /fadeOutAndStop\(\) \{[\s\S]*this\.removeWaitingFrameOrderGuard\(\);[\s\S]*this\.destroyInputBlocker\(\);/);
});

test('destination create and background checkpoints cannot permanently cover the overlay', () => {
  for (const path of ['src/scenes/CollectionScene.js', 'src/scenes/FactionSelectScene.js', 'src/scenes/CampaignEnemySelectScene.js', 'src/scenes/GameMenuScene.js']) {
    const source = read(path);
    assert.match(source, /this\.reconcileTransitionOverlayOrdering\('destination create start'\)/, path);
    assert.match(source, /createAnimatedMenuBackground[\s\S]*this\.reconcileTransitionOverlayOrdering\('destination background creation'\)/, path);
    assert.match(source, /reconcileSceneTransitionOverlayOrdering\(this\.scene, \{ transitionId, destinationSceneKey: this\.scene\.key, reason \}\)/, path);
  }
});

test('temporary transition trace diagnostics are not shipped', () => {
  assert.doesNotMatch(helper + overlay, /transition-completion-trace|traceSceneTransition|traceVisualState|getSceneTransitionTraceSnapshot|getSceneTransitionCompletionProbe/);
  assert.doesNotMatch(main, /__GRIDFALL_GAME__/);
});

test('logo and loading ring presentation stays visible during simulated slow transition', () => {
  assert.match(overlay, /this\.root\.setVisible\(true\);[\s\S]*this\.installWaitingFrameOrderGuard\(\);[\s\S]*this\.startRingTween\(\);/);
  assert.match(overlay, /targets: this\.root,[\s\S]*alpha: 1,[\s\S]*duration: FADE_IN_MS/);
  assert.match(overlay, /this\.root\.add\(this\.logo\);/);
  assert.match(overlay, /this\.root\.add\(this\.ring\);/);
});

test('fast transitions still do not install the visible waiting guard or duplicate navigation', () => {
  assert.match(overlay, /if \(this\.reconcileReadiness\('delayed-show'\)\) \{[\s\S]*return;[\s\S]*this\.showOverlay\(\);/);
  assert.match(overlay, /showOverlay\(\) \{[\s\S]*if \(this\.hasShown \|\| this\.cleaningUp \|\| !this\.root\) return;/);
  assert.doesNotMatch(overlay, /scene\.launch\(|scene\.start\(/);
  assert.doesNotMatch(helper, /SCENE_TRANSITION_OVERLAY_SCENE_KEY[\s\S]{0,120}SCENE_TRANSITION_OVERLAY_SCENE_KEY[\s\S]{0,120}scene\.launch/);
});
