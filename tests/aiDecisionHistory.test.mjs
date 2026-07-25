import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_DECISION_HISTORY_LIMIT, createAiScoringSnapshot, recordAiDecision,
  resetAiDecisionHistory, resolveAiDecision,
} from '../src/systems/aiDecisionHistory.js';
import { buildBattleReportSnapshot } from '../src/systems/battleReport.js';

const state = () => ({ turn: 3, enemyHP: 8, playerHP: 7, board: Array(9).fill(null),
  enemy: { factionKey: 'aggro', hand: [{ id: 'hidden' }], deck: [{ id: 'secret' }] },
  player: { factionKey: 'control', hand: [], deck: [] }, battleExhausted: { fullPassRounds: 0 } });
const scene = () => ({ battleReportStartedAt: Date.now(), getBattleReportElapsedMs: () => 12, getBattleReportEventLimit: () => 32,
  battleReportEvents: [], gameState: state(), scene: {}, recentAiDecisions: [] });

test('AI history is reset, bounded to ten, and reports dropped coverage', () => {
  const s = scene(); resetAiDecisionHistory(s);
  for (let i = 0; i < 11; i += 1) recordAiDecision(s, { type: 'pass', score: i }, s.gameState);
  assert.equal(AI_DECISION_HISTORY_LIMIT, 10);
  assert.deepEqual(s.recentAiDecisions.map((item) => item.ordinal), [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.equal(s.aiDecisionsDropped, 1);
  const report = buildBattleReportSnapshot(s);
  assert.deepEqual(report.aiDecisionHistoryCoverage, { bufferLimit: 10, decisionsIncluded: 10, decisionsDropped: 1, firstIncludedOrdinal: 2, lastIncludedOrdinal: 11, historyTruncated: true });
  resetAiDecisionHistory(s);
  assert.deepEqual(s.recentAiDecisions, []);
  assert.equal(s.aiDecisionsDropped, 0);
});

test('candidate summaries keep top three scores and five non-zero components without private objects', () => {
  const candidates = Array.from({ length: 5 }, (_, i) => {
    const action = { type: 'play-unit', cardId: `c${i}`, slotIndex: i, aiEvaluation: {} };
    action.aiEvaluation.scoreDiagnostics = { components: { a: 1, b: -7, c: 6, d: 5, e: 4, f: 3, zero: 0 }, privateState: { hand: ['secret'] } };
    return { action, score: 100 - i };
  });
  const summary = createAiScoringSnapshot(candidates, candidates[0].action, 100);
  assert.equal(summary.length, 3);
  assert.equal(Object.keys(summary[0].components).length, 5);
  assert.deepEqual(summary.map((item) => item.score), [100, 99, 98]);
  assert.equal(JSON.stringify(summary).includes('privateState'), false);
  assert.equal(JSON.stringify(summary).includes('zero'), false);
  assert.equal('effectId' in summary[0], false);
});

test('Sniper prediction and compact policies survive resolution on the original record', () => {
  const s = scene(); resetAiDecisionHistory(s);
  const action = { type: 'play-unit', cardId: 'aggro_raider', slotIndex: 0, aiEvaluation: {
    immediateAttackThreatPolicy: { opportunityDetected: true, possibleLethal: false, baseWinnerAction: { type: 'play-unit' }, protectiveCandidateAction: { type: 'play-effect' }, baseScoreDelta: 12, selectedWindow: 40, decisionChanged: false, bypassReason: 'outside-policy-window', enormousTelemetry: ['omitted'] },
    swarmProfile: { opportunityDetected: true, shortlistSize: 3, baseScoreDelta: 4, decisionChanged: false, reason: 'base-winner-already-preferred', candidates: ['omitted'] },
    canonicalCombatPrediction: { before: { predictedDeaths: [], baseDamageToAi: 0, baseDamageToOpponent: 2, sniperTargetIndex: 0 }, after: { predictedDeaths: [0], baseDamageToAi: 0, baseDamageToOpponent: 2, sniperTargetIndex: 0 }, sniperSourceIndex: 6, sniperTargetIndex: 0, sniperTargetCardId: 'aggro_raider', sniperPlannedDamage: 3 },
  }};
  const record = recordAiDecision(s, action, s.gameState);
  resolveAiDecision(s, { ok: true, type: 'played', impact: 'accepted-sniper-trade' }, s.gameState, action);
  assert.equal(s.recentAiDecisions.length, 1);
  assert.equal(record.resolved, true);
  assert.deepEqual(record.combatPrediction.after.predictedDeaths, [0]);
  assert.equal(record.combatPrediction.sniperTargetCardId, 'aggro_raider');
  assert.deepEqual(Object.keys(record.immediateThreatPolicy), ['opportunity', 'possibleLethal', 'baseWinnerType', 'protectiveCandidateType', 'baseScoreDelta', 'selectedWindow', 'changedDecision', 'bypassReason']);
  assert.equal('candidates' in record.swarmProfile, false);
});

test('PASS resolution captures tracker state and report remains compact and secret-free', () => {
  const s = scene(); resetAiDecisionHistory(s);
  const record = recordAiDecision(s, { type: 'pass', reason: 'hold-card-action' }, s.gameState);
  s.gameState.battleExhausted = { pendingPassOwner: 'enemy', fullPassRounds: 1 };
  resolveAiDecision(s, { ok: true, type: 'pass' }, s.gameState, { type: 'pass' });
  assert.deepEqual(record.pass, { pendingPassOwner: 'enemy', fullPassRounds: 1, battleExhaustedAdvanced: false });
  const json = JSON.stringify(buildBattleReportSnapshot(s));
  assert.ok(Buffer.byteLength(json) < 250 * 1024);
  assert.equal(json.includes('secret'), false);
  assert.equal(json.includes('hidden'), false);
});

test('general event coverage describes truncation', () => {
  const s = scene(); s.battleReportEventsDropped = 4;
  s.battleReportEvents = [{ t: 10, name: 'player-action', details: { turn: 2 } }, { t: 25, name: 'ai-action-selected', details: { turn: 3 } }, { t: 40, name: 'combat-resolved', details: { turn: 3 } }];
  const coverage = buildBattleReportSnapshot(s).eventHistoryCoverage;
  assert.equal(coverage.eventsDropped, 4); assert.equal(coverage.coveredDurationMs, 30);
  assert.equal(coverage.playerActionsIncluded, 1); assert.equal(coverage.aiActionsIncluded, 1); assert.equal(coverage.combatsIncluded, 1);
  assert.equal(coverage.earliestIncludedTurn, 2); assert.equal(coverage.latestIncludedTurn, 3); assert.equal(coverage.historyTruncated, true);
});
