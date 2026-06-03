import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/ui/imageButton.js', 'utf8');

test('premium broadcast button font stack prefers Polish-capable Exo 2 metrics', () => {
  assert.match(source, /export const PREMIUM_BROADCAST_FONT_STACK = '"Exo 2", "Segoe UI", Arial, sans-serif';/);
  assert.doesNotMatch(source, /PREMIUM_BROADCAST_FONT_STACK = '[^']*Rajdhani/);
  assert.doesNotMatch(source, /PREMIUM_BROADCAST_FONT_STACK = '[^']*Orbitron/);
});

test('image button state changes preserve display-size base scale', () => {
  assert.match(source, /function storeBaseScale\(target\) \{[\s\S]*target\?\.setData\?\.\('baseScaleX', target\.scaleX \?\? 1\);[\s\S]*target\?\.setData\?\.\('baseScaleY', target\.scaleY \?\? 1\);[\s\S]*\}/);
  assert.match(source, /scene\.add\.image\(x, y, SECONDARY_BUTTON_ASSET\.key, buttonFrame\)\.setDisplaySize\(width, visualHeight\)/);
  assert.match(source, /backing\.setOrigin\(0\.5\)\.setDepth\(depth\);\s*storeBaseScale\(backing\);/);
  assert.match(source, /scalableTargets\.forEach\(\(target\) => setTargetScaleFromBase\(target, scale\)\)/);
  assert.match(source, /target\.setScale\(baseScale\.x \* stateScale, baseScale\.y \* stateScale\)/);
});

test('image button reset restores base visual scale without scaling the hit zone visually', () => {
  assert.match(source, /\[button\.shadow, button\.backing, button\.text\]\.forEach\(\(item\) => \{[\s\S]*setTargetScaleFromBase\(item, 1\);[\s\S]*\}\);/);
  assert.doesNotMatch(source, /button\.backing\?\.setScale\?\.\(1\)/);
  assert.doesNotMatch(source, /scalableTargets\.forEach\(\(target\) => target\.setScale\(scale\)\)/);
  assert.match(source, /button\.hitZone\?\.setScale\?\.\(1\)/);
});
