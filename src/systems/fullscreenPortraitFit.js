const PORTRAIT_GAME_WIDTH = 390;
const PORTRAIT_GAME_HEIGHT = 844;
const WIDE_VIEWPORT_RATIO = 1.05;
const VIEWPORT_RESIZE_EVENTS = [
  'resize',
  'orientationchange',
  'fullscreenchange',
  'webkitfullscreenchange',
];
const ROTATION_REFRESH_FRAME_COUNT = 4;

function getFullscreenElement() {
  if (typeof document === 'undefined') {
    return null;
  }

  return document.fullscreenElement
    ?? document.webkitFullscreenElement
    ?? document.mozFullScreenElement
    ?? document.msFullscreenElement
    ?? null;
}

function getViewportSize() {
  const visualViewport = globalThis.visualViewport;
  const width = visualViewport?.width ?? globalThis.innerWidth ?? document.documentElement?.clientWidth ?? 0;
  const height = visualViewport?.height ?? globalThis.innerHeight ?? document.documentElement?.clientHeight ?? 0;

  return { width, height };
}

function getBodySafeAreaPadding() {
  if (typeof document === 'undefined' || typeof globalThis.getComputedStyle !== 'function') {
    return { horizontal: 0, vertical: 0 };
  }

  const bodyStyle = globalThis.getComputedStyle(document.body);
  const left = Number.parseFloat(bodyStyle.paddingLeft) || 0;
  const right = Number.parseFloat(bodyStyle.paddingRight) || 0;
  const top = Number.parseFloat(bodyStyle.paddingTop) || 0;
  const bottom = Number.parseFloat(bodyStyle.paddingBottom) || 0;

  return {
    horizontal: left + right,
    vertical: top + bottom,
  };
}

function isFullscreenActive(game) {
  return Boolean(getFullscreenElement()) || Boolean(game?.scale?.isFullscreen);
}

function isWideViewport(width, height) {
  return width > height * WIDE_VIEWPORT_RATIO;
}

export function calculatePortraitFrameFit(viewportWidth, viewportHeight, {
  gameWidth = PORTRAIT_GAME_WIDTH,
  gameHeight = PORTRAIT_GAME_HEIGHT,
  safeHorizontal = 0,
  safeVertical = 0,
} = {}) {
  const availableWidth = Math.max(1, viewportWidth - safeHorizontal);
  const availableHeight = Math.max(1, viewportHeight - safeVertical);
  const scale = Math.min(availableWidth / gameWidth, availableHeight / gameHeight);
  const width = Math.floor(gameWidth * scale);
  const height = Math.floor(gameHeight * scale);

  return {
    availableWidth,
    availableHeight,
    scale,
    width,
    height,
  };
}

export function calculateForcedLandscapePortraitFit(viewportWidth, viewportHeight, options = {}) {
  return calculatePortraitFrameFit(viewportWidth, viewportHeight, options);
}

export function shouldApplyPortraitFrameFit(viewportWidth, viewportHeight, { isFullscreen = false } = {}) {
  return isFullscreen || isWideViewport(viewportWidth, viewportHeight);
}

function getCurrentPortraitFrameFit() {
  const viewport = getViewportSize();
  const safeArea = getBodySafeAreaPadding();

  return {
    viewport,
    fit: calculatePortraitFrameFit(viewport.width, viewport.height, {
      safeHorizontal: safeArea.horizontal,
      safeVertical: safeArea.vertical,
    }),
  };
}

function applyPortraitFrameFit(game, appElement, { isFullscreen }) {
  const { viewport, fit } = getCurrentPortraitFrameFit();
  const scaleManager = game?.scale;

  appElement.dataset.portraitFrameFit = 'true';
  appElement.dataset.portraitFrameFullscreen = isFullscreen ? 'true' : 'false';
  appElement.style.setProperty('--portrait-frame-fit-width', `${fit.width}px`);
  appElement.style.setProperty('--portrait-frame-fit-height', `${fit.height}px`);
  appElement.style.setProperty('width', `${fit.width}px`);
  appElement.style.setProperty('height', `${fit.height}px`);
  appElement.style.setProperty('max-width', `${fit.availableWidth}px`);
  appElement.style.setProperty('max-height', `${fit.availableHeight}px`);

  scaleManager?.setParentSize?.(fit.width, fit.height);
  scaleManager?.refresh?.();

  return { viewport, fit };
}

function restoreDefaultFit(game, appElement) {
  delete appElement.dataset.portraitFrameFit;
  delete appElement.dataset.portraitFrameFullscreen;
  appElement.style.removeProperty('--portrait-frame-fit-width');
  appElement.style.removeProperty('--portrait-frame-fit-height');
  appElement.style.removeProperty('width');
  appElement.style.removeProperty('height');
  appElement.style.removeProperty('max-width');
  appElement.style.removeProperty('max-height');
  game?.canvas?.style?.removeProperty('width');
  game?.canvas?.style?.removeProperty('height');
  game?.scale?.refresh?.();
}

export function installFullscreenPortraitFit(game, appElement = null) {
  const resolvedAppElement = appElement ?? (typeof document !== 'undefined' ? document.getElementById('app') : null);

  if (!game || !resolvedAppElement || typeof globalThis.addEventListener !== 'function') {
    return () => {};
  }

  let animationFrame = 0;
  let applied = false;
  let pendingFrames = 0;

  const update = () => {
    animationFrame = 0;

    const viewport = getViewportSize();
    const isFullscreen = isFullscreenActive(game);

    if (shouldApplyPortraitFrameFit(viewport.width, viewport.height, { isFullscreen })) {
      applyPortraitFrameFit(game, resolvedAppElement, { isFullscreen });
      applied = true;
    } else if (applied) {
      restoreDefaultFit(game, resolvedAppElement);
      applied = false;
    } else {
      game?.scale?.refresh?.();
    }

    pendingFrames -= 1;
    if (pendingFrames > 0) {
      animationFrame = globalThis.requestAnimationFrame?.(update) ?? globalThis.setTimeout(update, 0);
    }
  };

  const scheduleUpdate = () => {
    pendingFrames = ROTATION_REFRESH_FRAME_COUNT;

    if (animationFrame) {
      globalThis.cancelAnimationFrame?.(animationFrame);
      globalThis.clearTimeout?.(animationFrame);
    }

    animationFrame = globalThis.requestAnimationFrame?.(update) ?? globalThis.setTimeout(update, 0);
  };

  VIEWPORT_RESIZE_EVENTS.forEach((eventName) => {
    globalThis.addEventListener(eventName, scheduleUpdate, { passive: true });
  });
  globalThis.visualViewport?.addEventListener?.('resize', scheduleUpdate, { passive: true });
  globalThis.visualViewport?.addEventListener?.('scroll', scheduleUpdate, { passive: true });
  game.scale?.on?.('enterfullscreen', scheduleUpdate);
  game.scale?.on?.('leavefullscreen', scheduleUpdate);

  scheduleUpdate();

  return () => {
    if (animationFrame) {
      globalThis.cancelAnimationFrame?.(animationFrame);
      globalThis.clearTimeout?.(animationFrame);
    }

    pendingFrames = 0;
    VIEWPORT_RESIZE_EVENTS.forEach((eventName) => {
      globalThis.removeEventListener(eventName, scheduleUpdate);
    });
    globalThis.visualViewport?.removeEventListener?.('resize', scheduleUpdate);
    globalThis.visualViewport?.removeEventListener?.('scroll', scheduleUpdate);
    game.scale?.off?.('enterfullscreen', scheduleUpdate);
    game.scale?.off?.('leavefullscreen', scheduleUpdate);
    restoreDefaultFit(game, resolvedAppElement);
  };
}
