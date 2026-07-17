import { writeFileSync, mkdirSync } from 'node:fs';
import { getFactionByKey, getFactionKeys } from '../src/data/factions/index.js';
import { traceFirstAiDecisionAfterMulligan } from '../src/systems/aiOpeningDiagnostics.js';

const outDir = 'artifacts/ai-opening-diagnostics';
mkdirSync(outDir, { recursive: true });
const seedsPerFaction = 20;
const rows = [];
const traces = [];
for (const key of getFactionKeys()) {
  const faction = getFactionByKey(key);
  const opponent = getFactionByKey('Tank');
  for (const seat of ['enemy', 'player']) {
    for (let i = 1; i <= seedsPerFaction; i += 1) {
      const playerFaction = seat === 'player' ? faction : opponent;
      const enemyFaction = seat === 'enemy' ? faction : opponent;
      const firstActor = i % 2 === 0 ? seat : (seat === 'enemy' ? 'player' : 'enemy');
      const trace = traceFirstAiDecisionAfterMulligan({ playerFaction, enemyFaction, aiOwner: seat, firstActor, seed: 1000 + i });
      traces.push(trace);
      rows.push({ faction: key, seat, firstActor, seed: trace.seed, selected: trace.selectedAction, selectedCandidateGenerationOrder: trace.selectedCandidateGenerationOrder, tied: trace.candidates.some((c) => c.tiedWithAnotherCandidate) });
    }
  }
}
const summary = {};
for (const row of rows) {
  const key = `${row.faction}|${row.seat}|${row.firstActor === row.seat ? 'acts-first' : 'acts-second'}`;
  summary[key] ??= { total: 0, unitPlacements: 0, slot0: 0, middle: 0, oppositeEdge: 0, ties: 0, firstGeneratedTieWins: 0, cardsSlot0: {} };
  const bucket = summary[key];
  bucket.total += 1;
  if (row.selected?.type === 'play-unit') {
    bucket.unitPlacements += 1;
    if (row.selected.slotIndex === 0 || row.selected.slotIndex === 6) {
      bucket.slot0 += 1;
      bucket.cardsSlot0[row.selected.cardId] = (bucket.cardsSlot0[row.selected.cardId] ?? 0) + 1;
    }
    if (row.selected.slotIndex === 1 || row.selected.slotIndex === 7) bucket.middle += 1;
    if (row.selected.slotIndex === 2 || row.selected.slotIndex === 8) bucket.oppositeEdge += 1;
  }
  if (row.tied) bucket.ties += 1;
  if (row.tied && row.selectedCandidateGenerationOrder === 0) bucket.firstGeneratedTieWins += 1;
}
const swarmAlpha = traces.filter((t) => t.faction === 'Swarm').map((t) => ({ seed: t.seed, seat: t.seat, inFinalHand: t.finalHand.some((c) => c.id === 'swarm_alpha_1'), selected: t.selectedAction, alphaCandidates: t.candidates.filter((c) => c.cardId === 'swarm_alpha_1') }));
writeFileSync(`${outDir}/opening-placement-sample.json`, JSON.stringify({ summary, swarmAlpha, representativeTraces: traces.slice(0, 12) }, null, 2));
console.log(JSON.stringify(summary, null, 2));
