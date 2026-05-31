import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { calculateHandLayoutMetrics } from '../src/ui/handLayout.js';
import {
  calculateHandBackCardCoverCrop,
  calculateHandBackCardDepth,
  shouldRenderHandBackCard,
} from '../src/ui/handBackCardPresentation.js';

test('hand back card visibility is limited to the first empty slot while the deck has cards', () => {
  assert.equal(shouldRenderHandBackCard({ handCount: 2, maxHandSize: 5, deckCount: 4, index: 2 }), true);
  assert.equal(shouldRenderHandBackCard({ handCount: 2, maxHandSize: 5, deckCount: 4, index: 1 }), false);
  assert.equal(shouldRenderHandBackCard({ handCount: 2, maxHandSize: 5, deckCount: 4, index: 3 }), false);
  assert.equal(shouldRenderHandBackCard({ handCount: 5, maxHandSize: 5, deckCount: 4, index: 5 }), false);
  assert.equal(shouldRenderHandBackCard({ handCount: 2, maxHandSize: 5, deckCount: 0, index: 2 }), false);
});

test('hand back card depth sits behind the neighboring real card and above lowered empty placeholders', () => {
  const backCardSlotBaseDepth = 20 + 2 * 4;
  const neighboringRealCardDepth = 20 + 1 * 4;
  const backCardDepth = calculateHandBackCardDepth({ baseDepth: backCardSlotBaseDepth });
  const emptyPlaceholderDepth = backCardDepth - 1;

  assert.equal(backCardDepth, neighboringRealCardDepth - 1);
  assert.ok(neighboringRealCardDepth > backCardDepth);
  assert.ok(backCardDepth > emptyPlaceholderDepth);
});

test('hand back card cover crop fills the real hand-card footprint without raw aspect-ratio stretching', () => {
  const crop = calculateHandBackCardCoverCrop({
    sourceWidth: 1024,
    sourceHeight: 1536,
    width: 88.34408602150538,
    height: 158,
  });

  assert.ok(Math.abs(crop.displayWidth / 1024 - crop.displayHeight / 1536) < 1e-12);
  assert.ok(crop.cropX >= 41);
  assert.ok(crop.cropY >= 32);
  assert.ok(crop.cropX + crop.cropWidth <= 1024 - 41);
  assert.ok(crop.cropY + crop.cropHeight <= 1536 - 78);
  assert.ok(Math.abs(crop.cropWidth * (crop.displayWidth / 1024) - 88.34408602150538) < 1e-9);
  assert.ok(Math.abs(crop.cropHeight * (crop.displayHeight / 1536) - 158) < 1e-9);
});

test('presentation-only hand back card visibility does not change hand layout metrics', () => {
  const input = {
    contentWidth: 342,
    margin: 9,
    handY: 640,
    handHeight: 185,
    viewportHeight: 740,
    maxHandSize: 5,
  };
  const withoutBackCard = calculateHandLayoutMetrics(input);
  shouldRenderHandBackCard({ handCount: 2, maxHandSize: 5, deckCount: 0, index: 2 });
  const withBackCard = calculateHandLayoutMetrics(input);
  shouldRenderHandBackCard({ handCount: 2, maxHandSize: 5, deckCount: 4, index: 2 });

  assert.deepEqual(withBackCard, withoutBackCard);
});

test('BattleScene passes the empty hand slot footprint to a presentation-only helper', () => {
  const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
  const drawHand = source.slice(source.indexOf('  drawHand() {'), source.indexOf('  createHandBackCardView({ x, y, width, height, depth })'));
  const helper = source.slice(source.indexOf('  createHandBackCardView({ x, y, width, height, depth })'), source.indexOf('  createHandCardView({'));

  assert.match(drawHand, /shouldRenderHandBackCard\(\{ handCount, maxHandSize, deckCount, index \}\)/);
  assert.match(drawHand, /const handBackCardDepth = calculateHandBackCardDepth\(\{ baseDepth: 20 \+ handCount \* 4 \}\);/);
  assert.match(drawHand, /cardView\.baseDepth = handBackCardDepth - 1;[\s\S]*cardView\.root\.setDepth\(cardView\.baseDepth\);/);
  assert.match(drawHand, /this\.createHandBackCardView\(\{[\s\S]*x,[\s\S]*y: baseY,[\s\S]*width: hand\.cardWidth,[\s\S]*height: hand\.cardHeight,[\s\S]*depth: handBackCardDepth,/);
  assert.match(helper, /this\.add\.container\(x, y\)\.setDepth\(depth\)/);
  assert.match(helper, /calculateHandBackCardCoverCrop\(\{/);
  assert.doesNotMatch(helper, /setInteractive|cardViews|cardId|inspect|target/i);
});
