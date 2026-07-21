import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialBattleState, getEffectiveBoardAttack, playEffectCard, resolveCombat, toggleFirstActor } from '../src/systems/GameState.js';
import attrition from '../src/data/factions/attrition-swarm.json' with { type: 'json' };
import en from '../src/localization/translations/en.json' with { type: 'json' };
import pl from '../src/localization/translations/pl.json' with { type: 'json' };

function state() { return createInitialBattleState({ id: 'p', name: 'P', deck: [] }, { id: 'e', name: 'E', deck: [] }, { firstActor: 'player' }); }
function unit(id, owner, attack = 0, hp = 1, effectId = null) { return { id, cardId: id, name: id, type: 'unit', owner, attack, hp, maxHp: hp, armor: 0, effectId }; }
const rot = (owner = 'player') => unit('rot', owner, 1, 2, 'rotcaller_adjacent_death_atk_1');
const pyre = { id: 'attrition_swarm_funeral_pyre_1', name: 'Funeral Pyre', type: 'order', effectId: 'funeral_pyre' };

test('Wodzirej first adjacent allied death grants exactly +1 permanent ATK and survives cleanup/turns', () => {
  const s = state();
  s.board[7] = rot();
  s.board[6] = unit('ally', 'player', 0, 1);
  s.board[0] = unit('killer', 'enemy', 1, 3);
  resolveCombat(s);
  assert.equal(s.board[7].attack, 2);
  assert.equal(getEffectiveBoardAttack(s, 7), 2);
  toggleFirstActor(s);
  assert.equal(getEffectiveBoardAttack(s, 7), 2);
  assert.equal(s.rotcallerCombatTriggers, 1);
  assert.equal(s.rotcallerPermanentAttackGained, 1);
});

test('Wodzirej ignores second adjacent death, non-adjacent death, own death, and simultaneous adjacent deaths only grant once', () => {
  const s = state();
  s.board[7] = rot();
  s.board[6] = unit('left', 'player', 0, 1);
  s.board[8] = unit('right', 'player', 0, 1);
  s.board[0] = unit('k1', 'enemy', 1, 3);
  s.board[2] = unit('k2', 'enemy', 1, 3);
  resolveCombat(s);
  assert.equal(s.board[7].attack, 2);
  assert.equal(s.rotcallerCombatTriggers, 1);
  assert.equal(s.rotcallerAlreadyConsumedSkips, 1);

  s.board[6] = unit('far', 'player', 0, 1);
  s.board[0] = unit('k3', 'enemy', 1, 3);
  resolveCombat(s);
  assert.equal(s.board[7].attack, 2);

  s.board[1] = unit('killrot', 'enemy', 2, 3);
  resolveCombat(s);
  assert.equal(s.board[7], null);
  assert.equal(s.rotcallerCombatTriggers, 1);
});

test('two Wodzirej instances track permanent trigger state independently', () => {
  const s = state();
  s.board[6] = rot();
  s.board[8] = rot();
  s.board[7] = unit('mid', 'player', 0, 1);
  s.board[1] = unit('killer', 'enemy', 1, 3);
  resolveCombat(s);
  assert.equal(s.board[6].attack, 2);
  assert.equal(s.board[8].attack, 2);
  assert.equal(s.rotcallerCombatTriggers, 2);
});

test('Stos first allied death each turn damages enemy base once and resets next turn', () => {
  const s = state();
  s.player.hand.push(pyre);
  assert.equal(playEffectCard(s, 'player', pyre.id).ok, true);
  s.board[6] = unit('a1', 'player', 0, 1);
  s.board[7] = unit('a2', 'player', 0, 1);
  s.board[0] = unit('k1', 'enemy', 1, 3);
  s.board[1] = unit('k2', 'enemy', 1, 3);
  resolveCombat(s);
  assert.equal(s.enemyHP, 11);
  assert.equal(s.funeralPyreCombatTriggers, 1);
  assert.equal(s.funeralPyreAlreadyUsedSkips, 1);
  toggleFirstActor(s);
  s.board[6] = unit('a3', 'player', 0, 1);
  s.board[0] = unit('k3', 'enemy', 1, 3);
  resolveCombat(s);
  assert.equal(s.enemyHP, 10);
  assert.equal(s.funeralPyreCombatTriggers, 2);
});

test('two Stos instances each trigger from same allied death and base damage can end battle', () => {
  const s = state();
  s.enemyHP = 2;
  s.player.hand.push({ ...pyre }, { ...pyre, id: 'pyre2' });
  assert.equal(playEffectCard(s, 'player', pyre.id).ok, true);
  assert.equal(playEffectCard(s, 'player', 'pyre2').ok, true);
  s.board[6] = unit('a1', 'player', 0, 1);
  s.board[0] = unit('k1', 'enemy', 1, 3);
  resolveCombat(s);
  assert.equal(s.enemyHP, 0);
  assert.equal(s.winner, 'player');
  assert.equal(s.funeralPyreCombatTriggers, 2);
  assert.equal(s.funeralPyreBaseDamage, 2);
});

test('copy source contains only approved Wodzirej and Stos descriptions', () => {
  assert.equal(attrition.deck.find((c) => c.id === 'attrition_swarm_rotcaller_1').textShort, 'First adjacent [ALLY] death: +1 ATK permanently');
  assert.equal(en.cards.attrition_swarm_rotcaller_1.textShort, 'First adjacent [ALLY] death: +1 ATK permanently');
  assert.equal(pl.cards.attrition_swarm_rotcaller_1.textShort, 'Zgon pierwszego sąsiedniego [ALLY]:\n+1 [ATK] na stałe');
  assert.equal(attrition.deck.find((c) => c.id === 'attrition_swarm_funeral_pyre_1').textShort, 'First [ALLY] death each turn:\nenemy base loses 1 HP');
  assert.equal(en.cards.attrition_swarm_funeral_pyre_1.textShort, 'First [ALLY] death each turn:\nenemy base loses 1 HP');
  assert.equal(pl.cards.attrition_swarm_funeral_pyre_1.textShort, 'Pierwszy zgon [ALLY] w turze:\nbaza wroga traci 1 HP');
});
