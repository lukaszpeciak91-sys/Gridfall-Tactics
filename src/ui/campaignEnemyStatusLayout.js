const ATTEMPT_INDICATOR_RIGHT_MARGIN = 14;
const ACTIVE_ATTEMPT_INDICATOR_BOTTOM_MARGIN = 55;
const ATTEMPT_INDICATOR_WIDTH = 58;
const ATTEMPT_INDICATOR_HEIGHT = 28;
const ATTEMPT_INDICATOR_PADDING_X = 12;
const ATTEMPT_INDICATOR_PADDING_Y = 7;

export const CAMPAIGN_ENEMY_STATUS_LAYOUT = Object.freeze({
  rightMargin: ATTEMPT_INDICATOR_RIGHT_MARGIN,
  bottomMargin: ACTIVE_ATTEMPT_INDICATOR_BOTTOM_MARGIN,
  indicatorWidth: ATTEMPT_INDICATOR_WIDTH,
  indicatorHeight: ATTEMPT_INDICATOR_HEIGHT,
  paddingX: ATTEMPT_INDICATOR_PADDING_X,
  paddingY: ATTEMPT_INDICATOR_PADDING_Y,
});

export function getCampaignEnemyStatusBadgeLayout({ y, cardWidth, cardHeight }) {
  const panelWidth = ATTEMPT_INDICATOR_WIDTH + ATTEMPT_INDICATOR_PADDING_X * 2;
  const panelHeight = ATTEMPT_INDICATOR_HEIGHT + ATTEMPT_INDICATOR_PADDING_Y * 2;
  const centerX = cardWidth / 2 - ATTEMPT_INDICATOR_RIGHT_MARGIN - panelWidth / 2;
  const centerY = y + cardHeight - ACTIVE_ATTEMPT_INDICATOR_BOTTOM_MARGIN - panelHeight / 2;

  return {
    centerX,
    centerY,
    panelWidth,
    panelHeight,
    indicatorWidth: ATTEMPT_INDICATOR_WIDTH,
    indicatorHeight: ATTEMPT_INDICATOR_HEIGHT,
    x: centerX - panelWidth / 2,
    y: centerY - panelHeight / 2,
  };
}
