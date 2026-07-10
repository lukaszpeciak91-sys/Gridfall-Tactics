import test from 'node:test';
import assert from 'node:assert/strict';

import { loadFactions, buildEffectVariantRegistryForFactions } from '../scripts/simulate-battles.mjs';
import { createInitialBattleState, resolveTargetedEffectCard, resolveCombat, getUnitAttack } from '../src/systems/GameState.js';
import aggro from '../src/data/factions/aggro.json' with { type: 'json' };

const painEngine = {
  id: 'overclock_pain_engine_1',
  name: 'Pain Engine',
  type: 'utility',
  targeting: 'enemy_unit',
  effectId: 'enemy_lane_atk_minus_1',
  textShort: 'Opposed [ENEMY]: -1 ATK until combat',
  cardNumber: 1,
};

function overclockFaction() {
  return {
    id: 'overclock',
    name: 'Overclock',
    frameImage: 'frame_default',
    deck: [
      painEngine,
      ...aggro.deck.slice(1).map((card, index) => ({
        ...structuredClone(card),
        id: `overclock_filler_${index + 2}`,
        name: `Overclock Filler ${index + 2}`,
        cardNumber: index + 2,
      })),
    ],
  };
}

function painVariant(overrides = {}) {
  return {
    schemaVersion: 1,
    variantId: 'overclock_pain_engine_extra_minus1_v1',
    label: 'Pain Engine total -2 ATK to opposed enemy',
    scope: {
      factionId: 'overclock',
      cardId: 'overclock_pain_engine_1',
      baseEffectId: 'enemy_lane_atk_minus_1',
    },
    timing: 'afterBaseEffectBeforeDiscard',
    sequence: [
      { operation: 'runBaseEffect' },
      { operation: 'debuffAttack', selector: 'opposedOpponentUnit', amount: 1, duration: 'untilCombatCleanup' },
    ],
    textPatch: { textShort: 'Opposed [ENEMY]: -2 ATK until combat' },
    ai: { reuseBaseEffectTargeting: true, reuseBaseEffectHeuristic: true, scoreByResolverProbe: true },
    telemetryTags: ['overclock', 'pain-engine', 'opposed-enemy', 'debuff-attack', 'minus-2'],
    ...overrides,
  };
}

function build(overrides = {}) {
  const experiment = { customFactions: [overclockFaction()], effectVariants: [painVariant(overrides)] };
  const loaded = loadFactions(null, experiment);
  const registry = buildEffectVariantRegistryForFactions(loaded.factions, null, experiment);
  return { ...loaded, registry };
}

function unit(id, owner, attack) {
  return { id, name: id, type: 'unit', owner, attack, hp: 3, maxHp: 3, armor: 0 };
}

function stateWithEnemyAttack(enemyAttack) {
  const { factions, registry } = build();
  const state = createInitialBattleState(factions.overclock, factions.aggro, { firstActor: 'player' });
  state.effectVariantRegistry = registry;
  state.player.hand = [structuredClone(painEngine)];
  state.board[6] = unit('owner_context', 'player', 1);
  state.board[0] = unit('opposed_enemy', 'enemy', enemyAttack);
  return state;
}

test('root-level effectVariants are parsed after custom faction installation and resolve Pain Engine scope', () => {
  const { factions, customFactions, registry } = build();
  const key = 'overclock::overclock_pain_engine_1::enemy_lane_atk_minus_1';
  assert.equal(customFactions.length, 1);
  assert.equal(factions.overclock.deck[0].id, 'overclock_pain_engine_1');
  assert.equal(factions.overclock.deck[0].textShort, 'Opposed [ENEMY]: -2 ATK until combat');
  assert.equal(registry[key].variantId, 'overclock_pain_engine_extra_minus1_v1');
  assert.equal(registry[key].factionId, 'overclock');
  assert.equal(registry[key].cardId, 'overclock_pain_engine_1');
  assert.equal(registry[key].baseEffectId, 'enemy_lane_atk_minus_1');
  assert.equal(registry[key].sequence[1].selector, 'opposedOpponentUnit');
  assert.equal(registry[key].sequence[1].amount, 1);
  assert.equal(registry[key].sequence[1].duration, 'untilCombatCleanup');
  assert.equal(registry[key].source, 'experiment.effectVariants');
  assert.deepEqual(registry[key].telemetryTags, ['overclock', 'pain-engine', 'opposed-enemy', 'debuff-attack', 'minus-2']);
});

test('Pain Engine root variant applies base -1 plus extra -1, clamps effective ATK, and cleans up', () => {
  const state = stateWithEnemyAttack(3);
  const result = resolveTargetedEffectCard(state, 'player', 'overclock_pain_engine_1', 0);
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
  assert.equal(resolveTargetedEffectCard(oneAtk, 'player', 'overclock_pain_engine_1', 0).ok, true);
  assert.equal(getUnitAttack(oneAtk.board[0]), 0);

  const zeroAtk = stateWithEnemyAttack(0);
  assert.equal(resolveTargetedEffectCard(zeroAtk, 'player', 'overclock_pain_engine_1', 0).ok, true);
  assert.equal(getUnitAttack(zeroAtk.board[0]), 0);
});

test('Pain Engine root variant safely records selected opposed enemy resolution telemetry', () => {
  const state = stateWithEnemyAttack(2);
  const result = resolveTargetedEffectCard(state, 'player', 'overclock_pain_engine_1', 0);
  assert.equal(result.ok, true);
  assert.equal(state.effectVariantOperationTelemetry[0].targetsResolved, 1);
  assert.equal(state.effectVariantOperationTelemetry[0].targets[0].index, 0);
});

test('root effectVariant validation rejects invalid selector, amount, duration, and baseEffectId', () => {
  assert.throws(() => build({ sequence: [{ operation: 'runBaseEffect' }, { operation: 'debuffAttack', selector: 'bad', amount: 1, duration: 'untilCombatCleanup' }] }), /selector 'bad' is invalid/);
  assert.throws(() => build({ sequence: [{ operation: 'runBaseEffect' }, { operation: 'debuffAttack', selector: 'opposedOpponentUnit', amount: 0, duration: 'untilCombatCleanup' }] }), /amount must be a positive number/);
  assert.throws(() => build({ sequence: [{ operation: 'runBaseEffect' }, { operation: 'debuffAttack', selector: 'opposedOpponentUnit', amount: 1, duration: 'forever' }] }), /duration 'forever' is unsupported/);
  assert.throws(() => build({ scope: { factionId: 'overclock', cardId: 'overclock_pain_engine_1', baseEffectId: 'wrong' } }), /does not match card effectId/);
});
