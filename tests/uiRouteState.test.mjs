import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SAFE_UI_ROUTE_SCENES,
  UI_ROUTE_KIND,
  UI_ROUTE_SCHEMA_VERSION,
  UI_ROUTE_STORAGE_KEY,
  getRestorableUiRouteScene,
  isSafeUiRouteScene,
  loadLastUiRoute,
  parseUiRouteRecord,
  saveLastUiRoute,
} from '../src/systems/uiRouteState.js';

function createMemoryStorage(initialEntries = {}) {
  const values = new Map(Object.entries(initialEntries));

  return {
    removedKeys: [],
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      this.removedKeys.push(key);
      values.delete(key);
    },
  };
}

test('UI route storage uses a separate versioned allowlist for safe non-battle scenes', () => {
  assert.equal(UI_ROUTE_STORAGE_KEY, 'gridfall:tactics:route:v1');
  assert.deepEqual(SAFE_UI_ROUTE_SCENES, [
    'MainMenuScene',
    'FactionSelectScene',
    'CollectionScene',
    'SettingsScene',
  ]);

  assert.equal(isSafeUiRouteScene('BattleScene'), false);
  assert.equal(isSafeUiRouteScene('BattleMenuScene'), false);
  assert.equal(isSafeUiRouteScene('RulesPanelScene'), false);
  assert.equal(isSafeUiRouteScene('StartScene'), false);
  assert.equal(isSafeUiRouteScene('TutorialScene'), false);
});

test('safe UI route saves only serializable route metadata', () => {
  const storage = createMemoryStorage();

  assert.equal(saveLastUiRoute('FactionSelectScene', { storage, now: () => 1234567890 }), true);

  const saved = JSON.parse(storage.getItem(UI_ROUTE_STORAGE_KEY));
  assert.deepEqual(saved, {
    schemaVersion: UI_ROUTE_SCHEMA_VERSION,
    kind: UI_ROUTE_KIND,
    scene: 'FactionSelectScene',
    updatedAt: 1234567890,
  });
});

test('unsafe scenes never replace the last safe UI route', () => {
  const storage = createMemoryStorage();

  assert.equal(saveLastUiRoute('FactionSelectScene', { storage, now: () => 10 }), true);
  const previousRoute = storage.getItem(UI_ROUTE_STORAGE_KEY);

  assert.equal(saveLastUiRoute('BattleScene', { storage, now: () => 20 }), false);
  assert.equal(saveLastUiRoute('BattleMenuScene', { storage, now: () => 20 }), false);
  assert.equal(saveLastUiRoute('RulesPanelScene', { storage, now: () => 20 }), false);
  assert.equal(saveLastUiRoute('TutorialScene', { storage, now: () => 20 }), false);
  assert.equal(storage.getItem(UI_ROUTE_STORAGE_KEY), previousRoute);
});

test('valid saved safe UI route resolves the initial boot scene', () => {
  const storage = createMemoryStorage({
    [UI_ROUTE_STORAGE_KEY]: JSON.stringify({
      schemaVersion: UI_ROUTE_SCHEMA_VERSION,
      kind: UI_ROUTE_KIND,
      scene: 'CollectionScene',
      updatedAt: 1234567890,
    }),
  });

  assert.equal(getRestorableUiRouteScene(storage), 'CollectionScene');
  assert.deepEqual(loadLastUiRoute(storage), {
    schemaVersion: UI_ROUTE_SCHEMA_VERSION,
    kind: UI_ROUTE_KIND,
    scene: 'CollectionScene',
    updatedAt: 1234567890,
  });
});

test('missing, corrupted, and invalid route storage safely fall back without crashing', () => {
  const missingStorage = createMemoryStorage();
  assert.equal(getRestorableUiRouteScene(missingStorage), null);

  const corruptedStorage = createMemoryStorage({ [UI_ROUTE_STORAGE_KEY]: '{bad json' });
  assert.equal(getRestorableUiRouteScene(corruptedStorage), null);
  assert.deepEqual(corruptedStorage.removedKeys, [UI_ROUTE_STORAGE_KEY]);

  const invalidSchemaStorage = createMemoryStorage({
    [UI_ROUTE_STORAGE_KEY]: JSON.stringify({
      schemaVersion: 2,
      kind: UI_ROUTE_KIND,
      scene: 'MainMenuScene',
      updatedAt: 1234567890,
    }),
  });
  assert.equal(loadLastUiRoute(invalidSchemaStorage), null);
  assert.deepEqual(invalidSchemaStorage.removedKeys, [UI_ROUTE_STORAGE_KEY]);

  assert.equal(parseUiRouteRecord(JSON.stringify({
    schemaVersion: UI_ROUTE_SCHEMA_VERSION,
    kind: UI_ROUTE_KIND,
    scene: 'BattleScene',
    updatedAt: 1234567890,
  })), null);
});

test('localStorage failures are ignored for boot and writes', () => {
  const throwingStorage = {
    getItem() {
      throw new Error('blocked storage');
    },
    setItem() {
      throw new Error('blocked storage');
    },
    removeItem() {
      throw new Error('blocked storage');
    },
  };

  assert.equal(getRestorableUiRouteScene(throwingStorage), null);
  assert.equal(saveLastUiRoute('MainMenuScene', { storage: throwingStorage }), false);
});
