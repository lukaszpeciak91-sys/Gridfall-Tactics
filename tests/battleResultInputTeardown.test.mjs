import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
const imageButtonSource = fs.readFileSync('src/ui/imageButton.js', 'utf8');

test('battle result scheduling shuts down non-card overlays and base controls during pending modal window', () => {
  assert.match(source, /this\.battleResultModalPending = true;\s*this\.isFlowResolving = true;\s*this\.disableCardHoverInteractions\(\);\s*this\.stopBattleAmbience\(\{ fadeMs: 350 \}\);\s*this\.updateActionSlotBadge\(\);\s*this\.disableResultPendingOverlayInteractions\(\);/);
  assert.match(source, /disableResultPendingOverlayInteractions\(\) \{[\s\S]*this\.destroyUtilityMenuPanel\?\.\(\);[\s\S]*this\.closeSurrenderConfirmation\?\.\(\);[\s\S]*this\.destroyDeckInfoPanel\?\.\(\);[\s\S]*this\.destroyTargetingInstruction\?\.\(\);[\s\S]*this\.cancelPassHoldToSurrender\?\.\(\);/);
  assert.match(source, /\[this\.playerHeroPanel, this\.deckCounterView\?\.backing, this\.deckCounterView\?\.text\][\s\S]*\.forEach\(disableItem\);/);
  assert.match(source, /\(this\.bottomControlViews \?\? \[\]\)\.forEach\(\(control\) => \{[\s\S]*\[control\?\.backing, control\?\.text\]\.forEach\(disableItem\);/);
});

test('image button hover state is scene-safe after teardown', () => {
  assert.match(imageButtonSource, /function isLiveGameObject\(target\) \{\s*return Boolean\(target && target\.scene && target\.active !== false\);\s*\}/);
  assert.match(imageButtonSource, /if \(!isLiveGameObject\(hitZone\) \|\| !isLiveGameObject\(backing\) \|\| !isLiveGameObject\(text\)\) return false;/);
  assert.match(imageButtonSource, /scalableTargets\.filter\(isLiveGameObject\)\.forEach\(\(target\) => setTargetScaleFromBase\(target, scale\)\)/);
  assert.match(imageButtonSource, /if \(!setVisualState\(\{ scale: hoverScale,[\s\S]*?textGlow: true \}\)\) return;[\s\S]*?onPointerUp\(\);/);
  assert.match(imageButtonSource, /item\?\.removeAllListeners\?\.\(\);\s*item\?\.disableInteractive\?\.\(\);\s*item\?\.destroy\?\.\(\);/);
});
