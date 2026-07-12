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

function emitSessionLifecycleSignal(game, reason) {
  game?.events?.emit?.('session-lifecycle:signal', {
    reason,
    documentHidden: typeof document !== 'undefined' ? document.hidden : undefined,
  });
}

function recoverActiveBattleScene(game, reason) {
  const scenePlugin = game?.scene;
  const battleScene = scenePlugin?.getScene?.('BattleScene') ?? scenePlugin?.get?.('BattleScene') ?? null;
  const activeScene = scenePlugin?.getScenes?.(true)?.at?.(-1) ?? null;
  const activeSceneKey = activeScene?.scene?.key ?? null;
  const diagnostics = {
    reason,
    documentHidden: typeof document !== 'undefined' ? document.hidden : undefined,
    activeSceneKey,
    scenes: getSceneDiagnostics(game),
    renderer: getRendererDiagnostics(game),
  };

  if (!battleScene) {
    console.debug('Session lifecycle recovery skipped: BattleScene missing', diagnostics);
    return;
  }

  if (typeof battleScene.recoverFromLifecycle === 'function') {
    battleScene.recoverFromLifecycle(reason, diagnostics);
    return;
  }

  console.debug('Session lifecycle recovery diagnostics', diagnostics);
}

export function installSessionLifecycle(game) {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !game) {
    return () => {};
  }

  const scheduleRecovery = (reason) => {
    emitSessionLifecycleSignal(game, reason);
    window.requestAnimationFrame(() => recoverActiveBattleScene(game, reason));
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
