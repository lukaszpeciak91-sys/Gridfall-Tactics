import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createInitialBattleState,
  drawCards,
  performOpeningMulligan,
  STARTING_HAND_SIZE,
  playOrRedeployUnit,
  performSwap,
  playEffectCard,
  resolveTargetedEffectCard,
  resolveCombat,
  toggleFirstActor,
  resolveTurnCapWinner,
  MAX_TURNS,
} from '../src/systems/GameState.js';
import { chooseBattleAction, recordBattleActionUse, selectOpeningMulliganCardIds } from '../src/systems/enemyDecision.js';

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


function recordMulliganTelemetry(telemetry, factionName, replaced) {
  telemetry.mulliganByFaction ??= {};
  telemetry.mulliganByFaction[factionName] ??= { games: 0, used: 0, cardsReplaced: 0 };
  const row = telemetry.mulliganByFaction[factionName];
  row.games += 1;
  if (replaced > 0) row.used += 1;
  row.cardsReplaced += replaced;
}

function applyAiOpeningMulligan(state, owner, randomFn, telemetry) {
  const side = owner === 'player' ? state.player : state.enemy;
  const selectedIds = selectOpeningMulliganCardIds(side);
  const result = performOpeningMulligan(state, owner, selectedIds, randomFn);
  if (!result.ok) {
    telemetry.invalidActions = (telemetry.invalidActions ?? 0) + 1;
    return;
  }
  recordMulliganTelemetry(telemetry, side.factionName ?? 'Unknown', result.replaced);
}

function applyAction(state, owner, passStats, decisionOptions, telemetry) {
  const action = chooseBattleAction(state, owner, { ...decisionOptions, telemetry });
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
  let result = { ok: true };
  if (action.type === 'play-unit') result = playOrRedeployUnit(state, owner, action.cardId, action.slotIndex);
  if (action.type === 'swap-units') result = performSwap(state, owner, action.fromIndex, action.toIndex);
  if (action.type === 'play-effect') {
    result = playEffectCard(state, owner, action.cardId);
    state.cancelEnemyOrderThisTurn[cancelKey] = false;
  }
  if (action.type === 'play-targeted-effect') {
    result = resolveTargetedEffectCard(
      state,
      owner,
      action.cardId,
      action.targetIndex,
      action.targetIndexes ?? [action.targetIndex],
    );
    state.cancelEnemyOrderThisTurn[cancelKey] = false;
  }
  if (!result.ok) {
    telemetry.invalidActions = (telemetry.invalidActions ?? 0) + 1;
    return;
  }
  recordBattleActionUse(state, owner, action, telemetry);
}


function runSingleGame(playerFaction, enemyFaction, passStats, telemetry, gameSeed, gameIndex, playerKey, enemyKey) {
  const gameRng = createSeededRng(gameSeed);
  const state = createInitialBattleState(playerFaction, enemyFaction, { randomFn: gameRng });

  if (SHUFFLE_DECKS) {
    shuffleDeck(state.player.deck, gameRng);
    shuffleDeck(state.enemy.deck, gameRng);
  }

  drawCards(state.player, STARTING_HAND_SIZE);
  drawCards(state.enemy, STARTING_HAND_SIZE);
  applyAiOpeningMulligan(state, 'player', gameRng, telemetry);
  applyAiOpeningMulligan(state, 'enemy', gameRng, telemetry);
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

    applyAction(state, firstActor, passStats, firstDecisionOptions, telemetry);
    applyAction(state, secondActor, passStats, secondDecisionOptions, telemetry);
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

const percentValue = (count, total) => (total > 0 ? (count / total) * 100 : 0);
const percent = (count, total) => percentValue(count, total).toFixed(1);
const avgValue = (value, count) => (count > 0 ? value / count : 0);
const avg = (value, count) => avgValue(value, count).toFixed(2);
const pct = (value) => `${value.toFixed(1)}%`;

function createStats() {
  return {
    games: 0,
    wins: 0,
    draws: 0,
    turnCaps: 0,
    totalTurns: 0,
    totalRemainingHP: 0,
  };
}

function addFactionGame(stats, won, wasDraw, wasTurnCap, turns, remainingHP) {
  stats.games += 1;
  if (won) stats.wins += 1;
  if (wasDraw) stats.draws += 1;
  if (wasTurnCap) stats.turnCaps += 1;
  stats.totalTurns += turns;
  stats.totalRemainingHP += remainingHP;
}

function getPairKey(factionA, factionB, factionOrder) {
  const indexA = factionOrder.get(factionA);
  const indexB = factionOrder.get(factionB);
  return indexA <= indexB ? `${factionA}|${factionB}` : `${factionB}|${factionA}`;
}

function ensurePairStats(pairStats, factionA, factionB) {
  const key = `${factionA}|${factionB}`;
  if (!pairStats.has(key)) {
    pairStats.set(key, {
      factionA,
      factionB,
      games: 0,
      factionAWins: 0,
      factionBWins: 0,
      draws: 0,
      turnCaps: 0,
      totalTurns: 0,
    });
  }
  return pairStats.get(key);
}

function createOrderedStats(playerFaction, enemyFaction) {
  return {
    playerFaction,
    enemyFaction,
    games: 0,
    playerWins: 0,
    enemyWins: 0,
    draws: 0,
    turnCaps: 0,
    totalTurns: 0,
    totalPlayerHP: 0,
    totalEnemyHP: 0,
  };
}

function addOrderedResult(stats, result) {
  stats.games += 1;
  stats.totalTurns += result.turns;
  stats.totalPlayerHP += result.playerHP;
  stats.totalEnemyHP += result.enemyHP;
  if (result.winner === 'player') stats.playerWins += 1;
  else if (result.winner === 'enemy') stats.enemyWins += 1;
  else stats.draws += 1;
  if (result.endingReason === 'turn-cap') stats.turnCaps += 1;
}

function nonDrawWinPercent(wins, games, draws) {
  return percentValue(wins, games - draws);
}

function sortedClasses(classes) {
  if (classes.size === 0) return 'healthy';
  return [...classes].sort().join(', ');
}

function warnIf(condition, warnings, message) {
  if (condition) warnings.push(`WARN ${message}`);
}

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
  const seedArg = requestedTotal ? positionalArgs[0] : positionalArgs[1];
  const parsedSeed = Number.parseInt(seedArg ?? `${DEFAULT_BASE_SEED}`, 10);
  const baseSeed = Number.isInteger(parsedSeed) ? parsedSeed >>> 0 : DEFAULT_BASE_SEED;

  const factions = loadFactions();
  const factionKeys = Object.keys(factions);
  const factionOrder = new Map(factionKeys.map((key, index) => [key, index]));
  const aggregate = new Map(factionKeys.map((key) => [key, createStats()]));
  const combinedPairs = new Map();
  const orderedMatchups = new Map();
  const passStats = { pass: 0, cancelled: 0 };
  const telemetry = { replaceUsed: 0, repositionUsed: 0, meaningfulGameplayActions: 0, pointlessGameplayActions: 0, openLaneImprovements: 0, repeatedLoopPreventions: 0, invalidActions: 0, crashes: 0, mulliganByFaction: {} };
  const audit = { games: 0, draws: 0, turnCaps: 0, aggroTurnCapWins: 0, aggroGames: 0, nonSwarmGames: 0, nonSwarmDraws: 0, nonSwarmTurnCaps: 0, swarmMirrorGames: 0, swarmMirrorDraws: 0 };

  for (let playerIndex = 0; playerIndex < factionKeys.length; playerIndex += 1) for (let enemyIndex = 0; enemyIndex < factionKeys.length; enemyIndex += 1) {
    const playerKey = factionKeys[playerIndex];
    const enemyKey = factionKeys[enemyIndex];
    const gamesForMatchup = getMatchupCount(playerIndex, enemyIndex, factionKeys.length, requestedTotal) ?? matchCount;
    if (gamesForMatchup <= 0) continue;
    const orderedKey = `${playerKey}|${enemyKey}`;
    const orderedStats = createOrderedStats(playerKey, enemyKey);
    orderedMatchups.set(orderedKey, orderedStats);

    for (let i = 0; i < gamesForMatchup; i += 1) {
      const gameSeed = buildGameSeed(baseSeed, playerKey, enemyKey, i);
      const result = runSingleGame(factions[playerKey], factions[enemyKey], passStats, telemetry, gameSeed, i, playerKey, enemyKey);
      const wasDraw = result.winner === 'draw';
      const wasTurnCap = result.endingReason === 'turn-cap';
      addOrderedResult(orderedStats, result);
      addFactionGame(aggregate.get(playerKey), result.winner === 'player', wasDraw, wasTurnCap, result.turns, result.playerHP);
      addFactionGame(aggregate.get(enemyKey), result.winner === 'enemy', wasDraw, wasTurnCap, result.turns, result.enemyHP);

      if (playerKey !== enemyKey) {
        const pairKey = getPairKey(playerKey, enemyKey, factionOrder);
        const [factionA, factionB] = pairKey.split('|');
        const pair = ensurePairStats(combinedPairs, factionA, factionB);
        pair.games += 1;
        pair.totalTurns += result.turns;
        if (wasDraw) pair.draws += 1;
        if (wasTurnCap) pair.turnCaps += 1;
        if (result.winner === 'player' && playerKey === factionA) pair.factionAWins += 1;
        if (result.winner === 'enemy' && enemyKey === factionA) pair.factionAWins += 1;
        if (result.winner === 'player' && playerKey === factionB) pair.factionBWins += 1;
        if (result.winner === 'enemy' && enemyKey === factionB) pair.factionBWins += 1;
      }

      audit.games += 1;
      if (wasDraw) audit.draws += 1;
      if (wasTurnCap) audit.turnCaps += 1;
      if (playerKey === 'Aggro') audit.aggroGames += 1;
      if (enemyKey === 'Aggro') audit.aggroGames += 1;
      if (playerKey !== 'Swarm' && enemyKey !== 'Swarm') {
        audit.nonSwarmGames += 1;
        if (wasDraw) audit.nonSwarmDraws += 1;
        if (wasTurnCap) audit.nonSwarmTurnCaps += 1;
      }
      if (playerKey === 'Swarm' && enemyKey === 'Swarm') {
        audit.swarmMirrorGames += 1;
        if (wasDraw) audit.swarmMirrorDraws += 1;
      }
      if (wasTurnCap && result.winner === 'player' && playerKey === 'Aggro') audit.aggroTurnCapWins += 1;
      if (wasTurnCap && result.winner === 'enemy' && enemyKey === 'Aggro') audit.aggroTurnCapWins += 1;
    }
  }

  const aggregateRows = factionKeys.map((key) => {
    const row = aggregate.get(key);
    return {
      faction: key,
      games: row.games,
      'win %': percent(row.wins, row.games),
      'non-draw win %': percent(row.wins, row.games - row.draws),
      'draw %': percent(row.draws, row.games),
      'turn-cap %': percent(row.turnCaps, row.games),
      'avg turns': avg(row.totalTurns, row.games),
      'avg remaining hero HP': avg(row.totalRemainingHP, row.games),
    };
  });

  const combinedRows = [...combinedPairs.values()].map((row) => ({
    'faction A': row.factionA,
    'faction B': row.factionB,
    games: row.games,
    'faction A wins': row.factionAWins,
    'faction B wins': row.factionBWins,
    draws: row.draws,
    'faction A all-games WR': percent(row.factionAWins, row.games),
    'faction A non-draw WR': percent(row.factionAWins, row.games - row.draws),
    'draw %': percent(row.draws, row.games),
    'turn-cap %': percent(row.turnCaps, row.games),
    'avg turns': avg(row.totalTurns, row.games),
  }));

  const seatRows = [...orderedMatchups.values()].map((row) => ({
    'player faction': row.playerFaction,
    'enemy faction': row.enemyFaction,
    games: row.games,
    'player win %': percent(row.playerWins, row.games),
    'enemy win %': percent(row.enemyWins, row.games),
    'draw %': percent(row.draws, row.games),
    'average turns': avg(row.totalTurns, row.games),
  }));

  const mirrorRows = factionKeys.map((key) => {
    const row = orderedMatchups.get(`${key}|${key}`) ?? createOrderedStats(key, key);
    return {
      mirror: `${key} vs ${key}`,
      games: row.games,
      'draw %': percent(row.draws, row.games),
      'turn-cap %': percent(row.turnCaps, row.games),
      'average turns': avg(row.totalTurns, row.games),
      'average remaining HP': avg(row.totalPlayerHP + row.totalEnemyHP, row.games * 2),
    };
  });

  const warnings = [];
  const recommendations = new Map();
  const mark = (subject, classification) => {
    if (!recommendations.has(subject)) recommendations.set(subject, new Set());
    recommendations.get(subject).add(classification);
  };

  factionKeys.forEach((key) => {
    const row = aggregate.get(key);
    const winRate = percentValue(row.wins, row.games);
    const drawRate = percentValue(row.draws, row.games);
    const turnCapRate = percentValue(row.turnCaps, row.games);
    warnIf(winRate < 40, warnings, `${key} aggregate WR ${pct(winRate)} below 40.0%`);
    warnIf(winRate > 56, warnings, `${key} aggregate WR ${pct(winRate)} above 56.0%`);
    warnIf(drawRate > 10, warnings, `${key} aggregate draw rate ${pct(drawRate)} above 10.0%`);
    warnIf(turnCapRate > 10, warnings, `${key} aggregate turn-cap rate ${pct(turnCapRate)} above 10.0%`);
    if (winRate < 40) mark(key, 'underperforming');
    if (winRate > 56) mark(key, 'overperforming');
    if (drawRate > 10) mark(key, 'draw risk');
    if (turnCapRate > 10) mark(key, 'pacing risk');
  });

  [...combinedPairs.values()].forEach((row) => {
    const factionANonDrawWR = nonDrawWinPercent(row.factionAWins, row.games, row.draws);
    const drawRate = percentValue(row.draws, row.games);
    const turnCapRate = percentValue(row.turnCaps, row.games);
    const subject = `${row.factionA} vs ${row.factionB}`;
    warnIf(factionANonDrawWR < 30, warnings, `${subject} ${row.factionA} non-draw matchup WR ${pct(factionANonDrawWR)} below 30.0%`);
    warnIf(factionANonDrawWR > 70, warnings, `${subject} ${row.factionA} non-draw matchup WR ${pct(factionANonDrawWR)} above 70.0%`);
    warnIf(drawRate > 10, warnings, `${subject} draw rate ${pct(drawRate)} above 10.0%`);
    warnIf(turnCapRate > 10, warnings, `${subject} turn-cap rate ${pct(turnCapRate)} above 10.0%`);
    if (factionANonDrawWR < 30) mark(subject, 'underperforming');
    if (factionANonDrawWR > 70) mark(subject, 'overperforming');
    if (drawRate > 10) mark(subject, 'draw risk');
    if (turnCapRate > 10) mark(subject, 'pacing risk');
  });

  factionKeys.forEach((key) => {
    const row = orderedMatchups.get(`${key}|${key}`);
    if (!row) return;
    const drawRate = percentValue(row.draws, row.games);
    const turnCapRate = percentValue(row.turnCaps, row.games);
    const averageTurns = avgValue(row.totalTurns, row.games);
    const subject = `${key} mirror`;
    warnIf(drawRate > 10, warnings, `${subject} draw rate ${pct(drawRate)} above 10.0%`);
    warnIf(turnCapRate > 10, warnings, `${subject} turn-cap rate ${pct(turnCapRate)} above 10.0%`);
    warnIf(averageTurns < 4, warnings, `${subject} average turns ${averageTurns.toFixed(2)} below 4.00`);
    warnIf(averageTurns > 25, warnings, `${subject} average turns ${averageTurns.toFixed(2)} above 25.00`);
    if (drawRate > 10) mark(subject, 'draw risk');
    if (turnCapRate > 10 || averageTurns < 4 || averageTurns > 25) mark(subject, 'pacing risk');
  });

  [...combinedPairs.values()].forEach((row) => {
    const forward = orderedMatchups.get(`${row.factionA}|${row.factionB}`);
    const reverse = orderedMatchups.get(`${row.factionB}|${row.factionA}`);
    if (!forward || !reverse) return;
    const factionAPlayerWR = percentValue(forward.playerWins, forward.games);
    const factionAEnemyWR = percentValue(reverse.enemyWins, reverse.games);
    const spread = Math.abs(factionAPlayerWR - factionAEnemyWR);
    const subject = `${row.factionA} vs ${row.factionB}`;
    warnIf(spread > 15, warnings, `${subject} seat spread ${spread.toFixed(1)} percentage points above 15.0`);
    if (spread > 15) mark(subject, 'seat-bias risk');
  });

  const recommendationRows = [
    ...factionKeys.map((key) => ({ subject: key, classification: sortedClasses(recommendations.get(key) ?? new Set()) })),
    ...[...combinedPairs.values()].map((row) => {
      const subject = `${row.factionA} vs ${row.factionB}`;
      return { subject, classification: sortedClasses(recommendations.get(subject) ?? new Set()) };
    }),
    ...factionKeys.map((key) => {
      const subject = `${key} mirror`;
      return { subject, classification: sortedClasses(recommendations.get(subject) ?? new Set()) };
    }),
  ];

  console.log(requestedTotal ? `
Battle simulation complete (${audit.games} total games, max ${MAX_TURNS} turns).` : `
Battle simulation complete (${matchCount} games per matchup, max ${MAX_TURNS} turns).`);
  console.log(`Base seed: ${baseSeed}`);
  console.log('\nBalance audit: aggregate faction table');
  console.table(aggregateRows);
  console.log('\nBalance audit: combined matchup table across both seats');
  console.table(combinedRows);
  console.log('\nBalance audit: seat bias table');
  console.table(seatRows);
  console.log('\nBalance audit: mirror pacing table');
  console.table(mirrorRows);
  console.log('\nBalance audit: health flags');
  if (warnings.length === 0) console.log('No WARN flags.');
  else warnings.forEach((warning) => console.log(warning));
  console.log('\nFinal recommendation summary:');
  console.table(recommendationRows);
  console.log('\nAudit pacing summary:');
  console.table([
    { metric: 'total draw %', value: percent(audit.draws, audit.games), count: `${audit.draws}/${audit.games}` },
    { metric: 'Swarm vs Swarm draw %', value: percent(audit.swarmMirrorDraws, audit.swarmMirrorGames), count: `${audit.swarmMirrorDraws}/${audit.swarmMirrorGames}` },
    { metric: 'turn-cap %', value: percent(audit.turnCaps, audit.games), count: `${audit.turnCaps}/${audit.games}` },
    { metric: 'non-Swarm draw %', value: percent(audit.nonSwarmDraws, audit.nonSwarmGames), count: `${audit.nonSwarmDraws}/${audit.nonSwarmGames}` },
    { metric: 'non-Swarm turn-cap %', value: percent(audit.nonSwarmTurnCaps, audit.nonSwarmGames), count: `${audit.nonSwarmTurnCaps}/${audit.nonSwarmGames}` },
    { metric: 'Aggro chip timeout win %', value: percent(audit.aggroTurnCapWins, audit.aggroGames), count: `${audit.aggroTurnCapWins}/${audit.aggroGames}` },
  ]);
  console.log('\nOpening mulligan usage by faction:');
  console.table(factionKeys.map((key) => {
    const row = telemetry.mulliganByFaction[key] ?? { games: 0, used: 0, cardsReplaced: 0 };
    return {
      faction: key,
      games: row.games,
      'usage %': percent(row.used, row.games),
      'avg cards replaced': avg(row.cardsReplaced, row.games),
    };
  }));

  console.log('\nAI gameplay-action telemetry:');
  console.table([
    { metric: 'replace actions used', count: telemetry.replaceUsed },
    { metric: 'reposition actions used', count: telemetry.repositionUsed },
    { metric: 'meaningful replace/reposition uses', count: telemetry.meaningfulGameplayActions },
    { metric: 'pointless replace/reposition uses', count: telemetry.pointlessGameplayActions },
    { metric: 'open-lane improvements', count: telemetry.openLaneImprovements },
    { metric: 'repeated-loop preventions', count: telemetry.repeatedLoopPreventions },
    { metric: 'invalid actions', count: telemetry.invalidActions },
    { metric: 'crashes', count: telemetry.crashes },
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
