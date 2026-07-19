import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

test('opening mulligan reveal timing matches global hand flip pacing with a post-reveal hold', () => {
  assert.match(source, /OPENING_MULLIGAN_REVEAL_CARD_MS = HAND_CARD_FLIP_REVEAL_DURATION/);
  assert.match(source, /OPENING_MULLIGAN_REVEAL_STAGGER_MS = 120/);
  assert.match(source, /OPENING_MULLIGAN_REVEAL_POST_HOLD_MS = 150/);
  assert.match(source, /OPENING_MULLIGAN_REVEAL_WATCHDOG_MS = 1500/);
});

function extractMethodBody(name, nextName) {
  const methodPattern = new RegExp(`\\n  (?:async )?${name}\\(`);
  const nextPattern = new RegExp(`\\n  (?:async )?${nextName}\\(`, 'g');
  const match = methodPattern.exec(source);
  const start = match?.index ?? -1;
  nextPattern.lastIndex = Math.max(0, start + 1);
  const nextMatch = nextPattern.exec(source);
  const end = nextMatch?.index ?? -1;
  if (start < 0 || end < 0) throw new Error(`Failed to extract ${name}`);
  return source.slice(start, end);
}

test('opening mulligan reveal initializes before mulligan input is exposed', () => {
  const create = extractMethodBody('create', 'selectEnemyFactionKey');
  assert.match(create, /this\.applyEnemyOpeningMulligan\(\);\s*this\.openingMulliganPending = true;\s*this\.openingMulliganRevealPending = true;\s*this\.openingMulliganRevealVisibleCount = 0;/);
  assert.match(create, /this\.drawHand\(\);[\s\S]*this\.updatePlayerBaseActionState\(\);\s*this\.applyOpeningMulliganRevealPresentation\(\);/);
  assert.match(create, /this\.emitBattleVisuallyReady\(\);[\s\S]*if \(!this\.waitForBattleTransitionPresentation\) \{\s*this\.beginOpeningBattlePresentation\(\);\s*\}/);
  assert.doesNotMatch(create, /performOpeningMulligan\(this\.gameState, 'player'/);

  const beginPresentation = extractMethodBody('beginOpeningBattlePresentation', 'isResultModalDiagnosticsEnabled');
  assert.match(beginPresentation, /if \(this\.openingBattlePresentationStarted\) return false;/);
  assert.match(beginPresentation, /this\.waitForBattleTransitionPresentation && battleTransitionLaunchId !== this\.battleTransitionLaunchId/);
  assert.match(beginPresentation, /this\.startOpeningMulliganReveal\(\);\s*this\.updateTutorialBanner\(\);/);

  const lock = extractMethodBody('isOpeningMulliganInputLocked', 'getOpeningMulliganRevealCardCount');
  assert.match(lock, /this\.openingMulliganPending && this\.openingMulliganRevealPending/);

  const getPlayerBaseMode = extractMethodBody('getPlayerBaseMode', 'getPlayerBaseActionLabel');
  assert.match(getPlayerBaseMode, /if \(\(this\.isOpeningMulliganInputLocked\?\.\(\) \?\? false\)\) return null;/);
  assert.match(getPlayerBaseMode, /if \(this\.openingMulliganPending\) return 'mulligan';/);
});

test('opening mulligan reveal blocks selection, inspect, and confirm input', () => {
  const onCardPointerDown = extractMethodBody('onCardPointerDown', 'startHandCardLongPress');
  assert.match(onCardPointerDown, /if \(\(this\.isOpeningMulliganInputLocked\?\.\(\) \?\? false\)\) \{\s*this\.cancelHandCardPressState\(\);\s*return;\s*\}/);

  const startHandCardLongPress = extractMethodBody('startHandCardLongPress', 'cancelHandCardLongPress');
  assert.match(startHandCardLongPress, /if \(\(this\.isOpeningMulliganInputLocked\?\.\(\) \?\? false\)\) return;/);
  assert.match(startHandCardLongPress, /this\.previewedMulliganCardId = cardId;/);

  const onCardPointerUp = extractMethodBody('onCardPointerUp', 'onScenePointerUp');
  assert.match(onCardPointerUp, /if \(\(this\.isOpeningMulliganInputLocked\?\.\(\) \?\? false\)\) \{[\s\S]*this\.cancelHandCardPressState\(\);[\s\S]*return;[\s\S]*\}/);
  assert.match(onCardPointerUp, /this\.toggleOpeningMulliganCard\(cardId, \{ showPreview: false \}\);/);

  const toggleOpeningMulliganCard = extractMethodBody('toggleOpeningMulliganCard', 'confirmOpeningMulligan');
  assert.match(toggleOpeningMulliganCard, /if \(\(this\.isOpeningMulliganInputLocked\?\.\(\) \?\? false\)\) return;/);

  const onPlayerBasePointerUp = extractMethodBody('onPlayerBasePointerUp', 'toggleOpeningMulliganCard');
  assert.match(onPlayerBasePointerUp, /if \(\(this\.isOpeningMulliganInputLocked\?\.\(\) \?\? false\)\) \{[\s\S]*return;[\s\S]*\}/);

  const confirmOpeningMulligan = extractMethodBody('confirmOpeningMulligan', 'resetOpeningMulliganInputState');
  assert.match(confirmOpeningMulligan, /if \(\(this\.isOpeningMulliganInputLocked\?\.\(\) \?\? false\)\) return;/);
  assert.match(confirmOpeningMulligan, /performOpeningMulligan\(this\.gameState, 'player', selectedIds\)/);
});

test('opening mulligan reveal completion unlocks normal mulligan without resolving mulligan', () => {
  const complete = extractMethodBody('completeOpeningMulliganReveal', 'clearHandPanelViews');
  assert.match(complete, /this\.openingMulliganRevealPending = false;/);
  assert.match(complete, /this\.updatePlayerBaseActionState\(\);/);
  assert.match(complete, /this\.resetCardHighlights\(\{ showPreview: false \}\);/);
  assert.doesNotMatch(complete, /performOpeningMulligan|startTurn\(/);

  const confirmOpeningMulligan = extractMethodBody('confirmOpeningMulligan', 'resetOpeningMulliganInputState');
  assert.match(confirmOpeningMulligan, /this\.openingMulliganRevealPending = false;/);
});

test('opening mulligan reveal uses hand backs, sequential timing, and reduced-motion immediate completion', () => {
  const applyPresentation = extractMethodBody('applyOpeningMulliganRevealPresentation', 'startOpeningMulliganReveal');
  assert.match(applyPresentation, /this\.createHandBackCardView\(\{/);
  assert.match(applyPresentation, /cardView\.background\?\.disableInteractive\?\.\(\);/);

  const startReveal = extractMethodBody('startOpeningMulliganReveal', 'revealOpeningMulliganCardSlot');
  assert.match(startReveal, /shouldSkipHandCardFlipReveal\(\)/);
  assert.match(startReveal, /this\.completeOpeningMulliganReveal\(\{ skipAnimation: true \}\);/);
  assert.match(startReveal, /index \* OPENING_MULLIGAN_REVEAL_STAGGER_MS/);
  assert.match(startReveal, /this\.time\.delayedCall\(delay/);
  assert.ok(
    startReveal.indexOf('this.time.delayedCall(delay') < startReveal.indexOf('this.scheduleOpeningMulliganRevealWatchdog({ generation, revealCount });'),
    'watchdog should be scheduled only after normal per-card reveal timers',
  );

  const revealSlot = extractMethodBody('revealOpeningMulliganCardSlot', 'completeOpeningMulliganReveal');
  assert.match(revealSlot, /Math\.round\(OPENING_MULLIGAN_REVEAL_CARD_MS \/ 2\)/);
  assert.match(revealSlot, /const playRevealSfx = \(\) => \{[\s\S]*this\.playBattleSfx\(AUDIO_KEYS\.CARD_DRAW, \{ cooldownMs: 0 \}\);[\s\S]*\};/);
  assert.match(revealSlot, /onComplete: \(\) => \{[\s\S]*?playRevealSfx\(\);[\s\S]*?backCard\.destroy\?\.\(\);[\s\S]*?const expandTween = this\.tweens\.add/);
  assert.match(revealSlot, /if \(!backCard \|\| typeof this\.tweens\?\.add !== 'function'\) \{\s*playRevealSfx\(\);\s*finishSlot\(\);/);
  assert.match(revealSlot, /this\.time\.delayedCall\(OPENING_MULLIGAN_REVEAL_POST_HOLD_MS/);
  assert.match(revealSlot, /type: 'opening-reveal-post-hold'/);
});

test('lifecycle recovery completes then reconciles opening reveal before mulligan redraw/rebuild', () => {
  const recover = extractMethodBody('recoverFromLifecycle', 'shouldRebuildBattleView');
  assert.match(recover, /if \(this\.openingMulliganRevealPending\) \{\s*this\.completeOpeningMulliganReveal\(\{ skipAnimation: true, redraw: false \}\);\s*\}\s*this\.normalizeLifecycleUiState\(reason\);\s*this\.reconcileOpeningMulliganPresentation\(\{ reason: `lifecycle:\$\{reason\}` \}\);/);
  assert.doesNotMatch(recover, /performOpeningMulligan\(this\.gameState, 'player'/);
});


test('opening mulligan reconciliation helper repairs only visual presentation state', () => {
  const reconcile = extractMethodBody('reconcileOpeningMulliganPresentation', 'applyOpeningMulliganRevealPresentation');

  assert.match(reconcile, /if \(this\.openingMulliganPending !== true\) return false;/);
  assert.match(reconcile, /const hand = this\.gameState\?\.player\?\.hand \?\? \[\];/);
  assert.match(reconcile, /const revealCount = this\.getOpeningMulliganRevealCardCount\(\);/);
  assert.match(reconcile, /const controllerTypes = this\.getOpeningMulliganRevealControllerSummary\(\);/);
  assert.match(reconcile, /const retainedBacks = this\.getOpeningMulliganRetainedBackControllers\(\);/);
  assert.match(reconcile, /const fronts = this\.getOpeningMulliganFrontState\(revealCount\);/);
  assert.match(reconcile, /this\.cleanupOpeningMulliganRevealControllers\(\);/);
  assert.match(reconcile, /this\.selectedMulliganCardIds = this\.selectedMulliganCardIds\.filter\(\(cardId\) => liveHandIds\.has\(cardId\)\);/);
  assert.match(reconcile, /this\.drawHand\(\);/);
  assert.match(reconcile, /this\.openingMulliganRevealPending = false;/);
  assert.match(reconcile, /this\.openingMulliganRevealVisibleCount = revealCount;/);
  assert.match(reconcile, /this\.normalizeOpeningMulliganFronts\(\);/);
  assert.match(reconcile, /this\.updatePlayerBaseActionState\(\);/);
  assert.match(reconcile, /this\.resetCardHighlights\(\{ showPreview: false \}\);/);
  assert.match(reconcile, /console\.warn\('Opening mulligan presentation reconciled', \{[\s\S]*reason,[\s\S]*revealPending:[\s\S]*generation:[\s\S]*handCount:[\s\S]*cardViewCount:[\s\S]*controllerCount:[\s\S]*controllerTypes,[\s\S]*retainedBackCount:[\s\S]*invalidFrontCount,[\s\S]*sceneActive:[\s\S]*scenePaused:/);
  assert.doesNotMatch(reconcile, /openingMulliganPending = false|createInitialBattleState|drawCards|shuffleDeck|applyEnemyOpeningMulligan|performOpeningMulligan|startTurn\(|restartBattleScene|scene\.restart/);
});

test('opening mulligan reconciliation validates active and completed visual states', () => {
  const activeValid = extractMethodBody('isOpeningMulliganActiveRevealPresentationValid', 'isOpeningMulliganCompletedRevealPresentationValid');
  const completedValid = extractMethodBody('isOpeningMulliganCompletedRevealPresentationValid', 'normalizeOpeningMulliganFronts');
  const normalizeFronts = extractMethodBody('normalizeOpeningMulliganFronts', 'reconcileOpeningMulliganPresentation');

  assert.match(activeValid, /this\.openingMulliganRevealPending !== true/);
  assert.match(activeValid, /type === 'opening-reveal-watchdog'/);
  assert.match(activeValid, /type === 'opening-reveal-timer'/);
  assert.match(activeValid, /type === 'opening-reveal-tween'/);
  assert.match(activeValid, /type === 'opening-reveal-post-hold'/);
  assert.match(activeValid, /front\.alpha === 0[\s\S]*!front\.interactive[\s\S]*retainedBacks\.some/);

  assert.match(completedValid, /this\.openingMulliganRevealPending === true/);
  assert.match(completedValid, /retainedBacks\.length > 0 \|\| controllerTypes\.length > 0/);
  assert.match(completedValid, /fronts\.every\(\(front\) => this\.isOpeningMulliganFrontNormalized\(front\)\)/);

  assert.match(normalizeFronts, /cardView\.root\?\.setVisible\?\.\(true\);/);
  assert.match(normalizeFronts, /cardView\.root\?\.setAlpha\?\.\(1\);/);
  assert.match(normalizeFronts, /cardView\.root\.setScale\(1\);/);
  assert.match(normalizeFronts, /cardView\.root\?\.setDepth\?\.\(cardView\.baseDepth/);
  assert.match(normalizeFronts, /cardView\.background\?\.setInteractive\?\.\(\{ useHandCursor: true \}\);/);
});

test('opening mulligan reveal watchdog is generation-scoped and owned by reveal cleanup', () => {
  const startReveal = extractMethodBody('startOpeningMulliganReveal', 'scheduleOpeningMulliganRevealWatchdog');
  const scheduleWatchdog = extractMethodBody('scheduleOpeningMulliganRevealWatchdog', 'handleOpeningMulliganRevealWatchdog');
  const cleanup = extractMethodBody('cleanupOpeningMulliganRevealControllers', 'clearOpeningMulliganRevealBackCards');
  const confirmOpeningMulligan = extractMethodBody('confirmOpeningMulligan', 'resetOpeningMulliganInputState');
  const shutdown = extractMethodBody('shutdown', 'onScenePointerUpOutside');

  assert.match(startReveal, /const generation = this\.openingMulliganRevealGeneration;/);
  assert.match(startReveal, /this\.scheduleOpeningMulliganRevealWatchdog\(\{ generation, revealCount \}\);/);
  assert.match(scheduleWatchdog, /this\.time\.delayedCall\(OPENING_MULLIGAN_REVEAL_WATCHDOG_MS/);
  assert.match(scheduleWatchdog, /this\.handleOpeningMulliganRevealWatchdog\(\{ generation \}\);/);
  assert.match(scheduleWatchdog, /type: 'opening-reveal-watchdog'/);
  assert.match(scheduleWatchdog, /cleanup: \(\) => watchdogTimer\.remove\?\.\(false\)/);
  assert.match(cleanup, /controller\?\.cleanup\?\.\(\);/);
  assert.match(confirmOpeningMulligan, /this\.cleanupOpeningMulliganRevealControllers\(\);/);
  assert.match(shutdown, /this\.cleanupSceneObjects\(\);[\s\S]*this\.isBattleSceneShuttingDown = true;/);
});

test('opening mulligan reveal watchdog reconciles invalid visual states without requiring reveal pending', () => {
  const watchdog = extractMethodBody('handleOpeningMulliganRevealWatchdog', 'revealOpeningMulliganCardSlot');

  assert.match(watchdog, /if \(this\.isBattleSceneShuttingDown\) return;/);
  assert.match(watchdog, /if \(!this\.scene\?\.isActive\?\.\(\) && !this\.scene\?\.isPaused\?\.\(\)\) return;/);
  assert.match(watchdog, /if \(this\.openingMulliganPending !== true\) return;/);
  assert.doesNotMatch(watchdog, /if \(this\.openingMulliganRevealPending !== true\) return;/);
  assert.match(watchdog, /generation !== this\.openingMulliganRevealGeneration[\s\S]*this\.isOpeningMulliganActiveRevealPresentationValid/);
  assert.doesNotMatch(watchdog, /console\.warn\('Opening mulligan reveal watchdog completed pending reveal'/);
  assert.match(watchdog, /this\.reconcileOpeningMulliganPresentation\(\{ reason: 'watchdog' \}\);/);
  assert.doesNotMatch(watchdog, /redrawHand\(|createInitialBattleState|drawCards|applyEnemyOpeningMulligan|performOpeningMulligan|restartBattleScene|scene\.restart/);
});

test('opening mulligan reconciliation covers blocker stuck-state matrix', () => {
  const sourceSlice = [
    extractMethodBody('getOpeningMulliganFrontState', 'isOpeningMulliganFrontNormalized'),
    extractMethodBody('isOpeningMulliganFrontNormalized', 'isOpeningMulliganActiveRevealPresentationValid'),
    extractMethodBody('isOpeningMulliganActiveRevealPresentationValid', 'isOpeningMulliganCompletedRevealPresentationValid'),
    extractMethodBody('isOpeningMulliganCompletedRevealPresentationValid', 'normalizeOpeningMulliganFronts'),
    extractMethodBody('normalizeOpeningMulliganFronts', 'reconcileOpeningMulliganPresentation'),
    extractMethodBody('reconcileOpeningMulliganPresentation', 'applyOpeningMulliganRevealPresentation'),
    extractMethodBody('handleOpeningMulliganRevealWatchdog', 'revealOpeningMulliganCardSlot'),
  ].join('\n');

  assert.match(sourceSlice, /if \(this\.openingMulliganPending !== true\) return false;/, 'runs only during active opening mulligan');
  assert.match(sourceSlice, /!hasRevealMachinery\) return false;/, 'pending reveal with missing controllers is invalid');
  assert.match(sourceSlice, /generation !== this\.openingMulliganRevealGeneration[\s\S]*isOpeningMulliganActiveRevealPresentationValid/, 'stale generation checks current visual validity before returning');
  assert.match(sourceSlice, /if \(this\.openingMulliganRevealPending === true\) return false;/, 'completed reveal validation handles reveal-pending false separately');
  assert.match(sourceSlice, /retainedBacks\.length > 0 \|\| controllerTypes\.length > 0/, 'retained backs and stale controllers invalidate completed presentation');
  assert.match(sourceSlice, /currentFronts\.some\(\(front\) => !front\.exists\)/, 'missing or stale fronts trigger redraw');
  assert.match(sourceSlice, /this\.openingMulliganRevealPending = false;\s*this\.drawHand\(\);/, 'safe redraw avoids replaying face-down reveal presentation');
  assert.match(sourceSlice, /cardView\.root\?\.setVisible\?\.\(true\);[\s\S]*cardView\.root\?\.setAlpha\?\.\(1\);[\s\S]*cardView\.root\.setScale\(1\);[\s\S]*cardView\.background\?\.setInteractive/, 'normalizes visibility, alpha, scale, and interactivity');
  assert.match(sourceSlice, /this\.openingMulliganRevealVisibleCount = revealCount;/, 'visible reveal count follows current hand reveal count');
  assert.match(sourceSlice, /this\.selectedMulliganCardIds = this\.selectedMulliganCardIds\.filter/, 'valid mulligan selections are preserved and stale ids are pruned');
  assert.match(sourceSlice, /if \(this\.isOpeningMulliganActiveRevealPresentationValid/, 'valid active reveal is not interrupted');
  assert.match(sourceSlice, /if \(this\.isOpeningMulliganCompletedRevealPresentationValid/, 'valid completed reveal is idempotent');
  assert.doesNotMatch(sourceSlice, /drawCards|shuffleDeck|applyEnemyOpeningMulligan|performOpeningMulligan|startTurn\(|restartBattleScene|BattleTransitionScene/);
});

test('watchdog completion reuses immediate finalizer without mutating mulligan selection or battle state', () => {
  const complete = extractMethodBody('completeOpeningMulliganReveal', 'clearHandPanelViews');

  assert.match(complete, /if \(!this\.openingMulliganRevealPending && !this\.openingMulliganRevealControllers\?\.length\) return;/);
  assert.match(complete, /this\.cleanupOpeningMulliganRevealControllers\(\);/);
  assert.match(complete, /this\.openingMulliganRevealPending = false;/);
  assert.match(complete, /cardView\.root\?\.setAlpha\?\.\(1\);/);
  assert.match(complete, /cardView\.root\?\.setScale\?\.\(1\);/);
  assert.match(complete, /cardView\.background\?\.setInteractive\?\.\(\{ useHandCursor: true \}\);/);
  assert.match(complete, /if \(redraw && !skipAnimation\) this\.redrawHand\(\);/);
  assert.doesNotMatch(complete, /openingMulliganPending = false|selectedMulliganCardIds|performOpeningMulligan|applyEnemyOpeningMulligan|createInitialBattleState|drawCards|restartBattleScene|startTurn\(/);
});
