import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStandardCombatAttackPlan, createInitialBattleState, getEffectiveBoardAttack, playEffectCard, resolveCombat, resolveTargetedEffectCard } from '../src/systems/GameState.js';

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


function pyreCard(id = 'attrition_swarm_funeral_pyre_1') { return { id, name: 'Funeral Pyre', type: 'order', effectId: 'funeral_pyre' }; }

function playPyres(s, owner, count) {
  for (let i = 0; i < count; i += 1) {
    const card = pyreCard(`pyre_${owner}_${i}`);
    s[owner].hand.push(card);
    assert.equal(playEffectCard(s, owner, card.id).ok, true);
  }
}

test('death-wave safety guard terminates synthetic endless chains and finite chains still complete near the limit', () => {
  const endless = state();
  const loopingDead = () => unit('looping_dead', 'player', 0, 0);
  const backingBoard = [...endless.board];
  backingBoard[6] = loopingDead();
  endless.board = new Proxy(backingBoard, {
    set(target, property, value) {
      target[property] = value;
      if (property === '6' && value === null) target[property] = loopingDead();
      return true;
    },
  });

  assert.throws(() => resolveCombat(endless), /Death wave safety limit exceeded \(128\)/);
  assert.deepEqual(endless.deathWaveSafetyGuardHit, { limit: 128, pendingIndexes: [0, 1, 2, 6, 7, 8] });
  assert.equal(endless.deathWaveDiagnostics.length, 128);

  const finite = state();
  let remainingRespawns = 126;
  const finiteBackingBoard = [...finite.board];
  finiteBackingBoard[6] = unit('finite_dead_126', 'player', 0, 0);
  finite.board = new Proxy(finiteBackingBoard, {
    set(target, property, value) {
      target[property] = value;
      if (property === '6' && value === null && remainingRespawns > 0) {
        remainingRespawns -= 1;
        target[property] = unit(`finite_dead_${remainingRespawns}`, 'player', 0, 0);
      }
      return true;
    },
  });

  assert.doesNotThrow(() => resolveCombat(finite));
  assert.equal(finite.deathWaveDiagnostics.length, 127);
  assert.equal(finite.deathWaveSafetyGuardHit, undefined);
  assert.equal(finite.board[6], null);
});

test('multiple active Stos instances trigger independently once with deterministic event order', () => {
  const s = state();
  playPyres(s, 'player', 2);
  s.board[6] = unit('ally', 'player', 0, 1);
  s.board[0] = unit('killer', 'enemy', 1, 3);

  const events = resolveCombat(s);
  const pyreEvents = events.filter((event) => event.type === 'death-trigger-hero-damage' && event.source === 'funeral_pyre');

  assert.equal(s.enemyHP, 10);
  assert.equal(s.funeralPyreCombatTriggers, 2);
  assert.equal(s.funeralPyreBaseDamage, 2);
  assert.equal(s.funeralPyreThisCombat.player.triggers, 2);
  assert.equal(s.funeralPyreThisCombat.player.instances, 2);
  assert.equal(s.funeralPyreMultiStosEvents, 1);
  assert.deepEqual(pyreEvents, [{ type: 'death-trigger-hero-damage', lane: 0, source: 'funeral_pyre', sourceDeathIndex: 6, targetSide: 'enemy', damage: 2 }]);
  assert.equal(s.board[0]?.id, 'killer');
});

test('multiple active Stos instances remain once-per-turn with multiple allied deaths in one wave', () => {
  const s = state();
  playPyres(s, 'player', 2);
  s.board[6] = unit('ally_left', 'player', 0, 1);
  s.board[7] = unit('ally_mid', 'player', 0, 1);
  s.board[0] = unit('killer_left', 'enemy', 1, 3);
  s.board[1] = unit('killer_mid', 'enemy', 1, 3);

  const events = resolveCombat(s);
  const pyreEvents = events.filter((event) => event.type === 'death-trigger-hero-damage' && event.source === 'funeral_pyre');

  assert.deepEqual(s.deathWaveDiagnostics[0].indexes, [6, 7]);
  assert.equal(s.enemyHP, 10);
  assert.equal(s.funeralPyreCombatTriggers, 2);
  assert.equal(s.funeralPyreBaseDamage, 2);
  assert.equal(s.funeralPyreAlliedDeathOpportunities, 1);
  assert.equal(s.funeralPyreAlreadyUsedSkips ?? 0, 0);
  assert.equal(s.funeralPyreThisCombat.player.opportunities, 1);
  assert.equal(s.funeralPyreThisCombat.player.triggers, 2);
  assert.equal(pyreEvents.length, 1);
  assert.equal(pyreEvents[0].damage, 2);
});

test('dead Stos observer is suppressed while surviving Stos triggers for same-wave allied death', () => {
  const s = state();
  playPyres(s, 'player', 1);
  s.board[6] = unit('ally', 'player', 0, 1);
  s.board[7] = unit('dead_stos_body', 'player', 0, 1, 'funeral_pyre');
  s.board[8] = unit('surviving_stos_body', 'player', 0, 3, 'funeral_pyre');
  s.board[0] = unit('killer_ally', 'enemy', 1, 3);
  s.board[1] = unit('killer_dead_stos', 'enemy', 1, 3);

  resolveCombat(s);

  assert.deepEqual(s.deathWaveDiagnostics[0].indexes, [6, 7]);
  assert.equal(s.enemyHP, 11);
  assert.equal(s.funeralPyreCombatTriggers, 1);
  assert.equal(s.funeralPyreBaseDamage, 1);
  assert.equal(s.board[7], null);
  assert.equal(s.board[8]?.id, 'surviving_stos_body');
});

test('trigger-created Stos lethal resolves after the death wave without next-turn progression', () => {
  const s = state();
  s.enemyHP = 1;
  playPyres(s, 'player', 1);
  s.board[6] = unit('ally', 'player', 0, 1);
  s.board[0] = unit('killer', 'enemy', 1, 3);

  const events = resolveCombat(s);

  assert.equal(s.winner, 'player');
  assert.equal(s.endingReason, null);
  assert.equal(s.enemyHP, 0);
  assert.equal(s.heroDeathResolution.resolvedBy, 'single-hero-lethal');
  assert.deepEqual(events.filter((event) => event.type === 'death-trigger-hero-damage' && event.source === 'funeral_pyre').map((event) => [event.sourceDeathIndex, event.damage]), [[6, 1]]);
});

test('opposing trigger-created simultaneous lethal resolves all triggers and draws deterministically', () => {
  const s = state();
  s.playerHP = 1;
  s.enemyHP = 1;
  playPyres(s, 'player', 1);
  playPyres(s, 'enemy', 1);
  s.board[0] = unit('enemy_dead', 'enemy', 0, 0);
  s.board[6] = unit('player_dead', 'player', 0, 0);

  const events = resolveCombat(s);
  const pyreEvents = events.filter((event) => event.type === 'death-trigger-hero-damage' && event.source === 'funeral_pyre');

  assert.equal(s.winner, 'draw');
  assert.equal(s.playerHP, 0);
  assert.equal(s.enemyHP, 0);
  assert.equal(s.heroDeathResolution.simultaneousLethal, true);
  assert.equal(s.heroDeathResolution.resolvedBy, 'simultaneous-base-destruction-draw');
  assert.equal(s.funeralPyreCombatTriggers, 2);
  assert.deepEqual(pyreEvents.map((event) => [event.sourceDeathIndex, event.targetSide, event.damage]), [[0, 'player', 1], [6, 'enemy', 1]]);
});

test('Fallen ordering excludes temporary Flood tokens and revive newest-to-oldest is deterministic', () => {
  const s = state();
  s.board[0] = unit('enemy_left', 'enemy', 0, 0);
  s.board[1] = unit('enemy_flood', 'enemy', 0, 0, null, { temporaryFloodToken: true });
  s.board[2] = unit('enemy_right', 'enemy', 0, 0);
  s.board[6] = unit('player_left', 'player', 0, 0);
  s.board[7] = unit('player_flood', 'player', 0, 0, null, { temporaryFloodToken: true });
  s.board[8] = unit('player_right', 'player', 0, 0);

  resolveCombat(s);

  assert.deepEqual(s.deathWaveDiagnostics[0].indexes, [0, 1, 2, 6, 7, 8]);
  assert.deepEqual(s.enemy.fallen.map((entry) => entry.card.id), ['enemy_left', 'enemy_right']);
  assert.deepEqual(s.player.fallen.map((entry) => entry.card.id), ['player_left', 'player_right']);

  const revive = { id: 'revive', name: 'Revive', type: 'order', effectId: 'revive_friendly_1hp' };
  s.player.hand.push(revive);
  assert.equal(resolveTargetedEffectCard(s, 'player', revive.id, 6).ok, true);
  assert.equal(s.board[6].id, 'player_right');
  s.player.hand.push(revive);
  assert.equal(resolveTargetedEffectCard(s, 'player', revive.id, 7).ok, true);
  assert.equal(s.board[7].id, 'player_left');
});
