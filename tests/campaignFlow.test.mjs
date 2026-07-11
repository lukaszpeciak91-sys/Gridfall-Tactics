import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createNewCampaign, applyCampaignBattleResult, selectCampaignEnemy } from '../src/systems/campaignState.js';
import { getCampaignEnemyFactionKeys, getCampaignEnemyViewModels } from '../src/systems/campaignEnemySelection.js';

const read = (path) => fs.readFileSync(path, 'utf8');

test('arena faction selection still routes through BattleScene by default', () => {
  const source = read('src/scenes/FactionSelectScene.js');
  assert.match(source, /this\.mode = data\?\.mode === 'campaign' \? 'campaign' : 'arena'/);
  assert.match(source, /selectFaction\(factionKey\) \{[\s\S]*this\.startBattle\(factionKey\)/);
  assert.match(source, /enterBattleScene\(this, \{ factionKey \}\)/);
});

test('campaign faction selection creates and saves campaign state', () => {
  const source = read('src/scenes/FactionSelectScene.js');
  assert.match(source, /startCampaign\(factionKey\)/);
  assert.match(source, /const campaign = createNewCampaign\(factionKey\)/);
  assert.match(source, /saveCampaign\(campaign\)/);
  assert.match(source, /this\.scene\.start\('CampaignEnemySelectScene', \{ campaign: savedCampaign \}\)/);
});

test('new game requires confirmation when campaign exists', () => {
  const source = read('src/scenes/GameMenuScene.js');
  assert.match(source, /if \(hasActiveCampaign\(\)\) \{[\s\S]*this\.showNewGameConfirmation\(\)/);
  assert.match(source, /clearCampaign\(\)/);
  assert.match(source, /translateActive\('ui\.gameMenu\.newGameConfirmTitle'/);
  assert.match(source, /translateActive\('ui\.gameMenu\.newGameConfirmBody'/);
});


test('FactionSelectScene back route can return arena and campaign launches to game menu', () => {
  const faction = read('src/scenes/FactionSelectScene.js');
  const gameMenu = read('src/scenes/GameMenuScene.js');
  assert.match(faction, /this\.returnSceneKey = data\?\.returnSceneKey === 'GameMenuScene' \? 'GameMenuScene' : 'MainMenuScene'/);
  assert.match(faction, /returnToMainMenu\(\) \{[\s\S]*this\.scene\.start\(this\.returnSceneKey\)/);
  assert.match(gameMenu, /this\.scene\.start\('FactionSelectScene', \{ returnSceneKey: 'GameMenuScene' \}\)/);
  assert.match(gameMenu, /this\.scene\.start\('FactionSelectScene', \{ mode: 'campaign', returnSceneKey: 'GameMenuScene' \}\)/);
});

test('new game confirmation modal uses short localized labels and preserves actions', () => {
  const source = read('src/scenes/GameMenuScene.js');
  const en = JSON.parse(read('src/localization/translations/en.json'));
  const pl = JSON.parse(read('src/localization/translations/pl.json'));
  assert.equal(en.ui.gameMenu.cancelNewGame, 'BACK');
  assert.equal(en.ui.gameMenu.confirmNewGame, 'START');
  assert.equal(pl.ui.gameMenu.cancelNewGame, 'POWRÓT');
  assert.equal(pl.ui.gameMenu.confirmNewGame, 'START');
  assert.match(source, /translateActive\('ui\.gameMenu\.cancelNewGame', 'BACK'\), \(\) => this\.closeNewGameConfirmation\(\)\)/);
  assert.match(source, /translateActive\('ui\.gameMenu\.confirmNewGame', 'START'\), \(\) => \{[\s\S]*clearCampaign\(\);[\s\S]*this\.openCampaignFactionSelect\(\)/);
});

test('continue campaign opens enemy selection scene', () => {
  const source = read('src/scenes/GameMenuScene.js');
  assert.match(source, /continueCampaign\(\) \{[\s\S]*if \(!hasActiveCampaign\(\)\) return;[\s\S]*this\.scene\.start\('CampaignEnemySelectScene'\)/);
});

test('campaign enemy select excludes player and shows exactly five stable enemies', () => {
  const campaign = createNewCampaign('Aggro');
  const first = getCampaignEnemyFactionKeys(campaign);
  const second = getCampaignEnemyFactionKeys(campaign);
  assert.equal(first.includes('Aggro'), false);
  assert.equal(first.length, 5);
  assert.deepEqual(first, second);
});

test('defeated enemy remains visible and disabled', () => {
  const campaign = createNewCampaign('Aggro');
  const defeatedKey = Object.keys(campaign.enemies)[0];
  const resolved = applyCampaignBattleResult(selectCampaignEnemy(campaign, defeatedKey), { enemyFactionKey: defeatedKey, winner: 'player' });
  const model = getCampaignEnemyViewModels(resolved).find((enemy) => enemy.factionKey === defeatedKey);
  assert.ok(model);
  assert.equal(model.defeated, true);
  assert.equal(model.selectable, false);
  assert.equal(model.indicator, '✓');
});

test('attempt indicators reflect campaign state', () => {
  const campaign = createNewCampaign('Aggro');
  const enemyKey = Object.keys(campaign.enemies)[0];
  const damaged = applyCampaignBattleResult(selectCampaignEnemy(campaign, enemyKey), { enemyFactionKey: enemyKey, winner: 'enemy' });
  const model = getCampaignEnemyViewModels(damaged).find((enemy) => enemy.factionKey === enemyKey);
  assert.equal(model.attemptsRemaining, 2);
  assert.equal(model.indicator, '●●○');
  assert.equal(model.selectable, true);
});

test('invalid campaign returns safely to game menu', () => {
  const source = read('src/scenes/CampaignEnemySelectScene.js');
  assert.match(source, /if \(!isValidCampaignState\(this\.campaign\) \|\| this\.campaign\.status !== 'active'\) \{[\s\S]*this\.scene\.start\('GameMenuScene'\)/);
});

test('campaign scene registered and localization keys exist', () => {
  const main = read('src/main.js');
  assert.match(main, /CampaignEnemySelectScene/);
  for (const locale of ['en', 'pl']) {
    const translations = JSON.parse(read(`src/localization/translations/${locale}.json`));
    assert.ok(translations.ui.campaignEnemySelect.title);
    assert.ok(translations.ui.gameMenu.newGameConfirmTitle);
    assert.ok(translations.ui.gameMenu.cancelNewGame);
    assert.ok(translations.ui.gameMenu.confirmNewGame);
  }
});


test('temporary mobile end scenes hook is visible in main builds without campaign mutation', () => {
  const source = read('src/scenes/CampaignEnemySelectScene.js');
  assert.match(source, /TEMP MOBILE TEST HOOK:[\s\S]*Remove before public\/release build/);
  assert.match(source, /const TEMP_MOBILE_END_SCENE_PREVIEW_ENABLED = true/);
  assert.doesNotMatch(source, /import\.meta\.env\.DEV/);
  assert.match(source, /this\.drawEnemyCards\(\{ width, height, headerBottomY: header\.bottomY \}\);[\s\S]*this\.drawEndScenePreviewControl\(\{ width, height \}\)/);
  assert.match(source, /height - \(TEMP_MOBILE_END_SCENE_PREVIEW_ENABLED \? 168 : 88\)/);
  assert.match(source, /'END SCENES'[\s\S]*'DEV PREVIEW ONLY'/);
  assert.match(source, /makeChoice\(panelX - 72, panelY \+ 4, 'VICTORY', 'won'/);
  assert.match(source, /makeChoice\(panelX \+ 72, panelY \+ 4, 'DEFEAT', 'lost'/);
  assert.match(source, /'CANCEL'[\s\S]*cancel\.on\('pointerup', closeChoice\)/);
  assert.doesNotMatch(source, /saveCampaign\([^\n]*(preview|completionPreview|previewStatus)/);
});

test('campaign enemy selection launches BattleScene with campaign context', () => {
  const source = read('src/scenes/CampaignEnemySelectScene.js');
  assert.match(source, /const currentCampaign = loadCampaign\(\) \?\? this\.campaign/);
  assert.match(source, /selectCampaignEnemy\(currentCampaign, enemyFactionKey\)/);
  assert.match(source, /enterBattleScene\(this, \{[\s\S]*factionKey: updatedCampaign\.playerFactionKey,[\s\S]*enemyFactionKey,[\s\S]*battleContext: \{[\s\S]*mode: 'campaign',[\s\S]*campaignRunId: updatedCampaign\.runId,[\s\S]*campaignEnemyFactionKey: enemyFactionKey/);
});

test('campaign enemy selection relies on state guards for defeated and exhausted enemies', () => {
  const source = read('src/scenes/CampaignEnemySelectScene.js');
  assert.match(source, /if \(!enemy\.selectable\) return/);
  assert.match(source, /selectCampaignEnemy\(currentCampaign, enemyFactionKey\)/);
});

test('BattleScene defaults to arena context and preserves arena result exit', () => {
  const source = read('src/scenes/BattleScene.js');
  assert.match(source, /normalizeBattleContext\(context = \{\}\)[\s\S]*return \{ mode: 'arena' \}/);
  assert.match(source, /this\.isCampaignBattle\(\)[\s\S]*translateActive\('ui\.common\.exit', 'EXIT'\)[\s\S]*\(\) => this\.exitBattleToFactionSelect\(\)/);
  assert.match(source, /exitBattleToFactionSelect\(\) \{[\s\S]*this\.scene\.start\('FactionSelectScene'\)/);
});




test('BattleScene preserves tutorial context without treating it as campaign', () => {
  const source = read('src/scenes/BattleScene.js');
  assert.match(source, /if \(context\?\.mode === 'tutorial'\) \{[\s\S]*return \{[\s\S]*mode: 'tutorial'[\s\S]*tutorialId:[\s\S]*returnSceneKey:/);
  assert.match(source, /isTutorialBattle\(\) \{[\s\S]*return this\.battleContext\?\.mode === 'tutorial'/);
  assert.match(source, /isCampaignBattle\(\) \{[\s\S]*return this\.battleContext\?\.mode === 'campaign'/);
});

test('BattleScene tutorial result exits to game menu without campaign progression', () => {
  const source = read('src/scenes/BattleScene.js');
  assert.match(source, /if \(this\.isTutorialBattle\(\)\) \{[\s\S]*translateActive\('ui\.common\.exit', 'EXIT'\)[\s\S]*\(\) => this\.exitTutorialBattleToGameMenu\(\)/);
  assert.match(source, /exitTutorialBattleToGameMenu\(\) \{[\s\S]*this\.scene\.start\('GameMenuScene'\)/);
  assert.match(source, /if \(this\.isTutorialBattle\(\)\) \{[\s\S]*this\.exitTutorialBattleToGameMenu\(\);[\s\S]*return;[\s\S]*\}/);
  assert.match(source, /getBattleResultOverlayKind\(\) \{[\s\S]*if \(this\.isTutorialBattle\(\)\) return 'tutorial-battle-result'/);
  const tutorialButtonStart = source.indexOf('if (this.isTutorialBattle()) {', source.indexOf('getBattleResultModalButtons'));
  const tutorialButtonBranch = source.slice(tutorialButtonStart, source.indexOf('return [', tutorialButtonStart));
  assert.doesNotMatch(tutorialButtonBranch, /continueCampaignBattleResult/);
  assert.doesNotMatch(tutorialButtonBranch, /exitBattleToFactionSelect\(\)/);
});

test('BattleScene campaign exit routes back to campaign enemy selection', () => {
  const source = read('src/scenes/BattleScene.js');
  assert.match(source, /exitBattleToFactionSelect\(\) \{[\s\S]*if \(this\.isCampaignBattle\(\)\) \{[\s\S]*this\.exitBattleToCampaignEnemySelect\(\)/);
  assert.match(source, /exitBattleToCampaignEnemySelect\(\) \{[\s\S]*this\.scene\.start\('CampaignEnemySelectScene', \{ campaign \}\)/);
});

test('BattleScene routes campaign results through campaign state only', () => {
  const source = read('src/scenes/BattleScene.js');
  assert.match(source, /continueCampaignBattleResult\(\)/);
  assert.match(source, /winner: this\.gameState\?\.winner === 'player' \? 'player' : \(this\.gameState\?\.winner === 'draw' \? 'draw' : 'enemy'\)/);
  assert.match(source, /battleDurationMs: this\.getActiveBattleDurationMs\(\)/);
  assert.match(source, /campaign\.runId !== this\.battleContext\.campaignRunId/);
  assert.match(source, /routeAfterIgnoredCampaignResult\(campaign\)/);
  assert.match(source, /applyCampaignBattleResult\(campaign, result\)/);
  assert.match(source, /saveCampaign\(updatedCampaign\)/);
  assert.match(source, /this\.scene\.start\('CampaignEnemySelectScene', \{ campaign: updatedCampaign \}\)/);
  assert.doesNotMatch(source, /applyCampaignBattleResult\(campaign, \{[\s\S]*gameState/);
});

test('campaign result modal uses continue without direct retry and clears completed campaign from main menu button', () => {
  const source = read('src/scenes/BattleScene.js');
  assert.match(source, /this\.isCampaignBattle\(\)[\s\S]*translateActive\('ui\.common\.continue', 'CONTINUE'\)[\s\S]*continueCampaignBattleResult/);
  assert.match(source, /showCampaignCompleteModal\(status\)/);
  assert.match(source, /translateActive\('ui\.campaignResult\.won', 'CAMPAIGN WON'\)/);
  assert.match(source, /translateActive\('ui\.campaignResult\.lost', 'CAMPAIGN LOST'\)/);
  assert.match(source, /clearCampaign\(\);[\s\S]*this\.scene\.start\('MainMenuScene'\)/);
});

test('campaign result guards run id before applying progression', () => {
  const source = read('src/scenes/BattleScene.js');
  assert.match(source, /campaign\.runId !== this\.battleContext\.campaignRunId/);
  assert.match(source, /Campaign battle result ignored because campaign run id changed/);
  assert.match(source, /routeAfterIgnoredCampaignResult\(campaign\)/);
});

test('campaign result guard safely routes valid campaigns back to enemy select', () => {
  const source = read('src/scenes/BattleScene.js');
  assert.match(source, /routeAfterIgnoredCampaignResult\(campaign = loadCampaign\(\)\)/);
  assert.match(source, /this\.scene\.start\('CampaignEnemySelectScene', \{ campaign \}\)/);
  assert.match(source, /this\.scene\.start\('GameMenuScene'\)/);
});

test('campaign draw routes back to campaign enemy selection', () => {
  const source = read('src/scenes/BattleScene.js');
  assert.match(source, /winner: this\.gameState\?\.winner === 'player' \? 'player' : \(this\.gameState\?\.winner === 'draw' \? 'draw' : 'enemy'\)/);
  assert.match(source, /battleDurationMs: this\.getActiveBattleDurationMs\(\)/);
  assert.match(source, /this\.scene\.start\('CampaignEnemySelectScene', \{ campaign: updatedCampaign \}\)/);
});

test('campaign progression handles losses and wins at state level', () => {
  let campaign = createNewCampaign('Aggro');
  const enemyKey = Object.keys(campaign.enemies)[0];
  campaign = applyCampaignBattleResult(selectCampaignEnemy(campaign, enemyKey), { enemyFactionKey: enemyKey, winner: 'enemy' });
  assert.equal(campaign.enemies[enemyKey].attemptsRemaining, 2);
  assert.equal(campaign.status, 'active');
  campaign = applyCampaignBattleResult(selectCampaignEnemy(campaign, enemyKey), { enemyFactionKey: enemyKey, winner: 'enemy' });
  campaign = applyCampaignBattleResult(selectCampaignEnemy(campaign, enemyKey), { enemyFactionKey: enemyKey, winner: 'enemy' });
  assert.equal(campaign.status, 'lost');

  let winningCampaign = createNewCampaign('Aggro');
  for (const key of Object.keys(winningCampaign.enemies)) {
    winningCampaign = applyCampaignBattleResult(selectCampaignEnemy(winningCampaign, key), { enemyFactionKey: key, winner: 'player' });
  }
  assert.equal(winningCampaign.status, 'won');
});

test('BattleMenuScene preserves enemy faction and battle context when falling back to restart', () => {
  const battle = read('src/scenes/BattleScene.js');
  const menu = read('src/scenes/BattleMenuScene.js');
  assert.match(battle, /this\.scene\.launch\('BattleMenuScene', \{ factionKey: this\.factionKey, enemyFactionKey: this\.enemyFactionKey, battleContext: this\.battleContext/);
  assert.match(menu, /const enemyFactionKey = typeof data\?\.enemyFactionKey === 'string'/);
  assert.match(menu, /const battleContext = data\?\.battleContext/);
  assert.match(menu, /enterBattleScene\(this, \{ factionKey, enemyFactionKey, battleContext \}\)/);
});

test('attempt indicators render inside every campaign enemy card including attrition swarm', () => {
  const campaign = createNewCampaign('Aggro');
  const models = getCampaignEnemyViewModels(campaign);
  assert.equal(models.length, 5);
  assert.ok(models.some((enemy) => enemy.factionKey === 'Attrition Swarm'));
  assert.equal(models.every((enemy) => enemy.indicator === '●●●'), true);
  const source = read('src/scenes/CampaignEnemySelectScene.js');
  assert.match(source, /const indicatorX = cardWidth \/ 2 - ATTEMPT_INDICATOR_RIGHT_MARGIN - indicatorPanelWidth \/ 2/);
  assert.match(source, /const indicatorBottomMargin = enemy\.defeated \? ATTEMPT_INDICATOR_BOTTOM_MARGIN : ACTIVE_ATTEMPT_INDICATOR_BOTTOM_MARGIN/);
  assert.match(source, /const indicatorY = y \+ CARD_HEIGHT - indicatorBottomMargin - indicatorPanelHeight \/ 2/);
  assert.match(source, /fixedWidth: ATTEMPT_INDICATOR_WIDTH/);
  assert.match(source, /\.setOrigin\(0\.5\)/);
});

test('attempt marker layout keeps right-aligned active panel above the title line inside card bounds', () => {
  const source = read('src/scenes/CampaignEnemySelectScene.js');
  assert.match(source, /const ATTEMPT_INDICATOR_BOTTOM_MARGIN = 19/);
  assert.match(source, /const ACTIVE_ATTEMPT_INDICATOR_BOTTOM_MARGIN = 55/);
  assert.match(source, /const ATTEMPT_INDICATOR_PADDING_X = 12/);
  assert.match(source, /const ATTEMPT_INDICATOR_PADDING_Y = 7/);
  assert.match(source, /indicatorX - indicatorPanelWidth \/ 2/);
  assert.match(source, /indicatorY - indicatorPanelHeight \/ 2/);
});

test('attempt marker indicators remain available for active, damaged, and defeated enemies', () => {
  let campaign = createNewCampaign('Aggro');
  const enemyKey = Object.keys(campaign.enemies)[0];
  assert.equal(getCampaignEnemyViewModels(campaign).find((enemy) => enemy.factionKey === enemyKey).indicator, '●●●');
  campaign = applyCampaignBattleResult(selectCampaignEnemy(campaign, enemyKey), { enemyFactionKey: enemyKey, winner: 'enemy' });
  assert.equal(getCampaignEnemyViewModels(campaign).find((enemy) => enemy.factionKey === enemyKey).indicator, '●●○');
  campaign = applyCampaignBattleResult(selectCampaignEnemy(campaign, enemyKey), { enemyFactionKey: enemyKey, winner: 'player' });
  assert.equal(getCampaignEnemyViewModels(campaign).find((enemy) => enemy.factionKey === enemyKey).indicator, '✓');
});

test('campaign localization keys exist', () => {
  for (const locale of ['en', 'pl']) {
    const translations = JSON.parse(read(`src/localization/translations/${locale}.json`));
    assert.ok(translations.ui.common.continue);
    assert.ok(translations.ui.common.mainMenu);
    assert.ok(translations.ui.campaignResult.won);
    assert.ok(translations.ui.campaignResult.lost);
  }
});

test('campaign start and continuation lifecycle tracking hooks are best-effort and idempotent by status transition', () => {
  const factionSelect = read('src/scenes/FactionSelectScene.js');
  assert.match(factionSelect, /import \{ incrementCampaignStarted, loadPlayerStats, savePlayerStats \} from '\.\.\/systems\/playerStats\.js';/);
  assert.match(factionSelect, /const savedCampaign = saveCampaign\(campaign\) \?\? campaign;[\s\S]*savePlayerStats\(incrementCampaignStarted\(loadPlayerStats\(\)\)\);[\s\S]*this\.scene\.start\('CampaignEnemySelectScene', \{ campaign: savedCampaign \}\)/);
  assert.match(factionSelect, /catch \(error\) \{[\s\S]*Campaign start player stats tracking failed; campaign flow will continue\./);

  const battle = read('src/scenes/BattleScene.js');
  assert.match(battle, /import \{ incrementCampaignCompletedStat \} from '\.\.\/systems\/playerStats\.js';/);
  assert.match(battle, /trackCompletedCampaignLifecycleStats\(previousCampaign, updatedCampaign\) \{[\s\S]*previousCampaign\?\.status !== 'active'[\s\S]*!\['won', 'lost'\]\.includes\(updatedCampaign\?\.status\)[\s\S]*return false;/);
  assert.match(battle, /incrementCampaignCompletedStat\(loadPlayerStats\(\), \{[\s\S]*result: updatedCampaign\.status,[\s\S]*playerFactionKey: updatedCampaign\.playerFactionKey,[\s\S]*\}\)/);
  assert.match(battle, /catch \(error\) \{[\s\S]*Campaign lifecycle player stats tracking failed; campaign flow will continue\./);
  assert.match(battle, /updatedCampaign = applyCampaignBattleResult\(campaign, result\);[\s\S]*saveCampaign\(updatedCampaign\);[\s\S]*this\.trackCompletedCampaignLifecycleStats\(campaign, updatedCampaign\);/);
});
