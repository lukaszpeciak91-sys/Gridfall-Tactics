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
