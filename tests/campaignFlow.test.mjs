import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createNewCampaign, applyCampaignBattleResult } from '../src/systems/campaignState.js';
import { getCampaignEnemyFactionKeys, getCampaignEnemyViewModels } from '../src/systems/campaignEnemySelection.js';

const read = (path) => fs.readFileSync(path, 'utf8');

test('arena faction selection still routes through BattleScene by default', () => {
  const source = read('src/scenes/FactionSelectScene.js');
  assert.match(source, /this\.mode = data\?\.mode === 'campaign' \? 'campaign' : 'arena'/);
  assert.match(source, /selectFaction\(factionKey\) \{[\s\S]*this\.startBattle\(factionKey\)/);
  assert.match(source, /this\.scene\.start\('BattleScene', \{ factionKey \}\)/);
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
  const resolved = applyCampaignBattleResult(campaign, { enemyFactionKey: defeatedKey, winner: 'player' });
  const model = getCampaignEnemyViewModels(resolved).find((enemy) => enemy.factionKey === defeatedKey);
  assert.ok(model);
  assert.equal(model.defeated, true);
  assert.equal(model.selectable, false);
  assert.equal(model.indicator, '✓');
});

test('attempt indicators reflect campaign state', () => {
  const campaign = createNewCampaign('Aggro');
  const enemyKey = Object.keys(campaign.enemies)[0];
  const damaged = applyCampaignBattleResult(campaign, { enemyFactionKey: enemyKey, winner: 'enemy' });
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
    assert.ok(translations.ui.gameMenu.confirmNewGame);
  }
});

test('campaign enemy selection launches BattleScene with campaign context', () => {
  const source = read('src/scenes/CampaignEnemySelectScene.js');
  assert.match(source, /const currentCampaign = loadCampaign\(\) \?\? this\.campaign/);
  assert.match(source, /selectCampaignEnemy\(currentCampaign, enemyFactionKey\)/);
  assert.match(source, /this\.scene\.start\('BattleScene', \{[\s\S]*factionKey: updatedCampaign\.playerFactionKey,[\s\S]*enemyFactionKey,[\s\S]*battleContext: \{[\s\S]*mode: 'campaign',[\s\S]*campaignRunId: updatedCampaign\.runId,[\s\S]*campaignEnemyFactionKey: enemyFactionKey/);
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

test('BattleScene routes campaign results through campaign state only', () => {
  const source = read('src/scenes/BattleScene.js');
  assert.match(source, /continueCampaignBattleResult\(\)/);
  assert.match(source, /winner: this\.gameState\?\.winner === 'player' \? 'player' : \(this\.gameState\?\.winner === 'draw' \? 'draw' : 'enemy'\)/);
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

test('campaign progression handles losses and wins at state level', () => {
  let campaign = createNewCampaign('Aggro');
  const enemyKey = Object.keys(campaign.enemies)[0];
  campaign = applyCampaignBattleResult(campaign, { enemyFactionKey: enemyKey, winner: 'enemy' });
  assert.equal(campaign.enemies[enemyKey].attemptsRemaining, 2);
  assert.equal(campaign.status, 'active');
  campaign = applyCampaignBattleResult(campaign, { enemyFactionKey: enemyKey, winner: 'enemy' });
  campaign = applyCampaignBattleResult(campaign, { enemyFactionKey: enemyKey, winner: 'enemy' });
  assert.equal(campaign.status, 'lost');

  let winningCampaign = createNewCampaign('Aggro');
  for (const key of Object.keys(winningCampaign.enemies)) {
    winningCampaign = applyCampaignBattleResult(winningCampaign, { enemyFactionKey: key, winner: 'player' });
  }
  assert.equal(winningCampaign.status, 'won');
});

test('BattleMenuScene preserves enemy faction and battle context when falling back to restart', () => {
  const battle = read('src/scenes/BattleScene.js');
  const menu = read('src/scenes/BattleMenuScene.js');
  assert.match(battle, /this\.scene\.launch\('BattleMenuScene', \{ factionKey: this\.factionKey, enemyFactionKey: this\.enemyFactionKey, battleContext: this\.battleContext/);
  assert.match(menu, /const enemyFactionKey = typeof data\?\.enemyFactionKey === 'string'/);
  assert.match(menu, /const battleContext = data\?\.battleContext/);
  assert.match(menu, /this\.scene\.start\('BattleScene', \{ factionKey, enemyFactionKey, battleContext \}\)/);
});

test('attempt indicators render inside every campaign enemy card including attrition swarm', () => {
  const campaign = createNewCampaign('Aggro');
  const models = getCampaignEnemyViewModels(campaign);
  assert.equal(models.length, 5);
  assert.ok(models.some((enemy) => enemy.factionKey === 'Attrition Swarm'));
  assert.equal(models.every((enemy) => enemy.indicator === '●●●'), true);
  const source = read('src/scenes/CampaignEnemySelectScene.js');
  assert.match(source, /const indicatorX = cardWidth \/ 2 - ATTEMPT_INDICATOR_RIGHT_MARGIN/);
  assert.match(source, /const indicatorY = y \+ CARD_HEIGHT - ATTEMPT_INDICATOR_BOTTOM_MARGIN/);
  assert.match(source, /\.setOrigin\(1, 1\)/);
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
