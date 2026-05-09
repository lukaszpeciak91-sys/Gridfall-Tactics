const PORTRAIT_GAME_WIDTH = 390;
const PORTRAIT_GAME_HEIGHT = 844;
const WIDE_VIEWPORT_RATIO = 1.05;
const VIEWPORT_RESIZE_EVENTS = [
  'resize',
  'orientationchange',
  'fullscreenchange',
  'webkitfullscreenchange',
];

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

export function calculateForcedLandscapePortraitFit(viewportWidth, viewportHeight, {
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

function isForcedLandscapeFullscreen(game) {
  const fullscreenElement = getFullscreenElement();
  const isFullscreen = Boolean(fullscreenElement) || Boolean(game?.scale?.isFullscreen);

  if (!isFullscreen) {
    return false;
  }

  const viewport = getViewportSize();
  return viewport.width > viewport.height * WIDE_VIEWPORT_RATIO;
}

function applyForcedLandscapeFit(game, appElement) {
  const viewport = getViewportSize();
  const safeArea = getBodySafeAreaPadding();
  const fit = calculateForcedLandscapePortraitFit(viewport.width, viewport.height, {
    safeHorizontal: safeArea.horizontal,
    safeVertical: safeArea.vertical,
  });
  const scaleManager = game?.scale;
  const canvas = game?.canvas;

  appElement.dataset.forcedLandscapeFullscreen = 'true';
  appElement.style.setProperty('--forced-landscape-fit-width', `${fit.width}px`);
  appElement.style.setProperty('--forced-landscape-fit-height', `${fit.height}px`);

  canvas?.style?.setProperty('width', `${fit.width}px`);
  canvas?.style?.setProperty('height', `${fit.height}px`);
  scaleManager?.setParentSize?.(fit.width, fit.height);
  scaleManager?.refresh?.();

  return fit;
}

function restoreDefaultFit(game, appElement) {
  const canvas = game?.canvas;

  delete appElement.dataset.forcedLandscapeFullscreen;
  appElement.style.removeProperty('--forced-landscape-fit-width');
  appElement.style.removeProperty('--forced-landscape-fit-height');
  canvas?.style?.removeProperty('width');
  canvas?.style?.removeProperty('height');
  game?.scale?.refresh?.();
}

export function installFullscreenPortraitFit(game, appElement = null) {
  const resolvedAppElement = appElement ?? (typeof document !== 'undefined' ? document.getElementById('app') : null);

  if (!game || !resolvedAppElement || typeof globalThis.addEventListener !== 'function') {
    return () => {};
  }

  let animationFrame = 0;
  let applied = false;

  const update = () => {
    animationFrame = 0;

    if (isForcedLandscapeFullscreen(game)) {
      applyForcedLandscapeFit(game, resolvedAppElement);
      applied = true;
      return;
    }

    if (applied) {
      restoreDefaultFit(game, resolvedAppElement);
      applied = false;
    }
  };

  const scheduleUpdate = () => {
    if (animationFrame) {
      globalThis.cancelAnimationFrame?.(animationFrame);
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
