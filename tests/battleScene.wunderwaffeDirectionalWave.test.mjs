import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

function methodBlock(name, nextName) {
  const start = source.indexOf(`\n  ${name}(`) >= 0 ? source.indexOf(`\n  ${name}(`) : source.indexOf(`\n  async ${name}(`);
  const normalEnd = source.indexOf(`\n  ${nextName}(`, start + 1);
  const asyncEnd = source.indexOf(`\n  async ${nextName}(`, start + 1);
  const end = Math.min(...[normalEnd, asyncEnd].filter((index) => index >= 0));
  assert.ok(start >= 0, `${name} exists`);
  assert.ok(Number.isFinite(end), `${nextName} follows ${name}`);
  return source.slice(start, end);
}

const buildDelta = methodBlock('buildEffectDeltaFeedback', 'getProtectionArmedFeedbackLabel');
const wave = methodBlock('playWunderwaffeDirectionalWave', 'playPreRefreshActionFeedback');
const createArc = methodBlock('createWunderwaffeRadioArc', 'tweenWunderwaffeArc');
const tweenArc = methodBlock('tweenWunderwaffeArc', 'playWunderwaffeDirectionalWave');
const preRefresh = methodBlock('playPreRefreshActionFeedback', 'playActionFeedback');
const cleanup = methodBlock('cleanupSceneObjects', 'emitBattleVisuallyReady');

test('Wunderwaffe uses directional semi-circular waves mirrored by caster side', () => {
  assert.match(createArc, /arc\.arc\(origin\.x, origin\.y, radius, owner === 'enemy' \? 0 : Math\.PI, owner === 'enemy' \? Math\.PI : Math\.PI \* 2, false\)/);
  assert.match(createArc, /wunderwaffeWaveDirection', owner === 'enemy' \? 'down' : 'up'/);
  assert.match(createArc, /semi-circular-radio-arc/);
  assert.match(tweenArc, /const direction = owner === 'enemy' \? 1 : -1/);
});

test('Wunderwaffe feedback uses one card identity event and occupied affected enemy slots only', () => {
  assert.match(buildDelta, /type: 'wunderwaffe-wave'[\s\S]*label: result\?\.card\?\.name \?\? ''/);
  assert.match(buildDelta, /filter\(\(\{ before \}\) => before\?\.owner && before\.owner !== owner\)/);
  assert.doesNotMatch(buildDelta, /PULSE/);
});

test('Wunderwaffe per-target feedback communicates damage and armor ignore with short stagger', () => {
  assert.match(source, /case 'damage_all_enemies_1_ignore_armor':[\s\S]*return `\$\{baseLabel\}\\nIGNORE ARM`;/);
  assert.match(buildDelta, /kind: effectId === 'ignore_armor_next_attack' \|\| effectId === 'damage_all_enemies_1_ignore_armor' \? 'pierce' : 'damage'/);
  assert.match(buildDelta, /staggerMs: effectId === 'damage_all_enemies_1_ignore_armor' \? 18 : 0/);
});

test('Wunderwaffe remains in pre-refresh feedback so killed units stay readable before redraw', () => {
  assert.match(buildDelta, /type: 'wunderwaffe-wave'[\s\S]*phase: 'pre'/);
  assert.match(buildDelta, /type: 'slot-text'[\s\S]*phase: 'pre'/);
  assert.ok(preRefresh.indexOf('await this.playVisualFeedbackEvents([event]);') >= 0);
});

test('Wunderwaffe presentation is fail-safe and transient-owned', () => {
  assert.match(wave, /try \{/);
  assert.match(wave, /catch \(error\)[\s\S]*logWunderwaffeWavePresentationError\(error\)/);
  assert.match(wave, /finally[\s\S]*cleanupWunderwaffeWaveTransients\(\)/);
  assert.match(tweenArc, /onComplete: finish/);
  assert.match(tweenArc, /onStop: finish/);
  assert.match(cleanup, /cleanupWunderwaffeWaveTransients\(\)/);
});

test('Wunderwaffe presentation does not mutate gameplay or remove cards inside callbacks', () => {
  assert.doesNotMatch(wave, /playEffectCard|resolveTargetedEffectCard|resolveCombat|gameState\.board|hand\.splice|damage|hp\s*[-+]?=/);
  assert.doesNotMatch(tweenArc, /playEffectCard|resolveTargetedEffectCard|resolveCombat|gameState\.board|hand\.splice|damage|hp\s*[-+]?=/);
});

test('other direct global damage labels remain unchanged', () => {
  assert.match(source, /case 'infect_damage_1_opposite_ally_atk_1':[\s\S]*return `\$\{baseLabel\}\\nINFECT`;/);
  assert.match(source, /case 'on_play_lane_damage_1':[\s\S]*return `\$\{baseLabel\}\\nSPIT`;/);
});
