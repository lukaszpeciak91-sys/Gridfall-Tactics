import test from 'node:test';
import assert from 'node:assert/strict';
import { getFactionByKey } from '../src/data/factions/index.js';
import {
  getCardIllustrationAsset,
  preloadAllCardIllustrations,
} from '../src/rendering/cardIllustrationAssets.js';
import { createCardArtwork } from '../src/rendering/cardVisualLayout.js';
import {
  createInitialBattleState,
  playEffectCard,
  playOrRedeployUnit,
  resolveCombat,
  resolveTargetedEffectCard,
} from '../src/systems/GameState.js';

function createPreloadScene() {
  const queued = [];
  return {
    queued,
    textures: { exists: () => false },
    load: {
      on() {},
      off() {},
      image(key, path) { queued.push({ key, path }); },
    },
  };
}

function chainable(displayObject = {}) {
  return {
    ...displayObject,
    setStrokeStyle() { return this; },
    setRotation() { return this; },
    setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; },
    setCrop(x, y, width, height) { this.crop = { x, y, width, height }; return this; },
    setOrigin(x, y = x) { this.origin = { x, y }; return this; },
  };
}

function createArtworkScene({ loadedTextureKeys = [] } = {}) {
  const textureKeys = new Set(loadedTextureKeys);
  return {
    textures: { exists: (key) => textureKeys.has(key) },
    add: {
      container: (x, y) => chainable({ type: 'container', x, y, children: [], add(items) { this.children.push(...items); return this; } }),
      rectangle: (x, y, width, height, color, alpha) => chainable({ type: 'rectangle', x, y, width, height, color, alpha }),
      image: (x, y, key) => chainable({
        type: 'image',
        x,
        y,
        key,
        width: 512,
        height: 768,
        texture: { getSourceImage: () => ({ width: 512, height: 768 }) },
      }),
    },
  };
}

function getCard(faction, cardId) {
  const card = faction.deck.find((item) => item.id === cardId);
  assert.ok(card, `missing card ${cardId}`);
  return { ...card };
}

function assertTokenArt(card, expected) {
  assert.equal(card.factionId, expected.factionId);
  assert.equal(card.artAssetId, expected.artAssetId);
  assert.equal(card.tokenType, expected.tokenType);
  assert.equal(card.isToken, true);
  assert.equal(card.collectible, false);
  const asset = getCardIllustrationAsset(card);
  assert.equal(asset.publicPath, expected.publicPath);
}

const swarm = getFactionByKey('Swarm');
const attritionSwarm = getFactionByKey('Attrition Swarm');

const swarmGruntArt = {
  factionId: 'swarm',
  artAssetId: 'token_grunt_01',
  tokenType: 'grunt',
  publicPath: 'public/assets/cards/swarm/token_grunt_01.webp',
};

const attritionSwarmGruntArt = {
  factionId: 'attrition_swarm',
  artAssetId: 'token_grunt_02',
  tokenType: 'grunt',
  publicPath: 'public/assets/cards/attrition_swarm/token_grunt_02.webp',
};

const floodTokenArt = {
  factionId: 'swarm',
  artAssetId: 'token_flood_01',
  tokenType: 'floodToken',
  publicPath: 'public/assets/cards/swarm/token_flood_01.webp',
};

test('generated unit illustration assets resolve to expected faction-local public card folders', () => {
  assert.notEqual(swarmGruntArt.artAssetId, attritionSwarmGruntArt.artAssetId);
  assert.notEqual(swarmGruntArt.artAssetId, floodTokenArt.artAssetId);
  assert.notEqual(attritionSwarmGruntArt.artAssetId, floodTokenArt.artAssetId);
  assert.equal(getCardIllustrationAsset(swarmGruntArt).publicPath, swarmGruntArt.publicPath);
  assert.equal(getCardIllustrationAsset(attritionSwarmGruntArt).publicPath, attritionSwarmGruntArt.publicPath);
  assert.equal(getCardIllustrationAsset(floodTokenArt).publicPath, floodTokenArt.publicPath);
});

test('preloadAllCardIllustrations queues explicit generated unit assets outside normal decks', () => {
  const scene = createPreloadScene();
  preloadAllCardIllustrations(scene);

  assert.ok(scene.queued.some((asset) => asset.key === 'card.swarm.token_grunt_01' && asset.path.endsWith('assets/cards/swarm/token_grunt_01.webp')));
  assert.ok(scene.queued.some((asset) => asset.key === 'card.swarm.token_flood_01' && asset.path.endsWith('assets/cards/swarm/token_flood_01.webp')));
  assert.ok(scene.queued.some((asset) => asset.key === 'card.attrition_swarm.token_grunt_02' && asset.path.endsWith('assets/cards/attrition_swarm/token_grunt_02.webp')));
});

test('generated grunts and flood tokens stamp stable faction-local art metadata', () => {
  const spawnState = createInitialBattleState(swarm, swarm, { firstActor: 'player' });
  spawnState.player.hand.push(getCard(swarm, 'swarm_spawn_1'));
  assert.equal(playEffectCard(spawnState, 'player', 'swarm_spawn_1').ok, true);
  assertTokenArt(spawnState.board[6], swarmGruntArt);

  const broodState = createInitialBattleState(swarm, swarm, { firstActor: 'player' });
  broodState.board[6] = {
    ...getCard(swarm, 'swarm_brood_1'),
    cardId: 'swarm_brood_1',
    owner: 'player',
    hp: 0,
    maxHp: 2,
  };
  resolveCombat(broodState);
  assertTokenArt(broodState.board[6], swarmGruntArt);

  const carrierState = createInitialBattleState(attritionSwarm, attritionSwarm, { firstActor: 'player' });
  carrierState.board[6] = {
    ...getCard(attritionSwarm, 'attrition_swarm_carrier_1'),
    cardId: 'attrition_swarm_carrier_1',
    owner: 'player',
    hp: 1,
    maxHp: 2,
  };
  carrierState.board[0] = { id: 'enemy_attacker', type: 'unit', owner: 'enemy', attack: 1, hp: 3, maxHp: 3, armor: 0, effectId: null };
  resolveCombat(carrierState);
  assertTokenArt(carrierState.board[6], attritionSwarmGruntArt);

  const graveCallState = createInitialBattleState(attritionSwarm, attritionSwarm, { firstActor: 'player' });
  graveCallState.player.hand.push(getCard(attritionSwarm, 'attrition_swarm_grave_call_1'));
  assert.equal(playEffectCard(graveCallState, 'player', 'attrition_swarm_grave_call_1').ok, true);
  assertTokenArt(graveCallState.board[6], attritionSwarmGruntArt);

  const floodState = createInitialBattleState(swarm, swarm, { firstActor: 'player' });
  floodState.player.hand.push(getCard(swarm, 'swarm_flood_1'));
  assert.equal(playEffectCard(floodState, 'player', 'swarm_flood_1').ok, true);
  assertTokenArt(floodState.board[6], floodTokenArt);
});

test('returned-to-hand generated units preserve faction-local art through recall, redeploy, replay, and revive', () => {
  const state = createInitialBattleState(swarm, swarm, { firstActor: 'player' });
  state.player.hand.push(getCard(swarm, 'swarm_spawn_1'));
  assert.equal(playEffectCard(state, 'player', 'swarm_spawn_1').ok, true);
  assertTokenArt(state.board[6], swarmGruntArt);

  state.player.hand.push({ id: 'test_recall', type: 'utility', effectId: 'return_friendly_draw_1' });
  assert.equal(resolveTargetedEffectCard(state, 'player', 'test_recall', 6).ok, true);
  const recalledToken = state.player.hand.find((card) => card.tokenType === 'grunt');
  assertTokenArt(recalledToken, swarmGruntArt);

  state.board[6] = {
    ...getCard(swarm, 'swarm_rusher_1'),
    cardId: 'swarm_rusher_1',
    owner: 'player',
    hp: 1,
    maxHp: 1,
  };
  assert.equal(playOrRedeployUnit(state, 'player', recalledToken.id, 6).ok, true);
  assertTokenArt(state.board[6], swarmGruntArt);

  const displacedToken = state.board[6];
  state.player.hand.push(getCard(swarm, 'swarm_rusher_1'));
  assert.equal(playOrRedeployUnit(state, 'player', 'swarm_rusher_1', 6).ok, true);
  const redeployedToHandToken = state.player.hand.find((card) => card.id === displacedToken.id);
  assertTokenArt(redeployedToHandToken, swarmGruntArt);

  assert.equal(playOrRedeployUnit(state, 'player', redeployedToHandToken.id, 7).ok, true);
  assertTokenArt(state.board[7], swarmGruntArt);

  state.board[6] = null;
  state.board[7] = null;
  state.player.hand.push(getCard(swarm, 'swarm_regrow_1'));
  assert.equal(playEffectCard(state, 'player', 'swarm_regrow_1').ok, true);
  assertTokenArt(state.board[6], swarmGruntArt);
});

test('missing generated unit artwork falls back to placeholder without crashing', () => {
  const scene = createArtworkScene();
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (message) => warnings.push(message);
  try {
    const artwork = createCardArtwork(scene, { centerX: 0, centerY: 0, width: 120, height: 160 }, {
      id: 'missing_generated_token',
      type: 'unit',
      factionId: 'swarm',
      artAssetId: 'missing_generated_token_art',
      tokenType: 'grunt',
      isToken: true,
      collectible: false,
    }, { enableCardIllustration: true });
    assert.equal(artwork.type, 'container');
    assert.equal(artwork.children.length, 4);
  } finally {
    console.warn = originalWarn;
  }
  assert.deepEqual(warnings, ['Card illustration missing: public/assets/cards/swarm/missing_generated_token_art.webp']);
});
