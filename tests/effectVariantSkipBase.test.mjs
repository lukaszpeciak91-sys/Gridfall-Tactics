import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialBattleState, playEffectCard } from '../src/systems/GameState.js';
import { chooseBattleAction } from '../src/systems/enemyDecision.js';

const substrate = {
  id: 'swarm_recycle_1',
  name: 'Substrate',
  type: 'utility',
  targeting: 'friendly_unit',
  effectId: 'destroy_friendly_draw_1',
  textShort: 'Destroy [ALLY]. Draw 1.',
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
