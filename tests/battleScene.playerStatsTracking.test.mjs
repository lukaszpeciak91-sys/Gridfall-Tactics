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
  assert.match(source, /import \{ incrementBattleStat, loadPlayerStats, savePlayerStats \} from '\.\.\/systems\/playerStats\.js';/);
  const scheduleBody = extractMethodBody('scheduleBattleResultModal', 'disableResultPendingOverlayInteractions');
  assert.match(scheduleBody, /if \(!this\.gameState\?\.winner \|\| this\.battleResultModalShown \|\| this\.battleResultModalPending\) return;/);
  assert.ok(
    scheduleBody.indexOf('this.stopCampaignBattleTimer();') < scheduleBody.indexOf('this.trackCompletedBattleStatsOnce();'),
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
