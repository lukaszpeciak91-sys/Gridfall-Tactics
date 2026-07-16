import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

function extractMethodBody(methodName, nextMethodName) {
  const start = source.indexOf(`  ${methodName}(`);
  const end = source.indexOf(`  ${nextMethodName}(`, start + 1);
  assert.ok(start >= 0 && end > start, `${methodName} body should be present`);
  return source.slice(start, end);
}


test('BattleScene imports and uses Player Stats public API at scheduleBattleResultModal hook point', () => {
  assert.match(source, /import \{ addActiveBattleTime, incrementBattleStat, incrementCardPlayedStat, loadPlayerStats, markTutorialCompleted, savePlayerStats \} from '\.\.\/systems\/playerStats\.js';/);
  assert.match(source, /import \{ incrementCampaignCompletedStat \} from '\.\.\/systems\/playerStats\.js';/);
  const scheduleBody = extractMethodBody('scheduleBattleResultModal', 'disableResultPendingOverlayInteractions');
  assert.match(scheduleBody, /if \(!this\.gameState\?\.winner \|\| this\.battleResultModalShown \|\| this\.battleResultModalPending\) return;/);
  assert.ok(
    scheduleBody.indexOf('this.finalizeActiveBattleTimeOnce();') < scheduleBody.indexOf('this.trackCompletedBattleStatsOnce();'),
    'stats should be tracked after the battle timer stops',
  );
  assert.ok(
    scheduleBody.indexOf('this.trackCompletedBattleStatsOnce();') < scheduleBody.indexOf('this.battleResultModalPending = true;'),
    'stats should be tracked before modal rendering is scheduled',
  );
  assert.doesNotMatch(extractMethodBody('showBattleResultModal', 'createResultModalButton'), /trackCompletedBattleStatsOnce/);
});

test('BattleScene player stats tracking is guarded, best-effort, and maps battle results', () => {
  const trackerBody = extractMethodBody('trackCompletedBattleStatsOnce', 'scheduleBattleResultModal');
  assert.match(trackerBody, /if \(this\.battleStatsTracked \|\| !this\.gameState\?\.winner\) return false;/);
  assert.match(trackerBody, /this\.battleStatsTracked = true;/);
  assert.match(trackerBody, /player: 'won',[\s\S]*enemy: 'lost',[\s\S]*draw: 'drawn'/);
  assert.match(trackerBody, /const mode = this\.isCampaignBattle\(\) \? 'campaign' : \(this\.isTutorialBattle\(\) \? null : 'arena'\);/);
  assert.match(trackerBody, /try \{[\s\S]*incrementBattleStat\(loadPlayerStats\(\), \{[\s\S]*mode,[\s\S]*result,[\s\S]*playerFactionKey:[\s\S]*enemyFactionKey:[\s\S]*\}\);[\s\S]*savePlayerStats\(nextStats\);[\s\S]*\} catch \(error\) \{/);
});

test('BattleScene resets the per-battle player stats guard with runtime state', () => {
  assert.match(source, /resetRuntimeState\(\) \{[\s\S]*this\.battleStatsTracked = false;[\s\S]*\n  \}/);
});


test('BattleScene card play tracking helper is best-effort and excludes tutorial battles', () => {
  const trackerBody = extractMethodBody('trackPlayerCardPlayedStat', 'trackCompletedBattleStatsOnce');
  assert.match(trackerBody, /if \(this\.isTutorialBattle\(\)\) return false;/);
  assert.match(trackerBody, /try \{[\s\S]*incrementCardPlayedStat\(loadPlayerStats\(\), \{[\s\S]*statKey,[\s\S]*playerFactionKey: this\.gameState\?\.player\?\.factionKey \?\? this\.factionKey,[\s\S]*\}\);[\s\S]*savePlayerStats\(nextStats\);[\s\S]*\} catch \(error\) \{/);
  assert.match(trackerBody, /return false;/);
});

test('BattleScene card play hooks count only successful player card play result types', () => {
  assert.match(source, /if \(result\.type === 'play'\) \{\s*this\.trackPlayerCardPlayedStat\?\.\('unitsPlayed'\);\s*\}\s*\n\s*\/\/ Controller play\/redeploy explicitly enters manual unit-on-play targeting/);
  assert.doesNotMatch(source, /result\.type === 'redeploy'[\s\S]{0,120}trackPlayerCardPlayedStat\?\.\('unitsPlayed'\)/);
  assert.match(source, /if \(result\.type === 'effect'\) \{\s*this\.trackPlayerCardPlayedStat\?\.\('effectsPlayed'\);\s*\}/);
  assert.match(source, /if \(this\.effectCastState\?\.source !== 'unit-on-play' && result\.type === 'targeted-effect'\) \{\s*this\.trackPlayerCardPlayedStat\?\.\('effectsPlayed'\);\s*\}/);
  assert.doesNotMatch(source, /effect-blocked[\s\S]{0,120}trackPlayerCardPlayedStat\?\.\('effectsPlayed'\)/);
  assert.doesNotMatch(source, /unit-on-play-targeted-effect[\s\S]{0,120}trackPlayerCardPlayedStat\?\.\('effectsPlayed'\)/);
});

test('BattleScene card play tracking stays out of enemy action paths', () => {
  const enemyBody = extractMethodBody('enemyTakeAction', 'delay');
  assert.match(enemyBody, /playOrRedeployUnit\(this\.gameState, 'enemy'/);
  assert.match(enemyBody, /playEffectCard\(this\.gameState, 'enemy'/);
  assert.match(enemyBody, /resolveTargetedEffectCard\(\s*this\.gameState,\s*'enemy'/);
  assert.doesNotMatch(enemyBody, /trackPlayerCardPlayedStat/);
  assert.doesNotMatch(enemyBody, /incrementCardPlayedStat/);
});

test('BattleScene card play tracking excludes pending, invalid, cancelled, and unit-on-play flows', () => {
  const boardTapBody = extractMethodBody('onBoardCellTap', 'getActivePlayerEffectCard');
  assert.ok(
    boardTapBody.indexOf("result.type === 'targeted-effect-pending'") < boardTapBody.indexOf("this.effectCastState?.source !== 'unit-on-play' && result.type === 'targeted-effect'"),
    'pending targeted effects should return before card-play tracking',
  );
  assert.ok(
    boardTapBody.indexOf('if (!result.ok)') < boardTapBody.indexOf("this.effectCastState?.source !== 'unit-on-play' && result.type === 'targeted-effect'"),
    'invalid targeted effects should return before card-play tracking',
  );
  assert.match(boardTapBody, /this\.effectCastState\?\.source !== 'unit-on-play' && result\.type === 'targeted-effect'/);

  const cancelBody = extractMethodBody('cancelEffectTargeting', 'applyEnemyOpeningMulligan');
  assert.doesNotMatch(cancelBody, /trackPlayerCardPlayedStat/);
  assert.doesNotMatch(cancelBody, /incrementCardPlayedStat/);
});
