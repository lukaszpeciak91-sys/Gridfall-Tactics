import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  HAND_CARD_FLIP_REVEAL_DURATION,
  findHandCardFlipRevealSlots,
  startHandCardFlipReveal,
} from '../src/ui/handCardFlipReveal.js';

function createTweenHarness() {
  const pending = [];
  return {
    pending,
    tweens: {
      add(config) {
        const tween = {
          config,
          stopped: false,
          stop() { this.stopped = true; },
          complete() {
            if (this.stopped) return;
            config.targets.scaleX = config.scaleX;
            config.onComplete?.();
          },
        };
        pending.push(tween);
        return tween;
      },
    },
  };
}

function createVisuals() {
  const background = {
    interactive: true,
    disableInteractive() { this.interactive = false; },
    setInteractive(config) { this.interactive = true; this.interactiveConfig = config; },
  };
  const backCard = {
    slotIndex: 2,
    depth: 19,
    scaleX: 1,
    destroyed: false,
    destroy() { this.destroyed = true; },
    setDepth(depth) { this.depth = depth; return this; },
  };
  const cardView = { root: { depth: 28, scaleX: 1 }, background };
  return { backCard, cardView, background };
}

test('drawing into a previously presented back-card slot selects a flip reveal', () => {
  const backCards = [{ slotIndex: 2 }, { slotIndex: 3 }];
  const handCards = [{ id: 'one' }, { id: 'two' }, { id: 'drawn' }];

  assert.deepEqual(findHandCardFlipRevealSlots({ backCards, handCards, cardsVisible: 5 }), [2]);
});

test('flip reveal swaps the visual at midpoint and restores an interactive real card at normal scale', () => {
  const { pending, tweens } = createTweenHarness();
  const { backCard, cardView, background } = createVisuals();

  const reveal = startHandCardFlipReveal({ tweens, backCard, cardView });
  assert.equal(HAND_CARD_FLIP_REVEAL_DURATION, 300);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].config.targets, backCard);
  assert.equal(pending[0].config.scaleX, 0);
  assert.equal(pending[0].config.duration, 150);
  assert.equal(cardView.root.scaleX, 0);
  assert.equal(backCard.depth, cardView.root.depth, 'temporary reveal back-card is lifted above the redrawn future-card stack');
  assert.equal(background.interactive, false);
  assert.equal(backCard.destroyed, false);

  pending[0].complete();
  assert.equal(backCard.destroyed, true, 'midpoint removes the back-card visual');
  assert.equal(pending.length, 2);
  assert.equal(pending[1].config.targets, cardView.root);
  assert.equal(pending[1].config.scaleX, 1);
  assert.equal(background.interactive, false, 'real card stays non-interactive until reveal finishes');

  pending[1].complete();
  assert.equal(reveal.active, false);
  assert.equal(cardView.root.scaleX, 1);
  assert.equal(background.interactive, true);
  assert.deepEqual(background.interactiveConfig, { useHandCursor: true });
});

test('flip reveal is not selected when the deck was empty and no back-card existed', () => {
  assert.deepEqual(findHandCardFlipRevealSlots({ backCards: [], handCards: [{ id: 'existing' }], cardsVisible: 5 }), []);
});

test('ordinary hand redraw does not select a flip without a newly occupied back-card slot', () => {
  assert.deepEqual(findHandCardFlipRevealSlots({
    backCards: [{ slotIndex: 3 }],
    handCards: [{ id: 'one' }, { id: 'two' }, { id: 'three' }],
    cardsVisible: 5,
  }), []);
});

test('flip cleanup stops active tweens and safely leaves only the final real-card visual', () => {
  const { pending, tweens } = createTweenHarness();
  const { backCard, cardView, background } = createVisuals();
  const reveal = startHandCardFlipReveal({ tweens, backCard, cardView });

  reveal.cleanup();
  assert.equal(reveal.active, false);
  assert.equal(pending[0].stopped, true);
  assert.equal(backCard.destroyed, true);
  assert.equal(cardView.root.scaleX, 1);
  assert.equal(background.interactive, true);

  pending[0].complete();
  assert.equal(pending.length, 1, 'stopped midpoint tween must not enqueue a stale expand tween');
});

test('BattleScene wires flip detection and cleanup into presentation redraw without gameplay draw calls', () => {
  const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
  const redrawHand = source.slice(source.indexOf('  redrawHand() {'), source.indexOf('  getBoardUnitStats('));
  const cleanupSceneObjects = source.slice(source.indexOf('  cleanupSceneObjects('), source.indexOf('  create(data)'));

  assert.match(redrawHand, /findHandCardFlipRevealSlots\(\{/);
  assert.match(redrawHand, /this\.startHandCardFlipReveals\(revealBackCards\);/);
  assert.doesNotMatch(redrawHand, /drawCards|player\.deck|player\.hand\.(push|pop|splice)/);
  assert.match(cleanupSceneObjects, /this\.cleanupHandCardFlipReveals\(\);/);
});

test('reduced-motion fallback skips tweens and safely presents the final interactive card', () => {
  const { pending, tweens } = createTweenHarness();
  const { backCard, cardView, background } = createVisuals();

  const reveal = startHandCardFlipReveal({ tweens, backCard, cardView, skipAnimation: true });
  assert.equal(reveal, null);
  assert.equal(pending.length, 0);
  assert.equal(backCard.destroyed, true);
  assert.equal(cardView.root.scaleX, 1);
  assert.equal(background.interactive, true);
});
