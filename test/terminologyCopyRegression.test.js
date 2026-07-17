import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { TUTORIAL_STEPS } from '../src/data/tutorial/tutorialSteps.js';
import enTranslations from '../src/localization/translations/en.json' with { type: 'json' };
import plTranslations from '../src/localization/translations/pl.json' with { type: 'json' };

const battleSceneSource = await readFile(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
const gameStateSource = await readFile(new URL('../src/systems/GameState.js', import.meta.url), 'utf8');
const rulesPanelSource = await readFile(new URL('../src/scenes/RulesPanelScene.js', import.meta.url), 'utf8');
const achievementsSource = await readFile(new URL('../src/systems/achievements.js', import.meta.url), 'utf8');
const playerStatsSource = await readFile(new URL('../src/systems/playerStats.js', import.meta.url), 'utf8');

const CANONICAL_RULES_EN_HEADING = 'Alternating Initiative';
const CANONICAL_RULES_EN_BODY = 'Each turn, both sides take one action or PASS. Combat then resolves automatically. In the next turn, the side that acted second goes first.';
const CANONICAL_RULES_PL_HEADING = 'Naprzemienna inicjatywa';
const CANONICAL_RULES_PL_BODY = 'W każdej turze obie strony wykonują po jednej akcji lub PASS. Następnie walka rozstrzyga się automatycznie. W kolejnej turze pierwszy ruch wykonuje strona, która poprzednio działała jako druga.';
const CANONICAL_TUTORIAL_EN = 'Each side gets one action or PASS per turn.\nAfter combat, the side that acted second goes first in the next turn.';
const CANONICAL_TUTORIAL_PL = 'W każdej turze każda strona wykonuje jedną akcję lub PASS.\nPo walce w kolejnej turze zaczyna strona, która poprzednio działała jako druga.';

function getRulesInitiativeSection(translations) {
  return translations.ui.rules.sections.find((section) => section.heading === CANONICAL_RULES_EN_HEADING || section.heading === CANONICAL_RULES_PL_HEADING);
}

test('Rules initiative entry uses canonical English wording', () => {
  const section = getRulesInitiativeSection(enTranslations);
  assert.ok(section, 'English alternating initiative rules section should exist');
  assert.equal(section.heading, CANONICAL_RULES_EN_HEADING);
  assert.equal(section.lines[0], CANONICAL_RULES_EN_BODY);
  assert.match(rulesPanelSource, new RegExp(CANONICAL_RULES_EN_HEADING));
  assert.match(rulesPanelSource, /Each turn, both sides take one action or PASS\. Combat then resolves automatically\. In the next turn, the side that acted second goes first\./);
});

test('Rules initiative entry uses canonical Polish wording', () => {
  const section = getRulesInitiativeSection(plTranslations);
  assert.ok(section, 'Polish alternating initiative rules section should exist');
  assert.equal(section.heading, CANONICAL_RULES_PL_HEADING);
  assert.equal(section.lines[0], CANONICAL_RULES_PL_BODY);
});

test('tutorial action explanation describes both actions before combat and post-combat initiative flip', () => {
  const step = TUTORIAL_STEPS.find((item) => item.id === 'play_unit_a');
  assert.ok(step, 'play_unit_a tutorial step should exist');
  assert.equal(step.text.en, `Play a unit onto the board.\n\n${CANONICAL_TUTORIAL_EN}`);
  assert.equal(step.text.pl, `Zagraj jednostkę na planszę.\n\n${CANONICAL_TUTORIAL_PL}`);
  assert.doesNotMatch(step.text.en, /Next turn, the enemy acts first/i);
  assert.doesNotMatch(step.text.en, /You get 1 action per turn/i);
  assert.match(step.text.en, /Each side gets one action or PASS per turn/);
  assert.match(step.text.en, /After combat, the side that acted second goes first in the next turn/);
  assert.match(step.text.pl, /W każdej turze każda strona wykonuje jedną akcję lub PASS/);
  assert.match(step.text.pl, /Po walce w kolejnej turze zaczyna strona, która poprzednio działała jako druga/);
});

test('basic tutorial copy refers to ending the player action, not the full turn', () => {
  assert.equal(enTranslations.ui.tutorial.steps[3], 'End your action after making your move.');
  assert.equal(plTranslations.ui.tutorial.steps[3], 'Zakończ swoją akcję po wykonaniu ruchu.');
  assert.doesNotMatch(enTranslations.ui.tutorial.steps[3], /End your turn/i);
  assert.doesNotMatch(plTranslations.ui.tutorial.steps[3], /Zakończ turę/i);
});

test('battle history and result Turn labels remain unchanged', () => {
  assert.equal(enTranslations.ui.battle.deckInfo.turnHeader, 'Turn {turn}');
  assert.equal(plTranslations.ui.battle.deckInfo.turnHeader, 'Tura {turn}');
  assert.equal(enTranslations.ui.battle.resultStats.turns, 'Turns');
  assert.equal(plTranslations.ui.battle.resultStats.turns, 'Tury');
  assert.match(battleSceneSource, /translateActive\('ui\.battle\.deckInfo\.turnHeader', 'Turn \{turn\}'/);
  assert.match(battleSceneSource, /translateActive\('ui\.battle\.resultStats\.turns', 'Turns'\)/);
});

test('turnsCompleted logic remains tied to post-combat turn completion', () => {
  assert.match(gameStateSource, /turnsCompleted: 0/);
  assert.match(battleSceneSource, /const combatEvents = resolveCombat\(this\.gameState\);[\s\S]*?this\.gameState\.turnsCompleted \+= 1;[\s\S]*?drawCards\(this\.gameState\.player, 1\);[\s\S]*?toggleFirstActor\(this\.gameState\);/);
});

test('tutorial step ids, ordering, expected inputs, and controller-facing metadata remain stable', () => {
  assert.deepEqual(TUTORIAL_STEPS.map((step) => step.id), [
    'intro_01',
    'intro_02',
    'intro_03',
    'intro_04',
    'bases_goal',
    'hand_lanes',
    'deck_counter_open',
    'battle_history',
    'battle_menu_open',
    'battle_menu_contents',
    'mulligan_intro',
    'inspect_card',
    'mulligan_select',
    'mulligan_confirm',
    'play_unit_a',
    'enemy_action',
    'combat_after_actions',
    'play_unit_b',
    'adjacent_swap',
    'redeploy',
    'effect_card',
    'empty_lane',
    'final_pass',
  ]);

  const playUnitA = TUTORIAL_STEPS.find((step) => step.id === 'play_unit_a');
  assert.deepEqual(playUnitA.expected, { type: 'play_card_to_slot', cardId: 'tutorial_unit_a_1', slotIndex: 6 });
  assert.deepEqual(playUnitA.highlightTarget, { type: 'hand_card', cardId: 'tutorial_unit_a_1' });
  assert.equal(playUnitA.phase, 'gameplay');
});

test('achievement and statistic definitions remain battle/card/time based, not turn based', () => {
  assert.match(achievementsSource, /general\.active_battle_time_15_minutes/);
  assert.match(achievementsSource, /cards\.play_first_unit/);
  assert.match(achievementsSource, /arena\.play_first_battle/);
  assert.doesNotMatch(achievementsSource, /turnsCompleted|Turns survived|Turns played|turns survived|turns played/);
  assert.match(playerStatsSource, /'activeBattleTimeMs'/);
  assert.match(playerStatsSource, /'unitsPlayed'/);
  assert.match(playerStatsSource, /'effectsPlayed'/);
  assert.doesNotMatch(playerStatsSource, /turnsCompleted|turnsSurvived|turnsPlayed/);
});

test('layout and animation code paths are untouched by terminology copy regression coverage', () => {
  assert.match(rulesPanelSource, /const bodyFontSize = Math\.max\(14, Math\.floor\(panelWidth \* 0\.038\)\);/);
  assert.match(battleSceneSource, /playCombatAnimations\(combatEvents, preCombatFeedbackSnapshot\.board\)/);
  assert.match(battleSceneSource, /calculateTutorialBannerLayout\(this\.layout\)/);
});
