export const UI_ROUTE_STORAGE_KEY = 'gridfall:tactics:route:v1';
export const UI_ROUTE_SCHEMA_VERSION = 1;
export const UI_ROUTE_KIND = 'lastUiRoute';
export const SAFE_UI_ROUTE_SCENES = Object.freeze([
  'MainMenuScene',
  'FactionSelectScene',
  'CollectionScene',
  'SettingsScene',
]);

const SAFE_UI_ROUTE_SCENE_SET = new Set(SAFE_UI_ROUTE_SCENES);

function getDefaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function isSafeUiRouteScene(scene) {
  return typeof scene === 'string' && SAFE_UI_ROUTE_SCENE_SET.has(scene);
}

export function isValidUiRouteRecord(value) {
  return Boolean(
    value
      && typeof value === 'object'
      && !Array.isArray(value)
      && value.schemaVersion === UI_ROUTE_SCHEMA_VERSION
      && value.kind === UI_ROUTE_KIND
      && isSafeUiRouteScene(value.scene)
      && Number.isFinite(value.updatedAt),
  );
}

export function parseUiRouteRecord(rawRoute) {
  if (typeof rawRoute !== 'string' || rawRoute.length === 0) {
    return null;
  }

  try {
    const parsedRoute = JSON.parse(rawRoute);
    return isValidUiRouteRecord(parsedRoute) ? parsedRoute : null;
  } catch {
    return null;
  }
}

export function clearStoredUiRoute(storage = getDefaultStorage()) {
  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(UI_ROUTE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function loadLastUiRoute(storage = getDefaultStorage()) {
  if (!storage) {
    return null;
  }

  let rawRoute = null;

  try {
    rawRoute = storage.getItem(UI_ROUTE_STORAGE_KEY);
  } catch {
    return null;
  }

  if (rawRoute === null) {
    return null;
  }

  const route = parseUiRouteRecord(rawRoute);

  if (!route) {
    clearStoredUiRoute(storage);
  }

  return route;
}

export function getRestorableUiRouteScene(storage = getDefaultStorage()) {
  return loadLastUiRoute(storage)?.scene ?? null;
}

export function saveLastUiRoute(scene, { storage = getDefaultStorage(), now = Date.now } = {}) {
  if (!storage || !isSafeUiRouteScene(scene)) {
    return false;
  }

  const route = {
    schemaVersion: UI_ROUTE_SCHEMA_VERSION,
    kind: UI_ROUTE_KIND,
    scene,
    updatedAt: now(),
  };

  try {
    storage.setItem(UI_ROUTE_STORAGE_KEY, JSON.stringify(route));
    return true;
  } catch {
    return false;
  }
}
