import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

test('BattleScene disables and guards stale hand-card pointer hover during result flow', () => {
  const source = read('src/scenes/BattleScene.js');
  assert.match(source, /disableCardHoverInteractions\(\);\s*this\.stopBattleAmbience\(\{ fadeMs: 350 \}\);/);
  assert.match(source, /disableCardHoverInteractions\(\) \{\s*this\.cardViews\?\.forEach\(\(cardView\) => this\.disableCardViewInteractions\(cardView\)\);/);
  assert.match(source, /this\.disableCardViewInteractions\(this\.inspectPreview\);/);
  assert.match(source, /this\.disableCardViewInteractions\(this\.selectedHandCardZoom\);/);
  assert.match(source, /if \(this\.battleResultModalPending \|\| this\.battleResultModalShown \|\| this\.isFlowResolving\) return false;/);
  assert.match(source, /cardView\.background\.on\('pointerover', \(\) => \{\s*if \(!this\.isCardViewPointerMutationAllowed\(cardView\)\) return;/);
  assert.match(source, /cardView\.background\.on\('pointerout', \(\) => \{\s*if \(!this\.isCardViewPointerMutationAllowed\(cardView\)\) return;/);
  assert.match(source, /safeDisableInteractiveObject\(item\) \{\s*if \(!item \|\| item\.scene == null \|\| typeof item\.disableInteractive !== 'function'\) return;/);
  assert.match(source, /removeCardPointerListeners\(item\) \{[\s\S]*removeAllListeners\?\.\('pointerover'\)[\s\S]*removeAllListeners\?\.\('pointerout'\)/);
  assert.match(source, /cardView\.isActive = false;[\s\S]*cardView\.deactivate\?\.\(\);/);
});

test('BattleScene keeps result transition hover mutations disabled until modal assignment', () => {
  const source = read('src/scenes/BattleScene.js');
  assert.doesNotMatch(source, /showBattleResultModal\(\) \{[\s\S]*this\.battleResultModalPending = false;\s*this\.disableCardHoverInteractions\(\);/);
  assert.match(source, /this\.disableCardHoverInteractions\(\);\s*if \(!this\.gameState\?\.winner \|\| this\.battleResultModalShown\) \{\s*this\.battleResultModalPending = false;/);
  assert.match(source, /this\.resetCardHighlights\(\{ showPreview: false \}\);[\s\S]*this\.battleResultModalPending = false;\s*this\.isFlowResolving = false;\s*this\.battleResultModal = \{/);
  assert.match(source, /this\.cardViews\.forEach\(\(card\) => \{\s*if \(card\?\.isActive === false \|\| card\?\.root\?\.scene == null\) return;/);
});

test('card hover shutdown remains scoped to card and inspect views only', () => {
  const source = read('src/scenes/BattleScene.js');
  const disableStart = source.indexOf('  disableCardHoverInteractions() {');
  const disableEnd = source.indexOf('\n  deactivateInspectPreviewView', disableStart);
  const disableSource = source.slice(disableStart, disableEnd);

  assert.match(disableSource, /this\.cardViews\?\.forEach\(\(cardView\) => this\.disableCardViewInteractions\(cardView\)\);/);
  assert.match(disableSource, /this\.disableCardViewInteractions\(this\.inspectPreview\);/);
  assert.match(disableSource, /this\.disableCardViewInteractions\(this\.selectedHandCardZoom\);/);
  assert.match(disableSource, /this\.handBackCards\?\.forEach/);
  assert.doesNotMatch(disableSource, /battleResultModal|buttons|utilityMenuPanel|deckInfoPanel|surrenderConfirmationModal|input\./);
});

test('card preview teardown deactivates child interactions before destroyed text can be mutated', () => {
  const source = read('src/rendering/cardVisualLayout.js');
  assert.match(source, /function isRenderableTextObject\(text\) \{[\s\S]*text\.scene == null[\s\S]*text\.texture == null[\s\S]*text\.canvas == null[\s\S]*text\.context == null/);
  assert.match(source, /function safeSetTextShadow\(text, \.\.\.args\) \{\s*if \(!isRenderableTextObject\(text\) \|\| typeof text\.setShadow !== 'function'\) return text;/);
  assert.match(source, /function deactivateCardPreviewView\(view\) \{[\s\S]*item\?\.disableInteractive\?\.\(\);[\s\S]*item\?\.removeAllListeners\?\.\(\);/);
  assert.match(source, /previewView\.deactivate = \(\) => deactivateCardPreviewView\(previewView\);/);
  assert.match(source, /previewView\.destroy = \(\) => \{\s*previewView\.deactivate\?\.\(\);\s*originalRootDestroy\?\.\(\);/);
});

test('music volume updates tolerate destroyed or unloaded sound backends', () => {
  const source = read('src/audio/audioPlayback.js');
  const safetySource = read('src/audio/audioSafety.js');
  assert.match(safetySource, /function isSoundObject\(sound\) \{[\s\S]*sound\.destroyed[\s\S]*sound\.pendingRemove/);
  assert.match(safetySource, /export function isLiveSound\(sound\) \{[\s\S]*isSoundObject\(sound\)[\s\S]*sound\.source == null[\s\S]*sound\.audio == null/);
  assert.match(safetySource, /export function safeSetVolume\(sound, volume\) \{[\s\S]*try \{[\s\S]*sound\.setVolume\(volume\)[\s\S]*sound\.volume = volume[\s\S]*catch \(_error\) \{\s*return false;/);
  assert.match(source, /if \(!safeSetVolume\(activeMusic\.sound, volume\)\) \{\s*destroyActiveMusic\(\);\s*return false;/);
});
