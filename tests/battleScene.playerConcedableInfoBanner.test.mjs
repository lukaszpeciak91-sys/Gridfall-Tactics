import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('player concedable info banner is informational-only and uses localization key', () => {
  const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
  assert.match(source, /showPlayerConcedableInfoBanner\(\)\s*\{\s*this\.showPlayerActionBanner\(translateActive\('ui\.battle\.playerNoMeaningfulActionsDetected'/);
  assert.doesNotMatch(source, /winner = 'enemy';\s*[\s\S]*playerNoMeaningfulActionsDetected/);
});

test('pass flow remains unchanged and still records pass then completes player action', () => {
  const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
  assert.match(source, /resolvePassTurn\(\)/);
  assert.match(source, /recordPassAction\(this\.gameState, 'player'\);/);
  assert.match(source, /this\.completePlayerAction\(\);/);
});
