import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const maybeBattleExhaustedGuard = String.raw`(?:if \(!isBattleExhaustedEligible\([^)]*\)\)\s*)?`;
const stableBoundaryPattern = new RegExp(String.raw`resolveImmediateResourceExhaustionWinner\([^)]*\);\s*${maybeBattleExhaustedGuard}(?:resolveImmediateNoProgressWinner|resolveNoProgressDeadlockWinner)\([^)]*\);`);
const postDrawPattern = new RegExp(String.raw`drawCards\([^,]+, 1\);\s*drawCards\([^,]+, 1\);\s*resolveImmediateResourceExhaustionWinner\([^)]*\);\s*${maybeBattleExhaustedGuard}(?:resolveImmediateNoProgressWinner|resolveNoProgressDeadlockWinner)\([^)]*\);\s*resolveTurnCapWinner\(`);

test('live battle and simulation runners import shared MAX_TURNS where a turn cap is used', () => {
  assert.match(read('src/systems/GameState.js'), /export const MAX_TURNS = 24;/);
  for (const path of [
    'scripts/simulate-battles.mjs',
    'scripts/generate-mvp-balance-report.mjs',
    'scripts/sanity-20x4-ai-coverage.mjs',
  ]) {
    const source = read(path);
    assert.match(source, /MAX_TURNS,[\s\S]*from '\.\.\/src\/systems\/GameState\.js';/, path);
    assert.match(source, /while \(!state\.winner && turns < MAX_TURNS\)/, path);
  }
});

test('live battle checks resource exhaustion then no-progress after cleanup and again after both draws before cap', () => {
  const source = read('src/scenes/BattleScene.js');
  assert.match(source, stableBoundaryPattern);
  assert.match(source, postDrawPattern);
});

test('simulation runners include post-draw resource exhaustion and no-progress checks before turn cap', () => {
  for (const path of [
    'scripts/simulate-battles.mjs',
    'scripts/generate-mvp-balance-report.mjs',
    'scripts/sanity-20x4-ai-coverage.mjs',
  ]) {
    assert.match(read(path), postDrawPattern, path);
  }
});
