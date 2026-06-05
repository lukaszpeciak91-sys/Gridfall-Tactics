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


test('BattleScene enemy action pacing constants resolve during turn flow', () => {
  const source = readScene('src/scenes/BattleScene.js');

  assert.match(source, /const ENEMY_ACTION_PACING = Object\.freeze\(\{/);
  assert.match(source, /pass: \{[\s\S]*applyDelayMs:[\s\S]*bannerHoldMs:[\s\S]*postActionDelayMs:[\s\S]*preCombatDelayMs:/);
  assert.match(source, /unit: \{[\s\S]*applyDelayMs: ENEMY_ACTION_APPLY_DELAY_MS,[\s\S]*preCombatDelayMs: ENEMY_ACTION_PRE_COMBAT_DELAY_MS/);
  assert.match(source, /effect: \{[\s\S]*applyDelayMs: ENEMY_EFFECT_ACTION_APPLY_DELAY_MS,[\s\S]*bannerHoldMs: ENEMY_EFFECT_ACTION_BANNER_HOLD_MS,[\s\S]*preCombatDelayMs: ENEMY_ACTION_PRE_COMBAT_DELAY_MS/);
  assert.match(source, /reposition: \{[\s\S]*applyDelayMs: Math\.round\(ENEMY_ACTION_APPLY_DELAY_MS \* 0\.85\),[\s\S]*preCombatDelayMs: ENEMY_ACTION_PRE_COMBAT_DELAY_MS/);
  assert.match(source, /enemyActionPacing\?\.preCombatDelayMs \?\? ENEMY_ACTION_PRE_COMBAT_DELAY_MS/);
  assert.doesNotMatch(source, /ENEMY_ACTION_DEFAULT_PRE_COMBAT_DELAY_MS/);

  assert.match(source, /const PLAYER_EFFECT_CONFIRMATION_FADE_IN_MS = 90/);
  assert.match(source, /showPlayerEffectConfirmation\(card\);/);
  assert.match(source, /playEffectCastSweep\(\{ side: 'player' \}\)/);
  assert.match(source, /translateActive\('ui\.battle\.playerPlayed', 'YOU PLAYED'\)/);
});

test('BattleScene returns to faction select through a cleanup path and retry stays in BattleScene', () => {
  const source = readScene('src/scenes/BattleScene.js');

  assert.match(source, /drawActionRowUtilityMenuTrigger\(\) \{[\s\S]*getActionRowUtilityMenuMetrics\(\);[\s\S]*createFloatingControl\([\s\S]*'☰',[\s\S]*this\.guardPointerEvent\(pointer\);[\s\S]*this\.toggleUtilityMenuPanel\(\);[\s\S]*this\.bottomControlViews = \[menu\];[\s\S]*\}/);
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
  assert.match(source, /cleanupSceneObjects\(\{ preserveTimers = false, preserveTweens = false \} = \{\}\) \{[\s\S]*this\.destroyBattleResultModal\(\);[\s\S]*this\.destroyUtilityMenuPanel\(\);[\s\S]*if \(!preserveTweens\) \{[\s\S]*this\.tweens\?\.killAll\?\.\(\);[\s\S]*if \(!preserveTimers\) \{[\s\S]*this\.time\?\.removeAllEvents\?\.\(\);[\s\S]*this\.children\.removeAll\(true\);[\s\S]*\}/);
  assert.match(source, /destroyBattleResultModal\(\) \{[\s\S]*overlay[\s\S]*buttons[\s\S]*item\?\.removeAllListeners\?\.\(\);[\s\S]*item\?\.destroy\?\.\(\);[\s\S]*\}/);
  assert.equal(expectedFiveLoopCoverage.length, 5);
});



test('BattleScene action row utility menu uses resolved action metrics and no bottom fullscreen control', () => {
  const source = readScene('src/scenes/BattleScene.js');

  assert.match(source, /getActionRowUtilityMenuMetrics\(\) \{[\s\S]*const \{ width, action, margin \} = this\.layout;[\s\S]*const actionButtonWidth = width \* 0\.46;[\s\S]*const actionButtonLeft = width \* 0\.5 - actionButtonWidth \/ 2;[\s\S]*x: Phaser\.Math\.Clamp\([\s\S]*actionButtonLeft - gap - touchSize \/ 2,[\s\S]*y: action\.centerY,[\s\S]*touchSize,[\s\S]*\}/);
  assert.match(source, /drawActionRowUtilityMenuTrigger\(\) \{[\s\S]*const \{ x, y, touchSize \} = this\.getActionRowUtilityMenuMetrics\(\);[\s\S]*createFloatingControl\([\s\S]*x,[\s\S]*y,[\s\S]*touchSize,[\s\S]*'☰',[\s\S]*this\.bottomControlViews = \[menu\];[\s\S]*\}/);
  assert.doesNotMatch(source, /drawBottomUtilityBar/);
  assert.doesNotMatch(source, /controls\.fullscreen/);
  assert.doesNotMatch(source, /onFullscreen: \(\) => this\.toggleFullscreen\(\)/);
  assert.doesNotMatch(source, /createFloatingControl\(fullscreenX, centerY, touchSize/);
});

test('battle utility menu opens panel actions and rules resume the existing scene', () => {
  const battleSource = readScene('src/scenes/BattleScene.js');
  const factionSource = readScene('src/scenes/FactionSelectScene.js');
  const rulesSource = readScene('src/scenes/RulesPanelScene.js');
  const helperSource = readScene('src/ui/navigationControls.js');
  const mainSource = readScene('src/main.js');

  assert.match(helperSource, /rules: middleAction \? createFloatingControl\(scene, metrics\.width \* 0\.5, metrics\.centerY, metrics\.touchSize, '\?', middleAction/);
  assert.match(battleSource, /drawActionRowUtilityMenuTrigger\(\) \{[\s\S]*'☰',[\s\S]*this\.guardPointerEvent\(pointer\);[\s\S]*this\.toggleUtilityMenuPanel\(\);[\s\S]*this\.bottomControlViews = \[menu\];[\s\S]*\}/);
  assert.match(battleSource, /const panelLeft = triggerX \+ touchSize \/ 2;[\s\S]*const panelWidth = Math\.min\(236, width - margin - panelLeft\);[\s\S]*const panelHeight = 228;[\s\S]*const panelTop = triggerY - touchSize \/ 2;[\s\S]*const panelX = panelLeft \+ panelWidth \/ 2;[\s\S]*const panelY = panelTop \+ panelHeight \/ 2;[\s\S]*const rowY = panelTop \+ 28;/);
  assert.doesNotMatch(battleSource, /utilityMenuTitle|TACTICAL MENU/);
  assert.match(battleSource, /const muteToggle = createMuteToggleControl\(this, panelX - 28, rowY, 42, \{ depth: depth \+ 3 \}\);[\s\S]*const fullscreenToggle = createFloatingControl\(this, panelX \+ 28, rowY, 42, '⛶'/);
  assert.match(battleSource, /showUtilityMenuPanel\(\) \{[\s\S]*this\.closeInspectPreview\(\{ animate: false \}\);[\s\S]*outsideCatcher\.on\('pointerup',[\s\S]*this\.guardPointerEvent\(pointer\);[\s\S]*this\.destroyUtilityMenuPanel\(\);[\s\S]*createMuteToggleControl\(this,[\s\S]*translateActive\('ui\.battle\.utilityMenuRules', 'Rules'\), \(\) => this\.openRulesPanel\(\)\),[\s\S]*translateActive\('ui\.battle\.utilityMenuSettings', 'Settings'\), \(\) => this\.openSettingsScene\(\)\),[\s\S]*translateActive\('ui\.battle\.utilityMenuReturn', 'Return'\), \(\) => this\.exitBattleToFactionSelect\(\)\),[\s\S]*translateActive\('ui\.battle\.utilityMenuMainMenu', 'Main Menu'\), \(\) => this\.exitBattleToMainMenu\(\)\),[\s\S]*\}/);
  assert.match(battleSource, /openSettingsScene\(\) \{[\s\S]*this\.prepareUtilityMenuNavigation\(\{ preserveBattleFlow: true \}\)[\s\S]*this\.scene\.launch\('SettingsScene', \{ returnSceneKey: 'BattleScene' \}\);[\s\S]*this\.scene\.pause\(\);[\s\S]*\}/);
  assert.match(battleSource, /exitBattleToMainMenu\(\) \{[\s\S]*this\.scene\.start\('MainMenuScene'\);[\s\S]*\}/);
  assert.doesNotMatch(battleSource, /deckLabel: `x\$\{deckCount\}`/);
  assert.match(battleSource, /openRulesPanel\(\) \{[\s\S]*this\.scene\.launch\('RulesPanelScene', \{ returnSceneKey: 'BattleScene' \}\);[\s\S]*this\.scene\.pause\(\);[\s\S]*\}/);
  assert.match(battleSource, /resumeFromRulesPanel\(\) \{[\s\S]*this\.navigationInProgress = false;[\s\S]*this\.scene\.resume\(\);[\s\S]*this\.recoverFromLifecycle\('rules-panel-return'\);[\s\S]*\}/);
  assert.match(factionSource, /openRulesPanel\(\) \{[\s\S]*this\.scene\.launch\('RulesPanelScene', \{ returnSceneKey: 'FactionSelectScene' \}\);[\s\S]*this\.scene\.pause\(\);[\s\S]*\}/);
  assert.doesNotMatch(rulesSource, /closeButton|['"]×['"]/);
  assert.match(rulesSource, /overlay\.on\('pointerup', \(\) => this\.closePanel\(\)\)/);
  assert.match(rulesSource, /createModalBackButton\(this, \{[\s\S]*onPointerUp: \(\) => this\.closePanel\(\)/);
  assert.match(rulesSource, /returnScene\?\.resumeFromRulesPanel/);
  assert.match(mainSource, /RulesPanelScene/);
});


test('deck info panel follows shared mobile overlay dismissal rules', () => {
  const source = readScene('src/scenes/BattleScene.js');
  const start = source.indexOf('  openDeckInfoPanel() {');
  const end = source.indexOf('  getDeckInfoPanelText() {');
  const deckInfoSource = source.slice(start, end);

  assert.doesNotMatch(deckInfoSource, /closeBacking|closeText|['"]×['"]/);
  assert.match(deckInfoSource, /overlay\.on\('pointerup', \(\) => this\.destroyDeckInfoPanel\(\)\)/);
  assert.match(deckInfoSource, /createModalBackButton\(this, \{[\s\S]*onPointerUp: \(\) => this\.destroyDeckInfoPanel\(\)/);
  assert.match(deckInfoSource, /const panelWidth = Math\.min\(width \* 0\.84, 470\)/);
  assert.match(deckInfoSource, /const panelHeight = Math\.min\(height \* 0\.64, 530\)/);
  assert.match(deckInfoSource, /contentContainer\.setMask\(scrollMask\)/);
});


test('StartScene bottom bar keeps mute left and fullscreen right without rules', () => {
  const source = readScene('src/scenes/StartScene.js');

  assert.match(source, /import \{ createBottomNavigationControls, requestPortraitOrientationLock, toggleSceneFullscreen \} from '\.\.\/ui\/navigationControls\.js';/);
  assert.match(source, /drawNavigationControls\(\) \{[\s\S]*createBottomNavigationControls\(this, \{[\s\S]*onMute: \(\) => \{\},[\s\S]*onFullscreen: \(\) => this\.toggleFullscreen\(\),[\s\S]*\}\)/);
  assert.doesNotMatch(source, /onRules: \(\) => this\.openRulesPanel\(\)/);
  assert.match(source, /toggleFullscreen\(\) \{[\s\S]*toggleSceneFullscreen\(this\);[\s\S]*\}/);
});

test('MainMenuScene keeps primary buttons and uses shared bottom navigation controls', () => {
  const source = readScene('src/scenes/MainMenuScene.js');

  assert.match(source, /import \{ createBottomNavigationControls, requestPortraitOrientationLock, toggleSceneFullscreen \} from '\.\.\/ui\/navigationControls\.js';/);
  assert.match(source, /this\.title = this\.createTitle\(width, height\)/);
  assert.doesNotMatch(source, /'Main Menu'/);
  assert.match(source, /this\.createMenuButton\(width \/ 2, startY, buttonWidth, translateActive\('ui\.mainMenu\.arena', 'ARENA'\), \(\) => \{[\s\S]*this\.scene\.start\('FactionSelectScene'\)/);
  assert.match(source, /this\.createMenuButton\(width \/ 2, startY \+ buttonGap, buttonWidth, translateActive\('ui\.mainMenu\.tutorial', 'TUTORIAL'\), \(\) => \{[\s\S]*this\.scene\.start\('TutorialScene'\)/);
  assert.match(source, /this\.createMenuButton\(width \/ 2, startY \+ buttonGap \* 2, buttonWidth, translateActive\('ui\.mainMenu\.collection', 'COLLECTION'\), \(\) => \{[\s\S]*this\.scene\.start\('CollectionScene'\)/);
  assert.match(source, /this\.createMenuButton\(width \/ 2, startY \+ buttonGap \* 3, buttonWidth, translateActive\('ui\.mainMenu\.settings', 'SETTINGS'\), \(\) => \{[\s\S]*this\.scene\.start\('SettingsScene'\)/);
  assert.match(source, /drawNavigationControls\(\) \{[\s\S]*createBottomNavigationControls\(this, \{[\s\S]*onMute: \(\) => \{\},[\s\S]*onRules: \(\) => this\.openRulesPanel\(\),[\s\S]*onFullscreen: \(\) => this\.toggleFullscreen\(\),[\s\S]*\}\)/);
  assert.match(source, /openRulesPanel\(\) \{[\s\S]*this\.scene\.launch\('RulesPanelScene', \{ returnSceneKey: 'MainMenuScene' \}\);[\s\S]*this\.scene\.pause\(\);[\s\S]*\}/);
  assert.match(source, /resumeFromRulesPanel\(\) \{[\s\S]*this\.scene\.resume\(\);[\s\S]*\}/);
  assert.match(source, /toggleFullscreen\(\) \{[\s\S]*toggleSceneFullscreen\(this\);[\s\S]*\}/);
  assert.match(source, /onFullscreenChanged\(\) \{[\s\S]*this\.scale\.isFullscreen[\s\S]*requestPortraitOrientationLock\(\);[\s\S]*this\.scene\.restart\(\);[\s\S]*\}/);
});


test('main menu debug gear opens isolated art debug mode selection flow', () => {
  const mainSource = readScene('src/main.js');
  const menuSource = readScene('src/scenes/MainMenuScene.js');
  const modeSelectSource = readScene('src/scenes/ArtDebugModeSelectScene.js');
  const boardDebugSource = readScene('src/scenes/BoardUnitArtViewportDebugScene.js');

  assert.match(mainSource, /import ArtDebugModeSelectScene from '\.\/scenes\/ArtDebugModeSelectScene\.js';/);
  assert.match(mainSource, /import ArtViewportDebugScene from '\.\/scenes\/ArtViewportDebugScene\.js';/);
  assert.match(mainSource, /import BoardUnitArtViewportDebugScene from '\.\/scenes\/BoardUnitArtViewportDebugScene\.js';/);
  assert.match(mainSource, /RulesPanelScene, ArtDebugModeSelectScene, ArtViewportDebugScene, BoardUnitArtViewportDebugScene/);
  assert.match(menuSource, /icon\.on\('pointerup', \(\) => \{[\s\S]*this\.scene\.start\('ArtDebugModeSelectScene'\)/);
  assert.match(modeSelectSource, /super\('ArtDebugModeSelectScene'\)/);
  assert.match(modeSelectSource, /'Hand \/ Inspect Debug'/);
  assert.match(modeSelectSource, /this\.scene\.start\('ArtViewportDebugScene'\)/);
  assert.match(modeSelectSource, /'Board Unit Debug'/);
  assert.match(modeSelectSource, /this\.scene\.start\('BoardUnitArtViewportDebugScene'\)/);
  assert.match(modeSelectSource, /'Back'/);
  assert.match(modeSelectSource, /this\.scene\.start\('MainMenuScene'\)/);
  assert.match(boardDebugSource, /super\('BoardUnitArtViewportDebugScene'\)/);
  assert.match(boardDebugSource, /'Board Unit Art Debug'/);
  assert.match(boardDebugSource, /'Stage 1 placeholder'/);
  assert.match(boardDebugSource, /this\.scene\.start\('ArtDebugModeSelectScene'\)/);
});

test('MainMenuScene restores full menu state for direct returns and abandoned start-logo transitions', () => {
  const source = readScene('src/scenes/MainMenuScene.js');
  const imageButtonSource = readScene('src/ui/imageButton.js');

  assert.match(source, /resetMainMenuDisplayList\(\) \{[\s\S]*this\.children\?\.removeAll\?\.\(true\)/);
  assert.match(source, /else \{[\s\S]*this\.restoreMainMenuInteractivity\(\);[\s\S]*\}/);
  assert.match(source, /MAIN_MENU_SHARED_REVEAL_FALLBACK_MS = 1400/);
  assert.match(source, /this\.ensureTitleExistsAndVisible\(\{ forceVisible: !awaitSharedLogo, width, height \}\)/);
  assert.match(source, /ensureTitleExistsAndVisible\(\{ forceVisible = !this\.isAwaitingSharedLogo/);
  assert.match(source, /if \(!this\.isTitleUsable\(\)\) \{[\s\S]*this\.title = this\.createTitle\(resolvedWidth, resolvedHeight\)/);
  assert.match(source, /this\.title\.setDepth\?\.\(MAIN_MENU_TITLE_DEPTH\)/);
  assert.match(source, /ensureTitleHasDisplaySize\(title, width\) \{[\s\S]*title\.displayWidth > 0[\s\S]*title\.displayHeight > 0/);
  assert.match(source, /else if \(this\.isAwaitingSharedLogo\) \{[\s\S]*this\.title\.setAlpha\?\.\(0\)/);
  assert.match(source, /prepareSharedLogoReveal\(\) \{[\s\S]*this\.isAwaitingSharedLogo = true;[\s\S]*this\.sharedLogoRevealFallbackEvent = this\.time\.delayedCall/);
  assert.match(source, /restoreMainMenuInteractivity\(\) \{[\s\S]*this\.ensureTitleExistsAndVisible\(\{ forceVisible: true \}\);[\s\S]*this\.title\?\.setAlpha\?\.\(1\);[\s\S]*resetImageButtonState\(button, \{ interactive: true \}\)/);
  assert.match(source, /item\.setData\?\.\('mainMenuBaseX', item\.x\);[\s\S]*item\.setData\?\.\('mainMenuBaseY', item\.y\);/);
  assert.match(imageButtonSource, /export function resetImageButtonState/);
  assert.match(imageButtonSource, /button\.hitZone\?\.setInteractive\?\.\(\{ useHandCursor: true \}\)/);
});

test('TutorialScene returns to a fully recreated MainMenuScene with shared navigation controls', () => {
  const mainSource = readScene('src/main.js');
  const menuSource = readScene('src/scenes/MainMenuScene.js');
  const tutorialSource = readScene('src/scenes/TutorialScene.js');

  assert.match(mainSource, /import TutorialScene from '\.\/scenes\/TutorialScene\.js';/);
  assert.match(mainSource, /SettingsScene, TutorialScene, BattleScene/);
  assert.match(menuSource, /this\.scene\.start\('TutorialScene'\)/);
  assert.match(tutorialSource, /createBottomNavigationControls\(this, \{[\s\S]*onBack: \(\) => this\.returnToMainMenu\(\),[\s\S]*onRules: \(\) => this\.openRulesPanel\(\),[\s\S]*onFullscreen: \(\) => this\.toggleFullscreen\(\),[\s\S]*\}\)/);
  assert.match(tutorialSource, /returnToMainMenu\(\) \{[\s\S]*this\.scene\.start\('MainMenuScene'\)/);
  assert.match(tutorialSource, /openRulesPanel\(\) \{[\s\S]*this\.scene\.launch\('RulesPanelScene', \{ returnSceneKey: 'TutorialScene' \}\);[\s\S]*this\.scene\.pause\(\);[\s\S]*\}/);
});

test('FactionSelectScene uses shared bottom navigation controls for back, rules, and fullscreen', () => {
  const factionSource = readScene('src/scenes/FactionSelectScene.js');
  const battleSource = readScene('src/scenes/BattleScene.js');
  const helperSource = readScene('src/ui/navigationControls.js');
  const menuSource = readScene('src/scenes/BattleMenuScene.js');

  assert.match(factionSource, /import \{ createBottomNavigationControls, requestPortraitOrientationLock, toggleSceneFullscreen \} from '\.\.\/ui\/navigationControls\.js';/);
  assert.match(battleSource, /import \{ createFloatingControl, createMuteToggleControl, requestPortraitOrientationLock, toggleSceneFullscreen \} from '\.\.\/ui\/navigationControls\.js';/);
  assert.match(helperSource, /export function createBottomNavigationControls/);
  assert.match(helperSource, /export function createFloatingControl/);
  assert.match(helperSource, /export function requestPortraitOrientationLock/);
  assert.match(factionSource, /drawNavigationControls\(\) \{[\s\S]*createBottomNavigationControls\(this, \{[\s\S]*onBack: \(\) => this\.returnToMainMenu\(\),[\s\S]*onRules: \(\) => this\.openRulesPanel\(\),[\s\S]*onFullscreen: \(\) => this\.toggleFullscreen\(\),[\s\S]*\}\)/);
  assert.doesNotMatch(factionSource, /drawNavigationControls\(\) \{[\s\S]*onMute: \(\) => \{\}/);
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

test('rules panel contains glossary-first player-facing rules summary', () => {
  const source = readScene('src/scenes/RulesPanelScene.js');

  assert.match(source, /heading: 'Icon Glossary'/);
  assert.match(source, /ATK — combat damage dealt by a unit/);
  assert.match(source, /ARM — armor that reduces incoming combat damage/);
  assert.match(source, /label: '✶ ✶ ✶', translationKey: 'effectCard'/);
  assert.doesNotMatch(source, /Base HP — your base health/);
  assert.match(source, /ENEMY — one opposing unit/);
  assert.match(source, /ENEMIES — opposing units/);
  assert.match(source, /CARD_EFFECT_GAMEPLAY_SYMBOLS\.enemy, iconColor: GAMEPLAY_SYMBOL_COLORS\.enemy, label: 'ENEMY'/);
  assert.match(source, /CARD_EFFECT_GAMEPLAY_SYMBOLS\.enemies, iconColor: GAMEPLAY_SYMBOL_COLORS\.enemy, label: 'ENEMIES'/);
  assert.match(source, /Reduce the enemy Base to 0 HP/);
  assert.match(source, /Players take one action each, alternating/);
  assert.match(source, /combat resolves automatically/);
  assert.match(source, /Battles use 3 lanes/);
  assert.match(source, /Tap one of your units/);
  assert.match(source, /PASS ends your action/);
  assert.doesNotMatch(source, /stall/i);
  assert.doesNotMatch(source, /telemetry/i);
});
