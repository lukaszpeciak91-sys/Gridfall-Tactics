import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStandardCombatAttackPlan, createInitialBattleState, getEffectiveBoardAttack, resolveCombat } from '../src/systems/GameState.js';

function state() { return createInitialBattleState({ id: 'p', name: 'P', deck: [] }, { id: 'e', name: 'E', deck: [] }, { firstActor: 'player' }); }
function unit(id, owner, attack = 0, hp = 1, effectId = null, extra = {}) { return { id, cardId: id, name: id, type: 'unit', owner, attack, hp, maxHp: hp, armor: 0, effectId, ...extra }; }

test('standard combat batches simultaneous defeated units into one stable death wave', () => {
  const s = state();
  s.board[0] = unit('enemy_brood', 'enemy', 1, 1, 'on_death_summon_grunt');
  s.board[1] = unit('enemy_boom', 'enemy', 1, 1, 'death_damage_enemy_hero_1');
  s.board[2] = unit('enemy_plain', 'enemy', 1, 1);
  s.board[6] = unit('player_boom', 'player', 1, 1, 'death_damage_enemy_hero_1');
  s.board[7] = unit('player_brood', 'player', 1, 1, 'on_death_summon_grunt');
  s.board[8] = unit('player_plain', 'player', 1, 1);

  const events = resolveCombat(s);
  assert.deepEqual(s.deathWaveDiagnostics[0].indexes, [0, 1, 2, 6, 7, 8]);
  assert.deepEqual(s.enemy.fallen.map((entry) => entry.card.id), ['enemy_brood', 'enemy_boom', 'enemy_plain']);
  assert.deepEqual(s.player.fallen.map((entry) => entry.card.id), ['player_boom', 'player_brood', 'player_plain']);
  assert.equal(events.filter((event) => event.type === 'death-trigger-hero-damage').length, 2);
  assert.equal(s.board[0]?.name, 'Grunt');
  assert.equal(s.board[7]?.name, 'Grunt');
});

test('surviving Rotcaller gains after the wave and not in the frozen standard attack plan', () => {
  const s = state();
  s.board[6] = unit('ally', 'player', 0, 1);
  s.board[7] = unit('rot', 'player', 1, 3, 'rotcaller_adjacent_death_atk_1');
  s.board[0] = unit('killer', 'enemy', 1, 3);
  const plan = buildStandardCombatAttackPlan(s);
  assert.equal(plan.plans.find((entry) => entry.sourceIndex === 7).attack, 1);
  resolveCombat(s);
  assert.equal(s.board[7].attack, 2);
  assert.equal(getEffectiveBoardAttack(s, 7), 2);
  assert.equal(s.rotcallerCombatTriggers, 1);
});

test('dead Rotcaller and dead Stos observers do not react to their own death wave', () => {
  const s = state();
    s.board[6] = unit('ally', 'player', 0, 1);
  s.board[7] = unit('rot', 'player', 0, 1, 'rotcaller_adjacent_death_atk_1');
  s.board[8] = unit('stos_body', 'player', 0, 1, 'funeral_pyre');
  s.board[0] = unit('k0', 'enemy', 1, 3);
  s.board[1] = unit('k1', 'enemy', 1, 3);
  s.board[2] = unit('k2', 'enemy', 1, 3);
  resolveCombat(s);
  assert.equal(s.board[7], null);
  assert.equal(s.rotcallerCombatTriggers ?? 0, 0);
  assert.deepEqual(s.player.fallen.map((entry) => entry.card.id), ['ally', 'rot', 'stos_body']);
});

test('trigger-created lethal damage creates a second bounded death wave', () => {
  const s = state();
  s.board[7] = unit('lane_bomber', 'player', 0, 1, 'combat_death_damage_enemy_lane_1');
  s.board[1] = unit('killer', 'enemy', 1, 1);
  s.board[0] = unit('second', 'enemy', 0, 3, 'death_damage_enemy_hero_1');
  resolveCombat(s);
  assert.deepEqual(s.deathWaveDiagnostics.map((wave) => wave.indexes), [[7], [1]]);
  assert.equal(s.player.fallen.at(-1).card.id, 'lane_bomber');
  assert.equal(s.enemy.fallen.at(-1).card.id, 'killer');
});

test('Flood token is removed in wave order but excluded from Fallen', () => {
  const s = state();
  s.board[0] = unit('killer', 'enemy', 1, 3);
  s.board[1] = unit('killer2', 'enemy', 1, 3);
  s.board[6] = unit('flood', 'player', 0, 1, null, { temporaryFloodToken: true });
  s.board[7] = unit('normal', 'player', 0, 1);
  resolveCombat(s);
  assert.deepEqual(s.deathWaveDiagnostics[0].indexes, [6, 7]);
  assert.equal(s.board[6], null);
  assert.deepEqual(s.player.fallen.map((entry) => entry.card.id), ['normal']);
});
