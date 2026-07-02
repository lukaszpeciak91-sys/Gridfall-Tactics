import test from 'node:test';
import assert from 'node:assert/strict';

import { getFactionByKey, getFactionKeys } from '../src/data/factions/index.js';
import {
  getTutorialBattleData,
  getTutorialEnemyActionScript,
  tutorialEnemyFaction,
  tutorialOpeningConfig,
  tutorialPlayerFaction,
} from '../src/data/tutorial/tutorialDecks.js';

const EXPECTED_NORMAL_FACTION_KEYS = ['Aggro', 'Tank', 'Control', 'Swarm', 'Wardens', 'Attrition Swarm'];

function cardById(deck, id) {
  return deck.find((card) => card.id === id);
}

test('tutorial player data exports a tutorial-only 10-card deck with required cards', () => {
  assert.equal(tutorialPlayerFaction.id, 'tutorial');
  assert.equal(tutorialPlayerFaction.name, 'Tutorial');
  assert.equal(tutorialPlayerFaction.deck.length, 10);

  assert.deepEqual(
    [
      'tutorial_unit_a_1',
      'tutorial_unit_b_1',
      'tutorial_unit_c_1',
      'tutorial_all_attack_1',
      'tutorial_mulligan_bait_1',
    ].map((id) => Boolean(cardById(tutorialPlayerFaction.deck, id))),
    [true, true, true, true, true],
  );

  assert.deepEqual(
    ['tutorial_unit_a_1', 'tutorial_unit_b_1', 'tutorial_unit_c_1'].map((id) => {
      const card = cardById(tutorialPlayerFaction.deck, id);
      return { id: card.id, type: card.type, targeting: card.targeting, attack: card.attack, hp: card.hp, armor: card.armor };
    }),
    [
      { id: 'tutorial_unit_a_1', type: 'unit', targeting: 'lane', attack: 1, hp: 3, armor: 0 },
      { id: 'tutorial_unit_b_1', type: 'unit', targeting: 'lane', attack: 1, hp: 2, armor: 0 },
      { id: 'tutorial_unit_c_1', type: 'unit', targeting: 'lane', attack: 2, hp: 2, armor: 0 },
    ],
  );

  assert.equal(cardById(tutorialPlayerFaction.deck, 'tutorial_all_attack_1').type, 'order');
  assert.equal(cardById(tutorialPlayerFaction.deck, 'tutorial_all_attack_1').effectId, 'buff_all_atk_1');
});

test('tutorial enemy data exports a tutorial-only 6-card blocker deck', () => {
  assert.equal(tutorialEnemyFaction.id, 'tutorial-enemy');
  assert.equal(tutorialEnemyFaction.name, 'Tutorial Enemy');
  assert.equal(tutorialEnemyFaction.deck.length, 6);

  assert.deepEqual(
    ['tutorial_enemy_blocker_a_1', 'tutorial_enemy_blocker_b_1', 'tutorial_enemy_blocker_c_1', 'tutorial_enemy_blocker_d_1'].map((id) => {
      const card = cardById(tutorialEnemyFaction.deck, id);
      return { id: card.id, type: card.type, targeting: card.targeting, attack: card.attack, hp: card.hp, armor: card.armor };
    }),
    [
      { id: 'tutorial_enemy_blocker_a_1', type: 'unit', targeting: 'lane', attack: 0, hp: 2, armor: 0 },
      { id: 'tutorial_enemy_blocker_b_1', type: 'unit', targeting: 'lane', attack: 0, hp: 2, armor: 0 },
      { id: 'tutorial_enemy_blocker_c_1', type: 'unit', targeting: 'lane', attack: 0, hp: 1, armor: 0 },
      { id: 'tutorial_enemy_blocker_d_1', type: 'unit', targeting: 'lane', attack: 1, hp: 3, armor: 0 },
    ],
  );

  assert.equal(cardById(tutorialEnemyFaction.deck, 'tutorial_enemy_blocker_d_1').attack, 1, 'late final scripted blocker applies light tutorial-only ATK pressure');
});

test('tutorial battle helper returns tutorial data without normal faction registry exposure', () => {
  assert.deepEqual(getTutorialBattleData(), {
    playerFaction: tutorialPlayerFaction,
    enemyFaction: tutorialEnemyFaction,
    openingConfig: tutorialOpeningConfig,
    enemyActionScript: getTutorialEnemyActionScript(),
  });

  assert.deepEqual(getFactionKeys(), EXPECTED_NORMAL_FACTION_KEYS);
  assert.equal(getFactionByKey('Tutorial'), null);
  assert.equal(getFactionByKey('tutorial'), null);
  assert.equal(getFactionByKey('Tutorial Enemy'), null);
  assert.equal(getFactionByKey('tutorial-enemy'), null);
});
