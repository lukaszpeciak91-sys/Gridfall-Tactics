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
  if (!unit?.owner || !state) return null;
  if (state.cannotDropBelowOneThisTurn?.[unit.owner] === true) {
    return STATUS_PRESENTATIONS[BOARD_UNIT_STATUS_KIND.HP_FLOOR];
  }
  if (state.immuneMoveDisableThisTurn?.[unit.owner] === true) {
    return STATUS_PRESENTATIONS[BOARD_UNIT_STATUS_KIND.MOVE_DISABLE_IMMUNITY];
  }
  return null;
}

export function createBoardUnitStatusMarker(scene, width, height, presentation, { inspect = false } = {}) {
  if (!scene?.add || !presentation || width <= 0 || height <= 0) return null;

  const inset = Math.max(4, Math.round(Math.min(width, height) * (inspect ? 0.026 : 0.035)));
  const lineWidth = Math.max(1, Math.round(Math.min(width, height) * (inspect ? 0.009 : 0.012)));
  const cornerSize = Math.max(12, Math.round(Math.min(width, height) * (inspect ? 0.11 : 0.15)));
  const x = width * 0.5 - inset - cornerSize * 0.5;
  const y = -height * 0.5 + inset + cornerSize * 0.5;
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
  return marker;
}
