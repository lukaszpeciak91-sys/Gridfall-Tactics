import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

test('opening reveal diagnostic is hidden until confirmed failure and writes only one bounded snapshot', () => {
  assert.match(source, /OPENING_REVEAL_DIAG_STORAGE_KEY = 'gridfall:tactics:debug:opening-reveal:last-failure:v1'/);
  assert.match(source, /OPENING_REVEAL_DIAG_BUFFER_LIMIT = 64/);
  assert.match(source, /if \(this\.openingRevealDiagFailureCaptured \|\| !this\.isOpeningRevealDiagnosticFailureState\(options\)\) return false;/);
  assert.match(source, /globalThis\.localStorage\?\.setItem\?\.\(OPENING_REVEAL_DIAG_STORAGE_KEY, JSON\.stringify\(snapshot\)\)/);
  assert.doesNotMatch(source, /textContent = 'REVEAL DIAG'/);
  assert.doesNotMatch(source, /showOpeningRevealDiagnosticControl\(\)/);
});

test('failure snapshot contains flags, generation, controller summary, counts, slot visual state, and lifecycle timeline only', () => {
  assert.match(source, /flags: this\.getOpeningRevealDiagnosticSnapshotFields\(\)/);
  assert.match(source, /openingMulliganRevealGeneration: this\.openingMulliganRevealGeneration/);
  assert.match(source, /controllerCount: controllerTypes\.length,[\s\S]*controllerTypes/);
  assert.match(source, /handCount: this\.gameState\?\.player\?\.hand\?\.length/);
  assert.match(source, /cardViewCount: this\.cardViews\?\.length/);
  assert.match(source, /slots: fronts\.map\(\(front\) => \(\{[\s\S]*cardId: front\.expectedCard\?\.id[\s\S]*visible: front\.visible[\s\S]*alpha: front\.alpha[\s\S]*scaleX: front\.scaleX[\s\S]*interactive: front\.interactive/);
  assert.match(source, /events: \[\.\.\.\(this\.openingRevealDiagEvents \?\? \[\]\)\]/);
  assert.doesNotMatch(source, /deck: this\.gameState|gameState: this\.gameState|playerSave|campaign: this\.gameState/);
});

test('storage failures are caught and non-fatal', () => {
  assert.match(source, /try \{ globalThis\.localStorage\?\.setItem[\s\S]*\} catch \(_\) \{\}/);
  assert.match(source, /try \{ return JSON\.parse\(globalThis\.localStorage\?\.getItem[\s\S]*\} catch \(_\) \{ return null; \}/);
});

test('cleanup removes diagnostic timers/listeners without floating diagnostic DOM', () => {
  assert.match(source, /this\.openingRevealDiagFailureTimer\?\.remove\?\.\(false\)/);
  assert.match(source, /this\.openingRevealDiagFallbackTimer\?\.remove\?\.\(false\)/);
  assert.match(source, /this\.openingRevealDiagButton\?\.remove\?\.\(\)/);
  assert.match(source, /this\.openingRevealDiagOverlay\?\.remove\?\.\(\)/);
  assert.match(source, /removeEventListener\?\.\(name, fn\)/);
  assert.match(source, /shutdown\(\) \{[\s\S]*this\.destroyOpeningRevealDiagnosticObjects\(\);/);
  assert.match(source, /retryBattle\(\) \{\n    this\.destroyOpeningRevealDiagnosticObjects\(\);/);
});

test('diagnostic delay is beyond normal reveal path and reveal constants are unchanged', () => {
  assert.match(source, /OPENING_REVEAL_DIAG_FAILURE_DELAY_MS = 2800/);
  assert.match(source, /OPENING_REVEAL_DIAG_FALLBACK_DELAY_MS = 3800/);
  assert.match(source, /const delay = index \* OPENING_MULLIGAN_REVEAL_STAGGER_MS/);
  assert.match(source, /Math\.round\(OPENING_MULLIGAN_REVEAL_CARD_MS \/ 2\)/);
  assert.match(source, /OPENING_MULLIGAN_REVEAL_POST_HOLD_MS/);
  assert.match(source, /OPENING_MULLIGAN_REVEAL_WATCHDOG_MS/);
});

test('independent fallback detects reveal never scheduled from opening hand visuals', () => {
  assert.match(source, /scheduleOpeningRevealDiagnosticFallbackCheck\('opening-hand-visuals-ready'\)/);
  assert.match(source, /fallback-check-scheduled/);
  assert.match(source, /checkOpeningRevealDiagnosticFailure\('opening-hand-fallback-delay', \{ visualStateWins: true \}\)/);
  assert.match(source, /const revealNeverScheduled = !this\.hasOpeningRevealDiagEvent\('reveal-scheduling-succeeded'\)/);
});

test('scheduled but frozen before first callback is detected', () => {
  assert.match(source, /reveal-scheduling-succeeded/);
  assert.match(source, /first-reveal-timer-created/);
  assert.match(source, /const revealNeverStarted = !this\.hasOpeningRevealDiagEvent\('first-reveal-callback-executed'\)/);
  assert.match(source, /\|\| revealNeverStarted/);
});

test('reveal controllers existing forever still produces reveal diag under fallback', () => {
  assert.match(source, /controllerTypes\.length > 0 && !this\.hasOpeningRevealDiagEvent\('first-reveal-visible-count-increment'\)/);
  assert.doesNotMatch(source, /showOpeningRevealDiagnosticControl\(\)/);
});

test('retained backs and hidden fronts force failure detection because visual state wins', () => {
  assert.match(source, /const visualFailure = revealCount <= 0 \|\| invalidFrontCount > 0 \|\| retainedBacks\.length > 0/);
  assert.match(source, /if \(visualStateWins\) \{[\s\S]*return visualFailure/);
});

test('missing reveal sfx is reflected in diagnostic timeline and snapshot flags', () => {
  assert.match(source, /first-reveal-sfx-requested/);
  assert.match(source, /reveal-sfx-dispatched/);
  assert.match(source, /revealSfxPathReached: this\.hasOpeningRevealDiagEvent\?\.\('first-reveal-sfx-requested'\)/);
  assert.match(source, /revealSfxDispatchCalled: this\.hasOpeningRevealDiagEvent\?\.\('reveal-sfx-dispatched'\)/);
  assert.match(source, /firstRevealSfxRequestedAt: this\.openingRevealDiagFirstSfxRequestedAt/);
});
