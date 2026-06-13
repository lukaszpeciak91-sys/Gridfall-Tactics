import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialBattleState, resolveCombat } from '../src/systems/GameState.js';

const faction = {
  id: 'test-faction',
  name: 'Test Faction',
  deck: [],
};

const unit = (owner, overrides = {}) => ({
  id: `${owner}_unit`,
  name: 'Test Unit',
  type: 'unit',
  attack: 1,
  hp: 1,
  maxHp: 1,
  armor: 0,
  effectId: 'test_on_death',
  owner,
  ...overrides,
});

const registryKey = (cardId, effectId = 'test_on_death') => `test-faction::${cardId}::${effectId}`;

function addVariant(state, cardId, operation, variantId = `${cardId}_variant`) {
  state.effectVariantRegistry ??= {};
  state.effectVariantRegistry[registryKey(cardId)] = {
    schemaVersion: 1,
    registryKey: registryKey(cardId),
    variantId,
    label: variantId,
    baseEffectId: 'test_on_death',
    timing: 'onDeath',
    sequence: [{ operation: 'runBaseEffect' }, operation],
  };
}

test('onDeath damageEnemyBase executes once for a combat death', () => {
  const state = createInitialBattleState(faction, faction, { firstActor: 'player' });
  state.board[6] = unit('player', { id: 'hollow_groom', attack: 1, hp: 1 });
  state.board[0] = unit('enemy', { id: 'enemy_blocker', effectId: null, attack: 1, hp: 2, maxHp: 2 });
  addVariant(state, 'hollow_groom', {
    operation: 'damageEnemyBase',
    selector: 'enemyBase',
    amount: 1,
  }, 'hollow_groom_on_death_enemy_base_1');

  resolveCombat(state);

  assert.equal(state.board[6], null);
  assert.equal(state.enemyHP, 11);
  assert.deepEqual(state.effectVariantDeathTriggerExecutions.hollow_groom_on_death_enemy_base_1, {
    variantId: 'hollow_groom_on_death_enemy_base_1',
    triggerType: 'onDeath',
    executions: 1,
    skippedExecutions: 0,
  });
  assert.equal(state.effectVariantOperationTelemetry.length, 1);
  assert.equal(state.effectVariantOperationTelemetry[0].triggerType, 'onDeath');
  assert.equal(state.effectVariantOperationTelemetry[0].damageDealt, 1);
});

test('onDeath summonToken resolves firstEmptyOwnerSlot after defeated unit leaves board', () => {
  const state = createInitialBattleState(faction, faction, { firstActor: 'player' });
  state.board[7] = unit('player', { id: 'coffin_bearer', attack: 1, hp: 1 });
  state.board[1] = unit('enemy', { id: 'enemy_blocker', effectId: null, attack: 1, hp: 2, maxHp: 2 });
  addVariant(state, 'coffin_bearer', {
    operation: 'summonToken',
    selector: 'firstEmptyOwnerSlot',
    token: 'grunt',
  }, 'coffin_bearer_on_death_grunt');

  resolveCombat(state);

  assert.equal(state.board[6]?.owner, 'player');
  assert.match(state.board[6]?.id, /effect_variant_grunt/);
  assert.equal(state.effectVariantOperationTelemetry[0].tokensSummoned, 1);
  assert.equal(state.effectVariantOperationTelemetry[0].triggerType, 'onDeath');
});

test('onDeath damageUnit can hit opposed unit without recursively triggering secondary onDeath variants', () => {
  const state = createInitialBattleState(faction, faction, { firstActor: 'player' });
  state.board[8] = unit('player', { id: 'death_explosion', attack: 1, hp: 1 });
  state.board[2] = unit('enemy', { id: 'recursive_enemy', attack: 1, hp: 2, maxHp: 2 });
  addVariant(state, 'death_explosion', {
    operation: 'damageUnit',
    selector: 'opposedOpponentUnit',
    amount: 1,
    cleanup: 'nonCombat',
  }, 'death_explosion_on_death_opposed_1');
  addVariant(state, 'recursive_enemy', {
    operation: 'damagePlayerBase',
    selector: 'playerBase',
    amount: 5,
  }, 'secondary_on_death_should_not_trigger');

  resolveCombat(state);

  assert.equal(state.board[8], null);
  assert.equal(state.board[2], null);
  assert.equal(state.playerHP, 12);
  assert.equal(state.effectVariantDeathTriggerExecutions.death_explosion_on_death_opposed_1.executions, 1);
  assert.equal(state.effectVariantDeathTriggerExecutions.secondary_on_death_should_not_trigger, undefined);
  assert.equal(state.effectVariantOperationTelemetry.length, 1);
  assert.equal(state.effectVariantOperationTelemetry[0].kills, 1);
});
