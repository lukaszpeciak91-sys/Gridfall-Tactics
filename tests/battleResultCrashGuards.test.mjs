import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

test('BattleScene disables and guards stale hand-card pointer hover during result flow', () => {
  const source = read('src/scenes/BattleScene.js');
  assert.match(source, /disableCardHoverInteractions\(\);\s*this\.stopBattleAmbience\(\{ fadeMs: 350 \}\);/);
  assert.match(source, /disableCardHoverInteractions\(\) \{\s*this\.cardViews\?\.forEach\(\(cardView\) => this\.disableCardViewInteractions\(cardView\)\);/);
  assert.match(source, /if \(this\.battleResultModalPending \|\| this\.battleResultModalShown \|\| this\.isFlowResolving\) return false;/);
  assert.match(source, /cardView\.background\.on\('pointerover', \(\) => \{\s*if \(!this\.isCardViewPointerMutationAllowed\(cardView\)\) return;/);
  assert.match(source, /cardView\.background\.on\('pointerout', \(\) => \{\s*if \(!this\.isCardViewPointerMutationAllowed\(cardView\)\) return;/);
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
  assert.match(source, /function isUsableSound\(sound\) \{[\s\S]*sound\.destroyed[\s\S]*sound\.pendingRemove[\s\S]*sound\.source == null[\s\S]*sound\.audio == null/);
  assert.match(source, /function safelySetSoundVolume\(sound, volume\) \{[\s\S]*try \{[\s\S]*sound\.setVolume\(volume\)[\s\S]*sound\.volume = volume[\s\S]*catch \(_error\) \{\s*return false;/);
  assert.match(source, /if \(!safelySetSoundVolume\(activeMusic\.sound, volume\)\) \{\s*destroyActiveMusic\(\);\s*return false;/);
});
