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
  assert.match(output, /Simulator telemetry: AI health/);
  assert.match(output, /invalid actions/);
  assert.match(output, /turn-cap rate/);
});

test('default simulator output does not include optional simulator telemetry sections', () => {
  const output = runSimulator(['1', '--only=Aggro:Aggro']);

  assert.match(output, /Battle simulation complete/);
  assert.doesNotMatch(output, /Simulator telemetry: per-faction summary/);
  assert.doesNotMatch(output, /Simulator telemetry: per-card summary/);
  assert.doesNotMatch(output, /Simulator telemetry: AI health/);
});
