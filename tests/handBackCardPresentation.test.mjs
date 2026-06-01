import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { calculateHandLayoutMetrics } from '../src/ui/handLayout.js';
import {
  calculateHandBackCardCoverCrop,
  calculateHandBackCardDepth,
  calculateVisibleHandBackCardCount,
  shouldRenderHandBackCard,
} from '../src/ui/handBackCardPresentation.js';

test('hand back card count fills visible empty slots while cards remain in the deck', () => {
  assert.equal(calculateVisibleHandBackCardCount({ handCount: 4, maxHandSize: 5, deckCount: 3 }), 1);
  assert.equal(calculateVisibleHandBackCardCount({ handCount: 2, maxHandSize: 5, deckCount: 5 }), 3);
  assert.equal(calculateVisibleHandBackCardCount({ handCount: 1, maxHandSize: 5, deckCount: 9 }), 4);
  assert.equal(calculateVisibleHandBackCardCount({ handCount: 3, maxHandSize: 5, deckCount: 0 }), 0);
  assert.equal(calculateVisibleHandBackCardCount({ handCount: 5, maxHandSize: 5, deckCount: 4 }), 0);
  assert.equal(calculateVisibleHandBackCardCount({ handCount: 2, maxHandSize: 5, deckCount: 1 }), 1);

  assert.equal(shouldRenderHandBackCard({ handCount: 2, maxHandSize: 5, deckCount: 5, index: 1 }), false);
  assert.equal(shouldRenderHandBackCard({ handCount: 2, maxHandSize: 5, deckCount: 5, index: 2 }), true);
  assert.equal(shouldRenderHandBackCard({ handCount: 2, maxHandSize: 5, deckCount: 5, index: 4 }), true);
  assert.equal(shouldRenderHandBackCard({ handCount: 2, maxHandSize: 5, deckCount: 5, index: 5 }), false);
  assert.equal(shouldRenderHandBackCard({ handCount: 2, maxHandSize: 5, deckCount: 0, index: 2 }), false);
});

test('K K K R R depth priority keeps real cards above a descending future-card stack', () => {
  const realCardDepths = [0, 1, 2].map((index) => 20 + index * 4);
  const backCardDepths = [0, 1].map((backCardOrder) => calculateHandBackCardDepth({ backCardOrder }));

  assert.deepEqual(realCardDepths, [20, 24, 28]);
  assert.deepEqual(backCardDepths, [19, 18]);
  assert.ok(backCardDepths[0] > backCardDepths[1], 'R1 must render above R2');
  assert.ok(Math.min(...realCardDepths) > Math.max(...backCardDepths), 'every real card must render above every back-card');
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

test('BattleScene renders back cards separately from gameplay cards and omits empty placeholders', () => {
  const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
  const drawHand = source.slice(source.indexOf('  drawHand() {'), source.indexOf('  createHandBackCardView({ x, y, width, height, depth })'));
  const helper = source.slice(source.indexOf('  createHandBackCardView({ x, y, width, height, depth })'), source.indexOf('  createHandCardView({'));

  assert.match(drawHand, /this\.gameState\.player\.hand\.slice\(0, hand\.cardsVisible\)\.forEach\(\(card, index\) => \{/);
  assert.match(drawHand, /for \(let index = handCount; index < hand\.cardsVisible; index \+= 1\) \{/);
  assert.match(drawHand, /shouldRenderHandBackCard\(\{ handCount, maxHandSize, deckCount, index \}\)/);
  assert.match(drawHand, /const backCard = this\.createHandBackCardView\(\{/);
  assert.match(drawHand, /depth: calculateHandBackCardDepth\(\{ backCardOrder: index - handCount \}\)/);
  assert.match(drawHand, /backCard\.slotIndex = index;\s*this\.handBackCards\.push\(backCard\);/);
  assert.doesNotMatch(drawHand, /slot-\$\{index\}|setAlpha\(0\.45\)/, 'empty placeholder containers must stay suppressed');
  assert.match(helper, /this\.add\.container\(x, y\)\.setDepth\(depth\)/);
  assert.match(helper, /calculateHandBackCardCoverCrop\(\{/);
  assert.doesNotMatch(helper, /setInteractive|cardViews|cardId|inspect|target/i);
});
