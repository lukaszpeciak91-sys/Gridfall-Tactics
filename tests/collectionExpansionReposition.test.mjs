import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/scenes/CollectionScene.js', 'utf8');
const rebuildSource = source.slice(
  source.indexOf('  rebuildCollectionContent('),
  source.indexOf('  trackCollectionContentElement('),
);
const sectionSource = source.slice(
  source.indexOf('  drawFactionSection('),
  source.indexOf('  drawFactionDossierPanel('),
);
const toggleSource = source.slice(
  source.indexOf('  toggleFactionSection('),
  source.indexOf('  onFactionHeaderPointerDown('),
);
const inspectSource = source.slice(
  source.indexOf('  drawCardPreview('),
  source.indexOf('  createBackButton('),
);
const backSource = source.slice(
  source.indexOf('  createBackButton('),
  source.indexOf('  wasScrollDragging('),
);
const scrollSource = source.slice(
  source.indexOf('  wasScrollDragging('),
  source.indexOf('  reconcileTransitionOverlayOrdering('),
);

test('rebuild records every rebuilt banner container-local top as scalar layout data', () => {
  assert.match(source, /this\.factionBannerLayoutY = new Map\(\);/);
  assert.match(rebuildSource, /this\.factionBannerLayoutY\.clear\(\);/);
  assert.match(sectionSource, /const stripY = y - 2;\s*this\.factionBannerLayoutY\.set\(factionKey, stripY\);/);
  assert.doesNotMatch(source, /factionBannerTargets/);
});

test('expansion repositions from the latest rebuilt layout through the canonical setter', () => {
  assert.match(toggleSource, /this\.expandedFactionKeys\.add\(factionKey\);\s*this\.rebuildCollectionContent\(\{ width: this\.scale\.width \}\);/);
  assert.match(toggleSource, /const bannerLocalTop = this\.factionBannerLayoutY\.get\(factionKey\);/);
  assert.match(toggleSource, /const topGap = COLLECTION_ACCORDION_TOP_OFFSET - 2;/);
  assert.match(toggleSource, /const desiredBannerWorldTop = state\.viewportTop \+ topGap;/);
  assert.match(toggleSource, /const targetContentY = desiredBannerWorldTop - bannerLocalTop;\s*this\.setCollectionScrollY\(targetContentY\);/);
  assert.match(source, /state\.content\.y = Phaser\.Math\.Clamp\(nextY, state\.minY, state\.maxY\);/);
});

test('multi-expand is preserved and collapse rebuilds without repositioning', () => {
  const collapseSource = toggleSource.slice(0, toggleSource.indexOf('    this.expandedFactionKeys.add(factionKey);'));
  assert.match(collapseSource, /this\.expandedFactionKeys\.delete\(factionKey\);\s*this\.rebuildCollectionContent\(\{ width: this\.scale\.width \}\);\s*return;/);
  assert.doesNotMatch(collapseSource, /setCollectionScrollY|factionBannerLayoutY\.get/);
  assert.doesNotMatch(toggleSource, /expandedFactionKeys\.(?:clear|forEach)/);
  assert.ok(
    toggleSource.indexOf('this.rebuildCollectionContent({ width: this.scale.width });', toggleSource.indexOf('this.expandedFactionKeys.add(factionKey)'))
      < toggleSource.indexOf('this.factionBannerLayoutY.get(factionKey)'),
    'lower factions must use their post-rebuild position, including expanded content above',
  );
});

test('reposition adds no asynchronous work, overlay, tween, or input mutation', () => {
  assert.doesNotMatch(toggleSource, /delayedCall|setTimeout|tweens|add\.(?:zone|rectangle)|input\.enabled/);
  assert.doesNotMatch(source, /requestFactionAutoScroll|cancelCollectionAutoScroll|collectionAutoScroll|ensureCollectionInputEnabled/);
});

test('back, inspect, and manual scrolling retain their established handlers', () => {
  assert.match(backSource, /createModalBackButton\(this,[\s\S]*onPointerUp:[\s\S]*this\.scene\.start\('MainMenuScene'\)/);
  assert.match(inspectSource, /preview\.background\.on\('pointerdown'[\s\S]*this\.onCardPointerDown/);
  assert.match(inspectSource, /preview\.background\.on\('pointerup'[\s\S]*this\.onCardPointerUp/);
  assert.match(scrollSource, /onScrollPointerMove\(pointer\)[\s\S]*this\.setCollectionScrollY\(state\.contentStartY \+ state\.lastDragDistance\);/);
  assert.match(scrollSource, /onScrollWheel\(pointer, gameObjects, deltaX, deltaY\)[\s\S]*this\.setCollectionScrollY\(state\.content\.y - deltaY \* 0\.45\);/);
});
