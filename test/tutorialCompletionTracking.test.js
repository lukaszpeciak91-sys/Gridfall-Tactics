import assert from 'node:assert/strict';
import test from 'node:test';

import { readFile } from 'node:fs/promises';
import {
  createDefaultPlayerStats,
  markTutorialCompleted,
} from '../src/systems/playerStats.js';

const battleSceneSource = await readFile(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

const BATTLE_COUNTER_KEYS = Object.freeze([
  'battlesPlayed',
  'battlesWon',
  'battlesLost',
  'battlesDrawn',
  'arenaBattlesPlayed',
  'arenaBattlesWon',
  'arenaBattlesLost',
  'arenaBattlesDrawn',
  'campaignBattlesPlayed',
  'campaignBattlesWon',
  'campaignBattlesLost',
  'campaignBattlesDrawn',
]);

function extractMethodBody(methodName, nextMethodName) {
  const start = battleSceneSource.indexOf(`  ${methodName}(`);
  const end = battleSceneSource.indexOf(`  ${nextMethodName}(`, start + 1);
  assert.ok(start >= 0 && end > start, `${methodName} body should be present`);
  return battleSceneSource.slice(start, end);
}

test('markTutorialCompleted sets tutorialCompleted to true', () => {
  const stats = createDefaultPlayerStats();
  const nextStats = markTutorialCompleted(stats);

  assert.equal(nextStats.tutorialCompleted, true);
});

test('markTutorialCompleted is idempotent', () => {
  const stats = { ...createDefaultPlayerStats(), tutorialCompleted: true };
  const once = markTutorialCompleted(stats);
  const twice = markTutorialCompleted(once);

  assert.deepEqual(twice, once);
});

test('markTutorialCompleted does not mutate input stats', () => {
  const stats = createDefaultPlayerStats();
  const before = structuredClone(stats);

  markTutorialCompleted(stats);

  assert.deepEqual(stats, before);
  assert.equal(stats.tutorialCompleted, false);
});

test('playable tutorial win marks tutorial completed at the result scheduling hook', () => {
  const trackerBody = extractMethodBody('trackTutorialCompletionOnce', 'trackCompletedBattleStatsOnce');
  const scheduleBody = extractMethodBody('scheduleBattleResultModal', 'disableResultPendingOverlayInteractions');

  assert.match(trackerBody, /this\.gameState\?\.winner !== 'player'/);
  assert.match(trackerBody, /markTutorialCompleted\(loadPlayerStats\(\)\)/);
  assert.match(trackerBody, /savePlayerStats\(nextStats\)/);
  assert.ok(
    scheduleBody.indexOf('this.trackTutorialCompletionOnce();') < scheduleBody.indexOf('this.trackCompletedBattleStatsOnce();'),
    'tutorial completion should run before normal battle stat tracking is skipped for tutorial battles',
  );
});

test('playable tutorial loss and draw do not mark tutorial completed', () => {
  const trackerBody = extractMethodBody('trackTutorialCompletionOnce', 'trackCompletedBattleStatsOnce');

  assert.match(trackerBody, /this\.gameState\?\.winner !== 'player'/);
  assert.doesNotMatch(trackerBody, /winner === 'enemy'[\s\S]*markTutorialCompleted/);
  assert.doesNotMatch(trackerBody, /winner === 'draw'[\s\S]*markTutorialCompleted/);
});

test('tutorial completion does not increment battle counters', () => {
  const stats = markTutorialCompleted(createDefaultPlayerStats());

  assert.equal(stats.tutorialCompleted, true);
  for (const key of BATTLE_COUNTER_KEYS) {
    assert.equal(stats[key], 0, `${key} should stay at 0`);
  }

  const battleTrackerBody = extractMethodBody('trackCompletedBattleStatsOnce', 'scheduleBattleResultModal');
  assert.match(battleTrackerBody, /const mode = this\.isCampaignBattle\(\) \? 'campaign' : \(this\.isTutorialBattle\(\) \? null : 'arena'\);/);
  assert.match(battleTrackerBody, /if \(!mode \|\| !result\) return false;/);
});

test('duplicate result scheduling/recovery does not double-write or double-trigger tutorial completion', () => {
  const trackerBody = extractMethodBody('trackTutorialCompletionOnce', 'trackCompletedBattleStatsOnce');
  const scheduleBody = extractMethodBody('scheduleBattleResultModal', 'disableResultPendingOverlayInteractions');
  const ensureBody = extractMethodBody('ensureBattleResultModalVisible', 'completeBattleFlow');

  assert.match(trackerBody, /if \(this\.tutorialCompletionTracked \|\| !this\.isTutorialBattle\(\) \|\| this\.gameState\?\.winner !== 'player'\) return false;/);
  assert.match(trackerBody, /this\.tutorialCompletionTracked = true;[\s\S]*try \{/);
  assert.match(scheduleBody, /if \(!this\.gameState\?\.winner \|\| this\.battleResultModalShown \|\| this\.battleResultModalPending\) return;/);
  assert.doesNotMatch(ensureBody, /trackTutorialCompletionOnce/);
});

test('localStorage/playerStats failure does not crash result handling', () => {
  const trackerBody = extractMethodBody('trackTutorialCompletionOnce', 'trackCompletedBattleStatsOnce');

  assert.match(trackerBody, /try \{[\s\S]*markTutorialCompleted\(loadPlayerStats\(\)\);[\s\S]*savePlayerStats\(nextStats\);[\s\S]*\} catch \(error\) \{/);
  assert.match(trackerBody, /console\.warn\('Tutorial completion player stats tracking failed; battle flow will continue\.', error\);/);
});
