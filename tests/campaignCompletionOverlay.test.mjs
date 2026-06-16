import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
const showStart = source.indexOf('  showCampaignCompleteModal(status) {');
const showEnd = source.indexOf('  openRulesPanel()', showStart);
const completionSource = source.slice(showStart, showEnd);
const buttonStart = source.indexOf('  createResultModalButton(');
const buttonEnd = source.indexOf('  destroyBattleResultModal()', buttonStart);
const buttonSource = source.slice(buttonStart, buttonEnd);

test('campaign won overlay uses constrained mobile-safe title sizing', () => {
  assert.match(completionSource, /translateActive\('ui\.campaignResult\.won', 'CAMPAIGN WON'\)/);
  assert.match(completionSource, /CAMPAIGN_COMPLETION_TITLE_MAX_WIDTH_RATIO/);
  assert.match(completionSource, /const titleMaxWidth = Math\.floor\(width \* CAMPAIGN_COMPLETION_TITLE_MAX_WIDTH_RATIO\)/);
  assert.match(completionSource, /fontSize: `\$\{titleFontSize\}px`/);
  assert.match(completionSource, /wordWrap: \{ width: titleMaxWidth, useAdvancedWrap: true \}/);
  assert.match(completionSource, /fixedWidth: titleMaxWidth/);
});

test('campaign lost overlay uses constrained mobile-safe title sizing', () => {
  assert.match(completionSource, /translateActive\('ui\.campaignResult\.lost', 'CAMPAIGN LOST'\)/);
  assert.match(source, /CAMPAIGN_COMPLETION_TITLE_MIN_FONT_SIZE = 28/);
  assert.match(source, /CAMPAIGN_COMPLETION_TITLE_MAX_FONT_SIZE = 64/);
  assert.match(completionSource, /Math\.floor\(titleMaxWidth \/ 8\.9\)/);
  assert.match(completionSource, /setOrigin\(0\.5\)\.setDepth\(CAMPAIGN_COMPLETION_CONTENT_DEPTH\)/);
});

test('completion button is created above BattleScene UI depth', () => {
  assert.match(source, /CAMPAIGN_COMPLETION_OVERLAY_DEPTH = 1200/);
  assert.match(source, /CAMPAIGN_COMPLETION_BUTTON_DEPTH = CAMPAIGN_COMPLETION_OVERLAY_DEPTH \+ 2/);
  assert.match(buttonSource, /depth: options\.depth \?\? 902/);
  assert.match(completionSource, /\{ depth: CAMPAIGN_COMPLETION_BUTTON_DEPTH \}/);
});

test('completion overlay blocks underlying input', () => {
  assert.match(source, /CAMPAIGN_COMPLETION_OVERLAY_ALPHA = 0\.84/);
  assert.match(completionSource, /\.setInteractive\(\)[\s\S]*\.setDepth\(CAMPAIGN_COMPLETION_OVERLAY_DEPTH\)/);
  assert.match(completionSource, /overlay\.on\('pointerdown',[\s\S]*event\?\.stopPropagation\?\.\(\)/);
  assert.match(completionSource, /overlay\.on\('pointerup',[\s\S]*event\?\.stopPropagation\?\.\(\)/);
});

test('MAIN MENU button still clears completed campaign and starts MainMenuScene', () => {
  assert.match(completionSource, /translateActive\('ui\.common\.mainMenu', 'MAIN MENU'\)/);
  assert.match(completionSource, /clearCampaign\(\);[\s\S]*this\.scene\.start\('MainMenuScene'\)/);
});

test('arena result modal behavior remains unchanged', () => {
  const showBattleStart = source.indexOf('  showBattleResultModal() {');
  const showBattleEnd = source.indexOf('  createResultModalButton(', showBattleStart);
  const battleResultSource = source.slice(showBattleStart, showBattleEnd);
  assert.match(battleResultSource, /const overlay = this\.add\.rectangle\(centerX, height \* 0\.5, width, height, 0x000000, presentation\.overlayAlpha\)[\s\S]*\.setDepth\(900\)/);
  assert.match(battleResultSource, /const modalButtons = this\.isCampaignBattle\(\)/);
  assert.match(battleResultSource, /translateActive\('ui\.common\.retry', 'RETRY'\)/);
  assert.doesNotMatch(battleResultSource, /CAMPAIGN_COMPLETION_/);
});
