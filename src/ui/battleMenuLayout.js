export function calculateBattleUtilityMenuLayout({
  width,
  height,
  margin,
  triggerX,
  triggerY,
  triggerWidth,
  triggerHeight,
  actionCount,
}) {
  const panelLeft = triggerX + triggerWidth / 2;
  const menuScale = 1.1;
  const basePanelContentWidth = 208;
  const basePanelHeight = 186;
  const panelContentWidth = Math.round(basePanelContentWidth * menuScale);
  const panelHorizontalPadding = Math.round(4 * menuScale);
  const panelWidth = Math.min(panelContentWidth + panelHorizontalPadding * 2, width - margin - panelLeft);
  const rowOffset = Math.round(28 * menuScale);
  const buttonHeight = Math.round(36 * menuScale);
  const buttonGap = Math.round(42 * menuScale);
  const firstButtonOffsetFromRow = Math.round(50 * menuScale);
  const bottomPadding = Math.round(14 * menuScale);
  const visibleActionCount = Math.max(0, Number.isFinite(actionCount) ? Math.floor(actionCount) : 0);
  const actionsHeight = visibleActionCount > 0
    ? firstButtonOffsetFromRow + buttonHeight / 2 + buttonGap * (visibleActionCount - 1) + bottomPadding
    : rowOffset + bottomPadding;
  const panelHeight = Math.max(basePanelHeight, Math.ceil(rowOffset + actionsHeight));
  const basePanelTop = triggerY - triggerHeight / 2;
  const panelBottom = Math.min(height - margin, basePanelTop + basePanelHeight);
  const panelTop = Math.max(margin, panelBottom - panelHeight);
  const panelX = Math.min(width - margin - panelWidth / 2, panelLeft + basePanelContentWidth / 2 + 14);
  const panelY = panelTop + panelHeight / 2;
  const rowY = panelTop + rowOffset;
  const buttonWidth = Math.max(0, panelWidth - panelHorizontalPadding * 2);
  const buttonX = panelX;
  const firstButtonY = rowY + firstButtonOffsetFromRow;

  return {
    panelLeft,
    menuScale,
    basePanelContentWidth,
    basePanelHeight,
    panelContentWidth,
    panelHorizontalPadding,
    panelWidth,
    panelHeight,
    panelTop,
    panelX,
    panelY,
    rowY,
    buttonWidth,
    buttonHeight,
    buttonX,
    firstButtonY,
    buttonGap,
    buttonPositions: Array.from({ length: visibleActionCount }, (_, index) => ({
      index,
      y: firstButtonY + buttonGap * index,
      top: firstButtonY + buttonGap * index - buttonHeight / 2,
      bottom: firstButtonY + buttonGap * index + buttonHeight / 2,
    })),
  };
}
