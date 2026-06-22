import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

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
  assert.match(create, /this\.drawHand\(\);[\s\S]*this\.updatePlayerBaseActionState\(\);\s*this\.startOpeningMulliganReveal\(\);/);
  assert.doesNotMatch(create, /performOpeningMulligan\(this\.gameState, 'player'/);

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
});

test('lifecycle recovery completes opening reveal before mulligan redraw/rebuild', () => {
  const recover = extractMethodBody('recoverFromLifecycle', 'shouldRebuildBattleView');
  assert.match(recover, /if \(this\.openingMulliganRevealPending\) \{\s*this\.completeOpeningMulliganReveal\(\{ skipAnimation: true, redraw: false \}\);\s*\}\s*this\.normalizeLifecycleUiState\(reason\);/);
  assert.doesNotMatch(recover, /performOpeningMulligan\(this\.gameState, 'player'/);
});
