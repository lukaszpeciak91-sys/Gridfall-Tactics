import test from 'node:test';
import assert from 'node:assert/strict';

import { getFactionByKey, getFactionKeys } from '../src/data/factions/index.js';
import { getCardTextShort } from '../src/localization/cardDisplay.js';
import { getCardIllustrationAsset } from '../src/rendering/cardIllustrationAssets.js';
import {
  getTutorialBattleData,
  getTutorialEnemyActionScript,
  tutorialEnemyFaction,
  tutorialOpeningConfig,
  tutorialPlayerFaction,
} from '../src/data/tutorial/tutorialDecks.js';

const EXPECTED_NORMAL_FACTION_KEYS = ['Aggro', 'Tank', 'Control', 'Swarm', 'Wardens', 'Attrition Swarm'];

const EXPECTED_TUTORIAL_CARD_ART_PATHS = Object.freeze({
  tutorial_unit_a_1: 'public/assets/cards/tutorial/ally_01.webp',
  tutorial_unit_b_1: 'public/assets/cards/tutorial/ally_02.webp',
  tutorial_unit_c_1: 'public/assets/cards/tutorial/ally_03.webp',
  tutorial_all_attack_1: 'public/assets/cards/tutorial/effect_01.webp',
  tutorial_mulligan_bait_1: 'public/assets/cards/tutorial/ally_token.webp',
  tutorial_filler_guard_1: 'public/assets/cards/tutorial/ally_token.webp',
  tutorial_filler_guard_2: 'public/assets/cards/tutorial/ally_token.webp',
  tutorial_filler_sentinel_1: 'public/assets/cards/tutorial/ally_token.webp',
  tutorial_filler_scout_1: 'public/assets/cards/tutorial/ally_token.webp',
  tutorial_filler_recruit_1: 'public/assets/cards/tutorial/ally_token.webp',
  tutorial_enemy_blocker_a_1: 'public/assets/cards/tutorial/enemy_01.webp',
  tutorial_enemy_blocker_b_1: 'public/assets/cards/tutorial/enemy_01.webp',
  tutorial_enemy_blocker_c_1: 'public/assets/cards/tutorial/enemy_02.webp',
  tutorial_enemy_blocker_d_1: 'public/assets/cards/tutorial/enemy_03.webp',
  tutorial_enemy_filler_blocker_1: 'public/assets/cards/tutorial/enemy_01.webp',
  tutorial_enemy_filler_blocker_2: 'public/assets/cards/tutorial/enemy_02.webp',
});

const EXPECTED_NORMAL_FACTION_ART_ASSET_IDS = Object.freeze({
  Aggro: ['aggro_01', 'aggro_02', 'aggro_03', 'aggro_04', 'aggro_05', 'aggro_06', 'aggro_07', 'aggro_08', 'aggro_09', 'aggro_10'],
  Tank: ['tank_01', 'tank_02', 'tank_03', 'tank_04', 'tank_05', 'tank_06', 'tank_07', 'tank_08', 'tank_09', 'tank_10'],
  Control: ['control_01', 'control_02', 'control_03', 'control_04', 'control_05', 'control_06', 'control_07', 'control_08', 'control_09', 'control_10'],
  Swarm: ['swarm_01', 'swarm_02', 'swarm_03', 'swarm_04', 'swarm_05', 'swarm_06', 'swarm_07', 'swarm_08', 'swarm_09', 'swarm_10'],
  Wardens: ['wardens_01', 'wardens_02', 'wardens_03', 'wardens_04', 'wardens_05', 'wardens_06', 'wardens_07', 'wardens_08', 'wardens_09', 'wardens_10'],
  'Attrition Swarm': ['attrition-swarm_01', 'attrition-swarm_02', 'attrition-swarm_03', 'attrition-swarm_04', 'attrition-swarm_05', 'attrition-swarm_06', 'attrition-swarm_07', 'attrition-swarm_08', 'attrition-swarm_09', 'attrition-swarm_10'],
});

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
      return { id: card.id, type: card.type, targeting: card.targeting, effectId: card.effectId ?? null, textKey: card.textKey ?? null, textShort: card.textShort, attack: card.attack, hp: card.hp, armor: card.armor };
    }),
    [
      { id: 'tutorial_unit_a_1', type: 'unit', targeting: 'lane', effectId: null, textKey: null, textShort: 'Simple 1/3 unit', attack: 1, hp: 3, armor: 0 },
      { id: 'tutorial_unit_b_1', type: 'unit', targeting: 'lane', effectId: null, textKey: null, textShort: 'Simple 1/2 unit', attack: 1, hp: 2, armor: 0 },
      { id: 'tutorial_unit_c_1', type: 'unit', targeting: 'lane', effectId: 'lane_armor_aura_1', textKey: 'cards.tank_shieldbearer_1.textShort', textShort: 'Adjacent [ALLY] +1 ARM until combat', attack: 2, hp: 2, armor: 0 },
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

test('tutorial-only cards resolve to the expected tutorial card art paths', () => {
  const tutorialCards = [...tutorialPlayerFaction.deck, ...tutorialEnemyFaction.deck];
  const tutorialCardIds = tutorialCards.map((card) => card.id);

  assert.deepEqual(tutorialCardIds, Object.keys(EXPECTED_TUTORIAL_CARD_ART_PATHS));

  for (const card of tutorialCards) {
    assert.equal(getCardIllustrationAsset(card).publicPath, EXPECTED_TUTORIAL_CARD_ART_PATHS[card.id]);
  }
});

test('normal faction card art asset ids remain unchanged', () => {
  assert.deepEqual(
    Object.fromEntries(getFactionKeys().map((factionKey) => [
      factionKey,
      getFactionByKey(factionKey).deck.map((card) => card.artAssetId),
    ])),
    EXPECTED_NORMAL_FACTION_ART_ASSET_IDS,
  );
});

test('tutorial Unit C reuses Shieldbearer adjacent armor aura data and localized text', () => {
  const tutorialUnitC = cardById(tutorialPlayerFaction.deck, 'tutorial_unit_c_1');
  const shieldbearer = cardById(getFactionByKey('Tank').deck, 'tank_shieldbearer_1');

  assert.equal(tutorialUnitC.effectId, shieldbearer.effectId);
  assert.equal(tutorialUnitC.textShort, shieldbearer.textShort);
  assert.equal(getCardTextShort(tutorialUnitC, 'en'), getCardTextShort(shieldbearer, 'en'));
  assert.equal(getCardTextShort(tutorialUnitC, 'pl'), getCardTextShort(shieldbearer, 'pl'));
  assert.equal(tutorialUnitC.attack, 2, 'Unit C keeps tutorial-specific ATK');
  assert.equal(tutorialUnitC.hp, 2, 'Unit C keeps tutorial-specific HP');
  assert.equal(tutorialUnitC.armor, 0, 'Unit C keeps tutorial-specific ARM');
});
