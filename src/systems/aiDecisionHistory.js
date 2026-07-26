export const AI_DECISION_HISTORY_LIMIT = 10;
export const AI_DECISION_CANDIDATE_LIMIT = 3;
export const AI_DECISION_COMPONENT_LIMIT = 5;

const finite = (value) => Number.isFinite(value) ? value : undefined;
const string = (value) => typeof value === 'string' && value ? value : undefined;
const indexes = (action) => {
  const values = Array.isArray(action?.targetIndexes) ? action.targetIndexes :
    (Number.isInteger(action?.targetIndex) ? [action.targetIndex] : []);
  return values.filter(Number.isInteger).slice(0, 6);
};

function compactAction(action, score, reason) {
  const result = {
    type: string(action?.type) ?? 'pass', cardId: string(action?.cardId),
    effectId: string(action?.effectId), slotIndex: finite(action?.slotIndex),
    targetIndexes: indexes(action), score: finite(score), reason: string(reason),
  };
  if (!result.targetIndexes.length) delete result.targetIndexes;
  return Object.fromEntries(Object.entries(result).filter(([, value]) => value !== undefined && value !== null));
}

function componentsFor(action) {
  const raw = action?.aiEvaluation?.scoreDiagnostics?.components ?? action?.aiEvaluation?.scoreComponents ?? {};
  return Object.fromEntries(Object.entries(raw)
    .filter(([, value]) => Number.isFinite(value) && value !== 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, AI_DECISION_COMPONENT_LIMIT));
}

export function createAiScoringSnapshot(scoredActions, selectedAction, selectedScore) {
  const finiteCandidates = (scoredActions ?? []).filter((entry) => Number.isFinite(entry?.score));
  const winnerScore = finite(selectedScore) ?? finiteCandidates.find((entry) => entry.action === selectedAction)?.score;
  return finiteCandidates.sort((a, b) => b.score - a.score).slice(0, AI_DECISION_CANDIDATE_LIMIT).map(({ action, score }) => {
    const candidate = compactAction(action, score);
    candidate.scoreDeltaFromWinner = Number.isFinite(winnerScore) ? score - winnerScore : 0;
    const components = componentsFor(action);
    if (Object.keys(components).length) candidate.components = components;
    return candidate;
  });
}

function compactPolicy(action) {
  const threat = action?.aiEvaluation?.immediateAttackThreatPolicy;
  const swarm = action?.aiEvaluation?.swarmProfile;
  return {
    immediateThreatPolicy: threat ? {
      opportunity: Boolean(threat.opportunityDetected), possibleLethal: Boolean(threat.possibleLethal),
      baseWinnerType: string(threat.baseWinnerAction?.type), protectiveCandidateType: string(threat.protectiveCandidateAction?.type),
      baseScoreDelta: finite(threat.baseScoreDelta), selectedWindow: finite(threat.selectedWindow),
      changedDecision: Boolean(threat.decisionChanged), bypassReason: string(threat.bypassReason),
    } : undefined,
    swarmProfile: swarm ? {
      opportunity: Boolean(swarm.opportunityDetected), shortlistSize: finite(swarm.shortlistSize) ?? 0,
      baseScoreDelta: finite(swarm.baseScoreDelta) ?? 0, changedDecision: Boolean(swarm.decisionChanged), reason: string(swarm.reason),
    } : undefined,
  };
}

function compactPrediction(action) {
  const raw = action?.aiEvaluation?.combatPrediction ?? action?.aiEvaluation?.canonicalCombatPrediction;
  if (!raw) return undefined;
  const side = (value = {}) => ({
    predictedDeaths: (value.predictedDeaths ?? []).filter(Number.isInteger).slice(0, 6),
    baseDamageToAi: finite(value.baseDamageToAi) ?? 0,
    baseDamageToOpponent: finite(value.baseDamageToOpponent) ?? 0,
  });
  const result = { used: true, before: side(raw.before), after: side(raw.after) };
  return result;
}

export function resetAiDecisionHistory(scene) {
  scene.recentAiDecisions = [];
  scene.aiDecisionsDropped = 0;
  scene.aiDecisionOrdinal = 0;
  scene.activeAiDecisionOrdinal = null;
}

export function recordAiDecision(scene, action, state, owner = 'enemy') {
  scene.recentAiDecisions ??= [];
  const ordinal = (scene.aiDecisionOrdinal ?? 0) + 1;
  scene.aiDecisionOrdinal = ordinal;
  const opponent = owner === 'enemy' ? 'player' : 'enemy';
  const score = finite(action?.__aiDecisionScoring?.selectedScore) ?? finite(action?.aiEvaluation?.scoreDiagnostics?.totalScore) ?? finite(action?.score);
  const policy = compactPolicy(action);
  const reason = action?.type === 'pass' ? (action?.reason === 'ai-safe-surrender' ? 'safe-surrender' : 'pass-hold')
    : policy.immediateThreatPolicy?.changedDecision ? 'immediate-threat-policy'
      : policy.swarmProfile?.changedDecision ? 'swarm-profile'
        : action?.aiEvaluation?.tieBreak ? 'seeded-tie-break' : 'highest-base-score';
  const record = {
    ordinal, t: scene.getBattleReportElapsedMs?.() ?? 0,
    opportunityId: string(state?.actionOpportunityId) ?? (Number.isFinite(state?.turn) ? `${state.turn}:${owner}` : undefined),
    actingFaction: string(state?.[owner]?.factionKey ?? state?.[owner]?.factionId),
    opponentFaction: string(state?.[opponent]?.factionKey ?? state?.[opponent]?.factionId),
    aiBaseHp: finite(state?.[owner === 'enemy' ? 'enemyHP' : 'playerHP']),
    opponentBaseHp: finite(state?.[owner === 'enemy' ? 'playerHP' : 'enemyHP']),
    selectedAction: compactAction(action, score, reason), selectedScore: score,
    selectionChangedBy: { immediateThreatPolicy: Boolean(policy.immediateThreatPolicy?.changedDecision), swarmProfile: Boolean(policy.swarmProfile?.changedDecision), seededTieBreak: Boolean(action?.aiEvaluation?.tieBreak) },
    topCandidates: action?.__aiDecisionScoring?.topCandidates ?? [], rejectedCandidates: action?.__aiDecisionScoring?.rejectedCandidates ?? { illegal: 0, utilityThreshold: 0, zeroImpact: 0, meaningless: 0 },
    ...policy, combatPrediction: compactPrediction(action), resolved: false,
  };
  for (const key of Object.keys(record)) if (record[key] === undefined) delete record[key];
  scene.recentAiDecisions.push(record);
  while (scene.recentAiDecisions.length > AI_DECISION_HISTORY_LIMIT) { scene.recentAiDecisions.shift(); scene.aiDecisionsDropped = (scene.aiDecisionsDropped ?? 0) + 1; }
  scene.activeAiDecisionOrdinal = ordinal;
  return record;
}

export function resolveAiDecision(scene, result, state, action) {
  const record = scene.recentAiDecisions?.find((item) => item.ordinal === scene.activeAiDecisionOrdinal);
  if (!record) return null;
  Object.assign(record, {
    resolved: true, ok: Boolean(result?.ok), resultType: string(result?.type) ?? string(action?.type),
    impact: string(result?.impact ?? result?.reason), resultingBoardUnitCount: (state?.board ?? []).filter(Boolean).length,
    resultingAiHandCount: state?.enemy?.hand?.length ?? 0, resultingAiDeckCount: state?.enemy?.deck?.length ?? 0,
  });
  if (action?.type === 'pass') record.pass = {
    pendingPassOwner: string(state?.battleExhausted?.pendingPassOwner), fullPassRounds: finite(state?.battleExhausted?.fullPassRounds) ?? 0,
    battleExhaustedAdvanced: Boolean(state?.battleExhaustedResolvedBy || state?.winner),
  };
  if (record.impact === undefined) delete record.impact;
  scene.activeAiDecisionOrdinal = null;
  return record;
}
