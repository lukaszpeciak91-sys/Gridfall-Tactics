import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('player concedable info banner is informational-only and uses localization key', () => {
  const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
  const fn = source.match(/showPlayerConcedableInfoBanner\(\)\s*\{[\s\S]*?\n  \}/)?.[0] ?? '';
  assert.match(fn, /this\.showPlayerActionBanner\(translateActive\('ui\.battle\.playerNoMeaningfulActionsDetected'/);
  assert.doesNotMatch(fn, /winner = 'enemy'/);
});

test('pass flow remains unchanged and still records pass then completes player action', () => {
  const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
  assert.match(source, /resolvePassTurn\(\)/);
  assert.match(source, /recordPassAction\(this\.gameState, 'player'\);/);
  assert.match(source, /this\.completePlayerAction\(\);/);
});

test('pass hold-to-surrender keeps the dedicated 425ms hold threshold and from the player base when base PASS remains eligible', () => {
  const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
  assert.match(source, /onPlayerBasePointerDown\(event\) \{[\s\S]*this\.passHoldToSurrenderEvent = this\.time\.delayedCall\(PASS_HOLD_TO_SURRENDER_MS,/);
  assert.match(source, /canPlayerBaseHoldToSurrender\(\) \{\s*return this\.isBasePassAvailable\(\) && this\.canHoldPassToSurrender\(\);\s*\}/);
  assert.match(source, /canHoldPassToSurrender\(\)\s*\{[\s\S]*isVerySafeConcedableState\(this\.gameState, 'player'\)/);
});

test('pass hold-to-surrender release early cancels and successful hold routes to enemy winner reason without combat', () => {
  const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
  assert.match(source, /onPlayerBasePointerCancel\(event\)\s*\{\s*event\?\.stopPropagation\?\.\(\);\s*this\.cancelPassHoldToSurrender\(\);\s*this\.disarmPlayerSurrender\(\);\s*\}/);
  assert.match(source, /this\.armPlayerSurrender\(\);/);
  assert.match(source, /if \(!this\.passHoldToSurrenderProgress \|\| !this\.passHoldToSurrenderEnabled[\s\S]*return;/);
  assert.match(source, /resolvePlayerHoldToSurrender\(\)\s*\{[\s\S]*this\.gameState\.winner = 'enemy';[\s\S]*this\.gameState\.endingReason = 'player_hold_surrender';[\s\S]*this\.completeBattleFlow\(0\);/);
  const fn = source.match(/resolvePlayerHoldToSurrender\(\)\s*\{[\s\S]*?\n  \}/)?.[0] ?? '';
  assert.doesNotMatch(fn, /resolveCombat\(/);
});
