import test from 'node:test';
import assert from 'node:assert/strict';

import { buildStandardCombatAttackPlan, createInitialBattleState, getEffectiveBoardAttack, resolveCombat } from '../src/systems/GameState.js';

const makeState = () => createInitialBattleState({ name: 'Snapshot Test', deck: [] });
const unit = (owner, overrides = {}) => ({
  id: `${owner}-${Math.random()}`,
  name: 'Unit',
  type: 'unit',
  attack: 1,
  hp: 2,
  maxHp: 2,
  armor: 0,
  effectId: null,
  owner,
  ...overrides,
});
const attacksBy = (events, index) => events.filter((event) => event.attackerIndex === index);

test('standard combat snapshot gives all start-of-window units their attacks across all lanes', () => {
  const state = makeState();
  state.board[6] = unit('player', { id: 'killer', attack: 2, hp: 2, maxHp: 2 });
  state.board[0] = unit('enemy', { id: 'blocker', attack: 0, hp: 1, maxHp: 1 });
  state.board[1] = unit('enemy', { id: 'future-a', attack: 1, hp: 1, maxHp: 1 });
  state.board[2] = unit('enemy', { id: 'future-b', attack: 1, hp: 1, maxHp: 1 });

  const events = resolveCombat(state);

  assert.equal(attacksBy(events, 1).length, 1);
  assert.equal(attacksBy(events, 2).length, 1);
});

test('Alpha aura is frozen for later-lane recipient when provider dies during combat', () => {
  const state = makeState();
  state.board[6] = unit('player', { id: 'alpha', attack: 0, hp: 1, maxHp: 1, effectId: 'adjacent_allies_atk_plus_1_ignore_armor_1' });
  state.board[7] = unit('player', { id: 'recipient', attack: 1, hp: 3, maxHp: 3 });
  state.board[0] = unit('enemy', { id: 'alpha-killer', attack: 1, hp: 2, maxHp: 2 });

  const events = resolveCombat(state);
  const recipientAttack = events.find((event) => event.attackerIndex === 7);

  assert.equal(recipientAttack.damage, 2);
  assert.equal(state.board[6], null);
  assert.equal(getEffectiveBoardAttack(state, 7), 1);
});

test('Rotcaller frozen attack is not increased by adjacent death until future combat', () => {
  const state = makeState();
  state.board[6] = unit('player', { id: 'ally', attack: 0, hp: 1, maxHp: 1 });
  state.board[7] = unit('player', { id: 'rotcaller', attack: 2, hp: 3, maxHp: 3, effectId: 'rotcaller_adjacent_death_atk_1' });
  state.board[0] = unit('enemy', { id: 'killer', attack: 1, hp: 3, maxHp: 3 });

  const events = resolveCombat(state);
  const rotcallerAttack = events.find((event) => event.attackerIndex === 7);

  assert.equal(rotcallerAttack.damage, 2);
  assert.equal(state.board[7].attack, 3);
});

test('Kwoka contextual attack freezes combat-start ally count', () => {
  const state = makeState();
  state.board[6] = unit('player', { id: 'ally', attack: 0, hp: 1, maxHp: 1 });
  state.board[7] = unit('player', { id: 'kwoka', attack: 1, hp: 3, maxHp: 3, effectId: 'atk_plus_per_other_ally' });
  state.board[0] = unit('enemy', { id: 'killer', attack: 1, hp: 3, maxHp: 3 });

  const kwokaAttack = resolveCombat(state).find((event) => event.attackerIndex === 7);

  assert.equal(kwokaAttack.damage, 2);
});

test('combat-death summon before a future lane does not create a current-window attacker', () => {
  const state = makeState();
  state.board[6] = unit('player', { id: 'sniper', attack: 2, hp: 2, maxHp: 2, effectId: 'can_hit_any_lane' });
  state.board[2] = unit('enemy', { id: 'carrier', attack: 0, hp: 1, maxHp: 1, effectId: 'combat_death_summon_grunt' });

  const events = resolveCombat(state);

  assert.equal(state.board[2]?.id, 'enemy_combat_death_grunt_2_0');
  assert.equal(events.some((event) => event.attackerIndex === 2), true, 'original Carrier attack is preserved');
  assert.equal(events.some((event) => event.attackerIndex === 2 && event.damage === 1), false, 'summoned Grunt does not add an attack');
});

test('open-lane and unit-target choices do not retarget after earlier mutations', () => {
  const state = makeState();
  state.board[6] = unit('player', { id: 'sniper', attack: 2, hp: 2, maxHp: 2, effectId: 'can_hit_any_lane' });
  state.board[7] = unit('player', { id: 'open-lane-attacker', attack: 2, hp: 2, maxHp: 2 });
  state.board[1] = null;
  state.board[2] = unit('enemy', { id: 'target', attack: 0, hp: 1, maxHp: 1, effectId: 'combat_death_summon_grunt' });

  const events = resolveCombat(state);
  const openAttack = events.find((event) => event.attackerIndex === 7);
  const sniperAttack = events.find((event) => event.attackerIndex === 6);

  assert.equal(openAttack.targetType, 'hero');
  assert.equal(sniperAttack.targetType, 'unit');
  assert.equal(sniperAttack.targetIndex, 2);
});

test('same-lane mutual attacks and simultaneous base lethal survive snapshot planning', () => {
  const state = makeState();
  state.playerHP = 2;
  state.enemyHP = 2;
  state.board[6] = unit('player', { id: 'player-open', attack: 2, hp: 2, maxHp: 2 });
  state.board[1] = unit('enemy', { id: 'enemy-open', attack: 2, hp: 2, maxHp: 2 });

  const events = resolveCombat(state);

  assert.equal(events.some((event) => event.attackerIndex === 6 && event.targetType === 'hero'), true);
  assert.equal(events.some((event) => event.attackerIndex === 1 && event.targetType === 'hero'), true);
  assert.equal(state.winner, 'draw');
});

test('building the standard combat attack plan does not mutate GameState', () => {
  const state = makeState();
  state.board[6] = unit('player', { id: 'planner', attack: 2, hp: 2, maxHp: 2, tempAttackMod: 1 });
  state.board[0] = unit('enemy', { id: 'target', attack: 1, hp: 3, maxHp: 3 });
  const before = JSON.stringify(state);

  const plan = buildStandardCombatAttackPlan(state);

  assert.equal(plan.attackerCount, 2);
  assert.equal(JSON.stringify(state), before);
});
