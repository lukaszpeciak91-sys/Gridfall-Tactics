import test from 'node:test';
import assert from 'node:assert/strict';
import { getModifiedStatState } from '../src/rendering/cardVisualLayout.js';
import {
  createInitialBattleState,
  ensureUnitOriginalStats,
  getCombatPresentationStatsForBoardIndex,
  getEffectiveBoardArmor,
  getUnitOriginalStats,
  resolveCombat,
} from '../src/systems/GameState.js';

const unit = (id, owner, attack = 1, armor = 0, hp = 3, extra = {}) => ({
  id, cardId: id, name: id, type: 'unit', owner, attack, armor, hp, maxHp: hp, ...extra,
});
const state = () => createInitialBattleState(
  { id: 'p', name: 'P', deck: [] },
  { id: 'e', name: 'E', deck: [] },
  { firstActor: 'player' },
);
const style = (key, value, subject) => getModifiedStatState(key, { [key]: value }, getUnitOriginalStats(subject));

test('canonical stat presentation compares effective ATK and ARM with immutable creation stats', () => {
  const subject = unit('subject', 'player', 2, 1);
  ensureUnitOriginalStats(subject);

  assert.equal(style('attack', 2, subject), 'base');
  assert.equal(style('attack', 3, subject), 'buff');
  assert.equal(style('attack', 1, subject), 'debuff');
  assert.equal(style('attack', 0, subject), 'debuff');
  assert.equal(style('armor', 2, subject), 'buff');
  assert.equal(style('armor', 0, subject), 'debuff');

  subject.tempAttackMod = 1;
  assert.equal(style('attack', subject.attack + subject.tempAttackMod, subject), 'buff');
  delete subject.tempAttackMod;
  assert.equal(style('attack', subject.attack, subject), 'base');
});

test('Rotcaller permanent gain retains its original baseline through combat and snapshots', () => {
  const s = state();
  s.board[6] = unit('ally', 'player', 0, 0, 1);
  s.board[7] = unit('rotcaller', 'player', 1, 0, 3, { effectId: 'rotcaller_adjacent_death_atk_1' });
  s.board[0] = unit('killer', 'enemy', 1, 0, 3);

  assert.equal(style('attack', 1, s.board[7]), 'base');
  resolveCombat(s);
  assert.equal(s.board[7].attack, 2);
  assert.equal(s.board[7].originalAttack, 1);
  assert.equal(style('attack', 2, s.board[7]), 'buff');

  const presentation = getCombatPresentationStatsForBoardIndex(s, 7);
  const clone = { ...s.board[7], __presentationStats: presentation };
  assert.equal(style('attack', clone.__presentationStats.attack, clone), 'buff');
  assert.equal(clone.originalAttack, 1);

  resolveCombat(s);
  assert.equal(s.board[7].attack, 2);
  assert.equal(style('attack', 2, s.board[7]), 'buff');
});

test('projected armor aura styling follows adjacency and source removal for either owner', () => {
  for (const [owner, targetIndex, auraIndex] of [['player', 7, 6], ['enemy', 1, 0]]) {
    const s = state();
    const target = unit(`${owner}-target`, owner, 1, 1);
    ensureUnitOriginalStats(target);
    s.board[targetIndex] = target;
    s.board[auraIndex] = unit(`${owner}-guardian`, owner, 1, 0, 3, { effectId: 'lane_armor_aura_1' });
    assert.equal(getEffectiveBoardArmor(s, targetIndex), 2);
    assert.equal(style('armor', getEffectiveBoardArmor(s, targetIndex), target), 'buff');
    s.board[auraIndex] = null;
    assert.equal(style('armor', getEffectiveBoardArmor(s, targetIndex), target), 'base');
  }
});

test('ordinary HP damage is not classified as a modified stat', () => {
  const subject = unit('damaged', 'player', 1, 0, 4);
  ensureUnitOriginalStats(subject);
  subject.hp = 2;
  assert.equal(getModifiedStatState('health', { health: subject.hp }, getUnitOriginalStats(subject)), 'base');
  assert.equal(getUnitOriginalStats(subject).maxHp, 4);
});
