export const BOARD_UNIT_STATUS_KIND = Object.freeze({
  HP_FLOOR: 'hp-floor',
  MOVE_DISABLE_IMMUNITY: 'move-disable-immunity',
});

const STATUS_PRESENTATIONS = Object.freeze({
  [BOARD_UNIT_STATUS_KIND.HP_FLOOR]: Object.freeze({
    kind: BOARD_UNIT_STATUS_KIND.HP_FLOOR,
    color: 0xf6c453,
    cue: 'shield',
  }),
  [BOARD_UNIT_STATUS_KIND.MOVE_DISABLE_IMMUNITY]: Object.freeze({
    kind: BOARD_UNIT_STATUS_KIND.MOVE_DISABLE_IMMUNITY,
    color: 0x67d4e8,
    cue: 'brace',
  }),
});

export function getBoardUnitStatusPresentation(unit, state) {
  return getBoardUnitStatusPresentations(unit, state)[0] ?? null;
}

export function getBoardUnitStatusPresentations(unit, state) {
  if (!unit?.owner || !state) return [];
  return [
    state.cannotDropBelowOneThisTurn?.[unit.owner] === true
      ? STATUS_PRESENTATIONS[BOARD_UNIT_STATUS_KIND.HP_FLOOR]
      : null,
    state.immuneMoveDisableThisTurn?.[unit.owner] === true
      ? STATUS_PRESENTATIONS[BOARD_UNIT_STATUS_KIND.MOVE_DISABLE_IMMUNITY]
      : null,
  ].filter(Boolean);
}

export function getBoardUnitStatusMarkerGeometry(width, height, {
  artRect = null,
  owner = null,
  markerIndex = 0,
  inspect = false,
} = {}) {
  const inset = Math.max(4, Math.round(Math.min(width, height) * (inspect ? 0.026 : 0.035)));
  const cornerSize = Math.max(12, Math.round(Math.min(width, height) * (inspect ? 0.11 : 0.15)));
  if (!artRect || (owner !== 'player' && owner !== 'enemy')) {
    return {
      inset,
      cornerSize,
      x: width * 0.5 - inset - cornerSize * 0.5,
      y: -height * 0.5 + inset + cornerSize * 0.5,
    };
  }

  const artInset = Math.max(5, Math.min(8, Math.round(Math.min(width, height) * 0.04)));
  const gap = Math.max(3, Math.round(cornerSize * 0.2));
  return {
    inset,
    cornerSize,
    gap,
    x: artRect.x + artRect.width - artInset - cornerSize * 0.5
      - markerIndex * (cornerSize + gap),
    y: owner === 'enemy'
      ? artRect.y + artRect.height - artInset - cornerSize * 0.5
      : artRect.y + artInset + cornerSize * 0.5,
  };
}

export function createBoardUnitStatusMarker(scene, width, height, presentation, options = {}) {
  if (!scene?.add || !presentation || width <= 0 || height <= 0) return null;

  const { inspect = false } = options;
  const { inset, cornerSize, x, y } = getBoardUnitStatusMarkerGeometry(width, height, options);
  const lineWidth = Math.max(1, Math.round(Math.min(width, height) * (inspect ? 0.009 : 0.012)));
  const marker = scene.add.container(0, 0);
  marker.name = `boardStatusMarker:${presentation.kind}`;

  const innerEdge = scene.add.rectangle(0, 0, width - inset * 2, height - inset * 2, presentation.color, 0)
    .setStrokeStyle(lineWidth, presentation.color, 0.62);
  const badge = scene.add.circle(x, y, cornerSize * 0.5, 0x07111f, 0.82)
    .setStrokeStyle(lineWidth, presentation.color, 0.92);
  const icon = scene.add.graphics().setPosition(x, y);
  icon.lineStyle(lineWidth, presentation.color, 1);

  const radius = cornerSize * 0.27;
  if (presentation.cue === 'shield') {
    icon.beginPath();
    icon.moveTo(0, -radius);
    icon.lineTo(radius * 0.78, -radius * 0.55);
    icon.lineTo(radius * 0.62, radius * 0.42);
    icon.lineTo(0, radius);
    icon.lineTo(-radius * 0.62, radius * 0.42);
    icon.lineTo(-radius * 0.78, -radius * 0.55);
    icon.closePath();
    icon.strokePath();
  } else {
    icon.beginPath();
    icon.moveTo(-radius * 0.82, -radius);
    icon.lineTo(-radius * 0.82, radius);
    icon.moveTo(radius * 0.82, -radius);
    icon.lineTo(radius * 0.82, radius);
    icon.moveTo(-radius * 0.82, 0);
    icon.lineTo(radius * 0.82, 0);
    icon.strokePath();
  }

  marker.add([innerEdge, badge, icon]);
  marker.statusKind = presentation.kind;
  marker.markerBounds = {
    x: x - cornerSize * 0.5,
    y: y - cornerSize * 0.5,
    width: cornerSize,
    height: cornerSize,
  };
  return marker;
}
