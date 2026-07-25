import { getFactionByKey } from '../data/factions/index.js';
import { playEffectCard, playOrRedeployUnit, performSwap, resolveCombat, resolveTargetedEffectCard, resolveTargetedUnitOnPlayEffect, getEffectiveBoardAttack } from './GameState.js';

export const IMMEDIATE_ATTACK_POLICY_MODES = Object.freeze({
  off: Object.freeze({ enabled: false, mode: 'off', standardWindow: 0, possibleLethalWindow: 0 }),
  'standard-80-lethal-1200': Object.freeze({ enabled: true, mode: 'standard-80-lethal-1200', standardWindow: 80, possibleLethalWindow: 1200 }),
  'standard-80-lethal-1600': Object.freeze({ enabled: true, mode: 'standard-80-lethal-1600', standardWindow: 80, possibleLethalWindow: 1600 }),
});
export const DEFAULT_IMMEDIATE_ATTACK_POLICY = IMMEDIATE_ATTACK_POLICY_MODES['standard-80-lethal-1200'];
export const IMMEDIATE_ATTACK_MATERIAL_DAMAGE = 2;

const QUALIFYING_EFFECTS = new Set(['quick_strike', 'swap_adjacent_then_resolve']);
const clone = (value) => JSON.parse(JSON.stringify(value));
const other = (owner) => owner === 'enemy' ? 'player' : 'enemy';
const hpKey = (owner) => owner === 'enemy' ? 'enemyHP' : 'playerHP';
const rows = (owner) => owner === 'enemy' ? [0, 1, 2] : [6, 7, 8];

export function resolveImmediateAttackPolicyConfig(value = undefined) {
  if (typeof value === 'string') return IMMEDIATE_ATTACK_POLICY_MODES[value] ?? DEFAULT_IMMEDIATE_ATTACK_POLICY;
  if (value && typeof value === 'object') return Object.freeze({
    enabled: value.enabled !== false,
    mode: value.mode ?? 'custom',
    standardWindow: Math.max(0, Number(value.standardWindow) || 0),
    possibleLethalWindow: Math.max(0, Number(value.possibleLethalWindow) || 0),
  });
  return DEFAULT_IMMEDIATE_ATTACK_POLICY;
}

function factionDefinition(side) {
  return getFactionByKey(side?.factionName) ?? getFactionByKey(side?.factionId) ?? null;
}

/** Deliberately contains no hand or live deck. */
export function createPublicThreatContext(state, aiOwner) {
  const opponentOwner = other(aiOwner);
  const opponent = state?.[opponentOwner];
  const faction = factionDefinition(opponent);
  return Object.freeze({
    aiOwner,
    opponentOwner,
    opponentFaction: opponent?.factionName ?? 'Unknown',
    aiBaseHP: state?.[hpKey(aiOwner)] ?? 0,
    board: clone(state?.board ?? []),
    publicDiscard: clone(opponent?.discard ?? []),
    printedCards: clone(faction?.deck ?? []),
    opponentActsBeforeCombat: state?.firstActor === aiOwner,
    battleActive: !state?.winner,
  });
}

function publicCapabilities(context) {
  return context.printedCards.filter((card) => QUALIFYING_EFFECTS.has(card.effectId)).map((card) => {
    const printed = context.printedCards.filter((entry) => entry.id === card.id).length;
    const discarded = context.publicDiscard.filter((entry) => entry.id === card.id).length;
    return { card, availability: discarded >= printed ? 'exhausted' : 'possible' };
  });
}

function sanitizePublicSimulation(state, context) {
  const simulation = clone(state);
  simulation[context.opponentOwner].hand = [];
  simulation[context.opponentOwner].deck = [];
  return simulation;
}

function immediateActions(context, state, threatIndex, capability) {
  const owner = context.opponentOwner;
  const card = capability.card;
  if (card.effectId === 'quick_strike') return [{ card, targetIndexes: [threatIndex] }];
  const result = [];
  for (const adjacent of rows(owner)) {
    if (Math.abs((adjacent % 3) - (threatIndex % 3)) !== 1) continue;
    if (state.board?.[adjacent]?.owner !== owner) continue;
    // Ordered swap: the threatening unit is first and attacks in the adjacent destination lane.
    result.push({ card, targetIndexes: [threatIndex, adjacent] });
  }
  return result;
}

function simulateFollowUp(state, context, immediateAction) {
  const simulation = sanitizePublicSimulation(state, context);
  const before = simulation[hpKey(context.aiOwner)];
  simulation[context.opponentOwner].hand = [clone(immediateAction.card)];
  const result = resolveTargetedEffectCard(simulation, context.opponentOwner, immediateAction.card.id, immediateAction.targetIndexes[0], immediateAction.targetIndexes);
  if (!result?.ok || result.type === 'targeted-effect-pending') return null;
  const afterImmediate = simulation[hpKey(context.aiOwner)];
  const immediateDamage = Math.max(0, before - afterImmediate);
  resolveCombat(simulation);
  const afterStandard = simulation[hpKey(context.aiOwner)];
  return {
    immediateDamage,
    standardDamage: Math.max(0, afterImmediate - afterStandard),
    combinedDamage: Math.max(0, before - afterStandard),
    attackerSurvives: immediateAction.targetIndexes.some((index) => simulation.board?.[index]?.owner === context.opponentOwner),
  };
}

export function detectImmediateAttackThreat(state, aiOwner) {
  const context = createPublicThreatContext(state, aiOwner);
  const capabilities = publicCapabilities(context);
  const possible = capabilities.filter((entry) => entry.availability === 'possible');
  const base = { context, capabilities, opportunityDetected: false, suppressionReason: null, publicAvailability: possible.length ? 'possible' : 'exhausted' };
  if (!context.battleActive) return { ...base, suppressionReason: 'battle-inactive' };
  if (!context.opponentActsBeforeCombat) return { ...base, suppressionReason: 'opponent-has-no-action-before-combat' };
  if (!capabilities.length) return { ...base, suppressionReason: 'no-qualifying-enabler' };
  if (!possible.length) return { ...base, suppressionReason: 'publicly-exhausted' };

  let best = null;
  let sawSwapInfeasible = false;
  for (const threatIndex of rows(context.opponentOwner)) {
    const unit = state.board?.[threatIndex];
    const opposingIndex = rows(aiOwner)[threatIndex % 3];
    if (!unit || unit.owner !== context.opponentOwner || state.board?.[opposingIndex]) continue;
    const effectiveAttack = getEffectiveBoardAttack(state, threatIndex);
    if (effectiveAttack < IMMEDIATE_ATTACK_MATERIAL_DAMAGE) continue;
    for (const capability of possible) {
      const actions = immediateActions(context, state, threatIndex, capability);
      if (capability.card.effectId === 'swap_adjacent_then_resolve' && !actions.length) sawSwapInfeasible = true;
      for (const action of actions) {
        const prediction = simulateFollowUp(state, context, action);
        if (!prediction || prediction.combinedDamage < IMMEDIATE_ATTACK_MATERIAL_DAMAGE) continue;
        const candidate = { threatIndex, unit, effectiveAttack, capability, prediction };
        if (!best || candidate.prediction.combinedDamage > best.prediction.combinedDamage) best = candidate;
      }
    }
  }
  if (!best) return { ...base, publicAvailability: sawSwapInfeasible && possible.every((x) => x.card.effectId === 'swap_adjacent_then_resolve') ? 'board-infeasible' : base.publicAvailability, suppressionReason: sawSwapInfeasible ? 'board-infeasible-swap' : 'weak-or-no-open-lane-threat' };
  return { ...base, opportunityDetected: true, publicAvailability: 'possible', ...best, possibleLethal: best.prediction.combinedDamage >= context.aiBaseHP };
}

export function applyCandidateForThreatSimulation(state, owner, action) {
  const simulation = clone(state);
  let result = null;
  if (action.type === 'pass') result = { ok: true };
  else if (action.type === 'play-unit') {
    result = playOrRedeployUnit(simulation, owner, action.cardId, action.slotIndex);
    if (result.ok && Array.isArray(action.targetIndexes) && action.effectId === 'swap_two_enemy_units') result = resolveTargetedUnitOnPlayEffect(simulation, owner, action.slotIndex, action.targetIndexes);
  } else if (action.type === 'swap-units') result = performSwap(simulation, owner, action.fromIndex, action.toIndex);
  else if (action.type === 'play-effect') result = playEffectCard(simulation, owner, action.cardId);
  else if (action.type === 'play-targeted-effect') result = resolveTargetedEffectCard(simulation, owner, action.cardId, action.targetIndex, action.targetIndexes ?? [action.targetIndex]);
  return result?.ok ? simulation : null;
}

export function predictedThreatAfterCandidate(state, owner, action) {
  const simulation = applyCandidateForThreatSimulation(state, owner, action);
  if (!simulation) return null;
  return detectImmediateAttackThreat(simulation, owner);
}

export function describeProtection(before, after) {
  const beforeDamage = before?.prediction?.combinedDamage ?? 0;
  const afterDamage = after?.opportunityDetected ? (after.prediction?.combinedDamage ?? 0) : 0;
  const reduction = beforeDamage - afterDamage;
  if (reduction <= 0) return null;
  let protectionType = 'reduce';
  if (!after?.opportunityDetected) protectionType = 'remove-or-disable';
  else if ((after.prediction?.immediateDamage ?? 0) < (before.prediction?.immediateDamage ?? 0)) protectionType = 'block-or-reposition';
  return { beforeDamage, afterDamage, reduction, protectionType };
}
