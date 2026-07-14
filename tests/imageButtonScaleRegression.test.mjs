import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/ui/imageButton.js', 'utf8');
const menuLogoLayoutSource = fs.readFileSync('src/ui/menuLogoLayout.js', 'utf8');

test('premium broadcast button font stack uses the approved global premium UI typography', () => {
  assert.match(source, /export const PREMIUM_BROADCAST_FONT_STACK = 'Segoe UI, Arial, sans-serif';/);
  assert.doesNotMatch(source, /PREMIUM_BROADCAST_FONT_STACK = '[^']*Exo 2/);
  assert.doesNotMatch(source, /PREMIUM_BROADCAST_FONT_STACK = '[^']*Rajdhani/);
  assert.doesNotMatch(source, /PREMIUM_BROADCAST_FONT_STACK = '[^']*Orbitron/);
  assert.doesNotMatch(source, /PREMIUM_BROADCAST_FONT_STACK = '[^']*Montserrat/);
});

test('main menu logo fallback uses the same approved premium UI typography', () => {
  assert.match(menuLogoLayoutSource, /fontFamily: 'Segoe UI, Arial, sans-serif'/);
  assert.doesNotMatch(menuLogoLayoutSource, /fontFamily: '[^']*(Rajdhani|Exo 2|Montserrat|Orbitron)/);
});

test('image button state changes preserve display-size base scale', () => {
  assert.match(source, /function storeBaseScale\(target\) \{[\s\S]*target\?\.setData\?\.\('baseScaleX', target\.scaleX \?\? 1\);[\s\S]*target\?\.setData\?\.\('baseScaleY', target\.scaleY \?\? 1\);[\s\S]*\}/);
  assert.match(source, /scene\.add\.image\(x, y, SECONDARY_BUTTON_ASSET\.key, buttonFrame\)\.setDisplaySize\(width, visualHeight\)/);
  assert.match(source, /backing\.setOrigin\(0\.5\)\.setDepth\(depth\);\s*storeBaseScale\(backing\);/);
  assert.match(source, /scalableTargets(?:\.filter\(isLiveGameObject\))?\.forEach\(\(target\) => setTargetScaleFromBase\(target, scale\)\)/);
  assert.match(source, /target\.setScale\(baseScale\.x \* stateScale, baseScale\.y \* stateScale\)/);
});

test('image button reset restores base visual scale without scaling the hit zone visually', () => {
  assert.match(source, /\[button\.shadow, button\.backing, button\.text\]\.forEach\(\(item\) => \{[\s\S]*setTargetScaleFromBase\(item, 1\);[\s\S]*\}\);/);
  assert.doesNotMatch(source, /button\.backing\?\.setScale\?\.\(1\)/);
  assert.doesNotMatch(source, /scalableTargets\.forEach\(\(target\) => target\.setScale\(scale\)\)/);
  assert.match(source, /button\.hitZone\?\.setScale\?\.\(1\)/);
});

test('image button press feedback uses restrained tweened premium timings', () => {
  assert.match(source, /downScale = 0\.975/);
  assert.match(source, /tweenVisualState\('pressed', \{ duration: 65, ease: 'Quad\.easeOut' \}\)/);
  assert.match(source, /tweenVisualState\(nextMode, \{ duration: 105, ease: 'Cubic\.easeOut' \}\)/);
  assert.match(source, /return \{ scale: downScale, alpha: 0\.9, textAlpha: 0\.96/);
  assert.doesNotMatch(source, /Back\.easeOut/);
});

test('image button feedback cancels safely and avoids scale drift', () => {
  assert.match(source, /scene\.tweens\?\.killTweensOf\?\.\(feedbackTargets\.filter\(isLiveGameObject\)\)/);
  assert.match(source, /const baseScale = getBaseScale\(target\);[\s\S]*scaleX: baseScale\.x \* state\.scale,[\s\S]*scaleY: baseScale\.y \* state\.scale/);
  assert.match(source, /scene\.input\?\.on\?\.\('pointerupoutside', feedbackState\.scenePointerUpOutsideHandler\)/);
  assert.match(source, /scene\.input\?\.off\?\.\('pointerupoutside', feedbackState\.scenePointerUpOutsideHandler\)/);
  assert.match(source, /hitZone\.on\('pointercancel', cancelPress\)/);
  assert.match(source, /scene\.events\?\.once\?\.\('shutdown', cleanupFeedback\)/);
});
