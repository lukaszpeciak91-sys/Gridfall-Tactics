import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { ACHIEVEMENT_CATEGORY_GROUPS, getAchievementDefinitions } from '../src/systems/achievements.js';
import { createDefaultPlayerStats } from '../src/systems/playerStats.js';
import { getFactionKeys } from '../src/data/factions/index.js';

const source = () => readFileSync(new URL('../src/scenes/AchievementsScene.js', import.meta.url), 'utf8');

test('AchievementsScene replaces the placeholder with a scrollable read-only achievements panel', () => {
  const scene = source();
  assert.match(scene, /drawAchievementsPanel\(width, height\)/);
  assert.match(scene, /createGeometryMask\(\)/);
  assert.match(scene, /this\.input\.on\('wheel', this\.onScrollWheel, this\)/);
  assert.doesNotMatch(scene, /drawPlaceholderPanel|ui\.achievements\.comingSoon|Coming soon\./);
});

test('AchievementsScene reads definitions, persistent state, and player stats without saving or evaluating unlocks', () => {
  const scene = source();
  assert.match(scene, /getAchievementDefinitions\(\)/);
  assert.match(scene, /normalizeAchievementState\(loadAchievementState\(\)\)/);
  assert.match(scene, /normalizePlayerStats\(loadPlayerStats\(\)\)/);
  assert.doesNotMatch(scene, /saveAchievementState|evaluateAchievements|newlyUnlocked|savePlayerStats/);
});

test('achievement category mapping sends general, campaign, and cards to General; arena to Arena; faction to Factions', () => {
  assert.equal(ACHIEVEMENT_CATEGORY_GROUPS.general, 'general');
  assert.equal(ACHIEVEMENT_CATEGORY_GROUPS.campaign, 'general');
  assert.equal(ACHIEVEMENT_CATEGORY_GROUPS.cards, 'general');
  assert.equal(ACHIEVEMENT_CATEGORY_GROUPS.arena, 'arena');
  assert.equal(ACHIEVEMENT_CATEGORY_GROUPS.faction, 'factions');
});

test('AchievementsScene renders localized section labels and generates faction groups from runtime faction keys', () => {
  const scene = source();
  assert.match(scene, /ACHIEVEMENT_CATEGORY_LABELS\[key\]\?\.\[getActiveLocale\(\)\]/);
  assert.match(scene, /for \(const factionKey of getFactionKeys\(\)\)/);
  assert.match(scene, /getFactionPresentationName\(faction\?\.id, getActiveLocale\(\), faction\?\.name \?\? factionKey\)/);
  assert.match(scene, /FACTION_CARD_DETAILS\[factionKey\]\?\.accentColor/);
  assert.ok(getFactionKeys().length > 0);
});

test('unlocked achievements sort above locked achievements while preserving definition order within each group', () => {
  const scene = source();
  assert.match(scene, /Number\(right\.unlocked\) - Number\(left\.unlocked\) \|\| left\.index - right\.index/);
});

test('locked achievements still expose localized title, description, and text-only progress counters', () => {
  const scene = source();
  assert.match(scene, /definition\.display\?\.title\?\.\[locale\]/);
  assert.match(scene, /definition\.display\?\.description\?\.\[locale\]/);
  assert.match(scene, /`\$\{progress\.current\} \/ \$\{progress\.target\}`/);
  assert.match(scene, /unlocked \? '#f8fafc' : '#cbd5e1'/);
  assert.match(scene, /unlocked \? '#dbeafe' : '#94a3b8'/);
});

test('progress can be computed directly from definitions and default player stats without unlocking', () => {
  const stats = createDefaultPlayerStats();
  const first = getAchievementDefinitions()[0];
  const progress = first.getProgress(stats);
  assert.equal(progress.current, 0);
  assert.equal(progress.target, first.target);
});

test('AchievementsScene does not import BattleScene or runtime result modal code', () => {
  const scene = source();
  assert.doesNotMatch(scene, /BattleScene|showBattleResultModal|result modal|BattleMenuScene/);
});
