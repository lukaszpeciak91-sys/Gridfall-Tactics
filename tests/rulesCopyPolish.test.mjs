import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import en from '../src/localization/translations/en.json' with { type: 'json' };
import pl from '../src/localization/translations/pl.json' with { type: 'json' };

const rulesSource = fs.readFileSync('src/scenes/RulesPanelScene.js', 'utf8');
const battleSource = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
const gameMenuSource = fs.readFileSync('src/scenes/GameMenuScene.js', 'utf8');
const canonicalRules = fs.readFileSync('docs/rules/mvp-battle-rules.md', 'utf8');

const enSections = en.ui.rules.sections;
const plSections = pl.ui.rules.sections;
const text = (section) => section.lines.join(' ');
const enByHeading = Object.fromEntries(enSections.map((section) => [section.heading, text(section)]));
const plByHeading = Object.fromEntries(plSections.map((section) => [section.heading, text(section)]));

test('question-mark and BattleScene Rules still route to the same RulesPanelScene', () => {
  assert.match(gameMenuSource, /onRules: \(\) => this\.openRulesPanel\(\)/);
  assert.match(gameMenuSource, /this\.scene\.launch\('RulesPanelScene', \{ returnSceneKey: 'GameMenuScene' \}\)/);
  assert.match(battleSource, /id: 'rules'[\s\S]*onClick: \(\) => this\.openRulesPanel\(\)/);
  assert.match(battleSource, /this\.scene\.launch\('RulesPanelScene', this\.getBattleRulesPanelLaunchData\(\)\)/);
});

test('English and Polish Rules sections keep matching order, counts, and line counts', () => {
  assert.equal(enSections.length, plSections.length);
  assert.deepEqual(enSections.map((section) => section.lines.length), plSections.map((section) => section.lines.length));
  assert.deepEqual(enSections.map((section) => section.heading), [
    'Icon Glossary',
    'Goal',
    'Deck',
    'Alternating Initiative',
    'Board',
    'Playing Cards',
    'Unit Swap',
    'PASS',
    'Battle Exhausted',
  ]);
  assert.deepEqual(plSections.map((section) => section.heading), [
    'Słownik ikon',
    'Cel gry',
    'Talia',
    'Naprzemienna inicjatywa',
    'Plansza',
    'Zagrywanie kart',
    'Zamiana jednostek',
    'PASS',
    'Wyczerpana bitwa',
  ]);
});

test('Goal and Deck Rules cover base HP, simultaneous lethal draw, and mulligan essentials', () => {
  assert.match(enByHeading.Goal, /12 HP/);
  assert.match(enByHeading.Goal, /both Bases are destroyed during the same combat resolution.*draw/i);
  assert.match(plByHeading['Cel gry'], /12 HP/);
  assert.match(plByHeading['Cel gry'], /obie Bazy.*tego samego rozliczenia walki.*remisem/i);

  assert.match(enByHeading.Deck, /10-card deck/);
  assert.match(enByHeading.Deck, /4-card opening hand/);
  assert.match(enByHeading.Deck, /replace up to 2 cards/);
  assert.match(enByHeading.Deck, /same number/);
  assert.match(enByHeading.Deck, /does not use/);
  assert.match(plByHeading.Talia, /10 kart/);
  assert.match(plByHeading.Talia, /4 karty startowe/);
  assert.match(plByHeading.Talia, /wymienić do 2 kart/);
});

test('action, board, PASS, and unit replacement Rules cover core player actions', () => {
  assert.match(enByHeading['Alternating Initiative'], /one action/);
  for (const phrase of ['unit', 'effect', 'replace a unit', 'swap', 'PASS']) {
    assert.match(enByHeading['Alternating Initiative'], new RegExp(phrase, 'i'));
  }
  assert.match(enByHeading.Board, /three combat lanes/);
  assert.match(enByHeading.Board, /one unit slot in each lane/);
  assert.match(enByHeading.Board, /open lane damages the Base/);
  assert.match(plByHeading.Plansza, /trzy linie walki/);
  assert.match(plByHeading.Plansza, /własnych pól/);
  assert.match(plByHeading.Plansza, /otwarta linia zadaje obrażenia Bazie/);
  assert.match(enByHeading['Playing Cards'], /replace your board unit by playing a unit from hand onto its slot/);
  assert.match(enByHeading['Playing Cards'], /replaced unit returns to your hand/);
  assert.match(enByHeading['Playing Cards'], /no room in hand/);
  assert.match(plByHeading['Zagrywanie kart'], /zastąpić własną jednostkę/);
  assert.match(plByHeading['Zagrywanie kart'], /wraca do twojej ręki/);
  assert.match(plByHeading['Zagrywanie kart'], /nie ma na nią miejsca/);
  assert.match(enByHeading.PASS, /uses your action/);
  assert.match(plByHeading.PASS, /zużywa twoją akcję/);
  assert.match(enByHeading.PASS, /combat resolves/);
});

test('Battle Exhausted Rules match runtime behavior in localization, fallback, and canonical docs', () => {
  const exhausted = enByHeading['Battle Exhausted'];
  assert.match(exhausted, /Base has 3 HP or less/);
  assert.match(exhausted, /two full PASS rounds/);
  assert.match(exhausted, /progress resets this count/);
  assert.match(exhausted, /more remaining Base HP wins/);
  assert.match(exhausted, /equal Base HP.*draw/);

  assert.match(plByHeading['Wyczerpana bitwa'], /3 HP lub mniej/);
  assert.match(plByHeading['Wyczerpana bitwa'], /dwóch pełnych rund PASS/);
  assert.match(plByHeading['Wyczerpana bitwa'], /zeruje ten licznik/);

  assert.match(rulesSource, /Can happen only when at least one Base has 3 HP or less/);
  assert.match(rulesSource, /replace your board unit by playing a unit from hand onto its slot/);
  assert.match(rulesSource, /both Bases are destroyed during the same combat resolution/);
  assert.doesNotMatch(rulesSource, /Exhausted late battles may be decided/);

  assert.match(canonicalRules, /at least one base is at \*\*3 HP or less\*\*/);
  assert.match(canonicalRules, /two complete PASS rounds/);
  assert.match(canonicalRules, /meaningful gameplay progress resets/i);
  assert.match(canonicalRules, /Higher base HP wins; equal base HP is a \*\*draw\*\*/);
  assert.doesNotMatch(canonicalRules, /There is no repeated-PASS or 3-pass stall counter/);
});

test('Rules copy avoids rejected player-facing terminology', () => {
  const enRulesText = enSections.flatMap((section) => [section.heading, ...section.lines]).join(' ');
  const plRulesText = plSections.flatMap((section) => [section.heading, ...section.lines]).join(' ');

  assert.doesNotMatch(enRulesText, /redeploy|action opportunity|first actor/i);
  assert.doesNotMatch(plRulesText, /redeploy|sloty?|okazja do akcji|Mulligan/i);
  assert.doesNotMatch(rulesSource, /redeploy|action opportunity|first actor/i);
});
