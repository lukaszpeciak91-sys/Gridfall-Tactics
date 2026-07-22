import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const { AUDIO_KEYS } = await import('../src/audio/audioAssets.js');
const { getFactionByKey, getFactionKeys } = await import('../src/data/factions/index.js');
const { GENERATED_UNIT_ART_ASSETS } = await import('../src/data/generatedUnitArt.js');
const { tutorialPlayerFaction, tutorialEnemyFaction } = await import('../src/data/tutorial/tutorialDecks.js');
const { BATTLE_TRANSITION_ILLUSTRATION_ALLOWLIST, BATTLE_TRANSITION_TUTORIAL_POOL_KEY } = await import('../src/data/battleTransitionIllustrations.js');
const {
  getCardIllustrationAsset,
  getCardIllustrationAssetsForFaction,
  getCollectionCardIllustrationAssets,
  getLoadedCardIllustrationTextureKey,
  preloadCollectionCardIllustrations,
} = await import('../src/rendering/cardIllustrationAssets.js');

const read = (path) => fs.readFileSync(path, 'utf8');

function createFakeScene({ cached = [] } = {}) {
  const textureKeys = new Set(cached);
  const loadCalls = [];
  return {
    textures: { exists: (key) => textureKeys.has(key) },
    load: { image: (key, path) => loadCalls.push({ key, path }), on: () => {}, off: () => {} },
    loadCalls,
  };
}

function collectionKeys() {
  return getCollectionCardIllustrationAssets().map((asset) => asset.key).sort();
}

test('Collection preload queues all normal collectible card art from visible factions', () => {
  const expected = getFactionKeys().flatMap((factionKey) => getCardIllustrationAssetsForFaction(factionKey).map((asset) => asset.key)).sort();
  const actual = collectionKeys();
  assert.deepEqual(actual, [...new Set(expected)].sort());
});

test('Collection card art excludes generated Grunts and Flood tokens', () => {
  const keys = new Set(collectionKeys());
  for (const generatedArt of GENERATED_UNIT_ART_ASSETS) {
    const asset = getCardIllustrationAsset(generatedArt, { factionId: generatedArt.factionId });
    assert.equal(keys.has(asset.key), false, `${asset.key} should not be collection-preloaded`);
  }
});

test('Collection card art excludes tutorial-only cards', () => {
  const keys = new Set(collectionKeys());
  for (const faction of [tutorialPlayerFaction, tutorialEnemyFaction]) {
    for (const card of faction.deck) {
      const asset = getCardIllustrationAsset(card, { factionId: card.factionId ?? faction.id });
      assert.equal(keys.has(asset.key), false, `${asset.key} should not be collection-preloaded`);
    }
  }
});

test('Collection card art excludes hidden/runtime-only variants and battle-only transition art', () => {
  const keys = new Set(collectionKeys());
  assert.equal([...keys].some((key) => key.includes('hidden') || key.includes('runtime') || key.includes('transformed')), false);
  for (const entry of BATTLE_TRANSITION_ILLUSTRATION_ALLOWLIST[BATTLE_TRANSITION_TUTORIAL_POOL_KEY]) {
    const asset = getCardIllustrationAsset(entry, { factionId: entry.factionId });
    assert.equal(keys.has(asset.key), false, `${asset.key} should not be collection-preloaded`);
  }
});

test('Collection preload excludes unrelated faction previews, backgrounds, battlegrounds, and result assets', () => {
  const scene = createFakeScene();
  preloadCollectionCardIllustrations(scene);
  assert.ok(scene.loadCalls.length > 0);
  assert.equal(scene.loadCalls.every((call) => call.path.includes('assets/cards/')), true);
  assert.equal(scene.loadCalls.some((call) => /assets\/(factions|backgrounds|battlegrounds|trophies|results)\//.test(call.path)), false);
});

test('CollectionScene preloads collection card art and keeps audio boundary to menu music plus click', () => {
  const source = read('src/scenes/CollectionScene.js');
  const preloadBody = source.match(/  preload\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
  assert.match(preloadBody, /preloadCollectionCardIllustrations\(this\);/);
  assert.match(preloadBody, /preloadAudioAssetsByKey\(this, \[AUDIO_KEYS\.MENU_MUSIC, AUDIO_KEYS\.UI_CLICK\]\)/);
  assert.doesNotMatch(preloadBody, /preloadAllCardIllustrations\(/);
  assert.doesNotMatch(preloadBody, /preloadAudioAssets\(this\)/);
  assert.doesNotMatch(preloadBody, /BATTLE_AMBIENCE|BATTLE_VICTORY|BATTLE_DEFEAT|BATTLE_START|CARD_DEPLOY|ATTACK_IMPACT|UNIT_DEATH|BASE_BREAK|ACHIEVEMENT_UNLOCK/);
  assert.ok(AUDIO_KEYS.MENU_MUSIC && AUDIO_KEYS.UI_CLICK);
});

test('Faction expansion no longer starts lazy loading and renders synchronously after preload', () => {
  const source = read('src/scenes/CollectionScene.js');
  const toggleBody = source.match(/  toggleFactionSection\(factionKey\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
  assert.match(toggleBody, /this\.expandedFactionKeys\.add\(factionKey\);\s*this\.rebuildCollectionContent\(\{ width: this\.scale\.width \}\);/);
  assert.doesNotMatch(source, /factionArtLoadState|ensureFactionArtLoadedForExpansion|getMissingFactionArtAssets|getFactionArtLoadState|markFactionArtRefreshInvalid/);
  assert.doesNotMatch(toggleBody, /load\?\.start|preloadCardIllustration|ensureFactionArtLoadedForExpansion/);
});


test('CollectionScene initializes and enters with every faction collapsed', () => {
  const source = read('src/scenes/CollectionScene.js');
  const constructorBody = source.match(/  constructor\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
  const createBody = source.match(/  create\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';

  assert.match(constructorBody, /this\.expandedFactionKeys = new Set\(\);/);
  assert.match(createBody, /this\.expandedFactionKeys = new Set\(\);\s*this\.drawCollectionList\(\{ width, height \}\);/);
  assert.doesNotMatch(source, /this\.expandedFactionKeys = new Set\(getFactionKeys\(\)\);/);
});

test('Collection collapsed entry is independent from preloaded texture readiness', () => {
  const source = read('src/scenes/CollectionScene.js');
  const createBody = source.match(/  create\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
  const preloadBody = source.match(/  preload\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';

  assert.match(preloadBody, /preloadCollectionCardIllustrations\(this\);/);
  assert.match(createBody, /this\.expandedFactionKeys = new Set\(\);/);
  assert.doesNotMatch(createBody, /textures\.exists|getLoadedCardIllustrationTextureKey|load\.(?:once|on)\(['"]complete|expandedFactionKeys\.add/);
});

test('Completing preload cannot mutate Collection faction expansion state', () => {
  const source = read('src/scenes/CollectionScene.js');
  const preloadBody = source.match(/  preload\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';

  assert.doesNotMatch(preloadBody, /expandedFactionKeys|drawCollectionList|rebuildCollectionContent|toggleFactionSection/);
  assert.doesNotMatch(source, /load\.(?:once|on)\(['"]complete['"][\s\S]*?expandedFactionKeys/);
});

test('Tapping one faction expands only that faction and fresh re-entry resets collapsed default', () => {
  const source = read('src/scenes/CollectionScene.js');
  const toggleBody = source.match(/  toggleFactionSection\(factionKey\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
  const createBody = source.match(/  create\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';

  assert.match(toggleBody, /if \(this\.expandedFactionKeys\.has\(factionKey\)\) \{[\s\S]*?this\.expandedFactionKeys\.delete\(factionKey\);[\s\S]*?return;[\s\S]*?\}/);
  assert.match(toggleBody, /this\.expandedFactionKeys\.add\(factionKey\);\s*this\.rebuildCollectionContent\(\{ width: this\.scale\.width \}\);/);
  assert.doesNotMatch(toggleBody, /getFactionKeys\(\)\.forEach|new Set\(getFactionKeys\(\)\)|expandedFactionKeys\.clear\(\)/);
  assert.match(createBody, /this\.cleanupScene\(\);[\s\S]*?this\.expandedFactionKeys = new Set\(\);\s*this\.drawCollectionList\(\{ width, height \}\);/);
});

test('Collection preload skips cached textures and duplicate queue entries', () => {
  const assets = getCollectionCardIllustrationAssets();
  const cachedKey = assets[0].key;
  const scene = createFakeScene({ cached: [cachedKey] });
  const firstQueued = preloadCollectionCardIllustrations(scene);
  const secondQueued = preloadCollectionCardIllustrations(scene);
  assert.equal(firstQueued, assets.length - 1);
  assert.equal(secondQueued, 0);
  assert.ok(!scene.loadCalls.some((call) => call.key === cachedKey));
  assert.equal(new Set(scene.loadCalls.map((call) => call.key)).size, scene.loadCalls.length);
});

test('Missing card art falls back without blocking scene creation', () => {
  const firstFaction = getFactionByKey(getFactionKeys()[0]);
  const card = firstFaction.deck[0];
  const scene = createFakeScene();
  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (message) => warnings.push(message);
  try {
    assert.equal(getLoadedCardIllustrationTextureKey(scene, card, { factionId: firstFaction.id }), null);
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Card illustration missing:/);
});
