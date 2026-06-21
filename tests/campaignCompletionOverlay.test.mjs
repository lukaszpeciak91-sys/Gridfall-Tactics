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
  assert.match(completionSource, /const emblem = hasTrophyTexture \|\| !won \? null : this\.add\.text\(centerX, titleY - titleFontSize \* 1\.05, '◆'/);
});

test('campaign lost final overlay aligns to final won title and prompt without diamond', () => {
  assert.match(completionSource, /const finalWonTitleY = Math\.min\(height \* 0\.78, heroTrophyY \+ trophyHeroHeight \* 0\.52 \+ victoryTitleFontSize \* 1\.18\)/);
  assert.match(completionSource, /const finalLostTitleY = centerY/);
  assert.match(completionSource, /const titleY = hasTrophyTexture \? finalWonTitleY : \(won \? Math\.max\(height \* 0\.32, titleFontSize \* 2\.1\) : finalLostTitleY\)/);
  assert.match(completionSource, /const finalWonPromptY = Math\.max\(height \* 0\.12, heroTrophyY - trophyHeroHeight \* 0\.5 - Math\.max\(30, height \* 0\.038\)\)/);
  assert.match(completionSource, /const promptY = \(isWonTrophyPresentation \|\| !won\)[\s\S]*\? finalWonPromptY[\s\S]*: Math\.min\(height \* 0\.86, titleY \+ titleFontSize \* 1\.55\)/);
  assert.doesNotMatch(completionSource, /won \? '◆' : '◇'/);
});

test('campaign won trophy presentation is mobile-safe and transitions to compact summary', () => {
  assert.match(completionSource, /const heroMaxWidth = Math\.min\(width \* 0\.82, 520\)/);
  assert.match(completionSource, /const heroMaxHeight = Math\.min\(height \* 0\.48, 520\)/);
  assert.match(completionSource, /const compactMaxWidth = Math\.min\(width \* 0\.36, 190\)/);
  assert.match(completionSource, /setDisplaySize\(heroDisplayWidth, heroDisplayHeight\)/);
  assert.match(completionSource, /displayWidth: trophy\.compactDisplayWidth,[\s\S]*displayHeight: trophy\.compactDisplayHeight/);
  assert.match(completionSource, /duration: 420,[\s\S]*ease: 'Cubic\.easeInOut'/);
});

test('campaign won uses separate large and compact soft trophy glows', () => {
  assert.match(completionSource, /const createTrophyGlow = \(x, y, displayWidth, displayHeight, depth, alphaScale = 1\) =>/);
  assert.match(completionSource, /const glow = this\.add\.graphics\(\)\.setDepth\(depth\)\.setPosition\(x, y\)/);
  assert.match(completionSource, /const glowLayerCount = 26/);
  assert.match(completionSource, /const bloomCore = this\.add\.graphics\(\)\.setDepth\(depth \+ 0\.1\)\.setPosition\(x, y\)/);
  assert.match(completionSource, /largeGlowItems\.push\(\.\.\.newLargeGlowItems\)/);
  assert.match(completionSource, /targets: largeGlowItems,[\s\S]*alpha: 0,[\s\S]*onComplete: \(\) => largeGlowItems\.forEach\(\(item\) => item\?\.destroy\?\.\(\)\)/);
  assert.match(completionSource, /const newCompactGlowItems = createTrophyGlow\([\s\S]*trophy\.compactDisplayWidth,[\s\S]*trophy\.compactDisplayHeight/);
  assert.match(completionSource, /targets: newCompactGlowItems,[\s\S]*onComplete: \(\) => revealSummary\(\)/);
  assert.doesNotMatch(completionSource, /const rays = this\.add\.graphics/);
  assert.match(completionSource, /setDepth\(CAMPAIGN_COMPLETION_CONTENT_DEPTH \+ 0\.6\)/);
});

test('won trophy first screen shows localized victory title and keeps summary content out of cinematic pass', () => {
  assert.match(completionSource, /const isWonTrophyPresentation = won && hasTrophyTexture/);
  assert.match(completionSource, /const victorySplashText = translateActive\('ui\.campaignResult\.victorySplash', 'VICTORY'\)/);
  assert.match(completionSource, /const titleAura = isWonTrophyPresentation \? null : this\.add\.circle/);
  assert.match(completionSource, /const title = this\.add\.text\(centerX, titleY, isWonTrophyPresentation \? victorySplashText : titleText/);
  assert.match(completionSource, /campaignCelebration = this\.addBattleResultVictoryCelebration/);
  assert.match(completionSource, /cinematicItems\.push\(\.\.\.\[titleAura, title, prompt\]\.filter\(Boolean\)\)/);
});

test('tap-to-summary is guarded and background remains inert before revealing main menu button', () => {
  assert.match(completionSource, /let transitionStarted = false/);
  assert.match(completionSource, /if \(transitionStarted\) return;[\s\S]*transitionStarted = true/);
  assert.match(completionSource, /overlay\.removeAllListeners\('pointerup'\)/);
  assert.doesNotMatch(completionSource, /overlay\.disableInteractive\(\)/);
});

test('won trophy summary removes large framed panel while fallback and lost keep safe framed summary', () => {
  assert.match(completionSource, /const fallbackPanel = hasTrophyTexture \? null : this\.add\.rectangle/);
  assert.match(completionSource, /summaryItems\.push\(\.\.\.\[fallbackPanel, summaryTitle, flavor, stats, dividerCore\]\.filter\(Boolean\), \.\.\.button\.items\)/);
});


test('final campaign summary stack protects CTA and compresses middle spacing only', () => {
  assert.match(completionSource, /const ctaSafeTopY = buttonY - buttonHeight \* 0\.5 - Math\.max\(30, height \* 0\.036\)/);
  assert.match(completionSource, /const statsSafeY = ctaSafeTopY - stats\.height \* 0\.5/);
  assert.match(completionSource, /let statsY = Math\.min\(idealStatsY, statsSafeY\)/);
  assert.match(completionSource, /const compressedFlavorStatsGap = Math\.max\(minFlavorStatsGap, Math\.min\(idealFlavorStatsGap, availableGap - minTitleFlavorGap\)\)/);
  assert.match(completionSource, /const titleFlavorGap = Math\.max\(minTitleFlavorGap, Math\.min\(idealTitleFlavorGap, availableGap - compressedFlavorStatsGap\)\)/);
  assert.match(completionSource, /stats\.setY\(statsY\)/);
});


test('campaign won summary divider is anchored below the flavor block', () => {
  assert.match(completionSource, /const flavorBottomY = flavorY \+ flavor\.height \* 0\.5/);
  assert.match(completionSource, /const wonDividerFlavorGap = Math\.max\(14, height \* 0\.018\)/);
  assert.match(completionSource, /if \(won\) \{[\s\S]*dividerY = flavorBottomY \+ wonDividerFlavorGap;[\s\S]*statsY = Math\.min\([\s\S]*statsSafeY,[\s\S]*Math\.max\(statsY, dividerY \+ wonDividerStatsGap \+ stats\.height \* 0\.5\),[\s\S]*\);[\s\S]*\}/);
});

test('won trophy summary stats are centered and secondary', () => {
  assert.match(completionSource, /const stats = this\.add\.text\(centerX,[\s\S]*align: 'center'/);
  assert.match(completionSource, /lineSpacing: Math\.max\(10, Math\.floor\(height \* 0\.014\)\)/);
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
