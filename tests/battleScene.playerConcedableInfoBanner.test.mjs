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

test('pass hold-to-surrender uses hand-card long-press threshold and only when concedable hint is active', () => {
  const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
  assert.match(source, /this\.passHoldToSurrenderEvent = this\.time\.delayedCall\(HAND_CARD_LONG_PRESS_MS,/);
  assert.match(source, /this\.passHoldToSurrenderEnabled = passAvailable && playerConcedable;/);
  assert.match(source, /canHoldPassToSurrender\(\)\s*\{[\s\S]*isVerySafeConcedableState\(this\.gameState, 'player'\)/);
});

test('pass hold-to-surrender release early cancels and successful hold routes to enemy winner reason without combat', () => {
  const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
  assert.match(source, /onActionButtonPointerCancel\(\)\s*\{\s*this\.cancelPassHoldToSurrender\(\);\s*\}/);
  assert.match(source, /resolvePlayerHoldToSurrender\(\)\s*\{[\s\S]*this\.gameState\.winner = 'enemy';[\s\S]*this\.gameState\.endingReason = 'player_hold_surrender';[\s\S]*this\.completeBattleFlow\(0\);/);
  const fn = source.match(/resolvePlayerHoldToSurrender\(\)\s*\{[\s\S]*?\n  \}/)?.[0] ?? '';
  assert.doesNotMatch(fn, /resolveCombat\(/);
});
