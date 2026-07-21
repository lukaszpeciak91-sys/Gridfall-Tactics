import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const battleSource = () => fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
const factionSource = () => fs.readFileSync('src/scenes/FactionSelectScene.js', 'utf8');

test('Arena launch stores battlegroundId and new Arena battle performs a fresh selection', () => {
  const source = factionSource();
  const start = source.slice(source.indexOf('  startBattle(factionKey) {'), source.indexOf('  resetStartBattleGuard()'));
  assert.match(start, /const selectedBattlegroundId = selectArenaBattlegroundId\(\);/);
  assert.match(start, /battleContext:[\s\S]*mode: 'arena',[\s\S]*battlegroundId: selectedBattlegroundId/);
});

test('BattleScene preserves and resolves Arena battleground from battleContext', () => {
  const source = battleSource();
  assert.match(source, /battlegroundId: resolveArenaBattlegroundId\(context\?\.battlegroundId\)/);
  assert.match(source, /resolveBattleBackgroundAsset\(\) \{[\s\S]*this\.battleContext\?\.mode === 'arena'[\s\S]*getArenaBattlegroundAsset\(this\.battleContext\?\.battlegroundId\)/);
  assert.match(source, /this\.battleContext\?\.mode === 'campaign'[\s\S]*return BATTLE_BACKGROUND_ASSETS\.default/);
});

test('Resize, fullscreen, rules, settings, deck info, and retry do not reroll battlegrounds', () => {
  const source = battleSource();
  const fullscreen = source.slice(source.indexOf('  onFullscreenChanged()'), source.indexOf('  onTutorialDocumentFullscreenChanged'));
  const viewport = source.slice(source.indexOf('  onViewportChanged()'), source.indexOf('  onTutorialViewportChanged'));
  const rebuild = source.slice(source.indexOf('  rebuildBattleView(reason ='), source.indexOf('  restoreResultOverlayState'));
  const navigation = source.slice(source.indexOf('  openRulesPanel()'), source.indexOf('  exitBattleToMainMenu()'));
  const retry = source.slice(source.indexOf('  retryBattle()'), source.indexOf('  toggleFullscreen()'));
  const deckInfo = source.slice(source.indexOf('  openDeckInfoPanel()'), source.indexOf('  bindDeckInfoScrollHandlers'));

  for (const block of [fullscreen, viewport, rebuild, navigation, retry, deckInfo]) {
    assert.doesNotMatch(block, /selectArenaBattlegroundId\(/);
  }
  assert.match(rebuild, /this\.backgroundArtAsset = this\.resolveBattleBackgroundAsset\(\);/);
  assert.match(retry, /const battleContext = this\.battleContext;[\s\S]*restartBattleScene\(this, \{ factionKey, enemyFactionKey, battleContext \}\)/);
});

test('BattleScene preloads only active Arena battleground while retaining fallback behavior', () => {
  const source = battleSource();
  assert.match(source, /preloadBattleBackgroundArt\(this, \[this\.resolveBattleBackgroundAsset\(\)\]\)/);
  assert.match(source, /this\.cameras\.main\.setBackgroundColor\(BATTLE_BACKGROUND_FALLBACK_COLOR_HEX\)/);
});
