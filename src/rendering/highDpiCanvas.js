import Phaser from 'phaser';

const DEFAULT_MAX_DEVICE_PIXEL_RATIO = 3;

function getDevicePixelRatio(maxDevicePixelRatio = DEFAULT_MAX_DEVICE_PIXEL_RATIO) {
  if (typeof window === 'undefined') {
    return 1;
  }

  const ratio = Number(window.devicePixelRatio) || 1;
  return Math.max(1, Math.min(ratio, maxDevicePixelRatio));
}


function installWebGlScissorScale(renderer) {
  if (renderer.__gridfallSetScissor) {
    return;
  }

  const setScissor = renderer.setScissor.bind(renderer);
  renderer.__gridfallSetScissor = setScissor;
  renderer.setScissor = (x, y, width, height, drawingBufferHeight) => {
    const dpr = renderer.__gridfallDevicePixelRatio || 1;
    const shouldScale = dpr !== 1 && (drawingBufferHeight === undefined || drawingBufferHeight === renderer.drawingBufferHeight);

    if (!shouldScale) {
      return setScissor(x, y, width, height, drawingBufferHeight);
    }

    return setScissor(
      Math.round(x * dpr),
      Math.round(y * dpr),
      Math.round(width * dpr),
      Math.round(height * dpr),
      drawingBufferHeight,
    );
  };
}

function applyHighDpiBackbuffer(game, maxDevicePixelRatio = DEFAULT_MAX_DEVICE_PIXEL_RATIO) {
  const renderer = game?.renderer;
  const scale = game?.scale;
  const canvas = game?.canvas;

  if (!renderer || !scale || !canvas) {
    return;
  }

  const logicalWidth = scale.baseSize?.width || scale.width || game.config.width;
  const logicalHeight = scale.baseSize?.height || scale.height || game.config.height;
  const dpr = getDevicePixelRatio(maxDevicePixelRatio);
  const pixelWidth = Math.max(1, Math.round(logicalWidth * dpr));
  const pixelHeight = Math.max(1, Math.round(logicalHeight * dpr));

  if (canvas.width !== pixelWidth) {
    canvas.width = pixelWidth;
  }

  if (canvas.height !== pixelHeight) {
    canvas.height = pixelHeight;
  }

  if (renderer.type === Phaser.WEBGL && renderer.gl) {
    installWebGlScissorScale(renderer);
    renderer.__gridfallDevicePixelRatio = dpr;
    if (renderer.width !== pixelWidth || renderer.height !== pixelHeight) {
      renderer.resize(pixelWidth, pixelHeight);
    }

    renderer.setProjectionMatrix(logicalWidth, logicalHeight);
    renderer.gl.viewport(0, 0, pixelWidth, pixelHeight);
    renderer.gl.scissor(0, 0, pixelWidth, pixelHeight);
    renderer.defaultScissor[2] = pixelWidth;
    renderer.defaultScissor[3] = pixelHeight;
  } else if (renderer.type === Phaser.CANVAS && renderer.currentContext) {
    if (renderer.width !== pixelWidth || renderer.height !== pixelHeight) {
      renderer.resize(pixelWidth, pixelHeight);
    }

    renderer.currentContext.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  game.registry?.set('render.devicePixelRatio', dpr);
}

export function installHighDpiCanvas(game, { maxDevicePixelRatio = DEFAULT_MAX_DEVICE_PIXEL_RATIO } = {}) {
  const apply = () => applyHighDpiBackbuffer(game, maxDevicePixelRatio);

  game.scale.on('resize', apply);
  game.events.on(Phaser.Core.Events.PRE_RENDER, apply);
  game.events.once(Phaser.Core.Events.DESTROY, () => {
    game.scale.off('resize', apply);
    game.events.off(Phaser.Core.Events.PRE_RENDER, apply);
  });

  apply();
}

export function getRenderDevicePixelRatio(scene) {
  return scene?.game?.registry?.get('render.devicePixelRatio') || getDevicePixelRatio();
}
