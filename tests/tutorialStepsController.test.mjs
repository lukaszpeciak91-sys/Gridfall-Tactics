import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TUTORIAL_STEP_IDS, TUTORIAL_STEPS } from '../src/data/tutorial/tutorialSteps.js';
import { createTutorialControllerState, getCurrentTutorialStep, advanceTutorialStep, handleTutorialEvent, isTutorialComplete, isTutorialEventExpected, resetTutorialController } from '../src/systems/tutorialController.js';

const approvedStepIds = [
  'bases_goal',
  'hand_lanes',
  'deck_counter_open',
  'battle_history',
  'battle_menu_open',
  'battle_menu_contents',
  'mulligan_intro',
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
];

test('tutorial step list exists with approved ordered step ids', () => {
  assert.deepEqual(TUTORIAL_STEP_IDS, approvedStepIds);
  assert.deepEqual(TUTORIAL_STEPS.map((step) => step.id), approvedStepIds);
});

test('every tutorial step has PL and EN text plus expected continuation metadata', () => {
  for (const step of TUTORIAL_STEPS) {
    assert.equal(typeof step.text?.pl, 'string', step.id);
    assert.equal(typeof step.text?.en, 'string', step.id);
    assert.ok(step.text.pl.length > 0, step.id);
    assert.ok(step.text.en.length > 0, step.id);
    assert.equal(typeof step.expected?.type, 'string', step.id);
  }
});

test('final_pass tutorial text is exact', () => {
  const step = TUTORIAL_STEPS.find((item) => item.id === 'final_pass');
  assert.equal(step.text.pl, 'Masz dobrą pozycję. Użyj PASS.');
  assert.equal(step.text.en, 'Your position is good. Use PASS.');
});

test('tutorial controller initializes at first step and advances step-by-step', () => {
  const state = createTutorialControllerState();
  assert.equal(getCurrentTutorialStep(state).id, 'bases_goal');

  for (let index = 1; index < TUTORIAL_STEPS.length; index += 1) {
    advanceTutorialStep(state, 'test');
    assert.equal(getCurrentTutorialStep(state).id, approvedStepIds[index]);
  }
});

test('tutorial controller reports completion after final step', () => {
  const state = createTutorialControllerState();
  for (let index = 0; index < TUTORIAL_STEPS.length; index += 1) {
    assert.equal(isTutorialComplete(state), false);
    advanceTutorialStep(state, 'test');
  }
  assert.equal(isTutorialComplete(state), true);
  assert.equal(getCurrentTutorialStep(state), null);
});

test('tutorial controller validates matching and rejects non-matching events', () => {
  const state = createTutorialControllerState();
  advanceTutorialStep(state, 'skip bases_goal');
  advanceTutorialStep(state, 'skip hand_lanes');

  assert.equal(getCurrentTutorialStep(state).id, 'deck_counter_open');
  assert.equal(isTutorialEventExpected(state, 'deck_opened'), true);
  assert.equal(isTutorialEventExpected(state, 'battle_menu_opened'), false);

  const rejected = handleTutorialEvent(state, 'battle_menu_opened');
  assert.equal(rejected.matched, false);
  assert.equal(getCurrentTutorialStep(state).id, 'deck_counter_open');

  const accepted = handleTutorialEvent(state, 'deck_opened');
  assert.equal(accepted.matched, true);
  assert.equal(accepted.previousStep.id, 'deck_counter_open');
  assert.equal(getCurrentTutorialStep(state).id, 'battle_history');
});

test('tutorial controller reset returns to first step', () => {
  const state = createTutorialControllerState();
  advanceTutorialStep(state, 'test');
  advanceTutorialStep(state, 'test');
  assert.equal(getCurrentTutorialStep(state).id, 'deck_counter_open');
  resetTutorialController(state);
  assert.equal(getCurrentTutorialStep(state).id, 'bases_goal');
  assert.equal(isTutorialComplete(state), false);
});

test('BattleScene initializes tutorial controller only in tutorial mode and ignores hooks outside tutorial', () => {
  const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

  assert.match(source, /createTutorialControllerState/);
  assert.match(source, /initializeTutorialController\(\) \{[\s\S]*this\.tutorialControllerState = this\.isTutorialBattle\(\) \? createTutorialControllerState\(\) : null;/);
  assert.match(source, /this\.initializeTutorialController\(\);/);
  assert.match(source, /if \(!this\.isTutorialBattle\(\) \|\| !this\.tutorialControllerState\) \{[\s\S]*matched: false/);
  assert.match(source, /this\.handleTutorialEvent\?\.\('deck_opened'\)/);
  assert.match(source, /this\.handleTutorialEvent\?\.\('deck_closed'\)/);
  assert.match(source, /this\.handleTutorialEvent\?\.\('mulligan_card_selected'/);
  assert.match(source, /this\.handleTutorialEvent\?\.\('mulligan_confirmed'/);
  assert.match(source, /eventName: 'adjacent_swap_completed'/);
  assert.match(source, /eventName: result\.type === 'redeploy' \? 'redeploy_completed' : 'unit_played'/);
  assert.match(source, /eventName: 'effect_played'/);
  assert.match(source, /eventName: 'pass_completed'/);
  assert.match(source, /this\.handleTutorialEvent\?\.\('enemy_action_completed'/);
  assert.match(source, /this\.handleTutorialEvent\?\.\('combat_completed'/);
});
