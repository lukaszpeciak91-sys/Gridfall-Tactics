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

test('achievement cards expose localized title, description, and text-only progress badges', () => {
  const scene = source();
  assert.match(scene, /drawAchievementCard\(content, definition/);
  assert.match(scene, /definition\.display\?\.title\?\.\[locale\]/);
  assert.match(scene, /definition\.display\?\.description\?\.\[locale\]/);
  assert.match(scene, /`\$\{progress\.current\} \/ \$\{progress\.target\}`/);
  assert.match(scene, /progressBadgeWidth = 74/);
  assert.match(scene, /getAchievementCardTheme\(definition, unlocked\)/);
  assert.match(scene, /titleColor: unlocked \? '#fff7ed' : '#dbeafe'/);
  assert.match(scene, /descriptionColor: unlocked \? '#fde68a' : '#aeb8c7'/);
});

test('top-level achievement section labels are centered without visible plus or minus prefixes', () => {
  const scene = source();
  assert.match(scene, /this\.add\.text\(x \+ width \/ 2, y \+ height \/ 2, section\.title/);
  assert.match(scene, /align: 'center'/);
  assert.match(scene, /\.setOrigin\(0\.5, 0\.5\)/);
  assert.doesNotMatch(scene, /`\$\{expanded \? '−' : '\+'\} \$\{section\.title\}`/);
});


test('nested faction headers are centered without visible plus or minus prefixes', () => {
  const scene = source();
  assert.match(scene, /this\.add\.text\(x \+ width \/ 2, y \+ height \/ 2, name/);
  assert.match(scene, /align: 'center'/);
  assert.match(scene, /\.setOrigin\(0\.5, 0\.5\)/);
  assert.doesNotMatch(scene, /`\$\{expanded \? '−' : '\+'\} \$\{name\}`/);
  assert.doesNotMatch(scene, /`\$\{expanded \? '−' : '\+'\} \$\{section\.title\}`/);
});

test('achievement card theme uses group and faction accent colors for reusable card drawing', () => {
  const scene = source();
  assert.match(scene, /getAchievementCardTheme\(definition, unlocked\)/);
  assert.match(scene, /groupKey === 'arena' \? 0xfacc15/);
  assert.match(scene, /groupKey === 'factions' \? FACTION_CARD_DETAILS\[definition\.factionKey\]\?\.accentColor/);
  assert.match(scene, /: 0x38bdf8/);
  assert.match(scene, /rightColumnX - textLeft - 14/);
  assert.match(scene, /maxLines: 2/);
  assert.match(scene, /maxLines: 3/);
});

test('unlocked achievement badge uses localized fallbacks without showing unlock dates', () => {
  const scene = source();
  assert.match(scene, /translateActive\('ui\.achievements\.unlocked', locale === 'pl' \? 'ODBLOKOWANE' : 'UNLOCKED'\)/);
  assert.match(scene, /unlockedBadgeWidth/);
  assert.match(scene, /0xfacc15/);
  assert.doesNotMatch(scene, /unlockedAt|unlock date/i);
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
