export const SCENE_TRANSITION_OVERLAY_SCENE_KEY = 'SceneTransitionOverlayScene';
export const SCENE_TRANSITION_VISUALLY_READY_EVENT = 'scene-transition:visually-ready';
export const SCENE_TRANSITION_REGISTRY_KEY = 'gridfall.sceneTransitionOverlay.state';

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

export function startSceneWithTransitionOverlay(sourceScene, targetSceneKey, targetData = {}, options = {}) {
  if (!sourceScene?.scene || typeof targetSceneKey !== 'string' || !targetSceneKey) return null;
  const transitionId = options.transitionId ?? createSceneTransitionId();
  const destinationScene = sourceScene.scene.get(targetSceneKey);

  const onDestinationReady = (event = {}) => {
    if (event?.transitionId !== transitionId || event?.destinationSceneKey !== targetSceneKey) return;
    markSceneTransitionReady(sourceScene.game, { destinationSceneKey: targetSceneKey, transitionId, payload: event });
  };

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

  sourceScene.scene.launch(SCENE_TRANSITION_OVERLAY_SCENE_KEY, {
    ...options,
    transitionId,
    destinationSceneKey: targetSceneKey,
    sourceSceneKey: sourceScene.scene.key ?? null,
  });

  const safeTargetData = targetData && typeof targetData === 'object' ? targetData : {};

  sourceScene.scene.start(targetSceneKey, {
    ...safeTargetData,
    sceneTransitionOverlay: {
      transitionId,
      sourceSceneKey: sourceScene.scene.key ?? null,
    },
  });

  return { transitionId, destinationSceneKey: targetSceneKey, destinationScene, onDestinationReady };
}
