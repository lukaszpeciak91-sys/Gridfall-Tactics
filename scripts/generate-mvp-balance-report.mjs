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
  resolveTargetedUnitOnPlayEffect,
  resolveCombat,
  toggleFirstActor,
  resolveTurnCapWinner,
  resolveImmediateResourceExhaustionWinner,
  resolveImmediateNoProgressWinner,
  recordPassAction,
  completeActionOpportunity,
  MAX_TURNS,
} from '../src/systems/GameState.js';
import { getFactionByKey, getFactionKeys } from '../src/data/factions/index.js';
import { chooseBattleAction, recordBattleActionUse, selectOpeningMulliganCardIds } from '../src/systems/enemyDecision.js';

const DEFAULT_MATCH_COUNT = 1000;
const DEFAULT_BASE_SEED = 20260513;
const SHUFFLE_DECKS = true;
const TIE_BREAK_POLICY = 'seeded-random';
const REPORT_PATH = 'docs/project/mvp-balance-simulation-report.md';
const SAMPLE_LOGS_PER_MATCHUP = 8;
const REPRESENTATIVE_LOG_LIMIT = 24;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
function loadFactions() {
  return Object.fromEntries(getFactionKeys().map((factionKey) => [factionKey, getFactionByKey(factionKey)]));
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

function cardLabel(card) {
  if (!card) return 'unknown card';
  return `${card.name ?? card.id} (${card.id})`;
}

function ownerLabel(owner) {
  return owner === 'player' ? 'P' : 'E';
}

function recordMulliganTelemetry(telemetry, factionName, replaced) {
  telemetry.mulliganByFaction ??= {};
  telemetry.mulliganByFaction[factionName] ??= { games: 0, used: 0, cardsReplaced: 0 };
  const row = telemetry.mulliganByFaction[factionName];
  row.games += 1;
  if (replaced > 0) row.used += 1;
  row.cardsReplaced += replaced;
}

function applyAiOpeningMulligan(state, owner, randomFn, telemetry, gameLog, cardGameTelemetry = null) {
  const side = owner === 'player' ? state.player : state.enemy;
  const selectedIds = selectOpeningMulliganCardIds(side);
  const selectedNames = side.hand.filter((card) => selectedIds.includes(card.id)).map(cardLabel);
  const deckBeforeMulligan = [...(side.deck ?? [])];
  const result = performOpeningMulligan(state, owner, selectedIds, randomFn);
  if (!result.ok) {
    telemetry.invalidActions = (telemetry.invalidActions ?? 0) + 1;
    gameLog?.push(`${ownerLabel(owner)} mulligan invalid: ${result.reason ?? 'unknown reason'}`);
    return;
  }
  recordDrawTelemetry(telemetry, side, deckBeforeMulligan, cardGameTelemetry?.[owner]);
  recordMulliganTelemetry(telemetry, side.factionName ?? 'Unknown', result.replaced);
  if (result.replaced > 0) gameLog?.push(`${ownerLabel(owner)} mulligan replaced ${result.replaced}: ${selectedNames.join(', ')}`);
}

function describeAction(action, result, state, owner) {
  if (action.type === 'pass') return `${ownerLabel(owner)} passes`;
  const card = result?.card ?? (owner === 'player' ? state.player.hand : state.enemy.hand).find((item) => item.id === action.cardId);
  if (action.type === 'play-unit') {
    const lane = owner === 'player' ? action.slotIndex - 6 : action.slotIndex;
    const kind = action.placementType === 'redeploy' ? 'redeploys' : 'plays';
    return `${ownerLabel(owner)} ${kind} ${cardLabel(card)} to lane ${lane + 1}`;
  }
  if (action.type === 'swap-units') return `${ownerLabel(owner)} swaps slots ${action.fromIndex} and ${action.toIndex}`;
  if (action.type === 'play-effect') return `${ownerLabel(owner)} plays ${cardLabel(card)}`;
  if (action.type === 'play-targeted-effect') return `${ownerLabel(owner)} plays ${cardLabel(card)} targeting ${[...(action.targetIndexes ?? [action.targetIndex])].join('/')}`;
  return `${ownerLabel(owner)} uses ${action.type}`;
}

function addCardUse(telemetry, result) {
  if (!result?.card) return;
  const key = result.card.id;
  telemetry.cardUses[key] ??= createCardTelemetryRow(result.card);
  telemetry.cardUses[key].uses += 1;
}

function createCardTelemetryRow(card, faction = '') {
  return {
    faction,
    id: card?.id ?? 'unknown',
    name: card?.name ?? card?.id ?? 'Unknown',
    uses: 0,
    drawnGames: 0,
    drawnWins: 0,
    drawnLosses: 0,
    notDrawnGames: 0,
    notDrawnWins: 0,
    notDrawnLosses: 0,
    playedGames: 0,
    playedWins: 0,
    playedLosses: 0,
    notPlayedGames: 0,
    notPlayedWins: 0,
    notPlayedLosses: 0,
  };
}

function cardTelemetryKey(faction, card) {
  return `${faction}|${card?.id ?? 'unknown'}`;
}

function ensureCardTelemetry(telemetry, faction, card) {
  const key = cardTelemetryKey(faction, card);
  telemetry.cardImpact[key] ??= createCardTelemetryRow(card, faction);
  return telemetry.cardImpact[key];
}

function createCardGameTelemetrySide(factionName, cards) {
  const side = { faction: factionName ?? 'Unknown', cards: new Map(), drawn: new Set(), played: new Set() };
  cards.forEach((card) => side.cards.set(card?.id ?? 'unknown', card));
  return side;
}

function createCardGameTelemetry(state) {
  return {
    player: createCardGameTelemetrySide(state.player.factionName, state.player.deck),
    enemy: createCardGameTelemetrySide(state.enemy.factionName, state.enemy.deck),
  };
}

function countCards(cards) {
  const counts = new Map();
  cards.forEach((card) => {
    const key = card?.id ?? 'unknown';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return counts;
}

function recordDrawTelemetry(telemetry, side, beforeDeck, gameCardTelemetry) {
  if (!telemetry || !side || !gameCardTelemetry) return;
  const afterCounts = countCards(side.deck ?? []);
  (beforeDeck ?? []).forEach((card) => {
    const key = card?.id ?? 'unknown';
    const remaining = afterCounts.get(key) ?? 0;
    if (remaining > 0) {
      afterCounts.set(key, remaining - 1);
      return;
    }
    gameCardTelemetry.cards.set(key, card);
    gameCardTelemetry.drawn.add(key);
    ensureCardTelemetry(telemetry, side.factionName ?? 'Unknown', card);
  });
}

function recordPlayedGameTelemetry(telemetry, side, card, gameCardTelemetry) {
  if (!telemetry || !side || !card || !gameCardTelemetry) return;
  const key = card?.id ?? 'unknown';
  gameCardTelemetry.cards.set(key, card);
  gameCardTelemetry.played.add(key);
  ensureCardTelemetry(telemetry, side.factionName ?? 'Unknown', card);
}

function recordCardOutcomeTelemetryForSide(telemetry, sideGameTelemetry, winner, sideOwner) {
  if (!telemetry || !sideGameTelemetry) return;
  const won = winner === sideOwner;
  const lost = winner !== 'draw' && winner !== sideOwner;
  sideGameTelemetry.cards.forEach((card, cardId) => {
    const row = ensureCardTelemetry(telemetry, sideGameTelemetry.faction, card);
    const drawPrefix = sideGameTelemetry.drawn.has(cardId) ? 'drawn' : 'notDrawn';
    const playPrefix = sideGameTelemetry.played.has(cardId) ? 'played' : 'notPlayed';
    row[`${drawPrefix}Games`] += 1;
    row[`${playPrefix}Games`] += 1;
    if (won) {
      row[`${drawPrefix}Wins`] += 1;
      row[`${playPrefix}Wins`] += 1;
    }
    if (lost) {
      row[`${drawPrefix}Losses`] += 1;
      row[`${playPrefix}Losses`] += 1;
    }
  });
}

function applyAction(state, owner, passStats, decisionOptions, telemetry, gameLog, cardGameTelemetry = null) {
  const action = chooseBattleAction(state, owner, { ...decisionOptions, telemetry });
  const cancelKey = owner === 'enemy' ? 'player' : 'enemy';
  const nonUnit = action.type === 'play-effect' || action.type === 'play-targeted-effect';
  if (action.type === 'pass') {
    passStats.pass = (passStats.pass ?? 0) + 1;
    recordPassAction(state, owner);
    gameLog?.push(describeAction(action, null, state, owner));
    return;
  }
  if (state.cancelEnemyOrderThisTurn?.[cancelKey] && nonUnit) {
    state.cancelEnemyOrderThisTurn[cancelKey] = false;
    completeActionOpportunity(state, owner);
    passStats.cancelled = (passStats.cancelled ?? 0) + 1;
    gameLog?.push(`${ownerLabel(owner)} ${action.type} cancelled by order cancel`);
    return;
  }
  const deckBeforeAction = [...(state?.[owner]?.deck ?? [])];
  let result = { ok: true };
  if (action.type === 'play-unit') {
    result = playOrRedeployUnit(state, owner, action.cardId, action.slotIndex);
    if (result.ok && Array.isArray(action.targetIndexes) && action.effectId === 'swap_two_enemy_units') {
      result = resolveTargetedUnitOnPlayEffect(state, owner, action.slotIndex, action.targetIndexes);
    }
  }
  if (action.type === 'swap-units') result = performSwap(state, owner, action.fromIndex, action.toIndex);
  if (action.type === 'play-effect') {
    result = playEffectCard(state, owner, action.cardId);
    state.cancelEnemyOrderThisTurn[cancelKey] = false;
  }
  if (action.type === 'play-targeted-effect') {
    result = resolveTargetedEffectCard(state, owner, action.cardId, action.targetIndex, action.targetIndexes ?? [action.targetIndex]);
    state.cancelEnemyOrderThisTurn[cancelKey] = false;
  }
  if (!result.ok) {
    telemetry.invalidActions = (telemetry.invalidActions ?? 0) + 1;
    gameLog?.push(`${ownerLabel(owner)} invalid ${action.type}: ${result.reason ?? 'unknown reason'}`);
    return;
  }
  recordDrawTelemetry(telemetry, state?.[owner], deckBeforeAction, cardGameTelemetry?.[owner]);
  recordPlayedGameTelemetry(telemetry, state?.[owner], result.card, cardGameTelemetry?.[owner]);
  addCardUse(telemetry, result);
  recordBattleActionUse(state, owner, action, telemetry);
  gameLog?.push(describeAction(action, result, state, owner));
}

function classifyWinCondition(result) {
  if (result.heroDeathResolution?.simultaneousLethal) return 'simultaneous lethal';
  if (result.endingReason === 'resource_exhaustion') return 'resource exhaustion';
  if (result.endingReason === 'no-progress-deadlock') return 'no-progress HP tiebreak';
  if (result.endingReason === 'turn-cap') return 'turn-cap HP tiebreak';
  if (result.heroDeathResolution?.resolvedBy === 'single-hero-lethal' || result.playerHP === 0 || result.enemyHP === 0) return 'hero lethal';
  return result.winner === 'draw' ? 'draw' : 'hero lethal';
}

function runSingleGame(playerFaction, enemyFaction, passStats, telemetry, gameSeed, gameIndex, playerKey, enemyKey, captureLog = false) {
  const gameRng = createSeededRng(gameSeed);
  const state = createInitialBattleState(playerFaction, enemyFaction, { randomFn: gameRng });
  const gameLog = captureLog ? [] : null;

  if (SHUFFLE_DECKS) {
    shuffleDeck(state.player.deck, gameRng);
    shuffleDeck(state.enemy.deck, gameRng);
  }

  const cardGameTelemetry = createCardGameTelemetry(state);

  const initialPlayerDeck = [...state.player.deck];
  const initialEnemyDeck = [...state.enemy.deck];
  drawCards(state.player, STARTING_HAND_SIZE);
  drawCards(state.enemy, STARTING_HAND_SIZE);
  recordDrawTelemetry(telemetry, state.player, initialPlayerDeck, cardGameTelemetry.player);
  recordDrawTelemetry(telemetry, state.enemy, initialEnemyDeck, cardGameTelemetry.enemy);
  gameLog?.push(`Initial first actor: ${state.firstActor}; opening hands P=${state.player.hand.map(cardLabel).join('; ')} | E=${state.enemy.hand.map(cardLabel).join('; ')}`);
  applyAiOpeningMulligan(state, 'player', gameRng, telemetry, gameLog, cardGameTelemetry);
  applyAiOpeningMulligan(state, 'enemy', gameRng, telemetry, gameLog, cardGameTelemetry);
  let turns = 0;
  const initialFirstActor = state.firstActor;

  while (!state.winner && turns < MAX_TURNS) {
    resolveImmediateResourceExhaustionWinner(state);
    resolveImmediateNoProgressWinner(state);
    if (state.winner) break;

    const decisionContext = `${playerKey}|${enemyKey}|${gameIndex}|${turns}`;
    const decisionSeed = buildGameSeed(gameSeed, decisionContext, state.firstActor, turns + 7);
    const turnRng = createSeededRng(decisionSeed);
    const firstActor = state.firstActor;
    const secondActor = firstActor === 'player' ? 'enemy' : 'player';
    gameLog?.push(`Turn ${turns + 1} (${ownerLabel(firstActor)} first), HP before P:${state.playerHP} E:${state.enemyHP}`);
    applyAction(state, firstActor, passStats, { randomFn: turnRng, tieBreakPolicy: TIE_BREAK_POLICY }, telemetry, gameLog, cardGameTelemetry);
    applyAction(state, secondActor, passStats, { randomFn: turnRng, tieBreakPolicy: TIE_BREAK_POLICY }, telemetry, gameLog, cardGameTelemetry);
    const playerDeckBeforeCombat = [...state.player.deck];
    const enemyDeckBeforeCombat = [...state.enemy.deck];
    const events = resolveCombat(state);
    recordDrawTelemetry(telemetry, state.player, playerDeckBeforeCombat, cardGameTelemetry.player);
    recordDrawTelemetry(telemetry, state.enemy, enemyDeckBeforeCombat, cardGameTelemetry.enemy);
    turns += 1;
    state.turnsCompleted = turns;
    const heroDamageEvents = events.filter((event) => event?.type === 'hero-damage').length;
    const unitDeathEvents = events.filter((event) => event?.type === 'unit-destroyed' || event?.type === 'unit-death').length;
    gameLog?.push(`Combat resolved: ${events.length} events (${heroDamageEvents} hero-damage, ${unitDeathEvents} deaths), HP after P:${state.playerHP} E:${state.enemyHP}`);
    resolveImmediateResourceExhaustionWinner(state);
    resolveImmediateNoProgressWinner(state);
    if (state.winner) break;
    const playerDeckBeforeTurnDraw = [...state.player.deck];
    const enemyDeckBeforeTurnDraw = [...state.enemy.deck];
    drawCards(state.player, 1);
    drawCards(state.enemy, 1);
    resolveImmediateResourceExhaustionWinner(state);
    resolveImmediateNoProgressWinner(state);
    resolveTurnCapWinner(state, turns);
    recordDrawTelemetry(telemetry, state.player, playerDeckBeforeTurnDraw, cardGameTelemetry.player);
    recordDrawTelemetry(telemetry, state.enemy, enemyDeckBeforeTurnDraw, cardGameTelemetry.enemy);
    if (!state.winner) toggleFirstActor(state);
  }

  const result = {
    winner: state.winner ?? 'draw',
    turns,
    playerHP: state.playerHP,
    enemyHP: state.enemyHP,
    firstActor: initialFirstActor,
    endingReason: state.endingReason,
    turnCapResolvedBy: state.turnCapResolvedBy,
    noProgressResolvedBy: state.noProgressResolvedBy,
    heroDeathResolution: state.heroDeathResolution,
    log: gameLog,
    cardGameTelemetry,
  };
  result.winCondition = classifyWinCondition(result);
  gameLog?.push(`Final: winner=${result.winner}, condition=${result.winCondition}, turns=${turns}, final HP P:${result.playerHP} E:${result.enemyHP}`);
  return result;
}

function createOrderedStats(playerFaction, enemyFaction) {
  return {
    playerFaction, enemyFaction, games: 0, playerWins: 0, enemyWins: 0, draws: 0,
    totalTurns: 0, turnsList: [], shortest: Infinity, longest: 0, totalPlayerHP: 0, totalEnemyHP: 0,
    winConditions: {}, playerFirst: { games: 0, playerWins: 0 }, enemyFirst: { games: 0, playerWins: 0 }, samples: [],
  };
}

function addOrderedResult(stats, result, gameIndex, seed) {
  stats.games += 1;
  stats.totalTurns += result.turns;
  stats.turnsList.push(result.turns);
  stats.shortest = Math.min(stats.shortest, result.turns);
  stats.longest = Math.max(stats.longest, result.turns);
  stats.totalPlayerHP += result.playerHP;
  stats.totalEnemyHP += result.enemyHP;
  if (result.winner === 'player') stats.playerWins += 1;
  else if (result.winner === 'enemy') stats.enemyWins += 1;
  else stats.draws += 1;
  stats.winConditions[result.winCondition] = (stats.winConditions[result.winCondition] ?? 0) + 1;
  const split = result.firstActor === 'player' ? stats.playerFirst : stats.enemyFirst;
  split.games += 1;
  if (result.winner === 'player') split.playerWins += 1;
  if (result.log && stats.samples.length < SAMPLE_LOGS_PER_MATCHUP) {
    stats.samples.push({ gameIndex, seed, ...result });
  }
}

function createFactionStats() {
  return { games: 0, wins: 0, draws: 0, totalTurns: 0 };
}

function addFactionStats(stats, won, draw, turns) {
  stats.games += 1;
  if (won) stats.wins += 1;
  if (draw) stats.draws += 1;
  stats.totalTurns += turns;
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function pct(count, total) {
  return total > 0 ? (count / total) * 100 : 0;
}

function fmt(value, decimals = 1) {
  return Number(value).toFixed(decimals);
}

function signedFmt(value, decimals = 1) {
  return `${value >= 0 ? '+' : ''}${fmt(value, decimals)}`;
}

function cardImpactMetrics(row) {
  const wrWhenDrawn = pct(row.drawnWins, row.drawnGames);
  const wrWhenNotDrawn = pct(row.notDrawnWins, row.notDrawnGames);
  const wrWhenPlayed = pct(row.playedWins, row.playedGames);
  const wrWhenNotPlayed = pct(row.notPlayedWins, row.notPlayedGames);
  return {
    ...row,
    wrWhenDrawn,
    wrWhenNotDrawn,
    wrWhenPlayed,
    wrWhenNotPlayed,
    drawImpact: wrWhenDrawn - wrWhenNotDrawn,
    playImpact: wrWhenPlayed - wrWhenNotPlayed,
  };
}

function cardImpactLabel(value) {
  return `${signedFmt(value)} pp`;
}

function mostCommonWinCondition(row) {
  return Object.entries(row.winConditions).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? 'n/a';
}

function flagMatchup(row) {
  const wr = pct(row.playerWins, row.games);
  const flags = [];
  if (wr < 35 || wr > 65) flags.push('severe');
  else if (wr < 40 || wr > 60) flags.push('critical');
  const avgTurns = row.totalTurns / row.games;
  const drawRate = pct(row.draws, row.games);
  if (avgTurns < 4) flags.push('too fast');
  if (drawRate > 10 || avgTurns > 12) flags.push('too slow/stalling');
  return flags.length ? flags.join(', ') : 'ok';
}

function markdownTable(headers, rows) {
  const escape = (value) => String(value).replaceAll('|', '\\|');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${headers.map((header) => escape(row[header] ?? '')).join(' | ')} |`),
  ].join('\n');
}

function summarizeLog(sample) {
  const early = sample.log.filter((line) => line.includes('plays') || line.includes('redeploys') || line.includes('passes')).slice(0, 7);
  let why = `${sample.winner} won by ${sample.winCondition}`;
  if (sample.winCondition.includes('tiebreak')) why = `${sample.winCondition} resolved at P ${sample.playerHP} HP vs E ${sample.enemyHP} HP`;
  if (sample.winCondition === 'draw') why = `draw/stall finished at P ${sample.playerHP} HP vs E ${sample.enemyHP} HP`;
  return `- **${sample.playerFaction} vs ${sample.enemyFaction}, game ${sample.gameIndex}, seed ${sample.seed}:** ${why} in ${sample.turns} turns. Key sequence: ${early.join(' → ')}.`;
}

function buildCardImpactSections(cardImpactRows) {
  const rows = cardImpactRows
    .map(cardImpactMetrics)
    .sort((a, b) => a.faction.localeCompare(b.faction) || a.name.localeCompare(b.name));
  const detailLines = rows.map((row) => [
    `### ${row.name}`,
    '',
    `Drawn: ${row.drawnGames} games, ${row.drawnWins} wins, ${row.drawnLosses} losses, WR When Drawn ${fmt(row.wrWhenDrawn)}%`,
    `Not Drawn: ${row.notDrawnGames} games, ${row.notDrawnWins} wins, ${row.notDrawnLosses} losses, WR When Not Drawn ${fmt(row.wrWhenNotDrawn)}%`,
    `Played: ${row.playedGames} games, ${row.playedWins} wins, ${row.playedLosses} losses, WR When Played ${fmt(row.wrWhenPlayed)}%`,
    `Not Played: ${row.notPlayedGames} games, ${row.notPlayedWins} wins, ${row.notPlayedLosses} losses, WR When Not Played ${fmt(row.wrWhenNotPlayed)}%`,
    `Draw Impact: ${cardImpactLabel(row.drawImpact)}`,
    `Play Impact: ${cardImpactLabel(row.playImpact)}`,
  ].join('\n')).join('\n\n');

  const compactRows = [...rows]
    .sort((a, b) => Math.max(Math.abs(b.drawImpact), Math.abs(b.playImpact)) - Math.max(Math.abs(a.drawImpact), Math.abs(a.playImpact)))
    .map((row) => ({
      Card: `${row.name} (${row.faction})`,
      'Draw Impact': cardImpactLabel(row.drawImpact),
      'Play Impact': cardImpactLabel(row.playImpact),
      'WR Drawn': `${fmt(row.wrWhenDrawn)}%`,
      'WR Played': `${fmt(row.wrWhenPlayed)}%`,
    }));
  const rankingLine = (row) => `- ${row.name} (${row.faction}): Draw Impact ${signedFmt(row.drawImpact)}, Play Impact ${signedFmt(row.playImpact)}`;
  return {
    detailLines,
    compactTable: markdownTable(Object.keys(compactRows[0]), compactRows),
    topDraw: [...rows].sort((a, b) => b.drawImpact - a.drawImpact).slice(0, 10).map(rankingLine).join('\n'),
    worstDraw: [...rows].sort((a, b) => a.drawImpact - b.drawImpact).slice(0, 10).map(rankingLine).join('\n'),
    topPlay: [...rows].sort((a, b) => b.playImpact - a.playImpact).slice(0, 10).map(rankingLine).join('\n'),
    worstPlay: [...rows].sort((a, b) => a.playImpact - b.playImpact).slice(0, 10).map(rankingLine).join('\n'),
    harmful: [...rows]
      .sort((a, b) => (a.drawImpact + a.playImpact) - (b.drawImpact + b.playImpact))
      .slice(0, 6)
      .map((row) => `${row.name}\nDraw Impact ${signedFmt(row.drawImpact)}\nPlay Impact ${signedFmt(row.playImpact)}`)
      .join('\n\n'),
    helpful: [...rows]
      .sort((a, b) => (b.drawImpact + b.playImpact) - (a.drawImpact + a.playImpact))
      .slice(0, 6)
      .map((row) => `${row.name}\nDraw Impact ${signedFmt(row.drawImpact)}\nPlay Impact ${signedFmt(row.playImpact)}`)
      .join('\n\n'),
  };
}

function buildReport({ baseSeed, matchCount, factionKeys, orderedRows, factionStats, telemetry, representativeLogs }) {
  const matchupRows = orderedRows.map((row) => ({
    'Player faction': row.playerFaction,
    'Enemy faction': row.enemyFaction,
    'Player win %': `${fmt(pct(row.playerWins, row.games))}%`,
    'Enemy win %': `${fmt(pct(row.enemyWins, row.games))}%`,
    'Draw %': `${fmt(pct(row.draws, row.games))}%`,
    'Avg turns': fmt(row.totalTurns / row.games, 2),
    'Median turns': fmt(median(row.turnsList), 1),
    'Shortest': row.shortest,
    'Longest': row.longest,
    'Avg final player HP': fmt(row.totalPlayerHP / row.games, 2),
    'Avg final enemy HP': fmt(row.totalEnemyHP / row.games, 2),
    'Most common win condition': mostCommonWinCondition(row),
    'Player-first P win %': `${fmt(pct(row.playerFirst.playerWins, row.playerFirst.games))}%`,
    'Enemy-first P win %': `${fmt(pct(row.enemyFirst.playerWins, row.enemyFirst.games))}%`,
    'Flags': flagMatchup(row),
  }));

  const rankingRows = factionKeys.map((faction) => {
    const row = factionStats.get(faction);
    return {
      Faction: faction,
      'Overall win %': `${fmt(pct(row.wins, row.games))}%`,
      'Average turns': fmt(row.totalTurns / row.games, 2),
      'Draw rate': `${fmt(pct(row.draws, row.games))}%`,
      Games: row.games,
    };
  }).sort((a, b) => Number.parseFloat(b['Overall win %']) - Number.parseFloat(a['Overall win %']));

  const flagged = matchupRows.filter((row) => row.Flags !== 'ok');
  const severeCount = flagged.filter((row) => row.Flags.includes('severe')).length;
  const criticalCount = flagged.filter((row) => row.Flags.includes('critical')).length;
  const stallingCount = flagged.filter((row) => row.Flags.includes('too slow/stalling')).length;
  const fastest = [...orderedRows].sort((a, b) => (a.totalTurns / a.games) - (b.totalTurns / b.games))[0];
  const slowest = [...orderedRows].sort((a, b) => (b.totalTurns / b.games) - (a.totalTurns / a.games))[0];
  const cardRows = Object.entries(telemetry.cardUses)
    .map(([id, data]) => ({ Card: `${data.name} (${id})`, Uses: data.uses }))
    .sort((a, b) => b.Uses - a.Uses)
    .slice(0, 18);

  const underperformers = rankingRows.filter((row) => Number.parseFloat(row['Overall win %']) < 40).map((row) => row.Faction);
  const overperformers = rankingRows.filter((row) => Number.parseFloat(row['Overall win %']) > 60).map((row) => row.Faction);
  const cardImpactSections = buildCardImpactSections(Object.values(telemetry.cardImpact));

  return `# MVP Balance Simulation Report\n\n` +
`Generated from the implemented battle system on ${new Date().toISOString().slice(0, 10)}. No gameplay behavior was changed by this report.\n\n` +
`## 1. Executive summary\n\n` +
`- **Simulation size:** ${matchCount} games per ordered matchup, ${orderedRows.length} ordered matchups, ${matchCount * orderedRows.length} total games.\n` +
`- **Rules parity:** seeded shuffled decks, current random first-actor initialization, current opening mulligan evaluator, current AI scorer, current combat/no-progress/turn-cap resolution. Base seed: ${baseSeed}.\n` +
`- **Flagged matchup count:** ${flagged.length} total (${severeCount} severe, ${criticalCount} critical-only, ${stallingCount} slow/stalling flags).\n` +
`- **Fastest average matchup:** ${fastest.playerFaction} vs ${fastest.enemyFaction} at ${fmt(fastest.totalTurns / fastest.games, 2)} turns.\n` +
`- **Slowest average matchup:** ${slowest.playerFaction} vs ${slowest.enemyFaction} at ${fmt(slowest.totalTurns / slowest.games, 2)} turns.\n` +
`- **Aggregate overperformers:** ${overperformers.length ? overperformers.join(', ') : 'none above 60% overall win rate'}.\n` +
`- **Aggregate underperformers:** ${underperformers.length ? underperformers.join(', ') : 'none below 40% overall win rate'}.\n\n` +
`## 2. Matchup table\n\n${markdownTable(Object.keys(matchupRows[0]), matchupRows)}\n\n` +
`## 3. Faction strength ranking\n\n${markdownTable(Object.keys(rankingRows[0]), rankingRows)}\n\n` +
`### Matchups outside acceptable range\n\n${flagged.length ? markdownTable(Object.keys(flagged[0]), flagged) : 'No matchups were outside the requested thresholds.'}\n\n` +
`## 4. Problem cards suspected from game logs\n\n` +
`These are suspicions from action frequency and representative logs, not implemented balance changes.\n\n` +
`${markdownTable(Object.keys(cardRows[0]), cardRows)}\n\n` +
`- High-frequency proactive units/effects in severe matchups should be reviewed first, especially cards that repeatedly created open-lane damage or resilient board stalls.\n` +
`- Stalling flags should focus review on defensive HP/armor, zero-attack units, revive/summon effects, and no-progress tiebreak patterns before changing global rules.\n\n` +
`## Card Draw / Play Impact\n\n${cardImpactSections.compactTable}\n\n` +
`### Top 10 Draw Impact\n\n${cardImpactSections.topDraw}\n\n` +
`### Worst 10 Draw Impact\n\n${cardImpactSections.worstDraw}\n\n` +
`### Top 10 Play Impact\n\n${cardImpactSections.topPlay}\n\n` +
`### Worst 10 Play Impact\n\n${cardImpactSections.worstPlay}\n\n` +
`### Card impact details\n\n${cardImpactSections.detailLines}\n\n` +
`### Paste into ChatGPT: Card Impact\n\n\`\`\`text\nMost Harmful Cards\n\n${cardImpactSections.harmful}\n\nMost Helpful Cards\n\n${cardImpactSections.helpful}\n\`\`\`\n\n` +
`### Representative extreme-game log summaries\n\n${representativeLogs.map(summarizeLog).join('\n')}\n\n` +
`## 5. Recommended balance changes (not implemented)\n\n` +
`1. Prioritize severe ordered matchups first; do not tune around mirrors until asymmetric seats are within the 40–60% critical band.\n` +
`2. For overperforming fast decks, reduce the most repeated open-lane damage/buff payoff by one point or add a stricter setup condition.\n` +
`3. For underperforming decks, improve early-unit quality or mulligan-safe low-cost units before buffing late/stall tools.\n` +
`4. For slow/stalling decks, reduce repeatable defensive friction, revive, or summon loops rather than raising the turn cap.\n` +
`5. Re-run this exact report after each balance patch and compare matchup deltas before stacking additional changes.\n`;
}

function main() {
  const countArg = process.argv.find((arg) => arg.startsWith('--games='));
  const seedArg = process.argv.find((arg) => arg.startsWith('--seed='));
  const matchCount = Number.parseInt(countArg?.split('=')[1] ?? `${DEFAULT_MATCH_COUNT}`, 10);
  const baseSeed = Number.parseInt(seedArg?.split('=')[1] ?? `${DEFAULT_BASE_SEED}`, 10) >>> 0;

  const factions = loadFactions();
  const factionKeys = Object.keys(factions);
  const orderedStats = new Map();
  const factionStats = new Map(factionKeys.map((key) => [key, createFactionStats()]));
  const passStats = { pass: 0, cancelled: 0 };
  const telemetry = { replaceUsed: 0, repositionUsed: 0, meaningfulGameplayActions: 0, pointlessGameplayActions: 0, invalidActions: 0, cardUses: {}, cardImpact: {}, mulliganByFaction: {} };

  for (const playerKey of factionKeys) {
    for (const enemyKey of factionKeys) {
      const row = createOrderedStats(playerKey, enemyKey);
      orderedStats.set(`${playerKey}|${enemyKey}`, row);
      for (let i = 0; i < matchCount; i += 1) {
        const seed = buildGameSeed(baseSeed, playerKey, enemyKey, i);
        const captureLog = i < SAMPLE_LOGS_PER_MATCHUP;
        const result = runSingleGame(factions[playerKey], factions[enemyKey], passStats, telemetry, seed, i, playerKey, enemyKey, captureLog);
        recordCardOutcomeTelemetryForSide(telemetry, result.cardGameTelemetry?.player, result.winner, 'player');
        recordCardOutcomeTelemetryForSide(telemetry, result.cardGameTelemetry?.enemy, result.winner, 'enemy');
        addOrderedResult(row, result, i, seed);
        const draw = result.winner === 'draw';
        addFactionStats(factionStats.get(playerKey), result.winner === 'player', draw, result.turns);
        addFactionStats(factionStats.get(enemyKey), result.winner === 'enemy', draw, result.turns);
      }
    }
  }

  const orderedRows = [...orderedStats.values()];
  const extremeRows = orderedRows
    .filter((row) => flagMatchup(row) !== 'ok')
    .sort((a, b) => Math.abs(pct(b.playerWins, b.games) - 50) - Math.abs(pct(a.playerWins, a.games) - 50));
  const representativeLogs = [];
  for (const row of extremeRows) {
    for (const sample of row.samples.slice(0, 3)) {
      representativeLogs.push({ ...sample, playerFaction: row.playerFaction, enemyFaction: row.enemyFaction });
      if (representativeLogs.length >= REPRESENTATIVE_LOG_LIMIT) break;
    }
    if (representativeLogs.length >= REPRESENTATIVE_LOG_LIMIT) break;
  }

  const report = buildReport({ baseSeed, matchCount, factionKeys, orderedRows, factionStats, telemetry, representativeLogs });
  const outputPath = path.resolve(repoRoot, REPORT_PATH);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, report, 'utf8');
  console.log(`Wrote ${REPORT_PATH}`);
  console.log(`Simulated ${matchCount * orderedRows.length} games (${matchCount} per ordered matchup).`);
  console.log(`Representative logs included: ${representativeLogs.length}`);
}

main();
