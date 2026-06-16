export const FACTION_SELECTION_TAP_DRAG_THRESHOLD_PX = 10;

const getPointerPosition = (pointer = {}) => ({
  x: Number.isFinite(pointer.x) ? pointer.x : 0,
  y: Number.isFinite(pointer.y) ? pointer.y : 0,
});

export function createTapVsDragInteraction({ thresholdPx = FACTION_SELECTION_TAP_DRAG_THRESHOLD_PX } = {}) {
  let gesture = null;

  const movementExceeded = (pointer, scrollY) => {
    if (!gesture) return false;
    const { x, y } = getPointerPosition(pointer);
    const pointerDistance = Math.hypot(x - gesture.startX, y - gesture.startY);
    const scrollDistance = Math.abs((Number.isFinite(scrollY) ? scrollY : gesture.lastScrollY) - gesture.startScrollY);
    return pointerDistance > thresholdPx || scrollDistance > thresholdPx;
  };

  return {
    thresholdPx,

    begin(pointer, scrollY = 0) {
      const { x, y } = getPointerPosition(pointer);
      gesture = {
        pointerId: pointer?.id,
        startX: x,
        startY: y,
        startScrollY: Number.isFinite(scrollY) ? scrollY : 0,
        lastScrollY: Number.isFinite(scrollY) ? scrollY : 0,
        dragged: false,
      };
    },

    update(pointer, scrollY = gesture?.lastScrollY ?? 0) {
      if (!gesture || (pointer?.id !== undefined && gesture.pointerId !== pointer.id)) return false;
      gesture.lastScrollY = Number.isFinite(scrollY) ? scrollY : gesture.lastScrollY;
      gesture.dragged = gesture.dragged || movementExceeded(pointer, gesture.lastScrollY);
      return gesture.dragged;
    },

    allowsTap(pointer, scrollY = gesture?.lastScrollY ?? 0) {
      if (!gesture || (pointer?.id !== undefined && gesture.pointerId !== pointer.id)) return true;
      this.update(pointer, scrollY);
      return !gesture.dragged;
    },

    end(pointer, scrollY = gesture?.lastScrollY ?? 0) {
      const allowed = this.allowsTap(pointer, scrollY);
      if (!gesture || pointer?.id === undefined || gesture.pointerId === pointer.id) {
        gesture = null;
      }
      return allowed;
    },

    cancel() {
      gesture = null;
    },
  };
}
