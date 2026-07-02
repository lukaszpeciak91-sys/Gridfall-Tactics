import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { tutorialEnemyFaction } from '../src/data/tutorial/tutorialDecks.js';

const TUTORIAL_ENEMY_UNIT_IDS = [
  'tutorial_enemy_blocker_a_1',
  'tutorial_enemy_blocker_b_1',
  'tutorial_enemy_blocker_c_1',
  'tutorial_enemy_blocker_d_1',
  'tutorial_enemy_filler_blocker_1',
  'tutorial_enemy_filler_blocker_2',
];

test('every tutorial enemy unit has exactly 1 ATK', () => {
  const enemyUnits = tutorialEnemyFaction.deck.filter((card) => card.type === 'unit');
  assert.deepEqual(enemyUnits.map((card) => card.id).sort(), [...TUTORIAL_ENEMY_UNIT_IDS].sort());

  for (const card of enemyUnits) {
    assert.equal(card.attack, 1, `${card.id} should have 1 ATK`);
    assert.notEqual(card.attack, 0, `${card.id} should not remain at 0 ATK`);
  }
});

test('tutorial-only cards stay out of normal faction data files', () => {
  const factionDir = path.resolve('src/data/factions');
  const normalFactionJson = fs.readdirSync(factionDir)
    .filter((fileName) => fileName.endsWith('.json'))
    .map((fileName) => fs.readFileSync(path.join(factionDir, fileName), 'utf8'))
    .join('\n');

  for (const cardId of TUTORIAL_ENEMY_UNIT_IDS) {
    assert.equal(normalFactionJson.includes(cardId), false, `${cardId} should not appear in normal faction cards`);
  }

  assert.equal(tutorialEnemyFaction.deck.find((card) => card.id === 'tutorial_enemy_blocker_a_1').factionId, 'tutorial');
});
