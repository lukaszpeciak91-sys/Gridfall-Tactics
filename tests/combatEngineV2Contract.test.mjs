import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const canonicalPath = 'docs/architecture/combat-engine-v2.md';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

test('Combat Engine v2 canonical specification exists and covers required architecture boundaries', () => {
  const doc = read(canonicalPath);

  assert.match(doc, /^# Combat Engine v2 — Resolution and Trigger Specification/m);
  for (const section of [
    '## Purpose',
    '## Approved high-level model',
    '## Standard combat attack snapshot',
    '## Sniper',
    '## Aura and contextual effects',
    '## Death-wave architecture',
    '## Stable death and Fallen ordering',
    '## Trigger queue priority',
    '## Universal HP-death semantics',
    '## Intentional non-death removals and exclusions',
    '## Key card behavior',
    '## Immediate combat windows',
    '## System Override',
    '## Direct damage',
    '## Base lethal finalization',
    '## Presentation versus mechanics',
    '## Compatibility and legacy identifiers',
    '## Active versus dormant normalization',
    '## Future card implementation rules',
    '## Regression and verification map',
    '## Remaining intentional non-work',
    '## Reusable skill extraction notes',
  ]) {
    assert.match(doc, new RegExp(section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const phrase of [
    'One full-board attack snapshot',
    'Units killed during that same standard-combat window still execute their frozen planned attack',
    'maximum of 128 wave iterations',
    'Every lethal HP-based death entering death-wave cleanup uses the same valid death-trigger eligibility',
    'explicit destroy effects, return to hand, redeploy displacement, transform/replacement, or temporary Flood expiry/cleanup',
    'Base lethal is finalized after the complete combat/trigger window',
    'Presentation changes require a separate scoped PR and must not alter combat semantics',
    'No active runtime gap requires a PR',
  ]) {
    assert.match(doc, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('Combat Engine v2 documentation is linked from canonical docs and project decisions', () => {
  assert.match(read('docs/README.md'), /docs\/architecture\/combat-engine-v2\.md/);

  const decisions = read('docs/project/decisions.md');
  assert.match(decisions, /## Combat Engine v2 Completion \(2026-07-23\)/);
  assert.match(decisions, /COMBAT ENGINE V2 COMPLETE — NO RUNTIME PR NEEDED/);
  assert.match(decisions, /docs\/architecture\/combat-engine-v2\.md/);
});

test('legacy combat-death aliases map to canonical universal HP-death behavior', () => {
  const gameState = read('src/systems/GameState.js');

  for (const [setName, canonicalId, legacyId] of [
    ['DEATH_DAMAGE_ENEMY_LANE_EFFECT_IDS', 'death_damage_enemy_lane_1', 'combat_death_damage_enemy_lane_1'],
    ['DEATH_SUMMON_GRUNT_EFFECT_IDS', 'death_summon_grunt', 'combat_death_summon_grunt'],
    ['DEATH_DAMAGE_BOTH_HEROES_EFFECT_IDS', 'death_damage_both_heroes_1', 'combat_death_damage_both_heroes_1'],
  ]) {
    const setStart = gameState.indexOf(`const ${setName} = new Set([`);
    assert.notEqual(setStart, -1, `${setName} exists`);
    const setBody = gameState.slice(setStart, gameState.indexOf(']);', setStart));
    assert.match(setBody, new RegExp(`'${canonicalId}'`));
    assert.match(setBody, new RegExp(`'${legacyId}'`));
  }

  assert.match(gameState, /function removeDefeatedUnits\(state, boardIndexes\) \{\s*cleanupDefeatedUnitsWithTriggers\(state, boardIndexes\);\s*\}/s);
  assert.match(gameState, /const DEATH_WAVE_BOARD_ORDER = \[\.\.\.ENEMY_ROW, \.\.\.PLAYER_ROW\];/);
  assert.match(gameState, /const DEATH_WAVE_SAFETY_LIMIT = 128;/);
  assert.match(gameState, /function cleanupDefeatedUnitsWithTriggers\(state, boardIndexes = DEATH_WAVE_BOARD_ORDER, options = \{\}\) \{/);
});

test('active card copy avoids combat-only death wording', () => {
  const files = [
    'src/data/factions/attrition-swarm.json',
    'src/localization/translations/en.json',
    'src/localization/translations/pl.json',
  ];

  for (const file of files) {
    const content = read(file);
    assert.doesNotMatch(content, /Combat death|combat death|combat-only death|combat-only deaths|Śmierć w walce/u, file);
  }
});

test('representative Combat Engine v2 regression suites remain present', () => {
  for (const file of [
    'test/combatDeathWaves.test.js',
    'test/graveheartsWodzirejStosRework.test.js',
    'tests/gameState.combatEvents.test.mjs',
    'tests/universalHpDeathSemantics.test.mjs',
    'tests/gameState.fallenResurrection.test.mjs',
    'tests/effectVariantOnDeath.test.mjs',
    'tests/cardDataDocsValidation.test.mjs',
    'tests/simultaneousLethalRulesCopy.test.mjs',
    'tests/attritionSwarmFaction.test.mjs',
    'scripts/simulate-battles.mjs',
  ]) {
    assert.ok(fs.existsSync(file), `${file} should remain present`);
  }
});
