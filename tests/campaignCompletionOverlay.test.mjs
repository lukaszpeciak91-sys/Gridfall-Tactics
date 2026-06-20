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

test('BattleScene preloads campaign trophy asset with the required key and runtime path', () => {
  assert.match(source, /const CAMPAIGN_TROPHY_ASSET = Object\.freeze\(\{[\s\S]*key: 'ui\.campaign\.victoryArtefact',[\s\S]*path: resolvePublicAssetPath\('assets\/ui\/campaign-trophy\.webp'\)/);
  assert.match(source, /preloadImageAsset\(this, CAMPAIGN_TROPHY_ASSET,[\s\S]*Campaign trophy failed to load/);
});

test('campaign won uses trophy texture when loaded and safely falls back to emblem flow when missing', () => {
  assert.match(completionSource, /const hasTrophyTexture = won && hasLoadedImageAsset\(this, CAMPAIGN_TROPHY_ASSET\)/);
  assert.match(completionSource, /this\.add\.image\(centerX, heroTrophyY, CAMPAIGN_TROPHY_ASSET\.key\)/);
  assert.match(completionSource, /const emblem = hasTrophyTexture \? null : this\.add\.text\(centerX, titleY - titleFontSize \* 1\.05, won \? '◆' : '◇'/);
});

test('campaign won trophy presentation is mobile-safe and transitions to compact summary', () => {
  assert.match(completionSource, /const heroMaxWidth = Math\.min\(width \* 0\.82, 520\)/);
  assert.match(completionSource, /const heroMaxHeight = Math\.min\(height \* 0\.48, 520\)/);
  assert.match(completionSource, /const compactMaxWidth = Math\.min\(width \* 0\.36, 190\)/);
  assert.match(completionSource, /setDisplaySize\(heroDisplayWidth, heroDisplayHeight\)/);
  assert.match(completionSource, /displayWidth: trophy\.compactDisplayWidth,[\s\S]*displayHeight: trophy\.compactDisplayHeight/);
  assert.match(completionSource, /duration: 420,[\s\S]*ease: 'Cubic\.easeInOut'/);
});

test('campaign won adds passive procedural glow and rays below the trophy', () => {
  assert.match(completionSource, /const glow = this\.add\.circle\(centerX, heroTrophyY, rayRadius, 0xfacc15, 0\.12\)[\s\S]*CAMPAIGN_COMPLETION_CONTENT_DEPTH \+ 0\.1/);
  assert.match(completionSource, /const rays = this\.add\.graphics\(\)\.setDepth\(CAMPAIGN_COMPLETION_CONTENT_DEPTH \+ 0\.2\)/);
  assert.match(completionSource, /setDepth\(CAMPAIGN_COMPLETION_CONTENT_DEPTH \+ 0\.6\)/);
});

test('tap-to-summary is guarded and disables fullscreen interaction before revealing main menu button', () => {
  assert.match(completionSource, /let transitionStarted = false/);
  assert.match(completionSource, /if \(transitionStarted\) return;[\s\S]*transitionStarted = true/);
  assert.match(completionSource, /overlay\.disableInteractive\(\);[\s\S]*overlay\.removeAllListeners\('pointerup'\)/);
});

test('won trophy summary removes large framed panel while fallback and lost keep safe framed summary', () => {
  assert.match(completionSource, /const fallbackPanel = hasTrophyTexture \? null : this\.add\.rectangle/);
  assert.match(completionSource, /summaryItems\.push\(\.\.\.\[fallbackPanel, summaryTitle, flavor, stats, dividerCore\]\.filter\(Boolean\), \.\.\.button\.items\)/);
});

test('campaign completion stats still use existing save-duration timing only', () => {
  assert.match(completionSource, /const createdAt = Date\.parse\(campaign\?\.createdAt\)/);
  assert.match(completionSource, /const updatedAt = Date\.parse\(campaign\?\.updatedAt\)/);
  assert.match(completionSource, /this\.formatCampaignDuration\(updatedAt - createdAt\)/);
});

test('completion button is created above BattleScene UI depth', () => {
  assert.match(source, /CAMPAIGN_COMPLETION_OVERLAY_DEPTH = 1200/);
  assert.match(source, /CAMPAIGN_COMPLETION_BUTTON_DEPTH = CAMPAIGN_COMPLETION_OVERLAY_DEPTH \+ 2/);
  assert.match(buttonSource, /depth: options\.depth \?\? 902/);
  assert.match(completionSource, /\{ depth: CAMPAIGN_COMPLETION_BUTTON_DEPTH \}/);
});

test('completion overlay blocks underlying input before transition', () => {
  assert.match(source, /CAMPAIGN_COMPLETION_OVERLAY_ALPHA = 0\.84/);
  assert.match(completionSource, /\.setInteractive\(\)[\s\S]*\.setDepth\(CAMPAIGN_COMPLETION_OVERLAY_DEPTH\)/);
  assert.match(completionSource, /overlay\.on\('pointerdown',[\s\S]*event\?\.stopPropagation\?\.\(\)/);
  assert.match(completionSource, /overlay\.on\('pointerup',[\s\S]*showSummary\(\)/);
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
