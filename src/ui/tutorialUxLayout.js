export function calculateTutorialBannerLayout({ width, height, board, margin }) {
  const maxTextWidth = Math.min(board.width * 0.86, width - margin * 2 - 32);
  const enemyRowBottom = board.centerY - board.cellHeight * 0.5;
  const playerRowTop = board.centerY + board.cellHeight * 0.5;
  const gap = Math.max(14, Math.min(34, board.cellHeight * 0.22, height * 0.04));
  const centerBetweenRows = (enemyRowBottom + playerRowTop) * 0.5;
  const targetY = Math.min(playerRowTop - gap, Math.max(enemyRowBottom + gap, centerBetweenRows));
  return {
    x: width * 0.5,
    targetY,
    maxTextWidth,
    fontSize: Math.min(20, Math.max(15, Math.floor(Math.max(board.cellWidth * 0.14, height * 0.018)))),
    overlayX: width * 0.5,
    overlayY: height * 0.5,
    overlayWidth: width,
    overlayHeight: height,
  };
}

export function calculateCentralBattleBannerLayout({ width, board, margin, baseWidthRatio = 0.9, horizontalPadding = 0, startOffset = 6 }) {
  const maxTextWidth = Math.min(board.width * baseWidthRatio * 1.2, width - margin * 2 - horizontalPadding * 2);
  const targetY = board.centerY;
  return {
    x: width * 0.5,
    targetY,
    startY: targetY + startOffset,
    maxTextWidth,
  };
}


function isLiveDisplayObject(object) {
  if (!object) return false;
  if (object.active === false || object.visible === false || object.destroyed === true) return false;
  if ((object.alpha ?? 1) <= 0) return false;
  if (!object.scene) return false;
  return true;
}

export function isLiveCardView(cardView, getObjectBounds = null) {
  if (!cardView) return false;
  const boundsObject = cardView.background ?? cardView.container ?? cardView.root;
  if (!isLiveDisplayObject(boundsObject)) return false;
  if (cardView.root && !isLiveDisplayObject(cardView.root)) return false;
  if (cardView.container && !isLiveDisplayObject(cardView.container)) return false;
  if (boundsObject.parentContainer && !isLiveDisplayObject(boundsObject.parentContainer)) return false;
  if (typeof getObjectBounds === 'function' && !getObjectBounds(boundsObject, 7)) return false;
  return true;
}

export function getLiveHandCardViewById(cardViews = [], cardId, getObjectBounds = null) {
  if (!cardId) return null;
  return cardViews.find((cardView) => {
    const matchesCard = cardView?.card?.id === cardId || cardView?.cardId === cardId;
    return matchesCard && isLiveCardView(cardView, getObjectBounds);
  }) ?? null;
}

export function calculateHandCardFocusBounds(cardViews = [], cardId, getObjectBounds) {
  const view = getLiveHandCardViewById(cardViews, cardId, getObjectBounds);
  if (!view?.background) return null;
  const bounds = getObjectBounds(view.background, 7);
  if (!bounds) return null;
  if (view.root && Number.isFinite(view.root.x) && Number.isFinite(view.root.y)) {
    return { ...bounds, x: view.root.x + (view.background.x ?? 0), y: view.root.y + (view.background.y ?? 0) };
  }
  return bounds;
}
