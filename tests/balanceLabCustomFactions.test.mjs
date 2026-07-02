import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import aggro from '../src/data/factions/aggro.json' with { type: 'json' };

function customFaction(id, name) {
  return {
    id,
    name,
    frameImage: 'frame_default',
    deck: aggro.deck.map((card, index) => ({
      ...structuredClone(card),
      id: `${id}_card_${index + 1}`,
      name: `${name} ${index + 1}`,
      artAssetId: card.artAssetId ?? 'aggro_01',
    })),
  };
}

function writeExperiment(experiment) {
  const dir = mkdtempSync(join(tmpdir(), 'gridfall-balance-lab-'));
  const path = join(dir, 'experiment.json');
  writeFileSync(path, JSON.stringify(experiment), 'utf8');
  return path;
}

function runExperiment(experiment, args = ['--total=1']) {
  const path = writeExperiment(experiment);
  return execFileSync('node', ['scripts/simulate-battles.mjs', `--experiment=${path}`, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function runExperimentError(experiment) {
  const path = writeExperiment(experiment);
  assert.throws(
    () => execFileSync('node', ['scripts/simulate-battles.mjs', '--total=1', `--experiment=${path}`], { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }),
    (error) => error.stderr.includes('Invalid customFactions experiment'),
  );
}

test('Balance Lab accepts one temporary custom faction and includes it in reports', () => {
  const output = runExperiment({ name: 'one-custom', customFactions: [customFaction('candidate-one', 'Candidate One')], telemetry: 'all' });
  assert.match(output, /Production factions: 6/);
  assert.match(output, /Custom factions: 1/);
  assert.match(output, /Total simulated factions: 7/);
  assert.match(output, /candidate-one.*Candidate One/);
  assert.match(output, /candidate-one_card_1/);
  assert.match(output, /Balance audit: aggregate faction table/);
  assert.match(output, /candidate-one/);
  assert.match(output, /Balance audit: combined matchup table across both seats/);
  assert.match(output, /Campaign Intelligence \(estimate based on the current simulated faction set, not a true campaign simulator\)/);
  assert.match(output, /Simulator telemetry: per-card summary/);
});

test('Balance Lab accepts two custom factions and runs the expanded full matrix', () => {
  const output = runExperiment({ matchCount: 1, customFactions: [customFaction('candidate-a', 'Candidate A'), customFaction('candidate-b', 'Candidate B')] }, []);
  assert.match(output, /Custom factions: 2/);
  assert.match(output, /Total simulated factions: 8/);
  assert.match(output, /Simulated faction matrix: 8 factions, 64 ordered matchups\./);
  assert.match(output, /candidate-a/);
  assert.match(output, /candidate-b/);
});

test('campaign estimate handles more than six factions', () => {
  const output = runExperiment({ customFactions: [customFaction('candidate-campaign-a', 'Candidate Campaign A'), customFaction('candidate-campaign-b', 'Candidate Campaign B')], telemetry: 'cards' });
  assert.match(output, /Campaign Intelligence \(estimate based on the current simulated faction set, not a true campaign simulator\)/);
  assert.match(output, /candidate-campaign-a/);
  assert.match(output, /candidate-campaign-b/);
});

test('custom faction validation rejects duplicate and production-colliding ids', () => {
  runExperimentError({ customFactions: [customFaction('dupe-faction', 'Dupe A'), customFaction('dupe-faction', 'Dupe B')] });
  runExperimentError({ customFactions: [customFaction('Aggro', 'Bad Aggro')] });
  runExperimentError({ customFactions: [customFaction('aggro', 'Bad Aggro Id')] });
});

test('custom faction validation rejects malformed decks and unsupported simulator features', () => {
  const nineCards = customFaction('nine-card-candidate', 'Nine Card Candidate');
  nineCards.deck = nineCards.deck.slice(0, 9);
  runExperimentError({ customFactions: [nineCards] });

  const unknownEffect = customFaction('unknown-effect-candidate', 'Unknown Effect Candidate');
  unknownEffect.deck[0].effectId = 'brand_new_effect';
  runExperimentError({ customFactions: [unknownEffect] });

  const unsupportedTargeting = customFaction('bad-targeting-candidate', 'Bad Targeting Candidate');
  unsupportedTargeting.deck[0].targeting = 'brand_new_targeting';
  runExperimentError({ customFactions: [unsupportedTargeting] });
});

test('existing current-deck and replaceCard experiment runs still work', () => {
  const currentOutput = execFileSync('node', ['scripts/simulate-battles.mjs', '--total=1'], { cwd: process.cwd(), encoding: 'utf8' });
  assert.match(currentOutput, /Battle simulation complete \(1 total games/);

  const replacement = { ...structuredClone(aggro.deck[0]), id: 'aggro_runner_replacement_test', name: 'Runner Replacement Test' };
  const replaceOutput = runExperiment({
    changes: [{ type: 'replaceCard', factionKey: 'Aggro', cardId: 'aggro_runner_1', card: replacement }],
  });
  assert.match(replaceOutput, /Battle simulation complete \(1 total games/);
});
