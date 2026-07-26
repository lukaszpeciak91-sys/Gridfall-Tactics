import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  COMPLETED_CAMPAIGN_STAR_SIZE,
  COMPLETED_CAMPAIGN_SWEEP_DURATION_MS,
  COMPLETED_CAMPAIGN_SWEEP_IDLE_MS,
  createCompletedCampaignSweepController,
  getCompletedCampaignMarkerLayout,
} from '../src/ui/factionCards.js';

const sceneSource = fs.readFileSync('src/scenes/FactionSelectScene.js', 'utf8');
const cardsSource = fs.readFileSync('src/ui/factionCards.js', 'utf8');
const enemySource = fs.readFileSync('src/scenes/CampaignEnemySelectScene.js', 'utf8');
const statsSource = fs.readFileSync('src/systems/playerStats.js', 'utf8');

function loadCompletedFactionLookup() {
  const match = sceneSource.match(/export function getCompletedCampaignFactionKeys\(factionKeys, stats\) \{[\s\S]*?\n\}/);
  assert.ok(match);
  return Function(`${match[0].replace('export ', '')}; return getCompletedCampaignFactionKeys;`)();
}

function sweepHarness() {
  const graphics = {
    active: true, interactive: false, commands: [],
    clear() { this.commands.push(['clear']); return this; },
    lineStyle(...args) { this.commands.push(['lineStyle', ...args]); return this; },
    lineBetween(...args) { this.commands.push(['lineBetween', ...args]); return this; },
    destroy() { this.active = false; },
  };
  const timers = [];
  const tweens = [];
  const scene = {
    add: { graphics: () => graphics },
    time: { delayedCall(delay, callback) { const timer = { delay, callback, removed: false, remove() { this.removed = true; } }; timers.push(timer); return timer; } },
    tweens: { add(config) { const tween = { config, stopped: false, stop() { this.stopped = true; } }; tweens.push(tween); return tween; } },
  };
  const content = { children: [], add(item) { this.children.push(item); } };
  return { scene, content, graphics, timers, tweens };
}

test('only positive campaignsWon values qualify, independently for current faction keys', () => {
  const getCompletedCampaignFactionKeys = loadCompletedFactionLookup();
  const completed = getCompletedCampaignFactionKeys(['Aggro', 'Tank', 'Control'], { factions: {
    Aggro: { campaignsWon: 0 }, Tank: { campaignsWon: 1 }, Control: { campaignsWon: 4 }, Deprecated: { campaignsWon: 9 },
  } });
  assert.deepEqual([...completed], ['Tank', 'Control']);
  assert.equal(getCompletedCampaignFactionKeys(['Aggro'], { factions: { Aggro: { campaignsWon: '1' } } }).size, 0);
});

test('marker geometry is inside the upper-left and shares the permanent rounded border path', () => {
  const layout = getCompletedCampaignMarkerLayout({ x: -190, y: 0, cardWidth: 380, cardHeight: 196 });
  assert.deepEqual(layout.border, { x: -189, y: 1, width: 378, height: 194, radius: 19 });
  assert.deepEqual(layout.star, { x: -168, y: 22, size: COMPLETED_CAMPAIGN_STAR_SIZE });
  assert.ok(layout.star.x - COMPLETED_CAMPAIGN_STAR_SIZE / 2 > -190);
  assert.ok(layout.star.y - COMPLETED_CAMPAIGN_STAR_SIZE / 2 > 0);
  assert.ok(layout.star.y + COMPLETED_CAMPAIGN_STAR_SIZE / 2 < 100, 'star stays clear of the bottom title');
  assert.ok(layout.star.x + COMPLETED_CAMPAIGN_STAR_SIZE / 2 < 0, 'star stays clear of right-aligned tags');
});

test('one non-interactive sweep controller draws only a narrow border segment and cleans up timer/tween', () => {
  const harness = sweepHarness();
  const geometry = { x: -189, y: 1, width: 378, height: 194, radius: 19 };
  const controller = createCompletedCampaignSweepController(harness.scene, harness.content, geometry, 0xf97316);
  assert.equal(harness.content.children.length, 1);
  assert.equal(harness.timers.length, 1);
  assert.equal(controller.highlight.interactive, false);
  harness.timers[0].callback();
  assert.equal(harness.tweens.length, 1);
  assert.equal(harness.tweens[0].config.duration, COMPLETED_CAMPAIGN_SWEEP_DURATION_MS);
  harness.tweens[0].config.onUpdate();
  const segments = harness.graphics.commands.filter(([command]) => command === 'lineBetween');
  assert.equal(segments.length, 18);
  assert.ok(segments.every(([, x1, y1, x2, y2]) => [x1, x2].every((x) => x >= geometry.x && x <= geometry.x + geometry.width)
    && [y1, y2].every((y) => y >= geometry.y && y <= geometry.y + geometry.height)));
  harness.tweens[0].config.onComplete();
  assert.equal(harness.timers.at(-1).delay, COMPLETED_CAMPAIGN_SWEEP_IDLE_MS);
  controller.destroy();
  assert.equal(harness.timers.at(-1).removed, true);
  assert.equal(controller.highlight.active, false);
});

test('Campaign scene owns exactly one star/controller per qualifying card without changing input geometry', () => {
  assert.match(sceneSource, /this\.mode === 'campaign'[\s\S]*completedCampaignFactionKeys\.has\(factionKey\)/);
  assert.match(cardsSource, /completedCampaignPresentation\s*\? createCompletedCampaignCardPresentation/);
  assert.match(cardsSource, /drawNonUnitEffectStarIcon\(scene, layout\.star\.x, layout\.star\.y, layout\.star\.size\)/);
  assert.match(sceneSource, /completionSweepController: completedCampaign\?\.sweepController \?\? null/);
  assert.match(sceneSource, /\.zone\(0, cardHeight \/ 2, cardWidth, cardHeight\)/);
  const decorationSource = cardsSource.slice(cardsSource.indexOf('export function createCompletedCampaignSweepController'), cardsSource.indexOf('export function getFactionAssetSlug'));
  assert.doesNotMatch(decorationSource, /setInteractive|postFX|setBlendMode|fillRect/);
  assert.doesNotMatch(cardsSource, /strokeRoundedRect\([^\n]*completedCampaign/);
});

test('stats load once at Campaign creation; Arena and enemy scene create no completion decoration', () => {
  assert.match(sceneSource, /this\.completedCampaignFactionKeys = this\.mode === 'campaign'\s*\? getCompletedCampaignFactionKeys\(factionKeys, loadPlayerStats\(\)\)\s*:\s*new Set\(\)/);
  assert.doesNotMatch(enemySource, /completedCampaign|CampaignCardPresentation|SweepController/);
  assert.equal((statsSource.match(/PLAYER_STATS_STORAGE_KEY/g) ?? []).length >= 1, true);
  assert.doesNotMatch(cardsSource, /localStorage|savePlayerStats|storage/i);
});

test('sweep is decorative, readiness/navigation-independent, restart-safe, and explicitly cleaned up', () => {
  assert.doesNotMatch(cardsSource, /scene\.input\.enabled|disableInteractive|\.zone\(/);
  assert.doesNotMatch(cardsSource, /scene\.start|scene\.restart|emitSceneTransitionVisuallyReady/);
  assert.match(sceneSource, /completionSweepController\?\.destroy\?\.\(\)/);
  assert.match(sceneSource, /onFullscreenChanged\(\)[\s\S]*this\.scene\.restart\(\{ mode: this\.mode,/);
  assert.ok(COMPLETED_CAMPAIGN_SWEEP_IDLE_MS > COMPLETED_CAMPAIGN_SWEEP_DURATION_MS * 4);
});
