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
  assert.match(scene, /badgeWidth = 82/);
  assert.match(scene, /getAchievementCardTheme\(definition, unlocked\)/);
  assert.match(scene, /titleColor: unlocked \? '#fff7d6' : titleTint/);
  assert.match(scene, /descriptionColor: unlocked \? '#e2e8f0' : '#b8c2d0'/);
});


test('achievement cards render reusable difficulty stars with reserved right-aligned title-row space', () => {
  const scene = source();
  assert.match(scene, /getAchievementDifficultyStars\(definition\)/);
  assert.match(scene, /return '★'\.repeat\(difficulty\)/);
  assert.match(scene, /drawAchievementDifficultyStars\(content, definition, layout, theme\)/);
  assert.match(scene, /fixedWidth: layout\.starAreaWidth/);
  assert.match(scene, /\.setOrigin\(1, 0\)/);
  assert.match(scene, /const starAreaWidth = 76/);
  assert.match(scene, /normalizeAchievementDifficulty\(definition\?\.difficulty\)/);
  assert.match(scene, /titleWidth: Math\.max\(96, titleRight - textLeft - 10\)/);
  assert.match(scene, /starAreaX: titleRight/);
  assert.match(scene, /difficultyStarColor: unlocked \? '#facc15' : '#94a3b8'/);
});

test('achievement progress badges clamp completed progress for display only', () => {
  const scene = source();
  assert.match(scene, /const current = Number\.isFinite\(progress\.current\) \? progress\.current : 0/);
  assert.match(scene, /const target = Number\.isFinite\(progress\.target\) \? progress\.target : definition\.target \?\? 0/);
  assert.match(scene, /current: target > 0 \? Math\.min\(current, target\) : current, target/);
  assert.match(scene, /definition\.getProgress\?\.\(this\.achievementData\?\.playerStats \?\? \{\}\)/);

  const clampForDisplay = (current, target) => (target > 0 ? Math.min(current, target) : current);
  assert.equal(clampForDisplay(5, 1), 1);
  assert.equal(clampForDisplay(12, 10), 10);
  assert.equal(clampForDisplay(3, 5), 3);
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
  assert.match(scene, /: 0x7dd3fc/);
  assert.match(scene, /const titleTint = groupKey === 'arena' \? '#fde68a' : groupKey === 'factions' \? '#ede9fe' : '#e0f2fe'/);
  assert.match(scene, /textRight - textLeft/);
  assert.match(scene, /maxLines: 2/);
});

test('achievement card layout reserves fixed title, description, and progress badge zones', () => {
  const scene = source();
  assert.match(scene, /getAchievementCardLayout\(x, y, width\)/);
  assert.match(scene, /const cardHeight = 102/);
  assert.match(scene, /const titleTop = y \+ 11/);
  assert.match(scene, /const separatorY = y \+ 45/);
  assert.match(scene, /const descriptionTop = y \+ 52/);
  assert.match(scene, /badgeY: y \+ 68/);
  assert.match(scene, /getAchievementTitleFontSize\(title, layout\)/);
});

test('unlocked achievement rows use subtle gold accents without permanent unlocked badges', () => {
  const scene = source();
  assert.match(scene, /bg\.fillStyle\(unlocked \? 0xfacc15 : theme\.accent, theme\.topStripAlpha\)/);
  assert.match(scene, /bg\.lineStyle\(unlocked \? 2\.8 : 2\.1, theme\.frameColor, theme\.frameAlpha\)/);
  assert.match(scene, /bg\.lineStyle\(1\.2, unlocked \? 0xfacc15 : theme\.accent, unlocked \? 0\.78 : 0\.44\)/);
  assert.match(scene, /topStripAlpha: unlocked \? 0\.82 : 0\.18/);
  assert.match(scene, /glowAlpha: unlocked \? 0\.22 : 0\.08/);
  assert.match(scene, /frameColor: unlocked \? 0xfacc15 : accent/);
  assert.doesNotMatch(scene, /translateActive\('ui\.achievements\.unlocked'|ODBLOKOWANE|UNLOCKED|unlockedBadgeWidth|unlockedLabel/);
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
