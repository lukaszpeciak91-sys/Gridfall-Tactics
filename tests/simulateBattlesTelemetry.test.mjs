import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

function runSimulator(args) {
  return execFileSync(process.execPath, ['scripts/simulate-battles.mjs', ...args], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 8,
  });
}

test('simulator telemetry modes work with ordered matchup filtering', () => {
  const output = runSimulator(['1', '--only=Aggro:Aggro', '--telemetry=basic,cards,ai']);

  assert.match(output, /filtered to 1 ordered matchup/);
  assert.match(output, /Simulator telemetry: per-faction summary/);
  assert.match(output, /PASS count/);
  assert.match(output, /avg hand at defeat/);
  assert.match(output, /Simulator telemetry: game-end summary/);
  assert.match(output, /hero defeated/);
  assert.match(output, /resource exhaustion/);
  assert.match(output, /Simulator telemetry: per-card summary/);
  assert.match(output, /held at defeat/);
  assert.match(output, /avg turn played/);
  assert.match(output, /WR When Drawn/);
  assert.match(output, /WR When Played/);
  assert.match(output, /Draw Impact/);
  assert.match(output, /Play Impact/);
  assert.match(output, /Top 10 Draw Impact/);
  assert.match(output, /Worst 10 Play Impact/);
  assert.match(output, /Simulator telemetry: AI health/);
  assert.match(output, /invalid actions/);
  assert.match(output, /turn-cap rate/);
});

test('default simulator output does not include optional simulator telemetry sections', () => {
  const output = runSimulator(['1', '--only=Aggro:Aggro']);

  assert.match(output, /Battle simulation complete/);
  assert.match(output, /HAND LOCK ANALYSIS/);
  assert.match(output, /Full hand events/);
  assert.match(output, /Burn-eligible opportunities/);
  assert.match(output, /True hand-lock events/);
  assert.match(output, /Lock streaks/);
  assert.match(output, /Remaining deck during burn-eligible states/);
  assert.match(output, /Faction hand-lock statistics/);
  assert.match(output, /Cards most frequently present during true hand-lock states/);
  assert.match(output, /Example traces/);
  assert.match(output, /Recommendation/);
  assert.doesNotMatch(output, /Simulator telemetry: per-faction summary/);
  assert.doesNotMatch(output, /Simulator telemetry: per-card summary/);
  assert.doesNotMatch(output, /Simulator telemetry: AI health/);
  assert.doesNotMatch(output, /AI Decision Audit/);
});

test('AI decision audit is opt-in, capped, and summarizes choices', () => {
  const output = runSimulator(['3', '--only=Overclock:Aggro', '--ai-audit=3']);
  const sampleHeaders = output.match(/^#\d+ /gm) ?? [];

  assert.match(output, /AI Decision Audit \(3 sampled decisions\)/);
  assert.equal(sampleHeaders.length, 3);
  assert.match(output, /Chosen:/);
  assert.match(output, /Next best:\n\s+1\)/);
  assert.match(output, /Why:/);
});
