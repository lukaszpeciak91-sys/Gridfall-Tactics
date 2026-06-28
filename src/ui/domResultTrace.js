const DEBUG_BUILD_MARKER_TEXT = 'DEBUG BUILD: surrender-trace-v2';
const RESULT_TRACE_PREFIX = 'RESULT TRACE V2:';
const DOM_TRACE_ROOT_ID = 'gridfall-result-trace-v2-overlay';
const DOM_BUILD_MARKER_ID = 'gridfall-surrender-trace-v2-build-marker';

function applyFixedDebugStyles(element, styles) {
  Object.assign(element.style, {
    position: 'fixed',
    zIndex: '2147483647',
    pointerEvents: 'none',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    boxSizing: 'border-box',
    ...styles,
  });
}

export function installSurrenderTraceBuildMarker() {
  if (typeof document === 'undefined') return null;

  let marker = document.getElementById(DOM_BUILD_MARKER_ID);
  if (!marker) {
    marker = document.createElement('div');
    marker.id = DOM_BUILD_MARKER_ID;
    marker.textContent = DEBUG_BUILD_MARKER_TEXT;
    document.body.appendChild(marker);
  }

  applyFixedDebugStyles(marker, {
    left: '6px',
    top: '6px',
    maxWidth: 'calc(100vw - 12px)',
    padding: '4px 6px',
    borderRadius: '4px',
    background: 'rgba(127, 29, 29, 0.96)',
    color: '#ffffff',
    fontSize: '11px',
    lineHeight: '1.25',
    letterSpacing: '0.01em',
    whiteSpace: 'nowrap',
  });
  return marker;
}

function getTraceOverlay() {
  if (typeof document === 'undefined') return null;

  let overlay = document.getElementById(DOM_TRACE_ROOT_ID);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = DOM_TRACE_ROOT_ID;
    document.body.appendChild(overlay);
  }

  applyFixedDebugStyles(overlay, {
    left: '6px',
    right: '6px',
    bottom: '6px',
    maxHeight: '42vh',
    overflow: 'hidden',
    padding: '6px 7px',
    borderRadius: '6px',
    background: 'rgba(2, 6, 23, 0.88)',
    color: '#fef3c7',
    fontSize: '11px',
    lineHeight: '1.28',
    whiteSpace: 'pre-wrap',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.9)',
  });
  return overlay;
}

export function appendResultTraceV2(message) {
  const overlay = getTraceOverlay();
  const text = `${RESULT_TRACE_PREFIX} ${message}`;
  if (!overlay) return text;

  const lines = [...(overlay.__gridfallResultTraceLines ?? []), text].slice(-10);
  overlay.__gridfallResultTraceLines = lines;
  overlay.textContent = lines.join('\n');
  return text;
}

export { DEBUG_BUILD_MARKER_TEXT, RESULT_TRACE_PREFIX };
