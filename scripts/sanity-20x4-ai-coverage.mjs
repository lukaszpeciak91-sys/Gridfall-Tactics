import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createInitialBattleState,
  drawCards,
  playOrRedeployUnit,
  playEffectCard,
  resolveTargetedEffectCard,
  resolveCombat,
  toggleFirstActor,
} from '../src/systems/GameState.js';
import { chooseBattleAction } from '../src/systems/enemyDecision.js';

const GAMES_PER_PLAYER_FACTION = 20;
const MAX_TURNS = 50;
const BASE_SEED = 20260505;
const SHUFFLE_DECKS = true;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const factionsDir = path.resolve(__dirname, '../src/data/factions');

function loadFactions() {
  const files = fs.readdirSync(factionsDir).filter((name) => name.endsWith('.json')).sort();
  const entries = files.map((file) => {
    const data = JSON.parse(fs.readFileSync(path.join(factionsDir, file), 'utf8'));
    return [data.name, data];
  });
  return Object.fromEntries(entries);
}

function createSeededRng(seedInput) {
  let state = (Number(seedInput) >>> 0) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildSeed(...parts) {
  return parts.reduce((acc, value, i) => (acc ^ Math.imul(hashString(String(value)), i + 1)) >>> 0, BASE_SEED >>> 0);
}

function shuffleDeck(deck, rng) {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function allEffectIds(factions) {
  const ids = new Set();
  Object.values(factions).forEach((f) => {
    f.deck.forEach((c) => {
      if (c.effectId) ids.add(c.effectId);
    });
  });
  return ids;
}

function pickEnemyFaction(factionKeys, playerKey, gameIndex) {
  const others = factionKeys.filter((k) => k !== playerKey);
  return others[gameIndex % others.length];
}

function applyAction(state, owner, metrics, rng) {
  const action = chooseBattleAction(state, owner, { randomFn: rng, tieBreakPolicy: 'seeded-random' });
  if (action.type === 'pass') {
    metrics.passByOwner[owner] += 1;
    return;
  }

  const cancelKey = owner === 'enemy' ? 'player' : 'enemy';
  const nonUnit = action.type === 'play-effect' || action.type === 'play-targeted-effect';
  if (state.cancelEnemyOrderThisTurn?.[cancelKey] && nonUnit) {
    state.cancelEnemyOrderThisTurn[cancelKey] = false;
    metrics.cancelled += 1;
    return;
  }

  if (action.effectId) metrics.effectUsage.set(action.effectId, (metrics.effectUsage.get(action.effectId) ?? 0) + 1);

  if (action.type === 'play-unit') {
    const side = owner === 'player' ? state.player : state.enemy;
    const card = side.hand.find((c) => c.id === action.cardId);
    if (card?.effectId) metrics.effectUsage.set(card.effectId, (metrics.effectUsage.get(card.effectId) ?? 0) + 1);
    playOrRedeployUnit(state, owner, action.cardId, action.slotIndex);
  }
  if (action.type === 'play-effect') {
    playEffectCard(state, owner, action.cardId);
    state.cancelEnemyOrderThisTurn[cancelKey] = false;
  }
  if (action.type === 'play-targeted-effect') {
    resolveTargetedEffectCard(
      state,
      owner,
      action.cardId,
      action.targetIndex,
      action.targetIndexes ?? [action.targetIndex],
    );
    state.cancelEnemyOrderThisTurn[cancelKey] = false;
  }
}

function simulateGame(playerFaction, enemyFaction, gameIndex, playerKey, enemyKey, metrics) {
  const gameSeed = buildSeed(playerKey, enemyKey, gameIndex);
  const gameRng = createSeededRng(gameSeed);
  const state = createInitialBattleState(playerFaction, enemyFaction, { randomFn: gameRng });
  if (SHUFFLE_DECKS) {
    shuffleDeck(state.player.deck, gameRng);
    shuffleDeck(state.enemy.deck, gameRng);
  }

  drawCards(state.player, 4);
  drawCards(state.enemy, 4);

  let turns = 0;
  while (!state.winner && turns < MAX_TURNS) {
    const turnRng = createSeededRng(buildSeed(gameSeed, turns));
    const firstActor = state.firstActor;
    const secondActor = firstActor === 'player' ? 'enemy' : 'player';

    applyAction(state, firstActor, metrics, turnRng);
    applyAction(state, secondActor, metrics, turnRng);
    resolveCombat(state);
    drawCards(state.player, 1);
    drawCards(state.enemy, 1);
    turns += 1;
    if (!state.winner) toggleFirstActor(state);
  }

  const endedByTurnCap = !state.winner && turns >= MAX_TURNS;
  const endingType = endedByTurnCap ? 'turn cap' : ((state.playerHP === 0 || state.enemyHP === 0) ? 'hero damage' : 'unit attrition');
  return {
    winner: state.winner ?? 'draw',
    turns,
    endingType,
  };
}

function run() {
  const factions = loadFactions();
  const factionKeys = Object.keys(factions);
  const metrics = {
    passByOwner: { player: 0, enemy: 0 },
    cancelled: 0,
    effectUsage: new Map(),
    crashes: 0,
    exceptions: 0,
    invalidActions: 0,
  };

  const perFaction = new Map(factionKeys.map((key) => [key, {
    games: 0, wins: 0, losses: 0, draws: 0, totalTurns: 0, turnCaps: 0,
  }]));
  const endingCounts = { 'hero damage': 0, 'unit attrition': 0, 'turn cap': 0 };

  factionKeys.forEach((playerKey) => {
    for (let i = 0; i < GAMES_PER_PLAYER_FACTION; i += 1) {
      const enemyKey = pickEnemyFaction(factionKeys, playerKey, i);
      try {
        const result = simulateGame(factions[playerKey], factions[enemyKey], i, playerKey, enemyKey, metrics);
        const bucket = perFaction.get(playerKey);
        bucket.games += 1;
        bucket.totalTurns += result.turns;
        if (result.winner === 'player') bucket.wins += 1;
        else if (result.winner === 'enemy') bucket.losses += 1;
        else bucket.draws += 1;
        if (result.endingType === 'turn cap') bucket.turnCaps += 1;
        endingCounts[result.endingType] += 1;
      } catch (error) {
        metrics.crashes += 1;
        metrics.exceptions += 1;
      }
    }
  });

  const totalGames = Array.from(perFaction.values()).reduce((sum, row) => sum + row.games, 0);
  const pct = (n, d) => (d ? ((n / d) * 100).toFixed(1) : '0.0');

  console.log(`Sanity simulation complete: ${totalGames} games (${GAMES_PER_PLAYER_FACTION} per player faction), maxTurns=${MAX_TURNS}.`);
  console.log('\n1) Summary table per faction');
  console.table(factionKeys.map((key) => {
    const row = perFaction.get(key);
    return {
      faction: key,
      games: row.games,
      'win %': pct(row.wins, row.games),
      'loss %': pct(row.losses, row.games),
      'draw %': pct(row.draws, row.games),
      'avg turns': (row.totalTurns / row.games).toFixed(2),
      'turn cap %': pct(row.turnCaps, row.games),
    };
  }));

  console.log('\n2) PASS report');
  console.table([
    { metric: 'avg pass/game (player)', value: (metrics.passByOwner.player / totalGames).toFixed(2) },
    { metric: 'avg pass/game (enemy)', value: (metrics.passByOwner.enemy / totalGames).toFixed(2) },
    { metric: 'total pass count', value: metrics.passByOwner.player + metrics.passByOwner.enemy },
  ]);

  console.log('\n3) Effect usage report');
  const usedSorted = [...metrics.effectUsage.entries()].sort((a, b) => b[1] - a[1]);
  console.table(usedSorted.slice(0, 10).map(([effectId, count]) => ({ effectId, uses: count })));
  const neverUsed = [...allEffectIds(factions)].filter((id) => !metrics.effectUsage.has(id)).sort();
  console.log('Never used effectIds:', neverUsed.join(', ') || '(none)');
  console.log('Spawn (summon_grunt_empty_slot) uses:', metrics.effectUsage.get('summon_grunt_empty_slot') ?? 0);
  console.log('Flood (fill_empty_slots_0_1) uses:', metrics.effectUsage.get('fill_empty_slots_0_1') ?? 0);

  console.log('\n4) Game ending breakdown');
  console.table(Object.entries(endingCounts).map(([type, count]) => ({ type, count, 'percent %': pct(count, totalGames) })));

  console.log('\n5) Quick stability check');
  console.table([
    { metric: 'crashes', count: metrics.crashes },
    { metric: 'exceptions', count: metrics.exceptions },
    { metric: 'invalid actions', count: metrics.invalidActions },
  ]);
}

run();
