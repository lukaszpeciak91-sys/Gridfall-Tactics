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
  assert.match(source, /const INSPECT_CARD_TARGET_SCALE = 2\.06;/);
  assert.match(source, /const INSPECT_CARD_TYPOGRAPHY_SCALE = 1\.1;/);
});

test('mulligan selected cards use contained thin-stroke styling with a safe lift', async () => {
  const { calculateBattleLayoutMetrics } = await import('../src/ui/battleLayout.js');
  const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');

  assert.match(source, /const HAND_CARD_SELECTED_LIFT_PX = 14;/);
  assert.match(source, /const MULLIGAN_HAND_CARD_SELECTED_LIFT_PX = HAND_CARD_SELECTED_LIFT_PX \+ 3;/);
  assert.match(source, /const MULLIGAN_SELECTION_BORDER_WIDTH_PX = 1\.5;/);
  assert.match(source, /const activeFrameStrokeWidth = isMulliganSelected \? MULLIGAN_SELECTION_BORDER_WIDTH_PX : 5;/);
  assert.match(source, /const activeGlowStrokeWidth = isMulliganSelected \? 0 : 5;/);
  assert.match(source, /const activeGlowStrokeAlpha = isMulliganSelected \? 0 : 0\.65;/);
  assert.match(source, /const activeGlowFillAlpha = isMulliganSelected \? 0 : 0\.12;/);
  assert.match(source, /const activeOutlineAlpha = isMulliganSelected \? 0 : 0\.92;/);
  assert.match(source, /const activeFrameFillAlpha = isMulliganSelected \? 0\.98 : 0\.95;/);
  assert.match(source, /const selectedLift = isMulliganSelected \? MULLIGAN_HAND_CARD_SELECTED_LIFT_PX : HAND_CARD_SELECTED_LIFT_PX;/);
  assert.match(source, /card\.root\.setPosition\(card\.baseX, isActiveHandCard \? card\.baseY - selectedLift : card\.baseY\)\.setScale\(1\)/);

  const mobileViewports = [
    [360, 800],
    [390, 844],
    [414, 896],
  ];
  const mulliganLift = 17;
  const clearances = mobileViewports.map(([width, height]) => {
    const layout = calculateBattleLayoutMetrics(width, height, { maxHandSize: 5 });
    const selectedCardTop = layout.hand.cardCenterY - mulliganLift - layout.hand.cardHeight / 2;
    const playerBaseBottom = layout.playerHero.y + layout.playerHero.h;
    const normalCardWidth = layout.hand.cardWidth;
    const normalCardHeight = layout.hand.cardHeight;

    assert.equal(layout.hand.cardWidth, normalCardWidth, 'mulligan lift must not affect card width');
    assert.equal(layout.hand.cardHeight, normalCardHeight, 'mulligan lift must not affect card height');
    return selectedCardTop - playerBaseBottom;
  });

  assert.ok(Math.min(...clearances) >= 2.3, 'selected mulligan cards keep positive player-base clearance on target mobile sizes');
});
