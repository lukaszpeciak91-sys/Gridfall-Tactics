import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const readScene = (path) => fs.readFileSync(path, 'utf8');

test('faction selection starts BattleScene without stopping itself or clearing global input listeners', () => {
  const source = readScene('src/scenes/FactionSelectScene.js');

  assert.match(source, /button\.on\('pointerup', \(\) => this\.startBattle\(factionKey\)\)/);
  assert.match(source, /this\.scene\.start\('BattleScene', \{ factionKey \}\)/);
  assert.doesNotMatch(source, /this\.scene\.stop\('FactionSelectScene'\)/);
  assert.doesNotMatch(source, /this\.input\.removeAllListeners\(\)/);
});

test('faction selection diagnoses blocked transitions and clears stale battle/menu scenes before starting', () => {
  const source = readScene('src/scenes/FactionSelectScene.js');

  assert.match(source, /getBattleTransitionDiagnostics\(factionKey\)/);
  assert.match(source, /blockedReason: battleScene \? null : 'missing BattleScene'/);
  assert.match(source, /staleInteractiveObjects: this\.getStaleInteractiveObjects\(\)/);
  assert.match(source, /stopStaleBattleScenes\(transitionDiagnostics\)/);
  assert.match(source, /'BattleScene', 'BattleMenuScene'/);
  assert.match(source, /this\.scene\.stop\(sceneKey\)/);
  assert.match(source, /Faction select battle transition threw before BattleScene start/);
  assert.match(source, /Faction select battle transition did not activate BattleScene/);
  assert.match(source, /resetStartBattleGuard\(\)/);
});

test('BattleScene imports every GameState helper used during create', () => {
  const source = readScene('src/scenes/BattleScene.js');

  assert.match(source, /import \{[^}]*\bshuffleDeck\b[^}]*\} from '\.\.\/systems\/GameState\.js';/s);
  assert.match(source, /shuffleDeck\(this\.gameState\.player\.deck\)/);
  assert.match(source, /shuffleDeck\(this\.gameState\.enemy\.deck\)/);
});

test('BattleScene returns to faction select through a cleanup path and retry stays in BattleScene', () => {
  const source = readScene('src/scenes/BattleScene.js');

  assert.match(source, /drawBottomUtilityBar\(\) \{[\s\S]*createBottomNavigationControls\(this, \{[\s\S]*onBack: \(\) => this\.exitBattleToFactionSelect\(\),[\s\S]*centerY: hand\.controlCenterY,[\s\S]*touchSize: hand\.controlTouchSize,[\s\S]*margin,[\s\S]*\}\)/);
  assert.match(source, /this\.scene\.start\('FactionSelectScene'\)/);
  assert.match(source, /this\.scene\.restart\(\{ factionKey, enemyFactionKey \}\)/);
  assert.match(source, /exitBattleToFactionSelect\(\) \{[\s\S]*this\.scene\.start\('FactionSelectScene'\)/);
  assert.match(source, /retryBattle\(\) \{[\s\S]*this\.scene\.restart\(\{ factionKey, enemyFactionKey \}\)/);
  assert.doesNotMatch(source, /this\.scene\.stop\('BattleScene'\)/);
});

test('BattleScene lifecycle destroys stale interactive objects, overlays, timers, and tweens before each navigation loop', () => {
  const source = readScene('src/scenes/BattleScene.js');
  const expectedFiveLoopCoverage = [
    'launch → faction select → battle',
    'battle back → faction select → battle',
    'battle result exit → faction select → battle',
    'retry → exit → faction select → battle',
    'repeat navigation loop 5x',
  ];

  assert.match(source, /init\(\) \{\s*this\.cleanupSceneObjects\(\);\s*this\.resetRuntimeState\(\);\s*\}/);
  assert.match(source, /create\(data\) \{\s*this\.cleanupSceneObjects\(\);/);
  assert.match(source, /shutdown\(\) \{\s*this\.cleanupSceneObjects\(\);/);
  assert.match(source, /cleanupSceneObjects\(\{ preserveTimers = false, preserveTweens = false \} = \{\}\) \{[\s\S]*this\.destroyBattleResultModal\(\);[\s\S]*if \(!preserveTweens\) \{[\s\S]*this\.tweens\?\.killAll\?\.\(\);[\s\S]*if \(!preserveTimers\) \{[\s\S]*this\.time\?\.removeAllEvents\?\.\(\);[\s\S]*this\.children\.removeAll\(true\);[\s\S]*\}/);
  assert.match(source, /destroyBattleResultModal\(\) \{[\s\S]*overlay[\s\S]*buttons[\s\S]*item\?\.removeAllListeners\?\.\(\);[\s\S]*item\?\.destroy\?\.\(\);[\s\S]*\}/);
  assert.equal(expectedFiveLoopCoverage.length, 5);
});



test('BattleScene bottom navigation uses resolved layout metrics before entering battle', () => {
  const source = readScene('src/scenes/BattleScene.js');

  assert.match(source, /drawBottomUtilityBar\(\) \{[\s\S]*const \{ hand, margin \} = this\.layout;[\s\S]*const controls = createBottomNavigationControls\(this, \{[\s\S]*centerY: hand\.controlCenterY,[\s\S]*touchSize: hand\.controlTouchSize,[\s\S]*margin,[\s\S]*\}\);[\s\S]*this\.bottomControlViews = \[controls\.back, controls\.rules, controls\.fullscreen\]\.filter\(Boolean\);[\s\S]*\}/);
  assert.doesNotMatch(source, /createFloatingControl\(backX, centerY, touchSize/);
  assert.doesNotMatch(source, /createFloatingControl\(width \* 0\.5, centerY, touchSize/);
  assert.doesNotMatch(source, /createFloatingControl\(fullscreenX, centerY, touchSize/);
});

test('rules panel opens from the middle bottom icon and resumes the existing scene', () => {
  const battleSource = readScene('src/scenes/BattleScene.js');
  const factionSource = readScene('src/scenes/FactionSelectScene.js');
  const rulesSource = readScene('src/scenes/RulesPanelScene.js');
  const helperSource = readScene('src/ui/navigationControls.js');
  const mainSource = readScene('src/main.js');

  assert.match(helperSource, /rules: createFloatingControl\(scene, metrics\.width \* 0\.5, metrics\.centerY, metrics\.touchSize, '\?', middleAction/);
  assert.match(battleSource, /drawBottomUtilityBar\(\) \{[\s\S]*createBottomNavigationControls\(this, \{[\s\S]*onRules: \(\) => this\.openRulesPanel\(\),[\s\S]*onFullscreen: \(\) => this\.toggleFullscreen\(\),[\s\S]*\}\)/);
  assert.doesNotMatch(battleSource, /deckLabel: `x\$\{deckCount\}`/);
  assert.match(battleSource, /openRulesPanel\(\) \{[\s\S]*this\.scene\.launch\('RulesPanelScene', \{ returnSceneKey: 'BattleScene' \}\);[\s\S]*this\.scene\.pause\(\);[\s\S]*\}/);
  assert.match(battleSource, /resumeFromRulesPanel\(\) \{[\s\S]*this\.scene\.resume\(\);[\s\S]*this\.recoverFromLifecycle\('rules-panel-return'\);[\s\S]*\}/);
  assert.match(factionSource, /openRulesPanel\(\) \{[\s\S]*this\.scene\.launch\('RulesPanelScene', \{ returnSceneKey: 'FactionSelectScene' \}\);[\s\S]*this\.scene\.pause\(\);[\s\S]*\}/);
  assert.match(rulesSource, /closeButton\.on\('pointerup', \(\) => this\.closePanel\(\)\)/);
  assert.match(rulesSource, /backButton\.on\('pointerup', \(\) => this\.closePanel\(\)\)/);
  assert.match(rulesSource, /returnScene\?\.resumeFromRulesPanel/);
  assert.match(mainSource, /RulesPanelScene/);
});

test('FactionSelectScene uses shared bottom navigation controls for start, rules, and fullscreen', () => {
  const factionSource = readScene('src/scenes/FactionSelectScene.js');
  const battleSource = readScene('src/scenes/BattleScene.js');
  const helperSource = readScene('src/ui/navigationControls.js');
  const menuSource = readScene('src/scenes/BattleMenuScene.js');

  assert.match(factionSource, /import \{ createBottomNavigationControls, requestPortraitOrientationLock, toggleSceneFullscreen \} from '\.\.\/ui\/navigationControls\.js';/);
  assert.match(battleSource, /import \{ createBottomNavigationControls, requestPortraitOrientationLock, toggleSceneFullscreen \} from '\.\.\/ui\/navigationControls\.js';/);
  assert.match(helperSource, /export function createBottomNavigationControls/);
  assert.match(helperSource, /export function createFloatingControl/);
  assert.match(helperSource, /export function requestPortraitOrientationLock/);
  assert.match(factionSource, /drawNavigationControls\(\) \{[\s\S]*createBottomNavigationControls\(this, \{[\s\S]*onBack: \(\) => this\.returnToStart\(\),[\s\S]*onRules: \(\) => this\.openRulesPanel\(\),[\s\S]*onFullscreen: \(\) => this\.toggleFullscreen\(\),[\s\S]*\}\)/);
  assert.match(factionSource, /returnToStart\(\) \{[\s\S]*this\.scene\.start\('StartScene'\)/);
  assert.match(factionSource, /openRulesPanel\(\) \{[\s\S]*this\.scene\.launch\('RulesPanelScene', \{ returnSceneKey: 'FactionSelectScene' \}\);[\s\S]*this\.scene\.pause\(\);[\s\S]*\}/);
  assert.match(factionSource, /toggleFullscreen\(\) \{[\s\S]*toggleSceneFullscreen\(this\);[\s\S]*\}/);
  assert.match(factionSource, /onFullscreenChanged\(\) \{[\s\S]*this\.scale\.isFullscreen[\s\S]*requestPortraitOrientationLock\(\);[\s\S]*this\.scene\.restart\(\);[\s\S]*\}/);
  assert.match(battleSource, /onFullscreenChanged\(\) \{[\s\S]*this\.scale\.isFullscreen[\s\S]*requestPortraitOrientationLock\(\);[\s\S]*this\.recoverFromLifecycle\(this\.scale\.isFullscreen \? 'enterfullscreen' : 'leavefullscreen'\);[\s\S]*\}/);
  assert.match(menuSource, /const returnSceneKey = typeof data\?\.returnSceneKey === 'string'/);
});


test('shell requests portrait orientation and keeps landscape fallback centered', () => {
  const indexSource = readScene('index.html');
  const manifestSource = readScene('public/manifest.webmanifest');

  assert.match(indexSource, /name="viewport"/);
  assert.match(indexSource, /viewport-fit=cover/);
  assert.match(indexSource, /user-scalable=no/);
  assert.match(indexSource, /<link rel="manifest" href="\/manifest\.webmanifest" \/>/);
  assert.match(indexSource, /@media \(orientation: landscape\)/);
  assert.match(indexSource, /aspect-ratio: var\(--game-portrait-width\) \/ var\(--game-portrait-height\)/);
  assert.match(indexSource, /Rotate device to portrait/);
  assert.match(manifestSource, /"orientation": "portrait"/);
});

test('runtime session lifecycle listens for browser visibility, fullscreen, Phaser pause/resume, and WebGL restore', () => {
  const mainSource = readScene('src/main.js');
  const lifecycleSource = readScene('src/systems/sessionLifecycle.js');
  const battleSource = readScene('src/scenes/BattleScene.js');

  assert.match(mainSource, /installSessionLifecycle\(game\)/);
  assert.match(lifecycleSource, /'visibilitychange'/);
  assert.match(lifecycleSource, /'fullscreenchange'/);
  assert.match(lifecycleSource, /'blur'/);
  assert.match(lifecycleSource, /'focus'/);
  assert.match(lifecycleSource, /'pagehide'/);
  assert.match(lifecycleSource, /'pageshow'/);
  assert.match(lifecycleSource, /Phaser\.Core\.Events\.PAUSE/);
  assert.match(lifecycleSource, /Phaser\.Core\.Events\.RESUME/);
  assert.match(lifecycleSource, /'webglcontextlost'/);
  assert.match(lifecycleSource, /'webglcontextrestored'/);
  assert.match(battleSource, /recoverFromLifecycle\(reason = 'unknown', diagnostics = null\)/);
  assert.match(battleSource, /rendererContextLost: Boolean\(gl\?\.isContextLost\?\.\(\)\)/);
  assert.match(battleSource, /this\.rebuildBattleView\(reason\)/);
});

test('BattleScene routes every winner branch through delayed result modal completion', () => {
  const source = readScene('src/scenes/BattleScene.js');

  assert.match(source, /completeBattleFlow\(delayMs = 500\) \{[\s\S]*this\.updateInitiativeIndicator\(\);[\s\S]*this\.scheduleBattleResultModal\(delayMs\);[\s\S]*\}/);
  assert.match(source, /scheduleBattleResultModal\(delayMs = 500\) \{[\s\S]*this\.battleResultModalPending = true;[\s\S]*this\.time\.delayedCall\(delayMs, \(\) => this\.showBattleResultModal\(\)\);[\s\S]*\}/);
  assert.match(source, /resolveImmediateNoProgressWinner\(this\.gameState\);\s*if \(this\.gameState\.winner\) \{\s*this\.completeBattleFlow\(500\);\s*return;\s*\}/);
  assert.match(source, /resolveTurnCapWinner\(this\.gameState, this\.gameState\.turnsCompleted\);[\s\S]*if \(this\.gameState\.winner\) \{\s*this\.completeBattleFlow\(500\);\s*return;\s*\}/);
});

test('BattleScene still opens the result modal when a player action sets winner', () => {
  const source = readScene('src/scenes/BattleScene.js');
  const completePlayerActionStart = source.indexOf('async completePlayerAction');
  const finishTurnStart = source.indexOf('async finishTurnAfterBothActions');
  const completePlayerActionSource = source.slice(completePlayerActionStart, finishTurnStart);

  assert.doesNotMatch(completePlayerActionSource, /this\.gameState\.winner \|\| this\.isFlowResolving/);
  assert.match(completePlayerActionSource, /await this\.playBuffFeedback\(beforeStats, 'player'\);\s*if \(this\.gameState\.winner\) \{\s*this\.completeBattleFlow\(500\);\s*return;\s*\}/);
});

test('rules panel contains the current short player-facing MVP rules summary', () => {
  const source = readScene('src/scenes/RulesPanelScene.js');

  assert.match(source, /Both heroes start at 12 HP/);
  assert.match(source, /The fight has 3 lanes/);
  assert.match(source, /mulligan up to 2 cards once/);
  assert.match(source, /initiative alternates each turn/);
  assert.match(source, /Each side gets 1 action/);
  assert.match(source, /Cards have no mana, energy, or cost system/);
  assert.match(source, /combat resolves automatically/);
  assert.match(source, /After combat, you draw 1 card/);
  assert.match(source, /A battle can end when a hero is defeated/);
  assert.match(source, /neither side can make meaningful progress/);
  assert.match(source, /turn limit is reached/);
  assert.doesNotMatch(source, /stall/i);
  assert.doesNotMatch(source, /telemetry/i);
});
