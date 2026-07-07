import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateHandCardFocusBounds, getLiveHandCardViewById, isLiveCardView } from '../src/ui/tutorialUxLayout.js';

const liveScene = { sys: { isActive: () => true } };

function display(overrides = {}) {
  return {
    active: true,
    visible: true,
    alpha: 1,
    scene: liveScene,
    x: 10,
    y: 20,
    width: 70,
    height: 100,
    displayWidth: 70,
    displayHeight: 100,
    ...overrides,
  };
}

function bounds(object, padding) {
  if (!object?.active || !object?.scene) return null;
  const width = object.displayWidth ?? object.width;
  const height = object.displayHeight ?? object.height;
  if (!Number.isFinite(object.x) || !Number.isFinite(object.y) || !Number.isFinite(width) || !Number.isFinite(height)) return null;
  return { x: object.x, y: object.y, width: width + padding * 2, height: height + padding * 2 };
}

test('tutorial hand-card focus ignores stale matching cardViews and resolves the live replacement', () => {
  const cardId = 'tutorial_unit_a_1';
  const stale = { cardId, card: { id: cardId }, root: display({ active: false, scene: null }), background: display({ active: false, scene: null, x: 1 }) };
  const live = { cardId, card: { id: cardId }, root: display({ x: 100, y: 200 }), background: display({ x: 3, y: 4 }) };

  assert.equal(isLiveCardView(stale, bounds), false);
  assert.equal(getLiveHandCardViewById([stale, live], cardId, bounds), live);
  assert.deepEqual(calculateHandCardFocusBounds([stale, live], cardId, bounds), { x: 103, y: 204, width: 84, height: 114 });
});

test('tutorial hand-card focus does not resolve when only a dead matching cardView exists', () => {
  const cardId = 'tutorial_unit_a_1';
  const stale = { cardId, root: display({ active: false, scene: null }), background: display({ active: false, scene: null }) };

  assert.equal(getLiveHandCardViewById([stale], cardId, bounds), null);
  assert.equal(calculateHandCardFocusBounds([stale], cardId, bounds), null);
});

test('normal live tutorial hand-card focus still resolves bounds', () => {
  const cardId = 'tutorial_unit_b_1';
  const cardView = { cardId, card: { id: cardId }, root: display({ x: 123, y: 456 }), background: display({ x: 0, y: 0 }) };

  assert.equal(isLiveCardView(cardView, bounds), true);
  assert.deepEqual(calculateHandCardFocusBounds([cardView], cardId, bounds), { x: 123, y: 456, width: 84, height: 114 });
});

test('battle scene clears hand card views during cleanup and before hand redraws', () => {
  const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
  const cleanup = source.slice(source.indexOf('  cleanupSceneObjects('), source.indexOf('  create(data)'));
  const clearHandCardViews = source.slice(source.indexOf('  clearHandCardViews()'), source.indexOf('  drawHand()'));
  const drawHand = source.slice(source.indexOf('  drawHand()'), source.indexOf('  getBoardUnitStats('));
  const redrawHand = source.slice(source.indexOf('  redrawHand()'), source.indexOf('  getBoardUnitStats('));

  assert.match(cleanup, /this\.clearHandCardViews\(\);/);
  assert.match(clearHandCardViews, /this\.cardViews = \[\];/);
  assert.match(drawHand, /this\.clearHandCardViews\(\);[\s\S]*this\.cardViews\.push\(cardView\);/);
  assert.match(redrawHand, /this\.clearHandCardViews\(\);\s*this\.drawHand\(\);/);
});

test('arena and campaign hand-card interactions still use the rebuilt cardViews collection', () => {
  const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
  const drawHand = source.slice(source.indexOf('  drawHand()'), source.indexOf('  getBoardUnitStats('));

  assert.match(drawHand, /cardView\.background\.setInteractive\(\{ useHandCursor: true \}\);/);
  assert.match(drawHand, /cardView\.background\.on\('pointerdown', \(\) => \{\s*this\.onCardPointerDown\(cardId\);\s*\}\);/);
  assert.match(drawHand, /cardView\.background\.on\('pointerup', \(pointer\) => \{\s*this\.onCardPointerUp\(cardId, pointer\);\s*\}\);/);
});
