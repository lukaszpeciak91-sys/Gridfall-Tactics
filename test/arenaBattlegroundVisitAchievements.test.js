import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { getEnabledArenaBattlegroundIds } from '../src/data/arenaBattlegrounds.js';
import { evaluateAchievements } from '../src/systems/achievements.js';
import { createDefaultPlayerStats, normalizePlayerStats, recordArenaBattlegroundVisit } from '../src/systems/playerStats.js';

const battleSceneSource = await readFile(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

function unlockedIds(stats, state = { version: 1, unlocked: {} }, options = {}) {
  return evaluateAchievements(stats, state, { now: '2026-07-16T00:00:00.000Z', ...options }).newlyUnlocked.map((entry) => entry.id);
}

function visit(stats, id) {
  return recordArenaBattlegroundVisit(stats, id).stats;
}

test('first and later new Arena battles on default drive revisit achievement correctly', () => {
  let stats = createDefaultPlayerStats();
  stats = visit(stats, 'default');
  assert.equal(stats.arenaBattlegroundVisits.default, 1);
  assert.equal(stats.arenaBattlegroundRevisitCount, 0);
  assert.ok(!unlockedIds(stats).includes('arena.revisit_battleground'));

  stats = visit(stats, 'default');
  assert.equal(stats.arenaBattlegroundVisits.default, 2);
  assert.equal(stats.arenaBattlegroundRevisitCount, 1);
  assert.ok(unlockedIds(stats).includes('arena.revisit_battleground'));
});

test('first visits to different battlegrounds do not revisit until a later repeated id', () => {
  let stats = visit(visit(createDefaultPlayerStats(), 'default'), 'b01');
  assert.equal(stats.arenaBattlegroundRevisitCount, 0);
  assert.ok(!unlockedIds(stats).includes('arena.revisit_battleground'));

  stats = visit(stats, 'b01');
  assert.equal(stats.arenaBattlegroundRevisitCount, 1);
  assert.ok(unlockedIds(stats).includes('arena.revisit_battleground'));
});

test('visit-all derives current enabled Arena pool dynamically and includes default', () => {
  const pool = [
    { id: 'default', key: 'background.default', path: '/default.webp' },
    { id: 'b01', key: 'background.arena.b01', path: '/b01.webp' },
    { id: 'b02', key: 'background.arena.b02', path: '/b02.webp', enabled: false },
    { id: 'broken' },
  ];
  assert.deepEqual(getEnabledArenaBattlegroundIds({ pool }), ['default', 'b01']);

  let stats = visit(createDefaultPlayerStats(), 'b01');
  assert.ok(!unlockedIds(stats, { version: 1, unlocked: {} }, { pool }).includes('arena.visit_all_battlegrounds'));

  stats = visit(stats, 'default');
  assert.ok(unlockedIds(stats, { version: 1, unlocked: {} }, { pool }).includes('arena.visit_all_battlegrounds'));
});

test('empty or invalid Arena pool cannot complete visit-all progress', () => {
  const stats = visit(createDefaultPlayerStats(), 'default');
  const result = evaluateAchievements(stats, { version: 1, unlocked: {} });
  const definition = result.progress['arena.visit_all_battlegrounds'];
  assert.ok(definition.target > 0);
  assert.deepEqual(getEnabledArenaBattlegroundIds({ pool: [] }), []);
  assert.deepEqual(getEnabledArenaBattlegroundIds({ pool: [{ id: 'broken' }] }), []);
});

test('achievement unlocks only once and malformed or old save stats are safe', () => {
  const stats = visit(visit(createDefaultPlayerStats(), 'default'), 'default');
  const first = evaluateAchievements(stats, { version: 1, unlocked: {} }, { now: 1 });
  const second = evaluateAchievements(stats, first.achievementState, { now: 2 });
  assert.equal(first.newlyUnlocked.filter((entry) => entry.id === 'arena.revisit_battleground').length, 1);
  assert.equal(second.newlyUnlocked.filter((entry) => entry.id === 'arena.revisit_battleground').length, 0);

  assert.deepEqual(normalizePlayerStats({}).arenaBattlegroundVisits, {});
  assert.deepEqual(normalizePlayerStats({ arenaBattlegroundVisits: 'bad' }).arenaBattlegroundVisits, {});
  assert.deepEqual(normalizePlayerStats({ arenaBattlegroundVisits: { default: 1, b99: -4, b01: 'bad' } }).arenaBattlegroundVisits, { default: 1 });
});

test('future configured battleground ids are supported through configuration helpers', () => {
  const pool = [
    { id: 'default', key: 'background.default', path: '/default.webp' },
    { id: 'b10', key: 'background.arena.b10', path: '/b10.webp' },
  ];
  assert.deepEqual(getEnabledArenaBattlegroundIds({ pool }), ['default', 'b10']);
});

test('BattleScene records visits only at new Arena battle create boundary and retry/lifecycle keep guard', () => {
  assert.match(battleSceneSource, /trackArenaBattlegroundVisitOnce\(\);/);
  assert.match(battleSceneSource, /this\.battleContext\?\.mode !== 'arena'/);
  assert.match(battleSceneSource, /arenaBattlegroundVisitRecorded === true/);
  assert.match(battleSceneSource, /recordArenaBattlegroundVisit\(loadPlayerStats\(\), this\.battleContext\.battlegroundId\)/);
  assert.match(battleSceneSource, /const battleContext = this\.battleContext;[\s\S]*restartBattleScene\(this, \{ factionKey, enemyFactionKey, battleContext \}\)/);
  assert.match(battleSceneSource, /resumeFromSettings\(\)[\s\S]*recoverFromLifecycle\('settings-return'\)/);
  assert.match(battleSceneSource, /resumeFromRulesPanel\(\)[\s\S]*recoverFromLifecycle\('rules-panel-return'\)/);
  assert.match(battleSceneSource, /resumeFromBattleMenu\(\)[\s\S]*recoverFromLifecycle\('battle-menu-return'\)/);
  assert.doesNotMatch(battleSceneSource, /default \+ b01|b01–b09|b01-b09/);
});
