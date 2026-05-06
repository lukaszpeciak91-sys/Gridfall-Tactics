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

const DEFAULT_MATCH_COUNT = 100;
const MAX_TURNS = 50;
const DEFAULT_BASE_SEED = 1337;
const SHUFFLE_DECKS = true;
const FIRST_ACTOR_POLICY = 'random-initial-then-alternating';
const TIE_BREAK_POLICY = 'seeded-random';

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

function buildGameSeed(baseSeed, playerKey, enemyKey, gameIndex) {
  return (baseSeed ^ hashString(playerKey) ^ Math.imul(hashString(enemyKey), 31) ^ Math.imul(gameIndex + 1, 2654435761)) >>> 0;
}

function shuffleDeck(deck, rng) {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function applyAction(state, owner, passStats, decisionOptions) {
  const action = chooseBattleAction(state, owner, decisionOptions);
  const cancelKey = owner === 'enemy' ? 'player' : 'enemy';
  const nonUnit = action.type === 'play-effect' || action.type === 'play-targeted-effect';
  if (action.type === 'pass') {
    passStats.pass = (passStats.pass ?? 0) + 1;
    return;
  }
  if (state.cancelEnemyOrderThisTurn?.[cancelKey] && nonUnit) {
    state.cancelEnemyOrderThisTurn[cancelKey] = false;
    passStats.cancelled = (passStats.cancelled ?? 0) + 1;
    return;
  }
  if (action.type === 'play-unit') playOrRedeployUnit(state, owner, action.cardId, action.slotIndex);
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

function runSingleGame(playerFaction, enemyFaction, passStats, gameSeed, gameIndex, playerKey, enemyKey) {
  const gameRng = createSeededRng(gameSeed);
  const state = createInitialBattleState(playerFaction, enemyFaction, { randomFn: gameRng });

  if (SHUFFLE_DECKS) {
    shuffleDeck(state.player.deck, gameRng);
    shuffleDeck(state.enemy.deck, gameRng);
  }

  drawCards(state.player, 4);
  drawCards(state.enemy, 4);
  let turns = 0;

  const initialFirstActor = state.firstActor;

  while (!state.winner && turns < MAX_TURNS) {
    const decisionContext = `${playerKey}|${enemyKey}|${gameIndex}|${turns}`;
    const decisionSeed = buildGameSeed(gameSeed, decisionContext, state.firstActor, turns + 7);
    const turnRng = createSeededRng(decisionSeed);
    const firstDecisionOptions = { randomFn: turnRng, tieBreakPolicy: TIE_BREAK_POLICY };
    const secondDecisionOptions = { randomFn: turnRng, tieBreakPolicy: TIE_BREAK_POLICY };

    const firstActor = state.firstActor;
    const secondActor = firstActor === 'player' ? 'enemy' : 'player';

    applyAction(state, firstActor, passStats, firstDecisionOptions);
    applyAction(state, secondActor, passStats, secondDecisionOptions);
    resolveCombat(state);
    drawCards(state.player, 1);
    drawCards(state.enemy, 1);
    turns += 1;
    if (!state.winner) toggleFirstActor(state);
  }
  return { winner: state.winner ?? 'draw', turns, playerHP: state.playerHP, enemyHP: state.enemyHP, firstActor: initialFirstActor };
}

const percent = (count, total) => ((count / total) * 100).toFixed(1);
const avg = (value, count) => (count > 0 ? (value / count).toFixed(2) : '0.00');

function main() {
  const parsedCount = Number.parseInt(process.argv[2] ?? `${DEFAULT_MATCH_COUNT}`, 10);
  const matchCount = Number.isInteger(parsedCount) && parsedCount > 0 ? parsedCount : DEFAULT_MATCH_COUNT;
  const parsedSeed = Number.parseInt(process.argv[3] ?? `${DEFAULT_BASE_SEED}`, 10);
  const baseSeed = Number.isInteger(parsedSeed) ? parsedSeed >>> 0 : DEFAULT_BASE_SEED;

  const factions = loadFactions();
  const factionKeys = Object.keys(factions);
  const aggregate = new Map(factionKeys.map((key) => [key, { wins: 0, games: 0, draws: 0 }]));
  const matchupRows = [];
  const passStats = { pass: 0, cancelled: 0 };

  for (const playerKey of factionKeys) for (const enemyKey of factionKeys) {
    let playerWins = 0; let enemyWins = 0; let draws = 0; let totalTurns = 0; let totalPlayerHP = 0; let totalEnemyHP = 0;
    for (let i = 0; i < matchCount; i += 1) {
      const gameSeed = buildGameSeed(baseSeed, playerKey, enemyKey, i);
      const result = runSingleGame(factions[playerKey], factions[enemyKey], passStats, gameSeed, i, playerKey, enemyKey);
      totalTurns += result.turns; totalPlayerHP += result.playerHP; totalEnemyHP += result.enemyHP;
      if (result.winner === 'player') playerWins += 1; else if (result.winner === 'enemy') enemyWins += 1; else draws += 1;
    }
    aggregate.get(playerKey).wins += playerWins; aggregate.get(playerKey).games += matchCount; aggregate.get(playerKey).draws += draws;
    aggregate.get(enemyKey).wins += enemyWins; aggregate.get(enemyKey).games += matchCount; aggregate.get(enemyKey).draws += draws;
    matchupRows.push({ matchup: `${playerKey} vs ${enemyKey}`, games: matchCount, 'player win %': percent(playerWins, matchCount), 'enemy win %': percent(enemyWins, matchCount), 'draw %': percent(draws, matchCount), 'avg turns': avg(totalTurns, matchCount), 'avg remaining HP': `${avg(totalPlayerHP, matchCount)} / ${avg(totalEnemyHP, matchCount)}` });
  }

  console.log(`\nBattle simulation complete (${matchCount} games per matchup, max ${MAX_TURNS} turns).`);
  console.log(`Base seed: ${baseSeed}`);
  console.table(matchupRows);
  console.log('\nAggregate faction win rate:');
  console.table(factionKeys.map((key) => ({ faction: key, games: aggregate.get(key).games, 'win %': percent(aggregate.get(key).wins, aggregate.get(key).games), 'draw %': percent(aggregate.get(key).draws, aggregate.get(key).games) })));
  console.log('\nPASS reason counts:');
  console.table(Object.entries(passStats).map(([reason, count]) => ({ reason, count })));
  console.log('\nSimulation parity and validity notes:');
  console.log(`- baseSeed: ${baseSeed}`);
  console.log(`- decks shuffled: ${SHUFFLE_DECKS ? 'yes (seeded Fisher-Yates per game)' : 'no'}`);
  console.log(`- first actor policy: ${FIRST_ACTOR_POLICY} (seeded random at battle start, toggles after each full turn)`);
  console.log(`- tie-break policy: ${TIE_BREAK_POLICY}`);
  console.log('- previous deterministic reports are invalid because fixed deck order and fixed first actor introduced structural bias.');
}
main();
