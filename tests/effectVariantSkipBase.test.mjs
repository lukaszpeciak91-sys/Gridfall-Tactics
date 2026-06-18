import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialBattleState, playEffectCard, resolveTargetedEffectCard, resolveCombat } from '../src/systems/GameState.js';
import { chooseBattleAction } from '../src/systems/enemyDecision.js';

const substrate = {
  id: 'swarm_recycle_1',
  name: 'Substrate',
  type: 'utility',
  targeting: 'friendly_unit',
  effectId: 'destroy_friendly_draw_1',
  textShort: 'Destroy [ALLY]. Draw 1',
};

const faction = {
  id: 'swarm',
  name: 'Swarm',
  deck: [substrate, { id: 'drawn_unit', name: 'Drawn Unit', type: 'unit', attack: 1, hp: 1, armor: 0 }],
};

const unit = (id, owner, overrides = {}) => ({
  id,
  name: id,
  type: 'unit',
  attack: 1,
  hp: 2,
  maxHp: 2,
  armor: 0,
  owner,
  ...overrides,
});

const registryKey = 'swarm::swarm_recycle_1::destroy_friendly_draw_1';

test('skipBaseEffect replacement does not destroy selected ally and still executes debuffArmor plus drawOne', () => {
  const state = createInitialBattleState(faction, faction, { firstActor: 'player' });
  state.player.hand = [{ ...substrate, targeting: 'none' }];
  state.player.deck = [{ id: 'drawn_unit', name: 'Drawn Unit', type: 'unit', attack: 1, hp: 1, armor: 0 }];
  state.board[6] = unit('friendly_target', 'player');
  state.board[0] = unit('enemy_a', 'enemy');
  state.board[1] = unit('enemy_b', 'enemy');
  state.effectVariantRegistry = {
    [registryKey]: {
      schemaVersion: 1,
      registryKey,
      variantId: 'example_skip_base_substrate_enemy_armor_draw',
      label: 'Substrate skips destroy for enemy ARM debuff draw',
      baseEffectId: 'destroy_friendly_draw_1',
      timing: 'afterBaseEffectBeforeDiscard',
      targeting: 'none',
      sequence: [
        { operation: 'skipBaseEffect' },
        { operation: 'debuffArmor', selector: 'allOpponentUnits', amount: 1, duration: 'untilCombatCleanup' },
        { operation: 'drawOne' },
      ],
    },
  };

  const result = playEffectCard(state, 'player', 'swarm_recycle_1');

  assert.equal(result.ok, true);
  assert.equal(state.board[6]?.id, 'friendly_target');
  assert.equal(state.player.fallen.length, 0);
  assert.equal(state.board[0]?.tempArmorMod, -1);
  assert.equal(state.board[1]?.tempArmorMod, -1);
  assert.equal(state.player.hand.length, 1);
  assert.equal(state.player.hand[0].id, 'drawn_unit');
  assert.equal(state.effectVariantOperationTelemetry.length, 2);
  assert.deepEqual(state.effectVariantOperationTelemetry.map((entry) => entry.baseEffectControl), ['skipBaseEffect', 'skipBaseEffect']);
  assert.equal(state.effectVariantOperationTelemetry[0].operation, 'debuffArmor');
  assert.equal(state.effectVariantOperationTelemetry[0].targetsResolved, 2);
  assert.equal(state.effectVariantOperationTelemetry[1].operation, 'drawOne');
  assert.equal(state.effectVariantOperationTelemetry[1].cardsDrawn, 1);
});


test('AI can score and play skipBaseEffect Substrate with targeting override none', () => {
  const state = createInitialBattleState(faction, faction, { firstActor: 'player' });
  state.player.hand = [{ ...substrate, targeting: 'none' }];
  state.player.deck = [{ id: 'drawn_unit', name: 'Drawn Unit', type: 'unit', attack: 1, hp: 1, armor: 0 }];
  state.board[6] = unit('friendly_target', 'player');
  state.board[0] = unit('enemy_a', 'enemy', { attack: 3, armor: 1 });
  state.board[1] = unit('enemy_b', 'enemy', { attack: 2, armor: 1 });
  state.effectVariantRegistry = {
    [registryKey]: {
      schemaVersion: 1,
      registryKey,
      variantId: 'example_skip_base_substrate_enemy_armor_draw',
      label: 'Substrate skips destroy for enemy ARM debuff draw',
      baseEffectId: 'destroy_friendly_draw_1',
      timing: 'afterBaseEffectBeforeDiscard',
      targeting: 'none',
      sequence: [
        { operation: 'skipBaseEffect' },
        { operation: 'debuffArmor', selector: 'allOpponentUnits', amount: 1, duration: 'untilCombatCleanup' },
        { operation: 'drawOne' },
      ],
    },
  };

  const action = chooseBattleAction(state, 'player', { aiSafeSurrenderEnabled: false });

  assert.deepEqual(action, {
    type: 'play-effect',
    cardId: 'swarm_recycle_1',
    effectId: 'destroy_friendly_draw_1',
  });

  const result = playEffectCard(state, 'player', action.cardId);

  assert.equal(result.ok, true);
  assert.equal(result.card.id, 'swarm_recycle_1');
  assert.equal(state.board[6]?.id, 'friendly_target');
  assert.equal(state.player.fallen.length, 0);
  assert.equal(state.board[0]?.tempArmorMod, -1);
  assert.equal(state.board[1]?.tempArmorMod, -1);
  assert.equal(state.player.hand.length, 1);
  assert.equal(state.player.hand[0].id, 'drawn_unit');
  assert.equal(state.effectVariantOperationTelemetry.length, 2);
  assert.equal(state.effectVariantOperationTelemetry[0].operation, 'debuffArmor');
  assert.equal(state.effectVariantOperationTelemetry[0].targetsResolved, 2);
  assert.equal(state.effectVariantOperationTelemetry[1].operation, 'drawOne');
  assert.equal(state.effectVariantOperationTelemetry[1].cardsDrawn, 1);
});

test('AI preserves targeting override enemy_unit selection for selectedOpponentUnit variant operations', () => {
  const state = createInitialBattleState(faction, faction, { firstActor: 'player' });
  state.player.hand = [{ ...substrate, targeting: 'enemy_unit' }];
  state.player.deck = [];
  state.board[6] = unit('friendly_target', 'player');
  state.board[0] = unit('enemy_target', 'enemy', { hp: 3, maxHp: 3, armor: 1 });
  state.effectVariantRegistry = {
    [registryKey]: {
      schemaVersion: 1,
      registryKey,
      variantId: 'substrate_melt_bite_enemy_unit',
      label: 'Substrate melt bite enemy target',
      baseEffectId: 'destroy_friendly_draw_1',
      timing: 'afterBaseEffectBeforeDiscard',
      targeting: 'enemy_unit',
      sequence: [
        { operation: 'skipBaseEffect' },
        { operation: 'debuffArmor', selector: 'selectedOpponentUnit', amount: 1, duration: 'untilCombatCleanup' },
        { operation: 'damageUnit', selector: 'selectedOpponentUnit', amount: 1, cleanup: 'nonCombat' },
      ],
    },
  };

  const action = chooseBattleAction(state, 'player', { aiSafeSurrenderEnabled: false });

  assert.equal(action.type, 'play-targeted-effect');
  assert.equal(action.cardId, 'swarm_recycle_1');
  assert.equal(action.effectId, 'destroy_friendly_draw_1');
  assert.deepEqual(action.targetIndexes, [0]);

  const result = resolveTargetedEffectCard(state, 'player', action.cardId, action.targetIndex, action.targetIndexes);

  assert.equal(result.ok, true);
  assert.equal(state.board[6]?.id, 'friendly_target');
  assert.equal(state.player.fallen.length, 0);
  assert.equal(state.board[0]?.id, 'enemy_target');
  assert.equal(state.board[0]?.tempArmorMod, -1);
  assert.equal(state.board[0]?.hp, 2);
  assert.equal(state.effectVariantOperationTelemetry.length, 2);
  assert.deepEqual(state.effectVariantOperationTelemetry.map((entry) => entry.operation), ['debuffArmor', 'damageUnit']);
  assert.deepEqual(state.effectVariantOperationTelemetry.map((entry) => entry.targetsResolved), [1, 1]);
  assert.deepEqual(state.effectVariantOperationTelemetry.map((entry) => entry.skippedTargets.length), [0, 0]);
  assert.equal(state.effectVariantOperationTelemetry[0].totalArmorReduced, 1);
  assert.equal(state.effectVariantOperationTelemetry[1].damageDealt, 1);
});

test('buffHp selectedOwnerUnit resolves with friendly_unit targeting override and adds temporary HP', () => {
  const state = createInitialBattleState(faction, faction, { firstActor: 'player' });
  state.player.hand = [{ ...substrate, targeting: 'friendly_unit' }];
  state.player.deck = [];
  state.board[6] = unit('friendly_target', 'player');
  state.effectVariantRegistry = {
    [registryKey]: {
      schemaVersion: 1, registryKey, variantId: 'substrate_biomass_shield_v1', label: 'shield', baseEffectId: 'destroy_friendly_draw_1', timing: 'afterBaseEffectBeforeDiscard', targeting: 'friendly_unit',
      sequence: [{ operation: 'skipBaseEffect' }, { operation: 'buffHp', selector: 'selectedOwnerUnit', amount: 2, duration: 'untilCombatCleanup' }],
    },
  };

  const result = resolveTargetedEffectCard(state, 'player', 'swarm_recycle_1', 6, [6]);

  assert.equal(result.ok, true);
  assert.equal(state.board[6]?.id, 'friendly_target');
  assert.equal(state.board[6]?.hp, 4);
  assert.equal(state.board[6]?.maxHp, 2);
  assert.equal(state.board[6]?.tempHpMod, 2);
  assert.equal(state.player.hand.length, 0);
  assert.equal(state.player.fallen.length, 0);
  assert.equal(state.effectVariantOperationTelemetry[0].operation, 'buffHp');
  assert.equal(state.effectVariantOperationTelemetry[0].targetsResolved, 1);
  assert.equal(state.effectVariantOperationTelemetry[0].totalHpAdded, 2);
});

test('buffHp temporary HP clears at combat cleanup and clamps only overheal', () => {
  const state = createInitialBattleState(faction, faction, { firstActor: 'player' });
  state.player.hand = [{ ...substrate, targeting: 'friendly_unit' }];
  state.board[6] = unit('friendly_target', 'player');
  state.effectVariantRegistry = {
    [registryKey]: { schemaVersion: 1, registryKey, variantId: 'substrate_biomass_shield_v1', label: 'shield', baseEffectId: 'destroy_friendly_draw_1', timing: 'afterBaseEffectBeforeDiscard', targeting: 'friendly_unit', sequence: [{ operation: 'skipBaseEffect' }, { operation: 'buffHp', selector: 'selectedOwnerUnit', amount: 2, duration: 'untilCombatCleanup' }] },
  };

  resolveTargetedEffectCard(state, 'player', 'swarm_recycle_1', 6, [6]);
  resolveCombat(state);

  assert.equal(state.board[6]?.hp, 2);
  assert.equal(state.board[6]?.tempHpMod, undefined);
});

test('buffHp damage before cleanup consumes survivability without healing or killing at cleanup', () => {
  const state = createInitialBattleState(faction, faction, { firstActor: 'player' });
  state.player.hand = [{ ...substrate, targeting: 'friendly_unit' }];
  state.board[6] = unit('friendly_target', 'player');
  state.board[0] = unit('enemy_attacker', 'enemy', { attack: 3, hp: 5, maxHp: 5 });
  state.effectVariantRegistry = {
    [registryKey]: { schemaVersion: 1, registryKey, variantId: 'substrate_biomass_shield_v1', label: 'shield', baseEffectId: 'destroy_friendly_draw_1', timing: 'afterBaseEffectBeforeDiscard', targeting: 'friendly_unit', sequence: [{ operation: 'skipBaseEffect' }, { operation: 'buffHp', selector: 'selectedOwnerUnit', amount: 2, duration: 'untilCombatCleanup' }] },
  };

  resolveTargetedEffectCard(state, 'player', 'swarm_recycle_1', 6, [6]);
  resolveCombat(state);

  assert.equal(state.board[6]?.id, 'friendly_target');
  assert.equal(state.board[6]?.hp, 1);
  assert.equal(state.board[6]?.tempHpMod, undefined);
});

test('AI plays buffHp friendly_unit variant when a friendly unit exists and safely skips without one', () => {
  const withAlly = createInitialBattleState(faction, faction, { firstActor: 'player' });
  withAlly.player.hand = [{ ...substrate, targeting: 'friendly_unit' }];
  withAlly.board[6] = unit('friendly_target', 'player');
  withAlly.board[0] = unit('enemy_attacker', 'enemy', { attack: 3 });
  withAlly.effectVariantRegistry = {
    [registryKey]: { schemaVersion: 1, registryKey, variantId: 'substrate_biomass_shield_v1', label: 'shield', baseEffectId: 'destroy_friendly_draw_1', timing: 'afterBaseEffectBeforeDiscard', targeting: 'friendly_unit', sequence: [{ operation: 'skipBaseEffect' }, { operation: 'buffHp', selector: 'selectedOwnerUnit', amount: 2, duration: 'untilCombatCleanup' }] },
  };

  const action = chooseBattleAction(withAlly, 'player', { aiSafeSurrenderEnabled: false });
  assert.equal(action.type, 'play-targeted-effect');
  assert.deepEqual(action.targetIndexes, [6]);

  const noAlly = createInitialBattleState(faction, faction, { firstActor: 'player' });
  noAlly.player.hand = [{ ...substrate, targeting: 'friendly_unit' }];
  noAlly.effectVariantRegistry = withAlly.effectVariantRegistry;
  const skippedAction = chooseBattleAction(noAlly, 'player', { aiSafeSurrenderEnabled: false });
  assert.notEqual(skippedAction.type, 'play-targeted-effect');
});
