import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialBattleState } from '../src/systems/GameState.js';
import { getFactionByKey } from '../src/data/factions/index.js';
import { createPublicThreatContext, detectImmediateAttackThreat, resolveImmediateAttackPolicyConfig } from '../src/systems/immediateAttackThreatPolicy.js';

function threatState(opponentFaction = 'Aggro') {
  const state = createInitialBattleState(getFactionByKey('Tank'), getFactionByKey(opponentFaction), { firstActor: 'player', playerHP: 8, enemyHP: 10, randomFn: () => 0.5 });
  state.board[0] = { id: 'public-attacker', cardId: 'public-attacker', owner: 'enemy', attack: 3, hp: 4, armor: 0 };
  return state;
}

test('canonical policy modes expose production 80/1200 and experimental 80/1600', () => {
  assert.deepEqual(resolveImmediateAttackPolicyConfig('off'), { enabled: false, mode: 'off', standardWindow: 0, possibleLethalWindow: 0 });
  assert.equal(resolveImmediateAttackPolicyConfig().possibleLethalWindow, 1200);
  assert.equal(resolveImmediateAttackPolicyConfig('standard-80-lethal-1600').possibleLethalWindow, 1600);
});

test('public threat context excludes hidden hand and live deck', () => {
  const state = threatState();
  const context = createPublicThreatContext(state, 'player');
  assert.equal('hand' in context, false);
  assert.equal('deck' in context, false);
  assert.equal(JSON.stringify(context).includes('hand'), false);
});

test('hidden opponent hand and remaining deck changes cannot alter threat output', () => {
  const a = threatState();
  const b = structuredClone(a);
  a.enemy.hand = [{ id: 'aggro_adrenaline_1', effectId: 'quick_strike' }];
  a.enemy.deck = [{ id: 'secret-a' }];
  b.enemy.hand = [];
  b.enemy.deck = [{ id: 'secret-b' }, { id: 'secret-c' }];
  const summarize = (state) => {
    const result = detectImmediateAttackThreat(state, 'player');
    return { opportunity: result.opportunityDetected, availability: result.publicAvailability, immediate: result.prediction?.immediateDamage, standard: result.prediction?.standardDamage, combined: result.prediction?.combinedDamage };
  };
  assert.deepEqual(summarize(a), summarize(b));
  assert.equal(summarize(a).opportunity, true);
});

test('public discard exhaustion suppresses every qualifying Aggro enabler', () => {
  const state = threatState();
  state.enemy.discard.push(...getFactionByKey('Aggro').deck.filter((card) => ['quick_strike', 'swap_adjacent_then_resolve'].includes(card.effectId)));
  const result = detectImmediateAttackThreat(state, 'player');
  assert.equal(result.opportunityDetected, false);
  assert.equal(result.suppressionReason, 'publicly-exhausted');
});

test('swap capability requires an adjacent allied unit and System Override is excluded', () => {
  const overclock = threatState('Overclock');
  overclock.enemy.discard.push(...getFactionByKey('Overclock').deck.filter((card) => card.effectId === 'quick_strike'));
  const invalid = detectImmediateAttackThreat(overclock, 'player');
  assert.equal(invalid.opportunityDetected, false);
  assert.equal(invalid.suppressionReason, 'board-infeasible-swap');
  overclock.board[1] = { id: 'adjacent', owner: 'enemy', attack: 1, hp: 3, armor: 0 };
  assert.equal(detectImmediateAttackThreat(overclock, 'player').opportunityDetected, true);

  const control = threatState('Control');
  assert.equal(detectImmediateAttackThreat(control, 'player').opportunityDetected, false);
  assert.equal(detectImmediateAttackThreat(control, 'player').suppressionReason, 'no-qualifying-enabler');
});

test('opponent must receive the next action and weak damage does not qualify', () => {
  const noAction = threatState();
  noAction.firstActor = 'enemy';
  assert.equal(detectImmediateAttackThreat(noAction, 'player').suppressionReason, 'opponent-has-no-action-before-combat');
  const weak = threatState();
  weak.board[0].attack = 1;
  assert.equal(detectImmediateAttackThreat(weak, 'player').opportunityDetected, false);
});
