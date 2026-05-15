import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  HAND_CARD_ASPECT_RATIO,
  HAND_CARD_MAX_WIDTH_RATIO,
  HAND_CARD_PRE_POLISH_MAX_WIDTH_RATIO,
  HAND_CARD_TRACK_BLEED_RATIO,
  HAND_CARD_WIDTH_POLISH_SCALE,
  calculateHandLayoutMetrics,
} from '../src/ui/handLayout.js';

function getPreviousHandCardWidth({ contentWidth, handHeight }) {
  const cardBottomSafeInset = Math.max(22, Math.round(handHeight * 0.1));
  const cardTopInset = Math.max(5, Math.round(handHeight * 0.024));
  const cardRowHeight = Math.max(0, handHeight - cardBottomSafeInset);
  const maxCardHeight = Math.max(0, cardRowHeight - cardTopInset);
  const baseCardWidth = Math.min(contentWidth * 0.27, maxCardHeight / HAND_CARD_ASPECT_RATIO, handHeight * 0.9);

  return Math.min(
    baseCardWidth * 1.35,
    contentWidth * HAND_CARD_PRE_POLISH_MAX_WIDTH_RATIO,
    maxCardHeight / HAND_CARD_ASPECT_RATIO,
  );
}

test('mobile hand polish widens cards without increasing card height', () => {
  const previousWidth = getPreviousHandCardWidth({ contentWidth: 342, handHeight: 185 });
  const layout = calculateHandLayoutMetrics({
    contentWidth: 342,
    margin: 9,
    handY: 640,
    handHeight: 185,
    viewportHeight: 740,
    maxHandSize: 5,
  });

  assert.equal(HAND_CARD_PRE_POLISH_MAX_WIDTH_RATIO, 0.28);
  assert.equal(HAND_CARD_MAX_WIDTH_RATIO, 0.292);
  assert.equal(HAND_CARD_WIDTH_POLISH_SCALE, 1.04);
  assert.equal(HAND_CARD_TRACK_BLEED_RATIO, 1);
  assert.ok(layout.cardWidth >= previousWidth * 1.039);
  assert.ok(layout.cardWidth <= previousWidth * 1.041);
  assert.equal(layout.cardHeight, previousWidth * HAND_CARD_ASPECT_RATIO);
  assert.ok(layout.handTrackLeft >= 0);
  assert.ok(layout.handTrackLeft + layout.cardWidth + layout.step * 4 <= 360);
});

test('battle hand title emphasis is separate from inspect scaling', () => {
  const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
  const visualSource = fs.readFileSync('src/rendering/cardVisualLayout.js', 'utf8');
  const inspectMethod = source.slice(
    source.indexOf('  showSelectedHandCardZoom()'),
    source.indexOf('  applyInspectDimming(inspectCardId)'),
  );

  assert.match(source, /const HAND_CARD_TYPOGRAPHY_SCALE = 1\.12;/);
  assert.match(source, /const HAND_CARD_TITLE_TYPOGRAPHY_SCALE = 1\.2;/);
  assert.match(source, /titleTypographyScale: HAND_CARD_TITLE_TYPOGRAPHY_SCALE,/);
  assert.match(visualSource, /titleTypographyScale = typographyScale,/);
  assert.match(visualSource, /name: Math\.round\(baseTypography\.name \* titleTypographyScale\),/);
  assert.match(inspectMethod, /typographyScale: INSPECT_CARD_TYPOGRAPHY_SCALE,/);
  assert.doesNotMatch(inspectMethod, /titleTypographyScale:/);
  assert.match(source, /const INSPECT_CARD_TARGET_SCALE = 2\.2;/);
  assert.match(source, /const INSPECT_CARD_TYPOGRAPHY_SCALE = 1\.1;/);
});
