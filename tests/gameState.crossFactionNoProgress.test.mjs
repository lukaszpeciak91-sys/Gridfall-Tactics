import test from 'node:test';
import assert from 'node:assert/strict';

import { getFactionByKey } from '../src/data/factions/index.js';
import {
  battleCanRealisticallyChangeOutcome,
  createInitialBattleState,
  resolveImmediateNoProgressWinner,
} from '../src/systems/GameState.js';
import { chooseBattleAction } from '../src/systems/enemyDecision.js';

const factionKeys = ['aggro', 'swarm', 'attrition-swarm', 'control', 'tank', 'wardens'];
const deadSituationalCardByFaction = {
  aggro: 'aggro_full_attack_1',
  swarm: 'swarm_swarm_attack_1',
  'attrition-swarm': 'attrition_swarm_funeral_pyre_1',
  control: 'control_swap_1',
  tank: 'tank_fortify_1',
  wardens: 'wardens_stand_firm_1',
};

const makeState = () => createInitialBattleState(
  { name: 'Player', deck: [] },
  { name: 'Enemy', deck: [] },
  { firstActor: 'enemy' },
);

const factionLookupKey = {
  aggro: 'Aggro',
  swarm: 'Swarm',
  'attrition-swarm': 'Attrition Swarm',
  control: 'Control',
  tank: 'Tank',
  wardens: 'Wardens',
};

const copyFactionCard = (factionKey, cardId) => structuredClone(
  getFactionByKey(factionLookupKey[factionKey]).deck.find((card) => card.id === cardId),
);

const makeWall = (owner, id) => ({
  id,
  cardId: id,
  name: id,
  type: 'unit',
  owner,
  attack: 0,
  hp: 4,
  maxHp: 4,
  armor: 0,
  effectId: 'cannot_attack',
});

const makeUnitCard = (id, attack = 1, hp = 1, effectId = null) => ({
  id,
  name: id,
  type: 'unit',
  targeting: 'lane',
  attack,
  hp,
  armor: 0,
  effectId,
});

test('every faction resolves empty-board dead hands immediately when AI can only pass', async (t) => {
  for (const factionKey of factionKeys) {
    await t.test(factionKey, () => {
      const state = makeState();
      state.playerHP = 9;
      state.enemyHP = 4;
      state.enemy.hand = [copyFactionCard(factionKey, deadSituationalCardByFaction[factionKey])];

      assert.deepEqual(chooseBattleAction(state, 'enemy'), { type: 'pass' });
      assert.equal(battleCanRealisticallyChangeOutcome(state), false);
      assert.equal(resolveImmediateNoProgressWinner(state), 'player');
      assert.equal(state.endingReason, 'no-progress-deadlock');
      assert.equal(state.turnsCompleted, 0);
    });
  }
});

test('blocked boards resolve by HP even when every faction retains an unusable situational card', async (t) => {
  for (const factionKey of factionKeys) {
    await t.test(factionKey, () => {
      const state = makeState();
      state.playerHP = 6;
      state.enemyHP = 8;
      state.board[0] = makeWall('enemy', 'enemy-wall');
      state.board[6] = makeWall('player', 'player-wall');
      state.enemy.deck = [copyFactionCard(factionKey, deadSituationalCardByFaction[factionKey])];

      assert.equal(battleCanRealisticallyChangeOutcome(state), false);
      assert.equal(resolveImmediateNoProgressWinner(state), 'enemy');
    });
  }
});

test('equal-HP cross-faction deadlock resolves as a draw', () => {
  const state = makeState();
  state.playerHP = 5;
  state.enemyHP = 5;
  state.player.hand = [copyFactionCard('wardens', 'wardens_stand_firm_1')];
  state.enemy.deck = [copyFactionCard('control', 'control_swap_1')];

  assert.equal(resolveImmediateNoProgressWinner(state), 'draw');
  assert.equal(state.noProgressResolvedBy, 'equal-hero-hp');
});

test('temporarily unusable summon remains live when combat can create an empty slot', () => {
  const state = makeState();
  state.playerHP = 8;
  state.enemyHP = 5;
  state.board[0] = makeWall('enemy', 'enemy-left');
  state.board[1] = makeWall('enemy', 'enemy-mid');
  state.board[2] = makeWall('enemy', 'enemy-right');
  state.board[6] = { ...makeWall('player', 'player-left'), attack: 1, hp: 1, maxHp: 1, effectId: 'self_damage_after_attack' };
  state.board[7] = makeWall('player', 'player-mid');
  state.board[8] = makeWall('player', 'player-right');
  state.player.deck = [copyFactionCard('swarm', 'swarm_spawn_1')];

  assert.equal(battleCanRealisticallyChangeOutcome(state), true);
  assert.equal(resolveImmediateNoProgressWinner(state), null);
});

test('future draw and redeploy path remains live when an attacker can replace a friendly wall', () => {
  const state = makeState();
  state.playerHP = 8;
  state.enemyHP = 5;
  state.board[0] = makeWall('enemy', 'enemy-wall');
  state.board[6] = makeWall('player', 'player-wall');
  state.enemy.deck = [makeUnitCard('future-attacker', 2, 3)];

  assert.equal(battleCanRealisticallyChangeOutcome(state), true);
  assert.equal(resolveImmediateNoProgressWinner(state), null);
});

test('unit remaining in deck does not keep a permanently enemy-blocked board alive', () => {
  const state = makeState();
  state.playerHP = 9;
  state.enemyHP = 4;
  state.board[0] = makeWall('player', 'player-left');
  state.board[1] = makeWall('player', 'player-mid');
  state.board[2] = makeWall('player', 'player-right');
  state.enemy.deck = [makeUnitCard('stranded-attacker', 4, 4)];

  assert.deepEqual(chooseBattleAction(state, 'enemy'), { type: 'pass' });
  assert.equal(resolveImmediateNoProgressWinner(state), 'player');
});
