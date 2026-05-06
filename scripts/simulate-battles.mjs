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
  resolveTurnCapWinner,
  MAX_TURNS,
} from '../src/systems/GameState.js';
import { chooseBattleAction } from '../src/systems/enemyDecision.js';

const DEFAULT_MATCH_COUNT = 100;
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
    state.turnsCompleted = turns;
    resolveTurnCapWinner(state, turns);
    if (!state.winner) toggleFirstActor(state);
  }
  return {
    winner: state.winner ?? 'draw',
    turns,
    playerHP: state.playerHP,
    enemyHP: state.enemyHP,
    firstActor: initialFirstActor,
    endingReason: state.endingReason,
    turnCapResolvedBy: state.turnCapResolvedBy,
  };
}

const percent = (count, total) => ((count / total) * 100).toFixed(1);
const avg = (value, count) => (count > 0 ? (value / count).toFixed(2) : '0.00');

function getMatchupCount(playerIndex, enemyIndex, factionCount, requestedTotal) {
  if (!requestedTotal) return null;
  const matchupCount = factionCount * factionCount;
  const ordinal = playerIndex * factionCount + enemyIndex;
  const base = Math.floor(requestedTotal / matchupCount);
  const remainder = requestedTotal % matchupCount;
  return base + (ordinal < remainder ? 1 : 0);
}

function main() {
  const totalArg = process.argv.find((arg) => arg.startsWith('--total='));
  const requestedTotal = totalArg ? Number.parseInt(totalArg.split('=')[1], 10) : null;
  const positionalArgs = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  const parsedCount = Number.parseInt(positionalArgs[0] ?? `${DEFAULT_MATCH_COUNT}`, 10);
  const matchCount = Number.isInteger(parsedCount) && parsedCount > 0 ? parsedCount : DEFAULT_MATCH_COUNT;
  const parsedSeed = Number.parseInt(positionalArgs[1] ?? `${DEFAULT_BASE_SEED}`, 10);
  const baseSeed = Number.isInteger(parsedSeed) ? parsedSeed >>> 0 : DEFAULT_BASE_SEED;

  const factions = loadFactions();
  const factionKeys = Object.keys(factions);
  const aggregate = new Map(factionKeys.map((key) => [key, { wins: 0, games: 0, draws: 0, turnCaps: 0, turnCapWins: 0 }]));
  const matchupRows = [];
  const passStats = { pass: 0, cancelled: 0 };
  const audit = { games: 0, draws: 0, turnCaps: 0, aggroTurnCapWins: 0, aggroGames: 0, nonSwarmGames: 0, nonSwarmDraws: 0, nonSwarmTurnCaps: 0, swarmMirrorGames: 0, swarmMirrorDraws: 0 };

  for (let playerIndex = 0; playerIndex < factionKeys.length; playerIndex += 1) for (let enemyIndex = 0; enemyIndex < factionKeys.length; enemyIndex += 1) {
    const playerKey = factionKeys[playerIndex];
    const enemyKey = factionKeys[enemyIndex];
    const gamesForMatchup = getMatchupCount(playerIndex, enemyIndex, factionKeys.length, requestedTotal) ?? matchCount;
    if (gamesForMatchup <= 0) continue;
    let playerWins = 0; let enemyWins = 0; let draws = 0; let turnCaps = 0; let playerTurnCapWins = 0; let enemyTurnCapWins = 0; let totalTurns = 0; let totalPlayerHP = 0; let totalEnemyHP = 0;
    for (let i = 0; i < gamesForMatchup; i += 1) {
      const gameSeed = buildGameSeed(baseSeed, playerKey, enemyKey, i);
      const result = runSingleGame(factions[playerKey], factions[enemyKey], passStats, gameSeed, i, playerKey, enemyKey);
      totalTurns += result.turns; totalPlayerHP += result.playerHP; totalEnemyHP += result.enemyHP;
      if (result.winner === 'player') playerWins += 1; else if (result.winner === 'enemy') enemyWins += 1; else draws += 1;
      if (result.endingReason === 'turn-cap') {
        turnCaps += 1;
        if (result.winner === 'player') playerTurnCapWins += 1;
        if (result.winner === 'enemy') enemyTurnCapWins += 1;
      }
    }
    aggregate.get(playerKey).wins += playerWins; aggregate.get(playerKey).games += gamesForMatchup; aggregate.get(playerKey).draws += draws; aggregate.get(playerKey).turnCaps += turnCaps; aggregate.get(playerKey).turnCapWins += playerTurnCapWins;
    aggregate.get(enemyKey).wins += enemyWins; aggregate.get(enemyKey).games += gamesForMatchup; aggregate.get(enemyKey).draws += draws; aggregate.get(enemyKey).turnCaps += turnCaps; aggregate.get(enemyKey).turnCapWins += enemyTurnCapWins;
    audit.games += gamesForMatchup; audit.draws += draws; audit.turnCaps += turnCaps;
    if (playerKey === 'Aggro') { audit.aggroGames += gamesForMatchup; audit.aggroTurnCapWins += playerTurnCapWins; }
    if (enemyKey === 'Aggro') { audit.aggroGames += gamesForMatchup; audit.aggroTurnCapWins += enemyTurnCapWins; }
    if (playerKey !== 'Swarm' && enemyKey !== 'Swarm') { audit.nonSwarmGames += gamesForMatchup; audit.nonSwarmDraws += draws; audit.nonSwarmTurnCaps += turnCaps; }
    if (playerKey === 'Swarm' && enemyKey === 'Swarm') { audit.swarmMirrorGames += gamesForMatchup; audit.swarmMirrorDraws += draws; }
    matchupRows.push({ matchup: `${playerKey} vs ${enemyKey}`, games: gamesForMatchup, 'player win %': percent(playerWins, gamesForMatchup), 'enemy win %': percent(enemyWins, gamesForMatchup), 'draw %': percent(draws, gamesForMatchup), 'turn cap %': percent(turnCaps, gamesForMatchup), 'turn-cap P/E wins': `${playerTurnCapWins} / ${enemyTurnCapWins}`, 'avg turns': avg(totalTurns, gamesForMatchup), 'avg remaining HP': `${avg(totalPlayerHP, gamesForMatchup)} / ${avg(totalEnemyHP, gamesForMatchup)}` });
  }

  console.log(requestedTotal ? `\nBattle simulation complete (${audit.games} total games, max ${MAX_TURNS} turns).` : `\nBattle simulation complete (${matchCount} games per matchup, max ${MAX_TURNS} turns).`);
  console.log(`Base seed: ${baseSeed}`);
  console.table(matchupRows);
  console.log('\nAggregate faction win rate:');
  console.table(factionKeys.map((key) => ({ faction: key, games: aggregate.get(key).games, 'win %': percent(aggregate.get(key).wins, aggregate.get(key).games), 'draw %': percent(aggregate.get(key).draws, aggregate.get(key).games), 'turn cap %': percent(aggregate.get(key).turnCaps, aggregate.get(key).games), 'turn-cap win %': percent(aggregate.get(key).turnCapWins, aggregate.get(key).games) })));
  console.log('\nAudit pacing summary:');
  console.table([
    { metric: 'total draw %', value: percent(audit.draws, audit.games), count: `${audit.draws}/${audit.games}` },
    { metric: 'Swarm vs Swarm draw %', value: percent(audit.swarmMirrorDraws, audit.swarmMirrorGames), count: `${audit.swarmMirrorDraws}/${audit.swarmMirrorGames}` },
    { metric: 'turn-cap %', value: percent(audit.turnCaps, audit.games), count: `${audit.turnCaps}/${audit.games}` },
    { metric: 'non-Swarm draw %', value: percent(audit.nonSwarmDraws, audit.nonSwarmGames), count: `${audit.nonSwarmDraws}/${audit.nonSwarmGames}` },
    { metric: 'non-Swarm turn-cap %', value: percent(audit.nonSwarmTurnCaps, audit.nonSwarmGames), count: `${audit.nonSwarmTurnCaps}/${audit.nonSwarmGames}` },
    { metric: 'Aggro chip timeout win %', value: percent(audit.aggroTurnCapWins, audit.aggroGames), count: `${audit.aggroTurnCapWins}/${audit.aggroGames}` },
  ]);
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
