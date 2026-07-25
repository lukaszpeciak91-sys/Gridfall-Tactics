import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  COLLECTION_AUTO_SCROLL_DURATION_MS,
  COLLECTION_AUTO_SCROLL_EASE,
  getCollectionAutoScrollTarget,
} from '../src/ui/collectionAutoScroll.js';

const source = fs.readFileSync('src/scenes/CollectionScene.js', 'utf8');
const toggleSource = source.slice(source.indexOf('  toggleFactionSection('), source.indexOf('  requestFactionAutoScroll('));
const requestSource = source.slice(source.indexOf('  requestFactionAutoScroll('), source.indexOf('  onFactionHeaderPointerDown('));
const inspectSource = source.slice(source.indexOf('  showInspectPreview('), source.indexOf('  createBackButton('));

test('opening targets the clicked post-layout banner while preserving every expanded faction', () => {
  assert.match(toggleSource, /this\.expandedFactionKeys\.add\(factionKey\);[\s\S]*this\.rebuildCollectionContent[\s\S]*this\.requestFactionAutoScroll\(factionKey\);/);
  assert.doesNotMatch(toggleSource, /clear\(\)|new Set\(\[factionKey\]\)/);
  assert.match(requestSource, /this\.factionBannerTargets\.get\(factionKey\)/);
  assert.match(requestSource, /banner\.getBounds\(\)\.top/);
});

test('collapse rebuilds normally without requesting auto-scroll', () => {
  const collapseBranch = toggleSource.slice(toggleSource.indexOf('if (this.expandedFactionKeys.has(factionKey))'), toggleSource.indexOf('this.expandedFactionKeys.add(factionKey)'));
  assert.match(collapseBranch, /delete\(factionKey\)[\s\S]*rebuildCollectionContent/);
  assert.doesNotMatch(collapseBranch, /requestFactionAutoScroll/);
});

test('target aligns to the reserved heading viewport plus spacing and allows earlier banners above it', () => {
  assert.equal(getCollectionAutoScrollTarget({ contentY: -300, bannerTop: 420, viewportTop: 98, topSpacing: 6, minY: -1000, maxY: 98 }), -616);
});

test('target clamps at both ends of the content scroller', () => {
  const args = { contentY: 98, viewportTop: 98, topSpacing: 6, minY: -500, maxY: 98 };
  assert.equal(getCollectionAutoScrollTarget({ ...args, bannerTop: 1000 }), -500);
  assert.equal(getCollectionAutoScrollTarget({ ...args, bannerTop: 0 }), 98);
});

test('auto-scroll is short, replaces competing work, and is cleaned up with the scene', () => {
  assert.equal(COLLECTION_AUTO_SCROLL_DURATION_MS, 220);
  assert.equal(COLLECTION_AUTO_SCROLL_EASE, 'Quad.easeOut');
  assert.match(requestSource, /this\.cancelCollectionAutoScroll\(\);[\s\S]*delayedCall\?\.\(0,/);
  assert.match(source, /cleanupScene\(\) \{[\s\S]*this\.cancelCollectionAutoScroll\(\);/);
});

test('card inspection remains independent from collection auto-scroll', () => {
  assert.doesNotMatch(inspectSource, /requestFactionAutoScroll|getCollectionAutoScrollTarget/);
});
