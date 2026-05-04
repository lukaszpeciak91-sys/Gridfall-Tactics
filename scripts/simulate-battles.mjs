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
} from '../src/systems/GameState.js';
import { chooseBattleAction } from '../src/systems/enemyDecision.js';

const DEFAULT_MATCH_COUNT = 100;
const MAX_TURNS = 50;

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

function applyAction(state, owner, passStats) {
  const action = chooseBattleAction(state, owner);
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
    resolveTargetedEffectCard(state, owner, action.cardId, action.targetIndex, [action.targetIndex]);
    state.cancelEnemyOrderThisTurn[cancelKey] = false;
  }
}

function runSingleGame(playerFaction, enemyFaction, passStats) {
  const state = createInitialBattleState(playerFaction, enemyFaction);
  drawCards(state.player, 4);
  drawCards(state.enemy, 4);
  let turns = 0;
  while (!state.winner && turns < MAX_TURNS) {
    applyAction(state, 'player', passStats);
    applyAction(state, 'enemy', passStats);
    resolveCombat(state);
    drawCards(state.player, 1);
    drawCards(state.enemy, 1);
    turns += 1;
  }
  return { winner: state.winner ?? 'draw', turns, playerHP: state.playerHP, enemyHP: state.enemyHP };
}

const percent = (count, total) => ((count / total) * 100).toFixed(1);
const avg = (value, count) => (count > 0 ? (value / count).toFixed(2) : '0.00');

function main() {
  const parsedCount = Number.parseInt(process.argv[2] ?? `${DEFAULT_MATCH_COUNT}`, 10);
  const matchCount = Number.isInteger(parsedCount) && parsedCount > 0 ? parsedCount : DEFAULT_MATCH_COUNT;
  const factions = loadFactions();
  const factionKeys = Object.keys(factions);
  const aggregate = new Map(factionKeys.map((key) => [key, { wins: 0, games: 0, draws: 0 }]));
  const matchupRows = [];
  const passStats = { pass: 0, cancelled: 0 };

  for (const playerKey of factionKeys) for (const enemyKey of factionKeys) {
    let playerWins = 0; let enemyWins = 0; let draws = 0; let totalTurns = 0; let totalPlayerHP = 0; let totalEnemyHP = 0;
    for (let i = 0; i < matchCount; i += 1) {
      const result = runSingleGame(factions[playerKey], factions[enemyKey], passStats);
      totalTurns += result.turns; totalPlayerHP += result.playerHP; totalEnemyHP += result.enemyHP;
      if (result.winner === 'player') playerWins += 1; else if (result.winner === 'enemy') enemyWins += 1; else draws += 1;
    }
    aggregate.get(playerKey).wins += playerWins; aggregate.get(playerKey).games += matchCount; aggregate.get(playerKey).draws += draws;
    aggregate.get(enemyKey).wins += enemyWins; aggregate.get(enemyKey).games += matchCount; aggregate.get(enemyKey).draws += draws;
    matchupRows.push({ matchup: `${playerKey} vs ${enemyKey}`, games: matchCount, 'player win %': percent(playerWins, matchCount), 'enemy win %': percent(enemyWins, matchCount), 'draw %': percent(draws, matchCount), 'avg turns': avg(totalTurns, matchCount), 'avg remaining HP': `${avg(totalPlayerHP, matchCount)} / ${avg(totalEnemyHP, matchCount)}` });
  }

  console.log(`\nBattle simulation complete (${matchCount} games per matchup, max ${MAX_TURNS} turns).`);
  console.table(matchupRows);
  console.log('\nAggregate faction win rate:');
  console.table(factionKeys.map((key) => ({ faction: key, games: aggregate.get(key).games, 'win %': percent(aggregate.get(key).wins, aggregate.get(key).games), 'draw %': percent(aggregate.get(key).draws, aggregate.get(key).games) })));
  console.log('\nPASS reason counts:');
  console.table(Object.entries(passStats).map(([reason, count]) => ({ reason, count })));
  console.log('\nSimulation parity notes: starting hand = 4, shared AI logic = chooseBattleAction (live + simulation), draw per turn = 1 for both sides.');
}
main();
