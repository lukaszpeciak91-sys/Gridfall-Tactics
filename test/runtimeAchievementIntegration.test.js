import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const battleSceneSource = await readFile(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
const factionSelectSource = await readFile(new URL('../src/scenes/FactionSelectScene.js', import.meta.url), 'utf8');
const achievementsSceneSource = await readFile(new URL('../src/scenes/AchievementsScene.js', import.meta.url), 'utf8');

function extract(source, methodName, nextMethodName) {
  const start = source.indexOf(`  ${methodName}(`);
  const end = source.indexOf(`  ${nextMethodName}(`, start + 1);
  assert.ok(start >= 0 && end > start, `${methodName} body should be present`);
  return source.slice(start, end);
}

test('completed Arena battle evaluates achievements after battle stats update', () => {
  const tracker = extract(battleSceneSource, 'trackCompletedBattleStatsOnce', 'scheduleBattleResultModal');
  const schedule = extract(battleSceneSource, 'scheduleBattleResultModal', 'disableResultPendingOverlayInteractions');

  assert.match(tracker, /const mode = this\.isCampaignBattle\(\) \? 'campaign' : \(this\.isTutorialBattle\(\) \? null : 'arena'\);/);
  assert.ok(tracker.indexOf('savePlayerStats(nextStats);') < tracker.indexOf('return true;'));
  assert.ok(schedule.indexOf('const battleStatsTracked = this.trackCompletedBattleStatsOnce();') < schedule.indexOf('evaluateAndPersistAchievementUnlocks();'));
});

test('Campaign battle result evaluation does not count campaign completion too early', () => {
  const battleTracker = extract(battleSceneSource, 'trackCompletedBattleStatsOnce', 'scheduleBattleResultModal');
  assert.match(battleTracker, /incrementBattleStat\(loadPlayerStats\(\), \{/);
  assert.doesNotMatch(battleTracker, /incrementCampaignCompletedStat/);
});

test('Campaign terminal win or loss evaluates after lifecycle stats update', () => {
  const lifecycle = extract(battleSceneSource, 'trackCompletedCampaignLifecycleStats', 'trackPlayerCardPlayedStat');
  assert.match(lifecycle, /previousCampaign\?\.status !== 'active'/);
  assert.match(lifecycle, /!\['won', 'lost'\]\.includes\(updatedCampaign\?\.status\)/);
  assert.ok(lifecycle.indexOf('savePlayerStats(nextStats);') < lifecycle.indexOf('evaluateAndPersistAchievementUnlocks();'));
});

test('campaign start evaluates after campaignsStarted update', () => {
  const start = extract(factionSelectSource, 'startCampaign', 'onScrollWheel');
  assert.ok(start.indexOf('savePlayerStats(incrementCampaignStarted(loadPlayerStats()));') < start.indexOf('evaluateAndPersistAchievementUnlocks();'));
});

test('Tutorial player win evaluates after tutorialCompleted is marked', () => {
  const tutorial = extract(battleSceneSource, 'trackTutorialCompletionOnce', 'trackCompletedBattleStatsOnce');
  const schedule = extract(battleSceneSource, 'scheduleBattleResultModal', 'disableResultPendingOverlayInteractions');
  assert.ok(tutorial.indexOf('savePlayerStats(nextStats);') < tutorial.indexOf('return true;'));
  assert.ok(schedule.indexOf('const tutorialStatsTracked = this.trackTutorialCompletionOnce();') < schedule.indexOf('evaluateAndPersistAchievementUnlocks();'));
});

test('card-play achievements are not evaluated after each card action', () => {
  const cardTracker = extract(battleSceneSource, 'trackPlayerCardPlayedStat', 'trackTutorialCompletionOnce');
  assert.match(cardTracker, /incrementCardPlayedStat/);
  assert.doesNotMatch(cardTracker, /evaluateAndPersistAchievementUnlocks/);
});

test('result modal scheduling and rendering do not depend on evaluation success', () => {
  const schedule = extract(battleSceneSource, 'scheduleBattleResultModal', 'disableResultPendingOverlayInteractions');
  const modal = extract(battleSceneSource, 'showBattleResultModal', 'createResultModalButton');
  assert.ok(schedule.indexOf('evaluateAndPersistAchievementUnlocks();') < schedule.indexOf('this.battleResultModalPending = true;'));
  assert.doesNotMatch(modal, /evaluateAndPersistAchievementUnlocks/);
});

test('AchievementsScene remains read-only', () => {
  assert.match(achievementsSceneSource, /loadAchievementState/);
  assert.doesNotMatch(achievementsSceneSource, /evaluateAchievements|evaluateAndPersistAchievementUnlocks|saveAchievementState/);
});
