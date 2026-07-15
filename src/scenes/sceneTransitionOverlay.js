import Phaser from 'phaser';
export const SCENE_TRANSITION_OVERLAY_SCENE_KEY = 'SceneTransitionOverlayScene';
export const SCENE_TRANSITION_VISUALLY_READY_EVENT = 'scene-transition:visually-ready';
export const SCENE_TRANSITION_REGISTRY_KEY = 'gridfall.sceneTransitionOverlay.state';

export const ENABLE_SCENE_TRANSITION_TRACE = true;
export const SCENE_TRANSITION_TRACE_PREFIX = '[scene-transition-trace]';

function getSceneManagerScenes(sceneOrPlugin) {
  return sceneOrPlugin?.manager?.scenes ?? sceneOrPlugin?.scene?.manager?.scenes ?? sceneOrPlugin?.sys?.game?.scene?.scenes ?? sceneOrPlugin?.game?.scene?.scenes ?? [];
}

export function getSceneTransitionTraceSnapshot(sceneOrPlugin, { transitionId = null, sourceSceneKey = null, destinationSceneKey = null } = {}) {
  const scenes = getSceneManagerScenes(sceneOrPlugin);
  const order = scenes.map((scene) => scene?.scene?.key ?? scene?.sys?.settings?.key ?? 'unknown');
  const overlayIndex = order.indexOf(SCENE_TRANSITION_OVERLAY_SCENE_KEY);
  const destinationIndex = typeof destinationSceneKey === 'string' ? order.indexOf(destinationSceneKey) : -1;
  const overlayScene = scenes[overlayIndex];
  const registryState = getSceneTransitionState(sceneOrPlugin?.game ?? sceneOrPlugin?.systems?.game ?? sceneOrPlugin?.sys?.game, transitionId);
  return {
    transitionId,
    sourceSceneKey,
    destinationSceneKey,
    order,
    overlay: {
      active: overlayScene?.scene?.isActive?.() ?? sceneOrPlugin?.isActive?.(SCENE_TRANSITION_OVERLAY_SCENE_KEY) ?? false,
      visible: overlayScene?.scene?.isVisible?.() ?? sceneOrPlugin?.isVisible?.(SCENE_TRANSITION_OVERLAY_SCENE_KEY) ?? false,
      topmost: overlayIndex >= 0 && overlayIndex === order.length - 1,
      index: overlayIndex,
      cameraVisible: overlayScene?.cameras?.main?.visible ?? null,
      cameraAlpha: overlayScene?.cameras?.main?.alpha ?? null,
    },
    destination: {
      index: destinationIndex,
      active: typeof destinationSceneKey === 'string' ? sceneOrPlugin?.isActive?.(destinationSceneKey) ?? false : false,
      visible: typeof destinationSceneKey === 'string' ? sceneOrPlugin?.isVisible?.(destinationSceneKey) ?? false : false,
    },
    overlayAboveDestination: overlayIndex >= 0 && destinationIndex >= 0 && overlayIndex > destinationIndex,
    registryReady: registryState?.ready === true,
    registryState: registryState ? { ready: registryState.ready, completed: registryState.completed, failed: registryState.failed } : null,
  };
}

export function traceSceneTransition(sceneOrPlugin, event, details = {}) {
  if (!ENABLE_SCENE_TRANSITION_TRACE) return;
  const transitionId = details.transitionId ?? sceneOrPlugin?.sceneTransitionOverlay?.transitionId ?? sceneOrPlugin?.transitionId ?? null;
  const destinationSceneKey = details.destinationSceneKey ?? sceneOrPlugin?.destinationSceneKey ?? null;
  const sourceSceneKey = details.sourceSceneKey ?? sceneOrPlugin?.sourceSceneKey ?? sceneOrPlugin?.scene?.key ?? null;
  console.log(SCENE_TRANSITION_TRACE_PREFIX, {
    event,
    timestamp: performance.now(),
    ...getSceneTransitionTraceSnapshot(sceneOrPlugin?.scene ?? sceneOrPlugin, { transitionId, sourceSceneKey, destinationSceneKey }),
    ...details,
  });
}

let transitionSequence = 0;

export function createSceneTransitionId() {
  transitionSequence += 1;
  return `scene-transition-${transitionSequence}`;
}

function getTransitionRegistry(game) {
  const registry = game?.registry;
  if (!registry) return null;
  let state = registry.get(SCENE_TRANSITION_REGISTRY_KEY);
  if (!state || typeof state !== 'object') {
    state = { transitions: {} };
    registry.set(SCENE_TRANSITION_REGISTRY_KEY, state);
  }
  if (!state.transitions || typeof state.transitions !== 'object') state.transitions = {};
  return state;
}

export function getSceneTransitionState(game, transitionId) {
  if (typeof transitionId !== 'string' || !transitionId) return null;
  return getTransitionRegistry(game)?.transitions?.[transitionId] ?? null;
}

export function setSceneTransitionState(game, transitionId, patch = {}) {
  if (typeof transitionId !== 'string' || !transitionId) return null;
  const registry = getTransitionRegistry(game);
  if (!registry) return null;
  const previous = registry.transitions[transitionId] ?? {};
  const next = { ...previous, transitionId, ...patch, updatedAt: Date.now() };
  registry.transitions[transitionId] = next;
  game?.registry?.set?.(SCENE_TRANSITION_REGISTRY_KEY, registry);
  return next;
}

export function clearSceneTransitionState(game, transitionId) {
  const registry = getTransitionRegistry(game);
  if (!registry?.transitions || typeof transitionId !== 'string' || !transitionId) return false;
  if (!Object.prototype.hasOwnProperty.call(registry.transitions, transitionId)) return false;
  delete registry.transitions[transitionId];
  game?.registry?.set?.(SCENE_TRANSITION_REGISTRY_KEY, registry);
  return true;
}

export function markSceneTransitionReady(game, { destinationSceneKey, transitionId, payload = {} } = {}) {
  if (typeof destinationSceneKey !== 'string' || !destinationSceneKey || typeof transitionId !== 'string' || !transitionId) {
    return null;
  }
  return setSceneTransitionState(game, transitionId, {
    destinationSceneKey,
    ready: true,
    readyAt: Date.now(),
    payload,
  });
}

export function emitSceneTransitionVisuallyReady(scene, { transitionId, payload = {} } = {}) {
  const destinationSceneKey = scene?.scene?.key;
  if (typeof destinationSceneKey !== 'string' || !destinationSceneKey || typeof transitionId !== 'string' || !transitionId) {
    return false;
  }
  markSceneTransitionReady(scene.game, { destinationSceneKey, transitionId, payload });
  scene.events?.emit?.(SCENE_TRANSITION_VISUALLY_READY_EVENT, {
    destinationSceneKey,
    transitionId,
    scene,
    ...payload,
  });
  return true;
}

export function bringSceneTransitionOverlayToTop(scenePlugin, { transitionId = null, destinationSceneKey = null } = {}) {
  traceSceneTransition(scenePlugin, 'immediate bring-to-top attempt', { transitionId, destinationSceneKey });
  if (!scenePlugin?.isActive?.(SCENE_TRANSITION_OVERLAY_SCENE_KEY)) { traceSceneTransition(scenePlugin, 'result of ordering attempt', { transitionId, destinationSceneKey, result: false, reason: 'overlay inactive' }); return false; }
  const overlay = scenePlugin.get?.(SCENE_TRANSITION_OVERLAY_SCENE_KEY);
  if (transitionId && overlay?.transitionId && overlay.transitionId !== transitionId) { traceSceneTransition(scenePlugin, 'result of ordering attempt', { transitionId, destinationSceneKey, result: false, reason: 'transition mismatch' }); return false; }
  if (destinationSceneKey && overlay?.destinationSceneKey && overlay.destinationSceneKey !== destinationSceneKey) { traceSceneTransition(scenePlugin, 'result of ordering attempt', { transitionId, destinationSceneKey, result: false, reason: 'destination mismatch' }); return false; }
  scenePlugin.bringToTop?.(SCENE_TRANSITION_OVERLAY_SCENE_KEY);
  traceSceneTransition(scenePlugin, 'result of ordering attempt', { transitionId, destinationSceneKey, result: true });
  traceSceneTransition(scenePlugin, 'current scene order after each attempt', { transitionId, destinationSceneKey });
  return true;
}

export function reconcileSceneTransitionOverlayOrdering(scenePlugin, { transitionId = null, destinationSceneKey = null } = {}) {
  if (!scenePlugin) return false;
  const tryBringToTop = () => bringSceneTransitionOverlayToTop(scenePlugin, { transitionId, destinationSceneKey });
  if (tryBringToTop()) return true;

  const managerEvents = scenePlugin.systems?.game?.events ?? scenePlugin.game?.events;
  const deferred = () => { traceSceneTransition(scenePlugin, 'deferred bring-to-top attempt', { transitionId, destinationSceneKey }); return tryBringToTop(); };
  managerEvents?.once?.(Phaser.Core?.Events?.POST_STEP ?? 'poststep', deferred);
  managerEvents?.once?.(Phaser.Core?.Events?.POST_RENDER ?? 'postrender', deferred);
  return false;
}

export function beginSceneTransitionOverlay(sourceScene, targetSceneKey, options = {}) {
  if (!sourceScene?.scene || typeof targetSceneKey !== 'string' || !targetSceneKey) return null;
  const transitionId = options.transitionId ?? createSceneTransitionId();
  const destinationScene = sourceScene.scene.get(targetSceneKey);

  const onDestinationReady = (event = {}) => {
    if (event?.transitionId !== transitionId || event?.destinationSceneKey !== targetSceneKey) return;
    markSceneTransitionReady(sourceScene.game, { destinationSceneKey: targetSceneKey, transitionId, payload: event });
  };

  traceSceneTransition(sourceScene, 'transition created', { transitionId, sourceSceneKey: sourceScene.scene.key ?? null, destinationSceneKey: targetSceneKey });

  setSceneTransitionState(sourceScene.game, transitionId, {
    transitionId,
    sourceSceneKey: sourceScene.scene.key ?? null,
    destinationSceneKey: targetSceneKey,
    ready: false,
    readyListener: onDestinationReady,
    destinationScene,
    completed: false,
    startedAt: Date.now(),
  });

  destinationScene?.events?.on?.(SCENE_TRANSITION_VISUALLY_READY_EVENT, onDestinationReady);

  traceSceneTransition(sourceScene, 'overlay launch requested', { transitionId, sourceSceneKey: sourceScene.scene.key ?? null, destinationSceneKey: targetSceneKey });
  sourceScene.scene.launch(SCENE_TRANSITION_OVERLAY_SCENE_KEY, {
    ...options,
    transitionId,
    destinationSceneKey: targetSceneKey,
    sourceSceneKey: sourceScene.scene.key ?? null,
  });

  return { transitionId, destinationSceneKey: targetSceneKey, destinationScene, onDestinationReady };
}

export function startSceneWithTransitionOverlay(sourceScene, targetSceneKey, targetData = {}, options = {}) {
  const transition = beginSceneTransitionOverlay(sourceScene, targetSceneKey, options);
  if (!transition) return null;
  const safeTargetData = targetData && typeof targetData === 'object' ? targetData : {};
  traceSceneTransition(sourceScene, 'destination start requested', { transitionId: transition.transitionId, sourceSceneKey: sourceScene.scene.key ?? null, destinationSceneKey: targetSceneKey });
  sourceScene.scene.start(targetSceneKey, {
    ...safeTargetData,
    sceneTransitionOverlay: {
      transitionId: transition.transitionId,
      sourceSceneKey: sourceScene.scene.key ?? null,
    },
  });
  reconcileSceneTransitionOverlayOrdering(sourceScene.scene, { transitionId: transition.transitionId, destinationSceneKey: targetSceneKey });
  return transition;
}
