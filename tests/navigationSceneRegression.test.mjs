import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const readScene = (path) => fs.readFileSync(path, 'utf8');

test('faction selection starts BattleScene without stopping itself or clearing global input listeners', () => {
  const source = readScene('src/scenes/FactionSelectScene.js');

  assert.match(source, /button\.on\('pointerup', \(pointer\) => \{[\s\S]*this\.tapVsDrag\.end\(pointer, this\.scrollState\?\.content\?\.y \?\? 0\)[\s\S]*this\.selectFaction\(factionKey\)/);
  assert.match(source, /import \{ enterBattleScene \} from '\.\/battleEntryRouter\.js';/);
  assert.match(source, /selectArenaBattlegroundId\(\)/);
  assert.match(source, /enterBattleScene\(this, \{[\s\S]*factionKey,[\s\S]*battleContext:[\s\S]*mode: 'arena',[\s\S]*battlegroundId: selectedBattlegroundId/);
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

  assert.match(source, /drawPlayerBaseUtilityMenuTrigger\(\) \{[\s\S]*getPlayerBaseUtilityControlMetrics\('menu'\);[\s\S]*createPlayerBaseUtilityControl\([\s\S]*'☰',[\s\S]*this\.guardPointerEvent\(pointer\);[\s\S]*this\.toggleUtilityMenuPanel\(\);[\s\S]*this\.bottomControlViews = \[menu\];[\s\S]*\}/);
  assert.match(source, /(?:this\.scene\.start\('FactionSelectScene'\)|this\.startPostBattleDestinationWithOverlay\('FactionSelectScene'\))/);
  assert.match(source, /restartBattleScene\(this, \{ factionKey, enemyFactionKey, battleContext \}\)/);
  assert.match(source, /const battleContext = this\.battleContext;/);
  assert.match(source, /exitBattleToFactionSelect\(\) \{[\s\S]*(?:this\.scene\.start\('FactionSelectScene'\)|this\.startPostBattleDestinationWithOverlay\('FactionSelectScene'\))/);
  assert.match(source, /retryBattle\(\) \{[\s\S]*restartBattleScene\(this, \{ factionKey, enemyFactionKey, battleContext \}\)/);
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



test('BattleScene player-base utility menu uses resolved base metrics and no bottom fullscreen control', () => {
  const source = readScene('src/scenes/BattleScene.js');
  const metricsSource = source.slice(source.indexOf('  getPlayerBaseUtilityControlMetrics('), source.indexOf('  createPlayerBaseUtilityControl('));
  const menuSource = source.slice(source.indexOf('  drawPlayerBaseUtilityMenuTrigger()'), source.indexOf('  drawDeckCounter()'));
  const deckSource = source.slice(source.indexOf('  drawDeckCounter()'), source.indexOf('  renderBasePanels()'));

  assert.match(metricsSource, /const \{ width, margin, playerHero, contentWidth \} = this\.layout;/);
  assert.match(metricsSource, /const baseWidth = contentWidth \* HERO_PANEL_WIDTH_RATIO;/);
  assert.match(metricsSource, /const x = side === 'deck'/);
  assert.match(metricsSource, /baseRight \+ gap \+ controlWidth \/ 2/);
  assert.match(metricsSource, /baseLeft - gap - controlWidth \/ 2/);
  assert.match(metricsSource, /y: playerHero\.centerY,/);
  assert.match(metricsSource, /width: controlWidth,/);
  assert.match(metricsSource, /height: controlHeight,/);
  assert.match(menuSource, /const \{ x, y, width, height \} = this\.getPlayerBaseUtilityControlMetrics\('menu'\);/);
  assert.match(menuSource, /createPlayerBaseUtilityControl\(/);
  assert.match(menuSource, /'☰'/);
  assert.match(menuSource, /this\.bottomControlViews = \[menu\];/);
  assert.match(deckSource, /const \{ x, y, width, height \} = this\.getPlayerBaseUtilityControlMetrics\('deck'\);/);
  assert.match(deckSource, /translateActive\('ui\.battle\.deckCounter', 'DECK \{count\}', \{ count: deckCount \}\);/);
  assert.match(deckSource, /this\.openDeckInfoPanel\(\);/);
  assert.match(source, /const HERO_PANEL_WIDTH_RATIO = 0\.66/);
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

  assert.match(helperSource, /rules: middleAction \? createFloatingControl\(scene, metrics\.width \* 0\.5, metrics\.centerY, metrics\.touchSize, NAVIGATION_ICON_TYPES\.HELP, middleAction/);
  assert.match(battleSource, /drawPlayerBaseUtilityMenuTrigger\(\) \{[\s\S]*'☰',[\s\S]*this\.guardPointerEvent\(pointer\);[\s\S]*this\.toggleUtilityMenuPanel\(\);[\s\S]*this\.bottomControlViews = \[menu\];[\s\S]*\}/);
  assert.match(battleSource, /const panelLeft = triggerX \+ triggerWidth \/ 2;[\s\S]*const menuScale = 1\.1;[\s\S]*const basePanelContentWidth = 208;[\s\S]*const basePanelHeight = 186;[\s\S]*const panelContentWidth = Math\.round\(basePanelContentWidth \* menuScale\);[\s\S]*const panelHorizontalPadding = Math\.round\(4 \* menuScale\);[\s\S]*const panelWidth = Math\.min\(panelContentWidth \+ panelHorizontalPadding \* 2, width - margin - panelLeft\);[\s\S]*const panelHeight = Math\.round\(basePanelHeight \* menuScale\);[\s\S]*const panelTop = triggerY - triggerHeight \/ 2 - \(panelHeight - basePanelHeight\) \/ 2;[\s\S]*const panelX = Math\.min\(width - margin - panelWidth \/ 2, panelLeft \+ basePanelContentWidth \/ 2 \+ 14\);[\s\S]*const panelY = panelTop \+ panelHeight \/ 2;[\s\S]*const rowY = panelTop \+ Math\.round\(28 \* menuScale\);/);
  assert.doesNotMatch(battleSource, /utilityMenuTitle|TACTICAL MENU/);
  assert.match(battleSource, /const muteToggle = createMuteToggleControl\(this, panelX - 28, rowY, 42, \{ depth: depth \+ 3 \}\);[\s\S]*const fullscreenToggle = createFloatingControl\(this, panelX \+ 28, rowY, 42, NAVIGATION_ICON_TYPES\.FULLSCREEN/);
  assert.match(battleSource, /showUtilityMenuPanel\(\) \{[\s\S]*this\.closeInspectPreview\(\{ animate: false, clearSelection: true \}\);[\s\S]*outsideCatcher\.on\('pointerup',[\s\S]*this\.guardPointerEvent\(pointer\);[\s\S]*this\.destroyUtilityMenuPanel\(\);[\s\S]*createMuteToggleControl\(this,[\s\S]*translateActive\('ui\.battle\.utilityMenuRules', 'Rules'\), \(\) => this\.openRulesPanel\(\)\),[\s\S]*translateActive\('ui\.battle\.utilityMenuSettings', 'Settings'\), \(\) => this\.openSettingsScene\(\)\),[\s\S]*translateActive\('ui\.battle\.utilityMenuSurrender', 'Surrender'\), \(\) => this\.openSurrenderConfirmationFromUtilityMenu\(\)\),[\s\S]*\}/);
  assert.match(battleSource, /openSurrenderConfirmationFromUtilityMenu\(\) \{[\s\S]*this\.destroyUtilityMenuPanel\(\);[\s\S]*this\.utilityMenuPanel = null;[\s\S]*this\.showSurrenderConfirmation\(\);[\s\S]*\}/);
  assert.doesNotMatch(battleSource, /translateActive\('ui\.battle\.utilityMenuReturn', 'Return'\)[\s\S]*createUtilityMenuButton/);
  assert.doesNotMatch(battleSource, /translateActive\('ui\.battle\.utilityMenuMainMenu', 'Main Menu'\)[\s\S]*createUtilityMenuButton/);
  assert.match(battleSource, /showSurrenderConfirmation\(\) \{[\s\S]*this\.add\.rectangle\(width \/ 2, height \/ 2, width, height, 0x020617, 0\.72\)[\s\S]*translateActive\('ui\.battle\.surrenderConfirmTitle', 'SURRENDER\?'\)[\s\S]*translateActive\('ui\.battle\.surrenderConfirmBody', 'This counts as a defeat\.'\)[\s\S]*translateActive\('ui\.battle\.surrenderCancel', 'Cancel'\), \(\) => this\.closeSurrenderConfirmation\(\)\)[\s\S]*translateActive\('ui\.battle\.surrenderConfirm', 'Surrender'\), \(\) => this\.confirmPlayerMenuSurrender\(\)\)[\s\S]*this\.surrenderConfirmationModal = \{ items:/);
  const surrenderConfirmSource = battleSource.slice(
    battleSource.indexOf('  confirmPlayerMenuSurrender() {'),
    battleSource.indexOf('  createUtilityMenuButton(', battleSource.indexOf('  confirmPlayerMenuSurrender() {')),
  );
  assert.match(surrenderConfirmSource, /confirmPlayerMenuSurrender\(\) \{[\s\S]*this\.surrenderConfirmationResolving = true;[\s\S]*this\.schedulePlayerMenuSurrenderResolution\(\);[\s\S]*\}/);
  assert.match(surrenderConfirmSource, /schedulePlayerMenuSurrenderResolution\(\) \{[\s\S]*scheduleFrame\(\(\) => \{[\s\S]*scheduleTask\(\(\) => this\.resolvePlayerMenuSurrender\(\), 0\);[\s\S]*\}\);[\s\S]*\}/);
  assert.match(surrenderConfirmSource, /resolvePlayerMenuSurrender\(\) \{[\s\S]*this\.closeSurrenderConfirmation\(\);[\s\S]*this\.destroyUtilityMenuPanel\(\);[\s\S]*this\.closeInspectPreview\(\{ animate: false, clearSelection: true \}\);[\s\S]*this\.destroyDeckInfoPanel\(\);[\s\S]*this\.navigationInProgress = false;[\s\S]*this\.gameState\.winner = 'enemy';[\s\S]*this\.gameState\.endingReason = 'player_menu_surrender';[\s\S]*this\.completeBattleFlow\(500\);[\s\S]*\}/);
  assert.doesNotMatch(surrenderConfirmSource, /completeBattleFlow\(0\)/);
  assert.doesNotMatch(surrenderConfirmSource, /showBattleResultModal\(/);
  assert.doesNotMatch(surrenderConfirmSource, /exitBattleToMainMenu\(/);
  assert.doesNotMatch(surrenderConfirmSource, /exitBattleToFactionSelect\(/);
  assert.match(battleSource, /openSettingsScene\(\) \{[\s\S]*this\.prepareUtilityMenuNavigation\(\{ preserveBattleFlow: true \}\)[\s\S]*this\.scene\.launch\('SettingsScene', \{ returnSceneKey: 'BattleScene' \}\);[\s\S]*this\.scene\.bringToTop\('SettingsScene'\);[\s\S]*this\.scene\.pause\(\);[\s\S]*\}/);
  assert.match(battleSource, /exitBattleToMainMenu\(\) \{[\s\S]*this\.scene\.start\('MainMenuScene'\);[\s\S]*\}/);
  assert.doesNotMatch(battleSource, /deckLabel: `x\$\{deckCount\}`/);
  assert.match(battleSource, /getBattleRulesPanelLaunchData\(\) \{[\s\S]*return \{ returnSceneKey: 'BattleScene', hideScrollHint: true, battleModalPresentation: true \};[\s\S]*\}/);
  assert.match(battleSource, /this\.battleModalScrollHintObjects = \[\];/);
  assert.match(battleSource, /const scrollHint = this\.add\.text\([\s\S]*translateActive\('ui\.common\.swipeScroll', 'Swipe or mouse wheel to scroll'\)[\s\S]*\.setDepth\(762\)\.setVisible\(false\);[\s\S]*this\.trackBattleModalScrollHint\(scrollHint\);/);
  assert.match(battleSource, /destroyDeckInfoPanel\(\) \{[\s\S]*panelState\.scrollHint,[\s\S]*this\.unregisterBattleModalScrollHint\(panelState\.scrollHint\);[\s\S]*this\.deckInfoPanel = null;/);
  assert.match(battleSource, /trackBattleModalScrollHint\(scrollHint\) \{[\s\S]*this\.battleModalScrollHintObjects = \(this\.battleModalScrollHintObjects \?\? \[\]\)[\s\S]*\.filter\(\(item\) => item\?\.active && item !== scrollHint\);[\s\S]*this\.battleModalScrollHintObjects\.push\(scrollHint\);[\s\S]*\}/);
  assert.match(battleSource, /getBattleOverlayBackgroundHelpers\(\) \{[\s\S]*this\.battleModalScrollHintObjects = \(this\.battleModalScrollHintObjects \?\? \[\]\)[\s\S]*\.filter\(\(item\) => item\?\.active\);[\s\S]*this\.deckInfoPanel\?\.scrollHint,[\s\S]*\.\.\.\(this\.battleModalScrollHintObjects \?\? \[\]\),[\s\S]*\.filter\(\(cell\) => cell\?\.row === 1\)[\s\S]*\.flatMap\(\(cell\) => \[cell\.background, cell\.label, cell\.blockedMarker\]\),[\s\S]*\.filter\(\(item, index, items\) => item\?\.active && items\.indexOf\(item\) === index\);[\s\S]*\}/);
  assert.match(battleSource, /launchBattleRulesPanel\(\{ prepareNavigation = true \} = \{\}\) \{[\s\S]*if \(prepareNavigation && !this\.prepareUtilityMenuNavigation\(\)\) return false;[\s\S]*this\.hideRulesPanelBackgroundHelpers\(\);[\s\S]*this\.scene\.launch\('RulesPanelScene', this\.getBattleRulesPanelLaunchData\(\)\);[\s\S]*this\.scene\.pause\(\);[\s\S]*return true;[\s\S]*\}/);
  assert.match(battleSource, /openRulesPanel\(\) \{[\s\S]*return this\.launchBattleRulesPanel\(\);[\s\S]*\}/);
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
  assert.match(source, /this\.createMenuButton\(width \/ 2, startY, buttonWidth, translateActive\('ui\.mainMenu\.game', 'GAME'\), \(\) => \{[\s\S]*(?:this\.scene\.start\('GameMenuScene'\)|this\.startPostBattleDestinationWithOverlay\('GameMenuScene'\))/);
  assert.match(source, /this\.createMenuButton\(width \/ 2, startY \+ buttonGap, buttonWidth, translateActive\('ui\.mainMenu\.collection', 'COLLECTION'\), \(\) => \{[\s\S]*beginSceneTransitionOverlay\(this, 'CollectionScene'\)[\s\S]*this\.scene\.start\('CollectionScene'/);
  assert.match(source, /this\.createMenuButton\(width \/ 2, startY \+ buttonGap \* 2, buttonWidth, translateActive\('ui\.mainMenu\.achievements', 'ACHIEVEMENTS'\), \(\) => \{[\s\S]*this\.scene\.start\('AchievementsScene'\)/);
  assert.match(source, /this\.createMenuButton\(width \/ 2, startY \+ buttonGap \* 3, buttonWidth, translateActive\('ui\.mainMenu\.settings', 'SETTINGS'\), \(\) => \{[\s\S]*this\.scene\.start\('SettingsScene'\)/);
  assert.doesNotMatch(source, /ui\.mainMenu\.tutorial/);
  assert.doesNotMatch(source, /this\.scene\.start\('TutorialScene'/);
  assert.match(source, /drawNavigationControls\(\) \{[\s\S]*createBottomNavigationControls\(this, \{[\s\S]*onMute: \(\) => \{\},[\s\S]*onRules: \(\) => this\.openRulesPanel\(\),[\s\S]*onFullscreen: \(\) => this\.toggleFullscreen\(\),[\s\S]*\}\)/);
  assert.match(source, /openRulesPanel\(\) \{[\s\S]*this\.scene\.launch\('RulesPanelScene', \{ returnSceneKey: 'MainMenuScene' \}\);[\s\S]*this\.scene\.pause\(\);[\s\S]*\}/);
  assert.match(source, /resumeFromRulesPanel\(\) \{[\s\S]*this\.scene\.resume\(\);[\s\S]*\}/);
  assert.match(source, /toggleFullscreen\(\) \{[\s\S]*toggleSceneFullscreen\(this\);[\s\S]*\}/);
  assert.match(source, /onFullscreenChanged\(\) \{[\s\S]*this\.scale\.isFullscreen[\s\S]*requestPortraitOrientationLock\(\);[\s\S]*this\.scene\.restart\(\);[\s\S]*\}/);
});


test('main menu debug gear opens central debug menu with isolated art debug mode selection flow', () => {
  const mainSource = readScene('src/main.js');
  const menuSource = readScene('src/scenes/MainMenuScene.js');
  const debugMenuSource = readScene('src/scenes/DebugMenuScene.js');
  const campaignEndDebugSource = readScene('src/scenes/CampaignEndScreenDebugScene.js');
  const modeSelectSource = readScene('src/scenes/ArtDebugModeSelectScene.js');
  const boardDebugSource = readScene('src/scenes/BoardUnitArtViewportDebugScene.js');

  assert.match(mainSource, /import DebugMenuScene from '\.\/scenes\/DebugMenuScene\.js';/);
  assert.match(mainSource, /import CampaignEndScreenDebugScene from '\.\/scenes\/CampaignEndScreenDebugScene\.js';/);
  assert.match(mainSource, /import ArtDebugModeSelectScene from '\.\/scenes\/ArtDebugModeSelectScene\.js';/);
  assert.match(mainSource, /import ArtViewportDebugScene from '\.\/scenes\/ArtViewportDebugScene\.js';/);
  assert.match(mainSource, /import BoardUnitArtViewportDebugScene from '\.\/scenes\/BoardUnitArtViewportDebugScene\.js';/);
  assert.match(mainSource, /RulesPanelScene, DebugMenuScene, CampaignEndScreenDebugScene, ArtDebugModeSelectScene, ArtViewportDebugScene, BoardUnitArtViewportDebugScene/);
  assert.match(menuSource, /icon\.on\('pointerup', \(\) => \{[\s\S]*this\.scene\.start\('DebugMenuScene'\)/);
  assert.match(debugMenuSource, /super\('DebugMenuScene'\)/);
  assert.match(debugMenuSource, /'ART DEBUG'/);
  assert.match(debugMenuSource, /this\.scene\.start\('ArtDebugModeSelectScene', \{ returnSceneKey: 'DebugMenuScene' \}\)/);
  assert.match(debugMenuSource, /'CAMPAIGN END SCREENS'/);
  assert.match(debugMenuSource, /this\.scene\.start\('CampaignEndScreenDebugScene'\)/);
  assert.match(debugMenuSource, /this\.scene\.start\('MainMenuScene'\)/);
  assert.match(campaignEndDebugSource, /super\('CampaignEndScreenDebugScene'\)/);
  assert.match(campaignEndDebugSource, /'VICTORY'/);
  assert.match(campaignEndDebugSource, /'DEFEAT'/);
  assert.match(campaignEndDebugSource, /mode: 'campaignCompletionPreview'/);
  assert.match(campaignEndDebugSource, /returnSceneKey: 'CampaignEndScreenDebugScene'/);
  assert.match(modeSelectSource, /super\('ArtDebugModeSelectScene'\)/);
  assert.match(modeSelectSource, /'Hand \/ Inspect Debug'/);
  assert.match(modeSelectSource, /this\.scene\.start\('ArtViewportDebugScene'\)/);
  assert.match(modeSelectSource, /'Board Unit Debug'/);
  assert.match(modeSelectSource, /this\.scene\.start\('BoardUnitArtViewportDebugScene'\)/);
  assert.match(modeSelectSource, /'Back'/);
  assert.match(modeSelectSource, /this\.returnSceneKey = data\?\.returnSceneKey === 'DebugMenuScene' \? 'DebugMenuScene' : 'MainMenuScene'/);
  assert.match(modeSelectSource, /this\.scene\.start\(this\.returnSceneKey \|\| 'MainMenuScene'\)/);
  assert.match(boardDebugSource, /super\('BoardUnitArtViewportDebugScene'\)/);
  assert.match(boardDebugSource, /'Board Unit Art Debug'/);
  assert.match(boardDebugSource, /tutorialPlayerFaction/);
  assert.match(boardDebugSource, /tutorialEnemyFaction/);
  assert.match(boardDebugSource, /preloadCardIllustrationsForFaction\(this, tutorialPlayerFaction\)/);
  assert.match(boardDebugSource, /preloadCardIllustrationsForFaction\(this, tutorialEnemyFaction\)/);
  assert.match(boardDebugSource, /groupLabel: 'Tutorial \/ Player'/);
  assert.match(boardDebugSource, /groupLabel: 'Tutorial \/ Enemy'/);
  assert.match(boardDebugSource, /'Stage 1 placeholder'/);
  assert.match(boardDebugSource, /this\.scene\.start\('ArtDebugModeSelectScene'\)/);
});


test('AchievementsScene is a localized achievements panel that returns to MainMenuScene', () => {
  const mainSource = readScene('src/main.js');
  const source = readScene('src/scenes/AchievementsScene.js');

  assert.match(mainSource, /import AchievementsScene from '\.\/scenes\/AchievementsScene\.js';/);
  assert.match(mainSource, /CollectionScene, AchievementsScene, SettingsScene/);
  assert.match(source, /super\('AchievementsScene'\)/);
  assert.match(source, /title: translateActive\('ui\.achievements\.title', 'ACHIEVEMENTS'\)/);
  assert.match(source, /drawAchievementsPanel\(width, height\)/);
  assert.doesNotMatch(source, /ui\.achievements\.comingSoon|drawPlaceholderPanel/);
  assert.match(source, /returnToMainMenu\(\) \{[\s\S]*this\.scene\.start\('MainMenuScene'\)/);
  assert.match(source, /this\.scene\.launch\('RulesPanelScene', \{ returnSceneKey: 'AchievementsScene' \}\)/);
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

test('TutorialScene returns through configured menu route with shared navigation controls', () => {
  const mainSource = readScene('src/main.js');
  const menuSource = readScene('src/scenes/MainMenuScene.js');
  const tutorialSource = readScene('src/scenes/TutorialScene.js');

  assert.match(mainSource, /import TutorialScene from '\.\/scenes\/TutorialScene\.js';/);
  assert.match(mainSource, /SettingsScene, TutorialScene, BattleScene/);
  assert.doesNotMatch(menuSource, /this\.scene\.start\('TutorialScene'/);
  assert.match(tutorialSource, /createBottomNavigationControls\(this, \{[\s\S]*onBack: \(\) => this\.returnToMainMenu\(\),[\s\S]*onRules: \(\) => this\.openRulesPanel\(\),[\s\S]*onFullscreen: \(\) => this\.toggleFullscreen\(\),[\s\S]*\}\)/);
  assert.match(tutorialSource, /this\.returnSceneKey = data\?\.returnSceneKey === 'GameMenuScene' \? 'GameMenuScene' : 'MainMenuScene'/);
  assert.match(tutorialSource, /returnToMainMenu\(\) \{[\s\S]*this\.scene\.start\(this\.returnSceneKey\)/);
  assert.match(tutorialSource, /openRulesPanel\(\) \{[\s\S]*this\.scene\.launch\('RulesPanelScene', \{ returnSceneKey: 'TutorialScene' \}\);[\s\S]*this\.scene\.pause\(\);[\s\S]*\}/);
});

test('FactionSelectScene uses shared bottom navigation controls for back, rules, and fullscreen', () => {
  const factionSource = readScene('src/scenes/FactionSelectScene.js');
  const battleSource = readScene('src/scenes/BattleScene.js');
  const helperSource = readScene('src/ui/navigationControls.js');
  const menuSource = readScene('src/scenes/BattleMenuScene.js');

  assert.match(factionSource, /import \{ createBottomNavigationControls, requestPortraitOrientationLock, toggleSceneFullscreen \} from '\.\.\/ui\/navigationControls\.js';/);
  assert.match(battleSource, /import \{ NAVIGATION_ICON_TYPES, createFloatingControl, createMuteToggleControl, requestPortraitOrientationLock, toggleSceneFullscreen \} from '\.\.\/ui\/navigationControls\.js';/);
  assert.match(helperSource, /export function createBottomNavigationControls/);
  assert.match(helperSource, /export function createFloatingControl/);
  assert.match(helperSource, /export function requestPortraitOrientationLock/);
  assert.match(factionSource, /drawNavigationControls\(\) \{[\s\S]*createBottomNavigationControls\(this, \{[\s\S]*onBack: \(\) => this\.returnToMainMenu\(\),[\s\S]*onRules: \(\) => this\.openRulesPanel\(\),[\s\S]*onFullscreen: \(\) => this\.toggleFullscreen\(\),[\s\S]*\}\)/);
  assert.doesNotMatch(factionSource, /drawNavigationControls\(\) \{[\s\S]*onMute: \(\) => \{\}/);
  assert.match(factionSource, /openRulesPanel\(\) \{[\s\S]*this\.scene\.launch\('RulesPanelScene', \{ returnSceneKey: 'FactionSelectScene' \}\);[\s\S]*this\.scene\.pause\(\);[\s\S]*\}/);
  assert.match(factionSource, /toggleFullscreen\(\) \{[\s\S]*toggleSceneFullscreen\(this\);[\s\S]*\}/);
  assert.match(factionSource, /onFullscreenChanged\(\) \{[\s\S]*this\.scale\.isFullscreen[\s\S]*requestPortraitOrientationLock\(\);[\s\S]*this\.scene\.restart\(\{ mode: this\.mode, returnSceneKey: this\.returnSceneKey, sceneTransitionOverlay: this\.sceneTransitionOverlay \}\);[\s\S]*\}/);
  assert.match(battleSource, /onFullscreenChanged\(\) \{[\s\S]*this\.scale\.isFullscreen[\s\S]*requestPortraitOrientationLock\(\);[\s\S]*this\.recoverFromLifecycle\(this\.scale\.isFullscreen \? 'enterfullscreen' : 'leavefullscreen'\);[\s\S]*\}/);
  assert.match(menuSource, /const returnSceneKey = typeof data\?\.returnSceneKey === 'string'/);
  assert.match(menuSource, /if \(returnScene\?\.launchBattleRulesPanel\) \{[\s\S]*returnScene\.launchBattleRulesPanel\(\{ prepareNavigation: false \}\);[\s\S]*return;[\s\S]*\}/);
  assert.match(menuSource, /returnScene\?\.hideRulesPanelBackgroundHelpers\?\.\(\);[\s\S]*this\.scene\.launch\('RulesPanelScene', returnScene\?\.getBattleRulesPanelLaunchData\?\.\(\) \?\? \{ returnSceneKey, hideScrollHint: true, battleModalPresentation: returnSceneKey === 'BattleScene' \}\);/);
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
  assert.match(source, /Alternating Initiative/);
  assert.match(source, /Each turn, both sides take one action or PASS/);
  assert.match(source, /Combat then resolves automatically/);
  assert.match(source, /the side that acted second goes first/);
  assert.match(source, /Before battle begins, you may mulligan up to 2 cards/);
  assert.match(source, /The middle row is visual\/effect space and cannot hold units/);
  assert.match(source, /Some effects require targets; others resolve automatically/);
  assert.doesNotMatch(source, /hold PASS to surrender/i);
  assert.doesNotMatch(source, /PASS and Surrender/);
  assert.match(source, /Exhausted late battles may be decided by remaining Base HP/);
  assert.match(source, /Tap one of your units/);
  assert.match(source, /PASS ends your action/);
  assert.doesNotMatch(source, /stall/i);
  assert.doesNotMatch(source, /telemetry/i);
  assert.doesNotMatch(source, /addScrollHint/);
  assert.doesNotMatch(source, /swipeScroll/);
  assert.doesNotMatch(source, /showDecorativeRails/);
  assert.doesNotMatch(source, /fillRoundedRect\(left \+ 18, top \+ 14/);
});

test('MainMenuScene routes localized Game entry into GameMenuScene instead of direct Arena', () => {
  const mainMenuSource = readScene('src/scenes/MainMenuScene.js');
  const mainSource = readScene('src/main.js');

  assert.match(mainMenuSource, /this\.createMenuButton\(width \/ 2, startY, buttonWidth, translateActive\('ui\.mainMenu\.game', 'GAME'\), \(\) => \{[\s\S]*(?:this\.scene\.start\('GameMenuScene'\)|this\.startPostBattleDestinationWithOverlay\('GameMenuScene'\))/);
  assert.doesNotMatch(mainMenuSource, /translateActive\('ui\.mainMenu\.arena', 'ARENA'\), \(\) => \{[\s\S]*this\.scene\.start\('FactionSelectScene', \{ returnSceneKey: 'GameMenuScene' \}\)/);
  assert.match(mainSource, /import GameMenuScene from '\.\/scenes\/GameMenuScene\.js';/);
  assert.match(mainSource, /scene: \[StartScene, MainMenuScene, GameMenuScene, FactionSelectScene/);
});

test('GameMenuScene provides campaign choices and preserves Arena routing', () => {
  const source = readScene('src/scenes/GameMenuScene.js');

  assert.match(source, /super\('GameMenuScene'\)/);
  assert.match(source, /translateActive\('ui\.gameMenu\.continue', 'CONTINUE'\)/);
  assert.match(source, /translateActive\('ui\.gameMenu\.newGame', 'NEW GAME'\)/);
  assert.match(source, /translateActive\('ui\.gameMenu\.tutorial', 'TUTORIAL'\), \(\) => \{[\s\S]*enterBattleScene\(this, \{[\s\S]*battleContext:[\s\S]*mode:\s*'tutorial'[\s\S]*tutorialId:\s*'tutorial_v1'[\s\S]*returnSceneKey:\s*'GameMenuScene'/);
  assert.match(source, /translateActive\('ui\.gameMenu\.arena', 'ARENA'\), \(\) => \{[\s\S]*this\.scene\.start\('FactionSelectScene', \{ returnSceneKey: 'GameMenuScene' \}\)/);
  assert.match(source, /import \{ clearCampaign, hasActiveCampaign \} from '\.\.\/systems\/campaignState\.js';/);
  assert.match(source, /if \(hasActiveCampaign\(\)\) \{[\s\S]*resetImageButtonState\(this\.continueButton, \{ interactive: true \}\)/);
  assert.match(source, /resetImageButtonState\(this\.continueButton, \{ interactive: false \}\)/);
  assert.doesNotMatch(source, /createNewCampaign\(/);
});

test('GameMenuScene bottom navigation uses Back, Rules, and Fullscreen behavior', () => {
  const source = readScene('src/scenes/GameMenuScene.js');

  assert.match(source, /createBottomNavigationControls\(this, \{[\s\S]*onBack: \(\) => this\.returnToMainMenu\(\),[\s\S]*onRules: \(\) => this\.openRulesPanel\(\),[\s\S]*onFullscreen: \(\) => this\.toggleFullscreen\(\),[\s\S]*\}\)/);
  assert.match(source, /returnToMainMenu\(\) \{[\s\S]*this\.scene\.start\('MainMenuScene'\)/);
  assert.match(source, /openRulesPanel\(\) \{[\s\S]*this\.scene\.launch\('RulesPanelScene', \{ returnSceneKey: 'GameMenuScene' \}\);[\s\S]*this\.scene\.pause\(\);[\s\S]*\}/);
  assert.match(source, /toggleFullscreen\(\) \{[\s\S]*toggleSceneFullscreen\(this\);[\s\S]*\}/);
  assert.match(source, /onFullscreenChanged\(\) \{[\s\S]*this\.scale\.isFullscreen[\s\S]*requestPortraitOrientationLock\(\);[\s\S]*this\.scene\.restart\(\{ sceneTransitionOverlay: this\.sceneTransitionOverlay \}\);[\s\S]*\}/);
});

test('Game menu localization resolves exact English and Polish labels', () => {
  const en = JSON.parse(fs.readFileSync('src/localization/translations/en.json', 'utf8'));
  const pl = JSON.parse(fs.readFileSync('src/localization/translations/pl.json', 'utf8'));

  assert.equal(en.ui.mainMenu.game, 'GAME');
  assert.equal(pl.ui.mainMenu.game, 'GRA');
  assert.equal(en.ui.mainMenu.achievements, 'ACHIEVEMENTS');
  assert.equal(pl.ui.mainMenu.achievements, 'OSIĄGNIĘCIA');
  assert.equal(en.ui.gameMenu.continue, 'CONTINUE');
  assert.equal(en.ui.gameMenu.newGame, 'NEW GAME');
  assert.equal(en.ui.gameMenu.tutorial, 'TUTORIAL');
  assert.equal(en.ui.gameMenu.arena, 'ARENA');
  assert.equal(en.ui.gameMenu.cancelNewGame, 'BACK');
  assert.equal(en.ui.gameMenu.confirmNewGame, 'START');
  assert.equal(pl.ui.gameMenu.continue, 'KONTYNUUJ');
  assert.equal(pl.ui.gameMenu.newGame, 'NOWA GRA');
  assert.equal(pl.ui.gameMenu.tutorial, 'SAMOUCZEK');
  assert.equal(pl.ui.gameMenu.arena, 'ARENA');
  assert.equal(pl.ui.gameMenu.cancelNewGame, 'POWRÓT');
  assert.equal(pl.ui.gameMenu.confirmNewGame, 'START');
});
