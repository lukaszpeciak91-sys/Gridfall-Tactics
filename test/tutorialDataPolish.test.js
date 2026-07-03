import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { tutorialEnemyFaction } from '../src/data/tutorial/tutorialDecks.js';
import { getCardTextShort } from '../src/localization/cardDisplay.js';

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

test('tutorial visible rules text omits prototype filler while preserving real effects', async () => {
  const { tutorialPlayerFaction, tutorialEnemyFaction } = await import('../src/data/tutorial/tutorialDecks.js');
  const playerById = Object.fromEntries(tutorialPlayerFaction.deck.map((card) => [card.id, card]));

  for (const id of ['tutorial_unit_a_1', 'tutorial_unit_b_1', 'tutorial_mulligan_bait_1', 'tutorial_filler_guard_1', 'tutorial_filler_guard_2', 'tutorial_filler_sentinel_1', 'tutorial_filler_scout_1', 'tutorial_filler_recruit_1']) {
    assert.equal(playerById[id].textShort, '', `${id} should not show prototype filler text`);
  }

  for (const card of tutorialEnemyFaction.deck) {
    assert.equal(card.textShort, '', `${card.id} should not show blocker/prototype text`);
    assert.doesNotMatch(card.textShort, /simple|blocker/i);
  }

  const effectCard = playerById.tutorial_all_attack_1;
  assert.equal(effectCard.textShort, 'All [ALLY] +1 ATK until combat');
  assert.equal(effectCard.textShortPl, '[ALLIES] +1 ATK do walki');
  assert.equal(getCardTextShort(effectCard, 'en'), 'All [ALLY] +1 ATK until combat');
  assert.equal(getCardTextShort(effectCard, 'pl'), '[ALLIES] +1 ATK do walki');
  assert.equal(effectCard.effectId, 'buff_all_atk_1');
  assert.equal(playerById.tutorial_unit_c_1.textShort, 'Adjacent [ALLY] +1 ARM until combat');
});
