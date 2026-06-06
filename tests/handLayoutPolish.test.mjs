import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  HAND_CARD_ASPECT_RATIO,
  HAND_CARD_MAX_WIDTH_RATIO,
  HAND_CARD_PRE_POLISH_MAX_WIDTH_RATIO,
  HAND_CARD_PROPORTIONAL_SCALE,
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

test('mobile hand polish scales card footprint proportionally by two percent', () => {
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
  assert.equal(HAND_CARD_MAX_WIDTH_RATIO, 0.29784);
  assert.equal(HAND_CARD_WIDTH_POLISH_SCALE, 1.0608);
  assert.equal(HAND_CARD_PROPORTIONAL_SCALE, 1.02);
  assert.equal(HAND_CARD_TRACK_BLEED_RATIO, 1);
  const previousFootprintWidth = previousWidth * 1.04;
  const previousFootprintHeight = previousWidth * HAND_CARD_ASPECT_RATIO;

  assert.ok(Math.abs(layout.cardWidth - previousFootprintWidth * HAND_CARD_PROPORTIONAL_SCALE) < 1e-9);
  assert.ok(Math.abs(layout.cardHeight - previousFootprintHeight * HAND_CARD_PROPORTIONAL_SCALE) < 1e-9);
  assert.ok(Math.abs((layout.cardHeight / layout.cardWidth) - (previousFootprintHeight / previousFootprintWidth)) < 1e-12);
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

test('selected hand cards use contained thin-stroke styling with safe lifts', async () => {
  const { calculateBattleLayoutMetrics } = await import('../src/ui/battleLayout.js');
  const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');

  assert.match(source, /const HAND_CARD_SELECTED_LIFT_PX = 14;/);
  assert.match(source, /const MULLIGAN_HAND_CARD_SELECTED_LIFT_PX = HAND_CARD_SELECTED_LIFT_PX;/);
  assert.match(source, /const MULLIGAN_SELECTION_BORDER_WIDTH_PX = 1\.5;/);
  assert.match(source, /const usesSelectionTreatment = isMulliganSelected \|\| isGameplaySelected;/);
  assert.match(source, /const activeFrameStrokeWidth = usesSelectionTreatment \? MULLIGAN_SELECTION_BORDER_WIDTH_PX : 5;/);
  assert.match(source, /const activeGlowStrokeWidth = usesSelectionTreatment \? 0 : 5;/);
  assert.match(source, /const activeGlowStrokeAlpha = usesSelectionTreatment \? 0 : 0\.65;/);
  assert.match(source, /const activeGlowFillAlpha = usesSelectionTreatment \? 0 : 0\.12;/);
  assert.match(source, /const activeOutlineAlpha = usesSelectionTreatment \? 0 : 0\.92;/);
  assert.match(source, /const activeFrameFillAlpha = usesSelectionTreatment \? 0\.98 : 0\.95;/);
  assert.match(source, /const activeFrameStrokeAlpha = usesSelectionTreatment \? 0\.9 : 1;/);
  assert.match(source, /const selectedLift = isMulliganSelected \? MULLIGAN_HAND_CARD_SELECTED_LIFT_PX : HAND_CARD_SELECTED_LIFT_PX;/);
  assert.match(source, /card\.root\.setPosition\(card\.baseX, isActiveHandCard \? card\.baseY - selectedLift : card\.baseY\)\.setScale\(1\)/);

  const mobileViewports = [
    [360, 800],
    [390, 844],
    [414, 896],
  ];
  const gameplayLift = 14;
  const mulliganLift = 14;
  const clearances = mobileViewports.map(([width, height]) => {
    const layout = calculateBattleLayoutMetrics(width, height, { maxHandSize: 5 });
    const normalCardTop = layout.hand.cardCenterY - layout.hand.cardHeight / 2;
    const gameplaySelectedCardTop = normalCardTop - gameplayLift;
    const mulliganSelectedCardTop = normalCardTop - mulliganLift;
    const cardBottom = layout.hand.cardCenterY + layout.hand.cardHeight / 2;
    const playerBaseBottom = layout.playerHero.y + layout.playerHero.h;

    assert.ok(normalCardTop - playerBaseBottom > 0, 'normal hand card must clear player base');
    assert.ok(gameplaySelectedCardTop - playerBaseBottom > 0, 'gameplay selected hand card must clear player base');
    assert.ok(height - cardBottom >= 18.8, 'proportional polish must preserve bottom safe inset');
    return mulliganSelectedCardTop - playerBaseBottom;
  });

  assert.ok(Math.min(...clearances) >= 3.5, 'selected mulligan cards keep positive player-base clearance on target mobile sizes');
});
