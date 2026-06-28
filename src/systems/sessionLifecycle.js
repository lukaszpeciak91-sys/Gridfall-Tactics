import Phaser from 'phaser';

const lifecycleEvents = [
  'visibilitychange',
  'fullscreenchange',
  'webkitfullscreenchange',
];

const windowLifecycleEvents = [
  'blur',
  'focus',
  'pagehide',
  'pageshow',
];

function getRendererDiagnostics(game) {
  const renderer = game?.renderer ?? null;
  const canvas = game?.canvas ?? renderer?.canvas ?? null;
  const gl = renderer?.gl ?? null;

  return {
    rendererType: renderer?.type ?? 'unknown',
    canvasExists: Boolean(canvas),
    canvasConnected: Boolean(canvas?.isConnected),
    contextLost: Boolean(gl?.isContextLost?.()),
  };
}

function getSceneDiagnostics(game) {
  const manager = game?.scene ?? null;
  const scenes = manager?.getScenes?.(false) ?? [];

  return scenes.map((scene) => ({
    key: scene?.scene?.key ?? 'unknown',
    active: Boolean(scene?.scene?.isActive?.()),
    paused: Boolean(scene?.scene?.isPaused?.()),
    sleeping: Boolean(scene?.scene?.isSleeping?.()),
    visible: Boolean(scene?.scene?.isVisible?.()),
    hasGameState: Boolean(scene?.gameState),
  }));
}

function isFullscreenActive(game) {
  if (typeof document === 'undefined') return Boolean(game?.scale?.isFullscreen);
  return Boolean(document.fullscreenElement
    ?? document.webkitFullscreenElement
    ?? document.mozFullScreenElement
    ?? document.msFullscreenElement
    ?? game?.scale?.isFullscreen);
}

function getSceneKey(scene) {
  return scene?.scene?.key ?? 'unknown';
}

function getSceneStack(game) {
  const manager = game?.scene ?? null;
  const scenes = manager?.getScenes?.(false) ?? [];
  return scenes.map((scene, index) => ({ scene, index }))
    .filter(({ scene }) => scene?.scene)
    .map(({ scene, index }) => ({
      scene,
      index,
      key: getSceneKey(scene),
      active: Boolean(scene.scene.isActive?.()),
      paused: Boolean(scene.scene.isPaused?.()),
      sleeping: Boolean(scene.scene.isSleeping?.()),
      visible: Boolean(scene.scene.isVisible?.()),
    }));
}

function getRecoveryContext(game, reason, previousDocumentHidden) {
  const documentHidden = typeof document !== 'undefined' ? Boolean(document.hidden) : undefined;
  const sceneStack = getSceneStack(game);

  return {
    reason,
    documentHidden,
    previousDocumentHidden,
    returningFromHidden: previousDocumentHidden === true && documentHidden === false,
    fullscreen: isFullscreenActive(game),
    activeSceneKey: sceneStack.filter((entry) => entry.active).at(-1)?.key ?? null,
    scenes: getSceneDiagnostics(game),
    renderer: getRendererDiagnostics(game),
  };
}

function addSceneCandidate(candidates, scene) {
  if (scene?.scene) candidates.push(scene);
}

function getReturnSceneCandidate(game, scene) {
  const returnSceneKey = scene?.returnSceneKey;
  if (typeof returnSceneKey !== 'string' || !returnSceneKey) return null;
  return game?.scene?.getScene?.(returnSceneKey) ?? game?.scene?.get?.(returnSceneKey) ?? null;
}

function getRecoveryCandidates(game) {
  const sceneStack = getSceneStack(game);
  const candidates = [];

  sceneStack
    .filter((entry) => entry.visible || entry.active)
    .sort((a, b) => b.index - a.index)
    .forEach((entry) => addSceneCandidate(candidates, entry.scene));

  [...candidates].forEach((scene) => addSceneCandidate(candidates, getReturnSceneCandidate(game, scene)));

  const battleScene = game?.scene?.getScene?.('BattleScene') ?? game?.scene?.get?.('BattleScene') ?? null;
  addSceneCandidate(candidates, battleScene);

  return candidates;
}

function recoverScene(scene, reason, context) {
  if (typeof scene?.recoverAfterVisibilityReturn === 'function') {
    scene.recoverAfterVisibilityReturn(reason, context);
    return true;
  }

  if (getSceneKey(scene) === 'BattleScene' && typeof scene?.recoverFromLifecycle === 'function') {
    scene.recoverFromLifecycle(reason, context);
    return true;
  }

  return false;
}

function recoverSceneStack(game, reason, previousDocumentHidden) {
  game?.loop?.wake?.();
  game?.scale?.refresh?.();

  const context = getRecoveryContext(game, reason, previousDocumentHidden);
  const recoveredScenes = new Set();
  let recoveredCount = 0;

  getRecoveryCandidates(game).forEach((scene) => {
    const key = getSceneKey(scene);
    if (recoveredScenes.has(scene)) return;
    recoveredScenes.add(scene);

    try {
      if (recoverScene(scene, reason, context)) recoveredCount += 1;
    } catch (error) {
      console.warn(`Session lifecycle recovery failed for ${key}.`, { reason, error, context });
    }
  });

  game?.canvas?.focus?.();

  if (recoveredCount === 0) {
    console.debug('Session lifecycle recovery completed without scene hooks', context);
  }
}

export function installSessionLifecycle(game) {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !game) {
    return () => {};
  }

  let previousDocumentHidden = typeof document !== 'undefined' ? Boolean(document.hidden) : undefined;

  const scheduleRecovery = (reason) => {
    const hiddenBeforeEvent = previousDocumentHidden;
    previousDocumentHidden = typeof document !== 'undefined' ? Boolean(document.hidden) : previousDocumentHidden;
    window.requestAnimationFrame(() => recoverSceneStack(game, reason, hiddenBeforeEvent));
  };

  const onDocumentLifecycle = (event) => {
    scheduleRecovery(event.type);
  };

  const onWindowLifecycle = (event) => {
    scheduleRecovery(event.type);
  };

  lifecycleEvents.forEach((eventName) => {
    document.addEventListener(eventName, onDocumentLifecycle, false);
  });
  windowLifecycleEvents.forEach((eventName) => {
    window.addEventListener(eventName, onWindowLifecycle, false);
  });

  const onPhaserPause = () => scheduleRecovery('phaser-pause');
  const onPhaserResume = () => scheduleRecovery('phaser-resume');
  game.events.on(Phaser.Core.Events.PAUSE, onPhaserPause);
  game.events.on(Phaser.Core.Events.RESUME, onPhaserResume);

  const canvas = game.canvas ?? game.renderer?.canvas;
  const onContextLost = (event) => {
    event.preventDefault?.();
    scheduleRecovery('webglcontextlost');
  };
  const onContextRestored = () => scheduleRecovery('webglcontextrestored');
  canvas?.addEventListener?.('webglcontextlost', onContextLost, false);
  canvas?.addEventListener?.('webglcontextrestored', onContextRestored, false);

  return () => {
    lifecycleEvents.forEach((eventName) => {
      document.removeEventListener(eventName, onDocumentLifecycle, false);
    });
    windowLifecycleEvents.forEach((eventName) => {
      window.removeEventListener(eventName, onWindowLifecycle, false);
    });
    game.events.off(Phaser.Core.Events.PAUSE, onPhaserPause);
    game.events.off(Phaser.Core.Events.RESUME, onPhaserResume);
    canvas?.removeEventListener?.('webglcontextlost', onContextLost, false);
    canvas?.removeEventListener?.('webglcontextrestored', onContextRestored, false);
  };
}
