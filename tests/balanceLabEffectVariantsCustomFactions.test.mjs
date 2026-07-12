import test from 'node:test';
import assert from 'node:assert/strict';

import { loadFactions, buildEffectVariantRegistryForFactions } from '../scripts/simulate-battles.mjs';
import { createInitialBattleState, resolveTargetedEffectCard, resolveCombat, getUnitAttack } from '../src/systems/GameState.js';
import aggro from '../src/data/factions/aggro.json' with { type: 'json' };

const painEngine = {
  id: 'herd_candidate_pain_engine_1',
  name: 'Pain Engine',
  type: 'utility',
  targeting: 'enemy_unit',
  effectId: 'enemy_lane_atk_minus_1',
  textShort: 'Opposed [ENEMY]: -1 ATK until combat',
  cardNumber: 1,
};

function candidateFaction() {
  return {
    id: 'herd-candidate',
    name: 'Herd Candidate',
    frameImage: 'frame_default',
    deck: [
      painEngine,
      ...aggro.deck.slice(1).map((card, index) => ({
        ...structuredClone(card),
        id: `herd_candidate_filler_${index + 2}`,
        name: `Herd Candidate Filler ${index + 2}`,
        cardNumber: index + 2,
      })),
    ],
  };
}

function painVariant(overrides = {}) {
  return {
    schemaVersion: 1,
    variantId: 'herd_candidate_pain_engine_extra_minus1_v1',
    label: 'Pain Engine total -2 ATK to opposed enemy',
    scope: {
      factionId: 'herd-candidate',
      cardId: 'herd_candidate_pain_engine_1',
      baseEffectId: 'enemy_lane_atk_minus_1',
    },
    timing: 'afterBaseEffectBeforeDiscard',
    sequence: [
      { operation: 'runBaseEffect' },
      { operation: 'debuffAttack', selector: 'opposedOpponentUnit', amount: 1, duration: 'untilCombatCleanup' },
    ],
    textPatch: { textShort: 'Opposed [ENEMY]: -2 ATK until combat' },
    ai: { reuseBaseEffectTargeting: true, reuseBaseEffectHeuristic: true, scoreByResolverProbe: true },
    telemetryTags: ['herd-candidate', 'pain-engine', 'opposed-enemy', 'debuff-attack', 'minus-2'],
    ...overrides,
  };
}

function build(overrides = {}) {
  const experiment = { customFactions: [candidateFaction()], effectVariants: [painVariant(overrides)] };
  const loaded = loadFactions(null, experiment);
  const registry = buildEffectVariantRegistryForFactions(loaded.factions, null, experiment);
  return { ...loaded, registry };
}

function unit(id, owner, attack) {
  return { id, name: id, type: 'unit', owner, attack, hp: 3, maxHp: 3, armor: 0 };
}

function stateWithEnemyAttack(enemyAttack) {
  const { factions, registry } = build();
  const state = createInitialBattleState(factions['herd-candidate'], factions.aggro, { firstActor: 'player' });
  state.effectVariantRegistry = registry;
  state.player.hand = [structuredClone(painEngine)];
  state.board[6] = unit('owner_context', 'player', 1);
  state.board[0] = unit('opposed_enemy', 'enemy', enemyAttack);
  return state;
}

test('root-level effectVariants are parsed after custom faction installation and resolve Pain Engine scope', () => {
  const { factions, customFactions, registry } = build();
  const key = 'herd-candidate::herd_candidate_pain_engine_1::enemy_lane_atk_minus_1';
  assert.equal(customFactions.length, 1);
  assert.equal(factions['herd-candidate'].deck[0].id, 'herd_candidate_pain_engine_1');
  assert.equal(factions['herd-candidate'].deck[0].textShort, 'Opposed [ENEMY]: -2 ATK until combat');
  assert.equal(registry[key].variantId, 'herd_candidate_pain_engine_extra_minus1_v1');
  assert.equal(registry[key].factionId, 'herd-candidate');
  assert.equal(registry[key].cardId, 'herd_candidate_pain_engine_1');
  assert.equal(registry[key].baseEffectId, 'enemy_lane_atk_minus_1');
  assert.equal(registry[key].sequence[1].selector, 'opposedOpponentUnit');
  assert.equal(registry[key].sequence[1].amount, 1);
  assert.equal(registry[key].sequence[1].duration, 'untilCombatCleanup');
  assert.equal(registry[key].source, 'experiment.effectVariants');
  assert.deepEqual(registry[key].telemetryTags, ['herd-candidate', 'pain-engine', 'opposed-enemy', 'debuff-attack', 'minus-2']);
});

test('Pain Engine root variant applies base -1 plus extra -1, clamps effective ATK, and cleans up', () => {
  const state = stateWithEnemyAttack(3);
  const result = resolveTargetedEffectCard(state, 'player', 'herd_candidate_pain_engine_1', 0);
  assert.equal(result.ok, true);
  assert.equal(state.board[0].tempAttackMod, -2);
  assert.equal(getUnitAttack(state.board[0]), 1);
  assert.equal(state.effectVariantOperationTelemetry[0].status, 'stat_modifier_executed');
  assert.equal(state.effectVariantOperationTelemetry[0].totalAttackReduced, 1);
  resolveCombat(state);
  assert.equal(state.board[0]?.tempAttackMod, undefined);
});

test('Pain Engine root variant clamps 1 ATK and 0 ATK enemies at zero', () => {
  const oneAtk = stateWithEnemyAttack(1);
  assert.equal(resolveTargetedEffectCard(oneAtk, 'player', 'herd_candidate_pain_engine_1', 0).ok, true);
  assert.equal(getUnitAttack(oneAtk.board[0]), 0);

  const zeroAtk = stateWithEnemyAttack(0);
  assert.equal(resolveTargetedEffectCard(zeroAtk, 'player', 'herd_candidate_pain_engine_1', 0).ok, true);
  assert.equal(getUnitAttack(zeroAtk.board[0]), 0);
});

test('Pain Engine root variant safely records selected opposed enemy resolution telemetry', () => {
  const state = stateWithEnemyAttack(2);
  const result = resolveTargetedEffectCard(state, 'player', 'herd_candidate_pain_engine_1', 0);
  assert.equal(result.ok, true);
  assert.equal(state.effectVariantOperationTelemetry[0].targetsResolved, 1);
  assert.equal(state.effectVariantOperationTelemetry[0].targets[0].index, 0);
});

test('root effectVariant validation rejects invalid selector, amount, duration, and baseEffectId', () => {
  assert.throws(() => build({ sequence: [{ operation: 'runBaseEffect' }, { operation: 'debuffAttack', selector: 'bad', amount: 1, duration: 'untilCombatCleanup' }] }), /selector 'bad' is invalid/);
  assert.throws(() => build({ sequence: [{ operation: 'runBaseEffect' }, { operation: 'debuffAttack', selector: 'opposedOpponentUnit', amount: 0, duration: 'untilCombatCleanup' }] }), /amount must be a positive number/);
  assert.throws(() => build({ sequence: [{ operation: 'runBaseEffect' }, { operation: 'debuffAttack', selector: 'opposedOpponentUnit', amount: 1, duration: 'forever' }] }), /duration 'forever' is unsupported/);
  assert.throws(() => build({ scope: { factionId: 'herd-candidate', cardId: 'herd_candidate_pain_engine_1', baseEffectId: 'wrong' } }), /does not match card effectId/);
});

test('generated effect variant registry module can be imported and Pain Engine runtime emits telemetry', async () => {
  const { mkdtempSync, writeFileSync, mkdirSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const tmp = mkdtempSync(join(tmpdir(), 'gridfall-registry-'));
  const systemsDir = join(tmp, 'src', 'systems');
  mkdirSync(systemsDir, { recursive: true });
  const key = 'herd-candidate::herd_candidate_pain_engine_1::enemy_lane_atk_minus_1';
  writeFileSync(join(systemsDir, 'effectVariantRegistry.generated.js'), `export const EFFECT_VARIANT_REGISTRY_SCHEMA_VERSION = 1;\nexport const ACTIVE_EFFECT_VARIANTS = Object.freeze(${JSON.stringify({ [key]: build().registry[key] })});\n`);
  const imported = await import(`file://${join(systemsDir, 'effectVariantRegistry.generated.js')}`);
  assert.equal(imported.ACTIVE_EFFECT_VARIANTS[key].variantId, 'herd_candidate_pain_engine_extra_minus1_v1');

  const state = stateWithEnemyAttack(3);
  const result = resolveTargetedEffectCard(state, 'player', 'herd_candidate_pain_engine_1', 0);
  assert.equal(result.ok, true);
  const row = state.effectVariantOperationTelemetry[0];
  assert.equal(row.baseEffectControl, 'runBaseEffect');
  assert.equal(row.operation, 'debuffAttack');
  assert.equal(row.selector, 'opposedOpponentUnit');
  assert.equal(row.amount, 1);
  assert.equal(row.status, 'stat_modifier_executed');
  assert.equal(row.totalAttackReduced, 1);
  assert.equal(state.board[0].tempAttackMod, -2);
});
