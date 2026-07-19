import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

test('opening reveal diagnostic is hidden until confirmed failure and writes only one bounded snapshot', () => {
  assert.match(source, /OPENING_REVEAL_DIAG_STORAGE_KEY = 'gridfall:tactics:debug:opening-reveal:last-failure:v1'/);
  assert.match(source, /OPENING_REVEAL_DIAG_BUFFER_LIMIT = 64/);
  assert.match(source, /if \(this\.openingRevealDiagFailureCaptured \|\| !this\.isOpeningRevealDiagnosticFailureState\(\)\) return false;/);
  assert.match(source, /globalThis\.localStorage\?\.setItem\?\.\(OPENING_REVEAL_DIAG_STORAGE_KEY, JSON\.stringify\(snapshot\)\)/);
  assert.match(source, /button\.textContent = 'REVEAL DIAG'/);
  assert.doesNotMatch(source, /showOpeningRevealDiagnosticControl\(\);[\s\S]{0,200}beginOpeningBattlePresentation/);
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

test('storage and copy failures are caught and non-fatal', () => {
  assert.match(source, /try \{ globalThis\.localStorage\?\.setItem[\s\S]*\} catch \(_\) \{\}/);
  assert.match(source, /try \{ return JSON\.parse\(globalThis\.localStorage\?\.getItem[\s\S]*\} catch \(_\) \{ return null; \}/);
  assert.match(source, /copy\.onclick = async \(\) => \{ try \{ await globalThis\.navigator\?\.clipboard\?\.writeText\?\.\(pre\.textContent\); \} catch \(_\) \{\} \};/);
});

test('force reveal uses reconciliation path and cleanup removes diagnostic DOM/timers/listeners', () => {
  assert.match(source, /force\.textContent = 'FORCE REVEAL'/);
  assert.match(source, /this\.reconcileOpeningMulliganPresentation\(\{ reason: 'diagnostic-force-reveal' \}\)/);
  assert.match(source, /this\.openingRevealDiagFailureTimer\?\.remove\?\.\(false\)/);
  assert.match(source, /this\.openingRevealDiagButton\?\.remove\?\.\(\)/);
  assert.match(source, /this\.openingRevealDiagOverlay\?\.remove\?\.\(\)/);
  assert.match(source, /removeEventListener\?\.\(name, fn\)/);
  assert.match(source, /shutdown\(\) \{[\s\S]*this\.destroyOpeningRevealDiagnosticObjects\(\);/);
  assert.match(source, /retryBattle\(\) \{\n    this\.destroyOpeningRevealDiagnosticObjects\(\);/);
});

test('diagnostic delay is beyond normal reveal path and reveal constants are unchanged', () => {
  assert.match(source, /OPENING_REVEAL_DIAG_FAILURE_DELAY_MS = 2800/);
  assert.match(source, /const delay = index \* OPENING_MULLIGAN_REVEAL_STAGGER_MS/);
  assert.match(source, /Math\.round\(OPENING_MULLIGAN_REVEAL_CARD_MS \/ 2\)/);
  assert.match(source, /OPENING_MULLIGAN_REVEAL_POST_HOLD_MS/);
  assert.match(source, /OPENING_MULLIGAN_REVEAL_WATCHDOG_MS/);
});
